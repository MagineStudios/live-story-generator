// src/app/api/videos/create/route.ts
// Next.js 15.3 edge route – create a Kling image-to-videos task

import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import prisma from '@/lib/prisma';
import type { JobStatus } from '@prisma/client';
import { auth } from '@clerk/nextjs/server';
// @ts-expect-error - jsonwebtoken types are not available
import jwt from 'jsonwebtoken';

// Lazy initialization of OpenAI client
let openai: OpenAI | null = null;

function getOpenAIClient() {
    if (!openai) {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY is not configured');
        }
        openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
            organization: process.env.OPENAI_ORG_ID,
        });
    }
    return openai;
}

function createKlingJwt() {
    const ak = process.env.KLING_ACCESS_KEY_ID!;
    const sk = process.env.KLING_ACCESS_KEY_SECRET!;
    const now = Math.floor(Date.now() / 1000);
    return jwt.sign(
        {
            iss: ak,
            exp: now + 1800, // 30 min
            nbf: now - 5,
        },
        sk,
        { algorithm: 'HS256', header: { alg: 'HS256', typ: 'JWT' } },
    );
}

export const dynamic = 'force-dynamic'; // never cache

const KLING_ENDPOINT = 'https://api.klingai.com/v1/videos/image2video';

export async function POST(req: NextRequest) {
    try {
        // 0. Auth ───────────────────────────────────────────────────────────[...]
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
        }

        // Ensure user row exists (avoids FK errors)
        await prisma.user.upsert({
            where:  { id: userId },
            create: { id: userId, credits: 0 },
            update: {},
        });

        // 1. Parse body ─────────────────────────────────────────────────────────[...]
        const { imageUrl } = (await req.json()) as { imageUrl?: string };
        if (!imageUrl) {
            return NextResponse.json(
                { error: 'imageUrl is required' },
                { status: 400 },
            );
        }

        // 2. GPT-4o Vision → motion prompt ──────────────────────────────────────

        const visionRes = await getOpenAIClient().chat.completions.create({
            model: 'gpt-4.1',
            messages: [
                {
                    role: 'system',
                    content:
                        'You are a helpful assistant that writes short, cinematic motion prompts for turning a still image into a 5‑second videos with camera motion. Optimize the prompts to get t[...]',
                },
                {
                    role: 'user',
                    content: [
                        {
                            type: 'image_url',
                            image_url: { url: imageUrl },
                        },
                        {
                            type: 'text',
                            text: 'Describe a short, vivid action this person could take in a luxury context. Keep under 60 words. The prompt cannot exceed 2500 characters',
                        },
                    ],
                },
            ],
        });

        const prompt =
            visionRes.choices[0]?.message?.content?.trim() ??
            'Walks forward and smiles';

        console.log('Vision prompt →', prompt);

        // 3. Call Kling ─────────────────────────────────────────────────────────

        // build Kling payload
        const klingBody: Record<string, unknown> = {
            model_name: 'kling-v1-6',
            mode: 'std',
            duration: '5',
            image: imageUrl,
            prompt,
            cfg_scale: 0.5,
        };

        // include callback only if it looks like a real https URL
        const cb = process.env.NEXT_PUBLIC_SITE_URL;
        if (cb && /^https?:\/\//.test(cb) && !cb.includes('localhost')) {
            klingBody.callback_url = `${cb.replace(/\/$/, '')}/api/video/callback`;
        }

        const klingRes = await fetch(KLING_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${createKlingJwt()}`,
            },
            body: JSON.stringify(klingBody),
        });

        const klingJson = await klingRes.json();
        console.log(klingJson);
        if (!klingRes.ok) {
            console.error('Kling error', klingJson);
            return NextResponse.json(
                { error: 'Kling API failed', details: klingJson },
                { status: klingRes.status },
            );
        }

        const taskId     = klingJson?.data?.task_id     as string;
        const taskStatus = klingJson?.data?.task_status as string;
        const prismaStatus: JobStatus =
            (taskStatus?.toUpperCase() as JobStatus) ?? 'SUBMITTED';

        // 4. Persist task ───────────────────────────────────────────────────────
        await prisma.videoTask.create({
            data: {
                id: taskId,
                userId,
                status: prismaStatus,
                imageUrl,
                prompt,
            },
        });

        // 5. Respond ─────────────────────────────────────────────────────────��[...]
        return NextResponse.json({ task_id: taskId, status: taskStatus });
    } catch (err: unknown) {
        console.error('Video create route error', err);
        return NextResponse.json(
            { error: 'Internal server error', message: (err instanceof Error) ? err.message : String(err) },
            { status: 500 },
        );
    }
}