// @ts-nocheck
/**
 * Platform Utility Tests
 *
 * Tests platform detection and browser capability functions
 */

import {
  isReactNative,
  isIOS,
  isAndroid,
  isMobile,
  isTablet,
  isDesktop,
  isPWA,
  canUseNativeShare,
  canUseClipboard,
  canUseNotifications,
  canUseVibration,
  getViewportSize,
  getScreenSize,
  getDevicePixelRatio,
  isHighDensityDisplay,
  supportsTouch,
  getConnectionType,
  isSlowConnection,
  prefersReducedMotion,
  getOperatingSystem,
  getBrowser,
  isInAppBrowser,
} from '../platform';

describe('Platform Utils', () => {
  const originalNavigator = global.navigator;
  const _originalWindow = global.window;

  afterEach(() => {
    // Restore navigator
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      configurable: true,
      writable: true,
    });
    // Clear all jest mocks
    jest.restoreAllMocks();
    // Remove ReactNative global
    delete (global as { ReactNative?: unknown }).ReactNative;
    // Remove Notification global if it was added
    delete (global as { Notification?: unknown }).Notification;
  });

  describe('isReactNative', () => {
    it('returns false when ReactNative is not defined', () => {
      expect(isReactNative()).toBe(false);
    });

    it('returns true when ReactNative is defined', () => {
      (global as { ReactNative: unknown }).ReactNative = { Platform: { OS: 'ios' } };
      expect(isReactNative()).toBe(true);
    });
  });

  describe('isIOS', () => {
    it('detects iOS from React Native platform', () => {
      (global as { ReactNative: { Platform: { OS: string } } }).ReactNative = { Platform: { OS: 'ios' } };
      expect(isIOS()).toBe(true);
    });

    it('detects iOS from userAgent', () => {
      Object.defineProperty(global, 'navigator', {
        value: { userAgent: 'iPhone' },
        configurable: true,
      });
      expect(isIOS()).toBe(true);
    });

    it('detects iPad from userAgent', () => {
      Object.defineProperty(global, 'navigator', {
        value: { userAgent: 'iPad' },
        configurable: true,
      });
      expect(isIOS()).toBe(true);
    });

    it('detects iPad Pro from platform and maxTouchPoints', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgent: 'Safari',
          platform: 'MacIntel',
          maxTouchPoints: 5,
        },
        configurable: true,
      });
      expect(isIOS()).toBe(true);
    });

    it('returns false for non-iOS devices', () => {
      Object.defineProperty(global, 'navigator', {
        value: { userAgent: 'Android' },
        configurable: true,
      });
      expect(isIOS()).toBe(false);
    });
  });

  describe('isAndroid', () => {
    it('detects Android from React Native platform', () => {
      (global as { ReactNative: { Platform: { OS: string } } }).ReactNative = { Platform: { OS: 'android' } };
      expect(isAndroid()).toBe(true);
    });

    it('detects Android from userAgent', () => {
      Object.defineProperty(global, 'navigator', {
        value: { userAgent: 'Android 10' },
        configurable: true,
      });
      expect(isAndroid()).toBe(true);
    });

    it('returns false for non-Android devices', () => {
      Object.defineProperty(global, 'navigator', {
        value: { userAgent: 'iPhone' },
        configurable: true,
      });
      expect(isAndroid()).toBe(false);
    });
  });

  describe('isMobile', () => {
    it('returns true for React Native', () => {
      (global as { ReactNative: unknown }).ReactNative = { Platform: { OS: 'ios' } };
      expect(isMobile()).toBe(true);
    });

    it('returns true for mobile user agents', () => {
      const mobileAgents = ['iPhone', 'Android', 'iPod', 'BlackBerry', 'Mobile', 'CriOS'];

      mobileAgents.forEach(agent => {
        Object.defineProperty(global, 'navigator', {
          value: { userAgent: agent },
          configurable: true,
        });
        expect(isMobile()).toBe(true);
      });
    });

    it('returns false for desktop user agents', () => {
      Object.defineProperty(global, 'navigator', {
        value: { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        configurable: true,
      });
      expect(isMobile()).toBe(false);
    });
  });

  describe('isTablet', () => {
    it('detects iPad', () => {
      Object.defineProperty(global, 'navigator', {
        value: { userAgent: 'iPad', platform: 'iPad', maxTouchPoints: 5 },
        configurable: true,
      });
      expect(isTablet()).toBe(true);
    });

    it('detects Android tablets', () => {
      Object.defineProperty(global, 'navigator', {
        value: { userAgent: 'Android' },
        configurable: true,
      });
      expect(isTablet()).toBe(true);
    });

    it('returns false for phones', () => {
      Object.defineProperty(global, 'navigator', {
        value: { userAgent: 'Android Mobile' },
        configurable: true,
      });
      expect(isTablet()).toBe(false);
    });
  });

  describe('isDesktop', () => {
    it('returns true for desktop browsers', () => {
      Object.defineProperty(global, 'navigator', {
        value: { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        configurable: true,
      });
      expect(isDesktop()).toBe(true);
    });

    it('returns false for mobile devices', () => {
      Object.defineProperty(global, 'navigator', {
        value: { userAgent: 'iPhone' },
        configurable: true,
      });
      expect(isDesktop()).toBe(false);
    });
  });

  describe('isPWA', () => {
    it('detects standalone display mode', () => {
      jest.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
        matches: query.includes('standalone'),
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));
      expect(isPWA()).toBe(true);
    });

    it('detects iOS standalone', () => {
      jest.spyOn(window, 'matchMedia').mockImplementation(() => ({
        matches: false,
        media: '',
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));
      Object.defineProperty(window.navigator, 'standalone', {
        value: true,
        configurable: true,
      });
      expect(isPWA()).toBe(true);
    });

    it('returns false for regular browsers', () => {
      jest.spyOn(window, 'matchMedia').mockImplementation(() => ({
        matches: false,
        media: '',
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));
      // Ensure navigator.standalone is explicitly false
      Object.defineProperty(window.navigator, 'standalone', {
        value: false,
        configurable: true,
      });
      Object.defineProperty(document, 'referrer', {
        value: 'https://example.com',
        configurable: true,
      });
      expect(isPWA()).toBe(false);
    });
  });

  describe('Browser Capability Detection', () => {
    it('canUseNativeShare detects Web Share API', () => {
      Object.defineProperty(global, 'navigator', {
        value: { share: jest.fn() },
        configurable: true,
      });
      expect(canUseNativeShare()).toBe(true);
    });

    it('canUseClipboard detects Clipboard API', () => {
      Object.defineProperty(global, 'navigator', {
        value: { clipboard: { writeText: jest.fn() } },
        configurable: true,
      });
      expect(canUseClipboard()).toBe(true);
    });

    it('canUseNotifications detects Notification API', () => {
      (global as { Notification?: unknown }).Notification = function () {};
      expect(canUseNotifications()).toBe(true);
    });

    it('canUseVibration detects Vibration API', () => {
      Object.defineProperty(global, 'navigator', {
        value: { vibrate: jest.fn() },
        configurable: true,
      });
      expect(canUseVibration()).toBe(true);
    });
  });

  describe('Viewport and Screen', () => {
    it('getViewportSize returns window dimensions', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1920, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 1080, configurable: true });
      expect(getViewportSize()).toEqual({ width: 1920, height: 1080 });
    });

    // Skip: Cannot delete window in Jest/jsdom environment
    it.skip('getViewportSize returns default when window undefined', () => {
      const originalWindow = global.window;
      delete (global as { window?: unknown }).window;
      expect(getViewportSize()).toEqual({ width: 1024, height: 768 });
      global.window = originalWindow;
    });

    it('getScreenSize returns screen dimensions', () => {
      Object.defineProperty(global, 'screen', {
        value: { width: 2560, height: 1440 },
        configurable: true,
      });
      expect(getScreenSize()).toEqual({ width: 2560, height: 1440 });
    });

    it('getDevicePixelRatio returns pixel ratio', () => {
      Object.defineProperty(window, 'devicePixelRatio', { value: 2, configurable: true });
      expect(getDevicePixelRatio()).toBe(2);
    });

    it('isHighDensityDisplay detects retina displays', () => {
      Object.defineProperty(window, 'devicePixelRatio', { value: 2, configurable: true });
      expect(isHighDensityDisplay()).toBe(true);
    });

    it('supportsTouch detects touch capability', () => {
      Object.defineProperty(window, 'ontouchstart', { value: {}, configurable: true });
      expect(supportsTouch()).toBe(true);
    });
  });

  describe('Connection Type', () => {
    it('getConnectionType returns connection info', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          connection: { effectiveType: '4g' },
        },
        configurable: true,
      });
      expect(getConnectionType()).toBe('4g');
    });

    it('getConnectionType returns unknown when not available', () => {
      Object.defineProperty(global, 'navigator', {
        value: {},
        configurable: true,
      });
      expect(getConnectionType()).toBe('unknown');
    });

    it('isSlowConnection detects slow connections', () => {
      Object.defineProperty(global, 'navigator', {
        value: { connection: { effectiveType: '2g' } },
        configurable: true,
      });
      expect(isSlowConnection()).toBe(true);
    });
  });

  describe('User Preferences', () => {
    it('prefersReducedMotion detects motion preference', () => {
      jest.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
        matches: query.includes('prefers-reduced-motion'),
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));
      expect(prefersReducedMotion()).toBe(true);
    });
  });

  describe('Operating System Detection', () => {
    const testCases = [
      { agent: 'Windows NT 10.0', expected: 'Windows' },
      { agent: 'Macintosh; Intel Mac OS X', expected: 'macOS' },
      { agent: 'Linux x86_64', expected: 'Linux' },
      { agent: 'Android 11', expected: 'Android' },
      { agent: 'iPhone OS 15_0', expected: 'iOS' },
    ];

    testCases.forEach(({ agent, expected }) => {
      it(`detects ${expected} from userAgent`, () => {
        Object.defineProperty(global, 'navigator', {
          value: { userAgent: agent },
          configurable: true,
        });
        expect(getOperatingSystem()).toBe(expected);
      });
    });
  });

  describe('Browser Detection', () => {
    const browsers = [
      { agent: 'Chrome/95.0', expected: 'Chrome' },
      { agent: 'Firefox/93.0', expected: 'Firefox' },
      { agent: 'Safari/15.0', expected: 'Safari' },
      { agent: 'Edg/95.0', expected: 'Edge' },
      { agent: 'OPR/80.0', expected: 'Opera' },
    ];

    browsers.forEach(({ agent, expected }) => {
      it(`detects ${expected}`, () => {
        Object.defineProperty(global, 'navigator', {
          value: { userAgent: agent },
          configurable: true,
        });
        expect(getBrowser()).toBe(expected);
      });
    });
  });

  describe('isInAppBrowser', () => {
    const inAppAgents = ['FBAN', 'FBAV', 'Instagram', 'Twitter', 'WhatsApp', 'Pinterest'];

    inAppAgents.forEach(agent => {
      it(`detects ${agent} in-app browser`, () => {
        Object.defineProperty(global, 'navigator', {
          value: { userAgent: agent },
          configurable: true,
        });
        expect(isInAppBrowser()).toBe(true);
      });
    });

    it('returns false for regular browsers', () => {
      Object.defineProperty(global, 'navigator', {
        value: { userAgent: 'Chrome/95.0' },
        configurable: true,
      });
      expect(isInAppBrowser()).toBe(false);
    });
  });
});
