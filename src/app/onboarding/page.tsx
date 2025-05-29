'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { OnboardingProvider } from '@/lib/context/onboarding-provider';
import { OnboardingWizard } from './onboarding-wizard';

export default function OnboardingPage() {
    const router = useRouter();
    
    useEffect(() => {
        // Check for reset parameter
        const urlParams = new URLSearchParams(window.location.search);
        const shouldReset = urlParams.get('reset') === 'true';
        
        if (shouldReset) {
            // Clear any existing data immediately
            localStorage.removeItem('magicstory_onboarding');
            localStorage.removeItem('magicstory_tempId');
            
            // Clean URL and reload to ensure fresh state
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.delete('reset');
            newUrl.searchParams.set('step', '1');
            
            // Use replace to avoid adding to history
            window.history.replaceState({}, '', newUrl.toString());
        }
    }, [router]);
    
    return (
        <OnboardingProvider>
            <OnboardingWizard />
        </OnboardingProvider>
    );
}
