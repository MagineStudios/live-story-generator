'use client';
import React, { useEffect, Suspense } from 'react';
import { useOnboarding } from '@/lib/context/onboarding-provider';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
// Import step components
import { WelcomeStep } from './steps/welcome-step';
import { MascotIntroStep } from './steps/mascot-intro-step';
import { QuestionnaireIntroStep } from './steps/questionnaire-intro-step';
import { GoalStep } from './steps/goal-step';
import { ToneStep } from './steps/tone-step';
import { CharactersStep } from './steps/character-step';
import { StyleStep } from './steps/style-step';
import { ThemeStep } from './steps/theme-step';
import { GeneratingStep } from './steps/generating-step';
import { ReviewStep } from './steps/review-step';
import { FinishStep } from './steps/finish-step';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { motion, AnimatePresence } from 'framer-motion';
import { ErrorBoundary, StepErrorBoundary } from './components/error-boundary';

export function OnboardingWizard() {
    const { currentStep, goToPrevStep, isGeneratingStory, isInitializing, resetOnboarding, generatedStoryId } = useOnboarding();

    // Scroll to top of page and manage focus whenever step changes
    useEffect(() => {
        console.log('OnboardingWizard: Current step changed to:', currentStep);
        console.log('OnboardingWizard: Generated story ID:', generatedStoryId);
        window.scrollTo(0, 0);

        // Set focus to the first interactive element in the new step
        // Use a small delay to ensure the DOM has updated
        const focusTimer = setTimeout(() => {
            // Try to find the first focusable element in the step content
            const stepContent = document.querySelector('[role="main"], main');
            if (stepContent) {
                const focusableElements = stepContent.querySelectorAll(
                    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
                );
                
                // Focus the first element if it exists
                if (focusableElements.length > 0) {
                    (focusableElements[0] as HTMLElement).focus();
                } else {
                    // If no focusable elements, focus the step content itself
                    stepContent.setAttribute('tabindex', '-1');
                    (stepContent as HTMLElement).focus();
                }
            }
        }, 100);

        return () => clearTimeout(focusTimer);
    }, [currentStep, generatedStoryId]);

    // Determine if the back button should be disabled
    const backDisabled = currentStep === 0 || isGeneratingStory;

    // Calculate progress percentage for progress bar
    const totalSteps = 11;  // 0 through 10 (with the new steps)
    const rawPercent = (currentStep / (totalSteps - 1)) * 100;
    const progressPercent = currentStep === 0 ? 0 : Math.min(rawPercent, 100);

    // Hide progress bar for welcome screen
    const showProgressBar = currentStep > 0;

    // Show loading state while initializing (moved after all hooks)
    if (isInitializing) {
        return (
            <div className="relative w-full max-w-md sm:max-w-lg lg:max-w-xl mx-auto min-h-screen flex items-center justify-center bg-white font-nunito">
                <LoadingSpinner size="md" message="Loading your progress..." />
            </div>
        );
    }

    return (
        <ErrorBoundary>
            <div className="relative w-full max-w-md sm:max-w-lg lg:max-w-xl mx-auto min-h-screen flex flex-col bg-white font-nunito">
            {/* Top navigation with back button and progress bar */}
            {showProgressBar && (
                <div
                    className="flex flex-col gap-2 px-4 sm:px-6 py-3 animate-in fade-in slide-in-from-top-2 duration-300"
                >
                    <div className="flex items-center">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={goToPrevStep}
                            disabled={backDisabled}
                            aria-label="Go to previous step"
                            className={cn(
                                'mr-3 cursor-pointer transition-all min-w-[44px] min-h-[44px]',
                                backDisabled 
                                    ? 'opacity-0' 
                                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100 active:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300'
                            )}
                        >
                            <ArrowLeft className="h-6 w-6" />
                        </Button>

                        {/* Progress bar */}
                        <div className="flex-1" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progressPercent)} aria-label="Onboarding progress">
                            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                <div
                                    className="bg-[#4CAF50] h-3 rounded-full transition-all duration-500 ease-out"
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Start Fresh button - show after step 2 and not during generation */}
                    {currentStep > 2 && currentStep < 8 && (
                        <div className="flex justify-end">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={resetOnboarding}
                                className="text-xs text-gray-500 hover:text-gray-700"
                            >
                                Start Fresh
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* Step content with animations */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={`step-${currentStep}`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className="flex-1 flex flex-col pt-0"
                    role="main"
                    aria-label={`Step ${currentStep + 1} of ${totalSteps}`}
                >
                    <StepErrorBoundary>
                        <Suspense fallback={<LoadingSpinner size="md" message="Loading step..." />}>
                            {currentStep === 0 && <WelcomeStep />}
                            {currentStep === 1 && <MascotIntroStep />}
                            {currentStep === 2 && <QuestionnaireIntroStep />}
                            {currentStep === 3 && <GoalStep />}
                            {currentStep === 4 && <ToneStep />}
                            {currentStep === 5 && <CharactersStep />}
                            {currentStep === 6 && <StyleStep />}
                            {currentStep === 7 && <ThemeStep />}
                            {currentStep === 8 && <GeneratingStep />}
                            {currentStep === 9 && (
                                <>
                                    {console.log('Rendering ReviewStep at step 9, storyId:', generatedStoryId)}
                                    <ReviewStep />
                                </>
                            )}
                            {currentStep === 10 && <FinishStep />}
                        </Suspense>
                    </StepErrorBoundary>
                </motion.div>
            </AnimatePresence>
            </div>
        </ErrorBoundary>
    );
}