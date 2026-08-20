import { useState, useEffect, useCallback } from 'react';
import { logger } from '../utils/logger';
import NotificationService from '../services/notificationService';
import type { NotificationPreferences, NotificationData } from '../services/notificationService';
import type { AvailabilityUpdate } from '../services/watchlistNotificationService';
import type { SubscriptionInfo, PaymentInfo } from '../services/subscriptionNotificationService';

export interface UseNotificationsReturn {
  // Permission management
  hasPermission: boolean;
  requestPermission: () => Promise<boolean>;

  // Preferences
  preferences: NotificationPreferences | null;
  updatePreferences: (prefs: NotificationPreferences) => Promise<void>;

  // History
  history: NotificationData[];
  clearHistory: () => Promise<void>;

  // Notification sending
  sendWatchlistUpdate: (update: AvailabilityUpdate) => Promise<void>;
  sendNewEpisodeNotification: (update: AvailabilityUpdate) => Promise<void>;
  sendPersonalizedRecommendation: (recommendation: {
    contentId: string;
    title: string;
    reason: string;
    service: string;
    genre: string;
    rating: number;
  }) => Promise<void>;
  sendBatchWatchlistUpdates: (updates: AvailabilityUpdate[]) => Promise<void>;

  // Subscription notifications
  sendRenewalReminder: (subscription: SubscriptionInfo, daysUntilRenewal: number) => Promise<void>;
  sendPaymentFailedNotification: (subscription: SubscriptionInfo, payment: PaymentInfo) => Promise<void>;
  sendPaymentExpiryNotification: (payment: PaymentInfo, daysUntilExpiry: number) => Promise<void>;
  sendCancellationConfirmation: (subscription: SubscriptionInfo, accessUntil: Date) => Promise<void>;
  sendFeatureAnnouncement: (feature: {
    title: string;
    description: string;
    imageUrl?: string;
    learnMoreUrl: string;
  }) => Promise<void>;

  // Loading states
  isLoading: boolean;
}

export const useNotifications = (): UseNotificationsReturn => {
  const [hasPermission, setHasPermission] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [history, setHistory] = useState<NotificationData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeNotifications();
  }, []);

  const initializeNotifications = async () => {
    try {
      setIsLoading(true);

      // Initialize the notification service
      await NotificationService.initialize();

      // Check permission status
      const hasPerms = await NotificationService.checkPermission();
      setHasPermission(hasPerms);

      // Load preferences
      const prefs = await NotificationService.getPreferences();
      setPreferences(prefs);

      // Load history
      const notificationHistory = NotificationService.getNotificationHistory();
      setHistory(notificationHistory);

    } catch (error) {
      logger.error('[useNotifications] Failed to initialize notifications', error);
    } finally {
      setIsLoading(false);
    }
  };

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const granted = await NotificationService.requestPermission();
      setHasPermission(granted);
      return granted;
    } catch (error) {
      logger.error('[useNotifications] Failed to request permission', error);
      return false;
    }
  }, []);

  const updatePreferences = useCallback(async (prefs: NotificationPreferences): Promise<void> => {
    try {
      await NotificationService.savePreferences(prefs);
      setPreferences(prefs);
    } catch (error) {
      logger.error('[useNotifications] Failed to update preferences', error);
      throw error;
    }
  }, []);

  const clearHistory = useCallback(async (): Promise<void> => {
    try {
      await NotificationService.clearNotificationHistory();
      setHistory([]);
    } catch (error) {
      logger.error('[useNotifications] Failed to clear history', error);
      throw error;
    }
  }, []);

  // Watchlist notifications
  const sendWatchlistUpdate = useCallback(async (update: AvailabilityUpdate): Promise<void> => {
    try {
      await NotificationService.getWatchlistService().sendAvailabilityNotification(update);
    } catch (error) {
      logger.error('[useNotifications] Failed to send watchlist update', error);
      throw error;
    }
  }, []);

  const sendNewEpisodeNotification = useCallback(async (update: AvailabilityUpdate): Promise<void> => {
    try {
      await NotificationService.getWatchlistService().sendNewEpisodeNotification(update);
    } catch (error) {
      logger.error('[useNotifications] Failed to send new episode notification', error);
      throw error;
    }
  }, []);

  const sendPersonalizedRecommendation = useCallback(async (recommendation: {
    contentId: string;
    title: string;
    reason: string;
    service: string;
    genre: string;
    rating: number;
  }): Promise<void> => {
    try {
      await NotificationService.getWatchlistService().sendPersonalizedRecommendation(recommendation);
    } catch (error) {
      logger.error('[useNotifications] Failed to send recommendation', error);
      throw error;
    }
  }, []);

  const sendBatchWatchlistUpdates = useCallback(async (updates: AvailabilityUpdate[]): Promise<void> => {
    try {
      await NotificationService.getWatchlistService().sendBatchWatchlistUpdates(updates);
    } catch (error) {
      logger.error('[useNotifications] Failed to send batch updates', error);
      throw error;
    }
  }, []);

  // Subscription notifications
  const sendRenewalReminder = useCallback(async (subscription: SubscriptionInfo, daysUntilRenewal: number): Promise<void> => {
    try {
      await NotificationService.getSubscriptionService().sendRenewalReminder(subscription, daysUntilRenewal);
    } catch (error) {
      logger.error('[useNotifications] Failed to send renewal reminder', error);
      throw error;
    }
  }, []);

  const sendPaymentFailedNotification = useCallback(async (subscription: SubscriptionInfo, payment: PaymentInfo): Promise<void> => {
    try {
      await NotificationService.getSubscriptionService().sendPaymentFailedNotification(subscription, payment);
    } catch (error) {
      logger.error('[useNotifications] Failed to send payment failed notification', error);
      throw error;
    }
  }, []);

  const sendPaymentExpiryNotification = useCallback(async (payment: PaymentInfo, daysUntilExpiry: number): Promise<void> => {
    try {
      await NotificationService.getSubscriptionService().sendPaymentExpiryNotification(payment, daysUntilExpiry);
    } catch (error) {
      logger.error('[useNotifications] Failed to send payment expiry notification', error);
      throw error;
    }
  }, []);

  const sendCancellationConfirmation = useCallback(async (subscription: SubscriptionInfo, accessUntil: Date): Promise<void> => {
    try {
      await NotificationService.getSubscriptionService().sendCancellationConfirmation(subscription, accessUntil);
    } catch (error) {
      logger.error('[useNotifications] Failed to send cancellation confirmation', error);
      throw error;
    }
  }, []);

  const sendFeatureAnnouncement = useCallback(async (feature: {
    title: string;
    description: string;
    imageUrl?: string;
    learnMoreUrl: string;
  }): Promise<void> => {
    try {
      await NotificationService.getSubscriptionService().sendFeatureAnnouncement(feature);
    } catch (error) {
      logger.error('[useNotifications] Failed to send feature announcement', error);
      throw error;
    }
  }, []);

  return {
    hasPermission,
    requestPermission,
    preferences,
    updatePreferences,
    history,
    clearHistory,
    sendWatchlistUpdate,
    sendNewEpisodeNotification,
    sendPersonalizedRecommendation,
    sendBatchWatchlistUpdates,
    sendRenewalReminder,
    sendPaymentFailedNotification,
    sendPaymentExpiryNotification,
    sendCancellationConfirmation,
    sendFeatureAnnouncement,
    isLoading,
  };
};

export default useNotifications;
