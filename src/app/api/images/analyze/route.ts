import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { auth } from '@clerk/nextjs/server';
import { ElementCategory } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Lazy initialization of OpenAI client
let openai: OpenAI | null = null;

function getOpenAIClient() {
    if (!openai) {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY is not configured');
        }
        openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
            organization: process.env.OPENAI_ORG_ID,
        });
    }
    return openai;
}

const requestSchema = z.object({
    imageUrl: z.string().url(),
    category: z.enum(['CHARACTER', 'PET', 'LOCATION', 'OBJECT']),
    elementId: z.string(),
});

export async function POST(req: NextRequest) {
    try {
        // const { userId } = await auth();
        // We'll allow analyzing images even for guest users, as we need to analyze uploaded images

        const body = await req.json();
        const { imageUrl, category, elementId } = requestSchema.parse(body);

        if (!imageUrl) {
            return NextResponse.json({ error: 'Missing imageUrl' }, { status: 400 });
        }

        if (!Object.values(ElementCategory).includes(category)) {
            return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
        }

        // Generate the appropriate prompt based on element category
        let prompt = '';
        if (category === 'CHARACTER') {
            prompt = `Analyze this image of a person and provide a detailed description.
      Extract the following attributes in valid JSON format:
      {
        "description": "Comprehensive description of the person",
        "suggestedName": "Suggested name for the character",
        "gender": "Gender if apparent",
        "age": "Approximate age",
        "skinColor": "Skin color as hex code",
        "hairColor": "Hair color as hex code",
        "hairStyle": "Description of hair style",
        "eyeColor": "Eye color as hex code if visible",
        "ethnicity": "Ethnicity if apparent",
        "outfit": "Description of clothing",
        "accessories": "Any notable accessories"
      }`;
        } else if (category === 'PET') {
            prompt = `Analyze this image of a pet and provide a detailed description.
      Extract the following attributes in valid JSON format:
      {
        "description": "Comprehensive description of the pet",
        "suggestedName": "Suggested name for the pet",
        "breed": "Breed or species if identifiable",
        "age": "Approximate age or life stage (puppy, kitten, adult, etc.)",
        "gender": "Gender if apparent",
        "furColor": "Fur color as hex code",
        "furStyle": "Description of the fur style",
        "eyeColor": "Eye color as hex code if visible",
        "markings": "Any notable markings or patterns",
        "collar": "Description of collar including color and any tags or names visible",
        "accessories": "Any notable accessories"
      }`;
        } else if (category === 'OBJECT') {
            prompt = `Analyze this image of an object/toy and provide a detailed description.
      Extract the following attributes in valid JSON format:
      {
        "description": "Comprehensive description of the object or toy",
        "suggestedName": "Suggested name for this object",
        "type": "Type of object (toy, doll, stuffed animal, etc.)",
        "material": "Primary material(s) the object is made from",
        "primaryColor": "Primary color as hex code",
        "secondaryColor": "Secondary color as hex code if applicable",
        "details": "Notable visual details",
        "accessories": "Any accessories or attachments"
      }`;
        } else if (category === 'LOCATION') {
            prompt = `Analyze this image of a location and provide a detailed description.
      Extract the following attributes in valid JSON format:
      {
        "description": "Comprehensive description of the location",
        "suggestedName": "Suggested name for this location",
        "locationType": "Type of location (indoor, outdoor, etc.)",
        "setting": "Setting details (urban, rural, fantasy, etc.)",
        "timeOfDay": "Apparent time of day",
        "weather": "Weather conditions if applicable",
        "notable": "Notable elements in the scene"
      }`;
        } else {
            prompt = `Analyze this image and provide a detailed description.
      Extract the following attributes in valid JSON format:
      {
        "description": "Comprehensive description of what's in the image",
        "suggestedName": "Suggested name or title for this image"
      }`;
        }

        console.log("Analysis text prompt:", prompt);

        const response = await getOpenAIClient().chat.completions.create({
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

        // Update the element with the description and name
        await prisma.myWorldElement.update({
            where: { id: elementId },
            data: {
                name: analysis.suggestedName || getCategoryDefaultName(category),
                description: analysis.description || ''
            },
        });

        // Save attributes based on the element category
        switch (category) {
            case 'CHARACTER':
                await prisma.characterAttributes.upsert({
                    where: { elementId },
                    update: {
                        age: analysis.age || null,
                        gender: analysis.gender || null,
                        skinColor: analysis.skinColor || null,
                        hairColor: analysis.hairColor || null,
                        hairStyle: analysis.hairStyle || null,
                        eyeColor: analysis.eyeColor || null,
                        ethnicity: analysis.ethnicity || null,
                        outfit: analysis.outfit || null,
                        accessories: analysis.accessories || null,
                    },
                    create: {
                        elementId,
                        age: analysis.age || null,
                        gender: analysis.gender || null,
                        skinColor: analysis.skinColor || null,
                        hairColor: analysis.hairColor || null,
                        hairStyle: analysis.hairStyle || null,
                        eyeColor: analysis.eyeColor || null,
                        ethnicity: analysis.ethnicity || null,
                        outfit: analysis.outfit || null,
                        accessories: analysis.accessories || null,
                    },
                });
                break;

            case 'PET':
                // Convert heterochromatic eyes to string
                let eyeColorValue = analysis.eyeColor;
                if (typeof eyeColorValue === 'object' && eyeColorValue !== null) {
                    if (eyeColorValue.left && eyeColorValue.right) {
                        eyeColorValue = `Heterochromatic: left ${eyeColorValue.left}, right ${eyeColorValue.right}`;
                    } else {
                        eyeColorValue = JSON.stringify(eyeColorValue);
                    }
                }

                await prisma.petAttributes.upsert({
                    where: { elementId },
                    update: {
                        age: analysis.age || null,
                        gender: analysis.gender || null,
                        breed: analysis.breed || null,
                        furColor: analysis.furColor || null,
                        furStyle: analysis.furStyle || null,
                        markings: analysis.markings || null,
                        eyeColor: eyeColorValue || null, // Use the converted string
                        collar: analysis.collar || null,
                        accessories: analysis.accessories || null
                    },
                    create: {
                        elementId,
                        age: analysis.age || null,
                        gender: analysis.gender || null,
                        breed: analysis.breed || null,
                        furColor: analysis.furColor || null,
                        furStyle: analysis.furStyle || null,
                        markings: analysis.markings || null,
                        eyeColor: eyeColorValue || null, // Use the converted string
                        collar: analysis.collar || null,
                        accessories: analysis.accessories || null
                    }
                });
                break;

            case 'OBJECT':
                await prisma.objectAttributes.upsert({
                    where: { elementId },
                    update: {
                        material: analysis.material || null,
                        primaryColor: analysis.primaryColor || analysis.skinColor || null,
                        secondaryColor: analysis.secondaryColor || analysis.hairColor || null,
                        details: analysis.details || analysis.markings || null,
                        accessories: analysis.accessories || null,
                    },
                    create: {
                        elementId,
                        material: analysis.material || null,
                        primaryColor: analysis.primaryColor || analysis.skinColor || null,
                        secondaryColor: analysis.secondaryColor || analysis.hairColor || null,
                        details: analysis.details || analysis.markings || null,
                        accessories: analysis.accessories || null,
                    },
                });
                break;

            case 'LOCATION':
                await prisma.locationAttributes.upsert({
                    where: { elementId },
                    update: {
                        locationType: analysis.locationType || null,
                        setting: analysis.setting || null,
                        timeOfDay: analysis.timeOfDay || null,
                        weather: analysis.weather || null,
                        notable: analysis.notable || null,
                    },
                    create: {
                        elementId,
                        locationType: analysis.locationType || null,
                        setting: analysis.setting || null,
                        timeOfDay: analysis.timeOfDay || null,
                        weather: analysis.weather || null,
                        notable: analysis.notable || null,
                    },
                });
                break;
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