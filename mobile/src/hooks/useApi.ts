/**
 * API State Management Hook for GeoLeap Mobile App
 * Provides comprehensive state management for API calls including loading, error, and data states
 * Handles caching, retries, and automatic refresh
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { ApiService, type ApiResponse, type ApiRequestOptions } from '../services/api/ApiService';
import { NetworkService } from '../services/api/NetworkService';
import { CacheService } from '../services/api/CacheService';
import { logger } from '../utils/logger';

export interface UseApiOptions<T = any> extends Omit<ApiRequestOptions, 'body' | 'params'> {
  params?: Record<string, any>;
  initialData?: T;
  enabled?: boolean;
  refetchOnMount?: boolean;
  refetchOnWindowFocus?: boolean;
  refetchOnReconnect?: boolean;
  staleTime?: number;
  cacheTime?: number;
  retry?: number;
  retryDelay?: number;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  onSettled?: (data: T | undefined, error: Error | null) => void;
  select?: (data: any) => T;
  transform?: (data: any) => T;
}

export interface UseApiResult<T = any> {
  data: T | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  mutate: (newData: T) => void;
  invalidate: () => Promise<void>;
  reset: () => void;
  status: 'idle' | 'loading' | 'error' | 'success';
  lastUpdated: number | null;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  staleTime: number;
  promise?: Promise<T>;
}

const globalCache = new Map<string, CacheEntry<any>>();
const networkService = new NetworkService();
const cacheService = new CacheService();

/**
 * Custom hook for API state management
 */
export function useApi<T = any>(
  endpoint: string,
  options: UseApiOptions<T> = {},
): UseApiResult<T> {
  const {
    initialData,
    enabled = true,
    refetchOnMount = true,
    refetchOnReconnect = true,
    staleTime = 5 * 60 * 1000, // 5 minutes
    cacheTime = 10 * 60 * 1000, // 10 minutes
    retry = 3,
    retryDelay = 1000,
    onSuccess,
    onError,
    onSettled,
    select,
    transform,
    ...apiOptions
  } = options;

  // State management
  const [state, setState] = useState<{
    data: T | undefined;
    isLoading: boolean;
    isFetching: boolean;
    isError: boolean;
    error: Error | null;
    status: UseApiResult['status'];
    lastUpdated: number | null;
  }>({
    data: initialData,
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null,
    status: 'idle',
    lastUpdated: null,
  });

  // Refs for tracking requests and cache
  const mountedRef = useRef(true);
  const requestIdRef = useRef<string | null>(null);
  const retryCountRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const cacheCleanupTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  // Generate cache key (only include serializable params)
  const cacheKey = `${endpoint}:${JSON.stringify(options.params || {})}`;

  // Update state safely
  const safeSetState = useCallback((updater: (prev: typeof state) => typeof state) => {
    if (mountedRef.current) {
      setState(updater);
    }
  }, []);

  // Transform data if needed
  const processData = useCallback((rawData: any): T => {
    if (transform) {
      return transform(rawData);
    }
    if (select) {
      return select(rawData);
    }
    return rawData as T;
  }, [transform, select]);

  // Execute API request
  const executeRequest = useCallback(async (
    skipCache = false,
  ): Promise<T> => {
    // Check cache first
    if (!skipCache) {
      const cachedEntry = globalCache.get(cacheKey);
      if (cachedEntry && Date.now() < cachedEntry.staleTime) {
        logger.debug('Using cached data for:', endpoint);
        const processedData = processData(cachedEntry.data);

        // Update state for cache hit
        safeSetState(prev => ({
          ...prev,
          data: processedData,
          isLoading: false,
          isFetching: false,
          isError: false,
          error: null,
          status: 'success',
          lastUpdated: cachedEntry.timestamp,
        }));

        return processedData;
      }

      // If cache entry exists but is stale, return it while fetching fresh data
      if (cachedEntry && cachedEntry.promise) {
        logger.debug('Using in-flight request for:', endpoint);
        return cachedEntry.promise;
      }
    }

    // Create abort controller
    abortControllerRef.current = new AbortController();
    requestIdRef.current = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    safeSetState(prev => ({
      ...prev,
      isFetching: true,
      ...(prev.status === 'idle' && { isLoading: true, status: 'loading' }),
    }));

    // Create request promise - use async execution pattern
    const requestPromise = Promise.resolve().then(async (): Promise<T> => {
      try {
        const apiService = new ApiService();

        const response: ApiResponse = await apiService.get(endpoint, {
          ...apiOptions,
        });

        if (response.success) {
          const processedData = processData(response.data);

          // Update cache
          globalCache.set(cacheKey, {
            data: response.data,
            timestamp: Date.now(),
            staleTime: Date.now() + staleTime,
          });

          // Clear cache after cacheTime
          const timerId = setTimeout(() => {
            globalCache.delete(cacheKey);
            cacheCleanupTimersRef.current.delete(timerId);
          }, cacheTime);
          cacheCleanupTimersRef.current.add(timerId);

          retryCountRef.current = 0;

          safeSetState(prev => ({
            ...prev,
            data: processedData,
            isFetching: false,
            isLoading: false,
            isError: false,
            error: null,
            status: 'success',
            lastUpdated: Date.now(),
          }));

          onSuccess?.(processedData);
          onSettled?.(processedData, null);

          return processedData;
        } else {
          // Throw error to be caught by catch block below
          throw new Error(response.error?.message || 'Request failed');
        }

      } catch (error: any) {
        logger.error('API request failed:', {
          endpoint,
          error: error.message,
          retryCount: retryCountRef.current,
        });

        // Retry logic
        if (retryCountRef.current < retry) {
          retryCountRef.current++;
          const delay = retryDelay * Math.pow(2, retryCountRef.current - 1);

          logger.debug(`Retrying request in ${delay}ms (attempt ${retryCountRef.current})`);

          // Wait and retry
          await new Promise<void>(resolve => setTimeout(() => resolve(), delay));

          if (mountedRef.current) {
            return await executeRequest(skipCache);
          } else {
            throw new Error('Component unmounted');
          }
        }

        const errorObj = error instanceof Error ? error : new Error(error.message || 'Unknown error');

        safeSetState(prev => ({
          ...prev,
          isFetching: false,
          isLoading: false,
          isError: true,
          error: errorObj,
          status: 'error',
          lastUpdated: null,
        }));

        onError?.(errorObj);
        onSettled?.(undefined, errorObj);

        // Remove failed entry from cache
        globalCache.delete(cacheKey);

        throw errorObj;
      }
    });

    // Store promise in cache to prevent duplicate requests
    if (!skipCache) {
      const cachedEntry = globalCache.get(cacheKey);
      if (cachedEntry) {
        cachedEntry.promise = requestPromise;
      } else {
        globalCache.set(cacheKey, {
          data: null,
          timestamp: Date.now(),
          staleTime: Date.now() + staleTime,
          promise: requestPromise,
        });
      }
    }

    return requestPromise;

  }, [
    endpoint,
    cacheKey,
    apiOptions,
    staleTime,
    cacheTime,
    retry,
    retryDelay,
    processData,
    onSuccess,
    onError,
    onSettled,
    safeSetState,
  ]);

  // Refetch function
  const refetch = useCallback(async () => {
    retryCountRef.current = 0;
    await executeRequest(true); // Force refresh
  }, [executeRequest]);

  // Mutate function for optimistic updates
  const mutate = useCallback((newData: T) => {
    safeSetState(prev => ({
      ...prev,
      data: newData,
      lastUpdated: Date.now(),
    }));

    // Update cache
    const cachedEntry = globalCache.get(cacheKey);
    if (cachedEntry) {
      cachedEntry.data = newData;
      cachedEntry.staleTime = Date.now(); // Mark as stale to force refetch
    }
  }, [cacheKey, safeSetState]);

  // Invalidate cache and refetch
  const invalidate = useCallback(async () => {
    globalCache.delete(cacheKey);
    await cacheService.remove(cacheKey);
    await refetch();
  }, [cacheKey, refetch]);

  // Reset state
  const reset = useCallback(() => {
    abortControllerRef.current?.abort();
    retryCountRef.current = 0;

    safeSetState(() => ({
      data: initialData,
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
      status: 'idle',
      lastUpdated: null,
    }));
  }, [initialData, safeSetState]);

  // Initial data fetch
  useEffect(() => {
    if (!enabled) {
      return;
    }

    let shouldRefetch = true;

    // Check if we should refetch on mount
    if (!refetchOnMount) {
      const cachedEntry = globalCache.get(cacheKey);
      if (cachedEntry && Date.now() < cachedEntry.staleTime) {
        shouldRefetch = false;
      }
    }

    if (shouldRefetch) {
      executeRequest();
    }

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [enabled, refetchOnMount, cacheKey, executeRequest]);

  // Network reconnection handling
  useEffect(() => {
    if (!refetchOnReconnect) {
      return;
    }

    const unsubscribe = networkService.onConnectionChange((status) => {
      if (status.isConnected && state.status === 'error') {
        // Retry on reconnection
        retryCountRef.current = 0;
        executeRequest();
      }
    });

    return unsubscribe;
  }, [refetchOnReconnect, state.status, executeRequest]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      abortControllerRef.current?.abort();
      cacheCleanupTimersRef.current.forEach(timerId => clearTimeout(timerId));
      cacheCleanupTimersRef.current.clear();
    };
  }, []);

  return {
    data: state.data,
    isLoading: state.isLoading,
    isFetching: state.isFetching,
    isSuccess: state.status === 'success',
    isError: state.isError,
    error: state.error,
    refetch,
    mutate,
    invalidate,
    reset,
    status: state.status,
    lastUpdated: state.lastUpdated,
  };
}

/**
 * Hook for mutations (POST, PUT, DELETE)
 */
export function useApiMutation<TData = any, TVariables = void>(
  endpoint: string,
  options: {
    method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (error: Error, variables: TVariables) => void;
    onSettled?: (data: TData | undefined, error: Error | null, variables: TVariables) => void;
    invalidateQueries?: string[];
    optimisticUpdate?: (variables: TVariables) => any;
    rollback?: (previousData: any) => void;
  } = {},
) {
  const {
    method = 'POST',
    onSuccess,
    onError,
    onSettled,
    invalidateQueries = [],
    optimisticUpdate,
    rollback,
  } = options;

  const [state, setState] = useState<{
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
    data: TData | undefined;
  }>({
    isLoading: false,
    isError: false,
    error: null,
    data: undefined,
  });

  const mountedRef = useRef(true);
  const previousDataRef = useRef<any>(null);

  const safeSetState = useCallback((updater: (prev: typeof state) => typeof state) => {
    if (mountedRef.current) {
      setState(updater);
    }
  }, []);

  const mutate = useCallback(async (variables: TVariables): Promise<TData> => {
    try {
      // Optimistic update
      if (optimisticUpdate) {
        previousDataRef.current = optimisticUpdate(variables);
      }

      safeSetState(prev => ({
        ...prev,
        isLoading: true,
        isError: false,
        error: null,
      }));

      const apiService = new ApiService();

      let response: ApiResponse;

      switch (method) {
        case 'POST':
          response = await apiService.post(endpoint, variables);
          break;
        case 'PUT':
          response = await apiService.put(endpoint, variables);
          break;
        case 'PATCH':
          response = await apiService.patch(endpoint, variables);
          break;
        case 'DELETE':
          response = await apiService.delete(endpoint, { params: variables as any });
          break;
        default:
          throw new Error(`Unsupported method: ${method}`);
      }

      if (response.success) {
        const data = response.data as TData;

        safeSetState(() => ({
          isLoading: false,
          isError: false,
          error: null,
          data,
        }));

        onSuccess?.(data, variables);
        onSettled?.(data, null, variables);

        // Invalidate related queries
        for (const queryKey of invalidateQueries) {
          globalCache.delete(queryKey);
        }

        return data;
      } else {
        throw new Error(response.error?.message || 'Mutation failed');
      }

    } catch (error: any) {
      // Rollback optimistic update
      if (rollback && previousDataRef.current !== null) {
        rollback(previousDataRef.current);
      }

      const errorObj = error instanceof Error ? error : new Error(error.message || 'Unknown error');

      safeSetState(prev => ({
        ...prev,
        isLoading: false,
        isError: true,
        error: errorObj,
      }));

      onError?.(errorObj, variables);
      onSettled?.(undefined, errorObj, variables);

      throw errorObj;
    }
  }, [
    endpoint,
    method,
    optimisticUpdate,
    rollback,
    onSuccess,
    onError,
    onSettled,
    invalidateQueries,
    safeSetState,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    mutate,
    data: state.data,
    isLoading: state.isLoading,
    isError: state.isError,
    error: state.error,
    reset: () => {
      safeSetState(() => ({
        isLoading: false,
        isError: false,
        error: null,
        data: undefined,
      }));
    },
  };
}

/**
 * Hook for infinite scrolling / pagination
 */
export function useApiInfinite<TData = any>(
  endpoint: string,
  options: {
    getNextPageParam?: (lastPage: TData, allPages: TData[]) => any;
    enabled?: boolean;
    staleTime?: number;
    cacheTime?: number;
    params?: Record<string, any>;
  } & Omit<UseApiOptions, 'params'> = {},
) {
  const {
    getNextPageParam,
    enabled = true,
    staleTime: _staleTime = 5 * 60 * 1000,
    cacheTime: _cacheTime = 10 * 60 * 1000,
    params: optionsParams,
    ...apiOptions
  } = options;

  const [pages, setPages] = useState<TData[]>([]);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);

  const fetchNextPage = useCallback(async () => {
    if (!hasNextPage || isFetchingNextPage) {
      return;
    }

    setIsFetchingNextPage(true);

    try {
      // Guard against empty pages array - use undefined for first page
      const lastPage = pages.length > 0 ? pages[pages.length - 1] : undefined;
      const pageParam = getNextPageParam?.(lastPage, pages);

      const apiService = new ApiService();
      const response = await apiService.get(endpoint, {
        ...apiOptions,
        params: { ...(optionsParams || {}), page: pageParam },
      });

      if (response.success) {
        setPages(prev => [...prev, response.data]);
        setHasNextPage(!!getNextPageParam?.(response.data, [...pages, response.data]));
      }
    } catch (error) {
      logger.error('Failed to fetch next page:', error);
    } finally {
      setIsFetchingNextPage(false);
    }
  }, [endpoint, pages, hasNextPage, isFetchingNextPage, getNextPageParam, apiOptions]);

  const reset = useCallback(() => {
    setPages([]);
    setHasNextPage(true);
    setIsFetchingNextPage(false);
  }, []);

  // Initial fetch
  useEffect(() => {
    if (enabled && pages.length === 0) {
      fetchNextPage();
    }
  }, [enabled, pages.length, fetchNextPage]);

  return {
    pages,
    data: pages,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    reset,
    isLoading: pages.length === 0 && enabled,
  };
}

/**
 * Global cache management
 */
export const apiCache = {
  clear: () => {
    globalCache.clear();
  },
  invalidate: (key: string) => {
    globalCache.delete(key);
  },
  getData: (key: string) => {
    return globalCache.get(key)?.data;
  },
  setData: (key: string, data: any, staleTime?: number) => {
    globalCache.set(key, {
      data,
      timestamp: Date.now(),
      staleTime: Date.now() + (staleTime || 5 * 60 * 1000),
    });
  },
};

export default useApi;
