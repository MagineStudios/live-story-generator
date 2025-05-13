'use client';
import React, { useEffect } from 'react';
import { useOnboarding } from '@/lib/context/onboarding-provider';
import { Loader2 } from 'lucide-react';

export function ThemeStep() {
    const {
        visualStyle, themePrompt, setThemePrompt,
        themeSuggestions, generateThemeSuggestions,
        isLoadingSuggestions, createStory, goToNextStep
    } = useOnboarding();

    // Automatically generate theme suggestions when style is selected and suggestions list is empty
    useEffect(() => {
        if (visualStyle && themeSuggestions.length === 0 && !isLoadingSuggestions) {
            generateThemeSuggestions();
        }
    }, [visualStyle]);

    const handleSelectSuggestion = (text: string) => {
        setThemePrompt(text);
    };

    const handleCreateStory = async () => {
        const storyId = await createStory();
        if (storyId) {
            goToNextStep(); // proceed to Generating step
        }
    };

    return (
        <div className="flex flex-col flex-1 px-6 pb-8">
            <h1 className="text-2xl font-bold mb-4">Pick a Story Theme</h1>
            <p className="text-gray-600 mb-4">
                {visualStyle
                    ? `Imagine a story in a ${visualStyle.name} style... Choose a theme to get started.`
                    : 'Imagine a story... Choose a theme to get started.'}
            </p>
            {/* Suggested Themes List */}
            {isLoadingSuggestions ? (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-600 mr-2" />
                    <span className="text-gray-600">Brainstorming ideas...</span>
                </div>
            ) : (
                <div className="space-y-3 mb-4">
                    {themeSuggestions.map((suggestion, index) => (
                        <button
                            key={index}
                            onClick={() => handleSelectSuggestion(suggestion.text)}
                            className={`w-full text-left p-3 rounded-lg border transition 
                ${themePrompt === suggestion.text ? 'border-blue-600 bg-blue-50' : 'border-gray-300 hover:bg-gray-50'}`}
                        >
                            <h3 className="font-medium">{suggestion.title}</h3>
                            <p className="text-sm text-gray-600">{suggestion.text}</p>
                        </button>
                    ))}
                </div>
            )}
            {/* Custom prompt textarea */}
            <textarea
                rows={3}
                className="w-full border border-gray-300 rounded-lg p-3 mb-4"
                placeholder="Or write your own story idea..."
                value={themePrompt}
                onChange={(e) => setThemePrompt(e.target.value)}
            />
            {/* Generate/Continue button */}
            <button
                onClick={handleCreateStory}
                disabled={!themePrompt.trim()}
                className={`w-full py-3 rounded-lg text-white text-lg font-medium 
          ${themePrompt.trim() ? 'bg-[#212121] hover:bg-black' : 'bg-gray-300 cursor-not-allowed'}`}
            >
                {themePrompt.trim() ? 'Generate Story Preview' : 'Select or type a theme'}
            </button>
        </div>
    );
}