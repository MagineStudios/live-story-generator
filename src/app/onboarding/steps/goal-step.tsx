'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useOnboarding } from '@/lib/context/onboarding-provider';
import { Smile, BookOpen, Moon, Gift, Square, CheckSquare, Heart, PawPrint } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SpeechBubble } from './speech-bubble';

const GOAL_OPTIONS = [
    { value: 'Adventure', label: 'Exciting adventures', Icon: Smile },
    { value: 'Educational', label: 'Stories to teach valuable lessons', Icon: BookOpen },
    { value: 'Bedtime', label: 'Soothing bedtime tales', Icon: Moon },
    { value: 'Gift', label: 'Stories as heartfelt gifts', Icon: Gift },
    { value: 'Family', label: 'Celebrating family moments', Icon: Heart },
    { value: 'PetStories', label: 'Fun adventures starring pets', Icon: PawPrint }
];

export function GoalStep() {
    const { storyGoal, setStoryGoal, goToNextStep, currentStep } = useOnboarding();
    const [selectedGoals, setSelectedGoals] = useState<string[]>(storyGoal || []);

    const fallback = "Let's pick a goal below and start creating a wonderful story for your child!";
    const [displayedText, setDisplayedText] = useState('');
    const isFirstEntryRef = useRef(true);
    const animationRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
      if (storyGoal && storyGoal.length > 0 && selectedGoals.length === 0) {
        console.log('Syncing goals from context:', storyGoal);
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
        } else if (currentStep === 0) {
            if (animationRef.current) clearInterval(animationRef.current);
            setDisplayedText(fallback);
        }
    }, [currentStep]);

    return (
        <div className="flex flex-col px-6 pb-8 justify-center">
            <SpeechBubble message={displayedText} animateIn={isFirstEntryRef.current} heightClass="h-24" />
            <div className="space-y-3 mb-8">
                {GOAL_OPTIONS.map(({ value, label, Icon }) => {
                    const isSelected = selectedGoals.includes(value);
                    console.log({value, isSelected});
                    return (
                        <div
                            key={value}
                            onClick={() => {
                                const wasSelected = isSelected;
                                const newSelected = wasSelected
                                    ? selectedGoals.filter(v => v !== value)
                                    : [...selectedGoals, value];
                                setSelectedGoals(newSelected);
                                setStoryGoal(newSelected);
                                if (!wasSelected) animateText(questionMap[value] || fallback);
                            }}
                            className={`flex items-center justify-between px-4 py-3 rounded-lg border-2 transition cursor-pointer ${isSelected ? 'bg-blue-100 border-blue-600' : 'border-gray-300 hover:bg-gray-50'}`}
                        >
                            <div className="flex items-center space-x-2">
                                <Icon className={`w-5 h-5 ${isSelected ? 'text-blue-600' : 'text-gray-700'}`} />
                                <span className={`${isSelected ? 'text-blue-600' : 'text-gray-900'}`}>{label}</span>
                            </div>
                            {isSelected ? <CheckSquare className="w-5 h-5 text-blue-600" /> : <Square className="w-5 h-5 text-gray-400" />}
                        </div>
                    );
                })}
            </div>
            <Button
                onClick={() => {
                    setStoryGoal(selectedGoals);
                    goToNextStep();
                }}
                disabled={selectedGoals.length === 0}
                className="w-full"
            >
                Continue
            </Button>
        </div>
    );
}