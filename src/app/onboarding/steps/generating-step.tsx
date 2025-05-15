'use client';
import React, { useEffect, useState } from 'react';
import { useOnboarding } from '@/lib/context/onboarding-provider';
import { motion } from 'framer-motion';
import { Wand2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function GeneratingStep() {
    const {
        createStory,
        goToNextStep,
        generationProgress,
        generationError,
        setGenerationError
    } = useOnboarding();
    const [isProcessing, setIsProcessing] = useState(true);
    const [hasStartedGeneration, setHasStartedGeneration] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const generateStory = async () => {
            try {
                // Only start generation once
                if (hasStartedGeneration) return;
                setHasStartedGeneration(true);

                // Wait a bit for animation (as in original)
                await new Promise(resolve => setTimeout(resolve, 1500));

                if (!isMounted) return;

                // Create the story
                const result = await createStory();

                if (!isMounted) return;

                if (result && result.id) {
                    // Wait for status polling to update progress
                    // Progress updates are handled in the onboarding provider

                    // When progress is complete, go to next step
                    // This is handled in the next useEffect
                } else {
                    throw new Error('Failed to create story');
                }
            } catch (err) {
                console.error('Error in story generation process:', err);
                setIsProcessing(false);
                setGenerationError(err instanceof Error ? err.message : 'Failed to create your story');
            }
        };

        generateStory();

        return () => {
            isMounted = false;
        };
    }, [createStory, hasStartedGeneration, setGenerationError]);

    // Monitor progress to know when to proceed
    useEffect(() => {
        if (generationProgress >= 100) {
            // Wait a bit more to show the animation
            const timer = setTimeout(() => {
                goToNextStep();
            }, 1500);

            return () => clearTimeout(timer);
        }
    }, [generationProgress, goToNextStep]);

    // Handle retry
    const handleRetry = () => {
        setIsProcessing(true);
        setGenerationError(null);
        setHasStartedGeneration(false);
    };

    // Define messages based on progress
    const getProgressMessage = () => {
        if (generationProgress < 25) return 'Preparing your adventure...';
        if (generationProgress < 50) return 'Crafting your characters...';
        if (generationProgress < 75) return 'Building your world...';
        return 'Adding final magical touches...';
    };

    return (
        <div className="flex flex-col items-center justify-center px-6 h-full">
            <div className="w-full max-w-sm flex flex-col items-center text-center py-20">
                {isProcessing && !generationError ? (
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
                            className="text-gray-600 mb-6"
                        >
                            {getProgressMessage()}
                        </motion.p>

                        <motion.div
                            initial={{ width: "0%" }}
                            animate={{ width: `${generationProgress}%` }}
                            className="w-full h-2 bg-[#4CAF50] rounded-full"
                        />
                    </>
                ) : generationError ? (
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
                ) : null}
            </div>
        </div>
    );
}