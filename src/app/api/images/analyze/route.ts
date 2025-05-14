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

        // Updated prompts with enhanced fields for each category
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
        "suggestedName": "Suggested name or title for this image",
        "category": "Suggested category (CHARACTER, PET, OBJECT, LOCATION)"
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

        // If it's a character, pet or object, store the additional attributes
        if (category === 'CHARACTER' || category === 'PET' || category === 'OBJECT') {
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
            return "Describe this character in under 50 words, focusing exclusively on precise visual details like: age, ethnicity, face, skin color, hair color, hair style, weight, eye color, clothing, and one distinctive feature. If the character has a name visible in the image, mention it.";

        case ElementCategory.PET:
            return "Describe this animal/pet in under 50 words, focusing exclusively on precise visual details like: species, breed, size, color, eye color, markings, fur/feathers, fur color, any collar or accessories, and one distinctive feature. If the pet has a name visible in the image, mention it.";

        case ElementCategory.LOCATION:
            return "Describe this location in under 50 words, focusing exclusively on precise visual details like: environment type, key structures, colors, lighting, atmosphere, and one distinctive feature. Format as a simple, factual description.";

        case ElementCategory.OBJECT:
            return "Describe this object in under 50 words, focusing exclusively on precise visual details like: what it is, size, shape, color, material, condition, and one distinctive feature. If the object has text or a brand name visible, mention it.";

        default:
            return "Provide a precise, objective visual description of what you see in under 50 words. Focus only on physical, visual details. Avoid speculation about non-visual characteristics. Format as a simple, factual description.";
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