import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { ElementCategory } from '@prisma/client';

// Enhance the GET method to include the appropriate attributes
export async function GET(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const categoriesParam = searchParams.get('categories');
        const categories = categoriesParam ? categoriesParam.split(',') as ElementCategory[] : undefined;

        // Build the include object based on querying all types of attributes
        const include = {
            characterAttributes: true,
            petAttributes: true,
            objectAttributes: true,
            locationAttributes: true,
        };

        // Query elements with their appropriate attributes
        const elements = await prisma.myWorldElement.findMany({
            where: {
                userId,
                ...(categories ? { category: { in: categories } } : {}),
            },
            include,
            orderBy: {
                updatedAt: 'desc',
            },
        });

        // Transform the results to flatten the attributes
        const transformedElements = elements.map(element => {
            // Get the appropriate attributes based on category
            let attributes;
            switch(element.category) {
                case 'CHARACTER':
                    attributes = element.characterAttributes;
                    break;
                case 'PET':
                    attributes = element.petAttributes;
                    break;
                case 'OBJECT':
                    attributes = element.objectAttributes;
                    break;
                case 'LOCATION':
                    attributes = element.locationAttributes;
                    break;
                default:
                    attributes = null;
            }

            // Return the element with flattened attributes
            return {
                ...element,
                attributes,
                // Remove the specific attribute fields to clean up the response
                characterAttributes: undefined,
                petAttributes: undefined,
                objectAttributes: undefined,
                locationAttributes: undefined,
            };
        });

        return NextResponse.json({ elements: transformedElements });
    } catch (error) {
        console.error('Error fetching elements:', error);
        return NextResponse.json({ error: 'Failed to fetch elements' }, { status: 500 });
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