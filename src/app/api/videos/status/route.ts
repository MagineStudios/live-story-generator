// Next.js 15.3 API route – query the status (and URL) of a Kling videos task
// GET /api/videos/status?taskId=<id>

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const taskId = req.nextUrl.searchParams.get('taskId');
        if (!taskId) {
            return NextResponse.json({ error: 'taskId query param is required' }, { status: 400 });
        }

        const task = await prisma.videoTask.findUnique({
            where: { id: taskId },
            select: {
                status: true,
                videoUrl: true,
            },
        });

        if (!task) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        return NextResponse.json(task);
    } catch (err: unknown) {
        console.error('[videos/status] error', err);
        return NextResponse.json(
            { error: 'Internal server error', message: err || String(err) },
            { status: 500 },
        );
    }
}
