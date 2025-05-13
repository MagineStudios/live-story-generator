import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Ensure the User record exists for this Clerk userId
    await prisma.user.upsert({
      where: { id: userId },
      create: { id: userId },
      update: {},
    });

    const body: { storyGoal?: string[]; tone?: string[], currentStep?: number } = await req.json();

    // Prepare update data only if provided
    const updateData: { storyGoal?: string[]; tone?: string[], currentStep?: number } = {};

    if ('storyGoal' in body) updateData.storyGoal = body.storyGoal;
    if ('tone' in body) updateData.tone = body.tone;
    if ('currentStep' in body) updateData.currentStep = body.currentStep;
    try {
        const session = await prisma.onboardingSession.upsert({
            where: { userId },
            create: { userId, storyGoal: body.storyGoal || [], tone: body.tone || [] },
            update: updateData,
        });

        return NextResponse.json({ success: true, session });
    } catch (err: any) {
        console.error('Onboarding save failed:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}