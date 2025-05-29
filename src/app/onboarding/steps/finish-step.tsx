'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ContinueButton } from '@/components/ui/continue-button';
import { cn } from '@/lib/utils';
import { SpeechBubble } from './speech-bubble';
import { PartyPopper, BookOpen, Share2, Loader2, Sparkles, Star, ArrowRight } from 'lucide-react';
import { useOnboarding } from '@/lib/context/onboarding-provider';
import { Button } from '@/components/ui/button';

interface Story {
    id: string;
    title: string;
    status: string;
    pages?: Array<{
        id: string;
        content: string;
        chosenImage?: {
            secureUrl: string;
        };
    }>;
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

    const handleReadStory = () => {
        if (generatedStoryId) {
            // Navigate directly to story page, bypassing onboarding context
            window.location.href = `/story/${generatedStoryId}`;
        }
    };

    const handleShareStory = () => {
        if (generatedStoryId) {
            // For now, just copy the URL
            const storyUrl = `${window.location.origin}/story/${generatedStoryId}`;
            navigator.clipboard.writeText(storyUrl);
            // You could add a toast here to confirm
        }
    };

    return (
        <div className="flex flex-col px-4 sm:px-6 pb-8 justify-center animate-in fade-in duration-500">
            <div className="mb-6">
                <SpeechBubble
                    message={
                        loading ? "Just polishing the final touches on your story... Almost there! ✨" :
                        error ? "Oh no! Something went wrong. Let's try creating your story again!" :
                        "🎉 Hooray! Your magical story is ready! I can't wait for you to read it!"
                    }
                    position="left"
                    animateIn={true}
                />
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                    <div className="relative mb-8">
                        <div className="w-20 h-20 rounded-full bg-[#4CAF50]/10 flex items-center justify-center animate-pulse">
                            <BookOpen className="w-10 h-10 text-[#4CAF50]" />
                        </div>
                        <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-yellow-400 animate-spin-slow" />
                    </div>
                    <p className="text-base text-gray-600 animate-pulse">Preparing your story...</p>
                </div>
            ) : error ? (
                <div className="space-y-6">
                    <div className="flex justify-center">
                        <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
                            <span className="text-4xl">😢</span>
                        </div>
                    </div>
                    
                    <div className="text-center space-y-2">
                        <h2 className="text-2xl font-bold text-gray-900">Oops!</h2>
                        <p className="text-gray-600">{error}</p>
                    </div>

                    <div className="pt-4">
                        <Button
                            onClick={resetOnboarding}
                            className="w-full py-5 text-base font-medium rounded-full bg-[#4CAF50] hover:bg-[#43a047] text-white cursor-pointer shadow-md hover:shadow-lg active:bg-[#3d943f] focus:outline-none focus:ring-4 focus:ring-[#4CAF50]/30 transition-all duration-300"
                        >
                            Try Again
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="space-y-8">
                    {/* Celebration Animation */}
                    <div className="flex justify-center animate-in zoom-in-50 duration-700">
                        <div className="relative">
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#4CAF50] to-[#43a047] flex items-center justify-center shadow-lg">
                                <PartyPopper className="w-12 h-12 text-white" />
                            </div>
                            
                            {/* Floating stars */}
                            <Star className="absolute -top-4 -left-4 w-6 h-6 text-yellow-400 animate-pulse" />
                            <Star className="absolute -bottom-4 -right-4 w-5 h-5 text-yellow-400 animate-pulse animation-delay-200" />
                            <Star className="absolute -top-2 right-0 w-4 h-4 text-yellow-400 animate-pulse animation-delay-400" />
                        </div>
                    </div>

                    {/* Success Message */}
                    <div className="text-center space-y-3 animate-in slide-in-from-bottom-3 duration-500 delay-300">
                        <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-[#4CAF50] to-[#43a047] bg-clip-text text-transparent">
                            Story Complete!
                        </h2>
                        <p className="text-lg font-medium text-gray-900">
                            "{story?.title || 'Your Magical Adventure'}"
                        </p>
                        <p className="text-sm text-gray-600">
                            {story?.pages?.length || 5} pages of wonder await you!
                        </p>
                    </div>

                    {/* Preview Card (if we have an image) */}
                    {story?.pages?.[0]?.chosenImage && (
                        <div className="mx-auto max-w-sm animate-in slide-in-from-bottom-4 duration-500 delay-500">
                            <div className="relative rounded-xl overflow-hidden shadow-lg group cursor-pointer" onClick={handleReadStory}>
                                <img 
                                    src={story.pages[0].chosenImage.secureUrl} 
                                    alt="Story preview"
                                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                                    <p className="text-white text-sm font-medium">Click to start reading →</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="space-y-3 animate-in slide-in-from-bottom-5 duration-500 delay-700">
                        <ContinueButton
                            onClick={handleReadStory}
                            className="w-full group"
                            disabled={!generatedStoryId}
                        >
                            <BookOpen className="w-5 h-5 mr-2" />
                            Read Your Story
                            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                        </ContinueButton>

                        <Button
                            variant="outline"
                            onClick={handleShareStory}
                            disabled={!generatedStoryId}
                            className={cn(
                                "w-full py-5 text-base font-medium rounded-full transition-all duration-200",
                                "border-2 border-[#4CAF50] text-[#4CAF50]",
                                "hover:bg-[#4CAF50]/10 hover:shadow-md",
                                "active:bg-[#4CAF50]/20",
                                "focus:outline-none focus:ring-4 focus:ring-[#4CAF50]/30",
                                "disabled:border-gray-300 disabled:text-gray-500 disabled:hover:bg-transparent"
                            )}
                        >
                            <Share2 className="w-5 h-5 mr-2" />
                            Share Your Story
                        </Button>

                        <div className="pt-4">
                            <Button
                                variant="ghost"
                                onClick={resetOnboarding}
                                className="w-full text-gray-600 hover:text-gray-800 hover:bg-gray-100 cursor-pointer py-5 text-base font-medium rounded-full transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-gray-200/30"
                            >
                                Create Another Story
                            </Button>
                        </div>
                    </div>

                    {/* Fun fact */}
                    <div className="text-center animate-in fade-in duration-700 delay-1000">
                        <p className="text-xs text-gray-500">
                            💡 Tip: You can always find your stories in your gallery!
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}