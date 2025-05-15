// src/scripts/seed-visual-styles.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const styles = [
        {
            id: 'cartoonish',
            name: 'Cartoonish',
            color: '#FFD166',
            textColor: '#000000',
            description: 'Fun and playful cartoon style with bold colors and simple shapes.',
            imageUrl: '',
            promptTemplate: `Art Style & Rendering:
2D cartoon style; vibrant hand-drawn lines; bold outlines; bright, saturated colors; simplified forms; playful proportions with exaggerated features; flat color areas with minimal shading; cheerful, energetic compositions; whimsical background details; clean, crisp lines.

Mood & Expression:
Playful, energetic expressions; wide, expressive eyes; exaggerated emotions; animated poses and gestures; dynamic movement lines; simplified but highly emotive facial features; cheerful, positive atmosphere.

Speech Bubbles (Cartoon Style):
Classic oval speech bubbles with bold outlines; text in a playful comic sans-like font; bright colors; varied bubble shapes to indicate different emotions; action words and sound effects integrated into the scene.`,
            isDefault: true
        },
        {
            id: 'watercolor',
            name: 'Watercolor',
            color: '#06D6A0',
            textColor: '#000000',
            description: 'Soft, artistic watercolor paintings with gentle color blending.',
            imageUrl: '',
            promptTemplate: `Art Style & Rendering:
Watercolor painting style; soft, transparent washes; gentle color blending; visible brushstrokes and paper texture; dreamy, atmospheric quality; delicate linework; organic shapes; translucent layering effects; subtle color gradients; fluid, flowing compositions; visible white space as an intentional element.

Mood & Expression:
Gentle, serene expressions; subtle facial features defined with minimal lines; soft color transitions to convey emotion; delicate, flowing poses; quiet sensibility; natural, harmonious atmosphere; understated movement; ethereal quality to characters and scenes.

Speech Bubbles (Watercolor Style):
Subtle speech bubbles with soft, faded edges; text in a light, handwritten-style font; minimal outlines; transparent background that blends with the scene; delicate connection lines; text that harmonizes with the watercolor palette.`,
            isDefault: true
        },
        {
            id: 'pixar',
            name: 'Pixar-Style',
            color: '#118AB2',
            textColor: '#FFFFFF',
            description: '3D animated style inspired by Pixar films with expressive characters.',
            imageUrl: '',
            promptTemplate: `Art Style & Rendering:
3D Pixar-inspired style; polished, dimensional rendering; expressive character designs with slightly exaggerated proportions; high attention to texture details; cinematic lighting with realistic shadows; vibrant color palette; dynamic camera angles; emotional storytelling through posing and expression; subtle atmospheric effects; glossy surfaces with realistic reflections; careful attention to physical details.

Mood & Expression:
Highly emotive, cinema-quality expressions; nuanced facial animations; eyes with depth and highlights; believable physical interactions; emotionally resonant character poses; subtle micro-expressions; characters that convey complex emotions through minimal changes; warm, relatable personalities.

Speech Bubbles (Pixar-Style):
Modern, minimal speech indicators; text overlaid directly on image in a clean, contemporary font; subtle shadow effects for readability; cinematic dialogue placement; minimal visual intrusion to maintain the 3D aesthetic; subtle color gradient backgrounds when needed for legibility.`,
            isDefault: true
        },
        {
            id: 'storybook',
            name: 'Storybook',
            color: '#EF476F',
            textColor: '#FFFFFF',
            description: 'Classic storybook illustrations with detailed linework and warm tones.',
            imageUrl: '',
            promptTemplate: `Art Style & Rendering:
Classic storybook illustration style; detailed pen and ink linework; traditional illustration techniques; warm, nostalgic color palette; carefully rendered textures; charming character designs; ornate background elements; balanced compositions with decorative borders; vintage aesthetic with modern color sensibilities; fine hatching and crosshatching details; rich visual storytelling elements.

Mood & Expression:
Warm, inviting expressions; traditionally rendered facial features with careful line work; gentle, approachable characters; posing that evokes classic children's literature; timeless emotional qualities; detailed costumes and settings that enhance character personality; storybook charm and wonder.

Speech Bubbles (Storybook Style):
Elegant speech bubbles with decorative borders; text in a classic serif font reminiscent of print storybooks; ornate connecting lines; text that sits harmoniously with the illustration style; speech presented as if typeset in a traditional book; occasional decorative elements framing important dialogue.`,
            isDefault: true
        },
        {
            id: 'whimsical',
            name: 'Whimsical',
            color: '#9B5DE5',
            textColor: '#FFFFFF',
            description: 'Dreamy, fantastical scenes with magical elements and soft lighting.',
            imageUrl: '',
            promptTemplate: `Art Style & Rendering:
Whimsical fantasy style; dreamy, ethereal quality; magical lighting effects with glows and sparkles; surreal proportions and perspectives; enchanted color schemes with iridescent accents; fantastical elements and impossible physics; flowing, organic shapes; imaginative environments; starry skies and sparkling details; fairytale-inspired design elements; luminous highlights; otherworldly atmosphere.

Mood & Expression:
Wonder-filled expressions; dreamy, wide-eyed characters; poses that seem to defy gravity; magical interactions with the environment; characters that emit or interact with light and sparkles; sense of awe and discovery; fantastical emotional states; ethereal connections between characters and setting.

Speech Bubbles (Whimsical Style):
Magical-looking speech bubbles with starry or sparkly edges; text in a playful, flowing script; bubble shapes that incorporate fantasy elements like stars, moons, or swirls; iridescent or gradient fills; text that might sparkle or glow; connecting lines with decorative elements like stars or hearts.`,
            isDefault: true
        },
        {
            id: 'realistic',
            name: 'Realistic',
            color: '#424242',
            textColor: '#FFFFFF',
            description: 'Lifelike illustrations with natural proportions and detailed textures.',
            imageUrl: '',
            promptTemplate: `Art Style & Rendering:
Realistic illustration style; accurate proportions and anatomy; detailed textures and materials; naturalistic lighting and shadows; subtle color variations; precise environmental details; photographic composition principles; careful attention to perspective; lifelike character features with emotional depth; rich background elements; high level of detail in clothing, hair, and skin textures.

Mood & Expression:
Naturalistic expressions with subtle emotional cues; anatomically correct facial features; realistic body language and posture; emotions conveyed through small details like eye direction, micro-expressions, and posture; believable physical interactions between characters; accurate representation of age, ethnicity and individual characteristics.

Speech Bubbles (Realistic Style):
Minimalist speech indicators; text designed to integrate naturally with the realistic scene; clean, simple font choices with subtle shadows for readability; text placement that doesn't distract from the realistic art style; speech representation that maintains the illusion of a real moment captured.`,
            isDefault: true
        }
    ];

    console.log('Starting to seed visual styles...');

    for (const style of styles) {
        const existing = await prisma.visualStyle.findUnique({
            where: { id: style.id }
        });

        if (existing) {
            // Update existing style
            await prisma.visualStyle.update({
                where: { id: style.id },
                data: style
            });
            console.log(`Updated style: ${style.name}`);
        } else {
            // Create new style
            await prisma.visualStyle.create({
                data: style
            });
            console.log(`Created style: ${style.name}`);
        }
    }

    console.log('Visual styles seeding completed!');
}

main()
    .catch((e) => {
        console.error('Error seeding visual styles:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });