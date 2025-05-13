'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useOnboarding } from '@/lib/context/onboarding-provider';
import { Button } from '@/components/ui/button';
import { SpeechBubble } from './speech-bubble';
import { Check } from 'lucide-react';
import { motion } from 'framer-motion';

// Visual style options with color instead of images
const STYLE_OPTIONS = [
    { id: 'cartoonish', name: 'Cartoonish', color: '#FFD166', textColor: '#000000' },
    { id: 'watercolor', name: 'Watercolor', color: '#06D6A0', textColor: '#000000' },
    { id: 'pixar', name: 'Pixar-Style', color: '#118AB2', textColor: '#FFFFFF' },
    { id: 'storybook', name: 'Storybook', color: '#EF476F', textColor: '#FFFFFF' },
    { id: 'whimsical', name: 'Whimsical', color: '#9B5DE5', textColor: '#FFFFFF' },
    { id: 'realistic', name: 'Realistic', color: '#424242', textColor: '#FFFFFF' },
];

export function StyleStep() {
    const { visualStyle, setVisualStyle, goToNextStep } = useOnboarding();
    const [selectedStyle, setSelectedStyle] = useState<typeof STYLE_OPTIONS[0] | undefined>(
        visualStyle ? STYLE_OPTIONS.find(style => style.id === visualStyle.id) : undefined
    );

    const [displayedText, setDisplayedText] = useState('');
    const isFirstEntryRef = useRef(true);
    const animationRef = useRef<NodeJS.Timeout | null>(null);

    const baseText = "Now, let's choose a visual style for your story!";
    const selectedText = (styleName: string) => `Great choice! ${styleName} will make your story come alive.`;

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
    }, []);

    const handleStyleSelect = (style: typeof STYLE_OPTIONS[0]) => {
        setSelectedStyle(style);
        setVisualStyle({ id: style.id, name: style.name, imageUrl: '' });
        animateText(selectedText(style.name));
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

            <motion.div
                className="grid grid-cols-2 gap-3 mb-8"
                initial="hidden"
                animate="visible"
                variants={{
                    visible: {
                        transition: {
                            staggerChildren: 0.05
                        }
                    }
                }}
            >
                {STYLE_OPTIONS.map((style) => {
                    const isSelected = selectedStyle?.id === style.id;

                    return (
                        <motion.div
                            key={style.id}
                            variants={{
                                hidden: { scale: 0.8, opacity: 0 },
                                visible: { scale: 1, opacity: 1 }
                            }}
                            transition={{ duration: 0.4 }}
                        >
                            <div
                                onClick={() => handleStyleSelect(style)}
                                className={`relative h-32 rounded-xl cursor-pointer transition-all duration-300 ${
                                    isSelected ? 'ring-4 ring-[#4CAF50] ring-opacity-70' : 'hover:shadow-md'
                                }`}
                                style={{ backgroundColor: style.color }}
                            >
                                {/* Style name */}
                                <div className="absolute bottom-0 left-0 right-0 p-3">
                                    <p className="font-medium text-center" style={{ color: style.textColor }}>
                                        {style.name}
                                    </p>
                                </div>

                                {/* Selection indicator */}
                                {isSelected && (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ duration: 0.3 }}
                                        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-md"
                                    >
                                        <Check className="w-5 h-5 text-[#4CAF50]" />
                                    </motion.div>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </motion.div>

            {/* Continue button */}
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
            >
                <Button
                    onClick={goToNextStep}
                    disabled={!selectedStyle}
                    className={`w-full py-6 text-lg font-medium rounded-full transition-all duration-300 ${
                        !selectedStyle
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-[#4CAF50] hover:bg-[#43a047] text-white shadow-md hover:shadow-lg'
                    }`}
                >
                    Continue
                </Button>
            </motion.div>
        </div>
    );
}