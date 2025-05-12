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

        const { imageUrl, category } = await req.json();

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

        const prompt = getPromptForCategory(category, characterContext);

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

        return NextResponse.json({
            description: analysisText,
            recognizedElementId,
            suggestedName,
            category
        });

    } catch (error: any) {
        console.error('Image analysis error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to analyze image' },
            { status: 500 }
        );
    }
}

function getPromptForCategory(category: ElementCategory, characterContext: string = ''): string {
    switch (category) {
        case 'CHARACTER':
            return `Provide a detailed description of this character for a children's story. Include their appearance, likely age, gender, and potential personality traits based on visual cues. Keep it child-friendly and under 150 words. ${characterContext}`;

        case 'PET':
            return "Provide a detailed description of this pet or animal for a children's story. Include its species, appearance, and potential personality traits. Keep it child-friendly and under 150 words.";

        case 'LOCATION':
            return "Provide a detailed description of this location for a children's story. Include its appearance, atmosphere, and any notable features. Keep it child-friendly and under 150 words.";

        case 'OBJECT':
            return "Provide a detailed description of this object for a children's story. Include its appearance, potential function, and how it might be used in a story. Keep it child-friendly and under 150 words.";

        default:
            return "Describe what you see in this image in detail for use in a children's story. Keep it child-friendly and under 150 words.";
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