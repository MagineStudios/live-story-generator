import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

// Helper function to ensure user exists in database
async function ensureUser(userId: string) {
    if (!userId) return false;

    try {
        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user) {
            await prisma.user.create({
                data: {
                    id: userId,
                    credits: 0, // Default values
                }
            });
            console.log(`Created user with ID ${userId} in the database`);
        }
        return true;
    } catch (error) {
        console.error('Error ensuring user exists:', error);
        return false;
    }
}

export async function GET() {
    try {
        // Verify authentication with explicit secret key
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Ensure the user exists in our database
        await ensureUser(userId);

        // Fetch default elements from the database
        const defaultElements = await prisma.myWorldElement.findMany({
            // where: {
            //     isDefault: true,
            // },
            orderBy: {
                createdAt: 'asc',
            },
        });

        return NextResponse.json({ elements: defaultElements });
    } catch (error: any) {
        console.error('Error fetching default elements:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch default elements' },
            { status: 500 }
        );
    }
}