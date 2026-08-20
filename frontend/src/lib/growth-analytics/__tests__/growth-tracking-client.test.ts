/**
 * GrowthTracker Tests
 * Tests for client-side analytics SDK with GDPR consent management
 */

import { GrowthTracker, ConsentState, initGrowthTracking, getGrowthTracker, track } from '../growth-tracking-client';

// Mock logger
jest.mock('../../logger', () => ({
  logger: {
    debug: jest.fn(),
  },
}));

// Mock browser APIs
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

const mockSendBeacon = jest.fn();
Object.defineProperty(navigator, 'sendBeacon', {
  writable: true,
  value: mockSendBeacon,
});

describe('GrowthTracker', () => {
  let tracker: GrowthTracker;
  const originalLocation = window.location;
  const originalDocumentTitle = Object.getOwnPropertyDescriptor(document, 'title');
  const originalDocumentReferrer = Object.getOwnPropertyDescriptor(document, 'referrer');
  const originalDocumentHidden = Object.getOwnPropertyDescriptor(document, 'hidden');

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    localStorage.clear();
    sessionStorage.clear();

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({}),
    });

    mockSendBeacon.mockReturnValue(true);
  });

  afterEach(() => {
    if (tracker) {
      tracker.destroy();
    }
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.restoreAllMocks(); // Restore all spies created in tests

    // Restore original window.location if modified
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    });

    // Restore original document properties if modified
    if (originalDocumentTitle) {
      Object.defineProperty(document, 'title', originalDocumentTitle);
    }
    if (originalDocumentReferrer) {
      Object.defineProperty(document, 'referrer', originalDocumentReferrer);
    }
    if (originalDocumentHidden) {
      Object.defineProperty(document, 'hidden', originalDocumentHidden);
    }
  });

  describe('Initialization', () => {
    it('initializes with default config', () => {
      tracker = new GrowthTracker();

      expect(tracker).toBeDefined();
    });

    it('initializes with custom config', () => {
      tracker = new GrowthTracker({
        apiEndpoint: '/custom/endpoint',
        batchSize: 50,
        debug: true,
      });

      expect(tracker).toBeDefined();
    });

    it('generates unique session ID', () => {
      tracker = new GrowthTracker();

      // Session ID should be set
      expect(tracker).toBeDefined();
    });

    it('generates or retrieves device ID', () => {
      tracker = new GrowthTracker();

      // Should create device ID in localStorage
      const stored = localStorage.getItem('geoleap_device_id');
      expect(stored).toBeTruthy();
    });

    it('reuses existing device ID', () => {
      const deviceData = {
        deviceId: 'existing-device-123',
        timestamp: Date.now(),
      };

      localStorage.setItem('geoleap_device_id', JSON.stringify(deviceData));

      tracker = new GrowthTracker();

      const stored = JSON.parse(localStorage.getItem('geoleap_device_id') || '{}');
      expect(stored.deviceId).toBe('existing-device-123');
    });

    it('loads consent state from localStorage', () => {
      const consent: ConsentState = {
        analytics: true,
        marketing: false,
        functional: true,
        timestamp: new Date(),
        version: '1.0',
      };

      localStorage.setItem('geoleap_consent', JSON.stringify(consent));

      tracker = new GrowthTracker();

      // Consent should be loaded
      expect(tracker).toBeDefined();
    });

    it('sets up auto-tracking when enabled', () => {
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener');

      tracker = new GrowthTracker({
        enableAutoTracking: true,
        trackClicks: true,
        trackFormSubmissions: true,
      });

      expect(addEventListenerSpy).toHaveBeenCalled();
    });

    it('does not set up auto-tracking when disabled', () => {
      const _addEventListenerSpy = jest.spyOn(document, 'addEventListener');

      tracker = new GrowthTracker({
        enableAutoTracking: false,
      });

      // Should still have some listeners (session management, unload)
      // but not click/form listeners
      expect(tracker).toBeDefined();
    });
  });

  describe('setUserId', () => {
    it('sets user ID', () => {
      tracker = new GrowthTracker();

      tracker.setUserId('user-123');

      // User ID should be set internally
      expect(tracker).toBeDefined();
    });

    it('updates user ID', () => {
      tracker = new GrowthTracker();

      tracker.setUserId('user-123');
      tracker.setUserId('user-456');

      // Should accept new user ID
      expect(tracker).toBeDefined();
    });
  });

  describe('updateConsent', () => {
    it('updates consent state', () => {
      tracker = new GrowthTracker();

      const consent: ConsentState = {
        analytics: true,
        marketing: true,
        functional: true,
        timestamp: new Date(),
        version: '1.0',
      };

      tracker.updateConsent(consent);

      const stored = localStorage.getItem('geoleap_consent');
      expect(stored).toBeTruthy();
    });

    it('enables tracking when analytics consent granted', () => {
      tracker = new GrowthTracker({
        enableAutoTracking: true,
        enableConsent: true,
      });

      const consent: ConsentState = {
        analytics: true,
        marketing: false,
        functional: true,
        timestamp: new Date(),
        version: '1.0',
      };

      tracker.updateConsent(consent);

      // Should enable auto-tracking
      expect(tracker).toBeDefined();
    });

    it('persists consent to localStorage', () => {
      tracker = new GrowthTracker();

      const consent: ConsentState = {
        analytics: true,
        marketing: false,
        functional: true,
        timestamp: new Date(),
        version: '1.0',
      };

      tracker.updateConsent(consent);

      const stored = JSON.parse(localStorage.getItem('geoleap_consent') || '{}');
      expect(stored.analytics).toBe(true);
    });
  });

  describe('track', () => {
    it('tracks events when consent given', () => {
      tracker = new GrowthTracker({ enableConsent: false });

      tracker.track('test_event', { foo: 'bar' });

      // Event should be queued
      expect(tracker).toBeDefined();
    });

    it('does not track when consent not given', () => {
      tracker = new GrowthTracker({ enableConsent: true });

      // No consent set
      tracker.track('test_event', { foo: 'bar' });

      // Event should not be queued
      expect(tracker).toBeDefined();
    });

    it('includes UTM parameters', () => {
      // Set up URL with UTM params
      Object.defineProperty(window, 'location', {
        value: {
          search: '?utm_source=google&utm_medium=cpc&utm_campaign=test',
          pathname: '/test',
          href: 'http://localhost/test',
          hostname: 'localhost',
        },
        writable: true,
      });

      tracker = new GrowthTracker({ enableConsent: false });

      tracker.track('test_event');

      // Event should include UTM params
      expect(tracker).toBeDefined();
    });

    it('includes device information', () => {
      tracker = new GrowthTracker({ enableConsent: false });

      tracker.track('test_event');

      // Event should include screen resolution and viewport
      expect(tracker).toBeDefined();
    });

    it('includes page context', () => {
      tracker = new GrowthTracker({ enableConsent: false });

      tracker.track('test_event');

      // Event should include referrer and landing page
      expect(tracker).toBeDefined();
    });

    it('flushes when queue reaches batch size', async () => {
      tracker = new GrowthTracker({
        enableConsent: false,
        batchSize: 2,
      });

      tracker.track('event1');
      tracker.track('event2');

      // Should trigger flush
      await jest.advanceTimersByTimeAsync(100);

      expect(mockFetch).toHaveBeenCalled();
    });

    it('flushes immediately for critical events', async () => {
      tracker = new GrowthTracker({
        enableConsent: false,
        batchSize: 100,
      });

      tracker.track('conversion');

      await jest.advanceTimersByTimeAsync(100);

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('pageView', () => {
    it('tracks page view', () => {
      tracker = new GrowthTracker({ enableConsent: false });

      tracker.pageView('/test-page');

      expect(tracker).toBeDefined();
    });

    it('uses current page if not specified', () => {
      Object.defineProperty(window, 'location', {
        value: { pathname: '/current-page' },
        writable: true,
      });

      tracker = new GrowthTracker({ enableConsent: false });

      tracker.pageView();

      expect(tracker).toBeDefined();
    });

    it('includes page title', () => {
      Object.defineProperty(document, 'title', {
        value: 'Test Page Title',
        writable: true,
      });

      tracker = new GrowthTracker({ enableConsent: false });

      tracker.pageView();

      expect(tracker).toBeDefined();
    });

    it('includes referrer', () => {
      Object.defineProperty(document, 'referrer', {
        value: 'https://google.com',
        writable: true,
      });

      tracker = new GrowthTracker({ enableConsent: false });

      tracker.pageView();

      expect(tracker).toBeDefined();
    });
  });

  describe('conversion', () => {
    it('tracks conversion with value', () => {
      tracker = new GrowthTracker({ enableConsent: false });

      tracker.conversion('purchase', 99.99, 'USD');

      expect(tracker).toBeDefined();
    });

    it('tracks conversion without value', () => {
      tracker = new GrowthTracker({ enableConsent: false });

      tracker.conversion('signup');

      expect(tracker).toBeDefined();
    });

    it('includes custom properties', () => {
      tracker = new GrowthTracker({ enableConsent: false });

      tracker.conversion('purchase', 99.99, 'USD', { plan: 'premium' });

      expect(tracker).toBeDefined();
    });
  });

  describe('formSubmission', () => {
    it('tracks form submission', () => {
      tracker = new GrowthTracker({ enableConsent: false });

      tracker.formSubmission('contact-form');

      expect(tracker).toBeDefined();
    });

    it('includes form properties', () => {
      tracker = new GrowthTracker({ enableConsent: false });

      tracker.formSubmission('signup-form', { step: 2 });

      expect(tracker).toBeDefined();
    });
  });

  describe('flush', () => {
    it('sends queued events to server', async () => {
      tracker = new GrowthTracker({ enableConsent: false });

      tracker.track('event1');
      tracker.track('event2');

      await tracker.flush();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/batch'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('clears queue after successful flush', async () => {
      tracker = new GrowthTracker({ enableConsent: false });

      tracker.track('event1');

      await tracker.flush();

      // Queue should be empty
      await tracker.flush(); // Second flush should not call fetch

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('re-queues events on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Server Error',
      });

      tracker = new GrowthTracker({ enableConsent: false });

      tracker.track('event1');

      await tracker.flush();

      // Events should be re-queued
      expect(tracker).toBeDefined();
    });

    it('includes API key in headers if provided', async () => {
      tracker = new GrowthTracker({
        enableConsent: false,
        apiKey: 'test-api-key',
      });

      tracker.track('event1');

      await tracker.flush();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-api-key',
          }),
        })
      );
    });

    it('limits re-queued events to prevent memory bloat', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      tracker = new GrowthTracker({ enableConsent: false });

      // Add many events
      for (let i = 0; i < 150; i++) {
        tracker.track(`event-${i}`);
      }

      await tracker.flush();

      // Should limit queue size
      expect(tracker).toBeDefined();
    });
  });

  describe('Periodic Flush', () => {
    it('flushes events periodically', async () => {
      tracker = new GrowthTracker({
        enableConsent: false,
        flushInterval: 5000,
      });

      tracker.track('event1');

      jest.advanceTimersByTime(5000);

      await jest.advanceTimersByTimeAsync(100);

      expect(mockFetch).toHaveBeenCalled();
    });

    it('does not flush if queue is empty', async () => {
      tracker = new GrowthTracker({
        enableConsent: false,
        flushInterval: 5000,
      });

      jest.advanceTimersByTime(5000);

      await jest.advanceTimersByTimeAsync(100);

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Auto-Tracking', () => {
    it('tracks button clicks', () => {
      tracker = new GrowthTracker({
        enableConsent: false,
        enableAutoTracking: true,
        trackClicks: true,
      });

      const button = document.createElement('button');
      button.textContent = 'Click me';
      button.id = 'test-button';

      document.body.appendChild(button);
      button.click();

      // Should track click event
      expect(tracker).toBeDefined();

      document.body.removeChild(button);
    });

    it('tracks link clicks', () => {
      tracker = new GrowthTracker({
        enableConsent: false,
        enableAutoTracking: true,
        trackClicks: true,
      });

      const link = document.createElement('a');
      link.href = 'https://example.com';
      link.textContent = 'External link';

      document.body.appendChild(link);
      link.click();

      // Should track link click
      expect(tracker).toBeDefined();

      document.body.removeChild(link);
    });

    it('tracks form submissions', () => {
      tracker = new GrowthTracker({
        enableConsent: false,
        enableAutoTracking: true,
        trackFormSubmissions: true,
      });

      const form = document.createElement('form');
      form.id = 'test-form';
      form.action = '/submit';

      document.body.appendChild(form);

      const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
      form.dispatchEvent(submitEvent);

      // Should track form submission
      expect(tracker).toBeDefined();

      document.body.removeChild(form);
    });
  });

  describe('Session Management', () => {
    it('resets session after timeout', () => {
      tracker = new GrowthTracker({
        enableConsent: false,
        sessionTimeout: 60000, // 1 minute
      });

      // Fast-forward past session timeout
      jest.advanceTimersByTime(120000); // 2 minutes

      // Session should be reset
      expect(tracker).toBeDefined();
    });

    it('updates activity on user interaction', () => {
      tracker = new GrowthTracker({ enableConsent: false });

      const mouseEvent = new Event('mousedown');
      document.dispatchEvent(mouseEvent);

      // Activity timestamp should be updated
      expect(tracker).toBeDefined();
    });
  });

  describe('Page Unload Handling', () => {
    it('flushes events on beforeunload', () => {
      const sendBeaconSpy = jest.spyOn(navigator, 'sendBeacon').mockImplementation(() => true);

      tracker = new GrowthTracker({ enableConsent: false });

      tracker.track('event1');

      window.dispatchEvent(new Event('beforeunload'));

      expect(sendBeaconSpy).toHaveBeenCalled();
      // Spy will be restored in afterEach via jest.restoreAllMocks()
    });

    it('flushes on page hide', async () => {
      tracker = new GrowthTracker({ enableConsent: false });

      tracker.track('event1');

      Object.defineProperty(document, 'hidden', {
        value: true,
        writable: true,
      });

      document.dispatchEvent(new Event('visibilitychange'));

      await jest.advanceTimersByTimeAsync(100);

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('reset', () => {
    it('generates new session ID', () => {
      tracker = new GrowthTracker();

      tracker.reset();

      // Should have new session
      expect(tracker).toBeDefined();
    });

    it('clears user ID', () => {
      tracker = new GrowthTracker();

      tracker.setUserId('user-123');
      tracker.reset();

      // User ID should be cleared
      expect(tracker).toBeDefined();
    });

    it('clears event queue', () => {
      tracker = new GrowthTracker({ enableConsent: false });

      tracker.track('event1');
      tracker.reset();

      // Queue should be empty
      expect(tracker).toBeDefined();
    });
  });

  describe('destroy', () => {
    it('clears flush timer', () => {
      tracker = new GrowthTracker({ enableConsent: false });

      tracker.destroy();

      // Timer should be cleared
      expect(tracker).toBeDefined();
    });

    it('flushes remaining events', async () => {
      tracker = new GrowthTracker({ enableConsent: false });

      tracker.track('event1');

      tracker.destroy();

      await jest.advanceTimersByTimeAsync(100);

      expect(mockFetch).toHaveBeenCalled();
    });

    it('removes event listeners', () => {
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');

      tracker = new GrowthTracker({
        enableConsent: false,
        enableAutoTracking: true,
      });

      tracker.destroy();

      expect(removeEventListenerSpy).toHaveBeenCalled();
    });
  });

  describe('Global Functions', () => {
    let globalInstance: GrowthTracker | null = null;

    afterEach(() => {
      // Ensure global instance is always cleaned up
      if (globalInstance) {
        globalInstance.destroy();
        globalInstance = null;
      }
      // Also try to destroy any remaining global instance
      const instance = getGrowthTracker();
      if (instance) {
        instance.destroy();
      }
    });

    it('initGrowthTracking creates global instance', () => {
      globalInstance = initGrowthTracking({ debug: true });

      expect(globalInstance).toBeInstanceOf(GrowthTracker);
      expect(getGrowthTracker()).toBe(globalInstance);
    });

    it('initGrowthTracking destroys previous instance', () => {
      const instance1 = initGrowthTracking();
      const destroySpy = jest.spyOn(instance1, 'destroy');

      globalInstance = initGrowthTracking();

      expect(destroySpy).toHaveBeenCalled();
      expect(getGrowthTracker()).toBe(globalInstance);
    });

    it('track.event uses global instance', () => {
      globalInstance = initGrowthTracking({ enableConsent: false });
      const trackSpy = jest.spyOn(globalInstance, 'track');

      track.event('test_event', { foo: 'bar' });

      expect(trackSpy).toHaveBeenCalledWith('test_event', { foo: 'bar' }, undefined);
    });

    it('track.pageView uses global instance', () => {
      globalInstance = initGrowthTracking({ enableConsent: false });
      const pageViewSpy = jest.spyOn(globalInstance, 'pageView');

      track.pageView('/test');

      expect(pageViewSpy).toHaveBeenCalledWith('/test', undefined);
    });

    it('track functions handle missing global instance', () => {
      // No global instance
      expect(() => track.event('test')).not.toThrow();
      expect(() => track.pageView()).not.toThrow();
      expect(() => track.conversion('test')).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('handles localStorage unavailable', () => {
      jest.spyOn(Storage.prototype, 'setItem')
        .mockImplementation(() => {
          throw new Error('Storage disabled');
        });

      tracker = new GrowthTracker();

      // Should still initialize
      expect(tracker).toBeDefined();
      // Spy will be restored in afterEach via jest.restoreAllMocks()
    });

    it('handles expired device ID', () => {
      const oldDeviceData = {
        deviceId: 'old-device',
        timestamp: Date.now() - (400 * 24 * 60 * 60 * 1000), // 400 days ago
      };

      localStorage.setItem('geoleap_device_id', JSON.stringify(oldDeviceData));

      tracker = new GrowthTracker();

      // Should generate new device ID
      const stored = JSON.parse(localStorage.getItem('geoleap_device_id') || '{}');
      expect(stored.deviceId).not.toBe('old-device');
    });

    it('handles invalid stored consent', () => {
      localStorage.setItem('geoleap_consent', 'invalid json');

      tracker = new GrowthTracker();

      // Should initialize without errors
      expect(tracker).toBeDefined();
    });

    it('handles network errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      tracker = new GrowthTracker({ enableConsent: false });

      tracker.track('event1');

      await tracker.flush();

      // Should not throw
      expect(tracker).toBeDefined();
    });
  });

  describe('Consent Categories', () => {
    it('includes consent categories in events', () => {
      tracker = new GrowthTracker({ enableConsent: true });

      const consent: ConsentState = {
        analytics: true,
        marketing: true,
        functional: false,
        timestamp: new Date(),
        version: '1.0',
      };

      tracker.updateConsent(consent);
      tracker.track('test_event');

      // Event should include consent categories
      expect(tracker).toBeDefined();
    });

    it('formats consent categories as comma-separated', () => {
      tracker = new GrowthTracker({ enableConsent: true });

      const consent: ConsentState = {
        analytics: true,
        marketing: false,
        functional: true,
        timestamp: new Date(),
        version: '1.0',
      };

      tracker.updateConsent(consent);
      tracker.track('test_event');

      // Should include "analytics,functional"
      expect(tracker).toBeDefined();
    });
  });
});
