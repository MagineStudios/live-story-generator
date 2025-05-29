import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;
    
    // Get total count
    const totalCount = await prisma.story.count({
      where: { userId }
    });
    
    // Fetch user's stories
    const stories = await prisma.story.findMany({
      where: { userId },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        pages: {
          take: 1,
          orderBy: { index: 'asc' },
          select: {
            id: true,
            chosenImage: {
              select: {
                secureUrl: true
              }
            }
          }
        },
        _count: {
          select: {
            likes: true,
            pages: true
          }
        }
      }
    });
    
    // Transform the data
    const transformedStories = stories.map(story => ({
      id: story.id,
      title: story.title,
      theme: story.theme,
      visualStyle: story.visualStyle,
      styleName: story.styleName,
      status: story.status,
      isPublic: story.isPublic,
      coverImage: story.pages[0]?.chosenImage?.secureUrl || null,
      likesCount: story.likesCount,
      viewsCount: story.viewsCount,
      pageCount: story._count.pages,
      createdAt: story.createdAt.toISOString(),
      updatedAt: story.updatedAt.toISOString(),
    }));
    
    return NextResponse.json({
      stories: transformedStories,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching user stories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stories' },
      { status: 500 }
    );
  }
}