/**
 * Custom hook for managing user language preferences
 * Handles fetching, updating, and caching language preferences
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LanguagePreferences } from '../types/language.types';
import { useApiMutation } from './useApi';
import { logger } from '../utils/logger';

const STORAGE_KEY = '@language_preferences';
const API_ENDPOINT = '/api/user/language-preferences';

interface UseLanguagePreferencesReturn {
  preferences: LanguagePreferences | null;
  isLoading: boolean;
  error: Error | null;
  updatePreferences: (newPreferences: Partial<LanguagePreferences>) => Promise<void>;
  refetch: () => Promise<void>;
}

/**
 * Hook for managing user language preferences with offline-first approach
 */
export const useLanguagePreferences = (): UseLanguagePreferencesReturn => {
  const [preferences, setPreferences] = useState<LanguagePreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // API mutation for updating preferences
  const { mutate: _updatePreferencesAPI, isLoading: isUpdating } = useApiMutation<
    LanguagePreferences,
    Partial<LanguagePreferences>
  >(API_ENDPOINT, {
    method: 'PUT',
    onSuccess: (data) => {
      logger.debug('Language preferences updated successfully:', data);
      setPreferences(data);
      // Update local cache
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(err =>
        logger.error('Failed to cache language preferences:', err),
      );
    },
    onError: (err) => {
      logger.error('Failed to update language preferences:', err);
      setError(err);
    },
  });

  // Load preferences from cache
  const loadCachedPreferences = useCallback(async () => {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as LanguagePreferences;
        setPreferences(parsed);
        return parsed;
      }
    } catch (err) {
      logger.error('Failed to load cached language preferences:', err);
    }
    return null;
  }, []);

  // Fetch preferences from API
  const fetchPreferences = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Try to load from cache first for instant UI
      await loadCachedPreferences();

      // Then fetch from API (commented out for now as backend may not be ready)
      // In production, uncomment this and implement proper error handling
      /*
      const response = await ApiService.get(API_ENDPOINT);
      if (response.success && response.data) {
        const data = response.data as LanguagePreferences;
        setPreferences(data);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      }
      */

      // For now, use cached data or defaults
      const cached = await loadCachedPreferences();
      if (!cached) {
        // Set default preferences
        const defaultPreferences: LanguagePreferences = {
          audioLanguages: ['en'],
          subtitleLanguages: ['en'],
          lastUpdated: Date.now(),
        };
        setPreferences(defaultPreferences);
      }
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error('Failed to fetch language preferences');
      logger.error('Error fetching language preferences:', errorObj);
      setError(errorObj);

      // Fallback to cache
      await loadCachedPreferences();
    } finally {
      setIsLoading(false);
    }
  }, [loadCachedPreferences]);

  // Update preferences (optimistic update)
  const updatePreferences = useCallback(
    async (newPreferences: Partial<LanguagePreferences>) => {
      try {
        setError(null);

        // Optimistic update
        const updated: LanguagePreferences = {
          ...preferences,
          ...newPreferences,
          lastUpdated: Date.now(),
        } as LanguagePreferences;

        setPreferences(updated);

        // Update local cache immediately
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

        // Try to sync with backend (commented out for now)
        // In production, uncomment this
        /*
        await updatePreferencesAPI(updated);
        */

        logger.debug('Language preferences updated locally:', updated);
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error('Failed to update language preferences');
        logger.error('Error updating language preferences:', errorObj);
        setError(errorObj);

        // Revert optimistic update on error
        await fetchPreferences();
        throw errorObj;
      }
    },
    [preferences],
  );

  // Refetch preferences from API
  const refetch = useCallback(async () => {
    await fetchPreferences();
  }, [fetchPreferences]);

  // Initial load
  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  return {
    preferences,
    isLoading: isLoading || isUpdating,
    error,
    updatePreferences,
    refetch,
  };
};

export default useLanguagePreferences;
