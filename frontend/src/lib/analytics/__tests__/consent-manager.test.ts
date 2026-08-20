/**
 * ConsentManager Tests - TDD RED PHASE
 * Write tests FIRST before implementation
 * These tests will FAIL until ConsentManager is implemented
 */

import { ConsentManager } from '../consent-manager';
import { ConsentState, STORAGE_KEYS, CONSENT_VERSION } from '@/types/analytics';

describe('ConsentManager', () => {
  let consentManager: ConsentManager;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Reset singleton instance
    (ConsentManager as any).instance = null;
    consentManager = ConsentManager.getInstance();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should initialize with all consent denied by default', () => {
    const consent = consentManager.getConsent();

    expect(consent).toBeDefined();
    expect(consent.analytics).toBe(false);
    expect(consent.marketing).toBe(false);
    expect(consent.functional).toBe(false);
    expect(consent.version).toBe(CONSENT_VERSION);
    expect(consent.timestamp).toBeInstanceOf(Date);
  });

  it('should persist consent to localStorage', () => {
    const newConsent: ConsentState = {
      analytics: true,
      marketing: false,
      functional: true,
      timestamp: new Date(),
      version: CONSENT_VERSION,
    };

    consentManager.updateConsent(newConsent);

    const stored = localStorage.getItem(STORAGE_KEYS.CONSENT);
    expect(stored).toBeDefined();

    const parsed = JSON.parse(stored!);
    expect(parsed.analytics).toBe(true);
    expect(parsed.marketing).toBe(false);
    expect(parsed.functional).toBe(true);
    expect(parsed.version).toBe(CONSENT_VERSION);
  });

  it('should load consent from localStorage on initialization', () => {
    const existingConsent: ConsentState = {
      analytics: true,
      marketing: true,
      functional: false,
      timestamp: new Date(),
      version: CONSENT_VERSION,
    };

    // Pre-populate localStorage
    localStorage.setItem(STORAGE_KEYS.CONSENT, JSON.stringify(existingConsent));

    // Create new instance that should load from localStorage
    (ConsentManager as any).instance = null;
    const newManager = ConsentManager.getInstance();

    const consent = newManager.getConsent();
    expect(consent.analytics).toBe(true);
    expect(consent.marketing).toBe(true);
    expect(consent.functional).toBe(false);
  });

  it('should notify observers when consent changes', () => {
    const observer = jest.fn();

    consentManager.subscribe(observer);

    const newConsent: ConsentState = {
      analytics: true,
      marketing: true,
      functional: true,
      timestamp: new Date(),
      version: CONSENT_VERSION,
    };

    consentManager.updateConsent(newConsent);

    expect(observer).toHaveBeenCalledTimes(1);
    // updateConsent re-stamps `timestamp` with its own `new Date()` (the moment
    // consent was actually recorded), so the observed object intentionally
    // differs from the caller's timestamp. Assert the consent fields and that a
    // Date timestamp was set, rather than pinning the exact millisecond  -  that
    // made the test flaky when the two Date() calls straddled a ms boundary.
    expect(observer).toHaveBeenCalledWith(
      expect.objectContaining({
        analytics: true,
        marketing: true,
        functional: true,
        version: CONSENT_VERSION,
        timestamp: expect.any(Date),
      })
    );
  });

  it('should return true for hasAnalyticsConsent when analytics accepted', () => {
    const consentWithAnalytics: ConsentState = {
      analytics: true,
      marketing: false,
      functional: false,
      timestamp: new Date(),
      version: CONSENT_VERSION,
    };

    consentManager.updateConsent(consentWithAnalytics);

    expect(consentManager.hasAnalyticsConsent()).toBe(true);
  });

  it('should return false for hasAnalyticsConsent when analytics denied', () => {
    const consentWithoutAnalytics: ConsentState = {
      analytics: false,
      marketing: true,
      functional: true,
      timestamp: new Date(),
      version: CONSENT_VERSION,
    };

    consentManager.updateConsent(consentWithoutAnalytics);

    expect(consentManager.hasAnalyticsConsent()).toBe(false);
  });

  it('should update consent version on change', () => {
    const newConsent: ConsentState = {
      analytics: true,
      marketing: true,
      functional: true,
      timestamp: new Date(),
      version: CONSENT_VERSION,
    };

    consentManager.updateConsent(newConsent);

    const consent = consentManager.getConsent();
    expect(consent.version).toBe(CONSENT_VERSION);
  });

  it('should handle corrupted localStorage gracefully', () => {
    // Corrupt localStorage with invalid JSON
    localStorage.setItem(STORAGE_KEYS.CONSENT, 'invalid-json{{{');

    // Should not throw, should fall back to default consent
    (ConsentManager as any).instance = null;
    const newManager = ConsentManager.getInstance();

    const consent = newManager.getConsent();
    expect(consent.analytics).toBe(false);
    expect(consent.marketing).toBe(false);
    expect(consent.functional).toBe(false);
  });

  it('should return true for hasMarketingConsent when marketing accepted', () => {
    const consentWithMarketing: ConsentState = {
      analytics: false,
      marketing: true,
      functional: false,
      timestamp: new Date(),
      version: CONSENT_VERSION,
    };

    consentManager.updateConsent(consentWithMarketing);

    expect(consentManager.hasMarketingConsent()).toBe(true);
  });

  it('should return false for hasMarketingConsent when marketing denied', () => {
    const consentWithoutMarketing: ConsentState = {
      analytics: true,
      marketing: false,
      functional: true,
      timestamp: new Date(),
      version: CONSENT_VERSION,
    };

    consentManager.updateConsent(consentWithoutMarketing);

    expect(consentManager.hasMarketingConsent()).toBe(false);
  });

  it('should return true for hasFunctionalConsent when functional accepted', () => {
    const consentWithFunctional: ConsentState = {
      analytics: false,
      marketing: false,
      functional: true,
      timestamp: new Date(),
      version: CONSENT_VERSION,
    };

    consentManager.updateConsent(consentWithFunctional);

    expect(consentManager.hasFunctionalConsent()).toBe(true);
  });

  it('should return false for hasFunctionalConsent when functional denied', () => {
    const consentWithoutFunctional: ConsentState = {
      analytics: true,
      marketing: true,
      functional: false,
      timestamp: new Date(),
      version: CONSENT_VERSION,
    };

    consentManager.updateConsent(consentWithoutFunctional);

    expect(consentManager.hasFunctionalConsent()).toBe(false);
  });

  it('should allow unsubscribing observers', () => {
    const observer1 = jest.fn();
    const observer2 = jest.fn();

    consentManager.subscribe(observer1);
    consentManager.subscribe(observer2);

    const newConsent: ConsentState = {
      analytics: true,
      marketing: true,
      functional: true,
      timestamp: new Date(),
      version: CONSENT_VERSION,
    };

    consentManager.updateConsent(newConsent);

    expect(observer1).toHaveBeenCalledTimes(1);
    expect(observer2).toHaveBeenCalledTimes(1);

    // Unsubscribe observer1
    consentManager.unsubscribe(observer1);

    // Update consent again
    consentManager.updateConsent({
      ...newConsent,
      analytics: false,
    });

    // Observer1 should not be called again, but observer2 should
    expect(observer1).toHaveBeenCalledTimes(1); // Still 1
    expect(observer2).toHaveBeenCalledTimes(2); // Now 2
  });

  it('should accept all consent when acceptAll is called', () => {
    const observer = jest.fn();
    consentManager.subscribe(observer);

    consentManager.acceptAll();

    const consent = consentManager.getConsent();
    expect(consent.analytics).toBe(true);
    expect(consent.marketing).toBe(true);
    expect(consent.functional).toBe(true);
    expect(observer).toHaveBeenCalledWith(consent);
  });

  it('should reject all consent when rejectAll is called', () => {
    // First accept all
    consentManager.acceptAll();

    const observer = jest.fn();
    consentManager.subscribe(observer);

    // Then reject all
    consentManager.rejectAll();

    const consent = consentManager.getConsent();
    expect(consent.analytics).toBe(false);
    expect(consent.marketing).toBe(false);
    expect(consent.functional).toBe(false);
    expect(observer).toHaveBeenCalledWith(consent);
  });

  it('should persist acceptAll consent to localStorage', () => {
    consentManager.acceptAll();

    const stored = localStorage.getItem(STORAGE_KEYS.CONSENT);
    expect(stored).toBeDefined();

    const parsed = JSON.parse(stored!);
    expect(parsed.analytics).toBe(true);
    expect(parsed.marketing).toBe(true);
    expect(parsed.functional).toBe(true);
  });

  it('should persist rejectAll consent to localStorage', () => {
    consentManager.rejectAll();

    const stored = localStorage.getItem(STORAGE_KEYS.CONSENT);
    expect(stored).toBeDefined();

    const parsed = JSON.parse(stored!);
    expect(parsed.analytics).toBe(false);
    expect(parsed.marketing).toBe(false);
    expect(parsed.functional).toBe(false);
  });

  it('should treat persisted rejectAll as an existing consent decision', () => {
    consentManager.rejectAll();

    expect(consentManager.hasStoredConsent()).toBe(true);
  });
});
