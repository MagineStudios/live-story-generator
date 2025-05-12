import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function PUT(req: NextRequest, context: any) {
    const { storyId, pageId } = context.params as { storyId: string; pageId: string };
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { text } = await req.json();

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

        // Check if the page exists and belongs to the story
        const page = await prisma.storyPage.findUnique({
            where: { id: pageId },
        });

        if (!page) {
            return NextResponse.json({ error: 'Page not found' }, { status: 404 });
        }

        if (page.storyId !== storyId) {
            return NextResponse.json({ error: 'Page does not belong to story' }, { status: 400 });
        }

        // Update the page text
        const updatedPage = await prisma.storyPage.update({
            where: { id: pageId },
            data: { editedText: text },
        });

        return NextResponse.json({
            success: true,
            page: {
                id: updatedPage.id,
                text: updatedPage.text,
                editedText: updatedPage.editedText,
            }
        });
    } catch (error: any) {
        console.error('Error updating page text:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to update page text' },
            { status: 500 }
        );
    }
}