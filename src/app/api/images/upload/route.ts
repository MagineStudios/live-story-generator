import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import { prisma } from '@/lib/prisma';
import { ElementCategory } from '@prisma/client';

// Cloudinary configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

// Utility: convert Buffer to ReadableStream for Cloudinary upload
function bufferToStream(buffer: Buffer) {
    const readable = new Readable({
        read() {
            this.push(buffer);
            this.push(null);
        }
    });
    return readable;
}

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

        // Read file into buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Create folder path for Cloudinary
        const datePrefix = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        let uploadFolder: string;
        if (userId) {
            // Authenticated user - use their userId in path
            uploadFolder = `users/${userId}/my-world/${datePrefix}/${category.toLowerCase()}`;
        } else {
            if (!tempId) {
                return NextResponse.json({ error: 'Unauthorized (no tempId)' }, { status: 401 });
            }
            uploadFolder = `guests/${tempId}/my-world/${datePrefix}/${category.toLowerCase()}`;
        }

        // Perform upload to Cloudinary
        const uploadResult = await new Promise<any>((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                { folder: uploadFolder, resource_type: 'auto' },
                (error, result) => {
                    if (error || !result) reject(error || new Error('Upload failed'));
                    else resolve(result);
                }
            );
            bufferToStream(buffer).pipe(stream);
        });

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
                imageUrl: uploadResult.secure_url,
                publicId: uploadResult.public_id,
                category: category,
                isDefault: false,
                userId: dbUserId,       // null for guests
                tempId: dbUserId ? null : tempId,
            }
        });

        // Respond with image info and the new element ID
        return NextResponse.json({
            success: true,
            publicId: uploadResult.public_id,
            url: uploadResult.secure_url,
            width: uploadResult.width,
            height: uploadResult.height,
            elementId: element.id
        });
    } catch (error: any) {
        console.error('Error in image upload:', error);
        return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
    }
}