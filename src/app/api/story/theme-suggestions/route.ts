import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import OpenAI from 'openai';
import { ElementCategory } from '@prisma/client';

interface SelectedElement {
    id: string;
    name: string;
    category: ElementCategory;
    description?: string;
    isPrimary?: boolean;
    // Any other relevant properties
}

interface VisualStyle {
    id: string;
    name: string;
}

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    organization: process.env.OPENAI_ORG_ID,
});
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json() as {
            selectedElements?: SelectedElement[];
            visualStyle?: VisualStyle | null;
            tone?: string[];
            primaryCharacterId?: string | null;
        };

        console.log(body);

        // Get these variables defined FIRST - this fixes the reference error
        const selectedElements = body.selectedElements ?? [];
        const visualStyle = body.visualStyle;
        const visualStyleName = visualStyle?.name ?? 'unknown style';
        const tone = body.tone || [];
        const primaryCharacterId = body.primaryCharacterId;

        // NOW you can safely use selectedElements in the primaryCharacter search
        const primaryCharacter = selectedElements.find(el =>
            (primaryCharacterId && el.id === primaryCharacterId) ||
            el.isPrimary === true
        );

        if (!visualStyle) {
            return NextResponse.json({ error: 'Missing visual style' }, { status: 400 });
        }

        if (!selectedElements || selectedElements.length === 0) {
            // If no elements selected, return generic suggestions
            return NextResponse.json({
                suggestions: [
                    {
                        title: "Adventure",
                        text: `An exciting ${visualStyleName} adventure where our heroes discover a hidden treasure.`
                    },
                    {
                        title: "Friendship",
                        text: `A heartwarming ${visualStyleName} story about forming new friendships.`
                    },
                    {
                        title: "Mystery",
                        text: `A puzzling ${visualStyleName} mystery where our characters solve clues.`
                    },
                    {
                        title: "Problem-solving",
                        text: `A ${visualStyleName} journey where our heroes use creativity to overcome obstacles.`
                    }
                ]
            });
        }

        // Group elements by category for more organized prompting
        const characters = selectedElements.filter(el => el.category === ElementCategory.CHARACTER);
        const pets = selectedElements.filter(el => el.category === ElementCategory.PET);
        const locations = selectedElements.filter(el => el.category === ElementCategory.LOCATION);
        const objects = selectedElements.filter(el => el.category === ElementCategory.OBJECT);

        // Create a prompt based on the selected elements and style
        let prompt = `Generate 4 creative, diverse story ideas for a children's book in ${visualStyleName} style.`;

        // Add tone information if available
        if (tone && tone.length > 0) {
            prompt += ` The tone should be ${tone.join(', ')}.`;
        }

        // Add primary character information
        if (primaryCharacter) {
            prompt += ` The main character is ${primaryCharacter.name}${primaryCharacter.description ? ` who ${primaryCharacter.description}` : ''}.`;
        }

        if (characters.length > 0) {
            const nonPrimaryCharacters = characters.filter(c => c.id !== primaryCharacterId && !c.isPrimary);
            if (nonPrimaryCharacters.length > 0) {
                prompt += ` The story should also feature these characters: ${nonPrimaryCharacters.map(c => `${c.name}${c.description ? ` who ${c.description}` : ''}`).join(', ')}.`;
            }
        }

        if (pets.length > 0) {
            const nonPrimaryPets = pets.filter(p => p.id !== primaryCharacterId && !p.isPrimary);
            if (nonPrimaryPets.length > 0) {
                prompt += ` The story should include these pets/animals: ${nonPrimaryPets.map(p => `${p.name}${p.description ? ` who ${p.description}` : ''}`).join(', ')}.`;
            }
        }

        if (locations.length > 0) {
            prompt += ` The story should take place at these locations: ${locations.map(l => l.name).join(', ')}.`;
        }

        if (objects.length > 0) {
            prompt += ` The story should incorporate these objects: ${objects.map(o => o.name).join(', ')}.`;
        }

        prompt += ` Each story idea should have a title (like "Adventure" or "Friendship") and a brief, engaging description (about 20-30 words) that parents can use as a theme for a children's book. Format the response as a JSON object with a 'suggestions' array containing objects with 'title' and 'text' fields.`;

        // Get suggestions from GPT
        const response = await openai.chat.completions.create({
            model: "gpt-4.1",
            messages: [
                {
                    role: "system",
                    content: "You are a children's book author specializing in creative, age-appropriate stories for young children."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            response_format: { type: "json_object" },
            max_tokens: 800,
        });

        const content = response.choices[0].message.content || '';

        try {
            // Parse the response (expected to be JSON)
            const parsedResponse = JSON.parse(content);

            // Check if suggestions array exists in the response
            if (Array.isArray(parsedResponse.suggestions)) {
                return NextResponse.json({ suggestions: parsedResponse.suggestions });
            } else {
                // Handle case where JSON structure is different than expected
                const suggestions = [];
                // Try to extract suggestions from whatever format was returned
                for (const [key, value] of Object.entries(parsedResponse)) {
                    if (typeof value === 'object' && value !== null) {
                        if ('title' in value && 'text' in value) {
                            suggestions.push(value);
                        }
                    }
                }

                if (suggestions.length > 0) {
                    return NextResponse.json({ suggestions });
                }

                // Fallback to generic suggestions with the style and primary character name
                const mainCharacterName = primaryCharacter?.name ||
                    (characters.length > 0 ? characters[0].name :
                        (pets.length > 0 ? pets[0].name : 'our hero'));

                return NextResponse.json({
                    suggestions: [
                        {
                            title: "Adventure",
                            text: `An exciting ${visualStyleName} adventure with ${mainCharacterName} discovering hidden treasures.`
                        },
                        {
                            title: "Friendship",
                            text: `A heartwarming ${visualStyleName} story about ${mainCharacterName} forming new friendships.`
                        },
                        {
                            title: "Discovery",
                            text: `A journey of discovery in ${visualStyleName} style with ${mainCharacterName} exploring new wonders.`
                        },
                        {
                            title: "Problem-solving",
                            text: `A ${visualStyleName} tale where ${mainCharacterName} uses creativity to overcome challenges.`
                        }
                    ]
                });
            }
        } catch (error) {
            // Fallback if parsing fails
            console.error('Failed to parse GPT response:', error);
            const mainCharacterName = primaryCharacter?.name ||
                (characters.length > 0 ? characters[0].name :
                    (pets.length > 0 ? pets[0].name : 'our hero'));

            return NextResponse.json({
                error: 'Failed to parse suggestions',
                suggestions: [
                    {
                        title: "Adventure",
                        text: `An exciting ${visualStyleName} adventure with ${mainCharacterName} discovering hidden treasures.`
                    },
                    {
                        title: "Friendship",
                        text: `A heartwarming ${visualStyleName} story about ${mainCharacterName} forming new friendships.`
                    },
                    {
                        title: "Discovery",
                        text: `A journey of discovery in ${visualStyleName} style with ${mainCharacterName} exploring new wonders.`
                    },
                    {
                        title: "Problem-solving",
                        text: `A ${visualStyleName} tale where ${mainCharacterName} uses creativity to overcome challenges.`
                    }
                ]
            });
        }
    } catch (error: any) {
        console.error('Error generating theme suggestions:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to generate theme suggestions' },
            { status: 500 }
        );
    }
}