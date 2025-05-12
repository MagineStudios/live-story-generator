// src/app/api/upload/route.ts
import { v2 as cloudinary } from 'cloudinary';
import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: Request) {
    const { userId } = await auth();
    const data = await req.formData();
    const file = data.get('file') as File;
    const arrayBuffer = await file.arrayBuffer();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const upload = await new Promise<any>((res, rej) =>
        cloudinary.uploader.upload_stream(
            { folder: 'live-story-generator/originals', resource_type: 'image' },
            (err, result) => (err ? rej(err) : res(result)),
        ).end(Buffer.from(arrayBuffer)),
    );

    await prisma.image.create({
        data: {
            userId,
            templateKey: 'original',
            publicId: upload.public_id,
            secureUrl: upload.secure_url,
            width: upload.width,
            height: upload.height,
        },
    });

    return Response.json({ publicId: upload.public_id, url: upload.secure_url });
}