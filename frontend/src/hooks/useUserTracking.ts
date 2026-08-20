/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useCallback, useEffect } from 'react';
import { useLogger } from '@/lib/logger';

interface UserActionData {
  [key: string]: any;
}

interface SearchActionData extends UserActionData {
  query: string;
  filters?: Record<string, any>;
  resultsCount?: number;
}

interface NavigationActionData extends UserActionData {
  from: string;
  to: string;
  method: 'click' | 'keyboard' | 'programmatic';
}

interface AuthActionData extends UserActionData {
  method: 'email' | 'google' | 'apple';
  success: boolean;
  errorCode?: string;
}

interface PaymentActionData extends UserActionData {
  amount?: number;
  currency?: string;
  plan?: string;
  success: boolean;
  errorCode?: string;
}

export const useUserTracking = () => {
  const logger = useLogger();

  // Track page views automatically
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const pageName = document.title || window.location.pathname;
      logger.logPageView(pageName);
    }
  }, [logger]);

  // Track search actions
  const trackSearch = useCallback(
    (data: SearchActionData) => {
      logger.logUserAction('search', 'SearchComponent', {
        query: data.query,
        filters: data.filters,
        resultsCount: data.resultsCount,
        timestamp: new Date().toISOString(),
      });
    },
    [logger]
  );

  // Track navigation actions
  const trackNavigation = useCallback(
    (data: NavigationActionData) => {
      logger.logUserAction('navigation', 'NavigationComponent', {
        from: data.from,
        to: data.to,
        method: data.method,
        timestamp: new Date().toISOString(),
      });
    },
    [logger]
  );

  // Track authentication actions
  const trackAuth = useCallback(
    (action: 'login' | 'logout' | 'register', data: AuthActionData) => {
      logger.logUserAction(action, 'AuthComponent', {
        method: data.method,
        success: data.success,
        errorCode: data.errorCode,
        timestamp: new Date().toISOString(),
      });
    },
    [logger]
  );

  // Track payment actions
  const trackPayment = useCallback(
    (action: 'subscription' | 'upgrade' | 'cancel', data: PaymentActionData) => {
      logger.logUserAction(`payment_${action}`, 'PaymentComponent', {
        // Never log sensitive payment data
        plan: data.plan,
        success: data.success,
        errorCode: data.errorCode,
        timestamp: new Date().toISOString(),
      });
    },
    [logger]
  );

  // Track button clicks
  const trackClick = useCallback(
    (element: string, component?: string, data?: UserActionData) => {
      logger.logUserAction('click', component || 'UnknownComponent', {
        element,
        ...data,
        timestamp: new Date().toISOString(),
      });
    },
    [logger]
  );

  // Track form submissions
  const trackFormSubmit = useCallback(
    (formName: string, success: boolean, data?: UserActionData) => {
      logger.logUserAction('form_submit', 'FormComponent', {
        formName,
        success,
        ...data,
        timestamp: new Date().toISOString(),
      });
    },
    [logger]
  );

  // Track feature usage
  const trackFeatureUse = useCallback(
    (feature: string, component?: string, data?: UserActionData) => {
      logger.logUserAction('feature_use', component || 'FeatureComponent', {
        feature,
        ...data,
        timestamp: new Date().toISOString(),
      });
    },
    [logger]
  );

  // Track errors that don't crash the component
  const trackError = useCallback(
    (error: Error | string, component?: string, data?: UserActionData) => {
      const errorData = {
        component: component || 'UnknownComponent',
        message: typeof error === 'string' ? error : error.message,
        stack: typeof error === 'object' ? error.stack : undefined,
        ...data,
        timestamp: new Date().toISOString(),
      };

      logger.error('User interaction error', errorData);
    },
    [logger]
  );

  // Track performance metrics
  const trackPerformance = useCallback(
    (metric: string, value: number, context?: string) => {
      logger.logPerformance(metric, value, context);
    },
    [logger]
  );

  // Set user context when user logs in
  const setUser = useCallback(
    (userId: string) => {
      logger.setUser(userId);
    },
    [logger]
  );

  return {
    trackSearch,
    trackNavigation,
    trackAuth,
    trackPayment,
    trackClick,
    trackFormSubmit,
    trackFeatureUse,
    trackError,
    trackPerformance,
    setUser,
  };
};

// Hook for automatic click tracking on elements
export const useClickTracking = (component: string) => {
  const { trackClick } = useUserTracking();

  const handleClick = useCallback(
    (element: string, data?: UserActionData) => {
      return (event: React.MouseEvent) => {
        trackClick(element, component, {
          ...data,
          x: event.clientX,
          y: event.clientY,
          button: event.button,
        });
      };
    },
    [trackClick, component]
  );

  return { handleClick };
};

// Hook for form tracking
export const useFormTracking = (formName: string, component?: string) => {
  const { trackFormSubmit, trackError } = useUserTracking();

  const handleSubmit = useCallback(
    (success: boolean, data?: UserActionData) => {
      trackFormSubmit(formName, success, data);
    },
    [trackFormSubmit, formName]
  );

  const handleError = useCallback(
    (error: Error | string, data?: UserActionData) => {
      trackError(error, component || 'FormComponent', {
        formName,
        ...data,
      });
    },
    [trackError, component, formName]
  );

  return { handleSubmit, handleError };
};

// HOC for automatic component tracking
export function withUserTracking<T extends object>(
  Component: React.ComponentType<T>,
  componentName?: string
): React.ComponentType<T> {
  const WrappedComponent: React.ComponentType<T> = (props: T) => {
    const componentDisplayName = componentName || Component.displayName || Component.name;
    const { trackFeatureUse } = useUserTracking();

    useEffect(() => {
      trackFeatureUse('component_mount', componentDisplayName);
    }, [trackFeatureUse, componentDisplayName]);

    return React.createElement(Component, props);
  };

  WrappedComponent.displayName = `withUserTracking(${Component.displayName || Component.name})`;

  return WrappedComponent;
}
