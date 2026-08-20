/**
 * Custom hook for fetching and managing country recommendations for content
 * Implements offline-first approach with AsyncStorage caching
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CountryRecommendation,
  CountriesForContentResponse,
  GroupedCountries,
  groupCountriesByQuality,
} from '../types/vpn-country.types';
import { ApiService } from '../services/api/ApiService';
import { logger } from '../utils/logger';

const CACHE_PREFIX = '@countries_for_content_';
const CACHE_DURATION = 1000 * 60 * 30; // 30 minutes

interface UseCountriesForContentParams {
  contentId: string;
  audioLanguages: string[];
  subtitleLanguages: string[];
  enabled?: boolean; // Don't fetch if false
}

interface UseCountriesForContentReturn {
  countries: CountryRecommendation[];
  groupedCountries: GroupedCountries;
  response: CountriesForContentResponse | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  clearCache: () => Promise<void>;
}

/**
 * Hook for fetching country recommendations for specific content
 * with offline-first caching strategy
 */
export const useCountriesForContent = ({
  contentId,
  audioLanguages,
  subtitleLanguages,
  enabled = true,
}: UseCountriesForContentParams): UseCountriesForContentReturn => {
  const [countries, setCountries] = useState<CountryRecommendation[]>([]);
  const [groupedCountries, setGroupedCountries] = useState<GroupedCountries>({
    perfect: [],
    good: [],
    partial: [],
    other: [],
  });
  const [response, setResponse] = useState<CountriesForContentResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Generate cache key
  const getCacheKey = useCallback(() => {
    const langKey = [...audioLanguages, ...subtitleLanguages].sort().join(',');
    return `${CACHE_PREFIX}${contentId}_${langKey}`;
  }, [contentId, audioLanguages, subtitleLanguages]);

  // Load from cache
  const loadFromCache = useCallback(async (): Promise<CountriesForContentResponse | null> => {
    try {
      const cacheKey = getCacheKey();
      const cached = await AsyncStorage.getItem(cacheKey);

      if (cached) {
        const parsed = JSON.parse(cached);
        const cachedAt = new Date(parsed.generatedAt).getTime();
        const now = Date.now();

        // Check if cache is still valid
        if (now - cachedAt < CACHE_DURATION) {
          logger.debug('Loaded countries from cache:', cacheKey);
          return parsed as CountriesForContentResponse;
        } else {
          // Cache expired, remove it
          await AsyncStorage.removeItem(cacheKey);
          logger.debug('Cache expired, removed:', cacheKey);
        }
      }
    } catch (err) {
      logger.error('Failed to load countries from cache:', err);
    }
    return null;
  }, [getCacheKey]);

  // Save to cache
  const saveToCache = useCallback(async (data: CountriesForContentResponse) => {
    try {
      const cacheKey = getCacheKey();
      await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
      logger.debug('Saved countries to cache:', cacheKey);
    } catch (err) {
      logger.error('Failed to save countries to cache:', err);
    }
  }, [getCacheKey]);

  // Clear cache
  const clearCache = useCallback(async () => {
    try {
      const cacheKey = getCacheKey();
      await AsyncStorage.removeItem(cacheKey);
      logger.debug('Cleared cache:', cacheKey);
    } catch (err) {
      logger.error('Failed to clear cache:', err);
    }
  }, [getCacheKey]);

  // Fetch countries from API
  const fetchCountries = useCallback(async () => {
    if (!enabled || !contentId) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Try to load from cache first for instant UI
      const cached = await loadFromCache();
      if (cached) {
        setResponse(cached);
        setCountries(cached.recommendedCountries);
        setGroupedCountries(groupCountriesByQuality(cached.recommendedCountries));
      }

      // Fetch from API
      // Build query parameters
      const params = new URLSearchParams();
      audioLanguages.forEach(lang => params.append('audioLanguages', lang));
      subtitleLanguages.forEach(lang => params.append('subtitleLanguages', lang));

      const apiService = new ApiService();
      const apiResponse = await apiService.get<CountriesForContentResponse>(
        `/api/vpnguidance/countries-for-content/${contentId}?${params.toString()}`,
      );

      if (!apiResponse.success || !apiResponse.data) {
        throw new Error(apiResponse.error?.message || 'Failed to fetch countries');
      }

      const data = apiResponse.data;

        // Update state
        setResponse(data);
        setCountries(data.recommendedCountries);
        setGroupedCountries(groupCountriesByQuality(data.recommendedCountries));

        // Save to cache
        await saveToCache(data);

        logger.debug('Fetched countries for content:', {
          contentId,
          totalCountries: data.totalCountriesAnalyzed,
          perfectMatches: data.countriesWithPerfectMatch,
        });
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error('Failed to fetch countries');
      logger.error('Error fetching countries for content:', errorObj);
      setError(errorObj);

      // Keep cached data on error if available
      if (countries.length === 0) {
        const cached = await loadFromCache();
        if (cached) {
          setResponse(cached);
          setCountries(cached.recommendedCountries);
          setGroupedCountries(groupCountriesByQuality(cached.recommendedCountries));
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [
    enabled,
    contentId,
    audioLanguages,
    subtitleLanguages,
    loadFromCache,
    saveToCache,
    countries.length,
  ]);

  // Refetch (force refresh, bypass cache)
  const refetch = useCallback(async () => {
    await clearCache();
    await fetchCountries();
  }, [clearCache, fetchCountries]);

  // Initial load
  useEffect(() => {
    fetchCountries();
  }, [fetchCountries]);

  return {
    countries,
    groupedCountries,
    response,
    isLoading,
    error,
    refetch,
    clearCache,
  };
};

export default useCountriesForContent;
