import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

interface RemixRequestBody {
    prompt: string;
}

interface EditResponse {
    urls: string[];
    error?: string;
    message?: string;
}

interface RemixResponse {
    success: boolean;
    text: string;
    chosenImageUrl: string | undefined;
    microprompt: string;
    variants: Array<{
        id: string;
        secureUrl: string;
        isChosen: boolean;
    }>;
    error?: string;
}

export async function POST(req: NextRequest, context: any) {
    const { storyId, pageId } = (context.params as { storyId: string; pageId: string });
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { prompt } = await req.json() as RemixRequestBody;

        if (!prompt) {
            return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
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

        // Store the microprompt
        // We need to check if microprompts exists and is an array before pushing
        const currentMicroprompts = page.microprompts || [];
        const updatedMicroprompts = Array.isArray(currentMicroprompts)
            ? [...currentMicroprompts, prompt]
            : [prompt];

        await prisma.storyPage.update({
            where: { id: pageId },
            data: { microprompts: updatedMicroprompts }
        });

        // We need the current image to edit and the page text to use as prompt
        if (!page.chosenImage?.secureUrl) {
            return NextResponse.json({ error: 'No image to remix' }, { status: 400 });
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
        formData.append('prompt', `Create a ${story.styleName} style illustration for a children's book depicting: ${pageText}. ${prompt}`);
        formData.append('model', 'gpt-image-1');
        formData.append('quality', 'high');
        formData.append('size', '1024x1536'); // Portrait for children's book
        formData.append('n', '2'); // Generate 2 variations for remix

        // Call our edit API endpoint
        const editResponse = await fetch(`${req.nextUrl.origin}/api/images/edit`, {
            method: 'POST',
            body: formData,
        });

        if (!editResponse.ok) {
            const error = await editResponse.json() as { message?: string };
            throw new Error(`Image edit failed: ${error.message || 'Unknown error'}`);
        }

        const { urls } = await editResponse.json() as EditResponse;

        if (!urls || urls.length === 0) {
            return NextResponse.json({ error: 'No image generated' }, { status: 500 });
        }

        // For remix we find and update multiple variants
        const variantPromises = urls.map(async (url: string, index: number) => {
            // Find the imageVariant created by the edit API
            const variant = await prisma.imageVariant.findFirst({
                where: {
                    secureUrl: url,
                    userId,
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });

            if (!variant) {
                throw new Error(`Created image variant not found for URL: ${url}`);
            }

            // Update the variant to link it to the page
            return prisma.imageVariant.update({
                where: { id: variant.id },
                data: {
                    pageId: page.id,
                    templateKey: "remix",
                    isChosen: index === 0, // Only the first one is chosen
                }
            });
        });

        const updatedVariants = await Promise.all(variantPromises);

        // If there was a previously chosen image, mark it as not chosen
        if (page.chosenImageId) {
            await prisma.imageVariant.update({
                where: { id: page.chosenImageId },
                data: { isChosen: false },
            });
        }

        // Update the page with the new chosen image (first variant)
        const updatedPage = await prisma.storyPage.update({
            where: { id: page.id },
            data: { chosenImageId: updatedVariants[0].id },
            include: {
                chosenImage: true,
            },
        });

        // Return all variants for the UI to display
        const response: RemixResponse = {
            success: true,
            text: pageText,
            chosenImageUrl: updatedPage.chosenImage?.secureUrl,
            microprompt: prompt,
            variants: updatedVariants.map(v => ({
                id: v.id,
                secureUrl: v.secureUrl,
                isChosen: v.isChosen
            }))
        };

        return NextResponse.json(response);
    } catch (error: unknown) {
        console.error('Error remixing page:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return NextResponse.json(
            { error: errorMessage || 'Failed to remix page' },
            { status: 500 }
        );
    }
}