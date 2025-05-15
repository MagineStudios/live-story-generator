'use client';
import React, { useState, useEffect } from 'react';
import { useOnboarding } from '@/lib/context/onboarding-provider';
import { motion } from 'framer-motion';
import { Wand2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
        selectedElements
    } = useOnboarding();

    // Local state
    const [isGenerationStarted, setIsGenerationStarted] = useState(false);
    const [isCreatingStory, setIsCreatingStory] = useState(false);

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

    // Navigation when story is complete
    useEffect(() => {
        if (generationProgress >= 100) {
            const timer = setTimeout(() => {
                goToNextStep();
            }, 1500);

            return () => clearTimeout(timer);
        }
    }, [generationProgress, goToNextStep]);

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

    // Define progress message based on current progress
    const getProgressMessage = () => {
        if (generationProgress < 25) return 'Preparing your adventure...';
        if (generationProgress < 50) return 'Crafting your characters...';
        if (generationProgress < 75) return 'Building your world...';
        return 'Adding final magical touches...';
    };

    return (
        <div className="flex flex-col items-center justify-center px-6 h-full">
            <div className="w-full max-w-md flex flex-col items-center text-center py-12">
                {!generationError ? (
                    !isGenerationStarted ? (
                        // Story confirmation view
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="w-full"
                        >
                            <div className="mb-8">
                                <CheckCircle2 className="w-16 h-16 mx-auto text-[#4CAF50]" />
                            </div>

                            <h2 className="text-2xl font-bold mb-6">Ready to Create Your Story</h2>

                            <div className="bg-gray-50 p-6 rounded-lg mb-8 text-left">
                                <h3 className="font-medium text-lg mb-4 text-center">Story Summary</h3>

                                <div className="space-y-3">
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Theme</p>
                                        <p className="font-medium">{themePrompt || 'Custom theme'}</p>
                                    </div>

                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Style</p>
                                        <p className="font-medium">{getStyleName()}</p>
                                    </div>

                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Tone</p>
                                        <p className="font-medium">{getToneDescription()}</p>
                                    </div>

                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Characters</p>
                                        <p className="font-medium">{getCharacters()}</p>
                                    </div>
                                </div>
                            </div>

                            <Button
                                onClick={startStoryCreation}
                                className="w-full py-6 text-lg font-semibold rounded-full bg-[#F9A826] hover:bg-[#F39C12] text-white shadow-lg hover:shadow-xl transition-all duration-300"
                            >
                                <Wand2 className="w-5 h-5 mr-2" />
                                Start Generation
                            </Button>

                            <p className="text-sm text-gray-500 mt-4">
                                This will create a 5-page story with custom illustrations
                            </p>
                        </motion.div>
                    ) : (
                        // Generation in progress view
                        <>
                            {/* Magic animation */}
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.5 }}
                                className="mb-8"
                            >
                                <div className="relative">
                                    <motion.div
                                        animate={{
                                            rotate: [0, 360],
                                            scale: [1, 1.05, 1]
                                        }}
                                        transition={{
                                            duration: 3,
                                            repeat: Infinity,
                                            ease: "linear"
                                        }}
                                        className="w-24 h-24 rounded-full bg-[#4CAF50]/10 flex items-center justify-center"
                                    >
                                        <Wand2 className="w-12 h-12 text-[#4CAF50]" />
                                    </motion.div>

                                    {/* Orbiting particles */}
                                    {[...Array(6)].map((_, i) => (
                                        <motion.div
                                            key={i}
                                            className="absolute w-3 h-3 rounded-full bg-[#4CAF50]"
                                            style={{
                                                top: '50%',
                                                left: '50%',
                                                translateX: '-50%',
                                                translateY: '-50%'
                                            }}
                                            animate={{
                                                scale: [0.8, 1.5, 0.8],
                                                opacity: [0.5, 1, 0.5],
                                                x: [`${Math.cos(i * 60 * Math.PI/180) * 60}px`, `${Math.cos((i * 60 + 360) * Math.PI/180) * 60}px`],
                                                y: [`${Math.sin(i * 60 * Math.PI/180) * 60}px`, `${Math.sin((i * 60 + 360) * Math.PI/180) * 60}px`]
                                            }}
                                            transition={{
                                                duration: 3,
                                                repeat: Infinity,
                                                ease: "linear",
                                                delay: i * 0.2
                                            }}
                                        />
                                    ))}
                                </div>
                            </motion.div>

                            <motion.h2
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="text-2xl font-bold mb-2"
                            >
                                Creating Your Story
                            </motion.h2>

                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.7 }}
                                className="text-gray-600 mb-8"
                            >
                                {getProgressMessage()}
                            </motion.p>

                            {/* Center-expanding progress bar */}
                            <div className="w-full mb-3 h-4 bg-gray-100 rounded-full overflow-hidden relative">
                                <div className="absolute inset-0 flex justify-center items-center">
                                    <motion.div
                                        initial={{ width: "0%" }}
                                        animate={{ width: `${generationProgress}%` }}
                                        transition={{
                                            duration: 0.5,
                                            ease: "easeInOut"
                                        }}
                                        className="h-full bg-gradient-to-r from-[#9333ea] via-[#7e22ce] to-[#6b21a8] rounded-full"
                                        style={{
                                            transformOrigin: 'center',
                                            position: 'absolute',
                                            left: `${50 - generationProgress/2}%`
                                        }}
                                    />
                                </div>
                            </div>
                            <p className="text-sm font-medium text-purple-700">
                                {Math.round(generationProgress)}% Complete
                            </p>
                        </>
                    )
                ) : (
                    // Error state
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center"
                    >
                        <div className="w-24 h-24 rounded-full bg-red-100 flex items-center justify-center mb-6">
                            <AlertCircle className="w-12 h-12 text-red-500" />
                        </div>

                        <h2 className="text-2xl font-bold mb-4 text-red-600">
                            Oops! Something Went Wrong
                        </h2>

                        <p className="text-gray-600 mb-6">
                            {generationError}
                        </p>

                        <Button
                            onClick={handleRetry}
                            className="px-8 py-3 bg-[#4CAF50] hover:bg-[#43a047] text-white rounded-full font-medium"
                        >
                            Try Again
                        </Button>
                    </motion.div>
                )}
            </div>
        </div>
    );
}