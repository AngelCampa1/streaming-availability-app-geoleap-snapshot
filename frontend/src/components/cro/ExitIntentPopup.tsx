'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { useExitIntent } from '@/hooks/useExitIntent';
import { useABTest } from '@/lib/ab-testing';
import { SubscriptionTier } from '@/lib/types/paywall';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { formatPlanPrice, formatPremiumMonthlyEquivalent, getPremiumTrialCopy, premiumPlan } from '@/lib/pricing';

const EXCLUDED_PATH_SEGMENTS = ['/auth', '/upgrade', '/payment', '/pricing', '/admin'];

export function ExitIntentPopup() {
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuth();
  const { subscription } = useSubscription();
  const { showExitIntent, dismiss } = useExitIntent();
  const { config, trackConversion } = useABTest('exit-intent-copy');

  // Don't show on excluded paths
  const isExcludedPath = EXCLUDED_PATH_SEGMENTS.some((segment) =>
    pathname.includes(segment)
  );
  if (isExcludedPath) return null;

  // Don't show for premium/admin users
  const isPremium =
    subscription &&
    subscription.tier >= SubscriptionTier.Premium;
  if (isPremium) return null;

  // Don't show if exit intent hasn't triggered
  if (!showExitIntent) return null;

  const isAnonymous = !isAuthenticated || !user;
  const planPrice = formatPlanPrice(premiumPlan);
  const monthlyEquivalent = formatPremiumMonthlyEquivalent();
  const trialCopy = getPremiumTrialCopy();

  // A/B tested copy with fallbacks
  const title = isAnonymous
    ? (config.anonTitle as string) || "Don't lose your search results"
    : (config.authTitle as string) || "Don't miss out!";

  const description = isAnonymous
    ? (config.anonDescription as string) || 'Your results disappear when you leave. Free account keeps them, plus 10 searches a day, a watchlist, and VPN guidance when you need it.'
    : (config.authDescription as string) || `Lock in our launch price: ${planPrice}, about ${monthlyEquivalent}, with a ${trialCopy}. No ads, unlimited watchlist, and priority support.`;

  const handleCTAClick = () => {
    trackConversion('exit_intent_cta_click', 1);
  };

  return (
    <Dialog open={showExitIntent} onOpenChange={(open) => !open && dismiss()}>
      <DialogContent className="sm:max-w-md">
        <button
          onClick={dismiss}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          aria-label="Dismiss popup"
        >
          <X className="h-4 w-4" />
        </button>

        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center">
            {title}
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground pt-2">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-3 pt-4">
          {isAnonymous ? (
            <Button asChild className="w-full" onClick={handleCTAClick}>
              <Link href="/auth/register">Sign Up Free</Link>
            </Button>
          ) : (
            <Button asChild className="w-full" onClick={handleCTAClick}>
              <Link href="/pricing">Start Free Trial</Link>
            </Button>
          )}

          <button
            onClick={dismiss}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            No thanks, maybe later
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ExitIntentPopup;
