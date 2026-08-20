/**
 * Comprehensive tests for useAdvancedAutocomplete.ts
 *
 * Coverage Target: 85%+ (hook logic, cache, keyboard nav, debouncing)
 * Strategy: Test suggestions loading, cache, keyboard nav, trending, history
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { useAdvancedAutocomplete } from '../useAdvancedAutocomplete';
import * as api from '@/lib/api';
import { AutocompleteSuggestionType } from '@/lib/types/autocomplete';
import { ContentType } from '@/lib/types/paywall';

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock API calls
jest.mock('@/lib/api', () => ({
  getEnhancedAutocompleteSuggestions: jest.fn(),
  getSearchHistory: jest.fn(),
  getTrendingSearches: jest.fn(),
}));

const mockGetSuggestions = api.getEnhancedAutocompleteSuggestions as jest.MockedFunction<
  typeof api.getEnhancedAutocompleteSuggestions
>;
const mockGetHistory = api.getSearchHistory as jest.MockedFunction<typeof api.getSearchHistory>;
const mockGetTrending = api.getTrendingSearches as jest.MockedFunction<typeof api.getTrendingSearches>;

const mockAutocompleteSuggestions = [
  {
    text: 'inception',
    type: AutocompleteSuggestionType.Title,
    score: 95,
    contentId: 'tt1375666',
    contentType: ContentType.Movie,
    year: 2010,
    genres: ['Action', 'Sci-Fi'],
    rating: 8.8,
    estimatedResults: 1,
    metadata: {},
  },
  {
    text: 'interstellar',
    type: AutocompleteSuggestionType.Title,
    score: 93,
    contentId: 'tt0816692',
    contentType: ContentType.Movie,
    year: 2014,
    genres: ['Sci-Fi'],
    rating: 8.6,
    estimatedResults: 1,
    metadata: {},
  },
];

const mockSearchHistory = [
  { query: 'breaking bad', searchedAt: new Date().toISOString(), resultCount: 1, wasSuccessful: true },
  { query: 'game of thrones', searchedAt: new Date().toISOString(), resultCount: 1, wasSuccessful: true },
];

const mockTrendingSearches = [
  { query: 'netflix originals', searchCount: 1000, trendingScore: 95, isRising: true, uniqueUsers: 500, timeWindow: 86400000 },
  { query: 'disney plus', searchCount: 800, trendingScore: 88, isRising: false, uniqueUsers: 400, timeWindow: 86400000 },
];

beforeEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
  mockGetSuggestions.mockResolvedValue(mockAutocompleteSuggestions);
  mockGetHistory.mockResolvedValue(mockSearchHistory);
  mockGetTrending.mockResolvedValue(mockTrendingSearches);
});

describe('useAdvancedAutocomplete - State Management', () => {
  it('should initialize with empty state', async () => {
    const { result } = renderHook(() => useAdvancedAutocomplete());

    await waitFor(() => {
      expect(result.current.recentSearches).toBeDefined();
    });

    expect(result.current.state.query).toBe('');
    expect(result.current.state.suggestions).toEqual([]);
    expect(result.current.state.isOpen).toBe(false);
    expect(result.current.state.isLoading).toBe(false);
    expect(result.current.state.selectedIndex).toBe(-1);
  });

  it('should update query and open suggestions', async () => {
    const { result } = renderHook(() => useAdvancedAutocomplete());

    await waitFor(() => expect(result.current.recentSearches).toBeDefined());

    act(() => {
      result.current.updateQuery('test');
    });

    expect(result.current.state.query).toBe('test');
    expect(result.current.state.isOpen).toBe(true);
  });

  it('should call onQueryChange callback', async () => {
    const onQueryChange = jest.fn();
    const { result } = renderHook(() => useAdvancedAutocomplete({ onQueryChange }));

    await waitFor(() => expect(result.current.recentSearches).toBeDefined());

    act(() => {
      result.current.updateQuery('test');
    });

    expect(onQueryChange).toHaveBeenCalledWith('test');
  });

  it('should clear suggestions', async () => {
    const { result } = renderHook(() => useAdvancedAutocomplete());

    await waitFor(() => expect(result.current.recentSearches).toBeDefined());

    act(() => {
      result.current.updateQuery('test');
    });

    act(() => {
      result.current.clearSuggestions();
    });

    expect(result.current.state.suggestions).toEqual([]);
    expect(result.current.state.isOpen).toBe(false);
    expect(result.current.state.selectedIndex).toBe(-1);
  });

  it('should open suggestions', async () => {
    const { result } = renderHook(() => useAdvancedAutocomplete());

    await waitFor(() => expect(result.current.recentSearches).toBeDefined());

    act(() => {
      result.current.openSuggestions();
    });

    expect(result.current.state.isOpen).toBe(true);
  });

  it('should close suggestions', async () => {
    const { result } = renderHook(() => useAdvancedAutocomplete({ options: { minQueryLength: 1 } }));

    await waitFor(() => expect(result.current.recentSearches).toBeDefined());

    act(() => {
      result.current.updateQuery('test');
    });

    act(() => {
      result.current.closeSuggestions();
    });

    expect(result.current.state.isOpen).toBe(false);
    expect(result.current.state.selectedIndex).toBe(-1);
  });
});

describe('useAdvancedAutocomplete - Suggestions Loading', () => {
  it('should load suggestions after debounce delay', async () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useAdvancedAutocomplete({ options: { debounceMs: 300, minQueryLength: 2 } }));

    act(() => {
      result.current.updateQuery('inc');
    });

    expect(mockGetSuggestions).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(mockGetSuggestions).toHaveBeenCalledWith('inc', expect.any(Number));
    });

    jest.useRealTimers();
  });

  it('should not load suggestions when query is too short', async () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useAdvancedAutocomplete({ options: { minQueryLength: 3 } }));

    act(() => {
      result.current.updateQuery('ab');
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(mockGetSuggestions).not.toHaveBeenCalled();
    });

    jest.useRealTimers();
  });

  it('should set suggestions after successful load', async () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useAdvancedAutocomplete({ options: { debounceMs: 100, minQueryLength: 2 } }));

    act(() => {
      result.current.updateQuery('inc');
    });

    act(() => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(result.current.state.suggestions).toEqual(mockAutocompleteSuggestions);
    });

    jest.useRealTimers();
  });

  it('should handle suggestion loading errors', async () => {
    jest.useFakeTimers();
    mockGetSuggestions.mockRejectedValueOnce(new Error('API Error'));

    const { result } = renderHook(() => useAdvancedAutocomplete({ options: { debounceMs: 100, minQueryLength: 2 } }));

    act(() => {
      result.current.updateQuery('inc');
    });

    act(() => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(result.current.state.error).toBe('Failed to load suggestions');
    });

    expect(result.current.state.suggestions).toEqual([]);
    jest.useRealTimers();
  });

  it('should ignore AbortError when request is cancelled', async () => {
    jest.useFakeTimers();
    const abortError = new Error('Aborted');
    abortError.name = 'AbortError';
    mockGetSuggestions.mockRejectedValueOnce(abortError);

    const { result } = renderHook(() => useAdvancedAutocomplete({ options: { debounceMs: 100, minQueryLength: 2 } }));

    // Wait for initial async effects with real time
    await act(async () => {
      await jest.runOnlyPendingTimersAsync();
    });

    act(() => {
      result.current.updateQuery('inc');
    });

    await act(async () => {
      jest.advanceTimersByTime(100);
      await jest.runAllTimersAsync();
    });

    // Should not set error for AbortError
    expect(result.current.state.error).toBeUndefined();
    jest.useRealTimers();
  });
});

describe('useAdvancedAutocomplete - Cache Management', () => {
  it('should cache suggestions', async () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useAdvancedAutocomplete({ options: { debounceMs: 100, minQueryLength: 2, cacheResults: true } }));

    // First query
    act(() => {
      result.current.updateQuery('inc');
    });

    act(() => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(result.current.state.suggestions).toEqual(mockAutocompleteSuggestions);
    });

    mockGetSuggestions.mockClear();

    // Clear suggestions
    act(() => {
      result.current.clearSuggestions();
    });

    // Same query again - should use cache
    act(() => {
      result.current.updateQuery('inc');
    });

    act(() => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(result.current.state.suggestions).toEqual(mockAutocompleteSuggestions);
    });

    // Should not call API again
    expect(mockGetSuggestions).not.toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('should not cache when cacheResults is false', async () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useAdvancedAutocomplete({ options: { debounceMs: 100, minQueryLength: 2, cacheResults: false } }));

    act(() => {
      result.current.updateQuery('inc');
    });

    act(() => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(result.current.state.suggestions).toEqual(mockAutocompleteSuggestions);
    });

    mockGetSuggestions.mockClear();

    act(() => {
      result.current.clearSuggestions();
    });

    act(() => {
      result.current.updateQuery('inc');
    });

    act(() => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(mockGetSuggestions).toHaveBeenCalled();
    });

    jest.useRealTimers();
  });
});

describe('useAdvancedAutocomplete - Suggestion Selection', () => {
  it('should select suggestion', () => {
    const onSuggestionSelected = jest.fn();
    const { result } = renderHook(() => useAdvancedAutocomplete({ onSuggestionSelected }));

    act(() => {
      result.current.selectSuggestion(mockAutocompleteSuggestions[0]);
    });

    expect(result.current.state.query).toBe('inception');
    expect(result.current.state.isOpen).toBe(false);
    expect(result.current.state.suggestions).toEqual([]);
    expect(onSuggestionSelected).toHaveBeenCalledWith(mockAutocompleteSuggestions[0]);
  });
});

describe('useAdvancedAutocomplete - Keyboard Navigation', () => {
  it('should navigate down through suggestions', async () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useAdvancedAutocomplete({ options: { enableKeyboardNavigation: true, debounceMs: 100, minQueryLength: 2 } }));

    act(() => {
      result.current.updateQuery('inc');
    });

    act(() => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(result.current.state.suggestions).toHaveLength(2);
    });

    const mockEvent = {
      key: 'ArrowDown',
      preventDefault: jest.fn(),
    } as unknown as React.KeyboardEvent;

    act(() => {
      result.current.handleKeyDown(mockEvent);
    });

    expect(result.current.state.selectedIndex).toBe(0);
    expect(mockEvent.preventDefault).toHaveBeenCalled();

    act(() => {
      result.current.handleKeyDown(mockEvent);
    });

    expect(result.current.state.selectedIndex).toBe(1);
    jest.useRealTimers();
  });

  it('should navigate up through suggestions', async () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useAdvancedAutocomplete({ options: { enableKeyboardNavigation: true, debounceMs: 100, minQueryLength: 2 } }));

    act(() => {
      result.current.updateQuery('inc');
    });

    act(() => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(result.current.state.suggestions).toHaveLength(2);
    });

    // Move down first
    act(() => {
      result.current.handleKeyDown({ key: 'ArrowDown', preventDefault: jest.fn() } as unknown as React.KeyboardEvent);
    });

    const mockEvent = {
      key: 'ArrowUp',
      preventDefault: jest.fn(),
    } as unknown as React.KeyboardEvent;

    act(() => {
      result.current.handleKeyDown(mockEvent);
    });

    expect(result.current.state.selectedIndex).toBe(-1);
    jest.useRealTimers();
  });

  it('should select suggestion on Enter', async () => {
    jest.useFakeTimers();
    const onSuggestionSelected = jest.fn();
    const { result } = renderHook(() => useAdvancedAutocomplete({ onSuggestionSelected, options: { enableKeyboardNavigation: true, debounceMs: 100, minQueryLength: 2 } }));

    act(() => {
      result.current.updateQuery('inc');
    });

    act(() => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(result.current.state.suggestions).toHaveLength(2);
    });

    // Move to first suggestion
    act(() => {
      result.current.handleKeyDown({ key: 'ArrowDown', preventDefault: jest.fn() } as unknown as React.KeyboardEvent);
    });

    const mockEvent = {
      key: 'Enter',
      preventDefault: jest.fn(),
    } as unknown as React.KeyboardEvent;

    act(() => {
      result.current.handleKeyDown(mockEvent);
    });

    expect(onSuggestionSelected).toHaveBeenCalledWith(mockAutocompleteSuggestions[0]);
    expect(mockEvent.preventDefault).toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('should close suggestions on Escape', () => {
    const { result } = renderHook(() => useAdvancedAutocomplete({ options: { enableKeyboardNavigation: true } }));

    act(() => {
      result.current.updateQuery('test');
    });

    const mockEvent = {
      key: 'Escape',
    } as React.KeyboardEvent;

    act(() => {
      result.current.handleKeyDown(mockEvent);
    });

    expect(result.current.state.isOpen).toBe(false);
  });

  it('should close suggestions on Tab', () => {
    const { result } = renderHook(() => useAdvancedAutocomplete({ options: { enableKeyboardNavigation: true } }));

    act(() => {
      result.current.updateQuery('test');
    });

    const mockEvent = {
      key: 'Tab',
    } as React.KeyboardEvent;

    act(() => {
      result.current.handleKeyDown(mockEvent);
    });

    expect(result.current.state.isOpen).toBe(false);
  });
});

describe('useAdvancedAutocomplete - History and Trending', () => {
  it('should load recent searches', async () => {
    const { result } = renderHook(() => useAdvancedAutocomplete({ options: { includeHistory: true } }));

    // Wait for mount effects to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    // Wait for data to load
    await waitFor(() => {
      expect(result.current.recentSearches.length).toBeGreaterThan(0);
    }, { timeout: 3000 });

    expect(mockGetHistory).toHaveBeenCalledWith(20);
    expect(result.current.recentSearches).toEqual(mockSearchHistory);
  });

  it('should not load history when includeHistory is false', async () => {
    renderHook(() => useAdvancedAutocomplete({ options: { includeHistory: false } }));

    // Wait a bit to ensure no call is made
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(mockGetHistory).not.toHaveBeenCalled();
  });

  it('should load trending searches on mount', async () => {
    const { result } = renderHook(() => useAdvancedAutocomplete({ options: { includeTrending: true } }));

    // Wait for mount effects to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    // Wait for data to load
    await waitFor(() => {
      expect(result.current.trendingSearches.length).toBeGreaterThan(0);
    }, { timeout: 3000 });

    expect(mockGetTrending).toHaveBeenCalled();
    expect(result.current.trendingSearches).toEqual(mockTrendingSearches);
  });

  it('should use fallback trending data on API error', async () => {
    mockGetTrending.mockRejectedValueOnce(new Error('API Error'));

    const { result } = renderHook(() => useAdvancedAutocomplete({ options: { includeTrending: true } }));

    // Wait for mount effects to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    // Wait for fallback data to load
    await waitFor(() => {
      expect(result.current.trendingSearches.length).toBeGreaterThan(0);
    }, { timeout: 3000 });

    expect(mockGetTrending).toHaveBeenCalled();
    expect(result.current.trendingSearches).toHaveLength(10);
    expect(result.current.trendingSearches[0].query).toBe('netflix movies');
  });

  it('should load trending for empty query when opening suggestions', async () => {
    const { result } = renderHook(() => useAdvancedAutocomplete({ options: { includeTrending: true, minQueryLength: 2 } }));

    await act(async () => {
      result.current.openSuggestions();
    });

    await waitFor(() => {
      expect(result.current.state.suggestions.length).toBeGreaterThan(0);
    });

    // Should have trending suggestions
    expect(result.current.state.suggestions[0].type).toBe(AutocompleteSuggestionType.Trending);
  });

  it('should handle history loading errors gracefully', async () => {
    mockGetHistory.mockRejectedValueOnce(new Error('History Error'));

    const { result } = renderHook(() => useAdvancedAutocomplete({ options: { includeHistory: true } }));

    await waitFor(() => {
      expect(result.current.recentSearches).toEqual([]);
    });
  });
});

describe('useAdvancedAutocomplete - Cleanup', () => {
  it('should cleanup timers and abort controller on unmount', () => {
    const { unmount } = renderHook(() => useAdvancedAutocomplete());

    expect(() => unmount()).not.toThrow();
  });
});
