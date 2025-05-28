'use client';
import React, { useState, useEffect } from 'react';
import { useStoryBuilder } from '@/lib/context/story-builder-context';
import { Loader2, RefreshCw, Eye, FileText } from 'lucide-react';
import Image from 'next/image';

type ImageGenerationStatus = 'pending' | 'generating' | 'completed' | 'error';

type StoryPage = {
    id: string;
    index: number;
    text: string;
    editedText?: string;
    imageUrl?: string;
    chosenImageUrl?: string;
    illustrationPrompt?: string;
    imageStatus?: ImageGenerationStatus;
    imageError?: string;
};

export default function Review() {
    const [storyPages, setStoryPages] = useState<StoryPage[]>([]);
    const [storyTitle, setStoryTitle] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(0);
    const [viewMode, setViewMode] = useState<'image' | 'prompt'>('image');
    const [imageGenerationStarted, setImageGenerationStarted] = useState(false);
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
                
                // Set story title
                setStoryTitle(data.title || 'Untitled Story');
                
                // Initialize pages with image status
                const pagesWithStatus = (data.pages || []).map((page: any) => ({
                    ...page,
                    imageUrl: page.chosenImage?.secureUrl || null,
                    illustrationPrompt: page.illustrationPrompt || page.imagePrompt || '',
                    imageStatus: page.chosenImage?.secureUrl ? 'completed' : 'pending',
                }));
                
                setStoryPages(pagesWithStatus);
            } catch (error) {
                console.error('Error fetching story:', error);
                // Set demo data for testing
                setStoryPages([
                    {
                        id: '1',
                        index: 0,
                        text: "Max tightened his red captain's hat and peered through his telescope. The waves of Brick Bay splashed against The Mighty Builder, his trusty LEGO ship.",
                        illustrationPrompt: `**Scene Overview:**
**Max (8 years old); Male; Caucasian; short brown hair; fair skin; brown eyes; wearing red captain's hat, blue striped shirt, khaki shorts.**

**Foreground:**
Max standing confidently on the deck of his LEGO ship, holding a telescope

**Midground:**
The colorful LEGO ship with sails and details

**Background:**
Ocean waves and distant islands

**Hidden Detail:**
A small LEGO crab hiding in the ship's rigging

**Art Style & Rendering:**
LEGO animation style with bright colors and blocky textures

**Mood & Expression:**
Adventurous and excited, bright sunny day

**Speech Bubbles (Fredoka One font, #333333, white background, 3px dark gray outline, rounded corners):**
**Max:** "Adventure awaits!"`,
                        imageStatus: 'pending'
                    },
                    {
                        id: '2',
                        index: 1,
                        text: `"Land ho!" shouted Penny, his first mate. Her wild orange hair peeked out from under her blue bandana as she pointed excitedly. "That must be Mystery Island!"`,
                        illustrationPrompt: `**Scene Overview:**
**Penny (9 years old); Female; Caucasian; wild orange curly hair; fair skin; green eyes; wearing blue bandana, white sailor shirt, red pants.**

**Foreground:**
Penny pointing excitedly from the ship's crow's nest

**Midground:**
The ship's mast and rigging

**Background:**
A mysterious island with palm trees visible in the distance

**Hidden Detail:**
A parrot made of LEGO bricks sitting on the mast

**Art Style & Rendering:**
LEGO animation style with vibrant colors

**Mood & Expression:**
Excited discovery, bright daylight

**Speech Bubbles (Fredoka One font, #333333, white background, 3px dark gray outline, rounded corners):**
**Penny:** "Land ho! That must be Mystery Island!"`,
                        imageStatus: 'pending'
                    },
                ]);
            } finally {
                setIsLoading(false);
            }
        }

        fetchStory();
    }, [generatedStoryId]);

    // Trigger image generation when pages are loaded
    useEffect(() => {
        if (!generatedStoryId || storyPages.length === 0 || imageGenerationStarted) return;

        const pendingPages = storyPages.filter(page => page.imageStatus === 'pending');
        if (pendingPages.length === 0) return;

        async function generateImages() {
            setImageGenerationStarted(true);
            
            // Update all pending pages to generating status
            setStoryPages(pages => 
                pages.map(page => ({
                    ...page,
                    imageStatus: page.imageStatus === 'pending' ? 'generating' : page.imageStatus
                }))
            );

            try {
                const prompts = pendingPages.map(page => ({
                    pageId: page.id,
                    prompt: page.illustrationPrompt || ''
                }));

                const response = await fetch(`/api/story/${generatedStoryId}/generate-images`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompts })
                });

                if (!response.ok) throw new Error('Failed to generate images');

                const { results } = await response.json();

                // Update pages with generation results
                setStoryPages(pages => 
                    pages.map(page => {
                        const result = results.find((r: any) => r.pageId === page.id);
                        if (result) {
                            return {
                                ...page,
                                imageStatus: result.success ? 'completed' : 'error',
                                imageUrl: result.success ? result.imageUrl : page.imageUrl,
                                imageError: result.error
                            };
                        }
                        return page;
                    })
                );
            } catch (error) {
                console.error('Error generating images:', error);
                // Update all generating pages to error status
                setStoryPages(pages => 
                    pages.map(page => ({
                        ...page,
                        imageStatus: page.imageStatus === 'generating' ? 'error' : page.imageStatus,
                        imageError: 'Failed to generate image'
                    }))
                );
            }
        }

        generateImages();
    }, [generatedStoryId, storyPages, imageGenerationStarted]);

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
                    We couldn&apos;t find your story. Please try creating a new one.
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
                    {storyTitle}
                </h2>

                {/* Toggle buttons */}
                <div className="flex space-x-2 mb-4">
                    <button
                        onClick={() => setViewMode('image')}
                        className={`flex items-center px-4 py-2 rounded-lg ${
                            viewMode === 'image' 
                                ? 'bg-gray-800 text-white' 
                                : 'bg-gray-200 text-gray-700'
                        }`}
                    >
                        <Eye className="w-4 h-4 mr-2" />
                        View Image
                    </button>
                    <button
                        onClick={() => setViewMode('prompt')}
                        className={`flex items-center px-4 py-2 rounded-lg ${
                            viewMode === 'prompt' 
                                ? 'bg-gray-800 text-white' 
                                : 'bg-gray-200 text-gray-700'
                        }`}
                    >
                        <FileText className="w-4 h-4 mr-2" />
                        View Prompt
                    </button>
                </div>

                {/* Image/Prompt display area */}
                <div className="mb-4 rounded-lg overflow-hidden bg-gray-100 min-h-[400px] flex items-center justify-center">
                    {viewMode === 'image' ? (
                        <>
                            {currentStoryPage.imageStatus === 'generating' && (
                                <div className="text-center">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                                    <p className="text-gray-600">Generating image...</p>
                                    <p className="text-sm text-gray-500 mt-1">This may take up to 60 seconds</p>
                                </div>
                            )}
                            {currentStoryPage.imageStatus === 'pending' && (
                                <div className="text-center">
                                    <div className="h-8 w-8 border-2 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                    <p className="text-gray-600">Preparing to generate image...</p>
                                </div>
                            )}
                            {currentStoryPage.imageStatus === 'error' && (
                                <div className="text-center">
                                    <p className="text-red-600 mb-2">Failed to generate image</p>
                                    <p className="text-sm text-gray-500">{currentStoryPage.imageError}</p>
                                    <button 
                                        className="mt-4 px-4 py-2 bg-gray-800 text-white rounded-lg flex items-center mx-auto"
                                        onClick={() => {/* Implement retry logic */}}
                                    >
                                        <RefreshCw className="w-4 h-4 mr-2" />
                                        Retry
                                    </button>
                                </div>
                            )}
                            {currentStoryPage.imageStatus === 'completed' && currentStoryPage.imageUrl && (
                                <Image
                                    src={currentStoryPage.imageUrl}
                                    alt="Story illustration"
                                    width={400}
                                    height={600}
                                    className="w-full h-full object-cover"
                                />
                            )}
                        </>
                    ) : (
                        <div className="w-full p-6 overflow-auto">
                            <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
                                {currentStoryPage.illustrationPrompt || 'No prompt available'}
                            </pre>
                        </div>
                    )}
                </div>

                {/* Action buttons - only show when image is ready */}
                {viewMode === 'image' && currentStoryPage.imageStatus === 'completed' && (
                    <div className="flex space-x-2 mb-4">
                        <button className="text-sm px-4 py-1 bg-gray-200 rounded-full">
                            Re-roll
                        </button>
                        <button className="text-sm px-4 py-1 bg-gray-200 rounded-full">
                            Save to My World
                        </button>
                    </div>
                )}

                <p className="text-gray-800 mb-6">
                    {currentStoryPage.text}
                </p>

                {/* Navigation controls */}
                <div className="flex space-x-2 mt-auto pt-4">
                    <button 
                        className="px-6 py-2 bg-gray-200 rounded-lg"
                        onClick={() => {
                            if (currentPage > 0) {
                                setCurrentPage(current => current - 1);
                            }
                        }}
                        disabled={currentPage === 0}
                    >
                        Previous
                    </button>
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
