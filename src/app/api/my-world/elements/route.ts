import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { ElementCategory } from '@prisma/client';

export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { name, description, imageUrl, publicId, category, isDetectedInStory = false } = await req.json();

        if (!name || !imageUrl || !category) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Create the new element
        const newElement = await prisma.myWorldElement.create({
            data: {
                name,
                description,
                imageUrl,
                publicId,
                category: category as ElementCategory,
                isDefault: false,
                isDetectedInStory,
                userId,
            }
        });

        return NextResponse.json(newElement);
    } catch (error: any) {
        console.error('Error creating my world element:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create element' },
            { status: 500 }
        );
    }
}
export async function PUT(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id, name, description } = await req.json();

        // Check if the element exists and belongs to the user
        const element = await prisma.myWorldElement.findUnique({
            where: { id },
        });

        if (!element) {
            return NextResponse.json({ error: 'Element not found' }, { status: 404 });
        }

        if (element.userId !== userId && !element.isDefault) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Update the element
        const updatedElement = await prisma.myWorldElement.update({
            where: { id },
            data: {
                name,
                description,
            }
        });

        return NextResponse.json(updatedElement);
    } catch (error: any) {
        console.error('Error updating my world element:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to update element' },
            { status: 500 }
        );
    }
}

export async function GET(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const category = searchParams.get('category');

        // Fetch all elements for the user, including defaults
        const elements = await prisma.myWorldElement.findMany({
            where: {
                AND: [
                    {
                        OR: [
                            { userId },
                            { isDefault: true }
                        ]
                    },
                    category ? { category: category as ElementCategory } : {}
                ]
            },
            orderBy: [
                { isDefault: 'asc' },
                { createdAt: 'desc' }
            ],
        });

        return NextResponse.json({ elements });
    } catch (error: any) {
        console.error('Error fetching my world elements:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch elements' },
            { status: 500 }
        );
    }
}