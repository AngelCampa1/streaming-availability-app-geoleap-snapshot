'use client';

import React, { useState, useEffect } from 'react';
import { SubscriptionTier } from '@/lib/types/paywall';
import { logUpgradeFlowStarted, logPaywallInteraction } from '@/lib/api';
import { formatPremiumMonthlyEquivalent, formatUsd, getPremiumTrialCopy, premiumPlan } from '@/lib/pricing';

interface UpgradeFlowProps {
  currentTier: SubscriptionTier;
  targetTier?: SubscriptionTier;
  source?: string;
  onClose?: () => void;
  className?: string;
}

interface PricingPlan {
  tier: SubscriptionTier;
  name: string;
  price: number;
  originalPrice?: number;
  period: string;
  description: string;
  features: string[];
  limitations: string[];
  popular: boolean;
  savings?: string;
  buttonText: string;
  buttonStyle: string;
}

const pricingPlans: PricingPlan[] = [
  {
    tier: SubscriptionTier.Premium,
    name: 'GeoLeap Premium',
    price: premiumPlan.priceUsd,
    period: premiumPlan.billingPeriod,
    description: 'Ad-free streaming discovery that supports an indie developer',
    features: [
      'Everything in Free',
      'Ad-free experience',
      'No VPN affiliate recommendations',
      'Unlimited watchlist and content alerts',
      'Priority customer support',
      'Support an indie developer',
    ],
    limitations: [],
    popular: true,
    buttonText: 'Start 30-Day Free Trial',
    buttonStyle: 'bg-gradient-to-r from-primary to-primary-400 hover:from-primary/90 hover:to-primary-400/90 text-primary-foreground',
  },
];

const getPlanPrice = (plan: PricingPlan): string => {
  return formatUsd(plan.price);
};

export const UpgradeFlow: React.FC<UpgradeFlowProps> = ({
  currentTier,
  targetTier,
  source = 'upgrade-flow',
  onClose,
  className = '',
}) => {
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>(targetTier || SubscriptionTier.Premium);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availablePlans = pricingPlans.filter(plan => plan.tier > currentTier);

  useEffect(() => {
    // Track upgrade flow started - fire once on mount only
    logUpgradeFlowStarted();
  }, [source]);

  const handlePlanSelect = (tier: SubscriptionTier) => {
    setSelectedTier(tier);
    setError(null);
  };

  const handleUpgrade = async () => {
    setLoading(true);
    setError(null);

    try {
      const selectedPlan = pricingPlans.find(p => p.tier === selectedTier);
      if (!selectedPlan) {
        throw new Error('Invalid plan selected');
      }

      const tierName = selectedPlan.name;
      const amount = selectedPlan.price;
      const description = `GeoLeap ${tierName} Subscription (annual)`;

      // Track checkout started
      await logPaywallInteraction('upgrade_clicked', {
        paywallPosition: source,
      });

      // Navigate to payment page with subscription details
      const params = new URLSearchParams({
        amount: amount.toString(),
        currency: 'USD',
        description: description,
        view: 'payment',
      });

      window.location.href = `/payment-${params.toString()}`;
    } catch (err) {
      console.error('Upgrade failed:', err);
      setError(err instanceof Error ? err.message : 'Upgrade failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    logPaywallInteraction('dismissed', {
      paywallPosition: source,
    });
    if (onClose) {
      onClose();
    }
  };

  if (availablePlans.length === 0) {
    return (
      <div className={`bg-card rounded-xl shadow-lg p-8 text-center ${className}`}>
        <div className="text-6xl mb-4">👑</div>
        <h2 className="text-2xl font-bold text-foreground mb-2">You&apos;re on the highest plan!</h2>
        <p className="text-muted-foreground mb-6">You already have access to all premium features.</p>
        <button
          onClick={handleClose}
          className="bg-muted hover:bg-muted/80 text-foreground px-6 py-3 rounded-full font-medium"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div className={`bg-card rounded-xl shadow-2xl overflow-hidden border border-border ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary-600 text-primary-foreground p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-1">Upgrade Your Plan</h2>
            <p className="text-primary-foreground opacity-80">Unlock premium features and save time</p>
          </div>
          {onClose && (
            <button
              onClick={handleClose}
              className="p-2 hover:bg-primary-foreground hover:bg-opacity-20 rounded-full transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Plans */}
      <div className="p-6">
        <div className="space-y-4">
          {availablePlans.map(plan => (
            <div
              key={plan.name}
              className={`relative border-2 rounded-xl p-6 cursor-pointer transition-all ${
                selectedTier === plan.tier
                  ? plan.popular
                    ? 'border-warning bg-gradient-to-br from-warning/10 to-warning/20'
                    : 'border-primary bg-primary/10'
                  : 'border-border hover:border-border/80'
              }`}
              onClick={() => handlePlanSelect(plan.tier)}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-3 left-6">
                  <span className="bg-gradient-to-r from-warning to-warning text-warning-foreground px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                    🚀 MOST POPULAR
                  </span>
                </div>
              )}

              {/* Radio Button */}
              <div className="absolute top-6 right-6">
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedTier === plan.tier
                      ? plan.popular
                        ? 'border-warning bg-warning'
                        : 'border-primary bg-primary'
                      : 'border-border'
                  }`}
                >
                  {selectedTier === plan.tier && <div className="w-2 h-2 bg-primary-foreground rounded-full"></div>}
                </div>
              </div>

              <div className="pr-8">
                {/* Plan Header */}
                <div className="flex items-baseline mb-4">
                  <h3 className="text-xl font-bold text-foreground mr-3">{plan.name}</h3>
                  <div className="flex items-baseline">
                    <span className="text-3xl font-bold text-foreground">
                      {getPlanPrice(plan)}
                    </span>
                    <span className="ml-1 text-sm text-muted-foreground">/{plan.period}</span>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mt-1">About {formatPremiumMonthlyEquivalent()}</p>
                <p className="text-muted-foreground mb-4 mt-2">{plan.description}</p>

                {/* Key Features */}
                <div className="grid md:grid-cols-2 gap-2 mb-4">
                  {plan.features.slice(0, 6).map((feature, index) => (
                    <div key={`${plan.tier}-${index}`} className="flex items-start text-sm">
                      <span className="w-2 h-2 bg-success rounded-full mr-2 mt-2 flex-shrink-0"></span>
                      <span className="text-foreground">{feature}</span>
                    </div>
                  ))}
                  {plan.features.length > 6 && (
                    <div className="text-sm text-muted-foreground">+{plan.features.length - 6} more features</div>
                  )}
                </div>

                {/* Trial info */}
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 mt-4">
                  <p className="text-sm text-primary font-medium">{getPremiumTrialCopy()} at launch price. Credit card required.</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-4 bg-error/10 border border-error/20 rounded-lg p-4">
            <div className="flex items-center text-error">
              <span className="mr-2">⚠️</span>
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex space-x-4">
          {onClose && (
            <button
              onClick={handleClose}
              className="flex-1 bg-muted hover:bg-muted/80 text-foreground py-3 px-6 rounded-full font-medium transition-colors"
            >
              Maybe Later
            </button>
          )}

          <button
            onClick={handleUpgrade}
            disabled={loading}
            className={`flex-1 py-3 px-6 rounded-full font-medium transition-all duration-200 ${
              pricingPlans.find(p => p.tier === selectedTier)?.buttonStyle || 'bg-primary hover:bg-primary/90 text-primary-foreground'
            } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-primary-foreground" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Processing...
              </span>
            ) : (
              pricingPlans.find(p => p.tier === selectedTier)?.buttonText || 'Upgrade Now'
            )}
          </button>
        </div>

        {/* Trust Indicators */}
        <div className="mt-6 pt-6 border-t border-border">
          <div className="grid grid-cols-3 gap-4 text-center text-sm text-muted-foreground">
            <div>
              <div className="text-lg mb-1">🔒</div>
              <div>Secure Payment</div>
            </div>
            <div>
              <div className="text-lg mb-1">↩️</div>
              <div>14-Day Money Back Guarantee</div>
            </div>
            <div>
              <div className="text-lg mb-1">📞</div>
              <div>Priority Support</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpgradeFlow;
