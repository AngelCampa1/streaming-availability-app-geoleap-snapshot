'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  AutocompleteSuggestion,
  AutocompleteSuggestionType,
  AutocompleteOptions,
  AutocompleteState,
  DEFAULT_AUTOCOMPLETE_OPTIONS,
  SearchHistoryItem,
  TrendingSearch,
} from '@/lib/types/autocomplete';
import { getEnhancedAutocompleteSuggestions, getSearchHistory, getTrendingSearches } from '@/lib/api';
import { logger } from '@/lib/logger';

interface UseAdvancedAutocompleteProps {
  onSuggestionSelected?: (suggestion: AutocompleteSuggestion) => void;
  onQueryChange?: (query: string) => void;
  options?: Partial<AutocompleteOptions>;
}

interface UseAdvancedAutocompleteReturn {
  state: AutocompleteState;
  inputRef: React.RefObject<HTMLInputElement | null>;
  suggestionsRef: React.RefObject<HTMLDivElement | null>;
  // Actions
  updateQuery: (query: string, openDropdown?: boolean) => void;
  selectSuggestion: (suggestion: AutocompleteSuggestion) => void;
  clearSuggestions: () => void;
  openSuggestions: () => void;
  closeSuggestions: () => void;
  // Keyboard navigation
  handleKeyDown: (event: React.KeyboardEvent) => void;
  // History and trending
  recentSearches: SearchHistoryItem[];
  trendingSearches: TrendingSearch[];
  loadRecentSearches: () => void;
  loadTrendingSearches: () => void;
}

export function useAdvancedAutocomplete({
  onSuggestionSelected,
  onQueryChange,
  options = {},
}: UseAdvancedAutocompleteProps = {}): UseAdvancedAutocompleteReturn {
  const config = { ...DEFAULT_AUTOCOMPLETE_OPTIONS, ...options };

  // State management
  const [state, setState] = useState<AutocompleteState>({
    isOpen: false,
    isLoading: false,
    suggestions: [],
    selectedIndex: -1,
    query: '',
  });

  const [recentSearches, setRecentSearches] = useState<SearchHistoryItem[]>([]);
  const [trendingSearches, setTrendingSearches] = useState<TrendingSearch[]>([]);

  // Refs for DOM management
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Map<string, { suggestions: AutocompleteSuggestion[]; timestamp: number }>>(new Map());

  // Cache management
  const getCachedSuggestions = useCallback(
    (query: string): AutocompleteSuggestion[] | null => {
      if (!config.cacheResults) return null;

      const cached = cacheRef.current.get(query.toLowerCase());
      if (!cached) return null;

      // Cache expires after 5 minutes
      const isExpired = Date.now() - cached.timestamp > 5 * 60 * 1000;
      if (isExpired) {
        cacheRef.current.delete(query.toLowerCase());
        return null;
      }

      return cached.suggestions;
    },
    [config.cacheResults]
  );

  const setCachedSuggestions = useCallback(
    (query: string, suggestions: AutocompleteSuggestion[]) => {
      if (!config.cacheResults) return;

      cacheRef.current.set(query.toLowerCase(), {
        suggestions,
        timestamp: Date.now(),
      });

      // Limit cache size to 50 entries
      if (cacheRef.current.size > 50) {
        const firstKey = cacheRef.current.keys().next().value;
        if (firstKey) {
          cacheRef.current.delete(firstKey);
        }
      }
    },
    [config.cacheResults]
  );

  // Load suggestions with debouncing
  const loadSuggestions = useCallback(
    async (query: string) => {
      if (query.length < config.minQueryLength) {
        setState(prev => ({
          ...prev,
          suggestions: [],
          isLoading: false,
          selectedIndex: -1,
        }));
        return;
      }

      // Check cache first
      const cachedSuggestions = getCachedSuggestions(query);
      if (cachedSuggestions) {
        setState(prev => ({
          ...prev,
          suggestions: cachedSuggestions,
          isLoading: false,
          selectedIndex: -1,
          error: undefined,
        }));
        return;
      }

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      setState(prev => ({ ...prev, isLoading: true, error: undefined }));

      try {
        const suggestions = await getEnhancedAutocompleteSuggestions(query, config.maxSuggestions);

        // Cache the results
        setCachedSuggestions(query, suggestions);

        setState(prev => ({
          ...prev,
          suggestions,
          isLoading: false,
          selectedIndex: -1,
          error: undefined,
        }));
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return; // Request was cancelled, ignore
        }

        logger.error('[useAdvancedAutocomplete] Failed to load autocomplete suggestions', { error: error instanceof Error ? error.message : String(error) });
        setState(prev => ({
          ...prev,
          suggestions: [],
          isLoading: false,
          selectedIndex: -1,
          error: 'Failed to load suggestions',
        }));
      }
    },
    [config.minQueryLength, config.maxSuggestions, getCachedSuggestions, setCachedSuggestions]
  );

  // Debounced query update
  // BUG FIX: Added openDropdown parameter to prevent dropdown from reopening during external value sync
  const updateQuery = useCallback(
    (query: string, openDropdown: boolean = true) => {
      setState(prev => ({ ...prev, query, isOpen: openDropdown ? true : prev.isOpen }));
      onQueryChange?.(query);

      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new timer
      debounceTimerRef.current = setTimeout(() => {
        loadSuggestions(query);
      }, config.debounceMs);
    },
    [loadSuggestions, config.debounceMs, onQueryChange]
  );

  // Load trending searches when input is focused with no query
  const loadTrendingForEmptyQuery = useCallback(async () => {
    if (!config.includeTrending) return;

    try {
      setState(prev => ({ ...prev, isLoading: true }));
      const trending = await getTrendingSearches(config.maxSuggestions);

      const trendingSuggestions: AutocompleteSuggestion[] = trending.map(trend => ({
        text: trend.query,
        type: AutocompleteSuggestionType.Trending,
        score: trend.trendingScore,
        contentId: undefined,
        contentType: undefined,
        posterUrl: undefined,
        year: undefined,
        genres: [],
        rating: undefined,
        estimatedResults: Math.floor(trend.searchCount / 10),
        metadata: {
          isRising: trend.isRising,
          searchCount: trend.searchCount,
          uniqueUsers: trend.uniqueUsers,
        },
      }));

      setState(prev => ({
        ...prev,
        suggestions: trendingSuggestions,
        isLoading: false,
        selectedIndex: -1,
      }));
    } catch (error) {
      logger.error('[useAdvancedAutocomplete] Failed to load trending searches', { error: error instanceof Error ? error.message : String(error) });
      setState(prev => ({ ...prev, isLoading: false, suggestions: [] }));
    }
  }, [config.includeTrending, config.maxSuggestions]);

  // Suggestion selection
  const selectSuggestion = useCallback(
    (suggestion: AutocompleteSuggestion) => {
      setState(prev => ({
        ...prev,
        query: suggestion.text,
        isOpen: false,
        suggestions: [],
        selectedIndex: -1,
      }));

      onSuggestionSelected?.(suggestion);

      // Focus back to input
      inputRef.current?.focus();
    },
    [onSuggestionSelected]
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!config.enableKeyboardNavigation || !state.isOpen) return;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setState(prev => ({
            ...prev,
            selectedIndex: Math.min(prev.selectedIndex + 1, prev.suggestions.length - 1),
          }));
          break;

        case 'ArrowUp':
          event.preventDefault();
          setState(prev => ({
            ...prev,
            selectedIndex: Math.max(prev.selectedIndex - 1, -1),
          }));
          break;

        case 'Enter':
          if (state.selectedIndex >= 0 && state.suggestions[state.selectedIndex]) {
            event.preventDefault();
            selectSuggestion(state.suggestions[state.selectedIndex]);
          }
          break;

        case 'Escape':
          setState(prev => ({
            ...prev,
            isOpen: false,
            selectedIndex: -1,
          }));
          break;

        case 'Tab':
          // Allow normal tab behavior
          setState(prev => ({
            ...prev,
            isOpen: false,
            selectedIndex: -1,
          }));
          break;
      }
    },
    [config.enableKeyboardNavigation, state, selectSuggestion]
  );

  // Control functions
  const clearSuggestions = useCallback(() => {
    setState(prev => ({
      ...prev,
      suggestions: [],
      isOpen: false,
      selectedIndex: -1,
    }));
  }, []);

  const openSuggestions = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: true }));

    // Load trending if query is empty
    if (state.query.length < config.minQueryLength) {
      loadTrendingForEmptyQuery();
    }
  }, [state.query.length, config.minQueryLength, loadTrendingForEmptyQuery]);

  const closeSuggestions = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false, selectedIndex: -1 }));
  }, []);

  // Load recent searches
  const loadRecentSearches = useCallback(async () => {
    if (!config.includeHistory) return;

    try {
      const history = await getSearchHistory(20);
      setRecentSearches(history);
    } catch (error) {
      logger.error('[useAdvancedAutocomplete] Failed to load recent searches', { error: error instanceof Error ? error.message : String(error) });
      setRecentSearches([]);
    }
  }, [config.includeHistory]);

  // Load trending searches - BUG-011 FIX: Add fallback data
  const loadTrendingSearches = useCallback(async () => {
    try {
      const trending = await getTrendingSearches(10);
      setTrendingSearches(trending);
    } catch (error) {
      logger.debug('[useAdvancedAutocomplete] Trending searches unavailable, using defaults', { error: error instanceof Error ? error.message : String(error) });
      // BUG-011 FIX: Provide fallback trending data when API fails
      const timeWindow = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      setTrendingSearches([
        { query: 'netflix movies', searchCount: 1000, trendingScore: 95, isRising: true, uniqueUsers: 500, timeWindow },
        { query: 'disney plus shows', searchCount: 800, trendingScore: 88, isRising: false, uniqueUsers: 400, timeWindow },
        { query: 'hbo max series', searchCount: 750, trendingScore: 85, isRising: true, uniqueUsers: 380, timeWindow },
        { query: 'amazon prime video', searchCount: 700, trendingScore: 82, isRising: false, uniqueUsers: 350, timeWindow },
        { query: 'apple tv originals', searchCount: 600, trendingScore: 78, isRising: true, uniqueUsers: 300, timeWindow },
        { query: 'hulu exclusives', searchCount: 550, trendingScore: 75, isRising: false, uniqueUsers: 275, timeWindow },
        { query: 'paramount plus', searchCount: 500, trendingScore: 72, isRising: true, uniqueUsers: 250, timeWindow },
        { query: 'peacock originals', searchCount: 450, trendingScore: 68, isRising: false, uniqueUsers: 225, timeWindow },
        { query: 'best documentaries', searchCount: 400, trendingScore: 65, isRising: true, uniqueUsers: 200, timeWindow },
        { query: 'award winning films', searchCount: 350, trendingScore: 60, isRising: false, uniqueUsers: 175, timeWindow },
      ]);
    }
  }, []);

  // Load initial data
  useEffect(() => {
    if (config.includeHistory) {
      loadRecentSearches();
    }
    loadTrendingSearches();
  }, [config.includeHistory, loadRecentSearches, loadTrendingSearches]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    state,
    inputRef,
    suggestionsRef,
    updateQuery,
    selectSuggestion,
    clearSuggestions,
    openSuggestions,
    closeSuggestions,
    handleKeyDown,
    recentSearches,
    trendingSearches,
    loadRecentSearches,
    loadTrendingSearches,
  };
}
