import prisma from '../src/lib/prisma';

async function updateVisualStyles() {
  const updates = [
    {
      name: 'Pixar-Style',
      promptTemplate: `**Art Style & Rendering:**
Rendered in expressive Pixar-style animation with natural fabric texture, dynamic hair motion, subtle motion blur for action, and rich, saturated lighting. Character expressions are finely detailed, balancing realism and stylized charm. Soft, rounded character designs with appealing proportions.

**Mood & Expression:**
Characters display clear, exaggerated emotions with Pixar's signature warmth. Dynamic poses and gestures enhance storytelling.

**Speech Bubbles (Fredoka One font, #333333, white background, 3px dark gray outline, rounded corners):**
Clean, rounded speech bubbles positioned clearly near speakers with playful, readable text.`
    },
    {
      name: 'Disney-Style',
      promptTemplate: `**Art Style & Rendering:**
Rendered in classic Disney 2D animation style with fluid line work, vibrant colors, and expressive character animation. Traditional hand-drawn aesthetic with modern polish.

**Mood & Expression:**
Theatrical expressions and graceful movements. Characters display emotions through classic animation principles.

**Speech Bubbles (Fredoka One font, #333333, white background, 3px dark gray outline, rounded corners):**
Traditional comic-style bubbles with smooth curves and clear tails pointing to speakers.`
    },
    {
      name: 'Watercolor',
      promptTemplate: `**Art Style & Rendering:**
Soft watercolor textures with gentle color gradients and organic brushstrokes. Dreamy, ethereal quality with visible paper texture. Colors blend naturally with occasional paint blooms.

**Mood & Expression:**
Gentle, contemplative moods with soft lighting. Characters have delicate features and subtle expressions.

**Speech Bubbles (Fredoka One font, #333333, white background, 3px dark gray outline, rounded corners):**
Hand-drawn style bubbles with slightly irregular edges, maintaining the artistic watercolor aesthetic.`
    },
    {
      name: 'Comic Book',
      promptTemplate: `**Art Style & Rendering:**
Bold, graphic illustration style with strong colors and clear shapes. Modern digital art aesthetic with clean lines and geometric influences.

**Mood & Expression:**
Dynamic and energetic with high contrast. Characters have simplified but expressive features.

**Speech Bubbles (Fredoka One font, #333333, white background, 3px dark gray outline, rounded corners):**
Crisp, modern bubbles with bold outlines that match the illustration style.`
    },
    {
      name: 'Realistic',
      promptTemplate: `**Art Style & Rendering:**
Photorealistic rendering with accurate lighting, textures, and proportions. High detail in clothing, hair, and environmental elements.

**Mood & Expression:**
Natural, believable expressions and body language. Cinematic quality with depth of field effects.

**Speech Bubbles (Fredoka One font, #333333, white background, 3px dark gray outline, rounded corners):**
Semi-transparent bubbles with subtle shadows for integration into realistic scenes.`
    }
  ];

  console.log('Updating visual styles...');

  for (const update of updates) {
    try {
      const result = await prisma.visualStyle.updateMany({
        where: { name: update.name },
        data: { promptTemplate: update.promptTemplate }
      });
      console.log(`Updated ${update.name}: ${result.count} records`);
    } catch (error) {
      console.error(`Error updating ${update.name}:`, error);
    }
  }

  console.log('Visual styles update complete!');
  await prisma.$disconnect();
}

updateVisualStyles().catch(console.error);