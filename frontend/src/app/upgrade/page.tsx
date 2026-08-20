'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscription } from '../../hooks/useSubscription';
import { SubscriptionTier } from '../../lib/types/paywall';
import StripeProvider from '../../components/payment/StripeProvider';
import { PaymentForm } from '../../components/payment/PaymentForm';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { SkeletonLoader } from '../../components/common/SkeletonLoader';
import { PaymentTransaction } from '../../lib/types/payment';
import { formatPlanPrice, formatPremiumMonthlyEquivalent, premiumPlan } from '../../lib/pricing';
import {
  ArrowLeft,
  Shield,
  Check,
  Sparkles,
  Zap,
  Star,
} from 'lucide-react';

interface PlanDetails {
  name: string;
  price: number;
  billingPeriod: string;
  features: string[];
  isLifetime: boolean;
  stripePriceId?: string;
}

const PLANS: Record<string, PlanDetails> = {
  premium: {
    name: 'GeoLeap Premium',
    price: premiumPlan.priceUsd,
    billingPeriod: premiumPlan.billingPeriod,
    isLifetime: false,
    features: [
      'Everything in Free',
      'Ad-free experience',
      'No VPN affiliate recommendations',
      'Unlimited watchlist + content alerts',
      'Priority customer support',
      'Support an indie developer',
    ],
  },
};

const UpgradePageContent: React.FC = () => {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { subscription, loading: subscriptionLoading } = useSubscription();

  const [selectedPlan, setSelectedPlan] = useState<PlanDetails | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  useEffect(() => {
    // Wait for auth check to complete before making auth decisions
    if (authLoading) return;

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
      router.push(`/auth/login?returnUrl=${returnUrl}`);
      return;
    }

    // Wait for subscription check to complete
    if (subscriptionLoading) return;

    // Redirect Premium users away - they already have a subscription
    if (subscription && subscription.isActive && subscription.tier >= SubscriptionTier.Premium) {
      // BUG-F16: Removed console.log - using proper logging pattern instead
      router.push('/account?message=already_premium');
      return;
    }

    // Single annual plan
    setSelectedPlan(PLANS.premium);
  }, [authLoading, isAuthenticated, router, subscription, subscriptionLoading]);

  const handlePaymentSuccess = (transaction: PaymentTransaction) => {
    // Redirect to payment success page with both transaction_id and payment_intent for proper status sync
    const params = new URLSearchParams({
      transaction_id: transaction.id,
      plan: selectedPlan?.name || '',
    });
    // Also include payment_intent so success page can sync status with Stripe
    if (transaction.stripePaymentIntentId) {
      params.set('payment_intent', transaction.stripePaymentIntentId);
    }
    router.push(`/payment/success?${params.toString()}`);
  };

  const handlePaymentError = (errorMessage: string) => {
    console.error('Payment error:', errorMessage);
    // Error will be displayed by PaymentForm
  };

  const handleStartTrial = () => {
    setShowPaymentForm(true);
  };

  const handleBack = () => {
    if (showPaymentForm) {
      setShowPaymentForm(false);
    } else {
      router.back();
    }
  };

  if (authLoading || subscriptionLoading) {
    return <SkeletonLoader />;
  }

  if (!selectedPlan) {
    return <SkeletonLoader />;
  }

  // Don't render upgrade page if user already has Premium
  if (subscription && subscription.isActive && subscription.tier >= SubscriptionTier.Premium) {
    return <SkeletonLoader />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Back Button */}
        <div className="mb-6">
          <Button variant="outline" onClick={handleBack} className="flex items-center space-x-2">
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Button>
        </div>

        {/* Page Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <Sparkles className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">
              {showPaymentForm ? 'Complete Your Purchase' : 'Upgrade to Premium'}
            </h1>
          </div>
          <p className="text-muted-foreground">
            {showPaymentForm
              ? 'Enter your payment details to complete the upgrade'
              : 'Unlock unlimited streaming discovery across the globe'
            }
          </p>
        </div>

        {!showPaymentForm ? (
          /* Plan Summary Card */
          <div className="grid md:grid-cols-2 gap-6">
            {/* Plan Details */}
            <Card className="p-6 border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
              <div className="space-y-6">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <Zap className="w-5 h-5 text-primary" />
                    <h2 className="text-xl font-bold text-foreground">{selectedPlan.name}</h2>
                  </div>
                  <div className="flex items-baseline space-x-1">
                    <span className="text-4xl font-bold text-foreground">{formatPlanPrice(premiumPlan).replace('/year', '')}</span>
                    <span className="text-muted-foreground">/{selectedPlan.billingPeriod}</span>
                  </div>
                  <p className="text-sm text-primary font-medium mt-1">about {formatPremiumMonthlyEquivalent()}</p>
                  <p className="text-sm text-success mt-1">
                    Includes 30-Day Free Trial
                  </p>
                </div>

                <ul className="space-y-3">
                  {selectedPlan.features.map((feature, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <Check className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                      <span className="text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={handleStartTrial}
                  className="w-full"
                  size="lg"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Start 30-Day Free Trial
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  30-day free trial, then $15/year. Cancel anytime.
                </p>
              </div>
            </Card>

            {/* Why Upgrade */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center space-x-2">
                <Star className="w-5 h-5 text-warning" />
                <span>Why Upgrade?</span>
              </h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">Never Hit a Search Limit Again</h4>
                    <p className="text-sm text-muted-foreground">
                      Search as much as you want across 57 countries
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">Ad-Free Experience</h4>
                    <p className="text-sm text-muted-foreground">
                      Focus on finding content without interruptions
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center flex-shrink-0">
                    <Star className="w-5 h-5 text-warning" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">Priority Support</h4>
                    <p className="text-sm text-muted-foreground">
                      Get help faster with dedicated support
                    </p>
                  </div>
                </div>
              </div>

              {/* Money Back Guarantee */}
              <div className="mt-6 p-4 bg-success/10 rounded-lg border border-success/20">
                <div className="flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-success" />
                  <span className="font-medium text-success">14-Day Money Back Guarantee</span>
                </div>
                <p className="text-sm text-success/80 mt-1">
                  Not satisfied? Get a full refund within 14 days, no questions asked.
                </p>
              </div>
            </Card>
          </div>
        ) : (
          /* Payment Form */
          <div className="max-w-xl mx-auto">
            <Card className="p-6">
              <div className="mb-6 pb-6 border-b border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">{selectedPlan.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedPlan.isLifetime
                        ? 'One-time payment'
                        : 'Billed annually after trial'
                      }
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-foreground">${selectedPlan.price}</span>
                    <span className="text-muted-foreground">/{selectedPlan.billingPeriod}</span>
                  </div>
                </div>
              </div>

              <StripeProvider amount={selectedPlan.price} currency="USD">
                <PaymentForm
                  amount={selectedPlan.price}
                  currency="USD"
                  description={selectedPlan.name}
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                  onCancel={handleBack}
                  showSavePaymentMethod={true}
                />
              </StripeProvider>
            </Card>

            {/* Security Badge */}
            <div className="mt-6 flex items-center justify-center space-x-4 text-sm text-muted-foreground">
              <div className="flex items-center space-x-1">
                <Shield className="w-4 h-4 text-success" />
                <span>Secured by Stripe</span>
              </div>
              <div className="flex items-center space-x-1">
                <Check className="w-4 h-4 text-success" />
                <span>PCI Compliant</span>
              </div>
              <div className="flex items-center space-x-1">
                <Check className="w-4 h-4 text-success" />
                <span>256-bit SSL</span>
              </div>
            </div>
          </div>
        )}

        {/* Back to Pricing */}
        {!showPaymentForm && (
          <div className="mt-8 text-center">
            <Button
              variant="link"
              onClick={() => router.push('/pricing')}
              className="text-muted-foreground"
            >
              Compare Free vs Premium plans
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default function UpgradePage() {
  return (
    <Suspense fallback={<SkeletonLoader />}>
      <UpgradePageContent />
    </Suspense>
  );
}
