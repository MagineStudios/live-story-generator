'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useOnboarding } from '@/lib/context/onboarding-provider';
import { Button } from '@/components/ui/button';
import { SpeechBubble } from './speech-bubble';
import { Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export function ThemeStep() {
    const {
        themePrompt,
        setThemePrompt,
        themeSuggestions,
        isLoadingSuggestions,
        generateThemeSuggestions,
        goToNextStep,
        selectedElements,
        visualStyle,
        primaryCharacterId
    } = useOnboarding();

    const [selectedPrompt, setSelectedPrompt] = useState<string>(themePrompt || '');
    const [displayedText, setDisplayedText] = useState('');
    const isFirstEntryRef = useRef(true);
    const animationRef = useRef<NodeJS.Timeout | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Add state for character names and primary character
    const [characterNames, setCharacterNames] = useState<string[]>([]);
    const [primaryCharacterName, setPrimaryCharacterName] = useState<string>('');

    // Get base text that mentions characters if they exist
    const getBaseText = () => {
        if (primaryCharacterName) {
            if (characterNames.length > 1) {
                return `Let's create a story about ${primaryCharacterName} and friends! What should their adventure be about?`;
            }
            return `Let's create a story about ${primaryCharacterName}! What should their adventure be about?`;
        } else if (characterNames.length > 0) {
            return `Great! Let's create a story about ${characterNames.join(', ')}! What should their adventure be about?`;
        }
        return "Describe what you'd like your story to be about!";
    };

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

    // Extract character names on component mount
    useEffect(() => {
        const getCharacterInfo = () => {
            const characters = selectedElements.filter(el =>
                el.category === 'CHARACTER' || el.category === 'PET' || el.category === 'OBJECT'
            );

            const names = characters.map(char => char.name);

            // Get primary character name
            const primary = characters.find(char =>
                char.id === primaryCharacterId || char.isPrimary
            );

            return { names, primaryName: primary ? primary.name : '' };
        };

        // Get character names and primary character
        const { names, primaryName } = getCharacterInfo();
        setCharacterNames(names);
        setPrimaryCharacterName(primaryName);

        // Update the displayed text
        if (isFirstEntryRef.current) {
            const baseText = getBaseText();
            animateText(baseText);
            isFirstEntryRef.current = false;
        }

        // Generate suggestions if we have characters and a style
        if (selectedElements.length > 0 && visualStyle && themeSuggestions.length === 0 && !isLoadingSuggestions) {
            generateThemeSuggestions();
        }
    }, [selectedElements, themeSuggestions.length, isLoadingSuggestions, visualStyle, generateThemeSuggestions, primaryCharacterId]);

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

    // Handle refreshing suggestions
    const handleRefreshSuggestions = async () => {
        try {
            await generateThemeSuggestions();
            toast.success("New suggestions generated");
        } catch (error) {
            console.error("Error refreshing suggestions:", error);
            toast.error("Failed to refresh suggestions");
        }
    };

    return (
        <div className="flex flex-col px-6 pb-8 justify-center">
            <div className="mb-6">
                <SpeechBubble
                    message={displayedText}
                    animateIn={false}
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
                        className="w-full min-h-[120px] px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#4CAF50] focus:ring focus:ring-[#4CAF50]/20 outline-none resize-none font-normal text-gray-700"
                    />
                    <div className="absolute bottom-3 right-3">
                        <Sparkles className="w-5 h-5 text-[#4CAF50] opacity-50" />
                    </div>
                </div>
            </motion.div>

            {/* Suggestions section with refresh button */}
            <div className="mb-8">
                <div className="flex justify-between items-center mb-3">
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="text-sm font-medium text-gray-500"
                    >
                        {isLoadingSuggestions ? 'Loading suggestions...' : 'Or choose from these suggestions:'}
                    </motion.p>

                    {!isLoadingSuggestions && themeSuggestions.length > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleRefreshSuggestions}
                            disabled={isLoadingSuggestions}
                            className="text-xs flex items-center text-gray-500 hover:text-[#4CAF50]"
                        >
                            <RefreshCw className="w-3 h-3 mr-1" />
                            New Ideas
                        </Button>
                    )}
                </div>

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
                        {themeSuggestions.length > 0 ? (
                            themeSuggestions.map((suggestion, index) => (
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
                            ))
                        ) : (
                            <div className="text-center p-6 bg-gray-50 rounded-lg">
                                <p className="text-gray-500">No suggestions available yet. Try refreshing or enter your own theme.</p>
                                <Button
                                    onClick={generateThemeSuggestions}
                                    variant="outline"
                                    size="sm"
                                    className="mt-3"
                                    disabled={isLoadingSuggestions}
                                >
                                    Generate Suggestions
                                </Button>
                            </div>
                        )}
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