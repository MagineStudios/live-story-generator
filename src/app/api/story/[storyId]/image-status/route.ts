import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest, props: { params: Promise<{ storyId: string }> }) {
    const params = await props.params;
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { storyId } = params;

        // Get story with pages and image status
        const story = await prisma.story.findUnique({
            where: { 
                id: storyId,
                userId 
            },
            select: {
                id: true,
                status: true,
                pages: {
                    select: {
                        id: true,
                        index: true,
                        chosenImageId: true,
                        variants: {
                            select: {
                                id: true,
                                isChosen: true,
                                secureUrl: true,
                            }
                        }
                    },
                    orderBy: { index: 'asc' }
                }
            }
        });

        if (!story) {
            return NextResponse.json({ error: 'Story not found' }, { status: 404 });
        }

        // Calculate image generation status
        const totalPages = story.pages.length;
        const pagesWithImages = story.pages.filter(page => 
            page.chosenImageId || page.variants.some(v => v.isChosen)
        ).length;

        const imageStatus = {
            totalPages,
            completedPages: pagesWithImages,
            pendingPages: totalPages - pagesWithImages,
            progress: totalPages > 0 ? Math.round((pagesWithImages / totalPages) * 100) : 0,
            isComplete: pagesWithImages === totalPages,
            pages: story.pages.map(page => ({
                id: page.id,
                index: page.index,
                hasImage: !!(page.chosenImageId || page.variants.some(v => v.isChosen)),
                imageUrl: page.variants.find(v => v.isChosen)?.secureUrl || null
            }))
        };

        return NextResponse.json(imageStatus);
    } catch (error) {
        console.error('Error checking image status:', error);
        const errorMessage = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
