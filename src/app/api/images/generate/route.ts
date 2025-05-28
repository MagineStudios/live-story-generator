// Next.js 15.3.1 API route with App Router
import { NextRequest, NextResponse } from 'next/server';
import pLimit from 'p-limit';
import {auth} from "@clerk/nextjs/server";

// Mark this route as dynamic to ensure it's not cached
export const dynamic = 'force-dynamic';

// Concurrency limiter for OpenAI image requests
// Remove unused OPENAI_CONCURRENCY variable
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
// ---- Tunables (override via env) ------------------------------------------
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

// Define interfaces for better type safety
interface OpenAIErrorResponse {
    error?: {
        message?: string;
    };
}

interface OpenAIImageResponse {
    b64_json?: string;
    revised_prompt?: string | null;
    [key: string]: unknown;
}

export async function POST(request: NextRequest) {
    try {
        // Parse the request body
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
        }
        const body = await request.json();
        const {
            prompt,
            model = 'gpt-image-1',
            quality = GeneratedImageQuality.High,
            moderation = 'low',
            output_compression = 0,
            size = GeneratedImageSize.Landscape,
            n = 1 // Number of images to generate
        } = body;

        // Validate inputs
        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        // Get API key from environment variables
        const apiKey = process.env.OPENAI_API_KEY;
        const orgId  = process.env.OPENAI_ORG_ID;
        if (!apiKey) {
            console.error('OPENAI_API_KEY is not set');
            return NextResponse.json(
                { error: 'API key configuration error' },
                { status: 500 }
            );
        }
        
        if (!orgId) {
            console.error('OPENAI_ORG_ID is not set');
            return NextResponse.json(
                { error: 'Organization ID configuration error' },
                { status: 500 }
            );
        }

        // Standard image generation request
        const endpoint = 'https://api.openai.com/v1/images/generations';

        console.log(`Making request to ${endpoint} with model: ${model}`);
        console.log(`Prompt (first 50 chars): ${prompt.substring(0, 50)}...`);
        console.log(`Quality: ${quality}, Moderation: ${moderation}, Output compression: ${output_compression}, Size: ${size}, Variations: ${n}`);

        // Call the OpenAI API with the exact parameters for gpt-image-1
        const openaiResponse = await limitOpenAI(() =>
            fetchWithTimeoutAndRetry(endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'OpenAI-Organization': orgId,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model,
                    prompt,
                    quality,
                    moderation,
                    output_compression,
                    size,
                    n: parseInt(String(n), 10), // Ensure n is an integer
                }),
            })
        );

        if (!openaiResponse.ok) {
            let errorData: OpenAIErrorResponse = {};
            try {
                errorData = await openaiResponse.json() as OpenAIErrorResponse;
            } catch {
                /* response body not JSON or empty */
            }
            console.error('OpenAI API error:', errorData);

            return NextResponse.json(
                {
                    error: 'Failed to generate image',
                    details: errorData,
                    message: errorData.error?.message || 'Unknown API error',
                },
                { status: openaiResponse.status }
            );
        }

        const data = await openaiResponse.json();

        console.log('Image generation successful!', {
            hasData: !!data,
            dataItems: data.data?.length,
        });

        // Validate response data
        if (!data || !data.data || !Array.isArray(data.data)) {
            console.error('Invalid response structure:', data);
            return NextResponse.json(
                { error: 'Invalid response from OpenAI API' },
                { status: 500 }
            );
        }

        // Extract the base64 image data from all generated images
        const images = data.data.map((imageData: OpenAIImageResponse) => ({
            b64_json: imageData.b64_json,
            revised_prompt: imageData.revised_prompt || null,
        }));

        if (images.length === 0) {
            console.error('No images in response:', data);
            return NextResponse.json(
                { error: 'No images in response' },
                { status: 500 }
            );
        }

        // Return all images
        return NextResponse.json({
            images
        });
    } catch (error: unknown) {
        console.error('Image generation error:', error);

        const isTimeout =
            error instanceof Error &&
            (error.name === 'AbortError' ||
                error.message.includes('timeout') ||
                'code' in error && error.code === 'UND_ERR_HEADERS_TIMEOUT');

        return NextResponse.json(
            {
                error: isTimeout ? 'Upstream request timed out' : 'Internal server error',
                message: error instanceof Error ? error.message : String(error),
            },
            { status: isTimeout ? 504 : 500 },
        );
    }
}