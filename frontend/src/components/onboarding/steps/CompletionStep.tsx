'use client';

import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useRouter } from 'next/navigation';
import { formatPlanPrice, formatPremiumMonthlyEquivalent, premiumPlan } from '@/lib/pricing';

interface CompletionStepProps {
  onComplete?: () => void;
}

const CONTENT_TYPES = [
  { type: 'movie', name: 'Movies', icon: 'Movie' },
  { type: 'tv_show', name: 'TV Shows', icon: 'TV' },
  { type: 'documentary', name: 'Documentaries', icon: 'Doc' },
  { type: 'anime', name: 'Anime', icon: 'Anime' },
  { type: 'comedy_special', name: 'Comedy Specials', icon: 'Comedy' },
  { type: 'reality_tv', name: 'Reality TV', icon: 'Reality' },
  { type: 'kids', name: 'Kids & Family', icon: 'Kids' },
  { type: 'sports', name: 'Sports', icon: 'Sports' },
  { type: 'news', name: 'News', icon: 'News' },
  { type: 'music', name: 'Music', icon: 'Music' },
];

const ALL_REGIONS = [
  { code: 'US', name: 'United States', flag: 'US' },
  { code: 'GB', name: 'United Kingdom', flag: 'GB' },
  { code: 'CA', name: 'Canada', flag: 'CA' },
  { code: 'AU', name: 'Australia', flag: 'AU' },
  { code: 'JP', name: 'Japan', flag: 'JP' },
  { code: 'DE', name: 'Germany', flag: 'DE' },
  { code: 'FR', name: 'France', flag: 'FR' },
  { code: 'NL', name: 'Netherlands', flag: 'NL' },
  { code: 'ES', name: 'Spain', flag: 'ES' },
  { code: 'IT', name: 'Italy', flag: 'IT' },
];

export function CompletionStep({ onComplete }: CompletionStepProps) {
  const { status, completeOnboarding, trackAnalyticsEvent, isLoading } = useOnboarding();

  const router = useRouter();

  useEffect(() => {
    // Track completion step view
    trackAnalyticsEvent('step_started', 5);
  }, [trackAnalyticsEvent]);

  const handleComplete = async () => {
    await completeOnboarding();
    await trackAnalyticsEvent('onboarding_completed', 5, {
      total_services: status?.streamingServices.length || 0,
      total_regions: status?.regionPreferences.length || 0,
      total_content_types: status?.contentPreferences.length || 0,
    });

    if (onComplete) {
      onComplete();
    } else {
      router.push('/');
    }
  };

  const handleStartSearching = () => {
    handleComplete();
    // Could redirect to search page instead
  };

  const getSummaryText = () => {
    const services = status?.streamingServices.length || 0;
    const regions = status?.regionPreferences.length || 0;
    const content = status?.contentPreferences.length || 0;

    if (services === 0 && regions === 0 && content === 0) {
      return 'You chose to explore GeoLeap without setting preferences. You can always customize your preferences later in Settings.';
    }

    const parts = [];
    if (services > 0) parts.push(`${services} streaming service${services !== 1 ? 's' : ''}`);
    if (regions > 0) parts.push(`${regions} region${regions !== 1 ? 's' : ''}`);
    if (content > 0) parts.push(`${content} content type${content !== 1 ? 's' : ''}`);

    return `Perfect! We've set up your profile with ${parts.join(', ')}. This will help us show you the most relevant streaming results.`;
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-3xl mx-auto text-center">
        <CardHeader className="pb-6">
          <div className="text-3xl font-semibold text-primary mb-6">Ready</div>
          <CardTitle className="text-4xl mb-4">You&apos;re All Set!</CardTitle>
          <CardDescription className="text-lg text-foreground-muted max-w-2xl mx-auto">
            {getSummaryText()}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8">
          {/* Preferences Summary */}
          {(status?.streamingServices.length || 0) +
            (status?.regionPreferences.length || 0) +
            (status?.contentPreferences.length || 0) >
            0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-surface-muted rounded-lg">
              {/* Streaming Services */}
              {status?.streamingServices && status.streamingServices.length > 0 && (
                <div className="text-center">
                  <h3 className="font-semibold text-foreground mb-3">Your Services</h3>
                  <div className="flex flex-wrap justify-center gap-2">
                    {status.streamingServices.slice(0, 3).map(service => (
                      <Badge key={service.serviceName} variant="secondary">
                        {service.serviceName}
                      </Badge>
                    ))}
                    {status.streamingServices.length > 3 && (
                      <Badge variant="outline">+{status.streamingServices.length - 3} more</Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Regions */}
              {status?.regionPreferences && status.regionPreferences.length > 0 && (
                <div className="text-center">
                  <h3 className="font-semibold text-foreground mb-3">Your Regions</h3>
                  <div className="flex flex-wrap justify-center gap-2">
                    {status.regionPreferences.slice(0, 3).map(pref => {
                      const region = ALL_REGIONS.find(r => r.code === pref.countryCode);
                      return (
                        <Badge key={pref.countryCode} variant={pref.isPrimary ? 'default' : 'secondary'}>
                          {region?.flag} {region?.name}
                        </Badge>
                      );
                    })}
                    {status.regionPreferences.length > 3 && (
                      <Badge variant="outline">+{status.regionPreferences.length - 3} more</Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Content Types */}
              {status?.contentPreferences && status.contentPreferences.length > 0 && (
                <div className="text-center">
                  <h3 className="font-semibold text-foreground mb-3">Your Interests</h3>
                  <div className="flex flex-wrap justify-center gap-2">
                    {status.contentPreferences.slice(0, 3).map(pref => {
                      const content = CONTENT_TYPES.find(c => c.type === pref.contentType);
                      return (
                        <Badge key={pref.contentType} variant="secondary" className="flex items-center gap-1">
                          <span>{content?.icon}</span>
                          <span>{content?.name}</span>
                        </Badge>
                      );
                    })}
                    {status.contentPreferences.length > 3 && (
                      <Badge variant="outline">+{status.contentPreferences.length - 3} more</Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Free Trial Promotion */}
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 p-6 rounded-lg">
            <h3 className="text-xl font-semibold text-foreground mb-4">Start Your 30-Day Free Trial</h3>
            <div className="text-left space-y-3 mb-6">
              <div className="flex items-center space-x-2">
                <div className="text-success">Yes</div>
                <span className="text-sm">Unlimited searches and streaming discovery</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="text-success">Yes</div>
                <span className="text-sm">Access to 42 streaming services</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="text-success">Yes</div>
                <span className="text-sm">Personalized VPN recommendations</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="text-success">Yes</div>
                <span className="text-sm">Cancel anytime during your trial</span>
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm text-foreground-muted mb-4">
                After your trial, continue for just {formatPlanPrice(premiumPlan)} (about {formatPremiumMonthlyEquivalent()})
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/pricing')}
                className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              >
                Learn More About Premium
              </Button>
            </div>
          </div>

          {/* What's Next */}
          <div className="bg-primary/5 border border-primary/20 p-6 rounded-lg">
            <h3 className="text-xl font-semibold text-foreground mb-4">What&apos;s Next?</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              <div className="flex items-start space-x-3">
                <div className="text-sm font-semibold text-primary">Search</div>
                <div>
                  <h4 className="font-medium text-foreground">Start Searching</h4>
                  <p className="text-sm text-foreground-muted">
                    Search for any movie or TV show to see where it&apos;s available globally
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="text-sm font-semibold text-primary">Prefs</div>
                <div>
                  <h4 className="font-medium text-foreground">Adjust Preferences</h4>
                  <p className="text-sm text-foreground-muted">
                    Update your preferences anytime in your account settings
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="text-sm font-semibold text-primary">Match</div>
                <div>
                  <h4 className="font-medium text-foreground">Get Personalized Results</h4>
                  <p className="text-sm text-foreground-muted">
                    Your preferences will help show the most relevant results first
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="text-sm font-semibold text-primary">VPN</div>
                <div>
                  <h4 className="font-medium text-foreground">VPN-Friendly</h4>
                  <p className="text-sm text-foreground-muted">
                    Our platform is designed to work seamlessly with VPN users
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="pt-4">
            <Button size="lg" onClick={handleStartSearching} disabled={isLoading} className="px-8 py-3 text-lg">
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Setting up...</span>
                </div>
              ) : (
                'Start Searching'
              )}
            </Button>
            <p className="text-sm text-foreground-muted mt-4">
              Ready to discover where your favorite content is streaming worldwide?
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
