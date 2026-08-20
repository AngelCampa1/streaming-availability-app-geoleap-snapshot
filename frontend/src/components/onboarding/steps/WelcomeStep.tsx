'use client';

import React from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useOnboarding } from '@/contexts/OnboardingContext';

export function WelcomeStep() {
  const { updateStep, trackAnalyticsEvent, isLoading } = useOnboarding();

  const handleGetStarted = async () => {
    await trackAnalyticsEvent('step_completed', 1, { action: 'get_started' });
    await updateStep(2);
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-2xl mx-auto text-center">
        <CardHeader className="pb-6">
          <div className="mb-6 flex justify-center">
            <Image
              src="/logo-transparent.png"
              alt="GeoLeap Logo"
              width={120}
              height={120}
              priority
            />
          </div>
          <CardTitle className="text-4xl mb-4">Welcome to GeoLeap!</CardTitle>
          <CardDescription className="text-lg text-foreground-muted max-w-lg mx-auto">
            Find where any movie or TV show is streaming globally. Perfect for VPN users who want to explore content
            across all countries and services.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8">
          {/* Key Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4">
              <div className="text-3xl mb-3">🔍</div>
              <h3 className="font-semibold text-foreground mb-2">Global Search</h3>
              <p className="text-sm text-foreground-muted">
                Search across all countries and streaming services in one place
              </p>
            </div>
            <div className="text-center p-4">
              <div className="text-3xl mb-3">🚀</div>
              <h3 className="font-semibold text-foreground mb-2">No More Switching</h3>
              <p className="text-sm text-foreground-muted">
                Stop manually switching countries to find where content is available
              </p>
            </div>
            <div className="text-center p-4">
              <div className="text-3xl mb-3">🎯</div>
              <h3 className="font-semibold text-foreground mb-2">VPN Optimized</h3>
              <p className="text-sm text-foreground-muted">
                Designed specifically for users who want global streaming access
              </p>
            </div>
          </div>

          {/* Call to Action */}
          <div className="pt-4">
            <Button size="lg" onClick={handleGetStarted} disabled={isLoading} className="px-8 py-3 text-lg">
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Getting Started...</span>
                </div>
              ) : (
                'Get Started'
              )}
            </Button>
            <p className="text-sm text-foreground-muted mt-4">
              Takes less than 3 minutes to set up • Completely optional
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
