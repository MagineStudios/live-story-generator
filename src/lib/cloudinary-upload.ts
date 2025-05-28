import cloudinary from './cloudinary';
import { Readable } from 'stream';

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

// Base64 to Buffer conversion
function base64ToBuffer(base64: string): Buffer {
    // Remove data URL prefix if present
    const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
    return Buffer.from(base64Data, 'base64');
}

interface CloudinaryUploadResult {
    url: string;
    publicId: string;
    width?: number;
    height?: number;
    format?: string;
}

/**
 * Upload a file to Cloudinary
 * @param file - Can be a File, Buffer, or base64 string
 * @param uploadPath - The full path including folder structure (e.g., 'users/123/stories/456/page-1')
 * @param resourceType - Type of resource (default: 'auto')
 */
export async function uploadToCloudinary(
    file: File | Buffer | string,
    uploadPath: string,
    resourceType: 'auto' | 'image' | 'video' | 'raw' = 'auto'
): Promise<CloudinaryUploadResult> {
    try {
        let buffer: Buffer;

        // Convert input to buffer
        if (typeof file === 'string') {
            // Assume it's base64
            buffer = base64ToBuffer(file);
        } else if (file instanceof File) {
            const bytes = await file.arrayBuffer();
            buffer = Buffer.from(bytes);
        } else {
            buffer = file;
        }

        // Upload to Cloudinary
        const uploadResult = await new Promise<any>((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                { 
                    public_id: uploadPath,
                    resource_type: resourceType,
                    overwrite: true,
                },
                (error, result) => {
                    if (error || !result) {
                        reject(error || new Error('Upload failed'));
                    } else {
                        resolve(result);
                    }
                }
            );
            bufferToStream(buffer).pipe(stream);
        });

        return {
            url: uploadResult.secure_url,
            publicId: uploadResult.public_id,
            width: uploadResult.width,
            height: uploadResult.height,
            format: uploadResult.format,
        };
    } catch (error) {
        console.error('Error uploading to Cloudinary:', error);
        throw error;
    }
}

/**
 * Generate a Cloudinary path for user content
 */
export function generateCloudinaryPath(
    userId: string | null,
    tempId: string | null,
    contentType: 'my-world' | 'story' | 'edit',
    ...additionalParts: string[]
): string {
    const basePath = userId ? `users/${userId}` : `guests/${tempId}`;
    const parts = [basePath, contentType, ...additionalParts].filter(Boolean);
    return parts.join('/');
}
