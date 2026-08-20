/**
 * UnifiedAnalytics Tests - TDD RED PHASE
 * Write tests FIRST before implementation
 * These tests will FAIL until UnifiedAnalytics is implemented
 */

import { UnifiedAnalytics } from '../unified-analytics';
import { logger } from '@/lib/logger';
import { CONSENT_VERSION } from '@/types/analytics';

// Mock dependencies
jest.mock('@/lib/logger', () => ({
  logger: {
    logUserAction: jest.fn(),
    logPageView: jest.fn(),
    logApiCall: jest.fn(),
    logPerformance: jest.fn(),
    logError: jest.fn(),
    setUser: jest.fn(),
  },
}));

// Mock ConsentManager with a factory function
const _mockConsentManager = {
  hasAnalyticsConsent: jest.fn(() => true),
  hasMarketingConsent: jest.fn(() => false),
  hasFunctionalConsent: jest.fn(() => true),
  getConsent: jest.fn(() => ({
    analytics: true,
    marketing: false,
    functional: true,
    timestamp: new Date(),
    version: CONSENT_VERSION,
  })),
  updateConsent: jest.fn(),
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
  acceptAll: jest.fn(),
  rejectAll: jest.fn(),
};

jest.mock('../consent-manager', () => {
  const mockManager = {
    hasAnalyticsConsent: jest.fn(() => true),
    hasMarketingConsent: jest.fn(() => false),
    hasFunctionalConsent: jest.fn(() => true),
    getConsent: jest.fn(() => ({
      analytics: true,
      marketing: false,
      functional: true,
      timestamp: new Date(),
      version: '1.0',
    })),
    updateConsent: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    acceptAll: jest.fn(),
    rejectAll: jest.fn(),
  };

  // Expose mock manager for tests to control
  (global as any).__mockConsentManager = mockManager;

  return {
    ConsentManager: {
      getInstance: jest.fn(() => mockManager),
    },
  };
});

// Mock gtag
const mockGtag = jest.fn();

describe('UnifiedAnalytics', () => {
  let analytics: UnifiedAnalytics;
  let consentManager: any;

  beforeEach(() => {
    // Get the mocked consent manager
    consentManager = (global as any).__mockConsentManager;

    // Setup window.gtag mock
    Object.defineProperty(window, 'gtag', {
      writable: true,
      value: mockGtag,
    });
    Object.defineProperty(window, 'dataLayer', {
      writable: true,
      value: [],
    });

    // Setup environment variable for GA4 measurement ID
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = 'G-TEST123';

    // Reset consent manager to default state (analytics: true)
    consentManager.hasAnalyticsConsent.mockReturnValue(true);
    consentManager.hasMarketingConsent.mockReturnValue(false);
    consentManager.hasFunctionalConsent.mockReturnValue(true);

    // Clear all mocks
    jest.clearAllMocks();
    mockGtag.mockClear();
    (logger.logUserAction as jest.Mock).mockClear();
    (logger.logPageView as jest.Mock).mockClear();
    (logger.logError as jest.Mock).mockClear();

    // Reset singleton instance
    (UnifiedAnalytics as any).instance = null;

    // Get fresh instance
    analytics = UnifiedAnalytics.getInstance();
  });

  it('should route events to both Azure App Insights and GA4 when consent given', () => {
    consentManager.hasAnalyticsConsent.mockReturnValue(true);

    analytics.trackEvent('test_event', { foo: 'bar' });

    // Should route to Azure (via logger)
    expect(logger.logUserAction).toHaveBeenCalledWith(
      'test_event',
      'UnifiedAnalytics',
      expect.objectContaining({ foo: 'bar' })
    );

    // Should route to GA4 (via gtag)
    expect(mockGtag).toHaveBeenCalledWith('event', 'test_event', expect.objectContaining({ foo: 'bar' }));
  });

  it('should route events only to Azure when consent denied', () => {
    consentManager.hasAnalyticsConsent.mockReturnValue(false);

    analytics.trackEvent('test_event', { foo: 'bar' });

    // Should route to Azure (always sent)
    expect(logger.logUserAction).toHaveBeenCalledWith(
      'test_event',
      'UnifiedAnalytics',
      expect.objectContaining({ foo: 'bar' })
    );

    // Should NOT route to GA4 (consent denied)
    expect(mockGtag).not.toHaveBeenCalled();
  });

  it('should always route errors regardless of consent', () => {
    consentManager.hasAnalyticsConsent.mockReturnValue(false);

    const testError = new Error('Test error');
    const context = { component: 'TestComponent' };

    analytics.trackError(testError, context);

    // Should route to Azure (via logger.logError with 'ApplicationError' type)
    expect(logger.logError).toHaveBeenCalledWith(
      'ApplicationError',
      expect.objectContaining({ message: 'Test error', component: 'TestComponent' })
    );

    // Should route to GA4 even without consent (errors are critical)
    expect(mockGtag).toHaveBeenCalledWith('event', 'exception', expect.objectContaining({ description: 'Test error' }));
  });

  it('should set userId on both providers', () => {
    analytics.setUserId('user123');

    // Should set on Azure (via logger)
    expect(logger.setUser).toHaveBeenCalledWith('user123');

    // Should set on GA4
    expect(mockGtag).toHaveBeenCalledWith('config', expect.any(String), expect.objectContaining({ user_id: 'user123' }));
  });

  it('should handle missing gtag gracefully (development mode)', () => {
    delete (global as any).gtag;

    // Should not throw error
    expect(() => {
      analytics.trackEvent('test_event', { foo: 'bar' });
    }).not.toThrow();

    // Should still route to Azure
    expect(logger.logUserAction).toHaveBeenCalledWith(
      'test_event',
      'UnifiedAnalytics',
      expect.objectContaining({ foo: 'bar' })
    );
  });

  it('should track page views with correct format', () => {
    analytics.trackPageView('/test-page', 'Test Page Title');

    // Should route to Azure (logger.logPageView takes single page argument)
    expect(logger.logPageView).toHaveBeenCalledWith('/test-page');

    // Should route to GA4
    expect(mockGtag).toHaveBeenCalledWith(
      'event',
      'page_view',
      expect.objectContaining({
        page_path: '/test-page',
        page_title: 'Test Page Title',
      })
    );
  });

  it('should track conversions with value and currency', () => {
    analytics.trackConversion({
      type: 'subscription',
      value: 9.99,
      currency: 'USD',
      plan: 'premium',
    });

    // Should route to Azure
    expect(logger.logUserAction).toHaveBeenCalledWith(
      'conversion',
      'UnifiedAnalytics',
      expect.objectContaining({
        type: 'subscription',
        value: 9.99,
        currency: 'USD',
      })
    );

    // Should route to GA4
    expect(mockGtag).toHaveBeenCalledWith(
      'event',
      'conversion',
      expect.objectContaining({
        conversion_type: 'subscription',
        value: 9.99,
        currency: 'USD',
      })
    );
  });

  it('should track search events with query and results count', () => {
    analytics.trackSearch('breaking bad', 42, { genre: 'drama' });

    // Should route to Azure
    expect(logger.logUserAction).toHaveBeenCalledWith(
      'search',
      'UnifiedAnalytics',
      expect.objectContaining({
        query: 'breaking bad',
        resultsCount: 42,
        filters: { genre: 'drama' },
      })
    );

    // Should route to GA4
    expect(mockGtag).toHaveBeenCalledWith(
      'event',
      'search',
      expect.objectContaining({
        search_term: 'breaking bad',
        results_count: 42,
      })
    );
  });

  it('should enforce consent before sending to GA4', () => {
    // First event with consent
    consentManager.hasAnalyticsConsent.mockReturnValue(true);
    analytics.trackEvent('event1', { foo: 'bar' });
    expect(mockGtag).toHaveBeenCalledTimes(1);

    // Second event without consent
    consentManager.hasAnalyticsConsent.mockReturnValue(false);
    analytics.trackEvent('event2', { foo: 'baz' });

    // Should only have been called once (first event only)
    expect(mockGtag).toHaveBeenCalledTimes(1);

    // But Azure should have both events
    expect(logger.logUserAction).toHaveBeenCalledTimes(2);
  });

  it('should track login events with method', () => {
    analytics.trackLogin('google');

    // Should route to Azure
    expect(logger.logUserAction).toHaveBeenCalledWith(
      'login',
      'UnifiedAnalytics',
      expect.objectContaining({
        method: 'google',
        success: true,
      })
    );

    // Should route to GA4
    expect(mockGtag).toHaveBeenCalledWith('event', 'login', { method: 'google' });
  });

  it('should track signup events with method', () => {
    analytics.trackSignup('email');

    // Should route to Azure
    expect(logger.logUserAction).toHaveBeenCalledWith(
      'signup',
      'UnifiedAnalytics',
      expect.objectContaining({
        method: 'email',
        success: true,
      })
    );

    // Should route to GA4 with correct event name
    expect(mockGtag).toHaveBeenCalledWith('event', 'sign_up', { method: 'email' });
  });

  it('should track content click events', () => {
    analytics.trackContentClick('movie-123', 'movie');

    // Should route to Azure
    expect(logger.logUserAction).toHaveBeenCalledWith(
      'content_click',
      'UnifiedAnalytics',
      expect.objectContaining({
        contentId: 'movie-123',
        contentType: 'movie',
      })
    );

    // Should route to GA4 with correct format
    expect(mockGtag).toHaveBeenCalledWith(
      'event',
      'select_content',
      expect.objectContaining({
        content_type: 'movie',
        content_id: 'movie-123',
      })
    );
  });

  it('should track watchlist add action', () => {
    analytics.trackWatchlistAction('add', 'tv-456');

    // Should route to Azure
    expect(logger.logUserAction).toHaveBeenCalledWith('watchlist_add', 'UnifiedAnalytics', {
      contentId: 'tv-456',
    });

    // Should route to GA4 with correct event name
    expect(mockGtag).toHaveBeenCalledWith('event', 'add_to_wishlist', {
      content_id: 'tv-456',
    });
  });

  it('should track watchlist remove action', () => {
    analytics.trackWatchlistAction('remove', 'tv-456');

    // Should route to Azure
    expect(logger.logUserAction).toHaveBeenCalledWith('watchlist_remove', 'UnifiedAnalytics', {
      contentId: 'tv-456',
    });

    // Should route to GA4 with correct event name
    expect(mockGtag).toHaveBeenCalledWith('event', 'remove_from_wishlist', {
      content_id: 'tv-456',
    });
  });

  it('should track click events with element and component', () => {
    analytics.trackClick('search-button', 'SearchBar');

    // Should route to Azure
    expect(logger.logUserAction).toHaveBeenCalledWith('click', 'SearchBar', {
      element: 'search-button',
    });

    // Should route to GA4
    expect(mockGtag).toHaveBeenCalledWith('event', 'click', {
      element: 'search-button',
      component: 'SearchBar',
    });
  });

  it('should track click events without component', () => {
    analytics.trackClick('logo');

    // Should default component to UnifiedAnalytics
    expect(logger.logUserAction).toHaveBeenCalledWith('click', 'UnifiedAnalytics', {
      element: 'logo',
    });

    // Should route to GA4 with undefined component
    expect(mockGtag).toHaveBeenCalledWith('event', 'click', {
      element: 'logo',
      component: undefined,
    });
  });

  it('should track form submit success', () => {
    analytics.trackFormSubmit('contact-form', true);

    // Should route to Azure
    expect(logger.logUserAction).toHaveBeenCalledWith('form_submit', 'UnifiedAnalytics', {
      formName: 'contact-form',
      success: true,
    });

    // Should route to GA4 with success event
    expect(mockGtag).toHaveBeenCalledWith('event', 'form_submit_success', {
      form_name: 'contact-form',
    });
  });

  it('should track form submit error', () => {
    analytics.trackFormSubmit('payment-form', false);

    // Should route to Azure
    expect(logger.logUserAction).toHaveBeenCalledWith('form_submit', 'UnifiedAnalytics', {
      formName: 'payment-form',
      success: false,
    });

    // Should route to GA4 with error event
    expect(mockGtag).toHaveBeenCalledWith('event', 'form_submit_error', {
      form_name: 'payment-form',
    });
  });

  it('should initialize only once', () => {
    const subscribeSpy = jest.spyOn(consentManager, 'subscribe');

    analytics.initialize();
    analytics.initialize(); // Second call should be no-op

    // Should only subscribe once
    expect(subscribeSpy).toHaveBeenCalledTimes(1);
  });

  it('should subscribe to consent changes on initialize', () => {
    const subscribeSpy = jest.spyOn(consentManager, 'subscribe');

    analytics.initialize();

    expect(subscribeSpy).toHaveBeenCalledWith(expect.any(Function));
  });

  it('should update GA4 consent when consent changes after initialize', () => {
    analytics.initialize();

    // Get the consent change callback that was registered
    const consentCallback = (consentManager.subscribe as jest.Mock).mock.calls[0][0];

    // Simulate consent change
    consentCallback({ analytics: true, marketing: false, functional: true, timestamp: new Date(), version: '1.0' });

    // Should call gtag to update consent
    expect(mockGtag).toHaveBeenCalledWith('consent', 'update', {
      analytics_storage: 'granted',
    });
  });

  it('should handle gtag errors gracefully in sendToGA4', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    // Make gtag throw an error
    mockGtag.mockImplementation(() => {
      throw new Error('GA4 error');
    });

    // Should not throw
    expect(() => {
      analytics.trackEvent('test_event', { foo: 'bar' });
    }).not.toThrow();

    // Should log error to console
    expect(consoleSpy).toHaveBeenCalledWith('[UnifiedAnalytics] Failed to send to GA4:', expect.any(Error));

    consoleSpy.mockRestore();
  });

  it('should handle missing gtag in updateGA4Consent', () => {
    // Create a spy to track if updateGA4Consent is called
    const hasGA4Spy = jest.spyOn(analytics as any, 'hasGA4');
    hasGA4Spy.mockReturnValue(false); // Simulate gtag not available

    analytics.initialize();

    // Get the consent change callback
    const consentCallback = (consentManager.subscribe as jest.Mock).mock.calls[0][0];

    // Should not throw and should early return due to hasGA4() check
    expect(() => {
      consentCallback({ analytics: false, marketing: false, functional: false, timestamp: new Date(), version: '1.0' });
    }).not.toThrow();

    // Verify hasGA4 was called (for early return check)
    expect(hasGA4Spy).toHaveBeenCalled();

    hasGA4Spy.mockRestore();
  });

  it('should not send auth events to GA4 without consent', () => {
    consentManager.hasAnalyticsConsent.mockReturnValue(false);

    analytics.trackLogin('google');
    analytics.trackSignup('email');

    // Should not call gtag
    expect(mockGtag).not.toHaveBeenCalled();

    // But should still send to Azure
    expect(logger.logUserAction).toHaveBeenCalledTimes(2);
  });

  it('should not send content events to GA4 without consent', () => {
    consentManager.hasAnalyticsConsent.mockReturnValue(false);

    analytics.trackContentClick('movie-123', 'movie');
    analytics.trackWatchlistAction('add', 'tv-456');

    // Should not call gtag
    expect(mockGtag).not.toHaveBeenCalled();

    // But should still send to Azure
    expect(logger.logUserAction).toHaveBeenCalledTimes(2);
  });

  it('should not send UI events to GA4 without consent', () => {
    consentManager.hasAnalyticsConsent.mockReturnValue(false);

    analytics.trackClick('button', 'Component');
    analytics.trackFormSubmit('form', true);

    // Should not call gtag
    expect(mockGtag).not.toHaveBeenCalled();

    // But should still send to Azure
    expect(logger.logUserAction).toHaveBeenCalledTimes(2);
  });
});
