'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useOnboarding } from '@/lib/context/onboarding-provider';
import { Laugh, Heart, Star, Sparkles, BookOpen, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ContinueButton } from '@/components/ui/continue-button';
import { SpeechBubble } from './speech-bubble';
import { motion } from 'framer-motion';

const TONE_OPTIONS = [
  { value: 'Funny', label: 'Funny & Silly', Icon: Laugh, color: 'bg-yellow-100 text-yellow-600' },
  { value: 'Heartwarming', label: 'Heartwarming', Icon: Heart, color: 'bg-red-100 text-red-500' },
  { value: 'Magical', label: 'Magical', Icon: Star, color: 'bg-purple-100 text-purple-600' },
  { value: 'Whimsical', label: 'Whimsical', Icon: Sparkles, color: 'bg-blue-100 text-blue-500' },
  { value: 'Educational', label: 'Educational', Icon: BookOpen, color: 'bg-green-100 text-green-600' },
  { value: 'Action', label: 'Action-packed', Icon: Zap, color: 'bg-orange-100 text-orange-500' }
];

export function ToneStep() {
  const { tone, setTone, goToNextStep } = useOnboarding();
  const [selectedTones, setSelectedTones] = useState<string[]>(tone || []);

  const fallback = "What tone should the story have?";
  const [displayedText, setDisplayedText] = useState('');
  const isFirstEntryRef = useRef(true);
  const animationRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (tone && tone.length > 0 && selectedTones.length === 0) {
      setSelectedTones(tone);
    }
  }, [tone, selectedTones]);

  const toneMap: Record<string, string> = {
    'Funny': "Perfect! We'll make your story silly and fun!",
    'Heartwarming': "Great choice! Let's create something that warms the heart.",
    'Magical': "Magic it is! Your story will be full of wonder.",
    'Whimsical': "Wonderful! We'll create a whimsical tale full of surprises!",
    'Educational': "Excellent! A story that's both fun and educational.",
    'Action': "Action-packed adventure coming right up!"
  };

  const animateText = (text: string) => {
    if (animationRef.current) clearInterval(animationRef.current);
    setDisplayedText('');
    let idx = 0;
    animationRef.current = setInterval(() => {
      setDisplayedText(text.slice(0, idx + 1));
      idx++;
      if (idx >= text.length && animationRef.current) clearInterval(animationRef.current);
    }, 20);
  };

  useEffect(() => {
    if (isFirstEntryRef.current) {
      animateText(fallback);
      isFirstEntryRef.current = false;
    }
  }, []);

  return (
      <div className="flex flex-col px-4 sm:px-6 pb-8 justify-center">
        <div className="mb-6">
          <SpeechBubble
              message={displayedText}
              animateIn={isFirstEntryRef.current}
              heightClass="min-h-[60px]"
              position="left"
          />
        </div>

        <motion.div
            className="space-y-3 mb-8"
            initial="hidden"
            animate="visible"
            variants={{
              visible: {
                transition: {
                  staggerChildren: 0.07
                }
              }
            }}
            role="group"
            aria-label="Select story tone options"
        >
          {TONE_OPTIONS.map(({ value, label, Icon, color }) => {
            const isSelected = selectedTones.includes(value);

            return (
                <motion.div
                    key={value}
                    variants={{
                      hidden: { y: 20, opacity: 0 },
                      visible: { y: 0, opacity: 1 }
                    }}
                    transition={{ duration: 0.4 }}
                >
                  <div
                      onClick={() => {
                        const wasSelected = isSelected;
                        const newSelected = wasSelected
                            ? selectedTones.filter(v => v !== value)
                            : [...selectedTones, value];
                        setSelectedTones(newSelected);
                        setTone(newSelected);
                        if (!wasSelected) animateText(toneMap[value] || fallback);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          const wasSelected = isSelected;
                          const newSelected = wasSelected
                              ? selectedTones.filter(v => v !== value)
                              : [...selectedTones, value];
                          setSelectedTones(newSelected);
                          setTone(newSelected);
                          if (!wasSelected) animateText(toneMap[value] || fallback);
                        }
                      }}
                      role="checkbox"
                      aria-checked={isSelected}
                      aria-label={`${label} tone for your story`}
                      tabIndex={0}
                      className={cn(
                          'flex items-center justify-between px-4 py-3 rounded-2xl transition-all cursor-pointer min-h-[44px]',
                          isSelected
                              ? 'bg-[#E6F4FA] border border-[#00ABF0]/30'
                              : 'bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-gray-300 active:bg-gray-200',
                          'focus:outline-none focus:ring-2 focus:ring-[#00ABF0]/20'
                      )}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={cn(
                          'flex-shrink-0 min-w-[44px] min-h-[44px] rounded-md flex items-center justify-center transition-all',
                          isSelected ? color : 'bg-gray-100 text-gray-600'
                      )}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className={cn(
                          'font-medium transition-all',
                          isSelected ? 'text-[#00ABF0]' : 'text-gray-800'
                      )}>
                                        {label}
                                    </span>
                    </div>

                    {/* Checkbox */}
                    <div className={cn(
                        'min-w-[44px] min-h-[44px] flex-shrink-0 rounded-full flex items-center justify-center transition-all',
                        isSelected ? 'bg-[#00ABF0]' : 'bg-white border border-gray-300'
                    )}>
                      {isSelected && (
                          <motion.svg
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              width="16"
                              height="16"
                              viewBox="0 0 16 16"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                                d="M13.3334 4L6.00008 11.3333L2.66675 8"
                                stroke="white"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                          </motion.svg>
                      )}
                    </div>
                  </div>
                </motion.div>
            );
          })}
        </motion.div>

        {/* Continue button */}
        <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
        >
          <ContinueButton
              onClick={() => {
                setTone(selectedTones);
                goToNextStep();
              }}
              disabled={selectedTones.length === 0}
              className="w-full"
          />
        </motion.div>
      </div>
  );
}