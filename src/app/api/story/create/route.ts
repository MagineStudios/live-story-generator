import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import OpenAI from 'openai';
import { ElementCategory, StoryStatus } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

// Configure OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || '',
    organization: process.env.OPENAI_ORG_ID,
});

interface CreateStoryRequest {
    title?: string;
    prompt: string;
    styleId: string;
    styleName: string;
    narrator?: string;
    audience?: string;
    setting?: string;
    theme?: string;
    lengthInPages?: number;
    tempId?: string; // For guest users
}

interface PageImageGenerationResult {
    id: string;
    imageUrl: string | null;
    error?: string;
}

interface EditResponse {
    urls: string[];
    error?: string;
    message?: string;
}

interface CharacterDescriptor {
    type: 'CHARACTER_DESCRIPTOR' | 'SECONDARY_DESCRIPTOR' | 'OBJECT_DESCRIPTOR';
    value: string;
}

/**
 * Builds character descriptors for story generation prompt
 * following the specified format requirements
 */
async function buildCharacterDescriptors(
    userId?: string | null,
    tempId?: string | null
): Promise<CharacterDescriptor[]> {
    // Skip if no identifiers provided
    if (!userId && !tempId) return [];

    try {
        // Get all selected elements for the user/session
        const elements = await prisma.myWorldElement.findMany({
            where: {
                OR: [
                    { userId: userId || null },
                    { tempId: tempId || null }
                ]
            },
            include: {
                characterAttributes: true,
                petAttributes: true,
                objectAttributes: true,
                locationAttributes: true
            }
        });

        // Parse into properly formatted descriptors
        const descriptors: CharacterDescriptor[] = [];
        const objects: string[] = [];
        let secondaryCount = 1;

        for (const element of elements) {
            switch (element.category) {
                case ElementCategory.CHARACTER:
                    if (element.characterAttributes) {
                        const char = element.characterAttributes;
                        descriptors.push({
                            type: 'CHARACTER_DESCRIPTOR',
                            value: `"${element.name} (${char.age || 'unknown age'}; ${char.gender || 'unknown gender'}; ${char.ethnicity || 'Caucasian'}; ${char.hairColor || ''} ${char.hairStyle || 'hair'}; ${char.skinColor || 'skin'}; ${char.eyeColor || 'eyes'}; wearing ${char.outfit || 'casual clothes'}, ${char.accessories || 'no accessories'})"`
                        });
                    }
                    break;

                case ElementCategory.PET:
                    if (element.petAttributes) {
                        const pet = element.petAttributes;
                        descriptors.push({
                            type: 'SECONDARY_DESCRIPTOR',
                            value: `"${element.name} (${pet.breed || 'pet'}; ${pet.furColor || ''} ${pet.furStyle || 'fur'}; ${pet.markings || 'no markings'}; wearing ${pet.collar || 'no collar'})"`
                        });
                        secondaryCount++;
                    }
                    break;

                case ElementCategory.LOCATION:
                    if (element.locationAttributes) {
                        const loc = element.locationAttributes;
                        descriptors.push({
                            type: 'SECONDARY_DESCRIPTOR',
                            value: `"${element.name} (location; ${loc.locationType || 'place'}; ${loc.setting || ''}; ${loc.timeOfDay || ''})"`
                        });
                        secondaryCount++;
                    }
                    break;

                case ElementCategory.OBJECT:
                    if (element.objectAttributes) {
                        const obj = element.objectAttributes;
                        objects.push(`${element.name} (${obj.primaryColor || ''} ${obj.material || ''} ${element.description || ''})`.trim());
                    } else {
                        objects.push(element.name);
                    }
                    break;
            }
        }

        // Add object descriptor if there are any objects
        if (objects.length > 0) {
            descriptors.push({
                type: 'OBJECT_DESCRIPTOR',
                value: `"${objects.join('; ')}"`
            });
        }

        return descriptors;
    } catch (error) {
        console.error('Error building character descriptors:', error);
        return [];
    }
}

/**
 * Retrieves the visual style prompt template for story generation
 */
async function getVisualStyleTemplate(styleId: string): Promise<string> {
    try {
        // Get the visual style with its prompt template
        const style = await prisma.visualStyle.findUnique({
            where: { id: styleId },
            select: { promptTemplate: true }
        });

        // Return the template or a default if not found
        return style?.promptTemplate || `Art Style & Rendering:
Standard illustration style; vibrant colors; expressive characters; dynamic compositions`;
    } catch (error) {
        console.error('Error fetching visual style template:', error);
        return `Art Style & Rendering:
Standard illustration style; vibrant colors; expressive characters; dynamic compositions`;
    }
}

/**
 * Builds the complete story generation prompt with illustration templates
 */
async function buildStoryGenerationPrompt(
    prompt: string,
    styleId: string,
    styleName: string,
    userId?: string | null,
    tempId?: string | null,
    narrator?: string,
    audience?: string,
    setting?: string,
    theme?: string,
    lengthInPages: number = 5
): Promise<string> {
    // Get character descriptors
    const characterDescriptors = await buildCharacterDescriptors(userId, tempId);

    // Get visual style template
    const styleTemplate = await getVisualStyleTemplate(styleId);

    // Format the character descriptor section
    let descriptorSection = '';
    if (characterDescriptors.length > 0) {
        const characterLines = characterDescriptors.map(desc => {
            if (desc.type === 'CHARACTER_DESCRIPTOR') {
                return `CHARACTER_DESCRIPTOR = ${desc.value}`;
            } else if (desc.type === 'SECONDARY_DESCRIPTOR') {
                return `SECONDARY_DESCRIPTOR_${characterDescriptors.indexOf(desc) + 1} = ${desc.value}`;
            } else {
                return `OBJECT_DESCRIPTOR = ${desc.value}`;
            }
        });
        descriptorSection = characterLines.join('\n');
    }

    // Format additional context
    let additionalContext = '';
    if (narrator) additionalContext += `Narrator: ${narrator}. `;
    if (audience) additionalContext += `Target audience: ${audience}. `;
    if (setting) additionalContext += `Setting: ${setting}. `;
    if (theme) additionalContext += `Theme: ${theme}. `;

    // Get onboarding session data for additional context
    let onboarding = null;
    if (userId || tempId) {
        onboarding = await prisma.onboardingSession.findUnique({
            where: userId ? { userId } : { tempId: tempId || undefined }
        });

        if (onboarding) {
            if (onboarding.storyGoal?.length) {
                additionalContext += `Goals: ${onboarding.storyGoal.join(', ')}. `;
            }
            if (onboarding.tone?.length) {
                additionalContext += `Tone: ${onboarding.tone.join(', ')}. `;
            }
        }
    }

    // Build the full template-based prompt
    return `Generate a ${lengthInPages}-page ${styleName} story with illustration prompts based on the prompt: "${prompt}"

---
PHASE 1: DESCRIPTOR EXTRACTION

${descriptorSection || 'After analyzing the prompt, output one line for each character that should be included in the story. Each line must follow these exact formats:'}

# Dynamic Character Definitions:
# CHARACTER_DESCRIPTOR = "[Name] ([Age]; [Gender]; [Ethnicity]; [Hair Color & Style]; [Skin]; [Eyes]; wearing [Top], [Bottom], [Footwear])"
# SECONDARY_DESCRIPTOR_N = "[Name] ([Species/Type]; [Description]; [Color/Markings]; [Accessories])"
# OBJECT_DESCRIPTOR = "[List of significant objects in the story, separated by semicolons]"

---
PHASE 2: STORY + ILLUSTRATION PROMPTS

STORY CONTEXT:
${additionalContext}
Topic: ${prompt}

IMPORTANT RULES FOR CHARACTER USAGE:
1. In Phase 1, output descriptors with their labels (e.g., "CHARACTER_DESCRIPTOR = "...")
2. In illustration prompts, use ONLY the text inside the quotes, WITHOUT the labels
3. MAINTAIN ABSOLUTE CONSISTENCY for ALL characters throughout ALL pages
4. NEVER abbreviate character descriptions after the first page

For each of ${lengthInPages} pages, provide a story snippet and its illustration prompt:

### Page <n>

*<Creative, age-appropriate story snippet featuring the characters in the provided prompt.*

Illustration Prompt:

Scene Overview:
[Shot type] of [FULL CHARACTER DESCRIPTION WITHOUT LABELS] in [scene context]. Include all characters with their FULL AND EXACT descriptions.

Foreground:
[Description of primary actions or poses]

Midground:
[Description of secondary elements or characters]

Background:
[Description of environment or setting]

Hidden Detail:
[A single Easter-egg motif tied to the theme]

Art Style & Rendering:
${styleTemplate}

Mood & Expression:
[Emotional tone and expressions of characters]

Speech Bubbles (${styleName} Style):
Classic speech bubbles with thin outline; text in a font appropriate to ${styleName}; positioned near the speaker with a tail pointing toward the mouth.

IMPORTANT FORMATTING RULES:
1. Each section header must be on its own line
2. Each section's content must immediately follow its header on the next line
3. DO NOT use numbers or bullets for any part of the illustration prompt
4. Include the FULL character descriptions on EVERY page

Format your response as JSON with the following structure:
{
  "title": "The title of the story",
  "pages": [
    {
      "pageNumber": 1,
      "storyText": "Text for page 1",
      "illustrationPrompt": "Complete illustration prompt for page 1"
    },
    {
      "pageNumber": 2,
      "storyText": "Text for page 2",
      "illustrationPrompt": "Complete illustration prompt for page 2"
    },
    ...
  ]
}`;
}

// Generate story content using OpenAI with the template-based prompt
async function generateStoryContent(
    prompt: string,
    styleId: string,
    styleName: string,
    userId: string | null,
    tempId?: string,
    narrator?: string,
    audience?: string,
    setting?: string,
    theme?: string,
    tones: string[] = [],
    lengthInPages: number = 5
): Promise<{ title: string; pages: { storyText: string; illustrationPrompt: string }[] }> {
    try {

        const systemPrompt = `
            You are an expert children's book author who writes in the ${styleName} style.
            Create a ${lengthInPages}-page children's story about: "${prompt}"
            ${tones.length > 0 ? `The tone should be: ${tones.join(', ')}` : ''}
            
            Format your response as JSON with the following structure:
            {
                "title": "The title of the story",
                "pages": [
                    {
                        "storyText": "Text for page 1",
                        "illustrationPrompt": "Detailed illustration description for page 1"
                    },
                    ...
                ]
            }
            
            - Each page should be 1-3 short sentences suitable for a children's book
            - The story should have a clear beginning, middle, and end
            - Make the story exactly ${lengthInPages} pages long
            - Each illustration prompt should be detailed and reflect the ${styleName} style
        `;
        // Build the complete template-based prompt
        const templatePrompt = await buildStoryGenerationPrompt(
            prompt, styleId, styleName, userId, tempId,
            narrator, audience, setting, theme, lengthInPages
        );

        // Log the prompt for debugging (beginning only)
        console.log('Generated prompt for story (first 200 chars):', templatePrompt.substring(0, 200) + '...');

        // Call OpenAI with the template-based prompt
        const response = await openai.chat.completions.create({
            model: "gpt-4.1",
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "system",
                    content: systemPrompt,
                },
                {
                    role: "user",
                    content: `Create a ${styleName} style story with ${lengthInPages} pages and detailed illustration prompts based on: "${prompt}"`,
                },
            ],
            temperature: 0.7,
        });



        const content = response.choices[0].message.content;

        console.log('Generated story content:', content);
        if (!content) {
            throw new Error("Failed to generate story content");
        }
        // return;

        // Parse the JSON response
        const storyData = JSON.parse(content) as {
            title: string;
            pages: { pageNumber: number; storyText: string; illustrationPrompt: string }[]
        };

        return {
            title: storyData.title,
            pages: storyData.pages.map(page => ({
                storyText: page.storyText,
                illustrationPrompt: page.illustrationPrompt
            })).slice(0, lengthInPages),
        };
    } catch (error) {
        console.error("Error generating story content:", error);
        throw new Error("Failed to generate story content");
    }
}

// Helper function to generate images for a story
async function generateStoryImages(storyId: string, pages: { storyText: string; illustrationPrompt: string }[], visualStyle: string): Promise<void> {
    try {
        // Get the story's user ID
        const story = await prisma.story.findUnique({
            where: { id: storyId },
            select: { userId: true, styleName: true }
        });

        if (!story) throw new Error('Story not found');

        const userId = story.userId;

        // Generate images for each page
        const imagePromises = pages.map(async (page, index): Promise<PageImageGenerationResult | null> => {
            try {
                // First, get the specific page record
                const pageRecord = await prisma.storyPage.findFirst({
                    where: {
                        storyId,
                        index,
                    },
                });

                if (!pageRecord) {
                    console.error(`Page not found for index ${index}`);
                    return null;
                }

                // For the first image generation, we don't have a source image to edit
                // So we'll use our standard "no source image" base for edit API
                // Get the base image from the public directory
                const baseImagePath = path.join(process.cwd(), 'public', 'assets', 'base-image.png');
                const baseImageBuffer = await fs.readFile(baseImagePath);
                const imageFile = new File([baseImageBuffer], 'base-image.png', { type: 'image/png' });

                // Create the form data for the edit API
                const formData = new FormData();
                formData.append('image', imageFile);

                // Use the illustration prompt from the generated content instead of just page text
                formData.append('prompt', page.illustrationPrompt);
                formData.append('model', 'gpt-image-1');
                formData.append('quality', 'low');
                formData.append('size', '1024x1536'); // Portrait for children's book
                formData.append('n', '1');

                // Use fetch with the server's full URL to call our edit API endpoint
                const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
                const editResponse = await fetch(`${baseUrl}/api/images/edit`, {
                    method: 'POST',
                    body: formData,
                });

                if (!editResponse.ok) {
                    const error = await editResponse.json() as { message?: string };
                    throw new Error(`Image generation failed: ${error.message || 'Unknown error'}`);
                }

                const { urls } = await editResponse.json() as EditResponse;

                if (!urls || urls.length === 0) {
                    throw new Error('No image generated');
                }

                const imageUrl = urls[0];

                // Find the imageVariant created by the edit API
                const imageVariant = await prisma.imageVariant.findFirst({
                    where: {
                        secureUrl: imageUrl,
                        ...(userId ? { userId } : {}),
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                });

                if (!imageVariant) {
                    throw new Error('Failed to find the created image variant');
                }

                // Update the imageVariant to link it to the page
                const updatedVariant = await prisma.imageVariant.update({
                    where: { id: imageVariant.id },
                    data: {
                        pageId: pageRecord.id,
                        templateKey: 'original',
                        isChosen: true
                    }
                });

                // Update the page with the chosen image
                await prisma.storyPage.update({
                    where: {
                        id: pageRecord.id,
                    },
                    data: {
                        chosenImageId: updatedVariant.id,
                    },
                });

                return {
                    id: updatedVariant.id,
                    imageUrl: updatedVariant.secureUrl
                };
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error(`Error generating image for page ${index}:`, errorMessage);
                return {
                    id: `error-${index}`,
                    imageUrl: null,
                    error: errorMessage
                };
            }
        });

        await Promise.all(imagePromises);

        // Update story status to READY
        await prisma.story.update({
            where: { id: storyId },
            data: { status: StoryStatus.READY }
        });

    } catch (error) {
        console.error('Error in image generation process:', error);

        // Update story status to ERROR if the process fails
        await prisma.story.update({
            where: { id: storyId },
            data: { status: StoryStatus.CANCELLED }
        });
    }
}

export async function POST(req: NextRequest) {
    // Debug logging for each request
    console.log("Story create endpoint called");
    try {
        // Get authenticated user using the existing auth method
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Parse request body
        const requestData = await req.json() as CreateStoryRequest;
        const {
            prompt,
            styleId,
            styleName,
            narrator,
            audience,
            setting,
            theme = 'adventure', // Default theme
            lengthInPages = 5,  // Default to 5 pages
            title: providedTitle,
            tempId,              // For guest users
        } = requestData;

        console.log(requestData)

        // Validate required fields
        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        if (!styleId || !styleName) {
            return NextResponse.json({ error: 'Style information is required' }, { status: 400 });
        }

        // Get visual style from database
        const visualStyle = await prisma.visualStyle.findUnique({
            where: { id: styleId },
            select: { id: true, name: true }
        });

        if (!visualStyle) {
            return NextResponse.json({ error: 'Selected visual style not found' }, { status: 404 });
        }

        // Create initial story record with GENERATING status
        const story = await prisma.story.create({
            data: {
                userId,
                tempId: userId ? null : tempId, // Use tempId for guest users
                title: providedTitle || 'Creating your story...',
                theme: prompt, // Use prompt as theme
                visualStyle: styleId, // Store the styleId reference
                styleName, // Store the style name for easy reference
                status: StoryStatus.GENERATING,
                language: 'en',
            }
        });

        // Link story to onboarding session if available
        if (userId || tempId) {
            const onboarding = await prisma.onboardingSession.findUnique({
                where: userId ? { userId } : { tempId: tempId || undefined }
            });

            if (onboarding) {
                await prisma.onboardingSession.update({
                    where: { id: onboarding.id },
                    data: { storyId: story.id }
                });
            }
        }

        // Link selected elements to the story
        if (userId || tempId) {
            const elements = await prisma.myWorldElement.findMany({
                where: {
                    OR: [
                        { userId: userId || null },
                        { tempId: tempId || null }
                    ]
                }
            });

            if (elements.length > 0) {
                const storyElements = elements.map(element => ({
                    storyId: story.id,
                    elementId: element.id
                }));

                await prisma.storyElement.createMany({
                    data: storyElements
                });
            }
        }

        // Start the async generation process
        // We'll respond to the client first, then continue processing
        void (async () => {
            try {
                // Generate the story content with illustration prompts
                const { title, pages } = await generateStoryContent(
                    prompt,
                    styleId,
                    styleName,
                    userId,
                    tempId,
                    narrator,
                    audience,
                    setting,
                    theme,
                    [],                // tones
                    lengthInPages      // page count
                );

                // Update the story title (if not provided)
                await prisma.story.update({
                    where: { id: story.id },
                    data: {
                        title: providedTitle || title,
                        status: StoryStatus.GENERATING,
                    },
                });

                // Create page records in the database
                const pagePromises = pages.map((page, index) =>
                    prisma.storyPage.create({
                        data: {
                            storyId: story.id,
                            text: page.storyText,
                            index,
                            // Store the illustration prompt in microprompts
                            microprompts: [page.illustrationPrompt],
                        },
                    })
                );

                await Promise.all(pagePromises);

                // Generate images for each page
                await generateStoryImages(story.id, pages, styleName);
            } catch (error) {
                console.error('Error in story generation process:', error);
                // Update the story status to ERROR if something goes wrong
                await prisma.story.update({
                    where: { id: story.id },
                    data: { status: StoryStatus.CANCELLED },
                });
            }
        })();

        // Respond immediately with the story ID
        return NextResponse.json({
            id: story.id,
            message: 'Story generation started',
            status: StoryStatus.GENERATING
        });
    } catch (error) {
        console.error('Error creating story:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}