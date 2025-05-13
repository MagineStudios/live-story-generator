'use client';
import React, { useEffect } from 'react';
import { useOnboarding } from '@/lib/context/onboarding-provider';
import { motion } from 'framer-motion';
import { Wand2 } from 'lucide-react';

export function GeneratingStep() {
    const { createStory, goToNextStep } = useOnboarding();

    useEffect(() => {
        const generateStory = async () => {
            // Wait a bit for animation
            await new Promise(resolve => setTimeout(resolve, 1500));

            const storyId = await createStory();

            // If successful, go to next step (should have a timeout for UX)
            if (storyId) {
                // Wait a bit more to show the animation
                await new Promise(resolve => setTimeout(resolve, 1500));
                goToNextStep();
            }
        };

        generateStory();
    }, [createStory, goToNextStep]);

    return (
        <div className="flex flex-col items-center justify-center px-6 h-full">
            <div className="w-full max-w-sm flex flex-col items-center text-center py-20">
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
                    Weaving magic into your adventure...
                </motion.p>

                <motion.div
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 8, ease: "linear" }}
                    className="w-full h-2 bg-[#4CAF50] rounded-full"
                />
            </div>
        </div>
    );
}