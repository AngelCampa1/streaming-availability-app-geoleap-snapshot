import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiCall } from '@/lib/api';

// Types
export interface LanguagePreferencesDto {
  audioLanguages: string[];
  subtitleLanguages: string[];
}

export interface UpdateLanguagePreferencesRequest {
  audioLanguages: string[];
  subtitleLanguages: string[];
}

// Query keys
const LANGUAGE_PREFERENCES_KEYS = {
  all: ['languagePreferences'] as const,
  preferences: () => [...LANGUAGE_PREFERENCES_KEYS.all, 'preferences'] as const,
};

// API functions
async function fetchLanguagePreferences(): Promise<LanguagePreferencesDto> {
  return apiCall<LanguagePreferencesDto>('/api/preferences/language');
}

async function updateLanguagePreferences(
  data: UpdateLanguagePreferencesRequest
): Promise<LanguagePreferencesDto> {
  return apiCall<LanguagePreferencesDto>('/api/preferences/language', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// Hook
export function useLanguagePreferences() {
  const queryClient = useQueryClient();

  // Fetch language preferences
  const {
    data: preferences,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: LANGUAGE_PREFERENCES_KEYS.preferences(),
    queryFn: fetchLanguagePreferences,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  // Update language preferences mutation
  const updateMutation = useMutation({
    mutationFn: updateLanguagePreferences,
    onSuccess: (data) => {
      // Update cache with new data
      queryClient.setQueryData(LANGUAGE_PREFERENCES_KEYS.preferences(), data);

      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: ['preferences'],
      });
    },
    onError: (error) => {
      console.error('Failed to update language preferences:', error);
    },
  });

  // Helper function to update preferences
  const updatePreferences = async (
    audioLanguages: string[],
    subtitleLanguages: string[]
  ): Promise<void> => {
    await updateMutation.mutateAsync({
      audioLanguages,
      subtitleLanguages,
    });
  };

  return {
    preferences: preferences || { audioLanguages: [], subtitleLanguages: [] },
    isLoading,
    error: error as Error | null,
    updatePreferences,
    isUpdating: updateMutation.isPending,
    updateError: updateMutation.error as Error | null,
    refetch,
  };
}
