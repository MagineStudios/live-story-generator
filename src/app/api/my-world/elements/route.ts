import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { ElementCategory } from '@prisma/client';

export async function GET(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get query parameters
        const url = new URL(req.url);
        const category = url.searchParams.get('category') as ElementCategory | null;

        // Build the query
        const where: any = { userId };
        if (category) {
            where.category = category;
        }

        // Get all elements that match the criteria
        const elements = await prisma.myWorldElement.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({ elements });
    } catch (error: any) {
        console.error('Error fetching elements:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch elements' },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { name, description, imageUrl, publicId, category } = await req.json();

        // Create a new element
        const element = await prisma.myWorldElement.create({
            data: {
                name,
                description,
                imageUrl,
                publicId,
                category,
                userId,
            },
        });

        return NextResponse.json({ element }, { status: 201 });
    } catch (error: any) {
        console.error('Error creating element:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create element' },
            { status: 500 }
        );
    }
}