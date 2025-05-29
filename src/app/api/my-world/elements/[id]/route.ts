import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, context: any) {
  const { id } = await context.params as { id: string };
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get the specific element with attributes
        const element = await prisma.myWorldElement.findUnique({
            where: { id },
            include: {
                characterAttributes: true,
                petAttributes: true,
                objectAttributes: true,
                locationAttributes: true,
            }
        });

        if (!element) {
            return NextResponse.json({ error: 'Element not found' }, { status: 404 });
        }

        // Check if user has access to this element
        if (!element.isDefault && element.userId !== userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Transform the element to have attributes in the expected format
        const attributeKey = `${element.category.toLowerCase()}Attributes`;
        const attributes = element[attributeKey];
        
        const transformedElement = {
            id: element.id,
            name: element.name,
            description: element.description,
            imageUrl: element.imageUrl,
            publicId: element.publicId,
            category: element.category,
            isDefault: element.isDefault,
            isDetectedInStory: element.isDetectedInStory,
            isPrimary: element.isPrimary,
            userId: element.userId,
            tempId: element.tempId,
            createdAt: element.createdAt,
            updatedAt: element.updatedAt,
            [attributeKey]: attributes,
        };

        return NextResponse.json({ element: transformedElement });
    } catch (error: any) {
        console.error('Error fetching element:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch element' },
            { status: 500 }
        );
    }
}

// Update element with PATCH
export async function PATCH(req: NextRequest, context: any) {
  const { id } = await context.params as { id: string };
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { name, description, isPrimary } = await req.json();

        // Find the element
        const element = await prisma.myWorldElement.findUnique({
            where: { id },
        });

        if (!element) {
            return NextResponse.json({ error: 'Element not found' }, { status: 404 });
        }

        if (element.userId !== userId && !element.isDefault) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // If setting as primary, unset other primary elements of the same category
        if (isPrimary && element.category === 'CHARACTER') {
            await prisma.myWorldElement.updateMany({
                where: {
                    userId,
                    category: 'CHARACTER',
                    id: { not: id }
                },
                data: { isPrimary: false }
            });
        }

        // Update the element
        const updatedElement = await prisma.myWorldElement.update({
            where: { id },
            data: {
                name,
                description,
                isPrimary: element.category === 'CHARACTER' ? isPrimary : false,
            }
        });

        return NextResponse.json({ element: updatedElement });
    } catch (error: any) {
        console.error('Error updating element:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to update element' },
            { status: 500 }
        );
    }
}

export async function DELETE(req: NextRequest, context: any) {
  const { id } = await context.params as { id: string };
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

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