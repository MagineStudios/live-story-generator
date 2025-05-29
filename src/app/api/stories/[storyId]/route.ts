import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { storyId } = await params;

    // First check if the story exists and belongs to the user
    const story = await prisma.story.findUnique({
      where: {
        id: storyId,
      },
      select: {
        userId: true,
      },
    });

    if (!story) {
      return NextResponse.json(
        { error: 'Story not found' },
        { status: 404 }
      );
    }

    if (story.userId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Delete related data in the correct order to avoid foreign key constraints
    // First, get all page IDs for this story
    const storyPages = await prisma.storyPage.findMany({
      where: { storyId },
      select: { id: true },
    });
    
    const pageIds = storyPages.map(page => page.id);

    // Delete in correct order without transaction first
    try {
      // 1. Delete StoryLikes
      await prisma.storyLike.deleteMany({
        where: { storyId },
      });

      // 2. Delete VideoTasks (both story-level and page-level)
      await prisma.videoTask.deleteMany({
        where: {
          OR: [
            { storyId },
            { pageId: { in: pageIds } }
          ]
        },
      });

      // 3. Delete MusicTasks
      await prisma.musicTask.deleteMany({
        where: { storyId },
      });

      // 4. Delete StoryElements
      await prisma.storyElement.deleteMany({
        where: { storyId },
      });

      // 5. Delete ImageVariants associated with the story's pages
      if (pageIds.length > 0) {
        await prisma.imageVariant.deleteMany({
          where: { pageId: { in: pageIds } },
        });
      }

      // 6. Delete StoryPages
      await prisma.storyPage.deleteMany({
        where: { storyId },
      });

      // 7. Update OnboardingSession to remove storyId reference
      await prisma.onboardingSession.updateMany({
        where: { storyId },
        data: { storyId: null },
      });

      // 8. Finally, delete the story itself
      await prisma.story.delete({
        where: { id: storyId },
      });
    } catch (deleteError) {
      console.error('Delete operation failed:', deleteError);
      throw deleteError;
    }

    return NextResponse.json({
      message: 'Story deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting story:', error);
    return NextResponse.json(
      { error: 'Failed to delete story' },
      { status: 500 }
    );
  }
}