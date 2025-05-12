import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get all stories for the user
        const stories = await prisma.story.findMany({
            where: { userId },
            orderBy: { updatedAt: 'desc' },
            include: {
                pages: {
                    where: { index: 0 }, // Only get the first page for cover image
                    include: {
                        chosenImage: true, // Include the chosen image for the page
                    },
                },
            },
        });

        // Transform the data to include coverImageUrl
        const storiesWithCoverImage = stories.map((story) => {
            const coverPage = story.pages[0];
            const coverImageUrl = coverPage?.chosenImage?.secureUrl || null;

            return {
                ...story,
                coverImageUrl,
                pages: undefined, // Remove the pages array from the response
            };
        });

        return NextResponse.json(storiesWithCoverImage);
    } catch (error) {
        console.error('Error fetching stories:', error);
        return NextResponse.json(
            { error: 'Failed to fetch stories' },
            { status: 500 }
        );
    }
}