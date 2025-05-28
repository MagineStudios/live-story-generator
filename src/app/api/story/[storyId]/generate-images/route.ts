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
    reroll?: boolean; // Flag to indicate re-roll
}

export async function POST(req: NextRequest, props: { params: Promise<{ storyId: string }> }) {
    const params = await props.params;
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { storyId } = params;
        const { prompts, reroll = false } = await req.json() as GenerateImagesRequest;

        // Verify story ownership and get current page states
        const story = await prisma.story.findUnique({
            where: { 
                id: storyId,
                userId 
            },
            include: {
                pages: {
                    include: {
                        chosenImage: true
                    }
                }
            }
        });

        if (!story) {
            return NextResponse.json({ error: 'Story not found' }, { status: 404 });
        }

        // Filter out pages that already have images (unless it's a reroll)
        const pagesToProcess = prompts.filter(({ pageId }) => {
            const page = story.pages.find(p => p.id === pageId);
            
            // If it's a reroll, always process the page
            if (reroll) {
                console.log(`[API] Re-rolling image for page ${pageId}`);
                return true;
            }
            
            // Skip if page already has an image
            if (page?.chosenImage) {
                console.log(`[API] Page ${pageId} already has an image, skipping`);
                return false;
            }
            
            return true;
        });

        // If rerolling, delete existing images first
        if (reroll) {
            for (const { pageId } of pagesToProcess) {
                const page = story.pages.find(p => p.id === pageId);
                if (page?.chosenImage) {
                    console.log(`[API] Deleting existing image for page ${pageId}`);
                    
                    // Delete the image variant
                    await prisma.imageVariant.delete({
                        where: { id: page.chosenImage.id }
                    });
                    
                    // Update the page to remove the image reference
                    await prisma.storyPage.update({
                        where: { id: pageId },
                        data: { chosenImageId: null }
                    });
                }
            }
        }

        console.log(`[API] Processing ${pagesToProcess.length} of ${prompts.length} requested pages`);

        if (pagesToProcess.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'All requested pages already have images or are being processed',
                totalPages: 0,
                skipped: prompts.length
            });
        }

        // Check if OpenAI API key is configured
        const apiKey = process.env.OPENAI_API_KEY;
        const orgId = process.env.OPENAI_ORG_ID;
        
        if (!apiKey || !orgId) {
            console.error('OpenAI API credentials not configured');
            
            // In development, we'll create mock images
            if (process.env.NODE_ENV === 'development') {
                console.log('Development mode: Creating mock images');
                
                // Create mock images concurrently
                const mockPromises = pagesToProcess.map(async ({ pageId, prompt }) => {
                    try {
                        // Check again if page already has an image (race condition prevention)
                        // Unless it's a reroll, in which case we proceed
                        if (!reroll) {
                            const existingPage = await prisma.storyPage.findUnique({
                                where: { id: pageId },
                                include: { chosenImage: true }
                            });
                            
                            if (existingPage?.chosenImage) {
                                return {
                                    pageId,
                                    success: true,
                                    imageUrl: existingPage.chosenImage.secureUrl,
                                    imageVariantId: existingPage.chosenImage.id,
                                    skipped: true
                                };
                            }
                        }
                        
                        // Create a mock image variant
                        const imageVariant = await prisma.imageVariant.create({
                            data: {
                                pageId,
                                userId,
                                publicId: `mock-${pageId}-${Date.now()}`,
                                secureUrl: `https://picsum.photos/seed/${Date.now()}-${pageId}/1024/1536`, // Random image for development
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
                });

                // Wait for all mock images to be created
                const results = await Promise.all(mockPromises);

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

        // Update story status to generating only if not already generating
        if (story.status !== StoryStatus.GENERATING) {
            await prisma.story.update({
                where: { id: storyId },
                data: { status: StoryStatus.GENERATING }
            });
        }

        // Send all events to Inngest concurrently to maximize parallelism
        // Inngest will handle the concurrency limiting (currently set to 5)
        const failedPages: string[] = [];
        
        console.log(`[API] Sending ${pagesToProcess.length} Inngest events concurrently`);
        
        // Send all events in parallel
        const sendPromises = pagesToProcess.map(async ({ pageId, prompt }, index) => {
            console.log(`[API] Sending Inngest event for page ${pageId} (${index + 1}/${pagesToProcess.length})`);
            
            try {
                await inngest.send({
                    name: "story/images.generate",
                    data: {
                        storyId,
                        pageId,
                        prompt,
                        userId,
                        reroll: reroll || false,
                    },
                    // Add unique ID to prevent duplicate events
                    id: `${storyId}-${pageId}-${Date.now()}-${index}`,
                });
            } catch (error) {
                console.error(`[API] Failed to send Inngest event for page ${pageId}:`, error);
                failedPages.push(pageId);
                // Continue with other pages even if one fails
            }
        });
        
        // Wait for all events to be sent
        await Promise.all(sendPromises);

        // Return immediately - Inngest will handle the generation asynchronously
        return NextResponse.json({
            success: true,
            message: 'Image generation started',
            totalPages: pagesToProcess.length - failedPages.length,
            skippedPages: prompts.length - pagesToProcess.length,
            failedPages: failedPages.length,
            processing: pagesToProcess.filter(p => !failedPages.includes(p.pageId)).map(p => p.pageId)
        });
    } catch (error) {
        console.error('Error in image generation endpoint:', error);
        
        const errorMessage = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}