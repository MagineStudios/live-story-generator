import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import cloudinary from '@/lib/cloudinary';
import { uploadToCloudinary, generateCloudinaryPath } from '@/lib/cloudinary-upload';
import PDFDocument from 'pdfkit';
import axios from 'axios';
export const dynamic = 'force-dynamic';

// Updated type signature for Next.js 15
export async function POST(
    req: NextRequest,
    context: any
) {
    const { storyId } = (context.params as { storyId: string });
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }


        // Rest of your function remains the same
        // Check if the story exists and belongs to the user
        const story = await prisma.story.findUnique({
            where: { id: storyId },
        });

        if (!story) {
            return NextResponse.json({ error: 'Story not found' }, { status: 404 });
        }

        if (story.userId !== userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Fetch all pages for the story with their images
        const pages = await prisma.storyPage.findMany({
            where: { storyId },
            orderBy: { index: 'asc' },
            include: {
                chosenImage: true,
            },
        });

        // Create PDF
        const pdfBuffer = await generatePDF(story, pages);

        // Upload PDF to Cloudinary
        const pdfResult = await uploadPDFToCloudinary(pdfBuffer, storyId, story.title, userId);

        if (!pdfResult) {
            return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
        }

        // Update story with PDF URL
        await prisma.story.update({
            where: { id: storyId },
            data: {
                pdfUrl: pdfResult.url,
            },
        });

        return NextResponse.json({
            success: true,
            pdfUrl: pdfResult.url,
        });
    } catch (error: any) {
        console.error('Error finalizing story:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to finalize story' },
            { status: 500 }
        );
    }
}

// Helper functions remain unchanged
// generatePDF and uploadPDFToCloudinary functions...

// Helper function to generate PDF
async function generatePDF(story: any, pages: any[]) {
    return new Promise<Buffer>(async (resolve, reject) => {
        try {
            // Create a PDF document
            const doc = new PDFDocument({ size: 'A4', margin: 50 });
            const buffers: Buffer[] = [];

            doc.on('data', (buffer: any) => buffers.push(buffer));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);

            // Cover page
            doc.fontSize(24).font('Helvetica-Bold').text(story.title, { align: 'center' });
            doc.moveDown(2);
            doc.fontSize(12).font('Helvetica').text(`A story created with Live Story Generator`, { align: 'center' });
            doc.moveDown(0.5);
            doc.fontSize(12).font('Helvetica').text(`Style: ${story.styleName}`, { align: 'center' });
            doc.moveDown(0.5);
            doc.fontSize(10).font('Helvetica').text(`Created on: ${new Date().toLocaleDateString()}`, { align: 'center' });
            doc.addPage();

            // Add story pages
            for (const page of pages) {
                // Add image if available
                if (page.chosenImage) {
                    try {
                        const imageUrl = page.chosenImage.secureUrl;
                        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
                        const imageBuffer = Buffer.from(response.data);

                        // Add the image, fitting within the page width while maintaining aspect ratio
                        const maxWidth = 500; // Max width for image
                        const imgWidth = page.chosenImage.width || 1024;
                        const imgHeight = page.chosenImage.height || 1024;
                        const ratio = imgHeight / imgWidth;

                        doc.image(imageBuffer, {
                            fit: [maxWidth, maxWidth * ratio],
                            align: 'center',
                        });
                        doc.moveDown(1);
                    } catch (error) {
                        console.error('Error adding image to PDF:', error);
                        // Continue without image if it fails
                    }
                }

                // Add page text
                const text = page.editedText || page.text;
                doc.fontSize(12).font('Helvetica').text(text, { align: 'left' });

                // Add page number
                doc.fontSize(10).font('Helvetica').text(`Page ${page.index + 1}`, { align: 'center' });

                // Add a new page if this isn't the last page
                if (page !== pages[pages.length - 1]) {
                    doc.addPage();
                }
            }

            // End the document
            doc.end();
        } catch (error) {
            reject(error);
        }
    });
}

// Helper function to upload PDF to Cloudinary
async function uploadPDFToCloudinary(pdfBuffer: Buffer, storyId: string, title: string, userId: string) {
    try {
        // Create a timestamp for naming
        const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        // Sanitize the title for use in a filename
        const sanitizedTitle = title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();

        // Generate Cloudinary path
        const cloudinaryPath = generateCloudinaryPath(
            userId,
            null,
            'story',
            storyId,
            'pdf',
            `${sanitizedTitle}-${timestamp}`
        );

        // Upload using shared utility
        const result = await uploadToCloudinary(
            pdfBuffer,
            cloudinaryPath,
            'raw'
        );

        return result;
    } catch (error) {
        console.error('Cloudinary PDF upload error:', error);
        return null;
    }
}