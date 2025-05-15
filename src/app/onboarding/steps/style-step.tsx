'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useOnboarding } from '@/lib/context/onboarding-provider';
import { Button } from '@/components/ui/button';
import { SpeechBubble } from './speech-bubble';
import { Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

// Define the style option type for TypeScript
interface StyleOption {
    id: string;
    name: string;
    description: string;
    color: string;
    textColor: string;
    imageUrl?: string;
}

// Visual style options
const STYLE_OPTIONS: StyleOption[] = [
    { id: 'cartoonish', name: 'Cartoonish', color: '#FFD166', textColor: '#000000', description: 'Fun and playful cartoon style with bold colors and simple shapes.' },
    { id: 'watercolor', name: 'Watercolor', color: '#06D6A0', textColor: '#000000', description: 'Soft, artistic watercolor paintings with gentle color blending.' },
    { id: 'pixar', name: 'Pixar-Style', color: '#118AB2', textColor: '#FFFFFF', description: '3D animated style inspired by Pixar films with expressive characters.' },
    { id: 'storybook', name: 'Storybook', color: '#EF476F', textColor: '#FFFFFF', description: 'Classic storybook illustrations with detailed linework and warm tones.' },
    { id: 'whimsical', name: 'Whimsical', color: '#9B5DE5', textColor: '#FFFFFF', description: 'Dreamy, fantastical scenes with magical elements and soft lighting.' },
    { id: 'realistic', name: 'Realistic', color: '#424242', textColor: '#FFFFFF', description: 'Lifelike illustrations with natural proportions and detailed textures.' },
];

export function StyleStep() {
    const { visualStyle, setVisualStyle, goToNextStep } = useOnboarding();
    const [availableStyles, setAvailableStyles] = useState<StyleOption[]>(STYLE_OPTIONS);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [isLoading, setIsLoading] = useState(false);

    // Initialize selected style from context or undefined
    const [selectedStyle, setSelectedStyle] = useState<StyleOption | undefined>(
        visualStyle ? STYLE_OPTIONS.find(style => style.id === visualStyle.id) : undefined
    );

    // Speech bubble and animation state
    const [displayedText, setDisplayedText] = useState('');
    const isFirstEntryRef = useRef(true);
    const animationRef = useRef<NodeJS.Timeout | null>(null);

    // Speech bubble messages
    const baseText = "Now, let's choose a visual style for your story!";
    const selectedText = (styleName: string) => `Great choice! ${styleName} will make your story come alive.`;

    // Fetch styles from the server
    useEffect(() => {
        const fetchStyles = async () => {
            try {
                const response = await fetch('/api/styles');
                if (response.ok) {
                    const data = await response.json();
                    if (data.styles && data.styles.length > 0) {
                        // Process the server-provided styles
                        const updatedStyles: StyleOption[] = data.styles.map((serverStyle: any): StyleOption => {
                            // Find matching local style for any missing properties
                            const localStyle = STYLE_OPTIONS.find((s: StyleOption) => s.id === serverStyle.id);

                            return {
                                id: serverStyle.id,
                                name: serverStyle.name,
                                description: serverStyle.description || localStyle?.description || '',
                                imageUrl: serverStyle.imageUrl || '',
                                color: serverStyle.color || localStyle?.color || '#CCCCCC',
                                textColor: serverStyle.textColor || localStyle?.textColor || '#000000',
                            };
                        });

                        setAvailableStyles(updatedStyles);

                        // Update selected style if it exists
                        if (selectedStyle) {
                            const updatedSelected = updatedStyles.find((s: StyleOption) => s.id === selectedStyle.id);
                            if (updatedSelected) {
                                setSelectedStyle(updatedSelected);
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('Failed to load visual styles:', error);
                // Keep using local styles on error
            } finally {
                setIsInitialLoad(false);
            }
        };

        fetchStyles();
    }, []);

    // Animate text typing effect in speech bubble
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

    // Initialize speech bubble text on first render
    useEffect(() => {
        if (isFirstEntryRef.current) {
            animateText(baseText);
            isFirstEntryRef.current = false;
        }

        // If there's already a selected style (coming back to this step)
        if (selectedStyle) {
            animateText(selectedText(selectedStyle.name));
        }
    }, []);

    // Handle style selection
    const handleStyleSelect = (style: StyleOption) => {
        setIsLoading(true);

        try {
            setSelectedStyle(style);

            // Save the style to context
            setVisualStyle({
                id: style.id,
                name: style.name,
                imageUrl: style.imageUrl || ''
            });

            // Show confirmation
            animateText(selectedText(style.name));

        } catch (error) {
            console.error('Error selecting style:', error);
            toast.error('Failed to select style', {
                description: 'Please try selecting again'
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.05
            }
        }
    };

    const itemVariants = {
        hidden: { scale: 0.8, opacity: 0 },
        visible: { scale: 1, opacity: 1, transition: { duration: 0.4 } }
    };

    // Show loading state while initially fetching styles
    if (isInitialLoad) {
        return (
            <div className="flex flex-col items-center justify-center px-6 pb-8 h-64">
                <div className="animate-pulse flex space-x-4">
                    <div className="w-12 h-12 rounded-full bg-gray-300"></div>
                    <div className="flex-1 space-y-4 py-1">
                        <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                        <div className="space-y-2">
                            <div className="h-4 bg-gray-300 rounded"></div>
                            <div className="h-4 bg-gray-300 rounded w-5/6"></div>
                        </div>
                    </div>
                </div>
                <p className="text-gray-500 mt-4">Loading style options...</p>
            </div>
        );
    }

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

            <motion.div
                className="grid grid-cols-2 gap-3 mb-8"
                initial="hidden"
                animate="visible"
                variants={containerVariants}
            >
                {availableStyles.map((style) => {
                    const isSelected = selectedStyle?.id === style.id;
                    const hasImage = Boolean(style.imageUrl);

                    return (
                        <motion.div
                            key={style.id}
                            variants={itemVariants}
                            transition={{ duration: 0.4 }}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                        >
                            <div
                                onClick={() => !isLoading && handleStyleSelect(style)}
                                className={`relative h-32 rounded-xl cursor-pointer transition-all duration-300 overflow-hidden ${
                                    isSelected ? 'ring-4 ring-[#4CAF50] ring-opacity-70 shadow-lg' : 'hover:shadow-md'
                                } ${isLoading ? 'opacity-60 cursor-wait' : ''}`}
                                style={!hasImage ? { backgroundColor: style.color } : {}}
                            >
                                {/* Display image if available */}
                                {hasImage && (
                                    <img
                                        src={style.imageUrl}
                                        alt={style.name}
                                        className="w-full h-full object-cover"
                                    />
                                )}

                                {/* Style name */}
                                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/40 to-transparent rounded-b-xl">
                                    <p className="font-medium text-center" style={{ color: hasImage ? '#FFFFFF' : style.textColor }}>
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

            {/* Description of selected style */}
            {selectedStyle && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="mb-6 px-4 py-3 bg-gray-50 rounded-lg"
                >
                    <h3 className="font-medium text-gray-800">{selectedStyle.name} Style</h3>
                    <p className="text-sm text-gray-600 mt-1">{selectedStyle.description}</p>
                </motion.div>
            )}

            {/* Continue button */}
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
            >
                <Button
                    onClick={goToNextStep}
                    disabled={!selectedStyle || isLoading}
                    className={`w-full py-6 text-lg font-medium rounded-full transition-all duration-300 ${
                        !selectedStyle || isLoading
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-[#4CAF50] hover:bg-[#43a047] text-white shadow-md hover:shadow-lg'
                    }`}
                >
                    {isLoading ? 'Saving...' : 'Continue'}
                </Button>
            </motion.div>
        </div>
    );
}