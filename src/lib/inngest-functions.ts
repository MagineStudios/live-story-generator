import { inngest } from "./inngest-client";
import prisma from "@/lib/prisma";
import { StoryStatus } from "@prisma/client";
import { uploadToCloudinary, generateCloudinaryPath } from "@/lib/cloudinary-upload";

// Size constants for gpt-image-1
const GeneratedImageSize = {
  Square: '1024x1024',
  Landscape: '1536x1024',
  Portrait: '1024x1536',
  Auto: 'auto'
};

// Quality constants for gpt-image-1
const GeneratedImageQuality = {
  Low: 'low',
  Medium: 'medium',
  High: 'high'
};

interface ImageGenerationEvent {
  data: {
    storyId: string;
    pageId: string;
    prompt: string;
    userId: string;
  };
}

// Function to generate images for story pages
export const generateStoryImages = inngest.createFunction(
  { 
    id: "generate-story-images",
    retries: 3,
    concurrency: {
      limit: 5, // Limit concurrent executions
    },
    onFailure: async ({ event, error }) => {
      // The event structure in onFailure is different - it contains the original event
      const originalEvent = event as any;
      const pageId = originalEvent.data?.pageId;
      const prompt = originalEvent.data?.prompt;
      
      console.error(`[INNGEST] Image generation failed for page ${pageId}:`, error);
      
      // Log the failure to the database
      if (pageId && prompt) {
        try {
          await prisma.storyPage.update({
            where: { id: pageId },
            data: {
              imagePrompt: prompt,
              // You might want to add an error field to track failures
            },
          });
        } catch (dbError) {
          console.error('[INNGEST] Failed to update database after image generation failure:', dbError);
        }
      }
    },
  },
  { event: "story/images.generate" },
  async ({ event, step }) => {
    const { storyId, pageId, prompt, userId } = event.data;

    console.log(`[INNGEST] Starting image generation for story ${storyId}, page ${pageId}`);

    // Step 1: Validate the story and page exist
    const story = await step.run("validate-story", async () => {
      const story = await prisma.story.findUnique({
        where: { id: storyId },
        include: { pages: true }
      });

      if (!story) {
        throw new Error("Story not found");
      }

      const page = story.pages.find(p => p.id === pageId);
      if (!page) {
        throw new Error("Page not found");
      }

      console.log(`[INNGEST] Validated story and page for ${pageId}`);
      return story;
    });

    // Step 2: Generate the image
    const imageData = await step.run("generate-image", async () => {
      const apiKey = process.env.OPENAI_API_KEY;
      const orgId = process.env.OPENAI_ORG_ID;

      if (!apiKey || !orgId) {
        throw new Error("OpenAI API credentials not configured");
      }

      console.log(`[INNGEST] Calling OpenAI for page ${pageId} with prompt length: ${prompt.length}`);

      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'OpenAI-Organization': orgId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-image-1',
          prompt,
          quality: GeneratedImageQuality.Low,
          moderation: 'low',
          size: GeneratedImageSize.Portrait,
          n: 1,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error(`[INNGEST] OpenAI API error for page ${pageId}:`, error);
        throw new Error(error.error?.message || 'Failed to generate image');
      }

      const data = await response.json();
      console.log(`[INNGEST] Successfully generated image for page ${pageId}`);
      return data.data[0];
    });

    // Step 3: Upload to Cloudinary
    const uploadResult = await step.run("upload-to-cloudinary", async () => {
      const cloudinaryPath = generateCloudinaryPath(
        userId,
        null,
        'story',
        storyId,
        `page-${pageId}-${Date.now()}`
      );

      console.log(`[INNGEST] Uploading to Cloudinary for page ${pageId}`);

      const result = await uploadToCloudinary(
        imageData.b64_json,
        cloudinaryPath,
        'image'
      );

      console.log(`[INNGEST] Successfully uploaded to Cloudinary for page ${pageId}: ${result.url}`);
      return result;
    });

    // Step 4: Save to database
    await step.run("save-to-database", async () => {
      console.log(`[INNGEST] Saving to database for page ${pageId}`);

      // Create image variant record
      const imageVariant = await prisma.imageVariant.create({
        data: {
          pageId,
          userId,
          publicId: uploadResult.publicId,
          secureUrl: uploadResult.url,
          width: 1024,
          height: 1536,
          templateKey: 'generated',
          isChosen: true,
        },
      });

      // Update the page with the chosen image
      await prisma.storyPage.update({
        where: { id: pageId },
        data: {
          chosenImageId: imageVariant.id,
          imagePrompt: prompt,
        },
      });

      console.log(`[INNGEST] Successfully saved image for page ${pageId}`);

      // Check if all pages have images
      const updatedStory = await prisma.story.findUnique({
        where: { id: storyId },
        include: {
          pages: {
            include: {
              chosenImage: true
            }
          }
        }
      });

      if (updatedStory) {
        const allPagesHaveImages = updatedStory.pages.every(page => page.chosenImage);
        const pagesWithImages = updatedStory.pages.filter(page => page.chosenImage).length;
        
        console.log(`[INNGEST] Story ${storyId} progress: ${pagesWithImages}/${updatedStory.pages.length} pages have images`);
        
        if (allPagesHaveImages) {
          // Update story status to READY
          await prisma.story.update({
            where: { id: storyId },
            data: { status: StoryStatus.READY }
          });
          console.log(`[INNGEST] Story ${storyId} is now READY - all images generated`);
        }
      }

      return imageVariant;
    });

    console.log(`[INNGEST] Completed image generation for page ${pageId}`);

    return {
      success: true,
      pageId,
      storyId,
    };
  }
);
