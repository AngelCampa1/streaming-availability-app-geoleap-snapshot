import { useState, useCallback, useRef, useEffect } from 'react';
import { ShowStreamingDetails, UserLocationResponse } from '@/types/streaming';
import { API_BASE_URL } from '@/config/api';

export function useStreamingDetails() {
  const [details, setDetails] = useState<ShowStreamingDetails | null>(null);
  const [location, setLocation] = useState<UserLocationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for cleanup and cancellation
  const mountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const fetchStreamingDetails = useCallback(async (showId: string, userServiceIds?: string[]) => {
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      if (mountedRef.current) {
        setLoading(true);
        setError(null);
      }

      // Build headers - include user's service IDs for anonymous users
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Auth-Mode': 'cookie',
      };

      // Pass user's subscriptions via header for anonymous users
      if (userServiceIds && userServiceIds.length > 0) {
        headers['X-User-Services'] = userServiceIds.join(',');
      }

      // Cookies are automatically sent with credentials: 'include'
      const response = await fetch(`${API_BASE_URL}/api/search/shows/${showId}/streaming-details`, {
        credentials: 'include',
        headers,
        signal: abortControllerRef.current.signal,
      });

      // Check if still mounted after async operation
      if (!mountedRef.current) return null;

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.message || errorData?.error?.message || 'Failed to fetch streaming details';
        console.error('Streaming details fetch failed:', {
          showId,
          status: response.status,
          statusText: response.statusText,
          error: errorMessage,
        });
        throw new Error(errorMessage);
      }

      const data = await response.json();
      if (mountedRef.current) setDetails(data);
      return data;
    } catch (err) {
      // Ignore abort errors - they're intentional
      if (err instanceof Error && err.name === 'AbortError') {
        return null;
      }
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      if (mountedRef.current) setError(errorMessage);
      console.error('Error fetching streaming details:', {
        showId,
        error: err,
        message: errorMessage,
      });
      throw err;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  const fetchUserLocation = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/search/location`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: abortControllerRef.current?.signal,
      });

      // Check if still mounted after async operation
      if (!mountedRef.current) return null;

      if (!response.ok) {
        console.warn('Location fetch failed (non-critical):', {
          status: response.status,
          statusText: response.statusText,
        });
        return null;
      }

      const data = await response.json();
      if (mountedRef.current) setLocation(data);
      return data;
    } catch (err) {
      // Ignore abort errors - they're intentional
      if (err instanceof Error && err.name === 'AbortError') {
        return null;
      }
      console.warn('Error fetching location (non-critical):', err);
      // Don't set error state for location - it's not critical
      return null;
    }
  }, []);

  return {
    details,
    location,
    loading,
    error,
    fetchStreamingDetails,
    fetchUserLocation,
  };
}
