'use client';
import React, { useEffect, useState } from 'react';
import { useStoryBuilder } from '@/lib/context/story-builder-context';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';

export default function StyleSelection() {
    const { visualStyle, setVisualStyle, goToNextStep } = useStoryBuilder();
    const [styles, setStyles] = useState<Array<{id: string; name: string; imageUrl: string}>>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch styles on component mount
    useEffect(() => {
        async function fetchStyles() {
            try {
                const response = await fetch('/api/styles');
                if (response.ok) {
                    const data = await response.json();
                    setStyles(data.styles || []);
                }
            } catch (error) {
                console.error('Failed to fetch styles:', error);
                // Fallback styles if API fails
                setStyles([
                    { id: 'fantasy', name: 'Fantasy', imageUrl: '/styles/fantasy.jpg' },
                    { id: 'cyberpunk', name: 'Cyberpunk', imageUrl: '/styles/cyberpunk.jpg' },
                    { id: 'anime', name: 'Anime', imageUrl: '/styles/anime.jpg' },
                    { id: 'pop-art', name: 'Pop Art', imageUrl: '/styles/pop-art.jpg' },
                    { id: 'pixel-art', name: 'Pixel Art', imageUrl: '/styles/pixel-art.jpg' },
                    { id: 'watercolor', name: 'Watercolor', imageUrl: '/styles/watercolor.jpg' },
                    { id: '3d-cartoon', name: '3D Cartoon', imageUrl: '/styles/3d-cartoon.jpg' },
                    { id: 'dystopian', name: 'Dystopian', imageUrl: '/styles/dystopian.jpg' },
                    { id: 'cubist', name: 'Cubist', imageUrl: '/styles/cubist.jpg' },
                    { id: 'mecha', name: 'Mecha', imageUrl: '/styles/mecha.jpg' },
                    { id: 'lego', name: 'Lego', imageUrl: '/styles/lego.jpg' },
                    { id: 'fairy-tale', name: 'Fairy Tale', imageUrl: '/styles/fairy-tale.jpg' },
                    { id: 'origami', name: 'Origami', imageUrl: '/styles/origami.jpg' },
                    { id: 'sci-fi', name: 'Sci-Fi', imageUrl: '/styles/sci-fi.jpg' },
                    { id: 'samurai', name: 'Samurai', imageUrl: '/styles/samurai.jpg' },
                    { id: 'atlantis', name: 'Atlantis', imageUrl: '/styles/atlantis.jpg' },
                    { id: 'tropical', name: 'Tropical', imageUrl: '/styles/tropical.jpg' },
                    { id: 'vintage', name: 'Vintage', imageUrl: '/styles/vintage.jpg' },
                ]);
            } finally {
                setIsLoading(false);
            }
        }

        fetchStyles();
    }, []);

    const handleStyleSelection = (style: {id: string; name: string; imageUrl: string}) => {
        setVisualStyle(style);
    };

    const handleContinue = () => {
        goToNextStep();
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="flex flex-col flex-1 px-4 pb-6">
            <h1 className="text-3xl font-bold mb-2">Choose a Style</h1>
            <p className="text-gray-600 mb-6">
                Choose a visual style to bring your story to life. From 3D cartoons to Studio Ghibli or LEGO,
                each one sets the tone. Pick one to continue.
            </p>

            {/* Grid of style options */}
            <div className="grid grid-cols-3 gap-3 mb-6 overflow-y-auto pb-1">
                {styles.map(style => (
                    <button
                        key={style.id}
                        onClick={() => handleStyleSelection(style)}
                        className={`
              relative aspect-video rounded-lg overflow-hidden
              ${visualStyle?.id === style.id ? 'ring-2 ring-blue-500' : ''}
            `}
                    >
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <span className="text-white font-medium text-center">{style.name}</span>
                        </div>
                        <Image
                            src={style.imageUrl}
                            alt={style.name}
                            width={200}
                            height={120}
                            className="w-full h-full object-cover"
                        />
                    </button>
                ))}
            </div>

            {/* Continue button */}
            <button
                onClick={handleContinue}
                disabled={!visualStyle}
                className={`
          w-full py-5 rounded-lg text-lg font-medium mt-auto
          ${!visualStyle ? 'bg-gray-200 text-gray-500' : 'bg-[#212121] text-white'}
        `}
            >
                {visualStyle ? `Continue with ${visualStyle.name}` : 'Continue'}
            </button>
        </div>
    );
}