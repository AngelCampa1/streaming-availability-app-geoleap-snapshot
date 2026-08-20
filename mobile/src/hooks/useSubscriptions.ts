import { useState, useEffect, useCallback } from 'react';
import {
  UserStreamingSubscription,
  AddSubscriptionRequest,
  UpdateSubscriptionRequest,
} from '../types/streaming';
import { ApiService } from '../services/api/ApiService';
import { logger } from '../utils/logger';

interface UseSubscriptionsReturn {
  subscriptions: UserStreamingSubscription[];
  loading: boolean;
  error: string | null;
  addSubscription: (request: AddSubscriptionRequest) => Promise<UserStreamingSubscription | null>;
  updateSubscription: (serviceId: string, request: UpdateSubscriptionRequest) => Promise<UserStreamingSubscription | null>;
  removeSubscription: (serviceId: string) => Promise<boolean>;
  hasSubscription: (serviceId: string) => boolean;
  getServiceIds: () => string[];
  refetch: () => Promise<void>;
  clearError: () => void;
}

/**
 * Custom hook for managing user's streaming service subscriptions
 * Provides CRUD operations and state management for subscription data
 */
export function useSubscriptions(): UseSubscriptionsReturn {
  const [subscriptions, setSubscriptions] = useState<UserStreamingSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all user subscriptions from the backend
   */
  const fetchSubscriptions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const apiService = new ApiService();
      const response = await apiService.get<UserStreamingSubscription[]>('/api/usersubscriptions');

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch subscriptions');
      }

      const data = response.data || [];

      // Filter to only active subscriptions
      const activeSubscriptions = data.filter((sub: UserStreamingSubscription) => sub.isActive);
      setSubscriptions(activeSubscriptions);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch subscriptions';
      setError(errorMessage);
      logger.error('[useSubscriptions] Error fetching subscriptions', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Add a new streaming service subscription
   */
  const addSubscription = useCallback(async (request: AddSubscriptionRequest): Promise<UserStreamingSubscription | null> => {
    try {
      setError(null);

      const apiService = new ApiService();
      const response = await apiService.post<UserStreamingSubscription>('/api/usersubscriptions', request);

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to add subscription');
      }

      const newSubscription = response.data;

      // Add to local state
      setSubscriptions(prev => [...prev, newSubscription]);

      return newSubscription;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add subscription';
      setError(errorMessage);
      logger.error('[useSubscriptions] Error adding subscription', err);
      return null;
    }
  }, []);

  /**
   * Update an existing subscription (e.g., change tier)
   */
  const updateSubscription = useCallback(async (
    serviceId: string,
    request: UpdateSubscriptionRequest,
  ): Promise<UserStreamingSubscription | null> => {
    try {
      setError(null);

      const apiService = new ApiService();
      const response = await apiService.put<UserStreamingSubscription>(
        `/api/usersubscriptions/${serviceId}`,
        request,
      );

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to update subscription');
      }

      const updatedSubscription = response.data;

      // Update in local state
      setSubscriptions(prev =>
        prev.map(sub => (sub.serviceId === serviceId ? updatedSubscription : sub)),
      );

      return updatedSubscription;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update subscription';
      setError(errorMessage);
      logger.error('[useSubscriptions] Error updating subscription', err);
      return null;
    }
  }, []);

  /**
   * Remove a streaming service subscription (soft delete)
   */
  const removeSubscription = useCallback(async (serviceId: string): Promise<boolean> => {
    try {
      setError(null);

      const apiService = new ApiService();
      const response = await apiService.delete(`/api/usersubscriptions/${serviceId}`);

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to remove subscription');
      }

      // Remove from local state
      setSubscriptions(prev => prev.filter(sub => sub.serviceId !== serviceId));

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove subscription';
      setError(errorMessage);
      logger.error('[useSubscriptions] Error removing subscription', err);
      return false;
    }
  }, []);

  /**
   * Check if user has a specific subscription
   */
  const hasSubscription = useCallback((serviceId: string): boolean => {
    return subscriptions.some(sub => sub.serviceId === serviceId && sub.isActive);
  }, [subscriptions]);

  /**
   * Get list of active service IDs
   */
  const getServiceIds = useCallback((): string[] => {
    return subscriptions
      .filter(sub => sub.isActive)
      .map(sub => sub.serviceId);
  }, [subscriptions]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Fetch subscriptions on mount
   */
  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  return {
    subscriptions,
    loading,
    error,
    addSubscription,
    updateSubscription,
    removeSubscription,
    hasSubscription,
    getServiceIds,
    refetch: fetchSubscriptions,
    clearError,
  };
}

export default useSubscriptions;
