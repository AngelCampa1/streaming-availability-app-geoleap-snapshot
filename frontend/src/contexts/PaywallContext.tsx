/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { createContext, useContext, useReducer, useEffect, useRef, ReactNode } from 'react';
import { SubscriptionTier } from '@/lib/types/paywall';
import { useSubscription, SubscriptionFeature } from '@/hooks/useSubscription';
import { logPaywallInteraction } from '@/lib/api';
import { abTesting } from '@/lib/ab-testing';

interface PaywallState {
  isPaywallActive: boolean;
  showUpgradeModal: boolean;
  showFeatureComparison: boolean;
  upgradeSource: string;
  targetTier: SubscriptionTier;
  abTestVariant: 'gentle' | 'medium' | 'urgent';
  dismissedPaywalls: string[];
  conversionOpportunities: ConversionOpportunity[];
}

interface ConversionOpportunity {
  id: string;
  trigger: string;
  message: string;
  urgency: 'low' | 'medium' | 'high';
  shown: boolean;
  dismissed: boolean;
  timestamp: number;
}

type PaywallAction =
  | { type: 'ACTIVATE_PAYWALL'; source: string; tier?: SubscriptionTier }
  | { type: 'DEACTIVATE_PAYWALL' }
  | { type: 'SHOW_UPGRADE_MODAL'; source: string; tier: SubscriptionTier }
  | { type: 'HIDE_UPGRADE_MODAL' }
  | { type: 'SHOW_FEATURE_COMPARISON'; source: string }
  | { type: 'HIDE_FEATURE_COMPARISON' }
  | { type: 'DISMISS_PAYWALL'; paywallId: string }
  | { type: 'SET_AB_TEST_VARIANT'; variant: 'gentle' | 'medium' | 'urgent' }
  | { type: 'ADD_CONVERSION_OPPORTUNITY'; opportunity: ConversionOpportunity }
  | { type: 'MARK_OPPORTUNITY_SHOWN'; opportunityId: string }
  | { type: 'DISMISS_OPPORTUNITY'; opportunityId: string };

interface PaywallContextValue {
  state: PaywallState;
  subscription: ReturnType<typeof useSubscription>;
  activatePaywall: (source: string, tier?: SubscriptionTier) => void;
  deactivatePaywall: () => void;
  showUpgradeModal: (source: string, tier: SubscriptionTier) => void;
  hideUpgradeModal: () => void;
  showFeatureComparison: (source: string) => void;
  hideFeatureComparison: () => void;
  dismissPaywall: (paywallId: string) => void;
  hasFeatureAccess: (feature: SubscriptionFeature) => boolean;
  canPerformAction: (action: PaywallAction) => boolean;
  shouldShowPaywall: (context: PaywallContext) => boolean;
  getUpgradeMessage: (context: PaywallContext) => string;
  trackPaywallInteraction: (event: string, metadata?: Record<string, any>) => void;
}

interface PaywallContext {
  searchQuery?: string;
  resultCount?: number;
  userAction?: string;
  feature?: string;
  position?: string;
}

const initialState: PaywallState = {
  isPaywallActive: false,
  showUpgradeModal: false,
  showFeatureComparison: false,
  upgradeSource: 'unknown',
  targetTier: SubscriptionTier.Premium,
  abTestVariant: 'medium',
  dismissedPaywalls: [],
  conversionOpportunities: [],
};

const paywallReducer = (state: PaywallState, action: PaywallAction): PaywallState => {
  switch (action.type) {
    case 'ACTIVATE_PAYWALL':
      return {
        ...state,
        isPaywallActive: true,
        upgradeSource: action.source,
        targetTier: action.tier || SubscriptionTier.Premium,
      };

    case 'DEACTIVATE_PAYWALL':
      return {
        ...state,
        isPaywallActive: false,
      };

    case 'SHOW_UPGRADE_MODAL':
      return {
        ...state,
        showUpgradeModal: true,
        upgradeSource: action.source,
        targetTier: action.tier,
      };

    case 'HIDE_UPGRADE_MODAL':
      return {
        ...state,
        showUpgradeModal: false,
      };

    case 'SHOW_FEATURE_COMPARISON':
      return {
        ...state,
        showFeatureComparison: true,
        upgradeSource: action.source,
      };

    case 'HIDE_FEATURE_COMPARISON':
      return {
        ...state,
        showFeatureComparison: false,
      };

    case 'DISMISS_PAYWALL':
      return {
        ...state,
        dismissedPaywalls: [...state.dismissedPaywalls, action.paywallId],
      };

    case 'SET_AB_TEST_VARIANT':
      return {
        ...state,
        abTestVariant: action.variant,
      };

    case 'ADD_CONVERSION_OPPORTUNITY':
      return {
        ...state,
        conversionOpportunities: [...state.conversionOpportunities, action.opportunity],
      };

    case 'MARK_OPPORTUNITY_SHOWN':
      return {
        ...state,
        conversionOpportunities: state.conversionOpportunities.map(opp =>
          opp.id === action.opportunityId ? { ...opp, shown: true } : opp
        ),
      };

    case 'DISMISS_OPPORTUNITY':
      return {
        ...state,
        conversionOpportunities: state.conversionOpportunities.map(opp =>
          opp.id === action.opportunityId ? { ...opp, dismissed: true } : opp
        ),
      };

    default:
      return state;
  }
};

const PaywallContext = createContext<PaywallContextValue | null>(null);

export const usePaywall = () => {
  const context = useContext(PaywallContext);
  if (!context) {
    throw new Error('usePaywall must be used within a PaywallProvider');
  }
  return context;
};

interface PaywallProviderProps {
  children: ReactNode;
}

export const PaywallProvider: React.FC<PaywallProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(paywallReducer, initialState);
  const subscription = useSubscription(true); // Auto-refresh enabled

  // Initialize A/B test variant using deterministic ABTestingService
  useEffect(() => {
    abTesting.registerTest({
      id: 'paywall-urgency',
      name: 'Paywall Urgency Level',
      variants: [
        { id: 'gentle', name: 'Gentle', weight: 34, config: {} },
        { id: 'medium', name: 'Medium', weight: 33, config: {} },
        { id: 'urgent', name: 'Urgent', weight: 33, config: {} },
      ],
      trafficAllocation: 100,
      status: 'active',
    });
    const variant = abTesting.getVariant('paywall-urgency');
    const variantId = (variant?.id || 'medium') as 'gentle' | 'medium' | 'urgent';
    dispatch({ type: 'SET_AB_TEST_VARIANT', variant: variantId });
  }, []);

  // Auto-dismiss expired opportunities
  const opportunitiesRef = useRef(state.conversionOpportunities);
  useEffect(() => {
    opportunitiesRef.current = state.conversionOpportunities;
  }, [state.conversionOpportunities]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      opportunitiesRef.current.forEach(opportunity => {
        if (!opportunity.dismissed && now - opportunity.timestamp > 300000) {
          // 5 minutes
          dispatch({ type: 'DISMISS_OPPORTUNITY', opportunityId: opportunity.id });
        }
      });
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  const activatePaywall = (source: string, tier?: SubscriptionTier) => {
    dispatch({ type: 'ACTIVATE_PAYWALL', source, tier });
  };

  const deactivatePaywall = () => {
    dispatch({ type: 'DEACTIVATE_PAYWALL' });
  };

  const showUpgradeModal = (source: string, tier: SubscriptionTier) => {
    dispatch({ type: 'SHOW_UPGRADE_MODAL', source, tier });
  };

  const hideUpgradeModal = () => {
    dispatch({ type: 'HIDE_UPGRADE_MODAL' });
  };

  const showFeatureComparison = (source: string) => {
    dispatch({ type: 'SHOW_FEATURE_COMPARISON', source });
  };

  const hideFeatureComparison = () => {
    dispatch({ type: 'HIDE_FEATURE_COMPARISON' });
  };

  const dismissPaywall = (paywallId: string) => {
    dispatch({ type: 'DISMISS_PAYWALL', paywallId });
  };

  const hasFeatureAccess = (feature: SubscriptionFeature): boolean => {
    return subscription.hasFeatureAccess(feature);
  };

  const canPerformAction = (): boolean => {
    return true; // Default allow for now, can be enhanced based on specific actions
  };

  const shouldShowPaywall = (context: PaywallContext): boolean => {
    if (!subscription.subscription) return false;

    const { subscription: sub, remainingSearches } = subscription;

    // Don't show paywall for premium users
    if (sub.tier >= SubscriptionTier.Premium) return false;

    // Check if paywall was recently dismissed
    const paywallId = `${context.position || 'default'}_${sub.tier}_${context.feature || 'general'}`;
    if (state.dismissedPaywalls.includes(paywallId)) return false;

    // Show paywall based on usage patterns
    if (sub.tier === SubscriptionTier.Free) {
      // Show when approaching limits
      if (remainingSearches <= 5 && remainingSearches > 0) return true;
      if (remainingSearches === 0) return true;

      // Show on certain features
      if (context.feature && ['export', 'advanced_filters', 'direct_links'].includes(context.feature)) {
        return true;
      }
    }

    if (sub.tier === SubscriptionTier.Basic) {
      // Show premium features
      if (context.feature && ['unlimited_results', 'advanced_export'].includes(context.feature)) {
        return true;
      }
    }

    return false;
  };

  const getUpgradeMessage = (context: PaywallContext): string => {
    const { subscription: sub, remainingSearches } = subscription;

    if (!sub) return 'Upgrade to unlock premium features';

    const messages = {
      gentle: {
        [SubscriptionTier.Free]: {
          search_limit: `${remainingSearches} searches remaining today. Consider upgrading for unlimited access.`,
          feature_locked: 'This feature is available with our Basic plan. Upgrade to unlock it.',
          default: 'Unlock more features with our premium plans.',
        },
        [SubscriptionTier.Basic]: {
          feature_locked: 'This premium feature is available with our Premium plan.',
          default: 'Upgrade to Premium for unlimited access to all features.',
        },
      },
      medium: {
        [SubscriptionTier.Free]: {
          search_limit: `Only ${remainingSearches} searches left today! Upgrade now for unlimited searches.`,
          feature_locked: 'This feature requires a Basic subscription. Upgrade now to unlock it.',
          default: 'Upgrade your plan to access premium features.',
        },
        [SubscriptionTier.Basic]: {
          feature_locked: 'Unlock this premium feature with Premium plan. Upgrade today!',
          default: 'Get unlimited access with Premium - upgrade now!',
        },
      },
      urgent: {
        [SubscriptionTier.Free]: {
          search_limit: `⚠️ ${remainingSearches} searches remaining! Don't miss out - upgrade now for unlimited access!`,
          feature_locked: '🔒 Feature locked! Upgrade to Basic plan now to unlock.',
          default: '⚡ Limited time - upgrade your plan and unlock everything!',
        },
        [SubscriptionTier.Basic]: {
          feature_locked: '👑 Premium feature ahead! Upgrade now for instant access.',
          default: '🚀 Go Premium today and unlock unlimited features!',
        },
      },
    };

    const variant = messages[state.abTestVariant];

    if (sub.tier === SubscriptionTier.Basic) {
      const basicMessages = variant[SubscriptionTier.Basic];
      if (context.feature && ['export', 'advanced_filters', 'direct_links'].includes(context.feature)) {
        return basicMessages.feature_locked || basicMessages.default;
      }
      return basicMessages.default;
    } else {
      const freeMessages = variant[SubscriptionTier.Free];
      if (context.feature === 'search_limit' && remainingSearches <= 5) {
        return freeMessages.search_limit || freeMessages.default;
      }
      if (context.feature && ['export', 'advanced_filters', 'direct_links'].includes(context.feature)) {
        return freeMessages.feature_locked || freeMessages.default;
      }
      return freeMessages.default;
    }
  };

  const trackPaywallInteraction = (event: string, metadata: Record<string, any> = {}) => {
    logPaywallInteraction(event as 'paywall_shown' | 'upgrade_clicked' | 'dismissed' | 'search_limited', {
      ...metadata,
    });
  };

  const contextValue: PaywallContextValue = {
    state,
    subscription,
    activatePaywall,
    deactivatePaywall,
    showUpgradeModal,
    hideUpgradeModal,
    showFeatureComparison,
    hideFeatureComparison,
    dismissPaywall,
    hasFeatureAccess,
    canPerformAction,
    shouldShowPaywall,
    getUpgradeMessage,
    trackPaywallInteraction,
  };

  return <PaywallContext.Provider value={contextValue}>{children}</PaywallContext.Provider>;
};

export default PaywallProvider;
