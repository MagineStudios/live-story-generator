import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import OpenAI from 'openai';
import { StoryStatus } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

// Configure OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || '',
    organization: process.env.OPENAI_ORG_ID,
});

interface CreateStoryRequest {
    title?: string;
    prompt: string;
    styleId: string;
    styleName: string;
    narrator?: string;
    audience?: string;
    setting?: string;
    theme?: string;
    lengthInPages?: number;
}

interface PageImageGenerationResult {
    id: string;
    imageUrl: string | null;
    error?: string;
}

interface EditResponse {
    urls: string[];
    error?: string;
    message?: string;
}

// Generate story content using OpenAI
async function generateStoryContent(
    prompt: string,
    style: string,
    narrator: string | undefined,
    audience: string | undefined,
    setting: string | undefined,
    theme: string | undefined,
    lengthInPages: number = 5
): Promise<{ title: string; pages: string[] }> {
    try {
        // Format additional context if available
        let additionalContext = '';
        if (narrator) additionalContext += `Narrator: ${narrator}. `;
        if (audience) additionalContext += `Target audience: ${audience}. `;
        if (setting) additionalContext += `Setting: ${setting}. `;
        if (theme) additionalContext += `Theme: ${theme}. `;

        // Create the system prompt
        const systemPrompt = `
      You are an expert children's book author who writes in the style of ${style}.
      Create a children's storybook with exactly ${lengthInPages} pages based on this prompt: "${prompt}".
      ${additionalContext}

      Format your response as JSON with the following structure:
      {
        "title": "The title of the story",
        "pages": [
          "Text for page 1",
          "Text for page 2",
          ...
        ]
      }

      - Each page should be 1-3 short sentences that can fit on a children's book page with an illustration
      - The story should have a clear beginning, middle, and end
      - Use child-friendly language appropriate for ages 2-8
      - Remember that each page will have an accompanying illustration, so make the text descriptive and visual
      - Page count must be exactly ${lengthInPages}
      - Do NOT number the pages in your response
    `;

        const response = await openai.chat.completions.create({
            model: "gpt-4.1",
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "system",
                    content: systemPrompt,
                },
                {
                    role: "user",
                    content: `Write a children's story based on this prompt: ${prompt}`,
                },
            ],
            temperature: 0.7,
        });

        const content = response.choices[0].message.content;
        if (!content) {
            throw new Error("Failed to generate story content");
        }

        // Parse the JSON response
        const storyData = JSON.parse(content) as { title: string; pages: string[] };

        return {
            title: storyData.title,
            pages: storyData.pages.slice(0, lengthInPages), // Ensure we don't exceed the requested page count
        };
    } catch (error) {
        console.error("Error generating story content:", error);
        throw new Error("Failed to generate story content");
    }
}

// Helper function to generate images for a story
async function generateStoryImages(storyId: string, pages: string[], visualStyle: string): Promise<void> {
    try {
        // Get the story's user ID
        const story = await prisma.story.findUnique({
            where: { id: storyId },
            select: { userId: true, styleName: true }
        });

        if (!story) throw new Error('Story not found');

        const userId = story.userId;

        // Generate images for each page
        const imagePromises = pages.map(async (pageText, index): Promise<PageImageGenerationResult | null> => {
            try {
                // First, get the specific page record
                const page = await prisma.storyPage.findFirst({
                    where: {
                        storyId,
                        index,
                    },
                });

                if (!page) {
                    console.error(`Page not found for index ${index}`);
                    return null;
                }

                // For the first image generation, we don't have a source image to edit
                // So we'll use our standard "no source image" base for edit API
                // Get the base image from the public directory
                const baseImagePath = path.join(process.cwd(), 'public', 'assets', 'base-image.png');
                const baseImageBuffer = await fs.readFile(baseImagePath);
                const imageFile = new File([baseImageBuffer], 'base-image.png', { type: 'image/png' });

                // Create the form data for the edit API
                const formData = new FormData();
                formData.append('image', imageFile);
                formData.append('prompt', `Create a ${visualStyle} style illustration for a children's book depicting: ${pageText}`);
                formData.append('model', 'gpt-image-1');
                formData.append('quality', 'high');
                formData.append('size', '1024x1536'); // Portrait for children's book
                formData.append('n', '1');

                // Use fetch with the server's full URL to call our edit API endpoint
                const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
                const editResponse = await fetch(`${baseUrl}/api/images/edit`, {
                    method: 'POST',
                    body: formData,
                });

                if (!editResponse.ok) {
                    const error = await editResponse.json() as { message?: string };
                    throw new Error(`Image generation failed: ${error.message || 'Unknown error'}`);
                }

                const { urls } = await editResponse.json() as EditResponse;

                if (!urls || urls.length === 0) {
                    throw new Error('No image generated');
                }

                const imageUrl = urls[0];

                // Find the imageVariant created by the edit API
                const imageVariant = await prisma.imageVariant.findFirst({
                    where: {
                        secureUrl: imageUrl,
                        ...(userId ? { userId } : {}),
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                });

                if (!imageVariant) {
                    throw new Error('Failed to find the created image variant');
                }

                // Update the imageVariant to link it to the page
                const updatedVariant = await prisma.imageVariant.update({
                    where: { id: imageVariant.id },
                    data: {
                        pageId: page.id,
                        templateKey: 'original',
                        isChosen: true
                    }
                });

                // Update the page with the chosen image
                await prisma.storyPage.update({
                    where: {
                        id: page.id,
                    },
                    data: {
                        chosenImageId: updatedVariant.id,
                    },
                });

                return {
                    id: updatedVariant.id,
                    imageUrl: updatedVariant.secureUrl
                };
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error(`Error generating image for page ${index}:`, errorMessage);
                return {
                    id: `error-${index}`,
                    imageUrl: null,
                    error: errorMessage
                };
            }
        });

        await Promise.all(imagePromises);

        // Update story status to READY
        await prisma.story.update({
            where: { id: storyId },
            data: { status: StoryStatus.READY }
        });

    } catch (error) {
        console.error('Error in image generation process:', error);

        // Update story status to ERROR if the process fails
        await prisma.story.update({
            where: { id: storyId },
            data: { status: StoryStatus.CANCELLED }
        });
    }
}

export async function POST(req: NextRequest) {
    try {
        // Get authenticated user
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Parse request body
        const requestData = await req.json() as CreateStoryRequest;
        const {
            prompt,
            styleId,
            styleName,
            narrator,
            audience,
            setting,
            theme = 'adventure', // Default theme
            lengthInPages = 5,
            title: providedTitle,
        } = requestData;

        // Validate required fields
        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        if (!styleId || !styleName) {
            return NextResponse.json({ error: 'Style information is required' }, { status: 400 });
        }

        // Create initial story record with GENERATING status
        // Adding both visualStyle and styleName according to TypeScript error
        const story = await prisma.story.create({
            data: {
                userId,
                title: providedTitle || 'Generating story...',
                theme,
                visualStyle: styleName,
                styleName, // Adding this as TypeScript says it's required
                styleId,   // Adding this in case it's also required
                status: StoryStatus.GENERATING,
                language: 'en',
            } as any, // Use type assertion to bypass TypeScript check temporarily
        });

        // Start the async generation process
        // We'll respond to the client first, then continue processing
        void (async () => {
            try {
                // Generate the story content
                const { title, pages } = await generateStoryContent(
                    prompt,
                    styleName,
                    narrator,
                    audience,
                    setting,
                    theme,
                    lengthInPages
                );

                // Update the story title (if not provided)
                await prisma.story.update({
                    where: { id: story.id },
                    data: {
                        title: providedTitle || title,
                        status: StoryStatus.GENERATING,
                    } as any,
                });

                // Create page records in the database
                const pagePromises = pages.map((text, index) =>
                    prisma.storyPage.create({
                        data: {
                            storyId: story.id,
                            text,
                            index,
                        },
                    })
                );

                await Promise.all(pagePromises);

                // Generate images for each page
                await generateStoryImages(story.id, pages, styleName);
            } catch (error) {
                console.error('Error in story generation process:', error);
                // Update the story status to ERROR if something goes wrong
                await prisma.story.update({
                    where: { id: story.id },
                    data: { status: StoryStatus.CANCELLED },
                });
            }
        })();

        // Respond immediately with the story ID
        return NextResponse.json({
            id: story.id,
            message: 'Story generation started',
            status: StoryStatus.GENERATING
        });
    } catch (error) {
        console.error('Error creating story:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}