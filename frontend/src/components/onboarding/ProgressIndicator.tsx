'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  progress: number;
  timeEstimate: string;
  canSkip: boolean;
  canGoBack: boolean;
  onSkip?: () => void;
}

export function ProgressIndicator({
  currentStep,
  totalSteps,
  progress,
  timeEstimate,
  canSkip,
  canGoBack: _canGoBack,  
  onSkip,
}: ProgressIndicatorProps) {
  const steps = [
    { number: 1, title: 'Welcome', description: 'Get started' },
    { number: 2, title: 'Services', description: 'Choose your streaming services' },
    { number: 3, title: 'Regions', description: 'Select your preferred regions' },
    { number: 4, title: 'Content', description: 'Pick your content preferences' },
    { number: 5, title: 'Complete', description: 'All done!' },
  ];

  return (
    <div className="w-full">
      {/* Progress Bar */}
      <div className="relative mb-8">
        <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-background-muted">
          <div
            style={{ width: `${progress}%` }}
            className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary transition-all duration-500"
          />
        </div>

        {/* Step Indicators */}
        <div className="flex justify-between relative">
          {steps.map(step => (
            <div key={step.number} className="flex flex-col items-center">
              <div
                className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-full border-2 text-sm font-semibold transition-all duration-300',
                  step.number < currentStep
                    ? 'bg-primary border-primary text-primary-foreground'
                    : step.number === currentStep
                      ? 'bg-primary border-primary text-primary-foreground ring-4 ring-primary/20'
                      : 'bg-background border-border text-foreground-muted'
                )}
              >
                {step.number < currentStep ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step.number
                )}
              </div>
              <div className="text-center mt-2">
                <div
                  className={cn(
                    'text-sm font-medium',
                    step.number === currentStep
                      ? 'text-foreground'
                      : step.number < currentStep
                        ? 'text-foreground'
                        : 'text-foreground-muted'
                  )}
                >
                  {step.title}
                </div>
                <div className="text-xs text-foreground-muted hidden sm:block">{step.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Progress Information */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-surface p-4 rounded-lg border">
        <div className="flex items-center space-x-4 mb-4 sm:mb-0">
          <div className="text-sm">
            <span className="text-foreground font-medium">
              Step {currentStep} of {totalSteps}
            </span>
            <span className="text-foreground-muted ml-2">• {Math.round(progress)}% complete</span>
          </div>
          <div className="text-sm text-foreground-muted">{timeEstimate}</div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2">
          {canSkip && onSkip && (
            <Button variant="ghost" size="sm" onClick={onSkip} className="text-foreground-muted hover:text-foreground">
              Skip for now
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
