/**
 * Custom hook for managing user streaming service preferences
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/logger';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UserStreamingPreferences } from '../types/streaming.types';
import ApiService from '../services/api/ApiService';

const STORAGE_KEY = '@streaming_services';

interface UseStreamingServicesReturn {
  selectedServices: string[];
  isLoading: boolean;
  error: Error | null;
  selectService: (serviceId: string) => void;
  deselectService: (serviceId: string) => void;
  setServices: (serviceIds: string[]) => void;
  savePreferences: () => Promise<void>;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
}

export const useStreamingServices = (userId?: string): UseStreamingServicesReturn => {
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const queryClient = useQueryClient();

  // Fetch preferences from API if user is logged in
  const { data: preferences, isLoading: isFetchingPreferences, error: fetchError } = useQuery({
    queryKey: ['streaming-preferences', userId],
    queryFn: async () => {
      if (!userId) {return null;}

      const response = await ApiService.get<UserStreamingPreferences>(
        '/api/user/preferences/streaming-services',
      );

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to fetch streaming preferences');
      }

      return response.data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Load local preferences on mount
  useEffect(() => {
    const loadLocalPreferences = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          setSelectedServices(JSON.parse(stored));
        }
      } catch (error) {
        logger.error('[useStreamingServices] Failed to load streaming preferences', error);
      }
    };

    if (!userId) {
      loadLocalPreferences();
    }
  }, [userId]);

  // Sync with API preferences when loaded
  useEffect(() => {
    if (preferences?.selectedServices) {
      setSelectedServices(preferences.selectedServices);
      // Also update local storage
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(preferences.selectedServices));
    }
  }, [preferences]);

  // Save preferences mutation
  const { mutateAsync: saveToApi, isPending: isSaving } = useMutation({
    mutationFn: async (services: string[]) => {
      if (!userId) {
        // Save locally only
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(services));
        return;
      }

      // Save to API
      const response = await ApiService.put(
        '/api/user/preferences/streaming-services',
        {
          selectedServices: services,
        },
      );

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to save streaming preferences');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['streaming-preferences', userId] });
      setHasUnsavedChanges(false);
    },
  });

  const selectService = useCallback((serviceId: string) => {
    setSelectedServices(prev => {
      if (prev.includes(serviceId)) {return prev;}
      const updated = [...prev, serviceId];
      setHasUnsavedChanges(true);
      return updated;
    });
  }, []);

  const deselectService = useCallback((serviceId: string) => {
    setSelectedServices(prev => {
      const updated = prev.filter(id => id !== serviceId);
      setHasUnsavedChanges(true);
      return updated;
    });
  }, []);

  const setServices = useCallback((serviceIds: string[]) => {
    setSelectedServices(serviceIds);
    setHasUnsavedChanges(true);
  }, []);

  const savePreferences = useCallback(async () => {
    await saveToApi(selectedServices);
  }, [selectedServices, saveToApi]);

  return {
    selectedServices,
    isLoading: isFetchingPreferences,
    error: fetchError,
    selectService,
    deselectService,
    setServices,
    savePreferences,
    isSaving,
    hasUnsavedChanges,
  };
};
