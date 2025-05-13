// app/api/onboarding/save/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const data = await req.json(); // e.g. { storyGoal, tone, themePrompt, ... }
    const session = await prisma.onboardingSession.upsert({
        where: { userId },
        create: { userId, ...data },
        update: { ...data },
    });
    return NextResponse.json({ success: true, session });
}