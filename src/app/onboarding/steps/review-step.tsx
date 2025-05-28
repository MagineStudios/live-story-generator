'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { useOnboarding } from '@/lib/context/onboarding-provider';
import { Button } from '@/components/ui/button';
import { SpeechBubble } from './speech-bubble';
import { Loader2, Book, FileText, Image as ImageIcon, AlertCircle, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface StoryPage {
    id: string;
    text: string;
    index: number;
    microprompts: string[];
    illustrationPrompt: string | null;
    imagePrompt: string | null;
    chosenImageId: string | null;
    chosenImage?: {
        id: string;
        secureUrl: string;
        publicId: string;
        width: number;
        height: number;
    } | null;
}

interface StoryData {
    id: string;
    title: string;
    summary: string;
    theme: string;
    pages: StoryPage[];
}

export function ReviewStep() {
    const { generatedStoryId, goToNextStep, visualStyle, tone, selectedElements, resetOnboarding } = useOnboarding();
    const [storyData, setStoryData] = useState<StoryData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showPrompts, setShowPrompts] = useState(false); // Start with prompts hidden
    const [isGeneratingImages, setIsGeneratingImages] = useState(false);
    const [imageGenerationProgress, setImageGenerationProgress] = useState(0);
    const [pageImageStatus, setPageImageStatus] = useState<Record<string, 'pending' | 'generating' | 'complete' | 'error'>>({});
    const [hasStartedGeneration, setHasStartedGeneration] = useState(false);

    // Debug log on mount
    useEffect(() => {
        console.log('ReviewStep mounted with generatedStoryId:', generatedStoryId);
        console.log('Current URL:', window.location.href);
        
        // Check if we're somehow jumping past this step
        const checkCurrentStep = () => {
            const urlParams = new URLSearchParams(window.location.search);
            const stepParam = urlParams.get('step');
            console.log('Current step from URL:', stepParam);
        };
        
        checkCurrentStep();
        
        // Check again after a short delay
        setTimeout(checkCurrentStep, 100);
    }, []);

    // Move generateImages outside of useCallback to avoid dependency issues
    const generateImagesFunc = async (story: StoryData) => {
        console.log('generateImages called with story:', {
            id: story.id,
            pageCount: story.pages.length,
            pagesNeedingImages: story.pages.filter(p => !p.chosenImage).length
        });
        
        setIsGeneratingImages(true);
        setImageGenerationProgress(0);

        try {
            // Prepare prompts for pages that don't have images
            const prompts = story.pages
                .filter(page => !page.chosenImage && page.illustrationPrompt)
                .map(page => ({
                    pageId: page.id,
                    prompt: page.illustrationPrompt
                }));

            if (prompts.length === 0) {
                console.log('No prompts to generate - all pages have images or no illustration prompts');
                setIsGeneratingImages(false);
                return;
            }

            console.log('Generating images for prompts:', prompts);

            toast.info('Starting to generate illustrations...', {
                description: `Creating ${prompts.length} images for your story`
            });

            // Update status to generating for all pages that need images
            setPageImageStatus(prev => {
                const newStatus = { ...prev };
                prompts.forEach(({ pageId }) => {
                    newStatus[pageId] = 'generating';
                });
                return newStatus;
            });

            // Generate all images at once (parallel)
            console.log('Sending all prompts for parallel generation:', prompts);
            
            try {
                const response = await fetch(`/api/story/${generatedStoryId}/generate-images`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ prompts }), // Send all prompts at once
                });

                const responseText = await response.text();
                console.log('Batch image generation response:', response.status, responseText);

                if (!response.ok) {
                    let errorData;
                    try {
                        errorData = JSON.parse(responseText);
                    } catch {
                        errorData = { error: responseText };
                    }
                    console.error('Image generation failed:', errorData);
                    throw new Error(errorData.error || 'Failed to generate images');
                }

                const result = JSON.parse(responseText);
                
                if (result.success) {
                    // Update page statuses based on results
                    result.results.forEach((res: any) => {
                        setPageImageStatus(prev => ({
                            ...prev,
                            [res.pageId]: res.success ? 'complete' : 'error'
                        }));
                    });
                    
                    const successCount = result.results.filter((r: any) => r.success).length;
                    
                    // Track progress during generation by polling
                    let progressInterval: ReturnType<typeof setInterval> | null = null;
                    if (successCount < prompts.length) {
                        progressInterval = setInterval(async () => {
                            try {
                                const statusRes = await fetch(`/api/story/${generatedStoryId}`);
                                if (statusRes.ok) {
                                    const statusData = await statusRes.json();
                                    const completedPages = statusData.pages.filter((p: StoryPage) => p.chosenImage).length;
                                    const progress = (completedPages / statusData.pages.length) * 100;
                                    setImageGenerationProgress(progress);
                                    
                                    if (completedPages === statusData.pages.length || progress >= 100) {
                                        if (progressInterval) clearInterval(progressInterval);
                                    }
                                }
                            } catch (e) {
                                console.error('Error polling progress:', e);
                            }
                        }, 2000);
                        
                        // Clear interval after 2 minutes max
                        setTimeout(() => {
                            if (progressInterval) clearInterval(progressInterval);
                        }, 120000);
                    }
                    
                    setImageGenerationProgress(100);
                    
                    if (successCount === prompts.length) {
                        toast.success('All images generated successfully!');
                    } else {
                        toast.warning(`Generated ${successCount} of ${prompts.length} images`);
                    }
                    
                    // Refresh story data to get the new images
                    const res = await fetch(`/api/story/${generatedStoryId}`);
                    if (res.ok) {
                        const updatedData = await res.json();
                        setStoryData(updatedData);
                    }
                } else {
                    // Mark all as error
                    prompts.forEach(({ pageId }) => {
                        setPageImageStatus(prev => ({ ...prev, [pageId]: 'error' }));
                    });
                    throw new Error('Failed to generate images');
                }
            } catch (err) {
                console.error('Error in batch generation:', err);
                // Mark all as error
                prompts.forEach(({ pageId }) => {
                    setPageImageStatus(prev => ({ ...prev, [pageId]: 'error' }));
                });
                throw err;
            }
        } catch (err) {
            console.error("Error generating images:", err);
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            
            // Check if it's an API key issue
            if (errorMessage.includes('API key') || errorMessage.includes('Unauthorized') || errorMessage.includes('401')) {
                toast.error('Image generation unavailable', {
                    description: 'OpenAI API key is invalid or missing. Please check your configuration.',
                    duration: 5000
                });
            } else {
                toast.error('Failed to generate images', {
                    description: errorMessage
                });
            }
        } finally {
            setIsGeneratingImages(false);
            setImageGenerationProgress(100);
        }
    };
    
    // Memoize it as generateImages
    const generateImages = useCallback(generateImagesFunc, [generatedStoryId]);

    // Fetch story data
    useEffect(() => {
        if (!generatedStoryId) {
            console.error("No story ID provided to ReviewStep");
            setError("Story ID is missing. Please try again.");
            setIsLoading(false);
            return;
        }

        const fetchStoryData = async () => {
            try {
                setIsLoading(true);
                console.log('Fetching story data for ID:', generatedStoryId);
                
                const res = await fetch(`/api/story/${generatedStoryId}`);
                console.log('Story fetch response:', res.status, res.statusText);

                if (!res.ok) {
                    const errorText = await res.text();
                    console.error('Story fetch error:', errorText);
                    throw new Error(`Failed to load story: ${res.status} ${res.statusText}`);
                }

                const data = await res.json();
                console.log('Fetched story data:', {
                    id: data.id,
                    title: data.title,
                    pageCount: data.pages?.length,
                    pagesWithImages: data.pages?.filter((p: StoryPage) => !!p.chosenImage).length,
                    pagesNeedingImages: data.pages?.filter((p: StoryPage) => !p.chosenImage).length
                });
                setStoryData(data);
                
                // Initialize page status
                const statusMap: Record<string, 'pending' | 'generating' | 'complete' | 'error'> = {};
                data.pages.forEach((page: StoryPage) => {
                    statusMap[page.id] = page.chosenImage ? 'complete' : 'pending';
                });
                setPageImageStatus(statusMap);
                
                // Don't auto-generate images - let user see the story first
            } catch (err) {
                console.error("Error loading story:", err);
                setError(err instanceof Error ? err.message : "Failed to load your story. Please try again.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchStoryData();
    }, [generatedStoryId]);

    // Auto-start image generation after story loads
    useEffect(() => {
        console.log('Auto-generation effect:', {
            hasStoryData: !!storyData,
            hasStartedGeneration,
            pages: storyData?.pages?.length,
            pagesWithoutImages: storyData?.pages?.filter(p => !p.chosenImage).length,
            isLoading
        });

        // Only proceed if story is loaded and we haven't started generation
        if (storyData && !hasStartedGeneration && !isLoading) {
            const pagesNeedingImages = storyData.pages.filter(page => !page.chosenImage);
            const needsImages = pagesNeedingImages.length > 0;

            console.log('Needs images:', needsImages, 'Count:', pagesNeedingImages.length);

            if (needsImages) {
                console.log('Will auto-generate images in 1.5 seconds...');
                setHasStartedGeneration(true);

                // Start generation after a short delay so user can see the story first
                const timer = setTimeout(() => {
                    console.log('Auto-generating images now!');
                    generateImages(storyData);
                }, 1500);

                return () => {
                    console.log('Clearing auto-generation timer');
                    clearTimeout(timer);
                };
            } else {
                console.log('No images needed - all pages have images');
            }
        }
    }, [storyData, hasStartedGeneration, isLoading]); // Remove generateImages from deps to avoid re-runs

    // Manually trigger image generation
    const handleGenerateImages = useCallback(() => {
        if (storyData) {
            setHasStartedGeneration(true);
            generateImages(storyData);
        }
    }, [storyData, generateImages]);

    return (
        <div className="flex flex-col px-6 pb-8 justify-center">
            <div className="mb-6">
                <SpeechBubble
                    message={
                        isLoading 
                            ? "Loading your story..."
                            : error
                            ? "There was a problem loading your story."
                            : isGeneratingImages 
                            ? "Creating beautiful illustrations for your story..." 
                            : storyData && !storyData.pages.every(p => p.chosenImage)
                            ? "Your story is ready! I'll start creating the illustrations in just a moment..."
                            : "Your story is ready! Review the story and images."
                    }
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
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowPrompts(!showPrompts)}
                                    className="text-xs"
                                >
                                    {showPrompts ? 'Hide' : 'Show'} Prompts
                                </Button>
                                {storyData.pages.some(p => !p.chosenImage) && (
                                    <div className="flex flex-col items-end gap-1">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleGenerateImages}
                                            disabled={isGeneratingImages}
                                            className="text-xs"
                                        >
                                            {isGeneratingImages ? (
                                                <>
                                                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                                    Generating...
                                                </>
                                            ) : (
                                                <>
                                                    <ImageIcon className="w-3 h-3 mr-1" />
                                                    Generate Images
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Image generation progress or status */}
                        {isGeneratingImages && (
                            <div className="mb-4">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-sm font-medium text-gray-700">Generating illustrations</p>
                                    <span className="text-sm text-[#4CAF50] font-medium">
                                        {Math.round(imageGenerationProgress)}%
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <motion.div
                                        className="bg-[#4CAF50] h-2 rounded-full transition-all duration-500"
                                        initial={{ width: "0%" }}
                                        animate={{ width: `${imageGenerationProgress}%` }}
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    {Object.values(pageImageStatus).filter(s => s === 'complete').length} of{' '}
                                    {Object.values(pageImageStatus).filter(s => s !== 'complete').length + Object.values(pageImageStatus).filter(s => s === 'complete').length} images complete
                                </p>
                            </div>
                        )}
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

                                {/* Image or placeholder */}
                                {page.chosenImage ? (
                                    <div className="mt-4">
                                        <img
                                            src={page.chosenImage.secureUrl}
                                            alt={`Page ${index + 1} illustration`}
                                            className="w-full rounded-lg shadow-md"
                                            loading="lazy"
                                        />
                                    </div>
                                ) : (
                                    <div className="mt-4 aspect-[2/3] bg-gray-200 rounded-lg flex items-center justify-center">
                                        <div className="text-center">
                                            {pageImageStatus[page.id] === 'generating' ? (
                                                <>
                                                    <div className="relative">
                                                        <Loader2 className="w-12 h-12 text-[#4CAF50] mx-auto mb-2 animate-spin" />
                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                            <div className="w-16 h-16 rounded-full bg-[#4CAF50]/20 animate-pulse" />
                                                        </div>
                                                    </div>
                                                    <p className="text-sm text-gray-600 font-medium">Creating illustration...</p>
                                                    <p className="text-xs text-gray-500 mt-1">This may take a moment</p>
                                                </>
                                            ) : pageImageStatus[page.id] === 'error' ? (
                                                <>
                                                    <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                                                    <p className="text-sm text-red-500">Failed to generate image</p>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            // Retry only this specific page
                                                            if (storyData && page.illustrationPrompt) {
                                                                setPageImageStatus(prev => ({ ...prev, [page.id]: 'generating' }));
                                                                fetch(`/api/story/${generatedStoryId}/generate-images`, {
                                                                    method: 'POST',
                                                                    headers: { 'Content-Type': 'application/json' },
                                                                    body: JSON.stringify({ 
                                                                        prompts: [{ pageId: page.id, prompt: page.illustrationPrompt }] 
                                                                    }),
                                                                }).then(async (response) => {
                                                                    if (response.ok) {
                                                                        setPageImageStatus(prev => ({ ...prev, [page.id]: 'complete' }));
                                                                        // Refresh story data
                                                                        const res = await fetch(`/api/story/${generatedStoryId}`);
                                                                        if (res.ok) {
                                                                            const updatedData = await res.json();
                                                                            setStoryData(updatedData);
                                                                        }
                                                                    } else {
                                                                        setPageImageStatus(prev => ({ ...prev, [page.id]: 'error' }));
                                                                    }
                                                                }).catch(() => {
                                                                    setPageImageStatus(prev => ({ ...prev, [page.id]: 'error' }));
                                                                });
                                                            }
                                                        }}
                                                        className="mt-2 text-xs"
                                                    >
                                                        Retry
                                                    </Button>
                                                </>
                                            ) : isGeneratingImages && pageImageStatus[page.id] === 'pending' ? (
                                                <>
                                                    <Book className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                                    <p className="text-sm text-gray-500">Waiting in queue...</p>
                                                </>
                                            ) : (
                                                <>
                                                    <Book className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                                    <p className="text-sm text-gray-500">Image will be generated here</p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Illustration prompt (if showing prompts) */}
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
                    disabled={isLoading || isGeneratingImages}
                    className="w-full py-6 text-lg font-medium rounded-full bg-[#4CAF50] hover:bg-[#43a047] text-white cursor-pointer shadow-md hover:shadow-lg transition-all duration-300"
                >
                    {isGeneratingImages ? 'Generating Images...' : 'Continue'}
                </Button>
                
                {/* Info message if no images */}
                {!isLoading && !isGeneratingImages && storyData && storyData.pages.some(p => !p.chosenImage) && (
                    <p className="text-xs text-center text-gray-500 mt-2">
                        You can continue without images or generate them later
                    </p>
                )}
                
                {/* Generate New Story option */}
                {!isLoading && !isGeneratingImages && storyData && (
                    <div className="mt-4 text-center">
                        <p className="text-sm text-gray-500 mb-2">Not happy with the story?</p>
                        <Button
                            variant="ghost"
                            onClick={() => {
                                if (confirm('Are you sure you want to start over? This will reset all your choices.')) {
                                    resetOnboarding();
                                }
                            }}
                            className="text-[#4CAF50] hover:text-[#43a047] underline"
                        >
                            Generate a new story
                        </Button>
                    </div>
                )}
            </motion.div>
        </div>
    );
}