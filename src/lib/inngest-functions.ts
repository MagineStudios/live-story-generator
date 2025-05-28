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
  },
  { event: "story/images.generate" },
  async ({ event, step }) => {
    const { storyId, pageId, prompt, userId } = event.data;

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

      return story;
    });

    // Step 2: Generate the image
    const imageData = await step.run("generate-image", async () => {
      const apiKey = process.env.OPENAI_API_KEY;
      const orgId = process.env.OPENAI_ORG_ID;

      if (!apiKey || !orgId) {
        throw new Error("OpenAI API credentials not configured");
      }

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
          quality: GeneratedImageQuality.High,
          moderation: 'low',
          size: GeneratedImageSize.Portrait,
          n: 1,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to generate image');
      }

      const data = await response.json();
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

      return await uploadToCloudinary(
        imageData.b64_json,
        cloudinaryPath,
        'image'
      );
    });

    // Step 4: Save to database
    await step.run("save-to-database", async () => {
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
        
        if (allPagesHaveImages) {
          // Update story status to READY
          await prisma.story.update({
            where: { id: storyId },
            data: { status: StoryStatus.READY }
          });
        }
      }

      return imageVariant;
    });

    return {
      success: true,
      pageId,
      storyId,
    };
  }
);
