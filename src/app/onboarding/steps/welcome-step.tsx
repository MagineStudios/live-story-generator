'use client';
import React, { useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useOnboarding } from '@/lib/context/onboarding-provider';
import { Button } from '@/components/ui/button';
import { SignInButton, useUser } from '@clerk/nextjs';
import { Sparkles } from 'lucide-react';

export function WelcomeStep() {
    const { goToNextStep } = useOnboarding();
    const { isLoaded, isSignedIn } = useUser();

    // Check if user is authenticated on load
    useEffect(() => {
        if (isLoaded && isSignedIn) {
            goToNextStep();
        }
    }, [isLoaded, isSignedIn, goToNextStep]);

    // Animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: { duration: 0.5 }
        }
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col px-6 pb-8 h-full"
        >
            <div className="w-full max-w-sm mx-auto flex flex-col justify-between h-full pt-12">
                {/* Logo and branding section */}
                <div className="flex flex-col items-center justify-center flex-1 mb-8">
                    <motion.div
                        variants={itemVariants}
                        className="relative mb-4"
                    >
                        <Image
                            src="/onboarding/duo.png"
                            alt="Magic Story mascot"
                            width={180}
                            height={180}
                            className="mx-auto"
                            priority
                        />
                        <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: [0, 1.2, 1], opacity: 1 }}
                            transition={{ delay: 0.8, duration: 0.5 }}
                            className="absolute -top-2 -right-2 bg-yellow-300 rounded-full p-2"
                        >
                            <Sparkles className="h-5 w-5 text-yellow-600" />
                        </motion.div>
                    </motion.div>

                    <motion.h1
                        variants={itemVariants}
                        className="text-4xl font-bold text-[#212121] mb-3 font-nunito"
                    >
                        Magic Story
                    </motion.h1>

                    <motion.p
                        variants={itemVariants}
                        className="text-gray-600 text-xl font-nunito"
                    >
                        Endless adventures for your child.
                    </motion.p>
                </div>

                {/* Button section */}
                <div className="w-full space-y-4">
                    <motion.div variants={itemVariants}>
                        <Button
                            onClick={goToNextStep}
                            className="w-full py-6 text-lg font-medium rounded-full bg-[#4CAF50] hover:bg-[#43a047] text-white cursor-pointer font-nunito transition-all duration-300 shadow-md hover:shadow-lg"
                        >
                            GET STARTED
                        </Button>
                    </motion.div>

                    <motion.div variants={itemVariants}>
                        <SignInButton mode="modal" forceRedirectUrl="/onboarding">
                            <Button
                                variant="outline"
                                className="w-full py-6 text-lg font-medium rounded-full border-2 border-[#4CAF50] text-[#4CAF50] hover:bg-[#4CAF50]/10 cursor-pointer font-nunito transition-all duration-300"
                            >
                                I ALREADY HAVE AN ACCOUNT
                            </Button>
                        </SignInButton>
                    </motion.div>
                </div>
            </div>
        </motion.div>
    );
}