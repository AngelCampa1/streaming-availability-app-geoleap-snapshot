'use client';

import React, { useState, useEffect } from 'react';
import { SubscriptionTier, PaywallInfo } from '@/lib/types/paywall';
import { getUserUsage } from '@/lib/api';

interface UsageTrackerProps {
  paywallInfo: PaywallInfo;
  className?: string;
  showUpgradeButton?: boolean;
  onUpgradeClick?: () => void;
  compact?: boolean;
}

interface UsageData {
  searchesUsed: number;
  searchesLimit: number;
  resultsViewed: number;
  resultsLimit: number;
  resetTime?: string;
}

const getTierLimits = (tier: SubscriptionTier): { searches: number; results: number } => {
  switch (tier) {
    case SubscriptionTier.Free:
      return { searches: 20, results: 5 };
    case SubscriptionTier.Basic:
      return { searches: 200, results: 50 };
    case SubscriptionTier.Premium:
      return { searches: -1, results: -1 }; // Unlimited
    default:
      return { searches: 20, results: 5 };
  }
};

const getUsageColor = (used: number, limit: number): string => {
  if (limit === -1) return 'text-success'; // Unlimited
  const percentage = (used / limit) * 100;
  if (percentage >= 90) return 'text-destructive';
  if (percentage >= 70) return 'text-destructive/80';
  if (percentage >= 50) return 'text-warning';
  return 'text-success';
};

const getProgressColor = (used: number, limit: number): string => {
  if (limit === -1) return 'bg-success'; // Unlimited
  const percentage = (used / limit) * 100;
  if (percentage >= 90) return 'bg-destructive';
  if (percentage >= 70) return 'bg-destructive/80';
  if (percentage >= 50) return 'bg-warning';
  return 'bg-success';
};

const formatTimeUntilReset = (resetTime?: string): string => {
  if (!resetTime) return 'Daily reset';

  const reset = new Date(resetTime);
  const now = new Date();
  const diff = reset.getTime() - now.getTime();

  if (diff <= 0) return 'Resets soon';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `Resets in ${hours}h ${minutes}m`;
  } else {
    return `Resets in ${minutes}m`;
  }
};

export const UsageTracker: React.FC<UsageTrackerProps> = ({
  paywallInfo,
  className = '',
  showUpgradeButton = true,
  onUpgradeClick,
  compact = false,
}) => {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const data = await getUserUsage();
        const limits = getTierLimits(paywallInfo.userTier);

        setUsage({
          searchesUsed: data.searchesUsed || 0,
          searchesLimit: limits.searches,
          resultsViewed: data.resultsViewed || 0,
          resultsLimit: limits.results,
          resetTime: data.resetTime,
        });
      } catch (error) {
        console.error('Failed to fetch usage:', error);
        // Fallback to info from paywall
        const limits = getTierLimits(paywallInfo.userTier);
        setUsage({
          searchesUsed: 0,
          searchesLimit: limits.searches,
          resultsViewed: 0,
          resultsLimit: limits.results,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUsage();
  }, [paywallInfo.userTier, paywallInfo]);

  if (loading) {
    return (
      <div className={`bg-muted rounded-lg p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-muted-foreground/20 rounded mb-2"></div>
          <div className="h-2 bg-muted-foreground/20 rounded mb-4"></div>
          <div className="h-4 bg-muted-foreground/20 rounded mb-2"></div>
          <div className="h-2 bg-muted-foreground/20 rounded"></div>
        </div>
      </div>
    );
  }

  if (!usage) return null;

  const searchPercentage = usage.searchesLimit === -1 ? 0 : (usage.searchesUsed / usage.searchesLimit) * 100;

  if (compact) {
    return (
      <div className={`bg-background border border-border rounded-lg p-3 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center">
              <span className="text-muted-foreground mr-1">🔍</span>
              <span className={getUsageColor(usage.searchesUsed, usage.searchesLimit)}>
                {usage.searchesUsed}
                {usage.searchesLimit === -1 ? '' : `/${usage.searchesLimit}`}
              </span>
            </div>
            <div className="flex items-center">
              <span className="text-muted-foreground mr-1">📊</span>
              <span className={getUsageColor(usage.resultsViewed, usage.resultsLimit)}>
                {usage.resultsViewed}
                {usage.resultsLimit === -1 ? '' : `/${usage.resultsLimit}`}
              </span>
            </div>
          </div>

          {paywallInfo.userTier === SubscriptionTier.Free && showUpgradeButton && (
            <button
              onClick={onUpgradeClick}
              className="text-xs bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-1 rounded-full font-medium transition-colors"
            >
              Upgrade
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-br from-muted to-muted/50 rounded-lg p-6 border border-border ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center">
          <span className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center mr-3 text-sm">
            📊
          </span>
          Daily Usage
        </h3>

        {paywallInfo.userTier !== SubscriptionTier.Premium && (
          <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">
            {paywallInfo.userTier === SubscriptionTier.Free ? 'Free' : 'Basic'} Plan
          </span>
        )}
      </div>

      {/* Usage Metrics */}
      <div className="space-y-4">
        {/* Searches */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground flex items-center">
              <span className="mr-2">🔍</span>
              Searches Today
            </span>
            <span className={`text-sm font-semibold ${getUsageColor(usage.searchesUsed, usage.searchesLimit)}`}>
              {usage.searchesUsed}
              {usage.searchesLimit === -1 ? ' (unlimited)' : `/${usage.searchesLimit}`}
            </span>
          </div>

          {usage.searchesLimit !== -1 && (
            <div className="w-full bg-muted-foreground/20 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(usage.searchesUsed, usage.searchesLimit)}`}
                style={{ width: `${Math.min(searchPercentage, 100)}%` }}
              ></div>
            </div>
          )}
        </div>

        {/* Results */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground flex items-center">
              <span className="mr-2">📄</span>
              Results per Search
            </span>
            <span className={`text-sm font-semibold ${getUsageColor(usage.resultsViewed, usage.resultsLimit)}`}>
              {usage.resultsLimit === -1 ? 'Unlimited' : `Up to ${usage.resultsLimit}`}
            </span>
          </div>

          {usage.resultsLimit !== -1 && paywallInfo.userTier === SubscriptionTier.Free && (
            <div className="text-xs text-muted-foreground mt-1">Premium content may be limited or blurred</div>
          )}
        </div>
      </div>

      {/* Reset Time */}
      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>⏰ {formatTimeUntilReset(usage.resetTime)}</span>

          {usage.searchesLimit !== -1 && (
            <span>
              {usage.searchesLimit - usage.searchesUsed > 0
                ? `${usage.searchesLimit - usage.searchesUsed} searches left`
                : 'Daily limit reached'}
            </span>
          )}
        </div>
      </div>

      {/* Upgrade CTA */}
      {paywallInfo.userTier !== SubscriptionTier.Premium && showUpgradeButton && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <div className="font-medium text-foreground mb-1">Want unlimited access?</div>
              <div className="text-muted-foreground">
                {paywallInfo.userTier === SubscriptionTier.Free ? 'Upgrade to Basic or Premium' : 'Upgrade to Premium'}
              </div>
            </div>

            <button
              onClick={onUpgradeClick}
              className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 text-primary-foreground px-4 py-2 rounded-full font-medium transition-all duration-200 transform hover:scale-105 shadow-md text-sm"
            >
              Upgrade Now
            </button>
          </div>
        </div>
      )}

      {/* Premium Badge */}
      {paywallInfo.userTier === SubscriptionTier.Premium && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-center text-sm">
            <span className="bg-gradient-to-r from-warning to-warning/80 text-primary-foreground px-4 py-2 rounded-full font-semibold flex items-center shadow-md">
              ⭐ Premium - Unlimited Access
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsageTracker;
