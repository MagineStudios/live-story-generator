// app/(wizard)/theme/page.tsx
'use client';

import React, { JSX } from 'react';

import { useStoryBuilder } from '@/lib/context/story-builder-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';

export default function ThemePage(): JSX.Element {
  const {
    selectedElements: elements,
    uploadedImages: images,
    visualStyle: style,
    setThemePrompt,
  } = useStoryBuilder();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<
    { title: string; description: string; prompt: string }[]
  >([]);
  const [customTheme, setCustomTheme] = useState('');

  useEffect(() => {
    async function fetchSuggestions() {
      setLoading(true);
      try {
        const res = await fetch('/api/theme-suggestions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ elements, images, style }),
        });
        if (!res.ok) throw new Error('Failed to fetch theme suggestions');
        const data = await res.json();
        setSuggestions(data.suggestions);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }
    fetchSuggestions();
  }, [elements, images, style]);

  function handleSelectPrompt(prompt: string) {
    setThemePrompt(prompt);
    router.push('/create/generate');
  }

  function handleContinue() {
    if (customTheme.trim()) {
      setThemePrompt(customTheme.trim());
      router.push('/create/generate');
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Select a Theme</h1>
      {loading ? (
        <p className="text-center text-lg">Loading theme suggestions…</p>
      ) : (
        <>
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            {suggestions.map(({ title, description, prompt }) => (
              <button
                key={title}
                onClick={() => handleSelectPrompt(prompt)}
                className="border rounded-lg p-4 hover:shadow-lg transition-shadow flex flex-col"
                type="button"
              >
                <h2 className="text-xl font-semibold mb-2">{title}</h2>
                <p className="text-gray-600 flex-grow">{description}</p>
              </button>
            ))}
          </div>
          <div className="mb-4">
            <label htmlFor="customTheme" className="block mb-2 font-medium">
              Or enter a custom theme:
            </label>
            <input
              id="customTheme"
              type="text"
              value={customTheme}
              onChange={(e) => setCustomTheme(e.target.value)}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Enter your custom theme here"
            />
          </div>
          <button
            type="button"
            disabled={!customTheme.trim()}
            onClick={handleContinue}
            className={`px-6 py-3 rounded font-semibold text-white ${
              customTheme.trim()
                ? 'bg-indigo-600 hover:bg-indigo-700'
                : 'bg-gray-400 cursor-not-allowed'
            } transition-colors`}
          >
            Continue
          </button>
        </>
      )}
    </div>
  );
}

