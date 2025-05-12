// src/app/api/upload/route.ts
import { v2 as cloudinary } from 'cloudinary';
import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import {NextResponse} from "next/server";

const {
    CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET,
} = process.env;

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new Error('Missing Cloudinary environment variables');
}

cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
});

export async function POST(req: Request) {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }
    const data = await req.formData();
    const file = data.get('file') as File;
    const arrayBuffer = await file.arrayBuffer();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const upload = await new Promise<any>((res, rej) =>
        cloudinary.uploader.upload_stream(
            { folder: 'live-story/originals', resource_type: 'image' },
            (err, result) => (err ? rej(err) : res(result)),
        ).end(Buffer.from(arrayBuffer)),
    );

    await prisma.imageVariant.create({
        data: {
            userId,
            quality: 'HIGH',
            templateKey: 'original',
            publicId: upload.public_id,
            secureUrl: upload.secure_url,
            width: upload.width,
            height: upload.height,
        },
    });

    return Response.json({ publicId: upload.public_id, url: upload.secure_url });
}