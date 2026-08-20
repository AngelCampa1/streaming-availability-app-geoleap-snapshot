'use client';

import React, { useState, useEffect } from 'react';
import { SubscriptionTier } from '@/lib/types/paywall';
import { usePaywall } from '@/contexts/PaywallContext';
import { upgradeSubscription } from '@/lib/api';
import { formatPlanPrice, premiumPlan } from '@/lib/pricing';

interface MobilePaywallSheetProps {
  isOpen: boolean;
  onClose: () => void;
  trigger?: string;
  className?: string;
}

interface QuickPlan {
  tier: SubscriptionTier;
  name: string;
  price: string;
  originalPrice?: string;
  highlight: string;
  features: string[];
  badge?: string;
  buttonStyle: string;
}

const quickPlans: QuickPlan[] = [
  {
    tier: SubscriptionTier.Premium,
    name: 'Premium',
    price: formatPlanPrice(premiumPlan),
    highlight: 'Complete streaming discovery',
    features: ['Unlimited searches', 'Direct streaming links', 'Priority support', 'Ad-free experience'],
    badge: 'POPULAR',
    buttonStyle: 'bg-gradient-to-r from-primary to-accent text-primary-foreground',
  },
];

export const MobilePaywallSheet: React.FC<MobilePaywallSheetProps> = ({
  isOpen,
  onClose,
  trigger = 'mobile-sheet',
  className = '',
}) => {
  const { subscription, trackPaywallInteraction, getUpgradeMessage } = usePaywall();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionTier>(SubscriptionTier.Premium);
  const [upgrading, setUpgrading] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);

  const currentTier = subscription.subscription?.tier || SubscriptionTier.Free;
  const availablePlans = quickPlans.filter(plan => plan.tier > currentTier);

  useEffect(() => {
    if (isOpen) {
      trackPaywallInteraction('mobile_paywall_shown', {
        trigger,
        paywallPosition: 'mobile-sheet',
      });
    }
  }, [isOpen, trigger, trackPaywallInteraction]);

  const handlePlanSelect = (tier: SubscriptionTier) => {
    setSelectedPlan(tier);
    trackPaywallInteraction('mobile_plan_selected', {
      selectedTier: tier,
      paywallPosition: 'mobile-sheet',
    });
  };

  const handleUpgrade = async () => {
    setUpgrading(true);

    try {
      const plan = quickPlans.find(p => p.tier === selectedPlan);
      if (!plan) throw new Error('Invalid plan selected');

      trackPaywallInteraction('mobile_upgrade_clicked', {
        selectedTier: plan.name.toLowerCase(),
        paywallPosition: 'mobile-sheet',
      });

      const response = await upgradeSubscription(plan.name.toLowerCase());

      if (response.redirectUrl) {
        window.location.href = response.redirectUrl;
      } else {
        onClose();
      }
    } catch (error) {
      console.error('Mobile upgrade failed:', error);
      alert('Upgrade failed. Please try again.');
    } finally {
      setUpgrading(false);
    }
  };

  const handleClose = () => {
    trackPaywallInteraction('mobile_paywall_dismissed', {
      paywallPosition: 'mobile-sheet',
    });
    onClose();
  };

  const handleDragEnd = (event: React.TouchEvent) => {
    const touch = event.changedTouches[0];
    const threshold = 100; // Minimum swipe distance
    const velocity = Math.abs(touch.clientY);

    if (velocity > threshold) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  const upgradeMessage = getUpgradeMessage({
    position: 'mobile-sheet',
    feature: trigger,
  });

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={handleClose} />

      {/* Sheet */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-card rounded-t-2xl max-h-[85vh] overflow-hidden ${className}`}
        onTouchEnd={handleDragEnd}
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-muted-foreground/30 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground">Unlock Premium</h2>
              <p className="text-sm text-muted-foreground mt-1">Choose your plan</p>
            </div>
            <button onClick={handleClose} className="p-2 hover:bg-muted rounded-full">
              <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Upgrade Message */}
          <div className="p-6 bg-gradient-to-r from-primary/10 to-accent/10 border-b border-border">
            <div className="text-center">
              <div className="text-3xl mb-2">🚀</div>
              <p className="text-foreground text-sm leading-relaxed">{upgradeMessage}</p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="p-6 border-b border-border">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-primary">2h+</div>
                <div className="text-xs text-muted-foreground">Time saved weekly</div>
              </div>
              <div>
                <div className="text-lg font-bold text-success">$20+</div>
                <div className="text-xs text-muted-foreground">Money saved monthly</div>
              </div>
              <div>
                <div className="text-lg font-bold text-accent-foreground">195</div>
                <div className="text-xs text-muted-foreground">Countries covered</div>
              </div>
            </div>
          </div>

          {/* Plans */}
          <div className="p-6 space-y-4">
            {availablePlans.map(plan => (
              <div
                key={plan.name}
                className={`relative border-2 rounded-xl p-4 cursor-pointer transition-all ${
                  selectedPlan === plan.tier ? 'border-primary bg-primary/10' : 'border-border active:border-border'
                }`}
                onClick={() => handlePlanSelect(plan.tier)}
              >
                {/* Popular Badge */}
                {plan.badge && (
                  <div className="absolute -top-2 left-4">
                    <span className="bg-warning text-warning-foreground px-2 py-1 rounded-full text-xs font-bold">
                      {plan.badge}
                    </span>
                  </div>
                )}

                {/* Radio */}
                <div className="absolute top-4 right-4">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedPlan === plan.tier ? 'border-primary bg-primary' : 'border-border'
                    }`}
                  >
                    {selectedPlan === plan.tier && <div className="w-2 h-2 bg-primary-foreground rounded-full" />}
                  </div>
                </div>

                <div className="pr-8">
                  {/* Plan Header */}
                  <div className="flex items-baseline mb-2">
                    <h3 className="text-lg font-bold text-foreground mr-2">{plan.name}</h3>
                    <div className="flex items-baseline">
                      <span className="text-xl font-bold text-foreground">{plan.price}</span>
                      {plan.originalPrice && (
                        <span className="text-sm text-muted-foreground line-through ml-2">{plan.originalPrice}</span>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground mb-3">{plan.highlight}</p>

                  {/* Features */}
                  <div className="space-y-1">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-center text-sm">
                        <span className="w-1.5 h-1.5 bg-success rounded-full mr-2 flex-shrink-0" />
                        <span className="text-foreground">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Feature Toggle */}
          <div className="px-6 pb-4">
            <button
              onClick={() => setShowFeatures(!showFeatures)}
              className="w-full text-center text-primary font-medium py-2 text-sm"
            >
              {showFeatures ? 'Hide' : 'View'} All Features
              <svg
                className={`w-4 h-4 inline ml-2 transition-transform ${showFeatures ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Expanded Features */}
          {showFeatures && (
            <div className="px-6 pb-6 border-t border-border pt-4">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center">
                    <span className="text-success mr-2">Yes</span>
                    <span>Unlimited searches</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-success mr-2">Yes</span>
                    <span>Direct streaming links</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-success mr-2">Yes</span>
                    <span>Advanced filters</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-success mr-2">Yes</span>
                    <span>Export results</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-success mr-2">Yes</span>
                    <span>Priority support</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-success mr-2">Yes</span>
                    <span>Ad-free experience</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Area */}
        <div className="p-6 bg-muted border-t border-border">
          <div className="space-y-3">
            {/* Main CTA */}
            <button
              onClick={handleUpgrade}
              disabled={upgrading || availablePlans.length === 0}
              className={`w-full py-4 px-6 rounded-full font-semibold text-lg transition-all ${
                quickPlans.find(p => p.tier === selectedPlan)?.buttonStyle || 'bg-primary text-primary-foreground'
              } ${upgrading ? 'opacity-50' : 'active:scale-95'} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {upgrading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24">
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
              ) : availablePlans.length === 0 ? (
                'Already Premium!'
              ) : (
                `Start ${quickPlans.find(p => p.tier === selectedPlan)?.name} Plan`
              )}
            </button>

            {/* Trust Indicators */}
            <div className="flex items-center justify-center space-x-6 text-xs text-muted-foreground">
              <div className="flex items-center">
                <span className="mr-1">🔒</span>
                <span>Secure</span>
              </div>
              <div className="flex items-center">
                <span className="mr-1">Return</span>
                <span>14-day money back guarantee</span>
              </div>
              <div className="flex items-center">
                <span className="mr-1">Fast</span>
                <span>Instant access</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobilePaywallSheet;
