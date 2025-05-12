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

        // Fetch visual styles from the database
        const styles = await prisma.visualStyle.findMany({
            orderBy: {
                name: 'asc',
            },
        });

        return NextResponse.json({ styles });
    } catch (error: any) {
        console.error('Error fetching visual styles:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch visual styles' },
            { status: 500 }
        );
    }
}