import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { useMemo, useState, useEffect } from 'react';
import { RequestDeduplicator, useDebounce } from '@/lib/performance-utils';
import { GlobalSearchRequest, GlobalSearchResponse, AutocompleteSuggestion } from '@/lib/types';

/**
 * Custom error type for signup required responses (anonymous search limit exceeded)
 * Backend returns 403 with requiresSignup: true after 3 anonymous searches
 */
export interface SignupRequiredError extends Error {
  requiresSignup: boolean;
  searchesUsed: number;
  searchLimit: number;
}

/**
 * Check if an error is a SignupRequiredError
 */
export function isSignupRequiredError(error: unknown): error is SignupRequiredError {
  return (
    error instanceof Error &&
    'requiresSignup' in error &&
    (error as SignupRequiredError).requiresSignup === true
  );
}

/**
 * Sanitize search input to prevent XSS and injection attacks
 * Strips HTML tags and removes dangerous characters before sending to API
 */
function sanitizeSearchInput(input: string): string {
  if (!input) return input;
  return input
    .replace(/<[^>]*>/g, '')  // Remove HTML tags
    .replace(/[<>]/g, '')     // Remove remaining angle brackets
    .trim();
}

/**
 * Handle search response errors
 * Detects 403 signup-required responses (anonymous search limit exceeded)
 * and throws appropriate error types for proper UI handling
 */
async function handleSearchError(response: Response): Promise<never> {
  if (response.status === 403) {
    try {
      const errorData = await response.json();
      if (errorData.requiresSignup) {
        const signupError = new Error(
          errorData.message || 'Free search limit reached. Please sign up to continue.'
        ) as SignupRequiredError;
        signupError.requiresSignup = true;
        signupError.searchesUsed = errorData.searchesUsed || 3;
        signupError.searchLimit = errorData.searchLimit || 3;
        throw signupError;
      }
    } catch (parseError) {
      // If JSON parsing fails, check if it's already a SignupRequiredError
      if (isSignupRequiredError(parseError)) {
        throw parseError;
      }
    }
  }
  throw new Error(`Search failed: ${response.statusText}`);
}

// Request deduplicator instances
const searchDeduplicator = new RequestDeduplicator<GlobalSearchResponse>();
const autocompleteDeduplicator = new RequestDeduplicator<AutocompleteSuggestion[]>();

// BUG FIX: Export cleanup function for memory management
export function cleanupSearchDeduplicators(): void {
  searchDeduplicator.clear();
  autocompleteDeduplicator.clear();
}

/**
 * Optimized search hook with caching and deduplication
 */
export function useOptimizedSearch(searchRequest: GlobalSearchRequest & { query: string }) {
  const { query, ...filters } = searchRequest;

  // Create a stable cache key by serializing filters to avoid new object reference on every render
  const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);
  const queryKey = useMemo(() => ['search', query?.trim().toLowerCase(), filtersKey], [query, filtersKey]);

  // Debounce the search query to reduce API calls
  const debouncedQuery = useDebounce(query, 400, [query]);

  return useQuery({
    queryKey: queryKey,
    queryFn: async () => {
      if (!debouncedQuery?.trim()) {
        return null;
      }

      const searchKey = JSON.stringify({ query: debouncedQuery, ...filters });

      return searchDeduplicator.execute(searchKey, async () => {
        const response = await fetch('/api/search/global', {
          method: 'POST',
          credentials: 'include',  // BUG FIX: Include session cookies for authentication
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: sanitizeSearchInput(debouncedQuery),  // BUG FIX: Sanitize input to prevent XSS
            ...filters,
          }),
        });

        if (!response.ok) {
          await handleSearchError(response);
        }

        return response.json();
      });
    },
    enabled: !!debouncedQuery?.trim(),
    staleTime: 2 * 60 * 1000, // 2 minutes - search results can be cached longer
    gcTime: 5 * 60 * 1000, // 5 minutes
    // BUG FIX: Don't retry on signup-required errors (403 with requiresSignup)
    retry: (failureCount, error) => {
      if (isSignupRequiredError(error)) return false;
      return failureCount < 2;
    },
    retryDelay: 1000,
  });
}

/**
 * Infinite query for paginated search results
 */
export function useInfiniteSearch(searchRequest: GlobalSearchRequest & { query: string }) {
  const { query, ...filters } = searchRequest;

  // Create a stable cache key by serializing filters to avoid new object reference on every render
  const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);
  const queryKey = useMemo(() => ['search-infinite', query?.trim().toLowerCase(), filtersKey], [query, filtersKey]);

  const debouncedQuery = useDebounce(query, 400, [query]);

  return useInfiniteQuery({
    queryKey: queryKey,
    queryFn: async ({ pageParam = 1 }) => {
      if (!debouncedQuery?.trim()) {
        return { results: [], totalResults: 0, pageSize: 20, currentPage: 1 };
      }

      const searchKey = JSON.stringify({
        query: debouncedQuery,
        ...filters,
        page: pageParam,
      });

      return searchDeduplicator.execute(searchKey, async () => {
        const response = await fetch('/api/search/global', {
          method: 'POST',
          credentials: 'include',  // BUG FIX: Include session cookies for authentication
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: sanitizeSearchInput(debouncedQuery),  // BUG FIX: Sanitize input to prevent XSS
            page: pageParam,
            pageSize: 20,
            ...filters,
          }),
        });

        if (!response.ok) {
          await handleSearchError(response);
        }

        const data = await response.json();

        // Normalize response to handle both camelCase and PascalCase from backend
        // Backend may return different casing for authenticated vs anonymous users
        return {
          results: data.results || data.Results || [],
          totalResults: data.totalResults ?? data.TotalResults ?? 0,
          page: data.page ?? data.Page ?? 1,
          pageSize: data.pageSize ?? data.PageSize ?? 20,
          hasMore: data.hasMore ?? data.HasMore ?? false,
          metadata: data.metadata || data.Metadata || null,
          facets: data.facets || data.Facets || null,
          searchedAt: data.searchedAt || data.SearchedAt || null,
          suggestions: data.suggestions || data.Suggestions || [],
          query: data.query || data.Query || '',
          responseTime: data.responseTime ?? data.ResponseTime ?? 0,
          totalPages: data.totalPages ?? data.TotalPages ?? 0,
          paywallInfo: data.paywallInfo || data.PaywallInfo || null,
          searchTimeMs: data.searchTimeMs ?? data.SearchTimeMs ?? 0,
        };
      });
    },
    enabled: !!debouncedQuery?.trim(),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const currentPage = allPages.length;
      const totalPages = Math.ceil(lastPage.totalResults / lastPage.pageSize);
      return currentPage < totalPages ? currentPage + 1 : undefined;
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Optimized autocomplete hook
 */
export function useOptimizedAutocomplete(query: string, maxSuggestions: number = 5, enabled: boolean = true) {
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

  return useQuery({
    queryKey: ['autocomplete', debouncedQuery?.trim().toLowerCase(), maxSuggestions],
    queryFn: async () => {
      if (!debouncedQuery?.trim() || debouncedQuery.length < 2) {
        return [];
      }

      const autocompleteKey = `${debouncedQuery}-${maxSuggestions}`;

      return autocompleteDeduplicator.execute(autocompleteKey, async () => {
        const response = await fetch(
          `/api/search/autocomplete?${new URLSearchParams({
            query: sanitizeSearchInput(debouncedQuery),  // BUG FIX: Sanitize autocomplete input
            maxSuggestions: maxSuggestions.toString(),
          })}`,
          {
            credentials: 'include',  // BUG FIX: Include session cookies for authentication
          }
        );

        if (!response.ok) {
          throw new Error(`Autocomplete failed: ${response.statusText}`);
        }

        return response.json();
      });
    },
    enabled: enabled && !!debouncedQuery?.trim() && debouncedQuery.length >= 2,
    staleTime: 5 * 60 * 1000, // 5 minutes for autocomplete
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1, // Less retry for autocomplete
  });
}

/**
 * Hook to prefetch search results for likely user actions
 */
export function usePrefetchSearch() {
  // This would be implemented based on user behavior analytics
  // For now, we can prefetch popular/trending searches

  return useQuery({
    queryKey: ['trending-searches'],
    queryFn: async () => {
      const response = await fetch('/api/search/trending', {
        credentials: 'include',  // BUG FIX: Include session cookies
      });
      if (!response.ok) return [];
      return response.json();
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  });
}

/**
 * Cache warming utility for critical searches
 */
export function useWarmCache() {
  // Warm cache with popular searches when the app loads
  useQuery({
    queryKey: ['popular-searches'],
    queryFn: async () => {
      const response = await fetch('/api/search/popular', {
        credentials: 'include',  // BUG FIX: Include session cookies
      });
      if (!response.ok) return [];
      return response.json();
    },
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 120 * 60 * 1000, // 2 hours
  });
}
