/**
 * GeoLeap Growth Analytics - Client-side tracking SDK
 * Privacy-compliant, high-performance event tracking with GDPR consent management
 */

import { logger } from '../logger';

export interface GrowthEvent {
  eventName: string;
  category: string;
  userId?: string;
  sessionId: string;
  deviceId?: string;
  clientTimestamp: Date;
  properties?: Record<string, unknown>;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  referrer?: string;
  landingPage?: string;
  screenResolution?: string;
  viewportSize?: string;
  eventValue?: number;
  currency?: string;
  hasConsent: boolean;
  consentCategories?: string;
}

export interface GrowthTrackingConfig {
  apiEndpoint: string;
  apiKey?: string;
  batchSize: number;
  flushInterval: number;
  enableConsent: boolean;
  enableAutoTracking: boolean;
  trackPageViews: boolean;
  trackClicks: boolean;
  trackFormSubmissions: boolean;
  enableLocalStorage: boolean;
  enableSessionStorage: boolean;
  enableCookies: boolean;
  cookieDomain?: string;
  sessionTimeout: number;
  deviceIdExpiry: number;
  debug: boolean;
}

export interface ConsentState {
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
  timestamp: Date;
  version: string;
}

export class GrowthTracker {
  private config: GrowthTrackingConfig;
  private eventQueue: GrowthEvent[] = [];
  private sessionId: string;
  private deviceId: string;
  private userId?: string;
  private consentState: ConsentState | null = null;
  private flushTimer?: NodeJS.Timeout;
  private sessionCheckTimer?: NodeJS.Timeout;
  private isInitialized = false;
  private lastActivity = Date.now();
  private popStateHandler?: () => void;
  private boundUpdateActivity: () => void;
  private boundHandleClickEvent: (event: MouseEvent) => void;
  private boundHandleSubmitEvent: (event: Event) => void;
  private boundBeforeUnloadHandler: () => void;
  private boundVisibilityChangeHandler: () => void;

  constructor(config: Partial<GrowthTrackingConfig> = {}) {
    this.config = {
      apiEndpoint: '/api/growth-analytics/events',
      batchSize: 20,
      flushInterval: 5000, // 5 seconds
      enableConsent: true,
      enableAutoTracking: true,
      trackPageViews: true,
      trackClicks: true,
      trackFormSubmissions: true,
      enableLocalStorage: true,
      enableSessionStorage: true,
      enableCookies: true,
      sessionTimeout: 30 * 60 * 1000, // 30 minutes
      deviceIdExpiry: 365 * 24 * 60 * 60 * 1000, // 1 year
      debug: false,
      ...config,
    };

    this.sessionId = this.generateSessionId();
    this.deviceId = this.getOrCreateDeviceId();

    // Bind event handlers to preserve context
    this.boundUpdateActivity = this.updateActivity.bind(this);
    this.boundHandleClickEvent = this.handleClickEvent.bind(this);
    this.boundHandleSubmitEvent = this.handleSubmitEvent.bind(this);
    this.boundBeforeUnloadHandler = this.handleBeforeUnload.bind(this);
    this.boundVisibilityChangeHandler = this.handleVisibilityChange.bind(this);

    this.initialize();
  }

  /**
   * Initialize the tracking SDK
   */
  private initialize(): void {
    try {
      // Load consent state
      this.loadConsentState();

      // Set up automatic tracking if enabled and consent is granted
      if (this.config.enableAutoTracking && this.hasAnalyticsConsent()) {
        this.setupAutoTracking();
      }

      // Set up periodic flush
      this.startPeriodicFlush();

      // Set up session management
      this.setupSessionManagement();

      // Set up page unload handling
      this.setupUnloadHandling();

      this.isInitialized = true;
      this.debug('GrowthTracker initialized');
    } catch (error) {
      console.error('Failed to initialize GrowthTracker:', error);
    }
  }

  /**
   * Set user ID for tracking
   */
  setUserId(userId: string): void {
    this.userId = userId;
    this.debug('User ID set:', userId);
  }

  /**
   * Update consent state
   */
  updateConsent(consent: ConsentState): void {
    this.consentState = consent;

    if (this.config.enableLocalStorage) {
      try {
        localStorage.setItem('geoleap_consent', JSON.stringify(consent));
      } catch (error) {
        this.debug('Failed to save consent to localStorage:', error);
      }
    }

    // Enable/disable tracking based on consent
    if (consent.analytics && this.config.enableAutoTracking) {
      this.setupAutoTracking();
    }

    this.debug('Consent updated:', consent);
  }

  /**
   * Track a single event
   */
  track(eventName: string, properties: Record<string, unknown> = {}, category = 'interaction'): void {
    if (!this.hasAnalyticsConsent() && this.config.enableConsent) {
      this.debug('Analytics consent not granted, skipping event:', eventName);
      return;
    }

    const event: GrowthEvent = {
      eventName,
      category,
      userId: this.userId,
      sessionId: this.sessionId,
      deviceId: this.deviceId,
      clientTimestamp: new Date(),
      properties,
      hasConsent: this.hasAnalyticsConsent(),
      consentCategories: this.getConsentCategories(),
      ...this.getPageContext(),
      ...this.getUTMParameters(),
      ...this.getDeviceInfo(),
    };

    this.eventQueue.push(event);
    this.updateActivity();

    this.debug('Event queued:', eventName, properties);

    // Flush immediately if queue is full or if this is a critical event
    if (this.eventQueue.length >= this.config.batchSize || this.isCriticalEvent(eventName)) {
      this.flush();
    }
  }

  /**
   * Track page view
   */
  pageView(page?: string, properties: Record<string, unknown> = {}): void {
    const pageUrl = page || window.location.pathname;

    this.track(
      'page_view',
      {
        page: pageUrl,
        title: document.title,
        referrer: document.referrer,
        ...properties,
      },
      'navigation'
    );
  }

  /**
   * Track conversion event
   */
  conversion(type: string, value?: number, currency = 'USD', properties: Record<string, unknown> = {}): void {
    this.track(
      'conversion',
      {
        type,
        value,
        currency,
        ...properties,
      },
      'conversion'
    );
  }

  /**
   * Track form submission
   */
  formSubmission(formName: string, properties: Record<string, unknown> = {}): void {
    this.track(
      'form_submit',
      {
        form: formName,
        ...properties,
      },
      'interaction'
    );
  }

  /**
   * Track custom event
   */
  custom(eventName: string, properties: Record<string, unknown> = {}, category = 'custom'): void {
    this.track(eventName, properties, category);
  }

  /**
   * Flush all queued events to server
   */
  async flush(): Promise<void> {
    if (this.eventQueue.length === 0) {
      return;
    }

    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      const response = await fetch(`${this.config.apiEndpoint}/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { Authorization: `Bearer ${this.config.apiKey}` }),
        },
        body: JSON.stringify(events),
      });

      if (response.ok) {
        this.debug('Batch events sent successfully:', events.length);
      } else {
        // Re-queue events on failure (with limit to prevent infinite growth)
        if (this.eventQueue.length < 100) {
          this.eventQueue.unshift(...events);
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to send events:', error);

      // Re-queue events on network failure (with limit)
      if (this.eventQueue.length < 100) {
        this.eventQueue.unshift(...events);
      }
    }
  }

  /**
   * Reset tracking (new session)
   */
  reset(): void {
    this.sessionId = this.generateSessionId();
    this.userId = undefined;
    this.eventQueue = [];
    this.debug('Tracking reset with new session');
  }

  /**
   * Destroy tracker and clean up resources
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    if (this.sessionCheckTimer) {
      clearInterval(this.sessionCheckTimer);
    }

    // Flush remaining events
    this.flush();

    // Remove event listeners
    this.removeAutoTrackingListeners();

    // Remove session management listeners
    document.removeEventListener('mousedown', this.boundUpdateActivity);
    document.removeEventListener('keydown', this.boundUpdateActivity);
    document.removeEventListener('scroll', this.boundUpdateActivity);

    // Remove unload handling listeners
    window.removeEventListener('beforeunload', this.boundBeforeUnloadHandler);
    document.removeEventListener('visibilitychange', this.boundVisibilityChangeHandler);

    this.isInitialized = false;
    this.debug('GrowthTracker destroyed');
  }

  /**
   * Check if analytics consent is granted
   */
  private hasAnalyticsConsent(): boolean {
    if (!this.config.enableConsent) return true;
    return this.consentState?.analytics ?? false;
  }

  /**
   * Get consent categories string
   */
  private getConsentCategories(): string {
    if (!this.consentState) return '';

    const categories = [];
    if (this.consentState.analytics) categories.push('analytics');
    if (this.consentState.marketing) categories.push('marketing');
    if (this.consentState.functional) categories.push('functional');

    return categories.join(',');
  }

  /**
   * Load consent state from storage
   */
  private loadConsentState(): void {
    if (!this.config.enableConsent) return;

    try {
      const stored = localStorage.getItem('geoleap_consent');
      if (stored) {
        this.consentState = JSON.parse(stored);
        this.debug('Consent state loaded:', this.consentState);
      }
    } catch (error) {
      this.debug('Failed to load consent state:', error);
    }
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get or create device ID
   */
  private getOrCreateDeviceId(): string {
    const storageKey = 'geoleap_device_id';

    try {
      // Try localStorage first
      if (this.config.enableLocalStorage) {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const data = JSON.parse(stored);
          if (Date.now() - data.timestamp < this.config.deviceIdExpiry) {
            return data.deviceId;
          }
        }
      }

      // Generate new device ID
      const deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`;

      // Store new device ID
      if (this.config.enableLocalStorage) {
        const data = {
          deviceId,
          timestamp: Date.now(),
        };
        localStorage.setItem(storageKey, JSON.stringify(data));
      }

      return deviceId;
    } catch (error) {
      this.debug('Failed to handle device ID:', error);
      return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    }
  }

  /**
   * Get UTM parameters from URL
   */
  private getUTMParameters(): Partial<GrowthEvent> {
    const params = new URLSearchParams(window.location.search);

    return {
      utmSource: params.get('utm_source') || undefined,
      utmMedium: params.get('utm_medium') || undefined,
      utmCampaign: params.get('utm_campaign') || undefined,
      utmTerm: params.get('utm_term') || undefined,
      utmContent: params.get('utm_content') || undefined,
    };
  }

  /**
   * Get page context information
   */
  private getPageContext(): Partial<GrowthEvent> {
    return {
      referrer: document.referrer || undefined,
      landingPage: window.location.href,
    };
  }

  /**
   * Get device and screen information
   */
  private getDeviceInfo(): Partial<GrowthEvent> {
    return {
      screenResolution: `${screen.width}x${screen.height}`,
      viewportSize: `${window.innerWidth}x${window.innerHeight}`,
    };
  }

  /**
   * Set up automatic event tracking
   */
  private setupAutoTracking(): void {
    if (!this.hasAnalyticsConsent()) return;

    // Track page views
    if (this.config.trackPageViews) {
      this.pageView();

      // Track SPA navigation (if using React Router or similar)
      this.popStateHandler = () => {
        this.pageView();
      };
      window.addEventListener('popstate', this.popStateHandler);
    }

    // Track clicks using bound handler
    if (this.config.trackClicks) {
      document.addEventListener('click', this.boundHandleClickEvent);
    }

    // Track form submissions using bound handler
    if (this.config.trackFormSubmissions) {
      document.addEventListener('submit', this.boundHandleSubmitEvent);
    }
  }

  /**
   * Handle click events
   */
  private handleClickEvent(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target) return;

    // Track button clicks
    if (target.tagName === 'BUTTON' || (target as HTMLInputElement).type === 'button') {
      this.track('button_click', {
        text: target.textContent?.trim(),
        id: target.id || undefined,
        className: target.className || undefined,
      });
    }

    // Track link clicks
    if (target.tagName === 'A') {
      const link = target as HTMLAnchorElement;
      this.track('link_click', {
        href: link.href,
        text: link.textContent?.trim(),
        external: !link.href.includes(window.location.hostname),
      });
    }
  }

  /**
   * Handle form submit events
   */
  private handleSubmitEvent(event: Event): void {
    const _submitEvent = event as SubmitEvent;
    const form = event.target as HTMLFormElement;
    if (!form) return;

    this.track('form_submit', {
      id: form.id || undefined,
      action: form.action || undefined,
      method: form.method || 'GET',
    });
  }

  /**
   * Remove auto-tracking event listeners
   */
  private removeAutoTrackingListeners(): void {
    document.removeEventListener('click', this.boundHandleClickEvent);
    document.removeEventListener('submit', this.boundHandleSubmitEvent);
    if (this.popStateHandler) {
      window.removeEventListener('popstate', this.popStateHandler);
    }
  }

  /**
   * Start periodic event flushing
   */
  private startPeriodicFlush(): void {
    this.flushTimer = setInterval(() => {
      if (this.eventQueue.length > 0) {
        this.flush();
      }
    }, this.config.flushInterval);
  }

  /**
   * Set up session management
   */
  private setupSessionManagement(): void {
    // Check session timeout
    const checkSession = () => {
      if (Date.now() - this.lastActivity > this.config.sessionTimeout) {
        this.reset();
      }
    };

    // Check session every minute and store the interval reference
    this.sessionCheckTimer = setInterval(checkSession, 60000);

    // Update activity on user interaction using bound handlers
    document.addEventListener('mousedown', this.boundUpdateActivity);
    document.addEventListener('keydown', this.boundUpdateActivity);
    document.addEventListener('scroll', this.boundUpdateActivity);
  }

  /**
   * Update last activity timestamp
   */
  private updateActivity(): void {
    this.lastActivity = Date.now();
  }

  /**
   * Set up page unload handling
   */
  private handleBeforeUnload(): void {
    // Use sendBeacon for reliable event sending during unload
    if (this.eventQueue.length > 0 && navigator.sendBeacon) {
      const data = JSON.stringify(this.eventQueue);
      navigator.sendBeacon(`${this.config.apiEndpoint}/batch`, data);
      this.eventQueue = [];
    }
  }

  private handleVisibilityChange(): void {
    if (document.hidden) {
      this.flush();
    }
  }

  private setupUnloadHandling(): void {
    // Flush events before page unload
    window.addEventListener('beforeunload', this.boundBeforeUnloadHandler);

    // Also handle page hide (mobile safari)
    document.addEventListener('visibilitychange', this.boundVisibilityChangeHandler);
  }

  /**
   * Check if an event is critical and should be sent immediately
   */
  private isCriticalEvent(eventName: string): boolean {
    const criticalEvents = ['conversion', 'signup', 'purchase', 'error'];
    return criticalEvents.includes(eventName);
  }

  /**
   * Debug logging
   */
  private debug(...args: unknown[]): void {
    if (this.config.debug) {
      logger.debug('[GrowthTracker]', { data: args.map(arg => arg instanceof Error ? arg.message : arg) });
    }
  }
}

/**
 * Global tracker instance
 */
let globalTracker: GrowthTracker | null = null;

/**
 * Initialize global growth tracker
 */
export function initGrowthTracking(config: Partial<GrowthTrackingConfig> = {}): GrowthTracker {
  if (globalTracker) {
    globalTracker.destroy();
  }

  globalTracker = new GrowthTracker(config);

  // Make available globally for console debugging
  if (typeof window !== 'undefined') {
    (window as { growthTracker?: GrowthTracker }).growthTracker = globalTracker;
  }

  return globalTracker;
}

/**
 * Get global tracker instance
 */
export function getGrowthTracker(): GrowthTracker | null {
  return globalTracker;
}

/**
 * Quick tracking functions using global instance
 */
export const track = {
  event: (name: string, properties?: Record<string, unknown>, category?: string) =>
    globalTracker?.track(name, properties, category),

  pageView: (page?: string, properties?: Record<string, unknown>) => globalTracker?.pageView(page, properties),

  conversion: (type: string, value?: number, currency?: string, properties?: Record<string, unknown>) =>
    globalTracker?.conversion(type, value, currency, properties),

  formSubmission: (formName: string, properties?: Record<string, unknown>) =>
    globalTracker?.formSubmission(formName, properties),

  custom: (eventName: string, properties?: Record<string, unknown>, category?: string) =>
    globalTracker?.custom(eventName, properties, category),
};

export default GrowthTracker;
