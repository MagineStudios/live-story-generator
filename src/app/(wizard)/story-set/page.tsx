'use client';
import React from 'react';
import Image from 'next/image';
import { useStoryBuilder } from '@/lib/context/story-builder-context';
import { useRouter } from 'next/navigation';

const DEFAULT_ELEMENTS = [
    { id: 'Eden', label: 'Child', iconUrl: '/icons/child.svg' },
    { id: 'Gimble', label: 'Dog', iconUrl: '/icons/dog.svg' },
    { id: 'Henry', label: 'Sheep', iconUrl: '/icons/sheep.svg' },
];

export default function StorySetPage() {
    const { selectedElements, addElement, removeElement, addUploadedImage } = useStoryBuilder();
    const router = useRouter();

    const toggle = (el: typeof DEFAULT_ELEMENTS[0]) =>
        selectedElements.find(e => e.id === el.id)
            ? removeElement(el.id)
            : addElement(el);

    const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        const form = new FormData(); form.append('file', file);
        const res = await fetch('/api/upload', { method: 'POST', body: form });
        const { url } = await res.json();
        addUploadedImage(url);
    };

    return (
        <div>
            <h2 className="text-xl mb-4">Step 1: Build Your Story Set</h2>
            <div className="grid grid-cols-3 gap-4 mb-6">
                {DEFAULT_ELEMENTS.map(el => {
                    const selected = !!selectedElements.find(e => e.id === el.id);
                    return (
                        <button
                            key={el.id}
                            onClick={() => toggle(el)}
                            className={`border rounded p-4 flex flex-col items-center ${selected ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
                        >
                            <Image src={el.iconUrl} alt={el.label} width={48} height={48} className="mb-2" />
                            <span>{el.label}</span>
                        </button>
                    );
                })}
                <label className="border border-dashed rounded p-4 flex flex-col items-center justify-center cursor-pointer text-gray-500">
                    <input type="file" accept="image/*" onChange={onFileChange} className="hidden" />
                    <span>Upload Photo</span>
                </label>
            </div>
            <button
                onClick={() => router.push('/create/style')}
                disabled={selectedElements.length === 0}
                className="w-full py-2 bg-blue-600 text-white rounded disabled:opacity-50"
            >Add & Continue</button>
        </div>
    );
}