'use client';

import React from 'react';
import { POPULAR_SERVICES } from '@/types/streaming';
import { useUserSubscriptions } from '@/hooks/useUserSubscriptions';
import { StreamingServiceLogo } from '@/components/common/StreamingServiceLogo';

interface QuickSubscriptionSetupProps {
  onComplete?: () => void;
  className?: string;
  compact?: boolean;
}

/**
 * A compact component for quickly setting up streaming subscriptions
 * Can be embedded inline in modals or displayed as a standalone card
 */
export function QuickSubscriptionSetup({
  onComplete,
  className = '',
  compact = false,
}: QuickSubscriptionSetupProps) {
  const { subscriptions: _subscriptions, toggleSubscription, hasSubscription, subscriptionCount } = useUserSubscriptions();

  const handleServiceToggle = (serviceId: string, serviceName: string) => {
    toggleSubscription(serviceId, serviceName);
  };

  const handleDone = () => {
    onComplete?.();
  };

  return (
    <div className={`${className}`}>
      <div className={compact ? 'space-y-3' : 'space-y-4'}>
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
            <svg
              className="w-5 h-5 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </div>
          <div>
            <h3 className={`font-semibold text-foreground ${compact ? 'text-sm' : 'text-base'}`}>
              What streaming services do you have?
            </h3>
            <p className={`text-muted-foreground ${compact ? 'text-xs' : 'text-sm'} mt-0.5`}>
              Select your subscriptions to see which countries have your shows
            </p>
          </div>
        </div>

        {/* Service Grid */}
        <div className={`grid ${compact ? 'grid-cols-3 gap-2' : 'grid-cols-2 sm:grid-cols-3 gap-3'}`}>
          {POPULAR_SERVICES.map(service => {
            const isSelected = hasSubscription(service.id);
            return (
              <button
                key={service.id}
                type="button"
                onClick={() => handleServiceToggle(service.id, service.name)}
                className={`
                  flex items-center gap-2 p-2 rounded-full border-2 transition-all
                  ${compact ? 'text-xs' : 'text-sm'}
                  ${
                    isSelected
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background hover:border-primary/50 text-foreground'
                  }
                `}
              >
                <StreamingServiceLogo
                  serviceId={service.id}
                  size={compact ? 'sm' : 'md'}
                  fallbackToIcon={true}
                />
                <span className="font-medium truncate">{service.name}</span>
                {isSelected && (
                  <svg
                    className="w-4 h-4 ml-auto text-primary flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        {subscriptionCount > 0 && (
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <p className={`text-muted-foreground ${compact ? 'text-xs' : 'text-sm'}`}>
              {subscriptionCount} service{subscriptionCount !== 1 ? 's' : ''} selected
            </p>
            {onComplete && (
              <button
                type="button"
                onClick={handleDone}
                className={`
                  bg-primary text-primary-foreground rounded-full font-medium
                  hover:bg-primary/90 transition-colors
                  ${compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'}
                `}
              >
                Show Results
              </button>
            )}
          </div>
        )}

        {/* Tip for anonymous users */}
        <p className={`text-muted-foreground ${compact ? 'text-xs' : 'text-xs'} italic`}>
          💡 Your selections are saved locally. Sign up to sync across devices.
        </p>
      </div>
    </div>
  );
}

export default QuickSubscriptionSetup;
