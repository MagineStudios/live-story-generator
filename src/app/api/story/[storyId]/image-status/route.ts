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

        // Get story with pages and images
        const story = await prisma.story.findUnique({
            where: { 
                id: storyId,
                userId 
            },
            include: {
                pages: {
                    include: {
                        chosenImage: true
                    },
                    orderBy: {
                        index: 'asc'
                    }
                }
            }
        });

        if (!story) {
            return NextResponse.json({ error: 'Story not found' }, { status: 404 });
        }

        // Calculate image generation status
        const totalPages = story.pages.length;
        const pagesWithImages = story.pages.filter(page => page.chosenImage).length;
        const allImagesGenerated = totalPages === pagesWithImages;

        // Map page statuses
        const pageStatuses = story.pages.map(page => ({
            pageId: page.id,
            index: page.index,
            hasImage: !!page.chosenImage,
            imageUrl: page.chosenImage?.secureUrl || null,
            imageVariantId: page.chosenImage?.id || null,
        }));

        return NextResponse.json({
            storyId: story.id,
            status: story.status,
            totalPages,
            pagesWithImages,
            allImagesGenerated,
            pageStatuses,
        });
    } catch (error) {
        console.error('Error checking image status:', error);
        const errorMessage = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}