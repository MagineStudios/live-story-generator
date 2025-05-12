// app/api/theme-suggestions/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const { elements, images, style } = await req.json();

    const prompt = `
You are an assistant that suggests four creative story themes based on the following story elements, images, and style.

Story Elements:
${JSON.stringify(elements, null, 2)}

Images:
${JSON.stringify(images, null, 2)}

Style:
${JSON.stringify(style, null, 2)}

Please provide exactly four theme suggestions. Each suggestion should include:
- title: a short, catchy title
- description: a brief description of the theme
- prompt: a concise prompt that can be used to generate the story based on this theme

Respond with a JSON object in the following format:

{
  "suggestions": [
    {
      "title": "string",
      "description": "string",
      "prompt": "string"
    },
    ...
  ]
}
`;

    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-4.1',
            messages: [
                { role: 'system', content: 'You are a helpful assistant.' },
                { role: 'user', content: prompt },
            ],
            temperature: 0.8,
        });

        const responseText = completion.choices[0].message?.content ?? '';

        const parsed = JSON.parse(responseText);

        if (!parsed.suggestions || !Array.isArray(parsed.suggestions)) {
            throw new Error('Invalid response format');
        }

        return NextResponse.json(parsed);
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to generate theme suggestions' },
            { status: 500 }
        );
    }
}