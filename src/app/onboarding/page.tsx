import React from 'react';
import { OnboardingProvider } from '@/lib/context/onboarding-provider';
import { OnboardingWizard } from './onboarding-wizard';

export default function OnboardingPage() {
    return (
        <OnboardingProvider>
            <OnboardingWizard />
        </OnboardingProvider>
    );
}