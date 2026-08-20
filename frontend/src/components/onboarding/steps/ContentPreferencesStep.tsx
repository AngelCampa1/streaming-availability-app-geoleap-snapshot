'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { ContentPreference } from '@/lib/onboarding';
import { cn } from '@/lib/utils';

const CONTENT_TYPES = [
  {
    type: 'movie',
    name: 'Movies',
    description: 'Feature films and cinema releases',
    icon: '🎬',
    isPopular: true,
  },
  {
    type: 'tv_show',
    name: 'TV Shows',
    description: 'Series, seasons, and episodic content',
    icon: '📺',
    isPopular: true,
  },
  {
    type: 'documentary',
    name: 'Documentaries',
    description: 'Educational and factual programming',
    icon: '🎞️',
    isPopular: true,
  },
  {
    type: 'anime',
    name: 'Anime',
    description: 'Japanese animation series and films',
    icon: '🎌',
    isPopular: true,
  },
  {
    type: 'comedy_special',
    name: 'Comedy Specials',
    description: 'Stand-up comedy and comedy shows',
    icon: '🎭',
    isPopular: false,
  },
  {
    type: 'reality_tv',
    name: 'Reality TV',
    description: 'Reality shows and competition series',
    icon: '📹',
    isPopular: false,
  },
  {
    type: 'kids',
    name: 'Kids & Family',
    description: 'Content suitable for children and families',
    icon: '👶',
    isPopular: false,
  },
  {
    type: 'sports',
    name: 'Sports',
    description: 'Live sports and sports programming',
    icon: '⚽',
    isPopular: false,
  },
  {
    type: 'news',
    name: 'News',
    description: 'News programs and current affairs',
    icon: '📰',
    isPopular: false,
  },
  {
    type: 'music',
    name: 'Music',
    description: 'Concerts, music videos, and music shows',
    icon: '🎵',
    isPopular: false,
  },
];

export function ContentPreferencesStep() {
  const { status, updateStep, addContentPreferences, trackAnalyticsEvent, isLoading } = useOnboarding();

  const [selectedContent, setSelectedContent] = useState<ContentPreference[]>([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    // Initialize with existing preferences if any
    if (status?.contentPreferences) {
      setSelectedContent(status.contentPreferences);
    }
  }, [status?.contentPreferences]);

  const popularContent = CONTENT_TYPES.filter(content => content.isPopular);
  const otherContent = CONTENT_TYPES.filter(content => !content.isPopular);

  const toggleContent = (contentType: string) => {
    setSelectedContent(prev => {
      const existing = prev.find(pref => pref.contentType === contentType);
      if (existing) {
        return prev.filter(pref => pref.contentType !== contentType);
      } else {
        return [
          ...prev,
          {
            contentType,
            isEnabled: true,
            priority: prev.length + 1,
          },
        ];
      }
    });
  };

  const handleContinue = async () => {
    if (selectedContent.length > 0) {
      await addContentPreferences(selectedContent);
    }
    await trackAnalyticsEvent('step_completed', 4, {
      content_types_selected: selectedContent.length,
      content_types: selectedContent.map(c => c.contentType),
    });
    await updateStep(5);
  };

  const handleSkipStep = async () => {
    await trackAnalyticsEvent('step_skipped', 4);
    await updateStep(5);
  };

  const ContentButton = ({
    content,
    isPopular = false,
  }: {
    content: (typeof CONTENT_TYPES)[0];
    isPopular?: boolean;
  }) => {
    const isSelected = selectedContent.some(pref => pref.contentType === content.type);

    return (
      <button
        onClick={() => toggleContent(content.type)}
        className={cn(
          'relative flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all duration-200 min-h-[140px] text-sm font-medium text-left',
          isSelected
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-border bg-surface hover:border-primary/50 hover:bg-surface-muted text-foreground'
        )}
      >
        <div className="text-4xl mb-3">{content.icon}</div>
        <div className="text-center">
          <div className="font-semibold text-base mb-1">{content.name}</div>
          <div className="text-xs text-foreground-muted leading-tight">{content.description}</div>
          {isPopular && (
            <Badge variant="secondary" className="mt-2 text-xs">
              Popular
            </Badge>
          )}
        </div>

        {isSelected && (
          <div className="absolute top-3 right-3 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </button>
    );
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">What Do You Like to Watch?</CardTitle>
        <CardDescription>
          Select your preferred content types to get personalized recommendations and search results.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Popular Content Types */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">Popular Choices</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {popularContent.map(content => (
              <ContentButton key={content.type} content={content} isPopular={true} />
            ))}
          </div>
        </div>

        {/* Additional Content Types */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">More Options</h3>
            <Button variant="ghost" size="sm" onClick={() => setShowAll(!showAll)}>
              {showAll ? 'Hide' : 'Show'} more options
            </Button>
          </div>

          {showAll && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {otherContent.map(content => (
                <ContentButton key={content.type} content={content} />
              ))}
            </div>
          )}
        </div>

        {/* Selection Summary */}
        {selectedContent.length > 0 && (
          <div className="bg-surface-muted p-4 rounded-lg">
            <p className="text-sm text-foreground-muted mb-3">Your content preferences ({selectedContent.length}):</p>
            <div className="flex flex-wrap gap-2">
              {selectedContent.map(pref => {
                const content = CONTENT_TYPES.find(c => c.type === pref.contentType);
                return (
                  <Badge key={pref.contentType} variant="secondary" className="flex items-center gap-1">
                    <span>{content?.icon}</span>
                    <span>{content?.name}</span>
                  </Badge>
                );
              })}
            </div>
            <p className="text-xs text-foreground-muted mt-3">
              These preferences help us show you the most relevant content first in search results.
            </p>
          </div>
        )}

        {/* Personalization Preview */}
        {selectedContent.length > 0 && (
          <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg">
            <h4 className="font-semibold text-foreground mb-2 flex items-center">
              <span className="text-primary mr-2">✨</span>
              Personalization Preview
            </h4>
            <p className="text-sm text-foreground-muted">
              Based on your selections, we&apos;ll prioritize{' '}
              {selectedContent
                .slice(0, 2)
                .map(pref => {
                  const content = CONTENT_TYPES.find(c => c.type === pref.contentType);
                  return content?.name.toLowerCase();
                })
                .join(' and ')}{' '}
              {selectedContent.length > 2 &&
                `and ${selectedContent.length - 2} other type${selectedContent.length > 3 ? 's' : ''}`}{' '}
              in your search results and recommendations.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
          <Button variant="ghost" onClick={handleSkipStep} disabled={isLoading} className="order-2 sm:order-1">
            Skip this step
          </Button>
          <div className="flex-1"></div>
          <Button onClick={handleContinue} disabled={isLoading} className="order-1 sm:order-2">
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Saving...</span>
              </div>
            ) : (
              `Continue${selectedContent.length > 0 ? ` with ${selectedContent.length} preference${selectedContent.length !== 1 ? 's' : ''}` : ''}`
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
