'use client';
import React, { useState, useEffect } from 'react';
import { useOnboarding } from '@/lib/context/onboarding-provider';
import { motion, AnimatePresence } from 'framer-motion';
import { Wand2, AlertCircle, Sparkles, BookOpen, Palette, Heart, Users } from 'lucide-react';
import { ContinueButton } from '@/components/ui/continue-button';
import { SpeechBubble } from './speech-bubble';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function GeneratingStep() {
    // Get what we need from context
    const {
        createStory,
        goToNextStep,
        themePrompt,
        visualStyle,
        tone,
        generationProgress,
        generationError,
        setGenerationError,
        generatedStoryId,
        selectedElements,
        isGeneratingStory
    } = useOnboarding();

    // Local state
    const [isGenerationStarted, setIsGenerationStarted] = useState(false);
    const [isCreatingStory, setIsCreatingStory] = useState(false);
    const [hasNavigated, setHasNavigated] = useState(false); // Prevent multiple navigations
    const [isCheckingStory, setIsCheckingStory] = useState(false); // Prevent concurrent checks

    // Function to start the story creation process
    const startStoryCreation = async () => {
        // Avoid running multiple times
        if (isCreatingStory || generatedStoryId) return;

        setIsGenerationStarted(true);
        setIsCreatingStory(true);

        try {
            // Validate required data
            if (!themePrompt) {
                console.error("Missing theme prompt");
                toast.error("Missing story theme");
                setGenerationError('Please go back and enter a story theme.');
                setIsCreatingStory(false);
                setIsGenerationStarted(false);
                return;
            }

            if (!visualStyle) {
                console.error("Missing visual style");
                toast.error("Missing story style");
                setGenerationError('Please go back and select a visual style.');
                setIsCreatingStory(false);
                setIsGenerationStarted(false);
                return;
            }

            console.log("Creating story with:", {
                themePrompt,
                visualStyle: visualStyle.name,
                tone
            });

            // Call API to create story
            const result = await createStory();

            if (!result) {
                throw new Error("Story creation failed - no result returned");
            }

            console.log("Story created successfully:", result);

            // No need to navigate - the progress tracking will handle this
        } catch (err) {
            console.error("Error creating story:", err);
            setGenerationError(err instanceof Error ? err.message : 'Story creation failed');
            toast.error("Story creation failed", {
                description: err instanceof Error ? err.message : 'Please try again'
            });
            setIsCreatingStory(false);
        }
    };

    // Navigation when story is complete (move to review as soon as pages are ready)
    useEffect(() => {
        console.log('GeneratingStep navigation effect:', {
            generatedStoryId,
            generationProgress,
            hasNavigated,
            isCheckingStory
        });
        
        if (generatedStoryId && generationProgress >= 25 && !hasNavigated && !isCheckingStory) {
            // Check if story pages are ready
            const checkStoryReady = async () => {
                // Prevent concurrent checks
                if (isCheckingStory || hasNavigated) return;
                
                setIsCheckingStory(true);
                
                try {
                    const response = await fetch(`/api/story/${generatedStoryId}`);
                    if (!response.ok) {
                        console.error('Failed to fetch story:', response.status);
                        setIsCheckingStory(false);
                        return;
                    }

                    const storyData = await response.json();
                    console.log('Story data in GeneratingStep:', {
                        id: storyData.id,
                        status: storyData.status,
                        pageCount: storyData.pages?.length
                    });
                    
                    // Navigate to review if story has pages (regardless of status)
                    // The review step will handle image generation
                    if (storyData.pages && storyData.pages.length > 0 && !hasNavigated) {
                        console.log('Story pages ready, navigating to review step (step 9)');
                        setHasNavigated(true); // Prevent multiple navigations
                        // Add a small delay to ensure smooth transition
                        setTimeout(() => {
                            goToNextStep(); // This should go to step 9 (Review)
                        }, 100);
                    } else {
                        setIsCheckingStory(false);
                    }
                } catch (error) {
                    console.error('Error checking story status:', error);
                    setIsCheckingStory(false);
                }
            };

            // Check immediately
            checkStoryReady();
            
            // Only set up interval if we haven't navigated yet
            if (!hasNavigated) {
                const interval = setInterval(() => {
                    if (!hasNavigated) {
                        checkStoryReady();
                    }
                }, 1000);
                
                return () => clearInterval(interval);
            }
        }
    }, [generatedStoryId, generationProgress, goToNextStep, hasNavigated, isCheckingStory]);

    // Handle retry
    const handleRetry = () => {
        setIsCreatingStory(false);
        setIsGenerationStarted(false);
        setGenerationError(null);
    };

    // Get style name formatted nicely
    const getStyleName = () => {
        return visualStyle?.name || 'Custom style';
    };

    // Format tone list for display
    const getToneDescription = () => {
        if (!tone || tone.length === 0) return 'Standard tone';
        return tone.join(', ');
    };

    // Get character names for summary
    const getCharacters = () => {
        const characters = selectedElements.filter(el =>
            el.category === 'CHARACTER' || el.category === 'PET'
        );

        if (characters.length === 0) return 'No specific characters';

        return characters.map(char => char.name).join(', ');
    };

    // Define progress message based on current progress - mascot speaking
    const getProgressMessage = () => {
        if (generationProgress < 25) return "I'm gathering all the story ingredients... This is so exciting! 🎨";
        if (generationProgress < 50) return "Now I'm bringing your characters to life! They're looking wonderful! ✨";
        if (generationProgress < 75) return "Building your magical world page by page... Almost there! 📚";
        return "Adding the final sprinkles of magic! Your story is almost ready! 🌟";
    };

    // Handle returning to this step with existing story
    useEffect(() => {
        // If we already have a story ID and progress, we're coming back to this step
        if (generatedStoryId && generationProgress > 0) {
            setIsGenerationStarted(true);
            setIsCreatingStory(true);
        }
        // Also sync with context's isGeneratingStory flag
        if (isGeneratingStory) {
            setIsGenerationStarted(true);
            setIsCreatingStory(true);
        }
    }, [generatedStoryId, generationProgress, isGeneratingStory]);

    return (
        <div className="flex flex-col items-center justify-center px-4 sm:px-6 h-full">
            <AnimatePresence mode="wait">
                <motion.div 
                    key={isGenerationStarted ? 'generating' : 'confirm'}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="w-full max-w-md flex flex-col items-center text-center py-8 sm:py-12"
                >
                    {!generationError ? (
                        !isGenerationStarted ? (
                        // Story confirmation view
                        <div className="w-full">
                            {/* Speech bubble with mascot */}
                            <div className="mb-6">
                                <SpeechBubble
                                    message="Wow! Your story is ready to be created! I've gathered all the magical ingredients - your characters, style, and theme. Ready to see the magic happen?"
                                    animateIn={true}
                                    position="left"
                                />
                            </div>

                            <h2 className="text-xl sm:text-2xl font-bold mb-6 text-center">
                                Your Story Recipe 📚✨
                            </h2>

                            {/* Story Summary Cards - Visual and Engaging */}
                            <div className="space-y-3 mb-8">
                                {/* Theme Card */}
                                <div className="group bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200 hover:shadow-md transition-all duration-200 cursor-default">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-purple-200 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <BookOpen className="w-5 h-5 text-purple-700" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs font-medium text-purple-600 mb-0.5">Story Theme</p>
                                            <p className="text-sm font-semibold text-purple-900 line-clamp-2">{themePrompt || 'Custom adventure'}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Style Card */}
                                <div className="group bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200 hover:shadow-md transition-all duration-200 cursor-default">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <Palette className="w-5 h-5 text-blue-700" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs font-medium text-blue-600 mb-0.5">Visual Style</p>
                                            <p className="text-sm font-semibold text-blue-900">{getStyleName()}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Tone Card */}
                                <div className="group bg-gradient-to-r from-orange-50 to-orange-100 p-4 rounded-xl border border-orange-200 hover:shadow-md transition-all duration-200 cursor-default">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-orange-200 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <Heart className="w-5 h-5 text-orange-700" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs font-medium text-orange-600 mb-0.5">Story Tone</p>
                                            <p className="text-sm font-semibold text-orange-900">{getToneDescription()}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Characters Card */}
                                <div className="group bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-xl border border-green-200 hover:shadow-md transition-all duration-200 cursor-default">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-green-200 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <Users className="w-5 h-5 text-green-700" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs font-medium text-green-600 mb-0.5">Characters</p>
                                            <p className="text-sm font-semibold text-green-900 line-clamp-2">{getCharacters()}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Magic CTA Button */}
                            <div className="px-2 sm:px-0">
                                <ContinueButton
                                    onClick={startStoryCreation}
                                    className="w-full"
                                >
                                    <Sparkles className="w-5 h-5 mr-2 animate-pulse" />
                                    Create My Magical Story
                                </ContinueButton>
                            </div>

                            {/* Fun facts */}
                            <div className="mt-6 text-center px-4 sm:px-0">
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 rounded-full">
                                    <Sparkles className="w-4 h-4 text-purple-600" />
                                    <p className="text-xs font-medium text-purple-700">
                                        5 magical pages with AI illustrations
                                    </p>
                                    <Sparkles className="w-4 h-4 text-purple-600" />
                                </div>
                            </div>
                        </div>
                    ) : (
                        // Generation in progress view
                        <div className="w-full">
                            {/* Speech bubble with loading message */}
                            <div className="mb-8">
                                <SpeechBubble
                                    message={getProgressMessage()}
                                    animateIn={true}
                                    position="left"
                                />
                            </div>

                            {/* Simplified magic animation using Tailwind */}
                            <div className="mb-8">
                                <div className="relative mx-auto w-24 h-24">
                                    {/* Pulsing background */}
                                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#4CAF50]/20 to-[#43a047]/20 animate-pulse" />
                                    
                                    {/* Rotating wand */}
                                    <div className="relative w-full h-full rounded-full bg-gradient-to-br from-[#4CAF50] to-[#43a047] flex items-center justify-center shadow-lg animate-spin-slow">
                                        <Wand2 className="w-12 h-12 text-white" />
                                    </div>
                                    
                                    {/* Sparkles around */}
                                    <div className="absolute -top-2 -right-2">
                                        <Sparkles className="w-6 h-6 text-yellow-400 animate-pulse" />
                                    </div>
                                    <div className="absolute -bottom-2 -left-2">
                                        <Sparkles className="w-5 h-5 text-purple-400 animate-pulse animation-delay-200" />
                                    </div>
                                    <div className="absolute top-1/2 -right-4">
                                        <Sparkles className="w-4 h-4 text-blue-400 animate-pulse animation-delay-400" />
                                    </div>
                                </div>
                            </div>

                            <h2 className="text-xl sm:text-2xl font-bold mb-8 text-center">
                                Creating Your Magical Story 🎆
                            </h2>

                            {/* Progress bar with better styling */}
                            <div className="w-full max-w-xs mx-auto mb-3">
                                <div className="h-3 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                                    <div 
                                        className="h-full bg-gradient-to-r from-purple-400 via-purple-500 to-purple-600 rounded-full transition-all duration-500 ease-out relative"
                                        style={{ width: `${generationProgress}%` }}
                                    >
                                        {/* Shimmer effect */}
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                                    </div>
                                </div>
                                <p className="text-sm font-medium text-purple-700 text-center mt-2">
                                    {Math.round(generationProgress)}% Complete
                                </p>
                            </div>

                            {/* Fun loading messages */}
                            <div className="mt-6 text-center">
                                <p className="text-xs text-gray-500 animate-pulse">
                                    🌟 Sprinkling story dust...
                                </p>
                            </div>
                        </div>
                    )
                ) : (
                    // Error state
                    <div className="flex flex-col items-center px-4 sm:px-0 animate-in fade-in duration-300">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-red-100 flex items-center justify-center mb-4 sm:mb-6">
                            <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 text-red-500" />
                        </div>

                        <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 text-red-600 text-center">
                            Oops! Something Went Wrong
                        </h2>

                        <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6 text-center">
                            {generationError}
                        </p>

                        <Button
                            onClick={handleRetry}
                            className="px-6 sm:px-8 py-2.5 sm:py-3 bg-[#4CAF50] hover:bg-[#43a047] text-white rounded-full font-medium cursor-pointer shadow-md hover:shadow-lg active:bg-[#3d943f] focus:outline-none focus:ring-4 focus:ring-[#4CAF50]/30 transition-all duration-300 min-h-[44px]"
                        >
                            Try Again
                        </Button>
                    </div>
                )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}