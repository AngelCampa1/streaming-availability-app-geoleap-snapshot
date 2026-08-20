import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import {
  SearchResponse,
  SearchFilters,
  SearchSuggestion,
  SearchHistory,
  PopularSearch,
  SearchResult,
} from '../types/streaming';
import { searchService, SearchQuery } from '../services/search/SearchService';
import { searchHistoryService } from '../services/search/SearchHistoryService';

export interface UseEnhancedSearchOptions {
  enableSuggestions?: boolean;
  enableHistory?: boolean;
  enablePopularSearches?: boolean;
  debounceMs?: number;
  autoSearch?: boolean;
  cacheEnabled?: boolean;
}

export interface UseEnhancedSearchReturn {
  // State
  query: string;
  setQuery: (query: string) => void;
  filters: SearchFilters;
  setFilters: (filters: SearchFilters) => void;
  isSearching: boolean;
  isSearchingMore: boolean;

  // Results
  results: SearchResult[];
  totalResults: number;
  currentPage: number;
  totalPages: number;
  hasMoreResults: boolean;
  searchError: Error | null;

  // Suggestions
  suggestions: SearchSuggestion[];
  isLoadingSuggestions: boolean;
  showSuggestions: boolean;
  setShowSuggestions: (show: boolean) => void;

  // History
  searchHistory: SearchHistory[];
  frequentSearches: Array<{ query: string; count: number; lastSearched: number }>;
  todaySearches: SearchHistory[];

  // Popular searches
  popularSearches: PopularSearch[];

  // Actions
  performSearch: (query?: string, filters?: SearchFilters) => Promise<void>;
  loadMoreResults: () => void;
  clearSearch: () => void;
  addToHistory: (_history: Omit<SearchHistory, 'id' | 'timestamp'>) => Promise<void>;
  removeFromHistory: (id: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  refreshSearch: () => void;

  // Voice search
  voiceSearch: (transcript: string) => Promise<void>;

  // Analytics
  trackSearchClick: (contentId: string) => void;

  // Utility
  clearCache: () => void;
  getCacheStats: () => { size: number; totalMemoryUsage: number };
}

export const useEnhancedSearch = (options: UseEnhancedSearchOptions = {}): UseEnhancedSearchReturn => {
  const {
    enableSuggestions = true,
    enableHistory = true,
    enablePopularSearches = true,
    debounceMs = 300,
    autoSearch = false,
    cacheEnabled = true,
  } = options;

  // State
  const [query, setQueryState] = useState('');
  const [filters, setFiltersState] = useState<SearchFilters>({});
  const [showSuggestions, setShowSuggestionsState] = useState(false);
  const [_lastClickedContent, _setLastClickedContent] = useState<string | null>(null);

  // Refs for debouncing
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Infinite query for search results with pagination
  const {
    data: searchResultsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingResults,
    error: searchError,
    refetch: refetchResults,
  } = useInfiniteQuery({
    queryKey: ['search', query, filters],
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      const searchQuery: SearchQuery = {
        query,
        filters,
        page: pageParam,
        pageSize: 20,
      };
      return searchService.search(searchQuery);
    },
    getNextPageParam: (lastPage: SearchResponse) => {
      return lastPage?.pagination?.hasNextPage ? lastPage.pagination.page + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: query.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: cacheEnabled ? 10 * 60 * 1000 : 0, // 10 minutes (renamed from cacheTime)
  });

  // Flatten infinite query results
  const allResults = (searchResultsData?.pages ?? []).flatMap((page: SearchResponse) => page?.results ?? []);
  const firstPage = searchResultsData?.pages[0] as SearchResponse | undefined;
  const totalResults = firstPage?.pagination?.totalResults || 0;
  const currentPage = searchResultsData?.pages?.length || 1;
  const totalPages = firstPage?.pagination?.totalPages || 1;

  // Search suggestions query
  const {
    data: suggestionsData,
    isLoading: isLoadingSuggestions,
  } = useQuery({
    queryKey: ['search-suggestions', query],
    queryFn: () => searchService.getSuggestions(query, 10),
    enabled: enableSuggestions && query.length > 1,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Search history query
  const {
    data: historyData,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ['search-history'],
    queryFn: () => searchHistoryService.getHistory(),
    enabled: enableHistory,
    staleTime: 30 * 1000, // 30 seconds
  });

  // Popular searches query
  const {
    data: popularData,
  } = useQuery({
    queryKey: ['popular-searches'],
    queryFn: () => searchService.getPopularSearches(10),
    enabled: enablePopularSearches,
    staleTime: 15 * 60 * 1000, // 15 minutes
  });

  // Subscribe to history changes
  useEffect(() => {
    if (!enableHistory) {return;}

    const unsubscribe = searchHistoryService.subscribe((_history) => {
      refetchHistory();
    });

    return unsubscribe;
  }, [enableHistory, refetchHistory]);

  // Debounced search
  const debouncedSearch = useCallback((searchQuery: string, searchFilters: SearchFilters) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      if (searchQuery.trim()) {
        refetchResults();
        // Track the search
        searchHistoryService.addToHistory({
          query: searchQuery,
          filters: searchFilters,
          resultCount: 0, // Will be updated when results arrive
        });
      }
    }, debounceMs);
  }, [debounceMs, refetchResults]);

  // Debounced suggestions
  const debouncedSuggestions = useCallback((searchQuery: string) => {
    if (suggestionTimeoutRef.current) {
      clearTimeout(suggestionTimeoutRef.current);
    }

    suggestionTimeoutRef.current = setTimeout(() => {
      if (searchQuery.length > 1) {
        setShowSuggestionsState(true);
      }
    }, Math.min(debounceMs / 2, 150)); // Suggestions should appear faster than search
  }, [debounceMs]);

  // Set query with debouncing
  const setQuery = useCallback((newQuery: string) => {
    setQueryState(newQuery);

    if (autoSearch) {
      debouncedSearch(newQuery, filters);
    }

    if (enableSuggestions) {
      debouncedSuggestions(newQuery);
    }
  }, [autoSearch, debouncedSearch, debouncedSuggestions, enableSuggestions, filters]);

  // Set filters with debouncing
  const setFilters = useCallback((newFilters: SearchFilters) => {
    setFiltersState(newFilters);

    if (query && autoSearch) {
      debouncedSearch(query, newFilters);
    }
  }, [query, autoSearch, debouncedSearch]);

  // Perform search manually
  const performSearch = useCallback(async (searchQuery?: string, searchFilters?: SearchFilters) => {
    const finalQuery = searchQuery || query;
    const finalFilters = searchFilters || filters;

    if (!finalQuery.trim()) {return;}

    setQueryState(finalQuery);
    setFiltersState(finalFilters);
    setShowSuggestionsState(false);

    await refetchResults();

    // Track the search
    await searchHistoryService.addToHistory({
      query: finalQuery,
      filters: finalFilters,
      resultCount: allResults.length,
    });
  }, [query, filters, refetchResults, allResults.length]);

  // Load more results
  const loadMoreResults = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Clear search
  const clearSearch = useCallback(() => {
    setQueryState('');
    setFiltersState({});
    setShowSuggestionsState(false);
    _setLastClickedContent(null);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    if (suggestionTimeoutRef.current) {
      clearTimeout(suggestionTimeoutRef.current);
    }
  }, []);

  // Voice search
  const voiceSearch = useCallback(async (transcript: string) => {
    const cleanedQuery = transcript.trim();
    if (!cleanedQuery) {return;}

    setQueryState(cleanedQuery);
    setShowSuggestionsState(false);

    await searchService.voiceSearch(cleanedQuery);
    await refetchResults();

    // Track voice search
    await searchHistoryService.addToHistory({
      query: cleanedQuery,
      filters,
      resultCount: allResults.length,
    });
  }, [filters, refetchResults, allResults.length]);

  // Track search click
  const trackSearchClick = useCallback((contentId: string) => {
    _setLastClickedContent(contentId);

    // Update the last history item with the clicked content
    const history = searchHistoryService.getHistory(1);
    if (history.length > 0) {
      searchHistoryService.addToHistory({
        ...history[0],
        clickedContentId: contentId,
      });
    }
  }, []);

  // History management
  const addToHistory = useCallback(async (historyItem: Omit<SearchHistory, 'id' | 'timestamp'>) => {
    await searchHistoryService.addToHistory(historyItem);
    refetchHistory();
  }, [refetchHistory]);

  const removeFromHistory = useCallback(async (id: string) => {
    await searchHistoryService.removeFromHistory(id);
    refetchHistory();
  }, [refetchHistory]);

  const clearHistory = useCallback(async () => {
    await searchHistoryService.clearHistory();
    refetchHistory();
  }, [refetchHistory]);

  // Refresh search
  const refreshSearch = useCallback(() => {
    refetchResults();
  }, [refetchResults]);

  // Cache management
  const clearCache = useCallback(() => {
    searchService.clearCache();
  }, []);

  const getCacheStats = useCallback(() => {
    return searchService.getCacheStats();
  }, []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (suggestionTimeoutRef.current) {
        clearTimeout(suggestionTimeoutRef.current);
      }
    };
  }, []);

  // Computed values
  const isSearching = isLoadingResults || (searchResultsData === undefined && query.length > 0);
  const isSearchingMore = isFetchingNextPage;
  const suggestions = suggestionsData || [];
  const searchHistory = historyData || [];
  const popularSearches = popularData || [];
  const frequentSearches = searchHistoryService.getFrequentSearches(5);
  const todaySearches = searchHistoryService.getTodaySearches();

  return {
    // State
    query,
    setQuery,
    filters,
    setFilters,
    isSearching,
    isSearchingMore,

    // Results
    results: allResults,
    totalResults,
    currentPage,
    totalPages,
    hasMoreResults: hasNextPage,
    searchError: searchError as Error | null,

    // Suggestions
    suggestions,
    isLoadingSuggestions,
    showSuggestions,
    setShowSuggestions: setShowSuggestionsState,

    // History
    searchHistory,
    frequentSearches,
    todaySearches,

    // Popular searches
    popularSearches,

    // Actions
    performSearch,
    loadMoreResults,
    clearSearch,
    addToHistory,
    removeFromHistory,
    clearHistory,
    refreshSearch,

    // Voice search
    voiceSearch,

    // Analytics
    trackSearchClick,

    // Utility
    clearCache,
    getCacheStats,
  };
};

export default useEnhancedSearch;
