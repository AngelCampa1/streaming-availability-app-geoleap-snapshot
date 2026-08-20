/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiCall } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { signalRPreferencesClient } from '@/services/signalRClient';
import { useEffect, useCallback, useMemo } from 'react';
import { logger } from '@/lib/logger';
// Note: Using structured logging for notifications

// Type for preference values - can be string, number, boolean, or JSON object
export type PreferenceValue = string | number | boolean | Record<string, unknown> | null;

// Types
export interface UserPreference {
  category: string;
  key: string;
  value: PreferenceValue;
  valueType: 'String' | 'Integer' | 'Boolean' | 'Decimal' | 'Json';
  isDefault: boolean;
  lastModified: string;
}

export interface PreferenceCategory {
  name: string;
  displayName: string;
  description: string;
  preferences: UserPreference[];
}

export interface BulkPreferenceUpdate {
  category: string;
  preferences: Record<string, PreferenceValue>;
}

export interface ExportedPreferences {
  preferences: Record<string, Record<string, PreferenceValue>>;
  exportedAt: string;
  version: string;
}

// Query keys
const PREFERENCES_QUERY_KEYS = {
  all: ['preferences'] as const,
  categories: () => [...PREFERENCES_QUERY_KEYS.all, 'categories'] as const,
  category: (category: string) => [...PREFERENCES_QUERY_KEYS.all, 'category', category] as const,
  preference: (category: string, key: string) => [...PREFERENCES_QUERY_KEYS.all, 'preference', category, key] as const,
} as const;

// API functions
async function fetchPreferences(): Promise<Record<string, Record<string, PreferenceValue>>> {
  return apiCall<Record<string, Record<string, PreferenceValue>>>('/api/preferences');
}

async function fetchPreferenceCategories(): Promise<PreferenceCategory[]> {
  return apiCall<PreferenceCategory[]>('/api/preferences/categories');
}

async function fetchCategoryPreferences(category: string): Promise<Record<string, PreferenceValue>> {
  return apiCall<Record<string, PreferenceValue>>(`/api/preferences/${category}`);
}

async function updatePreference(category: string, key: string, value: PreferenceValue): Promise<UserPreference> {
  return apiCall<UserPreference>(`/api/preferences/${category}/${key}`, {
    method: 'PUT',
    body: JSON.stringify({ value }),
  });
}

async function bulkUpdatePreferences(updates: BulkPreferenceUpdate[]): Promise<void> {
  return apiCall<void>('/api/preferences/bulk', {
    method: 'PUT',
    body: JSON.stringify({ updates }),
  });
}

async function resetPreferences(category?: string): Promise<void> {
  const url = category ? `/api/preferences/reset?category=${category}` : '/api/preferences/reset';
  return apiCall<void>(url, {
    method: 'POST',
  });
}

async function exportPreferences(): Promise<ExportedPreferences> {
  return apiCall<ExportedPreferences>('/api/preferences/export', {
    method: 'POST',
  });
}

async function importPreferences(preferences: Record<string, Record<string, any>>): Promise<void> {
  return apiCall<void>('/api/preferences/import', {
    method: 'POST',
    body: JSON.stringify({ preferences }),
  });
}

// Main hook
export function usePreferences() {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  // Connect to SignalR when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      signalRPreferencesClient
        .connect()
        .then(() => {
          signalRPreferencesClient.joinUserGroup(user.id);
        })
        .catch(console.error);

      return () => {
        signalRPreferencesClient.leaveUserGroup(user.id);
      };
    }
  }, [isAuthenticated, user]);

  // Set up real-time updates
  useEffect(() => {
    const handlePreferenceUpdate = (event: { key: string; category: string; value: PreferenceValue }) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: PREFERENCES_QUERY_KEYS.all });

      // Show notification (using structured logging)
      logger.info(`[usePreferences] Preference "${event.key}" updated`, { category: event.category });
    };

    const handlePreferencesUpdate = (event: { userId: string; timestamp: string }) => {
      // Invalidate all preferences queries
      queryClient.invalidateQueries({ queryKey: PREFERENCES_QUERY_KEYS.all });

      // Show notification
      logger.info('[usePreferences] Preferences synchronized', { userId: event.userId });
    };

    const handlePreferenceReset = (event: { userId: string; category?: string; timestamp: string }) => {
      // Invalidate all preferences queries
      queryClient.invalidateQueries({ queryKey: PREFERENCES_QUERY_KEYS.all });

      // Show notification
      const category = event.category ? ` for ${event.category}` : '';
      logger.info(`[usePreferences] Preferences reset${category}`, { userId: event.userId });
    };

    signalRPreferencesClient.onPreferenceUpdated(handlePreferenceUpdate);
    signalRPreferencesClient.onPreferencesUpdated(handlePreferencesUpdate);
    signalRPreferencesClient.onPreferenceReset(handlePreferenceReset);

    return () => {
      signalRPreferencesClient.off('PreferenceUpdated', handlePreferenceUpdate);
      signalRPreferencesClient.off('PreferencesUpdated', handlePreferencesUpdate);
      signalRPreferencesClient.off('PreferenceReset', handlePreferenceReset);
    };
  }, [queryClient]);

  // Queries
  const preferencesQuery = useQuery({
    queryKey: PREFERENCES_QUERY_KEYS.all,
    queryFn: fetchPreferences,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const categoriesQuery = useQuery({
    queryKey: PREFERENCES_QUERY_KEYS.categories(),
    queryFn: fetchPreferenceCategories,
    enabled: isAuthenticated,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Mutations
  const updatePreferenceMutation = useMutation({
    mutationFn: ({ category, key, value }: { category: string; key: string; value: PreferenceValue }) =>
      updatePreference(category, key, value),
    onSuccess: (data, variables) => {
      // Update cache
      queryClient.setQueryData(PREFERENCES_QUERY_KEYS.preference(variables.category, variables.key), data);

      // Invalidate category and all preferences
      queryClient.invalidateQueries({ queryKey: PREFERENCES_QUERY_KEYS.category(variables.category) });
      queryClient.invalidateQueries({ queryKey: PREFERENCES_QUERY_KEYS.all });

      // Notify other clients via SignalR
      signalRPreferencesClient.notifyPreferenceChange(variables.category, variables.key, variables.value);

      logger.info('[usePreferences] Preference updated successfully', { category: variables.category, key: variables.key });
    },
    onError: error => {
      console.error('Failed to update preference:', error);
      console.error('Failed to update preference');
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: bulkUpdatePreferences,
    onSuccess: () => {
      // Invalidate all preferences
      queryClient.invalidateQueries({ queryKey: PREFERENCES_QUERY_KEYS.all });
      logger.info('[usePreferences] Preferences updated successfully (bulk update)');
    },
    onError: error => {
      console.error('Failed to bulk update preferences:', error);
      console.error('Failed to update preferences');
    },
  });

  const resetMutation = useMutation({
    mutationFn: (category?: string) => resetPreferences(category),
    onSuccess: (_, category) => {
      // Invalidate all preferences
      queryClient.invalidateQueries({ queryKey: PREFERENCES_QUERY_KEYS.all });

      const message = category ? `${category} preferences reset` : 'All preferences reset';
      logger.info(`[usePreferences] ${message}`);
    },
    onError: error => {
      console.error('Failed to reset preferences:', error);
      console.error('Failed to reset preferences');
    },
  });

  const exportMutation = useMutation({
    mutationFn: exportPreferences,
    onSuccess: data => {
      // Create and download file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `preferences-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      logger.info('[usePreferences] Preferences exported successfully');
    },
    onError: error => {
      console.error('Failed to export preferences:', error);
      console.error('Failed to export preferences');
    },
  });

  const importMutation = useMutation({
    mutationFn: importPreferences,
    onSuccess: () => {
      // Invalidate all preferences
      queryClient.invalidateQueries({ queryKey: PREFERENCES_QUERY_KEYS.all });
      logger.info('[usePreferences] Preferences imported successfully');
    },
    onError: error => {
      console.error('Failed to import preferences:', error);
      console.error('Failed to import preferences');
    },
  });

  // Helper functions
  const getPreference = useCallback(
    (category: string, key: string, defaultValue?: PreferenceValue) => {
      const preferences = preferencesQuery.data;
      return preferences?.[category]?.[key] ?? defaultValue;
    },
    [preferencesQuery.data]
  );

  const getCategoryPreferences = useCallback(
    (category: string) => {
      return preferencesQuery.data?.[category] ?? {};
    },
    [preferencesQuery.data]
  );

  return {
    // Data
    preferences: preferencesQuery.data,
    categories: categoriesQuery.data,

    // Loading states
    isLoading: preferencesQuery.isLoading || categoriesQuery.isLoading,
    isUpdating: updatePreferenceMutation.isPending || bulkUpdateMutation.isPending,
    isResetting: resetMutation.isPending,
    isExporting: exportMutation.isPending,
    isImporting: importMutation.isPending,

    // Actions
    updatePreference: updatePreferenceMutation.mutate,
    bulkUpdate: bulkUpdateMutation.mutate,
    reset: resetMutation.mutate,
    export: exportMutation.mutate,
    import: importMutation.mutate,

    // Helpers
    getPreference,
    getCategoryPreferences,

    // SignalR status
    isConnected: signalRPreferencesClient.isConnected,
    connectionState: signalRPreferencesClient.connectionState,

    // Refetch
    refetch: preferencesQuery.refetch,
  };
}

// Category-specific hooks
export function useCategoryPreferences(category: string) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: PREFERENCES_QUERY_KEYS.category(category),
    queryFn: () => fetchCategoryPreferences(category),
    enabled: isAuthenticated && !!category,
    staleTime: 5 * 60 * 1000,
  });
}

// Search and filter hook
export function usePreferenceSearch(searchTerm: string, category?: string) {
  const { preferences, categories: _categories } = usePreferences();

  return useMemo(() => {
    if (!searchTerm.trim()) {
      return category ? { [category]: preferences?.[category] || {} } : preferences || {};
    }

    const searchLower = searchTerm.toLowerCase();
    const filtered: Record<string, Record<string, any>> = {};

    // Search in category names and preference keys
    for (const [catName, catPrefs] of Object.entries(preferences || {})) {
      if (category && catName !== category) continue;

      const categoryMatch = catName.toLowerCase().includes(searchLower);
      const matchingPrefs: Record<string, any> = {};

      for (const [key, value] of Object.entries(catPrefs)) {
        if (categoryMatch || key.toLowerCase().includes(searchLower)) {
          matchingPrefs[key] = value;
        }
      }

      if (Object.keys(matchingPrefs).length > 0) {
        filtered[catName] = matchingPrefs;
      }
    }

    return filtered;
  }, [preferences, searchTerm, category]);
}
