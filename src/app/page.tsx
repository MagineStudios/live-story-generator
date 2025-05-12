// app/page.tsx
'use client';

import React, { JSX } from 'react';
import WizardLayout from './(wizard)/layout';
import StorySetPage from './(wizard)/story-set/page';

export default function HomePage(): JSX.Element {
  return (
    <WizardLayout>
      <StorySetPage />
    </WizardLayout>
  );
}
