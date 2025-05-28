import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

/**
 * Reset onboarding data for the current user
 * This resets the onboarding session to step 0 and clears selections
 */
export async function POST(req: NextRequest) {
    try {
        // Get the authenticated user
        const { userId } = await auth();
        
        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Update the onboarding session to reset it
        const updatedSession = await prisma.onboardingSession.upsert({
            where: { userId },
            create: {
                userId,
                currentStep: 1, // Start at step 1 (skip welcome)
                storyGoal: [],
                tone: [],
            },
            update: {
                currentStep: 1, // Start at step 1 (skip welcome)
                storyGoal: [],
                tone: [],
                visualStyleId: null,
                storyId: null,
            }
        });

        // Optional: Also delete MyWorld elements if you want a complete reset
        // Uncomment the following if you want to delete user's uploaded elements too:
        /*
        await prisma.myWorldElement.deleteMany({
            where: { userId }
        });
        */

        return NextResponse.json({ 
            success: true,
            message: 'Onboarding data reset successfully',
            currentStep: updatedSession.currentStep
        });

    } catch (error) {
        console.error('Error resetting onboarding:', error);
        return NextResponse.json(
            { error: 'Failed to reset onboarding data' },
            { status: 500 }
        );
    }
}