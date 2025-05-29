import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { storyId: string } }
) {
  try {
    const { storyId } = params;
    
    // Increment view count
    const updatedStory = await prisma.story.update({
      where: { 
        id: storyId,
        isPublic: true,
        status: 'READY'
      },
      data: {
        viewsCount: { increment: 1 }
      },
      select: {
        viewsCount: true
      }
    });
    
    return NextResponse.json({
      viewsCount: updatedStory.viewsCount
    });
  } catch (error) {
    console.error('Error tracking view:', error);
    // Don't return error to user - view tracking is not critical
    return NextResponse.json({ success: true });
  }
}