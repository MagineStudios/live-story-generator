'use client';
import React, { useEffect, useState } from 'react';
import { useOnboarding } from '@/lib/context/onboarding-provider';
import { Button } from '@/components/ui/button';
import { SpeechBubble } from './speech-bubble';
import { Loader2, Book } from 'lucide-react';
import { motion } from 'framer-motion';

interface StoryData {
    id: string;
    title: string;
    summary: string;
    coverImageUrl: string;
}

export function ReviewStep() {
    const { generatedStoryId, goToNextStep } = useOnboarding();
    const [storyData, setStoryData] = useState<StoryData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
                    message="Your story is ready! Take a look at your magical creation."
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
                    className="mb-8"
                >
                    {/* Story preview card */}
                    <div className="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-md">
                        {/* Cover image */}
                        {storyData.coverImageUrl ? (
                            <div className="aspect-[3/2] relative">
                                <img
                                    src={storyData.coverImageUrl}
                                    alt={storyData.title}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        ) : (
                            <div className="aspect-[3/2] bg-gray-100 flex flex-col items-center justify-center">
                                <Book className="w-12 h-12 text-gray-400 mb-2" />
                                <p className="text-gray-500">No cover image available</p>
                            </div>
                        )}

                        {/* Story details */}
                        <div className="p-4">
                            <h2 className="text-xl font-bold mb-2">{storyData.title}</h2>
                            <p className="text-gray-600 mb-4">{storyData.summary}</p>
                        </div>
                    </div>
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