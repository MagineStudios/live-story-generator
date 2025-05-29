'use client';

import React, { ReactNode } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface SpeechBubbleProps {
    /** The text or JSX to display inside the bubble */
    message: ReactNode;
    /** Path to the avatar image (e.g. '/onboarding/duo.png') */
    avatarSrc?: string;
    /** True to animate in, false to render instantly */
    animateIn?: boolean;
    /** Optional fixed height (e.g. 'h-24') */
    heightClass?: string;
    /** Position the speech bubble differently based on layout needs */
    position?: 'left' | 'right' | 'top';
}

export function SpeechBubble({
                                 message,
                                 avatarSrc = '/onboarding/duo.png',
                                 animateIn = true,
                                 heightClass,
                                 position = 'right',
                             }: SpeechBubbleProps) {
    // Animation classes using Tailwind
    const animationClass = animateIn 
        ? 'animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-300' 
        : '';

    // Position-specific classes and bubble-tail styles
    let containerClasses = "";
    let bubbleClasses = "bg-white p-4 sm:p-5 rounded-2xl shadow-[0_3px_8px_rgba(0,0,0,0.2)] flex items-center"; // Enhanced shadow with flex
    let caretClasses = "";
    let tailElement = null;

    switch (position) {
        case 'left':
            containerClasses = "flex items-start";
            bubbleClasses += " ml-4";
            caretClasses = "absolute w-4 h-4 bg-white rotate-45 left-0 top-1/2 -translate-y-1/2 -translate-x-1.5 shadow-[-3px_0px_4px_rgba(0,0,0,0.06)]"; // Left-pointing caret shadow
            tailElement = <div className={caretClasses}></div>;
            break;
        case 'right':
            containerClasses = "flex items-start flex-row-reverse";
            bubbleClasses += " mr-4";
            caretClasses = "absolute w-4 h-4 bg-white rotate-45 right-0 top-1/2 -translate-y-1/2 translate-x-1.5 shadow-[2px_0px_4px_rgba(0,0,0,0.06)]"; // Right-pointing caret shadow
            tailElement = <div className={caretClasses}></div>;
            break;
        case 'top':
            containerClasses = "flex flex-col items-center";
            bubbleClasses += " mb-4";
            caretClasses = "absolute w-4 h-4 bg-white rotate-45 bottom-0 left-1/2 -translate-x-1/2 translate-y-1.5 shadow-[0px_2px_4px_rgba(0,0,0,0.08)]"; // Bottom-pointing caret shadow
            tailElement = <div className={caretClasses}></div>;
            break;
    }

    return (
        <div className={cn(containerClasses, 'mb-6')}>
            {position !== 'top' && (
                <div className="flex-shrink-0">
                    <Image
                        src={avatarSrc}
                        alt="Magic Story mascot"
                        width={80}
                        height={80}
                        className="rounded-full w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24"
                    />
                </div>
            )}
            <div
                className={cn("relative flex-1", animationClass)}
            >
                <div className={cn(bubbleClasses, 'relative', heightClass)}>
                    <div className="text-sm sm:text-base lg:text-lg font-nunito leading-relaxed w-full">{message}</div>
                    {/* The caret/tail with its own shadow */}
                    {tailElement}
                </div>
            </div>
            {position === 'top' && (
                <div className="flex-shrink-0">
                    <Image
                        src={avatarSrc}
                        alt="Magic Story mascot"
                        width={100}
                        height={100}
                        className="rounded-full w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28"
                    />
                </div>
            )}
        </div>
    );
}