'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useOnboarding } from '@/lib/context/onboarding-provider';
import { Smile, Compass, Heart, Eye, Moon, BookOpen, Square, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SpeechBubble } from './speech-bubble';

const TONE_OPTIONS = [
  { value: 'Funny', label: 'Funny & Playful', Icon: Smile },
  { value: 'Adventure', label: 'Adventurous & Exciting', Icon: Compass },
  { value: 'Heartwarming', label: 'Heartwarming & Sweet', Icon: Heart },
  { value: 'Mystery', label: 'Mysterious & Surprising', Icon: Eye },
  { value: 'Inspirational', label: 'Inspiring & Uplifting', Icon: Smile },
  { value: 'Relaxing', label: 'Calming & Relaxing', Icon: Moon },
  { value: 'Creative', label: 'Imaginative & Creative', Icon: BookOpen },
];

export function ToneStep() {
  const { tone, setTone, goToNextStep, goToPrevStep, currentStep } = useOnboarding();
  const [selectedTones, setSelectedTones] = useState<string[]>(tone || []);

  const fallback = "How do you want your child to feel when experiencing this story? Choose below!";

  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    setSelectedTones(tone || []);
  }, [tone]);

  const questionMap: Record<string, string> = {
    Funny: "Ready to spark joy and laughter? Let's have some fun!",
    Adventure: "Buckle up! Let's take your child on an unforgettable adventure!",
    Heartwarming: "Beautiful choice! Prepare for cozy and heartwarming moments!",
    Mystery: "Exciting! A thrilling mystery awaits your little detective!",
    Inspirational: "Great pick! Time to inspire your child with uplifting stories!",
    Relaxing: "Lovely! Let's create a soothing and relaxing experience!",
    Creative: "Fantastic! Get ready to unlock creativity and imagination!",
  };

  const isFirstEntryRef = useRef(true);
  const animationRef = useRef<NodeJS.Timeout | null>(null);

  const animateText = (text: string) => {
    if (animationRef.current) {
      clearInterval(animationRef.current);
      animationRef.current = null;
    }
    setDisplayedText('');
    let idx = 0;
    animationRef.current = setInterval(() => {
      setDisplayedText(text.slice(0, idx + 1));
      idx++;
      if (idx >= text.length) {
        if (animationRef.current) {
          clearInterval(animationRef.current);
          animationRef.current = null;
        }
      }
    }, 30);
  };

  useEffect(() => {
    if (isFirstEntryRef.current) {
      animateText(fallback);
      isFirstEntryRef.current = false;
    } else if (currentStep === 1) {
      if (animationRef.current) {
        clearInterval(animationRef.current);
        animationRef.current = null;
      }
      setDisplayedText(fallback);
    }
    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [currentStep, fallback]);

  return (
    <div className="flex flex-col px-6 pb-8 justify-center">
      {/* Animated question bubble */}
      <SpeechBubble
        message={displayedText}
        animateIn={isFirstEntryRef.current}
        heightClass="h-24"
      />

      {/* Multi-select tone list */}
      <div className="space-y-3 mb-8">
        {TONE_OPTIONS.map(({ value, label, Icon }) => {
          const isSelected = selectedTones.includes(value);
          return (
            <div
              key={value}
              onClick={() => {
                const wasSelected = isSelected;
                const newSelected = wasSelected
                  ? selectedTones.filter(v => v !== value)
                  : [...selectedTones, value];
                setSelectedTones(newSelected);
                setTone(newSelected);
                if (!wasSelected) {
                  const fullText = questionMap[value] || fallback;
                  animateText(fullText);
                }
              }}
              className={`flex items-center justify-between px-4 py-3 rounded-lg border-2 transition cursor-pointer ${
                isSelected ? 'bg-blue-100 border-blue-600' : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Icon className={`w-5 h-5 ${isSelected ? 'text-blue-600' : 'text-gray-700'}`} />
                <span className={`${isSelected ? 'text-blue-600' : 'text-gray-900'}`}>{label}</span>
              </div>
              {isSelected ? (
                <CheckSquare className="w-5 h-5 text-blue-600" />
              ) : (
                <Square className="w-5 h-5 text-gray-400" />
              )}
            </div>
          );
        })}
      </div>

      {/* Navigation buttons */}
      <div className="mt-auto space-y-2">
        <Button
          onClick={() => {
            setTone(selectedTones);
            goToNextStep();
          }}
          disabled={selectedTones.length === 0}
          className="w-full"
        >
          Continue
        </Button>
        <Button variant="link" onClick={goToPrevStep} className="w-full text-sm">
          Back
        </Button>
      </div>
    </div>
  );
}