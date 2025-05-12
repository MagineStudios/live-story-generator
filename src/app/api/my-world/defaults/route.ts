import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export async function GET() {
    try {
        // Verify authentication
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch default elements from the database
        const defaultElements = await prisma.myWorldElement.findMany({
            where: {
                isDefault: true,
            },
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