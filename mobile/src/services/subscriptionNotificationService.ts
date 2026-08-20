import { NotificationService } from './notificationService';
import { NotificationAnalytics } from './notificationAnalytics';
import { logger } from '../utils/logger';

export interface SubscriptionInfo {
  id: string;
  service: string;
  userId: string;
  renewalDate: Date;
  amount: number;
  currency: string;
  status: 'active' | 'expiring' | 'expired' | 'payment_failed';
}

export interface PaymentInfo {
  method: string;
  lastFour: string;
  expiryDate: Date;
  status: 'valid' | 'expired' | 'declined';
}

export class SubscriptionNotificationService {
  private notificationService: NotificationService;
  private analytics: NotificationAnalytics;

  constructor() {
    this.notificationService = NotificationService.getInstance();
    this.analytics = NotificationAnalytics.getInstance();
  }

  /**
   * AC3: Subscription-related notifications (renewal reminders)
   */
  async sendRenewalReminder(subscription: SubscriptionInfo, daysUntilRenewal: number): Promise<void> {
    try {
      let title: string;
      let body: string;
      let priority: 'low' | 'normal' | 'high' = 'normal';

      if (daysUntilRenewal <= 1) {
        title = `⏰ ${subscription.service} renews tomorrow`;
        body = `Your subscription renews for ${subscription.currency}${subscription.amount}`;
        priority = 'high';
      } else if (daysUntilRenewal <= 3) {
        title = `📅 ${subscription.service} renews in ${daysUntilRenewal} days`;
        body = `${subscription.currency}${subscription.amount} will be charged on ${subscription.renewalDate.toLocaleDateString()}`;
        priority = 'high';
      } else if (daysUntilRenewal <= 7) {
        title = `📅 ${subscription.service} renews in ${daysUntilRenewal} days`;
        body = `Renewal scheduled for ${subscription.renewalDate.toLocaleDateString()}`;
        priority = 'normal';
      } else {
        return; // Don't send reminders more than 7 days early
      }

      const notification = {
        id: `subscription_renewal_${subscription.id}_${Date.now()}`,
        title,
        body,
        data: {
          type: 'subscription_renewal',
          subscriptionId: subscription.id,
          service: subscription.service,
          amount: subscription.amount.toString(),
          currency: subscription.currency,
          daysUntilRenewal: daysUntilRenewal.toString(),
          deepLink: `geoleap://subscriptions/${subscription.id}`,
        },
        imageUrl: `https://api.geoleap.com/images/services/${subscription.service}/logo`,
        actions: [
          {
            id: 'manage_subscription',
            title: 'Manage Subscription',
            deepLink: `geoleap://subscriptions/${subscription.id}/manage`,
          },
          {
            id: 'view_billing',
            title: 'View Billing',
            deepLink: 'geoleap://account/billing',
          },
        ],
        category: 'subscription',
        priority: priority as 'low' | 'normal' | 'high',
      };

      await this.notificationService.sendNotification(notification);

      await this.analytics.trackEvent({
        type: 'received',
        templateId: 'subscription_renewal',
        category: 'subscription',
        priority: priority as string,
        metadata: {
          service: subscription.service,
          days_until_renewal: daysUntilRenewal,
          amount: subscription.amount,
        },
      });

    } catch (error) {
      logger.error('[SubscriptionNotificationService] Failed to send renewal reminder', error);
      throw error;
    }
  }

  /**
   * AC3: Payment issue notifications
   */
  async sendPaymentFailedNotification(subscription: SubscriptionInfo, payment: PaymentInfo): Promise<void> {
    try {
      const notification = {
        id: `payment_failed_${subscription.id}_${Date.now()}`,
        title: `💳 Payment failed for ${subscription.service}`,
        body: 'Update your payment method to continue your subscription',
        data: {
          type: 'payment_failed',
          subscriptionId: subscription.id,
          service: subscription.service,
          paymentMethod: `${payment.method} ****${payment.lastFour}`,
          deepLink: 'geoleap://account/payment-methods',
        },
        imageUrl: `https://api.geoleap.com/images/services/${subscription.service}/logo`,
        actions: [
          {
            id: 'update_payment',
            title: 'Update Payment Method',
            deepLink: 'geoleap://account/payment-methods/update',
          },
          {
            id: 'retry_payment',
            title: 'Retry Payment',
            deepLink: `geoleap://subscriptions/${subscription.id}/retry-payment`,
          },
        ],
        category: 'subscription',
        priority: 'high' as 'low' | 'normal' | 'high',
      };

      await this.notificationService.sendNotification(notification);

      await this.analytics.trackEvent({
        type: 'received',
        templateId: 'payment_failed',
        category: 'subscription',
        priority: 'high',
        metadata: {
          service: subscription.service,
          payment_method: payment.method,
        },
      });

    } catch (error) {
      logger.error('[SubscriptionNotificationService] Failed to send payment failed notification', error);
      throw error;
    }
  }

  /**
   * AC3: Payment method expiry notifications
   */
  async sendPaymentExpiryNotification(payment: PaymentInfo, daysUntilExpiry: number): Promise<void> {
    try {
      if (daysUntilExpiry > 30) {return;} // Only notify within 30 days

      let title: string;
      let priority: 'low' | 'normal' | 'high' = 'normal';

      if (daysUntilExpiry <= 0) {
        title = '💳 Payment method expired';
        priority = 'high';
      } else if (daysUntilExpiry <= 7) {
        title = `💳 Payment method expires in ${daysUntilExpiry} days`;
        priority = 'high';
      } else {
        title = '💳 Payment method expires soon';
        priority = 'normal';
      }

      const notification = {
        id: `payment_expiry_${Date.now()}`,
        title,
        body: `Update your ${payment.method} ending in ${payment.lastFour}`,
        data: {
          type: 'payment_expiry',
          paymentMethod: `${payment.method} ****${payment.lastFour}`,
          daysUntilExpiry: daysUntilExpiry.toString(),
          deepLink: 'geoleap://account/payment-methods',
        },
        actions: [
          {
            id: 'update_payment',
            title: 'Update Payment Method',
            deepLink: 'geoleap://account/payment-methods/update',
          },
          {
            id: 'add_payment',
            title: 'Add New Method',
            deepLink: 'geoleap://account/payment-methods/add',
          },
        ],
        category: 'subscription',
        priority: priority as 'low' | 'normal' | 'high',
      };

      await this.notificationService.sendNotification(notification);

      await this.analytics.trackEvent({
        type: 'received',
        templateId: 'payment_expiry',
        category: 'subscription',
        priority: priority as string,
        metadata: {
          payment_method: payment.method,
          days_until_expiry: daysUntilExpiry,
        },
      });

    } catch (error) {
      logger.error('[SubscriptionNotificationService] Failed to send payment expiry notification', error);
      throw error;
    }
  }

  /**
   * AC3: Subscription cancellation confirmations
   */
  async sendCancellationConfirmation(subscription: SubscriptionInfo, accessUntil: Date): Promise<void> {
    try {
      const notification = {
        id: `subscription_cancelled_${subscription.id}_${Date.now()}`,
        title: `✅ ${subscription.service} subscription cancelled`,
        body: `You'll have access until ${accessUntil.toLocaleDateString()}`,
        data: {
          type: 'subscription_cancelled',
          subscriptionId: subscription.id,
          service: subscription.service,
          accessUntil: accessUntil.toISOString(),
          deepLink: `geoleap://subscriptions/${subscription.id}`,
        },
        imageUrl: `https://api.geoleap.com/images/services/${subscription.service}/logo`,
        actions: [
          {
            id: 'reactivate',
            title: 'Reactivate Subscription',
            deepLink: `geoleap://subscriptions/${subscription.id}/reactivate`,
          },
          {
            id: 'export_data',
            title: 'Export Your Data',
            deepLink: 'geoleap://account/export-data',
          },
        ],
        category: 'subscription',
        priority: 'normal' as 'low' | 'normal' | 'high',
      };

      await this.notificationService.sendNotification(notification);

      await this.analytics.trackEvent({
        type: 'received',
        templateId: 'subscription_cancelled',
        category: 'subscription',
        priority: 'normal',
        metadata: {
          service: subscription.service,
        },
      });

    } catch (error) {
      logger.error('[SubscriptionNotificationService] Failed to send cancellation confirmation', error);
      throw error;
    }
  }

  /**
   * New feature announcements
   */
  async sendFeatureAnnouncement(feature: {
    title: string;
    description: string;
    imageUrl?: string;
    learnMoreUrl: string;
  }): Promise<void> {
    try {
      const notification = {
        id: `feature_announcement_${Date.now()}`,
        title: `🆕 New Feature: ${feature.title}`,
        body: feature.description,
        data: {
          type: 'feature_announcement',
          featureTitle: feature.title,
          deepLink: feature.learnMoreUrl,
        },
        imageUrl: feature.imageUrl || 'https://api.geoleap.com/images/app/new-feature.png',
        actions: [
          {
            id: 'learn_more',
            title: 'Learn More',
            deepLink: feature.learnMoreUrl,
          },
          {
            id: 'try_feature',
            title: 'Try It Now',
            deepLink: feature.learnMoreUrl.replace('/learn', '/try'),
          },
        ],
        category: 'features',
        priority: 'low' as 'low' | 'normal' | 'high',
      };

      await this.notificationService.sendNotification(notification);

      await this.analytics.trackEvent({
        type: 'received',
        templateId: 'feature_announcement',
        category: 'features',
        priority: 'low',
        metadata: {
          feature_title: feature.title,
        },
      });

    } catch (error) {
      logger.error('[SubscriptionNotificationService] Failed to send feature announcement', error);
      throw error;
    }
  }
}
