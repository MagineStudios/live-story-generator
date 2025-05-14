import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { auth } from '@clerk/nextjs/server';
import { ElementCategory } from '@prisma/client';
import { Readable } from 'stream';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    organization: process.env.OPENAI_ORG_ID,
});

// Convert Buffer to ReadableStream for processing
function bufferToStream(buffer: Buffer) {
    const readable = new Readable({
        read() {
            this.push(buffer);
            this.push(null);
        }
    });
    return readable;
}

export async function POST(req: NextRequest) {
    try {
        // Parse multipart form data
        const formData = await req.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // Convert file to base64
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Image = buffer.toString('base64');
        const mimeType = file.type;

        // Use Vision API to detect the category
        const prompt = `Analyze this image and determine which ONE of these categories it belongs to:
        - CHARACTER: if it shows a human person
        - PET: if it shows an animal (dog, cat, or any other pet)
        - OBJECT: if it shows a toy, stuffed animal, or inanimate object
        - LOCATION: if it shows a place, environment, or setting
        
        First provide a brief explanation of what's in the image, then respond with the category name (CHARACTER, PET, OBJECT, or LOCATION).
        Format your response exactly like this:
        Explanation: [your brief explanation]
        Category: [category name]`;

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
                                url: `data:${mimeType};base64,${base64Image}`,
                            },
                        },
                    ],
                },
            ],
        });

        // Parse the category from the response
        const contentText = response.choices[0]?.message?.content?.trim() || '';

        // Extract category from the formatted response
        let categoryText = 'CHARACTER'; // Default

        // Look for "Category: " in the response
        const categoryMatch = contentText.match(/Category:\s*(\w+)/i);
        if (categoryMatch && categoryMatch[1]) {
            categoryText = categoryMatch[1].toUpperCase();
        }

        // Extract explanation if available
        let explanation = '';
        // @ts-ignore
        const explanationMatch = contentText.match(/Explanation:\s*(.*?)(?=\nCategory:|$)/s);
        if (explanationMatch && explanationMatch[1]) {
            explanation = explanationMatch[1].trim();
        }

        // Validate that it's one of our accepted categories
        let category: ElementCategory;
        if (['CHARACTER', 'PET', 'OBJECT', 'LOCATION'].includes(categoryText)) {
            category = categoryText as ElementCategory;
        } else {
            category = 'CHARACTER'; // Default fallback
        }

        return NextResponse.json({
            category,
            explanation,
            rawResponse: contentText
        });

    } catch (error) {
        console.error('Error analyzing image category:', error);
        return NextResponse.json({ error: 'Failed to analyze image category' }, { status: 500 });
    }
}