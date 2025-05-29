import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    const searchParams = request.nextUrl.searchParams;
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const skip = (page - 1) * limit;
    
    // Sorting
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    
    // Filter by style if provided
    const styleFilter = searchParams.get('style');
    
    // Build where clause
    const where = {
      isPublic: true,
      status: 'READY' as const,
      ...(styleFilter && { visualStyle: styleFilter })
    };
    
    // Get total count for pagination
    const totalCount = await prisma.story.count({ where });
    
    // Fetch stories with related data
    const stories = await prisma.story.findMany({
      where,
      skip,
      take: limit,
      orderBy: sortBy === 'likes' 
        ? { likesCount: sortOrder as 'asc' | 'desc' }
        : { [sortBy]: sortOrder },
      include: {
        user: {
          select: {
            id: true,
          }
        },
        pages: {
          take: 1,
          orderBy: { index: 'asc' },
          select: {
            id: true,
            text: true,
            chosenImage: {
              select: {
                secureUrl: true
              }
            }
          }
        },
        likes: userId ? {
          where: { userId },
          select: { id: true }
        } : false,
        _count: {
          select: {
            likes: true,
            pages: true
          }
        }
      }
    });
    
    // Transform the data for the frontend
    const transformedStories = stories.map(story => ({
      id: story.id,
      title: story.title,
      theme: story.theme,
      visualStyle: story.visualStyle,
      styleName: story.styleName,
      coverImage: story.pages[0]?.chosenImage?.secureUrl || null,
      excerpt: story.pages[0]?.text ? 
        story.pages[0].text.slice(0, 150) + '...' : 
        story.theme,
      likesCount: story.likesCount,
      viewsCount: story.viewsCount,
      pageCount: story._count.pages,
      isLikedByUser: userId ? story.likes.length > 0 : false,
      authorId: story.userId,
      createdAt: story.createdAt.toISOString(),
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
    console.error('Error fetching public stories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stories' },
      { status: 500 }
    );
  }
}