/**
 * useSearchLimit - Hook for tracking and enforcing search limits
 *
 * Search limits by tier (matching web):
 * - Anonymous: 3 searches/day, 5 results/search
 * - Free: 20 searches/day, 5 results/search
 * - Basic: 200 searches/day, 50 results/search
 * - Premium/Pro: Unlimited searches and results
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from './useSubscription';
import { SubscriptionTier } from '../types/subscription.types';
import { logger } from '../utils/logger';

// Storage keys
const SEARCH_COUNT_KEY = '@search_count';
const SEARCH_DATE_KEY = '@search_date';
const VERIFIED_ENTITLEMENT_TTL_MS = 15 * 60 * 1000;
const VERIFIED_ENTITLEMENT_CLOCK_SKEW_MS = 2 * 60 * 1000;

// Search limits by tier (matching web exactly)
export const SEARCH_LIMITS: Record<SubscriptionTier | 'anonymous', { searches: number; results: number }> = {
  anonymous: { searches: 3, results: 5 },
  free: { searches: 20, results: 5 },
  basic: { searches: 200, results: 50 },
  premium: { searches: Infinity, results: Infinity },
  pro: { searches: Infinity, results: Infinity },
};

export interface SearchLimitState {
  searchesUsed: number;
  searchLimit: number;
  resultsLimit: number;
  remainingSearches: number;
  hasReachedLimit: boolean;
  isApproachingLimit: boolean; // Within 5 searches of limit
  resetTime: Date | null;
  tier: SubscriptionTier | 'anonymous';
  isLoading: boolean;
}

export interface UseSearchLimitReturn extends SearchLimitState {
  incrementSearchCount: () => Promise<boolean>; // Returns true if search allowed
  resetSearchCount: () => Promise<void>;
  canPerformSearch: () => boolean;
  getResultsLimit: () => number;
}

export const useSearchLimit = (): UseSearchLimitReturn => {
  const { state } = useAuth();
  const { subscription } = useSubscription();
  const { isAuthenticated, user } = state;

  const [searchesUsed, setSearchesUsed] = useState(0);
  const [lastSearchDate, setLastSearchDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Determine user tier
  const tier: SubscriptionTier | 'anonymous' = useMemo(() => {
    if (!isAuthenticated || !user) {
      return 'anonymous';
    }

    if (
      subscription?.tier === 'premium' ||
      subscription?.tier === 'pro'
    ) {
      const verifiedAt = Date.parse(subscription.verifiedAt || '');
      const age = Date.now() - verifiedAt;
      const hasFreshServerEntitlement = subscription.serverVerified === true
        && Number.isFinite(verifiedAt)
        && age >= -VERIFIED_ENTITLEMENT_CLOCK_SKEW_MS
        && age <= VERIFIED_ENTITLEMENT_TTL_MS;

      return hasFreshServerEntitlement ? subscription.tier : 'free';
    }

    return subscription?.tier || 'free';
  }, [isAuthenticated, user, subscription]);

  // Get limits for current tier
  const limits = useMemo(() => SEARCH_LIMITS[tier], [tier]);

  // Calculate derived state
  const searchLimit = limits.searches;
  const resultsLimit = limits.results;
  const remainingSearches = Math.max(0, searchLimit - searchesUsed);
  const hasReachedLimit = searchLimit !== Infinity && searchesUsed >= searchLimit;
  const isApproachingLimit = searchLimit !== Infinity && remainingSearches <= 5 && !hasReachedLimit;

  // Calculate reset time (midnight local time)
  const resetTime = useMemo(() => {
    if (searchLimit === Infinity) return null;

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }, [searchLimit]);

  // Load search count from storage
  useEffect(() => {
    const loadSearchCount = async () => {
      try {
        const [storedCount, storedDate] = await Promise.all([
          AsyncStorage.getItem(SEARCH_COUNT_KEY),
          AsyncStorage.getItem(SEARCH_DATE_KEY),
        ]);

        const today = new Date().toDateString();

        // If it's a new day, reset the count
        if (storedDate !== today) {
          await AsyncStorage.setItem(SEARCH_DATE_KEY, today);
          await AsyncStorage.setItem(SEARCH_COUNT_KEY, '0');
          setSearchesUsed(0);
          setLastSearchDate(today);
        } else {
          setSearchesUsed(parseInt(storedCount || '0', 10));
          setLastSearchDate(storedDate);
        }
      } catch (error) {
        logger.error('[useSearchLimit] Error loading search count', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSearchCount();
  }, []);

  // Check if daily reset is needed
  useEffect(() => {
    let isMounted = true;

    const checkDailyReset = async () => {
      const today = new Date().toDateString();
      if (lastSearchDate && lastSearchDate !== today && isMounted) {
        // It's a new day, reset count
        setSearchesUsed(0);
        setLastSearchDate(today);
        await AsyncStorage.setItem(SEARCH_DATE_KEY, today);
        await AsyncStorage.setItem(SEARCH_COUNT_KEY, '0');
      }
    };

    // Check immediately and set up interval
    checkDailyReset();
    const interval = setInterval(checkDailyReset, 60000); // Check every minute

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [lastSearchDate]);

  // Check if search can be performed
  const canPerformSearch = useCallback((): boolean => {
    if (searchLimit === Infinity) return true;
    return searchesUsed < searchLimit;
  }, [searchesUsed, searchLimit]);

  // Increment search count
  const incrementSearchCount = useCallback(async (): Promise<boolean> => {
    // Unlimited users always can search
    if (searchLimit === Infinity) return true;

    // Check if limit reached
    if (searchesUsed >= searchLimit) {
      return false;
    }

    try {
      const newCount = searchesUsed + 1;
      await AsyncStorage.setItem(SEARCH_COUNT_KEY, newCount.toString());
      setSearchesUsed(newCount);
      return true;
    } catch (error) {
      logger.error('[useSearchLimit] Error incrementing search count', error);
      return false;
    }
  }, [searchesUsed, searchLimit]);

  // Reset search count (admin/testing purpose)
  const resetSearchCount = useCallback(async (): Promise<void> => {
    try {
      await AsyncStorage.setItem(SEARCH_COUNT_KEY, '0');
      setSearchesUsed(0);
    } catch (error) {
      logger.error('[useSearchLimit] Error resetting search count', error);
    }
  }, []);

  // Get results limit for current search
  const getResultsLimit = useCallback((): number => {
    return resultsLimit;
  }, [resultsLimit]);

  return {
    searchesUsed,
    searchLimit,
    resultsLimit,
    remainingSearches,
    hasReachedLimit,
    isApproachingLimit,
    resetTime,
    tier,
    isLoading,
    incrementSearchCount,
    resetSearchCount,
    canPerformSearch,
    getResultsLimit,
  };
};

export default useSearchLimit;
