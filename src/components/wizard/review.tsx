'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useOnboarding } from '@/lib/context/onboarding-provider';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Loader2, 
    RefreshCw, 
    Eye, 
    FileText, 
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    Sparkles,
    Download,
    Edit3,
    Shuffle
} from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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

const POLLING_INTERVAL = 2000; // 2 seconds for faster updates
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
    const { generatedStoryId, goToNextStep } = useOnboarding();
    const pollingStartTime = useRef<number | null>(null);
    const pollingInterval = useRef<NodeJS.Timeout | null>(null);
    const generationStartedRef = useRef(false);

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
                console.log('Fetched story data:', data);
                
                // Set story title
                setStoryTitle(data.title || 'Untitled Story');
                
                // Initialize pages with image status - fix the image URL mapping
                const pagesWithStatus = (data.pages || []).map((page: any) => {
                    const imageUrl = page.chosenImage?.secureUrl || page.imageUrl || null;
                    console.log(`Page ${page.id} image URL:`, imageUrl);
                    
                    return {
                        ...page,
                        imageUrl: imageUrl,
                        illustrationPrompt: page.illustrationPrompt || page.imagePrompt || '',
                        imageStatus: imageUrl ? 'completed' as ImageGenerationStatus : 'pending' as ImageGenerationStatus,
                    };
                });
                
                setStoryPages(pagesWithStatus);
                
                // Check if any pages need images
                const needsImages = pagesWithStatus.some((page: StoryPage) => 
                    page.imageStatus === 'pending'
                );
                
                if (needsImages && !imageGenerationStarted && !generationStartedRef.current) {
                    generationStartedRef.current = true;
                    // Start generation immediately with smooth transition
                    setTimeout(() => {
                        generateImages(pagesWithStatus);
                    }, 500);
                }
            } catch (error) {
                console.error('Error fetching story:', error);
                toast.error('Failed to load story', {
                    description: 'Please refresh the page to try again.'
                });
            } finally {
                setIsLoading(false);
            }
        }

        fetchStory();
    }, [generatedStoryId, imageGenerationStarted]);

    // Generate images function
    async function generateImages(pages?: StoryPage[]) {
        const pagesToUse = pages || storyPages;
        const pendingPages = pagesToUse.filter(page => page.imageStatus === 'pending');
        
        if (pendingPages.length === 0) {
            console.log('No pending pages to generate');
            return;
        }

        setImageGenerationStarted(true);
        setPollingError(null);
        
        // Update all pending pages to generating status
        setStoryPages(currentPages => 
            currentPages.map(page => ({
                ...page,
                imageStatus: page.imageStatus === 'pending' ? 'generating' as ImageGenerationStatus : page.imageStatus
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
                handleDevelopmentModeResults(result.results);
                return;
            }

            // Start polling
            setIsPolling(true);
            pollingStartTime.current = Date.now();
            startPollingForImages();
            
        } catch (error) {
            console.error('Error starting image generation:', error);
            toast.error('Failed to generate images', {
                description: error instanceof Error ? error.message : 'Please try again'
            });
            
            // Update all generating pages to error status
            setStoryPages(pages => 
                pages.map(page => ({
                    ...page,
                    imageStatus: page.imageStatus === 'generating' ? 'error' as ImageGenerationStatus : page.imageStatus,
                    imageError: 'Failed to generate image'
                }))
            );
            
            setIsPolling(false);
        }
    }

    // Handle development mode results
    function handleDevelopmentModeResults(results: any[]) {
        setStoryPages(pages => 
            pages.map(page => {
                const result = results.find((r: any) => r.pageId === page.id);
                if (result) {
                    return {
                        ...page,
                        imageStatus: (result.success ? 'completed' : 'error') as ImageGenerationStatus,
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
                console.log('Polling status:', status);
                
                // Update page statuses
                setStoryPages(pages => {
                    const updatedPages = pages.map(page => {
                        const pageStatus = status.pageStatuses?.find(
                            (ps: any) => ps.pageId === page.id
                        );
                        
                        if (pageStatus && pageStatus.hasImage && pageStatus.imageUrl) {
                            console.log(`Page ${page.id} now has image:`, pageStatus.imageUrl);
                            return {
                                ...page,
                                imageStatus: 'completed' as ImageGenerationStatus,
                                imageUrl: pageStatus.imageUrl,
                            };
                        }
                        
                        return page;
                    });

                    // Check if all pages are completed
                    const allCompleted = updatedPages.every(page => page.imageStatus === 'completed');
                    const hasGeneratingPages = updatedPages.some(page => page.imageStatus === 'generating');
                    
                    if (allCompleted && !hasGeneratingPages) {
                        stopPolling();
                        toast.success('All images generated successfully!', {
                            description: 'Your story is ready to view'
                        });
                    }

                    return updatedPages;
                });
            } catch (error) {
                console.error('Error polling for image status:', error);
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

        setPollingError(null);

        setStoryPages(pages => 
            pages.map(p => 
                p.id === pageId 
                    ? { ...p, imageStatus: 'generating' as ImageGenerationStatus, imageError: undefined }
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

            const result = await response.json();
            
            if (result.mode === 'development') {
                handleDevelopmentModeResults(result.results);
                return;
            }

            // Start polling again
            if (!isPolling) {
                setIsPolling(true);
                pollingStartTime.current = Date.now();
                startPollingForImages();
            }
        } catch (error) {
            console.error('Error retrying image generation:', error);
            setStoryPages(pages => 
                pages.map(p => 
                    p.id === pageId 
                        ? { ...p, imageStatus: 'error' as ImageGenerationStatus, imageError: 'Failed to retry' }
                        : p
                )
            );
            toast.error('Failed to retry image generation');
        }
    }

    // Re-roll (generate new variant) for a page
    async function rerollImage(pageId: string) {
        const page = storyPages.find(p => p.id === pageId);
        if (!page) return;

        // Show loading state
        toast.info('Generating new image variant...', {
            duration: 2000,
        });

        // Set page to generating state
        setStoryPages(pages => 
            pages.map(p => 
                p.id === pageId 
                    ? { ...p, imageStatus: 'generating' as ImageGenerationStatus }
                    : p
            )
        );

        try {
            // Call the generate-images endpoint again for this page
            const response = await fetch(`/api/story/${generatedStoryId}/generate-images`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    prompts: [{
                        pageId,
                        prompt: page.illustrationPrompt || ''
                    }],
                    reroll: true // Flag to indicate this is a re-roll
                })
            });

            if (!response.ok) throw new Error('Failed to generate new variant');

            const result = await response.json();
            
            if (result.mode === 'development') {
                handleDevelopmentModeResults(result.results);
                toast.success('New image variant created!');
                return;
            }

            // Start polling
            if (!isPolling) {
                setIsPolling(true);
                pollingStartTime.current = Date.now();
                startPollingForImages();
            }
            
            toast.success('Generating new image variant...');
        } catch (error) {
            console.error('Error re-rolling image:', error);
            // Revert to completed state with original image
            setStoryPages(pages => 
                pages.map(p => 
                    p.id === pageId 
                        ? { ...p, imageStatus: 'completed' as ImageGenerationStatus }
                        : p
                )
            );
            toast.error('Failed to generate new variant');
        }
    }

    // Save image to My World
    async function saveImageToMyWorld(pageId: string) {
        const page = storyPages.find(p => p.id === pageId);
        if (!page || !page.imageUrl) return;

        try {
            toast.info('Saving to My World...', {
                duration: 2000,
            });

            const response = await fetch('/api/my-world/save-from-story', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageUrl: page.imageUrl,
                    name: `${storyTitle} - Page ${page.index + 1}`,
                    description: page.text,
                    category: 'LOCATION', // Default to location for story images
                    storyId: generatedStoryId,
                    pageId: pageId,
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to save image');
            }

            const result = await response.json();
            toast.success('Image saved to My World!', {
                description: 'You can find it in your My World collection.',
                action: {
                    label: 'View',
                    onClick: () => window.location.href = '/my-world',
                },
            });
        } catch (error) {
            console.error('Error saving to My World:', error);
            toast.error('Failed to save image', {
                description: error instanceof Error ? error.message : 'Please try again',
            });
        }
    }

    // Get current page
    const currentStoryPage = storyPages[currentPage];

    // Calculate progress
    const totalPages = storyPages.length;
    const completedPages = storyPages.filter(p => p.imageStatus === 'completed').length;
    const progressPercentage = totalPages > 0 ? (completedPages / totalPages) * 100 : 0;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center"
                >
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-lg font-medium">Loading your story...</p>
                </motion.div>
            </div>
        );
    }

    if (!currentStoryPage) {
        return (
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center h-full px-4 text-center"
            >
                <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
                <h2 className="text-2xl font-bold mb-2">Story not found</h2>
                <p className="text-gray-600 mb-6">
                    We couldn't find your story. Please try creating a new one.
                </p>
                <Button onClick={() => window.location.href = '/onboarding'}>
                    Create New Story
                </Button>
            </motion.div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-gradient-to-b from-gray-50 to-white">
            {/* Header with progress */}
            <div className="bg-white shadow-sm border-b sticky top-0 z-10">
                <div className="px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                        <Badge variant="secondary" className="text-xs">
                            Page {currentPage + 1} of {storyPages.length}
                        </Badge>
                        <Progress value={progressPercentage} className="w-32 h-2" />
                    </div>
                </div>
            </div>

            {/* Main content area */}
            <div className="flex-1 overflow-y-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="px-4 py-6 max-w-4xl mx-auto w-full"
                >
                    {/* Title section */}
                    <div className="mb-6">
                        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                            Review & Edit Your Story
                        </h1>
                        <h2 className="text-xl font-medium text-gray-800">{storyTitle}</h2>
                    </div>

                    {/* Progress indicator */}
                    <AnimatePresence>
                        {isPolling && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mb-6"
                            >
                                <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <Sparkles className="w-5 h-5 text-blue-600 animate-pulse" />
                                                <span className="text-sm font-medium text-blue-700">
                                                    Generating magical illustrations...
                                                </span>
                                            </div>
                                            <Badge variant="outline" className="text-xs">
                                                {completedPages}/{totalPages} completed
                                            </Badge>
                                        </div>
                                        <Progress value={progressPercentage} className="h-3" />
                                        <p className="text-xs text-blue-600 mt-2">
                                            Creating up to 5 images simultaneously for faster processing
                                        </p>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Error alert */}
                    <AnimatePresence>
                        {pollingError && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="mb-6"
                            >
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>{pollingError}</AlertDescription>
                                </Alert>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* View mode tabs */}
                    <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'image' | 'prompt')} className="mb-6">
                        <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
                            <TabsTrigger value="image" className="flex items-center gap-2 cursor-pointer">
                                <Eye className="w-4 h-4" />
                                View Image
                            </TabsTrigger>
                            <TabsTrigger value="prompt" className="flex items-center gap-2 cursor-pointer">
                                <FileText className="w-4 h-4" />
                                View Prompt
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="image" className="mt-6">
                            <Card className="overflow-hidden">
                                <CardContent className="p-0">
                                    <div className="aspect-[2/3] bg-gradient-to-br from-gray-100 to-gray-50 relative">
                                        <AnimatePresence mode="wait">
                                            {currentStoryPage.imageStatus === 'generating' && (
                                                <motion.div
                                                    key="generating"
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    className="absolute inset-0 flex items-center justify-center"
                                                >
                                                    <div className="text-center">
                                                        <div className="relative">
                                                            <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto mb-4" />
                                                            <Sparkles className="absolute top-0 right-0 w-6 h-6 text-yellow-500 animate-pulse" />
                                                        </div>
                                                        <p className="text-lg font-medium mb-1">Creating your illustration...</p>
                                                        <p className="text-sm text-gray-500">This may take up to 2 minutes</p>
                                                    </div>
                                                </motion.div>
                                            )}
                                            
                                            {currentStoryPage.imageStatus === 'pending' && (
                                                <motion.div
                                                    key="pending"
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    className="absolute inset-0 flex items-center justify-center"
                                                >
                                                    <div className="text-center">
                                                        <div className="h-16 w-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
                                                        <p className="text-lg font-medium">Preparing to generate...</p>
                                                    </div>
                                                </motion.div>
                                            )}

                                            {currentStoryPage.imageStatus === 'error' && (
                                                <motion.div
                                                    key="error"
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    className="absolute inset-0 flex items-center justify-center p-8"
                                                >
                                                    <div className="text-center">
                                                        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                                                        <p className="text-lg font-medium text-red-600 mb-2">
                                                            Generation failed
                                                        </p>
                                                        <p className="text-sm text-gray-500 mb-4">
                                                            {currentStoryPage.imageError || 'An unexpected error occurred'}
                                                        </p>
                                                        <Button 
                                                            onClick={() => retryImageGeneration(currentStoryPage.id)}
                                                            className="mx-auto cursor-pointer"
                                                        >
                                                            <RefreshCw className="w-4 h-4 mr-2" />
                                                            Retry Generation
                                                        </Button>
                                                    </div>
                                                </motion.div>
                                            )}

                                            {currentStoryPage.imageStatus === 'completed' && currentStoryPage.imageUrl && (
                                                <motion.div
                                                    key="completed"
                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.95 }}
                                                    className="absolute inset-0"
                                                >
                                                    <Image
                                                        src={currentStoryPage.imageUrl}
                                                        alt={`Page ${currentPage + 1} illustration`}
                                                        fill
                                                        className="object-cover"
                                                        sizes="(max-width: 768px) 100vw, 50vw"
                                                        priority={currentPage === 0}
                                                        onError={(e) => {
                                                            console.error('Image failed to load:', currentStoryPage.imageUrl);
                                                            // You could set an error state here if needed
                                                        }}
                                                    />
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Action buttons for completed images */}
                            <AnimatePresence>
                                {currentStoryPage.imageStatus === 'completed' && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="flex gap-2 mt-4 justify-center"
                                    >
                                        <Button 
                                            variant="outline" 
                                            size="sm"
                                            onClick={() => rerollImage(currentStoryPage.id)}
                                            className="hover:scale-105 transition-transform cursor-pointer"
                                        >
                                            <Shuffle className="w-4 h-4 mr-2" />
                                            Re-roll
                                        </Button>
                                        <Button 
                                            variant="outline" 
                                            size="sm"
                                            onClick={() => saveImageToMyWorld(currentStoryPage.id)}
                                            className="hover:scale-105 transition-transform cursor-pointer"
                                        >
                                            <Download className="w-4 h-4 mr-2" />
                                            Save to My World
                                        </Button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </TabsContent>

                        <TabsContent value="prompt" className="mt-6">
                            <Card>
                                <CardContent className="p-6">
                                    <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono max-h-[600px] overflow-auto">
                                        {currentStoryPage.illustrationPrompt || 'No prompt available'}
                                    </pre>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>

                    {/* Story text */}
                    <Card className="mb-6">
                        <CardContent className="p-6">
                            <p className="text-lg leading-relaxed text-gray-800">
                                {currentStoryPage.text}
                            </p>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            {/* Navigation footer */}
            <div className="sticky bottom-0 bg-white border-t shadow-lg">
                <div className="px-4 py-4 max-w-4xl mx-auto">
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setCurrentPage(current => Math.max(0, current - 1))}
                            disabled={currentPage === 0}
                            className="hover:scale-105 transition-transform cursor-pointer"
                        >
                            <ChevronLeft className="w-4 h-4 mr-1" />
                            Previous
                        </Button>
                        
                        <Button 
                            variant="outline" 
                            className="flex-1 hover:scale-105 transition-transform cursor-pointer"
                        >
                            <Edit3 className="w-4 h-4 mr-2" />
                            Edit
                        </Button>
                        
                        <Button 
                            variant="outline" 
                            className="flex-1 hover:scale-105 transition-transform cursor-pointer"
                        >
                            <Shuffle className="w-4 h-4 mr-2" />
                            Remix
                        </Button>
                        
                        <Button
                            onClick={() => {
                                if (currentPage < storyPages.length - 1) {
                                    setCurrentPage(current => current + 1);
                                } else {
                                    // All pages reviewed, go to next step
                                    goToNextStep();
                                }
                            }}
                            disabled={currentPage === storyPages.length - 1 && completedPages < totalPages}
                            className={cn(
                                "hover:scale-105 transition-transform cursor-pointer",
                                currentPage === storyPages.length - 1 
                                    ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700" 
                                    : ""
                            )}
                        >
                            {currentPage === storyPages.length - 1 ? (
                                <>
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    Finish Review
                                </>
                            ) : (
                                <>
                                    Next
                                    <ChevronRight className="w-4 h-4 ml-1" />
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}