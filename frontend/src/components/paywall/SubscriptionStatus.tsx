'use client';

import React, { useState, useEffect } from 'react';
import { SubscriptionTier, UserSubscription } from '@/lib/types/paywall';
import { getUserSubscription, logPaywallInteraction } from '@/lib/api';

interface SubscriptionStatusProps {
  className?: string;
  showDetails?: boolean;
  onUpgradeClick?: () => void;
  onManageClick?: () => void;
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

const getTierIcon = (tier: SubscriptionTier): string => {
  switch (tier) {
    case SubscriptionTier.Free:
      return '🆓';
    case SubscriptionTier.Basic:
      return '⭐';
    case SubscriptionTier.Premium:
      return '👑';
    case SubscriptionTier.Admin:
      return '🔧';
    default:
      return '🆓';
  }
};

const getTierColor = (tier: SubscriptionTier): string => {
  switch (tier) {
    case SubscriptionTier.Free:
      return 'from-muted to-muted text-foreground';
    case SubscriptionTier.Basic:
      return 'from-primary/10 to-primary/20 text-primary';
    case SubscriptionTier.Premium:
      return 'from-warning/10 to-warning/20 text-warning';
    case SubscriptionTier.Admin:
      return 'from-accent/10 to-accent/20 text-accent-foreground';
    default:
      return 'from-muted to-muted text-foreground';
  }
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const getDaysUntilExpiry = (endDate?: string): number => {
  if (!endDate) return -1;
  const end = new Date(endDate);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 3600 * 24));
};

export const SubscriptionStatus: React.FC<SubscriptionStatusProps> = ({
  className = '',
  showDetails = true,
  onUpgradeClick,
  onManageClick,
}) => {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const data = await getUserSubscription();
        setSubscription(data);
      } catch (err) {
        console.error('Failed to fetch subscription:', err);
        setError('Failed to load subscription information');
        // Fallback to free tier
        setSubscription({
          id: '',
          userId: '',
          tier: SubscriptionTier.Free,
          isActive: true,
          startDate: new Date().toISOString(),
          autoRenew: false,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, []);

  const handleUpgradeClick = async () => {
    await logPaywallInteraction('upgrade_clicked', {
      paywallPosition: 'subscription-status',
    });
    if (onUpgradeClick) {
      onUpgradeClick();
    }
  };

  const handleManageClick = () => {
    if (onManageClick) {
      onManageClick();
    } else {
      // Default to billing portal or account page
      window.location.href = '/account/billing';
    }
  };

  if (loading) {
    return (
      <div className={`bg-muted rounded-lg p-4 ${className}`}>
        <div className="animate-pulse flex space-x-4">
          <div className="rounded-full bg-muted-foreground/20 h-10 w-10"></div>
          <div className="flex-1 space-y-2 py-1">
            <div className="h-4 bg-muted-foreground/20 rounded w-3/4"></div>
            <div className="h-3 bg-muted-foreground/20 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !subscription) {
    return (
      <div className={`bg-destructive/10 border border-destructive/20 rounded-lg p-4 ${className}`}>
        <div className="flex items-center">
          <span className="text-destructive mr-2">⚠️</span>
          <span className="text-destructive text-sm">{error || 'Unable to load subscription'}</span>
        </div>
      </div>
    );
  }

  const daysUntilExpiry = getDaysUntilExpiry(subscription.endDate);
  const isExpiringSoon = daysUntilExpiry >= 0 && daysUntilExpiry <= 7;
  const isExpired = daysUntilExpiry < 0 && subscription.endDate;

  if (!showDetails) {
    // Compact version
    return (
      <div
        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r ${getTierColor(subscription.tier)} ${className}`}
      >
        <span className="mr-1">{getTierIcon(subscription.tier)}</span>
        {getTierName(subscription.tier)}
      </div>
    );
  }

  return (
    <div className={`bg-card rounded-lg shadow-sm border border-border ${className}`}>
      {/* Header */}
      <div className={`bg-gradient-to-r ${getTierColor(subscription.tier)} rounded-t-lg p-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-2xl mr-3">{getTierIcon(subscription.tier)}</span>
            <div>
              <h3 className="font-semibold text-lg">{getTierName(subscription.tier)} Plan</h3>
              <p className="text-sm opacity-80">
                {subscription.isActive ? 'Active' : 'Inactive'} • Started {formatDate(subscription.startDate)}
              </p>
            </div>
          </div>

          {subscription.tier !== SubscriptionTier.Premium && (
            <button
              onClick={handleUpgradeClick}
              className="bg-background/20 hover:bg-background/30 text-current px-3 py-2 rounded-full font-medium text-sm transition-colors"
            >
              Upgrade
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Renewal Info */}
        {subscription.endDate && (
          <div
            className={`p-3 rounded-lg ${
              isExpired
                ? 'bg-destructive/10 border border-destructive/20'
                : isExpiringSoon
                  ? 'bg-warning/10 border border-warning/20'
                  : 'bg-primary/10 border border-primary/20'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="mr-2">{isExpired ? '⚠️' : isExpiringSoon ? '⏰' : '📅'}</span>
                <div>
                  <p
                    className={`font-medium text-sm ${
                      isExpired
                        ? 'text-destructive'
                        : isExpiringSoon
                          ? 'text-warning'
                          : 'text-primary'
                    }`}
                  >
                    {isExpired
                      ? 'Subscription Expired'
                      : isExpiringSoon
                        ? `Expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'}`
                        : 'Next Billing Date'}
                  </p>
                  <p
                    className={`text-xs ${
                      isExpired
                        ? 'text-destructive/80'
                        : isExpiringSoon
                          ? 'text-warning/80'
                          : 'text-primary/80'
                    }`}
                  >
                    {formatDate(subscription.endDate)}
                  </p>
                </div>
              </div>

              {(isExpired || isExpiringSoon) && (
                <button
                  onClick={handleUpgradeClick}
                  className={`px-3 py-1 rounded-md text-xs font-medium ${
                    isExpired
                      ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'
                      : 'bg-warning hover:bg-warning/90 text-white'
                  }`}
                >
                  {isExpired ? 'Reactivate' : 'Renew Now'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Current Benefits */}
        <div>
          <h4 className="font-medium text-foreground mb-2">Current Benefits:</h4>
          <div className="space-y-1 text-sm text-muted-foreground">
            {subscription.tier === SubscriptionTier.Free && (
              <>
                <div className="flex items-center">
                  <span className="w-2 h-2 bg-success rounded-full mr-2"></span>5 search results per query
                </div>
                <div className="flex items-center">
                  <span className="w-2 h-2 bg-success rounded-full mr-2"></span>
                  20 searches per day
                </div>
                <div className="flex items-center">
                  <span className="w-2 h-2 bg-success rounded-full mr-2"></span>
                  Basic content information
                </div>
              </>
            )}

            {subscription.tier === SubscriptionTier.Basic && (
              <>
                <div className="flex items-center">
                  <span className="w-2 h-2 bg-primary rounded-full mr-2"></span>
                  50 search results per query
                </div>
                <div className="flex items-center">
                  <span className="w-2 h-2 bg-primary rounded-full mr-2"></span>
                  200 searches per day
                </div>
                <div className="flex items-center">
                  <span className="w-2 h-2 bg-primary rounded-full mr-2"></span>
                  Full content details
                </div>
                <div className="flex items-center">
                  <span className="w-2 h-2 bg-primary rounded-full mr-2"></span>
                  Email support
                </div>
              </>
            )}

            {subscription.tier === SubscriptionTier.Premium && (
              <>
                <div className="flex items-center">
                  <span className="w-2 h-2 bg-warning rounded-full mr-2"></span>
                  Unlimited searches and results
                </div>
                <div className="flex items-center">
                  <span className="w-2 h-2 bg-warning rounded-full mr-2"></span>
                  Direct streaming links
                </div>
                <div className="flex items-center">
                  <span className="w-2 h-2 bg-warning rounded-full mr-2"></span>
                  Advanced filtering
                </div>
                <div className="flex items-center">
                  <span className="w-2 h-2 bg-warning rounded-full mr-2"></span>
                  Priority support
                </div>
                <div className="flex items-center">
                  <span className="w-2 h-2 bg-warning rounded-full mr-2"></span>
                  Ad-free experience
                </div>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-3 pt-2 border-t border-border">
          {subscription.tier !== SubscriptionTier.Premium && (
            <button
              onClick={handleUpgradeClick}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground py-2 px-4 rounded-full font-medium transition-colors text-sm"
            >
              Upgrade Plan
            </button>
          )}

          {subscription.tier !== SubscriptionTier.Free && (
            <button
              onClick={handleManageClick}
              className="flex-1 bg-secondary hover:bg-secondary/90 text-secondary-foreground py-2 px-4 rounded-full font-medium transition-colors text-sm"
            >
              Manage Billing
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubscriptionStatus;
