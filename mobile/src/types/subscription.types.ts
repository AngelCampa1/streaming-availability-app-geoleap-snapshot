/**
 * Subscription and In-App Purchase types
 */

export type SubscriptionTier = 'free' | 'basic' | 'premium' | 'pro';

export interface SubscriptionPlan {
  id: string;
  tier: SubscriptionTier;
  name: string;
  displayName: string;
  description: string;
  features: SubscriptionFeature[];
  pricing: {
    monthly: number;
    yearly: number;
    currency: string;
  };
  iapProductIds: {
    ios: {
      monthly: string;
      yearly: string;
    };
    android: {
      monthly: string;
      yearly: string;
    };
  };
  color: string;
  popular?: boolean;
  recommended?: boolean;
}

export interface SubscriptionFeature {
  id: string;
  name: string;
  description: string;
  included: boolean;
  icon?: string;
  highlight?: boolean;
}

export interface UserSubscription {
  userId: string;
  tier: SubscriptionTier;
  plan: SubscriptionPlan;
  status: 'active' | 'canceled' | 'expired' | 'trial' | 'past_due';
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  platform: 'ios' | 'android' | 'web';
  productId: string;
  transactionId?: string;
  originalTransactionId?: string;
  receipt?: string;
  serverVerified?: boolean;
  verifiedAt?: string;
}

export interface PurchaseReceipt {
  transactionId: string;
  productId: string;
  purchaseDate: string;
  expirationDate?: string;
  receipt: string;
  platform: 'ios' | 'android';
}

export interface BillingHistory {
  id: string;
  date: string;
  amount: number;
  currency: string;
  status: 'succeeded' | 'failed' | 'pending' | 'refunded';
  description: string;
  receiptUrl?: string;
}

// Subscription Plans Database
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    tier: 'free',
    name: 'Free',
    displayName: 'Free Plan',
    description: 'Perfect for casual viewers',
    features: [
      {
        id: 'basic-search',
        name: 'Basic Search',
        description: 'Search for movies and TV shows',
        included: true,
        icon: 'search',
      },
      {
        id: 'service-selection',
        name: 'Select Up to 3 Services',
        description: 'Choose up to 3 streaming services',
        included: true,
        icon: 'play-circle',
      },
      {
        id: 'content-availability',
        name: 'See Availability',
        description: 'Check where content is available',
        included: true,
        icon: 'visibility',
      },
      {
        id: 'vpn-basic',
        name: 'Basic VPN Recommendations',
        description: 'See top 1 VPN recommendation',
        included: true,
        icon: 'vpn-lock',
      },
      {
        id: 'ads',
        name: 'Ad-Free Experience',
        description: 'No advertisements',
        included: false,
        icon: 'block',
      },
      {
        id: 'unlimited-services',
        name: 'Unlimited Services',
        description: 'Select unlimited streaming services',
        included: false,
        icon: 'all-inclusive',
      },
      {
        id: 'watchlist',
        name: 'Unlimited Watchlist',
        description: 'Save unlimited titles to watchlist',
        included: false,
        icon: 'bookmark',
      },
      {
        id: 'notifications',
        name: 'Smart Notifications',
        description: 'Get notified when content becomes available',
        included: false,
        icon: 'notifications',
      },
    ],
    pricing: {
      monthly: 0,
      yearly: 0,
      currency: 'USD',
    },
    iapProductIds: {
      ios: {
        monthly: 'com.geoleap.free.monthly',
        yearly: 'com.geoleap.free.yearly',
      },
      android: {
        monthly: 'com.geoleap.free.monthly',
        yearly: 'com.geoleap.free.yearly',
      },
    },
    color: '#6b7280', // Gray 500 - unified palette
  },
  {
    id: 'basic',
    tier: 'basic',
    name: 'Basic',
    displayName: 'Basic Plan',
    description: 'Great for regular streamers',
    features: [
      {
        id: 'all-free-features',
        name: 'All Free Features',
        description: 'Everything from the free plan',
        included: true,
        icon: 'check',
      },
      {
        id: 'ads',
        name: 'Ad-Free Experience',
        description: 'No advertisements',
        included: true,
        icon: 'block',
        highlight: true,
      },
      {
        id: 'unlimited-services',
        name: 'Unlimited Services',
        description: 'Select unlimited streaming services',
        included: true,
        icon: 'all-inclusive',
        highlight: true,
      },
      {
        id: 'vpn-all',
        name: 'All VPN Recommendations',
        description: 'See all VPN provider recommendations',
        included: true,
        icon: 'vpn-lock',
      },
      {
        id: 'watchlist-50',
        name: '50-Item Watchlist',
        description: 'Save up to 50 titles',
        included: true,
        icon: 'bookmark',
      },
      {
        id: 'notifications',
        name: 'Smart Notifications',
        description: 'Get notified when content becomes available',
        included: false,
        icon: 'notifications',
      },
      {
        id: 'priority-support',
        name: 'Priority Support',
        description: '24/7 priority customer support',
        included: false,
        icon: 'support-agent',
      },
    ],
    pricing: {
      monthly: 4.99,
      yearly: 49.99,
      currency: 'USD',
    },
    iapProductIds: {
      ios: {
        monthly: 'com.geoleap.basic.monthly',
        yearly: 'com.geoleap.basic.yearly',
      },
      android: {
        monthly: 'geoleap_basic_monthly',
        yearly: 'geoleap_basic_yearly',
      },
    },
    color: '#64748b', // Secondary Slate 500 - unified palette
  },
  {
    id: 'premium',
    tier: 'premium',
    name: 'Premium',
    displayName: 'Premium Plan',
    description: 'Best value for power users',
    features: [
      {
        id: 'all-basic-features',
        name: 'All Basic Features',
        description: 'Everything from the basic plan',
        included: true,
        icon: 'check',
      },
      {
        id: 'watchlist',
        name: 'Unlimited Watchlist',
        description: 'Save unlimited titles to watchlist',
        included: true,
        icon: 'bookmark',
        highlight: true,
      },
      {
        id: 'notifications',
        name: 'Smart Notifications',
        description: 'Get notified when content becomes available',
        included: true,
        icon: 'notifications',
        highlight: true,
      },
      {
        id: 'advanced-search',
        name: 'Advanced Search Filters',
        description: 'Filter by genre, year, rating, and more',
        included: true,
        icon: 'filter-list',
      },
      {
        id: 'recommendations',
        name: 'Personalized Recommendations',
        description: 'AI-powered content suggestions',
        included: true,
        icon: 'recommend',
      },
      {
        id: 'priority-support',
        name: 'Priority Support',
        description: '24/7 priority customer support',
        included: true,
        icon: 'support-agent',
      },
      {
        id: 'offline-mode',
        name: 'Offline Mode',
        description: 'Access your watchlist offline',
        included: true,
        icon: 'cloud-off',
      },
    ],
    pricing: {
      monthly: 9.99,
      yearly: 99.99,
      currency: 'USD',
    },
    iapProductIds: {
      ios: {
        monthly: 'com.geoleap.premium.monthly',
        yearly: 'com.geoleap.premium.yearly',
      },
      android: {
        monthly: 'geoleap_premium_monthly',
        yearly: 'geoleap_premium_yearly',
      },
    },
    color: '#f59e0b', // Warning Amber 500 - unified palette
    popular: true,
    recommended: true,
  },
  {
    id: 'pro',
    tier: 'pro',
    name: 'Pro',
    displayName: 'Pro Plan',
    description: 'Ultimate experience for enthusiasts',
    features: [
      {
        id: 'all-premium-features',
        name: 'All Premium Features',
        description: 'Everything from the premium plan',
        included: true,
        icon: 'check',
      },
      {
        id: 'family-sharing',
        name: 'Family Sharing',
        description: 'Share with up to 5 family members',
        included: true,
        icon: 'people',
        highlight: true,
      },
      {
        id: 'vpn-discount',
        name: 'VPN Partner Discounts',
        description: 'Exclusive discounts on VPN subscriptions',
        included: true,
        icon: 'local-offer',
        highlight: true,
      },
      {
        id: 'early-access',
        name: 'Early Access',
        description: 'Get new features before everyone else',
        included: true,
        icon: 'new-releases',
      },
      {
        id: 'concierge',
        name: 'Concierge Service',
        description: 'Personal recommendations and support',
        included: true,
        icon: 'concierge',
      },
      {
        id: 'analytics',
        name: 'Viewing Analytics',
        description: 'Track your streaming habits and savings',
        included: true,
        icon: 'analytics',
      },
    ],
    pricing: {
      monthly: 14.99,
      yearly: 149.99,
      currency: 'USD',
    },
    iapProductIds: {
      ios: {
        monthly: 'com.geoleap.pro.monthly',
        yearly: 'com.geoleap.pro.yearly',
      },
      android: {
        monthly: 'geoleap_pro_monthly',
        yearly: 'geoleap_pro_yearly',
      },
    },
    color: '#9C27B0',
  },
];

export const getSubscriptionPlanById = (planId: string): SubscriptionPlan | undefined => {
  return SUBSCRIPTION_PLANS.find(p => p.id === planId);
};

export const getSubscriptionPlanByTier = (tier: SubscriptionTier): SubscriptionPlan | undefined => {
  return SUBSCRIPTION_PLANS.find(p => p.tier === tier);
};

export const calculateYearlySavings = (plan: SubscriptionPlan): number => {
  const monthlyTotal = plan.pricing.monthly * 12;
  const yearlySavings = monthlyTotal - plan.pricing.yearly;
  return Math.round(yearlySavings * 100) / 100;
};

export const calculateSavingsPercentage = (plan: SubscriptionPlan): number => {
  const monthlyTotal = plan.pricing.monthly * 12;
  if (monthlyTotal === 0) return 0;
  const savings = calculateYearlySavings(plan);
  return Math.round((savings / monthlyTotal) * 100);
};
