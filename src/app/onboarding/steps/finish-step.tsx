'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { SpeechBubble } from './speech-bubble';
import { PartyPopper, BookOpen, Share2, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useOnboarding } from '@/lib/context/onboarding-provider';

interface Story {
    id: string;
    title: string;
    status: string;
}

export function FinishStep() {
    const router = useRouter();
    const { generatedStoryId, resetOnboarding } = useOnboarding();
    const [story, setStory] = useState<Story | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch the story data when component mounts
    useEffect(() => {
        const fetchStory = async () => {
            if (!generatedStoryId) {
                setError('No story was created. Please try again.');
                setLoading(false);
                return;
            }

            try {
                const response = await fetch(`/api/story/${generatedStoryId}`);

                if (!response.ok) {
                    throw new Error(`Failed to load story (${response.status})`);
                }

                const data = await response.json();
                setStory(data);
            } catch (err) {
                console.error('Error fetching story:', err);
                setError(err instanceof Error ? err.message : 'Failed to load your story');
            } finally {
                setLoading(false);
            }
        };

        fetchStory();
    }, [generatedStoryId]);

    return (
        <div className="flex flex-col px-6 pb-8 justify-center">
            <div className="mb-6">
                <SpeechBubble
                    message={loading ? "Just getting your story ready..." :
                        error ? "Hmm, I'm having trouble finding your story." :
                            "Congratulations! Your magical story is ready to read and share."}
                    position="top"
                />
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-10">
                    <Loader2 className="w-12 h-12 text-[#4CAF50] animate-spin mb-6" />
                    <p className="text-gray-600">Loading your story...</p>
                </div>
            ) : (
                <>
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.6 }}
                        className="flex justify-center mb-10"
                    >
                        <div className="w-24 h-24 rounded-full bg-[#4CAF50]/10 flex items-center justify-center">
                            <PartyPopper className="w-12 h-12 text-[#4CAF50]" />
                        </div>
                    </motion.div>

                    <motion.h2
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-3xl font-bold text-center mb-3"
                    >
                        {error ? 'Something Went Wrong' : `"${story?.title || 'Your Story'}" is Ready!`}
                    </motion.h2>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="text-gray-600 text-center mb-8"
                    >
                        {error ? 'There was a problem generating your story.' :
                            'Start reading your magical adventure or create another story.'}
                    </motion.p>

                    <div className="space-y-4">
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.7, duration: 0.5 }}
                        >
                            <Button
                                onClick={() => router.push(`/story/${generatedStoryId}`)}
                                disabled={!generatedStoryId || !!error}
                                className={`w-full py-6 text-lg font-medium rounded-full 
                                    ${!generatedStoryId || error ?
                                    'bg-gray-300 text-gray-500 cursor-not-allowed' :
                                    'bg-[#4CAF50] hover:bg-[#43a047] text-white cursor-pointer shadow-md hover:shadow-lg'} 
                                    transition-all duration-300`}
                            >
                                <BookOpen className="w-5 h-5 mr-2" />
                                Read Your Story
                            </Button>
                        </motion.div>

                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.9, duration: 0.5 }}
                        >
                            <Button
                                variant="outline"
                                onClick={() => router.push(`/story/${generatedStoryId}/share`)}
                                disabled={!generatedStoryId || !!error}
                                className={`w-full py-6 text-lg font-medium rounded-full 
                                    ${!generatedStoryId || error ?
                                    'border-2 border-gray-300 text-gray-500 cursor-not-allowed' :
                                    'border-2 border-[#4CAF50] text-[#4CAF50] hover:bg-[#4CAF50]/10 cursor-pointer'} 
                                    transition-all duration-300`}
                            >
                                <Share2 className="w-5 h-5 mr-2" />
                                Share Your Story
                            </Button>
                        </motion.div>

                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 1.1, duration: 0.5 }}
                        >
                            <Button
                                variant="ghost"
                                onClick={() => {
                                    // Reset onboarding to start fresh
                                    resetOnboarding();
                                }}
                                className="w-full py-6 text-lg font-medium rounded-full text-gray-600 hover:bg-gray-100 cursor-pointer transition-all duration-300"
                            >
                                Create Another Story
                            </Button>
                        </motion.div>
                    </div>
                </>
            )}
        </div>
    );
}