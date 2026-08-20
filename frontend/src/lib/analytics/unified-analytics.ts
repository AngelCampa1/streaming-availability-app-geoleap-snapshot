/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * UnifiedAnalytics - Analytics Facade
 * Routes events to both Azure Application Insights and Google Analytics (GA4)
 * Enforces GDPR consent before sending to GA4
 */

import { ConsentManager } from './consent-manager';
import { logger } from '@/lib/logger';
import {
  AnalyticsEvent,
  PageViewEvent,
  ConversionEvent,
  SearchEvent,
  AuthEvent,
  ContentEvent,
} from '@/types/analytics';

// Extend Window interface for gtag
declare global {
  interface Window {
    gtag?: (command: string, action: string, parameters?: Record<string, any>) => void;
    dataLayer?: unknown[];
  }
}

export class UnifiedAnalytics {
  private static instance: UnifiedAnalytics | null = null;
  private consentManager: ReturnType<typeof ConsentManager.getInstance>;
  private userId: string | null = null;
  private isInitialized = false;

  private constructor() {
    this.consentManager = ConsentManager.getInstance();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): UnifiedAnalytics {
    if (!UnifiedAnalytics.instance) {
      UnifiedAnalytics.instance = new UnifiedAnalytics();
    }
    return UnifiedAnalytics.instance;
  }

  /**
   * Initialize analytics (setup consent listeners, etc.)
   */
  public initialize(): void {
    if (this.isInitialized) return;

    // Subscribe to consent changes to update GA4
    this.consentManager.subscribe((consent) => {
      this.updateGA4Consent(consent.analytics);
    });

    this.isInitialized = true;
  }

  /**
   * Set user ID for tracking
   */
  public setUserId(userId: string): void {
    this.userId = userId;

    // Always set on Azure
    logger.setUser(userId);

    // Set on GA4 if available and consent granted
    if (this.hasGA4() && this.consentManager.hasAnalyticsConsent()) {
      window.gtag!('config', this.getGA4MeasurementId(), {
        user_id: userId,
      });
    }
  }

  /**
   * Track generic event
   */
  public trackEvent(name: string, properties: Record<string, unknown> = {}): void {
    const event: AnalyticsEvent = {
      name,
      category: 'interaction',
      properties,
      userId: this.userId || undefined,
      timestamp: new Date(),
    };

    // Always send to Azure
    this.sendToAzure(event);

    // Send to GA4 only if consent granted
    if (this.consentManager.hasAnalyticsConsent()) {
      this.sendToGA4('event', name, properties);
    }
  }

  /**
   * Track page view
   */
  public trackPageView(page: string, title?: string): void {
    const event: PageViewEvent = {
      page,
      title: title || document.title,
      referrer: document.referrer || undefined,
    };

    // Always send to Azure
    logger.logPageView(page);

    // Send to GA4 only if consent granted
    if (this.consentManager.hasAnalyticsConsent()) {
      this.sendToGA4('event', 'page_view', {
        page_path: page,
        page_title: event.title,
        page_referrer: event.referrer,
      });
    }
  }

  /**
   * Track conversion event (always critical, sent regardless of consent)
   */
  public trackConversion(event: ConversionEvent): void {
    // Always send to Azure
    logger.logUserAction('conversion', 'UnifiedAnalytics', {
      type: event.type,
      value: event.value,
      currency: event.currency,
      plan: event.plan,
      ...event.properties,
    });

    // Send to GA4 only if consent granted
    if (this.consentManager.hasAnalyticsConsent()) {
      this.sendToGA4('event', 'conversion', {
        conversion_type: event.type,
        value: event.value,
        currency: event.currency,
        plan: event.plan,
        ...event.properties,
      });
    }
  }

  /**
   * Track search event
   */
  public trackSearch(query: string, resultsCount: number, filters?: Record<string, unknown>): void {
    const _event: SearchEvent = {
      query,
      resultsCount,
      filters,
    };

    // Always send to Azure
    logger.logUserAction('search', 'UnifiedAnalytics', {
      query,
      resultsCount,
      filters,
    });

    // Send to GA4 only if consent granted
    if (this.consentManager.hasAnalyticsConsent()) {
      this.sendToGA4('event', 'search', {
        search_term: query,
        results_count: resultsCount,
        ...filters,
      });
    }
  }

  /**
   * Track authentication event
   */
  public trackLogin(method: 'email' | 'google' | 'apple'): void {
    const _event: AuthEvent = {
      method,
      action: 'login',
      success: true,
    };

    // Always send to Azure
    logger.logUserAction('login', 'UnifiedAnalytics', {
      method,
      success: true,
    });

    // Send to GA4 only if consent granted
    if (this.consentManager.hasAnalyticsConsent()) {
      this.sendToGA4('event', 'login', {
        method,
      });
    }
  }

  /**
   * Track signup event
   */
  public trackSignup(method: 'email' | 'google' | 'apple'): void {
    const _event: AuthEvent = {
      method,
      action: 'signup',
      success: true,
    };

    // Always send to Azure
    logger.logUserAction('signup', 'UnifiedAnalytics', {
      method,
      success: true,
    });

    // Send to GA4 only if consent granted
    if (this.consentManager.hasAnalyticsConsent()) {
      this.sendToGA4('event', 'sign_up', {
        method,
      });
    }
  }

  /**
   * Track content interaction
   */
  public trackContentClick(contentId: string, contentType: 'movie' | 'tv'): void {
    const _event: ContentEvent = {
      contentId,
      contentType,
      action: 'click',
    };

    // Always send to Azure
    logger.logUserAction('content_click', 'UnifiedAnalytics', {
      contentId,
      contentType,
    });

    // Send to GA4 only if consent granted
    if (this.consentManager.hasAnalyticsConsent()) {
      this.sendToGA4('event', 'select_content', {
        content_type: contentType,
        content_id: contentId,
      });
    }
  }

  /**
   * Track watchlist action
   */
  public trackWatchlistAction(action: 'add' | 'remove', contentId: string): void {
    // Always send to Azure
    logger.logUserAction(`watchlist_${action}`, 'UnifiedAnalytics', {
      contentId,
    });

    // Send to GA4 only if consent granted
    if (this.consentManager.hasAnalyticsConsent()) {
      this.sendToGA4('event', action === 'add' ? 'add_to_wishlist' : 'remove_from_wishlist', {
        content_id: contentId,
      });
    }
  }

  /**
   * Track error (ALWAYS sent regardless of consent - critical for debugging)
   */
  public trackError(error: Error, context?: Record<string, unknown>): void {
    // Always send to Azure
    logger.logError('ApplicationError', { message: error.message, stack: error.stack, ...context });

    // Always send to GA4 (errors are critical)
    if (this.hasGA4()) {
      window.gtag!('event', 'exception', {
        description: error.message,
        fatal: false,
        ...context,
      });
    }
  }

  /**
   * Track click event
   */
  public trackClick(element: string, component?: string): void {
    logger.logUserAction('click', component || 'UnifiedAnalytics', {
      element,
    });

    if (this.consentManager.hasAnalyticsConsent()) {
      this.sendToGA4('event', 'click', {
        element,
        component,
      });
    }
  }

  /**
   * Track form submission
   */
  public trackFormSubmit(formName: string, success: boolean): void {
    logger.logUserAction('form_submit', 'UnifiedAnalytics', {
      formName,
      success,
    });

    if (this.consentManager.hasAnalyticsConsent()) {
      this.sendToGA4('event', success ? 'form_submit_success' : 'form_submit_error', {
        form_name: formName,
      });
    }
  }

  /**
   * Send event to Azure Application Insights (via logger)
   */
  private sendToAzure(event: AnalyticsEvent): void {
    logger.logUserAction(event.name, 'UnifiedAnalytics', {
      category: event.category,
      ...event.properties,
      userId: event.userId,
      timestamp: event.timestamp,
    });
  }

  /**
   * Send event to Google Analytics (GA4)
   */
  private sendToGA4(type: string, eventName: string, parameters: Record<string, unknown> = {}): void {
    if (!this.hasGA4()) {
      // Gracefully handle missing gtag (development mode)
      return;
    }

    try {
      window.gtag!(type, eventName, parameters);
    } catch (error) {
      console.error('[UnifiedAnalytics] Failed to send to GA4:', error);
    }
  }

  /**
   * Update GA4 consent state
   */
  private updateGA4Consent(hasConsent: boolean): void {
    if (!this.hasGA4()) return;

    window.gtag!('consent', 'update', {
      analytics_storage: hasConsent ? 'granted' : 'denied',
    });
  }

  /**
   * Check if gtag is available
   */
  private hasGA4(): boolean {
    return typeof window !== 'undefined' && typeof window.gtag === 'function';
  }

  /**
   * Get GA4 Measurement ID from environment
   */
  private getGA4MeasurementId(): string {
    return process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '';
  }
}

// Export singleton instance
export const analytics = UnifiedAnalytics.getInstance();

export default analytics;
