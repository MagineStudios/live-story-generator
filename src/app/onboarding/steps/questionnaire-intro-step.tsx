'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useOnboarding } from '@/lib/context/onboarding-provider';
import { ContinueButton } from '@/components/ui/continue-button';
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import { SpeechBubble } from './speech-bubble';

export function QuestionnaireIntroStep() {
    const { goToNextStep } = useOnboarding();
    const [isAnimated, setIsAnimated] = useState(false);

    useEffect(() => {
        // Trigger animation after a short delay
        const timer = setTimeout(() => {
            setIsAnimated(true);
        }, 300);

        return () => clearTimeout(timer);
    }, []);

    // Staggered animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.15,
                delayChildren: 0.3,
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: {
                duration: 0.5,
                ease: "easeOut"
            }
        }
    };

    return (
        <div className="flex flex-col px-4 sm:px-6 pb-8 h-full">
            <div className="w-full max-w-sm mx-auto flex flex-col justify-between h-full">
                {/* Content with mascot and speech bubble */}
                <div className="flex-1 flex flex-col justify-center mt-12">
                    <div className="w-full mb-8">
                        <SpeechBubble
                            message={
                                <span>
                  Just <span className="text-[#4CAF50] font-bold">7 quick questions</span> before we start your first story!
                </span>
                            }
                            position="top"
                        />
                    </div>

                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate={isAnimated ? "visible" : "hidden"}
                        className="px-4 py-2 mb-6"
                    >
                        <motion.div
                            variants={itemVariants}
                            className="flex items-center space-x-2 mb-3 opacity-80"
                        >
                            <CheckCircle className="h-5 w-5 text-[#4CAF50]" />
                            <span className="text-gray-800 font-nunito">Personalized for your child</span>
                        </motion.div>

                        <motion.div
                            variants={itemVariants}
                            className="flex items-center space-x-2 mb-3 opacity-80"
                        >
                            <CheckCircle className="h-5 w-5 text-[#4CAF50]" />
                            <span className="text-gray-800 font-nunito">Tailored to their interests</span>
                        </motion.div>

                        <motion.div
                            variants={itemVariants}
                            className="flex items-center space-x-2 opacity-80"
                        >
                            <CheckCircle className="h-5 w-5 text-[#4CAF50]" />
                            <span className="text-gray-800 font-nunito">Create unlimited stories</span>
                        </motion.div>
                    </motion.div>
                </div>

                {/* Continue button */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 1.2, duration: 0.5 }}
                    className="w-full mb-4"
                >
                    <ContinueButton
                        onClick={goToNextStep}
                        className="w-full font-nunito"
                    />
                </motion.div>
            </div>
        </div>
    );
}