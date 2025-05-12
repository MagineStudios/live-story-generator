'use client';
import React from 'react';
import Image from 'next/image';
import { useStoryBuilder } from '@/lib/context/story-builder-context';
import { useRouter } from 'next/navigation';

const STYLES = [
    { id: '3D', name: '3D Cartoon', thumb: '/styles/3d.png' },
    { id: 'Ghibli', name: 'Studio Ghibli', thumb: '/styles/ghibli.png' },
    { id: 'Pixar', name: 'Pixar', thumb: '/styles/pixar.png' },
    { id: 'Lego', name: 'LEGO', thumb: '/styles/lego.png' },
];

export default function StylePage() {
    const { visualStyle, setVisualStyle } = useStoryBuilder();
    const router = useRouter();

    return (
        <div>
            <h2 className="text-xl mb-4">Step 2: Choose a Visual Style</h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
                {STYLES.map(style => {
                    const selected = visualStyle === style.id;
                    return (
                        <div
                            key={style.id}
                            onClick={() => setVisualStyle(style.id)}
                            className={`border rounded p-2 cursor-pointer ${selected ? 'border-blue-500' : 'border-gray-300'}`}
                        >
                            <div className="relative w-full h-32 mb-2">
                                <Image src={style.thumb} alt={style.name} fill className="object-cover rounded" />
                            </div>
                            <span className="block text-center">{style.name}</span>
                        </div>
                    );
                })}
            </div>
            <button
                onClick={() => router.push('/create/theme')}
                disabled={!visualStyle}
                className="w-full py-2 bg-blue-600 text-white rounded disabled:opacity-50"
            >Continue with {visualStyle || '...'} Style</button>
        </div>
    );
}