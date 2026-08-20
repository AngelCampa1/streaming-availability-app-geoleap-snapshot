'use client';

import React, { useEffect } from 'react';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function OnboardingPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  // BUG-003 FIX: Add authentication guard
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login?redirect=/onboarding');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleComplete = () => {
    // Redirect to home page after completion
    router.push('/');
  };

  const handleSkip = () => {
    // Redirect to home page if skipped
    router.push('/');
  };

  // Show loading while checking auth
  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <OnboardingProvider>
      <OnboardingWizard onComplete={handleComplete} onSkip={handleSkip} />
    </OnboardingProvider>
  );
}
