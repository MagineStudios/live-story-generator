'use client';
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useOnboarding } from '@/lib/context/onboarding-provider';
import { Loader2 } from 'lucide-react';

export function StyleStep() {
    const { visualStyle, setVisualStyle, goToNextStep } = useOnboarding();
    const [styles, setStyles] = useState<Array<{ id: string; name: string; imageUrl: string }>>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchStyles() {
            try {
                const res = await fetch('/api/styles');
                const data = res.ok ? await res.json() : null;
                if (data && data.styles) {
                    setStyles(data.styles);
                } else {
                    // Fallback styles in case API call fails
                    setStyles([
                        { id: 'fantasy', name: 'Fantasy', imageUrl: '/styles/fantasy.jpg' },
                        { id: 'sci-fi', name: 'Sci-Fi', imageUrl: '/styles/sci-fi.jpg' },
                        { id: 'anime', name: 'Anime', imageUrl: '/styles/anime.jpg' },
                        { id: 'watercolor', name: 'Watercolor', imageUrl: '/styles/watercolor.jpg' },
                        { id: 'lego', name: 'LEGO', imageUrl: '/styles/lego.jpg' },
                        { id: 'comic', name: 'Comic Book', imageUrl: '/styles/comic.jpg' },
                    ]);
                }
            } catch {
                // use fallback list on error
                setStyles([
                    { id: 'fantasy', name: 'Fantasy', imageUrl: '/styles/fantasy.jpg' },
                    { id: 'sci-fi', name: 'Sci-Fi', imageUrl: '/styles/sci-fi.jpg' },
                    { id: 'anime', name: 'Anime', imageUrl: '/styles/anime.jpg' },
                    { id: 'watercolor', name: 'Watercolor', imageUrl: '/styles/watercolor.jpg' },
                    { id: 'lego', name: 'LEGO', imageUrl: '/styles/lego.jpg' },
                    { id: 'comic', name: 'Comic Book', imageUrl: '/styles/comic.jpg' },
                ]);
            } finally {
                setIsLoading(false);
            }
        }
        fetchStyles();
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="flex flex-col flex-1 px-6 pb-8">
            <h1 className="text-2xl font-bold mb-4">Choose a Story Style</h1>
            <p className="text-gray-600 mb-6">Select an illustration style to set the visual theme of your story.</p>
            <div className="grid grid-cols-2 gap-4 mb-6">
                {styles.map(style => (
                    <div
                        key={style.id}
                        onClick={() => setVisualStyle({ id: style.id, name: style.name, imageUrl: style.imageUrl })}
                        className={`relative rounded-lg overflow-hidden cursor-pointer border-2 
              ${visualStyle?.id === style.id ? 'border-blue-600' : 'border-transparent'}`}
                    >
                        <Image
                            src={style.imageUrl}
                            alt={style.name}
                            width={200}
                            height={140}
                            className="object-cover w-full h-full"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition">
                            <span className="text-white font-medium text-lg">{style.name}</span>
                        </div>
                    </div>
                ))}
            </div>
            <button
                onClick={goToNextStep}
                disabled={!visualStyle}
                className={`w-full py-3 rounded-lg text-white text-lg font-medium 
          ${visualStyle ? 'bg-[#212121] hover:bg-black' : 'bg-gray-300 cursor-not-allowed'}`}
            >
                Continue
            </button>
        </div>
    );
}