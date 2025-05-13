'use client';
import React from 'react';
import { useOnboarding } from '@/lib/context/onboarding-provider';

const GOAL_OPTIONS = [
    { value: 'Have Fun', label: 'Just for fun' },
    { value: 'Learn Something', label: 'Teach a lesson or skill' },
    { value: 'Bedtime', label: 'Bedtime story (calm & soothing)' },
    { value: 'Gift', label: 'A personalized gift for someone' },
];

export function GoalStep() {
    const { storyGoal, setStoryGoal, goToNextStep } = useOnboarding();

    return (
        <div className="flex flex-col flex-1 px-6 pb-8 justify-center">
            <h1 className="text-2xl font-bold mb-4">What's the goal of your story?</h1>
            <p className="text-gray-600 mb-6">Select the main purpose for creating this story.</p>
            <div className="space-y-3 mb-8">
                {GOAL_OPTIONS.map(option => (
                    <button
                        key={option.value}
                        onClick={() => setStoryGoal(option.value)}
                        className={`w-full text-left px-4 py-3 rounded-lg border transition 
              ${storyGoal === option.value ? 'border-blue-600 bg-blue-50' : 'border-gray-300 hover:bg-gray-50'}`}
                    >
                        {option.label}
                    </button>
                ))}
            </div>
            <button
                onClick={goToNextStep}
                disabled={!storyGoal}
                className={`w-full py-3 rounded-lg text-white text-lg font-medium 
          ${storyGoal ? 'bg-[#212121] hover:bg-black' : 'bg-gray-300 cursor-not-allowed'}`}
            >
                Continue
            </button>
        </div>
    );
}