import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
    try {
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

            const data = await req.json();
            const updateData: any = {};

            // Handle each possible field
            if (data.storyGoal !== undefined) updateData.storyGoal = data.storyGoal;
            if (data.tone !== undefined) updateData.tone = data.tone;
            if (data.currentStep !== undefined) updateData.currentStep = data.currentStep;
            if (data.visualStyleId !== undefined) updateData.visualStyleId = data.visualStyleId;

            // Upsert the onboarding session
            const session = await prisma.onboardingSession.upsert({
                where: { userId },
                update: updateData,
                create: {
                    userId,
                    ...updateData
                }
            });

            return NextResponse.json({ success: true, session }, { status: 200 });
    } catch (error) {
        console.error('Error saving onboarding data:', error);
        return NextResponse.json(
            { error: 'Failed to save onboarding data' },
            { status: 500 }
        );
    }
}