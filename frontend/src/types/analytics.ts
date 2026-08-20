/**
 * Analytics Type Definitions
 * Shared interfaces for analytics events, consent management, and tracking
 */

// Event types
export interface AnalyticsEvent {
  name: string;
  category: string;
  properties?: Record<string, unknown>;
  userId?: string;
  timestamp?: Date;
}

export interface PageViewEvent {
  page: string;
  title: string;
  referrer?: string;
  properties?: Record<string, unknown>;
}

export interface ConversionEvent {
  type: 'subscription' | 'signup' | 'purchase';
  value?: number;
  currency?: string;
  plan?: string;
  properties?: Record<string, unknown>;
}

export interface SearchEvent {
  query: string;
  resultsCount: number;
  filters?: Record<string, unknown>;
}

export interface AuthEvent {
  method: 'email' | 'google' | 'apple';
  action: 'login' | 'signup' | 'logout';
  success: boolean;
  error?: string;
}

export interface ContentEvent {
  contentId: string;
  contentType: 'movie' | 'tv';
  action: 'view' | 'click' | 'add_to_watchlist' | 'remove_from_watchlist' | 'share' | 'rate';
  properties?: Record<string, unknown>;
}

// Consent types
export interface ConsentState {
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
  timestamp: Date;
  version: string; // e.g., "1.0"
}

export enum ConsentCategory {
  Analytics = 'analytics',
  Marketing = 'marketing',
  Functional = 'functional',
}

// Observer pattern for consent changes
export type ConsentObserver = (consent: ConsentState) => void;

// Analytics provider interface
export interface AnalyticsProvider {
  initialize(): void;
  setUserId(userId: string): void;
  trackEvent(event: AnalyticsEvent): void;
  trackPageView(event: PageViewEvent): void;
  trackConversion(event: ConversionEvent): void;
  trackError(error: Error, context?: Record<string, unknown>): void;
}

// Storage keys (centralized to avoid typos)
export const STORAGE_KEYS = {
  CONSENT: 'geoleap_consent',
  DEVICE_ID: 'geoleap_device_id',
  SESSION_ID: 'geoleap_session_id',
} as const;

// Consent version (increment when consent structure changes)
export const CONSENT_VERSION = '1.0';
