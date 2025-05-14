import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

// GET endpoint to fetch attributes for an element
export async function GET(
    req: NextRequest,
    context: { params: { id: string } }
) {
    try {
        const { id } = await context.params;
        const elementId = id;

        const attributes = await prisma.characterAttributes.findUnique({
            where: { elementId }
        });

        if (!attributes) {
            return NextResponse.json(
                { message: "No attributes found for this element" },
                { status: 404 }
            );
        }

        return NextResponse.json({ attributes });
    } catch (error) {
        console.error('Error fetching attributes:', error);
        return NextResponse.json(
            { error: 'Failed to fetch attributes' },
            { status: 500 }
        );
    }
}

// PUT endpoint to update attributes for an element
export async function PUT(
    req: NextRequest,
    context: { params: { id: string } }
) {
    try {
        const { id } = await context.params;
        const elementId = id;

        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const data = await req.json();

        // Check if the element exists and belongs to the user
        const element = await prisma.myWorldElement.findFirst({
            where: {
                id: elementId,
                userId,
            },
        });

        if (!element) {
            return NextResponse.json(
                { error: 'Element not found or you do not have permission' },
                { status: 404 }
            );
        }

        // Create or update the attributes
        const attributes = await prisma.characterAttributes.upsert({
            where: { elementId },
            update: {
                age: data.age || null,
                gender: data.gender || null,
                skinColor: data.skinColor || null,
                hairColor: data.hairColor || null,
                hairStyle: data.hairStyle || null,
                eyeColor: data.eyeColor || null,
                ethnicity: data.ethnicity || null,
                furColor: data.furColor || null,
                furStyle: data.furStyle || null,
                markings: data.markings || null,
                breed: data.breed || null,
                outfit: data.outfit || null,
                accessories: data.accessories || null,
            },
            create: {
                elementId,
                age: data.age || null,
                gender: data.gender || null,
                skinColor: data.skinColor || null,
                hairColor: data.hairColor || null,
                hairStyle: data.hairStyle || null,
                eyeColor: data.eyeColor || null,
                ethnicity: data.ethnicity || null,
                furColor: data.furColor || null,
                furStyle: data.furStyle || null,
                markings: data.markings || null,
                breed: data.breed || null,
                outfit: data.outfit || null,
                accessories: data.accessories || null,
            },
        });

        return NextResponse.json({ attributes });
    } catch (error) {
        console.error('Error updating attributes:', error);
        return NextResponse.json(
            { error: 'Failed to update attributes' },
            { status: 500 }
        );
    }
}