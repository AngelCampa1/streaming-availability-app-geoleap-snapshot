'use client';

import { useQuery, useInfiniteQuery, UseQueryOptions, QueryClient } from '@tanstack/react-query';
import { GlobalSearchRequest, PaywalledSearchResponse } from '@/lib/types/paywall';
import { searchGlobalContent } from '@/lib/api';

/**
 * React Query hook for search with automatic caching and deduplication
 * Implements stale-while-revalidate pattern for optimal performance
 */
export function useSearchQuery(
  request: GlobalSearchRequest,
  options?: Partial<UseQueryOptions<PaywalledSearchResponse>>
) {
  const queryKey = ['search', request.query, request];

  return useQuery<PaywalledSearchResponse>({
    queryKey,
    queryFn: () => searchGlobalContent(request),
    enabled: !!request.query?.trim(),
    staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh
    gcTime: 30 * 60 * 1000, // 30 minutes - cache garbage collection (was cacheTime)
    refetchOnWindowFocus: false, // Don't refetch on window focus for search results
    refetchOnMount: false, // Don't refetch if data exists
    // BUG-009 & BUG-012 FIX: Don't retry on auth errors
    retry: (failureCount, error) => {
      // Don't retry auth errors
      if (error instanceof Error && (error.message.includes('401') || error.message.includes('403'))) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options,
  });
}

/**
 * Infinite scroll version with automatic pagination
 */
export function useInfiniteSearchQuery(
  baseRequest: Omit<GlobalSearchRequest, 'page'>,
  options?: Partial<Parameters<typeof useInfiniteQuery<PaywalledSearchResponse>>[0]>
) {
  return useInfiniteQuery<PaywalledSearchResponse>({
    queryKey: ['search-infinite', baseRequest.query, baseRequest],
    queryFn: ({ pageParam = 1 }) =>
      searchGlobalContent({
        ...baseRequest,
        page: pageParam as number,
      }),
    enabled: !!baseRequest.query?.trim(),
    initialPageParam: 1,
    getNextPageParam: lastPage => {
      const hasMore = lastPage.results.length === (baseRequest.pageSize || 10);
      return hasMore ? (lastPage as { page?: number })?.page ? (lastPage as { page: number }).page + 1 : 2 : undefined;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
    ...options,
  });
}

/**
 * Prefetch search results for faster navigation
 */
export function prefetchSearch(request: GlobalSearchRequest, queryClient: QueryClient): Promise<void> {
  return queryClient.prefetchQuery({
    queryKey: ['search', request.query, request],
    queryFn: () => searchGlobalContent(request),
    staleTime: 5 * 60 * 1000,
  });
}
