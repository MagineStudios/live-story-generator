import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

// This route will list all elements
export async function GET(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // List all elements accessible by the user
        const elements = await prisma.myWorldElement.findMany({
            where: {
                OR: [
                    { userId },
                    { isDefault: true }
                ]
            }
        });

        return NextResponse.json(elements);
    } catch (error: any) {
        console.error('Error fetching elements:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch elements' },
            { status: 500 }
        );
    }
}