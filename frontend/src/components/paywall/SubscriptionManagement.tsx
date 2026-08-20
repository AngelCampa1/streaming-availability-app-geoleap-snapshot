'use client';

import React, { useState, useEffect } from 'react';
import { SubscriptionTier, UserSubscription } from '@/lib/types/paywall';
import {
  getUserSubscription,
  createBillingPortalSession,
  logPaywallInteraction,
  getCurrentSubscription,
  getSubscriptionHistory,
  cancelUserSubscription,
  reactivateSubscription,
  SubscriptionDto,
} from '@/lib/api';

interface SubscriptionManagementProps {
  className?: string;
  onUpgradeClick?: (tier: SubscriptionTier) => void;
  onDowngradeComplete?: () => void;
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
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
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

export const SubscriptionManagement: React.FC<SubscriptionManagementProps> = ({
  className = '',
  onUpgradeClick,
  onDowngradeComplete,
}) => {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<SubscriptionDto | null>(null);
  const [subscriptionHistory, setSubscriptionHistory] = useState<SubscriptionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const [userSub, currentSub] = await Promise.all([getUserSubscription(), getCurrentSubscription()]);
      setSubscription(userSub);
      setCurrentSubscription(currentSub);
    } catch (err) {
      console.error('Failed to fetch subscription:', err);
      setError('Failed to load subscription information');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const history = await getSubscriptionHistory();
      setSubscriptionHistory(history);
    } catch (err) {
      console.error('Failed to fetch subscription history:', err);
      setError('Failed to load subscription history');
    }
  };

  const handleBillingPortal = async () => {
    setActionLoading('billing-portal');
    try {
      const returnUrl = window.location.href;
      const { portalUrl } = await createBillingPortalSession(returnUrl);

      await logPaywallInteraction('upgrade_clicked', {
        paywallPosition: 'subscription-management',
      });

      window.location.href = portalUrl;
    } catch (err) {
      console.error('Failed to open billing portal:', err);
      setError('Failed to open billing portal. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelSubscription = async () => {
    setActionLoading('cancel');
    try {
      if (currentSubscription?.id) {
        await cancelUserSubscription(currentSubscription.id);

        await logPaywallInteraction('dismissed', {
          paywallPosition: 'subscription-management',
        });

        setSuccess("Your subscription has been cancelled. You'll retain access until the end of your billing period.");
        setShowCancelConfirm(false);

        // Refresh subscription data
        await fetchSubscription();

        if (onDowngradeComplete) {
          onDowngradeComplete();
        }
      }
    } catch (err) {
      console.error('Failed to cancel subscription:', err);
      setError('Failed to cancel subscription. Please contact support.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReactivateSubscription = async () => {
    setActionLoading('reactivate');
    try {
      if (currentSubscription?.id) {
        await reactivateSubscription(currentSubscription.id);
        setSuccess('Your subscription has been reactivated!');
        await fetchSubscription();
      }
    } catch (err) {
      console.error('Failed to reactivate subscription:', err);
      setError('Failed to reactivate subscription. Please contact support.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpgrade = (targetTier: SubscriptionTier) => {
    if (onUpgradeClick) {
      onUpgradeClick(targetTier);
    }
  };

  const dismissMessage = () => {
    setError(null);
    setSuccess(null);
  };

  if (loading) {
    return (
      <div className={`bg-card rounded-lg shadow-sm p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-12 h-12 bg-muted-foreground/20 rounded-full"></div>
            <div className="flex-1">
              <div className="h-4 bg-muted-foreground/20 rounded w-1/4 mb-2"></div>
              <div className="h-3 bg-muted-foreground/20 rounded w-1/3"></div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="h-3 bg-muted-foreground/20 rounded"></div>
            <div className="h-3 bg-muted-foreground/20 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !subscription) {
    return (
      <div className={`bg-destructive/10 border border-destructive/20 rounded-lg p-6 ${className}`}>
        <div className="flex items-center">
          <span className="text-destructive mr-2">⚠️</span>
          <span className="text-destructive">{error}</span>
        </div>
        <button
          onClick={fetchSubscription}
          className="mt-4 bg-destructive hover:bg-destructive/90 text-destructive-foreground px-4 py-2 rounded-full text-sm"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!subscription) return null;

  const daysUntilExpiry = getDaysUntilExpiry(subscription.endDate);
  const isExpiringSoon = daysUntilExpiry >= 0 && daysUntilExpiry <= 7;
  const isExpired = daysUntilExpiry < 0 && subscription.endDate;
  const canUpgrade = subscription.tier < SubscriptionTier.Premium;
  const canManageBilling = subscription.tier !== SubscriptionTier.Free;
  const canReactivate = currentSubscription?.isCanceled && !isExpired;

  return (
    <div className={`bg-card rounded-lg shadow-sm border border-border ${className}`}>
      {/* Messages */}
      {(error || success) && (
        <div
          className={`p-4 border-b ${
            error ? 'bg-destructive/10 border-destructive/20' : 'bg-success/10 border-success/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="mr-2">{error ? '⚠️' : '✅'}</span>
              <span
                className={`text-sm ${error ? 'text-destructive' : 'text-success'}`}
              >
                {error || success}
              </span>
            </div>
            <button
              onClick={dismissMessage}
              className={`p-1 hover:bg-accent rounded ${
                error ? 'text-destructive' : 'text-success'
              }`}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Current Plan Header */}
      <div className={`bg-gradient-to-r ${getTierColor(subscription.tier)} p-6`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-3xl mr-4">{getTierIcon(subscription.tier)}</span>
            <div>
              <h2 className="text-xl font-bold">{getTierName(subscription.tier)} Plan</h2>
              <p className="text-sm opacity-80">
                {subscription.isActive ? 'Active' : 'Inactive'} • Member since {formatDate(subscription.startDate)}
              </p>
            </div>
          </div>

          {subscription.tier === SubscriptionTier.Premium && (
            <span className="bg-background/20 px-3 py-1 rounded-full text-sm font-medium">All Features Unlocked</span>
          )}
        </div>
      </div>

      {/* Subscription Details */}
      <div className="p-6 space-y-6">
        {/* Billing Information */}
        {subscription.endDate && (
          <div
            className={`p-4 rounded-lg border ${
              isExpired
                ? 'bg-destructive/10 border-destructive/20'
                : isExpiringSoon
                  ? 'bg-warning/10 border-warning/20'
                  : 'bg-primary/10 border-primary/20'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3
                  className={`font-medium ${
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
                </h3>
                <p
                  className={`text-sm ${
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

              {subscription.autoRenew && !isExpired && (
                <span className="bg-success/10 text-success px-2 py-1 rounded-full text-xs font-medium border border-success/20">
                  Auto-Renew On
                </span>
              )}
            </div>
          </div>
        )}

        {/* Plan Benefits */}
        <div>
          <h3 className="font-semibold text-foreground mb-3">Your Plan Benefits</h3>
          <div className="grid md:grid-cols-2 gap-3">
            {subscription.tier === SubscriptionTier.Free && (
              <>
                <div className="flex items-center text-sm">
                  <span className="w-2 h-2 bg-muted-foreground rounded-full mr-3"></span>
                  <span className="text-muted-foreground">5 search results per query</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="w-2 h-2 bg-muted-foreground rounded-full mr-3"></span>
                  <span className="text-muted-foreground">20 searches per day</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="w-2 h-2 bg-muted-foreground rounded-full mr-3"></span>
                  <span className="text-muted-foreground">Basic content information</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="w-2 h-2 bg-muted-foreground rounded-full mr-3"></span>
                  <span className="text-muted-foreground">Community support</span>
                </div>
              </>
            )}

            {subscription.tier === SubscriptionTier.Basic && (
              <>
                <div className="flex items-center text-sm">
                  <span className="w-2 h-2 bg-primary rounded-full mr-3"></span>
                  <span className="text-foreground">50 search results per query</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="w-2 h-2 bg-primary rounded-full mr-3"></span>
                  <span className="text-foreground">200 searches per day</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="w-2 h-2 bg-primary rounded-full mr-3"></span>
                  <span className="text-foreground">Full content details</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="w-2 h-2 bg-primary rounded-full mr-3"></span>
                  <span className="text-foreground">Email support</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="w-2 h-2 bg-primary rounded-full mr-3"></span>
                  <span className="text-foreground">Search history (30 days)</span>
                </div>
              </>
            )}

            {subscription.tier === SubscriptionTier.Premium && (
              <>
                <div className="flex items-center text-sm">
                  <span className="w-2 h-2 bg-warning rounded-full mr-3"></span>
                  <span className="text-foreground">Unlimited searches & results</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="w-2 h-2 bg-warning rounded-full mr-3"></span>
                  <span className="text-foreground">Direct streaming links</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="w-2 h-2 bg-warning rounded-full mr-3"></span>
                  <span className="text-foreground">Advanced filtering</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="w-2 h-2 bg-warning rounded-full mr-3"></span>
                  <span className="text-foreground">Priority support</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="w-2 h-2 bg-warning rounded-full mr-3"></span>
                  <span className="text-foreground">Export results</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="w-2 h-2 bg-warning rounded-full mr-3"></span>
                  <span className="text-foreground">Ad-free experience</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="pt-6 border-t border-border">
          <div className="flex flex-wrap gap-3">
            {/* Upgrade Actions */}
            {canUpgrade && (
              <>
                {subscription.tier === SubscriptionTier.Free && (
                  <>
                    <button
                      onClick={() => handleUpgrade(SubscriptionTier.Basic)}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-full font-medium transition-colors"
                    >
                      Upgrade to Basic
                    </button>
                    <button
                      onClick={() => handleUpgrade(SubscriptionTier.Premium)}
                      className="bg-gradient-to-r from-warning to-warning/80 hover:from-warning/90 hover:to-warning/70 text-white px-6 py-2 rounded-full font-medium transition-colors"
                    >
                      Upgrade to Premium
                    </button>
                  </>
                )}

                {subscription.tier === SubscriptionTier.Basic && (
                  <button
                    onClick={() => handleUpgrade(SubscriptionTier.Premium)}
                    className="bg-gradient-to-r from-warning to-warning/80 hover:from-warning/90 hover:to-warning/70 text-white px-6 py-2 rounded-full font-medium transition-colors"
                  >
                    Upgrade to Premium
                  </button>
                )}
              </>
            )}

            {/* Billing Management */}
            {canManageBilling && (
              <button
                onClick={handleBillingPortal}
                disabled={actionLoading === 'billing-portal'}
                className="bg-secondary hover:bg-secondary/90 text-secondary-foreground px-6 py-2 rounded-full font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading === 'billing-portal' ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24">
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
                    Loading...
                  </span>
                ) : (
                  'Manage Billing'
                )}
              </button>
            )}

            {/* Reactivate Subscription */}
            {canReactivate && (
              <button
                onClick={handleReactivateSubscription}
                disabled={actionLoading === 'reactivate'}
                className="bg-success hover:bg-success/90 text-white px-6 py-2 rounded-full font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading === 'reactivate' ? (
                  <span className="flex items-center">
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
                    Reactivating...
                  </span>
                ) : (
                  'Reactivate Plan'
                )}
              </button>
            )}

            {/* Cancel Subscription */}
            {canManageBilling && subscription.isActive && !currentSubscription?.isCanceled && (
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="bg-destructive/10 hover:bg-destructive/20 text-destructive px-6 py-2 rounded-full font-medium transition-colors border border-destructive/20"
              >
                Cancel Plan
              </button>
            )}

            {/* View History */}
            <button
              onClick={() => {
                setShowHistory(!showHistory);
                if (!showHistory && subscriptionHistory.length === 0) {
                  fetchHistory();
                }
              }}
              className="bg-secondary hover:bg-secondary/90 text-secondary-foreground px-6 py-2 rounded-full font-medium transition-colors"
            >
              {showHistory ? 'Hide History' : 'View History'}
            </button>
          </div>
        </div>

        {/* Subscription History */}
        {showHistory && (
          <div className="mt-6 pt-6 border-t border-border">
            <h3 className="font-semibold text-foreground mb-4">Subscription History</h3>
            {subscriptionHistory.length > 0 ? (
              <div className="space-y-3">
                {subscriptionHistory.map(sub => (
                  <div key={sub.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <div className="font-medium text-foreground">{sub.planType} Plan</div>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(sub.currentPeriodStart)} - {formatDate(sub.currentPeriodEnd)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-foreground">
                        ${sub.amount}/{sub.interval}
                      </div>
                      <div
                        className={`text-sm ${
                          sub.status === 'active'
                            ? 'text-success'
                            : sub.status === 'canceled'
                              ? 'text-destructive'
                              : 'text-muted-foreground'
                        }`}
                      >
                        {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No subscription history available.</p>
            )}
          </div>
        )}
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl shadow-2xl max-w-md w-full p-6 border border-border">
            <div className="text-center">
              <div className="text-4xl mb-4">😢</div>
              <h3 className="text-xl font-bold text-foreground mb-2">Cancel Your Subscription?</h3>
              <p className="text-muted-foreground mb-6">
                You&rsquo;ll lose access to premium features at the end of your billing period. Your account will be
                downgraded to the free plan.
              </p>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="flex-1 bg-secondary hover:bg-secondary/90 text-secondary-foreground py-3 px-4 rounded-lg font-medium transition-colors"
                >
                  Keep Plan
                </button>
                <button
                  onClick={handleCancelSubscription}
                  disabled={actionLoading === 'cancel'}
                  className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading === 'cancel' ? (
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
                      Cancelling...
                    </span>
                  ) : (
                    'Yes, Cancel'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionManagement;
