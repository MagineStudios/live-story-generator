import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

// This handles GET requests to /api/my-world/elements/[id]/attributes
export async function GET(
    req: NextRequest,
    context: any
) {
    try {
        const { id } = await context.params as { id: string };
        const { userId } = await auth();
        // For attributes, we'll allow guest users to fetch their own elements

        // Get the element ID from the URL parameters
        const elementId = id;

        if (!elementId) {
            return NextResponse.json({ error: 'Element ID is required' }, { status: 400 });
        }

        // First, get the element to determine its category
        const element = await prisma.myWorldElement.findUnique({
            where: { id: elementId },
            select: {
                category: true,
                userId: true,
                tempId: true
            }
        });

        if (!element) {
            return NextResponse.json({ error: 'Element not found' }, { status: 404 });
        }

        // Security check - only allow access to elements owned by the user
        if (userId && element.userId !== userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Now get the attributes based on the element category
        let attributes;
        switch (element.category) {
            case 'CHARACTER':
                attributes = await prisma.characterAttributes.findUnique({
                    where: { elementId }
                });
                break;
            case 'PET':
                attributes = await prisma.petAttributes.findUnique({
                    where: { elementId }
                });
                break;
            case 'OBJECT':
                attributes = await prisma.objectAttributes.findUnique({
                    where: { elementId }
                });
                break;
            case 'LOCATION':
                attributes = await prisma.locationAttributes.findUnique({
                    where: { elementId }
                });
                break;
            default:
                attributes = null;
        }

        // If no attributes found, return an object with just elementId
        if (!attributes) {
            attributes = { elementId };
        }

        return NextResponse.json({ attributes, category: element.category });

    } catch (error) {
        console.error('Error fetching element attributes:', error);
        return NextResponse.json({ error: 'Failed to fetch element attributes' }, { status: 500 });
    }
}

// This handles PUT requests to update attributes
export async function PUT(
    req: NextRequest,
    context: any
) {
    try {
        // Get the element ID from the URL parameters
        const { id } = await context.params as { id: string };
        const { userId } = await auth();
        const elementId = id;

        if (!elementId) {
            return NextResponse.json({ error: 'Element ID is required' }, { status: 400 });
        }

        // First, get the element to determine its category
        const element = await prisma.myWorldElement.findUnique({
            where: { id: elementId },
            select: {
                category: true,
                userId: true,
                tempId: true
            }
        });

        if (!element) {
            return NextResponse.json({ error: 'Element not found' }, { status: 404 });
        }

        // Security check - only allow access to elements owned by the user
        if (userId && element.userId !== userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Parse the request body to get the attributes
        const attributes = await req.json();

        // Now update the attributes based on the element category
        let result;
        switch (element.category) {
            case 'CHARACTER':
                result = await prisma.characterAttributes.upsert({
                    where: { elementId },
                    update: attributes,
                    create: { elementId, ...attributes }
                });
                break;
            case 'PET':
                result = await prisma.petAttributes.upsert({
                    where: { elementId },
                    update: attributes,
                    create: { elementId, ...attributes }
                });
                break;
            case 'OBJECT':
                result = await prisma.objectAttributes.upsert({
                    where: { elementId },
                    update: attributes,
                    create: { elementId, ...attributes }
                });
                break;
            case 'LOCATION':
                result = await prisma.locationAttributes.upsert({
                    where: { elementId },
                    update: attributes,
                    create: { elementId, ...attributes }
                });
                break;
            default:
                return NextResponse.json({ error: 'Unsupported element category' }, { status: 400 });
        }

        return NextResponse.json({ success: true, attributes: result });

    } catch (error) {
        console.error('Error updating element attributes:', error);
        return NextResponse.json({ error: 'Failed to update element attributes' }, { status: 500 });
    }
}