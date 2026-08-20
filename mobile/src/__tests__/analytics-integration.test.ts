/**
 * Mobile Analytics Integration Tests
 *
 * Tests the full analytics system integration:
 * - AnalyticsManager coordination
 * - Service integration (AnalyticsService, UserAnalyticsService, NotificationAnalytics)
 * - Event transformation and queuing
 * - Backend API communication
 * - Consent enforcement
 *
 * Uses MSW for network-level API mocking (via global jest.setup.js).
 */

import { AnalyticsManager } from '../services/analytics/AnalyticsManager';
import { analyticsService } from '../services/analytics/AnalyticsService';
import { _userAnalyticsService } from '../services/analytics/UserAnalyticsService';
import NotificationAnalytics from '../services/notificationAnalytics';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';

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

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock NetInfo
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

// KNOWN ISSUE: MSW v2 incompatibility with current test setup - skipping entire suite
// TODO: Upgrade MSW setup for v2 compatibility
describe.skip('Mobile Analytics Integration', () => {
  let manager: AnalyticsManager;
  let capturedRequestBody: unknown[] | null = null;
  let apiCallCount = 0;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Reset request capture state
    capturedRequestBody = null;
    apiCallCount = 0;

    // Set up MSW handler to capture request bodies (overrides default handler)
    // Note: Endpoint is /userbehavioranalytics/events/batch (no /api/ prefix)
    server.use(
      http.post('*/userbehavioranalytics/events/batch', async ({ request }) => {
        apiCallCount++;
        capturedRequestBody = await request.json() as unknown[];
        return HttpResponse.json({
          success: true,
          data: { processed: Array.isArray(capturedRequestBody) ? capturedRequestBody.length : 0 },
        });
      })
    );

    // Get existing manager instance or create new one
    manager = AnalyticsManager.getInstance();

    // Clear the queue manually and reset state
    (manager as any).eventQueue = [];
    (manager as any).failedQueue = [];

    // Stop any existing timer
    if ((manager as any).flushTimer) {
      clearInterval((manager as any).flushTimer);
      (manager as any).flushTimer = undefined;
    }

    (manager as any).isInitialized = false;  // Reset to allow re-initialization

    // Mock AsyncStorage to return empty values
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    AsyncStorage.getItem.mockResolvedValue(null);
    AsyncStorage.setItem.mockResolvedValue(undefined);

    // Re-initialize manager to reset state (now works since isInitialized is false)
    await manager.initialize();

    // Set consent for tests
    await manager.setConsent(true, ['analytics']);

    // Re-initialize analyticsService to get fresh manager reference
    await analyticsService.initialize();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    server.resetHandlers();

    // Stop the flush timer without triggering async flushQueue
    if (manager && (manager as any).flushTimer) {
      clearInterval((manager as any).flushTimer);
      (manager as any).flushTimer = undefined;
    }
  });

  describe('End-to-End Analytics Flow', () => {
    it('should track event from AnalyticsService through to API call', async () => {
      // Track event from AnalyticsService
      await analyticsService.logEvent({
        name: 'test_event',
        parameters: { foo: 'bar' },
      });

      // Fast-forward timers to allow async operations
      jest.advanceTimersByTime(200);
      await Promise.resolve();

      // Verify event was queued BEFORE flushing
      const queueBeforeFlush = (manager as any).eventQueue;
      expect(queueBeforeFlush.length).toBeGreaterThan(0);

      // Use real timers for the actual network call
      jest.useRealTimers();

      // Manually flush queue to trigger API call
      await manager.flushQueue();

      // Wait for async flush operations
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify API was called (MSW captured request)
      expect(apiCallCount).toBeGreaterThan(0);
      expect(capturedRequestBody).not.toBeNull();

      if (capturedRequestBody) {
        expect(Array.isArray(capturedRequestBody)).toBe(true);
        expect(capturedRequestBody.length).toBeGreaterThan(0);
        expect(capturedRequestBody[0]).toMatchObject({
          eventType: 'test_event',
          category: 'general',
          properties: expect.any(String),
          clientTimestamp: expect.any(String),
          hasConsent: true,
        });
      }
    });

    it('should track content view from UserAnalyticsService and send to backend', async () => {
      // Track content view
      await _userAnalyticsService.trackContentView('movie-123', 'recommendations', 120);

      // Fast-forward timers
      jest.advanceTimersByTime(100);
      await Promise.resolve();

      // Use real timers for network call
      jest.useRealTimers();

      // Flush queue
      await manager.flushQueue();
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify API called (MSW captured request)
      expect(apiCallCount).toBeGreaterThan(0);

      if (capturedRequestBody) {
        expect((capturedRequestBody[0] as Record<string, unknown>)).toMatchObject({
          eventType: 'content_view',
          category: 'engagement',
          properties: expect.stringContaining('movie-123'),
        });
      }
    });

    it('should track notification event and send to backend', async () => {
      const notificationAnalytics = NotificationAnalytics;

      // Track notification received
      await notificationAnalytics.trackNotificationReceived(
        'template-001',
        'promotional',
        'high',
      );

      // Fast-forward timers
      jest.advanceTimersByTime(100);
      await Promise.resolve();

      // Force upload (which uses AnalyticsManager)
      await notificationAnalytics.forceUpload();

      // Use real timers for network call
      jest.useRealTimers();

      // Flush AnalyticsManager queue
      await manager.flushQueue();
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify API called (MSW captured request)
      expect(apiCallCount).toBeGreaterThan(0);

      if (capturedRequestBody) {
        expect(capturedRequestBody.length).toBeGreaterThan(0);
        expect((capturedRequestBody[0] as Record<string, unknown>)).toMatchObject({
          eventType: expect.stringContaining('notification_'),
          category: 'notification',
        });
      }
    });
  });

  describe('Consent Enforcement', () => {
    it('should not send events when consent is denied', async () => {
      // Deny consent
      await manager.setConsent(false, []);

      // Track event
      await analyticsService.logEvent({
        name: 'test_event',
        parameters: { foo: 'bar' },
      });

      // Use real timers for network call
      jest.useRealTimers();

      // Try to flush
      await manager.flushQueue();
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify API was NOT called (MSW would have captured it)
      expect(apiCallCount).toBe(0);
    });

    it('should resume sending events after consent is granted', async () => {
      // Track event with consent denied
      await manager.setConsent(false, []);
      await analyticsService.logEvent({
        name: 'event_1',
        parameters: {},
      });

      // Fast-forward timers
      jest.advanceTimersByTime(200);
      await Promise.resolve();

      // Verify event was NOT queued (no consent)
      const queueBefore = (manager as any).eventQueue;
      expect(queueBefore.length).toBe(0);

      // Grant consent
      await manager.setConsent(true, ['analytics']);

      // Track another event
      await analyticsService.logEvent({
        name: 'event_2',
        parameters: {},
      });

      // Fast-forward timers
      jest.advanceTimersByTime(200);
      await Promise.resolve();

      // Verify event WAS queued (with consent)
      const queueAfter = (manager as any).eventQueue;
      expect(queueAfter.length).toBeGreaterThan(0);
    });
  });

  describe('Retry Logic Integration', () => {
    it('should track events from AnalyticsService into manager queue', async () => {
      // Track event
      await analyticsService.logEvent({
        name: 'test_event',
        parameters: { test: 'data' },
      });

      // Fast-forward timers
      jest.advanceTimersByTime(200);
      await Promise.resolve();

      // Verify event was queued in manager
      const queue = (manager as any).eventQueue;
      expect(queue.length).toBeGreaterThan(0);
      expect(queue[0].eventType).toBe('test_event');
    });

    it('should handle queue persistence across initialization', async () => {
      // Add event to queue
      await manager.trackEvent({
        id: 'test-123',
        timestamp: Date.now(),
        eventType: 'test_event',
        category: 'test',
        source: 'test',
        data: {},
        retryCount: 0,
      });

      // Fast-forward timers
      jest.advanceTimersByTime(50);
      await Promise.resolve();

      // Verify queue is not empty
      const queue = (manager as any).eventQueue;
      expect(queue.length).toBeGreaterThan(0);
    });
  });

  describe('Data Transformation', () => {
    it('should queue events from UserAnalyticsService with correct structure', async () => {
      await _userAnalyticsService.trackContentView('movie-123', 'recommendations', 120);

      // Fast-forward timers
      jest.advanceTimersByTime(100);
      await Promise.resolve();

      // Verify event was queued with correct structure
      const queue = (manager as any).eventQueue;
      expect(queue.length).toBeGreaterThan(0);

      const event = queue[0];
      expect(event).toHaveProperty('eventType', 'content_view');
      expect(event).toHaveProperty('category', 'engagement');
      expect(event).toHaveProperty('timestamp');
      expect(event.data).toHaveProperty('contentId', 'movie-123');
    });
  });

  describe('Queue Management', () => {
    it('should batch multiple events from different services', async () => {
      // Track from AnalyticsService
      await analyticsService.logEvent({ name: 'event_1', parameters: {} });
      jest.advanceTimersByTime(100);
      await Promise.resolve();

      // Track from UserAnalyticsService
      await _userAnalyticsService.trackContentView('movie-1', 'home', 10);
      jest.advanceTimersByTime(100);
      await Promise.resolve();

      // Track from NotificationAnalytics
      await NotificationAnalytics.trackNotificationReceived('template-1', 'promo', 'high');
      jest.advanceTimersByTime(100);
      await Promise.resolve();

      // Verify all events are in the same queue
      const queue = (manager as any).eventQueue;
      expect(queue.length).toBeGreaterThanOrEqual(2);
    });

    it('should persist queue state', async () => {
      // Track event directly via manager
      await manager.trackEvent({
        id: 'test-123',
        timestamp: Date.now(),
        eventType: 'test_event',
        category: 'test',
        source: 'analytics',
        data: { test: 'data' },
        retryCount: 0,
      });

      // Fast-forward timers
      jest.advanceTimersByTime(50);
      await Promise.resolve();

      // Verify queue is populated in memory
      const queue = (manager as any).eventQueue;
      expect(queue.length).toBeGreaterThan(0);
    });
  });

  describe('Device & Session Tracking', () => {
    it('should generate and persist deviceId', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');

      const deviceId = manager.getDeviceId();

      expect(deviceId).toBeDefined();
      expect(deviceId).toMatch(/^device_\d+_[a-z0-9]+$/);

      // Verify deviceId was persisted - check all calls to find the deviceId one
      const setItemCalls = (AsyncStorage.setItem as jest.Mock).mock.calls;
      const deviceIdCall = setItemCalls.find(call => call[0] === '@geoleap_device_id');
      expect(deviceIdCall).toBeDefined();
      expect(deviceIdCall![1]).toBe(deviceId);
    });

    it('should generate unique sessionId per initialization', async () => {
      const sessionId1 = manager.getSessionId();

      // Reinitialize manager
      (AnalyticsManager as any).instance = null;
      const manager2 = AnalyticsManager.getInstance();
      await manager2.initialize();

      const sessionId2 = manager2.getSessionId();

      // Session IDs should be different
      expect(sessionId1).not.toBe(sessionId2);

      // Both should be valid UUIDs
      expect(sessionId1).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i);
      expect(sessionId2).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i);
    });
  });
});
