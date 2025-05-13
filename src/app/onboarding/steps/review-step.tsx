'use client';
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useOnboarding } from '@/lib/context/onboarding-provider';
import { Loader2 } from 'lucide-react';

type StoryPage = {
    id: string;
    index: number;
    text: string;
    imageUrl?: string;
};

export function ReviewStep() {
    const { generatedStoryId, goToNextStep } = useOnboarding();
    const [storyPages, setStoryPages] = useState<StoryPage[]>([]);
    const [currentPage, setCurrentPage] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch the story content (pages) when a story ID is available
    useEffect(() => {
        if (!generatedStoryId) return;
        const loadStory = async () => {
            try {
                const res = await fetch(`/api/story/${generatedStoryId}`);
                if (!res.ok) throw new Error('Failed to fetch story');
                const data = await res.json();
                setStoryPages(data.pages || []);
            } catch (err) {
                console.error('Error loading story pages:', err);
            } finally {
                setIsLoading(false);
            }
        };
        loadStory();
    }, [generatedStoryId]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
                <span>Loading your story...</span>
            </div>
        );
    }
    if (!storyPages.length) {
        return (
            <div className="flex flex-col items-center justify-center h-full px-4 text-center">
                <h2 className="text-2xl font-bold mb-2">Story not found</h2>
                <p className="text-gray-600 mb-6">Oops, we couldn’t load your story. Please try again.</p>
            </div>
        );
    }

    const page = storyPages[currentPage];

    const goToNextPage = () => {
        if (currentPage < storyPages.length - 1) {
            setCurrentPage(curr => curr + 1);
        } else {
            // If on last page, proceed to finish step (signup)
            goToNextStep();
        }
    };
    const goToPrevPage = () => {
        if (currentPage > 0) {
            setCurrentPage(curr => curr - 1);
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Page counter */}
            <div className="px-4 py-2 border-b text-center text-gray-700 text-sm">
                Page {currentPage + 1} of {storyPages.length}
            </div>
            {/* Story content */}
            <div className="px-4 py-4 flex-1 overflow-y-auto">
                <h2 className="text-xl font-semibold mb-3">{/* Story title (if any) could be shown here */}</h2>
                {page.imageUrl && (
                    <div className="mb-4">
                        <Image
                            src={page.imageUrl}
                            alt="Story illustration"
                            width={400}
                            height={300}
                            className="w-full rounded-lg"
                        />
                        {/* Example action buttons for image */}
                        <div className="flex space-x-2 mt-2">
                            <button className="text-xs px-3 py-1 bg-gray-200 rounded-full">Re-roll</button>
                            <button className="text-xs px-3 py-1 bg-gray-200 rounded-full">Save to My World</button>
                        </div>
                    </div>
                )}
                <p className="text-gray-800 text-base leading-relaxed">{page.text}</p>
            </div>
            {/* Navigation buttons */}
            <div className="px-4 py-3 flex items-center space-x-2 border-t">
                <button
                    onClick={goToPrevPage}
                    disabled={currentPage === 0}
                    className="flex-1 py-2 bg-gray-200 rounded-lg text-gray-700 disabled:opacity-50"
                >
                    {currentPage === 0 ? 'Back' : 'Previous'}
                </button>
                <button
                    onClick={goToNextPage}
                    className="flex-1 py-2 bg-[#212121] text-white rounded-lg"
                >
                    {currentPage === storyPages.length - 1 ? 'Finish' : 'Next'}
                </button>
            </div>
        </div>
    );
}