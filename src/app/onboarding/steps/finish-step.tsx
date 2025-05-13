'use client';
import React, { useEffect, useState } from 'react';
import { useOnboarding } from '@/lib/context/onboarding-provider';
import { SignUp, useAuth } from '@clerk/nextjs';
import Lottie from 'lottie-react';
// import confettiAnimation from '@/public/animations/confetti.json';
import Link from 'next/link';

export function FinishStep() {
    const { storyGoal } = useOnboarding();
    const { userId } = useAuth();
    const [showConfetti, setShowConfetti] = useState(false);

    useEffect(() => {
        // When a userId becomes available (sign up complete), trigger celebration
        if (userId) {
            setShowConfetti(true);
            // The actual migration of data is handled in OnboardingProvider's effect
        }
    }, [userId]);

    return (
        <div className="flex flex-col flex-1 px-6 pb-8 items-center justify-center text-center">
            {showConfetti && (
                <div className="absolute inset-0 pointer-events-none">
                    {/*<Lottie animationData={confettiAnimation} loop={false} />*/}
                </div>
            )}
            <h1 className="text-3xl font-bold mb-4">
                Hooray! Your story is ready.
            </h1>
            <p className="text-gray-700 mb-6">
                {userId ? (
                    <>Your story has been saved to your account.</>
                ) : (
                    <>You created a story {storyGoal ? "to " + storyGoal.toLowerCase() : ''}! Create an account to save it and continue the magic.</>
                )}
            </p>
            {!userId && (
                <div className="w-full max-w-xs mx-auto mb-4">
                    {/* Clerk SignUp component; after successful sign-up, userId will be set and migration will occur */}
                    <SignUp path="/onboarding/sign-up" routing="path" signInUrl="/sign-in" forceRedirectUrl="/g" />
                </div>
            )}
            {userId && (
                <div className="mt-4">
                    <Link href="/" className="inline-block px-6 py-3 bg-[#212121] text-white text-lg font-medium rounded-lg hover:bg-black">
                        Go to My Stories
                    </Link>
                </div>
            )}
        </div>
    );
}