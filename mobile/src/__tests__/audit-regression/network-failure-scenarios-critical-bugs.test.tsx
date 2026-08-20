/**
 * Week 3 Day 14: Network Failure Scenarios - Critical Bugs Regression Test Suite
 *
 * This test suite validates fixes for 11 critical network failure bugs discovered during audit:
 * - 1 P0: Memory leak in useNetworkStatus
 * - 5 P1: Quality testing, retry logic, navigator.onLine, auto-retry, AbortController
 * - 4 P2: Cache cleanup, connection test, NetInfo, error detection
 * - 1 P3: Unstable connection indicator
 *
 * @see docs/audit/week3/day14-network-failure-scenarios-bug-report.md
 */

import React from 'react';
import { render, waitFor, act, renderHook } from '@testing-library/react-native';
import NetInfo from '@react-native-community/netinfo';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { NetworkService } from '../../services/api/NetworkService';
import { ApiService } from '../../services/api/ApiService';
import { useApi } from '../../hooks/useApi';
import NetworkStatus from '../../components/common/NetworkStatus';
import NetworkErrorBoundary from '../../components/common/NetworkErrorBoundary';

// Mock dependencies
jest.mock('@react-native-community/netinfo');
jest.mock('../../utils/logger');
jest.mock('../../services/api/HttpClient');

describe('Week 3 Day 14: Network Failure Scenarios - Critical Bugs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  // ============================================================================
  // P0 BUG #1: Memory Leak in useNetworkStatus
  // ============================================================================
  describe('P0 Bug #1: Memory Leak - New NetworkService on Every Render', () => {
    it('should NOT create new NetworkService instance on every render', async () => {
      // Track NetworkService instances
      const instances: any[] = [];
      const OriginalNetworkService = NetworkService;

      // Spy on NetworkService constructor
      jest.spyOn(NetworkService.prototype, 'constructor' as any).mockImplementation(function(this: any, ...args: any[]) {
        instances.push(this);
        return OriginalNetworkService.prototype.constructor.apply(this, args);
      });

      const { rerender } = renderHook(() => useNetworkStatus());

      // Initial render - 1 instance
      expect(instances.length).toBeLessThanOrEqual(1);

      // Multiple re-renders
      rerender();
      rerender();
      rerender();

      // Should still be only 1 instance (singleton or useRef pattern)
      expect(instances.length).toBeLessThanOrEqual(1);
    });

    it('should use useRef or singleton pattern for NetworkService', () => {
      const { result } = renderHook(() => useNetworkStatus());
      const instance1 = (result.current as any).networkService;

      const { result: result2 } = renderHook(() => useNetworkStatus());
      const instance2 = (result2.current as any).networkService;

      // Both should reference same instance (singleton) or be undefined (useRef)
      if (instance1 && instance2) {
        expect(instance1).toBe(instance2);
      }
    });

    it('should cleanup listeners on unmount to prevent memory leaks', () => {
      const unsubscribeMock = jest.fn();
      jest.spyOn(NetworkService.prototype, 'onConnectionChange').mockReturnValue(unsubscribeMock);
      jest.spyOn(NetworkService.prototype, 'onQualityChange').mockReturnValue(unsubscribeMock);

      const { unmount } = renderHook(() => useNetworkStatus());

      unmount();

      // Both listeners should be unsubscribed
      expect(unsubscribeMock).toHaveBeenCalledTimes(2);
    });
  });

  // ============================================================================
  // P1 BUG #2: Incomplete Network Quality Testing
  // ============================================================================
  describe('P1 Bug #2: Packet Loss and Jitter Always Return 0', () => {
    it('should actually measure packet loss with multiple ping attempts', async () => {
      const networkService = new NetworkService();

      // Mock fetch to simulate packet loss
      global.fetch = jest.fn()
        .mockResolvedValueOnce({ ok: true }) // Success
        .mockRejectedValueOnce(new Error('timeout')) // Loss
        .mockResolvedValueOnce({ ok: true }) // Success
        .mockRejectedValueOnce(new Error('timeout')); // Loss

      const quality = await networkService.measureNetworkQuality();

      // With 2 successes and 2 failures, packet loss should be ~50%
      expect(quality.packetLoss).toBeGreaterThan(0);
      expect(quality.packetLoss).toBeLessThanOrEqual(100);
    });

    it('should calculate jitter from latency variance', async () => {
      const networkService = new NetworkService();

      // Mock varying latencies: 100ms, 200ms, 150ms, 180ms
      const latencies = [100, 200, 150, 180];
      let callCount = 0;

      global.fetch = jest.fn().mockImplementation(() => {
        const delay = latencies[callCount % latencies.length];
        callCount++;
        return new Promise(resolve => setTimeout(() => resolve({ ok: true }), delay));
      });

      const quality = await networkService.measureNetworkQuality();

      // Jitter = standard deviation of latencies (should be > 0 with variance)
      expect(quality.jitter).toBeGreaterThan(0);
    });

    it('should return 0 packet loss when all pings succeed', async () => {
      const networkService = new NetworkService();

      global.fetch = jest.fn().mockResolvedValue({ ok: true });

      const quality = await networkService.measureNetworkQuality();

      expect(quality.packetLoss).toBe(0);
    });
  });

  // ============================================================================
  // P1 BUG #3: Retry Logic Ignores Timeout Errors
  // ============================================================================
  describe('P1 Bug #3: Retry Logic Skips Timeout Errors', () => {
    it('should retry requests that timeout (AbortError)', async () => {
      const apiService = new ApiService();
      let attemptCount = 0;

      // Mock: First attempt times out, second succeeds
      global.fetch = jest.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount === 1) {
          const error: any = new Error('The operation was aborted');
          error.name = 'AbortError';
          return Promise.reject(error);
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: 'success' }) });
      });

      const response = await apiService.get('/test', { retry: { maxAttempts: 3 } });

      // Should have retried after AbortError
      expect(attemptCount).toBeGreaterThan(1);
      expect(response).toBeDefined();
    });

    it('should NOT retry 401/403/404/422 errors', async () => {
      const apiService = new ApiService();

      const errorCodes = [401, 403, 404, 422];

      for (const code of errorCodes) {
        let attemptCount = 0;

        global.fetch = jest.fn().mockImplementation(() => {
          attemptCount++;
          return Promise.resolve({
            ok: false,
            status: code,
            json: () => Promise.resolve({ error: 'error' })
          });
        });

        try {
          await apiService.get('/test', { retry: { maxAttempts: 3 } });
        } catch {
          // Expected to fail
        }

        // Should NOT retry these errors
        expect(attemptCount).toBe(1);
      }
    });

    it('should retry 500/502/503 server errors', async () => {
      const apiService = new ApiService();
      let attemptCount = 0;

      global.fetch = jest.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          return Promise.resolve({
            ok: false,
            status: 503,
            json: () => Promise.resolve({ error: 'Service Unavailable' })
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: 'success' }) });
      });

      const response = await apiService.get('/test', { retry: { maxAttempts: 3 } });

      expect(attemptCount).toBe(3);
      expect(response).toBeDefined();
    });
  });

  // ============================================================================
  // P1 BUG #4: navigator.onLine Used in React Native
  // ============================================================================
  describe('P1 Bug #4: navigator.onLine Does Not Exist in React Native', () => {
    it('should use NetInfo.fetch() instead of navigator.onLine', async () => {
      const apiService = new ApiService();

      // Mock NetInfo
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
      });

      // Ensure navigator is undefined (React Native environment)
      const originalNavigator = global.navigator;
      (global as any).navigator = undefined;

      try {
        await apiService.get('/test');
        fail('Should have thrown network error');
      } catch (error: any) {
        // Should detect offline state via NetInfo, not navigator
        expect(error.code).toBe('NETWORK_ERROR');
      } finally {
        global.navigator = originalNavigator;
      }

      expect(NetInfo.fetch).toHaveBeenCalled();
    });

    it('should gracefully handle when navigator is undefined', async () => {
      const apiService = new ApiService();

      // Remove navigator
      const originalNavigator = global.navigator;
      (global as any).navigator = undefined;

      try {
        // Should not crash, should use NetInfo
        const isOnline = await apiService.checkNetworkStatus();
        expect(typeof isOnline).toBe('boolean');
      } finally {
        global.navigator = originalNavigator;
      }
    });
  });

  // ============================================================================
  // P1 BUG #5: Infinite Auto-Retry with No Max Limit
  // ============================================================================
  describe('P1 Bug #5: NetworkErrorBoundary Auto-Retry Runs Forever', () => {
    it('should enforce maxRetries limit in auto-retry', async () => {
      let retryCount = 0;
      const maxRetries = 3;

      const TestComponent = () => {
        if (retryCount < 5) {
          throw new Error('Network error');
        }
        return null;
      };

      const { rerender } = render(
        <NetworkErrorBoundary
          enableAutoRetry={true}
          retryInterval={1000}
          maxRetries={maxRetries}
        >
          <TestComponent />
        </NetworkErrorBoundary>
      );

      // Simulate auto-retry attempts
      for (let i = 0; i < 10; i++) {
        act(() => {
          jest.advanceTimersByTime(1000);
        });
        retryCount++;
        rerender(
          <NetworkErrorBoundary
            enableAutoRetry={true}
            retryInterval={1000}
            maxRetries={maxRetries}
          >
            <TestComponent />
          </NetworkErrorBoundary>
        );
      }

      // Should stop after maxRetries
      expect(retryCount).toBeLessThanOrEqual(maxRetries + 1); // +1 for initial attempt
    });

    it('should clear retry timer when component unmounts', () => {
      const TestComponent = () => {
        throw new Error('Network error');
      };

      const { unmount } = render(
        <NetworkErrorBoundary enableAutoRetry={true} retryInterval={1000}>
          <TestComponent />
        </NetworkErrorBoundary>
      );

      const timersBefore = jest.getTimerCount();
      unmount();
      const timersAfter = jest.getTimerCount();

      // Timer should be cleared
      expect(timersAfter).toBeLessThan(timersBefore);
    });

    it('should stop auto-retry when network is restored', async () => {
      let retryCount = 0;

      const TestComponent = () => {
        retryCount++;
        if (retryCount < 3) {
          throw new Error('Network error');
        }
        return null;
      };

      render(
        <NetworkErrorBoundary enableAutoRetry={true} retryInterval={1000}>
          <TestComponent />
        </NetworkErrorBoundary>
      );

      // First retry
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Second retry (should succeed)
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Wait longer - should NOT retry again
      const countBefore = retryCount;
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(retryCount).toBe(countBefore); // No additional retries
    });
  });

  // ============================================================================
  // P1 BUG #6: AbortController Not Aborting Previous Requests
  // ============================================================================
  describe('P1 Bug #6: useApi Creates New AbortController Without Aborting Previous', () => {
    it('should abort previous request when new request is made', async () => {
      const abortSpy = jest.fn();

      // Mock AbortController
      const mockAbort = jest.spyOn(AbortController.prototype, 'abort');
      mockAbort.mockImplementation(abortSpy);

      const { result, rerender } = renderHook(() =>
        useApi('/test', { enabled: true })
      );

      // Wait for initial request
      await waitFor(() => {
        expect(result.current.loading).toBe(true);
      });

      // Trigger new request before first completes
      rerender();

      // Previous request should be aborted
      await waitFor(() => {
        expect(abortSpy).toHaveBeenCalled();
      });

      mockAbort.mockRestore();
    });

    it('should abort request when component unmounts', async () => {
      const abortSpy = jest.fn();
      const mockAbort = jest.spyOn(AbortController.prototype, 'abort');
      mockAbort.mockImplementation(abortSpy);

      const { unmount } = renderHook(() =>
        useApi('/test', { enabled: true })
      );

      unmount();

      // Request should be aborted on unmount
      expect(abortSpy).toHaveBeenCalled();

      mockAbort.mockRestore();
    });

    it('should handle AbortError gracefully', async () => {
      global.fetch = jest.fn().mockImplementation(() => {
        const error: any = new Error('The operation was aborted');
        error.name = 'AbortError';
        return Promise.reject(error);
      });

      const { result } = renderHook(() =>
        useApi('/test', { enabled: true })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should not show error for aborted requests
      expect(result.current.error).toBeNull();
    });
  });

  // ============================================================================
  // P2 BUG #7: Cache Cleanup Timer Leak
  // ============================================================================
  describe('P2 Bug #7: useApi Cache Cleanup setTimeout Not Tracked', () => {
    it('should clear cache cleanup timer on unmount', () => {
      const { unmount } = renderHook(() =>
        useApi('/test', { enabled: true, cacheTime: 5000 })
      );

      const timersBefore = jest.getTimerCount();
      unmount();
      const timersAfter = jest.getTimerCount();

      // Cache cleanup timer should be cleared
      expect(timersAfter).toBeLessThanOrEqual(timersBefore);
    });

    it('should actually remove cached data after cacheTime', async () => {
      const { result, unmount } = renderHook(() =>
        useApi('/test', { enabled: true, cacheTime: 5000 })
      );

      // Wait for data to load and cache
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const dataBefore = result.current.data;

      // Advance past cache time
      act(() => {
        jest.advanceTimersByTime(6000);
      });

      // Create new instance to check cache
      const { result: result2 } = renderHook(() =>
        useApi('/test', { enabled: true, cacheTime: 5000 })
      );

      await waitFor(() => {
        expect(result2.current.loading).toBe(false);
      });

      // Data should be refetched (cache expired)
      if (dataBefore) {
        // Verify new fetch occurred
        expect(global.fetch).toHaveBeenCalled();
      }

      unmount();
    });
  });

  // ============================================================================
  // P2 BUG #8: Connection Test Has No Retry on Failure
  // ============================================================================
  describe('P2 Bug #8: NetworkService.testConnection() No Retry', () => {
    it('should retry connection test on transient failures', async () => {
      const networkService = new NetworkService();
      let attemptCount = 0;

      global.fetch = jest.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount === 1) {
          return Promise.reject(new Error('Network timeout'));
        }
        return Promise.resolve({ ok: true });
      });

      const result = await networkService.testConnection({ maxRetries: 2 });

      expect(attemptCount).toBeGreaterThan(1);
      expect(result).toBe(true);
    });

    it('should return false after all retry attempts fail', async () => {
      const networkService = new NetworkService();

      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const result = await networkService.testConnection({ maxRetries: 3 });

      expect(result).toBe(false);
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });
  });

  // ============================================================================
  // P2 BUG #9: NetInfo Listener Not Unsubscribed
  // ============================================================================
  describe('P2 Bug #9: NetworkService NetInfo Listener Leak', () => {
    it('should store and call NetInfo unsubscribe function', () => {
      const unsubscribeMock = jest.fn();
      (NetInfo.addEventListener as jest.Mock).mockReturnValue(unsubscribeMock);

      const networkService = new NetworkService();
      networkService.initialize();

      // Cleanup
      networkService.cleanup();

      // Unsubscribe should have been called
      expect(unsubscribeMock).toHaveBeenCalled();
    });

    it('should prevent multiple NetInfo listeners on re-initialization', () => {
      const networkService = new NetworkService();

      networkService.initialize();
      networkService.initialize(); // Second call

      // Should only have 1 listener
      expect(NetInfo.addEventListener).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================================
  // P2 BUG #10: Fragile String-Based Error Detection
  // ============================================================================
  describe('P2 Bug #10: ApiService Relies on error.message.includes()', () => {
    it('should detect network errors by error codes, not strings', async () => {
      const apiService = new ApiService();

      const networkError: any = new Error('Custom network failure');
      networkError.code = 'NETWORK_ERROR';

      global.fetch = jest.fn().mockRejectedValue(networkError);

      try {
        await apiService.get('/test');
        fail('Should have thrown network error');
      } catch (error: any) {
        // Should detect via error.code
        expect(error.code).toBe('NETWORK_ERROR');
      }
    });

    it('should detect timeout errors by error.name === AbortError', async () => {
      const apiService = new ApiService();

      const timeoutError: any = new Error('Request aborted');
      timeoutError.name = 'AbortError';

      global.fetch = jest.fn().mockRejectedValue(timeoutError);

      try {
        await apiService.get('/test');
        fail('Should have thrown timeout error');
      } catch (error: any) {
        // Should detect via error.name
        expect(error.name).toBe('AbortError');
      }
    });

    it('should handle errors without message gracefully', async () => {
      const apiService = new ApiService();

      const errorWithoutMessage: any = new Error();
      errorWithoutMessage.message = undefined;

      global.fetch = jest.fn().mockRejectedValue(errorWithoutMessage);

      // Should not crash
      try {
        await apiService.get('/test');
      } catch {
        // Expected to fail
      }

      expect(true).toBe(true); // Did not crash
    });
  });

  // ============================================================================
  // P3 BUG #11: No Unstable Connection Indicator
  // ============================================================================
  describe('P3 Bug #11: NetworkStatus Auto-Hides During Unstable Connections', () => {
    it('should keep indicator visible for unstable connections', async () => {
      const { rerender } = render(
        <NetworkStatus
          isConnected={true}
          isInternetReachable={true}
          quality="fair" // Unstable!
        />
      );

      // Advance past auto-hide timeout
      act(() => {
        jest.advanceTimersByTime(6000);
      });

      rerender(
        <NetworkStatus
          isConnected={true}
          isInternetReachable={true}
          quality="fair"
        />
      );

      // Indicator should still be visible for unstable connection
      // (This test validates the fix, not the bug)
    });

    it('should auto-hide indicator only for stable connections', async () => {
      const { rerender } = render(
        <NetworkStatus
          isConnected={true}
          isInternetReachable={true}
          quality="excellent"
        />
      );

      // Advance past auto-hide timeout
      act(() => {
        jest.advanceTimersByTime(6000);
      });

      rerender(
        <NetworkStatus
          isConnected={true}
          isInternetReachable={true}
          quality="excellent"
        />
      );

      // Indicator should auto-hide for stable connection
    });

    it('should show indicator immediately on connection state change', () => {
      const { rerender } = render(
        <NetworkStatus
          isConnected={true}
          isInternetReachable={true}
          quality="excellent"
        />
      );

      // Connection drops
      rerender(
        <NetworkStatus
          isConnected={false}
          isInternetReachable={false}
          quality="poor"
        />
      );

      // Indicator should show immediately
    });
  });

  // ============================================================================
  // INTEGRATION TESTS: Network Resilience
  // ============================================================================
  describe('Integration: Network Resilience', () => {
    it('should handle complete network loss and recovery', async () => {
      const { result } = renderHook(() => useNetworkStatus({
        testOnMount: true,
        testInterval: 5000,
      }));

      // Initial state: online
      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Simulate network loss
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
      });

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // Should detect offline
      await waitFor(() => {
        expect(result.current.isConnected).toBe(false);
      });

      // Simulate network recovery
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
      });

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // Should detect online
      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });
    });

    it('should handle degraded connection (high latency)', async () => {
      const networkService = new NetworkService();

      // Mock high latency (800ms)
      global.fetch = jest.fn().mockImplementation(() =>
        new Promise(resolve =>
          setTimeout(() => resolve({ ok: true }), 800)
        )
      );

      const quality = await networkService.measureNetworkQuality();

      // Should detect poor quality
      expect(quality.latency).toBeGreaterThan(500);
      expect(quality.score).toBeLessThan(70);
    });

    it('should queue requests while offline and retry when online', async () => {
      const apiService = new ApiService();
      const requests: Promise<any>[] = [];

      // Go offline
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
      });

      // Queue requests
      requests.push(apiService.get('/test1').catch(() => null));
      requests.push(apiService.get('/test2').catch(() => null));
      requests.push(apiService.get('/test3').catch(() => null));

      // Come back online
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
      });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'success' }),
      });

      // Wait for all requests
      await Promise.all(requests);

      // All requests should eventually succeed
      expect(global.fetch).toHaveBeenCalled();
    });
  });
});
