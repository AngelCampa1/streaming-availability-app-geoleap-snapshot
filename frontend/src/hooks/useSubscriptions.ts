import { useState, useEffect } from 'react';
import { UserStreamingSubscription, AddSubscriptionRequest, UpdateSubscriptionRequest } from '@/types/streaming';
import { API_BASE_URL } from '@/config/api';

export function useSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<UserStreamingSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/api/usersubscriptions`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Mode': 'cookie',
        },
      });

      if (!response.ok) {
        console.error('Subscriptions fetch failed:', {
          status: response.status,
          statusText: response.statusText,
        });
        throw new Error('Failed to fetch subscriptions');
      }

      const data = await response.json();
      setSubscriptions(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error fetching subscriptions:', {
        error: err,
        message: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const addSubscription = async (request: AddSubscriptionRequest) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/usersubscriptions`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Mode': 'cookie',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.message || 'Failed to add subscription';
        console.error('Add subscription failed:', {
          request,
          status: response.status,
          error: errorMessage,
        });
        throw new Error(errorMessage);
      }

      const newSubscription = await response.json();
      setSubscriptions(prev => [...prev, newSubscription]);
      return newSubscription;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error adding subscription:', {
        request,
        error: err,
      });
      throw err;
    }
  };

  const updateSubscription = async (serviceId: string, request: UpdateSubscriptionRequest) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/usersubscriptions/${serviceId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Mode': 'cookie',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        console.error('Update subscription failed:', {
          serviceId,
          status: response.status,
        });
        throw new Error('Failed to update subscription');
      }

      const updatedSubscription = await response.json();
      setSubscriptions(prev => prev.map(sub => (sub.serviceId === serviceId ? updatedSubscription : sub)));
      return updatedSubscription;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error updating subscription:', {
        serviceId,
        error: err,
      });
      throw err;
    }
  };

  const removeSubscription = async (serviceId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/usersubscriptions/${serviceId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'X-Auth-Mode': 'cookie',
        },
      });

      if (!response.ok) {
        console.error('Remove subscription failed:', {
          serviceId,
          status: response.status,
        });
        throw new Error('Failed to remove subscription');
      }

      setSubscriptions(prev => prev.filter(sub => sub.serviceId !== serviceId));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error removing subscription:', {
        serviceId,
        error: err,
      });
      throw err;
    }
  };

  const hasSubscription = (serviceId: string): boolean => {
    return subscriptions.some(sub => sub.serviceId === serviceId && sub.isActive);
  };

  const getServiceIds = (): string[] => {
    return subscriptions.filter(sub => sub.isActive).map(sub => sub.serviceId);
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

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
  };
}
