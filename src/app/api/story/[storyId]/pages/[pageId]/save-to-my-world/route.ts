import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';
import { ElementCategory } from '@prisma/client';

// Lazy initialization of OpenAI client
let openai: OpenAI | null = null;

function getOpenAIClient() {
    if (!openai) {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY is not configured');
        }
        openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }
    return openai;
}

export async function POST(req: NextRequest, context: any) {
    const { storyId, pageId } = (context.params as { storyId: string; pageId: string });
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const { name, category = ElementCategory.CHARACTER } = await req.json() || {};

        // Check if the story exists and belongs to the user
        const story = await prisma.story.findUnique({
            where: { id: storyId },
        });

        if (!story) {
            return NextResponse.json({ error: 'Story not found' }, { status: 404 });
        }

        if (story.userId !== userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Get the page and its chosen image
        const page = await prisma.storyPage.findUnique({
            where: { id: pageId },
            include: {
                chosenImage: true,
            },
        });

        if (!page || !page.chosenImage) {
            return NextResponse.json({ error: 'Page or image not found' }, { status: 404 });
        }

        // Get description from GPT Vision API
        const imageUrl = page.chosenImage.secureUrl;
        const response = await getOpenAIClient().chat.completions.create({
            model: "gpt-4.1",
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: `Provide a child-friendly description of what you see in this image. Describe it in a way that would be engaging for a children's story. Keep it under 150 words.`
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: imageUrl,
                            },
                        },
                    ],
                },
            ],
            max_tokens: 300,
        });

        const description = response.choices[0].message.content || 'A magical character from a storybook.';

        // Create a new element in My World
        const newElement = await prisma.myWorldElement.create({
            data: {
                name: name || `Character from "${story.title}"`,
                description,
                imageUrl: page.chosenImage.secureUrl,
                publicId: page.chosenImage.publicId,
                category: category as ElementCategory,
                isDefault: false,
                isDetectedInStory: true,
                userId,
            }
        });

        return NextResponse.json({
            success: true,
            element: newElement,
        });
    } catch (error: any) {
        console.error('Error saving to My World:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to save to My World' },
            { status: 500 }
        );
    }
}