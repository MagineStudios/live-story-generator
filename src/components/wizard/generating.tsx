'use client';
import React, { useEffect } from 'react';
import { useStoryBuilder } from '@/lib/context/story-builder-context';
import { Loader2 } from 'lucide-react';

export default function Generating() {
    const { goToNextStep, isGeneratingStory, generatedStoryId, visualStyle } = useStoryBuilder();

    // Auto-proceed when generation is complete
    useEffect(() => {
        if (!isGeneratingStory && generatedStoryId) {
            const timer = setTimeout(() => {
                goToNextStep();
            }, 1000);

            return () => clearTimeout(timer);
        }
    }, [isGeneratingStory, generatedStoryId, goToNextStep]);

    // Decide if we should show the themed background
    const showThemeBackground = visualStyle?.id === 'lego';

    return (
        <div
            className={`
        flex flex-col items-center justify-center h-full px-4 text-center
        ${showThemeBackground ? 'bg-cover bg-center' : ''}
      `}
            style={showThemeBackground ? {
                backgroundImage: `url(/styles/lego-background.jpg)`,
            } : {}}
        >
            <div className="flex items-center justify-center w-12 h-12 mb-6">
                <span className="text-4xl font-bold">M</span>
            </div>

            <h2 className="text-2xl font-bold mb-2">Generating Magic</h2>
            <p className="text-gray-600 mb-12 max-w-xs mx-auto">
                Our AI wizards are assembling bricks of imagination
                to craft your custom LEGO adventure. Get ready for a story that's as unique as your creativity!
            </p>

            <div className="flex items-center mb-8">
                <div className="h-6 w-6 border-2 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mr-3"></div>
                <span className="text-gray-600">Less than 60 seconds remaining...</span>
            </div>

            <button
                className="px-6 py-3 bg-gray-100 rounded-lg text-gray-700 font-medium"
            >
                Cancel generation
            </button>
        </div>
    );
}