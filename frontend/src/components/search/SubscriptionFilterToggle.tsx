'use client';

import React from 'react';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { Switch } from '@/components/ui/switch';

interface SubscriptionFilterToggleProps {
  onlyUserServices: boolean;
  onToggle: (value: boolean) => void;
  className?: string;
}

export function SubscriptionFilterToggle({
  onlyUserServices,
  onToggle,
  className = '',
}: SubscriptionFilterToggleProps) {
  const { subscriptions, loading } = useSubscriptions();

  const subscriptionCount = subscriptions?.length || 0;
  const hasSetupSubscriptions = subscriptionCount > 0;

  if (loading || !hasSetupSubscriptions) {
    return null;
  }

  return (
    <div className={`flex items-center gap-3 ${className}`} data-testid="subscription-filter-toggle">
      <label className="flex items-center cursor-pointer gap-3">
        <Switch
          checked={onlyUserServices}
          onCheckedChange={onToggle}
          aria-label="Filter to my services only"
        />
        <span className="text-sm font-medium text-foreground">
          My Services Only
        </span>
      </label>
      <span className="text-xs text-muted-foreground">
        ({subscriptionCount} service{subscriptionCount !== 1 ? 's' : ''})
      </span>
    </div>
  );
}

export default SubscriptionFilterToggle;
