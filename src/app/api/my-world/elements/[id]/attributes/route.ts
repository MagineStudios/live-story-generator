import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';

const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

const attributesSchema = z.object({
    age: z.string().optional(),
    gender: z.string().optional(),
    skinColor: z.string().regex(hexColorRegex).optional(),
    hairColor: z.string().regex(hexColorRegex).optional(),
    hairStyle: z.string().optional(),
    eyeColor: z.string().regex(hexColorRegex).optional(),
    ethnicity: z.string().optional(),
    furColor: z.string().regex(hexColorRegex).optional(),
    furStyle: z.string().optional(),
    markings: z.string().optional(),
    breed: z.string().optional(),
    outfit: z.string().optional(),
    accessories: z.string().optional(),
});

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {

        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const elementId = params.id;
        const body = await request.json();
        const attributes = attributesSchema.parse(body);

        // Verify the element exists and belongs to the user
        const element = await prisma.myWorldElement.findUnique({
            where: {
                id: elementId,
                OR: [
                    { userId },
                    { tempId: body.tempId } // For guest users
                ]
            },
        });

        if (!element) {
            return NextResponse.json({ error: 'Element not found' }, { status: 404 });
        }

        // Update or create character attributes
        const updatedAttributes = await prisma.characterAttributes.upsert({
            where: { elementId },
            update: attributes,
            create: {
                elementId,
                ...attributes
            }
        });

        return NextResponse.json({ success: true, attributes: updatedAttributes });

    } catch (error) {
        console.error('Error updating character attributes:', error);
        return NextResponse.json({ error: 'Failed to update attributes' }, { status: 500 });
    }
}

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const elementId = params.id;

        const attributes = await prisma.characterAttributes.findUnique({
            where: { elementId }
        });

        if (!attributes) {
            return NextResponse.json({ error: 'Attributes not found' }, { status: 404 });
        }

        return NextResponse.json({ attributes });

    } catch (error) {
        console.error('Error fetching character attributes:', error);
        return NextResponse.json({ error: 'Failed to fetch attributes' }, { status: 500 });
    }
}