import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function GET(
    req: NextRequest,
    { params }: { params: { storyId: string } }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { storyId } = params;

        // Check if the story exists and belongs to the user
        const story = await prisma.story.findUnique({
            where: { id: storyId },
        });

        if (!story) {
            return NextResponse.json({ error: 'Story not found' }, { status: 404 });
        }

        if (story.userId !== userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Fetch all pages for the story
        const pages = await prisma.storyPage.findMany({
            where: { storyId },
            orderBy: { index: 'asc' },
            include: {
                chosenImage: true,
                variants: true,
            },
        });

        // Format the response
        const formattedPages = pages.map(page => ({
            id: page.id,
            index: page.index,
            text: page.text,
            editedText: page.editedText,
            chosenImageId: page.chosenImageId,
            chosenImageUrl: page.chosenImage?.secureUrl,
            variants: page.variants.map(variant => ({
                id: variant.id,
                secureUrl: variant.secureUrl,
                isChosen: variant.isChosen,
            })),
            microprompts: page.microprompts,
        }));

        return NextResponse.json({ pages: formattedPages });
    } catch (error: any) {
        console.error('Error fetching story pages:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch story pages' },
            { status: 500 }
        );
    }
}