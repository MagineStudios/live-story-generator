'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useOnboarding } from '@/lib/context/onboarding-provider';
import { ContinueButton } from '@/components/ui/continue-button';
import { SpeechBubble } from './speech-bubble';
import { motion } from 'framer-motion';

export function MascotIntroStep() {
    const { goToNextStep } = useOnboarding();
    const [displayedText, setDisplayedText] = useState('');
    const isFirstLoadRef = useRef(true);
    const animationRef = useRef<NodeJS.Timeout | null>(null);

    const welcomeText = "Hi there! I'm Magi and I'll help you create amazing stories!";

    const animateText = (text: string) => {
        if (animationRef.current) {
            clearInterval(animationRef.current);
            animationRef.current = null;
        }

        setDisplayedText('');

        let idx = 0;
        animationRef.current = setInterval(() => {
            setDisplayedText(text.slice(0, idx + 1));
            idx++;
            if (idx >= text.length) {
                if (animationRef.current) {
                    clearInterval(animationRef.current);
                    animationRef.current = null;
                }
            }
        }, 30);
    };

    useEffect(() => {
        if (isFirstLoadRef.current) {
            const timer = setTimeout(() => {
                animateText(welcomeText);
                isFirstLoadRef.current = false;
            }, 200);

            return () => {
                clearTimeout(timer);
                if (animationRef.current) {
                    clearInterval(animationRef.current);
                }
            };
        }
    }, []);

    return (
        <div className="flex flex-col px-4 sm:px-6 pb-8 h-full">
            <div className="w-full max-w-sm mx-auto flex flex-col justify-between h-full">
                <div className="flex-1 flex flex-col justify-center items-center mt-20">
                    <div className="w-full">
                        <SpeechBubble
                            message={displayedText}
                            position="left"
                        />
                    </div>
                </div>

                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.8, duration: 0.5 }}
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