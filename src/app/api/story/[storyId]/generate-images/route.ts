import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { StoryStatus } from '@prisma/client';
import { inngest } from '@/lib/inngest-client';

interface PagePrompt {
    pageId: string;
    prompt: string;
}

interface GenerateImagesRequest {
    prompts: PagePrompt[];
}

export async function POST(req: NextRequest, props: { params: Promise<{ storyId: string }> }) {
    const params = await props.params;
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { storyId } = params;
        const { prompts } = await req.json() as GenerateImagesRequest;

        // Verify story ownership
        const story = await prisma.story.findUnique({
            where: { 
                id: storyId,
                userId 
            },
            include: {
                pages: true
            }
        });

        if (!story) {
            return NextResponse.json({ error: 'Story not found' }, { status: 404 });
        }

        // Check if OpenAI API key is configured
        const apiKey = process.env.OPENAI_API_KEY;
        const orgId = process.env.OPENAI_ORG_ID;
        
        if (!apiKey || !orgId) {
            console.error('OpenAI API credentials not configured');
            
            // In development, we'll create mock images
            if (process.env.NODE_ENV === 'development') {
                console.log('Development mode: Creating mock images');
                
                const results = await Promise.all(
                    prompts.map(async ({ pageId, prompt }) => {
                        try {
                            // Create a mock image variant
                            const imageVariant = await prisma.imageVariant.create({
                                data: {
                                    pageId,
                                    userId,
                                    publicId: `mock-${pageId}-${Date.now()}`,
                                    secureUrl: `https://via.placeholder.com/1024x1536?text=Page+${pageId}`,
                                    width: 1024,
                                    height: 1536,
                                    templateKey: 'generated',
                                    isChosen: true,
                                },
                            });

                            // Update the page
                            await prisma.storyPage.update({
                                where: { id: pageId },
                                data: {
                                    chosenImageId: imageVariant.id,
                                    imagePrompt: prompt,
                                },
                            });

                            return {
                                pageId,
                                success: true,
                                imageUrl: imageVariant.secureUrl,
                                imageVariantId: imageVariant.id,
                            };
                        } catch (error) {
                            console.error(`Error creating mock image for page ${pageId}:`, error);
                            return {
                                pageId,
                                success: false,
                                error: 'Failed to create mock image',
                            };
                        }
                    })
                );

                // Update story status
                const allSuccessful = results.every(r => r.success);
                await prisma.story.update({
                    where: { id: storyId },
                    data: { 
                        status: allSuccessful ? StoryStatus.READY : StoryStatus.CANCELLED 
                    }
                });

                return NextResponse.json({
                    success: allSuccessful,
                    results,
                    mode: 'development'
                });
            }

            return NextResponse.json({ 
                error: 'Image generation unavailable', 
                message: 'OpenAI API credentials are not configured' 
            }, { status: 500 });
        }

        // Update story status to generating
        await prisma.story.update({
            where: { id: storyId },
            data: { status: StoryStatus.GENERATING }
        });

        // Send events to Inngest for each page
        const eventPromises = prompts.map(({ pageId, prompt }) =>
            inngest.send({
                name: "story/images.generate",
                data: {
                    storyId,
                    pageId,
                    prompt,
                    userId,
                },
            })
        );

        await Promise.all(eventPromises);

        // Return immediately - Inngest will handle the generation asynchronously
        return NextResponse.json({
            success: true,
            message: 'Image generation started',
            totalPages: prompts.length,
        });
    } catch (error) {
        console.error('Error in image generation endpoint:', error);
        const errorMessage = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}