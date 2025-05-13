'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useOnboarding } from '@/lib/context/onboarding-provider';
import { Button } from '@/components/ui/button';
import { SpeechBubble } from './speech-bubble';
import { Sparkles, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export function ThemeStep() {
    const {
        themePrompt,
        setThemePrompt,
        themeSuggestions,
        isLoadingSuggestions,
        generateThemeSuggestions,
        goToNextStep
    } = useOnboarding();

    const [selectedPrompt, setSelectedPrompt] = useState<string>(themePrompt || '');
    const [displayedText, setDisplayedText] = useState('');
    const isFirstEntryRef = useRef(true);
    const animationRef = useRef<NodeJS.Timeout | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const baseText = "Describe what you'd like your story to be about!";

    const animateText = (text: string) => {
        if (animationRef.current) clearInterval(animationRef.current);
        setDisplayedText('');
        let idx = 0;
        animationRef.current = setInterval(() => {
            setDisplayedText(text.slice(0, idx + 1));
            idx++;
            if (idx >= text.length && animationRef.current) clearInterval(animationRef.current);
        }, 20);
    };

    useEffect(() => {
        if (isFirstEntryRef.current) {
            animateText(baseText);
            isFirstEntryRef.current = false;
        }

        // Generate suggestions on first load if they don't exist
        if (themeSuggestions.length === 0 && !isLoadingSuggestions) {
            generateThemeSuggestions();
        }
    }, [themeSuggestions, isLoadingSuggestions, generateThemeSuggestions]);

    const handlePromptSelect = (prompt: string) => {
        setSelectedPrompt(prompt);
        setThemePrompt(prompt);

        // Auto-focus and scroll to bottom to show continue button
        if (textareaRef.current) {
            textareaRef.current.focus();
            setTimeout(() => {
                window.scrollTo({
                    top: document.body.scrollHeight,
                    behavior: 'smooth'
                });
            }, 100);
        }
    };

    return (
        <div className="flex flex-col px-6 pb-8 justify-center">
            <div className="mb-6">
                <SpeechBubble
                    message={displayedText}
                    animateIn={isFirstEntryRef.current}
                    heightClass="min-h-[60px]"
                    position="left"
                />
            </div>

            {/* Textarea for custom prompt */}
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="mb-4"
            >
                <div className="relative">
                    <textarea
                        ref={textareaRef}
                        value={selectedPrompt}
                        onChange={(e) => {
                            setSelectedPrompt(e.target.value);
                            setThemePrompt(e.target.value);
                        }}
                        placeholder="A magical adventure where..."
                        className="w-full min-h-[120px] px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#4CAF50] focus:ring focus:ring-[#4CAF50]/20 outline-none resize-none font-nunito"
                    />
                    <div className="absolute bottom-3 right-3">
                        <Sparkles className="w-5 h-5 text-[#4CAF50] opacity-50" />
                    </div>
                </div>
            </motion.div>

            {/* Suggestions section */}
            <div className="mb-8">
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-sm font-medium text-gray-500 mb-3"
                >
                    {isLoadingSuggestions ? 'Loading suggestions...' : 'Or choose from these suggestions:'}
                </motion.p>

                {isLoadingSuggestions ? (
                    <div className="flex justify-center py-6">
                        <Loader2 className="w-8 h-8 text-[#4CAF50] animate-spin" />
                    </div>
                ) : (
                    <motion.div
                        className="space-y-3"
                        initial="hidden"
                        animate="visible"
                        variants={{
                            visible: {
                                transition: {
                                    staggerChildren: 0.1
                                }
                            }
                        }}
                    >
                        {themeSuggestions.map((suggestion, index) => (
                            <motion.div
                                key={index}
                                variants={{
                                    hidden: { y: 10, opacity: 0 },
                                    visible: { y: 0, opacity: 1 }
                                }}
                                transition={{ duration: 0.4 }}
                            >
                                <div
                                    onClick={() => handlePromptSelect(suggestion.text)}
                                    className="p-3 rounded-lg border border-gray-200 hover:border-[#4CAF50] hover:bg-[#4CAF50]/5 cursor-pointer transition-all"
                                >
                                    <h4 className="font-medium text-gray-800 mb-1">{suggestion.title}</h4>
                                    <p className="text-sm text-gray-600">{suggestion.text}</p>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </div>

            {/* Continue button */}
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
            >
                <Button
                    onClick={goToNextStep}
                    disabled={!selectedPrompt.trim() || selectedPrompt.length < 10}
                    className={`w-full py-6 text-lg font-medium rounded-full transition-all duration-300 ${
                        !selectedPrompt.trim() || selectedPrompt.length < 10
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-[#4CAF50] hover:bg-[#43a047] text-white shadow-md hover:shadow-lg'
                    }`}
                >
                    Create My Story!
                </Button>
            </motion.div>
        </div>
    );
}