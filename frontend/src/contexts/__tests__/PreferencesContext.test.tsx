/**
 * PreferencesContext Test
 * Tests the preferences context provider and reducer
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import {
  PreferencesProvider,
  usePreferences,
  type UserPreferences,
} from '../PreferencesContext';

// Helper to render hook with provider
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <PreferencesProvider>{children}</PreferencesProvider>
);

const mockUserPreferences: UserPreferences = {
  id: 'pref-123',
  userId: 'user-456',
  emailNotifications: true,
  pushNotifications: false,
  preferredGenre: 'Action',
  contentLanguage: 'en',
  adultContent: false,
  subtitlesEnabled: true,
  videoQuality: 'high',
  primaryRegion: 'US',
  secondaryRegions: ['CA', 'UK'],
  timezone: 'America/New_York',
  currency: 'USD',
  measurementUnit: 'imperial',
  twoFactorEnabled: true,
  sessionTimeout: 3600,
  passwordExpiry: 90,
  loginNotifications: true,
  deviceTracking: false,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-15T12:00:00Z',
};

describe('PreferencesContext', () => {
  describe('Provider', () => {
    it('provides initial state', () => {
      const { result } = renderHook(() => usePreferences(), { wrapper });

      expect(result.current.state).toEqual({
        preferences: null,
        loading: false,
        error: null,
        hasUnsavedChanges: false,
      });
    });

    it('provides all context functions', () => {
      const { result } = renderHook(() => usePreferences(), { wrapper });

      expect(result.current.updatePreferences).toBeDefined();
      expect(result.current.resetPreferences).toBeDefined();
      expect(result.current.setLoading).toBeDefined();
      expect(result.current.setError).toBeDefined();
      expect(result.current.setUnsavedChanges).toBeDefined();
      expect(result.current.dispatch).toBeDefined();
    });
  });

  describe('usePreferences hook', () => {
    it('throws error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      expect(() => {
        renderHook(() => usePreferences());
      }).toThrow('usePreferences must be used within a PreferencesProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('Reducer Actions', () => {
    describe('SET_LOADING', () => {
      it('sets loading state to true', () => {
        const { result } = renderHook(() => usePreferences(), { wrapper });

        act(() => {
          result.current.setLoading(true);
        });

        expect(result.current.state.loading).toBe(true);
      });

      it('sets loading state to false', () => {
        const { result } = renderHook(() => usePreferences(), { wrapper });

        act(() => {
          result.current.setLoading(true);
        });

        act(() => {
          result.current.setLoading(false);
        });

        expect(result.current.state.loading).toBe(false);
      });
    });

    describe('SET_PREFERENCES', () => {
      it('sets preferences and resets state', () => {
        const { result } = renderHook(() => usePreferences(), { wrapper });

        act(() => {
          result.current.setLoading(true);
          result.current.setError('Test error');
          result.current.setUnsavedChanges(true);
        });

        act(() => {
          result.current.dispatch({
            type: 'SET_PREFERENCES',
            payload: mockUserPreferences,
          });
        });

        expect(result.current.state.preferences).toEqual(mockUserPreferences);
        expect(result.current.state.loading).toBe(false);
        expect(result.current.state.error).toBeNull();
        expect(result.current.state.hasUnsavedChanges).toBe(false);
      });

      it('replaces existing preferences completely', () => {
        const { result } = renderHook(() => usePreferences(), { wrapper });

        act(() => {
          result.current.dispatch({
            type: 'SET_PREFERENCES',
            payload: mockUserPreferences,
          });
        });

        const newPreferences: UserPreferences = {
          userId: 'user-789',
          emailNotifications: false,
        };

        act(() => {
          result.current.dispatch({
            type: 'SET_PREFERENCES',
            payload: newPreferences,
          });
        });

        expect(result.current.state.preferences).toEqual(newPreferences);
        expect(result.current.state.preferences?.preferredGenre).toBeUndefined();
      });
    });

    describe('UPDATE_PREFERENCES', () => {
      it('updates existing preferences partially', () => {
        const { result } = renderHook(() => usePreferences(), { wrapper });

        act(() => {
          result.current.dispatch({
            type: 'SET_PREFERENCES',
            payload: mockUserPreferences,
          });
        });

        act(() => {
          result.current.updatePreferences({
            emailNotifications: false,
            preferredGenre: 'Comedy',
          });
        });

        expect(result.current.state.preferences?.emailNotifications).toBe(false);
        expect(result.current.state.preferences?.preferredGenre).toBe('Comedy');
        expect(result.current.state.preferences?.pushNotifications).toBe(false); // Unchanged
        expect(result.current.state.hasUnsavedChanges).toBe(true);
      });

      it('sets hasUnsavedChanges to true', () => {
        const { result } = renderHook(() => usePreferences(), { wrapper });

        act(() => {
          result.current.dispatch({
            type: 'SET_PREFERENCES',
            payload: mockUserPreferences,
          });
        });

        expect(result.current.state.hasUnsavedChanges).toBe(false);

        act(() => {
          result.current.updatePreferences({ emailNotifications: false });
        });

        expect(result.current.state.hasUnsavedChanges).toBe(true);
      });

      it('handles null preferences gracefully', () => {
        const { result } = renderHook(() => usePreferences(), { wrapper });

        act(() => {
          result.current.updatePreferences({ emailNotifications: true });
        });

        expect(result.current.state.preferences).toBeNull();
        expect(result.current.state.hasUnsavedChanges).toBe(true);
      });

      it('updates nested array properties', () => {
        const { result } = renderHook(() => usePreferences(), { wrapper });

        act(() => {
          result.current.dispatch({
            type: 'SET_PREFERENCES',
            payload: mockUserPreferences,
          });
        });

        act(() => {
          result.current.updatePreferences({
            secondaryRegions: ['DE', 'FR', 'IT'],
          });
        });

        expect(result.current.state.preferences?.secondaryRegions).toEqual(['DE', 'FR', 'IT']);
      });
    });

    describe('SET_ERROR', () => {
      it('sets error message and stops loading', () => {
        const { result } = renderHook(() => usePreferences(), { wrapper });

        act(() => {
          result.current.setLoading(true);
        });

        act(() => {
          result.current.setError('Failed to load preferences');
        });

        expect(result.current.state.error).toBe('Failed to load preferences');
        expect(result.current.state.loading).toBe(false);
      });

      it('clears error when set to null', () => {
        const { result } = renderHook(() => usePreferences(), { wrapper });

        act(() => {
          result.current.setError('Test error');
        });

        act(() => {
          result.current.setError(null);
        });

        expect(result.current.state.error).toBeNull();
      });
    });

    describe('SET_UNSAVED_CHANGES', () => {
      it('sets hasUnsavedChanges flag', () => {
        const { result } = renderHook(() => usePreferences(), { wrapper });

        act(() => {
          result.current.setUnsavedChanges(true);
        });

        expect(result.current.state.hasUnsavedChanges).toBe(true);

        act(() => {
          result.current.setUnsavedChanges(false);
        });

        expect(result.current.state.hasUnsavedChanges).toBe(false);
      });
    });

    describe('RESET_PREFERENCES', () => {
      it('resets state to initial values', () => {
        const { result } = renderHook(() => usePreferences(), { wrapper });

        act(() => {
          result.current.dispatch({
            type: 'SET_PREFERENCES',
            payload: mockUserPreferences,
          });
          result.current.setError('Test error');
          result.current.setLoading(true);
          result.current.setUnsavedChanges(true);
        });

        act(() => {
          result.current.resetPreferences();
        });

        expect(result.current.state).toEqual({
          preferences: null,
          loading: false,
          error: null,
          hasUnsavedChanges: false,
        });
      });
    });
  });

  describe('Complex State Transitions', () => {
    it('handles complete user flow: load -> update -> save -> reset', () => {
      const { result } = renderHook(() => usePreferences(), { wrapper });

      // Initial state
      expect(result.current.state.preferences).toBeNull();

      // Load preferences
      act(() => {
        result.current.setLoading(true);
      });
      expect(result.current.state.loading).toBe(true);

      act(() => {
        result.current.dispatch({
          type: 'SET_PREFERENCES',
          payload: mockUserPreferences,
        });
      });
      expect(result.current.state.preferences).toEqual(mockUserPreferences);
      expect(result.current.state.loading).toBe(false);
      expect(result.current.state.hasUnsavedChanges).toBe(false);

      // Update preferences
      act(() => {
        result.current.updatePreferences({ emailNotifications: false });
      });
      expect(result.current.state.hasUnsavedChanges).toBe(true);

      // Save (simulated)
      act(() => {
        result.current.dispatch({
          type: 'SET_PREFERENCES',
          payload: {
            ...mockUserPreferences,
            emailNotifications: false,
          },
        });
      });
      expect(result.current.state.hasUnsavedChanges).toBe(false);

      // Reset
      act(() => {
        result.current.resetPreferences();
      });
      expect(result.current.state.preferences).toBeNull();
    });

    it('handles error during loading', () => {
      const { result } = renderHook(() => usePreferences(), { wrapper });

      act(() => {
        result.current.setLoading(true);
      });

      act(() => {
        result.current.setError('Network error');
      });

      expect(result.current.state.loading).toBe(false);
      expect(result.current.state.error).toBe('Network error');
      expect(result.current.state.preferences).toBeNull();
    });

    it('handles multiple rapid updates', () => {
      const { result } = renderHook(() => usePreferences(), { wrapper });

      act(() => {
        result.current.dispatch({
          type: 'SET_PREFERENCES',
          payload: mockUserPreferences,
        });
      });

      act(() => {
        result.current.updatePreferences({ emailNotifications: false });
        result.current.updatePreferences({ pushNotifications: true });
        result.current.updatePreferences({ preferredGenre: 'Drama' });
      });

      expect(result.current.state.preferences?.emailNotifications).toBe(false);
      expect(result.current.state.preferences?.pushNotifications).toBe(true);
      expect(result.current.state.preferences?.preferredGenre).toBe('Drama');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty partial updates', () => {
      const { result } = renderHook(() => usePreferences(), { wrapper });

      act(() => {
        result.current.dispatch({
          type: 'SET_PREFERENCES',
          payload: mockUserPreferences,
        });
      });

      act(() => {
        result.current.updatePreferences({});
      });

      expect(result.current.state.preferences).toEqual(mockUserPreferences);
      expect(result.current.state.hasUnsavedChanges).toBe(true);
    });

    it('handles all video quality options', () => {
      const { result } = renderHook(() => usePreferences(), { wrapper });

      const qualityOptions: Array<'auto' | 'low' | 'medium' | 'high' | 'ultra'> = [
        'auto',
        'low',
        'medium',
        'high',
        'ultra',
      ];

      qualityOptions.forEach(quality => {
        act(() => {
          result.current.dispatch({
            type: 'SET_PREFERENCES',
            payload: { ...mockUserPreferences, videoQuality: quality },
          });
        });

        expect(result.current.state.preferences?.videoQuality).toBe(quality);
      });
    });

    it('handles all measurement unit options', () => {
      const { result } = renderHook(() => usePreferences(), { wrapper });

      act(() => {
        result.current.dispatch({
          type: 'SET_PREFERENCES',
          payload: { ...mockUserPreferences, measurementUnit: 'metric' },
        });
      });
      expect(result.current.state.preferences?.measurementUnit).toBe('metric');

      act(() => {
        result.current.dispatch({
          type: 'SET_PREFERENCES',
          payload: { ...mockUserPreferences, measurementUnit: 'imperial' },
        });
      });
      expect(result.current.state.preferences?.measurementUnit).toBe('imperial');
    });

    it('handles minimum valid preferences object', () => {
      const { result } = renderHook(() => usePreferences(), { wrapper });

      const minimalPreferences: UserPreferences = {
        userId: 'user-123',
      };

      act(() => {
        result.current.dispatch({
          type: 'SET_PREFERENCES',
          payload: minimalPreferences,
        });
      });

      expect(result.current.state.preferences).toEqual(minimalPreferences);
      expect(result.current.state.preferences?.emailNotifications).toBeUndefined();
    });

    it('preserves userId when updating other fields', () => {
      const { result } = renderHook(() => usePreferences(), { wrapper });

      act(() => {
        result.current.dispatch({
          type: 'SET_PREFERENCES',
          payload: mockUserPreferences,
        });
      });

      const originalUserId = result.current.state.preferences?.userId;

      act(() => {
        result.current.updatePreferences({
          emailNotifications: false,
          preferredGenre: 'Horror',
        });
      });

      expect(result.current.state.preferences?.userId).toBe(originalUserId);
    });
  });

  describe('Performance', () => {
    it('handles large secondaryRegions array efficiently', () => {
      const { result } = renderHook(() => usePreferences(), { wrapper });

      const largeRegionList = Array.from({ length: 100 }, (_, i) => `REGION-${i}`);

      act(() => {
        result.current.dispatch({
          type: 'SET_PREFERENCES',
          payload: {
            ...mockUserPreferences,
            secondaryRegions: largeRegionList,
          },
        });
      });

      expect(result.current.state.preferences?.secondaryRegions).toHaveLength(100);
    });
  });
});
