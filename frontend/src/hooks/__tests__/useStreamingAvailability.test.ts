/**
 * Comprehensive tests for useStreamingAvailability.ts
 *
 * Coverage Target: 85%+ (all three hooks)
 * Strategy: Test hook logic (state, callbacks, effects), mock service calls
 * Note: streamingAvailabilityService is already tested comprehensively in its own test file
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import {
  useStreamingAvailability,
  useStreamingAvailabilitySearch,
  useStreamingPreferences,
} from '../useStreamingAvailability';
import type { EnhancedStreamingOption } from '@/services/streamingAvailabilityService';
import * as streamingAvailabilityService from '@/services/streamingAvailabilityService';

// Mock logger to avoid console spam
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock the streaming availability service - already tested in streamingAvailabilityService.test.ts
jest.mock('@/services/streamingAvailabilityService', () => ({
  streamingAvailabilityService: {
    getStreamingOptionsById: jest.fn(),
    getStreamingOptionsByTitle: jest.fn(),
    getStreamingOptionsByCountry: jest.fn(),
    getAvailabilityChanges: jest.fn(),
    searchContentWithAvailability: jest.fn(),
  },
}));

const mockStreamingOption: EnhancedStreamingOption = {
  serviceId: 'netflix',
  serviceName: 'Netflix',
  type: 'subscription',
  url: 'https://netflix.com/watch/123',
  quality: ['uhd'],
  audioLanguages: ['eng'],
  subtitleLanguages: ['eng', 'spa'],
  price: 15.99,
  currency: 'USD',
  expiresSoon: false,
};

const mockStreamingOptions: EnhancedStreamingOption[] = [
  mockStreamingOption,
  { ...mockStreamingOption, serviceId: 'hulu', serviceName: 'Hulu', price: 12.99 },
];

const mockServiceSpy = streamingAvailabilityService.streamingAvailabilityService as jest.Mocked<
  typeof streamingAvailabilityService.streamingAvailabilityService
>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useStreamingAvailability - Main Hook', () => {
  it('should initialize with empty state and not fetch when autoFetch is false', () => {
    const { result } = renderHook(() =>
      useStreamingAvailability({ contentId: '123', contentType: 'movie', autoFetch: false })
    );

    expect(result.current.streamingOptions).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should fetch streaming options by contentId on mount when autoFetch is true', async () => {
    mockServiceSpy.getStreamingOptionsById.mockResolvedValueOnce(mockStreamingOptions);

    const { result } = renderHook(() =>
      useStreamingAvailability({ contentId: 'tt1234', contentType: 'movie', autoFetch: true })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockServiceSpy.getStreamingOptionsById).toHaveBeenCalledWith('tt1234', 'movie', 'us');
    expect(result.current.streamingOptions).toEqual(mockStreamingOptions);
    expect(result.current.error).toBeNull();
  });

  it('should fetch streaming options by title when no contentId', async () => {
    mockServiceSpy.getStreamingOptionsByTitle.mockResolvedValueOnce(mockStreamingOptions);

    const { result } = renderHook(() =>
      useStreamingAvailability({ title: 'Inception', contentType: 'movie', autoFetch: true })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockServiceSpy.getStreamingOptionsByTitle).toHaveBeenCalledWith({ title: 'Inception', type: 'movie', country: 'us' });
    expect(result.current.streamingOptions).toEqual(mockStreamingOptions);
  });

  it('should convert tv-show to series when fetching by title', async () => {
    mockServiceSpy.getStreamingOptionsByTitle.mockResolvedValueOnce([]);

    const { result } = renderHook(() =>
      useStreamingAvailability({ title: 'Breaking Bad', contentType: 'tv-show', autoFetch: true })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockServiceSpy.getStreamingOptionsByTitle).toHaveBeenCalledWith({ title: 'Breaking Bad', type: 'series', country: 'us' });
  });

  it('should not fetch when no contentId and no title provided', async () => {
    const { result } = renderHook(() => useStreamingAvailability({ autoFetch: true }));

    // Should remain in initial state
    expect(result.current.streamingOptions).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(mockServiceSpy.getStreamingOptionsById).not.toHaveBeenCalled();
    expect(mockServiceSpy.getStreamingOptionsByTitle).not.toHaveBeenCalled();
  });

  it('should handle fetch errors gracefully', async () => {
    mockServiceSpy.getStreamingOptionsById.mockRejectedValueOnce(new Error('API Error'));

    const { result } = renderHook(() =>
      useStreamingAvailability({ contentId: 'test', contentType: 'movie', autoFetch: true })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('API Error');
    expect(result.current.streamingOptions).toEqual([]);
  });

  it('should refresh streaming options', async () => {
    mockServiceSpy.getStreamingOptionsById.mockResolvedValue(mockStreamingOptions);

    const { result } = renderHook(() =>
      useStreamingAvailability({ contentId: 'test', contentType: 'movie', autoFetch: false })
    );

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.streamingOptions).toEqual(mockStreamingOptions);
  });

  it('should search by title with custom parameters', async () => {
    mockServiceSpy.getStreamingOptionsByTitle.mockResolvedValueOnce(mockStreamingOptions);

    const { result } = renderHook(() => useStreamingAvailability({ autoFetch: false }));

    let searchResult: EnhancedStreamingOption[] = [];
    await act(async () => {
      searchResult = await result.current.searchByTitle({ title: 'The Matrix', year: 1999 });
    });

    expect(mockServiceSpy.getStreamingOptionsByTitle).toHaveBeenCalledWith({ title: 'The Matrix', year: 1999 });
    expect(searchResult).toEqual(mockStreamingOptions);
    expect(result.current.error).toBeNull();
  });

  it('should return empty array on searchByTitle error', async () => {
    mockServiceSpy.getStreamingOptionsByTitle.mockRejectedValueOnce(new Error('Search failed'));

    const { result } = renderHook(() => useStreamingAvailability({ autoFetch: false }));

    let searchResult: EnhancedStreamingOption[] = [];
    await act(async () => {
      searchResult = await result.current.searchByTitle({ title: 'Test' });
    });

    expect(searchResult).toEqual([]);
    expect(result.current.error).toBe('Search failed');
  });

  it('should get streaming options by country', async () => {
    mockServiceSpy.getStreamingOptionsByCountry.mockResolvedValueOnce([
      { country: 'us', services: [mockStreamingOption], totalCount: 1 },
      { country: 'gb', services: [], totalCount: 0 },
    ]);

    const { result } = renderHook(() =>
      useStreamingAvailability({ contentId: 'test', contentType: 'movie', autoFetch: false })
    );

    let countryOptions;
    await act(async () => {
      countryOptions = await result.current.getByCountry(['us', 'gb']);
    });

    expect(mockServiceSpy.getStreamingOptionsByCountry).toHaveBeenCalledWith('test', 'movie', ['us', 'gb']);
    expect(countryOptions).toHaveLength(2);
  });

  it('should return empty array for getByCountry when no contentId', async () => {
    const { result } = renderHook(() => useStreamingAvailability({ autoFetch: false }));

    const countryOptions = await result.current.getByCountry(['us']);

    expect(countryOptions).toEqual([]);
    expect(mockServiceSpy.getStreamingOptionsByCountry).not.toHaveBeenCalled();
  });

  it('should handle getByCountry errors', async () => {
    mockServiceSpy.getStreamingOptionsByCountry.mockRejectedValueOnce(new Error('Country error'));

    const { result } = renderHook(() =>
      useStreamingAvailability({ contentId: 'test', contentType: 'movie', autoFetch: false })
    );

    let countryOptions;
    await act(async () => {
      countryOptions = await result.current.getByCountry(['us']);
    });

    expect(countryOptions).toEqual([]);
    expect(result.current.error).toBe('Country error');
  });

  it('should get availability changes', async () => {
    const mockChanges = {
      expiringSoon: [mockStreamingOption],
      newlyAvailable: [{ ...mockStreamingOption, serviceId: 'hbo' }],
    };

    mockServiceSpy.getAvailabilityChanges.mockResolvedValueOnce(mockChanges);

    const { result } = renderHook(() =>
      useStreamingAvailability({ contentId: 'test', contentType: 'movie', autoFetch: false })
    );

    let changes;
    await act(async () => {
      changes = await result.current.getAvailabilityChanges();
    });

    expect(mockServiceSpy.getAvailabilityChanges).toHaveBeenCalledWith('test', 'movie', 'us');
    expect(changes).toEqual(mockChanges);
  });

  it('should return empty changes when no contentId', async () => {
    const { result } = renderHook(() => useStreamingAvailability({ autoFetch: false }));

    const changes = await result.current.getAvailabilityChanges();

    expect(changes).toEqual({ expiringSoon: [], newlyAvailable: [] });
    expect(mockServiceSpy.getAvailabilityChanges).not.toHaveBeenCalled();
  });

  it('should convert documentary to tv-show for getByCountry', async () => {
    mockServiceSpy.getStreamingOptionsByCountry.mockResolvedValueOnce([]);

    const { result } = renderHook(() =>
      useStreamingAvailability({ contentId: 'test', contentType: 'documentary', autoFetch: false })
    );

    await act(async () => {
      await result.current.getByCountry(['us']);
    });

    // Should convert documentary -> tv-show
    expect(mockServiceSpy.getStreamingOptionsByCountry).toHaveBeenCalledWith('test', 'tv-show', ['us']);
  });
});

describe('useStreamingAvailabilitySearch - Search Hook', () => {
  it('should initialize with empty results and not searched state', () => {
    const { result } = renderHook(() => useStreamingAvailabilitySearch());

    expect(result.current.results).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.hasSearched).toBe(false);
  });

  it('should search for content and return results', async () => {
    const mockSearchResults = {
      results: [
        { id: '1', title: 'Test Movie', year: 2023, type: 'movie' as const, streamingOptions: mockStreamingOptions },
      ],
      total: 1,
    };

    mockServiceSpy.searchContentWithAvailability.mockResolvedValueOnce(mockSearchResults);

    const { result } = renderHook(() => useStreamingAvailabilitySearch());

    await act(async () => {
      await result.current.search({ query: 'test' });
    });

    expect(result.current.results).toHaveLength(1);
    expect(result.current.results[0].totalStreamingOptions).toBe(2);
    expect(result.current.hasSearched).toBe(true);
    expect(result.current.loading).toBe(false);
  });

  it('should not search with empty query', async () => {
    const { result } = renderHook(() => useStreamingAvailabilitySearch());

    const searchResults = await result.current.search({ query: '  ' });

    expect(searchResults).toEqual([]);
    expect(result.current.results).toEqual([]);
    expect(result.current.hasSearched).toBe(false);
    expect(mockServiceSpy.searchContentWithAvailability).not.toHaveBeenCalled();
  });

  it('should handle search errors gracefully', async () => {
    mockServiceSpy.searchContentWithAvailability.mockRejectedValueOnce(new Error('Search error'));

    const { result } = renderHook(() => useStreamingAvailabilitySearch());

    await act(async () => {
      await result.current.search({ query: 'test' });
    });

    expect(result.current.error).toBe('Search error');
    expect(result.current.results).toEqual([]);
    expect(result.current.hasSearched).toBe(true);
  });

  it('should clear results and reset state', async () => {
    const mockSearchResults = {
      results: [{ id: '1', title: 'Test', year: 2023, type: 'movie' as const, streamingOptions: [] }],
      total: 1,
    };

    mockServiceSpy.searchContentWithAvailability.mockResolvedValueOnce(mockSearchResults);

    const { result } = renderHook(() => useStreamingAvailabilitySearch());

    await act(async () => {
      await result.current.search({ query: 'test' });
    });

    expect(result.current.results).toHaveLength(1);

    act(() => {
      result.current.clearResults();
    });

    expect(result.current.results).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(result.current.hasSearched).toBe(false);
  });
});

describe('useStreamingPreferences - Preferences Hook', () => {
  it('should initialize with default preferences', () => {
    const { result } = renderHook(() => useStreamingPreferences());

    expect(result.current.preferences).toEqual({
      audioLanguages: [],
      subtitleLanguages: [],
      preferredServices: [],
      includeFree: true,
      includePaid: true,
      showExpiringSoon: false,
      country: 'us',
    });
  });

  it('should update preferences', () => {
    const { result } = renderHook(() => useStreamingPreferences());

    act(() => {
      result.current.updatePreferences({ includeFree: false, maxPrice: 20 });
    });

    expect(result.current.preferences.includeFree).toBe(false);
    expect(result.current.preferences.maxPrice).toBe(20);
    expect(result.current.preferences.includePaid).toBe(true); // Unchanged
  });

  it('should filter streaming options by price preferences - exclude paid', () => {
    const { result } = renderHook(() => useStreamingPreferences());

    act(() => {
      result.current.updatePreferences({ includePaid: false });
    });

    const options = [
      { ...mockStreamingOption, price: 15.99 },
      { ...mockStreamingOption, serviceId: 'freevee', price: undefined },
    ];

    const filtered = result.current.filterStreamingOptions(options);

    expect(filtered).toHaveLength(1);
    expect(filtered[0].serviceId).toBe('freevee');
  });

  it('should filter streaming options by price preferences - exclude free', () => {
    const { result } = renderHook(() => useStreamingPreferences());

    act(() => {
      result.current.updatePreferences({ includeFree: false });
    });

    const options = [
      { ...mockStreamingOption, price: 15.99 },
      { ...mockStreamingOption, serviceId: 'freevee', price: undefined },
    ];

    const filtered = result.current.filterStreamingOptions(options);

    expect(filtered).toHaveLength(1);
    expect(filtered[0].price).toBe(15.99);
  });

  it('should filter by max price', () => {
    const { result } = renderHook(() => useStreamingPreferences());

    act(() => {
      result.current.updatePreferences({ maxPrice: 10 });
    });

    const options = [
      { ...mockStreamingOption, price: 5.99 },
      { ...mockStreamingOption, serviceId: 'expensive', price: 15.99 },
    ];

    const filtered = result.current.filterStreamingOptions(options);

    expect(filtered).toHaveLength(1);
    expect(filtered[0].price).toBe(5.99);
  });

  it('should filter by preferred services', () => {
    const { result } = renderHook(() => useStreamingPreferences());

    act(() => {
      result.current.updatePreferences({ preferredServices: ['netflix', 'hbo'] });
    });

    const options = [
      { ...mockStreamingOption, serviceId: 'netflix' },
      { ...mockStreamingOption, serviceId: 'hulu' },
      { ...mockStreamingOption, serviceId: 'hbo' },
    ];

    const filtered = result.current.filterStreamingOptions(options);

    expect(filtered).toHaveLength(2);
    expect(filtered.map(o => o.serviceId)).toContain('netflix');
    expect(filtered.map(o => o.serviceId)).toContain('hbo');
  });

  it('should filter by expiring soon', () => {
    const { result } = renderHook(() => useStreamingPreferences());

    act(() => {
      result.current.updatePreferences({ showExpiringSoon: true });
    });

    const options = [
      { ...mockStreamingOption, expiresSoon: true },
      { ...mockStreamingOption, serviceId: 'stable', expiresSoon: false },
    ];

    const filtered = result.current.filterStreamingOptions(options);

    expect(filtered).toHaveLength(1);
    expect(filtered[0].expiresSoon).toBe(true);
  });

  it('should sort by preferred services first', () => {
    const { result } = renderHook(() => useStreamingPreferences());

    act(() => {
      result.current.updatePreferences({ preferredServices: ['hulu'] });
    });

    const options = [
      { ...mockStreamingOption, serviceId: 'netflix', price: 10 },
      { ...mockStreamingOption, serviceId: 'hulu', price: 15 },
    ];

    const sorted = result.current.sortStreamingOptions(options);

    expect(sorted[0].serviceId).toBe('hulu'); // Preferred service first
  });

  it('should sort free options before paid', () => {
    const { result } = renderHook(() => useStreamingPreferences());

    const options = [
      { ...mockStreamingOption, serviceId: 'paid', price: 10 },
      { ...mockStreamingOption, serviceId: 'free', price: undefined },
    ];

    const sorted = result.current.sortStreamingOptions(options);

    expect(sorted[0].serviceId).toBe('free');
  });

  it('should sort by price ascending when both paid', () => {
    const { result } = renderHook(() => useStreamingPreferences());

    const options = [
      { ...mockStreamingOption, serviceId: 'expensive', price: 20 },
      { ...mockStreamingOption, serviceId: 'cheap', price: 5 },
    ];

    const sorted = result.current.sortStreamingOptions(options);

    expect(sorted[0].price).toBe(5);
    expect(sorted[1].price).toBe(20);
  });

  it('should sort by quality (higher quality first)', () => {
    const { result } = renderHook(() => useStreamingPreferences());

    const options = [
      { ...mockStreamingOption, serviceId: 'sd', quality: ['sd'], price: undefined },
      { ...mockStreamingOption, serviceId: 'uhd', quality: ['uhd'], price: undefined },
      { ...mockStreamingOption, serviceId: 'hd', quality: ['hd'], price: undefined },
    ];

    const sorted = result.current.sortStreamingOptions(options);

    expect(sorted[0].quality).toContain('uhd');
    expect(sorted[2].quality).toContain('sd');
  });

  it('should apply complex sorting - preferred, free, quality', () => {
    const { result } = renderHook(() => useStreamingPreferences());

    act(() => {
      result.current.updatePreferences({ preferredServices: ['netflix'] });
    });

    const options = [
      { ...mockStreamingOption, serviceId: 'hulu', price: 10, quality: ['hd'] },
      { ...mockStreamingOption, serviceId: 'netflix', price: undefined, quality: ['sd'] },
      { ...mockStreamingOption, serviceId: 'hbo', price: 15, quality: ['uhd'] },
    ];

    const sorted = result.current.sortStreamingOptions(options);

    // Netflix first (preferred + free)
    expect(sorted[0].serviceId).toBe('netflix');
  });
});
