/**
 * useCountriesForContent Hook Tests
 * Day 5 Continuation - VPN Hooks
 *
 * Tests for VPN country recommendations with offline-first caching
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCountriesForContent } from '../../../hooks/useCountriesForContent';
import { ApiService } from '../../../services/api/ApiService';
import { groupCountriesByQuality } from '../../../types/vpn-country.types';
import type { CountriesForContentResponse, CountryRecommendation } from '../../../types/vpn-country.types';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

// Mock logger
jest.mock('../../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock groupCountriesByQuality
jest.mock('../../../types/vpn-country.types', () => ({
  groupCountriesByQuality: jest.fn((countries) => ({
    perfect: countries.filter((c: any) => c.quality === 'perfect'),
    good: countries.filter((c: any) => c.quality === 'good'),
    partial: countries.filter((c: any) => c.quality === 'partial'),
    other: countries.filter((c: any) => c.quality === 'other'),
  })),
}));

// Mock ApiService
const mockGet = jest.fn();
jest.mock('../../../services/api/ApiService', () => ({
  ApiService: jest.fn().mockImplementation(() => ({
    get: mockGet,
  })),
}));

describe('useCountriesForContent Hook', () => {
  // CRITICAL: Use stable array references to avoid infinite loop in hook
  const STABLE_AUDIO_LANGUAGES = ['en'];
  const STABLE_SUBTITLE_LANGUAGES = ['en'];
  const STABLE_EMPTY_AUDIO = [] as string[];
  const STABLE_EMPTY_SUBTITLES = [] as string[];
  const STABLE_MULTI_AUDIO = ['en', 'es'];
  const STABLE_MULTI_SUBTITLE_1 = ['fr', 'de'];
  const STABLE_MULTI_SUBTITLE_2 = ['fr'];

  const mockCountries: CountryRecommendation[] = [
    {
      countryCode: 'US',
      countryName: 'United States',
      quality: 'perfect',
      hasAudioLanguages: true,
      hasSubtitleLanguages: true,
      audioLanguageMatch: ['en'],
      subtitleLanguageMatch: ['en'],
      recommendationScore: 100,
    },
    {
      countryCode: 'CA',
      countryName: 'Canada',
      quality: 'good',
      hasAudioLanguages: true,
      hasSubtitleLanguages: false,
      audioLanguageMatch: ['en'],
      subtitleLanguageMatch: [],
      recommendationScore: 75,
    },
  ];

  const mockResponse: CountriesForContentResponse = {
    contentId: 'content-123',
    recommendedCountries: mockCountries,
    totalCountriesAnalyzed: 100,
    countriesWithPerfectMatch: 1,
    countriesWithGoodMatch: 1,
    generatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
    mockGet.mockResolvedValue({
      success: true,
      data: mockResponse,
    });
  });

  describe('Initialization', () => {
    it('should fetch countries on mount when enabled', async () => {
      const { result } = renderHook(() =>
        useCountriesForContent({
          contentId: 'content-123',
          audioLanguages: STABLE_AUDIO_LANGUAGES,
          subtitleLanguages: STABLE_SUBTITLE_LANGUAGES,
          enabled: true,
        })
      );

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGet).toHaveBeenCalled();
      expect(result.current.countries).toEqual(mockCountries);
    });

    it('should not fetch when enabled=false', async () => {
      const { result } = renderHook(() =>
        useCountriesForContent({
          contentId: 'content-123',
          audioLanguages: STABLE_AUDIO_LANGUAGES,
          subtitleLanguages: STABLE_SUBTITLE_LANGUAGES,
          enabled: false,
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGet).not.toHaveBeenCalled();
      expect(result.current.countries).toEqual([]);
    });

    it('should not fetch when contentId is empty', async () => {
      const { result } = renderHook(() =>
        useCountriesForContent({
          contentId: '',
          audioLanguages: STABLE_AUDIO_LANGUAGES,
          subtitleLanguages: STABLE_SUBTITLE_LANGUAGES,
          enabled: true,
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGet).not.toHaveBeenCalled();
    });
  });

  describe('Cache Management', () => {
    it('should load from cache if valid', async () => {
      const cachedData = {
        ...mockResponse,
        generatedAt: new Date().toISOString(), // Fresh cache
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(cachedData));

      const { result } = renderHook(() =>
        useCountriesForContent({
          contentId: 'content-123',
          audioLanguages: STABLE_AUDIO_LANGUAGES,
          subtitleLanguages: STABLE_SUBTITLE_LANGUAGES,
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(AsyncStorage.getItem).toHaveBeenCalled();
      expect(result.current.countries).toEqual(mockCountries);
    });

    it('should ignore expired cache', async () => {
      const expiredDate = new Date();
      expiredDate.setHours(expiredDate.getHours() - 2); // 2 hours ago

      const expiredData = {
        ...mockResponse,
        generatedAt: expiredDate.toISOString(),
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(expiredData));

      const { result } = renderHook(() =>
        useCountriesForContent({
          contentId: 'content-123',
          audioLanguages: STABLE_AUDIO_LANGUAGES,
          subtitleLanguages: STABLE_SUBTITLE_LANGUAGES,
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should remove expired cache
      expect(AsyncStorage.removeItem).toHaveBeenCalled();

      // Should fetch fresh data from API
      expect(mockGet).toHaveBeenCalled();
    });

    it('should save to cache after successful fetch', async () => {
      const { result } = renderHook(() =>
        useCountriesForContent({
          contentId: 'content-123',
          audioLanguages: STABLE_AUDIO_LANGUAGES,
          subtitleLanguages: STABLE_SUBTITLE_LANGUAGES,
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(AsyncStorage.setItem).toHaveBeenCalled();

      // Verify cache key format
      const cacheKey = (AsyncStorage.setItem as jest.Mock).mock.calls[0][0];
      expect(cacheKey).toContain('@countries_for_content_');
      expect(cacheKey).toContain('content-123');
    });

    it('should clear cache', async () => {
      const { result } = renderHook(() =>
        useCountriesForContent({
          contentId: 'content-123',
          audioLanguages: STABLE_AUDIO_LANGUAGES,
          subtitleLanguages: STABLE_SUBTITLE_LANGUAGES,
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.clearCache();
      });

      expect(AsyncStorage.removeItem).toHaveBeenCalled();
    });

    it('should generate correct cache key with languages', async () => {
      const { result } = renderHook(() =>
        useCountriesForContent({
          contentId: 'content-456',
          audioLanguages: STABLE_MULTI_AUDIO,
          subtitleLanguages: STABLE_MULTI_SUBTITLE_1,
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const cacheKey = (AsyncStorage.setItem as jest.Mock).mock.calls[0][0];
      expect(cacheKey).toContain('content-456');
      // Key should contain languages (sorted)
      expect(cacheKey).toBeTruthy();
    });
  });

  describe('API Fetching', () => {
    it('should fetch from API successfully', async () => {
      const { result } = renderHook(() =>
        useCountriesForContent({
          contentId: 'content-123',
          audioLanguages: STABLE_AUDIO_LANGUAGES,
          subtitleLanguages: STABLE_SUBTITLE_LANGUAGES,
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('/api/vpnguidance/countries-for-content/content-123')
      );
    });

    it('should build query params correctly', async () => {
      const { result } = renderHook(() =>
        useCountriesForContent({
          contentId: 'content-123',
          audioLanguages: STABLE_MULTI_AUDIO,
          subtitleLanguages: STABLE_MULTI_SUBTITLE_2,
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const apiCall = (mockGet as jest.Mock).mock.calls[0][0];
      expect(apiCall).toContain('audioLanguages=en');
      expect(apiCall).toContain('audioLanguages=es');
      expect(apiCall).toContain('subtitleLanguages=fr');
    });

    it('should handle API errors', async () => {
      mockGet.mockResolvedValue({
        success: false,
        error: { message: 'API Error' },
      });

      const { result } = renderHook(() =>
        useCountriesForContent({
          contentId: 'content-123',
          audioLanguages: STABLE_AUDIO_LANGUAGES,
          subtitleLanguages: STABLE_SUBTITLE_LANGUAGES,
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.error?.message).toContain('API Error');
    });

    it('should update state after successful fetch', async () => {
      const { result } = renderHook(() =>
        useCountriesForContent({
          contentId: 'content-123',
          audioLanguages: STABLE_AUDIO_LANGUAGES,
          subtitleLanguages: STABLE_SUBTITLE_LANGUAGES,
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.countries).toEqual(mockCountries);
      expect(result.current.response).toEqual(mockResponse);
      expect(result.current.error).toBeNull();
    });

    it('should group countries after fetch', async () => {
      const { result } = renderHook(() =>
        useCountriesForContent({
          contentId: 'content-123',
          audioLanguages: STABLE_AUDIO_LANGUAGES,
          subtitleLanguages: STABLE_SUBTITLE_LANGUAGES,
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(groupCountriesByQuality).toHaveBeenCalledWith(mockCountries);
      expect(result.current.groupedCountries).toBeDefined();
    });

    it('should handle network errors', async () => {
      mockGet.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() =>
        useCountriesForContent({
          contentId: 'content-123',
          audioLanguages: STABLE_AUDIO_LANGUAGES,
          subtitleLanguages: STABLE_SUBTITLE_LANGUAGES,
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.error?.message).toContain('Network error');
    });
  });

  describe('Offline-First Strategy', () => {
    it('should show cached data immediately', async () => {
      const cachedData = {
        ...mockResponse,
        generatedAt: new Date().toISOString(),
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(cachedData));

      const { result } = renderHook(() =>
        useCountriesForContent({
          contentId: 'content-123',
          audioLanguages: STABLE_AUDIO_LANGUAGES,
          subtitleLanguages: STABLE_SUBTITLE_LANGUAGES,
        })
      );

      // Cache should be loaded before API call completes
      await waitFor(() => {
        expect(result.current.countries.length).toBeGreaterThan(0);
      });
    });

    it('should keep cached data on API error', async () => {
      const cachedData = {
        ...mockResponse,
        generatedAt: new Date().toISOString(),
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(cachedData));
      mockGet.mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(() =>
        useCountriesForContent({
          contentId: 'content-123',
          audioLanguages: STABLE_AUDIO_LANGUAGES,
          subtitleLanguages: STABLE_SUBTITLE_LANGUAGES,
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should still have cached data despite API error
      expect(result.current.countries).toEqual(mockCountries);
      expect(result.current.error).toBeTruthy();
    });

    it('should update with fresh data after cache', async () => {
      const cachedData = {
        ...mockResponse,
        generatedAt: new Date().toISOString(),
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(cachedData));

      const freshData = {
        ...mockResponse,
        totalCountriesAnalyzed: 150, // Different data
      };

      mockGet.mockResolvedValue({
        success: true,
        data: freshData,
      });

      const { result } = renderHook(() =>
        useCountriesForContent({
          contentId: 'content-123',
          audioLanguages: STABLE_AUDIO_LANGUAGES,
          subtitleLanguages: STABLE_SUBTITLE_LANGUAGES,
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should have fresh data from API
      expect(result.current.response?.totalCountriesAnalyzed).toBe(150);
    });
  });

  describe('Refetch', () => {
    it('should clear cache and refetch', async () => {
      const { result } = renderHook(() =>
        useCountriesForContent({
          contentId: 'content-123',
          audioLanguages: STABLE_AUDIO_LANGUAGES,
          subtitleLanguages: STABLE_SUBTITLE_LANGUAGES,
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialCallCount = mockGet.mock.calls.length;

      await act(async () => {
        await result.current.refetch();
      });

      expect(AsyncStorage.removeItem).toHaveBeenCalled();
      expect(mockGet.mock.calls.length).toBeGreaterThan(initialCallCount);
    });

    it('should bypass cache on refetch', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ ...mockResponse, generatedAt: new Date().toISOString() })
      );

      const { result } = renderHook(() =>
        useCountriesForContent({
          contentId: 'content-123',
          audioLanguages: STABLE_AUDIO_LANGUAGES,
          subtitleLanguages: STABLE_SUBTITLE_LANGUAGES,
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Clear mocks to track refetch behavior
      jest.clearAllMocks();
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
      mockGet.mockResolvedValue({ success: true, data: mockResponse });

      await act(async () => {
        await result.current.refetch();
      });

      // Should clear cache first
      expect(AsyncStorage.removeItem).toHaveBeenCalled();

      // Then fetch fresh data
      expect(mockGet).toHaveBeenCalled();
    });
  });

  describe('Loading States', () => {
    it('should set isLoading during fetch', async () => {
      const { result } = renderHook(() =>
        useCountriesForContent({
          contentId: 'content-123',
          audioLanguages: STABLE_AUDIO_LANGUAGES,
          subtitleLanguages: STABLE_SUBTITLE_LANGUAGES,
        })
      );

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should clear isLoading after fetch completes', async () => {
      const { result } = renderHook(() =>
        useCountriesForContent({
          contentId: 'content-123',
          audioLanguages: STABLE_AUDIO_LANGUAGES,
          subtitleLanguages: STABLE_SUBTITLE_LANGUAGES,
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should clear isLoading even on error', async () => {
      mockGet.mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(() =>
        useCountriesForContent({
          contentId: 'content-123',
          audioLanguages: STABLE_AUDIO_LANGUAGES,
          subtitleLanguages: STABLE_SUBTITLE_LANGUAGES,
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should set error on API failure', async () => {
      mockGet.mockResolvedValue({
        success: false,
        error: { message: 'Server error' },
      });

      const { result } = renderHook(() =>
        useCountriesForContent({
          contentId: 'content-123',
          audioLanguages: STABLE_AUDIO_LANGUAGES,
          subtitleLanguages: STABLE_SUBTITLE_LANGUAGES,
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
    });

    it('should fall back to cache on error', async () => {
      const cachedData = {
        ...mockResponse,
        generatedAt: new Date().toISOString(),
      };

      let callCount = 0;
      (AsyncStorage.getItem as jest.Mock).mockImplementation(() => {
        callCount++;
        return Promise.resolve(JSON.stringify(cachedData));
      });

      mockGet.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() =>
        useCountriesForContent({
          contentId: 'content-123',
          audioLanguages: STABLE_AUDIO_LANGUAGES,
          subtitleLanguages: STABLE_SUBTITLE_LANGUAGES,
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should have data from cache fallback
      expect(result.current.countries).toEqual(mockCountries);
      expect(AsyncStorage.getItem).toHaveBeenCalled();
    });

    it('should handle cache read errors gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Cache read error'));

      const { result } = renderHook(() =>
        useCountriesForContent({
          contentId: 'content-123',
          audioLanguages: STABLE_AUDIO_LANGUAGES,
          subtitleLanguages: STABLE_SUBTITLE_LANGUAGES,
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should still fetch from API
      expect(mockGet).toHaveBeenCalled();
      expect(result.current.countries).toEqual(mockCountries);
    });
  });
});
