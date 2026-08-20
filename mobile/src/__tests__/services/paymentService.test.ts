/**
 * PaymentService Integration Tests
 * Tests real business logic with minimal mocking (MSW for API responses only)
 */

import { PaymentService, Subscription, PaymentMethod, PurchaseResult } from '../../services/payment/PaymentService';

// Mock fetch globally
global.fetch = jest.fn();

// Helper to create Response with clone() method
const createMockResponse = (data: any, ok: boolean = true): Response => {
  const response = {
    ok,
    json: async () => data,
    clone: function() {
      return { ...this };
    },
  } as unknown as Response;
  return response;
};

describe('PaymentService Integration Tests', () => {
  let paymentService: PaymentService;
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Set fake timers to a fixed date so year 2025 is in the future
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T00:00:00Z'));

    paymentService = PaymentService.getInstance();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = PaymentService.getInstance();
      const instance2 = PaymentService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('purchaseSubscription()', () => {
    it('should purchase subscription successfully', async () => {
      const mockSubscription: Subscription = {
        id: 'sub_123',
        userId: 'user_456',
        plan: 'premium',
        status: 'active',
        startDate: Date.now(),
        endDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
        autoRenew: true,
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(({
          subscriptionId: 'sub_123',
          subscription: mockSubscription,
        }), true));

      const result = await paymentService.purchaseSubscription('premium_plan', 'pm_card_123');

      expect(result.success).toBe(true);
      expect(result.transactionId).toBe('sub_123');
      expect(result.subscription).toEqual(mockSubscription);

      // Verify fetch was called
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should validate planId is required', async () => {
      const result = await paymentService.purchaseSubscription('', 'pm_card_123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Plan ID is required');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should validate planId is not whitespace only', async () => {
      const result = await paymentService.purchaseSubscription('   ', 'pm_card_123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Plan ID is required');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should validate paymentMethodId is required', async () => {
      const result = await paymentService.purchaseSubscription('premium_plan', '');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Payment method ID is required');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should validate paymentMethodId is not whitespace only', async () => {
      const result = await paymentService.purchaseSubscription('premium_plan', '   ');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Payment method ID is required');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle API error responses', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(({
          error: 'Insufficient funds',
        }), false));

      const result = await paymentService.purchaseSubscription('premium_plan', 'pm_card_123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient funds');
    });

    it('should handle API error without error message', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(({}), false));

      const result = await paymentService.purchaseSubscription('premium_plan', 'pm_card_123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Purchase failed');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network request failed'));

      const result = await paymentService.purchaseSubscription('premium_plan', 'pm_card_123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network request failed');
    });

    it('should handle non-Error exceptions', async () => {
      mockFetch.mockRejectedValueOnce('Unknown error');

      const result = await paymentService.purchaseSubscription('premium_plan', 'pm_card_123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error occurred');
    });
  });

  describe('getActiveSubscription()', () => {
    it('should get active subscription', async () => {
      const mockSubscription: Subscription = {
        id: 'sub_123',
        userId: 'user_456',
        plan: 'premium',
        status: 'active',
        startDate: Date.now(),
        endDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
        autoRenew: true,
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(({
          subscription: mockSubscription,
        }), true));

      const result = await paymentService.getActiveSubscription('user_456');

      expect(result).toEqual(mockSubscription);

      // Verify fetch was called
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should return null if no subscription', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(({}), true));

      const result = await paymentService.getActiveSubscription('user_456');

      expect(result).toBeNull();
    });

    it('should return null on API error', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(({ error: 'Unauthorized' }), false));

      const result = await paymentService.getActiveSubscription('user_456');

      expect(result).toBeNull();
    });

    it('should return null and log error on network failure', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await paymentService.getActiveSubscription('user_456');

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to get active subscription:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('cancelSubscription()', () => {
    it('should cancel subscription successfully', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(({ success: true }), true));

      const result = await paymentService.cancelSubscription('sub_123');

      expect(result).toBe(true);

      // Verify fetch was called
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should return false on API error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockFetch.mockResolvedValueOnce(createMockResponse(({ error: 'Subscription not found' }), false));

      const result = await paymentService.cancelSubscription('sub_invalid');

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to cancel subscription:',
        'Subscription not found'
      );

      consoleErrorSpy.mockRestore();
    });

    it('should return false and log error on network failure', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await paymentService.cancelSubscription('sub_123');

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to cancel subscription:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('addPaymentMethod()', () => {
    it('should add credit card payment method successfully', async () => {
      const mockPaymentMethod: PaymentMethod = {
        id: 'pm_card_123',
        type: 'credit_card',
        last4: '4242',
        expiryMonth: 12,
        expiryYear: 2025,
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(({ paymentMethod: mockPaymentMethod }), true));

      const result = await paymentService.addPaymentMethod({
        type: 'credit_card',
        last4: '4242',
        expiryMonth: 12,
        expiryYear: 2025,
      });

      expect(result).toEqual(mockPaymentMethod);

      // Verify fetch was called
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should add PayPal payment method successfully', async () => {
      const mockPaymentMethod: PaymentMethod = {
        id: 'pm_paypal_123',
        type: 'paypal',
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(({ paymentMethod: mockPaymentMethod }), true));

      const result = await paymentService.addPaymentMethod({
        type: 'paypal',
      });

      expect(result).toEqual(mockPaymentMethod);
    });

    it('should validate card expiry - reject expired card (year)', async () => {
      const currentDate = new Date();
      const expiredYear = currentDate.getFullYear() - 1;

      await expect(
        paymentService.addPaymentMethod({
          type: 'credit_card',
          last4: '4242',
          expiryMonth: 12,
          expiryYear: expiredYear,
        })
      ).rejects.toThrow('Card has expired');

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should validate card expiry - reject expired card (month)', async () => {
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;
      const expiredMonth = currentMonth - 1;

      // Only test if not January (month 1)
      if (currentMonth > 1) {
        await expect(
          paymentService.addPaymentMethod({
            type: 'credit_card',
            last4: '4242',
            expiryMonth: expiredMonth,
            expiryYear: currentYear,
          })
        ).rejects.toThrow('Card has expired');

        expect(mockFetch).not.toHaveBeenCalled();
      }
    });

    it('should accept card expiring this month', async () => {
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;

      const mockPaymentMethod: PaymentMethod = {
        id: 'pm_card_123',
        type: 'credit_card',
        last4: '4242',
        expiryMonth: currentMonth,
        expiryYear: currentYear,
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(({ paymentMethod: mockPaymentMethod }), true));

      const result = await paymentService.addPaymentMethod({
        type: 'credit_card',
        last4: '4242',
        expiryMonth: currentMonth,
        expiryYear: currentYear,
      });

      expect(result).toEqual(mockPaymentMethod);
    });

    it('should accept card expiring in future', async () => {
      const mockPaymentMethod: PaymentMethod = {
        id: 'pm_card_123',
        type: 'credit_card',
        last4: '4242',
        expiryMonth: 12,
        expiryYear: 2030,
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(({ paymentMethod: mockPaymentMethod }), true));

      const result = await paymentService.addPaymentMethod({
        type: 'credit_card',
        last4: '4242',
        expiryMonth: 12,
        expiryYear: 2030,
      });

      expect(result).toEqual(mockPaymentMethod);
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(({ error: 'Invalid card number' }), false));

      await expect(
        paymentService.addPaymentMethod({
          type: 'credit_card',
          last4: '0000',
          expiryMonth: 12,
          expiryYear: 2025,
        })
      ).rejects.toThrow('Failed to add payment method');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        paymentService.addPaymentMethod({
          type: 'credit_card',
          last4: '4242',
          expiryMonth: 12,
          expiryYear: 2025,
        })
      ).rejects.toThrow('Network error');
    });

    it('should allow credit card without expiry fields', async () => {
      const mockPaymentMethod: PaymentMethod = {
        id: 'pm_card_123',
        type: 'credit_card',
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(({ paymentMethod: mockPaymentMethod }), true));

      const result = await paymentService.addPaymentMethod({
        type: 'credit_card',
      });

      expect(result).toEqual(mockPaymentMethod);
    });

    it('should not validate expiry for non-credit-card types', async () => {
      const mockPaymentMethod: PaymentMethod = {
        id: 'pm_apple_123',
        type: 'apple_pay',
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(({ paymentMethod: mockPaymentMethod }), true));

      // Even with expired date fields, should not validate for non-credit-card
      const result = await paymentService.addPaymentMethod({
        type: 'apple_pay',
      });

      expect(result).toEqual(mockPaymentMethod);
    });
  });

  describe('getPaymentMethods()', () => {
    it('should get payment methods successfully', async () => {
      const mockPaymentMethods: PaymentMethod[] = [
        {
          id: 'pm_card_123',
          type: 'credit_card',
          last4: '4242',
          expiryMonth: 12,
          expiryYear: 2025,
        },
        {
          id: 'pm_paypal_456',
          type: 'paypal',
        },
      ];

      mockFetch.mockResolvedValueOnce(createMockResponse(({ paymentMethods: mockPaymentMethods }), true));

      const result = await paymentService.getPaymentMethods('user_456');

      expect(result).toEqual(mockPaymentMethods);

      // Verify fetch was called
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should return empty array if no payment methods', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(({}), true));

      const result = await paymentService.getPaymentMethods('user_456');

      expect(result).toEqual([]);
    });

    it('should return empty array on API error', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(({ error: 'Unauthorized' }), false));

      const result = await paymentService.getPaymentMethods('user_456');

      expect(result).toEqual([]);
    });

    it('should return empty array and log error on network failure', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await paymentService.getPaymentMethods('user_456');

      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to get payment methods:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('removePaymentMethod()', () => {
    it('should remove payment method when multiple methods exist', async () => {
      const mockPaymentMethods: PaymentMethod[] = [
        { id: 'pm_card_123', type: 'credit_card', last4: '4242' },
        { id: 'pm_paypal_456', type: 'paypal' },
      ];

      const mockSubscription: Subscription = {
        id: 'sub_123',
        userId: 'user_456',
        plan: 'premium',
        status: 'active',
        startDate: Date.now(),
        endDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
        autoRenew: true,
      };

      // Mock getPaymentMethods
      mockFetch.mockResolvedValueOnce(createMockResponse(({ paymentMethods: mockPaymentMethods }), true));

      // Mock getActiveSubscription
      mockFetch.mockResolvedValueOnce(createMockResponse(({ subscription: mockSubscription }), true));

      // Mock DELETE request
      mockFetch.mockResolvedValueOnce(createMockResponse(({ success: true }), true));

      const result = await paymentService.removePaymentMethod('pm_card_123');

      expect(result).toBe(true);

      // Verify fetch call arguments (last call is the DELETE request)
      expect(mockFetch).toHaveBeenCalledTimes(3);
      const deleteUrl = mockFetch.mock.calls[2][0] as string;
      const deleteOptions = mockFetch.mock.calls[2][1] as RequestInit;
      expect(deleteUrl).toContain('/subscription/payment-method/pm_card_123');
      expect(deleteOptions.method).toBe('DELETE');
      expect(deleteOptions.headers?.['Content-Type']).toBe('application/json');
    });

    it('should prevent removing last payment method with active subscription', async () => {
      const mockPaymentMethods: PaymentMethod[] = [
        { id: 'pm_card_123', type: 'credit_card', last4: '4242' },
      ];

      const mockSubscription: Subscription = {
        id: 'sub_123',
        userId: 'user_456',
        plan: 'premium',
        status: 'active',
        startDate: Date.now(),
        endDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
        autoRenew: true,
      };

      // Mock getPaymentMethods
      mockFetch.mockResolvedValueOnce(createMockResponse(({ paymentMethods: mockPaymentMethods }), true));

      // Mock getActiveSubscription
      mockFetch.mockResolvedValueOnce(createMockResponse(({ subscription: mockSubscription }), true));

      await expect(
        paymentService.removePaymentMethod('pm_card_123')
      ).rejects.toThrow('Cannot remove last payment method with active subscription');

      // Should not call DELETE endpoint
      expect(mockFetch).toHaveBeenCalledTimes(2); // Only getPaymentMethods and getActiveSubscription
    });

    it('should allow removing last payment method with cancelled subscription', async () => {
      const mockPaymentMethods: PaymentMethod[] = [
        { id: 'pm_card_123', type: 'credit_card', last4: '4242' },
      ];

      const mockSubscription: Subscription = {
        id: 'sub_123',
        userId: 'user_456',
        plan: 'premium',
        status: 'cancelled',
        startDate: Date.now(),
        endDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
        autoRenew: false,
      };

      // Mock getPaymentMethods
      mockFetch.mockResolvedValueOnce(createMockResponse(({ paymentMethods: mockPaymentMethods }), true));

      // Mock getActiveSubscription
      mockFetch.mockResolvedValueOnce(createMockResponse(({ subscription: mockSubscription }), true));

      // Mock DELETE request
      mockFetch.mockResolvedValueOnce(createMockResponse(({ success: true }), true));

      const result = await paymentService.removePaymentMethod('pm_card_123');

      expect(result).toBe(true);
    });

    it('should allow removing last payment method with no subscription', async () => {
      const mockPaymentMethods: PaymentMethod[] = [
        { id: 'pm_card_123', type: 'credit_card', last4: '4242' },
      ];

      // Mock getPaymentMethods
      mockFetch.mockResolvedValueOnce(createMockResponse(({ paymentMethods: mockPaymentMethods }), true));

      // Mock getActiveSubscription (no subscription)
      mockFetch.mockResolvedValueOnce(createMockResponse(({}), true));

      // Mock DELETE request
      mockFetch.mockResolvedValueOnce(createMockResponse(({ success: true }), true));

      const result = await paymentService.removePaymentMethod('pm_card_123');

      expect(result).toBe(true);
    });

    it('should return false on DELETE API error', async () => {
      const mockPaymentMethods: PaymentMethod[] = [
        { id: 'pm_card_123', type: 'credit_card', last4: '4242' },
        { id: 'pm_paypal_456', type: 'paypal' },
      ];

      // Mock getPaymentMethods
      mockFetch.mockResolvedValueOnce(createMockResponse(({ paymentMethods: mockPaymentMethods }), true));

      // Mock getActiveSubscription
      mockFetch.mockResolvedValueOnce(createMockResponse(({}), false));

      // Mock DELETE request failure
      mockFetch.mockResolvedValueOnce(createMockResponse(({ error: 'Payment method not found' }), false));

      const result = await paymentService.removePaymentMethod('pm_invalid');

      expect(result).toBe(false);
    });
  });

  describe('Integration Flows', () => {
    it('should support complete subscription purchase flow', async () => {
      // Step 1: Add payment method
      const mockPaymentMethod: PaymentMethod = {
        id: 'pm_card_123',
        type: 'credit_card',
        last4: '4242',
        expiryMonth: 12,
        expiryYear: 2025,
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(({ paymentMethod: mockPaymentMethod }), true));

      const paymentMethod = await paymentService.addPaymentMethod({
        type: 'credit_card',
        last4: '4242',
        expiryMonth: 12,
        expiryYear: 2025,
      });

      expect(paymentMethod.id).toBe('pm_card_123');

      // Step 2: Purchase subscription
      const mockSubscription: Subscription = {
        id: 'sub_123',
        userId: 'user_456',
        plan: 'premium',
        status: 'active',
        startDate: Date.now(),
        endDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
        autoRenew: true,
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(({
          subscriptionId: 'sub_123',
          subscription: mockSubscription,
        }), true));

      const purchaseResult = await paymentService.purchaseSubscription('premium_plan', paymentMethod.id);

      expect(purchaseResult.success).toBe(true);
      expect(purchaseResult.subscription?.status).toBe('active');
    });

    it('should support subscription cancellation flow', async () => {
      // Step 1: Get active subscription
      const mockSubscription: Subscription = {
        id: 'sub_123',
        userId: 'user_456',
        plan: 'premium',
        status: 'active',
        startDate: Date.now(),
        endDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
        autoRenew: true,
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(({ subscription: mockSubscription }), true));

      const subscription = await paymentService.getActiveSubscription('user_456');

      expect(subscription?.status).toBe('active');

      // Step 2: Cancel subscription
      mockFetch.mockResolvedValueOnce(createMockResponse(({ success: true }), true));

      const cancelResult = await paymentService.cancelSubscription(subscription!.id);

      expect(cancelResult).toBe(true);
    });

    it('should support payment method management flow', async () => {
      // Step 1: Get current payment methods
      const mockPaymentMethods: PaymentMethod[] = [
        { id: 'pm_card_old', type: 'credit_card', last4: '1234' },
      ];

      mockFetch.mockResolvedValueOnce(createMockResponse(({ paymentMethods: mockPaymentMethods }), true));

      const currentMethods = await paymentService.getPaymentMethods('user_456');

      expect(currentMethods).toHaveLength(1);

      // Step 2: Add new payment method
      const mockNewPaymentMethod: PaymentMethod = {
        id: 'pm_card_new',
        type: 'credit_card',
        last4: '4242',
        expiryMonth: 12,
        expiryYear: 2025,
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(({ paymentMethod: mockNewPaymentMethod }), true));

      const newMethod = await paymentService.addPaymentMethod({
        type: 'credit_card',
        last4: '4242',
        expiryMonth: 12,
        expiryYear: 2025,
      });

      expect(newMethod.id).toBe('pm_card_new');

      // Step 3: Remove old payment method
      const mockUpdatedPaymentMethods: PaymentMethod[] = [
        { id: 'pm_card_old', type: 'credit_card', last4: '1234' },
        { id: 'pm_card_new', type: 'credit_card', last4: '4242' },
      ];

      // Mock getPaymentMethods for removal check
      mockFetch.mockResolvedValueOnce(createMockResponse(({ paymentMethods: mockUpdatedPaymentMethods }), true));

      // Mock getActiveSubscription
      mockFetch.mockResolvedValueOnce(createMockResponse(({ subscription: null }), true));

      // Mock DELETE request
      mockFetch.mockResolvedValueOnce(createMockResponse(({ success: true }), true));

      const removeResult = await paymentService.removePaymentMethod('pm_card_old');

      expect(removeResult).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle malformed JSON responses gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
        clone: function() {
          return { ...this };
        },
      } as unknown as Response);

      const result = await paymentService.getActiveSubscription('user_456');

      expect(result).toBeNull();
    });

    it('should handle undefined userId in getActiveSubscription', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(({}), true));

      const result = await paymentService.getActiveSubscription(undefined as any);

      // Service doesn't validate userId, just passes it through
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should handle card expiring next month', async () => {
      const currentDate = new Date();
      const nextMonth = currentDate.getMonth() + 2; // +2 because getMonth() is 0-indexed
      const currentYear = currentDate.getFullYear();

      const mockPaymentMethod: PaymentMethod = {
        id: 'pm_card_123',
        type: 'credit_card',
        last4: '4242',
        expiryMonth: nextMonth > 12 ? 1 : nextMonth,
        expiryYear: nextMonth > 12 ? currentYear + 1 : currentYear,
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(({ paymentMethod: mockPaymentMethod }), true));

      const result = await paymentService.addPaymentMethod({
        type: 'credit_card',
        last4: '4242',
        expiryMonth: nextMonth > 12 ? 1 : nextMonth,
        expiryYear: nextMonth > 12 ? currentYear + 1 : currentYear,
      });

      expect(result).toEqual(mockPaymentMethod);
    });
  });
});
