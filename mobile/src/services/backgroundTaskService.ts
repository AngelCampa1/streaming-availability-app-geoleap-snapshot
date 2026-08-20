/**
 * Background Task Service
 *
 * Handles background tasks and app state management.
 * Uses expo-notifications for local notifications and Azure Notification Hubs for push.
 */
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationService from './notificationService';
import { NotificationTemplates } from './notificationTemplates';
import { logger } from '../utils/logger';

export interface BackgroundTaskConfig {
  enableBackgroundRefresh: boolean;
  syncInterval: number; // in minutes
  enableOfflineQueueing: boolean;
  maxQueueSize: number;
  retryAttempts: number;
}

export interface QueuedNotification {
  id: string;
  templateId: string;
  data: Record<string, unknown>;
  timestamp: number;
  attempts: number;
}

export class BackgroundTaskService {
  private static instance: BackgroundTaskService;
  private appState: AppStateStatus = AppState?.currentState || 'active';
  private backgroundTimer: ReturnType<typeof setInterval> | null = null;
  private config: BackgroundTaskConfig;
  private notificationQueue: QueuedNotification[] = [];
  private isProcessingQueue = false;
  private appStateSubscription: { remove: () => void } | null = null;

  private constructor() {
    this.config = this.getDefaultConfig();
  }

  public static getInstance(): BackgroundTaskService {
    if (!BackgroundTaskService.instance) {
      BackgroundTaskService.instance = new BackgroundTaskService();
    }
    return BackgroundTaskService.instance;
  }

  private getDefaultConfig(): BackgroundTaskConfig {
    return {
      enableBackgroundRefresh: true,
      syncInterval: 15, // 15 minutes
      enableOfflineQueueing: true,
      maxQueueSize: 50,
      retryAttempts: 3,
    };
  }

  public async initialize(): Promise<void> {
    try {
      await this.loadConfig();
      await this.loadNotificationQueue();
      this.setupAppStateHandling();
      this.startBackgroundSync();

      logger.info('[BackgroundTaskService] Initialized successfully (Azure Notification Hubs)');
    } catch (error) {
      logger.error('[BackgroundTaskService] Failed to initialize', error);
    }
  }

  private setupAppStateHandling(): void {
    // Clean up existing subscription if any
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }

    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange.bind(this));
  }

  private handleAppStateChange(nextAppState: AppStateStatus): void {
    const previousAppState = this.appState;
    this.appState = nextAppState;

    logger.info('[BackgroundTaskService] App state changed', { previousAppState, nextAppState });

    if (previousAppState.match(/inactive|background/) && nextAppState === 'active') {
      // App has come to foreground
      this.handleAppForeground();
    } else if (previousAppState === 'active' && nextAppState.match(/inactive|background/)) {
      // App has gone to background
      this.handleAppBackground();
    }
  }

  private async handleAppForeground(): Promise<void> {
    try {
      logger.info('[BackgroundTaskService] App came to foreground, processing queued notifications');

      // Process any queued notifications
      await this.processNotificationQueue();

      // Sync with server
      await this.syncWithServer();

      // Update badge count
      await this.updateBadgeCount();

    } catch (error) {
      logger.error('[BackgroundTaskService] Error handling app foreground', error);
    }
  }

  private async handleAppBackground(): Promise<void> {
    try {
      logger.info('[BackgroundTaskService] App went to background');

      // Save current state
      await this.saveNotificationQueue();

      // Clear sensitive data if needed
      await this.clearSensitiveData();

    } catch (error) {
      logger.error('[BackgroundTaskService] Error handling app background', error);
    }
  }

  /**
   * Handle a background notification message
   * This is called when receiving notifications from Azure Notification Hubs or local triggers
   */
  public async handleBackgroundMessage(message: {
    notification?: { title?: string; body?: string };
    data?: Record<string, unknown>;
  }): Promise<void> {
    try {
      logger.info('[BackgroundTaskService] Handling background message', { message });

      // Extract notification data
      const notificationData = {
        title: message.notification?.title || 'New Message',
        body: message.notification?.body || '',
        data: message.data || {},
      };

      // Create rich notification based on template
      const templateId = (message.data?.templateId as string) || 'default';
      const richNotification = NotificationTemplates.createNotificationFromTemplate(
        templateId,
        notificationData.data,
      );

      if (richNotification) {
        // Show notification immediately
        await NotificationService.showLocalNotification(richNotification);
      } else {
        // Fallback to basic notification
        await NotificationService.showLocalNotification({
          id: `bg_${Date.now()}`,
          title: notificationData.title,
          body: notificationData.body,
          data: notificationData.data as Record<string, unknown>,
        });
      }

      // Update badge count
      await this.incrementBadgeCount();

      // Log analytics
      await this.logBackgroundNotification(message);

    } catch (error) {
      logger.error('[BackgroundTaskService] Error handling background message', error);
    }
  }

  private startBackgroundSync(): void {
    if (!this.config.enableBackgroundRefresh) {
      return;
    }

    // Clear any existing timer
    if (this.backgroundTimer) {
      clearInterval(this.backgroundTimer);
    }

    // Set up periodic sync
    const intervalMs = this.config.syncInterval * 60 * 1000;
    this.backgroundTimer = setInterval(() => {
      if (this.appState === 'background') {
        this.performBackgroundSync();
      }
    }, intervalMs);

    logger.info('[BackgroundTaskService] Background sync started', { intervalMinutes: this.config.syncInterval });
  }

  private async performBackgroundSync(): Promise<void> {
    try {
      logger.info('[BackgroundTaskService] Performing background sync');

      // Sync notification preferences
      await this.syncNotificationPreferences();

      // Check for pending notifications
      await this.checkPendingNotifications();

      // Update connection status if VPN is active
      await this.updateVPNStatus();

      // Clean up old data
      await this.cleanupOldData();

    } catch (error) {
      logger.error('[BackgroundTaskService] Background sync failed', error);
    }
  }

  private async syncWithServer(): Promise<void> {
    try {
      // Implement server sync logic here
      logger.info('[BackgroundTaskService] Syncing with server');

      // Example: Sync user preferences, get pending notifications, etc.
      // This would typically involve API calls to your backend

    } catch (error) {
      logger.error('[BackgroundTaskService] Server sync failed', error);
    }
  }

  private async syncNotificationPreferences(): Promise<void> {
    try {
      // Sync notification preferences with server
      const _preferences = await NotificationService.getPreferences();

      // Send preferences to server for personalization
      // await api.updateNotificationPreferences(_preferences);

    } catch (error) {
      logger.error('[BackgroundTaskService] Failed to sync notification preferences', error);
    }
  }

  private async checkPendingNotifications(): Promise<void> {
    try {
      // Check for server-side pending notifications
      // const pendingNotifications = await api.getPendingNotifications();

      // Process and queue notifications
      // pendingNotifications.forEach(notification => {
      //   this.queueNotification(notification);
      // });

    } catch (error) {
      logger.error('[BackgroundTaskService] Failed to check pending notifications', error);
    }
  }

  private async updateVPNStatus(): Promise<void> {
    try {
      // Check VPN connection status and send notification if needed
      // This would integrate with your VPN service

    } catch (error) {
      logger.error('[BackgroundTaskService] Failed to update VPN status', error);
    }
  }

  private async cleanupOldData(): Promise<void> {
    try {
      // Clean up old notification history
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
      const cutoff = Date.now() - maxAge;

      this.notificationQueue = this.notificationQueue.filter(
        notification => notification.timestamp > cutoff,
      );

      await this.saveNotificationQueue();

    } catch (error) {
      logger.error('[BackgroundTaskService] Failed to cleanup old data', error);
    }
  }

  public async queueNotification(templateId: string, data: Record<string, unknown>): Promise<void> {
    try {
      if (!this.config.enableOfflineQueueing) {
        return;
      }

      // Check queue size limit
      if (this.notificationQueue.length >= this.config.maxQueueSize) {
        // Remove oldest notification
        this.notificationQueue.shift();
      }

      const queuedNotification: QueuedNotification = {
        id: `queued_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        templateId,
        data,
        timestamp: Date.now(),
        attempts: 0,
      };

      this.notificationQueue.push(queuedNotification);
      await this.saveNotificationQueue();

      logger.info('[BackgroundTaskService] Notification queued', { notificationId: queuedNotification.id });
    } catch (error) {
      logger.error('[BackgroundTaskService] Failed to queue notification', error);
    }
  }

  private async processNotificationQueue(): Promise<void> {
    if (this.isProcessingQueue || this.notificationQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      logger.info('[BackgroundTaskService] Processing queued notifications', { queueLength: this.notificationQueue.length });

      const processedIds: string[] = [];

      for (const queuedNotification of this.notificationQueue) {
        try {
          const notification = NotificationTemplates.createNotificationFromTemplate(
            queuedNotification.templateId,
            queuedNotification.data,
          );

          if (notification) {
            await NotificationService.showLocalNotification(notification);
            processedIds.push(queuedNotification.id);
          } else {
            queuedNotification.attempts++;
            if (queuedNotification.attempts >= this.config.retryAttempts) {
              logger.warn('[BackgroundTaskService] Max retry attempts reached', { notificationId: queuedNotification.id });
              processedIds.push(queuedNotification.id);
            }
          }
        } catch (error) {
          logger.error('[BackgroundTaskService] Failed to process queued notification', error);
          queuedNotification.attempts++;
          if (queuedNotification.attempts >= this.config.retryAttempts) {
            processedIds.push(queuedNotification.id);
          }
        }
      }

      // Remove processed notifications
      this.notificationQueue = this.notificationQueue.filter(
        notification => !processedIds.includes(notification.id),
      );

      await this.saveNotificationQueue();
    } catch (error) {
      logger.error('[BackgroundTaskService] Failed to process notification queue', error);
    } finally {
      this.isProcessingQueue = false;
    }
  }

  private async updateBadgeCount(): Promise<void> {
    try {
      // Get unread notification count
      const _badgeCount = await this.getUnreadNotificationCount();

      // Update app badge (iOS) or notification badge (Android)
      // PushNotification.setApplicationIconBadgeNumber(_badgeCount);

    } catch (error) {
      logger.error('[BackgroundTaskService] Failed to update badge count', error);
    }
  }

  private async incrementBadgeCount(): Promise<void> {
    try {
      const currentCount = await this.getBadgeCount();
      const newCount = currentCount + 1;
      await this.setBadgeCount(newCount);

    } catch (error) {
      logger.error('[BackgroundTaskService] Failed to increment badge count', error);
    }
  }

  private async getBadgeCount(): Promise<number> {
    try {
      const count = await AsyncStorage.getItem('badge_count');
      return count ? parseInt(count, 10) : 0;
    } catch (error) {
      logger.error('[BackgroundTaskService] Failed to get badge count', error);
      return 0;
    }
  }

  private async setBadgeCount(count: number): Promise<void> {
    try {
      await AsyncStorage.setItem('badge_count', count.toString());
    } catch (error) {
      logger.error('[BackgroundTaskService] Failed to set badge count', error);
    }
  }

  private async getUnreadNotificationCount(): Promise<number> {
    try {
      // This would typically fetch from your app's notification state
      // For now, return stored badge count
      return await this.getBadgeCount();
    } catch (error) {
      logger.error('[BackgroundTaskService] Failed to get unread notification count', error);
      return 0;
    }
  }

  private async clearSensitiveData(): Promise<void> {
    try {
      // Clear any sensitive data that shouldn't persist in background
      // This is important for security and privacy

    } catch (error) {
      logger.error('[BackgroundTaskService] Failed to clear sensitive data', error);
    }
  }

  /**
   * Destroy service and cleanup resources
   * Call this to prevent memory leaks in tests
   */
  public destroy(): void {
    // Clear background sync timer
    if (this.backgroundTimer) {
      clearInterval(this.backgroundTimer);
      this.backgroundTimer = null;
    }

    // Remove app state subscription
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    // Clear queues
    this.notificationQueue = [];
    this.isProcessingQueue = false;

    logger.info('[BackgroundTaskService] Service destroyed');
  }

  private async logBackgroundNotification(_message: {
    notification?: { title?: string; body?: string };
    data?: Record<string, unknown>;
  }): Promise<void> {
    try {
      // Log analytics for background notifications
      // TODO: Integrate with Azure Application Insights
      // await analytics.logEvent('background_notification_received', {
      //   template_id: _message.data?.templateId,
      //   category: _message.data?.category,
      // });

    } catch (error) {
      logger.error('[BackgroundTaskService] Failed to log background notification', error);
    }
  }

  private async loadConfig(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('background_task_config');
      if (stored) {
        this.config = { ...this.config, ...JSON.parse(stored) };
      }
    } catch (error) {
      logger.error('[BackgroundTaskService] Failed to load config', error);
    }
  }

  public async saveConfig(config: Partial<BackgroundTaskConfig>): Promise<void> {
    try {
      this.config = { ...this.config, ...config };
      await AsyncStorage.setItem('background_task_config', JSON.stringify(this.config));

      // Restart background sync if interval changed
      if (config.syncInterval || config.enableBackgroundRefresh !== undefined) {
        this.startBackgroundSync();
      }

    } catch (error) {
      logger.error('[BackgroundTaskService] Failed to save config', error);
    }
  }

  private async loadNotificationQueue(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('notification_queue');
      if (stored) {
        this.notificationQueue = JSON.parse(stored);
      }
    } catch (error) {
      logger.error('[BackgroundTaskService] Failed to load notification queue', error);
      this.notificationQueue = [];
    }
  }

  private async saveNotificationQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem('notification_queue', JSON.stringify(this.notificationQueue));
    } catch (error) {
      logger.error('[BackgroundTaskService] Failed to save notification queue', error);
    }
  }

  public getConfig(): BackgroundTaskConfig {
    return { ...this.config };
  }

  public getQueueStatus(): { size: number; isProcessing: boolean } {
    return {
      size: this.notificationQueue.length,
      isProcessing: this.isProcessingQueue,
    };
  }

  public async clearQueue(): Promise<void> {
    this.notificationQueue = [];
    await this.saveNotificationQueue();
    logger.info('[BackgroundTaskService] Notification queue cleared');
  }

  public dispose(): void {
    if (this.backgroundTimer) {
      clearInterval(this.backgroundTimer);
      this.backgroundTimer = null;
    }

    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
  }
}

export default BackgroundTaskService.getInstance();
