'use client';
import React, { useEffect } from 'react';
import { useOnboarding } from '@/lib/context/onboarding-provider';
import { ArrowLeft } from 'lucide-react';
// Import step components
import { GoalStep } from './steps/goal-step';
import { ToneStep } from './steps/tone-step';
import { CharactersStep } from './steps/character-step';
import { StyleStep } from './steps/style-step';
import { ThemeStep } from './steps/theme-step';
import { GeneratingStep } from './steps/generating-step';
import { ReviewStep } from './steps/review-step';
import { FinishStep } from './steps/finish-step';

export function OnboardingWizard() {
    const { currentStep, goToPrevStep, isGeneratingStory } = useOnboarding();

    // Scroll to top of page whenever step changes (for better UX on mobile/small screens)
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [currentStep]);

    // Determine if the back button should be disabled
    const backDisabled = currentStep === 0 || isGeneratingStory; // no back at step 0 (start) and when generating

    // Calculate progress percentage for progress bar
    const totalSteps = 8;  // 0 through 7
    const progressPercent = Math.min((currentStep / (totalSteps - 1)) * 100, 100);

    return (
        <div className="relative w-full max-w-md mx-auto min-h-screen flex flex-col bg-white">
            {/* Top navigation: Back button and progress indicator */}
            <div className="flex items-center px-4 py-3">
                <button
                    type="button"
                    onClick={goToPrevStep}
                    disabled={backDisabled}
                    className={`mr-4 p-2 ${backDisabled ? 'opacity-0 pointer-events-none' : ''}`}
                >
                    <ArrowLeft className="h-6 w-6 text-gray-800" />
                </button>
                {/* Progress bar */}
                <div className="flex-1">
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                            className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Step content */}
            <div className="flex-1 flex flex-col">
                {currentStep === 0 && <GoalStep />}
                {currentStep === 1 && <ToneStep />}
                {currentStep === 2 && <CharactersStep />}
                {currentStep === 3 && <StyleStep />}
                {currentStep === 4 && <ThemeStep />}
                {currentStep === 5 && <GeneratingStep />}
                {currentStep === 6 && <ReviewStep />}
                {currentStep === 7 && <FinishStep />}
            </div>
        </div>
    );
}