'use client';

import React, { useState } from 'react';
import { SubscriptionTier, PaywallInfo, UpgradePrompt } from '@/lib/types/paywall';
import { logPaywallInteraction } from '@/lib/api';

interface PaywallBannerProps {
  paywallInfo: PaywallInfo;
  className?: string;
  position?: string;
  onUpgradeClick?: () => void;
}

const getTierName = (tier: SubscriptionTier): string => {
  switch (tier) {
    case SubscriptionTier.Free:
      return 'Free';
    case SubscriptionTier.Basic:
      return 'Basic';
    case SubscriptionTier.Premium:
      return 'Premium';
    case SubscriptionTier.Admin:
      return 'Admin';
    default:
      return 'Free';
  }
};

const getUpgradePrompt = (paywallInfo: PaywallInfo): UpgradePrompt => {
  const { userTier, remainingSearches } = paywallInfo;

  if (userTier === SubscriptionTier.Free) {
    const isUrgent = remainingSearches !== undefined && remainingSearches <= 5;
    return {
      title: isUrgent
        ? "Don't Lose Your Streaming Discoveries"
        : "Don't Miss Out on Full Streaming Access",
      message:
        paywallInfo.upgradeMessage ||
        `You're on the ${getTierName(userTier)} plan. ${
          remainingSearches
            ? `Only ${remainingSearches} searches remaining today  -  don't lose access to new discoveries.`
            : "Without Premium, you're missing unlimited searches and direct streaming links."
        }`,
      ctaText: paywallInfo.ctaText || 'Upgrade to Premium',
      ctaUrl: paywallInfo.ctaUrl || '/pricing',
      benefits: [
        'Ad-free experience',
        'No VPN affiliate recommendations',
        'Unlimited watchlist + content alerts',
        'Priority support',
      ],
      urgencyLevel: isUrgent ? 'high' : 'medium',
      dismissible: true,
    };
  }

  // Fallback for other tiers
  return {
    title: 'Upgrade Your Plan',
    message: paywallInfo.upgradeMessage || 'Unlock more features with a premium plan.',
    ctaText: paywallInfo.ctaText || 'Learn More',
    ctaUrl: paywallInfo.ctaUrl || '/pricing',
    benefits: [],
    urgencyLevel: 'low',
    dismissible: true,
  };
};

const getUrgencyStyles = (urgencyLevel: 'low' | 'medium' | 'high'): string => {
  switch (urgencyLevel) {
    case 'high':
      return 'bg-destructive/10 border-destructive/30 text-destructive';
    case 'medium':
      return 'bg-warning/10 border-warning/30 text-warning';
    case 'low':
      return 'bg-primary/10 border-primary/30 text-primary';
    default:
      return 'bg-muted border-border text-muted-foreground';
  }
};

const getButtonStyles = (urgencyLevel: 'low' | 'medium' | 'high'): string => {
  switch (urgencyLevel) {
    case 'high':
      return 'bg-destructive hover:bg-destructive/90 text-destructive-foreground';
    case 'medium':
      return 'bg-warning hover:bg-warning/90 text-warning-foreground';
    case 'low':
      return 'bg-primary hover:bg-primary/90 text-primary-foreground';
    default:
      return 'bg-secondary hover:bg-secondary/90 text-secondary-foreground';
  }
};

export const PaywallBanner: React.FC<PaywallBannerProps> = ({
  paywallInfo,
  className = '',
  position = 'search-results',
  onUpgradeClick,
}) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const upgradePrompt = getUpgradePrompt(paywallInfo);

  React.useEffect(() => {
    // Track when paywall is shown (only when paywall is active and not dismissed)
    if (paywallInfo.isPaywallActive && !isDismissed) {
      logPaywallInteraction('paywall_shown', {
        paywallPosition: position,
      });
    }
  }, [position, paywallInfo.isPaywallActive, isDismissed]);

  if (!paywallInfo.isPaywallActive || isDismissed) {
    return null;
  }

  const handleUpgradeClick = async () => {
    await logPaywallInteraction('upgrade_clicked', {
      paywallPosition: position,
    });

    if (onUpgradeClick) {
      onUpgradeClick();
    } else {
      window.location.href = upgradePrompt.ctaUrl;
    }
  };

  const handleDismiss = async () => {
    await logPaywallInteraction('dismissed', {
      paywallPosition: position,
    });
    setIsDismissed(true);
  };

  const urgencyStyles = getUrgencyStyles(upgradePrompt.urgencyLevel);
  const buttonStyles = getButtonStyles(upgradePrompt.urgencyLevel);

  return (
    <div className={`rounded-lg border-2 p-6 mb-6 ${urgencyStyles} ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold mb-2">{upgradePrompt.title}</h3>
          <p className="text-sm mb-4 opacity-90">{upgradePrompt.message}</p>

          {upgradePrompt.benefits.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium mb-2">Premium benefits:</p>
              <ul className="text-sm space-y-1 opacity-90">
                {upgradePrompt.benefits.map((benefit, index) => (
                  <li key={index} className="flex items-center">
                    <span className="w-1.5 h-1.5 bg-current rounded-full mr-2"></span>
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={handleUpgradeClick}
              className={`px-6 py-2 rounded-full font-medium transition-colors ${buttonStyles}`}
            >
              {upgradePrompt.ctaText}
            </button>

            {paywallInfo.remainingSearches != null && paywallInfo.remainingSearches > 0 && (
              <span className="text-sm opacity-75">{paywallInfo.remainingSearches} searches left today</span>
            )}
          </div>
        </div>

        {upgradePrompt.dismissible && (
          <button
            onClick={handleDismiss}
            className="ml-4 p-1 hover:bg-accent rounded-full transition-colors"
            aria-label="Dismiss"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default PaywallBanner;
