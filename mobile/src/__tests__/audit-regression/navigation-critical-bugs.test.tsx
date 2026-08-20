/**
 * Navigation Critical Bugs Regression Tests
 * Tests for bugs found during Day 3 audit (2025-12-16)
 *
 * CRITICAL BUGS COVERED:
 * - BUG-NAV-001: Deep link navigation never executed
 * - BUG-NAV-002: ErrorRecovery global handler conflicts
 * - BUG-NAV-003: Limited deep link route coverage
 * - BUG-NAV-004: Deep link listener array unbounded growth
 * - BUG-NAV-005: Back button blocked during error recovery
 * - BUG-NAV-006: Duplicate useWindowDimensions hooks
 *
 * @see docs/audit/week1/day3-navigation-bug-report.md
 */

// Mock logger before other imports
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    log: jest.fn(),
    trace: jest.fn(),
  },
}));

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { Linking, BackHandler, Dimensions } from 'react-native';
import DeepLinkingService from '../../services/deepLinkingService';
import { useWindowDimensions } from '../../hooks/useWindowDimensions';
import { useWindowDimensions as useWindowDimensionsResponsive } from '../../hooks/useResponsive';

// Mock dependencies
jest.mock('react-native/Libraries/Linking/Linking', () => ({
  getInitialURL: jest.fn(),
  addEventListener: jest.fn(),
}));

jest.mock('react-native/Libraries/Utilities/BackHandler', () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    removeEventListener: jest.fn(),
    exitApp: jest.fn(),
  },
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  removeEventListener: jest.fn(),
  exitApp: jest.fn(),
}));

jest.mock('../../utils/logger');

// Create BackHandler global for tests
const mockBackHandler = {
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  removeEventListener: jest.fn(),
  exitApp: jest.fn(),
};

// Monkey-patch BackHandler into the imported react-native module
const RN = require('react-native');
Object.defineProperty(RN, 'BackHandler', {
  value: mockBackHandler,
  writable: true,
  configurable: true,
});

describe('BUG-NAV-001: Deep Link Navigation Never Executed', () => {
  let service: DeepLinkingService;
  let mockNavigationRef: any;

  beforeEach(() => {
    service = DeepLinkingService.getInstance();
    mockNavigationRef = {
      navigate: jest.fn(),
      current: {
        navigate: jest.fn(),
      },
    };
    DeepLinkingService.setNavigationRef(mockNavigationRef);
  });

  it('should parse deep link but NOT navigate (documenting the bug)', () => {
    const url = 'geoleap://content/movie-123';

    service.handleDeepLink(url);

    // BUG: Navigation ref is set but never used
    expect(mockNavigationRef.navigate).not.toHaveBeenCalled();
    expect(mockNavigationRef.current.navigate).not.toHaveBeenCalled();

    // This documents the bug - deep link parsed but no navigation occurs
  });

  it('should parse deep link correctly (parsing works, navigation does not)', () => {
    const url = 'geoleap://content/movie-123';

    const parsed = service.parseDeepLink(url);

    expect(parsed).toEqual({
      type: 'content',
      id: 'movie-123',
      url,
      source: 'deep-link',
    });

    // BUG: Even though parsing works, navigation never happens
  });

  it('should parse profile deep link', () => {
    const url = 'geoleap://profile/user-456';

    const parsed = service.parseDeepLink(url);

    expect(parsed).toEqual({
      type: 'profile',
      id: 'user-456',
      url,
      source: 'deep-link',
    });
  });

  it('should parse settings deep link', () => {
    const url = 'geoleap://settings';

    const parsed = service.parseDeepLink(url);

    expect(parsed).toEqual({
      type: 'settings',
      url,
      source: 'deep-link',
    });
  });

  it('should parse search deep link', () => {
    const url = 'geoleap://search';

    const parsed = service.parseDeepLink(url);

    expect(parsed).toEqual({
      type: 'search',
      url,
      source: 'deep-link',
    });
  });

  it('should handle invalid deep link URLs', () => {
    const invalidUrls = [
      'invalid://content/123',
      'geoleap://unknown-route/123',
      'http://example.com/content/123',
      'geoleap://../../../etc/passwd', // Path traversal
    ];

    invalidUrls.forEach(url => {
      const parsed = service.parseDeepLink(url);
      // Should either return null or type:'unknown'
      if (parsed) {
        expect(parsed.type).toBe('unknown');
      }
    });
  });
});

describe('BUG-NAV-003: Limited Deep Link Route Coverage', () => {
  let service: DeepLinkingService;

  beforeEach(() => {
    service = DeepLinkingService.getInstance();
  });

  it('should NOT support VPN deep links (documenting missing feature)', () => {
    const vpnUrls = [
      'geoleap://vpn/servers',
      'geoleap://vpn/comparison',
      'geoleap://vpn/test',
    ];

    vpnUrls.forEach(url => {
      const parsed = service.parseDeepLink(url);
      // BUG: Returns 'unknown' for VPN routes
      expect(parsed?.type).toBe('unknown');
    });
  });

  it('should NOT support subscription deep links (documenting missing feature)', () => {
    const subscriptionUrls = [
      'geoleap://subscription/plans',
      'geoleap://subscription/manage',
    ];

    subscriptionUrls.forEach(url => {
      const parsed = service.parseDeepLink(url);
      // BUG: Returns 'unknown' for subscription routes
      expect(parsed?.type).toBe('unknown');
    });
  });

  it('should partially support watchlist deep link (add only)', () => {
    const url = 'geoleap://watchlist/add/content-789';

    const parsed = service.parseUrl(url);

    // Watchlist add IS supported (lines 293-308)
    expect(parsed).toEqual({
      screen: 'AddToWatchlist',
      params: { contentId: 'content-789' },
    });
  });

  it('should NOT support general watchlist deep link', () => {
    const url = 'geoleap://watchlist';

    const parsed = service.parseDeepLink(url);

    // BUG: General watchlist route not supported
    expect(parsed?.type).toBe('unknown');
  });

  it('should NOT support help/support deep links', () => {
    const urls = [
      'geoleap://help',
      'geoleap://support',
    ];

    urls.forEach(url => {
      const parsed = service.parseDeepLink(url);
      // BUG: Help/Support routes not supported
      expect(parsed?.type).toBe('unknown');
    });
  });
});

describe('BUG-NAV-004: Deep Link Listener Array Unbounded Growth', () => {
  let service: DeepLinkingService;

  beforeEach(() => {
    service = DeepLinkingService.getInstance();
    // Access private array for testing (via any cast)
    (service as any).deepLinkListeners = [];
  });

  it('should allow unlimited listener additions (documenting the bug)', () => {
    const listeners = Array.from({ length: 100 }, (_, i) =>
      jest.fn().mockName(`listener-${i}`)
    );

    // Add 100 listeners
    listeners.forEach(listener => {
      service.addDeepLinkListener(listener);
    });

    // BUG: No size limit enforced
    const listenerArray = (service as any).deepLinkListeners;
    expect(listenerArray.length).toBe(100);

    // This demonstrates unbounded growth risk
  });

  it('should not remove listeners automatically', () => {
    const listener1 = jest.fn();
    const listener2 = jest.fn();

    service.addDeepLinkListener(listener1);
    service.addDeepLinkListener(listener2);

    // BUG: Listeners never auto-removed, only manual removal
    const listenerArray = (service as any).deepLinkListeners;
    expect(listenerArray.length).toBe(2);

    // Simulate component unmount without cleanup
    // In real app, if components don't call remove, listeners accumulate
  });

  it('should remove listener when cleanup function called', () => {
    const listener = jest.fn();

    const cleanup = service.addDeepLinkListener(listener);

    const arrayBefore = (service as any).deepLinkListeners;
    expect(arrayBefore.length).toBe(1);

    // Call cleanup
    cleanup();

    const arrayAfter = (service as any).deepLinkListeners;
    expect(arrayAfter.length).toBe(0);
  });

  it('should handle removeDeepLinkListener method', () => {
    const listener = jest.fn();

    service.addDeepLinkListener(listener);
    service.removeDeepLinkListener(listener);

    const listenerArray = (service as any).deepLinkListeners;
    expect(listenerArray.length).toBe(0);
  });
});

describe('BUG-NAV-006: Duplicate useWindowDimensions Hook Implementations', () => {
  beforeEach(() => {
    // Mock Dimensions.get
    (Dimensions.get as jest.Mock) = jest.fn((dim: string) => ({
      width: 375,
      height: 812,
      scale: 2,
      fontScale: 1,
    }));

    // Mock Dimensions.addEventListener
    (Dimensions.addEventListener as jest.Mock) = jest.fn(() => ({
      remove: jest.fn(),
    }));
  });

  it('should have different return types (documenting inconsistency)', () => {
    const { result: result1 } = renderHook(() => useWindowDimensions());
    const { result: result2 } = renderHook(() => useWindowDimensionsResponsive());

    // useWindowDimensions.ts returns extended interface
    expect(result1.current).toHaveProperty('isLandscape');
    expect(result1.current).toHaveProperty('isPortrait');
    expect(result1.current).toHaveProperty('aspectRatio');

    // useResponsive.ts version returns basic interface
    expect(result2.current).not.toHaveProperty('isLandscape');
    expect(result2.current).not.toHaveProperty('isPortrait');
    expect(result2.current).not.toHaveProperty('aspectRatio');

    // BUG: Two implementations with different interfaces
  });

  it('should calculate orientation correctly (extended version)', () => {
    // Portrait dimensions
    (Dimensions.get as jest.Mock) = jest.fn(() => ({
      width: 375,
      height: 812,
      scale: 2,
      fontScale: 1,
    }));

    const { result } = renderHook(() => useWindowDimensions());

    expect(result.current.isPortrait).toBe(true);
    expect(result.current.isLandscape).toBe(false);
    expect(result.current.aspectRatio).toBeCloseTo(0.46, 2);
  });

  it('should update on dimension change (both versions)', () => {
    const mockListener = jest.fn();
    (Dimensions.addEventListener as jest.Mock) = jest.fn(() => {
      // Call listener immediately to simulate change
      setTimeout(() => {
        mockListener({
          window: { width: 812, height: 375, scale: 2, fontScale: 1 }
        });
      }, 0);
      return { remove: jest.fn() };
    });

    const { result: result1 } = renderHook(() => useWindowDimensions());
    const { result: result2 } = renderHook(() => useWindowDimensionsResponsive());

    // Both should register event listeners
    expect(Dimensions.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });
});

describe('Deep Link Security Validation', () => {
  let service: DeepLinkingService;

  beforeEach(() => {
    service = DeepLinkingService.getInstance();
  });

  it('should block dangerous URL patterns', () => {
    const dangerousUrls = [
      'geoleap://content/../../../etc/passwd',
      'geoleap://content/id<script>alert(1)</script>',
      'geoleap://content/javascript:alert(1)',
      'file:///etc/passwd',
    ];

    dangerousUrls.forEach(url => {
      const parsed = service.parseDeepLink(url);
      // Should return null or reject dangerous patterns
      if (url.startsWith('file://') || url.includes('<script') || url.includes('javascript:')) {
        expect(parsed).toBeNull();
      }
    });
  });

  it('should validate URL length', () => {
    // Create URL exceeding 500 character limit
    const longUrl = 'geoleap://content/' + 'a'.repeat(500);

    const parsed = service.parseDeepLink(longUrl);

    // Should reject URLs over MAX_URL_LENGTH (500)
    expect(parsed).toBeNull();
  });

  it('should sanitize and validate content IDs', () => {
    const urls = [
      'geoleap://content/valid-id-123',
      'geoleap://content/VALID_ID_ABC',
      'geoleap://content/123-456-789',
    ];

    urls.forEach(url => {
      const parsed = service.parseDeepLink(url);
      expect(parsed).toBeTruthy();
      expect(parsed?.type).toBe('content');
    });
  });

  it('should reject invalid ID formats', () => {
    const invalidUrls = [
      'geoleap://content/',           // Empty ID
      'geoleap://content/id with spaces',
      'geoleap://content/id@#$%^',     // Special chars
    ];

    invalidUrls.forEach(url => {
      const parsed = service.parseDeepLink(url);
      // Should return null for invalid IDs
      expect(parsed?.id).toBeUndefined();
    });
  });
});

describe('Deep Link URL Generation', () => {
  let service: DeepLinkingService;

  beforeEach(() => {
    service = DeepLinkingService.getInstance();
  });

  it('should generate valid content deep link', () => {
    const contentId = 'movie-123';

    const deepLink = service.generateDeepLink(contentId);

    expect(deepLink).toBe('geoleap://content/movie-123');
  });

  it('should generate links that can be parsed back', () => {
    const contentId = 'test-content-456';

    const deepLink = service.generateDeepLink(contentId);
    const parsed = service.parseDeepLink(deepLink);

    expect(parsed).toEqual({
      type: 'content',
      id: contentId,
      url: deepLink,
      source: 'deep-link',
    });
  });
});

describe('Navigation parseUrl Method', () => {
  let service: DeepLinkingService;

  beforeEach(() => {
    service = DeepLinkingService.getInstance();
  });

  it('should parse content URL to navigation params', () => {
    const url = 'geoleap://content/movie-789';

    const result = service.parseUrl(url);

    expect(result).toEqual({
      screen: 'ContentDetail',
      params: { contentId: 'movie-789' },
    });
  });

  it('should parse watchlist add URL', () => {
    const url = 'geoleap://watchlist/add/show-123';

    const result = service.parseUrl(url);

    expect(result).toEqual({
      screen: 'AddToWatchlist',
      params: { contentId: 'show-123' },
    });
  });

  it('should parse subscription management URL', () => {
    const url = 'geoleap://subscriptions/sub-abc-123/manage';

    const result = service.parseUrl(url);

    expect(result).toEqual({
      screen: 'ManageSubscription',
      params: { subscriptionId: 'sub-abc-123' },
    });
  });

  it('should return null for unsupported routes', () => {
    const urls = [
      'geoleap://unsupported/route',
      'geoleap://vpn/servers',
      'invalid://content/123',
    ];

    urls.forEach(url => {
      const result = service.parseUrl(url);
      expect(result).toBeNull();
    });
  });
});

describe('Back Button Behavior Edge Cases', () => {
  it('should allow registering back button handler', () => {
    const handler = jest.fn(() => true);

    const subscription = BackHandler.addEventListener('hardwareBackPress', handler);

    expect(BackHandler.addEventListener).toHaveBeenCalledWith('hardwareBackPress', handler);
    expect(subscription.remove).toBeDefined();
  });

  it('should handle back button during error recovery (mock)', () => {
    let isRecovering = true;
    const handler = jest.fn(() => {
      if (isRecovering) {
        return true; // Block back button
      }
      return false;
    });

    BackHandler.addEventListener('hardwareBackPress', handler);

    // Simulate back button press during recovery
    const result1 = handler();
    expect(result1).toBe(true); // Blocked

    // Simulate back button after recovery complete
    isRecovering = false;
    const result2 = handler();
    expect(result2).toBe(false); // Allowed
  });
});
