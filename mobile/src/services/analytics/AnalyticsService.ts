/**
 * Analytics Service
 *
 * Provides analytics tracking for the mobile app.
 * Now integrated with AnalyticsManager for unified backend sync.
 */
import { Platform } from 'react-native';
import { config } from '../../config/environment';
import { AnalyticsManager } from './AnalyticsManager';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger';

export interface AnalyticsEvent {
  name: string;
  parameters?: Record<string, unknown>;
  userId?: string;
}

export interface UserProperties {
  userId?: string;
  email?: string;
  name?: string;
  createdAt?: string;
  subscriptionType?: string;
  preferences?: Record<string, unknown>;
}

export interface ScreenViewEvent {
  screenName: string;
  screenClass?: string;
  parameters?: Record<string, unknown>;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percent';
  parameters?: Record<string, unknown>;
}

export class AnalyticsService {
  private isInitialized = false;
  private userId: string | null = null;
  private userProperties: UserProperties = {};
  private analyticsManager: AnalyticsManager;
  private sessionStartTime: number = Date.now();

  constructor() {
    this.analyticsManager = AnalyticsManager.getInstance();
  }

  initialize = async () => {
    if (this.isInitialized || !config.ENABLE_ANALYTICS) {
      return;
    }

    try {
      // Initialize AnalyticsManager for unified backend sync
      await this.analyticsManager.initialize();
      this.isInitialized = true;

      if (__DEV__) {
        logger.info('[AnalyticsService] Initialized with AnalyticsManager');
      }
    } catch (error) {
      logger.error('[AnalyticsService] Analytics initialization error', error);
    }
  };

  // Event tracking
  logEvent = async (event: AnalyticsEvent) => {
    if (!this.isInitialized) {
      return;
    }

    try {
      const eventParams = {
        ...event.parameters,
        timestamp: Date.now(),
        user_id: this.userId,
        session_duration: Date.now() - this.sessionStartTime,
        platform: Platform.OS,
        os_version: Platform.Version,
      };

      // Map event name to category
      const category = this.mapEventToCategory(event.name);

      // Send to AnalyticsManager for backend sync
      await this.analyticsManager.trackEvent({
        id: uuidv4(),
        timestamp: Date.now(),
        eventType: event.name,
        category,
        source: 'analytics',
        data: eventParams,
        retryCount: 0,
      });

      if (__DEV__) {
        logger.debug(`[AnalyticsService] ${event.name}`, eventParams);
      }
    } catch (error) {
      logger.error('[AnalyticsService] Analytics error', error);
    }
  };

  /**
   * Map event names to analytics categories
   */
  private mapEventToCategory(eventName: string): string {
    // Map event types to categories for backend classification
    if (eventName.includes('screen_view')) {
      return 'navigation';
    }
    if (eventName.includes('error')) {
      return 'error';
    }
    if (eventName.includes('search')) {
      return 'search';
    }
    if (eventName.includes('auth')) {
      return 'auth';
    }
    if (eventName.includes('content')) {
      return 'content';
    }
    if (eventName.includes('purchase')) {
      return 'commerce';
    }
    if (eventName.includes('performance')) {
      return 'performance';
    }
    if (eventName.includes('app_')) {
      return 'lifecycle';
    }
    return 'general';
  }

  // Screen tracking
  logScreenView = async (screenView: ScreenViewEvent) => {
    if (!this.isInitialized) {return;}

    try {
      // Log as custom event
      await this.logEvent({
        name: 'screen_view',
        parameters: {
          screen_name: screenView.screenName,
          screen_class: screenView.screenClass || screenView.screenName,
          ...screenView.parameters,
        },
      });
    } catch (error) {
      logger.error('[AnalyticsService] Screen view error', error);
    }
  };

  // User identification
  setUserId = async (userId: string) => {
    if (!this.isInitialized) {return;}

    try {
      this.userId = userId;
      await this.analyticsManager.setUserId(userId);

      if (__DEV__) {
        logger.info('[AnalyticsService] User ID set', { userId });
      }
    } catch (error) {
      logger.error('[AnalyticsService] Set user ID error', error);
    }
  };

  setUserProperties = async (properties: UserProperties) => {
    if (!this.isInitialized) {return;}

    try {
      this.userProperties = { ...this.userProperties, ...properties };
      logger.debug('[AnalyticsService] User properties updated', properties);
    } catch (error) {
      logger.error('[AnalyticsService] Set user properties error', error);
    }
  };

  // Performance tracking
  logPerformanceMetric = async (metric: PerformanceMetric) => {
    await this.logEvent({
      name: 'performance_metric',
      parameters: {
        metric_name: metric.name,
        metric_value: metric.value,
        metric_unit: metric.unit,
        ...metric.parameters,
      },
    });
  };

  // Error tracking
  logError = (error: Error, context?: Record<string, unknown>) => {
    if (!config.ENABLE_CRASH_REPORTING) {return;}

    try {
      // Log error event to Analytics
      this.logEvent({
        name: 'error_occurred',
        parameters: {
          error_name: error.name,
          error_message: error.message,
          error_stack: error.stack,
          ...context,
        },
      });

      logger.error('[AnalyticsService] Error logged', { message: error.message });
    } catch (_e) {
      logger.error('[AnalyticsService] Failed to log error', _e);
    }
  };

  // Search analytics
  logSearchEvent = async (query: string, resultsCount: number, filters?: Record<string, unknown>) => {
    await this.logEvent({
      name: 'search',
      parameters: {
        search_query: query,
        results_count: resultsCount,
        has_filters: !!filters,
        ...filters,
      },
    });
  };

  // Authentication analytics
  logAuthEvent = async (method: string, success: boolean, error?: string) => {
    await this.logEvent({
      name: 'authentication',
      parameters: {
        auth_method: method,
        auth_success: success,
        auth_error: error,
      },
    });
  };

  // Content interaction analytics
  logContentInteraction = async (
    contentType: 'movie' | 'tv',
    contentId: string,
    interaction: 'view' | 'add_to_watchlist' | 'share' | 'rate',
  ) => {
    await this.logEvent({
      name: 'content_interaction',
      parameters: {
        content_type: contentType,
        content_id: contentId,
        interaction_type: interaction,
      },
    });
  };

  // Feature usage analytics
  logFeatureUsage = async (featureName: string, action: string, parameters?: Record<string, unknown>) => {
    await this.logEvent({
      name: 'feature_usage',
      parameters: {
        feature_name: featureName,
        action_type: action,
        ...parameters,
      },
    });
  };

  // App lifecycle analytics
  logAppStart = async () => {
    this.sessionStartTime = Date.now();

    await this.logEvent({
      name: 'app_open',
      parameters: {
        start_time: this.sessionStartTime,
      },
    });
  };

  logAppBackground = async () => {
    const sessionDuration = Date.now() - this.sessionStartTime;

    await this.logEvent({
      name: 'app_background',
      parameters: {
        session_duration: sessionDuration,
      },
    });
  };

  // E-commerce analytics (for future subscription features)
  logPurchaseEvent = async (productId: string, price: number, currency: string) => {
    await this.logEvent({
      name: 'purchase',
      parameters: {
        transaction_id: `txn_${Date.now()}`,
        value: price,
        currency,
        item_id: productId,
        item_name: productId,
        category: 'subscription',
        quantity: 1,
        price,
      },
    });
  };

  // Custom analytics for specific app features
  logVoiceSearchEvent = async (success: boolean, duration: number, error?: string) => {
    await this.logEvent({
      name: 'voice_search',
      parameters: {
        voice_search_success: success,
        voice_search_duration: duration,
        voice_search_error: error,
      },
    });
  };

  logBarcodeScanEvent = async (success: boolean, scanResult?: string, error?: string) => {
    await this.logEvent({
      name: 'barcode_scan',
      parameters: {
        barcode_scan_success: success,
        barcode_scan_result: scanResult,
        barcode_scan_error: error,
      },
    });
  };

  logOfflineModeEvent = async (action: 'enter' | 'exit', cachedDataCount: number) => {
    await this.logEvent({
      name: 'offline_mode',
      parameters: {
        offline_action: action,
        cached_data_count: cachedDataCount,
      },
    });
  };

  logSyncEvent = async (success: boolean, syncedItems: number, duration: number) => {
    await this.logEvent({
      name: 'data_sync',
      parameters: {
        sync_success: success,
        sync_items_count: syncedItems,
        sync_duration: duration,
      },
    });
  };

  // A/B testing analytics
  logExperiment = async (experimentId: string, variantId: string) => {
    await this.logEvent({
      name: 'ab_test_exposure',
      parameters: {
        experiment_id: experimentId,
        variant_id: variantId,
      },
    });
  };

  // Get analytics data for debugging (development only)
  getAnalyticsData = async () => {
    if (!__DEV__) {
      throw new Error('Analytics data is only available in development mode');
    }

    return {
      isInitialized: this.isInitialized,
      userId: this.userId,
      userProperties: this.userProperties,
      deviceId: this.analyticsManager.getDeviceId(),
      sessionId: this.analyticsManager.getSessionId(),
      hasConsent: this.analyticsManager.hasUserConsent(),
      sessionDuration: Date.now() - this.sessionStartTime,
    };
  };

  // Enable/disable analytics collection
  setAnalyticsCollectionEnabled = async (enabled: boolean) => {
    try {
      // Update consent in AnalyticsManager
      await this.analyticsManager.setConsent(enabled, enabled ? ['analytics'] : []);

      if (__DEV__) {
        logger.info(`[AnalyticsService] Collection ${enabled ? 'enabled' : 'disabled'}`);
      }
    } catch (error) {
      logger.error('[AnalyticsService] Set collection enabled error', error);
    }
  };

  /**
   * Clear user-scoped state on logout without tearing down the analytics pipeline.
   * After calling this, analytics remains initialized and will function again on re-login.
   * Use dispose() only when permanently shutting down the service.
   */
  clearUserData = async () => {
    this.userId = null;
    this.userProperties = {};
    await this.analyticsManager.clearUserData();
  };

  // Cleanup — permanent shutdown only. Awaits the manager so its final
  // flush/clear completes (and any rejection surfaces) before returning.
  dispose = async () => {
    this.isInitialized = false;
    this.userId = null;
    this.userProperties = {};
    await this.analyticsManager.dispose();
  };
}

// Create global analytics service instance
export const analyticsService = new AnalyticsService();

// Initialize analytics service
analyticsService.initialize();

export default analyticsService;
