'use client';
import React, { useState, useEffect } from 'react';
import { useStoryBuilder } from '@/lib/context/story-builder-context';
import { Loader2, RefreshCw } from 'lucide-react';
import Image from 'next/image';

type StoryPage = {
    id: string;
    index: number;
    text: string;
    editedText?: string;
    imageUrl?: string;
    chosenImageUrl?: string;
};

export default function Review() {
    const [storyPages, setStoryPages] = useState<StoryPage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(0);
    const { generatedStoryId } = useStoryBuilder();

    // Fetch story pages
    useEffect(() => {
        if (!generatedStoryId) return;

        async function fetchStory() {
            try {
                setIsLoading(true);
                const response = await fetch(`/api/story/${generatedStoryId}`);

                if (!response.ok) throw new Error('Failed to fetch story');

                const data = await response.json();
                setStoryPages(data.pages || []);
            } catch (error) {
                console.error('Error fetching story:', error);
            } finally {
                setIsLoading(false);
            }
        }

        fetchStory();

        // For demo purposes, create mock data if no story ID
        if (!generatedStoryId) {
            setStoryPages([
                {
                    id: '1',
                    index: 0,
                    text: "Max tightened his red captain's hat and peered through his telescope. The waves of Brick Bay splashed against The Mighty Builder, his trusty LEGO ship.",
                    imageUrl: '/demo/story-page-1.jpg'
                },
                {
                    id: '2',
                    index: 1,
                    text: `"Land ho!" shouted Penny, his first mate. Her wild orange hair peeked out from under her blue bandana as she pointed excitedly. "That must be Mystery Island!"`,
                    imageUrl: '/demo/story-page-2.jpg'
                },
                {
                    id: '3',
                    index: 2,
                    text: "The colorful map they had discovered in Grandpa's attic showed a treasure hidden somewhere on the island. But the map also warned of challenges that would test their building skills.",
                    imageUrl: '/demo/story-page-3.jpg'
                },
                // Add more mock pages as needed
            ]);
            setIsLoading(false);
        }
    }, [generatedStoryId]);

    // Get current page
    const currentStoryPage = storyPages[currentPage];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
                <span>Loading your story...</span>
            </div>
        );
    }

    // If no story data is available
    if (!currentStoryPage) {
        return (
            <div className="flex flex-col items-center justify-center h-full px-4 text-center">
                <h2 className="text-2xl font-bold mb-2">Story not found</h2>
                <p className="text-gray-600 mb-6">
                    We couldn't find your story. Please try creating a new one.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full pb-6">
            <div className="px-4 py-3 flex items-center border-b">
                <h2 className="text-lg font-medium flex-1 text-center">
                    Page {currentPage + 1} of {storyPages.length}
                </h2>
            </div>

            <div className="px-4">
                <h1 className="text-2xl font-bold my-4">Review & edit your story</h1>

                <h2 className="text-xl font-medium mb-2">
                    The Hidden Treasure of Brick Bay
                </h2>

                {currentStoryPage.imageUrl && (
                    <div className="mb-4 rounded-lg overflow-hidden">
                        <Image
                            src={currentStoryPage.imageUrl}
                            alt="Story illustration"
                            width={400}
                            height={250}
                            className="w-full"
                        />

                        <div className="flex space-x-2 mt-2">
                            <button className="text-sm px-4 py-1 bg-gray-200 rounded-full">
                                Re-roll
                            </button>
                            <button className="text-sm px-4 py-1 bg-gray-200 rounded-full">
                                Save to My World
                            </button>
                        </div>
                    </div>
                )}

                <p className="text-gray-800 mb-6">
                    {currentStoryPage.text}
                </p>

                {/* Navigation controls */}
                <div className="flex space-x-2 mt-auto pt-4">
                    <button className="px-6 py-2 bg-gray-200 rounded-lg flex-1">
                        Edit
                    </button>
                    <button className="px-6 py-2 bg-gray-200 rounded-lg flex-1">
                        Remix
                    </button>
                    <button
                        onClick={() => {
                            if (currentPage < storyPages.length - 1) {
                                setCurrentPage(current => current + 1);
                            }
                        }}
                        className="px-6 py-2 bg-[#212121] text-white rounded-lg flex-1"
                    >
                        {currentPage === storyPages.length - 1 ? "Print" : "Next"}
                    </button>
                </div>
            </div>
        </div>
    );
}