'use client';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useOnboarding } from '@/lib/context/onboarding-provider';
import { Smile, BookOpen, Moon, Gift, Square, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

const GOAL_OPTIONS = [
    { value: 'Have Fun', label: 'Just for fun', Icon: Smile },
    { value: 'Learn Something', label: 'Teach a lesson or skill', Icon: BookOpen },
    { value: 'Bedtime', label: 'Bedtime story (calm & soothing)', Icon: Moon },
    { value: 'Gift', label: 'A personalized gift for someone', Icon: Gift },
];

export function GoalStep() {
    const { setStoryGoal, goToNextStep } = useOnboarding();
    const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
    const [displayedText, setDisplayedText] = useState('');
    const question = "What's the goal of your story?";

    // Typing animation for the question bubble
    useEffect(() => {
        let idx = 0;
        const interval = setInterval(() => {
            setDisplayedText(question.slice(0, idx + 1));
            idx++;
            if (idx >= question.length) clearInterval(interval);
        }, 50);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex flex-col flex-1 px-6 pb-8 justify-center">
            {/* Animated question bubble */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-gray-100 p-4 rounded-lg shadow mb-6 max-w-xs"
            >
                <p className="text-lg">{displayedText}</p>
            </motion.div>

            {/* Multi-select goal list */}
            <div className="space-y-3 mb-8">
              {GOAL_OPTIONS.map(({ value, label, Icon }) => {
                const isSelected = selectedGoals.includes(value);
                return (
                  <div
                    key={value}
                    onClick={() => {
                      setSelectedGoals(prev =>
                        prev.includes(value)
                          ? prev.filter(v => v !== value)
                          : [...prev, value]
                      );
                    }}
                    className={`flex items-center justify-between px-4 py-3 rounded-lg border-2 transition cursor-pointer
                      ${isSelected
                        ? 'bg-blue-100 border-blue-600'
                        : 'border-gray-300 hover:bg-gray-50'}`}
                  >
                    <div className="flex items-center space-x-2">
                      <Icon className={`w-5 h-5 ${isSelected ? 'text-blue-600' : 'text-gray-700'}`} />
                      <span className={`${isSelected ? 'text-blue-600' : 'text-gray-900'}`}>{label}</span>
                    </div>
                    {isSelected
                      ? <CheckSquare className="w-5 h-5 text-blue-600" />
                      : <Square className="w-5 h-5 text-gray-400" />
                    }
                  </div>
                );
              })}
            </div>

            {/* Continue button */}
            <Button
                onClick={() => {
                    // Assuming your schema now expects an array
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