'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useOnboarding } from '@/lib/context/onboarding-provider';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Loader2, 
    RefreshCw, 
    FileText, 
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    Sparkles,
    Download,
    Shuffle,
    Image as ImageIcon,
    Zap,
    CheckCircle
} from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { SpeechBubble } from '@/app/onboarding/steps/speech-bubble';

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
    const [imageGenerationStarted, setImageGenerationStarted] = useState(false);
    const [isPolling, setIsPolling] = useState(false);
    const [pollingError, setPollingError] = useState<string | null>(null);
    const [displayedText, setDisplayedText] = useState('');
    const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
    const { generatedStoryId, goToNextStep } = useOnboarding();
    const pollingStartTime = useRef<number | null>(null);
    const pollingInterval = useRef<NodeJS.Timeout | null>(null);
    const generationStartedRef = useRef(false);
    const animationRef = useRef<NodeJS.Timeout | null>(null);

    // Animate text helper
    const animateText = (text: string) => {
        if (animationRef.current) clearInterval(animationRef.current);
        setDisplayedText('');
        let idx = 0;
        animationRef.current = setInterval(() => {
            setDisplayedText(text.slice(0, idx + 1));
            idx++;
            if (idx >= text.length && animationRef.current) clearInterval(animationRef.current);
        }, 20);
    };

    // Get current page
    const currentStoryPage = storyPages[currentPage];

    // Calculate progress
    const totalPages = storyPages.length;
    const completedPages = storyPages.filter(p => p.imageStatus === 'completed').length;
    const progressPercentage = totalPages > 0 ? (completedPages / totalPages) * 100 : 0;

    // Dynamic speech messages
    const getSpeechMessage = () => {
        if (isLoading) return "Getting your story ready... This is going to be amazing! ✨";
        if (isPolling) return "Creating magical illustrations for your story... 🎨";
        if (pollingError) return "Oops! Something went wrong, but don't worry - we can fix this! 🔧";
        if (showSuccessAnimation) return "Fantastic! All your illustrations are ready! 🌟";
        if (currentStoryPage?.imageStatus === 'error') return "This image had a hiccup. Click retry to give it another go! 💪";
        
        // Page-specific messages when navigating - balanced length
        const pageMessages = [
            "Here's where the adventure begins! What a great start! 🚀",
            "The story is getting exciting! Look at this scene! 🎭",
            "Wow, the plot thickens! This page is amazing! 💫",
            "Things are really heating up now! Beautiful illustration! 🔥",
            "What a twist! I didn't see that coming! 😮",
            "The adventure continues! This page looks fantastic! 🌈",
            "Getting closer to the end... but what a journey! 🛤️",
            "Almost there! This story is truly special! ⭐",
            "The grand finale approaches! So exciting! 🎪",
            "The perfect ending! What an incredible story! 🎉"
        ];
        
        // For completed stories on the last page
        if (currentPage === totalPages - 1 && completedPages === totalPages && totalPages > 0) {
            return "Your story is complete! Every page looks wonderful! 📚";
        }
        
        // Get a contextual message based on current page
        if (currentStoryPage?.imageStatus === 'completed' && totalPages > 0) {
            // Use predefined messages or generate based on page number
            if (currentPage < pageMessages.length) {
                return pageMessages[currentPage];
            } else {
                return `Page ${currentPage + 1} - This looks absolutely amazing! 📖`;
            }
        }
        
        return `Page ${currentPage + 1} of ${totalPages} - ${currentStoryPage?.imageStatus === 'completed' ? "Looking great!" : "Creating magic..."} 📖`;
    };

    // Update speech bubble text
    useEffect(() => {
        animateText(getSpeechMessage());
    }, [isLoading, isPolling, pollingError, showSuccessAnimation, currentPage, storyPages]);

    // Preload next image for smoother transitions
    useEffect(() => {
        if (currentPage < storyPages.length - 1) {
            const nextPage = storyPages[currentPage + 1];
            if (nextPage?.imageUrl) {
                const img = new window.Image();
                img.src = nextPage.imageUrl;
            }
        }
    }, [currentPage, storyPages]);

    // Cleanup polling on unmount
    useEffect(() => {
        return () => {
            if (pollingInterval.current) {
                clearInterval(pollingInterval.current);
            }
            if (animationRef.current) {
                clearInterval(animationRef.current);
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
                
                // Initialize pages with image status
                const pagesWithStatus = (data.pages || []).map((page: any) => {
                    const imageUrl = page.chosenImage?.secureUrl || page.imageUrl || null;
                    console.log(`Page ${page.id} image URL:`, imageUrl);
                    
                    return {
                        ...page,
                        imageUrl: imageUrl,
                        illustrationPrompt: page.illustrationPrompt || page.imagePrompt || '',
                        imageStatus: imageUrl ? 'completed' as ImageGenerationStatus : 'generating' as ImageGenerationStatus,
                    };
                });
                
                setStoryPages(pagesWithStatus);
                
                // Check if any pages need images
                const needsImages = pagesWithStatus.some((page: StoryPage) => 
                    page.imageStatus === 'generating' && !page.imageUrl
                );
                
                if (needsImages && !imageGenerationStarted && !generationStartedRef.current) {
                    generationStartedRef.current = true;
                    // Start generation immediately with smooth transition
                    setTimeout(() => {
                        generateImages(pagesWithStatus);
                    }, 1000);
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
        const pendingPages = pagesToUse.filter(page => page.imageStatus === 'generating' && !page.imageUrl);
        
        if (pendingPages.length === 0) {
            console.log('No pages to generate');
            return;
        }

        setImageGenerationStarted(true);
        setPollingError(null);

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
        
        // Check if all completed
        const allSuccess = results.every(r => r.success);
        if (allSuccess) {
            setShowSuccessAnimation(true);
            setTimeout(() => setShowSuccessAnimation(false), 3000);
        }
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
                        setShowSuccessAnimation(true);
                        setTimeout(() => setShowSuccessAnimation(false), 3000);
                        toast.success('All images generated successfully!', {
                            description: 'Your story is ready to view',
                            icon: '🎉'
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
            icon: '🎲'
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
                toast.success('New image variant created!', { icon: '✨' });
                return;
            }

            // Start polling
            if (!isPolling) {
                setIsPolling(true);
                pollingStartTime.current = Date.now();
                startPollingForImages();
            }
            
            toast.success('Generating new image variant...', { icon: '🎨' });
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

    // Download image function
    async function downloadImage(pageId: string) {
        const page = storyPages.find(p => p.id === pageId);
        if (!page || !page.imageUrl) return;

        try {
            // Show loading toast
            const loadingToast = toast.loading('Preparing download...');
            
            // Fetch the image with CORS mode
            const response = await fetch(page.imageUrl, {
                mode: 'cors',
                credentials: 'omit'
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch image');
            }
            
            const blob = await response.blob();
            
            // Create a download link
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `${storyTitle.replace(/[^a-z0-9]/gi, '_')}_page_${page.index + 1}.png`;
            
            // Trigger download
            document.body.appendChild(a);
            a.click();
            
            // Cleanup
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            // Dismiss loading toast and show success
            toast.dismiss(loadingToast);
            toast.success('Image downloaded successfully!', {
                description: `Saved as ${a.download}`,
                icon: '✅'
            });
        } catch (error) {
            console.error('Error downloading image:', error);
            
            // If CORS error, try opening in new tab as fallback
            if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
                window.open(page.imageUrl, '_blank');
                toast.info('Image opened in new tab', {
                    description: 'Right-click and save the image from the new tab',
                });
            } else {
                toast.error('Failed to download image', {
                    description: 'Please try again or right-click the image to save',
                });
            }
        }
    }

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: { duration: 0.4 }
        }
    };

    if (isLoading) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-col items-center justify-center"
                >
                    {/* Spinner container with better sizing */}
                    <div className="relative mb-8">
                        <div className="w-24 h-24 rounded-full bg-[#4CAF50]/10 flex items-center justify-center">
                            <div className="absolute inset-0 rounded-full border-4 border-[#4CAF50]/20" />
                            <div className="w-24 h-24 rounded-full border-4 border-transparent border-t-[#4CAF50] animate-spin" />
                        </div>
                        {/* Additional decorative elements */}
                        <motion.div
                            className="absolute -inset-4"
                            initial={{ rotate: 0 }}
                            animate={{ rotate: 360 }}
                            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                        >
                            <div className="w-32 h-32 rounded-full border border-dashed border-[#4CAF50]/20" />
                        </motion.div>
                    </div>
                    
                    {/* Text content with better spacing */}
                    <div className="text-center space-y-2">
                        <h2 className="text-2xl font-semibold text-gray-800">
                            Loading your story...
                        </h2>
                        <p className="text-base text-gray-600">
                            Get ready for something amazing!
                        </p>
                    </div>
                    
                    {/* Progress dots animation */}
                    <div className="flex gap-1.5 mt-8">
                        {[0, 1, 2].map((i) => (
                            <motion.div
                                key={i}
                                className="w-2 h-2 rounded-full bg-[#4CAF50]"
                                animate={{
                                    scale: [1, 1.5, 1],
                                    opacity: [0.5, 1, 0.5],
                                }}
                                transition={{
                                    duration: 1.5,
                                    repeat: Infinity,
                                    delay: i * 0.2,
                                }}
                            />
                        ))}
                    </div>
                </motion.div>
            </div>
        );
    }

    if (!currentStoryPage) {
        return (
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center h-full px-4 text-center bg-gradient-to-br from-red-50 to-orange-50"
            >
                <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mb-4">
                    <AlertCircle className="w-10 h-10 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Story not found</h2>
                <p className="text-gray-600 mb-6">
                    We couldn't find your story. Please try creating a new one.
                </p>
                <Button 
                    onClick={() => window.location.href = '/onboarding'}
                    className="bg-[#4CAF50] hover:bg-[#43a047] text-white shadow-md hover:shadow-lg transition-all cursor-pointer"
                >
                    Create New Story
                </Button>
            </motion.div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-gradient-to-b from-gray-50 to-white">
            {/* Fixed height header section */}
            <div className="flex-shrink-0">
                {/* Speech Bubble Section - Flexible height with minimum constraint */}
                <div className="px-6 pt-6 pb-4 min-h-[165px]">
                    <SpeechBubble
                        message={displayedText}
                        animateIn={true}
                        position="left"
                    />
                </div>

                {/* Header with title and progress - Adjusted height */}
                <div className="px-6 pb-4">
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <h1 className="text-2xl font-bold mb-2 text-gray-800 truncate">
                            {storyTitle}
                        </h1>
                        <div className="flex items-center justify-between">
                            <Badge 
                                variant="secondary" 
                                className="bg-[#4CAF50]/10 text-[#4CAF50] border-[#4CAF50]/20"
                            >
                                Page {currentPage + 1} of {totalPages}
                            </Badge>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500">{Math.round(progressPercentage)}%</span>
                                <Progress value={progressPercentage} className="w-32 h-2" />
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Main content area */}
            <div className="flex-1 overflow-y-auto px-6">
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="pb-6 max-w-4xl mx-auto w-full"
                >
                    {/* Progress indicator */}
                    <AnimatePresence>
                        {isPolling && (
                            <motion.div
                                variants={itemVariants}
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mb-4"
                            >
                                <div className="bg-gradient-to-r from-[#4CAF50]/10 to-[#43a047]/10 rounded-xl p-4 border border-[#4CAF50]/20">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="relative">
                                                <Sparkles className="w-5 h-5 text-[#4CAF50] animate-pulse" />
                                                <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full animate-ping" />
                                            </div>
                                            <span className="text-sm font-medium text-gray-700">
                                                Creating magical illustrations...
                                            </span>
                                        </div>
                                        <Badge 
                                            variant="outline" 
                                            className="text-xs border-[#4CAF50]/30 text-[#4CAF50]"
                                        >
                                            {completedPages}/{totalPages} done
                                        </Badge>
                                    </div>
                                    <div className="relative">
                                        <Progress value={progressPercentage} className="h-3 bg-[#4CAF50]/10" />
                                        <motion.div
                                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-transparent to-white/30"
                                            animate={{ x: ['0%', '100%'] }}
                                            transition={{ duration: 1.5, repeat: Infinity }}
                                            style={{ width: '30%' }}
                                        />
                                    </div>
                                    <p className="text-xs text-gray-600 mt-2 flex items-center gap-1">
                                        <Zap className="w-3 h-3" />
                                        Lightning fast generation - up to 5 images at once!
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Success animation */}
                    <AnimatePresence>
                        {showSuccessAnimation && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="mb-4"
                            >
                                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200 text-center">
                                    <motion.div
                                        animate={{ rotate: [0, 10, -10, 10, 0] }}
                                        transition={{ duration: 0.5 }}
                                        className="inline-block mb-2"
                                    >
                                        <CheckCircle className="w-8 h-8 text-green-500" />
                                    </motion.div>
                                    <p className="font-medium text-green-700">All illustrations complete!</p>
                                    <p className="text-sm text-green-600">Your story looks amazing!</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Error alert */}
                    <AnimatePresence>
                        {pollingError && (
                            <motion.div
                                variants={itemVariants}
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="mb-4"
                            >
                                <Alert variant="destructive" className="border-red-200 bg-red-50">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>{pollingError}</AlertDescription>
                                </Alert>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Image display card - FULLY FLUSHED */}
                    <motion.div variants={itemVariants} className="mb-6">
                        <div className="rounded-2xl overflow-hidden shadow-lg border border-gray-200 bg-white">
                            <div className="aspect-[3/4] relative bg-gradient-to-br from-gray-100 to-gray-50">
                                <AnimatePresence mode="wait">
                                    {currentStoryPage.imageStatus === 'generating' && (
                                        <motion.div
                                            key="generating"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#4CAF50]/5 to-[#43a047]/10"
                                        >
                                            <div className="text-center">
                                                <div className="relative mb-4">
                                                    <div className="w-20 h-20 rounded-full bg-[#4CAF50]/10 flex items-center justify-center">
                                                        <div className="w-10 h-10 border-3 border-[#4CAF50] border-t-transparent rounded-full animate-spin" />
                                                    </div>
                                                    <motion.div
                                                        className="absolute -top-2 -right-2"
                                                        animate={{ scale: [1, 1.2, 1] }}
                                                        transition={{ duration: 2, repeat: Infinity }}
                                                    >
                                                        <Sparkles className="w-6 h-6 text-yellow-500" />
                                                    </motion.div>
                                                </div>
                                                <p className="text-lg font-medium text-gray-700 mb-1">Creating your illustration...</p>
                                                <p className="text-sm text-gray-500">This usually takes 30-60 seconds</p>
                                            </div>
                                        </motion.div>
                                    )}
                                    
                                    {currentStoryPage.imageStatus === 'pending' && (
                                        <motion.div
                                            key="pending"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#4CAF50]/5 to-[#43a047]/10"
                                        >
                                            <div className="text-center">
                                                <div className="relative mb-4">
                                                    <div className="w-20 h-20 rounded-full bg-[#4CAF50]/10 flex items-center justify-center">
                                                        <div className="w-10 h-10 border-3 border-[#4CAF50] border-t-transparent rounded-full animate-spin" />
                                                    </div>
                                                    <motion.div
                                                        className="absolute -top-2 -right-2"
                                                        animate={{ scale: [1, 1.2, 1] }}
                                                        transition={{ duration: 2, repeat: Infinity }}
                                                    >
                                                        <Sparkles className="w-6 h-6 text-yellow-500" />
                                                    </motion.div>
                                                </div>
                                                <p className="text-lg font-medium text-gray-700 mb-1">Creating your illustration...</p>
                                                <p className="text-sm text-gray-500">This usually takes 30-60 seconds</p>
                                            </div>
                                        </motion.div>
                                    )}

                                    {currentStoryPage.imageStatus === 'error' && (
                                        <motion.div
                                            key="error"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="absolute inset-0 flex items-center justify-center bg-red-50 p-8"
                                        >
                                            <div className="text-center">
                                                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4 mx-auto">
                                                    <AlertCircle className="w-8 h-8 text-red-500" />
                                                </div>
                                                <p className="text-lg font-medium text-red-600 mb-2">
                                                    Generation failed
                                                </p>
                                                <p className="text-sm text-gray-500 mb-4">
                                                    {currentStoryPage.imageError || 'An unexpected error occurred'}
                                                </p>
                                                <Button 
                                                    onClick={() => retryImageGeneration(currentStoryPage.id)}
                                                    className="bg-[#4CAF50] hover:bg-[#43a047] text-white shadow-md hover:shadow-lg transition-all cursor-pointer"
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
                                                priority={true}
                                                quality={85}
                                                placeholder="blur"
                                                blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWEREiMxUf/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                                                loading="eager"
                                                unoptimized={true}
                                                onError={(e) => {
                                                    console.error('Image failed to load:', currentStoryPage.imageUrl);
                                                }}
                                            />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                            
                            {/* Story text inside the card */}
                            <div className="p-6 bg-white">
                                <p className="text-lg leading-relaxed text-gray-800 font-medium">
                                    {currentStoryPage.text}
                                </p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Action buttons for completed images */}
                    <AnimatePresence>
                        {currentStoryPage.imageStatus === 'completed' && (
                            <motion.div
                                variants={itemVariants}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="flex gap-3 justify-center mb-6"
                            >
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => rerollImage(currentStoryPage.id)}
                                    className="border-[#4CAF50] text-[#4CAF50] hover:bg-[#4CAF50]/10 hover:scale-105 transition-all cursor-pointer"
                                >
                                    <Shuffle className="w-4 h-4 mr-2" />
                                    New Variant
                                </Button>
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => downloadImage(currentStoryPage.id)}
                                    className="border-[#4CAF50] text-[#4CAF50] hover:bg-[#4CAF50]/10 hover:scale-105 transition-all cursor-pointer"
                                >
                                    <Download className="w-4 h-4 mr-2" />
                                    Download
                                </Button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* View Prompt Section */}
                    <motion.div variants={itemVariants}>
                        <details className="group">
                            <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-2 select-none">
                                <FileText className="w-4 h-4" />
                                View illustration prompt
                                <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90" />
                            </summary>
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                className="mt-3"
                            >
                                <Card className="bg-gray-50 border-gray-200">
                                    <CardContent className="p-4">
                                        <pre className="whitespace-pre-wrap text-xs text-gray-600 font-mono">
                                            {currentStoryPage.illustrationPrompt || 'No prompt available'}
                                        </pre>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </details>
                    </motion.div>
                </motion.div>
            </div>

            {/* Navigation footer - STICKY BOTTOM */}
            <motion.div 
                initial={{ y: 100 }}
                animate={{ y: 0 }}
                transition={{ type: "spring", damping: 20 }}
                className="sticky bottom-0 bg-white border-t shadow-xl"
            >
                <div className="px-6 py-4">
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            onClick={() => setCurrentPage(current => Math.max(0, current - 1))}
                            disabled={currentPage === 0}
                            className={cn(
                                "transition-all cursor-pointer",
                                currentPage === 0 
                                    ? "opacity-50 cursor-not-allowed" 
                                    : "hover:scale-105 hover:bg-gray-50"
                            )}
                        >
                            <ChevronLeft className="w-4 h-4 mr-1" />
                            Previous
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
                                "flex-1 transition-all cursor-pointer shadow-md hover:shadow-lg",
                                currentPage === storyPages.length - 1 
                                    ? completedPages === totalPages
                                        ? "bg-gradient-to-r from-[#4CAF50] to-[#43a047] hover:from-[#43a047] hover:to-[#388e3c] text-white"
                                        : "bg-gray-200 text-gray-500 cursor-not-allowed"
                                    : "bg-[#4CAF50] hover:bg-[#43a047] text-white"
                            )}
                        >
                            {currentPage === storyPages.length - 1 ? (
                                completedPages === totalPages ? (
                                    <>
                                        <CheckCircle className="w-5 h-5 mr-2" />
                                        Complete Review
                                    </>
                                ) : (
                                    "Waiting for images..."
                                )
                            ) : (
                                <>
                                    Next Page
                                    <ChevronRight className="w-4 h-4 ml-1" />
                                </>
                            )}
                        </Button>
                    </div>

                    {/* Page dots indicator */}
                    <div className="flex justify-center gap-1.5 mt-3">
                        {storyPages.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentPage(index)}
                                className={cn(
                                    "w-2 h-2 rounded-full transition-all cursor-pointer",
                                    index === currentPage 
                                        ? "w-8 bg-[#4CAF50]" 
                                        : "bg-gray-300 hover:bg-gray-400"
                                )}
                                aria-label={`Go to page ${index + 1}`}
                            />
                        ))}
                    </div>
                </div>
            </motion.div>

        </div>
    );
}