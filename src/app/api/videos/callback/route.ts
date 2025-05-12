// src/app/api/videos/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
    api_key:    process.env.CLOUDINARY_API_KEY!,
    api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const data = body;
        const taskId = data?.task_id;
        const status = data?.task_status;
        console.log(data,  data?.task_result?.videos?.[0]?.url);
        if (!taskId) return NextResponse.json({ ok: true });

        if (status === 'succeed') {
            const videoUrl = data?.task_result?.videos?.[0]?.url as string;
            console.log('videoUrl', videoUrl);
            const duration = Number(data?.task_result?.videos?.[0]?.duration || 5);

            // upload MP4 to Cloudinary (fetch remote URL, allow overwrite)
            const uploaded = await cloudinary.uploader.upload(videoUrl, {
                resource_type: 'video',
                folder: 'liver-story-generator/videos',
                overwrite: true,
            });
            console.log(uploaded);

            await prisma.videoTask.update({
                where: { id: taskId },
                data: {
                    status,
                    videoUrl: uploaded.secure_url,
                    durationSec: duration,
                },
            });
        } else {
            // still processing or failed
            await prisma.videoTask.update({
                where: { id: taskId },
                data: { status },
            });
        }

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error('callback error', err);
        return NextResponse.json({ ok: false }, { status: 500 });
    }
}