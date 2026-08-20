'use client';

import React from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { CreditCard, AlertTriangle, RefreshCw, Clock, ArrowRight, XCircle, Loader2 } from 'lucide-react';
import { usePaymentRecovery } from '../../hooks/usePaymentRecovery';
import { useRouter } from 'next/navigation';
import { FailedPayment } from '../../lib/types/payment';

interface PaymentRecoveryWidgetProps {
  className?: string;
  maxItems?: number;
  showAnalytics?: boolean;
}

export const PaymentRecoveryWidget: React.FC<PaymentRecoveryWidgetProps> = ({
  className = '',
  maxItems = 3,
  showAnalytics: _showAnalytics = false,
}) => {
  const router = useRouter();
  const {
    failedPayments,
    inGracePeriod,
    gracePeriod,
    isLoading,
    isRetrying,
    error,
    retryPayment,
    hasActiveFailedPayments,
    getNextRetryPayment,
    getGracePeriodDaysRemaining,
  } = usePaymentRecovery();

  const activeFailedPayments = failedPayments.filter(fp => fp.recoveryStatus === 'active');
  const nextRetryPayment = getNextRetryPayment();

  const handleQuickRetry = async (failedPayment: FailedPayment) => {
    try {
      await retryPayment(failedPayment.id, { reason: 'Quick retry from dashboard widget' });
    } catch (error) {
      console.error('Quick retry failed:', error);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  // Don't show widget if no failed payments and not in grace period
  if (!hasActiveFailedPayments() && !inGracePeriod && !isLoading) {
    return null;
  }

  if (isLoading) {
    return (
      <Card className={`${className}`}>
        <div className="p-4 flex items-center justify-center">
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          <span className="text-sm text-muted-foreground">Checking payment status...</span>
        </div>
      </Card>
    );
  }

  return (
    <Card
      className={`border-l-4 ${inGracePeriod ? 'border-l-orange-500' : hasActiveFailedPayments() ? 'border-l-red-500' : 'border-l-green-500'} ${className}`}
    >
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CreditCard
              className={`w-5 h-5 ${inGracePeriod ? 'text-warning' : hasActiveFailedPayments() ? 'text-destructive' : 'text-success'}`}
            />
            <h3 className="font-semibold text-foreground">
              {inGracePeriod ? 'Payment Recovery' : hasActiveFailedPayments() ? 'Payment Issues' : 'Payment Status'}
            </h3>
          </div>

          <Button variant="ghost" size="sm" onClick={() => router.push('/payment/recovery')}>
            View All
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        {/* Grace Period Status */}
        {inGracePeriod && gracePeriod && (
          <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-warning" />
                <span className="font-medium text-warning">Grace Period Active</span>
              </div>
              <Badge className="bg-warning/10 text-warning">{getGracePeriodDaysRemaining()} days left</Badge>
            </div>
            <p className="text-sm text-warning">Your subscription remains active while we resolve payment issues.</p>
          </div>
        )}

        {/* Active Failed Payments */}
        {activeFailedPayments.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-foreground">Active Payment Issues</h4>

            {activeFailedPayments.slice(0, maxItems).map(failedPayment => (
              <FailedPaymentItem
                key={failedPayment.id}
                failedPayment={failedPayment}
                isRetrying={isRetrying}
                onQuickRetry={() => handleQuickRetry(failedPayment)}
                onViewDetails={() => router.push(`/payment/recovery?payment=${failedPayment.id}`)}
              />
            ))}

            {activeFailedPayments.length > maxItems && (
              <div className="text-center">
                <Button variant="outline" size="sm" onClick={() => router.push('/payment/recovery')}>
                  View {activeFailedPayments.length - maxItems} more payment issue
                  {activeFailedPayments.length - maxItems !== 1 ? 's' : ''}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Next Scheduled Retry */}
        {nextRetryPayment && (
          <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
            <div className="flex items-center space-x-2 mb-1">
              <RefreshCw className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Next Automatic Retry</span>
            </div>
            <p className="text-xs text-primary">
              {formatCurrency(
                nextRetryPayment.paymentTransaction?.amount || 0,
                nextRetryPayment.paymentTransaction?.currency || 'USD'
              )}{' '}
              scheduled for {new Date(nextRetryPayment.nextRetryAt!).toLocaleDateString()}
            </p>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex space-x-2">
          <Button size="sm" onClick={() => router.push('/payment')} className="flex-1 bg-primary hover:bg-primary/90">
            <CreditCard className="w-4 h-4 mr-2" />
            Update Payment
          </Button>

          {hasActiveFailedPayments() && (
            <Button variant="outline" size="sm" onClick={() => router.push('/payment/recovery')} className="flex-1">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Resolve Issues
            </Button>
          )}
        </div>

        {/* Error Display */}
        {error && <div className="text-xs text-error bg-error/10 p-2 rounded">{error}</div>}
      </div>
    </Card>
  );
};

// Failed Payment Item Component
interface FailedPaymentItemProps {
  failedPayment: FailedPayment;
  isRetrying: boolean;
  onQuickRetry: () => void;
  onViewDetails: () => void;
}

const FailedPaymentItem: React.FC<FailedPaymentItemProps> = ({
  failedPayment,
  isRetrying,
  onQuickRetry,
  onViewDetails,
}) => {
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  const getFailureIcon = (failureType: string) => {
    switch (failureType) {
      case 'insufficient_funds':
        return <AlertTriangle className="w-4 h-4 text-warning" />;
      case 'expired_card':
        return <Clock className="w-4 h-4 text-warning" />;
      case 'card_declined':
        return <XCircle className="w-4 h-4 text-error" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="p-3 border border-border rounded-lg hover:bg-muted transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-start space-x-2 flex-1">
          {getFailureIcon(failedPayment.failureType)}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-sm font-medium text-foreground">
                {formatCurrency(
                  failedPayment.paymentTransaction?.amount || 0,
                  failedPayment.paymentTransaction?.currency || 'USD'
                )}
              </span>
              <Badge variant="outline" className="text-xs">
                {failedPayment.failureType.replace('_', ' ')}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground truncate">{failedPayment.failureMessage}</p>
            <div className="text-xs text-muted-foreground mt-1">
              {failedPayment.retryCount} attempt{failedPayment.retryCount !== 1 ? 's' : ''} • Failed{' '}
              {new Date(failedPayment.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 ml-2">
          {failedPayment.isRetriable && (
            <Button
              size="sm"
              variant="outline"
              onClick={onQuickRetry}
              disabled={isRetrying}
              className="text-xs px-2 py-1"
            >
              {isRetrying ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            </Button>
          )}

          <Button size="sm" variant="ghost" onClick={onViewDetails} className="text-xs px-2 py-1">
            Details
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PaymentRecoveryWidget;
