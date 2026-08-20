'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  createPaymentIntent,
  confirmPaymentIntent,
  cancelPaymentIntent,
  getPaymentHistory,
  getPaymentMethods,
  attachPaymentMethod,
  detachPaymentMethod,
  setDefaultPaymentMethod,
  ApiError,
} from '../lib/api';
import {
  PaymentTransaction,
  PaymentMethod,
  CreatePaymentIntentRequest,
  PaymentMethodRequest,
  PaymentState,
  PaymentError,
  PaymentErrorType,
} from '../lib/types/payment';

interface UsePaymentOptions {
  autoLoadHistory?: boolean;
  autoLoadMethods?: boolean;
  historyPageSize?: number;
}

export function usePayment(options: UsePaymentOptions = {}) {
  const { autoLoadHistory = false, autoLoadMethods = false, historyPageSize = 20 } = options;

  // State management
  const [state, setState] = useState<PaymentState>({
    isProcessing: false,
    isConfirming: false,
    error: null,
    success: false,
    transaction: null,
    paymentMethods: [],
    stripeCustomer: null,
  });

  const [paymentHistory, setPaymentHistory] = useState<PaymentTransaction[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [methodsLoading, setMethodsLoading] = useState(false);

  // BUG FIX: Track mounted state to prevent state updates after unmount
  const isMountedRef = useRef(true);

  // BUG FIX: Set mounted state on mount/unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Load payment history
  const loadPaymentHistory = useCallback(
    async (page = 1, reset = false) => {
      setHistoryLoading(true);
      try {
        const transactions = await getPaymentHistory(page, historyPageSize);
        // BUG FIX: Only update state if component is still mounted
        if (isMountedRef.current) {
          setPaymentHistory(prev => (reset ? transactions : [...prev, ...transactions]));
        }
        return transactions;
      } catch (error) {
        console.error('Failed to load payment history:', error);
        const errorMessage = error instanceof ApiError ? error.message : 'Failed to load payment history';
        // BUG FIX: Only update state if component is still mounted
        if (isMountedRef.current) {
          setState(prev => ({ ...prev, error: errorMessage }));
        }
        throw error;
      } finally {
        // BUG FIX: Only update state if component is still mounted
        if (isMountedRef.current) {
          setHistoryLoading(false);
        }
      }
    },
    [historyPageSize]
  );

  // Load payment methods
  const loadPaymentMethods = useCallback(async () => {
    setMethodsLoading(true);
    try {
      const methods = await getPaymentMethods();
      // BUG FIX: Only update state if component is still mounted
      if (isMountedRef.current) {
        setState(prev => ({ ...prev, paymentMethods: methods }));
      }
      return methods;
    } catch (error) {
      console.error('Failed to load payment methods:', error);
      const errorMessage = error instanceof ApiError ? error.message : 'Failed to load payment methods';
      // BUG FIX: Only update state if component is still mounted
      if (isMountedRef.current) {
        setState(prev => ({ ...prev, error: errorMessage }));
      }
      throw error;
    } finally {
      // BUG FIX: Only update state if component is still mounted
      if (isMountedRef.current) {
        setMethodsLoading(false);
      }
    }
  }, []);

  // Create payment intent
  const createPayment = useCallback(async (request: CreatePaymentIntentRequest): Promise<PaymentTransaction> => {
    if (isMountedRef.current) {
      setState(prev => ({ ...prev, isProcessing: true, error: null, success: false }));
    }

    try {
      const transaction = await createPaymentIntent(request);
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          transaction,
          isProcessing: false,
          success: true,
        }));
      }
      return transaction;
    } catch (error) {
      const errorMessage = error instanceof ApiError ? error.message : 'Failed to create payment';
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          isProcessing: false,
          error: errorMessage,
          success: false,
        }));
      }
      throw error;
    }
  }, []);

  // Confirm payment intent
  const confirmPayment = useCallback(
    async (paymentIntentId: string): Promise<PaymentTransaction> => {
      if (isMountedRef.current) {
        setState(prev => ({ ...prev, isConfirming: true, error: null }));
      }

      try {
        const transaction = await confirmPaymentIntent(paymentIntentId);
        if (isMountedRef.current) {
          setState(prev => ({
            ...prev,
            transaction,
            isConfirming: false,
            success: transaction.status === 'succeeded',
          }));

          // Refresh payment history and methods if payment succeeded
          if (transaction.status === 'succeeded') {
            if (autoLoadHistory) loadPaymentHistory(1, true);
            if (autoLoadMethods) loadPaymentMethods();
          }
        }

        return transaction;
      } catch (error) {
        const errorMessage = error instanceof ApiError ? error.message : 'Failed to confirm payment';
        if (isMountedRef.current) {
          setState(prev => ({
            ...prev,
            isConfirming: false,
            error: errorMessage,
            success: false,
          }));
        }
        throw error;
      }
    },
    [autoLoadHistory, autoLoadMethods, loadPaymentHistory, loadPaymentMethods]
  );

  // Cancel payment intent
  const cancelPayment = useCallback(async (paymentIntentId: string): Promise<PaymentTransaction> => {
    if (isMountedRef.current) {
      setState(prev => ({ ...prev, isProcessing: true, error: null }));
    }

    try {
      const transaction = await cancelPaymentIntent(paymentIntentId);
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          transaction,
          isProcessing: false,
        }));
      }
      return transaction;
    } catch (error) {
      const errorMessage = error instanceof ApiError ? error.message : 'Failed to cancel payment';
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          isProcessing: false,
          error: errorMessage,
        }));
      }
      throw error;
    }
  }, []);

  // Add payment method
  const addPaymentMethod = useCallback(async (request: PaymentMethodRequest): Promise<PaymentMethod> => {
    if (isMountedRef.current) {
      setState(prev => ({ ...prev, isProcessing: true, error: null }));
    }

    try {
      const paymentMethod = await attachPaymentMethod(request);
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          paymentMethods: [...prev.paymentMethods, paymentMethod],
          isProcessing: false,
        }));
      }
      return paymentMethod;
    } catch (error) {
      const errorMessage = error instanceof ApiError ? error.message : 'Failed to add payment method';
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          isProcessing: false,
          error: errorMessage,
        }));
      }
      throw error;
    }
  }, []);

  // Remove payment method
  const removePaymentMethod = useCallback(async (methodId: string): Promise<void> => {
    if (isMountedRef.current) {
      setState(prev => ({ ...prev, isProcessing: true, error: null }));
    }

    try {
      await detachPaymentMethod(methodId);
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          paymentMethods: prev.paymentMethods.filter(method => method.id !== methodId),
          isProcessing: false,
        }));
      }
    } catch (error) {
      const errorMessage = error instanceof ApiError ? error.message : 'Failed to remove payment method';
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          isProcessing: false,
          error: errorMessage,
        }));
      }
      throw error;
    }
  }, []);

  // Set default payment method
  const setDefaultMethod = useCallback(async (methodId: string): Promise<PaymentMethod> => {
    if (isMountedRef.current) {
      setState(prev => ({ ...prev, isProcessing: true, error: null }));
    }

    try {
      const updatedMethod = await setDefaultPaymentMethod(methodId);
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          paymentMethods: prev.paymentMethods.map(method => ({
            ...method,
            isDefault: method.id === updatedMethod.id,
          })),
          isProcessing: false,
        }));
      }
      return updatedMethod;
    } catch (error) {
      const errorMessage = error instanceof ApiError ? error.message : 'Failed to set default payment method';
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          isProcessing: false,
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

  // Reset state
  const resetPaymentState = useCallback(() => {
    setState({
      isProcessing: false,
      isConfirming: false,
      error: null,
      success: false,
      transaction: null,
      paymentMethods: [],
      stripeCustomer: null,
    });
    setPaymentHistory([]);
  }, []);

  // Auto-load data on mount
  useEffect(() => {
    if (autoLoadHistory) {
      loadPaymentHistory(1, true);
    }
    if (autoLoadMethods) {
      loadPaymentMethods();
    }
  }, [autoLoadHistory, autoLoadMethods, loadPaymentHistory, loadPaymentMethods]);

  // Utility functions
  const getDefaultPaymentMethod = useCallback(() => {
    return state.paymentMethods.find(method => method.isDefault) || null;
  }, [state.paymentMethods]);

  const hasPaymentMethods = useCallback(() => {
    return state.paymentMethods.length > 0;
  }, [state.paymentMethods]);

  const getTransactionById = useCallback(
    (transactionId: string) => {
      return paymentHistory.find(transaction => transaction.id === transactionId) || null;
    },
    [paymentHistory]
  );

  return {
    // State
    ...state,
    paymentHistory,
    historyLoading,
    methodsLoading,

    // Actions
    createPayment,
    confirmPayment,
    cancelPayment,
    addPaymentMethod,
    removePaymentMethod,
    setDefaultMethod,
    loadPaymentHistory,
    loadPaymentMethods,
    clearError,
    resetPaymentState,

    // Utilities
    getDefaultPaymentMethod,
    hasPaymentMethods,
    getTransactionById,
  };
}

// Additional helper hooks
export function usePaymentErrorHandler() {
  const [error, setError] = useState<PaymentError | null>(null);

  const handleStripeError = useCallback(
    (stripeError: { code?: string; message?: string; param?: string; decline_code?: string }) => {
      const paymentError: PaymentError = {
        type: mapStripeErrorType(stripeError.code),
        message: stripeError.message || 'An unexpected payment error occurred',
        code: stripeError.code,
        param: stripeError.param,
        declineCode: stripeError.decline_code,
      };
      setError(paymentError);
      return paymentError;
    },
    []
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    handleStripeError,
    clearError,
  };
}

function mapStripeErrorType(code?: string): PaymentErrorType {
  const errorMap: Record<string, PaymentErrorType> = {
    card_declined: PaymentErrorType.CARD_DECLINED,
    insufficient_funds: PaymentErrorType.INSUFFICIENT_FUNDS,
    incorrect_number: PaymentErrorType.INVALID_CARD,
    invalid_number: PaymentErrorType.INVALID_CARD,
    invalid_expiry_month: PaymentErrorType.INVALID_CARD,
    invalid_expiry_year: PaymentErrorType.INVALID_CARD,
    invalid_cvc: PaymentErrorType.INVALID_CARD,
    expired_card: PaymentErrorType.INVALID_CARD,
    processing_error: PaymentErrorType.PROCESSING_ERROR,
    authentication_required: PaymentErrorType.AUTHENTICATION_REQUIRED,
  };

  return errorMap[code || ''] || PaymentErrorType.UNKNOWN;
}
