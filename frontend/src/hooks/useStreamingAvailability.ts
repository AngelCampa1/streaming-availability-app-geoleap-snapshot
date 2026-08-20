'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  streamingAvailabilityService,
  EnhancedStreamingOption,
  CountryStreamingOptions,
  StreamingAvailabilityResult,
} from '@/services/streamingAvailabilityService';
import { logger } from '@/lib/logger';

interface UseStreamingAvailabilityOptions {
  contentId?: string;
  contentType?: 'movie' | 'tv-show' | 'documentary';
  title?: string;
  country?: string;
  autoFetch?: boolean;
}

interface UseStreamingAvailabilityReturn {
  streamingOptions: EnhancedStreamingOption[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  searchByTitle: (params: StreamingAvailabilitySearchByTitleParams) => Promise<EnhancedStreamingOption[]>;
  getByCountry: (countries?: string[]) => Promise<CountryStreamingOptions[]>;
  getAvailabilityChanges: () => Promise<{
    expiringSoon: EnhancedStreamingOption[];
    newlyAvailable: EnhancedStreamingOption[];
  }>;
}

interface StreamingAvailabilitySearchByTitleParams {
  title: string;
  year?: number;
  type?: 'movie' | 'series';
  country?: string;
  lang?: string;
  showType?: 'all' | 'flatrate' | 'free' | 'ads' | 'rent' | 'buy' | 'cinema';
}

/**
 * Enhanced hook for streaming availability using the official library
 */
export function useStreamingAvailability(
  options: UseStreamingAvailabilityOptions = {}
): UseStreamingAvailabilityReturn {
  const [streamingOptions, setStreamingOptions] = useState<EnhancedStreamingOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { contentId, contentType, title, country = 'us', autoFetch = true } = options;

  const fetchStreamingOptions = useCallback(async () => {
    if (!contentId && !title) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let options: EnhancedStreamingOption[] = [];

      if (contentId && contentType) {
        // Use our internal types directly - the service handles conversion internally
        options = await streamingAvailabilityService.getStreamingOptionsById(contentId, contentType, country);
      } else if (title) {
        // Convert our internal types to official API types for title search
        const serviceType =
          contentType === 'tv-show' || contentType === 'documentary' ? 'series' : (contentType as 'movie');
        options = await streamingAvailabilityService.getStreamingOptionsByTitle({
          title,
          type: serviceType,
          country,
        });
      }

      setStreamingOptions(options);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch streaming options';
      setError(errorMessage);
      logger.error('Failed to fetch streaming options', { error: errorMessage, options });
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentId, contentType, title, country]);

  const refresh = useCallback(async () => {
    await fetchStreamingOptions();
  }, [fetchStreamingOptions]);

  const searchByTitle = useCallback(
    async (params: StreamingAvailabilitySearchByTitleParams): Promise<EnhancedStreamingOption[]> => {
      try {
        setError(null);
        return await streamingAvailabilityService.getStreamingOptionsByTitle(params);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to search by title';
        setError(errorMessage);
        logger.error('Failed to search streaming options by title', { error: errorMessage, params });
        return [];
      }
    },
    []
  );

  const getByCountry = useCallback(
    async (countries?: string[]): Promise<CountryStreamingOptions[]> => {
      if (!contentId || !contentType) {
        return [];
      }

      try {
        setError(null);
        // Convert documentary to tv-show for the country method since it only accepts movie/tv-show
        const convertedContentType = contentType === 'documentary' ? 'tv-show' : contentType;
        return await streamingAvailabilityService.getStreamingOptionsByCountry(
          contentId,
          convertedContentType,
          countries
        );
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to get streaming options by country';
        setError(errorMessage);
        logger.error('Failed to get streaming options by country', { error: errorMessage, contentId, contentType });
        return [];
      }
    },
    [contentId, contentType]
  );

  const getAvailabilityChanges = useCallback(async () => {
    if (!contentId || !contentType) {
      return { expiringSoon: [], newlyAvailable: [] };
    }

    try {
      setError(null);
      // Convert documentary to tv-show for availability changes since it only accepts movie/tv-show
      const serviceContentType = contentType === 'documentary' ? 'tv-show' : contentType;
      return await streamingAvailabilityService.getAvailabilityChanges(contentId, serviceContentType, country);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get availability changes';
      setError(errorMessage);
      logger.error('Failed to get availability changes', { error: errorMessage, contentId, contentType });
      return { expiringSoon: [], newlyAvailable: [] };
    }
  }, [contentId, contentType, country]);

  useEffect(() => {
    if (autoFetch) {
      fetchStreamingOptions();
    }
  }, [autoFetch, fetchStreamingOptions]);

  return {
    streamingOptions,
    loading,
    error,
    refresh,
    searchByTitle,
    getByCountry,
    getAvailabilityChanges,
  };
}

/**
 * Hook for searching content with streaming availability
 */
export function useStreamingAvailabilitySearch() {
  const [results, setResults] = useState<StreamingAvailabilityResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const search = useCallback(
    async (params: { query: string; type?: 'movie' | 'series'; country?: string; year?: number; limit?: number }) => {
      if (!params.query.trim()) {
        return [];
      }

      try {
        setLoading(true);
        setError(null);
        setHasSearched(true);

        const response = await streamingAvailabilityService.searchContentWithAvailability(params);
        // Convert the response results to match our interface
        const convertedResults = response.results.map(result => ({
          ...result,
          totalStreamingOptions: result.streamingOptions.length,
        }));
        setResults(convertedResults);
        return convertedResults;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to search content';
        setError(errorMessage);
        logger.error('Failed to search content with availability', { error: errorMessage, params });
        return [];
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
    setHasSearched(false);
  }, []);

  return {
    results,
    loading,
    error,
    hasSearched,
    search,
    clearResults,
  };
}

/**
 * Hook for managing streaming preferences and filters
 */
export function useStreamingPreferences() {
  const [preferences, setPreferences] = useState<{
    videoQuality?: 'sd' | 'hd' | 'qhd' | 'uhd';
    audioLanguages: string[];
    subtitleLanguages: string[];
    preferredServices: string[];
    maxPrice?: number;
    currency?: string;
    includeFree: boolean;
    includePaid: boolean;
    showExpiringSoon: boolean;
    country: string;
  }>({
    audioLanguages: [],
    subtitleLanguages: [],
    preferredServices: [],
    includeFree: true,
    includePaid: true,
    showExpiringSoon: false,
    country: 'us',
  });

  const updatePreferences = useCallback((newPreferences: Partial<typeof preferences>) => {
    setPreferences(prev => ({ ...prev, ...newPreferences }));
  }, []);

  const filterStreamingOptions = useCallback(
    (options: EnhancedStreamingOption[]): EnhancedStreamingOption[] => {
      return options.filter(option => {
        // Filter by price preferences
        if (option.price) {
          if (!preferences.includePaid) return false;
          if (preferences.maxPrice && option.price > preferences.maxPrice) return false;
        } else {
          if (!preferences.includeFree) return false;
        }

        // Filter by preferred services
        if (preferences.preferredServices.length > 0 && !preferences.preferredServices.includes(option.serviceId)) {
          return false;
        }

        // Filter by expiring soon preference
        if (preferences.showExpiringSoon && !option.expiresSoon) {
          return false;
        }

        return true;
      });
    },
    [preferences]
  );

  const sortStreamingOptions = useCallback(
    (options: EnhancedStreamingOption[]): EnhancedStreamingOption[] => {
      return [...options].sort((a, b) => {
        // Sort by preferred services first
        const aIsPreferred = preferences.preferredServices.includes(a.serviceId);
        const bIsPreferred = preferences.preferredServices.includes(b.serviceId);

        if (aIsPreferred && !bIsPreferred) return -1;
        if (!aIsPreferred && bIsPreferred) return 1;

        // Sort by price (free first, then ascending)
        if (!a.price && b.price) return -1;
        if (a.price && !b.price) return 1;
        if (a.price && b.price) return a.price - b.price;

        // Sort by quality (higher quality first)
        const qualityOrder = { uhd: 4, qhd: 3, hd: 2, sd: 1 };
        const aQuality = Math.max(...(a.quality || []).map(q => qualityOrder[q as keyof typeof qualityOrder] || 0));
        const bQuality = Math.max(...(b.quality || []).map(q => qualityOrder[q as keyof typeof qualityOrder] || 0));

        return bQuality - aQuality;
      });
    },
    [preferences.preferredServices]
  );

  return {
    preferences,
    updatePreferences,
    filterStreamingOptions,
    sortStreamingOptions,
  };
}
