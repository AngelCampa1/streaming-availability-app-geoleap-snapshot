/**
 * SubscriptionNotificationService Tests
 *
 * Tests subscription-related notification management including renewal reminders,
 * payment failures, payment expiry, cancellations, and feature announcements.
 */

import { SubscriptionNotificationService, SubscriptionInfo, PaymentInfo } from '../../services/subscriptionNotificationService';
import { NotificationService } from '../../services/notificationService';
import { NotificationAnalytics } from '../../services/notificationAnalytics';
import { logger } from '../../utils/logger';

// Mock dependencies
jest.mock('../../services/notificationService');
jest.mock('../../services/notificationAnalytics');
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('SubscriptionNotificationService', () => {
  let service: SubscriptionNotificationService;
  let mockNotificationService: jest.Mocked<NotificationService>;
  let mockAnalytics: jest.Mocked<NotificationAnalytics>;

  const mockSubscription: SubscriptionInfo = {
    id: 'sub_123',
    service: 'Netflix',
    userId: 'user_456',
    renewalDate: new Date('2025-02-01'),
    amount: 15.99,
    currency: '$',
    status: 'active',
  };

  const mockPayment: PaymentInfo = {
    method: 'Visa',
    lastFour: '4242',
    expiryDate: new Date('2025-12-31'),
    status: 'valid',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock instances
    mockNotificationService = {
      sendNotification: jest.fn().mockResolvedValue(undefined),
      getInstance: jest.fn(),
    } as any;

    mockAnalytics = {
      trackEvent: jest.fn().mockResolvedValue(undefined),
      getInstance: jest.fn(),
    } as any;

    // Mock the getInstance calls
    (NotificationService.getInstance as jest.Mock).mockReturnValue(mockNotificationService);
    (NotificationAnalytics.getInstance as jest.Mock).mockReturnValue(mockAnalytics);

    service = new SubscriptionNotificationService();
  });

  describe('Renewal Reminders', () => {
    it('should send high-priority reminder when renewing tomorrow', async () => {
      await service.sendRenewalReminder(mockSubscription, 1);

      expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '⏰ Netflix renews tomorrow',
          body: 'Your subscription renews for $15.99',
          priority: 'high',
          category: 'subscription',
        })
      );

      expect(mockAnalytics.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'received',
          templateId: 'subscription_renewal',
          category: 'subscription',
          priority: 'high',
        })
      );
    });

    it('should send high-priority reminder when renewing in 3 days', async () => {
      await service.sendRenewalReminder(mockSubscription, 3);

      expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '📅 Netflix renews in 3 days',
          body: expect.stringContaining('$15.99'),
          priority: 'high',
        })
      );
    });

    it('should send normal-priority reminder when renewing in 7 days', async () => {
      await service.sendRenewalReminder(mockSubscription, 7);

      expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '📅 Netflix renews in 7 days',
          priority: 'normal',
        })
      );
    });

    it('should send normal-priority reminder for 4-6 days', async () => {
      await service.sendRenewalReminder(mockSubscription, 5);

      expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '📅 Netflix renews in 5 days',
          priority: 'normal',
        })
      );
    });

    it('should not send reminder for more than 7 days', async () => {
      await service.sendRenewalReminder(mockSubscription, 8);

      expect(mockNotificationService.sendNotification).not.toHaveBeenCalled();
      expect(mockAnalytics.trackEvent).not.toHaveBeenCalled();
    });

    it('should not send reminder for 30 days', async () => {
      await service.sendRenewalReminder(mockSubscription, 30);

      expect(mockNotificationService.sendNotification).not.toHaveBeenCalled();
    });

    it('should include correct notification data for renewal', async () => {
      await service.sendRenewalReminder(mockSubscription, 1);

      const call = mockNotificationService.sendNotification.mock.calls[0][0];
      expect(call.data).toMatchObject({
        type: 'subscription_renewal',
        subscriptionId: 'sub_123',
        service: 'Netflix',
        amount: '15.99',
        currency: '$',
        daysUntilRenewal: '1',
        deepLink: 'geoleap://subscriptions/sub_123',
      });
    });

    it('should include renewal reminder actions', async () => {
      await service.sendRenewalReminder(mockSubscription, 1);

      const call = mockNotificationService.sendNotification.mock.calls[0][0];
      expect(call.actions).toHaveLength(2);
      expect(call.actions[0].id).toBe('manage_subscription');
      expect(call.actions[1].id).toBe('view_billing');
    });

    it('should throw error when notification service fails', async () => {
      mockNotificationService.sendNotification.mockRejectedValueOnce(new Error('Send failed'));

      await expect(service.sendRenewalReminder(mockSubscription, 1)).rejects.toThrow('Send failed');
      expect(logger.error).toHaveBeenCalledWith(
        '[SubscriptionNotificationService] Failed to send renewal reminder',
        expect.any(Error)
      );
    });

    it('should throw error when analytics tracking fails', async () => {
      mockAnalytics.trackEvent.mockRejectedValueOnce(new Error('Analytics failed'));

      await expect(service.sendRenewalReminder(mockSubscription, 1)).rejects.toThrow('Analytics failed');
    });
  });

  describe('Payment Failed Notifications', () => {
    it('should send high-priority payment failed notification', async () => {
      await service.sendPaymentFailedNotification(mockSubscription, mockPayment);

      expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '💳 Payment failed for Netflix',
          body: 'Update your payment method to continue your subscription',
          priority: 'high',
          category: 'subscription',
        })
      );
    });

    it('should include correct payment failed data', async () => {
      await service.sendPaymentFailedNotification(mockSubscription, mockPayment);

      const call = mockNotificationService.sendNotification.mock.calls[0][0];
      expect(call.data).toMatchObject({
        type: 'payment_failed',
        subscriptionId: 'sub_123',
        service: 'Netflix',
        paymentMethod: 'Visa ****4242',
        deepLink: 'geoleap://account/payment-methods',
      });
    });

    it('should include payment failed actions', async () => {
      await service.sendPaymentFailedNotification(mockSubscription, mockPayment);

      const call = mockNotificationService.sendNotification.mock.calls[0][0];
      expect(call.actions).toHaveLength(2);
      expect(call.actions[0].id).toBe('update_payment');
      expect(call.actions[1].id).toBe('retry_payment');
    });

    it('should track payment failed analytics', async () => {
      await service.sendPaymentFailedNotification(mockSubscription, mockPayment);

      expect(mockAnalytics.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'received',
          templateId: 'payment_failed',
          category: 'subscription',
          priority: 'high',
          metadata: expect.objectContaining({
            service: 'Netflix',
            payment_method: 'Visa',
          }),
        })
      );
    });

    it('should throw error when payment failed notification fails', async () => {
      mockNotificationService.sendNotification.mockRejectedValueOnce(new Error('Failed'));

      await expect(service.sendPaymentFailedNotification(mockSubscription, mockPayment)).rejects.toThrow();
      expect(logger.error).toHaveBeenCalledWith(
        '[SubscriptionNotificationService] Failed to send payment failed notification',
        expect.any(Error)
      );
    });
  });

  describe('Payment Expiry Notifications', () => {
    it('should send high-priority notification when payment expired', async () => {
      await service.sendPaymentExpiryNotification(mockPayment, 0);

      expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '💳 Payment method expired',
          priority: 'high',
        })
      );
    });

    it('should send high-priority notification when expiring in 7 days', async () => {
      await service.sendPaymentExpiryNotification(mockPayment, 7);

      expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '💳 Payment method expires in 7 days',
          priority: 'high',
        })
      );
    });

    it('should send high-priority notification for 1-6 days', async () => {
      await service.sendPaymentExpiryNotification(mockPayment, 3);

      expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '💳 Payment method expires in 3 days',
          priority: 'high',
        })
      );
    });

    it('should send normal-priority notification when expiring in 8-30 days', async () => {
      await service.sendPaymentExpiryNotification(mockPayment, 15);

      expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '💳 Payment method expires soon',
          body: 'Update your Visa ending in 4242',
          priority: 'normal',
        })
      );
    });

    it('should not send notification for more than 30 days', async () => {
      await service.sendPaymentExpiryNotification(mockPayment, 31);

      expect(mockNotificationService.sendNotification).not.toHaveBeenCalled();
      expect(mockAnalytics.trackEvent).not.toHaveBeenCalled();
    });

    it('should not send notification for exactly 31 days', async () => {
      await service.sendPaymentExpiryNotification(mockPayment, 35);

      expect(mockNotificationService.sendNotification).not.toHaveBeenCalled();
    });

    it('should include correct payment expiry data', async () => {
      await service.sendPaymentExpiryNotification(mockPayment, 7);

      const call = mockNotificationService.sendNotification.mock.calls[0][0];
      expect(call.data).toMatchObject({
        type: 'payment_expiry',
        paymentMethod: 'Visa ****4242',
        daysUntilExpiry: '7',
        deepLink: 'geoleap://account/payment-methods',
      });
    });

    it('should include payment expiry actions', async () => {
      await service.sendPaymentExpiryNotification(mockPayment, 7);

      const call = mockNotificationService.sendNotification.mock.calls[0][0];
      expect(call.actions).toHaveLength(2);
      expect(call.actions[0].id).toBe('update_payment');
      expect(call.actions[1].id).toBe('add_payment');
    });

    it('should track payment expiry analytics', async () => {
      await service.sendPaymentExpiryNotification(mockPayment, 7);

      expect(mockAnalytics.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'received',
          templateId: 'payment_expiry',
          category: 'subscription',
          metadata: expect.objectContaining({
            payment_method: 'Visa',
            days_until_expiry: 7,
          }),
        })
      );
    });

    it('should throw error when payment expiry notification fails', async () => {
      mockNotificationService.sendNotification.mockRejectedValueOnce(new Error('Failed'));

      await expect(service.sendPaymentExpiryNotification(mockPayment, 7)).rejects.toThrow();
      expect(logger.error).toHaveBeenCalledWith(
        '[SubscriptionNotificationService] Failed to send payment expiry notification',
        expect.any(Error)
      );
    });
  });

  describe('Cancellation Confirmation', () => {
    const accessUntil = new Date('2025-03-01');

    it('should send cancellation confirmation notification', async () => {
      await service.sendCancellationConfirmation(mockSubscription, accessUntil);

      expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '✅ Netflix subscription cancelled',
          body: expect.stringContaining('have access until'),
          priority: 'normal',
          category: 'subscription',
        })
      );
    });

    it('should include correct cancellation data', async () => {
      await service.sendCancellationConfirmation(mockSubscription, accessUntil);

      const call = mockNotificationService.sendNotification.mock.calls[0][0];
      expect(call.data).toMatchObject({
        type: 'subscription_cancelled',
        subscriptionId: 'sub_123',
        service: 'Netflix',
        accessUntil: accessUntil.toISOString(),
        deepLink: 'geoleap://subscriptions/sub_123',
      });
    });

    it('should include cancellation actions', async () => {
      await service.sendCancellationConfirmation(mockSubscription, accessUntil);

      const call = mockNotificationService.sendNotification.mock.calls[0][0];
      expect(call.actions).toHaveLength(2);
      expect(call.actions[0].id).toBe('reactivate');
      expect(call.actions[1].id).toBe('export_data');
    });

    it('should track cancellation analytics', async () => {
      await service.sendCancellationConfirmation(mockSubscription, accessUntil);

      expect(mockAnalytics.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'received',
          templateId: 'subscription_cancelled',
          category: 'subscription',
          priority: 'normal',
          metadata: expect.objectContaining({
            service: 'Netflix',
          }),
        })
      );
    });

    it('should throw error when cancellation notification fails', async () => {
      mockNotificationService.sendNotification.mockRejectedValueOnce(new Error('Failed'));

      await expect(service.sendCancellationConfirmation(mockSubscription, accessUntil)).rejects.toThrow();
      expect(logger.error).toHaveBeenCalledWith(
        '[SubscriptionNotificationService] Failed to send cancellation confirmation',
        expect.any(Error)
      );
    });
  });

  describe('Feature Announcements', () => {
    const mockFeature = {
      title: 'Light-Only Mode',
      description: 'Experience the app in a whole new light',
      imageUrl: 'https://example.com/light-only.png',
      learnMoreUrl: 'geoleap://features/light-only/learn',
    };

    it('should send feature announcement notification', async () => {
      await service.sendFeatureAnnouncement(mockFeature);

      expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '🆕 New Feature: Light-Only Mode',
          body: 'Experience the app in a whole new light',
          priority: 'low',
          category: 'features',
        })
      );
    });

    it('should use default image when not provided', async () => {
      const featureWithoutImage = {
        title: 'New Feature',
        description: 'Test description',
        learnMoreUrl: 'geoleap://features/test',
      };

      await service.sendFeatureAnnouncement(featureWithoutImage);

      const call = mockNotificationService.sendNotification.mock.calls[0][0];
      expect(call.imageUrl).toBe('https://api.geoleap.com/images/app/new-feature.png');
    });

    it('should include correct feature announcement data', async () => {
      await service.sendFeatureAnnouncement(mockFeature);

      const call = mockNotificationService.sendNotification.mock.calls[0][0];
      expect(call.data).toMatchObject({
        type: 'feature_announcement',
        featureTitle: 'Light-Only Mode',
        deepLink: 'geoleap://features/light-only/learn',
      });
    });

    it('should include feature announcement actions', async () => {
      await service.sendFeatureAnnouncement(mockFeature);

      const call = mockNotificationService.sendNotification.mock.calls[0][0];
      expect(call.actions).toHaveLength(2);
      expect(call.actions[0].id).toBe('learn_more');
      expect(call.actions[1].id).toBe('try_feature');
      expect(call.actions[1].deepLink).toBe('geoleap://features/light-only/try');
    });

    it('should track feature announcement analytics', async () => {
      await service.sendFeatureAnnouncement(mockFeature);

      expect(mockAnalytics.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'received',
          templateId: 'feature_announcement',
          category: 'features',
          priority: 'low',
          metadata: expect.objectContaining({
            feature_title: 'Light-Only Mode',
          }),
        })
      );
    });

    it('should throw error when feature announcement fails', async () => {
      mockNotificationService.sendNotification.mockRejectedValueOnce(new Error('Failed'));

      await expect(service.sendFeatureAnnouncement(mockFeature)).rejects.toThrow();
      expect(logger.error).toHaveBeenCalledWith(
        '[SubscriptionNotificationService] Failed to send feature announcement',
        expect.any(Error)
      );
    });
  });

  describe('Constructor', () => {
    it('should initialize with NotificationService and NotificationAnalytics', () => {
      const newService = new SubscriptionNotificationService();

      expect(NotificationService.getInstance).toHaveBeenCalled();
      expect(NotificationAnalytics.getInstance).toHaveBeenCalled();
    });
  });
});
