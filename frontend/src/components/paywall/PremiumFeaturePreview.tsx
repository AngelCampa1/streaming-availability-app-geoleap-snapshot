'use client';

import React, { useState } from 'react';
import { SubscriptionTier } from '@/lib/types/paywall';
import { logPaywallInteraction } from '@/lib/api';

interface PremiumFeaturePreviewProps {
  feature: PremiumFeature;
  currentTier: SubscriptionTier;
  onUpgradeClick?: () => void;
  className?: string;
  interactive?: boolean;
}

export interface PremiumFeature {
  id: string;
  name: string;
  description: string;
  icon: string;
  requiredTier: SubscriptionTier;
  benefits: string[];
  demoData?: {
    beforeImage?: string;
    afterImage?: string;
    videoUrl?: string;
    interactiveDemo?: React.ReactNode;
  };
  savings?: {
    timeSaved?: string;
    moneySaved?: string;
    description: string;
  };
}

const premiumFeatures: PremiumFeature[] = [
  {
    id: 'unlimited-searches',
    name: 'Unlimited Searches',
    description: 'Search as much as you want without daily limits',
    icon: '🔍',
    requiredTier: SubscriptionTier.Premium,
    benefits: [
      'No daily search limits',
      'Search history saved forever',
      'Bulk search capabilities',
      'Advanced search operators',
    ],
    savings: {
      timeSaved: '2+ hours weekly',
      description: 'No more waiting for search limits to reset',
    },
  },
  {
    id: 'direct-streaming-links',
    name: 'Direct Streaming Links',
    description: 'Click and watch - direct links to your favorite shows',
    icon: '🔗',
    requiredTier: SubscriptionTier.Premium,
    benefits: [
      'One-click access to shows',
      'Deep links to specific episodes',
      'Auto-redirect to best quality',
      'Links for all regions',
    ],
    savings: {
      timeSaved: '5 minutes per show',
      description: 'Skip the hunting and start watching immediately',
    },
  },
  {
    id: 'global-pricing',
    name: 'Global Pricing Information',
    description: 'Compare prices across all countries and services',
    icon: '💰',
    requiredTier: SubscriptionTier.Basic,
    benefits: [
      'Price comparison across regions',
      'Currency conversion',
      'Best deal recommendations',
      'Price history tracking',
    ],
    savings: {
      moneySaved: '$20+ monthly',
      description: 'Find the cheapest way to watch your content',
    },
  },
  {
    id: 'advanced-filters',
    name: 'Advanced Filtering',
    description: 'Find exactly what you want with powerful filters',
    icon: '🎛️',
    requiredTier: SubscriptionTier.Premium,
    benefits: [
      'Filter by genre, rating, year',
      'Availability filters',
      'Language and subtitle options',
      'Save custom filter presets',
    ],
    savings: {
      timeSaved: '10 minutes per search',
      description: 'Narrow down results to exactly what you want',
    },
  },
  {
    id: 'export-results',
    name: 'Export & Share',
    description: 'Export search results and share with friends',
    icon: '📤',
    requiredTier: SubscriptionTier.Premium,
    benefits: ['Export to CSV, PDF', 'Create shareable links', 'Watchlist integration', 'Social media sharing'],
    savings: {
      timeSaved: '30 minutes weekly',
      description: 'Organize and share your streaming discoveries',
    },
  },
];

const getTierName = (tier: SubscriptionTier): string => {
  switch (tier) {
    case SubscriptionTier.Basic:
      return 'Basic';
    case SubscriptionTier.Premium:
      return 'Premium';
    default:
      return 'Premium';
  }
};

const getRequiredTierColor = (tier: SubscriptionTier): string => {
  switch (tier) {
    case SubscriptionTier.Basic:
      return 'bg-primary/10 text-primary';
    case SubscriptionTier.Premium:
      return 'bg-gradient-to-r from-warning/10 to-warning/20 text-warning';
    default:
      return 'bg-gradient-to-r from-warning/10 to-warning/20 text-warning';
  }
};

export const PremiumFeaturePreview: React.FC<PremiumFeaturePreviewProps> = ({
  feature,
  currentTier,
  onUpgradeClick,
  className = '',
  interactive = true,
}) => {
  const [showDemo, setShowDemo] = useState(false);

  const hasAccess = currentTier >= feature.requiredTier;

  const handleUpgradeClick = async () => {
    await logPaywallInteraction('upgrade_clicked', {
      paywallPosition: 'premium-feature-preview',
    });

    if (onUpgradeClick) {
      onUpgradeClick();
    }
  };

  const handleDemoClick = async () => {
    await logPaywallInteraction('upgrade_clicked', {
      paywallPosition: 'feature-demo',
    });
    setShowDemo(!showDemo);
  };

  return (
    <div
      className={`bg-card rounded-xl shadow-sm border border-border overflow-hidden hover:shadow-md transition-all duration-200 ${className}`}
    >
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center">
            <span className="text-3xl mr-4">{feature.icon}</span>
            <div>
              <h3 className="text-xl font-bold text-foreground mb-1">{feature.name}</h3>
              <p className="text-muted-foreground text-sm">{feature.description}</p>
            </div>
          </div>

          <div className={`px-3 py-1 rounded-full text-xs font-medium ${getRequiredTierColor(feature.requiredTier)}`}>
            {getTierName(feature.requiredTier)} Required
          </div>
        </div>
      </div>

      {/* Benefits */}
      <div className="px-6 pb-4">
        <div className="grid md:grid-cols-2 gap-3">
          {feature.benefits.map((benefit, index) => (
            <div key={index} className="flex items-center text-sm">
              <span className="w-2 h-2 bg-success rounded-full mr-3 flex-shrink-0"></span>
              <span className="text-foreground">{benefit}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Savings */}
      {feature.savings && (
        <div className="px-6 pb-4">
          <div className="bg-success/10 border border-success/20 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <span className="text-success mr-2">💰</span>
              <span className="font-medium text-success">Value:</span>
              {feature.savings.timeSaved && (
                <span className="ml-2 bg-success/10 text-success px-2 py-1 rounded-full text-xs font-medium">
                  Save {feature.savings.timeSaved}
                </span>
              )}
              {feature.savings.moneySaved && (
                <span className="ml-2 bg-success/10 text-success px-2 py-1 rounded-full text-xs font-medium">
                  Save {feature.savings.moneySaved}
                </span>
              )}
            </div>
            <p className="text-success text-sm">{feature.savings.description}</p>
          </div>
        </div>
      )}

      {/* Demo Section */}
      {interactive && feature.demoData && (
        <div className="px-6 pb-4">
          <button
            onClick={handleDemoClick}
            className="w-full bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-lg p-3 text-center transition-colors"
          >
            <div className="flex items-center justify-center">
              <span className="mr-2">🎬</span>
              <span className="font-medium text-primary">{showDemo ? 'Hide Demo' : 'See Feature in Action'}</span>
            </div>
          </button>

          {showDemo && (
            <div className="mt-4 bg-muted rounded-lg p-4">
              <div className="text-center">
                <div className="bg-card rounded-lg p-6 shadow-sm">
                  <h4 className="font-medium text-foreground mb-4">Feature Demo</h4>

                  {/* Mock demo interface */}
                  <div className="space-y-4">
                    {feature.id === 'unlimited-searches' && (
                      <div className="text-left">
                        <div className="mb-2 text-sm text-muted-foreground">Search counter:</div>
                        <div className="bg-muted p-3 rounded border border-border">
                          <div className="flex items-center justify-between">
                            <span className="text-destructive">Free: 18/20 searches used</span>
                            <span className="text-muted-foreground">⚠️ Limit reached soon</span>
                          </div>
                        </div>
                        <div className="mt-2 bg-success/10 p-3 rounded border border-success/20">
                          <div className="flex items-center justify-between">
                            <span className="text-success">Premium: 247 searches today</span>
                            <span className="text-success">✅ Unlimited</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {feature.id === 'direct-streaming-links' && (
                      <div className="text-left">
                        <div className="mb-2 text-sm text-muted-foreground">Search result:</div>
                        <div className="bg-muted p-3 rounded border border-border mb-2">
                          <div className="font-medium">The Office (US)</div>
                          <div className="text-sm text-muted-foreground">
                            Free: &ldquo;Available on Netflix&rdquo; (no link)
                          </div>
                        </div>
                        <div className="bg-success/10 p-3 rounded border border-success/20">
                          <div className="font-medium">The Office (US)</div>
                          <div className="text-sm text-success">
                            Premium: <button className="text-primary underline">▶ Watch on Netflix</button>
                          </div>
                        </div>
                      </div>
                    )}

                    {feature.id === 'global-pricing' && (
                      <div className="text-left">
                        <div className="mb-2 text-sm text-muted-foreground">Pricing comparison:</div>
                        <div className="space-y-2">
                          <div className="bg-success/10 p-2 rounded text-sm">🇺🇸 Netflix US: $15.49/month</div>
                          <div className="bg-warning/10 p-2 rounded text-sm">
                            🇬🇧 Netflix UK: $12.99/month (Best Deal!)
                          </div>
                          <div className="bg-destructive/10 p-2 rounded text-sm">🇨🇭 Netflix Switzerland: $18.99/month</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action */}
      <div className="px-6 pb-6">
        {hasAccess ? (
          <div className="bg-success/10 border border-success/20 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center text-success">
              <span className="mr-2">✅</span>
              <span className="font-medium">Feature Available - Start Using Now!</span>
            </div>
          </div>
        ) : (
          <button
            onClick={handleUpgradeClick}
            className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-200 ${
              feature.requiredTier === SubscriptionTier.Basic
                ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                : 'bg-gradient-to-r from-warning to-warning/80 hover:from-warning/90 hover:to-warning/70 text-white'
            }`}
          >
            Upgrade to {getTierName(feature.requiredTier)} - Unlock This Feature
          </button>
        )}
      </div>
    </div>
  );
};

// Component to show multiple premium features
export const PremiumFeaturesGrid: React.FC<{
  currentTier: SubscriptionTier;
  onUpgradeClick?: () => void;
  className?: string;
  featuresPerRow?: number;
}> = ({ currentTier, onUpgradeClick, className = '', featuresPerRow = 2 }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = ['all', 'search', 'content', 'tools'];

  const filteredFeatures =
    selectedCategory === 'all'
      ? premiumFeatures
      : premiumFeatures.filter(feature => {
          if (selectedCategory === 'search') return ['unlimited-searches', 'advanced-filters'].includes(feature.id);
          if (selectedCategory === 'content') return ['direct-streaming-links', 'global-pricing'].includes(feature.id);
          if (selectedCategory === 'tools') return ['export-results'].includes(feature.id);
          return true;
        });

  return (
    <div className={className}>
      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === category ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-muted/80'
            }`}
          >
            {category.charAt(0).toUpperCase() + category.slice(1)} Features
          </button>
        ))}
      </div>

      {/* Features Grid */}
      <div
        className={`grid gap-6 ${
          featuresPerRow === 1
            ? 'grid-cols-1'
            : featuresPerRow === 2
              ? 'md:grid-cols-2'
              : 'md:grid-cols-2 lg:grid-cols-3'
        }`}
      >
        {filteredFeatures.map(feature => (
          <PremiumFeaturePreview
            key={feature.id}
            feature={feature}
            currentTier={currentTier}
            onUpgradeClick={onUpgradeClick}
          />
        ))}
      </div>
    </div>
  );
};

export default PremiumFeaturePreview;
