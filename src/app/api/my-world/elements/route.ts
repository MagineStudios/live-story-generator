import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> | { id: string } }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Handle params as a potential Promise
        const params = 'then' in context.params
            ? await context.params
            : context.params;

        const id = params.id;

        // Get the specific element
        const element = await prisma.myWorldElement.findUnique({
            where: { id }
        });

        if (!element) {
            return NextResponse.json({ error: 'Element not found' }, { status: 404 });
        }

        // Check if user has access to this element
        if (!element.isDefault && element.userId !== userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        return NextResponse.json(element);
    } catch (error: any) {
        console.error('Error fetching element:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch element' },
            { status: 500 }
        );
    }
}

// Update the PUT and DELETE functions with the same pattern
export async function PUT(
    req: NextRequest,
    context: { params: Promise<{ id: string }> | { id: string } }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Handle params as a potential Promise
        const params = 'then' in context.params
            ? await context.params
            : context.params;

        const id = params.id;
        const { name, description } = await req.json();

        // Rest of your PUT function...
        const element = await prisma.myWorldElement.findUnique({
            where: { id },
        });

        if (!element) {
            return NextResponse.json({ error: 'Element not found' }, { status: 404 });
        }

        if (element.userId !== userId && !element.isDefault) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
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
        console.error('Error updating element:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to update element' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ id: string }> | { id: string } }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Handle params as a potential Promise
        const params = 'then' in context.params
            ? await context.params
            : context.params;

        const id = params.id;

        // Rest of your DELETE function...
        const element = await prisma.myWorldElement.findUnique({
            where: { id },
        });

        if (!element) {
            return NextResponse.json({ error: 'Element not found' }, { status: 404 });
        }

        if (element.userId !== userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Delete the element
        await prisma.myWorldElement.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error deleting element:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to delete element' },
            { status: 500 }
        );
    }
}