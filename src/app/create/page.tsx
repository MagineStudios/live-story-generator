// app/create/page.tsx
'use client';

import React, { JSX } from 'react';
import { StoryBuilderProvider } from '@/lib/context/story-builder-context';
import WizardSteps from '@/components/wizard-steps';

export default function CreateStoryPage(): JSX.Element {
  return (
      <StoryBuilderProvider>
        <WizardSteps />
      </StoryBuilderProvider>
  );
}