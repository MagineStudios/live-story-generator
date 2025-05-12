import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import OpenAI from 'openai';
import { ElementCategory } from '@prisma/client';

interface SelectedElement {
  id: string;
  name: string;
  category: ElementCategory;
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

        const body = (await req.json()) as {
            selectedElements?: SelectedElement[];
            visualStyle?: VisualStyle | null;
        };

        const selectedElements = body.selectedElements ?? [];
        const visualStyle = body.visualStyle;
        const visualStyleName = visualStyle?.name ?? 'unknown style';

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

        if (characters.length > 0) {
            prompt += ` The story should feature these characters: ${characters.map(c => c.name).join(', ')}.`;
        }

        if (pets.length > 0) {
            prompt += ` The story should include these pets/animals: ${pets.map(p => p.name).join(', ')}.`;
        }

        if (locations.length > 0) {
            prompt += ` The story should take place at these locations: ${locations.map(l => l.name).join(', ')}.`;
        }

        if (objects.length > 0) {
            prompt += ` The story should incorporate these objects: ${objects.map(o => o.name).join(', ')}.`;
        }

        prompt += ` Each story idea should have a title (like "Adventure" or "Friendship") and a brief, engaging description (about 20-30 words) that parents can use as a theme for a children's book. Make them diverse in tone and themes (adventure, friendship, learning, etc). Format as JSON with an array of objects containing "title" and "text" fields.`;

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

                // Fallback to generic suggestions with the style
                return NextResponse.json({
                    suggestions: [
                        {
                            title: "Adventure",
                            text: `An exciting ${visualStyleName} adventure with ${characters[0]?.name || 'our hero'}.`
                        },
                        {
                            title: "Friendship",
                            text: `A heartwarming ${visualStyleName} story about forming new friendships.`
                        },
                        {
                            title: "Discovery",
                            text: `A journey of discovery in ${visualStyleName} style with ${characters[0]?.name || 'our characters'}.`
                        },
                        {
                            title: "Problem-solving",
                            text: `A ${visualStyleName} tale where characters work together to solve challenges.`
                        }
                    ]
                });
            }
        } catch (error) {
            // Fallback if parsing fails
            console.error('Failed to parse GPT response:', error);
            return NextResponse.json({
                error: 'Failed to parse suggestions',
                suggestions: [
                    {
                        title: "Adventure",
                        text: `An exciting ${visualStyleName} adventure with ${characters[0]?.name || 'our hero'}.`
                    },
                    {
                        title: "Friendship",
                        text: `A heartwarming ${visualStyleName} story about forming new friendships.`
                    },
                    {
                        title: "Discovery",
                        text: `A journey of discovery in ${visualStyleName} style with ${characters[0]?.name || 'our characters'}.`
                    },
                    {
                        title: "Problem-solving",
                        text: `A ${visualStyleName} tale where characters work together to solve challenges.`
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