'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { Card } from '@/components/ui/card';
import { WelcomeStep } from './steps/WelcomeStep';
import { StreamingServicesStep } from './steps/StreamingServicesStep';
import { RegionPreferencesStep } from './steps/RegionPreferencesStep';
import { ContentPreferencesStep } from './steps/ContentPreferencesStep';
import { CompletionStep } from './steps/CompletionStep';
import { ProgressIndicator } from './ProgressIndicator';

interface OnboardingWizardProps {
  onComplete?: () => void;
  onSkip?: () => void;
}

export function OnboardingWizard({ onComplete, onSkip }: OnboardingWizardProps) {
  const { status, progress, isLoading, error, getStatus, getProgress, trackAnalyticsEvent, clearError } =
    useOnboarding();

  useEffect(() => {
    getStatus();
    getProgress();
  }, [getStatus, getProgress]);

  useEffect(() => {
    if (status?.currentStep) {
      trackAnalyticsEvent('step_started', status.currentStep);
    }
  }, [status?.currentStep, trackAnalyticsEvent]);

  const currentStep = status?.currentStep || 1;

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <WelcomeStep />;
      case 2:
        return <StreamingServicesStep />;
      case 3:
        return <RegionPreferencesStep />;
      case 4:
        return <ContentPreferencesStep />;
      case 5:
        return <CompletionStep onComplete={onComplete} />;
      default:
        return <WelcomeStep />;
    }
  };

  if (isLoading && !status) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-foreground-muted">Loading your onboarding...</p>
        </div>
      </div>
    );
  }

  if (status?.isCompleted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md mx-auto text-center p-8">
          <div className="mb-4 flex justify-center">
            <Image
              src="/logo-transparent.png"
              alt="GeoLeap Logo"
              width={80}
              height={80}
              priority
            />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Welcome to GeoLeap!</h2>
          <p className="text-foreground-muted mb-6">
            You&apos;ve already completed your onboarding. You can update your preferences anytime in Settings.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Progress Indicator */}
          {progress && (
            <div className="mb-8">
              <ProgressIndicator
                currentStep={currentStep}
                totalSteps={progress.totalSteps}
                progress={progress.progress}
                timeEstimate={progress.timeEstimate}
                canSkip={progress.canSkip}
                canGoBack={progress.canGoBack}
                onSkip={onSkip}
              />
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-lg">
              <div className="flex items-center justify-between">
                <p className="text-error font-medium">{error}</p>
                <button onClick={clearError} className="text-error hover:text-error/80" aria-label="Clear error">
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Main Step Content */}
          <div className="relative">{renderStep()}</div>
        </div>
      </div>
    </div>
  );
}
