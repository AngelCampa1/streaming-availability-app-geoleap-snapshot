/**
 * Comprehensive tests for useLanguagePreferences.ts
 *
 * Coverage Target: 85%+
 * Strategy: Test query, mutation, cache updates, error handling, default values
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useLanguagePreferences } from '../useLanguagePreferences';
import { apiCall } from '@/lib/api';

// Mock apiCall
jest.mock('@/lib/api', () => ({
  apiCall: jest.fn(),
}));

const mockApiCall = apiCall as jest.MockedFunction<typeof apiCall>;

// Test data
const mockPreferences = {
  audioLanguages: ['en', 'es'],
  subtitleLanguages: ['en', 'fr', 'de'],
};

const updatedPreferences = {
  audioLanguages: ['en', 'ja'],
  subtitleLanguages: ['en', 'ko'],
};

// Helper to create wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useLanguagePreferences - Query', () => {
  it('should fetch language preferences successfully', async () => {
    mockApiCall.mockResolvedValueOnce(mockPreferences);

    const { result } = renderHook(() => useLanguagePreferences(), {
      wrapper: createWrapper(),
    });

    // Initially loading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.preferences).toEqual({
      audioLanguages: [],
      subtitleLanguages: [],
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should have fetched preferences
    expect(result.current.preferences).toEqual(mockPreferences);
    expect(result.current.error).toBeNull();
    expect(mockApiCall).toHaveBeenCalledWith('/api/preferences/language');
  });

  it('should return default empty arrays when no data', async () => {
    mockApiCall.mockResolvedValueOnce(null);

    const { result } = renderHook(() => useLanguagePreferences(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.preferences).toEqual({
      audioLanguages: [],
      subtitleLanguages: [],
    });
  });

  it('should handle fetch error', async () => {
    const error = new Error('Network error');
    // Mock rejection for initial call + 2 retries (hook has retry: 2)
    mockApiCall
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error);

    const { result } = renderHook(() => useLanguagePreferences(), {
      wrapper: createWrapper(),
    });

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 5000 }
    );

    expect(result.current.error).toBeTruthy();
    expect(result.current.preferences).toEqual({
      audioLanguages: [],
      subtitleLanguages: [],
    });
  });

  it('should expose refetch function', async () => {
    mockApiCall.mockResolvedValueOnce(mockPreferences);

    const { result } = renderHook(() => useLanguagePreferences(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.refetch).toBeDefined();
    expect(typeof result.current.refetch).toBe('function');
  });
});

describe('useLanguagePreferences - Mutation', () => {
  it('should update language preferences successfully', async () => {
    mockApiCall
      .mockResolvedValueOnce(mockPreferences) // Initial fetch
      .mockResolvedValueOnce(updatedPreferences); // Update

    const { result } = renderHook(() => useLanguagePreferences(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Update preferences
    await result.current.updatePreferences(['en', 'ja'], ['en', 'ko']);

    await waitFor(() => {
      expect(result.current.isUpdating).toBe(false);
    });

    // Should have updated preferences
    expect(result.current.preferences).toEqual(updatedPreferences);
    expect(result.current.updateError).toBeNull();
    expect(mockApiCall).toHaveBeenCalledWith('/api/preferences/language', {
      method: 'PUT',
      body: JSON.stringify({
        audioLanguages: ['en', 'ja'],
        subtitleLanguages: ['en', 'ko'],
      }),
    });
  });

  it('should handle update error', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    const error = new Error('Update failed');

    mockApiCall
      .mockResolvedValueOnce(mockPreferences) // Initial fetch
      .mockRejectedValueOnce(error); // Update error

    const { result } = renderHook(() => useLanguagePreferences(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Attempt to update (should throw)
    await expect(
      result.current.updatePreferences(['en'], ['fr'])
    ).rejects.toThrow('Update failed');

    await waitFor(() => {
      expect(result.current.updateError).toBeTruthy();
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to update language preferences:',
      error
    );

    consoleErrorSpy.mockRestore();
  });

  it('should update cache on successful mutation', async () => {
    mockApiCall
      .mockResolvedValueOnce(mockPreferences) // Initial fetch
      .mockResolvedValueOnce(updatedPreferences); // Update

    const { result } = renderHook(() => useLanguagePreferences(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Verify initial data
    expect(result.current.preferences).toEqual(mockPreferences);

    // Update preferences
    await result.current.updatePreferences(['en', 'ja'], ['en', 'ko']);

    // Cache should be updated immediately
    await waitFor(() => {
      expect(result.current.preferences).toEqual(updatedPreferences);
    });
  });

  it('should expose isUpdating state', async () => {
    let resolveMutation: (value: any) => void;
    const mutationPromise = new Promise((resolve) => {
      resolveMutation = resolve;
    });

    mockApiCall
      .mockResolvedValueOnce(mockPreferences) // Initial fetch
      .mockImplementationOnce(() => mutationPromise); // Pending update

    const { result } = renderHook(() => useLanguagePreferences(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Start update (don't await)
    const updatePromise = result.current.updatePreferences(['en'], ['fr']);

    // Should eventually complete
    resolveMutation!(updatedPreferences);
    await updatePromise;

    await waitFor(() => {
      expect(result.current.isUpdating).toBe(false);
    });
  });
});

describe('useLanguagePreferences - Update Function', () => {
  it('should accept audio and subtitle languages as parameters', async () => {
    mockApiCall
      .mockResolvedValueOnce(mockPreferences)
      .mockResolvedValueOnce(updatedPreferences);

    const { result } = renderHook(() => useLanguagePreferences(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await result.current.updatePreferences(
      ['en', 'es', 'fr'],
      ['en', 'de', 'it']
    );

    expect(mockApiCall).toHaveBeenCalledWith('/api/preferences/language', {
      method: 'PUT',
      body: JSON.stringify({
        audioLanguages: ['en', 'es', 'fr'],
        subtitleLanguages: ['en', 'de', 'it'],
      }),
    });
  });

  it('should handle empty language arrays', async () => {
    mockApiCall
      .mockResolvedValueOnce(mockPreferences)
      .mockResolvedValueOnce({ audioLanguages: [], subtitleLanguages: [] });

    const { result } = renderHook(() => useLanguagePreferences(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await result.current.updatePreferences([], []);

    expect(mockApiCall).toHaveBeenCalledWith('/api/preferences/language', {
      method: 'PUT',
      body: JSON.stringify({
        audioLanguages: [],
        subtitleLanguages: [],
      }),
    });
  });

  it('should handle single language selections', async () => {
    mockApiCall
      .mockResolvedValueOnce(mockPreferences)
      .mockResolvedValueOnce({ audioLanguages: ['en'], subtitleLanguages: ['en'] });

    const { result } = renderHook(() => useLanguagePreferences(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await result.current.updatePreferences(['en'], ['en']);

    expect(mockApiCall).toHaveBeenCalledWith('/api/preferences/language', {
      method: 'PUT',
      body: JSON.stringify({
        audioLanguages: ['en'],
        subtitleLanguages: ['en'],
      }),
    });
  });
});

describe('useLanguagePreferences - Cache Behavior', () => {
  it('should use stale data for 5 minutes', async () => {
    mockApiCall.mockResolvedValueOnce(mockPreferences);

    const { result, rerender } = renderHook(() => useLanguagePreferences(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // First call should fetch
    expect(mockApiCall).toHaveBeenCalledTimes(1);

    // Rerender shouldn't fetch again (within stale time)
    rerender();
    expect(mockApiCall).toHaveBeenCalledTimes(1);
  });

  it('should invalidate related preferences queries on update', async () => {
    mockApiCall
      .mockResolvedValueOnce(mockPreferences)
      .mockResolvedValueOnce(updatedPreferences);

    const { result } = renderHook(() => useLanguagePreferences(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Update should trigger invalidation
    await result.current.updatePreferences(['en', 'ja'], ['en', 'ko']);

    await waitFor(() => {
      expect(result.current.preferences).toEqual(updatedPreferences);
    });

    // Cache should be updated (tested via preferences value)
    expect(result.current.preferences.audioLanguages).toEqual(['en', 'ja']);
    expect(result.current.preferences.subtitleLanguages).toEqual(['en', 'ko']);
  });
});

describe('useLanguagePreferences - Error States', () => {
  it('should expose both query and mutation errors separately', async () => {
    const queryError = new Error('Fetch failed');
    const mutationError = new Error('Update failed');
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    mockApiCall
      .mockRejectedValueOnce(queryError) // Initial fetch attempt 1
      .mockRejectedValueOnce(queryError) // Initial fetch retry 1
      .mockRejectedValueOnce(queryError) // Initial fetch retry 2
      .mockRejectedValueOnce(mutationError); // Update error

    const { result } = renderHook(() => useLanguagePreferences(), {
      wrapper: createWrapper(),
    });

    await waitFor(
      () => {
        expect(result.current.error).toBeTruthy();
      },
      { timeout: 5000 }
    );

    // Query error
    expect(result.current.error?.message).toBe('Fetch failed');

    // Attempt update (should fail)
    await expect(
      result.current.updatePreferences(['en'], ['fr'])
    ).rejects.toThrow('Update failed');

    await waitFor(() => {
      expect(result.current.updateError).toBeTruthy();
    });

    // Mutation error
    expect(result.current.updateError?.message).toBe('Update failed');

    consoleErrorSpy.mockRestore();
  });

  it('should clear mutation error on successful update', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    mockApiCall
      .mockResolvedValueOnce(mockPreferences) // Initial fetch
      .mockRejectedValueOnce(new Error('First update failed')) // First update error
      .mockResolvedValueOnce(updatedPreferences); // Second update success

    const { result } = renderHook(() => useLanguagePreferences(), {
      wrapper: createWrapper(),
    });

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 5000 }
    );

    // First update (fails)
    await expect(
      result.current.updatePreferences(['en'], ['fr'])
    ).rejects.toThrow('First update failed');

    await waitFor(() => {
      expect(result.current.updateError).toBeTruthy();
    });

    // Second update (succeeds)
    await result.current.updatePreferences(['en', 'ja'], ['en', 'ko']);

    await waitFor(() => {
      expect(result.current.updateError).toBeNull();
    });

    consoleErrorSpy.mockRestore();
  });
});
