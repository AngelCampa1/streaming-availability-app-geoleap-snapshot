'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { SubscriptionTier, UserSubscription } from '@/lib/types/paywall';
import { getUserSubscription, getUserUsage } from '@/lib/api';

export interface UseSubscriptionResult {
  subscription: UserSubscription | null;
  usage: {
    searchesUsed: number;
    resultsViewed: number;
    resetTime?: string;
  } | null;
  loading: boolean;
  error: string | null;
  refreshSubscription: () => Promise<void>;
  refreshUsage: () => Promise<void>;
  hasFeatureAccess: (feature: SubscriptionFeature) => boolean;
  remainingSearches: number;
  remainingResults: number;
  isUnlimited: boolean;
  daysUntilExpiry: number;
  isExpiringSoon: boolean;
  isExpired: boolean;
}

export enum SubscriptionFeature {
  UnlimitedSearches = 'unlimited_searches',
  DirectLinks = 'direct_links',
  AdvancedFilters = 'advanced_filters',
  ExportResults = 'export_results',
  PrioritySupport = 'priority_support',
  AdFree = 'ad_free',
  GlobalPricing = 'global_pricing',
}

const getTierLimits = (tier: SubscriptionTier) => {
  switch (tier) {
    case SubscriptionTier.Free:
      return { searches: -1, results: -1 }; // Unlimited (ad-supported)
    case SubscriptionTier.Basic:
      return { searches: 200, results: 50 };
    case SubscriptionTier.Premium:
      return { searches: -1, results: -1 }; // Unlimited
    default:
      return { searches: -1, results: -1 };
  }
};

const getFeatureAccess = (tier: SubscriptionTier, feature: SubscriptionFeature): boolean => {
  const premiumTiers = new Set([SubscriptionTier.Premium, SubscriptionTier.Admin]);
  const basicAndAboveTiers = new Set([SubscriptionTier.Basic, SubscriptionTier.Premium, SubscriptionTier.Admin]);

  const featureMap = {
    [SubscriptionFeature.UnlimitedSearches]: premiumTiers.has(tier),
    [SubscriptionFeature.DirectLinks]: premiumTiers.has(tier),
    [SubscriptionFeature.AdvancedFilters]: premiumTiers.has(tier),
    [SubscriptionFeature.ExportResults]: premiumTiers.has(tier),
    [SubscriptionFeature.PrioritySupport]: premiumTiers.has(tier),
    [SubscriptionFeature.AdFree]: premiumTiers.has(tier),
    [SubscriptionFeature.GlobalPricing]: basicAndAboveTiers.has(tier),
  };

  return featureMap[feature] || false;
};

const getDaysUntilExpiry = (endDate?: string): number => {
  if (!endDate) return -1;
  const end = new Date(endDate);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 3600 * 24));
};

export const useSubscription = (
  autoRefresh: boolean = false,
  refreshInterval: number = 300000 // 5 minutes
): UseSubscriptionResult => {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [usage, setUsage] = useState<{
    searchesUsed: number;
    resultsViewed: number;
    resetTime?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  const refreshSubscription = useCallback(async () => {
    if (!mountedRef.current) return;

    const hasSession = typeof window !== 'undefined' && localStorage.getItem('sessionFingerprint');
    if (!hasSession) return;

    try {
      const subscriptionData = await getUserSubscription();
      if (mountedRef.current) {
        // Handle 204 No Content - API returns {} when user has no subscription
        // Check if we have a valid subscription object with required properties
        if (subscriptionData && subscriptionData.tier !== undefined) {
          setSubscription(subscriptionData);
        } else {
          // No subscription found - set free tier default
          setSubscription({
            id: '',
            userId: '',
            tier: SubscriptionTier.Free,
            isActive: true,
            startDate: new Date().toISOString(),
            autoRenew: false,
          });
        }
        setError(null);
      }
    } catch (err) {
      console.error('Failed to fetch subscription:', err);
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load subscription');
        // Fallback to free tier if we can't load subscription
        setSubscription({
          id: '',
          userId: '',
          tier: SubscriptionTier.Free,
          isActive: true,
          startDate: new Date().toISOString(),
          autoRenew: false,
        });
      }
    }
  }, []);

  const refreshUsage = useCallback(async () => {
    if (!mountedRef.current) return;

    const hasSession = typeof window !== 'undefined' && localStorage.getItem('sessionFingerprint');
    if (!hasSession) return;

    try {
      const usageData = await getUserUsage();
      if (mountedRef.current) {
        setUsage(usageData);
      }
    } catch (err) {
      console.error('Failed to fetch usage:', err);
      if (mountedRef.current) {
        // Fallback usage data
        setUsage({
          searchesUsed: 0,
          resultsViewed: 0,
          resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        });
      }
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([refreshSubscription(), refreshUsage()]);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [refreshSubscription, refreshUsage]);

  useEffect(() => {
    const hasSession = typeof window !== 'undefined' && localStorage.getItem('sessionFingerprint');
    if (!hasSession) {
      setSubscription({
        id: '',
        userId: '',
        tier: SubscriptionTier.Free,
        isActive: true,
        startDate: new Date().toISOString(),
        autoRenew: false,
      });
      setUsage({ searchesUsed: 0, resultsViewed: 0 });
      setLoading(false);
      return;
    }
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(() => {
        if (mountedRef.current) {
          fetchData();
        }
      }, refreshInterval);
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, fetchData]);

  useEffect(() => {
    // Reset mountedRef on mount (important for React Strict Mode)
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Listen for subscription changes from other components
  useEffect(() => {
    const handleSubscriptionUpdate = () => {
      refreshSubscription();
      refreshUsage();
    };

    window.addEventListener('subscription-updated', handleSubscriptionUpdate);

    return () => {
      window.removeEventListener('subscription-updated', handleSubscriptionUpdate);
    };
  }, [refreshSubscription, refreshUsage]);

  // Computed values
  const hasFeatureAccess = useCallback(
    (feature: SubscriptionFeature): boolean => {
      if (!subscription) return false;
      return getFeatureAccess(subscription.tier, feature);
    },
    [subscription]
  );

  const limits = subscription ? getTierLimits(subscription.tier) : { searches: -1, results: -1 };

  const remainingSearches =
    usage && limits.searches > 0 ? Math.max(0, limits.searches - usage.searchesUsed) : limits.searches === -1 ? -1 : 0; // -1 means unlimited

  const remainingResults = limits.results === -1 ? -1 : limits.results;

  const isUnlimited =
    subscription?.tier === SubscriptionTier.Free || subscription?.tier === SubscriptionTier.Premium;

  const daysUntilExpiry = getDaysUntilExpiry(subscription?.endDate);
  const isExpiringSoon = daysUntilExpiry >= 0 && daysUntilExpiry <= 7;
  const isExpired = daysUntilExpiry < 0 && !!subscription?.endDate;

  return {
    subscription,
    usage,
    loading,
    error,
    refreshSubscription,
    refreshUsage,
    hasFeatureAccess,
    remainingSearches,
    remainingResults,
    isUnlimited,
    daysUntilExpiry,
    isExpiringSoon,
    isExpired,
  };
};

// Utility function to trigger subscription updates across components
export const triggerSubscriptionUpdate = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('subscription-updated'));
  }
};

export default useSubscription;
