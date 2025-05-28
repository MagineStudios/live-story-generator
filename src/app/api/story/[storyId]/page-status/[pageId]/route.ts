import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

export async function GET(
    req: NextRequest,
    props: { params: Promise<{ storyId: string; pageId: string }> }
) {
    const params = await props.params;
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { storyId, pageId } = params;

        // Get page with all related data
        const page = await prisma.storyPage.findUnique({
            where: { 
                id: pageId,
                story: {
                    id: storyId,
                    userId
                }
            },
            include: {
                chosenImage: true,
                variants: {
                    orderBy: {
                        createdAt: 'desc'
                    }
                },
                story: {
                    select: {
                        id: true,
                        status: true,
                        title: true
                    }
                }
            }
        });

        if (!page) {
            return NextResponse.json({ error: 'Page not found' }, { status: 404 });
        }

        // Get image generation history
        const imageGenerationAttempts = await prisma.imageVariant.findMany({
            where: {
                pageId,
                userId
            },
            orderBy: {
                createdAt: 'desc'
            },
            select: {
                id: true,
                createdAt: true,
                templateKey: true,
                isChosen: true,
                secureUrl: true,
                publicId: true
            }
        });

        // Compile status information
        const status = {
            pageId,
            storyId,
            index: page.index,
            hasImage: !!page.chosenImage,
            chosenImageId: page.chosenImageId,
            chosenImageUrl: page.chosenImage?.secureUrl || null,
            imagePrompt: page.imagePrompt,
            illustrationPrompt: page.illustrationPrompt,
            text: page.text,
            storyStatus: page.story.status,
            imageGenerationHistory: imageGenerationAttempts,
            totalImageAttempts: imageGenerationAttempts.length,
            lastImageGeneratedAt: imageGenerationAttempts[0]?.createdAt || null,
        };

        return NextResponse.json(status);
    } catch (error) {
        console.error('Error getting page status:', error);
        const errorMessage = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
