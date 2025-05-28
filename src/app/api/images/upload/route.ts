import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { ElementCategory } from '@prisma/client';
import { uploadToCloudinary, generateCloudinaryPath } from '@/lib/cloudinary-upload';

export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();
        // Parse multipart form data
        const formData = await req.formData();
        const file = formData.get('file') as File | null;
        const categoryRaw = formData.get('category') as string | null;
        const tempId = formData.get('tempId') as string | null;
        const name = formData.get('name') as string | null;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }
        
        // Determine category (default to CHARACTER if not provided or invalid)
        let category: ElementCategory = ElementCategory.CHARACTER;
        if (categoryRaw && Object.values(ElementCategory).includes(categoryRaw as ElementCategory)) {
            category = categoryRaw as ElementCategory;
        }

        // Create folder path for Cloudinary
        const datePrefix = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const cloudinaryPath = generateCloudinaryPath(
            userId,
            tempId,
            'my-world',
            datePrefix,
            category.toLowerCase(),
            `${Date.now()}`
        );

        // Upload to Cloudinary using shared utility
        const { url, publicId } = await uploadToCloudinary(file, cloudinaryPath);

        // Ensure the user exists in our DB (for logged-in users)
        let dbUserId: string | null = null;
        if (userId) {
            dbUserId = userId;
            const userExists = await prisma.user.findUnique({ where: { id: userId } });
            if (!userExists) {
                // Create a new User record for this Clerk user
                await prisma.user.create({ data: { id: userId, credits: 0 } });
            }
        }

        // Create a MyWorldElement record in the database
        const element = await prisma.myWorldElement.create({
            data: {
                name: name || `My ${category.toLowerCase()}`,
                description: '', // description will be filled in after AI analysis
                imageUrl: url,
                publicId,
                category: category,
                isDefault: false,
                userId: dbUserId,       // null for guests
                tempId: dbUserId ? null : tempId,
            }
        });

        // Respond with image info and the new element ID
        return NextResponse.json({
            success: true,
            publicId,
            url,
            elementId: element.id
        });
    } catch (error: any) {
        console.error('Error in image upload:', error);
        return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
    }
}
