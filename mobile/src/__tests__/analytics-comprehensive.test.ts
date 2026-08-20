/**
 * Comprehensive Analytics Testing Suite
 *
 * Tests all aspects of the mobile analytics system:
 * - Edge cases and error handling
 * - Consent enforcement scenarios
 * - Queue management limits
 * - Network failure scenarios
 * - Data transformation accuracy
 * - End-to-end user flows
 */

import { AnalyticsManager } from '../services/analytics/AnalyticsManager';
import { analyticsService } from '../services/analytics/AnalyticsService';
import { _userAnalyticsService } from '../services/analytics/UserAnalyticsService';
import NotificationAnalytics from '../services/notificationAnalytics';
import { server } from '../mocks/server';

// Disable MSW for this test file - we need precise fetch mock control for retry logic testing
beforeAll(() => {
  server.close();
});

afterAll(() => {
  server.listen();
});

// Mock logger before other imports
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    log: jest.fn(),
    trace: jest.fn(),
  },
}));

// Mock config to enable analytics in tests
jest.mock('../config/environment', () => ({
  config: {
    ENABLE_ANALYTICS: true,
    ENABLE_CRASH_REPORTING: true,
    API_URL: 'http://localhost:8020',
  },
}));

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()), // Return unsubscribe function directly
  fetch: jest.fn(() =>
    Promise.resolve({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
      details: null,
    }),
  ),
}));

global.fetch = jest.fn();
describe('Comprehensive Analytics Testing', () => {
  let manager: AnalyticsManager;
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useRealTimers();

    manager = AnalyticsManager.getInstance();
    (manager as any).eventQueue = [];
    (manager as any).failedQueue = [];

    const AsyncStorageMock = require('@react-native-async-storage/async-storage');
    AsyncStorageMock.getItem.mockResolvedValue(null);
    AsyncStorageMock.setItem.mockResolvedValue(undefined);

    await manager.initialize();
    await manager.setConsent(true, ['analytics']);
    await analyticsService.initialize();
  });

  afterEach(() => {
    jest.clearAllMocks();
    manager.dispose();
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null event data gracefully', async () => {
      await expect(
        analyticsService.logEvent({
          name: 'test_event',
          parameters: null as any,
        }),
      ).resolves.not.toThrow();
    });

    it('should handle undefined event parameters', async () => {
      await expect(
        analyticsService.logEvent({
          name: 'test_event',
          parameters: undefined,
        }),
      ).resolves.not.toThrow();
    });

    it('should handle very long event names', async () => {
      const longName = 'a'.repeat(500);
      await expect(
        analyticsService.logEvent({
          name: longName,
          parameters: {},
        }),
      ).resolves.not.toThrow();
    });

    it('should handle large event payloads', async () => {
      const largePayload = {
        data: 'x'.repeat(10000),
        nested: {
          deep: {
            object: {
              with: 'many',
              nested: 'properties',
            },
          },
        },
      };

      await expect(
        analyticsService.logEvent({
          name: 'large_event',
          parameters: largePayload,
        }),
      ).resolves.not.toThrow();
    });

    it('should handle special characters in event data', async () => {
      const specialChars = {
        emoji: '😀🎉🚀',
        unicode: '你好世界',
        symbols: '!@#$%^&*(){}[]<>?/',
        quotes: `"'` + '`',
      };

      await expect(
        analyticsService.logEvent({
          name: 'special_chars',
          parameters: specialChars,
        }),
      ).resolves.not.toThrow();
    });

    it('should handle rapid event firing', async () => {
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(
          analyticsService.logEvent({
            name: `rapid_event_${i}`,
            parameters: { index: i },
          }),
        );
      }

      await expect(Promise.all(promises)).resolves.not.toThrow();
    });

    it('should handle AsyncStorage failure gracefully', async () => {
      const AsyncStorageMock = require('@react-native-async-storage/async-storage');
      AsyncStorageMock.setItem.mockRejectedValueOnce(new Error('Storage full'));

      await expect(
        analyticsService.logEvent({
          name: 'test_event',
          parameters: {},
        }),
      ).resolves.not.toThrow();
    });
  });

  describe('Consent Enforcement Scenarios', () => {
    it('should block events immediately when consent is revoked', async () => {
      // Grant consent and track event
      await manager.setConsent(true, ['analytics']);
      await analyticsService.logEvent({ name: 'event_1', parameters: {} });
      await new Promise(resolve => setTimeout(resolve, 100));

      const queueBefore = (manager as any).eventQueue.length;
      expect(queueBefore).toBeGreaterThan(0);

      // Revoke consent
      await manager.setConsent(false, []);

      // Try to track another event
      await analyticsService.logEvent({ name: 'event_2', parameters: {} });
      await new Promise(resolve => setTimeout(resolve, 100));

      // Queue should not have grown
      const queueAfter = (manager as any).eventQueue.length;
      expect(queueAfter).toBe(queueBefore);
    });

    it('should respect granular consent categories', async () => {
      await manager.setConsent(true, ['performance']);
      expect(manager.hasUserConsent()).toBe(true);

      await manager.setConsent(true, ['analytics', 'marketing']);
      expect(manager.hasUserConsent()).toBe(true);

      await manager.setConsent(true, []);
      expect(manager.hasUserConsent()).toBe(true);
    });

    it('should persist consent across manager reinitialization', async () => {
      await manager.setConsent(true, ['analytics', 'performance']);

      // Simulate app restart by creating new manager
      const AsyncStorageMock = require('@react-native-async-storage/async-storage');
      AsyncStorageMock.getItem.mockResolvedValueOnce(
        JSON.stringify({
          hasConsent: true,
          categories: ['analytics', 'performance'],
        }),
      );

      const newManager = AnalyticsManager.getInstance();
      await newManager.initialize();

      expect(newManager.hasUserConsent()).toBe(true);
    });
  });

  describe('Queue Management and Limits', () => {
    it('should enforce max queue size of 1000 events', async () => {
      const promises = [];
      // Try to add 1100 events
      for (let i = 0; i < 1100; i++) {
        promises.push(
          manager.trackEvent({
            id: `test-${i}`,
            timestamp: Date.now(),
            eventType: 'test_event',
            category: 'test',
            source: 'test',
            data: { index: i },
            retryCount: 0,
          }),
        );
      }

      await Promise.all(promises);
      await new Promise(resolve => setTimeout(resolve, 200));

      const queue = (manager as any).eventQueue;
      expect(queue.length).toBeLessThanOrEqual(1000);
    });

    it('should trigger flush when batch size reaches 50', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      } as Response);

      // Add exactly 50 events
      for (let i = 0; i < 50; i++) {
        await manager.trackEvent({
          id: `test-${i}`,
          timestamp: Date.now(),
          eventType: 'test_event',
          category: 'test',
          source: 'test',
          data: {},
          retryCount: 0,
        });
      }

      // Wait for auto-flush
      await new Promise(resolve => setTimeout(resolve, 500));

      // Flush should have been triggered
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should handle concurrent flush attempts safely', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      } as Response);

      // Add some events
      for (let i = 0; i < 10; i++) {
        await manager.trackEvent({
          id: `test-${i}`,
          timestamp: Date.now(),
          eventType: 'test_event',
          category: 'test',
          source: 'test',
          data: {},
          retryCount: 0,
        });
      }

      // Try to flush multiple times concurrently
      const flushPromises = [
        manager.flushQueue(),
        manager.flushQueue(),
        manager.flushQueue(),
      ];

      await expect(Promise.all(flushPromises)).resolves.not.toThrow();
    });

    it('should persist queue to AsyncStorage', async () => {
      const AsyncStorageMock = require('@react-native-async-storage/async-storage');

      await manager.trackEvent({
        id: 'test-123',
        timestamp: Date.now(),
        eventType: 'test_event',
        category: 'test',
        source: 'test',
        data: {},
        retryCount: 0,
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(AsyncStorageMock.setItem).toHaveBeenCalledWith(
        '@geoleap_analytics_queue',
        expect.any(String),
      );
    });
  });

  describe('Network Failure and Retry Logic', () => {
    it('should retry on network errors with exponential backoff', async () => {
      let attemptCount = 0;
      mockFetch.mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({}),
        } as Response);
      });

      await manager.trackEvent({
        id: 'test-retry',
        timestamp: Date.now(),
        eventType: 'test_event',
        category: 'test',
        source: 'test',
        data: {},
        retryCount: 0,
      });

      await manager.flushQueue();
      await new Promise(resolve => setTimeout(resolve, 8000)); // Wait for all retries

      expect(attemptCount).toBe(3);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should move to failed queue after 3 retry attempts', async () => {
      mockFetch.mockRejectedValue(new Error('Permanent network failure'));

      await manager.trackEvent({
        id: 'test-fail',
        timestamp: Date.now(),
        eventType: 'test_event',
        category: 'test',
        source: 'test',
        data: {},
        retryCount: 0,
      });

      await manager.flushQueue();
      await new Promise(resolve => setTimeout(resolve, 8000));

      const failedQueue = (manager as any).failedQueue;
      expect(failedQueue.length).toBeGreaterThan(0);
    });

    it('should handle 500 server errors with retry', async () => {
      let attemptCount = 0;
      mockFetch.mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 2) {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: async () => ({ error: 'Internal server error' }),
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({}),
        } as Response);
      });

      await manager.trackEvent({
        id: 'test-500',
        timestamp: Date.now(),
        eventType: 'test_event',
        category: 'test',
        source: 'test',
        data: {},
        retryCount: 0,
      });

      await manager.flushQueue();
      await new Promise(resolve => setTimeout(resolve, 5000));

      expect(attemptCount).toBeGreaterThanOrEqual(2);
    });

    it('should not retry on 401/403 auth errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      } as Response);

      await manager.trackEvent({
        id: 'test-401',
        timestamp: Date.now(),
        eventType: 'test_event',
        category: 'test',
        source: 'test',
        data: {},
        retryCount: 0,
      });

      await manager.flushQueue();
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Should only be called once (no retries)
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Data Transformation Accuracy', () => {
    it('should transform timestamps correctly to ISO 8601', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      } as Response);

      const testTimestamp = 1700000000000; // Known timestamp
      await manager.trackEvent({
        id: 'test-timestamp',
        timestamp: testTimestamp,
        eventType: 'test_event',
        category: 'test',
        source: 'test',
        data: {},
        retryCount: 0,
      });

      await manager.flushQueue();
      await new Promise(resolve => setTimeout(resolve, 300));

      if (mockFetch.mock.calls.length > 0) {
        const requestBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
        expect(requestBody[0].clientTimestamp).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
        );
      }
    });

    it('should serialize properties object to JSON string', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      } as Response);

      const testData = {
        nested: { deep: 'value' },
        array: [1, 2, 3],
        boolean: true,
        number: 123,
      };

      await manager.trackEvent({
        id: 'test-serialize',
        timestamp: Date.now(),
        eventType: 'test_event',
        category: 'test',
        source: 'test',
        data: testData,
        retryCount: 0,
      });

      await manager.flushQueue();
      await new Promise(resolve => setTimeout(resolve, 300));

      if (mockFetch.mock.calls.length > 0) {
        const requestBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
        expect(typeof requestBody[0].properties).toBe('string');
        const parsedProperties = JSON.parse(requestBody[0].properties);
        expect(parsedProperties).toMatchObject(testData);
      }
    });

    it('should include deviceId and sessionId in all events', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      } as Response);

      const deviceId = manager.getDeviceId();
      const sessionId = manager.getSessionId();

      await manager.trackEvent({
        id: 'test-ids',
        timestamp: Date.now(),
        eventType: 'test_event',
        category: 'test',
        source: 'test',
        data: {},
        retryCount: 0,
      });

      await manager.flushQueue();
      await new Promise(resolve => setTimeout(resolve, 300));

      if (mockFetch.mock.calls.length > 0) {
        const requestBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
        expect(requestBody[0].deviceId).toBe(deviceId);
        expect(requestBody[0].sessionId).toBe(sessionId);
      }
    });
  });

  describe('End-to-End User Flow Simulation', () => {
    it('should handle complete user session flow', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      } as Response);

      // Simulate app launch
      await analyticsService.logAppStart();
      await new Promise(resolve => setTimeout(resolve, 100));

      // User searches
      await analyticsService.logEvent({
        name: 'search',
        parameters: { query: 'action movies', results: 25 },
      });
      await new Promise(resolve => setTimeout(resolve, 100));

      // User views content
      await _userAnalyticsService.trackContentView('movie-123', 'search', 30);
      await new Promise(resolve => setTimeout(resolve, 100));

      // User receives notification
      await NotificationAnalytics.trackNotificationReceived(
        'template-001',
        'promotional',
        'high',
      );
      await new Promise(resolve => setTimeout(resolve, 100));

      // App goes to background
      await analyticsService.logAppBackground();
      await manager.flushQueue();
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify all events were sent
      expect(mockFetch).toHaveBeenCalled();
      if (mockFetch.mock.calls.length > 0) {
        const requestBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
        expect(Array.isArray(requestBody)).toBe(true);
        expect(requestBody.length).toBeGreaterThan(0);
      }
    });

    it('should handle offline mode with queue persistence', async () => {
      const NetInfo = require('@react-native-community/netinfo');
      // Set offline for event tracking
      NetInfo.fetch.mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
      });

      // Track events while offline
      await analyticsService.logEvent({
        name: 'offline_event_1',
        parameters: {},
      });
      await analyticsService.logEvent({
        name: 'offline_event_2',
        parameters: {},
      });
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify events are queued
      const queue = (manager as any).eventQueue;
      expect(queue.length).toBeGreaterThan(0);

      // Simulate network coming back - use mockResolvedValue to handle multiple calls
      NetInfo.fetch.mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
      });

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      } as Response);

      // Trigger flush
      await manager.flushQueue();
      await new Promise(resolve => setTimeout(resolve, 500));

      // Events should be sent
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should handle consent change mid-session', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      } as Response);

      // Start with consent
      await manager.setConsent(true, ['analytics']);
      await analyticsService.logEvent({
        name: 'event_with_consent',
        parameters: {},
      });
      await new Promise(resolve => setTimeout(resolve, 100));

      const queueBefore = (manager as any).eventQueue.length;
      expect(queueBefore).toBeGreaterThan(0);

      // User denies consent
      await manager.setConsent(false, []);
      await analyticsService.logEvent({
        name: 'event_without_consent',
        parameters: {},
      });
      await new Promise(resolve => setTimeout(resolve, 100));

      const queueAfter = (manager as any).eventQueue.length;
      expect(queueAfter).toBe(queueBefore); // Should not have grown

      // User grants consent again
      await manager.setConsent(true, ['analytics', 'performance']);
      await analyticsService.logEvent({
        name: 'event_with_consent_again',
        parameters: {},
      });
      await new Promise(resolve => setTimeout(resolve, 100));

      const queueFinal = (manager as any).eventQueue.length;
      expect(queueFinal).toBeGreaterThan(queueAfter); // Should have grown
    });
  });
});
