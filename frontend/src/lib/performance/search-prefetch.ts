'use client';

import { QueryClient } from '@tanstack/react-query';
import { GlobalSearchRequest } from '@/lib/types/paywall';
import { searchGlobalContent } from '@/lib/api';

/**
 * Performance optimization utilities for search
 */

/**
 * Prefetch search results on hover for instant navigation
 */
export function prefetchSearchOnHover(request: GlobalSearchRequest, queryClient: QueryClient): void {
  const queryKey = ['search', request.query, request];

  // Check if already cached
  const existing = queryClient.getQueryData(queryKey);
  if (existing) return;

  // Prefetch with low priority
  queryClient.prefetchQuery({
    queryKey,
    queryFn: () => searchGlobalContent(request),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Prefetch next page for infinite scroll
 */
export function prefetchNextPage(currentRequest: GlobalSearchRequest, queryClient: QueryClient): void {
  const nextRequest: GlobalSearchRequest = {
    ...currentRequest,
    page: (currentRequest.page || 1) + 1,
  };

  const queryKey = ['search', nextRequest.query, nextRequest];

  queryClient.prefetchQuery({
    queryKey,
    queryFn: () => searchGlobalContent(nextRequest),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Cache warming for popular searches
 */
export function warmSearchCache(popularQueries: string[], queryClient: QueryClient): void {
  popularQueries.forEach(query => {
    const request: GlobalSearchRequest = {
      query,
      page: 1,
      pageSize: 10,
    };

    const queryKey = ['search', query, request];

    // Only prefetch if not already cached
    const existing = queryClient.getQueryData(queryKey);
    if (!existing) {
      queryClient.prefetchQuery({
        queryKey,
        queryFn: () => searchGlobalContent(request),
        staleTime: 10 * 60 * 1000, // Longer stale time for popular searches
      });
    }
  });
}

/**
 * Invalidate search cache after user action
 */
export function invalidateSearchCache(query: string, queryClient: QueryClient): void {
  queryClient.invalidateQueries({
    queryKey: ['search', query],
  });
}

/**
 * Clear all search cache
 */
export function clearSearchCache(queryClient: QueryClient): void {
  queryClient.removeQueries({
    queryKey: ['search'],
  });
}
