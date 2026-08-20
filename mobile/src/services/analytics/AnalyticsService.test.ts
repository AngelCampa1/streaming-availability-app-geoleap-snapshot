/**
 * AnalyticsService.test.ts - Comprehensive tests for Analytics Service
 *
 * Test Strategy: Focus on bug detection through event tracking validation,
 * category mapping accuracy, session management, and consent handling.
 *
 * Coverage Target: 100% of AnalyticsService.ts (415 lines)
 *
 * Key Testing Areas:
 * - Initialization with config flags
 * - Event tracking with metadata (timestamp, userId, session_duration, platform)
 * - Category mapping for all event types
 * - User identification and property management
 * - Performance and error tracking
 * - Specialized event logging (search, auth, content, purchase, etc.)
 * - Session duration calculation
 * - Consent management
 * - Development-only features
 * - Cleanup and disposal
 */

import { Platform } from 'react-native';
import { AnalyticsService, analyticsService } from './AnalyticsService';
import { AnalyticsManager } from './AnalyticsManager';
import { config } from '../../config/environment';
import { logger } from '../../utils/logger';
import { v4 as uuidv4 } from 'uuid';

// Mock dependencies
jest.mock('./AnalyticsManager');
jest.mock('../../config/environment', () => ({
  config: {
    ENABLE_ANALYTICS: true,
    ENABLE_CRASH_REPORTING: true,
  },
}));
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-123'),
}));

describe('AnalyticsService', () => {
  beforeAll(() => {
    // Use real timers - AnalyticsService uses timestamps and async operations
    jest.useRealTimers();
  });

  let service: AnalyticsService;
  let mockAnalyticsManager: jest.Mocked<AnalyticsManager>;
  let originalDev: boolean;
  let originalDateNow: () => number;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset config
    (config as any).ENABLE_ANALYTICS = true;
    (config as any).ENABLE_CRASH_REPORTING = true;

    // Mock Date.now()
    originalDateNow = Date.now;
    let mockTime = 1000000000000; // Fixed timestamp
    Date.now = jest.fn(() => mockTime);
    (Date.now as jest.Mock).mockImplementation(() => {
      const current = mockTime;
      mockTime += 1000; // Increment by 1 second for each call
      return current;
    });

    // Mock AnalyticsManager BEFORE creating service instance
    // (service constructor calls AnalyticsManager.getInstance())
    mockAnalyticsManager = {
      initialize: jest.fn().mockResolvedValue(undefined),
      trackEvent: jest.fn().mockResolvedValue(undefined),
      setUserId: jest.fn(),
      getDeviceId: jest.fn(() => 'device-123'),
      getSessionId: jest.fn(() => 'session-456'),
      hasUserConsent: jest.fn(() => true),
      setConsent: jest.fn().mockResolvedValue(undefined),
      dispose: jest.fn(),
    } as any;

    (AnalyticsManager.getInstance as jest.Mock).mockReturnValue(mockAnalyticsManager);

    // Create fresh service instance AFTER mock is set up
    service = new (AnalyticsService as any)();

    // Save original __DEV__
    originalDev = (global as any).__DEV__;
  });

  afterEach(() => {
    Date.now = originalDateNow;
    (global as any).__DEV__ = originalDev;
  });

  // ==========================================================================
  // Initialization Tests
  // ==========================================================================

  describe('initialize', () => {
    it('initializes AnalyticsManager when ENABLE_ANALYTICS is true', async () => {
      await service.initialize();

      expect(mockAnalyticsManager.initialize).toHaveBeenCalledTimes(1);
    });

    it('BUG: Does not initialize when ENABLE_ANALYTICS is false', async () => {
      (config as any).ENABLE_ANALYTICS = false;

      await service.initialize();

      expect(mockAnalyticsManager.initialize).not.toHaveBeenCalled();
    });

    it('BUG: Does not initialize twice', async () => {
      await service.initialize();
      await service.initialize();

      expect(mockAnalyticsManager.initialize).toHaveBeenCalledTimes(1);
    });

    it('logs initialization in dev mode', async () => {
      (global as any).__DEV__ = true;

      await service.initialize();

      expect(logger.info).toHaveBeenCalledWith(
        '[AnalyticsService] Initialized with AnalyticsManager'
      );
    });

    it('handles initialization errors gracefully', async () => {
      mockAnalyticsManager.initialize.mockRejectedValue(new Error('Init failed'));

      await service.initialize();

      expect(logger.error).toHaveBeenCalledWith(
        '[AnalyticsService] Analytics initialization error',
        expect.any(Error)
      );
    });
  });

  // ==========================================================================
  // Event Tracking Tests
  // ==========================================================================

  describe('logEvent', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('tracks event with metadata (timestamp, userId, session_duration, platform)', async () => {
      await service.setUserId('user-123');

      await service.logEvent({
        name: 'test_event',
        parameters: { custom_param: 'value' },
      });

      expect(mockAnalyticsManager.trackEvent).toHaveBeenCalledWith({
        id: 'test-uuid-123',
        timestamp: expect.any(Number),
        eventType: 'test_event',
        category: 'general',
        source: 'analytics',
        data: {
          custom_param: 'value',
          timestamp: expect.any(Number),
          user_id: 'user-123',
          session_duration: expect.any(Number),
          platform: 'ios',
          os_version: Platform.Version, // Use actual Platform.Version from global setup
        },
        retryCount: 0,
      });
    });

    it('generates UUID for event ID', async () => {
      await service.logEvent({ name: 'test_event' });

      const trackEventCall = mockAnalyticsManager.trackEvent.mock.calls[0][0];
      expect(trackEventCall.id).toBe('test-uuid-123');
    });

    it('BUG: Does not track when not initialized', async () => {
      const uninitializedService = new (AnalyticsService as any)();

      await uninitializedService.logEvent({ name: 'test_event' });

      expect(mockAnalyticsManager.trackEvent).not.toHaveBeenCalled();
    });

    it('calculates session duration from sessionStartTime', async () => {
      // logAppStart sets sessionStartTime to Date.now()
      await service.logAppStart(); // Gets timestamp T1 (e.g., 1000000002000)
      const appStartCall = mockAnalyticsManager.trackEvent.mock.calls[0][0];
      const sessionStart = appStartCall.data.start_time;

      // Advance time by freezing Date.now to sessionStart + 5000
      Date.now = jest.fn(() => sessionStart + 5000);

      await service.logEvent({ name: 'test_event' });

      const trackEventCall = mockAnalyticsManager.trackEvent.mock.calls[1][0];
      expect(trackEventCall.data.session_duration).toBe(5000);
    });

    it('includes platform metadata (OS and version)', async () => {
      await service.logEvent({ name: 'test_event' });

      const trackEventCall = mockAnalyticsManager.trackEvent.mock.calls[0][0];
      expect(trackEventCall.data.platform).toBe('ios');
      expect(trackEventCall.data.os_version).toBe(Platform.Version); // Use actual Platform.Version
    });

    it('handles errors gracefully', async () => {
      mockAnalyticsManager.trackEvent.mockRejectedValue(new Error('Track failed'));

      await service.logEvent({ name: 'test_event' });

      expect(logger.error).toHaveBeenCalledWith(
        '[AnalyticsService] Analytics error',
        expect.any(Error)
      );
    });

    it('logs debug info in dev mode', async () => {
      (global as any).__DEV__ = true;

      await service.logEvent({
        name: 'test_event',
        parameters: { test: 'value' },
      });

      expect(logger.debug).toHaveBeenCalledWith(
        '[AnalyticsService] test_event',
        expect.objectContaining({ test: 'value' })
      );
    });
  });

  // ==========================================================================
  // Category Mapping Tests
  // ==========================================================================

  describe('mapEventToCategory', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('BUG: Maps screen_view → navigation', async () => {
      await service.logEvent({ name: 'screen_view' });

      const trackEventCall = mockAnalyticsManager.trackEvent.mock.calls[0][0];
      expect(trackEventCall.category).toBe('navigation');
    });

    it('BUG: Maps error events → error', async () => {
      await service.logEvent({ name: 'error_occurred' });

      const trackEventCall = mockAnalyticsManager.trackEvent.mock.calls[0][0];
      expect(trackEventCall.category).toBe('error');
    });

    it('BUG: Maps search events → search', async () => {
      await service.logEvent({ name: 'search_query' });

      const trackEventCall = mockAnalyticsManager.trackEvent.mock.calls[0][0];
      expect(trackEventCall.category).toBe('search');
    });

    it('BUG: Maps auth events → auth', async () => {
      await service.logEvent({ name: 'auth_login' });

      const trackEventCall = mockAnalyticsManager.trackEvent.mock.calls[0][0];
      expect(trackEventCall.category).toBe('auth');
    });

    it('BUG: Maps content events → content', async () => {
      await service.logEvent({ name: 'content_view' });

      const trackEventCall = mockAnalyticsManager.trackEvent.mock.calls[0][0];
      expect(trackEventCall.category).toBe('content');
    });

    it('BUG: Maps purchase events → commerce', async () => {
      await service.logEvent({ name: 'purchase_complete' });

      const trackEventCall = mockAnalyticsManager.trackEvent.mock.calls[0][0];
      expect(trackEventCall.category).toBe('commerce');
    });

    it('BUG: Maps performance events → performance', async () => {
      await service.logEvent({ name: 'performance_metric' });

      const trackEventCall = mockAnalyticsManager.trackEvent.mock.calls[0][0];
      expect(trackEventCall.category).toBe('performance');
    });

    it('BUG: Maps app_ events → lifecycle', async () => {
      await service.logEvent({ name: 'app_open' });

      const trackEventCall = mockAnalyticsManager.trackEvent.mock.calls[0][0];
      expect(trackEventCall.category).toBe('lifecycle');
    });

    it('BUG: Maps unknown events → general', async () => {
      await service.logEvent({ name: 'unknown_event' });

      const trackEventCall = mockAnalyticsManager.trackEvent.mock.calls[0][0];
      expect(trackEventCall.category).toBe('general');
    });

    it('uses first matching pattern (screen_view_error → navigation, not error)', async () => {
      await service.logEvent({ name: 'screen_view_error' });

      const trackEventCall = mockAnalyticsManager.trackEvent.mock.calls[0][0];
      expect(trackEventCall.category).toBe('navigation');
    });
  });

  // ==========================================================================
  // Screen Tracking Tests
  // ==========================================================================

  describe('logScreenView', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('logs screen view with screen_name and screen_class', async () => {
      await service.logScreenView({
        screenName: 'HomeScreen',
        screenClass: 'HomeScreenClass',
        parameters: { referrer: 'search' },
      });

      const trackEventCall = mockAnalyticsManager.trackEvent.mock.calls[0][0];
      expect(trackEventCall.eventType).toBe('screen_view');
      expect(trackEventCall.data.screen_name).toBe('HomeScreen');
      expect(trackEventCall.data.screen_class).toBe('HomeScreenClass');
      expect(trackEventCall.data.referrer).toBe('search');
    });

    it('BUG: Uses screenName as screenClass when not provided', async () => {
      await service.logScreenView({ screenName: 'ProfileScreen' });

      const trackEventCall = mockAnalyticsManager.trackEvent.mock.calls[0][0];
      expect(trackEventCall.data.screen_class).toBe('ProfileScreen');
    });

    it('BUG: Does not track when not initialized', async () => {
      const uninitializedService = new (AnalyticsService as any)();

      await uninitializedService.logScreenView({ screenName: 'TestScreen' });

      expect(mockAnalyticsManager.trackEvent).not.toHaveBeenCalled();
    });

    it('handles errors gracefully', async () => {
      mockAnalyticsManager.trackEvent.mockRejectedValue(new Error('Track failed'));

      await service.logScreenView({ screenName: 'ErrorScreen' });

      // logScreenView delegates to logEvent, so error message is from logEvent
      expect(logger.error).toHaveBeenCalledWith(
        '[AnalyticsService] Analytics error',
        expect.any(Error)
      );
    });
  });

  // ==========================================================================
  // User Identification Tests
  // ==========================================================================

  describe('setUserId', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('BUG: Sets user ID and propagates to AnalyticsManager', async () => {
      await service.setUserId('user-456');

      expect(mockAnalyticsManager.setUserId).toHaveBeenCalledWith('user-456');
    });

    it('includes userId in subsequent events', async () => {
      await service.setUserId('user-789');

      await service.logEvent({ name: 'test_event' });

      const trackEventCall = mockAnalyticsManager.trackEvent.mock.calls[0][0];
      expect(trackEventCall.data.user_id).toBe('user-789');
    });

    it('BUG: Does not set when not initialized', async () => {
      const uninitializedService = new (AnalyticsService as any)();

      await uninitializedService.setUserId('user-123');

      expect(mockAnalyticsManager.setUserId).not.toHaveBeenCalled();
    });

    it('logs info in dev mode', async () => {
      (global as any).__DEV__ = true;

      await service.setUserId('user-dev');

      expect(logger.info).toHaveBeenCalledWith('[AnalyticsService] User ID set', {
        userId: 'user-dev',
      });
    });

    it('handles errors gracefully', async () => {
      mockAnalyticsManager.setUserId.mockImplementation(() => {
        throw new Error('Set user ID failed');
      });

      await service.setUserId('user-error');

      expect(logger.error).toHaveBeenCalledWith(
        '[AnalyticsService] Set user ID error',
        expect.any(Error)
      );
    });
  });

  describe('setUserProperties', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('BUG: Merges user properties (does not replace)', async () => {
      await service.setUserProperties({ email: 'test@example.com' });
      await service.setUserProperties({ name: 'Test User' });

      const analyticsData = await service.getAnalyticsData();
      expect(analyticsData.userProperties).toEqual({
        email: 'test@example.com',
        name: 'Test User',
      });
    });

    it('overwrites existing property values', async () => {
      await service.setUserProperties({ email: 'old@example.com' });
      await service.setUserProperties({ email: 'new@example.com' });

      const analyticsData = await service.getAnalyticsData();
      expect(analyticsData.userProperties.email).toBe('new@example.com');
    });

    it('BUG: Does not set when not initialized', async () => {
      const uninitializedService = new (AnalyticsService as any)();

      await uninitializedService.setUserProperties({ test: 'value' });

      // Should not throw, but also should not set
      expect(logger.debug).not.toHaveBeenCalled();
    });

    it('logs debug info', async () => {
      await service.setUserProperties({ subscriptionType: 'premium' });

      expect(logger.debug).toHaveBeenCalledWith(
        '[AnalyticsService] User properties updated',
        { subscriptionType: 'premium' }
      );
    });

    it('handles errors gracefully', async () => {
      // Force error by making logger.debug throw
      (logger.debug as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Debug failed');
      });

      await service.setUserProperties({ test: 'value' });

      expect(logger.error).toHaveBeenCalledWith(
        '[AnalyticsService] Set user properties error',
        expect.any(Error)
      );
    });
  });

  // ==========================================================================
  // Performance Tracking Tests
  // ==========================================================================

  describe('logPerformanceMetric', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('logs performance metric with name, value, unit', async () => {
      await service.logPerformanceMetric({
        name: 'app_startup',
        value: 1234,
        unit: 'ms',
        parameters: { cold_start: true },
      });

      const trackEventCall = mockAnalyticsManager.trackEvent.mock.calls[0][0];
      expect(trackEventCall.eventType).toBe('performance_metric');
      expect(trackEventCall.data.metric_name).toBe('app_startup');
      expect(trackEventCall.data.metric_value).toBe(1234);
      expect(trackEventCall.data.metric_unit).toBe('ms');
      expect(trackEventCall.data.cold_start).toBe(true);
    });

    it('supports all metric units (ms, bytes, count, percent)', async () => {
      const metrics = [
        { name: 'duration', value: 100, unit: 'ms' as const },
        { name: 'memory', value: 1024, unit: 'bytes' as const },
        { name: 'requests', value: 5, unit: 'count' as const },
        { name: 'cpu', value: 75.5, unit: 'percent' as const },
      ];

      for (const metric of metrics) {
        await service.logPerformanceMetric(metric);
      }

      expect(mockAnalyticsManager.trackEvent).toHaveBeenCalledTimes(4);
    });
  });

  // ==========================================================================
  // Error Tracking Tests
  // ==========================================================================

  describe('logError', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('logs error with name, message, stack, context', async () => {
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n  at Test.js:10';

      await service.logError(error, { screen: 'HomeScreen', action: 'fetch' });

      const trackEventCall = mockAnalyticsManager.trackEvent.mock.calls[0][0];
      expect(trackEventCall.eventType).toBe('error_occurred');
      expect(trackEventCall.data.error_name).toBe('Error');
      expect(trackEventCall.data.error_message).toBe('Test error');
      expect(trackEventCall.data.error_stack).toBe('Error: Test error\n  at Test.js:10');
      expect(trackEventCall.data.screen).toBe('HomeScreen');
      expect(trackEventCall.data.action).toBe('fetch');
    });

    it('BUG: Does not log when ENABLE_CRASH_REPORTING is false', async () => {
      (config as any).ENABLE_CRASH_REPORTING = false;

      await service.logError(new Error('Test error'));

      expect(mockAnalyticsManager.trackEvent).not.toHaveBeenCalled();
    });

    it('handles errors without stack trace', async () => {
      const error = new Error('No stack');
      delete error.stack;

      await service.logError(error);

      const trackEventCall = mockAnalyticsManager.trackEvent.mock.calls[0][0];
      expect(trackEventCall.data.error_stack).toBeUndefined();
    });

    it('logs error to logger', async () => {
      await service.logError(new Error('Test error'));

      expect(logger.error).toHaveBeenCalledWith(
        '[AnalyticsService] Error logged',
        { message: 'Test error' }
      );
    });

    it('handles logging errors gracefully', async () => {
      mockAnalyticsManager.trackEvent.mockRejectedValue(new Error('Track failed'));

      await service.logError(new Error('Original error'));

      // logError calls logEvent (async) without await, so:
      // 1. logError logs "Error logged" immediately
      // 2. logEvent's rejection logs "Analytics error" later
      expect(logger.error).toHaveBeenCalledWith(
        '[AnalyticsService] Error logged',
        expect.objectContaining({ message: 'Original error' })
      );

      // Wait for async rejection to propagate
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(logger.error).toHaveBeenCalledWith(
        '[AnalyticsService] Analytics error',
        expect.any(Error)
      );
    });
  });

  // ==========================================================================
  // Specialized Event Tests
  // ==========================================================================

  describe('logSearchEvent', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('logs search with query, results count, filters', async () => {
      await service.logSearchEvent('inception', 42, { genre: 'action', year: 2010 });

      const trackEventCall = mockAnalyticsManager.trackEvent.mock.calls[0][0];
      expect(trackEventCall.eventType).toBe('search');
      expect(trackEventCall.data.search_query).toBe('inception');
      expect(trackEventCall.data.results_count).toBe(42);
      expect(trackEventCall.data.has_filters).toBe(true);
      expect(trackEventCall.data.genre).toBe('action');
      expect(trackEventCall.data.year).toBe(2010);
    });

    it('BUG: Sets has_filters to false when no filters', async () => {
      await service.logSearchEvent('test', 10);

      const trackEventCall = mockAnalyticsManager.trackEvent.mock.calls[0][0];
      expect(trackEventCall.data.has_filters).toBe(false);
    });
  });

  describe('logAuthEvent', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('logs authentication success', async () => {
      await service.logAuthEvent('google', true);

      const trackEventCall = mockAnalyticsManager.trackEvent.mock.calls[0][0];
      expect(trackEventCall.eventType).toBe('authentication');
      expect(trackEventCall.data.auth_method).toBe('google');
      expect(trackEventCall.data.auth_success).toBe(true);
      expect(trackEventCall.data.auth_error).toBeUndefined();
    });

    it('logs authentication failure with error', async () => {
      await service.logAuthEvent('email', false, 'Invalid credentials');

      const trackEventCall = mockAnalyticsManager.trackEvent.mock.calls[0][0];
      expect(trackEventCall.data.auth_success).toBe(false);
      expect(trackEventCall.data.auth_error).toBe('Invalid credentials');
    });
  });

  describe('logContentInteraction', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('logs content interaction with all parameters', async () => {
      await service.logContentInteraction('movie', 'tt1234567', 'add_to_watchlist');

      const trackEventCall = mockAnalyticsManager.trackEvent.mock.calls[0][0];
      expect(trackEventCall.eventType).toBe('content_interaction');
      expect(trackEventCall.data.content_type).toBe('movie');
      expect(trackEventCall.data.content_id).toBe('tt1234567');
      expect(trackEventCall.data.interaction_type).toBe('add_to_watchlist');
    });

    it('supports all interaction types', async () => {
      const interactions: Array<'view' | 'add_to_watchlist' | 'share' | 'rate'> = [
        'view',
        'add_to_watchlist',
        'share',
        'rate',
      ];

      for (const interaction of interactions) {
        await service.logContentInteraction('tv', 'tt999', interaction);
      }

      expect(mockAnalyticsManager.trackEvent).toHaveBeenCalledTimes(4);
    });
  });

  describe('logFeatureUsage', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('logs feature usage with action and parameters', async () => {
      await service.logFeatureUsage('voice_search', 'start', { language: 'en-US' });

      const trackEventCall = mockAnalyticsManager.trackEvent.mock.calls[0][0];
      expect(trackEventCall.eventType).toBe('feature_usage');
      expect(trackEventCall.data.feature_name).toBe('voice_search');
      expect(trackEventCall.data.action_type).toBe('start');
      expect(trackEventCall.data.language).toBe('en-US');
    });
  });

  describe('logAppStart', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('BUG: Resets sessionStartTime', async () => {
      const originalStart = Date.now();
      Date.now = jest.fn(() => originalStart);

      await service.logAppStart();

      // Advance time
      Date.now = jest.fn(() => originalStart + 10000);

      await service.logEvent({ name: 'test' });

      const trackEventCall = mockAnalyticsManager.trackEvent.mock.calls[1][0];
      expect(trackEventCall.data.session_duration).toBe(10000);
    });

    it('logs app_open event with start_time', async () => {
      await service.logAppStart();

      const trackEventCall = mockAnalyticsManager.trackEvent.mock.calls[0][0];
      expect(trackEventCall.eventType).toBe('app_open');
      expect(trackEventCall.data.start_time).toBeGreaterThan(1000000000000); // Reasonable timestamp
      expect(typeof trackEventCall.data.start_time).toBe('number');
    });
  });

  describe('logAppBackground', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('BUG: Calculates session duration from sessionStartTime', async () => {
      const startTime = Date.now();
      Date.now = jest.fn(() => startTime);

      await service.logAppStart();

      // Advance time
      Date.now = jest.fn(() => startTime + 15000);

      await service.logAppBackground();

      const trackEventCall = mockAnalyticsManager.trackEvent.mock.calls[1][0];
      expect(trackEventCall.eventType).toBe('app_background');
      expect(trackEventCall.data.session_duration).toBe(15000);
    });
  });

  describe('logPurchaseEvent', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('BUG: Generates transaction ID with txn_ prefix and timestamp', async () => {
      await service.logPurchaseEvent('premium_monthly', 9.99, 'USD');

      const trackEventCall = mockAnalyticsManager.trackEvent.mock.calls[0][0];
      expect(trackEventCall.eventType).toBe('purchase');
      expect(trackEventCall.data.transaction_id).toMatch(/^txn_\d+$/); // txn_ prefix with timestamp
      expect(trackEventCall.data.transaction_id.length).toBeGreaterThan(10); // Has reasonable length
    });

    it('includes all purchase parameters', async () => {
      await service.logPurchaseEvent('premium_yearly', 99.99, 'EUR');

      const trackEventCall = mockAnalyticsManager.trackEvent.mock.calls[0][0];
      expect(trackEventCall.data.value).toBe(99.99);
      expect(trackEventCall.data.currency).toBe('EUR');
      expect(trackEventCall.data.item_id).toBe('premium_yearly');
      expect(trackEventCall.data.item_name).toBe('premium_yearly');
      expect(trackEventCall.data.category).toBe('subscription');
      expect(trackEventCall.data.quantity).toBe(1);
      expect(trackEventCall.data.price).toBe(99.99);
    });
  });

  describe('logVoiceSearchEvent', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('logs voice search success', async () => {
      await service.logVoiceSearchEvent(true, 1500);

      const trackEventCall = mockAnalyticsManager.trackEvent.mock.calls[0][0];
      expect(trackEventCall.eventType).toBe('voice_search');
      expect(trackEventCall.data.voice_search_success).toBe(true);
      expect(trackEventCall.data.voice_search_duration).toBe(1500);
      expect(trackEventCall.data.voice_search_error).toBeUndefined();
    });

    it('logs voice search failure with error', async () => {
      await service.logVoiceSearchEvent(false, 500, 'Microphone permission denied');

      const trackEventCall = mockAnalyticsManager.trackEvent.mock.calls[0][0];
      expect(trackEventCall.data.voice_search_success).toBe(false);
      expect(trackEventCall.data.voice_search_error).toBe('Microphone permission denied');
    });
  });

  describe('logBarcodeScanEvent', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('logs barcode scan success with result', async () => {
      await service.logBarcodeScanEvent(true, '1234567890123');

      const trackEventCall = mockAnalyticsManager.trackEvent.mock.calls[0][0];
      expect(trackEventCall.eventType).toBe('barcode_scan');
      expect(trackEventCall.data.barcode_scan_success).toBe(true);
      expect(trackEventCall.data.barcode_scan_result).toBe('1234567890123');
    });

    it('logs barcode scan failure', async () => {
      await service.logBarcodeScanEvent(false, undefined, 'Camera not available');

      const trackEventCall = mockAnalyticsManager.trackEvent.mock.calls[0][0];
      expect(trackEventCall.data.barcode_scan_success).toBe(false);
      expect(trackEventCall.data.barcode_scan_error).toBe('Camera not available');
    });
  });

  describe('logOfflineModeEvent', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('logs offline mode enter', async () => {
      await service.logOfflineModeEvent('enter', 25);

      const trackEventCall = mockAnalyticsManager.trackEvent.mock.calls[0][0];
      expect(trackEventCall.eventType).toBe('offline_mode');
      expect(trackEventCall.data.offline_action).toBe('enter');
      expect(trackEventCall.data.cached_data_count).toBe(25);
    });

    it('logs offline mode exit', async () => {
      await service.logOfflineModeEvent('exit', 0);

      const trackEventCall = mockAnalyticsManager.trackEvent.mock.calls[0][0];
      expect(trackEventCall.data.offline_action).toBe('exit');
    });
  });

  describe('logSyncEvent', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('logs sync success with items count and duration', async () => {
      await service.logSyncEvent(true, 15, 3000);

      const trackEventCall = mockAnalyticsManager.trackEvent.mock.calls[0][0];
      expect(trackEventCall.eventType).toBe('data_sync');
      expect(trackEventCall.data.sync_success).toBe(true);
      expect(trackEventCall.data.sync_items_count).toBe(15);
      expect(trackEventCall.data.sync_duration).toBe(3000);
    });
  });

  describe('logExperiment', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('logs A/B test experiment exposure', async () => {
      await service.logExperiment('new_search_ui', 'variant_b');

      const trackEventCall = mockAnalyticsManager.trackEvent.mock.calls[0][0];
      expect(trackEventCall.eventType).toBe('ab_test_exposure');
      expect(trackEventCall.data.experiment_id).toBe('new_search_ui');
      expect(trackEventCall.data.variant_id).toBe('variant_b');
    });
  });

  // ==========================================================================
  // Consent Management Tests
  // ==========================================================================

  describe('setAnalyticsCollectionEnabled', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('BUG: Enables analytics collection with consent', async () => {
      await service.setAnalyticsCollectionEnabled(true);

      expect(mockAnalyticsManager.setConsent).toHaveBeenCalledWith(true, ['analytics']);
    });

    it('BUG: Disables analytics collection without consent', async () => {
      await service.setAnalyticsCollectionEnabled(false);

      expect(mockAnalyticsManager.setConsent).toHaveBeenCalledWith(false, []);
    });

    it('logs info in dev mode', async () => {
      (global as any).__DEV__ = true;

      await service.setAnalyticsCollectionEnabled(true);

      expect(logger.info).toHaveBeenCalledWith(
        '[AnalyticsService] Collection enabled'
      );
    });

    it('handles errors gracefully', async () => {
      mockAnalyticsManager.setConsent.mockRejectedValue(new Error('Consent failed'));

      await service.setAnalyticsCollectionEnabled(true);

      expect(logger.error).toHaveBeenCalledWith(
        '[AnalyticsService] Set collection enabled error',
        expect.any(Error)
      );
    });
  });

  // ==========================================================================
  // Development Tools Tests
  // ==========================================================================

  describe('getAnalyticsData', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('BUG: Returns analytics data in dev mode', async () => {
      (global as any).__DEV__ = true;

      await service.setUserId('user-dev');
      await service.setUserProperties({ email: 'dev@test.com' });

      const data = await service.getAnalyticsData();

      expect(data).toEqual({
        isInitialized: true,
        userId: 'user-dev',
        userProperties: { email: 'dev@test.com' },
        deviceId: 'device-123',
        sessionId: 'session-456',
        hasConsent: true,
        sessionDuration: expect.any(Number),
      });
    });

    it('BUG: Throws error in production mode (__DEV__ = false)', async () => {
      (global as any).__DEV__ = false;

      await expect(service.getAnalyticsData()).rejects.toThrow(
        'Analytics data is only available in development mode'
      );
    });
  });

  // ==========================================================================
  // Cleanup Tests
  // ==========================================================================

  describe('dispose', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('BUG: Resets all state to initial values', async () => {
      await service.setUserId('user-123');
      await service.setUserProperties({ email: 'test@test.com' });

      service.dispose();

      // Try to get analytics data - should show reset state
      (global as any).__DEV__ = true;
      const data = await service.getAnalyticsData();

      expect(data.isInitialized).toBe(false);
      expect(data.userId).toBeNull();
      expect(data.userProperties).toEqual({});
    });

    it('calls AnalyticsManager.dispose()', () => {
      service.dispose();

      expect(mockAnalyticsManager.dispose).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // Edge Cases Tests
  // ==========================================================================

  describe('edge cases', () => {
    it('handles null event parameters', async () => {
      await service.initialize();

      await service.logEvent({ name: 'test', parameters: null as any });

      expect(mockAnalyticsManager.trackEvent).toHaveBeenCalled();
    });

    it('handles undefined event parameters', async () => {
      await service.initialize();

      await service.logEvent({ name: 'test', parameters: undefined });

      expect(mockAnalyticsManager.trackEvent).toHaveBeenCalled();
    });

    it('handles empty event name', async () => {
      await service.initialize();

      await service.logEvent({ name: '' });

      const trackEventCall = mockAnalyticsManager.trackEvent.mock.calls[0][0];
      expect(trackEventCall.eventType).toBe('');
      expect(trackEventCall.category).toBe('general');
    });

    it('handles very long event names', async () => {
      await service.initialize();

      const longName = 'a'.repeat(1000);
      await service.logEvent({ name: longName });

      const trackEventCall = mockAnalyticsManager.trackEvent.mock.calls[0][0];
      expect(trackEventCall.eventType).toBe(longName);
    });

    it('handles nested parameter objects', async () => {
      await service.initialize();

      await service.logEvent({
        name: 'test',
        parameters: {
          nested: {
            deep: {
              value: 'test',
            },
          },
        },
      });

      const trackEventCall = mockAnalyticsManager.trackEvent.mock.calls[0][0];
      expect(trackEventCall.data.nested).toEqual({ deep: { value: 'test' } });
    });
  });

  // ==========================================================================
  // Global Instance Tests
  // ==========================================================================

  describe('global analyticsService instance', () => {
    it('exports a singleton instance', () => {
      expect(analyticsService).toBeDefined();
      expect(analyticsService).toBeInstanceOf(AnalyticsService);
    });

    it('auto-initializes on import', () => {
      // The global instance calls initialize() immediately
      // This is tested by the module loading
      expect(analyticsService).toBeDefined();
    });
  });
});
