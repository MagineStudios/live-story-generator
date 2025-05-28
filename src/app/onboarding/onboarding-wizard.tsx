'use client';
import React, { useEffect } from 'react';
import { useOnboarding } from '@/lib/context/onboarding-provider';
import { ArrowLeft } from 'lucide-react';
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

export function OnboardingWizard() {
    const { currentStep, goToPrevStep, isGeneratingStory, isInitializing, resetOnboarding, generatedStoryId } = useOnboarding();

    // Scroll to top of page whenever step changes
    useEffect(() => {
        console.log('OnboardingWizard: Current step changed to:', currentStep);
        console.log('OnboardingWizard: Generated story ID:', generatedStoryId);
        window.scrollTo(0, 0);
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
            <div className="relative w-full max-w-md mx-auto min-h-screen flex items-center justify-center bg-white font-nunito">
                <LoadingSpinner size="md" message="Loading your progress..." />
            </div>
        );
    }

    return (
        <div className="relative w-full max-w-md mx-auto min-h-screen flex flex-col bg-white font-nunito">
            {/* Top navigation with back button and progress bar */}
            {showProgressBar && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="flex flex-col gap-2 px-4 py-3"
                >
                    <div className="flex items-center">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={goToPrevStep}
                            disabled={backDisabled}
                            className={`mr-3 cursor-pointer ${backDisabled ? 'opacity-0' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'}`}
                        >
                            <ArrowLeft className="h-6 w-6" />
                        </Button>

                        {/* Progress bar */}
                        <div className="flex-1">
                            <div className="w-full bg-gray-200 rounded-full h-3">
                                <motion.div
                                    className="bg-[#4CAF50] h-3 rounded-full"
                                    style={{ width: '0%' }}
                                    animate={{ width: `${progressPercent}%` }}
                                    transition={{ duration: 0.5, ease: "easeInOut" }}
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
                </motion.div>
            )}

            {/* Step content with animations */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={`step-${currentStep}`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="flex-1 flex flex-col pt-0"
                >
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
                </motion.div>
            </AnimatePresence>
        </div>
    );
}