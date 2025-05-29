import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { storyId: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Must be logged in to like stories' },
        { status: 401 }
      );
    }
    
    const { storyId } = params;
    
    // Check if story exists and is public
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: { isPublic: true, status: true }
    });
    
    if (!story || !story.isPublic || story.status !== 'READY') {
      return NextResponse.json(
        { error: 'Story not found or not public' },
        { status: 404 }
      );
    }
    
    // Check if already liked
    const existingLike = await prisma.storyLike.findUnique({
      where: {
        storyId_userId: {
          storyId,
          userId
        }
      }
    });
    
    if (existingLike) {
      return NextResponse.json(
        { error: 'Already liked this story' },
        { status: 400 }
      );
    }
    
    // Create like and increment count in a transaction
    const [like, updatedStory] = await prisma.$transaction([
      prisma.storyLike.create({
        data: {
          storyId,
          userId
        }
      }),
      prisma.story.update({
        where: { id: storyId },
        data: {
          likesCount: { increment: 1 }
        },
        select: {
          likesCount: true
        }
      })
    ]);
    
    return NextResponse.json({
      liked: true,
      likesCount: updatedStory.likesCount
    });
  } catch (error) {
    console.error('Error liking story:', error);
    return NextResponse.json(
      { error: 'Failed to like story' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { storyId: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Must be logged in to unlike stories' },
        { status: 401 }
      );
    }
    
    const { storyId } = params;
    
    // Check if like exists
    const existingLike = await prisma.storyLike.findUnique({
      where: {
        storyId_userId: {
          storyId,
          userId
        }
      }
    });
    
    if (!existingLike) {
      return NextResponse.json(
        { error: 'Story not liked' },
        { status: 400 }
      );
    }
    
    // Delete like and decrement count in a transaction
    const [_, updatedStory] = await prisma.$transaction([
      prisma.storyLike.delete({
        where: {
          storyId_userId: {
            storyId,
            userId
          }
        }
      }),
      prisma.story.update({
        where: { id: storyId },
        data: {
          likesCount: { decrement: 1 }
        },
        select: {
          likesCount: true
        }
      })
    ]);
    
    return NextResponse.json({
      liked: false,
      likesCount: updatedStory.likesCount
    });
  } catch (error) {
    console.error('Error unliking story:', error);
    return NextResponse.json(
      { error: 'Failed to unlike story' },
      { status: 500 }
    );
  }
}