// TEMPORARY DIRECT IMAGE GENERATION - Bypass Inngest for production testing
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { StoryStatus } from '@prisma/client';
import { uploadToCloudinary, generateCloudinaryPath } from '@/lib/cloudinary-upload';

interface PagePrompt {
    pageId: string;
    prompt: string;
}

interface GenerateImagesRequest {
    prompts: PagePrompt[];
    reroll?: boolean;
}

// Direct image generation function
async function generateImageDirect(prompt: string, userId: string, pageId: string, storyId: string) {
    const apiKey = process.env.OPENAI_API_KEY;
    const orgId = process.env.OPENAI_ORG_ID;

    if (!apiKey || !orgId) {
        throw new Error("OpenAI API credentials not configured");
    }

    console.log(`[DIRECT] Generating image for page ${pageId}`);

    // Call OpenAI directly
    const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'OpenAI-Organization': orgId,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'gpt-image-1',
            prompt,
            quality: 'low',
            moderation: 'low',
            size: '1024x1536', // Portrait
            n: 1,
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        console.error(`[DIRECT] OpenAI API error:`, error);
        throw new Error(error.error?.message || 'Failed to generate image');
    }

    const data = await response.json();
    const imageData = data.data[0];

    // Upload to Cloudinary
    const cloudinaryPath = generateCloudinaryPath(
        userId,
        null,
        'story',
        storyId,
        `page-${pageId}-${Date.now()}`
    );

    console.log(`[DIRECT] Uploading to Cloudinary for page ${pageId}`);

    const uploadResult = await uploadToCloudinary(
        imageData.b64_json,
        cloudinaryPath,
        'image'
    );

    console.log(`[DIRECT] Successfully uploaded for page ${pageId}`);

    // Create image variant record
    const imageVariant = await prisma.imageVariant.create({
        data: {
            pageId,
            userId,
            publicId: uploadResult.publicId,
            secureUrl: uploadResult.url,
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
        imageUrl: uploadResult.url,
        imageVariantId: imageVariant.id,
    };
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

        // Verify story ownership
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

        // Filter pages that need processing
        const pagesToProcess = prompts.filter(({ pageId }) => {
            const page = story.pages.find(p => p.id === pageId);
            if (reroll) return true;
            return !page?.chosenImage;
        });

        if (pagesToProcess.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'All pages already have images',
                totalPages: 0
            });
        }

        // Update story status
        await prisma.story.update({
            where: { id: storyId },
            data: { status: StoryStatus.GENERATING }
        });

        // Process images one by one (or in small batches)
        const results = [];
        const batchSize = 2; // Process 2 at a time to avoid rate limits

        for (let i = 0; i < pagesToProcess.length; i += batchSize) {
            const batch = pagesToProcess.slice(i, i + batchSize);
            
            const batchPromises = batch.map(async ({ pageId, prompt }) => {
                try {
                    // If rerolling, delete existing image first
                    if (reroll) {
                        const page = story.pages.find(p => p.id === pageId);
                        if (page?.chosenImage) {
                            await prisma.imageVariant.delete({
                                where: { id: page.chosenImage.id }
                            });
                            await prisma.storyPage.update({
                                where: { id: pageId },
                                data: { chosenImageId: null }
                            });
                        }
                    }

                    return await generateImageDirect(prompt, userId, pageId, storyId);
                } catch (error) {
                    console.error(`Error generating image for page ${pageId}:`, error);
                    return {
                        pageId,
                        success: false,
                        error: error instanceof Error ? error.message : 'Unknown error',
                    };
                }
            });

            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
        }

        // Check if all pages now have images
        const updatedStory = await prisma.story.findUnique({
            where: { id: storyId },
            include: {
                pages: {
                    include: {
                        chosenImage: true
                    }
                }
            }
        });

        const allPagesHaveImages = updatedStory?.pages.every(page => page.chosenImage);
        
        if (allPagesHaveImages) {
            await prisma.story.update({
                where: { id: storyId },
                data: { status: StoryStatus.READY }
            });
        }

        return NextResponse.json({
            success: results.every(r => r.success),
            results,
            mode: 'direct', // Indicate direct mode instead of Inngest
            message: 'Images generated directly without background processing'
        });
    } catch (error) {
        console.error('Error in direct image generation:', error);
        return NextResponse.json({ 
            error: error instanceof Error ? error.message : 'Internal server error' 
        }, { status: 500 });
    }
}
