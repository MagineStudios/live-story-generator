'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useOnboarding } from '@/lib/context/onboarding-provider';
import { Smile, BookOpen, Moon, Gift, Heart, PawPrint } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SpeechBubble } from './speech-bubble';
import { motion } from 'framer-motion';

// Updated goal options with icons matching the screenshot style
const GOAL_OPTIONS = [
    { value: 'Adventure', label: 'Exciting adventures', Icon: Smile, imageUrl: '/goals/adventure.png' },
    { value: 'Educational', label: 'Stories to teach lessons', Icon: BookOpen, imageUrl: '/goals/educational.png' },
    { value: 'Bedtime', label: 'Soothing bedtime tales', Icon: Moon, imageUrl: '/goals/bedtime.png' },
    { value: 'Gift', label: 'Heartfelt gift stories', Icon: Gift, imageUrl: '/goals/gift.png' },
    { value: 'Family', label: 'Family adventures', Icon: Heart, imageUrl: '/goals/family.png' },
    { value: 'PetStories', label: 'Fun with pets', Icon: PawPrint, imageUrl: '/goals/pets.png' }
];

export function GoalStep() {
    const { storyGoal, setStoryGoal, goToNextStep, currentStep } = useOnboarding();
    const [selectedGoals, setSelectedGoals] = useState<string[]>(storyGoal || []);

    const fallback = "Let's pick a goal for your story!";
    const [displayedText, setDisplayedText] = useState('');
    const isFirstEntryRef = useRef(true);
    const animationRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (storyGoal && storyGoal.length > 0 && selectedGoals.length === 0) {
            setSelectedGoals(storyGoal);
        }
    }, [storyGoal, selectedGoals]);

    const questionMap: Record<string, string> = {
        'Adventure': "Fantastic! Let's craft an exciting adventure for your little explorer!",
        'Educational': "Wonderful! Let's make learning fun and engaging!",
        'Bedtime': "Great choice! A calming bedtime story is coming right up!",
        'Gift': "Beautiful idea! Personalized stories make unforgettable gifts!",
        'Family': "Lovely! Family stories create lasting memories!",
        'PetStories': "Awesome! Pets and adventures! A perfect combination for smiles!"
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
        } else if (currentStep === 3) {
            if (animationRef.current) clearInterval(animationRef.current);
            setDisplayedText(fallback);
        }
    }, [currentStep]);

    return (
        <div className="flex flex-col px-6 pb-8 justify-center">
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
            >
                {GOAL_OPTIONS.map(({ value, label, imageUrl }) => {
                    const isSelected = selectedGoals.includes(value);

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
                                        ? selectedGoals.filter(v => v !== value)
                                        : [...selectedGoals, value];
                                    setSelectedGoals(newSelected);
                                    setStoryGoal(newSelected);
                                    if (!wasSelected) animateText(questionMap[value] || fallback);
                                }}
                                className={`flex items-center justify-between px-4 py-3 rounded-2xl transition-all cursor-pointer ${
                                    isSelected
                                        ? 'bg-[#E6F4FA] border border-[#00ABF0]/30'
                                        : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                                }`}
                            >
                                <div className="flex items-center space-x-3">
                                    {/* Custom image/icon instead of Lucide icon */}
                                    <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
                                        {/* If you have the actual images, use Image component */}
                                        <div className={`w-9 h-9 rounded-md flex items-center justify-center ${isSelected ? 'text-[#00ABF0]' : 'text-gray-700'}`}>
                                            {value === 'Adventure' && <Smile className="w-7 h-7" />}
                                            {value === 'Educational' && <BookOpen className="w-7 h-7" />}
                                            {value === 'Bedtime' && <Moon className="w-7 h-7" />}
                                            {value === 'Gift' && <Gift className="w-7 h-7" />}
                                            {value === 'Family' && <Heart className="w-7 h-7" />}
                                            {value === 'PetStories' && <PawPrint className="w-7 h-7" />}
                                        </div>
                                    </div>
                                    <span className={`font-medium ${isSelected ? 'text-[#00ABF0]' : 'text-gray-800'}`}>
                                        {label}
                                    </span>
                                </div>

                                {/* Checkbox */}
                                <div className={`w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center transition-all ${
                                    isSelected ? 'bg-[#00ABF0]' : 'bg-white border border-gray-300'
                                }`}>
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
                <Button
                    onClick={() => {
                        setStoryGoal(selectedGoals);
                        goToNextStep();
                    }}
                    disabled={selectedGoals.length === 0}
                    className={`w-full py-6 text-lg font-medium rounded-full transition-all duration-300 ${
                        selectedGoals.length === 0
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-[#4CAF50] hover:bg-[#43a047] text-white shadow-md hover:shadow-lg'
                    }`}
                >
                    Continue
                </Button>
            </motion.div>
        </div>
    );
}