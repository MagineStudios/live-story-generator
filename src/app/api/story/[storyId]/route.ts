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

        // Get the current authenticated user (optional for public viewing)
        const { userId } = await auth();

        // Get the story data with chosen images
        const story = await prisma.story.findUnique({
            where: { id: storyId },
            include: {
                pages: {
                    orderBy: { index: 'asc' },
                    include: {
                        chosenImage: {
                            select: {
                                id: true,
                                secureUrl: true,
                                publicId: true,
                                width: true,
                                height: true,
                            }
                        },
                        variants: {
                            select: {
                                id: true,
                                secureUrl: true,
                                publicId: true,
                                width: true,
                                height: true,
                                templateKey: true,
                                isChosen: true,
                            }
                        }
                    },
                },
            },
        });

        if (!story) {
            return NextResponse.json({ error: 'Story not found' }, { status: 404 });
        }

        // Stories are public by default - anyone with the link can view
        // Only include editing capabilities if the user owns the story
        const canEdit = userId && story.userId === userId;

        // Calculate progress based on number of pages vs expected
        const expectedPages = 5; // As per your requirement
        const progress = story.pages.length > 0
            ? Math.min(100, (story.pages.length / expectedPages) * 100)
            : 10;

        return NextResponse.json({
            ...story,
            progress: progress,
            canEdit: canEdit // Include edit permission flag
        });
    } catch (error) {
        console.error('Error fetching story:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
