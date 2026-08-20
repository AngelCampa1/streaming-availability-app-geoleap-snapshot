'use client';

import React from'react';
import { Alert, AlertDescription } from'@/components/ui/alert';
import { Button } from'@/components/ui/button';
import { cn } from'@/lib/utils';

// Error severity levels
export type ErrorSeverity ='info' |'warning' |'error' |'critical';

// Error categories for different handling approaches
export type ErrorCategory =
  |'network'
  |'authentication'
  |'authorization'
  |'validation'
  |'search'
  |'payment'
  |'system'
  |'rate-limit'
  |'maintenance';

// Error recovery action types
export type ErrorAction = {
  label: string;
  onClick: () => void;
  variant?:'primary' |'secondary' |'destructive';
  disabled?: boolean;
};

export interface ErrorMessageProps {
  title?: string;
  message: string;
  severity?: ErrorSeverity;
  category?: ErrorCategory;
  correlationId?: string;
  isRetryable?: boolean;
  actions?: ErrorAction[];
  showSupport?: boolean;
  onDismiss?: () => void;
  className?: string;
  icon?: React.ReactNode;
  details?: React.ReactNode;
  expandable?: boolean;
}

const severityConfig = {
  info: {
    variant:'default' as const,
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    bgColor:'bg-info/10',
    borderColor:'border-info/20',
    textColor:'text-info',
  },
  warning: {
    variant:'default' as const,
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
        />
      </svg>
    ),
    bgColor:'bg-warning/10',
    borderColor:'border-warning/20',
    textColor:'text-warning',
  },
  error: {
    variant:'destructive' as const,
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    bgColor:'bg-error/10',
    borderColor:'border-error/20',
    textColor:'text-error',
  },
  critical: {
    variant:'destructive' as const,
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728"
        />
      </svg>
    ),
    bgColor:'bg-error/15',
    borderColor:'border-error/25',
    textColor:'text-error',
  },
};

const categoryMessages = {
  network: {
    title:'Connection Problem',
    suggestions: ['Check your internet connection','Try refreshing the page','Wait a moment and try again'],
  },
  authentication: {
    title:'Authentication Required',
    suggestions: ['Please log in to continue','Check your credentials','Reset your password if needed'],
  },
  authorization: {
    title:'Access Denied',
    suggestions: ['You may need to upgrade your subscription','Contact support if you believe this is an error','Check your account permissions',
    ],
  },
  validation: {
    title:'Input Error',
    suggestions: ['Please review your input','Make sure all required fields are filled','Check the format of your data',
    ],
  },
  search: {
    title:'Search Issue',
    suggestions: ['Try different search terms','Check your spelling','Use more general keywords'],
  },
  payment: {
    title:'Payment Problem',
    suggestions: ['Check your payment method','Verify your billing information','Contact your bank if needed'],
  },
  system: {
    title:'System Error',
    suggestions: ['Our team has been notified','Try again in a few minutes','Contact support if the issue persists'],
  },'rate-limit': {
    title:'Too Many Requests',
    suggestions: ['Please wait a moment before trying again','You may have reached your usage limit','Consider upgrading your plan for higher limits',
    ],
  },
  maintenance: {
    title:'Maintenance Mode',
    suggestions: ["We're performing scheduled maintenance",'Service will be restored shortly','Check our status page for updates',
    ],
  },
};

export function ErrorMessage({
  title,
  message,
  severity ='error',
  category,
  correlationId,
  isRetryable = false,
  actions = [],
  showSupport = true,
  onDismiss,
  className,
  icon,
  details,
  expandable = false,
}: ErrorMessageProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const config = severityConfig[severity];
  const categoryConfig = category ? categoryMessages[category] : null;
  const displayTitle = title || categoryConfig?.title ||'Error';

  const defaultActions: ErrorAction[] = [];

  // Add retry action for retryable errors
  if (isRetryable && !actions.some(action => action.label.toLowerCase().includes('retry'))) {
    defaultActions.push({
      label:'Try Again',
      onClick: () => window.location.reload(),
      variant:'primary',
    });
  }

  // Add support action if requested
  if (showSupport && !actions.some(action => action.label.toLowerCase().includes('support'))) {
    defaultActions.push({
      label:'Contact Support',
      onClick: () => {
        // This would open a support modal/chat or email
        const supportUrl = `mailto:hello@example.com?subject=Error Report&body=Error: ${message}${correlationId ? `%0ACorrelation ID: ${correlationId}` :''}`;
        window.open(supportUrl);
      },
      variant:'secondary',
    });
  }

  const allActions = [...actions, ...defaultActions];

  return (
    <Alert
      variant={config.variant}
      className={cn(config.bgColor, config.borderColor,'transition-all duration-200', className)}
    >
      {/* Icon */}
      <div className={cn('flex items-start gap-3', config.textColor)}>
        {icon || config.icon}

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between mb-1">
            <h4 className={cn('font-medium text-sm', config.textColor)}>{displayTitle}</h4>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className={cn('ml-2 p-1 rounded hover:bg-black/5  transition-colors',
                  config.textColor
                )}
                aria-label="Dismiss error"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Message */}
          <AlertDescription className={cn('text-sm mb-3', config.textColor)}>{message}</AlertDescription>

          {/* Category suggestions */}
          {categoryConfig?.suggestions && (
            <div className={cn('text-xs mb-3', config.textColor)}>
              <p className="font-medium mb-1">What you can try:</p>
              <ul className="list-disc list-inside space-y-0.5 opacity-80">
                {categoryConfig.suggestions.map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Expandable details */}
          {expandable && details && (
            <div className="mb-3">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={cn('text-xs underline hover:no-underline transition-all', config.textColor)}
              >
                {isExpanded ?'Hide' :'Show'} Details
              </button>
              {isExpanded && (
                <div className={cn('mt-2 text-xs p-2 rounded bg-black/5', config.textColor)}>
                  {details}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          {allActions.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {allActions.map((action, index) => (
                <Button
                  key={index}
                  size="sm"
                  variant={action.variant ==='primary' ?'default' : action.variant ||'secondary'}
                  onClick={action.onClick}
                  disabled={action.disabled}
                  className="h-7 px-3 text-xs"
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}

          {/* Correlation ID for support */}
          {correlationId && <p className={cn('text-xs font-mono opacity-60', config.textColor)}>ID: {correlationId}</p>}
        </div>
      </div>
    </Alert>
  );
}

// Specialized error components for common scenarios

export function NetworkError({
  message ='Unable to connect to our servers',
  onRetry,
  ...props
}: Partial<ErrorMessageProps> & { onRetry?: () => void }) {
  const actions = onRetry ? [{ label:'Try Again', onClick: onRetry, variant:'primary' as const }] : [];

  return (
    <ErrorMessage
      category="network"
      severity="warning"
      isRetryable={true}
      message={message}
      actions={actions}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {...(props as any)}
    />
  );
}

export function AuthenticationError({
  message ='Please log in to continue',
  onLogin,
  ...props
}: Partial<ErrorMessageProps> & { onLogin?: () => void }) {
  const actions = onLogin ? [{ label:'Log In', onClick: onLogin, variant:'primary' as const }] : [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <ErrorMessage category="authentication" severity="warning" message={message} actions={actions} {...(props as any)} />;
}

export function ValidationError({ message, errors, ...props }: Partial<ErrorMessageProps> & { errors?: string[] }) {
  const details = errors && (
    <ul className="space-y-1">
      {errors.map((error, index) => (
        <li key={index} className="flex items-start gap-1">
          <span className="text-error mt-0.5">•</span>
          <span>{error}</span>
        </li>
      ))}
    </ul>
  );

  return (
    <ErrorMessage
      category="validation"
      severity="warning"
      message={message ||'Please correct the following errors'}
      details={details}
      expandable={!!errors}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {...(props as any)}
    />
  );
}

export function SearchError({
  message ="We couldn't find what you're looking for",
  onClearFilters,
  onNewSearch,
  ...props
}: Partial<ErrorMessageProps> & { onClearFilters?: () => void; onNewSearch?: () => void }) {
  const actions: ErrorAction[] = [];

  if (onClearFilters) {
    actions.push({ label:'Clear Filters', onClick: onClearFilters, variant:'secondary' });
  }

  if (onNewSearch) {
    actions.push({ label:'New Search', onClick: onNewSearch, variant:'primary' });
  }

  return (
    <ErrorMessage
      category="search"
      severity="info"
      message={message}
      actions={actions}
      showSupport={false}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {...(props as any)}
    />
  );
}

export function PaymentError({
  message ='There was a problem processing your payment',
  onRetryPayment,
  onUpdatePayment,
  ...props
}: Partial<ErrorMessageProps> & { onRetryPayment?: () => void; onUpdatePayment?: () => void }) {
  const actions: ErrorAction[] = [];

  if (onRetryPayment) {
    actions.push({ label:'Try Again', onClick: onRetryPayment, variant:'primary' });
  }

  if (onUpdatePayment) {
    actions.push({ label:'Update Payment Method', onClick: onUpdatePayment, variant:'secondary' });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <ErrorMessage category="payment" severity="error" message={message} actions={actions} {...(props as any)} />;
}

export function SystemError({
  message ='Something went wrong on our end',
  correlationId,
  onReload,
  ...props
}: Partial<ErrorMessageProps> & { onReload?: () => void }) {
  const actions = onReload ? [{ label:'Reload Page', onClick: onReload, variant:'primary' as const }] : [];

  return (
    <ErrorMessage
      category="system"
      severity="error"
      message={message}
      correlationId={correlationId}
      actions={actions}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {...(props as any)}
    />
  );
}
