// src/app/api/edit/route.ts
// Next 15.3 edge route – image editing (in‑painting) with OpenAI + Cloudinary
import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Buffer } from 'buffer';
import prisma from '@/lib/prisma';
import type { ImageQuality } from '@prisma/client';
import { auth } from '@clerk/nextjs/server';

// ---------------------------------------------------------------------------
// Cloudinary config
// ---------------------------------------------------------------------------
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

// ---------------------------------------------------------------------------
// Route metadata
// ---------------------------------------------------------------------------
export const dynamic = 'force-dynamic';

// Constants ---------------------------------------------------------------
const OPENAI_ENDPOINT = 'https://api.openai.com/v1/images/edits';
const DEFAULT_MODEL = 'gpt-image-1';

const GeneratedImageSize = {
  Square: '1024x1024',
  Landscape: '1536x1024',
  Portrait: '1024x1536',
  Auto: 'auto',
} as const;

const GeneratedImageQuality = {
  Low: 'low',
  Medium: 'medium',
  High: 'high',
} as const;

// Define interfaces for better type safety
interface OpenAIErrorResponse {
  error?: {
    message?: string;
  };
}

// ---------------------------------------------------------------------------
// POST /api/edit
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    // 1. Auth
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }
    // Ensure a corresponding user record exists in the database
    await prisma.user.upsert({
      where: { id: userId },
      create: { id: userId, credits: 0 },
      update: {},
    });

    // 2. Parse incoming multipart/form‑data
    const form = await req.formData();
    const prompt = form.get('prompt') as string | null;
    const imageFile = form.get('image') as File | null;

    const model =
        (form.get('model') as string | null) ?? DEFAULT_MODEL;
    const quality =
        (form.get('quality') as string | null) ??
        GeneratedImageQuality.Low;
    const prismaQuality: ImageQuality =
        (quality?.toUpperCase() as ImageQuality) ?? 'LOW';
    const size =
        (form.get('size') as string | null) ?? GeneratedImageSize.Portrait;

    const moderation =
        (form.get('moderation') as string | null) ?? 'low';
    const outputCompression =
        (form.get('output_compression') as string | null) ?? '100';
    // Number of variations to generate (default to 2)
    const n = (form.get('n') as string | null) ?? '2';
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }
    if (!imageFile || !(imageFile instanceof File)) {
      return NextResponse.json({ error: 'Image file is required' }, { status: 400 });
    }

    // 3. Build upstream multipart body
    const upstreamBody = new FormData();
    upstreamBody.append('model', model);
    upstreamBody.append('prompt', prompt);
    upstreamBody.append('image', imageFile, imageFile.name);
    upstreamBody.append('quality', quality);
    upstreamBody.append('size', size);
    upstreamBody.append('n', n);
    upstreamBody.append('moderation', moderation);
    upstreamBody.append('output_compression', outputCompression);
    // If you ever support masks: upstreamBody.append('mask', maskFile)

    // 4. Call OpenAI
    const openaiRes = await fetch(OPENAI_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'OpenAI-Organization': process.env.OPENAI_ORG_ID ?? '',
      },
      body: upstreamBody,
    });

    if (!openaiRes.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let errData: Record<string, any> = {};
      try {
        errData = await openaiRes.json() as OpenAIErrorResponse;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_unused) {
        /* ignore */
      }
      console.error('OpenAI edit error', errData);
      return NextResponse.json(
          {
            error: 'Failed to edit image',
            details: errData,
            message: errData?.error?.message ?? 'Unknown API error',
          },
          { status: openaiRes.status },
      );
    }

    const data = await openaiRes.json();

    // 5. Handle all OpenAI response items (URL or base64) and upload each
    const items = data?.data;
    if (!items || !Array.isArray(items) || items.length === 0) {
      console.error('OpenAI edit response missing data', data);
      return NextResponse.json(
          { error: 'No image data returned' },
          { status: 502 },
      );
    }

    interface OpenAIImageItem {
      url?: string;
      b64_json?: string;
    }

    const savedResults = await Promise.all(items.map(async (item: OpenAIImageItem) => {
      let result: UploadApiResponse;

      if ('url' in item && item.url) {
        console.log('Uploading via URL:', item.url);
        result = await cloudinary.uploader.upload(item.url, {
          folder: 'live-story/edits',
          overwrite: true,
        });
      } else if ('b64_json' in item && item.b64_json) {
        console.log('Uploading via base64 buffer');
        const buffer = Buffer.from(item.b64_json, 'base64');
        result = await new Promise<UploadApiResponse>((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
              { folder: 'live-story/edits', overwrite: true },
              (err, res) => (err ? reject(err) : resolve(res as UploadApiResponse))
          );
          stream.end(buffer);
        });
      } else {
        console.error('OpenAI edit returned invalid image data', item);
        throw new Error('Invalid image data format');
      }

      // Persist metadata per image
      await prisma.imageVariant.create({
        data: {
          userId,
          templateKey: 'edit',
          quality: prismaQuality,
          publicId: result.public_id,
          secureUrl: result.secure_url,
          width: result.width,
          height: result.height,
        },
      });

      return result.secure_url;
    }));

    // 6. Respond with all generated URLs
    return NextResponse.json({ urls: savedResults });
  } catch (err: unknown) {
    console.error('Image edit route error', err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
        { error: 'Internal server error', message: errorMessage },
        { status: 500 },
    );
  }
}