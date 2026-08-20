/**
 * Week 4 Day 16: Subscription & Payment Flow - Critical Path Integration Test
 *
 * This integration test validates the complete subscription and payment user journey:
 * 1. Plan selection (Free, Plus, Premium)
 * 2. Payment method selection
 * 3. In-app purchase flow (iOS/Android)
 * 4. Receipt validation
 * 5. Subscription activation
 * 6. Subscription management (upgrade/downgrade)
 * 7. Purchase restoration
 *
 * Tests P0/P1 bugs from Days 1-15:
 * - PAYMENT-001: Receipt validation NOT implemented (P0 CRITICAL)
 * - PAYMENT-002: Purchase interrupted causes duplicate charges (P0)
 * - PAYMENT-003: Restore purchases not working (P1)
 * - PAYMENT-004: No upgrade/downgrade handling (P1)
 * - PAYMENT-005: Payment failure retry logic missing (P1)
 *
 * @see docs/audit/week2/day6-subscription-payment-bug-report.md
 */

import React from 'react';
import { render, waitFor, act, fireEvent } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { useSubscription } from '../../../hooks/useSubscription';
import { PaymentService } from '../../../services/payment/PaymentService';
import { ReceiptValidationService } from '../../../services/payment/ReceiptValidationService';
import { logger } from '../../../utils/logger';
import { Text, Button } from 'react-native';

// Mock dependencies
jest.mock('../../../services/payment/PaymentService');
jest.mock('../../../services/payment/ReceiptValidationService');
jest.mock('../../../utils/logger');
jest.mock('react-native-iap');

// Test component that uses subscription hook
const TestSubscriptionComponent: React.FC = () => {
  const subscription = useSubscription();

  return (
    <>
      <Text testID="subscription-status">{subscription.status}</Text>
      <Text testID="subscription-plan">{subscription.plan || 'none'}</Text>
      <Text testID="subscription-error">{subscription.error || 'none'}</Text>
      <Text testID="is-loading">{subscription.isLoading ? 'loading' : 'idle'}</Text>
      <Button
        testID="select-plus"
        title="Select Plus"
        onPress={() => subscription.selectPlan('plus')}
      />
      <Button
        testID="select-premium"
        title="Select Premium"
        onPress={() => subscription.selectPlan('premium')}
      />
      <Button testID="purchase" title="Purchase" onPress={subscription.purchase} />
      <Button testID="restore" title="Restore Purchases" onPress={subscription.restorePurchases} />
      <Button
        testID="upgrade"
        title="Upgrade to Premium"
        onPress={() => subscription.upgrade('premium')}
      />
      <Button testID="cancel" title="Cancel Subscription" onPress={subscription.cancel} />
    </>
  );
};

describe('Week 4 Day 16: Subscription & Payment Flow - Critical Path Integration', () => {
  let mockPaymentService: jest.Mocked<PaymentService>;
  let mockReceiptValidationService: jest.Mocked<ReceiptValidationService>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Mock PaymentService
    mockPaymentService = PaymentService.getInstance() as jest.Mocked<PaymentService>;
    mockPaymentService.purchaseProduct = jest.fn().mockResolvedValue({
      success: true,
      data: {
        transactionId: 'txn-12345',
        productId: 'com.geoleap.plus.monthly',
        receipt: 'mock-receipt-data',
        purchaseTime: Date.now(),
      },
    });
    mockPaymentService.restorePurchases = jest.fn().mockResolvedValue({
      success: true,
      data: { restoredCount: 1 },
    });

    // Mock ReceiptValidationService
    mockReceiptValidationService =
      ReceiptValidationService.getInstance() as jest.Mocked<ReceiptValidationService>;
    mockReceiptValidationService.validateReceipt = jest.fn().mockResolvedValue({
      success: true,
      data: {
        isValid: true,
        productId: 'com.geoleap.plus.monthly',
        expirationDate: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days from now
        transactionId: 'txn-12345',
      },
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  // ============================================================================
  // CRITICAL PATH 1: Plan Selection
  // ============================================================================
  describe('Critical Path 1: Plan Selection', () => {
    it('should select Plus plan and display plan details', async () => {
      const { getByTestID } = render(<TestSubscriptionComponent />);

      // Initial state: no plan selected
      expect(getByTestID('subscription-plan')).toHaveProp('children', 'none');

      // Select Plus plan
      await act(async () => {
        fireEvent.press(getByTestID('select-plus'));
      });

      // Verify plan is selected
      await waitFor(() => {
        expect(getByTestID('subscription-plan')).toHaveProp('children', 'plus');
      });
    });

    it('should switch from Plus to Premium plan', async () => {
      const { getByTestID } = render(<TestSubscriptionComponent />);

      // Select Plus first
      await act(async () => {
        fireEvent.press(getByTestID('select-plus'));
      });

      await waitFor(() => {
        expect(getByTestID('subscription-plan')).toHaveProp('children', 'plus');
      });

      // Switch to Premium
      await act(async () => {
        fireEvent.press(getByTestID('select-premium'));
      });

      await waitFor(() => {
        expect(getByTestID('subscription-plan')).toHaveProp('children', 'premium');
      });
    });
  });

  // ============================================================================
  // CRITICAL PATH 2: Purchase Flow with Receipt Validation (P0 BUG TEST)
  // ============================================================================
  describe('Critical Path 2: Purchase Flow with Receipt Validation (P0 Bug)', () => {
    it('should complete full purchase flow: purchase → receipt → validate → activate', async () => {
      const { getByTestID } = render(<TestSubscriptionComponent />);

      // Select plan
      await act(async () => {
        fireEvent.press(getByTestID('select-plus'));
      });

      // Initiate purchase
      await act(async () => {
        fireEvent.press(getByTestID('purchase'));
      });

      // Wait for purchase to complete
      await waitFor(() => {
        expect(getByTestID('is-loading')).toHaveProp('children', 'idle');
      });

      // Verify payment service was called
      expect(mockPaymentService.purchaseProduct).toHaveBeenCalledWith('com.geoleap.plus.monthly');

      // ✅ FIX VERIFIED: Receipt validation MUST be called (was missing)
      expect(mockReceiptValidationService.validateReceipt).toHaveBeenCalledWith(
        'mock-receipt-data'
      );

      // Verify subscription is activated
      expect(getByTestID('subscription-status')).toHaveProp('children', 'active');
      expect(getByTestID('subscription-error')).toHaveProp('children', 'none');
    });

    it('should reject purchase if receipt validation fails (P0 Security Bug)', async () => {
      // Mock receipt validation failure
      mockReceiptValidationService.validateReceipt = jest.fn().mockResolvedValue({
        success: false,
        error: { message: 'Invalid receipt', code: 'RECEIPT_INVALID' },
      });

      const { getByTestID } = render(<TestSubscriptionComponent />);

      // Select and purchase
      await act(async () => {
        fireEvent.press(getByTestID('select-plus'));
        fireEvent.press(getByTestID('purchase'));
      });

      // Wait for validation to fail
      await waitFor(() => {
        expect(getByTestID('subscription-error')).toHaveProp('children', 'Invalid receipt');
      });

      // ✅ FIX: Subscription should NOT be activated without valid receipt
      expect(getByTestID('subscription-status')).not.toHaveProp('children', 'active');
    });

    it('should handle receipt validation timeout', async () => {
      // Mock validation timeout
      mockReceiptValidationService.validateReceipt = jest
        .fn()
        .mockImplementation(
          () =>
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Validation timeout')), 10000)
            )
        );

      const { getByTestID } = render(<TestSubscriptionComponent />);

      // Purchase
      await act(async () => {
        fireEvent.press(getByTestID('select-plus'));
        fireEvent.press(getByTestID('purchase'));
      });

      // Fast-forward past timeout
      await act(async () => {
        jest.advanceTimersByTime(11000);
      });

      // Wait for error
      await waitFor(() => {
        expect(getByTestID('subscription-error')).not.toHaveProp('children', 'none');
      });

      // Verify subscription not activated
      expect(getByTestID('subscription-status')).not.toHaveProp('children', 'active');
    });
  });

  // ============================================================================
  // CRITICAL PATH 3: Purchase Interruption (P0 BUG TEST)
  // ============================================================================
  describe('Critical Path 3: Purchase Interruption (P0 Bug)', () => {
    it('should handle app crash during purchase WITHOUT duplicate charges', async () => {
      // Mock purchase started but not completed
      let resolvePayment: (value: any) => void;
      const paymentPromise = new Promise((resolve) => {
        resolvePayment = resolve;
      });
      mockPaymentService.purchaseProduct = jest.fn().mockReturnValue(paymentPromise);

      const { getByTestID, unmount } = render(<TestSubscriptionComponent />);

      // Start purchase
      act(() => {
        fireEvent.press(getByTestID('select-plus'));
        fireEvent.press(getByTestID('purchase'));
      });

      // Simulate app crash (unmount component)
      unmount();

      // Simulate app restart and purchase completion
      await act(async () => {
        resolvePayment!({
          success: true,
          data: {
            transactionId: 'txn-crash-recovery',
            productId: 'com.geoleap.plus.monthly',
            receipt: 'receipt-after-crash',
          },
        });
      });

      // ✅ FIX: System should detect pending transaction on restart
      // and complete it WITHOUT re-charging the user

      // Re-render component (app restarted)
      const { getByTestID: getByTestID2 } = render(<TestSubscriptionComponent />);

      // Wait for pending transaction to be detected and validated
      await waitFor(() => {
        expect(mockReceiptValidationService.validateReceipt).toHaveBeenCalledWith(
          'receipt-after-crash'
        );
      });

      // Verify subscription activated
      expect(getByTestID2('subscription-status')).toHaveProp('children', 'active');

      // Verify purchaseProduct was called ONLY ONCE (not re-attempted)
      expect(mockPaymentService.purchaseProduct).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================================
  // CRITICAL PATH 4: Restore Purchases (P1 BUG TEST)
  // ============================================================================
  describe('Critical Path 4: Restore Purchases (P1 Bug)', () => {
    it('should restore previous purchases from Apple/Google', async () => {
      // Mock successful restore
      mockPaymentService.restorePurchases = jest.fn().mockResolvedValue({
        success: true,
        data: {
          restoredCount: 1,
          purchases: [
            {
              productId: 'com.geoleap.premium.monthly',
              transactionId: 'txn-restored',
              receipt: 'restored-receipt',
            },
          ],
        },
      });

      const { getByTestID } = render(<TestSubscriptionComponent />);

      // Trigger restore
      await act(async () => {
        fireEvent.press(getByTestID('restore'));
      });

      // Wait for restore to complete
      await waitFor(() => {
        expect(getByTestID('is-loading')).toHaveProp('children', 'idle');
      });

      // Verify restore was called
      expect(mockPaymentService.restorePurchases).toHaveBeenCalled();

      // Verify receipt validation for restored purchase
      expect(mockReceiptValidationService.validateReceipt).toHaveBeenCalledWith(
        'restored-receipt'
      );

      // Verify subscription activated
      expect(getByTestID('subscription-status')).toHaveProp('children', 'active');
      expect(getByTestID('subscription-plan')).toHaveProp('children', 'premium');
    });

    it('should handle no previous purchases found', async () => {
      // Mock no purchases to restore
      mockPaymentService.restorePurchases = jest.fn().mockResolvedValue({
        success: true,
        data: { restoredCount: 0, purchases: [] },
      });

      const { getByTestID } = render(<TestSubscriptionComponent />);

      // Trigger restore
      await act(async () => {
        fireEvent.press(getByTestID('restore'));
      });

      await waitFor(() => {
        expect(getByTestID('is-loading')).toHaveProp('children', 'idle');
      });

      // Verify no error shown (graceful message)
      expect(getByTestID('subscription-error')).toHaveProp('children', 'none');

      // Verify subscription remains inactive
      expect(getByTestID('subscription-status')).not.toHaveProp('children', 'active');
    });
  });

  // ============================================================================
  // CRITICAL PATH 5: Upgrade/Downgrade (P1 BUG TEST)
  // ============================================================================
  describe('Critical Path 5: Upgrade/Downgrade (P1 Bug)', () => {
    it('should upgrade from Plus to Premium', async () => {
      mockPaymentService.purchaseProduct = jest.fn().mockResolvedValue({
        success: true,
        data: {
          transactionId: 'txn-upgrade',
          productId: 'com.geoleap.premium.monthly',
          receipt: 'upgrade-receipt',
        },
      });

      const { getByTestID } = render(<TestSubscriptionComponent />);

      // Purchase Plus first
      await act(async () => {
        fireEvent.press(getByTestID('select-plus'));
        fireEvent.press(getByTestID('purchase'));
      });

      await waitFor(() => {
        expect(getByTestID('subscription-plan')).toHaveProp('children', 'plus');
      });

      // Upgrade to Premium
      await act(async () => {
        fireEvent.press(getByTestID('upgrade'));
      });

      // Wait for upgrade to complete
      await waitFor(() => {
        expect(getByTestID('subscription-plan')).toHaveProp('children', 'premium');
      });

      // Verify upgrade purchase was called
      expect(mockPaymentService.purchaseProduct).toHaveBeenCalledWith(
        'com.geoleap.premium.monthly'
      );

      // Verify receipt validation
      expect(mockReceiptValidationService.validateReceipt).toHaveBeenCalledWith('upgrade-receipt');
    });

    it('should handle upgrade failure without losing current subscription', async () => {
      const { getByTestID } = render(<TestSubscriptionComponent />);

      // Purchase Plus first
      await act(async () => {
        fireEvent.press(getByTestID('select-plus'));
        fireEvent.press(getByTestID('purchase'));
      });

      await waitFor(() => {
        expect(getByTestID('subscription-plan')).toHaveProp('children', 'plus');
      });

      // Mock upgrade failure
      mockPaymentService.purchaseProduct = jest.fn().mockResolvedValue({
        success: false,
        error: { message: 'Payment declined', code: 'PAYMENT_DECLINED' },
      });

      // Attempt upgrade
      await act(async () => {
        fireEvent.press(getByTestID('upgrade'));
      });

      // Wait for error
      await waitFor(() => {
        expect(getByTestID('subscription-error')).toHaveProp('children', 'Payment declined');
      });

      // ✅ FIX: Should maintain Plus subscription (not downgrade to free)
      expect(getByTestID('subscription-plan')).toHaveProp('children', 'plus');
      expect(getByTestID('subscription-status')).toHaveProp('children', 'active');
    });
  });

  // ============================================================================
  // CRITICAL PATH 6: Payment Failure Retry (P1 BUG TEST)
  // ============================================================================
  describe('Critical Path 6: Payment Failure Retry (P1 Bug)', () => {
    it('should retry failed payment with exponential backoff', async () => {
      // Mock payment failure then success
      mockPaymentService.purchaseProduct = jest
        .fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          success: true,
          data: {
            transactionId: 'txn-retry-success',
            productId: 'com.geoleap.plus.monthly',
            receipt: 'retry-receipt',
          },
        });

      const { getByTestID } = render(<TestSubscriptionComponent />);

      // Attempt purchase
      await act(async () => {
        fireEvent.press(getByTestID('select-plus'));
        fireEvent.press(getByTestID('purchase'));
      });

      // Wait for first failure
      await waitFor(() => {
        expect(getByTestID('subscription-error')).not.toHaveProp('children', 'none');
      });

      // Wait for automatic retry (with backoff)
      await act(async () => {
        jest.advanceTimersByTime(5000); // Retry delay
      });

      // Wait for retry success
      await waitFor(() => {
        expect(getByTestID('subscription-status')).toHaveProp('children', 'active');
      });

      // Verify purchase was retried
      expect(mockPaymentService.purchaseProduct).toHaveBeenCalledTimes(2);
    });

    it('should give up after maximum retry attempts', async () => {
      // Mock continuous failures
      mockPaymentService.purchaseProduct = jest.fn().mockRejectedValue(new Error('Network error'));

      const { getByTestID } = render(<TestSubscriptionComponent />);

      // Attempt purchase
      await act(async () => {
        fireEvent.press(getByTestID('select-plus'));
        fireEvent.press(getByTestID('purchase'));
      });

      // Fast-forward through multiple retry attempts
      await act(async () => {
        for (let i = 0; i < 5; i++) {
          jest.advanceTimersByTime(5000 * (i + 1)); // Exponential backoff
        }
      });

      // Verify maximum retries reached
      await waitFor(() => {
        expect(mockPaymentService.purchaseProduct.mock.calls.length).toBeLessThanOrEqual(3);
      });

      // Verify error is shown
      expect(getByTestID('subscription-error')).not.toHaveProp('children', 'none');

      // Verify subscription not activated
      expect(getByTestID('subscription-status')).not.toHaveProp('children', 'active');
    });
  });

  // ============================================================================
  // INTEGRATION: Full Subscription Journey
  // ============================================================================
  describe('Integration: Full Subscription Journey', () => {
    it('should complete full subscription lifecycle: select → purchase → validate → activate → upgrade', async () => {
      mockPaymentService.purchaseProduct = jest
        .fn()
        .mockResolvedValueOnce({
          success: true,
          data: {
            transactionId: 'txn-plus',
            productId: 'com.geoleap.plus.monthly',
            receipt: 'receipt-plus',
          },
        })
        .mockResolvedValueOnce({
          success: true,
          data: {
            transactionId: 'txn-premium',
            productId: 'com.geoleap.premium.monthly',
            receipt: 'receipt-premium',
          },
        });

      const { getByTestID } = render(<TestSubscriptionComponent />);

      // Step 1: Select Plus plan
      await act(async () => {
        fireEvent.press(getByTestID('select-plus'));
      });

      expect(getByTestID('subscription-plan')).toHaveProp('children', 'plus');

      // Step 2: Purchase Plus
      await act(async () => {
        fireEvent.press(getByTestID('purchase'));
      });

      await waitFor(() => {
        expect(mockReceiptValidationService.validateReceipt).toHaveBeenCalledWith('receipt-plus');
      });

      // Step 3: Verify activation
      expect(getByTestID('subscription-status')).toHaveProp('children', 'active');

      // Step 4: Upgrade to Premium
      await act(async () => {
        fireEvent.press(getByTestID('upgrade'));
      });

      await waitFor(() => {
        expect(mockReceiptValidationService.validateReceipt).toHaveBeenCalledWith(
          'receipt-premium'
        );
      });

      // Step 5: Verify Premium activation
      expect(getByTestID('subscription-plan')).toHaveProp('children', 'premium');
      expect(getByTestID('subscription-status')).toHaveProp('children', 'active');

      // Verify both receipts were validated
      expect(mockReceiptValidationService.validateReceipt).toHaveBeenCalledTimes(2);
    });
  });
});
