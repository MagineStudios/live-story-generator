import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { auth } from '@clerk/nextjs/server';
import { ElementCategory } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    organization: process.env.OPENAI_ORG_ID,
});

const requestSchema = z.object({
    imageUrl: z.string().url(),
    category: z.enum(['CHARACTER', 'PET', 'LOCATION', 'OBJECT']),
    elementId: z.string(),
});

export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { imageUrl, category, elementId } = requestSchema.parse(body);

        if (!imageUrl) {
            return NextResponse.json({ error: 'Missing imageUrl' }, { status: 400 });
        }

        if (!Object.values(ElementCategory).includes(category)) {
            return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
        }
        let prompt = '';
        if (category === 'CHARACTER') {
            prompt = `Analyze this image of a character and provide a detailed description. 
      Extract the following attributes in valid JSON format:
      {
        "description": "Comprehensive description of the character",
        "suggestedName": "Suggested name for the character",
        "age": "Approximate age or age range",
        "gender": "Gender, if apparent",
        "skinColor": "Skin color as hex code",
        "hairColor": "Hair color as hex code",
        "hairStyle": "Description of the hair style",
        "eyeColor": "Eye color as hex code",
        "ethnicity": "Ethnicity if apparent",
        "outfit": "Description of clothing/outfit",
        "accessories": "Any notable accessories"
      }`;
        } else if (category === 'PET') {
            prompt = `Analyze this image of a pet and provide a detailed description.
      Extract the following attributes in valid JSON format:
      {
        "description": "Comprehensive description of the pet",
        "suggestedName": "Suggested name for the pet",
        "furColor": "Fur color as hex code",
        "furStyle": "Description of the fur style",
        "markings": "Any notable markings or patterns",
        "breed": "Breed or species if identifiable",
        "age": "Approximate age or life stage (puppy, kitten, adult, etc.)"
      }`;
        } else {
            prompt = `Analyze this image of a ${category.toLowerCase()} and provide a detailed description.
      Include a suggested name for this ${category.toLowerCase()}.
      Extract the following attributes in valid JSON format:
      {
        "description": "Comprehensive description",
        "suggestedName": "Suggested name"
      }`;
        }

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
            response_format: { type: "json_object" }
        });
        // Parse the response
        const analysisText = response.choices[0]?.message?.content || '{}';
        const analysis = JSON.parse(analysisText);

        // Update the element with the description
        await prisma.myWorldElement.update({
            where: { id: elementId },
            data: {
                name: analysis.suggestedName || `My ${category.toLowerCase()}`,
                description: analysis.description || ''
            },
        });

        // If it's a character or pet, store the additional attributes
        if (category === 'CHARACTER' || category === 'PET') {
            // Create a copy of analysis and delete the fields we don't store in CharacterAttributes
            const attributesToStore = { ...analysis };
            delete attributesToStore.description;
            delete attributesToStore.suggestedName;

            await prisma.characterAttributes.upsert({
                where: { elementId },
                update: attributesToStore,
                create: {
                    elementId,
                    ...attributesToStore
                }
            });
        }

        return NextResponse.json({
            success: true,
            description: analysis.description,
            suggestedName: analysis.suggestedName,
            attributes: analysis
        });

    } catch (error) {
        console.error('Error analyzing image:', error);
        return NextResponse.json({ error: 'Failed to analyze image' }, { status: 500 });
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