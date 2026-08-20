'use client';

import React, { useState } from 'react';
import { SubscriptionTier } from '@/lib/types/paywall';
import { upgradeSubscription, logPaywallInteraction } from '@/lib/api';
import { formatPlanPrice, premiumPlan } from '@/lib/pricing';

interface FeatureComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier: SubscriptionTier;
  onUpgradeSuccess?: () => void;
}

const featureMatrix = [
  {
    category: 'Search & Results',
    features: [
      {
        name: 'Search Results per Query',
        free: '5 results',
        premium: 'Unlimited',
        icon: '🔍',
      },
      {
        name: 'Daily Searches',
        free: '5 searches',
        premium: 'Unlimited',
        icon: '📊',
      },
      {
        name: 'Search History',
        free: 'Last 5 searches',
        premium: 'Unlimited history',
        icon: '📋',
      },
    ],
  },
  {
    category: 'Content Access',
    features: [
      {
        name: 'Content Details',
        free: 'Basic info',
        premium: 'Complete metadata',
        icon: '📽️',
      },
      {
        name: 'Streaming Links',
        free: 'No',
        premium: 'Yes - Direct links',
        icon: '🔗',
      },
      {
        name: 'Pricing Information',
        free: 'No',
        premium: 'Yes - Full pricing',
        icon: '💰',
      },
    ],
  },
  {
    category: 'Advanced Features',
    features: [
      {
        name: 'Advanced Filters',
        free: 'No',
        premium: 'Yes - All filters',
        icon: '🎛️',
      },
      {
        name: 'Export Results',
        free: 'No',
        premium: 'Yes - CSV, PDF',
        icon: '📤',
      },
      {
        name: 'Priority Support',
        free: 'Community only',
        premium: 'Priority support',
        icon: '🚀',
      },
    ],
  },
];

const getTierColor = (tier: string): string => {
  switch (tier) {
    case 'free':
      return 'text-foreground bg-muted';
    case 'premium':
      return 'text-warning bg-gradient-to-br from-warning/10 to-warning/20';
    default:
      return 'text-foreground bg-muted';
  }
};

const getTierPrice = (tier: string): string => {
  switch (tier) {
    case 'free':
      return 'Free';
    case 'premium':
      return formatPlanPrice(premiumPlan);
    default:
      return '';
  }
};

export const FeatureComparisonModal: React.FC<FeatureComparisonModalProps> = ({
  isOpen,
  onClose,
  currentTier,
  onUpgradeSuccess,
}) => {
  const [upgrading, setUpgrading] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUpgrade = async (targetTier: SubscriptionTier) => {
    if (targetTier <= currentTier) return;

    setUpgrading('premium');

    await logPaywallInteraction('upgrade_clicked', {
      paywallPosition: 'feature-comparison-modal',
    });

    try {
      const tierName = targetTier === SubscriptionTier.Premium ? 'premium' : 'premium';
      const response = await upgradeSubscription(tierName);

      if (response.redirectUrl) {
        window.location.href = response.redirectUrl;
      } else if (onUpgradeSuccess) {
        onUpgradeSuccess();
        onClose();
      }
    } catch (error) {
      console.error('Upgrade failed:', error);
      alert('Upgrade failed. Please try again or contact support.');
    } finally {
      setUpgrading(null);
    }
  };

  const handleModalClose = async () => {
    await logPaywallInteraction('dismissed', {
      paywallPosition: 'feature-comparison-modal',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Compare Plans</h2>
            <p className="text-muted-foreground mt-1">Choose the perfect plan for your streaming needs</p>
          </div>
          <button onClick={handleModalClose} className="p-2 hover:bg-muted rounded-full transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Plan Headers */}
        <div className="grid grid-cols-3 gap-4 p-6 pb-0">
          <div className="text-muted-foreground font-medium">Features</div>
          {['free', 'premium'].map(tier => (
            <div key={tier} className={`text-center p-4 rounded-lg ${getTierColor(tier)}`}>
              <h3 className="font-bold text-lg capitalize">{tier}</h3>
              <p className="text-sm opacity-75">{getTierPrice(tier)}</p>
              {tier === 'premium' && (
                <button
                  onClick={() => handleUpgrade(SubscriptionTier.Premium)}
                  disabled={upgrading !== null || SubscriptionTier.Premium <= currentTier}
                  className={`mt-2 px-4 py-2 rounded-full font-medium text-sm w-full transition-colors ${
                    SubscriptionTier.Premium <= currentTier
                      ? 'bg-muted text-muted-foreground cursor-not-allowed'
                      : 'bg-gradient-to-r from-warning to-warning/80 hover:from-warning/90 hover:to-warning/70 text-white'
                  }`}
                >
                  {upgrading === 'premium' ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Upgrading...
                    </span>
                  ) : SubscriptionTier.Premium <= currentTier ? (
                    'Current Plan'
                  ) : (
                    'Upgrade to Premium'
                  )}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Feature Matrix */}
        <div className="p-6">
          {featureMatrix.map((category, categoryIndex) => (
            <div key={categoryIndex} className="mb-8">
              <h3 className="text-lg font-bold text-foreground mb-4 flex items-center">
                <span className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center mr-3">
                  {categoryIndex + 1}
                </span>
                {category.category}
              </h3>

              {category.features.map((feature, featureIndex) => (
                <div
                  key={featureIndex}
                  className="grid grid-cols-3 gap-4 py-3 border-b border-border last:border-b-0"
                >
                  <div className="flex items-center">
                    <span className="text-lg mr-2">{feature.icon}</span>
                    <span className="font-medium text-foreground">{feature.name}</span>
                  </div>
                  <div className="text-center text-sm">
                    <span
                      className={`inline-block px-3 py-1 rounded-full ${
                        feature.free === 'No' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-foreground'
                      }`}
                    >
                      {feature.free}
                    </span>
                  </div>
                  <div className="text-center text-sm">
                    <span
                      className={`inline-block px-3 py-1 rounded-full ${
                        feature.premium.startsWith('Yes') ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                      }`}
                    >
                      {feature.premium}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Value Props */}
        <div className="bg-gradient-to-r from-primary/10 to-warning/10 p-6 m-6 rounded-lg">
          <h3 className="text-lg font-bold text-foreground mb-4 text-center">🎯 Why Users Love Premium</h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl mb-2">Fast</div>
              <div className="font-medium">Save 2+ Hours Weekly</div>
              <div className="text-muted-foreground">No more hunting across platforms</div>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-2">💰</div>
              <div className="font-medium">Save $20+ Monthly</div>
              <div className="text-muted-foreground">Find the cheapest streaming options</div>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-2">🌍</div>
              <div className="font-medium">Access Global Content</div>
              <div className="text-muted-foreground">Discover shows from 195+ countries</div>
            </div>
          </div>
        </div>

        {/* Money Back Guarantee */}
        <div className="text-center p-6 border-t border-border">
          <div className="flex items-center justify-center text-success mb-2">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span className="font-medium">14-Day Money-Back Guarantee</span>
          </div>
          <p className="text-muted-foreground text-sm">
            Try Premium risk-free. If you&rsquo;re not satisfied, we&rsquo;ll refund your money.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FeatureComparisonModal;
