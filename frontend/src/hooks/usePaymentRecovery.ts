'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  getUserFailedPayments,
  getFailedPayment,
  retryFailedPayment,
  getUserGracePeriod,
  getRecoverySession,
  completeRecoverySession,
  getRecoveryMetrics,
  ApiError,
} from '../lib/api';
import {
  FailedPayment,
  PaymentRetryAttempt,
  GracePeriod,
  PaymentRecoverySession,
  ManualPaymentRetryRequest,
  CompleteRecoverySessionRequest,
  RecoveryMetrics,
} from '../lib/types/payment';

interface UsePaymentRecoveryOptions {
  autoLoadFailedPayments?: boolean;
  autoLoadGracePeriod?: boolean;
  refreshInterval?: number;
}

interface PaymentRecoveryState {
  failedPayments: FailedPayment[];
  gracePeriod: GracePeriod | null;
  inGracePeriod: boolean;
  restrictedFeatures: string[];
  recoverySession: PaymentRecoverySession | null;
  recoveryMetrics: RecoveryMetrics | null;
  isLoading: boolean;
  isRetrying: boolean;
  error: string | null;
}

export function usePaymentRecovery(options: UsePaymentRecoveryOptions = {}) {
  const { autoLoadFailedPayments = true, autoLoadGracePeriod = true, refreshInterval = 0 } = options;

  const [state, setState] = useState<PaymentRecoveryState>({
    failedPayments: [],
    gracePeriod: null,
    inGracePeriod: false,
    restrictedFeatures: [],
    recoverySession: null,
    recoveryMetrics: null,
    isLoading: false,
    isRetrying: false,
    error: null,
  });

  // Track mounted state to prevent state updates after unmount
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Load failed payments
  const loadFailedPayments = useCallback(async (activeOnly: boolean = true) => {
    if (isMountedRef.current) {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
    }

    try {
      const failedPayments = await getUserFailedPayments(activeOnly);
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          failedPayments,
          isLoading: false,
        }));
      }
      return failedPayments;
    } catch (error) {
      const errorMessage = error instanceof ApiError ? error.message : 'Failed to load failed payments';
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
      }
      throw error;
    }
  }, []);

  // Load grace period
  const loadGracePeriod = useCallback(async () => {
    if (isMountedRef.current) {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
    }

    try {
      const gracePeriodData = await getUserGracePeriod();
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          gracePeriod: gracePeriodData.data,
          inGracePeriod: gracePeriodData.inGracePeriod,
          restrictedFeatures: gracePeriodData.restrictedFeatures,
          isLoading: false,
        }));
      }
      return gracePeriodData;
    } catch (error) {
      const errorMessage = error instanceof ApiError ? error.message : 'Failed to load grace period';
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
      }
      throw error;
    }
  }, []);

  // Get specific failed payment details
  const getFailedPaymentDetails = useCallback(async (failedPaymentId: string): Promise<FailedPayment> => {
    try {
      const failedPayment = await getFailedPayment(failedPaymentId);

      // Update the failed payment in our state if it exists
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          failedPayments: prev.failedPayments.map(fp => (fp.id === failedPaymentId ? failedPayment : fp)),
        }));
      }

      return failedPayment;
    } catch (error) {
      const errorMessage = error instanceof ApiError ? error.message : 'Failed to get payment details';
      if (isMountedRef.current) {
        setState(prev => ({ ...prev, error: errorMessage }));
      }
      throw error;
    }
  }, []);

  // Retry failed payment
  const retryPayment = useCallback(
    async (failedPaymentId: string, request?: ManualPaymentRetryRequest): Promise<PaymentRetryAttempt> => {
      if (isMountedRef.current) {
        setState(prev => ({ ...prev, isRetrying: true, error: null }));
      }

      try {
        const retryAttempt = await retryFailedPayment(failedPaymentId, request);

        // Refresh failed payments to get updated status
        await loadFailedPayments();

        if (isMountedRef.current) {
          setState(prev => ({ ...prev, isRetrying: false }));
        }
        return retryAttempt;
      } catch (error) {
        const errorMessage = error instanceof ApiError ? error.message : 'Failed to retry payment';
        if (isMountedRef.current) {
          setState(prev => ({
            ...prev,
            isRetrying: false,
            error: errorMessage,
          }));
        }
        throw error;
      }
    },
    [loadFailedPayments]
  );

  // Load recovery session (for recovery links)
  const loadRecoverySession = useCallback(async (sessionToken: string): Promise<PaymentRecoverySession> => {
    if (isMountedRef.current) {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
    }

    try {
      const session = await getRecoverySession(sessionToken);
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          recoverySession: session,
          isLoading: false,
        }));
      }
      return session;
    } catch (error) {
      const errorMessage = error instanceof ApiError ? error.message : 'Failed to load recovery session';
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
      }
      throw error;
    }
  }, []);

  // Complete recovery session
  const completeRecovery = useCallback(
    async (sessionToken: string, completionType: string = 'user_completed'): Promise<PaymentRecoverySession> => {
      if (isMountedRef.current) {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
      }

      try {
        const request: CompleteRecoverySessionRequest = { completionType };
        const session = await completeRecoverySession(sessionToken, request);
        if (isMountedRef.current) {
          setState(prev => ({
            ...prev,
            recoverySession: session,
            isLoading: false,
          }));
        }
        return session;
      } catch (error) {
        const errorMessage = error instanceof ApiError ? error.message : 'Failed to complete recovery session';
        if (isMountedRef.current) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: errorMessage,
          }));
        }
        throw error;
      }
    },
    []
  );

  // Load recovery analytics
  const loadRecoveryMetrics = useCallback(async (startDate?: Date, endDate?: Date): Promise<RecoveryMetrics> => {
    if (isMountedRef.current) {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
    }

    try {
      const metrics = await getRecoveryMetrics(startDate, endDate);
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          recoveryMetrics: metrics,
          isLoading: false,
        }));
      }
      return metrics;
    } catch (error) {
      const errorMessage = error instanceof ApiError ? error.message : 'Failed to load recovery metrics';
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
      }
      throw error;
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Refresh all data
  const refreshData = useCallback(async () => {
    const promises = [];

    if (autoLoadFailedPayments) {
      promises.push(loadFailedPayments());
    }

    if (autoLoadGracePeriod) {
      promises.push(loadGracePeriod());
    }

    try {
      await Promise.all(promises);
    } catch (error) {
      // Individual errors are handled in their respective functions
      console.error('Error refreshing payment recovery data:', error);
    }
  }, [autoLoadFailedPayments, autoLoadGracePeriod, loadFailedPayments, loadGracePeriod]);

  // Auto-load data on mount
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Set up refresh interval if specified
  useEffect(() => {
    if (refreshInterval > 0) {
      const intervalId = setInterval(refreshData, refreshInterval);
      return () => clearInterval(intervalId);
    }
  }, [refreshInterval, refreshData]);

  // Utility functions
  const hasActiveFailedPayments = useCallback(() => {
    return state.failedPayments.some(fp => fp.recoveryStatus === 'active');
  }, [state.failedPayments]);

  const getNextRetryPayment = useCallback(() => {
    return (
      state.failedPayments
        .filter(fp => fp.recoveryStatus === 'active' && fp.isRetriable && fp.nextRetryAt)
        .sort((a, b) => new Date(a.nextRetryAt!).getTime() - new Date(b.nextRetryAt!).getTime())[0] || null
    );
  }, [state.failedPayments]);

  const getGracePeriodDaysRemaining = useCallback(() => {
    if (!state.gracePeriod || !state.inGracePeriod) return 0;

    const endDate = new Date(state.gracePeriod.endDate);
    const now = new Date();
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
  }, [state.gracePeriod, state.inGracePeriod]);

  const isFeatureRestricted = useCallback(
    (featureName: string) => {
      return state.restrictedFeatures.includes(featureName);
    },
    [state.restrictedFeatures]
  );

  const getRecoveryRateFromMetrics = useCallback(() => {
    return state.recoveryMetrics?.retry_analytics?.recoveryRate || 0;
  }, [state.recoveryMetrics]);

  return {
    // State
    ...state,

    // Actions
    loadFailedPayments,
    loadGracePeriod,
    getFailedPaymentDetails,
    retryPayment,
    loadRecoverySession,
    completeRecovery,
    loadRecoveryMetrics,
    refreshData,
    clearError,

    // Utilities
    hasActiveFailedPayments,
    getNextRetryPayment,
    getGracePeriodDaysRemaining,
    isFeatureRestricted,
    getRecoveryRateFromMetrics,
  };
}
