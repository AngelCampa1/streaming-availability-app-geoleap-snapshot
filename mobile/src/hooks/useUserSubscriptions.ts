/**
 * useUserSubscriptions Hook (Mobile)
 *
 * Manages user's streaming service subscriptions with support for both
 * anonymous users (AsyncStorage) and authenticated users (API).
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config/api';

/**
 * Subscription item structure
 */
export interface SubscriptionItem {
  serviceId: string;
  serviceName: string;
  isActive: boolean;
}

/**
 * AsyncStorage key for anonymous user subscriptions
 */
const ANON_SUBSCRIPTIONS_KEY = 'geoleap_subscriptions';

/**
 * Popular streaming services for fallback
 */
const POPULAR_SERVICES = [
  { id: 'netflix', name: 'Netflix' },
  { id: 'prime', name: 'Prime Video' },
  { id: 'disney', name: 'Disney+' },
  { id: 'hbo', name: 'HBO Max' },
  { id: 'hulu', name: 'Hulu' },
  { id: 'apple', name: 'Apple TV+' },
  { id: 'paramount', name: 'Paramount+' },
  { id: 'peacock', name: 'Peacock' },
];

/**
 * Hook that provides unified subscription management for both
 * anonymous users (AsyncStorage) and authenticated users (API)
 */
export function useUserSubscriptions() {
  const { state } = useAuth();
  const { isAuthenticated, user } = state;
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load subscriptions from AsyncStorage for anonymous users
   */
  const loadLocalSubscriptions = useCallback(async (): Promise<SubscriptionItem[]> => {
    try {
      const stored = await AsyncStorage.getItem(ANON_SUBSCRIPTIONS_KEY);
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
   * Save subscriptions to AsyncStorage for anonymous users
   */
  const saveLocalSubscriptions = useCallback(async (subs: SubscriptionItem[]) => {
    try {
      await AsyncStorage.setItem(ANON_SUBSCRIPTIONS_KEY, JSON.stringify(subs));
    } catch (err) {
      console.warn('Failed to save local subscriptions:', err);
    }
  }, []);

  /**
   * Load subscriptions from API for authenticated users
   */
  const loadApiSubscriptions = useCallback(async (): Promise<SubscriptionItem[]> => {
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
      return data.map((sub: { serviceId: string; serviceName: string; isActive: boolean }) => ({
        serviceId: sub.serviceId,
        serviceName: sub.serviceName,
        isActive: sub.isActive,
      }));
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
        const localSubs = await loadLocalSubscriptions();
        setSubscriptions(localSubs);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load subscriptions';
      setError(errorMessage);
      // Fall back to AsyncStorage if API fails
      if (isAuthenticated) {
        const localSubs = await loadLocalSubscriptions();
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

    // Optimistic update
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
      // Save to AsyncStorage for anonymous users
      await saveLocalSubscriptions(newSubscriptions);
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
      await saveLocalSubscriptions(newSubscriptions);
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

  // Load subscriptions on mount and when auth state changes
  useEffect(() => {
    loadSubscriptions();
  }, [loadSubscriptions]);

  // Migrate AsyncStorage subscriptions to API when user logs in
  useEffect(() => {
    if (state.isAuthenticated && state.user) {
      loadLocalSubscriptions().then(localSubs => {
        if (localSubs.length > 0) {
          // Optionally migrate local subscriptions to API
          // For now, we just clear AsyncStorage as API is source of truth
          // AsyncStorage.removeItem(ANON_SUBSCRIPTIONS_KEY);
        }
      });
    }
  }, [state.isAuthenticated, state.user, loadLocalSubscriptions]);

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
    refetch: loadSubscriptions,
  };
}
