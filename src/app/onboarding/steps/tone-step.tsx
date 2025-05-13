'use client';
import React, { useState } from 'react';
import { useOnboarding } from '@/lib/context/onboarding-provider';
import { Square, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TONE_OPTIONS = [
    { value: 'Funny', label: 'Funny & Playful' },
    { value: 'Adventure', label: 'Adventurous & Exciting' },
    { value: 'Heartwarming', label: 'Heartwarming & Sweet' },
    { value: 'Mystery', label: 'Mysterious & Surprising' },
];

export function ToneStep() {
  const { tone, setTone, goToNextStep, goToPrevStep } = useOnboarding();
  // Initialize local selection from context
  const [selectedTones, setSelectedTones] = useState<string[]>(tone || []);

  const toggleTone = (value: string) => {
    setSelectedTones(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  const handleContinue = () => {
    setTone(selectedTones);
    goToNextStep();
  };

  return (
    <div className="flex flex-col flex-1 px-6 pb-8 justify-center">
      <h1 className="text-2xl font-bold mb-4">Choose a tone for your story</h1>
      <p className="text-gray-600 mb-6">Select all that apply</p>

      <div className="space-y-3 mb-8">
        {TONE_OPTIONS.map(option => {
          const isSelected = selectedTones.includes(option.value);
          return (
            <div
              key={option.value}
              onClick={() => toggleTone(option.value)}
              className={`flex items-center justify-between px-4 py-3 rounded-lg border-2 transition cursor-pointer
                ${isSelected
                  ? 'bg-blue-100 border-blue-600'
                  : 'border-gray-300 hover:bg-gray-50'}`}
            >
              <span className={`${isSelected ? 'text-blue-600' : 'text-gray-900'}`}>
                {option.label}
              </span>
              {isSelected ? (
                <CheckSquare className="w-5 h-5 text-blue-600" />
              ) : (
                <Square className="w-5 h-5 text-gray-400" />
              )}
            </div>
          );
        })}
      </div>

      <Button onClick={handleContinue} disabled={selectedTones.length === 0} className="w-full">
        Continue
      </Button>
      <Button variant="link" onClick={goToPrevStep} className="w-full mt-2 text-sm">
        Back
      </Button>
    </div>
  );
}