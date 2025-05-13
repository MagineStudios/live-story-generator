'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useOnboarding } from '@/lib/context/onboarding-provider';
import { Button } from '@/components/ui/button';
import { SpeechBubble } from './speech-bubble';
import { User, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function CharactersStep() {
    const { selectedElements, addUploadedImage, isAnalyzingImage, goToNextStep } = useOnboarding();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [displayedText, setDisplayedText] = useState('');
    const isFirstEntryRef = useRef(true);
    const animationRef = useRef<NodeJS.Timeout | null>(null);

    const baseText = "Who should be in your story? Add some characters!";
    const uploadingText = "Analyzing your character... This will just take a moment!";
    const completedText = "Perfect! Your character has been added.";

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

        // Update text when analyzing image
        if (isAnalyzingImage) {
            animateText(uploadingText);
        } else if (!isFirstEntryRef.current && selectedElements.length > 0) {
            animateText(completedText);
        }
    }, [isAnalyzingImage, selectedElements.length]);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        await addUploadedImage(file, 'CHARACTER');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const characterCount = selectedElements.filter(el => el.category === 'CHARACTER').length;

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: { duration: 0.4 }
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

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="mb-8"
            >
                {/* Character selection area */}
                <motion.div variants={itemVariants} className="mb-4">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isAnalyzingImage}
                        className={`w-full flex items-center justify-center p-6 rounded-xl border-2 border-dashed transition-colors ${
                            isAnalyzingImage
                                ? 'border-gray-300 bg-gray-50 cursor-wait'
                                : 'border-[#4CAF50] hover:bg-[#4CAF50]/5 cursor-pointer'
                        }`}
                    >
                        <div className="flex flex-col items-center text-center">
                            <div className="w-14 h-14 rounded-full bg-[#4CAF50]/10 flex items-center justify-center mb-3">
                                {isAnalyzingImage ? (
                                    <div className="w-6 h-6 border-2 border-[#4CAF50] border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <Upload className="w-6 h-6 text-[#4CAF50]" />
                                )}
                            </div>
                            <p className="font-medium text-gray-700 mb-1">
                                {isAnalyzingImage ? 'Analyzing Image...' : 'Upload a character image'}
                            </p>
                            <p className="text-sm text-gray-500">
                                {isAnalyzingImage
                                    ? 'Please wait while we process your image'
                                    : 'JPG, PNG or WebP, max 5MB'
                                }
                            </p>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileSelect}
                            disabled={isAnalyzingImage}
                            className="hidden"
                        />
                    </button>
                </motion.div>

                {/* Display characters */}
                <AnimatePresence>
                    {selectedElements.filter(el => el.category === 'CHARACTER').map((character) => (
                        <motion.div
                            key={character.id}
                            variants={itemVariants}
                            exit={{ opacity: 0, y: -10 }}
                            className="mb-3"
                        >
                            <div className="flex items-center p-3 bg-white rounded-xl border border-gray-200 shadow-sm">
                                <div className="w-12 h-12 rounded-md overflow-hidden mr-3 flex-shrink-0">
                                    {character.imageUrl ? (
                                        <img
                                            src={character.imageUrl}
                                            alt={character.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                            <User className="w-6 h-6 text-gray-500" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-medium text-gray-800">{character.name}</h4>
                                    <p className="text-sm text-gray-500 line-clamp-1">
                                        {character.description || 'No description'}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </motion.div>

            {/* Continue button */}
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
            >
                <Button
                    onClick={goToNextStep}
                    disabled={isAnalyzingImage}
                    className="w-full py-6 text-lg font-medium rounded-full bg-[#4CAF50] hover:bg-[#43a047] text-white cursor-pointer shadow-md hover:shadow-lg transition-all duration-300"
                >
                    {characterCount > 0 ? 'Continue' : 'Skip for now'}
                </Button>
            </motion.div>
        </div>
    );
}