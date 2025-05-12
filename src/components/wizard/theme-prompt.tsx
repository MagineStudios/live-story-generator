'use client';
import React, { useEffect } from 'react';
import { useStoryBuilder } from '@/lib/context/story-builder-context';
import { Textarea as _Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

export default function ThemePrompt() {
    const {
        visualStyle,
        themePrompt,
        setThemePrompt,
        themeSuggestions,
        generateThemeSuggestions,
        isLoadingSuggestions,
        createStory,
        goToNextStep
    } = useStoryBuilder();

    // Generate suggestions when component mounts
    useEffect(() => {
        if (visualStyle && themeSuggestions.length === 0) {
            generateThemeSuggestions();
        }
    }, [visualStyle, themeSuggestions.length, generateThemeSuggestions]);

    const handleSuggestionSelect = (suggestion: string) => {
        setThemePrompt(suggestion);
    };

    const handleCustomPromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setThemePrompt(e.target.value);
    };

    const handleGenerateStory = async () => {
        await createStory();
        goToNextStep();
    };

    return (
        <div className="flex flex-col flex-1 px-4 pb-6">
            <h1 className="text-3xl font-bold mb-2">
                {visualStyle ? `Custom ${visualStyle.name}-themed story` : "Select a Theme"}
            </h1>
            <p className="text-gray-600 mb-6">
                Select one of our story themes or customize your own to spark creativity and endless building possibilities.
            </p>

            {/* Theme suggestions */}
            {isLoadingSuggestions ? (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-700 mr-2" />
                    <span>Generating theme ideas...</span>
                </div>
            ) : (
                <div className="space-y-3 mb-6">
                    {themeSuggestions.map((suggestion, index) => (
                        <button
                            key={index}
                            onClick={() => handleSuggestionSelect(suggestion.text)}
                            className={`
                w-full text-left p-4 rounded-lg bg-gray-100 hover:bg-gray-200
                ${themePrompt === suggestion.text ? 'ring-2 ring-blue-500 bg-gray-200' : ''}
                ${themePrompt === suggestion.text ? 'relative overflow-hidden' : ''}
              `}
                        >
                            {themePrompt === suggestion.text && (
                                <div className="absolute inset-0 bg-black/5"></div>
                            )}
                            <h3 className="font-medium mb-1">{suggestion.title}</h3>
                            <p className="text-sm text-gray-600">{suggestion.text}</p>
                        </button>
                    ))}
                </div>
            )}

            {/* Custom theme input */}
            <div className="mb-6">
                <button
                    className="w-full text-left p-4 rounded-lg bg-gray-100 hover:bg-gray-200 mb-2"
                >
                    Remix story
                </button>
            </div>

            {/* Generate button */}
            <button
                onClick={handleGenerateStory}
                disabled={!themePrompt.trim() || isLoadingSuggestions}
                className={`
          w-full py-5 rounded-lg text-lg font-medium mt-auto
          ${(!themePrompt.trim() || isLoadingSuggestions)
                    ? 'bg-gray-200 text-gray-500'
                    : 'bg-[#212121] text-white'}
        `}
            >
                Generate magic
            </button>
        </div>
    );
}