import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
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
    const { isPublic } = await request.json();
    
    // Verify ownership
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: { userId: true, status: true }
    });
    
    if (!story || story.userId !== userId) {
      return NextResponse.json(
        { error: 'Story not found or unauthorized' },
        { status: 404 }
      );
    }
    
    // Only allow making READY stories public
    if (isPublic && story.status !== 'READY') {
      return NextResponse.json(
        { error: 'Only completed stories can be made public' },
        { status: 400 }
      );
    }
    
    // Update privacy setting
    const updatedStory = await prisma.story.update({
      where: { id: storyId },
      data: { isPublic },
      select: { 
        id: true, 
        isPublic: true 
      }
    });
    
    return NextResponse.json(updatedStory);
  } catch (error) {
    console.error('Error updating story privacy:', error);
    return NextResponse.json(
      { error: 'Failed to update privacy settings' },
      { status: 500 }
    );
  }
}