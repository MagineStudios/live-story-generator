'use client';
import React, { useEffect } from 'react';
import { useOnboarding } from '@/lib/context/onboarding-provider';
import Lottie from 'lottie-react';
// Import a magic-themed loading animation (floating book, sparkles, etc.)
// import magicLoadingAnimation from '@/public/animations/magic-book.json';

export function GeneratingStep() {
    const { isGeneratingStory, generatedStoryId, goToNextStep } = useOnboarding();

    // Once story generation is complete (isGeneratingStory false and we have an ID), automatically proceed after a short delay
    useEffect(() => {
        if (!isGeneratingStory && generatedStoryId) {
            const timer = setTimeout(() => {
                goToNextStep();
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [isGeneratingStory, generatedStoryId]);

    return (
        <div className="flex flex-col items-center justify-center h-full px-4 text-center">
            {/* Magical loading animation */}
            <div className="w-40 h-40 mb-6">
                {/*<Lottie animationData={magicLoadingAnimation} loop={true} />*/}
            </div>
            <h2 className="text-2xl font-bold mb-2">Generating Your Story...</h2>
            <p className="text-gray-600 mb-6 px-2">
                Our AI wizards are hard at work weaving your tale. This might take up to a minute, hang tight!
            </p>
            <p className="text-gray-500 text-sm">Tip: You’ll be able to review and edit your story next.</p>
        </div>
    );
}