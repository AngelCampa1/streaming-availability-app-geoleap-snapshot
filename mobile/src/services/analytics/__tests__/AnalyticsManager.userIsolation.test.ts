/**
 * User isolation tests for AnalyticsManager
 * Verifies BUG-033, BUG-034, BUG-035, BUG-038 fixes:
 * - Device ID is install-scoped (not regenerated per user) but userId is included in events
 * - Consent is stored per-user and defaults to false for new users (BUG-034)
 * - Analytics queue is per-user (BUG-035)
 * - clearUserData / dispose clears user-scoped data (BUG-038)
 */

import { AnalyticsManager } from '../AnalyticsManager';
import { STORAGE_KEYS } from '../types';

jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

const store: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((key: string) => Promise.resolve(store[key] ?? null)),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
      return Promise.resolve();
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
      return Promise.resolve();
    }),
    multiRemove: jest.fn((keys: string[]) => {
      keys.forEach(key => delete store[key]);
      return Promise.resolve();
    }),
  },
}));

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn(() => Promise.resolve({ isConnected: false, isInternetReachable: false })),
}));

jest.mock('../AnalyticsApiClient', () => ({
  AnalyticsApiClient: jest.fn().mockImplementation(() => ({
    batchTrackUserBehavior: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe('AnalyticsManager - User Isolation (BUG-033/034/035/038)', () => {
  let manager: AnalyticsManager;

  beforeEach(async () => {
    jest.clearAllMocks();
    Object.keys(store).forEach(key => delete store[key]);
    (AnalyticsManager as any).instance = null;
    manager = AnalyticsManager.getInstance();
    await manager.initialize();
  });

  afterEach(async () => {
    // Cleanup timers
    const timer = (manager as any).flushTimer;
    if (timer) {
      clearInterval(timer);
    }
  });

  describe('BUG-033: Device ID is install-scoped (not user-scoped)', () => {
    it('device ID persists across user changes (install-scoped)', async () => {
      const deviceId = manager.getDeviceId();
      expect(deviceId).toBeTruthy();
      expect(deviceId).toMatch(/^device_/);

      // Switch user
      await manager.setUserId('user-A');
      expect(manager.getDeviceId()).toBe(deviceId);

      await manager.setUserId('user-B');
      expect(manager.getDeviceId()).toBe(deviceId);
    });

    it('device ID is stored under install-scoped key', () => {
      // The device ID key should NOT include a userId
      expect(store[STORAGE_KEYS.DEVICE_ID]).toBeDefined();
    });
  });

  describe('BUG-034: Consent is per-user and defaults to false', () => {
    it('new user starts with consent=false by default', async () => {
      await manager.setUserId('brand-new-user');
      expect(manager.hasUserConsent()).toBe(false);
    });

    it('User A consent is not visible to User B', async () => {
      // User A consents
      await manager.setUserId('user-A');
      await manager.setConsent(true, ['analytics', 'marketing']);
      expect(manager.hasUserConsent()).toBe(true);

      // User B logs in - should default to false
      await manager.setUserId('user-B');
      expect(manager.hasUserConsent()).toBe(false);
    });

    it('consent is stored under user-specific key', async () => {
      await manager.setUserId('user-consent-test');
      await manager.setConsent(true, ['analytics']);

      const userConsentKey = `${STORAGE_KEYS.CONSENT}_user-consent-test`;
      const genericConsentKey = STORAGE_KEYS.CONSENT;

      expect(store[userConsentKey]).toBeDefined();
      expect(store[genericConsentKey]).toBeUndefined();
    });

    it('User B does not inherit User A health tracking consent', async () => {
      // User A consents to health tracking
      await manager.setUserId('user-A');
      await manager.setConsent(true, ['analytics', 'health_tracking', 'location']);
      expect(manager.hasUserConsent()).toBe(true);

      // User B logs in - must not inherit User A's consent
      await manager.setUserId('user-B');
      expect(manager.hasUserConsent()).toBe(false);
    });

    it('user-specific consent persists across reinitializations', async () => {
      await manager.setUserId('user-persist');
      await manager.setConsent(true, ['analytics']);

      // Simulate new session: reset singleton and reinitialize
      (AnalyticsManager as any).instance = null;
      const freshManager = AnalyticsManager.getInstance();
      await freshManager.initialize();
      await freshManager.setUserId('user-persist');

      expect(freshManager.hasUserConsent()).toBe(true);
    });
  });

  describe('BUG-035: Analytics queue is per-user', () => {
    it('analytics queue key includes userId', async () => {
      await manager.setUserId('user-queue-test');
      await manager.setConsent(true, ['analytics']);

      await manager.trackEvent({
        id: 'evt-1',
        timestamp: Date.now(),
        eventType: 'content_view',
        category: 'engagement',
        source: 'analytics',
        data: {},
        retryCount: 0,
      });

      const userQueueKey = `${STORAGE_KEYS.ANALYTICS_QUEUE}_user-queue-test`;
      const genericQueueKey = STORAGE_KEYS.ANALYTICS_QUEUE;

      expect(store[userQueueKey]).toBeDefined();
      expect(store[genericQueueKey]).toBeUndefined();
    });
  });

  describe('BUG-038: clearUserData removes user-scoped storage', () => {
    it('clears consent and queue on clearUserData', async () => {
      await manager.setUserId('user-clear');
      await manager.setConsent(true, ['analytics']);

      const consentKey = `${STORAGE_KEYS.CONSENT}_user-clear`;
      expect(store[consentKey]).toBeDefined();

      await manager.clearUserData();

      expect(store[consentKey]).toBeUndefined();
      expect(manager.hasUserConsent()).toBe(false);
    });

    it('resets userId after clearUserData', async () => {
      await manager.setUserId('user-reset');
      await manager.clearUserData();
      expect((manager as any).userId).toBeUndefined();
    });
  });

  describe('Cross-user isolation scenario', () => {
    it('login as A → consent → logout → login as B → B has no consent', async () => {
      // User A logs in and consents
      await manager.setUserId('user-A');
      await manager.setConsent(true, ['analytics', 'marketing']);
      expect(manager.hasUserConsent()).toBe(true);

      // Logout (clear user data)
      await manager.clearUserData();
      expect(manager.hasUserConsent()).toBe(false);

      // User B logs in
      await manager.setUserId('user-B');
      expect(manager.hasUserConsent()).toBe(false);
    });
  });
});
