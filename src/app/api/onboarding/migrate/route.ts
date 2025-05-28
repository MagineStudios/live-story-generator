import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { tempId, storyId, storyGoal, tone } = await req.json();

        if (!tempId) {
            return NextResponse.json({ error: 'No tempId provided' }, { status: 400 });
        }

        // Ensure the User record exists for this Clerk userId
        await prisma.user.upsert({
            where: { id: userId },
            create: { id: userId },
            update: {},
        });

        // Migrate MyWorldElements from tempId to userId
        await prisma.myWorldElement.updateMany({
            where: { tempId },
            data: { 
                userId,
                tempId: null 
            },
        });

        // Migrate stories from tempId to userId
        if (storyId) {
            await prisma.story.updateMany({
                where: { 
                    id: storyId,
                    tempId 
                },
                data: { 
                    userId,
                    tempId: null 
                },
            });
        }

        // Create or update onboarding session with the data
        await prisma.onboardingSession.upsert({
            where: { userId },
            update: { 
                storyGoal: storyGoal || [],
                tone: tone || []
            },
            create: {
                userId,
                storyGoal: storyGoal || [],
                tone: tone || []
            }
        });

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error('Error migrating onboarding data:', error);
        return NextResponse.json(
            { error: 'Failed to migrate onboarding data' },
            { status: 500 }
        );
    }
}