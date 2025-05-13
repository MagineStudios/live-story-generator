// components/onboarding/SpeechBubble.tsx
'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';

interface SpeechBubbleProps {
    /** The text to display inside the bubble */
    message: string;
    /** Path to the avatar image (e.g. '/onboarding/duo.png') */
    avatarSrc?: string;
    /** True to animate in, false to render instantly */
    animateIn?: boolean;
    /** Optional fixed height (e.g. 'h-24') */
    heightClass?: string;
}

export function SpeechBubble({
     message,
     avatarSrc = '/onboarding/duo.png',
     animateIn = true,
     heightClass = 'h-24',
}: SpeechBubbleProps) {
    const motionProps = animateIn
        ? { initial: { opacity: 0, y: -10 }, animate: { opacity: 1, y: 0 } }
        : { initial: false, animate: false };

    return (
        <motion.div
            {...motionProps}
            transition={{ duration: 0.5 }}
            className={`bg-gray-100 p-4 pt-3 rounded-lg shadow mb-6 max-w-xs ${heightClass}`}
        >
            <div className="flex h-full space-x-3">
                <Image
                    src={avatarSrc}
                    alt="Magic Story mascot"
                    width={60}
                    height={60}
                    className="flex-shrink-0 self-center"
                />
                <div className="flex-1">
                    <p className="text-base">{message}</p>
                </div>
            </div>
        </motion.div>
    );
}