import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { auth } from '@clerk/nextjs/server';
import { ElementCategory } from '@prisma/client';
import { prisma } from '@/lib/prisma';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    organization: process.env.OPENAI_ORG_ID,
});

export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { imageUrl, category, elementId } = await req.json();

        if (!imageUrl) {
            return NextResponse.json({ error: 'Missing imageUrl' }, { status: 400 });
        }

        if (!Object.values(ElementCategory).includes(category)) {
            return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
        }

        // Get existing user elements for recognition
        const userElements = await prisma.myWorldElement.findMany({
            where: {
                userId,
                category: ElementCategory.CHARACTER, // Only compare characters for recognition
            },
            select: {
                id: true,
                name: true,
                imageUrl: true,
            }
        });

        // If we have characters, include them in the prompt for recognition
        let characterContext = '';
        if (userElements.length > 0 && category === ElementCategory.CHARACTER) {
            characterContext = `The user has the following existing characters in their library: ${
                userElements.map(el => `"${el.name}" (ID: ${el.id})`).join(', ')
            }. If the person in this image matches any of these characters, please mention that in your response.`;
        }

        const prompt = getPromptForCategory(category);
        console.log("Analysis text prompt:", prompt);

        const response = await openai.chat.completions.create({
            model: "gpt-4.1",
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        {
                            type: "image_url",
                            image_url: {
                                url: imageUrl,
                            },
                        },
                    ],
                },
            ],
            max_tokens: 500,
        });

        const analysisText = response.choices[0].message.content || '';
        console.log("Analysis text:", analysisText);
        console.log("repsonse", response);

        // Check if this might be a recognized character
        let recognizedElementId = null;
        let suggestedName = null;

        if (category === ElementCategory.CHARACTER) {
            // Look for patterns that suggest recognition
            for (const element of userElements) {
                if (analysisText.toLowerCase().includes(element.name.toLowerCase())) {
                    recognizedElementId = element.id;
                    suggestedName = element.name;
                    break;
                }
            }

            // If no explicit match, try to extract a name suggestion
            if (!recognizedElementId) {
                const nameMatch = analysisText.match(/This appears to be ([A-Za-z]+)|looks like ([A-Za-z]+)/i);
                if (nameMatch && (nameMatch[1] || nameMatch[2])) {
                    suggestedName = nameMatch[1] || nameMatch[2];
                } else {
                    // Default name based on category
                    suggestedName = getCategoryDefaultName(category);
                }
            }
        } else {
            // For non-character categories, suggest a default name
            suggestedName = getCategoryDefaultName(category);
        }

        // If we have an elementId, update the element with the description
        if (elementId) {
            try {
                console.log(`Attempting to update element ${elementId} with description:`, analysisText);

                const updatedElement = await prisma.myWorldElement.update({
                    where: { id: elementId },
                    data: {
                        description: analysisText,
                        name: suggestedName || getCategoryDefaultName(category)
                    }
                });

                console.log(`Successfully updated element ${elementId}:`, updatedElement);
            } catch (updateError) {
                console.error('Failed to update element description:', updateError);
                // Continue anyway to return the analysis
            }
        }

        return NextResponse.json({
            description: analysisText,
            recognizedElementId,
            suggestedName,
            category,
            elementId
        });

    } catch (error: any) {
        console.error('Image analysis error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to analyze image' },
            { status: 500 }
        );
    }
}

function getPromptForCategory(category: ElementCategory): string {
    switch (category) {
        case ElementCategory.CHARACTER:
            return "Describe this character in under 50 words, focusing exclusively on precise visual details like: age, ethnicity, face, skin color, hair color, hair style, weight, eye color, clothing, and one distinctive feature. Do not include speculation about personality traits, life story, or non-visual characteristics. Just provide objective visual details. Format as a single paragraph. Don't say the character appears to be. Just describe.";

        case ElementCategory.PET:
            return "Describe this animal/pet in under 50 words, focusing exclusively on precise visual details like: species, breed, size, color, eye color, markings, fur/feathers, fur color, and one distinctive feature. Do not include personality traits or narrative elements. Just provide objective visual details. Format as a single paragraph. Don't say appears to be. Just describe.";

        case ElementCategory.LOCATION:
            return "Describe this location in under 50 words, focusing exclusively on precise visual details like: environment type, key structures, colors, lighting, atmosphere, and one distinctive feature. Do not include historical context or non-visual elements. Just provide objective visual details. Format as a single paragraph. Don't say appears to be. Just describe.";

        case ElementCategory.OBJECT:
            return "Describe this object in under 50 words, focusing exclusively on precise visual details like: what it is, size, shape, color, material, condition, and one distinctive feature. If the character is known or recognizable, mention the name. Do not include history, function, or non-visual characteristics. Just provide objective visual details. Format as a single paragraph. Don't say appears to be. Just describe.";

        default:
            return "Provide a precise, objective visual description of what you see in under 50 words. Focus only on physical, visual details. Avoid speculation about non-visual characteristics. Format as a single paragraph.";
    }
}

function getCategoryDefaultName(category: ElementCategory): string {
    switch (category) {
        case 'CHARACTER':
            return "New Friend";
        case 'PET':
            return "Pet Buddy";
        case 'LOCATION':
            return "Special Place";
        case 'OBJECT':
            return "Magic Item";
        default:
            return "New Element";
    }
}