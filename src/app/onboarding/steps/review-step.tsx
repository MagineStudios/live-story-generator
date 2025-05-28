'use client';
import React, { useEffect, useState } from 'react';
import { useOnboarding } from '@/lib/context/onboarding-provider';
import { Button } from '@/components/ui/button';
import { SpeechBubble } from './speech-bubble';
import { Loader2, Book, FileText } from 'lucide-react';
import { motion } from 'framer-motion';

interface StoryPage {
    id: string;
    text: string;
    index: number;
    microprompts: string[];
    illustrationPrompt: string | null;
    imagePrompt: string | null;
    chosenImageId: string | null;
}

interface StoryData {
    id: string;
    title: string;
    summary: string;
    theme: string;
    pages: StoryPage[];
}

export function ReviewStep() {
    const { generatedStoryId, goToNextStep, visualStyle, tone, selectedElements } = useOnboarding();
    const [storyData, setStoryData] = useState<StoryData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showPrompts, setShowPrompts] = useState(true); // Toggle for showing prompts vs placeholder

    useEffect(() => {
        if (!generatedStoryId) {
            setError("Story ID is missing. Please try again.");
            setIsLoading(false);
            return;
        }

        const fetchStoryData = async () => {
            try {
                setIsLoading(true);
                const res = await fetch(`/api/story/${generatedStoryId}`);

                if (!res.ok) {
                    throw new Error("Failed to load story");
                }

                const data = await res.json();
                setStoryData(data);
            } catch (err) {
                console.error("Error loading story:", err);
                setError("Failed to load your story. Please try again.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchStoryData();
    }, [generatedStoryId]);

    return (
        <div className="flex flex-col px-6 pb-8 justify-center">
            <div className="mb-6">
                <SpeechBubble
                    message="Your story is ready! Review the story text and illustration prompts."
                    position="left"
                />
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-10">
                    <Loader2 className="w-10 h-10 text-[#4CAF50] animate-spin mb-4" />
                    <p className="text-gray-600">Loading your story...</p>
                </div>
            ) : error ? (
                <div className="text-center py-6 bg-red-50 rounded-lg">
                    <p className="text-red-500 mb-4">{error}</p>
                    <Button
                        variant="outline"
                        onClick={() => window.location.reload()}
                        className="border-red-300 text-red-500 hover:bg-red-50"
                    >
                        Try again
                    </Button>
                </div>
            ) : storyData && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="mb-8 space-y-6"
                >
                    {/* Story info card */}
                    <div className="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-md p-4">
                        <h2 className="text-xl font-bold mb-2">{storyData.title}</h2>
                        <p className="text-gray-600 mb-2">{storyData.theme}</p>
                        
                        <div className="flex flex-wrap gap-2 mb-4">
                            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                                {visualStyle?.name || 'Custom Style'}
                            </span>
                            {tone && tone.map((t, idx) => (
                                <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                                    {t}
                                </span>
                            ))}
                        </div>

                        <div className="flex items-center justify-between mb-4">
                            <p className="text-sm text-gray-500">
                                {storyData.pages.length} pages generated
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowPrompts(!showPrompts)}
                                className="text-xs"
                            >
                                {showPrompts ? 'Hide' : 'Show'} Prompts
                            </Button>
                        </div>
                    </div>

                    {/* Story pages */}
                    <div className="space-y-6">
                        {storyData.pages.map((page, index) => (
                            <motion.div
                                key={page.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="bg-gray-50 rounded-lg p-4"
                            >
                                <h3 className="font-semibold text-lg mb-2">Page {index + 1}</h3>
                                
                                {/* Story text */}
                                <div className="mb-4">
                                    <p className="text-gray-700">{page.text}</p>
                                </div>

                                {/* Illustration section */}
                                {showPrompts && page.illustrationPrompt && (
                                    <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                                        <div className="flex items-center gap-2 mb-2">
                                            <FileText className="w-4 h-4 text-gray-500" />
                                            <h4 className="font-medium text-sm text-gray-700">Illustration Prompt:</h4>
                                        </div>
                                        <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono bg-gray-50 p-3 rounded overflow-x-auto">
                                            {page.illustrationPrompt}
                                        </pre>
                                        
                                        {/* Prompt validation indicators */}
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {visualStyle && page.illustrationPrompt.includes(visualStyle.name) && (
                                                <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                                                    ✓ Style: {visualStyle.name}
                                                </span>
                                            )}
                                            {selectedElements.filter(el => el.category === 'CHARACTER').map(char => (
                                                <span 
                                                    key={char.id}
                                                    className={`text-xs px-2 py-1 rounded ${
                                                        page?.illustrationPrompt?.includes(char.name) 
                                                            ? 'bg-green-100 text-green-700' 
                                                            : 'bg-red-100 text-red-700'
                                                    }`}
                                                >
                                                    {page?.illustrationPrompt?.includes(char.name) ? '✓' : '✗'} {char.name}
                                                </span>
                                            ))}
                                        </div>

                                        {/* Show microprompts if they exist */}
                                        {page.microprompts && page.microprompts.length > 0 && (
                                            <div className="mt-3 pt-3 border-t border-gray-200">
                                                <p className="text-xs text-gray-500 mb-1">Microprompts for remixing:</p>
                                                <div className="space-y-1">
                                                    {page.microprompts.map((prompt, idx) => (
                                                        <div key={idx} className="text-xs bg-gray-100 p-2 rounded">
                                                            {prompt}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Placeholder for future image */}
                                {!showPrompts && (
                                    <div className="mt-4 aspect-[3/2] bg-gray-200 rounded-lg flex items-center justify-center">
                                        <div className="text-center">
                                            <Book className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                            <p className="text-sm text-gray-500">Image will be generated here</p>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </div>

                    {/* Character summary */}
                    {selectedElements.length > 0 && (
                        <div className="bg-blue-50 rounded-lg p-4">
                            <h3 className="font-semibold mb-2">Characters in Story:</h3>
                            <div className="flex flex-wrap gap-2">
                                {selectedElements.map((el) => (
                                    <span key={el.id} className="px-3 py-1 bg-white rounded-full text-sm">
                                        {el.name} ({el.category.toLowerCase()})
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
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
                    disabled={isLoading}
                    className="w-full py-6 text-lg font-medium rounded-full bg-[#4CAF50] hover:bg-[#43a047] text-white cursor-pointer shadow-md hover:shadow-lg transition-all duration-300"
                >
                    Continue
                </Button>
            </motion.div>
        </div>
    );
}