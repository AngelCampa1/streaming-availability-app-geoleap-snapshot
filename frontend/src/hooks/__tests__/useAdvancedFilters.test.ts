/**
 * Comprehensive tests for useAdvancedFilters.ts
 *
 * Coverage Target: 85%+ (hook logic, state management, API calls)
 * Strategy: Test filter CRUD, persistence, validation, suggestions, analysis
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { useAdvancedFilters } from '../useAdvancedFilters';
import * as filterApi from '@/lib/streaming-service-api';
import type { FilterState } from '@/components/search/AdvancedFilters';

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock filterApi module
jest.mock('@/lib/streaming-service-api', () => ({
  filterApi: {
    getFilterOptions: jest.fn(),
    validateFilters: jest.fn(),
    getFilterSuggestions: jest.fn(),
    analyzeFilters: jest.fn(),
  },
  filterStateToRequest: jest.fn((filters, query) => ({ ...filters, query })),
}));

const mockFilterApi = filterApi.filterApi as jest.Mocked<typeof filterApi.filterApi>;

const mockFilterOptions = {
  genres: [
    { value: 'action', displayName: 'Action', count: 100, isPopular: true },
    { value: 'comedy', displayName: 'Comedy', count: 80, isPopular: true },
    { value: 'drama', displayName: 'Drama', count: 90, isPopular: true },
  ],
  contentRatings: [
    { value: 'pg', displayName: 'PG', count: 50, isPopular: true },
    { value: 'pg-13', displayName: 'PG-13', count: 60, isPopular: true },
  ],
  streamingServices: [
    { value: 'netflix', displayName: 'Netflix', count: 200, isPopular: true },
    { value: 'hulu', displayName: 'Hulu', count: 150, isPopular: true },
    { value: 'disney-plus', displayName: 'Disney+', count: 120, isPopular: true },
  ],
  countries: [
    { value: 'us', displayName: 'United States', count: 300, isPopular: true },
    { value: 'uk', displayName: 'United Kingdom', count: 200, isPopular: true },
  ],
  videoQualities: [
    { value: '4k', displayName: '4K', count: 100, isPopular: true },
    { value: 'hd', displayName: 'HD', count: 200, isPopular: true },
  ],
  audioLanguages: [
    { value: 'en', displayName: 'English', count: 300, isPopular: true },
    { value: 'es', displayName: 'Spanish', count: 150, isPopular: true },
  ],
  subtitleLanguages: [
    { value: 'en', displayName: 'English', count: 300, isPopular: true },
    { value: 'es', displayName: 'Spanish', count: 150, isPopular: true },
  ],
  availableYearRange: { minYear: 1980, maxYear: 2024, mostCommonYear: 2020 },
  availableRuntimeRange: { minRuntimeMinutes: 60, maxRuntimeMinutes: 180, averageRuntimeMinutes: 120 },
  availablePriceRange: { minPrice: 0, maxPrice: 19.99, averagePrice: 9.99, currency: 'USD' },
};

const mockValidationResponse = {
  isValid: true,
  errors: [],
  warnings: [],
  suggestions: [],
};

const mockFilterSuggestions = [
  {
    filterName: 'genres',
    suggestedValue: 'Action',
    reason: 'Popular choice',
    estimatedResultsImprovement: 50,
  },
];

const mockAnalysisResponse = {
  complexity: 'Simple' as const,
  totalFiltersApplied: 0,
  hasAdvancedFilters: false,
  filterSummary: 'No filters applied',
  estimatedPerformanceImpact: 'Low' as const,
  optimizationSuggestions: [],
};

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  mockFilterApi.getFilterOptions.mockResolvedValue(mockFilterOptions);
  mockFilterApi.validateFilters.mockResolvedValue(mockValidationResponse);
  mockFilterApi.getFilterSuggestions.mockResolvedValue(mockFilterSuggestions);
  mockFilterApi.analyzeFilters.mockResolvedValue(mockAnalysisResponse);
});

describe('useAdvancedFilters - State Management', () => {
  it('should initialize with empty filters by default', async () => {
    const { result } = renderHook(() => useAdvancedFilters());

    await waitFor(() => {
      expect(result.current.filters).toEqual({});
      expect(result.current.hasActiveFilters).toBe(false);
      expect(result.current.activeFilterCount).toBe(0);
    });
  });

  it('should initialize with provided initial filters', async () => {
    const initialFilters: FilterState = { contentType: 'Movie', genres: ['Action'] };
    const { result } = renderHook(() => useAdvancedFilters({ initialFilters }));

    await waitFor(() => {
      expect(result.current.filters).toEqual(initialFilters);
      expect(result.current.hasActiveFilters).toBe(true);
      expect(result.current.activeFilterCount).toBe(2); // contentType + genres
    });
  });

  it('should update filters', async () => {
    const { result } = renderHook(() => useAdvancedFilters());

    await waitFor(() => expect(result.current.filterOptions).toBeTruthy());

    act(() => {
      result.current.setFilters({ contentType: 'Movie', yearFrom: 2023 });
    });

    expect(result.current.filters.contentType).toBe('Movie');
    expect(result.current.filters.yearFrom).toBe(2023);
  });

  it('should update individual filter', async () => {
    const { result } = renderHook(() => useAdvancedFilters());

    await waitFor(() => expect(result.current.filterOptions).toBeTruthy());

    act(() => {
      result.current.updateFilter('genres', ['Action', 'Comedy']);
    });

    expect(result.current.filters.genres).toEqual(['Action', 'Comedy']);
  });

  it('should remove filter when value is undefined', async () => {
    const { result } = renderHook(() => useAdvancedFilters({ initialFilters: { genres: ['Action'] } }));

    await waitFor(() => expect(result.current.filterOptions).toBeTruthy());

    act(() => {
      result.current.updateFilter('genres', undefined);
    });

    expect(result.current.filters.genres).toBeUndefined();
  });

  it('should remove filter when value is empty array', async () => {
    const { result } = renderHook(() => useAdvancedFilters({ initialFilters: { genres: ['Action'] } }));

    await waitFor(() => expect(result.current.filterOptions).toBeTruthy());

    act(() => {
      result.current.updateFilter('genres', []);
    });

    expect(result.current.filters.genres).toBeUndefined();
  });

  it('should clear all filters', async () => {
    const { result } = renderHook(() => useAdvancedFilters({ initialFilters: { genres: ['Action'], yearFrom: 2023 } }));

    await waitFor(() => expect(result.current.filterOptions).toBeTruthy());

    act(() => {
      result.current.clearFilters();
    });

    expect(result.current.filters).toEqual({});
    expect(result.current.hasActiveFilters).toBe(false);
  });

  it('should clear individual filter', async () => {
    const { result } = renderHook(() => useAdvancedFilters({ initialFilters: { genres: ['Action'], yearFrom: 2023 } }));

    await waitFor(() => expect(result.current.filterOptions).toBeTruthy());

    act(() => {
      result.current.clearFilter('genres');
    });

    expect(result.current.filters.genres).toBeUndefined();
    expect(result.current.filters.yearFrom).toBe(2023);
  });

  it('should call onFiltersChange callback when filters change', async () => {
    const onFiltersChange = jest.fn();
    const { result } = renderHook(() => useAdvancedFilters({ onFiltersChange }));

    await waitFor(() => expect(result.current.filterOptions).toBeTruthy());

    act(() => {
      result.current.setFilters({ genres: ['Action'] });
    });

    expect(onFiltersChange).toHaveBeenCalledWith({ genres: ['Action'] });
  });
});

describe('useAdvancedFilters - Persistence', () => {
  it('should not persist filters when persistFilters is false', async () => {
    const { result } = renderHook(() => useAdvancedFilters({ persistFilters: false }));

    await waitFor(() => expect(result.current.filterOptions).toBeTruthy());

    act(() => {
      result.current.setFilters({ genres: ['Action'] });
    });

    expect(localStorage.getItem('geoleap_filters_default')).toBeNull();
  });

  it('should persist filters to localStorage when enabled', async () => {
    const { result } = renderHook(() => useAdvancedFilters({ persistFilters: true, storageKey: 'test' }));

    await waitFor(() => expect(result.current.filterOptions).toBeTruthy());

    act(() => {
      result.current.setFilters({ genres: ['Action'] });
    });

    const stored = localStorage.getItem('geoleap_filters_test');
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored!)).toEqual({ genres: ['Action'] });
  });

  it('should load persisted filters on mount', async () => {
    localStorage.setItem('geoleap_filters_test', JSON.stringify({ genres: ['Comedy'] }));

    const { result } = renderHook(() => useAdvancedFilters({ persistFilters: true, storageKey: 'test' }));

    await waitFor(() => {
      expect(result.current.filters.genres).toEqual(['Comedy']);
    });
  });

  it('should merge initial filters with persisted filters', async () => {
    localStorage.setItem('geoleap_filters_test', JSON.stringify({ genres: ['Comedy'] }));

    const { result } = renderHook(() =>
      useAdvancedFilters({ initialFilters: { yearFrom: 2023 }, persistFilters: true, storageKey: 'test' })
    );

    await waitFor(() => {
      expect(result.current.filters).toEqual({ yearFrom: 2023, genres: ['Comedy'] });
    });
  });

  it('should handle localStorage errors gracefully', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    localStorage.setItem('geoleap_filters_test', 'invalid-json');

    const { result } = renderHook(() => useAdvancedFilters({ persistFilters: true, storageKey: 'test' }));

    await waitFor(() => {
      expect(result.current.filters).toEqual({});
    });
    expect(consoleWarnSpy).toHaveBeenCalled();
    consoleWarnSpy.mockRestore();
  });
});

describe('useAdvancedFilters - Filter Options', () => {
  it('should load filter options on mount', async () => {
    const { result } = renderHook(() => useAdvancedFilters());

    await waitFor(() => {
      expect(result.current.filterOptions).toEqual(mockFilterOptions);
    });

    expect(mockFilterApi.getFilterOptions).toHaveBeenCalled();
  });

  it('should refresh filter options when content type changes', async () => {
    const { result } = renderHook(
      ({ filters }) => useAdvancedFilters({ initialFilters: filters }),
      { initialProps: { filters: { contentType: 'Movie' as const } } }
    );

    await waitFor(() => expect(result.current.filterOptions).toBeTruthy());

    mockFilterApi.getFilterOptions.mockClear();

    act(() => {
      result.current.updateFilter('contentType', 'Show');
    });

    await waitFor(() => {
      expect(mockFilterApi.getFilterOptions).toHaveBeenCalled();
    });
  });

  it('should handle filter options errors', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    mockFilterApi.getFilterOptions.mockRejectedValueOnce(new Error('API Error'));

    const { result } = renderHook(() => useAdvancedFilters());

    await waitFor(() => {
      expect(result.current.optionsError).toBe('API Error');
    });

    expect(result.current.filterOptions).toBeNull();
    consoleErrorSpy.mockRestore();
  });

  it('should manually refresh filter options', async () => {
    const { result } = renderHook(() => useAdvancedFilters());

    await waitFor(() => expect(result.current.filterOptions).toBeTruthy());

    mockFilterApi.getFilterOptions.mockClear();

    await act(async () => {
      await result.current.refreshOptions();
    });

    expect(mockFilterApi.getFilterOptions).toHaveBeenCalled();
  });
});

describe('useAdvancedFilters - Validation', () => {
  it('should validate filters automatically with debouncing', async () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useAdvancedFilters({ query: 'test' }));

    act(() => {
      result.current.setFilters({ genres: ['Action'] });
    });

    // Fast-forward past debounce delay
    act(() => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(mockFilterApi.validateFilters).toHaveBeenCalled();
    });

    jest.useRealTimers();
  });

  it('should not validate when no filters and no query', async () => {
    const { result } = renderHook(() => useAdvancedFilters());

    await act(async () => {
      await result.current.validateFilters();
    });

    expect(mockFilterApi.validateFilters).not.toHaveBeenCalled();
  });

  it('should handle validation errors', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    mockFilterApi.validateFilters.mockRejectedValueOnce(new Error('Validation failed'));

    const { result } = renderHook(() => useAdvancedFilters({ query: 'test' }));

    await act(async () => {
      await result.current.validateFilters();
    });

    await waitFor(() => {
      expect(result.current.validationError).toBe('Validation failed');
    });

    consoleErrorSpy.mockRestore();
  });

  it('should set validation result', async () => {
    const { result } = renderHook(() => useAdvancedFilters({ query: 'test' }));

    await act(async () => {
      await result.current.validateFilters();
    });

    await waitFor(() => {
      expect(result.current.validation).toEqual(mockValidationResponse);
    });
  });
});

describe('useAdvancedFilters - Suggestions', () => {
  it('should get filter suggestions', async () => {
    const { result } = renderHook(() => useAdvancedFilters({ query: 'test' }));

    await act(async () => {
      await result.current.getSuggestions(50);
    });

    expect(mockFilterApi.getFilterSuggestions).toHaveBeenCalledWith(expect.any(Object), 50);
    expect(result.current.suggestions).toEqual(mockFilterSuggestions);
  });

  it('should not get suggestions when no query and no filters', async () => {
    const { result } = renderHook(() => useAdvancedFilters());

    await act(async () => {
      await result.current.getSuggestions(50);
    });

    expect(mockFilterApi.getFilterSuggestions).not.toHaveBeenCalled();
  });

  it('should handle suggestion errors gracefully', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    mockFilterApi.getFilterSuggestions.mockRejectedValueOnce(new Error('Suggestions failed'));

    const { result } = renderHook(() => useAdvancedFilters({ query: 'test' }));

    await act(async () => {
      await result.current.getSuggestions(50);
    });

    await waitFor(() => {
      expect(result.current.suggestions).toEqual([]);
    });

    consoleErrorSpy.mockRestore();
  });
});

describe('useAdvancedFilters - Analysis', () => {
  it('should analyze filters', async () => {
    const { result } = renderHook(() => useAdvancedFilters({ query: 'test' }));

    await act(async () => {
      await result.current.analyzeFilters();
    });

    expect(mockFilterApi.analyzeFilters).toHaveBeenCalled();
    expect(result.current.analysis).toEqual(mockAnalysisResponse);
  });

  it('should not analyze when no query and no filters', async () => {
    const { result } = renderHook(() => useAdvancedFilters());

    await act(async () => {
      await result.current.analyzeFilters();
    });

    expect(mockFilterApi.analyzeFilters).not.toHaveBeenCalled();
  });

  it('should handle analysis errors gracefully', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    mockFilterApi.analyzeFilters.mockRejectedValueOnce(new Error('Analysis failed'));

    const { result } = renderHook(() => useAdvancedFilters({ query: 'test' }));

    await act(async () => {
      await result.current.analyzeFilters();
    });

    await waitFor(() => {
      expect(result.current.analysis).toBeNull();
    });

    consoleErrorSpy.mockRestore();
  });
});

describe('useAdvancedFilters - Computed Values', () => {
  it('should calculate active filter count correctly', async () => {
    const { result } = renderHook(() =>
      useAdvancedFilters({
        initialFilters: {
          genres: ['Action'],
          yearFrom: 2023,
          contentType: 'Movie',
        },
      })
    );

    await waitFor(() => {
      // genres (1) + yearFrom (1) + contentType (1) = 3
      expect(result.current.activeFilterCount).toBe(3);
    });
  });

  it('should not count contentType="All" as active filter', () => {
    const { result } = renderHook(() =>
      useAdvancedFilters({
        initialFilters: {
          contentType: 'All',
        },
      })
    );

    expect(result.current.activeFilterCount).toBe(0);
  });

  it('should detect has active filters', () => {
    const { result } = renderHook(() => useAdvancedFilters({ initialFilters: { genres: ['Action'] } }));

    expect(result.current.hasActiveFilters).toBe(true);
  });

  it('should return correct filter summary', () => {
    const { result } = renderHook(() => useAdvancedFilters());

    expect(result.current.getFilterSummary()).toBe('No filters applied');

    act(() => {
      result.current.setFilters({ genres: ['Action'] });
    });

    expect(result.current.getFilterSummary()).toBe('1 filter applied');

    act(() => {
      result.current.updateFilter('yearFrom', 2023);
    });

    expect(result.current.getFilterSummary()).toBe('2 filters applied');
  });

  it('should return isFiltersValid based on validation', async () => {
    const { result } = renderHook(() => useAdvancedFilters({ query: 'test' }));

    expect(result.current.isFiltersValid).toBe(true);

    mockFilterApi.validateFilters.mockResolvedValueOnce({
      isValid: false,
      errors: ['Invalid filter'],
      warnings: [],
      suggestions: []
    });

    await act(async () => {
      await result.current.validateFilters();
    });

    await waitFor(() => {
      expect(result.current.isFiltersValid).toBe(false);
    });
  });
});
