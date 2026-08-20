'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { POPULAR_SERVICES } from '@/types/streaming';
import { API_BASE_URL } from '@/config/api';

/**
 * Subscription item structure
 */
export interface SubscriptionItem {
  serviceId: string;
  serviceName: string;
  isActive: boolean;
}

/**
 * localStorage key for anonymous user subscriptions
 */
const ANON_SUBSCRIPTIONS_KEY = 'geoleap_subscriptions';

// Bug 14 fix: Module-level cache to prevent excessive API calls
let cachedSubscriptions: SubscriptionItem[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 30000; // 30 seconds cache

/**
 * Reset the module-level cache - for testing purposes only
 */
export function resetSubscriptionCache(): void {
  cachedSubscriptions = null;
  cacheTimestamp = 0;
}

/**
 * Hook that provides unified subscription management for both
 * anonymous users (localStorage) and authenticated users (API)
 */
export function useUserSubscriptions() {
  const { isAuthenticated, user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load subscriptions from localStorage for anonymous users
   */
  const loadLocalSubscriptions = useCallback((): SubscriptionItem[] => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(ANON_SUBSCRIPTIONS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (err) {
      console.warn('Failed to load local subscriptions:', err);
    }
    return [];
  }, []);

  /**
   * Save subscriptions to localStorage for anonymous users
   */
  const saveLocalSubscriptions = useCallback((subs: SubscriptionItem[]) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(ANON_SUBSCRIPTIONS_KEY, JSON.stringify(subs));
    } catch (err) {
      console.warn('Failed to save local subscriptions:', err);
    }
  }, []);

  /**
   * Load subscriptions from API for authenticated users
   * Bug 14 fix: Uses module-level cache to prevent excessive API calls
   */
  const loadApiSubscriptions = useCallback(async (): Promise<SubscriptionItem[]> => {
    // Check cache first
    const now = Date.now();
    if (cachedSubscriptions && now - cacheTimestamp < CACHE_TTL) {
      return cachedSubscriptions;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/usersubscriptions`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Mode': 'cookie',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch subscriptions');
      }

      const data = await response.json();
      const subscriptions = data.map((sub: { serviceId: string; serviceName: string; isActive: boolean }) => ({
        serviceId: sub.serviceId,
        serviceName: sub.serviceName,
        isActive: sub.isActive,
      }));

      // Update cache
      cachedSubscriptions = subscriptions;
      cacheTimestamp = now;

      return subscriptions;
    } catch (err) {
      console.error('Failed to load API subscriptions:', err);
      throw err;
    }
  }, []);

  /**
   * Load subscriptions based on auth state
   */
  const loadSubscriptions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (isAuthenticated) {
        const apiSubs = await loadApiSubscriptions();
        setSubscriptions(apiSubs);
      } else {
        const localSubs = loadLocalSubscriptions();
        setSubscriptions(localSubs);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load subscriptions';
      setError(errorMessage);
      // Fall back to localStorage if API fails
      if (isAuthenticated) {
        const localSubs = loadLocalSubscriptions();
        setSubscriptions(localSubs);
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, loadApiSubscriptions, loadLocalSubscriptions]);

  /**
   * Toggle a service subscription
   */
  const toggleSubscription = useCallback(async (serviceId: string, serviceName: string) => {
    const existingIndex = subscriptions.findIndex(s => s.serviceId === serviceId);
    let newSubscriptions: SubscriptionItem[];

    if (existingIndex >= 0) {
      // Remove subscription
      newSubscriptions = subscriptions.filter(s => s.serviceId !== serviceId);
    } else {
      // Add subscription
      newSubscriptions = [...subscriptions, { serviceId, serviceName, isActive: true }];
    }

    setSubscriptions(newSubscriptions);

    if (isAuthenticated) {
      // Sync with API
      try {
        if (existingIndex >= 0) {
          await fetch(`${API_BASE_URL}/api/usersubscriptions/${serviceId}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: { 'X-Auth-Mode': 'cookie' },
          });
        } else {
          await fetch(`${API_BASE_URL}/api/usersubscriptions`, {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'X-Auth-Mode': 'cookie',
            },
            body: JSON.stringify({ serviceId, serviceName }),
          });
        }
      } catch (err) {
        console.error('Failed to sync subscription with API:', err);
        // Revert on error
        setSubscriptions(subscriptions);
      }
    } else {
      // Save to localStorage for anonymous users
      saveLocalSubscriptions(newSubscriptions);
    }
  }, [subscriptions, isAuthenticated, saveLocalSubscriptions]);

  /**
   * Set multiple subscriptions at once
   */
  const setMultipleSubscriptions = useCallback(async (serviceIds: string[]) => {
    const newSubscriptions: SubscriptionItem[] = serviceIds.map(id => {
      const service = POPULAR_SERVICES.find(s => s.id === id);
      return {
        serviceId: id,
        serviceName: service?.name || id,
        isActive: true,
      };
    });

    setSubscriptions(newSubscriptions);

    if (!isAuthenticated) {
      saveLocalSubscriptions(newSubscriptions);
    }
    // For authenticated users, individual API calls would be made
  }, [isAuthenticated, saveLocalSubscriptions]);

  /**
   * Check if user has a specific subscription
   */
  const hasSubscription = useCallback((serviceId: string): boolean => {
    return subscriptions.some(s => s.serviceId === serviceId && s.isActive);
  }, [subscriptions]);

  /**
   * Get list of active service IDs
   */
  const getServiceIds = useCallback((): string[] => {
    return subscriptions.filter(s => s.isActive).map(s => s.serviceId);
  }, [subscriptions]);

  /**
   * Get subscription count
   */
  const subscriptionCount = subscriptions.filter(s => s.isActive).length;

  /**
   * Check if user has set up any subscriptions
   */
  const hasSetupSubscriptions = subscriptionCount > 0;

  /**
   * Force refetch subscriptions, bypassing the cache
   */
  const refetch = useCallback(async () => {
    // Clear cache to force a fresh fetch
    cachedSubscriptions = null;
    cacheTimestamp = 0;
    await loadSubscriptions();
  }, [loadSubscriptions]);

  // Load subscriptions on mount and when auth state changes
  useEffect(() => {
    loadSubscriptions();
  }, [loadSubscriptions]);

  // Migrate localStorage subscriptions to API when user logs in
  useEffect(() => {
    if (isAuthenticated && user) {
      const localSubs = loadLocalSubscriptions();
      if (localSubs.length > 0) {
        // Optionally migrate local subscriptions to API
        // For now, we just clear localStorage as API is source of truth
        // localStorage.removeItem(ANON_SUBSCRIPTIONS_KEY);
      }
    }
  }, [isAuthenticated, user, loadLocalSubscriptions]);

  return {
    subscriptions,
    loading,
    error,
    toggleSubscription,
    setMultipleSubscriptions,
    hasSubscription,
    getServiceIds,
    subscriptionCount,
    hasSetupSubscriptions,
    refetch,
  };
}
