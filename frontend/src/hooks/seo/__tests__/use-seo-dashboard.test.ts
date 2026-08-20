/**
 * useSEODashboard Hook Tests
 * Tests for SEO dashboard state management and data fetching
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { useSEODashboard } from '../use-seo-dashboard';
import { seoApiClient } from '@/lib/seo/api-client';

// Mock the SEO API client
jest.mock('@/lib/seo/api-client', () => ({
  seoApiClient: {
    getDashboardOverview: jest.fn(),
  },
}));

const mockDashboardData = {
  totalPages: 1250,
  activePages: 980,
  recentGeneration: 150,
  systemHealth: 'healthy' as const,
  performance: {
    avgResponseTime: 120,
    uptime: 99.9,
    cacheHitRatio: 0.85,
  },
};

describe('useSEODashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (seoApiClient.getDashboardOverview as jest.Mock).mockResolvedValue(mockDashboardData);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Initial State', () => {
    it('initializes with null stats', () => {
      const { result } = renderHook(() => useSEODashboard());

      expect(result.current.stats).toBeNull();
    });

    it('initializes loading as true', () => {
      const { result } = renderHook(() => useSEODashboard());

      expect(result.current.loading).toBe(true);
    });

    it('initializes error as null', () => {
      const { result } = renderHook(() => useSEODashboard());

      expect(result.current.error).toBeNull();
    });

    it('initializes refreshing as false', () => {
      const { result } = renderHook(() => useSEODashboard());

      expect(result.current.refreshing).toBe(false);
    });
  });

  describe('Data Fetching', () => {
    it('fetches dashboard data on mount', async () => {
      renderHook(() => useSEODashboard());

      await waitFor(() => {
        expect(seoApiClient.getDashboardOverview).toHaveBeenCalled();
      });
    });

    it('sets stats after successful fetch', async () => {
      const { result } = renderHook(() => useSEODashboard());

      await waitFor(() => {
        expect(result.current.stats).toBeTruthy();
      });

      expect(result.current.stats?.totalPages).toBe(1250);
      expect(result.current.stats?.activePages).toBe(980);
    });

    it('sets loading to false after fetch', async () => {
      const { result } = renderHook(() => useSEODashboard());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('includes recent activity in stats', async () => {
      const { result } = renderHook(() => useSEODashboard());

      await waitFor(() => {
        expect(result.current.stats?.recentActivity).toBeDefined();
      });

      expect(result.current.stats?.recentActivity).toHaveLength(3);
      expect(result.current.stats?.recentActivity?.[0].type).toBe('generation');
    });

    it('includes quick actions in stats', async () => {
      const { result } = renderHook(() => useSEODashboard());

      await waitFor(() => {
        expect(result.current.stats?.quickActions).toBeDefined();
      });

      expect(result.current.stats?.quickActions?.pendingReviews).toBe(12);
      expect(result.current.stats?.quickActions?.failedJobs).toBe(3);
    });
  });

  describe('Error Handling', () => {
    it('sets error message on fetch failure', async () => {
      (seoApiClient.getDashboardOverview as jest.Mock).mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(() => useSEODashboard());

      await waitFor(() => {
        expect(result.current.error).toBe('API Error');
      });
    });

    it('sets loading to false after error', async () => {
      (seoApiClient.getDashboardOverview as jest.Mock).mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(() => useSEODashboard());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('handles non-Error thrown values', async () => {
      (seoApiClient.getDashboardOverview as jest.Mock).mockRejectedValue('String error');

      const { result } = renderHook(() => useSEODashboard());

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to load dashboard data');
      });
    });

    it('keeps stats null on error', async () => {
      (seoApiClient.getDashboardOverview as jest.Mock).mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(() => useSEODashboard());

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(result.current.stats).toBeNull();
    });
  });

  describe('Manual Refresh', () => {
    it('provides refresh function', async () => {
      const { result } = renderHook(() => useSEODashboard());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.refresh).toBeInstanceOf(Function);
    });

    it('sets refreshing to true during manual refresh', async () => {
      const { result } = renderHook(() => useSEODashboard());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.refresh();
      });

      expect(result.current.refreshing).toBe(true);
    });

    it('fetches data again on refresh', async () => {
      const { result } = renderHook(() => useSEODashboard());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(seoApiClient.getDashboardOverview).toHaveBeenCalledTimes(1);

      await act(async () => {
        await result.current.refresh();
      });

      expect(seoApiClient.getDashboardOverview).toHaveBeenCalledTimes(2);
    });

    it('sets refreshing to false after refresh completes', async () => {
      const { result } = renderHook(() => useSEODashboard());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.refreshing).toBe(false);
    });

    it('clears previous error on successful refresh', async () => {
      (seoApiClient.getDashboardOverview as jest.Mock)
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce(mockDashboardData);

      const { result } = renderHook(() => useSEODashboard());

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Auto-Refresh', () => {
    it('sets up auto-refresh interval', async () => {
      renderHook(() => useSEODashboard());

      await waitFor(() => {
        expect(seoApiClient.getDashboardOverview).toHaveBeenCalledTimes(1);
      });

      // Fast-forward 30 seconds
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(seoApiClient.getDashboardOverview).toHaveBeenCalledTimes(2);
      });
    });

    it('auto-refreshes every 30 seconds', async () => {
      renderHook(() => useSEODashboard());

      await waitFor(() => {
        expect(seoApiClient.getDashboardOverview).toHaveBeenCalledTimes(1);
      });

      // Fast-forward 90 seconds (3 intervals)
      act(() => {
        jest.advanceTimersByTime(90000);
      });

      await waitFor(() => {
        expect(seoApiClient.getDashboardOverview).toHaveBeenCalledTimes(4); // 1 initial + 3 intervals
      });
    });

    it('cleans up interval on unmount', async () => {
      const { unmount } = renderHook(() => useSEODashboard());

      await waitFor(() => {
        expect(seoApiClient.getDashboardOverview).toHaveBeenCalledTimes(1);
      });

      unmount();

      // Fast-forward time - should not trigger more calls
      act(() => {
        jest.advanceTimersByTime(60000);
      });

      // Should still be 1 call (no more after unmount)
      expect(seoApiClient.getDashboardOverview).toHaveBeenCalledTimes(1);
    });
  });

  describe('Dashboard Stats Structure', () => {
    it('includes page count metrics', async () => {
      const { result } = renderHook(() => useSEODashboard());

      await waitFor(() => {
        expect(result.current.stats).toBeTruthy();
      });

      expect(result.current.stats).toMatchObject({
        totalPages: expect.any(Number),
        activePages: expect.any(Number),
        recentGeneration: expect.any(Number),
      });
    });

    it('includes performance metrics', async () => {
      const { result } = renderHook(() => useSEODashboard());

      await waitFor(() => {
        expect(result.current.stats).toBeTruthy();
      });

      expect(result.current.stats).toMatchObject({
        performance: {
          avgResponseTime: expect.any(Number),
          uptime: expect.any(Number),
          cacheHitRatio: expect.any(Number),
        },
      });
    });

    it('includes system health status', async () => {
      const { result } = renderHook(() => useSEODashboard());

      await waitFor(() => {
        expect(result.current.stats?.systemHealth).toBeDefined();
      });

      expect(result.current.stats?.systemHealth).toMatch(/^(healthy|warning|critical)$/);
    });

    it('includes recent generation count', async () => {
      const { result } = renderHook(() => useSEODashboard());

      await waitFor(() => {
        expect(result.current.stats?.recentGeneration).toBeDefined();
      });

      expect(typeof result.current.stats?.recentGeneration).toBe('number');
    });

    it('formats recent activity with timestamps', async () => {
      const { result } = renderHook(() => useSEODashboard());

      await waitFor(() => {
        expect(result.current.stats?.recentActivity).toBeDefined();
      });

      result.current.stats?.recentActivity?.forEach(activity => {
        expect(activity).toMatchObject({
          type: expect.any(String),
          message: expect.any(String),
          timestamp: expect.any(String),
        });
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles empty dashboard data', async () => {
      (seoApiClient.getDashboardOverview as jest.Mock).mockResolvedValue({
        totalPages: 0,
        activePages: 0,
        recentGeneration: 0,
        systemHealth: 'healthy',
        performance: {
          avgResponseTime: 0,
          uptime: 0,
          cacheHitRatio: 0,
        },
      });

      const { result } = renderHook(() => useSEODashboard());

      await waitFor(() => {
        expect(result.current.stats).toBeTruthy();
      });

      expect(result.current.stats?.totalPages).toBe(0);
    });

    it('handles multiple rapid refreshes', async () => {
      const { result } = renderHook(() => useSEODashboard());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await Promise.all([
          result.current.refresh(),
          result.current.refresh(),
          result.current.refresh(),
        ]);
      });

      // Should complete without errors
      expect(result.current.error).toBeNull();
    });

    it('maintains state during refresh', async () => {
      const { result } = renderHook(() => useSEODashboard());

      await waitFor(() => {
        expect(result.current.stats).toBeTruthy();
      });

      const _previousStats = result.current.stats;

      act(() => {
        result.current.refresh();
      });

      // Stats should still be accessible during refresh
      expect(result.current.stats).toBeTruthy();
    });
  });
});
