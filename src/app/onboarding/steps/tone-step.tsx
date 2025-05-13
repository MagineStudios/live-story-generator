'use client';
import React from 'react';
import { useOnboarding } from '@/lib/context/onboarding-provider';

const TONE_OPTIONS = [
    { value: 'Funny', label: 'Funny & Playful' },
    { value: 'Adventure', label: 'Adventurous & Exciting' },
    { value: 'Heartwarming', label: 'Heartwarming & Sweet' },
    { value: 'Mystery', label: 'Mysterious & Surprising' },
];

export function ToneStep() {
    const { tone, setTone, goToNextStep, goToPrevStep } = useOnboarding();

    return (
        <div className="flex flex-col flex-1 px-6 pb-8 justify-center">
            <h1 className="text-2xl font-bold mb-4">Choose a tone for your story</h1>
            <p className="text-gray-600 mb-6">How should your story feel?</p>
            <div className="space-y-3 mb-8">
                {TONE_OPTIONS.map(option => (
                    <button
                        key={option.value}
                        onClick={() => setTone(option.value)}
                        className={`w-full text-left px-4 py-3 rounded-lg border transition 
              ${tone === option.value ? 'border-blue-600 bg-blue-50' : 'border-gray-300 hover:bg-gray-50'}`}
                    >
                        {option.label}
                    </button>
                ))}
            </div>
            <button
                onClick={goToNextStep}
                disabled={!tone}
                className={`w-full py-3 mb-2 rounded-lg text-white text-lg font-medium 
          ${tone ? 'bg-[#212121] hover:bg-black' : 'bg-gray-300 cursor-not-allowed'}`}
            >
                Continue
            </button>
            <button
                onClick={goToPrevStep}
                className="w-full py-3 text-gray-600 hover:text-gray-900 text-sm"
            >
                Back
            </button>
        </div>
    );
}