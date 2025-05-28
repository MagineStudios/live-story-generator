import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';
import { ElementCategory, StoryStatus } from '@prisma/client';

/**
 * Story Creation API Endpoint
 * 
 * Creates a story with detailed illustration prompts.
 * - Stories are created with text and illustration prompts
 * - Images are generated separately by the Review component
 * - Prompts include all character/pet/location/object attributes
 * - Visual style templates are incorporated into prompts
 * 
 * The story remains in GENERATING status until images are created.
 */

// Lazy initialization of OpenAI client
let openai: OpenAI | null = null;

function getOpenAIClient() {
    if (!openai) {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY is not configured');
        }
        openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
            organization: process.env.OPENAI_ORG_ID,
        });
    }
    return openai;
}

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
    primaryCharacterId?: string | null;
    tone?: string[];
}

interface CharacterDescriptor {
    type: 'CHARACTER_DESCRIPTOR' | 'SECONDARY_DESCRIPTOR' | 'OBJECT_DESCRIPTOR';
    value: string;
    isPrimary?: boolean;
}

/**
 * Converts hex color to a descriptive color name
 */
function hexToColorName(hex: string | null, type: 'hair' | 'skin' | 'eye'): string {
    if (!hex) return '';
    
    // Remove # if present and lowercase
    const color = hex.replace('#', '').toLowerCase();
    
    // Hair colors
    if (type === 'hair') {
        // Specific mappings from the user's data
        if (color === 'bfa369') return 'golden blonde';
        if (color === '231f20') return 'black';
        if (color === '5c4632') return 'brown';
        
        // Additional common hair colors
        if (['000000', '1a1a1a', '2b2b2b'].includes(color)) return 'black';
        if (['3d2314', '382110', '2e1a0e'].includes(color)) return 'dark brown';
        if (['654321', '704214', '8b4513'].includes(color)) return 'brown';
        if (['964b00', 'a0522d', '8b6914'].includes(color)) return 'light brown';
        if (['d4a76a', 'e5c07b', 'f4e4c1'].includes(color)) return 'blonde';
        if (['ffd700', 'ffdf00', 'f0e68c'].includes(color)) return 'bright blonde';
        if (['b7410e', 'cc5500', 'd2691e'].includes(color)) return 'auburn';
        if (['ff0000', 'dc143c', 'b22222'].includes(color)) return 'red';
        if (['c0c0c0', 'd3d3d3', 'dcdcdc'].includes(color)) return 'gray';
        if (['ffffff', 'f5f5f5', 'fafafa'].includes(color)) return 'white';
        
        // Default based on darkness
        const r = parseInt(color.substr(0, 2), 16);
        const g = parseInt(color.substr(2, 2), 16);
        const b = parseInt(color.substr(4, 2), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        
        if (brightness < 40) return 'black';
        if (brightness < 80) return 'dark brown';
        if (brightness < 130) return 'brown';
        if (brightness < 170) return 'light brown';
        if (brightness < 200) return 'dark blonde';
        return 'blonde';
    }
    
    // Skin colors
    if (type === 'skin') {
        // Specific mappings from the user's data
        if (color === 'f3c89f') return 'fair';
        if (color === '8d5524') return 'dark brown';
        if (color === 'e7bfa8') return 'light';
        if (color === '6c4f3d') return 'medium brown';
        
        // Additional skin tone mappings
        if (['3d2314', '4a312c', '614335'].includes(color)) return 'deep brown';
        if (['935d37', 'a0522d'].includes(color)) return 'brown';
        if (['c68642', 'd2691e', 'cd853f'].includes(color)) return 'medium';
        if (['d2b48c', 'daa520', 'e3a857'].includes(color)) return 'tan';
        if (['fdbcb4', 'ffd1dc'].includes(color)) return 'rosy fair';
        if (['ffe4c4', 'f5deb3'].includes(color)) return 'peachy';
        if (['ffe4e1', 'fff8dc', 'faebd7'].includes(color)) return 'pale';
        
        // Default based on brightness
        const r = parseInt(color.substr(0, 2), 16);
        const g = parseInt(color.substr(2, 2), 16);
        const b = parseInt(color.substr(4, 2), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        
        if (brightness < 80) return 'deep brown';
        if (brightness < 120) return 'dark brown';
        if (brightness < 150) return 'brown';
        if (brightness < 180) return 'medium';
        if (brightness < 210) return 'tan';
        if (brightness < 240) return 'fair';
        return 'pale';
    }
    
    // Eye colors
    if (type === 'eye') {
        // Specific mappings from the user's data
        if (color === '7b6e4f') return 'brown';
        if (color === '37251b') return 'dark brown';
        if (color === '6c4f3d') return 'hazel brown';
        
        // Additional eye color mappings
        if (['3d2314', '654321', '4b3621'].includes(color)) return 'dark brown';
        if (['8b7355', '8b6914', '996633'].includes(color)) return 'brown';
        if (['a0522d', 'cd853f', 'd2691e'].includes(color)) return 'light brown';
        if (['daa520', 'b8860b', 'ffd700'].includes(color)) return 'amber';
        if (['000080', '0000ff', '4169e1'].includes(color)) return 'blue';
        if (['1e90ff', '6495ed', '4682b4'].includes(color)) return 'steel blue';
        if (['87ceeb', '87cefa', 'add8e6'].includes(color)) return 'light blue';
        if (['006400', '228b22', '008000'].includes(color)) return 'green';
        if (['90ee90', '98fb98', '00ff00'].includes(color)) return 'light green';
        if (['808000', '6b8e23', '556b2f'].includes(color)) return 'hazel';
        if (['696969', '808080', 'a9a9a9'].includes(color)) return 'gray';
        
        // Default based on color analysis
        const r = parseInt(color.substr(0, 2), 16);
        const g = parseInt(color.substr(2, 2), 16);
        const b = parseInt(color.substr(4, 2), 16);
        
        // Blue detection
        if (b > r + 30 && b > g + 30) return 'blue';
        if (b > r && b > g && b > 100) return 'light blue';
        
        // Green detection
        if (g > r + 30 && g > b + 30) return 'green';
        if (g > r && g > b && g > 100) return 'light green';
        
        // Hazel detection (greenish-brown)
        if (Math.abs(r - g) < 30 && b < r - 20) return 'hazel';
        
        // Gray detection
        if (Math.abs(r - g) < 20 && Math.abs(g - b) < 20 && r > 100) return 'gray';
        
        // Default to brown shades
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        if (brightness < 80) return 'dark brown';
        if (brightness < 150) return 'brown';
        return 'light brown';
    }
    
    return '';
}

/**
 * Formats age for character descriptors
 */
function formatAge(age: string | null): string {
    if (!age) return 'child';
    
    // Extract numbers from age string
    const numbers = age.match(/\d+/g);
    if (!numbers) return age;
    
    // Handle age ranges (e.g., "10-12" becomes "early teens")
    if (numbers.length === 2) {
        const [min, max] = numbers.map(Number);
        const avg = (min + max) / 2;
        
        if (avg < 6) return 'young child';
        if (avg < 10) return 'child';
        if (avg < 13) return 'preteen';
        if (avg < 16) return 'early teens';
        if (avg < 19) return 'late teens';
        if (avg < 25) return 'early 20s';
        if (avg < 30) return 'late 20s';
        if (avg < 40) return '30s';
        if (avg < 50) return '40s';
        return age;
    }
    
    // Handle single ages
    const singleAge = Number(numbers[0]);
    if (singleAge < 6) return 'young child';
    if (singleAge < 10) return `${singleAge}`;
    if (singleAge < 13) return 'preteen';
    if (singleAge < 16) return 'early teens';
    if (singleAge < 19) return 'late teens';
    if (singleAge < 25) return 'early 20s';
    if (singleAge < 30) return 'late 20s';
    if (singleAge < 40) return '30s';
    if (singleAge < 50) return '40s';
    
    return `${singleAge}`;
}

/**
 * Builds character descriptors for story generation prompt
 * following the specified format requirements
 */
async function buildCharacterDescriptors(
    userId?: string | null,
    tempId?: string | null,
    primaryCharacterId?: string | null
): Promise<CharacterDescriptor[]> {
    // Skip if no identifiers provided
    if (!userId && !tempId) {
        console.log('No userId or tempId provided, skipping character descriptors');
        return [];
    }

    try {
        // Get all selected elements for the user/session
        const elements = await prisma.myWorldElement.findMany({
            where: {
                OR: [
                    ...(userId ? [{ userId }] : []),
                    ...(tempId ? [{ tempId }] : [])
                ]
            },
            include: {
                characterAttributes: true,
                petAttributes: true,
                objectAttributes: true,
                locationAttributes: true
            }
        });

        console.log(`Found ${elements.length} elements for user/session`);

        // Parse into properly formatted descriptors
        const descriptors: CharacterDescriptor[] = [];
        const objects: string[] = [];
        let secondaryCount = 1;

        for (const element of elements) {
            console.log(`Processing element: ${element.name} (${element.category})`);
            
            // Check if this is the primary character
            const isPrimary = Boolean(primaryCharacterId && element.id === primaryCharacterId);

            switch (element.category) {
                case ElementCategory.CHARACTER:
                    if (element.characterAttributes) {
                        const char = element.characterAttributes;
                        console.log(`Character attributes for ${element.name}:`, char);
                        
                        // Convert hex colors to descriptive names
                        const hairColorDesc = hexToColorName(char.hairColor, 'hair');
                        const skinColorDesc = hexToColorName(char.skinColor, 'skin');
                        const eyeColorDesc = hexToColorName(char.eyeColor, 'eye');
                        
                        console.log(`Color conversions for ${element.name}:`);
                        console.log(`  Hair: ${char.hairColor} -> ${hairColorDesc}`);
                        console.log(`  Skin: ${char.skinColor} -> ${skinColorDesc}`);
                        console.log(`  Eyes: ${char.eyeColor} -> ${eyeColorDesc}`);
                        
                        const formattedAge = formatAge(char.age);
                        
                        descriptors.push({
                            type: 'CHARACTER_DESCRIPTOR',
                            value: `"**${element.name} (${formattedAge}); ${char.gender || 'unknown gender'}; ${char.ethnicity || 'unknown ethnicity'}; ${hairColorDesc || 'brown'} ${char.hairStyle || 'hair'}; ${skinColorDesc || 'fair'} skin; ${eyeColorDesc || 'brown'} eyes; wearing ${char.outfit || 'casual clothes'}${char.accessories && char.accessories !== 'None' ? ', ' + char.accessories : ''}.**${isPrimary ? ' [PRIMARY CHARACTER]' : ''}"`,
                            isPrimary
                        });
                    } else {
                        console.log(`No character attributes for ${element.name}, using defaults`);
                        // If no attributes, create a simpler descriptor
                        descriptors.push({
                            type: 'CHARACTER_DESCRIPTOR',
                            value: `"**${element.name} (child); wearing casual clothes.**${isPrimary ? ' [PRIMARY CHARACTER]' : ''}"`,
                            isPrimary
                        });
                    }
                    break;

                case ElementCategory.PET:
                    if (element.petAttributes) {
                        const pet = element.petAttributes;
                        console.log(`Pet attributes for ${element.name}:`, pet);
                        
                        // Convert hex colors for pets
                        const furColorDesc = hexToColorName(pet.furColor, 'hair'); // Use hair mapping for fur
                        const eyeColorDesc = hexToColorName(pet.eyeColor, 'eye');
                        
                        descriptors.push({
                            type: 'SECONDARY_DESCRIPTOR',
                            value: `"**${element.name} (${pet.breed || 'pet'}; ${furColorDesc || 'brown'} ${pet.furStyle || 'fur'}; ${pet.markings || 'no markings'}; ${eyeColorDesc || 'brown'} eyes; wearing ${pet.collar || 'no collar'}).**${isPrimary ? ' [PRIMARY CHARACTER]' : ''}"`,
                            isPrimary
                        });
                        secondaryCount++;
                    } else {
                        console.log(`No pet attributes for ${element.name}, using defaults`);
                        // If no attributes, create a simpler descriptor
                        descriptors.push({
                            type: 'SECONDARY_DESCRIPTOR',
                            value: `"**${element.name} (pet).**${isPrimary ? ' [PRIMARY CHARACTER]' : ''}"`,
                            isPrimary
                        });
                        secondaryCount++;
                    }
                    break;

                case ElementCategory.LOCATION:
                    if (element.locationAttributes) {
                        const loc = element.locationAttributes;
                        console.log(`Location attributes for ${element.name}:`, loc);
                        
                        descriptors.push({
                            type: 'SECONDARY_DESCRIPTOR',
                            value: `"**${element.name} (location; ${loc.locationType || 'place'}; ${loc.setting || ''}; ${loc.timeOfDay || ''}).**"`,
                        });
                        secondaryCount++;
                    } else {
                        console.log(`No location attributes for ${element.name}, using defaults`);
                        descriptors.push({
                            type: 'SECONDARY_DESCRIPTOR',
                            value: `"**${element.name} (location).**"`,
                        });
                        secondaryCount++;
                    }
                    break;

                case ElementCategory.OBJECT:
                    if (element.objectAttributes) {
                        const obj = element.objectAttributes;
                        console.log(`Object attributes for ${element.name}:`, obj);
                        
                        // Convert hex colors for objects
                        const primaryColorDesc = hexToColorName(obj.primaryColor, 'hair'); // Generic color mapping
                        const secondaryColorDesc = hexToColorName(obj.secondaryColor, 'hair');
                        
                        const colorDesc = secondaryColorDesc 
                            ? `${primaryColorDesc || 'colored'} and ${secondaryColorDesc}` 
                            : (primaryColorDesc || 'colored');
                            
                        objects.push(`${element.name} (${colorDesc} ${obj.material || ''} ${element.description || ''})`.trim());
                    } else {
                        console.log(`No object attributes for ${element.name}, using name only`);
                        objects.push(element.name);
                    }
                    break;
            }
        }

        // Add object descriptor if there are any objects
        if (objects.length > 0) {
            descriptors.push({
                type: 'OBJECT_DESCRIPTOR',
                value: `"**${objects.join('; ')}.**"`,
            });
        }

        console.log(`Built ${descriptors.length} descriptors`);
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
            select: { 
                promptTemplate: true,
                name: true 
            }
        });

        if (!style) {
            console.warn(`Visual style not found for ID: ${styleId}`);
            return getDefaultStyleTemplate();
        }

        if (!style.promptTemplate) {
            console.warn(`No prompt template found for style: ${style.name}`);
            return getDefaultStyleTemplate();
        }

        console.log(`Using prompt template for style: ${style.name}`);
        return style.promptTemplate;
    } catch (error) {
        console.error('Error fetching visual style template:', error);
        return getDefaultStyleTemplate();
    }
}

function getDefaultStyleTemplate(): string {
    return `**Art Style & Rendering:**
Rendered in expressive animation style with natural fabric texture, dynamic hair motion, subtle motion blur for action, and rich, saturated lighting. Character expressions are finely detailed, balancing realism and stylized charm.

**Mood & Expression:**
Dynamic emotions with clear character expressions; engaging body language; atmospheric lighting that enhances the mood.

**Speech Bubbles (Fredoka One font, #333333, white background, 3px dark gray outline, rounded corners):**
Professional comic-style speech bubbles with clear, readable text positioned near speakers.`;
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
    lengthInPages: number = 5,
    tone?: string[],
    primaryCharacterId?: string | null
): Promise<string> {
    // Get character descriptors with primary character information
    const characterDescriptors = await buildCharacterDescriptors(userId, tempId, primaryCharacterId);

    // Find the primary character if it exists
    const primaryCharacter = characterDescriptors.find(desc => desc.isPrimary);

    // Get visual style template
    const styleTemplate = await getVisualStyleTemplate(styleId);

    // Format the character descriptor section
    let descriptorSection = '';
    if (characterDescriptors.length > 0) {
        // Start with primary character if it exists
        const sortedDescriptors = [...characterDescriptors].sort((a, b) => {
            if (a.isPrimary) return -1;
            if (b.isPrimary) return 1;
            return 0;
        });

        const characterLines = sortedDescriptors.map((desc, index) => {
            if (desc.type === 'CHARACTER_DESCRIPTOR') {
                return `CHARACTER_DESCRIPTOR = ${desc.value}`;
            } else if (desc.type === 'SECONDARY_DESCRIPTOR') {
                return `SECONDARY_DESCRIPTOR_${index + 1} = ${desc.value}`;
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
    if (tone && tone.length > 0) {
        additionalContext += `Tone: ${tone.join(', ')}. `;
    }

    // Add primary character emphasis if applicable
    if (primaryCharacter) {
        additionalContext += `Focus on the primary character in the story. The PRIMARY CHARACTER should be the main protagonist. `;
    }

    // Get onboarding session data for additional context
    let onboarding = null;
    if (userId || tempId) {
        onboarding = await prisma.onboardingSession.findUnique({
            where: userId ? { userId } : { tempId: tempId || undefined }
        });

        if (onboarding) {
            if (onboarding.storyGoal?.length) {
                additionalContext += `Story Goals: ${onboarding.storyGoal.join(', ')}. `;
            }
        }
    }

    // Build the full template-based prompt
    return `Generate a ${lengthInPages}-page ${styleName} story with detailed illustration prompts based on: "${prompt}"

CHARACTER DESCRIPTORS:
${descriptorSection || 'No specific characters provided'}

STORY CONTEXT:
${additionalContext}

IMPORTANT: For EVERY page's illustration prompt, include:
1. FULL character descriptions (never abbreviate)
2. The exact ${styleName} visual style
3. All character attributes on every appearance
${primaryCharacter ? "4. Focus on the PRIMARY CHARACTER as the main protagonist" : ""}

For each page, provide story text and a detailed illustration prompt with these EXACT sections using bold headers:

**Scene Overview:**
Full scene description with complete character details in this format:
**Character Name (age); Gender; Ethnicity; hair color and style; skin tone; eye color; wearing [detailed outfit description].**

**Foreground:**
Detailed description of main action and characters

**Midground:**
Supporting elements and secondary characters

**Background:**
Environmental details and atmosphere

**Hidden Detail:**
A fun easter egg or small detail

**Art Style & Rendering:**
[Use the specific style template for ${styleName}]

**Mood & Expression:**
Character emotions and atmosphere

**Speech Bubbles (Fredoka One font, #333333, white background, 3px dark gray outline, rounded corners):**
**Character Name:** "Dialogue here"

Return ONLY valid JSON in this exact format:
{
  "title": "Story Title",
  "pages": [
    {
      "pageNumber": 1,
      "storyText": "1-3 sentences for page 1",
      "illustrationPrompt": "[Complete prompt with all sections above, using bold markdown headers]"
    }
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
    lengthInPages: number = 5,
    primaryCharacterId?: string | null
): Promise<{ title: string; pages: { storyText: string; illustrationPrompt: string }[] }> {
    try {
        // Build the complete template-based prompt with all character descriptors
        const templatePrompt = await buildStoryGenerationPrompt(
            prompt, styleId, styleName, userId, tempId,
            narrator, audience, setting, theme, lengthInPages, tones, primaryCharacterId
        );

        // Log the full prompt for debugging in development
        console.log('=== FULL STORY GENERATION PROMPT ===');
        console.log('Prompt length:', templatePrompt.length);
        console.log('First 500 chars:', templatePrompt.substring(0, 500));
        console.log('=== END PROMPT ===');

        const systemPrompt = `You are an expert children's book author and illustrator who creates detailed stories with comprehensive illustration prompts. 
        
        You MUST follow the exact format specified in the user's prompt, including:
        1. Using **bold markdown headers** for each section (e.g., **Scene Overview:**, **Foreground:**, etc.)
        2. Character descriptions in Scene Overview must follow this exact format:
           **Name (age); Gender; Ethnicity; hair description; skin tone; eye color; wearing [outfit details].**
        3. Speech bubbles MUST include the exact styling: 
           **Speech Bubbles (Fredoka One font, #333333, white background, 3px dark gray outline, rounded corners):**
           **Character Name:** "Dialogue"
        4. Creating vivid, dynamic descriptions with action and emotion
        5. Maintaining absolute character consistency across all pages
        6. Including the exact visual style (${styleName}) in every illustration prompt
        7. Formatting the response as valid JSON
        
        CRITICAL: 
        - Use bold markdown (**text**) for all section headers
        - In illustration prompts, include EVERY detail about characters on EVERY page
        - Make scenes dynamic with action verbs and emotional descriptions
        - Speech bubbles must always include the font and styling specifications
        - Keep your response concise enough to fit within token limits
        - Ensure valid JSON formatting with properly escaped strings`;

        // Call OpenAI with the template-based prompt
        const response = await getOpenAIClient().chat.completions.create({
            model: "gpt-4.1", // Keep using gpt-4.1 for better writing quality
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "system",
                    content: systemPrompt,
                },
                {
                    role: "user",
                    content: templatePrompt,
                },
            ],
            temperature: 0.7,
            max_completion_tokens: 20000, // Increased for detailed prompts
        });

        const content = response.choices[0].message.content;

        console.log('=== GENERATED STORY RESPONSE ===');
        console.log('Response length:', content?.length || 0);
        console.log('First 500 chars:', content?.substring(0, 500) || 'No content');
        console.log('Last 500 chars:', content?.substring(Math.max(0, (content?.length || 0) - 500)) || 'No content');
        console.log('=== END RESPONSE ===');
        
        if (!content) {
            throw new Error("Failed to generate story content - no response");
        }

        // Parse the JSON response with error handling
        let storyData: {
            title: string;
            descriptors?: {
                characters?: string[];
                objects?: string[];
                locations?: string[];
            };
            pages: { pageNumber?: number; storyText: string; illustrationPrompt: string }[]
        };

        try {
            storyData = JSON.parse(content);
        } catch (parseError) {
            console.error('JSON Parse Error:', parseError);
            console.error('Failed to parse content length:', content.length);
            
            // Try to find where the JSON might be truncated
            const lastBrace = content.lastIndexOf('}');
            const lastBracket = content.lastIndexOf(']');
            console.error('Last } at position:', lastBrace);
            console.error('Last ] at position:', lastBracket);
            
            // Log the last part of the content to see where it was cut off
            console.error('Last 1000 characters:', content.substring(Math.max(0, content.length - 1000)));
            
            throw new Error(`Failed to parse story JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}. Response may have been truncated.`);
        }

        // Validate the response structure
        if (!storyData.title || !storyData.pages || !Array.isArray(storyData.pages)) {
            throw new Error("Invalid story data structure - missing title or pages");
        }

        // Log the descriptors if they exist
        if (storyData.descriptors) {
            console.log('=== EXTRACTED DESCRIPTORS ===');
            console.log('Characters:', storyData.descriptors.characters);
            console.log('Objects:', storyData.descriptors.objects);
            console.log('Locations:', storyData.descriptors.locations);
            console.log('=== END DESCRIPTORS ===');
        }

        // Log page count and first illustration prompt for verification
        console.log(`Generated ${storyData.pages.length} pages`);
        if (storyData.pages.length > 0) {
            console.log('=== FIRST PAGE ILLUSTRATION PROMPT ===');
            console.log('Length:', storyData.pages[0].illustrationPrompt?.length || 0);
            console.log('Preview:', storyData.pages[0].illustrationPrompt?.substring(0, 200) || 'No prompt');
            console.log('=== END FIRST PROMPT ===');
        }

        // Ensure we have the correct number of pages
        const pages = storyData.pages.slice(0, lengthInPages);
        
        if (pages.length < lengthInPages) {
            console.warn(`Only received ${pages.length} pages, expected ${lengthInPages}`);
        }

        return {
            title: storyData.title,
            pages: pages.map(page => ({
                storyText: page.storyText || '',
                illustrationPrompt: page.illustrationPrompt || ''
            })),
        };
    } catch (error) {
        console.error("Error generating story content:", error);
        
        // More specific error message
        if (error instanceof Error) {
            throw new Error(`Story generation failed: ${error.message}`);
        }
        throw new Error("Failed to generate story content");
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
            primaryCharacterId,
            title: providedTitle,
            tempId,              // For guest users
            tone = [],           // Default to empty array
        } = requestData;

        console.log("Story creation request data:", {
            prompt,
            styleId,
            styleName,
            primaryCharacterId,
            tone
        });

        // If there's a primary character specified, include it in the prompt
        let primaryCharacter = null;
        if (primaryCharacterId) {
            primaryCharacter = await prisma.myWorldElement.findUnique({
                where: { id: primaryCharacterId },
                include: {
                    characterAttributes: true,
                    petAttributes: true
                }
            });

            if (primaryCharacter) {
                console.log(`Primary character found: ${primaryCharacter.name}`);
            } else {
                console.log(`Primary character ID ${primaryCharacterId} not found`);
            }
        }

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
                // Store primary character ID if provided
                // primaryCharacterId: primaryCharacterId || null
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
                        ...(userId ? [{ userId }] : []),
                        ...(tempId ? [{ tempId }] : [])
                    ]
                }
            });

            if (elements.length > 0) {
                const storyElements = elements.map(element => {
                    // Explicitly convert to boolean
                    const isPrimary = Boolean(primaryCharacterId && element.id === primaryCharacterId);

                    return {
                        storyId: story.id,
                        elementId: element.id,
                        isPrimary: isPrimary // This will always be a boolean (true or false)
                    };
                });

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
                    tone,
                    lengthInPages,
                    primaryCharacterId
                );

                // Update the story title (if not provided)
                if (!providedTitle && title) {
                    await prisma.story.update({
                        where: { id: story.id },
                        data: {
                            title: title,
                        },
                    });
                }

                // Create page records in the database
                const pagePromises = pages.map((page, index) => {
                    console.log(`=== PAGE ${index + 1} DATA ===`);
                    console.log('Story Text:', page.storyText);
                    console.log('Illustration Prompt Length:', page.illustrationPrompt.length);
                    console.log('Illustration Prompt Preview:', page.illustrationPrompt.substring(0, 200) + '...');
                    
                    return prisma.storyPage.create({
                        data: {
                            storyId: story.id,
                            text: page.storyText,
                            index,
                            // Store the full illustration prompt in dedicated field
                            illustrationPrompt: page.illustrationPrompt,
                            // microprompts can be used for smaller, focused prompts later
                            microprompts: [],
                        },
                    });
                });

                await Promise.all(pagePromises);

                // Keep status as GENERATING - images will be generated by the Review component
                // Don't update to READY yet
                // await prisma.story.update({
                //     where: { id: story.id },
                //     data: { status: StoryStatus.READY },
                // });

                console.log('Story pages created with illustration prompts. Images will be generated on the review page.');
            } catch (error) {
                console.error('Error in story generation process:', error);
                // Update the story status to ERROR if something goes wrong
                await prisma.story.update({
                    where: { id: story.id },
                    data: { status: StoryStatus.CANCELLED },
                });
            }
        })();

        // Respond immediately with the story ID and proper response format
        return NextResponse.json({
            id: story.id,
            storyId: story.id, // Some components might expect this
            message: 'Story generation started',
            status: StoryStatus.GENERATING
        });
    } catch (error) {
        console.error('Error creating story:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}