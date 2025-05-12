import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

export async function POST(
  req: NextRequest,
  context: any
) {
    const { storyId, pageId } = context.params as { storyId: string; pageId: string };
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if the story exists and belongs to the user
        const story = await prisma.story.findUnique({
            where: { id: storyId },
            include: {
                pages: {
                    where: { id: pageId },
                    include: {
                        chosenImage: true
                    }
                },
            },
        });

        if (!story) {
            return NextResponse.json({ error: 'Story not found' }, { status: 404 });
        }

        if (story.userId !== userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Check if the page exists
        if (story.pages.length === 0) {
            return NextResponse.json({ error: 'Page not found' }, { status: 404 });
        }

        const page = story.pages[0];

        // We need the current image to edit and the page text to use as prompt
        if (!page.chosenImage?.secureUrl) {
            return NextResponse.json({ error: 'No image to re-roll' }, { status: 400 });
        }

        const pageText = page.editedText || page.text;
        const imageUrl = page.chosenImage.secureUrl;

        // Get the image as a blob
        const imageResponse = await fetch(imageUrl);
        const imageBlob = await imageResponse.blob();
        const imageFile = new File([imageBlob], 'source-image.png', { type: 'image/png' });

        // Create the form data for the edit API
        const formData = new FormData();
        formData.append('image', imageFile);
        formData.append('prompt', `Create a ${story.styleName} style illustration for a children's book depicting: ${pageText}`);
        formData.append('model', 'gpt-image-1');
        formData.append('quality', 'high');
        formData.append('size', '1024x1536'); // Portrait for children's book
        formData.append('n', '1'); // Just one variation for re-roll

        // Call our edit API endpoint
        const editResponse = await fetch(`${req.nextUrl.origin}/api/images/edit`, {
            method: 'POST',
            body: formData,
        });

        if (!editResponse.ok) {
            const error = await editResponse.json() as { message?: string };
            throw new Error(`Image edit failed: ${error.message || 'Unknown error'}`);
        }

        const { urls } = await editResponse.json() as { urls: string[] };

        if (!urls || urls.length === 0) {
            return NextResponse.json({ error: 'No image generated' }, { status: 500 });
        }

        const newImageUrl = urls[0];

        // Find the imageVariant created by the edit API
        const newVariant = await prisma.imageVariant.findFirst({
            where: {
                secureUrl: newImageUrl,
                userId,
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        if (!newVariant) {
            return NextResponse.json({ error: 'Created image variant not found' }, { status: 500 });
        }

        // If there was a previously chosen image, mark it as not chosen
        if (page.chosenImageId) {
            await prisma.imageVariant.update({
                where: { id: page.chosenImageId },
                data: { isChosen: false },
            });
        }

        // Update the imageVariant to link it to the page
        const updatedVariant = await prisma.imageVariant.update({
            where: { id: newVariant.id },
            data: {
                pageId: page.id,
                templateKey: "reroll",
                isChosen: true,
            }
        });

        // Update the page with the new chosen image
        const updatedPage = await prisma.storyPage.update({
            where: { id: page.id },
            data: { chosenImageId: updatedVariant.id },
            include: {
                chosenImage: true,
            },
        });

        return NextResponse.json({
            success: true,
            chosenImageUrl: updatedPage.chosenImage?.secureUrl,
        });
    } catch (error: unknown) {
        console.error('Error regenerating image:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return NextResponse.json(
            { error: errorMessage || 'Failed to regenerate image' },
            { status: 500 }
        );
    }
}