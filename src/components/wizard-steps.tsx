'use client';
import React from 'react';
import { useStoryBuilder } from '@/lib/context/story-builder-context';
import { ArrowLeft } from 'lucide-react';

// Import all step components
import StorySet from '@/components/wizard/story-set';
import StyleSelection from '@/components/wizard/style-selection';
import ThemePrompt from '@/components/wizard/theme-prompt';
import Generating from '@/components/wizard/generating';
import Review from '@/components/wizard/review';

export default function WizardSteps() {
    const { currentStep, goToPrevStep } = useStoryBuilder();

    return (
        <div className="relative w-full max-w-md mx-auto min-h-screen flex flex-col bg-white">
            {/* Top Nav + Progress Dots */}
            <div className="flex items-center p-4">
                {/* Back arrow button */}
                <button
                    onClick={goToPrevStep}
                    disabled={currentStep === 0 || currentStep === 3}
                    className={`
            p-2 rounded-full
            ${(currentStep === 0 || currentStep === 3) ? 'opacity-0' : ''}
          `}
                >
                    <ArrowLeft className="h-5 w-5 text-gray-800" />
                </button>
                {/* Spacer */}
                <div className="flex-1"></div>
                {/* Progress dots */}
                <div className="flex items-center space-x-2">
                    {[0, 1, 2, 3, 4].map((stepIndex) => (
                        <div
                            key={stepIndex}
                            className={`
                h-2 w-2 rounded-full transition-all
                ${currentStep === stepIndex
                                ? "bg-black"
                                : "bg-gray-300"}
              `}
                        />
                    ))}
                </div>
            </div>

            {/* Step Content */}
            <div className="flex-1">
                {currentStep === 0 && <StorySet />}
                {currentStep === 1 && <StyleSelection />}
                {currentStep === 2 && <ThemePrompt />}
                {currentStep === 3 && <Generating />}
                {currentStep === 4 && <Review />}
            </div>
        </div>
    );
}