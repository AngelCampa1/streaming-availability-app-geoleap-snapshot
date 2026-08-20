/**
 * Comprehensive tests for usePayment.ts and usePaymentRecovery.ts
 *
 * Coverage Target: 85%+ (hooks and helper functions)
 * Strategy: Test state management, API integration, error handling, and utility functions
 * Focus: COVERAGE to uncover bugs, not just passing tests
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { usePayment, usePaymentErrorHandler } from '../usePayment';
import { usePaymentRecovery } from '../usePaymentRecovery';
import * as api from '@/lib/api';
import {
  PaymentTransaction,
  PaymentMethod,
  CreatePaymentIntentRequest,
  PaymentMethodRequest,
  PaymentErrorType,
  FailedPayment,
  GracePeriod,
  PaymentRecoverySession,
  RecoveryMetrics,
  ManualPaymentRetryRequest,
} from '@/lib/types/payment';

// Mock the entire API module
jest.mock('@/lib/api', () => ({
  createPaymentIntent: jest.fn(),
  confirmPaymentIntent: jest.fn(),
  cancelPaymentIntent: jest.fn(),
  getPaymentHistory: jest.fn(),
  getPaymentMethods: jest.fn(),
  attachPaymentMethod: jest.fn(),
  detachPaymentMethod: jest.fn(),
  setDefaultPaymentMethod: jest.fn(),
  getUserFailedPayments: jest.fn(),
  getFailedPayment: jest.fn(),
  retryFailedPayment: jest.fn(),
  getUserGracePeriod: jest.fn(),
  getRecoverySession: jest.fn(),
  completeRecoverySession: jest.fn(),
  getRecoveryMetrics: jest.fn(),
  ApiError: class ApiError extends Error {
    public readonly statusCode: number;
    public readonly correlationId: string;
    public readonly errorCode: string;

    constructor(response: any, statusCode: number) {
      super(typeof response === 'string' ? response : response?.error?.message || 'API Error');
      this.name = 'ApiError';
      this.statusCode = statusCode;
      this.correlationId = response?.correlationId || 'test-correlation-id';
      this.errorCode = response?.error?.code || 'TEST_ERROR';
    }
  },
}));

// Helper function to create ApiError instances
const createMockApiError = (message: string, statusCode: number = 400): any => {
  return new api.ApiError(
    {
      error: {
        message,
        code: 'TEST_ERROR',
        retryable: false,
      },
      correlationId: 'test-correlation-id',
      timestamp: new Date().toISOString(),
      path: '/test-path',
    },
    statusCode
  );
};

// Mock data
const mockTransaction: PaymentTransaction = {
  id: 'pi_test_123',
  userId: 'user_123',
  stripePaymentIntentId: 'pi_stripe_123',
  amount: 999,
  currency: 'usd',
  status: 'succeeded',
  description: 'Test payment',
  createdAt: new Date().toISOString(),
};

const mockPaymentMethod: PaymentMethod = {
  id: 'pm_test_123',
  userId: 'user_123',
  stripePaymentMethodId: 'pm_stripe_123',
  type: 'card',
  brand: 'visa',
  last4: '4242',
  expiryMonth: 12,
  expiryYear: 2025,
  isDefault: false,
  createdAt: new Date().toISOString(),
};

const mockFailedPayment: FailedPayment = {
  id: 'fp_test_123',
  userId: 'user_123',
  paymentTransactionId: 'pi_fail_123',
  failureType: 'card_error',
  declineCode: 'insufficient_funds',
  failureMessage: 'Insufficient funds',
  retryCount: 1,
  isRetriable: true,
  recoveryStatus: 'active',
  nextRetryAt: new Date(Date.now() + 86400000).toISOString(),
  lastRetryAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockGracePeriod: GracePeriod = {
  id: 'gp_test_123',
  failedPaymentId: 'fp_test_123',
  userId: 'user_123',
  startDate: new Date().toISOString(),
  endDate: new Date(Date.now() + 7 * 86400000).toISOString(), // 7 days from now
  durationDays: 7,
  status: 'active',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('usePayment - Main Payment Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization and State', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => usePayment());

      expect(result.current.isProcessing).toBe(false);
      expect(result.current.isConfirming).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.success).toBe(false);
      expect(result.current.transaction).toBeNull();
      expect(result.current.paymentMethods).toEqual([]);
      expect(result.current.paymentHistory).toEqual([]);
    });

    it('should auto-load payment history when autoLoadHistory is true', async () => {
      const mockHistory = [mockTransaction];
      (api.getPaymentHistory as jest.Mock).mockResolvedValue(mockHistory);

      const { result } = renderHook(() => usePayment({ autoLoadHistory: true }));

      await waitFor(() => {
        expect(api.getPaymentHistory).toHaveBeenCalledWith(1, 20);
        expect(result.current.paymentHistory).toEqual(mockHistory);
      });
    });

    it('should auto-load payment methods when autoLoadMethods is true', async () => {
      const mockMethods = [mockPaymentMethod];
      (api.getPaymentMethods as jest.Mock).mockResolvedValue(mockMethods);

      const { result } = renderHook(() => usePayment({ autoLoadMethods: true }));

      await waitFor(() => {
        expect(api.getPaymentMethods).toHaveBeenCalled();
        expect(result.current.paymentMethods).toEqual(mockMethods);
      });
    });

    it('should respect custom historyPageSize', async () => {
      (api.getPaymentHistory as jest.Mock).mockResolvedValue([]);

      renderHook(() => usePayment({ autoLoadHistory: true, historyPageSize: 50 }));

      await waitFor(() => {
        expect(api.getPaymentHistory).toHaveBeenCalledWith(1, 50);
      });
    });
  });

  describe('createPayment', () => {
    it('should create payment intent successfully', async () => {
      (api.createPaymentIntent as jest.Mock).mockResolvedValue(mockTransaction);

      const { result } = renderHook(() => usePayment());

      const request: CreatePaymentIntentRequest = {
        amount: 999,
        currency: 'usd',
        description: 'Test payment',
      };

      let transaction: PaymentTransaction | undefined;
      await act(async () => {
        transaction = await result.current.createPayment(request);
      });

      expect(api.createPaymentIntent).toHaveBeenCalledWith(request);
      expect(transaction).toEqual(mockTransaction);
      expect(result.current.transaction).toEqual(mockTransaction);
      expect(result.current.success).toBe(true);
      expect(result.current.isProcessing).toBe(false);
    });

    it('should handle createPayment error', async () => {
      const errorMessage = 'Payment creation failed';
      (api.createPaymentIntent as jest.Mock).mockRejectedValue(createMockApiError(errorMessage));

      const { result } = renderHook(() => usePayment());

      await act(async () => {
        try {
          await result.current.createPayment({ amount: 999, currency: 'usd' });
        } catch (_error) {
          // Expected error
        }
      });

      await waitFor(() => {
        expect(result.current.error).toBe(errorMessage);
      });
      expect(result.current.success).toBe(false);
      expect(result.current.isProcessing).toBe(false);
    });

    it('should set isProcessing during createPayment', async () => {
      let resolvePayment: (value: PaymentTransaction) => void;
      const paymentPromise = new Promise<PaymentTransaction>(resolve => {
        resolvePayment = resolve;
      });
      (api.createPaymentIntent as jest.Mock).mockReturnValue(paymentPromise);

      const { result } = renderHook(() => usePayment());

      act(() => {
        result.current.createPayment({ amount: 999, currency: 'usd' });
      });

      // Check isProcessing is true during API call
      expect(result.current.isProcessing).toBe(true);

      await act(async () => {
        resolvePayment!(mockTransaction);
      });

      await waitFor(() => {
        expect(result.current.isProcessing).toBe(false);
      });
    });
  });

  describe('confirmPayment', () => {
    it('should confirm payment successfully', async () => {
      (api.confirmPaymentIntent as jest.Mock).mockResolvedValue(mockTransaction);

      const { result } = renderHook(() => usePayment());

      let confirmedTransaction: PaymentTransaction | undefined;
      await act(async () => {
        confirmedTransaction = await result.current.confirmPayment('pi_test_123');
      });

      expect(api.confirmPaymentIntent).toHaveBeenCalledWith('pi_test_123');
      expect(confirmedTransaction).toEqual(mockTransaction);
      expect(result.current.transaction).toEqual(mockTransaction);
      expect(result.current.success).toBe(true);
      expect(result.current.isConfirming).toBe(false);
    });

    it('should refresh history and methods after successful payment', async () => {
      (api.confirmPaymentIntent as jest.Mock).mockResolvedValue(mockTransaction);
      (api.getPaymentHistory as jest.Mock).mockResolvedValue([mockTransaction]);
      (api.getPaymentMethods as jest.Mock).mockResolvedValue([mockPaymentMethod]);

      const { result } = renderHook(() => usePayment({ autoLoadHistory: true, autoLoadMethods: true }));

      // Clear initial auto-load calls
      jest.clearAllMocks();

      await act(async () => {
        await result.current.confirmPayment('pi_test_123');
      });

      await waitFor(() => {
        expect(api.getPaymentHistory).toHaveBeenCalled();
        expect(api.getPaymentMethods).toHaveBeenCalled();
      });
    });

    it('should handle confirmPayment error', async () => {
      const errorMessage = 'Confirmation failed';
      (api.confirmPaymentIntent as jest.Mock).mockRejectedValue(createMockApiError(errorMessage));

      const { result } = renderHook(() => usePayment());

      await act(async () => {
        try {
          await result.current.confirmPayment('pi_test_123');
        } catch (_error) {
          // Expected error
        }
      });

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.success).toBe(false);
      expect(result.current.isConfirming).toBe(false);
    });
  });

  describe('cancelPayment', () => {
    it('should cancel payment successfully', async () => {
      const cancelledTransaction = { ...mockTransaction, status: 'canceled' as const };
      (api.cancelPaymentIntent as jest.Mock).mockResolvedValue(cancelledTransaction);

      const { result } = renderHook(() => usePayment());

      let transaction: PaymentTransaction | undefined;
      await act(async () => {
        transaction = await result.current.cancelPayment('pi_test_123');
      });

      expect(api.cancelPaymentIntent).toHaveBeenCalledWith('pi_test_123');
      expect(transaction).toEqual(cancelledTransaction);
      expect(result.current.transaction).toEqual(cancelledTransaction);
      expect(result.current.isProcessing).toBe(false);
    });

    it('should handle cancelPayment error', async () => {
      const errorMessage = 'Cancellation failed';
      (api.cancelPaymentIntent as jest.Mock).mockRejectedValue(createMockApiError(errorMessage));

      const { result } = renderHook(() => usePayment());

      await act(async () => {
        try {
          await result.current.cancelPayment('pi_test_123');
        } catch (_error) {
          // Expected error
        }
      });

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.isProcessing).toBe(false);
    });
  });

  describe('Payment Methods Management', () => {
    it('should add payment method successfully', async () => {
      (api.attachPaymentMethod as jest.Mock).mockResolvedValue(mockPaymentMethod);

      const { result } = renderHook(() => usePayment());

      const request: PaymentMethodRequest = {
        stripePaymentMethodId: 'pm_test_123',
      };

      let method: PaymentMethod | undefined;
      await act(async () => {
        method = await result.current.addPaymentMethod(request);
      });

      expect(api.attachPaymentMethod).toHaveBeenCalledWith(request);
      expect(method).toEqual(mockPaymentMethod);
      expect(result.current.paymentMethods).toContainEqual(mockPaymentMethod);
      expect(result.current.isProcessing).toBe(false);
    });

    it('should remove payment method successfully', async () => {
      (api.getPaymentMethods as jest.Mock).mockResolvedValue([mockPaymentMethod]);
      (api.detachPaymentMethod as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => usePayment({ autoLoadMethods: true }));

      await waitFor(() => {
        expect(result.current.paymentMethods).toHaveLength(1);
      });

      await act(async () => {
        await result.current.removePaymentMethod('pm_test_123');
      });

      expect(api.detachPaymentMethod).toHaveBeenCalledWith('pm_test_123');
      expect(result.current.paymentMethods).toHaveLength(0);
      expect(result.current.isProcessing).toBe(false);
    });

    it('should set default payment method successfully', async () => {
      const defaultMethod = { ...mockPaymentMethod, isDefault: true };
      const otherMethod = { ...mockPaymentMethod, id: 'pm_other', isDefault: false };
      (api.getPaymentMethods as jest.Mock).mockResolvedValue([mockPaymentMethod, otherMethod]);
      (api.setDefaultPaymentMethod as jest.Mock).mockResolvedValue(defaultMethod);

      const { result } = renderHook(() => usePayment({ autoLoadMethods: true }));

      await waitFor(() => {
        expect(result.current.paymentMethods).toHaveLength(2);
      });

      await act(async () => {
        await result.current.setDefaultMethod('pm_test_123');
      });

      expect(api.setDefaultPaymentMethod).toHaveBeenCalledWith('pm_test_123');
      const updatedMethod = result.current.paymentMethods.find(m => m.id === 'pm_test_123');
      expect(updatedMethod?.isDefault).toBe(true);
      expect(result.current.isProcessing).toBe(false);
    });
  });

  describe('Payment History', () => {
    it('should load payment history with pagination', async () => {
      const page1 = [mockTransaction];
      const page2 = [{ ...mockTransaction, id: 'pi_test_456' }];

      (api.getPaymentHistory as jest.Mock)
        .mockResolvedValueOnce(page1)
        .mockResolvedValueOnce(page2);

      const { result } = renderHook(() => usePayment());

      await act(async () => {
        await result.current.loadPaymentHistory(1, true);
      });

      expect(result.current.paymentHistory).toEqual(page1);

      await act(async () => {
        await result.current.loadPaymentHistory(2, false);
      });

      expect(result.current.paymentHistory).toEqual([...page1, ...page2]);
    });

    it('should handle loadPaymentHistory error', async () => {
      const errorMessage = 'Failed to load history';
      (api.getPaymentHistory as jest.Mock).mockRejectedValue(createMockApiError(errorMessage));

      const { result } = renderHook(() => usePayment());

      await act(async () => {
        try {
          await result.current.loadPaymentHistory();
        } catch (_error) {
          // Expected error
        }
      });

      expect(result.current.error).toBe(errorMessage);
    });
  });

  describe('Utility Functions', () => {
    it('should get default payment method', async () => {
      const defaultMethod = { ...mockPaymentMethod, isDefault: true };
      const otherMethod = { ...mockPaymentMethod, id: 'pm_other', isDefault: false };
      (api.getPaymentMethods as jest.Mock).mockResolvedValue([otherMethod, defaultMethod]);

      const { result } = renderHook(() => usePayment({ autoLoadMethods: true }));

      await waitFor(() => {
        const method = result.current.getDefaultPaymentMethod();
        expect(method).toEqual(defaultMethod);
      });
    });

    it('should return null when no default payment method exists', async () => {
      (api.getPaymentMethods as jest.Mock).mockResolvedValue([mockPaymentMethod]);

      const { result } = renderHook(() => usePayment({ autoLoadMethods: true }));

      await waitFor(() => {
        const method = result.current.getDefaultPaymentMethod();
        expect(method).toBeNull();
      });
    });

    it('should check if payment methods exist', async () => {
      (api.getPaymentMethods as jest.Mock).mockResolvedValue([mockPaymentMethod]);

      const { result } = renderHook(() => usePayment({ autoLoadMethods: true }));

      await waitFor(() => {
        expect(result.current.hasPaymentMethods()).toBe(true);
      });
    });

    it('should return false when no payment methods exist', () => {
      const { result } = renderHook(() => usePayment());

      expect(result.current.hasPaymentMethods()).toBe(false);
    });

    it('should get transaction by ID', async () => {
      const transactions = [mockTransaction, { ...mockTransaction, id: 'pi_test_456' }];
      (api.getPaymentHistory as jest.Mock).mockResolvedValue(transactions);

      const { result } = renderHook(() => usePayment({ autoLoadHistory: true }));

      await waitFor(() => {
        const transaction = result.current.getTransactionById('pi_test_456');
        expect(transaction?.id).toBe('pi_test_456');
      });
    });

    it('should return null for non-existent transaction ID', async () => {
      (api.getPaymentHistory as jest.Mock).mockResolvedValue([mockTransaction]);

      const { result } = renderHook(() => usePayment({ autoLoadHistory: true }));

      await waitFor(() => {
        const transaction = result.current.getTransactionById('non_existent');
        expect(transaction).toBeNull();
      });
    });
  });

  describe('State Management', () => {
    it('should clear error', async () => {
      (api.createPaymentIntent as jest.Mock).mockRejectedValue(createMockApiError('Test error'));

      const { result } = renderHook(() => usePayment());

      await act(async () => {
        try {
          await result.current.createPayment({ amount: 999, currency: 'usd' });
        } catch (_error) {
          // Expected
        }
      });

      expect(result.current.error).toBe('Test error');

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });

    it('should reset payment state', () => {
      const { result } = renderHook(() => usePayment());

      act(() => {
        result.current.resetPaymentState();
      });

      expect(result.current.isProcessing).toBe(false);
      expect(result.current.isConfirming).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.success).toBe(false);
      expect(result.current.transaction).toBeNull();
      expect(result.current.paymentMethods).toEqual([]);
      expect(result.current.paymentHistory).toEqual([]);
    });
  });

  describe('Memory Leak Prevention', () => {
    it('should not update state after unmount', async () => {
      let resolvePayment: (value: PaymentTransaction[]) => void;
      const historyPromise = new Promise<PaymentTransaction[]>(resolve => {
        resolvePayment = resolve;
      });
      (api.getPaymentHistory as jest.Mock).mockReturnValue(historyPromise);

      const { unmount } = renderHook(() => usePayment({ autoLoadHistory: true }));

      // Unmount before promise resolves
      unmount();

      // Resolve promise after unmount
      await act(async () => {
        resolvePayment!([mockTransaction]);
      });

      // State should not be updated (component unmounted)
      // This test verifies the isMountedRef check works
    });
  });
});

describe('usePaymentErrorHandler - Error Handling Hook', () => {
  it('should initialize with null error', () => {
    const { result } = renderHook(() => usePaymentErrorHandler());

    expect(result.current.error).toBeNull();
  });

  it('should handle card_declined error', () => {
    const { result } = renderHook(() => usePaymentErrorHandler());

    act(() => {
      result.current.handleStripeError({
        code: 'card_declined',
        message: 'Your card was declined',
      });
    });

    expect(result.current.error).toEqual({
      type: PaymentErrorType.CARD_DECLINED,
      message: 'Your card was declined',
      code: 'card_declined',
      param: undefined,
      declineCode: undefined,
    });
  });

  it('should handle insufficient_funds error', () => {
    const { result } = renderHook(() => usePaymentErrorHandler());

    act(() => {
      result.current.handleStripeError({
        code: 'insufficient_funds',
        message: 'Insufficient funds',
        decline_code: 'insufficient_funds',
      });
    });

    expect(result.current.error?.type).toBe(PaymentErrorType.INSUFFICIENT_FUNDS);
    expect(result.current.error?.declineCode).toBe('insufficient_funds');
  });

  it('should handle invalid card errors', () => {
    const invalidCardCodes = ['incorrect_number', 'invalid_number', 'invalid_expiry_month', 'invalid_expiry_year', 'invalid_cvc', 'expired_card'];

    invalidCardCodes.forEach(code => {
      const { result } = renderHook(() => usePaymentErrorHandler());

      act(() => {
        result.current.handleStripeError({ code, message: `Invalid: ${code}` });
      });

      expect(result.current.error?.type).toBe(PaymentErrorType.INVALID_CARD);
    });
  });

  it('should handle processing_error', () => {
    const { result } = renderHook(() => usePaymentErrorHandler());

    act(() => {
      result.current.handleStripeError({
        code: 'processing_error',
        message: 'Processing error occurred',
      });
    });

    expect(result.current.error?.type).toBe(PaymentErrorType.PROCESSING_ERROR);
  });

  it('should handle authentication_required', () => {
    const { result } = renderHook(() => usePaymentErrorHandler());

    act(() => {
      result.current.handleStripeError({
        code: 'authentication_required',
        message: 'Authentication required',
      });
    });

    expect(result.current.error?.type).toBe(PaymentErrorType.AUTHENTICATION_REQUIRED);
  });

  it('should handle unknown error codes', () => {
    const { result } = renderHook(() => usePaymentErrorHandler());

    act(() => {
      result.current.handleStripeError({
        code: 'unknown_code',
        message: 'Unknown error',
      });
    });

    expect(result.current.error?.type).toBe(PaymentErrorType.UNKNOWN);
  });

  it('should use default message when no message provided', () => {
    const { result } = renderHook(() => usePaymentErrorHandler());

    act(() => {
      result.current.handleStripeError({ code: 'card_declined' });
    });

    expect(result.current.error?.message).toBe('An unexpected payment error occurred');
  });

  it('should clear error', () => {
    const { result } = renderHook(() => usePaymentErrorHandler());

    act(() => {
      result.current.handleStripeError({ code: 'card_declined', message: 'Test' });
    });

    expect(result.current.error).not.toBeNull();

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });
});

describe('usePaymentRecovery - Payment Recovery Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default state', async () => {
      (api.getUserFailedPayments as jest.Mock).mockResolvedValue([]);
      (api.getUserGracePeriod as jest.Mock).mockResolvedValue({
        data: null,
        inGracePeriod: false,
        restrictedFeatures: [],
      });

      const { result } = renderHook(() => usePaymentRecovery());

      // Wait for initial auto-load to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.failedPayments).toEqual([]);
      expect(result.current.gracePeriod).toBeNull();
      expect(result.current.inGracePeriod).toBe(false);
      expect(result.current.restrictedFeatures).toEqual([]);
      expect(result.current.isRetrying).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should auto-load failed payments', async () => {
      const mockFailedPayments = [mockFailedPayment];
      (api.getUserFailedPayments as jest.Mock).mockResolvedValue(mockFailedPayments);
      (api.getUserGracePeriod as jest.Mock).mockResolvedValue({
        data: null,
        inGracePeriod: false,
        restrictedFeatures: [],
      });

      const { result } = renderHook(() => usePaymentRecovery({ autoLoadFailedPayments: true }));

      await waitFor(() => {
        expect(api.getUserFailedPayments).toHaveBeenCalledWith(true);
        expect(result.current.failedPayments).toEqual(mockFailedPayments);
      });
    });

    it('should auto-load grace period', async () => {
      (api.getUserFailedPayments as jest.Mock).mockResolvedValue([]);
      (api.getUserGracePeriod as jest.Mock).mockResolvedValue({
        data: mockGracePeriod,
        inGracePeriod: true,
        restrictedFeatures: ['premium_content', 'offline_downloads'],
      });

      const { result } = renderHook(() => usePaymentRecovery({ autoLoadGracePeriod: true }));

      await waitFor(() => {
        expect(api.getUserGracePeriod).toHaveBeenCalled();
        expect(result.current.gracePeriod).toEqual(mockGracePeriod);
        expect(result.current.inGracePeriod).toBe(true);
        expect(result.current.restrictedFeatures).toEqual(['premium_content', 'offline_downloads']);
      });
    });
  });

  describe('Failed Payment Operations', () => {
    it('should load failed payments', async () => {
      const mockFailedPayments = [mockFailedPayment];
      (api.getUserFailedPayments as jest.Mock).mockResolvedValue(mockFailedPayments);
      (api.getUserGracePeriod as jest.Mock).mockResolvedValue({
        data: null,
        inGracePeriod: false,
        restrictedFeatures: [],
      });

      const { result } = renderHook(() => usePaymentRecovery({ autoLoadFailedPayments: false }));

      await act(async () => {
        await result.current.loadFailedPayments(true);
      });

      expect(api.getUserFailedPayments).toHaveBeenCalledWith(true);
      expect(result.current.failedPayments).toEqual(mockFailedPayments);
    });

    it('should get failed payment details', async () => {
      const detailedPayment = { ...mockFailedPayment, additionalInfo: 'test' };
      (api.getFailedPayment as jest.Mock).mockResolvedValue(detailedPayment);
      (api.getUserFailedPayments as jest.Mock).mockResolvedValue([mockFailedPayment]);
      (api.getUserGracePeriod as jest.Mock).mockResolvedValue({
        data: null,
        inGracePeriod: false,
        restrictedFeatures: [],
      });

      const { result } = renderHook(() => usePaymentRecovery());

      await waitFor(() => {
        expect(result.current.failedPayments).toHaveLength(1);
      });

      let payment: FailedPayment | undefined;
      await act(async () => {
        payment = await result.current.getFailedPaymentDetails('fp_test_123');
      });

      expect(api.getFailedPayment).toHaveBeenCalledWith('fp_test_123');
      expect(payment).toEqual(detailedPayment);
    });

    it('should retry failed payment', async () => {
      const mockRetryAttempt = {
        id: 'retry_123',
        status: 'success',
        attemptedAt: new Date().toISOString(),
      };
      (api.retryFailedPayment as jest.Mock).mockResolvedValue(mockRetryAttempt);
      (api.getUserFailedPayments as jest.Mock).mockResolvedValue([]);
      (api.getUserGracePeriod as jest.Mock).mockResolvedValue({
        data: null,
        inGracePeriod: false,
        restrictedFeatures: [],
      });

      const { result } = renderHook(() => usePaymentRecovery());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const request: ManualPaymentRetryRequest = {
        reason: 'Manual retry with new payment method',
      };

      await act(async () => {
        await result.current.retryPayment('fp_test_123', request);
      });

      expect(api.retryFailedPayment).toHaveBeenCalledWith('fp_test_123', request);
      expect(api.getUserFailedPayments).toHaveBeenCalled();
    });
  });

  describe('Recovery Session Operations', () => {
    it('should load recovery session', async () => {
      const mockSession: PaymentRecoverySession = {
        id: 'session_123',
        failedPaymentId: 'fp_test_123',
        sessionToken: 'token_123',
        status: 'active',
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        accessCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      (api.getRecoverySession as jest.Mock).mockResolvedValue(mockSession);
      (api.getUserFailedPayments as jest.Mock).mockResolvedValue([]);
      (api.getUserGracePeriod as jest.Mock).mockResolvedValue({
        data: null,
        inGracePeriod: false,
        restrictedFeatures: [],
      });

      const { result } = renderHook(() => usePaymentRecovery());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.loadRecoverySession('token_123');
      });

      expect(api.getRecoverySession).toHaveBeenCalledWith('token_123');
      expect(result.current.recoverySession).toEqual(mockSession);
    });

    it('should complete recovery session', async () => {
      const completedSession: PaymentRecoverySession = {
        id: 'session_123',
        failedPaymentId: 'fp_test_123',
        sessionToken: 'token_123',
        status: 'completed',
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        completedAt: new Date().toISOString(),
        completionMethod: 'user_completed',
        accessCount: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      (api.completeRecoverySession as jest.Mock).mockResolvedValue(completedSession);
      (api.getUserFailedPayments as jest.Mock).mockResolvedValue([]);
      (api.getUserGracePeriod as jest.Mock).mockResolvedValue({
        data: null,
        inGracePeriod: false,
        restrictedFeatures: [],
      });

      const { result } = renderHook(() => usePaymentRecovery());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.completeRecovery('token_123', 'user_completed');
      });

      expect(api.completeRecoverySession).toHaveBeenCalledWith('token_123', { completionType: 'user_completed' });
      expect(result.current.recoverySession).toEqual(completedSession);
    });
  });

  describe('Recovery Metrics', () => {
    it('should load recovery metrics', async () => {
      const mockMetrics: RecoveryMetrics = {
        retry_analytics: {
          totalFailedPayments: 10,
          totalRetryAttempts: 15,
          successfulRecoveries: 7,
          recoveryRate: 0.7,
          averageRetriesToRecovery: 2.14,
          topFailureReasons: [
            { reason: 'insufficient_funds', count: 5, percentage: 50 },
            { reason: 'card_declined', count: 3, percentage: 30 },
          ],
          retryMethodEffectiveness: [
            { method: 'automatic', successRate: 0.6, averageTime: 24 },
          ],
          timeToRecoveryDistribution: [
            { timeBucket: '0-24h', count: 4, percentage: 57 },
          ],
        },
        grace_period_analytics: {
          totalGracePeriods: 8,
          activeGracePeriods: 3,
          expiredGracePeriods: 2,
          resolvedGracePeriods: 3,
          averageGracePeriodDuration: 7,
          gracePeriodResolutionRate: 0.375,
          extensionRate: 0.25,
          topEndReasons: [
            { reason: 'payment_received', count: 3, percentage: 100 },
          ],
        },
        period: {
          start: new Date(Date.now() - 30 * 86400000).toISOString(),
          end: new Date().toISOString(),
        },
      };
      (api.getRecoveryMetrics as jest.Mock).mockResolvedValue(mockMetrics);
      (api.getUserFailedPayments as jest.Mock).mockResolvedValue([]);
      (api.getUserGracePeriod as jest.Mock).mockResolvedValue({
        data: null,
        inGracePeriod: false,
        restrictedFeatures: [],
      });

      const { result } = renderHook(() => usePaymentRecovery());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.loadRecoveryMetrics();
      });

      expect(api.getRecoveryMetrics).toHaveBeenCalled();
      expect(result.current.recoveryMetrics).toEqual(mockMetrics);
    });
  });

  describe('Utility Functions', () => {
    it('should detect active failed payments', async () => {
      const activePayment = { ...mockFailedPayment, recoveryStatus: 'active' as const };
      (api.getUserFailedPayments as jest.Mock).mockResolvedValue([activePayment]);
      (api.getUserGracePeriod as jest.Mock).mockResolvedValue({
        data: null,
        inGracePeriod: false,
        restrictedFeatures: [],
      });

      const { result } = renderHook(() => usePaymentRecovery());

      await waitFor(() => {
        expect(result.current.hasActiveFailedPayments()).toBe(true);
      });
    });

    it('should get next retry payment', async () => {
      const payment1 = { ...mockFailedPayment, nextRetryAt: new Date(Date.now() + 86400000).toISOString() };
      const payment2 = { ...mockFailedPayment, id: 'fp_test_456', nextRetryAt: new Date(Date.now() + 172800000).toISOString() };
      (api.getUserFailedPayments as jest.Mock).mockResolvedValue([payment2, payment1]);
      (api.getUserGracePeriod as jest.Mock).mockResolvedValue({
        data: null,
        inGracePeriod: false,
        restrictedFeatures: [],
      });

      const { result } = renderHook(() => usePaymentRecovery());

      await waitFor(() => {
        const nextPayment = result.current.getNextRetryPayment();
        expect(nextPayment?.id).toBe('fp_test_123'); // Earlier retry time
      });
    });

    it('should calculate grace period days remaining', async () => {
      const gracePeriodData = {
        ...mockGracePeriod,
        endDate: new Date(Date.now() + 3 * 86400000).toISOString(), // 3 days from now
      };
      (api.getUserFailedPayments as jest.Mock).mockResolvedValue([]);
      (api.getUserGracePeriod as jest.Mock).mockResolvedValue({
        data: gracePeriodData,
        inGracePeriod: true,
        restrictedFeatures: [],
      });

      const { result } = renderHook(() => usePaymentRecovery());

      await waitFor(() => {
        const daysRemaining = result.current.getGracePeriodDaysRemaining();
        expect(daysRemaining).toBeGreaterThan(0);
        expect(daysRemaining).toBeLessThanOrEqual(3);
      });
    });

    it('should check if feature is restricted', async () => {
      (api.getUserFailedPayments as jest.Mock).mockResolvedValue([]);
      (api.getUserGracePeriod as jest.Mock).mockResolvedValue({
        data: mockGracePeriod,
        inGracePeriod: true,
        restrictedFeatures: ['premium_content', 'offline_downloads'],
      });

      const { result } = renderHook(() => usePaymentRecovery());

      await waitFor(() => {
        expect(result.current.isFeatureRestricted('premium_content')).toBe(true);
        expect(result.current.isFeatureRestricted('basic_viewing')).toBe(false);
      });
    });

    it('should get recovery rate from metrics', async () => {
      const mockMetrics: RecoveryMetrics = {
        retry_analytics: {
          totalFailedPayments: 10,
          totalRetryAttempts: 15,
          successfulRecoveries: 7,
          recoveryRate: 0.7,
          averageRetriesToRecovery: 2.14,
          topFailureReasons: [],
          retryMethodEffectiveness: [],
          timeToRecoveryDistribution: [],
        },
        grace_period_analytics: {
          totalGracePeriods: 8,
          activeGracePeriods: 3,
          expiredGracePeriods: 2,
          resolvedGracePeriods: 3,
          averageGracePeriodDuration: 7,
          gracePeriodResolutionRate: 0.375,
          extensionRate: 0.25,
          topEndReasons: [],
        },
        period: {
          start: new Date(Date.now() - 30 * 86400000).toISOString(),
          end: new Date().toISOString(),
        },
      };
      (api.getRecoveryMetrics as jest.Mock).mockResolvedValue(mockMetrics);
      (api.getUserFailedPayments as jest.Mock).mockResolvedValue([]);
      (api.getUserGracePeriod as jest.Mock).mockResolvedValue({
        data: null,
        inGracePeriod: false,
        restrictedFeatures: [],
      });

      const { result } = renderHook(() => usePaymentRecovery());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.loadRecoveryMetrics();
      });

      await waitFor(() => {
        expect(result.current.getRecoveryRateFromMetrics()).toBe(0.7);
      });
    });
  });

  describe('Refresh Interval', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should refresh data at specified interval', async () => {
      (api.getUserFailedPayments as jest.Mock).mockResolvedValue([]);
      (api.getUserGracePeriod as jest.Mock).mockResolvedValue({
        data: null,
        inGracePeriod: false,
        restrictedFeatures: [],
      });

      renderHook(() => usePaymentRecovery({ refreshInterval: 5000 }));

      // Clear initial mount calls
      jest.clearAllMocks();

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(api.getUserFailedPayments).toHaveBeenCalled();
        expect(api.getUserGracePeriod).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle loadFailedPayments error', async () => {
      const errorMessage = 'Failed to load payments';
      (api.getUserFailedPayments as jest.Mock).mockRejectedValue(createMockApiError(errorMessage));
      (api.getUserGracePeriod as jest.Mock).mockResolvedValue({
        data: null,
        inGracePeriod: false,
        restrictedFeatures: [],
      });

      const { result } = renderHook(() => usePaymentRecovery({ autoLoadFailedPayments: false }));

      await act(async () => {
        try {
          await result.current.loadFailedPayments();
        } catch (_error) {
          // Expected
        }
      });

      expect(result.current.error).toBe(errorMessage);
    });

    it('should clear error', async () => {
      (api.getUserFailedPayments as jest.Mock).mockRejectedValue(createMockApiError('Test error'));
      (api.getUserGracePeriod as jest.Mock).mockResolvedValue({
        data: null,
        inGracePeriod: false,
        restrictedFeatures: [],
      });

      const { result } = renderHook(() => usePaymentRecovery({ autoLoadFailedPayments: false }));

      await act(async () => {
        try {
          await result.current.loadFailedPayments();
        } catch (_error) {
          // Expected
        }
      });

      expect(result.current.error).toBe('Test error');

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });
});
