'use client';

import React, { useState } from 'react';
import { Alert } from '../ui/alert';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Clock, CreditCard, X, AlertTriangle, ArrowRight } from 'lucide-react';
import { usePaymentRecovery } from '../../hooks/usePaymentRecovery';
import { useRouter } from 'next/navigation';

interface GracePeriodNotificationProps {
  className?: string;
  showOnlyIfActive?: boolean;
  dismissible?: boolean;
  compact?: boolean;
}

export const GracePeriodNotification: React.FC<GracePeriodNotificationProps> = ({
  className = '',
  showOnlyIfActive = true,
  dismissible = true,
  compact = false,
}) => {
  const router = useRouter();
  const { inGracePeriod, gracePeriod, restrictedFeatures, getGracePeriodDaysRemaining } = usePaymentRecovery();

  const [dismissed, setDismissed] = useState(false);

  if (!inGracePeriod || !gracePeriod || dismissed) {
    return null;
  }

  if (showOnlyIfActive && gracePeriod.status !== 'active') {
    return null;
  }

  const daysRemaining = getGracePeriodDaysRemaining();
  const isUrgent = daysRemaining <= 3;
  const isCritical = daysRemaining <= 1;

  const getBorderColor = () => {
    if (isCritical) return 'border-destructive';
    if (isUrgent) return 'border-warning';
    return 'border-warning/60';
  };

  const getBackgroundColor = () => {
    if (isCritical) return 'bg-destructive/5';
    if (isUrgent) return 'bg-warning/5';
    return 'bg-warning/3';
  };

  const getTextColor = () => {
    if (isCritical) return 'text-destructive';
    if (isUrgent) return 'text-warning';
    return 'text-warning/80';
  };

  const getIconColor = () => {
    if (isCritical) return 'text-destructive';
    if (isUrgent) return 'text-warning';
    return 'text-warning/80';
  };

  const handleFixPayment = () => {
    router.push('/payment');
  };

  const handleViewDetails = () => {
    router.push('/dashboard?tab=payment-recovery');
  };

  if (compact) {
    return (
      <Alert className={`${getBorderColor()} ${getBackgroundColor()} ${className}`}>
        <Clock className={`w-4 h-4 ${getIconColor()}`} />
        <div className="flex items-center justify-between w-full">
          <div className={`flex items-center space-x-2 ${getTextColor()}`}>
            <span className="font-medium">
              Payment issue - {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Button size="sm" onClick={handleFixPayment} className="bg-primary hover:bg-primary-hover">
              Fix Now
            </Button>
            {dismissible && (
              <Button variant="ghost" size="sm" onClick={() => setDismissed(true)}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </Alert>
    );
  }

  return (
    <Alert className={`${getBorderColor()} ${getBackgroundColor()} ${className}`}>
      <AlertTriangle className={`w-5 h-5 ${getIconColor()}`} />
      <div className="flex-1">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <h3 className={`font-semibold ${getTextColor()}`}>Payment Issue Requires Attention</h3>
            <Badge
              className={
                isCritical
                  ? 'bg-destructive/10 text-destructive'
                  : isUrgent
                    ? 'bg-warning/10 text-warning'
                    : 'bg-warning/10 text-warning'
              }
            >
              {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining
            </Badge>
          </div>

          {dismissible && (
            <Button variant="ghost" size="sm" onClick={() => setDismissed(true)} className="shrink-0">
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        <div className="space-y-3">
          <p className={`text-sm ${getTextColor()}`}>
            We&apos;re having trouble processing your subscription payment. Your access will be restricted after{' '}
            <span className="font-medium">
              {new Date(gracePeriod.endDate).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
            .
          </p>

          {restrictedFeatures.length > 0 && (
            <div className={`text-xs ${getTextColor()}`}>
              <span>Currently restricted: </span>
              {restrictedFeatures.slice(0, 3).map((feature, index) => (
                <span key={index}>
                  {feature}
                  {index < Math.min(restrictedFeatures.length, 3) - 1 ? ', ' : ''}
                </span>
              ))}
              {restrictedFeatures.length > 3 && <span> and {restrictedFeatures.length - 3} more</span>}
            </div>
          )}

          <div className="flex items-center space-x-3">
            <Button size="sm" onClick={handleFixPayment} className="bg-primary hover:bg-primary-hover">
              <CreditCard className="w-4 h-4 mr-2" />
              Update Payment Method
            </Button>

            <Button variant="outline" size="sm" onClick={handleViewDetails}>
              View Details
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </Alert>
  );
};

// Hook to integrate grace period notification in app header
export function useGracePeriodAlert() {
  const { inGracePeriod, getGracePeriodDaysRemaining } = usePaymentRecovery();

  return {
    shouldShowAlert: inGracePeriod,
    daysRemaining: getGracePeriodDaysRemaining(),
    isUrgent: getGracePeriodDaysRemaining() <= 3,
    isCritical: getGracePeriodDaysRemaining() <= 1,
  };
}
