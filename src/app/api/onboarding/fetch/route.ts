import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const session = await prisma.onboardingSession.findUnique({
        where: { userId },
        select: { storyGoal: true, tone: true, currentStep: true },
    });

    return NextResponse.json({
        storyGoal: session?.storyGoal || [],
        tone: session?.tone || [],
        currentStep: session?.currentStep ?? 0,
    });
}