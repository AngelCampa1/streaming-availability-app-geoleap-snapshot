import { useState, useCallback } from 'react';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { logger } from '../utils/logger';
import { searchService } from '../services/searchService';
import { SearchItem, SearchFilter } from '../types/search';

export const useSearch = () => {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilter>({});
  const [isSearching, setIsSearching] = useState(false);

  // Infinite query for search results with pagination
  const {
    data: searchResults,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingResults,
    error: searchError,
    refetch: refetchResults,
  } = useInfiniteQuery({
    queryKey: ['search', query, filters],
    queryFn: ({ pageParam: _pageParam = 1 }) => {
      const searchQuery = {
        query,
        filters: {
          ...filters,
          limit: 20,
        },
        sortBy: 'relevance' as const,
      };
      return searchService.search(searchQuery).then(results => ({
        items: results.map(r => ({
          id: r.id,
          title: r.title,
          description: r.description || '',
          // BUG-010 FIX: Map 'server'/'feature' types to 'content' for compatibility
          type: (r.type === 'server' || r.type === 'feature' ? 'content' : r.type) as 'content' | 'user' | 'channel' | 'location',
          createdAt: new Date(),
        })),
        totalCount: results.length,
        hasMore: false,
        filters,
        query,
      }));
    },
    getNextPageParam: (lastPage: { hasMore?: boolean; items?: unknown[] }) =>
      lastPage?.hasMore ? (lastPage.items?.length ?? 0) + 1 : undefined,
    initialPageParam: 1,
    enabled: query.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Flatten infinite query results
  const allResults: SearchItem[] = (searchResults?.pages ?? []).flatMap((page: { items?: SearchItem[] }) => page.items ?? []);

  // Search history query
  const {
    data: searchHistory,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ['searchHistory'],
    queryFn: () => searchService.getSearchHistory(),
    staleTime: 30 * 1000, // 30 seconds
  });

  // Autocomplete query
  const {
    data: autoCompleteResults,
    isLoading: isLoadingAutoComplete,
  } = useQuery({
    queryKey: ['autocomplete', query],
    queryFn: () => searchService.getSuggestions(query),
    enabled: query.length > 1,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Trending searches query
  const {
    data: trendingSearches,
  } = useQuery({
    queryKey: ['trendingSearches'],
    queryFn: () => searchService.getSuggestions(''),
    staleTime: 15 * 60 * 1000, // 15 minutes
  });

  // Perform search
  const performSearch = useCallback(async (searchQuery: string, searchFilters?: SearchFilter) => {
    if (!searchQuery.trim()) {return;}

    setIsSearching(true);
    setQuery(searchQuery);

    if (searchFilters) {
      setFilters(searchFilters);
    }

    try {
      await refetchResults();
    } finally {
      setIsSearching(false);
    }
  }, [refetchResults]);

  // Clear search
  const clearSearch = useCallback(() => {
    setQuery('');
    setFilters({});
    setIsSearching(false);
  }, []);

  // Update filters
  const updateFilters = useCallback((newFilters: SearchFilter) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Clear search history
  const clearHistory = useCallback(async () => {
    try {
      await searchService.clearSearchHistory();
      refetchHistory();
    } catch (error) {
      logger.error('[useSearch] Failed to clear search history', error);
      // Re-throw to let callers handle the error if needed
      throw error;
    }
  }, [refetchHistory]);

  // Remove history item
  const removeHistoryItem = useCallback(async (id: string) => {
    try {
      await searchService.removeFromSearchHistory(id);
      refetchHistory();
    } catch (error) {
      logger.error('[useSearch] Failed to remove history item', error);
      // Re-throw to let callers handle the error if needed
      throw error;
    }
  }, [refetchHistory]);

  return {
    // State
    query,
    filters,
    isSearching: isSearching || isLoadingResults,

    // Results
    results: allResults,
    totalResults: (searchResults?.pages?.[0] as { totalCount?: number })?.totalCount || 0,
    hasMoreResults: hasNextPage,
    isLoadingMore: isFetchingNextPage,
    searchError,

    // Autocomplete
    autoCompleteResults: autoCompleteResults || [],
    isLoadingAutoComplete,

    // History
    searchHistory: searchHistory || [],

    // Trending
    trendingSearches: trendingSearches || [],

    // Actions
    performSearch,
    clearSearch,
    updateFilters,
    fetchMoreResults: fetchNextPage,
    clearHistory,
    removeHistoryItem,
    refetchResults,
  };
};

export default useSearch;
