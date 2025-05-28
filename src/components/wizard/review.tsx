'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useStoryBuilder } from '@/lib/context/story-builder-context';
import { Loader2, RefreshCw, Eye, FileText, AlertCircle } from 'lucide-react';
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

const POLLING_INTERVAL = 3000; // 3 seconds
const MAX_POLLING_DURATION = 180000; // 3 minutes

export default function Review() {
    const [storyPages, setStoryPages] = useState<StoryPage[]>([]);
    const [storyTitle, setStoryTitle] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(0);
    const [viewMode, setViewMode] = useState<'image' | 'prompt'>('image');
    const [imageGenerationStarted, setImageGenerationStarted] = useState(false);
    const [isPolling, setIsPolling] = useState(false);
    const [pollingError, setPollingError] = useState<string | null>(null);
    const { generatedStoryId } = useStoryBuilder();
    const pollingStartTime = useRef<number | null>(null);
    const pollingInterval = useRef<NodeJS.Timeout | null>(null);

    // Cleanup polling on unmount
    useEffect(() => {
        return () => {
            if (pollingInterval.current) {
                clearInterval(pollingInterval.current);
            }
        };
    }, []);

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
                
                // Check if any pages need images
                const needsImages = pagesWithStatus.some((page: StoryPage) => 
                    page.imageStatus === 'pending'
                );
                
                if (needsImages && !imageGenerationStarted) {
                    // Start image generation
                    generateImages(pagesWithStatus);
                }
            } catch (error) {
                console.error('Error fetching story:', error);
                setPollingError('Failed to load story. Please refresh the page.');
            } finally {
                setIsLoading(false);
            }
        }

        fetchStory();
    }, [generatedStoryId]);

    // Generate images function
    async function generateImages(pages?: StoryPage[]) {
        const pagesToUse = pages || storyPages;
        const pendingPages = pagesToUse.filter(page => page.imageStatus === 'pending');
        
        if (pendingPages.length === 0) return;

        setImageGenerationStarted(true);
        setIsPolling(true);
        setPollingError(null);
        pollingStartTime.current = Date.now();
        
        // Update all pending pages to generating status
        setStoryPages(currentPages => 
            currentPages.map(page => ({
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

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to start image generation');
            }

            const result = await response.json();
            
            if (result.mode === 'development') {
                // In development mode, images are generated synchronously
                handleDevelopmentModeResults(result.results);
                return;
            }

            // Start polling for image status
            startPollingForImages();
        } catch (error) {
            console.error('Error starting image generation:', error);
            setPollingError(error instanceof Error ? error.message : 'Failed to generate images');
            
            // Update all generating pages to error status
            setStoryPages(pages => 
                pages.map(page => ({
                    ...page,
                    imageStatus: page.imageStatus === 'generating' ? 'error' : page.imageStatus,
                    imageError: 'Failed to generate image'
                }))
            );
            
            setIsPolling(false);
        }
    }

    // Handle development mode results (synchronous)
    function handleDevelopmentModeResults(results: any[]) {
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
        setIsPolling(false);
    }

    // Start polling for image generation status
    function startPollingForImages() {
        if (pollingInterval.current) {
            clearInterval(pollingInterval.current);
        }

        pollingInterval.current = setInterval(async () => {
            try {
                // Check if we've exceeded max polling duration
                if (pollingStartTime.current && 
                    Date.now() - pollingStartTime.current > MAX_POLLING_DURATION) {
                    stopPolling('Image generation is taking longer than expected');
                    return;
                }

                const response = await fetch(`/api/story/${generatedStoryId}/image-status`);
                
                if (!response.ok) {
                    throw new Error('Failed to check image status');
                }

                const status = await response.json();
                
                // Update page statuses
                setStoryPages(pages => 
                    pages.map(page => {
                        const pageStatus = status.pageStatuses.find(
                            (ps: any) => ps.pageId === page.id
                        );
                        
                        if (pageStatus && pageStatus.hasImage) {
                            return {
                                ...page,
                                imageStatus: 'completed',
                                imageUrl: pageStatus.imageUrl,
                            };
                        }
                        
                        return page;
                    })
                );

                // Stop polling if all images are generated
                if (status.allImagesGenerated) {
                    stopPolling();
                    
                    // Optional: Show a success message
                    console.log('All images generated successfully!');
                }
            } catch (error) {
                console.error('Error polling for image status:', error);
                // Don't stop polling on transient errors
            }
        }, POLLING_INTERVAL);
    }

    // Stop polling
    function stopPolling(error?: string) {
        if (pollingInterval.current) {
            clearInterval(pollingInterval.current);
            pollingInterval.current = null;
        }
        setIsPolling(false);
        if (error) {
            setPollingError(error);
        }
    }

    // Retry image generation for a specific page
    async function retryImageGeneration(pageId: string) {
        const page = storyPages.find(p => p.id === pageId);
        if (!page) return;

        setStoryPages(pages => 
            pages.map(p => 
                p.id === pageId 
                    ? { ...p, imageStatus: 'generating', imageError: undefined }
                    : p
            )
        );

        try {
            const response = await fetch(`/api/story/${generatedStoryId}/generate-images`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    prompts: [{
                        pageId,
                        prompt: page.illustrationPrompt || ''
                    }]
                })
            });

            if (!response.ok) throw new Error('Failed to retry image generation');

            // Start polling again
            startPollingForImages();
        } catch (error) {
            console.error('Error retrying image generation:', error);
            setStoryPages(pages => 
                pages.map(p => 
                    p.id === pageId 
                        ? { ...p, imageStatus: 'error', imageError: 'Failed to retry' }
                        : p
                )
            );
        }
    }

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

    // Calculate overall progress
    const totalPages = storyPages.length;
    const completedPages = storyPages.filter(p => p.imageStatus === 'completed').length;
    const progressPercentage = totalPages > 0 ? (completedPages / totalPages) * 100 : 0;

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

                {/* Overall progress indicator */}
                {isPolling && (
                    <div className="mb-4 bg-blue-50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-blue-700">
                                Generating images... {completedPages}/{totalPages} completed
                            </span>
                            <span className="text-sm text-blue-600">
                                {Math.round(progressPercentage)}%
                            </span>
                        </div>
                        <div className="w-full bg-blue-200 rounded-full h-2">
                            <div 
                                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${progressPercentage}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Error message */}
                {pollingError && (
                    <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start">
                        <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-sm text-red-800">{pollingError}</p>
                        </div>
                    </div>
                )}

                {/* Toggle buttons */}
                <div className="flex space-x-2 mb-4">
                    <button
                        onClick={() => setViewMode('image')}
                        className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                            viewMode === 'image' 
                                ? 'bg-gray-800 text-white' 
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                    >
                        <Eye className="w-4 h-4 mr-2" />
                        View Image
                    </button>
                    <button
                        onClick={() => setViewMode('prompt')}
                        className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                            viewMode === 'prompt' 
                                ? 'bg-gray-800 text-white' 
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
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
                                    <p className="text-sm text-gray-500 mt-1">This may take up to 2 minutes</p>
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
                                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
                                    <p className="text-red-600 mb-2">Failed to generate image</p>
                                    <p className="text-sm text-gray-500 mb-4">
                                        {currentStoryPage.imageError || 'An unexpected error occurred'}
                                    </p>
                                    <button 
                                        className="px-4 py-2 bg-gray-800 text-white rounded-lg flex items-center mx-auto hover:bg-gray-700 transition-colors"
                                        onClick={() => retryImageGeneration(currentStoryPage.id)}
                                    >
                                        <RefreshCw className="w-4 h-4 mr-2" />
                                        Retry
                                    </button>
                                </div>
                            )}
                            {currentStoryPage.imageStatus === 'completed' && currentStoryPage.imageUrl && (
                                <div className="relative w-full h-full">
                                    <Image
                                        src={currentStoryPage.imageUrl}
                                        alt="Story illustration"
                                        fill
                                        className="object-contain"
                                        sizes="(max-width: 768px) 100vw, 50vw"
                                        priority={currentPage === 0}
                                    />
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="w-full p-6 overflow-auto max-h-[600px]">
                            <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
                                {currentStoryPage.illustrationPrompt || 'No prompt available'}
                            </pre>
                        </div>
                    )}
                </div>

                {/* Action buttons - only show when image is ready */}
                {viewMode === 'image' && currentStoryPage.imageStatus === 'completed' && (
                    <div className="flex space-x-2 mb-4">
                        <button className="text-sm px-4 py-1 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors">
                            Re-roll
                        </button>
                        <button className="text-sm px-4 py-1 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors">
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
                        className="px-6 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => {
                            if (currentPage > 0) {
                                setCurrentPage(current => current - 1);
                            }
                        }}
                        disabled={currentPage === 0}
                    >
                        Previous
                    </button>
                    <button className="px-6 py-2 bg-gray-200 rounded-lg flex-1 hover:bg-gray-300 transition-colors">
                        Edit
                    </button>
                    <button className="px-6 py-2 bg-gray-200 rounded-lg flex-1 hover:bg-gray-300 transition-colors">
                        Remix
                    </button>
                    <button
                        onClick={() => {
                            if (currentPage < storyPages.length - 1) {
                                setCurrentPage(current => current + 1);
                            } else {
                                // Navigate to story view page
                                window.location.href = `/story/${generatedStoryId}`;
                            }
                        }}
                        className="px-6 py-2 bg-[#212121] text-white rounded-lg flex-1 hover:bg-gray-800 transition-colors"
                        disabled={currentPage === storyPages.length - 1 && completedPages < totalPages}
                    >
                        {currentPage === storyPages.length - 1 ? "View Story" : "Next"}
                    </button>
                </div>
            </div>
        </div>
    );
}