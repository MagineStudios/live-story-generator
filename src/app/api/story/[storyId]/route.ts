import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

export async function GET(
    request: NextRequest,
    context: any) {
    try {
        const { storyId } = await context.params as { storyId: string };

        if (!storyId) {
            return NextResponse.json({ error: 'Story ID is required' }, { status: 400 });
        }

        // Get the current authenticated user
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }


        // Get the story data
        const story = await prisma.story.findUnique({
            where: { id: storyId },
            include: {
                pages: {
                    orderBy: { index: 'asc' },
                    select: {
                        id: true,
                        text: true,
                        index: true,
                        microprompts: true,
                        illustrationPrompt: true,
                        imagePrompt: true,
                        chosenImageId: true,
                    },
                },
            },
        });

        if (!story) {
            return NextResponse.json({ error: 'Story not found' }, { status: 404 });
        }

        // Security check - only allow access to own stories or public stories
        if (story.userId && story.userId !== userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Calculate progress based on number of pages vs expected
        const expectedPages = 5; // As per your requirement
        const progress = story.pages.length > 0
            ? Math.min(100, (story.pages.length / expectedPages) * 100)
            : 10;

        return NextResponse.json({
            ...story,
            progress: progress
        });
    } catch (error) {
        console.error('Error fetching story:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}