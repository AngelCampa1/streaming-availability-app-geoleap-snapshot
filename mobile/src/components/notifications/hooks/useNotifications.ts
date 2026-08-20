import { useState, useEffect, useCallback } from 'react';
import NotificationService, { NotificationData, NotificationPreferences } from '../../../services/notificationService';
import { NotificationTemplates } from '../../../services/notificationTemplates';
import NotificationAnalytics from '../../../services/notificationAnalytics';
import { logger } from '../../../utils/logger';

export interface UseNotificationsReturn {
  // State
  preferences: NotificationPreferences | null;
  notificationHistory: NotificationData[];
  isLoading: boolean;
  error: string | null;

  // Actions
  updatePreferences: (preferences: NotificationPreferences) => Promise<void>;
  showNotification: (notification: NotificationData) => Promise<void>;
  showTemplatedNotification: (templateId: string, data: Record<string, any>) => Promise<void>;
  scheduleNotification: (notification: NotificationData, date: Date) => Promise<void>;
  cancelNotification: (notificationId: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  clearHistory: () => Promise<void>;

  // Utility
  refreshData: () => Promise<void>;
}

export const useNotifications = (): UseNotificationsReturn => {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [notificationHistory, setNotificationHistory] = useState<NotificationData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [prefs, history] = await Promise.all([
        NotificationService.getPreferences(),
        Promise.resolve(NotificationService.getNotificationHistory()),
      ]);

      setPreferences(prefs);
      setNotificationHistory(history);
    } catch (err) {
      logger.error('[useNotifications] Failed to load notification data', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updatePreferences = useCallback(async (newPreferences: NotificationPreferences) => {
    try {
      setError(null);
      await NotificationService.savePreferences(newPreferences);
      setPreferences(newPreferences);
    } catch (err) {
      logger.error('[useNotifications] Failed to update preferences', err);
      setError(err instanceof Error ? err.message : 'Failed to update preferences');
      throw err;
    }
  }, []);

  const showNotification = useCallback(async (notification: NotificationData) => {
    try {
      setError(null);
      await NotificationService.showLocalNotification(notification);

      // Track analytics
      await NotificationAnalytics.trackNotificationReceived(
        notification.id,
        notification.category || 'default',
        notification.priority || 'normal',
      );

      // Update history
      const updatedHistory = [notification, ...notificationHistory];
      setNotificationHistory(updatedHistory.slice(0, 100)); // Keep last 100
    } catch (err) {
      logger.error('[useNotifications] Failed to show notification', err);
      setError(err instanceof Error ? err.message : 'Failed to show notification');
      throw err;
    }
  }, [notificationHistory]);

  const showTemplatedNotification = useCallback(async (templateId: string, data: Record<string, any>) => {
    try {
      setError(null);
      const notification = NotificationTemplates.createNotificationFromTemplate(templateId, data);

      if (!notification) {
        throw new Error(`Template not found: ${templateId}`);
      }

      await showNotification(notification);
    } catch (err) {
      logger.error('[useNotifications] Failed to show templated notification', err);
      setError(err instanceof Error ? err.message : 'Failed to show notification');
      throw err;
    }
  }, [showNotification]);

  const scheduleNotification = useCallback(async (notification: NotificationData, date: Date) => {
    try {
      setError(null);
      await NotificationService.scheduleLocalNotification(notification, date);

      // Track analytics
      await NotificationAnalytics.trackEvent({
        type: 'received',
        templateId: notification.id,
        category: notification.category || 'default',
        metadata: { scheduled: true, scheduleDate: date.toISOString() },
      });
    } catch (err) {
      logger.error('[useNotifications] Failed to schedule notification', err);
      setError(err instanceof Error ? err.message : 'Failed to schedule notification');
      throw err;
    }
  }, []);

  const cancelNotification = useCallback(async (notificationId: string) => {
    try {
      setError(null);
      await NotificationService.cancelScheduledNotification(notificationId);
    } catch (err) {
      logger.error('[useNotifications] Failed to cancel notification', err);
      setError(err instanceof Error ? err.message : 'Failed to cancel notification');
      throw err;
    }
  }, []);

  const clearAllNotifications = useCallback(async () => {
    try {
      setError(null);
      await NotificationService.cancelAllNotifications();
    } catch (err) {
      logger.error('[useNotifications] Failed to clear all notifications', err);
      setError(err instanceof Error ? err.message : 'Failed to clear notifications');
      throw err;
    }
  }, []);

  const clearHistory = useCallback(async () => {
    try {
      setError(null);
      await NotificationService.clearNotificationHistory();
      setNotificationHistory([]);
    } catch (err) {
      logger.error('[useNotifications] Failed to clear history', err);
      setError(err instanceof Error ? err.message : 'Failed to clear history');
      throw err;
    }
  }, []);

  const refreshData = useCallback(async () => {
    await loadData();
  }, [loadData]);

  return {
    // State
    preferences,
    notificationHistory,
    isLoading,
    error,

    // Actions
    updatePreferences,
    showNotification,
    showTemplatedNotification,
    scheduleNotification,
    cancelNotification,
    clearAllNotifications,
    clearHistory,

    // Utility
    refreshData,
  };
};
