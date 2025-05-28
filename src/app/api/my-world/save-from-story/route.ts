import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { ElementCategory } from '@prisma/client';

interface SaveFromStoryRequest {
    imageUrl: string;
    name: string;
    description?: string;
    category?: ElementCategory;
    storyId?: string;
    pageId?: string;
}

export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { 
            imageUrl, 
            name, 
            description = '', 
            category = 'LOCATION',
            storyId,
            pageId 
        } = await req.json() as SaveFromStoryRequest;

        // Validate required fields
        if (!imageUrl || !name) {
            return NextResponse.json({ 
                error: 'Image URL and name are required' 
            }, { status: 400 });
        }

        // Extract public_id from Cloudinary URL if it's a Cloudinary image
        let publicId = '';
        if (imageUrl.includes('cloudinary.com')) {
            // Extract public_id from URL
            const urlParts = imageUrl.split('/');
            const uploadIndex = urlParts.indexOf('upload');
            if (uploadIndex !== -1 && uploadIndex < urlParts.length - 1) {
                // Get everything after upload/vXXXXXXX/ until the file extension
                const pathAfterVersion = urlParts.slice(uploadIndex + 2).join('/');
                publicId = pathAfterVersion.replace(/\.[^/.]+$/, ''); // Remove file extension
            }
        }

        // Check if this element already exists for the user
        const existingElement = await prisma.myWorldElement.findFirst({
            where: {
                userId,
                imageUrl,
            }
        });

        if (existingElement) {
            return NextResponse.json({
                success: true,
                element: existingElement,
                message: 'This image is already in your My World collection'
            });
        }

        // Create new My World element
        const element = await prisma.myWorldElement.create({
            data: {
                userId,
                name,
                description,
                imageUrl,
                publicId,
                category,
                isDefault: false,
                isDetectedInStory: false,
                isPrimary: false,
                // Optional: link to the story/page it came from
                metadata: storyId && pageId ? {
                    sourceStoryId: storyId,
                    sourcePageId: pageId,
                } : undefined,
            }
        });

        // If it's a character or pet, create basic attributes
        if (category === 'CHARACTER') {
            await prisma.characterAttributes.create({
                data: {
                    elementId: element.id,
                    // Basic defaults - user can edit later
                    gender: 'unknown',
                    age: 'unknown',
                    ethnicity: 'unknown',
                    hairColor: null,
                    hairStyle: null,
                    skinColor: null,
                    eyeColor: null,
                    outfit: null,
                    accessories: null,
                }
            });
        } else if (category === 'PET') {
            await prisma.petAttributes.create({
                data: {
                    elementId: element.id,
                    // Basic defaults - user can edit later
                    species: 'unknown',
                    breed: null,
                    furColor: null,
                    furStyle: null,
                    markings: null,
                    eyeColor: null,
                    collar: null,
                }
            });
        } else if (category === 'LOCATION') {
            await prisma.locationAttributes.create({
                data: {
                    elementId: element.id,
                    // Basic defaults - user can edit later
                    locationType: 'unknown',
                    setting: null,
                    timeOfDay: null,
                    weather: null,
                    mood: null,
                    features: null,
                }
            });
        } else if (category === 'OBJECT') {
            await prisma.objectAttributes.create({
                data: {
                    elementId: element.id,
                    // Basic defaults - user can edit later
                    objectType: 'unknown',
                    primaryColor: null,
                    secondaryColor: null,
                    material: null,
                    size: null,
                    features: null,
                }
            });
        }

        return NextResponse.json({
            success: true,
            element,
            message: 'Image saved to My World successfully'
        });
    } catch (error) {
        console.error('Error saving to My World:', error);
        const errorMessage = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}