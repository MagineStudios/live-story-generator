// app/api/onboarding/save/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Expect arrays of strings for multi-select fields
    const { storyGoal = [], tone = [] }: { storyGoal?: string[]; tone?: string[] } = await req.json();
    try {
        const session = await prisma.onboardingSession.upsert({
            where: { userId },
            create: { userId, storyGoal, tone },
            update: { storyGoal, tone },
        });
        return NextResponse.json({ success: true, session });
    } catch (err: any) {
        
        console.error('Onboarding save failed:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}