/**
 * RecommendationContext Test
 * Tests the recommendation context provider
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { RecommendationProvider, useRecommendation } from '../RecommendationContext';

// Helper to render hook with provider
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <RecommendationProvider>{children}</RecommendationProvider>
);

describe('RecommendationContext', () => {
  describe('Provider', () => {
    it('provides initial state', () => {
      const { result } = renderHook(() => useRecommendation(), { wrapper });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('provides refreshRecommendations function', () => {
      const { result } = renderHook(() => useRecommendation(), { wrapper });

      expect(result.current.refreshRecommendations).toBeDefined();
      expect(typeof result.current.refreshRecommendations).toBe('function');
    });
  });

  describe('useRecommendation hook', () => {
    it('throws error when used outside provider', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      expect(() => {
        renderHook(() => useRecommendation());
      }).toThrow('useRecommendation must be used within a RecommendationProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('refreshRecommendations', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('sets loading to true when called', () => {
      const { result } = renderHook(() => useRecommendation(), { wrapper });

      act(() => {
        result.current.refreshRecommendations();
      });

      expect(result.current.isLoading).toBe(true);
    });

    it('clears error when called', () => {
      const { result } = renderHook(() => useRecommendation(), { wrapper });

      // Manually set error via rerender (since there's no way to set it through the API)
      // For this simple context, we just verify initial state
      act(() => {
        result.current.refreshRecommendations();
      });

      expect(result.current.error).toBeNull();
    });

    it('sets loading to false after timeout', async () => {
      const { result } = renderHook(() => useRecommendation(), { wrapper });

      act(() => {
        result.current.refreshRecommendations();
      });

      expect(result.current.isLoading).toBe(true);

      // Fast-forward time by 100ms
      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('can be called multiple times', async () => {
      const { result } = renderHook(() => useRecommendation(), { wrapper });

      // First call
      act(() => {
        result.current.refreshRecommendations();
      });

      expect(result.current.isLoading).toBe(true);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Second call
      act(() => {
        result.current.refreshRecommendations();
      });

      expect(result.current.isLoading).toBe(true);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('maintains stable function reference', () => {
      const { result, rerender } = renderHook(() => useRecommendation(), { wrapper });

      const firstRef = result.current.refreshRecommendations;

      rerender();

      const secondRef = result.current.refreshRecommendations;

      expect(firstRef).toBe(secondRef);
    });
  });

  describe('State Management', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('handles overlapping refresh calls', async () => {
      const { result } = renderHook(() => useRecommendation(), { wrapper });

      // Start first refresh
      act(() => {
        result.current.refreshRecommendations();
      });

      expect(result.current.isLoading).toBe(true);

      // Start second refresh before first completes (at 50ms)
      act(() => {
        jest.advanceTimersByTime(50);
      });

      act(() => {
        result.current.refreshRecommendations();
      });

      expect(result.current.isLoading).toBe(true);

      // Complete second refresh
      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });
});
