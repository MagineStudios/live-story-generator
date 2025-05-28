'use client';
import React, { useEffect, useState } from 'react';
import { useStoryBuilder } from '@/lib/context/story-builder-context';
import { Loader2, CheckCircle } from 'lucide-react';

export default function Generating() {
    const { goToNextStep, isGeneratingStory, generatedStoryId, visualStyle } = useStoryBuilder();
    const [status, setStatus] = useState<'generating-story' | 'story-ready' | 'complete'>('generating-story');

    // Monitor story generation status
    useEffect(() => {
        if (!isGeneratingStory && generatedStoryId) {
            setStatus('story-ready');
        }
    }, [isGeneratingStory, generatedStoryId]);

    // Auto-proceed when generation is complete
    useEffect(() => {
        if (status === 'story-ready') {
            const timer = setTimeout(() => {
                setStatus('complete');
                setTimeout(() => {
                    goToNextStep();
                }, 500);
            }, 1500);

            return () => clearTimeout(timer);
        }
    }, [status, goToNextStep]);

    // Decide if we should show the themed background
    const showThemeBackground = visualStyle?.id === 'lego';

    return (
        <div
            className={`
        flex flex-col items-center justify-center h-full px-4 text-center
        ${showThemeBackground ? 'bg-cover bg-center' : ''}
      `}
            style={showThemeBackground ? {
                backgroundImage: `url(/styles/lego-background.jpg)`,
            } : {}}
        >
            <div className="flex items-center justify-center w-12 h-12 mb-6">
                <span className="text-4xl font-bold">M</span>
            </div>

            <h2 className="text-2xl font-bold mb-2">Generating Magic</h2>
            
            {status === 'generating-story' && (
                <>
                    <p className="text-gray-600 mb-12 max-w-xs mx-auto">
                        Our AI wizards are assembling bricks of imagination
                        to craft your custom {visualStyle?.name || 'LEGO'} adventure. Get ready for a story that&apos;s as unique as your creativity!
                    </p>

                    <div className="flex flex-col items-center mb-8">
                        <div className="flex items-center mb-4">
                            <div className="h-6 w-6 border-2 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mr-3"></div>
                            <span className="text-gray-600">Creating your story text...</span>
                        </div>
                        <span className="text-sm text-gray-500">Less than 60 seconds remaining...</span>
                    </div>
                </>
            )}

            {status === 'story-ready' && (
                <>
                    <p className="text-gray-600 mb-12 max-w-xs mx-auto">
                        Great news! Your story is ready. Images will be generated
                        in the background while you review your story.
                    </p>

                    <div className="flex flex-col items-center mb-8">
                        <div className="flex items-center mb-4">
                            <CheckCircle className="h-6 w-6 text-green-500 mr-3" />
                            <span className="text-gray-600">Story created successfully!</span>
                        </div>
                        <span className="text-sm text-gray-500">Redirecting to review...</span>
                    </div>
                </>
            )}

            {status === 'complete' && (
                <>
                    <p className="text-gray-600 mb-12 max-w-xs mx-auto">
                        All done! Taking you to review your story...
                    </p>

                    <div className="flex items-center mb-8">
                        <Loader2 className="h-6 w-6 animate-spin text-primary mr-3" />
                        <span className="text-gray-600">Loading review page...</span>
                    </div>
                </>
            )}

            <button
                className="px-6 py-3 bg-gray-100 rounded-lg text-gray-700 font-medium"
                onClick={() => {
                    // Implement cancel logic
                    console.log('Cancel generation');
                }}
            >
                Cancel generation
            </button>
        </div>
    );
}
