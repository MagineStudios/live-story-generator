'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Loader2, Home, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Story {
    id: string;
    title: string;
    status: 'GENERATING' | 'READY' | 'CANCELLED';
    pages: {
        id: string;
        text: string;
        index: number;
        chosenImageId?: string;
        chosenImage?: {
            id: string;
            secureUrl: string;
            publicId: string;
            width: number;
            height: number;
        };
        microprompts?: string[];
        illustrationPrompt?: string;
    }[];
}

export default function StoryPage() {
    const { storyId } = useParams();
    const router = useRouter();
    const [story, setStory] = useState<Story | null>(null);
    const [currentPage, setCurrentPage] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const fetchStory = async () => {
            try {
                const response = await fetch(`/api/story/${storyId}`);

                if (!response.ok) {
                    throw new Error(`Error: ${response.status}`);
                }

                const data = await response.json();
                setStory(data);

                // If the story is still generating, set up polling
                if (data.status === 'GENERATING') {
                    const interval = setInterval(async () => {
                        try {
                            const refreshResponse = await fetch(`/api/story/${storyId}`);
                            if (!refreshResponse.ok) throw new Error('Error refreshing story');

                            const refreshData = await refreshResponse.json();
                            setStory(refreshData);

                            if (refreshData.status !== 'GENERATING') {
                                clearInterval(interval);
                            }
                        } catch (error) {
                            console.error('Error polling story:', error);
                        }
                    }, 3000);

                    setPollInterval(interval);
                    return;
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load story');
            } finally {
                setLoading(false);
            }
        };

        fetchStory();

        // Clean up
        return () => {
            if (pollInterval) clearInterval(pollInterval);
        };
    }, [storyId]);

    // Navigate to next/previous page
    const nextPage = () => {
        if (story && currentPage < story.pages.length - 1) {
            setCurrentPage(currentPage + 1);
        }
    };

    const prevPage = () => {
        if (currentPage > 0) {
            setCurrentPage(currentPage - 1);
        }
    };

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto p-6 h-screen flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-16 h-16 text-[#4CAF50] animate-spin mx-auto mb-6" />
                    <h2 className="text-2xl font-bold mb-2">Loading Your Story</h2>
                    <p className="text-gray-600">Just a moment while we get everything ready...</p>
                </div>
            </div>
        );
    }

    if (error || !story) {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg">
                    <h2 className="text-2xl font-bold text-red-700 mb-2">Something Went Wrong</h2>
                    <p className="text-red-600 mb-6">{error || 'Unable to load story'}</p>
                    <Button
                        onClick={() => router.push('/')}
                        className="bg-red-600 hover:bg-red-700 text-white"
                    >
                        <Home className="w-4 h-4 mr-2" />
                        Go Home
                    </Button>
                </div>
            </div>
        );
    }

    if (story.status === 'GENERATING') {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <h1 className="text-3xl font-bold mb-6">{story.title || 'Creating Your Story...'}</h1>

                <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-lg mb-6">
                    <div className="flex items-center">
                        <Loader2 className="w-6 h-6 text-blue-600 animate-spin mr-3" />
                        <h2 className="text-xl font-semibold text-blue-700">Your Story Is Being Generated</h2>
                    </div>
                    <p className="mt-2 text-blue-600">
                        We're creating something special for you. This may take up to a minute.
                    </p>
                </div>

                {/* Show pages that have been generated so far */}
                {story.pages.length > 0 && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-medium">Pages created so far:</h3>

                        {story.pages.map((page, index) => (
                            <div key={page.id} className="border rounded-lg p-6 bg-white shadow-sm">
                                <div className="flex items-center text-sm text-gray-500 mb-2">
                                    <span>Page {index + 1}</span>
                                </div>
                                <p className="text-lg">{page.text}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // If story is cancelled
    if (story.status === 'CANCELLED') {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-lg">
                    <h2 className="text-2xl font-bold text-yellow-700 mb-2">Story Creation Cancelled</h2>
                    <p className="text-yellow-600 mb-6">There was an issue generating your story.</p>
                    <div className="flex space-x-4">
                        <Button
                            onClick={() => router.push('/')}
                            variant="outline"
                            className="border-yellow-500 text-yellow-700 hover:bg-yellow-50"
                        >
                            <Home className="w-4 h-4 mr-2" />
                            Go Home
                        </Button>
                        <Button
                            onClick={() => router.push('/onboarding?reset=true')}
                            className="bg-[#4CAF50] hover:bg-[#43a047] text-white"
                        >
                            Create New Story
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // If no pages generated
    if (story.pages.length === 0) {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-lg">
                    <h2 className="text-2xl font-bold text-yellow-700 mb-2">No Pages Found</h2>
                    <p className="text-yellow-600 mb-6">This story doesn't have any pages yet.</p>
                    <Button
                        onClick={() => router.push('/')}
                        className="bg-[#4CAF50] hover:bg-[#43a047] text-white"
                    >
                        <Home className="w-4 h-4 mr-2" />
                        Go Home
                    </Button>
                </div>
            </div>
        );
    }

    const currentPageContent = story.pages[currentPage];

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="flex items-center justify-between mb-6">
                <Button
                    variant="ghost"
                    onClick={() => router.push('/')}
                    className="text-gray-600 hover:text-gray-900"
                >
                    <Home className="w-4 h-4 mr-2" />
                    Home
                </Button>

                <h1 className="text-2xl md:text-3xl font-bold text-center flex-grow">{story.title}</h1>

                <Button
                    variant="ghost"
                    onClick={() => router.push(`/story/${story.id}/share`)}
                    className="text-gray-600 hover:text-gray-900"
                >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                </Button>
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={currentPage}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="my-8"
                >
                    <div className="flex flex-col md:flex-row gap-6">
                        {/* Story illustration */}
                        <div className="md:w-1/2">
                            {currentPageContent.chosenImage ? (
                                <img
                                    src={currentPageContent.chosenImage.secureUrl}
                                    alt={`Illustration for page ${currentPage + 1}`}
                                    className="w-full h-auto rounded-lg shadow-lg object-cover"
                                    width={currentPageContent.chosenImage.width}
                                    height={currentPageContent.chosenImage.height}
                                    onError={(e) => {
                                        // Fallback if image fails to load
                                        console.error('Image failed to load:', currentPageContent.chosenImage?.secureUrl);
                                        e.currentTarget.src = '/assets/placeholder-image.jpg';
                                    }}
                                />
                            ) : (
                                <div className="bg-gray-100 w-full aspect-[2/3] rounded-lg flex items-center justify-center">
                                    <p className="text-gray-500">No illustration available</p>
                                </div>
                            )}
                        </div>

                        {/* Story text */}
                        <div className="md:w-1/2">
                            <div className="bg-white p-6 rounded-lg shadow-md h-full flex flex-col">
                                <div className="text-sm text-gray-500 mb-2">Page {currentPage + 1} of {story.pages.length}</div>
                                <p className="text-lg leading-relaxed flex-grow">{currentPageContent.text}</p>

                                {/* Development only - display illustration prompt */}
                                {process.env.NODE_ENV === 'development' && currentPageContent.illustrationPrompt && (
                                    <details className="mt-4 text-xs text-gray-500 border-t pt-2">
                                        <summary>Illustration Prompt (Dev Only)</summary>
                                        <p className="mt-1 p-2 bg-gray-50 rounded text-xs whitespace-pre-wrap">
                                            {currentPageContent.illustrationPrompt}
                                        </p>
                                    </details>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* Navigation controls */}
            <div className="flex items-center justify-between mt-8">
                <Button
                    onClick={prevPage}
                    disabled={currentPage === 0}
                    variant={currentPage === 0 ? "outline" : "default"}
                    className={`px-4 py-2 rounded-full ${
                        currentPage === 0
                            ? 'text-gray-400 border-gray-200'
                            : 'bg-[#4CAF50] hover:bg-[#43a047] text-white'
                    }`}
                >
                    <ChevronLeft className="w-5 h-5 mr-1" />
                    Previous
                </Button>

                <div className="flex space-x-1">
                    {story.pages.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => setCurrentPage(index)}
                            className={`w-3 h-3 rounded-full ${
                                currentPage === index
                                    ? 'bg-[#4CAF50]'
                                    : 'bg-gray-200 hover:bg-gray-300'
                            }`}
                            aria-label={`Go to page ${index + 1}`}
                        />
                    ))}
                </div>

                <Button
                    onClick={nextPage}
                    disabled={currentPage === story.pages.length - 1}
                    variant={currentPage === story.pages.length - 1 ? "outline" : "default"}
                    className={`px-4 py-2 rounded-full ${
                        currentPage === story.pages.length - 1
                            ? 'text-gray-400 border-gray-200'
                            : 'bg-[#4CAF50] hover:bg-[#43a047] text-white'
                    }`}
                >
                    Next
                    <ChevronRight className="w-5 h-5 ml-1" />
                </Button>
            </div>

            {/* Actions */}
            <div className="mt-8 flex justify-center space-x-4">
                <Button
                    variant="outline"
                    onClick={() => router.push('/onboarding?reset=true')}
                    className="border-2 border-[#4CAF50] text-[#4CAF50] hover:bg-[#4CAF50]/10"
                >
                    Create Another Story
                </Button>

                <Button
                    onClick={() => router.push(`/story/${story.id}/share`)}
                    className="bg-[#4CAF50] hover:bg-[#43a047] text-white"
                >
                    Share This Story
                </Button>
            </div>
        </div>
    );
}