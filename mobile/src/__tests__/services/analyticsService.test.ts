/**
 * AnalyticsService Integration Tests
 *
 * Tests the analytics service that wraps AnalyticsManager for event tracking.
 * Focuses on testing business logic, event categorization, and manager integration.
 */

import { Platform } from 'react-native';
import { AnalyticsService } from '../../services/analytics/AnalyticsService';
import { AnalyticsManager } from '../../services/analytics/AnalyticsManager';
import { config } from '../../config/environment';
import { logger } from '../../utils/logger';

// Mock dependencies
jest.mock('../../services/analytics/AnalyticsManager');
jest.mock('../../utils/logger');
jest.mock('../../config/environment', () => ({
  config: {
    ENABLE_ANALYTICS: true,
    ENABLE_CRASH_REPORTING: true,
  },
}));

describe('AnalyticsService Integration Tests', () => {
  let service: AnalyticsService;
  let mockAnalyticsManager: jest.Mocked<AnalyticsManager>;

  beforeAll(() => {
    // Use real timers - AnalyticsService may use setTimeout internally
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock AnalyticsManager singleton
    mockAnalyticsManager = {
      initialize: jest.fn().mockResolvedValue(undefined),
      trackEvent: jest.fn().mockResolvedValue(undefined),
      setUserId: jest.fn(),
      getDeviceId: jest.fn().mockReturnValue('device-123'),
      getSessionId: jest.fn().mockReturnValue('session-456'),
      hasUserConsent: jest.fn().mockReturnValue(true),
      setConsent: jest.fn().mockResolvedValue(undefined),
      dispose: jest.fn(),
    } as any;

    (AnalyticsManager.getInstance as jest.Mock).mockReturnValue(mockAnalyticsManager);

    // Create new service instance
    service = new AnalyticsService();
  });

  describe('Initialization', () => {
    it('should initialize successfully when analytics enabled', async () => {
      await service.initialize();

      expect(mockAnalyticsManager.initialize).toHaveBeenCalledTimes(1);
      expect(logger.info).toHaveBeenCalledWith(
        '[AnalyticsService] Initialized with AnalyticsManager'
      );
    });

    it('should not initialize if already initialized', async () => {
      await service.initialize();
      await service.initialize();

      expect(mockAnalyticsManager.initialize).toHaveBeenCalledTimes(1);
    });

    it('should not initialize if analytics disabled', async () => {
      (config.ENABLE_ANALYTICS as any) = false;

      await service.initialize();

      expect(mockAnalyticsManager.initialize).not.toHaveBeenCalled();

      // Reset
      (config.ENABLE_ANALYTICS as any) = true;
    });

    it('should handle initialization errors gracefully', async () => {
      mockAnalyticsManager.initialize.mockRejectedValueOnce(new Error('Init failed'));

      await service.initialize();

      expect(logger.error).toHaveBeenCalledWith(
        '[AnalyticsService] Analytics initialization error',
        expect.any(Error)
      );
    });
  });

  describe('Event Tracking', () => {
    beforeEach(async () => {
      await service.initialize();
      jest.clearAllMocks();
    });

    it('should log event with all parameters', async () => {
      const event = {
        name: 'test_event',
        parameters: { key: 'value', count: 42 },
        userId: 'user-123',
      };

      await service.logEvent(event);

      expect(mockAnalyticsManager.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          timestamp: expect.any(Number),
          eventType: 'test_event',
          category: 'general',
          source: 'analytics',
          data: expect.objectContaining({
            key: 'value',
            count: 42,
            timestamp: expect.any(Number),
            platform: Platform.OS,
            os_version: Platform.Version,
          }),
          retryCount: 0,
        })
      );
    });

    it('should not log event if not initialized', async () => {
      const uninitializedService = new AnalyticsService();

      await uninitializedService.logEvent({ name: 'test' });

      expect(mockAnalyticsManager.trackEvent).not.toHaveBeenCalled();
    });

    it('should handle event logging errors gracefully', async () => {
      mockAnalyticsManager.trackEvent.mockRejectedValueOnce(new Error('Track failed'));

      await service.logEvent({ name: 'test_event' });

      expect(logger.error).toHaveBeenCalledWith(
        '[AnalyticsService] Analytics error',
        expect.any(Error)
      );
    });

    it('should calculate session duration in event data', async () => {
      await service.logAppStart();

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 50));

      await service.logEvent({ name: 'test_event' });

      const trackCall = mockAnalyticsManager.trackEvent.mock.calls[1][0];
      expect(trackCall.data.session_duration).toBeGreaterThan(0);
    });
  });

  describe('Event Categorization', () => {
    beforeEach(async () => {
      await service.initialize();
      jest.clearAllMocks();
    });

    it('should categorize screen_view events as navigation', async () => {
      await service.logEvent({ name: 'screen_view' });

      expect(mockAnalyticsManager.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'navigation' })
      );
    });

    it('should categorize error events', async () => {
      await service.logEvent({ name: 'error_occurred' });

      expect(mockAnalyticsManager.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'error' })
      );
    });

    it('should categorize search events', async () => {
      await service.logEvent({ name: 'search_query' });

      expect(mockAnalyticsManager.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'search' })
      );
    });

    it('should categorize auth events', async () => {
      await service.logEvent({ name: 'auth_login' });

      expect(mockAnalyticsManager.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'auth' })
      );
    });

    it('should categorize content events', async () => {
      await service.logEvent({ name: 'content_view' });

      expect(mockAnalyticsManager.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'content' })
      );
    });

    it('should categorize purchase events as commerce', async () => {
      await service.logEvent({ name: 'purchase_complete' });

      expect(mockAnalyticsManager.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'commerce' })
      );
    });

    it('should categorize performance events', async () => {
      await service.logEvent({ name: 'performance_issue' });

      expect(mockAnalyticsManager.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'performance' })
      );
    });

    it('should categorize app lifecycle events', async () => {
      await service.logEvent({ name: 'app_open' });

      expect(mockAnalyticsManager.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'lifecycle' })
      );
    });

    it('should default to general category', async () => {
      await service.logEvent({ name: 'unknown_event' });

      expect(mockAnalyticsManager.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'general' })
      );
    });
  });

  describe('Screen Tracking', () => {
    beforeEach(async () => {
      await service.initialize();
      jest.clearAllMocks();
    });

    it('should log screen view with all fields', async () => {
      await service.logScreenView({
        screenName: 'HomeScreen',
        screenClass: 'HomeScreenClass',
        parameters: { tab: 'trending' },
      });

      expect(mockAnalyticsManager.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'screen_view',
          category: 'navigation',
          data: expect.objectContaining({
            screen_name: 'HomeScreen',
            screen_class: 'HomeScreenClass',
            tab: 'trending',
          }),
        })
      );
    });

    it('should use screen name as screen class if not provided', async () => {
      await service.logScreenView({ screenName: 'ProfileScreen' });

      const trackCall = mockAnalyticsManager.trackEvent.mock.calls[0][0];
      expect(trackCall.data.screen_name).toBe('ProfileScreen');
      expect(trackCall.data.screen_class).toBe('ProfileScreen');
    });

    it('should not log screen view if not initialized', async () => {
      const uninitializedService = new AnalyticsService();

      await uninitializedService.logScreenView({ screenName: 'Test' });

      expect(mockAnalyticsManager.trackEvent).not.toHaveBeenCalled();
    });

    it('should handle screen view errors gracefully', async () => {
      mockAnalyticsManager.trackEvent.mockRejectedValueOnce(new Error('Failed'));

      await service.logScreenView({ screenName: 'ErrorScreen' });

      // Error is caught in logEvent() try-catch, not logScreenView()
      expect(logger.error).toHaveBeenCalledWith(
        '[AnalyticsService] Analytics error',
        expect.any(Error)
      );
    });
  });

  describe('User Identification', () => {
    beforeEach(async () => {
      await service.initialize();
      jest.clearAllMocks();
    });

    it('should set user ID in both service and manager', async () => {
      await service.setUserId('user-789');

      expect(mockAnalyticsManager.setUserId).toHaveBeenCalledWith('user-789');
      expect(logger.info).toHaveBeenCalledWith(
        '[AnalyticsService] User ID set',
        { userId: 'user-789' }
      );
    });

    it('should not set user ID if not initialized', async () => {
      const uninitializedService = new AnalyticsService();

      await uninitializedService.setUserId('user-123');

      expect(mockAnalyticsManager.setUserId).not.toHaveBeenCalled();
    });

    it('should handle set user ID errors gracefully', async () => {
      mockAnalyticsManager.setUserId.mockImplementationOnce(() => {
        throw new Error('Set user ID failed');
      });

      await service.setUserId('user-789');

      expect(logger.error).toHaveBeenCalledWith(
        '[AnalyticsService] Set user ID error',
        expect.any(Error)
      );
    });

    it('should set user properties', async () => {
      await service.setUserProperties({
        email: 'test@example.com',
        name: 'Test User',
        subscriptionType: 'premium',
      });

      expect(logger.debug).toHaveBeenCalledWith(
        '[AnalyticsService] User properties updated',
        expect.objectContaining({
          email: 'test@example.com',
          name: 'Test User',
        })
      );
    });

    it('should merge user properties on multiple calls', async () => {
      await service.setUserProperties({ email: 'test@example.com' });
      await service.setUserProperties({ name: 'Test User' });

      // Both properties should be stored
      expect(logger.debug).toHaveBeenCalledTimes(2);
    });

    it('should handle set user properties errors gracefully', async () => {
      // Force error by passing invalid data
      const originalDebug = logger.debug;
      (logger.debug as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Failed');
      });

      await service.setUserProperties({ email: 'test@example.com' });

      expect(logger.error).toHaveBeenCalled();

      // Restore
      logger.debug = originalDebug;
    });
  });

  describe('Performance Tracking', () => {
    beforeEach(async () => {
      await service.initialize();
      jest.clearAllMocks();
    });

    it('should log performance metric', async () => {
      await service.logPerformanceMetric({
        name: 'api_response_time',
        value: 250,
        unit: 'ms',
        parameters: { endpoint: '/api/users' },
      });

      expect(mockAnalyticsManager.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'performance_metric',
          data: expect.objectContaining({
            metric_name: 'api_response_time',
            metric_value: 250,
            metric_unit: 'ms',
            endpoint: '/api/users',
          }),
        })
      );
    });

    it('should handle different metric units', async () => {
      const units: Array<'ms' | 'bytes' | 'count' | 'percent'> = ['ms', 'bytes', 'count', 'percent'];

      for (const unit of units) {
        await service.logPerformanceMetric({
          name: `test_metric_${unit}`,
          value: 100,
          unit,
        });
      }

      expect(mockAnalyticsManager.trackEvent).toHaveBeenCalledTimes(4);
    });
  });

  describe('Error Tracking', () => {
    beforeEach(async () => {
      await service.initialize();
      jest.clearAllMocks();
    });

    it('should log error with stack trace', async () => {
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n  at test.ts:10';

      service.logError(error);

      expect(mockAnalyticsManager.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'error_occurred',
          data: expect.objectContaining({
            error_name: 'Error',
            error_message: 'Test error',
            error_stack: expect.stringContaining('Error: Test error'),
          }),
        })
      );
    });

    it('should log error with additional context', async () => {
      const error = new Error('API failed');
      const context = { endpoint: '/api/users', statusCode: 500 };

      service.logError(error, context);

      const trackCall = mockAnalyticsManager.trackEvent.mock.calls[0][0];
      expect(trackCall.data.endpoint).toBe('/api/users');
      expect(trackCall.data.statusCode).toBe(500);
    });

    it('should not log error if crash reporting disabled', async () => {
      (config.ENABLE_CRASH_REPORTING as any) = false;

      service.logError(new Error('Test'));

      expect(mockAnalyticsManager.trackEvent).not.toHaveBeenCalled();

      // Reset
      (config.ENABLE_CRASH_REPORTING as any) = true;
    });

    it('should handle error logging failures gracefully', async () => {
      mockAnalyticsManager.trackEvent.mockImplementationOnce(() => {
        throw new Error('Logging failed');
      });

      service.logError(new Error('Original error'));

      // First call is the error from trackEvent failure
      expect(logger.error).toHaveBeenCalledWith(
        '[AnalyticsService] Analytics error',
        expect.any(Error)
      );
    });
  });

  describe('Search Analytics', () => {
    beforeEach(async () => {
      await service.initialize();
      jest.clearAllMocks();
    });

    it('should log search event with query and results', async () => {
      await service.logSearchEvent('inception', 42);

      expect(mockAnalyticsManager.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'search',
          data: expect.objectContaining({
            search_query: 'inception',
            results_count: 42,
            has_filters: false,
          }),
        })
      );
    });

    it('should log search event with filters', async () => {
      await service.logSearchEvent('action movies', 15, {
        genre: 'action',
        year: 2023,
      });

      const trackCall = mockAnalyticsManager.trackEvent.mock.calls[0][0];
      expect(trackCall.data.has_filters).toBe(true);
      expect(trackCall.data.genre).toBe('action');
      expect(trackCall.data.year).toBe(2023);
    });
  });

  describe('Authentication Analytics', () => {
    beforeEach(async () => {
      await service.initialize();
      jest.clearAllMocks();
    });

    it('should log successful auth event', async () => {
      await service.logAuthEvent('google', true);

      expect(mockAnalyticsManager.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'authentication',
          data: expect.objectContaining({
            auth_method: 'google',
            auth_success: true,
          }),
        })
      );
    });

    it('should log failed auth event with error', async () => {
      await service.logAuthEvent('email', false, 'Invalid credentials');

      const trackCall = mockAnalyticsManager.trackEvent.mock.calls[0][0];
      expect(trackCall.data.auth_success).toBe(false);
      expect(trackCall.data.auth_error).toBe('Invalid credentials');
    });
  });

  describe('Content Interaction Analytics', () => {
    beforeEach(async () => {
      await service.initialize();
      jest.clearAllMocks();
    });

    it('should log movie view interaction', async () => {
      await service.logContentInteraction('movie', 'movie-123', 'view');

      expect(mockAnalyticsManager.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'content_interaction',
          data: expect.objectContaining({
            content_type: 'movie',
            content_id: 'movie-123',
            interaction_type: 'view',
          }),
        })
      );
    });

    it('should log TV series add to watchlist', async () => {
      await service.logContentInteraction('tv', 'tv-456', 'add_to_watchlist');

      const trackCall = mockAnalyticsManager.trackEvent.mock.calls[0][0];
      expect(trackCall.data.content_type).toBe('tv');
      expect(trackCall.data.interaction_type).toBe('add_to_watchlist');
    });

    it('should log all interaction types', async () => {
      const interactions: Array<'view' | 'add_to_watchlist' | 'share' | 'rate'> = [
        'view',
        'add_to_watchlist',
        'share',
        'rate',
      ];

      for (const interaction of interactions) {
        await service.logContentInteraction('movie', 'movie-123', interaction);
      }

      expect(mockAnalyticsManager.trackEvent).toHaveBeenCalledTimes(4);
    });
  });

  describe('Feature Usage Analytics', () => {
    beforeEach(async () => {
      await service.initialize();
      jest.clearAllMocks();
    });

    it('should log feature usage with parameters', async () => {
      await service.logFeatureUsage('watchlist', 'create', { name: 'My List' });

      expect(mockAnalyticsManager.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'feature_usage',
          data: expect.objectContaining({
            feature_name: 'watchlist',
            action_type: 'create',
            name: 'My List',
          }),
        })
      );
    });

    it('should log feature usage without parameters', async () => {
      await service.logFeatureUsage('filter', 'apply');

      const trackCall = mockAnalyticsManager.trackEvent.mock.calls[0][0];
      expect(trackCall.data.feature_name).toBe('filter');
      expect(trackCall.data.action_type).toBe('apply');
    });
  });

  describe('App Lifecycle Analytics', () => {
    beforeEach(async () => {
      await service.initialize();
      jest.clearAllMocks();
    });

    it('should log app start and track session time', async () => {
      await service.logAppStart();

      expect(mockAnalyticsManager.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'app_open',
          data: expect.objectContaining({
            start_time: expect.any(Number),
          }),
        })
      );
    });

    it('should log app background with session duration', async () => {
      await service.logAppStart();

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 50));

      await service.logAppBackground();

      const trackCall = mockAnalyticsManager.trackEvent.mock.calls[1][0];
      expect(trackCall.eventType).toBe('app_background');
      expect(trackCall.data.session_duration).toBeGreaterThan(0);
    });
  });

  describe('E-commerce Analytics', () => {
    beforeEach(async () => {
      await service.initialize();
      jest.clearAllMocks();
    });

    it('should log purchase event with all fields', async () => {
      await service.logPurchaseEvent('premium_monthly', 9.99, 'USD');

      expect(mockAnalyticsManager.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'purchase',
          data: expect.objectContaining({
            transaction_id: expect.stringContaining('txn_'),
            value: 9.99,
            currency: 'USD',
            item_id: 'premium_monthly',
            item_name: 'premium_monthly',
            category: 'subscription',
            quantity: 1,
            price: 9.99,
          }),
        })
      );
    });

    it('should generate unique transaction IDs', async () => {
      await service.logPurchaseEvent('plan_1', 9.99, 'USD');

      // Wait 1ms to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 2));

      await service.logPurchaseEvent('plan_2', 19.99, 'USD');

      const tx1 = mockAnalyticsManager.trackEvent.mock.calls[0][0].data.transaction_id;
      const tx2 = mockAnalyticsManager.trackEvent.mock.calls[1][0].data.transaction_id;

      expect(tx1).not.toBe(tx2);
    });
  });

  describe('Custom Analytics', () => {
    beforeEach(async () => {
      await service.initialize();
      jest.clearAllMocks();
    });

    it('should log voice search event', async () => {
      await service.logVoiceSearchEvent(true, 1500);

      expect(mockAnalyticsManager.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'voice_search',
          data: expect.objectContaining({
            voice_search_success: true,
            voice_search_duration: 1500,
          }),
        })
      );
    });

    it('should log failed voice search with error', async () => {
      await service.logVoiceSearchEvent(false, 0, 'Microphone permission denied');

      const trackCall = mockAnalyticsManager.trackEvent.mock.calls[0][0];
      expect(trackCall.data.voice_search_error).toBe('Microphone permission denied');
    });

    it('should log barcode scan event', async () => {
      await service.logBarcodeScanEvent(true, '12345678');

      expect(mockAnalyticsManager.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'barcode_scan',
          data: expect.objectContaining({
            barcode_scan_success: true,
            barcode_scan_result: '12345678',
          }),
        })
      );
    });

    it('should log offline mode enter/exit', async () => {
      await service.logOfflineModeEvent('enter', 15);
      await service.logOfflineModeEvent('exit', 15);

      expect(mockAnalyticsManager.trackEvent).toHaveBeenCalledTimes(2);

      const enterCall = mockAnalyticsManager.trackEvent.mock.calls[0][0];
      expect(enterCall.data.offline_action).toBe('enter');
      expect(enterCall.data.cached_data_count).toBe(15);
    });

    it('should log sync event', async () => {
      await service.logSyncEvent(true, 42, 3000);

      expect(mockAnalyticsManager.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'data_sync',
          data: expect.objectContaining({
            sync_success: true,
            sync_items_count: 42,
            sync_duration: 3000,
          }),
        })
      );
    });
  });

  describe('A/B Testing Analytics', () => {
    beforeEach(async () => {
      await service.initialize();
      jest.clearAllMocks();
    });

    it('should log experiment exposure', async () => {
      await service.logExperiment('onboarding_v2', 'variant_b');

      expect(mockAnalyticsManager.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'ab_test_exposure',
          data: expect.objectContaining({
            experiment_id: 'onboarding_v2',
            variant_id: 'variant_b',
          }),
        })
      );
    });
  });

  describe('Analytics Data Debugging', () => {
    beforeEach(async () => {
      await service.initialize();
      jest.clearAllMocks();
    });

    it('should get analytics data in development mode', async () => {
      const originalDev = __DEV__;
      (global as any).__DEV__ = true;

      await service.setUserId('user-123');

      const data = await service.getAnalyticsData();

      expect(data).toEqual({
        isInitialized: true,
        userId: 'user-123',
        userProperties: expect.any(Object),
        deviceId: 'device-123',
        sessionId: 'session-456',
        hasConsent: true,
        sessionDuration: expect.any(Number),
      });

      (global as any).__DEV__ = originalDev;
    });

    it('should throw error in production mode', async () => {
      const originalDev = __DEV__;
      (global as any).__DEV__ = false;

      await expect(service.getAnalyticsData()).rejects.toThrow(
        'Analytics data is only available in development mode'
      );

      (global as any).__DEV__ = originalDev;
    });
  });

  describe('Analytics Collection Control', () => {
    beforeEach(async () => {
      await service.initialize();
      jest.clearAllMocks();
    });

    it('should enable analytics collection', async () => {
      await service.setAnalyticsCollectionEnabled(true);

      expect(mockAnalyticsManager.setConsent).toHaveBeenCalledWith(true, ['analytics']);
      expect(logger.info).toHaveBeenCalledWith(
        '[AnalyticsService] Collection enabled'
      );
    });

    it('should disable analytics collection', async () => {
      await service.setAnalyticsCollectionEnabled(false);

      expect(mockAnalyticsManager.setConsent).toHaveBeenCalledWith(false, []);
      expect(logger.info).toHaveBeenCalledWith(
        '[AnalyticsService] Collection disabled'
      );
    });

    it('should handle set consent errors gracefully', async () => {
      mockAnalyticsManager.setConsent.mockRejectedValueOnce(new Error('Failed'));

      await service.setAnalyticsCollectionEnabled(true);

      expect(logger.error).toHaveBeenCalledWith(
        '[AnalyticsService] Set collection enabled error',
        expect.any(Error)
      );
    });
  });

  describe('Cleanup', () => {
    beforeEach(async () => {
      await service.initialize();
      jest.clearAllMocks();
    });

    it('should dispose and reset all state', () => {
      service.dispose();

      expect(mockAnalyticsManager.dispose).toHaveBeenCalled();
    });

    it('should not track events after dispose', async () => {
      service.dispose();

      await service.logEvent({ name: 'test' });

      expect(mockAnalyticsManager.trackEvent).not.toHaveBeenCalled();
    });
  });
});
