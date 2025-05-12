import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import { prisma } from '@/lib/prisma';
import { ElementCategory } from '@prisma/client';

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

// Convert buffer to stream (for Cloudinary upload)
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
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Parse form data
        const formData = await req.formData();
        const file = formData.get('file') as File | null;
        const categoryRaw = formData.get('category') as string | null;
        const name = formData.get('name') as string | null;

        const category = categoryRaw ?
            (Object.values(ElementCategory).includes(categoryRaw as ElementCategory) ?
                categoryRaw as ElementCategory : ElementCategory.CHARACTER) :
            ElementCategory.CHARACTER;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // Get file buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Create a timestamp for folder organization
        const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        // Upload to Cloudinary with user-specific folder structure
        const result = await new Promise<any>((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: `users/${userId}/my-world/${timestamp}/${category.toLowerCase()}`,
                    resource_type: 'auto',
                },
                (error, result) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(result);
                    }
                }
            );

            bufferToStream(buffer).pipe(uploadStream);
        });

        // After successful upload to Cloudinary, save as a MyWorldElement in the database
        // Note: We don't save to ImageVariant here as that's only for story page images
        const element = await prisma.myWorldElement.create({
            data: {
                name: name || `My ${category.toLowerCase()}`,
                description: '',  // Will be filled by analysis endpoint later
                imageUrl: result.secure_url,
                publicId: result.public_id,
                category: category,
                isDefault: false,
                userId: userId,
            }
        });

        // Return both Cloudinary result and database element ID
        return NextResponse.json({
            success: true,
            publicId: result.public_id,
            url: result.secure_url,
            width: result.width,
            height: result.height,
            elementId: element.id
        });
    } catch (error: any) {
        console.error('Upload error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to upload file' },
            { status: 500 }
        );
    }
}