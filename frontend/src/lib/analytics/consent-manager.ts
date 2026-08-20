/**
 * ConsentManager - GDPR Consent State Management
 * Singleton service for managing user consent preferences
 * Implements observer pattern for consent state changes
 */

import { ConsentState, ConsentObserver, STORAGE_KEYS, CONSENT_VERSION } from '@/types/analytics';

export class ConsentManager {
  private static instance: ConsentManager | null = null;
  private consentState: ConsentState;
  private observers: ConsentObserver[] = [];

  private constructor() {
    this.consentState = this.loadConsentFromStorage() || this.getDefaultConsent();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ConsentManager {
    if (!ConsentManager.instance) {
      ConsentManager.instance = new ConsentManager();
    }
    return ConsentManager.instance;
  }

  /**
   * Get current consent state
   */
  public getConsent(): ConsentState {
    return { ...this.consentState };
  }

  /**
   * Check whether the current browser has a persisted consent decision.
   */
  public hasStoredConsent(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CONSENT);
      if (!stored) {
        return false;
      }

      const parsed = JSON.parse(stored);
      return (
        typeof parsed.analytics === 'boolean' &&
        typeof parsed.marketing === 'boolean' &&
        typeof parsed.functional === 'boolean' &&
        parsed.version === CONSENT_VERSION
      );
    } catch {
      return false;
    }
  }

  /**
   * Update consent state and notify observers
   */
  public updateConsent(consent: ConsentState): void {
    this.consentState = {
      ...consent,
      timestamp: new Date(),
      version: CONSENT_VERSION,
    };

    this.persistConsentToStorage(this.consentState);
    this.notifyObservers();
  }

  /**
   * Check if analytics consent is granted
   */
  public hasAnalyticsConsent(): boolean {
    return this.consentState.analytics;
  }

  /**
   * Check if marketing consent is granted
   */
  public hasMarketingConsent(): boolean {
    return this.consentState.marketing;
  }

  /**
   * Check if functional consent is granted
   */
  public hasFunctionalConsent(): boolean {
    return this.consentState.functional;
  }

  /**
   * Subscribe to consent state changes
   */
  public subscribe(observer: ConsentObserver): void {
    this.observers.push(observer);
  }

  /**
   * Unsubscribe from consent state changes
   */
  public unsubscribe(observer: ConsentObserver): void {
    this.observers = this.observers.filter((obs) => obs !== observer);
  }

  /**
   * Accept all consent categories
   */
  public acceptAll(): void {
    this.updateConsent({
      analytics: true,
      marketing: true,
      functional: true,
      timestamp: new Date(),
      version: CONSENT_VERSION,
    });
  }

  /**
   * Reject all consent categories
   */
  public rejectAll(): void {
    this.updateConsent({
      analytics: false,
      marketing: false,
      functional: false,
      timestamp: new Date(),
      version: CONSENT_VERSION,
    });
  }

  /**
   * Get default consent state (all denied)
   */
  private getDefaultConsent(): ConsentState {
    return {
      analytics: false,
      marketing: false,
      functional: false,
      timestamp: new Date(),
      version: CONSENT_VERSION,
    };
  }

  /**
   * Load consent from localStorage
   */
  private loadConsentFromStorage(): ConsentState | null {
    // SSR Safety: Only access localStorage in browser environment
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CONSENT);
      if (!stored) {
        return null;
      }

      const parsed = JSON.parse(stored);

      // Validate structure
      if (
        typeof parsed.analytics !== 'boolean' ||
        typeof parsed.marketing !== 'boolean' ||
        typeof parsed.functional !== 'boolean'
      ) {
        console.warn('[ConsentManager] Invalid consent structure in localStorage');
        return null;
      }

      // Convert timestamp back to Date object
      return {
        ...parsed,
        timestamp: new Date(parsed.timestamp),
      };
    } catch (error) {
      console.error('[ConsentManager] Failed to load consent from localStorage:', error);
      return null;
    }
  }

  /**
   * Persist consent to localStorage
   */
  private persistConsentToStorage(consent: ConsentState): void {
    // SSR Safety: Only access localStorage in browser environment
    if (typeof window === 'undefined') {
      return;
    }

    try {
      localStorage.setItem(STORAGE_KEYS.CONSENT, JSON.stringify(consent));
    } catch (error) {
      console.error('[ConsentManager] Failed to persist consent to localStorage:', error);
    }
  }

  /**
   * Notify all observers of consent state change
   */
  private notifyObservers(): void {
    this.observers.forEach((observer) => {
      try {
        observer(this.getConsent());
      } catch (error) {
        console.error('[ConsentManager] Observer notification failed:', error);
      }
    });
  }
}

// Export singleton instance
export const consentManager = ConsentManager.getInstance();

export default consentManager;
