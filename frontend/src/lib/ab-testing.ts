/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * A/B Testing Framework for GeoLeap
 *
 * Simple A/B testing implementation for landing page optimization
 * and future marketing experiments.
 */

import { logger } from './logger';
import { formatPlanPrice, formatPremiumMonthlyEquivalent, getPremiumTrialCopy, premiumPlan } from './pricing';

export interface ABTest {
  id: string;
  name: string;
  variants: ABVariant[];
  trafficAllocation: number; // Percentage of users to include in test
  status: 'active' | 'paused' | 'completed';
}

export interface ABVariant {
  id: string;
  name: string;
  weight: number; // Distribution weight (should sum to 100 across variants)
  config: Record<string, string | number | boolean>;
}

export interface ABTestAssignment {
  testId: string;
  variantId: string;
  assignedAt: Date;
  userId?: string;
  sessionId: string;
}

class ABTestingService {
  private assignments: Map<string, ABTestAssignment> = new Map();
  private tests: Map<string, ABTest> = new Map();

  constructor() {
    this.initializeDefaultTests();
  }

  private initializeDefaultTests() {
    const planPrice = formatPlanPrice(premiumPlan);
    const monthlyEquivalent = formatPremiumMonthlyEquivalent();
    const trialCopy = getPremiumTrialCopy();

    // Landing page CTA button test
    this.tests.set('landing-cta-text', {
      id: 'landing-cta-text',
      name: 'Landing Page CTA Button Text',
      variants: [
        {
          id: 'control',
          name: 'Control - Start Free Search',
          weight: 50,
          config: {
            ctaText: 'Start Free Search',
            ctaStyle: 'primary',
          },
        },
        {
          id: 'variant-a',
          name: 'Variant A - Get Started Free',
          weight: 50,
          config: {
            ctaText: 'Get Started Free',
            ctaStyle: 'primary',
          },
        },
      ],
      trafficAllocation: 100,
      status: 'active',
    });

    // Hero section messaging test
    this.tests.set('hero-messaging', {
      id: 'hero-messaging',
      name: 'Hero Section Primary Message',
      variants: [
        {
          id: 'control',
          name: 'Control - VPN Value',
          weight: 50,
          config: {
            badge: 'Your VPN, Your Subscriptions, Maximum Value',
            h1Line2: 'With Your VPN & Subscriptions',
          },
        },
        {
          id: 'variant-a',
          name: 'Variant A - Free Search',
          weight: 50,
          config: {
            badge: 'Free  -  Search 30+ Streaming Services',
            h1Line2: 'Any Show, Anywhere',
          },
        },
      ],
      trafficAllocation: 100,
      status: 'active',
    });

    // Pricing framing test
    this.tests.set('pricing-framing', {
      id: 'pricing-framing',
      name: 'Pricing Framing',
      variants: [
        {
          id: 'control',
          name: 'Control - Annual',
          weight: 50,
          config: {
            priceDisplay: planPrice,
          },
        },
        {
          id: 'variant-a',
          name: 'Variant A - Monthly Equivalent',
          weight: 50,
          config: {
            priceDisplay: `about ${monthlyEquivalent}`,
          },
        },
      ],
      trafficAllocation: 100,
      status: 'active',
    });

    // Search limit modal test
    this.tests.set('search-limit-modal', {
      id: 'search-limit-modal',
      name: 'Search Limit Modal Copy',
      variants: [
        {
          id: 'control',
          name: 'Control',
          weight: 50,
          config: {
            ctaText: 'Sign Up Free  -  Unlimited Searches',
          },
        },
        {
          id: 'variant-a',
          name: 'Variant A',
          weight: 50,
          config: {
            ctaText: 'Get Unlimited Searches Free',
          },
        },
      ],
      trafficAllocation: 100,
      status: 'active',
    });

    // Pricing page CTA test
    this.tests.set('pricing-cta-text', {
      id: 'pricing-cta-text',
      name: 'Pricing Page CTA Button Text',
      variants: [
        { id: 'control', name: 'Control', weight: 34, config: { ctaText: 'Start 30-Day Free Trial' } },
        { id: 'variant-a', name: 'Variant A', weight: 33, config: { ctaText: 'Try Premium Free for 30 Days' } },
        { id: 'variant-b', name: 'Variant B', weight: 33, config: { ctaText: 'Start Free  -  Cancel Anytime' } },
      ],
      trafficAllocation: 100,
      status: 'active',
    });

    // Upgrade modal CTA test
    this.tests.set('upgrade-modal-cta', {
      id: 'upgrade-modal-cta',
      name: 'Upgrade Modal CTA',
      variants: [
        { id: 'control', name: 'Control', weight: 50, config: { ctaText: 'Start 30-Day Free Trial' } },
        { id: 'variant-a', name: 'Loss Aversion', weight: 50, config: { ctaText: "Don't Miss Out  -  Start Free Trial" } },
      ],
      trafficAllocation: 100,
      status: 'active',
    });

    // Exit intent popup copy test
    this.tests.set('exit-intent-copy', {
      id: 'exit-intent-copy',
      name: 'Exit Intent Popup Copy',
      variants: [
        {
          id: 'control',
          name: 'Control - Generic',
          weight: 50,
          config: {
            anonTitle: 'Before you go...',
            anonDescription: 'Create a free account to save your searches and get personalized streaming recommendations.',
            authTitle: "Don't miss out!",
            authDescription: `Lock in our launch price: ${planPrice}, about ${monthlyEquivalent}, with a ${trialCopy}. No ads, unlimited watchlist, and priority support.`,
          },
        },
        {
          id: 'variant-a',
          name: 'Variant A - Value Focused',
          weight: 50,
          config: {
            anonTitle: 'Wait  -  free streaming search!',
            anonDescription: 'Search 42 streaming services across 57 countries. Create your free account in seconds.',
            authTitle: `Premium for about ${monthlyEquivalent}`,
            authDescription: 'That\'s less than a coffee. Ad-free streaming search, unlimited watchlist, and priority support. Try free for 30 days.',
          },
        },
      ],
      trafficAllocation: 100,
      status: 'active',
    });
  }

  /**
   * Get user's assigned variant for a test
   */
  getVariant(testId: string, userId?: string): ABVariant | null {
    const test = this.tests.get(testId);
    if (!test || test.status !== 'active') {
      return null;
    }

    const sessionId = this.getSessionId();
    const assignmentKey = `${testId}-${userId || sessionId}`;

    // Check if user already has an assignment
    let assignment = this.assignments.get(assignmentKey);
    if (assignment) {
      const variant = test.variants.find(v => v.id === assignment!.variantId);
      return variant || null;
    }

    // Check if user should be included in test
    if (!this.shouldIncludeInTest(test, userId, sessionId)) {
      return null;
    }

    // Assign variant based on weights
    const variant = this.assignVariant(test, userId, sessionId);
    if (variant) {
      assignment = {
        testId,
        variantId: variant.id,
        assignedAt: new Date(),
        userId,
        sessionId,
      };
      this.assignments.set(assignmentKey, assignment);

      // Track assignment event
      this.trackEvent('ab_test_assignment', {
        testId,
        variantId: variant.id,
        userId,
        sessionId,
      });
    }

    return variant;
  }

  /**
   * Track conversion event for A/B test analysis
   */
  trackConversion(testId: string, conversionType: string, value?: number, userId?: string) {
    const sessionId = this.getSessionId();
    const assignmentKey = `${testId}-${userId || sessionId}`;
    const assignment = this.assignments.get(assignmentKey);

    if (assignment) {
      this.trackEvent('ab_test_conversion', {
        testId,
        variantId: assignment.variantId,
        conversionType,
        value,
        userId,
        sessionId,
      });
    }
  }

  /**
   * Get test configuration for variant
   */
  getTestConfig(testId: string, userId?: string): Record<string, string | number | boolean> {
    const variant = this.getVariant(testId, userId);
    return variant?.config || {};
  }

  private shouldIncludeInTest(test: ABTest, userId?: string, sessionId?: string): boolean {
    // Use consistent hash to determine inclusion
    const identifier = userId || sessionId || 'anonymous';
    const hash = this.simpleHash(identifier + test.id);
    const percentage = hash % 100;
    return percentage < test.trafficAllocation;
  }

  private assignVariant(test: ABTest, userId?: string, sessionId?: string): ABVariant | null {
    const identifier = userId || sessionId || 'anonymous';
    const hash = this.simpleHash(identifier + test.id + 'variant');
    const percentage = hash % 100;

    let currentWeight = 0;
    for (const variant of test.variants) {
      currentWeight += variant.weight;
      if (percentage < currentWeight) {
        return variant;
      }
    }

    // Fallback to first variant
    return test.variants[0] || null;
  }

  private getSessionId(): string {
    let sessionId = '';
    if (typeof window !== 'undefined') {
      sessionId = localStorage.getItem('ab_session_id') || '';
      if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('ab_session_id', sessionId);
      }
    }
    return sessionId;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  private trackEvent(eventType: string, data: Record<string, string | number | undefined>) {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', eventType, data);
    }

    // Console log for development
    logger.info(`[ABTesting] ${eventType}`, data);
  }

  /**
   * Register a new A/B test (or update an existing one)
   */
  registerTest(test: ABTest): void {
    this.tests.set(test.id, test);
  }

  // Admin methods for managing tests
  getAllTests(): ABTest[] {
    return Array.from(this.tests.values());
  }

  getTestResults(testId: string): { assignments: number; conversions: number } {
    // In a real implementation, this would query analytics data
    const assignmentCount = Array.from(this.assignments.values()).filter(a => a.testId === testId).length;

    return {
      assignments: assignmentCount,
      conversions: 0, // Would be calculated from tracking data
    };
  }
}

// Export singleton instance
export const abTesting = new ABTestingService();

// React hook for easy component integration
export function useABTest(testId: string, userId?: string) {
  const variant = abTesting.getVariant(testId, userId);
  const config = abTesting.getTestConfig(testId, userId);

  const trackConversion = (conversionType: string, value?: number) => {
    abTesting.trackConversion(testId, conversionType, value, userId);
  };

  return {
    variant,
    config,
    isInTest: variant !== null,
    trackConversion,
  };
}

// TypeScript declarations for gtag
declare global {
  interface Window {
    gtag?: (command: string, action: string, parameters?: Record<string, any>) => void;
  }
}
