import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { StoryStatus } from '@prisma/client';
import { uploadToCloudinary, generateCloudinaryPath } from '@/lib/cloudinary-upload';
import pLimit from 'p-limit';

interface PagePrompt {
    pageId: string;
    prompt: string;
}

interface GenerateImagesRequest {
    prompts: PagePrompt[];
}

// Concurrency limiter for OpenAI image requests
const limitOpenAI = pLimit(5);

// Size constants for gpt-image-1
const GeneratedImageSize = {
    Square: '1024x1024',
    Landscape: '1536x1024',
    Portrait: '1024x1536',
    Auto: 'auto'
};

// Quality constants for gpt-image-1
const GeneratedImageQuality = {
    Low: 'low',
    Medium: 'medium',
    High: 'high'
};

// --- Networking helpers ----------------------------------------------------
const envTimeout   = parseInt(process.env.OPENAI_IMAGE_TIMEOUT_MS ?? '', 10);
const envRetries   = parseInt(process.env.OPENAI_IMAGE_MAX_RETRIES ?? '', 10);
const envBackoff   = parseInt(process.env.OPENAI_IMAGE_BACKOFF_MS ?? '', 10);

const FETCH_TIMEOUT_MS   = Number.isFinite(envTimeout) && envTimeout > 0 ? envTimeout : 120_000; // 2 min
const MAX_RETRIES        = Number.isFinite(envRetries) && envRetries > 0 ? envRetries : 5;
const RETRY_BACKOFF_MS   = Number.isFinite(envBackoff) && envBackoff > 0 ? envBackoff : 1_500;

function delay(ms: number) {
    return new Promise<void>(resolve => setTimeout(resolve, ms));
}

async function fetchWithTimeoutAndRetry(
    url: string,
    options: RequestInit,
    retries = MAX_RETRIES,
): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let attempt: number;
    let backoff: number;
    const start = Date.now();
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } catch (err) {
        if (retries > 0) {
            // linear back‑off + jitter
            attempt = MAX_RETRIES - retries + 1;
            backoff = RETRY_BACKOFF_MS * attempt + Math.random() * 250;
            console.warn(
                `Fetch failed (attempt ${attempt}/${MAX_RETRIES}). Will retry in ${Math.round(backoff)} ms`,
                err,
            );
            await delay(backoff);
            return fetchWithTimeoutAndRetry(url, options, retries - 1);
        }
        throw err;
    } finally {
        clearTimeout(timer);
        const elapsed = Date.now() - start;
        console.info(`Upstream fetch completed in ${elapsed} ms`);
    }
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
        
        if (!apiKey) {
            console.error('OPENAI_API_KEY is not configured');
            return NextResponse.json({ 
                error: 'Image generation unavailable', 
                message: 'OpenAI API key is not configured' 
            }, { status: 500 });
        }

        if (!orgId) {
            console.error('OPENAI_ORG_ID is not configured');
            return NextResponse.json({ 
                error: 'Image generation unavailable', 
                message: 'OpenAI organization ID is not configured' 
            }, { status: 500 });
        }

        // Update story status to generating images
        await prisma.story.update({
            where: { id: storyId },
            data: { status: StoryStatus.GENERATING }
        });

        // Generate images for each page in parallel
        const imageGenerationPromises = prompts.map(({ pageId, prompt }) =>
            limitOpenAI(async () => {
                try {
                    console.log(`Generating image for page ${pageId} with gpt-image-1`);
                    
                    // Call OpenAI API directly with gpt-image-1 parameters
                    const endpoint = 'https://api.openai.com/v1/images/generations';
                    
                    const openaiResponse = await fetchWithTimeoutAndRetry(endpoint, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'OpenAI-Organization': orgId,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            model: 'gpt-image-1',
                            prompt,
                            quality: GeneratedImageQuality.High, // Using low for faster generation
                            moderation: 'low',
                            size: GeneratedImageSize.Portrait, // Portrait for children's book
                            n: 1,
                        }),
                    });

                    if (!openaiResponse.ok) {
                        let errorData: any = {};
                        try {
                            errorData = await openaiResponse.json();
                        } catch {
                            /* response body not JSON or empty */
                        }
                        console.error('OpenAI API error:', errorData);
                        throw new Error(errorData.error?.message || 'Failed to generate image');
                    }

                    const data = await openaiResponse.json();

                    if (!data || !data.data || !Array.isArray(data.data) || data.data.length === 0) {
                        throw new Error('No image data received from OpenAI');
                    }

                    const imageData = data.data[0];
                    
                    // Generate Cloudinary path
                    const cloudinaryPath = generateCloudinaryPath(
                        userId,
                        null,
                        'story',
                        storyId,
                        `page-${pageId}-${Date.now()}`
                    );

                    // Upload to Cloudinary using shared utility
                    const { url, publicId } = await uploadToCloudinary(
                        imageData.b64_json!,
                        cloudinaryPath,
                        'image'
                    );

                    // Create image variant record
                    const imageVariant = await prisma.imageVariant.create({
                        data: {
                            pageId,
                            userId,
                            publicId,
                            secureUrl: url,
                            width: 1024,
                            height: 1536,
                            templateKey: 'generated',
                            isChosen: true, // Auto-select the generated image
                        },
                    });

                    // Update the page with the chosen image
                    await prisma.storyPage.update({
                        where: { id: pageId },
                        data: {
                            chosenImageId: imageVariant.id,
                            imagePrompt: prompt,
                        },
                    });

                    console.log(`Successfully generated image for page ${pageId}`);

                    return {
                        pageId,
                        success: true,
                        imageUrl: url,
                        imageVariantId: imageVariant.id,
                    };
                } catch (error) {
                    console.error(`Error generating image for page ${pageId}:`, error);
                    
                    let errorMessage = 'Unknown error';
                    if (error instanceof Error) {
                        errorMessage = error.message;
                    }

                    return {
                        pageId,
                        success: false,
                        error: errorMessage,
                    };
                }
            })
        );

        const results = await Promise.all(imageGenerationPromises);

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
        });
    } catch (error) {
        console.error('Error in batch image generation:', error);
        const errorMessage = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}