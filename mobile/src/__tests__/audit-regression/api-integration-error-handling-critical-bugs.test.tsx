/**
 * API Integration & Error Handling - Critical Bugs Regression Test Suite
 *
 * Week 2, Day 10: API Integration & Error Handling Audit
 * Date: 2025-12-16
 *
 * This test suite validates fixes for 8 critical bugs found during API error handling audit.
 *
 * Bug Summary (8 Total):
 * - P0: 0 bugs
 * - P1: 5 bugs (Rate limit retry, timeout cleanup, AbortError retry, NetInfo leak, HttpClient retry)
 * - P2: 3 bugs (404 retry, timeout leak, Retry-After header)
 *
 * CRITICAL: These tests must NEVER be disabled or removed.
 * If a test fails, the underlying bug has regressed and MUST be fixed immediately.
 */

import { ApiService } from '../../services/api/ApiService';
import { HttpClient } from '../../services/api/HttpClient';
import NetInfo from '@react-native-community/netinfo';

// Mock dependencies
jest.mock('@react-native-community/netinfo');
jest.mock('../../utils/logger');
jest.mock('../../services/api/NetworkService');
jest.mock('../../services/api/CacheService');
jest.mock('../../services/api/OfflineService');

describe('API Integration & Error Handling - Critical Bugs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  // ===================================================================
  // BUG #1 (P1): Rate limit (429) errors NOT retried with backoff
  // ===================================================================
  describe('BUG #1: Rate limit retry with exponential backoff', () => {
    it('should retry on 429 rate limit errors', async () => {
      const apiService = new ApiService('https://api.test.com');

      // Mock fetch to return 429 on first call, 200 on retry
      let callCount = 0;
      global.fetch = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: false,
            status: 429,
            headers: new Headers({
              'Retry-After': '2'
            }),
            json: () => Promise.resolve({ error: 'Rate limit exceeded' })
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: 'success' })
        } as Response);
      });

      // Execute request
      const requestPromise = (apiService as any).request('GET', '/test', {});

      // Fast-forward through retry delay
      jest.advanceTimersByTime(2000);

      const result = await requestPromise;

      // Verify retry happened
      expect(callCount).toBe(2);
      expect(result.data).toBe('success');
    });

    it('should use Retry-After header for backoff timing', async () => {
      const apiService = new ApiService('https://api.test.com');

      let callCount = 0;
      global.fetch = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: false,
            status: 429,
            headers: new Headers({
              'Retry-After': '5'  // Server says wait 5 seconds
            }),
            json: () => Promise.resolve({ error: 'Rate limited' })
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: 'success' })
        } as Response);
      });

      const requestPromise = (apiService as any).request('GET', '/test', {});

      // Should wait 5 seconds as specified by Retry-After
      jest.advanceTimersByTime(5000);

      await requestPromise;

      expect(callCount).toBe(2);
    });

    it('should use exponential backoff if no Retry-After header', async () => {
      const apiService = new ApiService('https://api.test.com');

      let callCount = 0;
      global.fetch = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return Promise.resolve({
            ok: false,
            status: 429,
            headers: new Headers(),  // No Retry-After
            json: () => Promise.resolve({ error: 'Rate limited' })
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: 'success' })
        } as Response);
      });

      const requestPromise = (apiService as any).request('GET', '/test', {});

      // Exponential backoff: 1s, 2s
      jest.advanceTimersByTime(1000);  // First retry
      jest.advanceTimersByTime(2000);  // Second retry

      await requestPromise;

      expect(callCount).toBe(3);
    });
  });

  // ===================================================================
  // BUG #2 (P1): Timeout cleanup not in retry loop (resource leak)
  // ===================================================================
  describe('BUG #2: Timeout cleanup in all retry paths', () => {
    it('should clear timeout when request succeeds on first try', async () => {
      const apiService = new ApiService('https://api.test.com');

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: 'success' })
      } as Response);

      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      await (apiService as any).request('GET', '/test', {});

      // Verify timeout was cleared
      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it('should clear timeout when retry loop breaks early (401)', async () => {
      const apiService = new ApiService('https://api.test.com');

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Unauthorized' })
      } as Response);

      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      try {
        await (apiService as any).request('GET', '/test', {});
      } catch {
        // Expected to throw
      }

      // CRITICAL: Timeout must be cleared even when breaking early
      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it('should clear timeout when retry loop breaks early (403)', async () => {
      const apiService = new ApiService('https://api.test.com');

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: () => Promise.resolve({ error: 'Forbidden' })
      } as Response);

      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      try {
        await (apiService as any).request('GET', '/test', {});
      } catch {
        // Expected to throw
      }

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it('should clear timeout after all retries exhausted', async () => {
      const apiService = new ApiService('https://api.test.com');

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Server error' })
      } as Response);

      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      try {
        const requestPromise = (apiService as any).request('GET', '/test', {});

        // Fast-forward through all retries
        jest.advanceTimersByTime(20000);

        await requestPromise;
      } catch {
        // Expected to throw
      }

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it('should not leak timers when multiple requests fail', async () => {
      const apiService = new ApiService('https://api.test.com');

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Unauthorized' })
      } as Response);

      const initialTimerCount = jest.getTimerCount();

      // Make 5 requests that fail immediately
      for (let i = 0; i < 5; i++) {
        try {
          await (apiService as any).request('GET', `/test${i}`, {});
        } catch {
          // Expected
        }
      }

      const finalTimerCount = jest.getTimerCount();

      // CRITICAL: Timer count should not increase (all cleaned up)
      expect(finalTimerCount).toBeLessThanOrEqual(initialTimerCount);
    });
  });

  // ===================================================================
  // BUG #3 (P1): AbortError prevents timeout retry
  // ===================================================================
  describe('BUG #3: Retry on timeout AbortError', () => {
    it('should retry when request times out (AbortError)', async () => {
      const apiService = new ApiService('https://api.test.com');

      let callCount = 0;
      global.fetch = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Simulate timeout abort
          const error = new Error('The operation was aborted') as any;
          error.name = 'AbortError';
          return Promise.reject(error);
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: 'success' })
        } as Response);
      });

      const requestPromise = (apiService as any).request('GET', '/test', {});

      // Fast-forward through retry delay
      jest.advanceTimersByTime(2000);

      const result = await requestPromise;

      // CRITICAL: Should retry after timeout, not fail immediately
      expect(callCount).toBe(2);
      expect(result.data).toBe('success');
    });

    it('should differentiate timeout abort from user cancellation', async () => {
      const apiService = new ApiService('https://api.test.com');

      const userController = new AbortController();

      global.fetch = jest.fn().mockImplementation(() => {
        const error = new Error('User cancelled') as any;
        error.name = 'AbortError';
        return Promise.reject(error);
      });

      try {
        await (apiService as any).request('GET', '/test', {
          signal: userController.signal
        });
        fail('Should have thrown');
      } catch (error: any) {
        // User cancellation should NOT retry
        expect(error.name).toBe('AbortError');
      }

      // Should only call fetch once (no retry)
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  // ===================================================================
  // BUG #4 (P2): 404 errors not retried for transient network issues
  // ===================================================================
  describe('BUG #4: Retry 404 for network issues', () => {
    it('should retry 404 when likely caused by network instability', async () => {
      const apiService = new ApiService('https://api.test.com');

      let callCount = 0;
      global.fetch = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call: 404 (might be DNS/network issue)
          return Promise.resolve({
            ok: false,
            status: 404,
            json: () => Promise.resolve({ error: 'Not found' })
          } as Response);
        }
        // Retry succeeds
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: 'success' })
        } as Response);
      });

      const requestPromise = (apiService as any).request('GET', '/test', {});

      jest.advanceTimersByTime(2000);

      const result = await requestPromise;

      // Should have retried
      expect(callCount).toBe(2);
      expect(result.data).toBe('success');
    });

    it('should stop retrying 404 after max attempts', async () => {
      const apiService = new ApiService('https://api.test.com');

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Not found' })
      } as Response);

      try {
        const requestPromise = (apiService as any).request('GET', '/test', {});

        // Fast-forward through all retries
        jest.advanceTimersByTime(20000);

        await requestPromise;
        fail('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(404);
      }

      // Should have tried initial + retries
      expect(global.fetch).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
    });
  });

  // ===================================================================
  // BUG #5 (P1): NetInfo listener cleanup not tracked (memory leak)
  // ===================================================================
  describe('BUG #5: NetInfo listener cleanup', () => {
    it('should store NetInfo unsubscribe function', () => {
      const mockUnsubscribe = jest.fn();
      (NetInfo.addEventListener as jest.Mock).mockReturnValue(mockUnsubscribe);

      const httpClient = new HttpClient('https://api.test.com');

      // Access private method for testing
      (httpClient as any).setupNetworkMonitoring();

      // CRITICAL: Should store unsubscribe function
      expect((httpClient as any).networkUnsubscribe).toBeDefined();
      expect((httpClient as any).networkUnsubscribe).toBe(mockUnsubscribe);
    });

    it('should cleanup NetInfo listener on destroy', () => {
      const mockUnsubscribe = jest.fn();
      (NetInfo.addEventListener as jest.Mock).mockReturnValue(mockUnsubscribe);

      const httpClient = new HttpClient('https://api.test.com');
      (httpClient as any).setupNetworkMonitoring();

      // Destroy client
      (httpClient as any).destroy?.();

      // CRITICAL: Unsubscribe must be called
      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('should not leak listeners when creating multiple clients', () => {
      const mockUnsubscribe = jest.fn();
      (NetInfo.addEventListener as jest.Mock).mockReturnValue(mockUnsubscribe);

      // Create and destroy multiple clients
      for (let i = 0; i < 5; i++) {
        const client = new HttpClient('https://api.test.com');
        (client as any).setupNetworkMonitoring();
        (client as any).destroy?.();
      }

      // All listeners should be cleaned up
      expect(mockUnsubscribe).toHaveBeenCalledTimes(5);
    });
  });

  // ===================================================================
  // BUG #6 (P1): Rate limit (429) not in retryable codes (HttpClient)
  // ===================================================================
  describe('BUG #6: HttpClient rate limit retry', () => {
    it('should include RATE_LIMIT in retryable error codes', () => {
      const httpClient = new HttpClient('https://api.test.com');

      // Check private method or constant
      const retryableCodes = (httpClient as any).retryableCodes || [];

      // CRITICAL: RATE_LIMIT must be retryable
      expect(retryableCodes).toContain('RATE_LIMIT');
    });

    it('should retry on RATE_LIMIT errors', async () => {
      const httpClient = new HttpClient('https://api.test.com');

      let callCount = 0;
      (httpClient as any).instance = {
        request: jest.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            const error = new Error('Rate limited') as any;
            error.code = 'RATE_LIMIT';
            error.status = 429;
            return Promise.reject(error);
          }
          return Promise.resolve({ data: { data: 'success' } });
        })
      };

      const result = await httpClient.get('/test');

      expect(callCount).toBeGreaterThan(1);
      expect(result.data).toBe('success');
    });
  });

  // ===================================================================
  // BUG #7 (P2): Timeout promise memory leak in token refresh
  // ===================================================================
  describe('BUG #7: Token refresh timeout cleanup', () => {
    it('should clear timeout when token refresh succeeds', async () => {
      const httpClient = new HttpClient('https://api.test.com');

      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      // Mock successful token refresh
      (httpClient as any).instance = {
        post: jest.fn().mockResolvedValue({
          data: { accessToken: 'new-token', refreshToken: 'new-refresh' }
        })
      };

      await (httpClient as any).refreshAccessToken();

      // CRITICAL: Timeout must be cleared
      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it('should clear timeout when token refresh fails', async () => {
      const httpClient = new HttpClient('https://api.test.com');

      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      // Mock failed token refresh
      (httpClient as any).instance = {
        post: jest.fn().mockRejectedValue(new Error('Refresh failed'))
      };

      try {
        await (httpClient as any).refreshAccessToken();
      } catch {
        // Expected to throw
      }

      // CRITICAL: Timeout must be cleared even on failure
      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it('should not leak timers when refreshing multiple times', async () => {
      const httpClient = new HttpClient('https://api.test.com');

      (httpClient as any).instance = {
        post: jest.fn().mockResolvedValue({
          data: { accessToken: 'new-token', refreshToken: 'new-refresh' }
        })
      };

      const initialTimerCount = jest.getTimerCount();

      // Refresh 5 times
      for (let i = 0; i < 5; i++) {
        await (httpClient as any).refreshAccessToken();
      }

      const finalTimerCount = jest.getTimerCount();

      // Timer count should not increase
      expect(finalTimerCount).toBeLessThanOrEqual(initialTimerCount);
    });
  });

  // ===================================================================
  // BUG #8 (P2): Retry-After header ignored for 429 responses
  // ===================================================================
  describe('BUG #8: Retry-After header support', () => {
    it('should parse Retry-After header (seconds)', async () => {
      const apiService = new ApiService('https://api.test.com');

      let callCount = 0;
      global.fetch = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: false,
            status: 429,
            headers: new Headers({
              'Retry-After': '10'  // 10 seconds
            }),
            json: () => Promise.resolve({ error: 'Rate limited' })
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: 'success' })
        } as Response);
      });

      const requestPromise = (apiService as any).request('GET', '/test', {});

      // Should respect 10 second delay
      jest.advanceTimersByTime(10000);

      await requestPromise;

      expect(callCount).toBe(2);
    });

    it('should parse Retry-After header (HTTP date)', async () => {
      const apiService = new ApiService('https://api.test.com');

      const futureDate = new Date(Date.now() + 5000); // 5 seconds from now

      let callCount = 0;
      global.fetch = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: false,
            status: 429,
            headers: new Headers({
              'Retry-After': futureDate.toUTCString()
            }),
            json: () => Promise.resolve({ error: 'Rate limited' })
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: 'success' })
        } as Response);
      });

      const requestPromise = (apiService as any).request('GET', '/test', {});

      // Should wait until future date
      jest.advanceTimersByTime(5000);

      await requestPromise;

      expect(callCount).toBe(2);
    });

    it('should cap Retry-After at maximum backoff time', async () => {
      const apiService = new ApiService('https://api.test.com');

      let callCount = 0;
      global.fetch = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: false,
            status: 429,
            headers: new Headers({
              'Retry-After': '3600'  // 1 hour - should be capped
            }),
            json: () => Promise.resolve({ error: 'Rate limited' })
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: 'success' })
        } as Response);
      });

      const requestPromise = (apiService as any).request('GET', '/test', {});

      // Should cap at max backoff (e.g., 30 seconds)
      jest.advanceTimersByTime(30000);

      await requestPromise;

      expect(callCount).toBe(2);
    });
  });

  // ===================================================================
  // Integration Test: Multiple bugs in realistic scenario
  // ===================================================================
  describe('Integration: Combined error handling scenarios', () => {
    it('should handle rate limit → timeout → success flow', async () => {
      const apiService = new ApiService('https://api.test.com');

      let callCount = 0;
      global.fetch = jest.fn().mockImplementation(() => {
        callCount++;

        if (callCount === 1) {
          // First call: Rate limited
          return Promise.resolve({
            ok: false,
            status: 429,
            headers: new Headers({ 'Retry-After': '2' }),
            json: () => Promise.resolve({ error: 'Rate limited' })
          } as Response);
        }

        if (callCount === 2) {
          // Second call: Timeout
          const error = new Error('Timeout') as any;
          error.name = 'AbortError';
          return Promise.reject(error);
        }

        // Third call: Success
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: 'success' })
        } as Response);
      });

      const requestPromise = (apiService as any).request('GET', '/test', {});

      // Advance through rate limit delay
      jest.advanceTimersByTime(2000);

      // Advance through timeout retry delay
      jest.advanceTimersByTime(2000);

      const result = await requestPromise;

      expect(callCount).toBe(3);
      expect(result.data).toBe('success');
    });

    it('should cleanup all resources in complex failure scenario', async () => {
      const httpClient = new HttpClient('https://api.test.com');

      const mockUnsubscribe = jest.fn();
      (NetInfo.addEventListener as jest.Mock).mockReturnValue(mockUnsubscribe);

      (httpClient as any).setupNetworkMonitoring();

      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      // Simulate complex failure
      (httpClient as any).instance = {
        request: jest.fn().mockRejectedValue(new Error('Network error'))
      };

      try {
        await httpClient.get('/test');
      } catch {
        // Expected
      }

      // Destroy client
      (httpClient as any).destroy?.();

      // CRITICAL: All cleanup must happen
      expect(mockUnsubscribe).toHaveBeenCalled();
      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });
});
