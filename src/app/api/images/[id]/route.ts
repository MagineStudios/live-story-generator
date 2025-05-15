import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

export async function GET(
    request: NextRequest,
    context: any,
) {
    try {
        const { id } = await context.params as { id: string };

        const imageId = id;

        if (!imageId) {
            return NextResponse.json({ error: 'Image ID is required' }, { status: 400 });
        }

        // Get the current authenticated user
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
        }
        // Get the image data
        const image = await prisma.imageVariant.findUnique({
            where: { id: imageId },
            select: {
                id: true,
                secureUrl: true,
                publicId: true,
                userId: true,
                page: {
                    select: {
                        story: {
                            select: {
                                userId: true
                            }
                        }
                    }
                }
            },
        });

        if (!image) {
            return NextResponse.json({ error: 'Image not found' }, { status: 404 });
        }

        // Security check - only allow access to own images or public images
        const storyUserId = image.page?.story?.userId;
        if (storyUserId && userId !== storyUserId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        return NextResponse.json({
            id: image.id,
            url: image.secureUrl,
            publicId: image.publicId
        });
    } catch (error) {
        console.error('Error fetching image:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}