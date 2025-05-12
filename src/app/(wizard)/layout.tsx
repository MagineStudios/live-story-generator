import React from 'react';
import { StoryBuilderProvider } from '@/lib/context/story-builder-context';

export default function WizardLayout({ children }: { children: React.ReactNode }) {
    return (
        <StoryBuilderProvider>
            <div className="max-w-md mx-auto p-4">
                <header className="mb-6">
                    <h1 className="text-2xl font-bold">Create Your Story</h1>
                    <nav className="mt-2 text-sm text-gray-600">Step-by-step wizard</nav>
                </header>
                <main>{children}</main>
            </div>
        </StoryBuilderProvider>
    );
}
