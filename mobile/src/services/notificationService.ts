/**
 * Notification Service - Using Expo Notifications
 *
 * This service handles local and push notifications using expo-notifications.
 * Compatible with Expo managed workflow for both iOS and Android.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { Linking, Platform } from 'react-native';
import { logger } from '../utils/logger';
import { designTokens } from '../tokens/designTokens';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationData {
  id: string;
  title: string;
  body: string;
  imageUrl?: string;
  data?: Record<string, unknown>;
  actions?: NotificationAction[];
  deepLink?: string;
  category?: string;
  priority?: 'low' | 'normal' | 'high';
  sound?: string;
  badge?: number;
}

export interface NotificationAction {
  id: string;
  title: string;
  type?: 'input' | 'destructive';
  placeholder?: string;
}

export interface NotificationPreferences {
  enabled: boolean;
  categories: {
    [key: string]: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string; // HH:MM format
  };
  frequency: {
    maxPerHour: number;
    batchingSimilar: boolean;
  };
  sounds: {
    enabled: boolean;
    customSound?: string;
  };
  vibration: boolean;
  showPreviews: boolean;
}

// Interface for WatchlistNotificationService methods (to avoid circular imports)
export interface IWatchlistNotificationService {
  sendAvailabilityNotification(update: {
    contentId: string;
    title: string;
    service: string;
    available: boolean;
    expiresAt?: Date;
    newEpisodes?: number;
  }): Promise<void>;
  sendNewEpisodeNotification(update: {
    contentId: string;
    title: string;
    service: string;
    available: boolean;
    expiresAt?: Date;
    newEpisodes?: number;
  }): Promise<void>;
  sendPersonalizedRecommendation(recommendation: {
    contentId: string;
    title: string;
    reason: string;
    service: string;
    genre: string;
    rating: number;
  }): Promise<void>;
  sendBatchWatchlistUpdates(updates: {
    contentId: string;
    title: string;
    service: string;
    available: boolean;
    expiresAt?: Date;
    newEpisodes?: number;
  }[]): Promise<void>;
}

// Interface for SubscriptionNotificationService methods (to avoid circular imports)
export interface ISubscriptionNotificationService {
  sendRenewalReminder(subscription: {
    id: string;
    service: string;
    userId: string;
    renewalDate: Date;
    amount: number;
    currency: string;
    status: 'active' | 'expiring' | 'expired' | 'payment_failed';
  }, daysUntilRenewal: number): Promise<void>;
  sendPaymentFailedNotification(subscription: {
    id: string;
    service: string;
    userId: string;
    renewalDate: Date;
    amount: number;
    currency: string;
    status: 'active' | 'expiring' | 'expired' | 'payment_failed';
  }, payment: {
    method: string;
    lastFour: string;
    expiryDate: Date;
    status: 'valid' | 'expired' | 'declined';
  }): Promise<void>;
  sendPaymentExpiryNotification(payment: {
    method: string;
    lastFour: string;
    expiryDate: Date;
    status: 'valid' | 'expired' | 'declined';
  }, daysUntilExpiry: number): Promise<void>;
  sendCancellationConfirmation(subscription: {
    id: string;
    service: string;
    userId: string;
    renewalDate: Date;
    amount: number;
    currency: string;
    status: 'active' | 'expiring' | 'expired' | 'payment_failed';
  }, accessUntil: Date): Promise<void>;
  sendFeatureAnnouncement(feature: {
    title: string;
    description: string;
    imageUrl?: string;
    learnMoreUrl: string;
  }): Promise<void>;
}

export class NotificationService {
  private static instance: NotificationService;
  private preferences: NotificationPreferences | null = null;
  private pendingNotifications: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private notificationHistory: NotificationData[] = [];
  private watchlistService: IWatchlistNotificationService | null = null;
  private subscriptionService: ISubscriptionNotificationService | null = null;
  private isInitialized = false;
  private notificationListener: Notifications.Subscription | null = null;
  private responseListener: Notifications.Subscription | null = null;

  private constructor() {
    // Listeners will be set up during initialize()
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      await this.loadPreferences();
      await this.setupNotificationCategories();
      this.setupNotificationListeners();
      this.isInitialized = true;
      logger.info('[NotificationService] Initialized successfully (using expo-notifications)');
    } catch (error) {
      logger.error('[NotificationService] Failed to initialize', error);
      throw error;
    }
  }

  private async setupNotificationCategories(): Promise<void> {
    try {
      // Set up notification categories with actions for iOS
      if (Platform.OS === 'ios') {
        await Notifications.setNotificationCategoryAsync('watchlist', [
          {
            identifier: 'view',
            buttonTitle: 'View',
            options: { opensAppToForeground: true },
          },
          {
            identifier: 'dismiss',
            buttonTitle: 'Dismiss',
            options: { isDestructive: true },
          },
        ]);

        await Notifications.setNotificationCategoryAsync('subscription', [
          {
            identifier: 'manage',
            buttonTitle: 'Manage',
            options: { opensAppToForeground: true },
          },
        ]);
      }

      // Set up Android notification channels
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default Notifications',
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: designTokens.colors.primary[500],
        });

        await Notifications.setNotificationChannelAsync('high_priority', {
          name: 'High Priority',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: designTokens.colors.error[500],
        });

        await Notifications.setNotificationChannelAsync('promotional', {
          name: 'Promotional',
          importance: Notifications.AndroidImportance.LOW,
        });
      }
    } catch (error) {
      logger.warn('[NotificationService] Failed to setup notification categories', error);
    }
  }

  private setupNotificationListeners(): void {
    // Clean up existing listeners
    if (this.notificationListener) {
      this.notificationListener.remove();
    }
    if (this.responseListener) {
      this.responseListener.remove();
    }

    // Listen for incoming notifications while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      logger.debug('[NotificationService] Notification received', { notification });
    });

    // Listen for user interaction with notifications
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      logger.info('[NotificationService] Notification response', { response });
      this.handleNotificationResponse(response);
    });
  }

  private handleNotificationResponse(response: Notifications.NotificationResponse): void {
    const data = response.notification.request.content.data;
    const actionId = response.actionIdentifier;

    logger.info('[NotificationService] Handling notification response', { actionId, data });

    if (actionId === Notifications.DEFAULT_ACTION_IDENTIFIER) {
      // User tapped the notification
      if (data?.deepLink && typeof data.deepLink === 'string') {
        this.handleDeepLink(data.deepLink);
      }
    } else {
      // User tapped an action button
      switch (actionId) {
        case 'view':
          if (data?.deepLink && typeof data.deepLink === 'string') {
            this.handleDeepLink(data.deepLink);
          }
          break;
        case 'dismiss':
          // Notification dismissed
          break;
        case 'manage':
          this.handleDeepLink('geoleap://subscriptions');
          break;
      }
    }
  }

  /**
   * Public cleanup method for memory leak prevention
   */
  public cleanup(): void {
    // Remove notification listeners
    if (this.notificationListener) {
      this.notificationListener.remove();
      this.notificationListener = null;
    }
    if (this.responseListener) {
      this.responseListener.remove();
      this.responseListener = null;
    }

    // Clear pending notification timeouts
    this.pendingNotifications.forEach((timeout) => {
      clearTimeout(timeout);
    });
    this.pendingNotifications.clear();

    // Clear notification history
    this.notificationHistory = [];

    // Clear lazy-loaded services
    this.watchlistService = null;
    this.subscriptionService = null;

    logger.info('[NotificationService] Cleaned up successfully');
  }

  public async showLocalNotification(notificationData: NotificationData): Promise<void> {
    try {
      const preferences = await this.getPreferences();

      if (!preferences.enabled || !this.shouldShowBasedOnPreferences(notificationData, preferences)) {
        return;
      }

      const channelId = this.getChannelId(notificationData.priority || 'normal');

      await Notifications.scheduleNotificationAsync({
        content: {
          title: notificationData.title,
          body: notificationData.body,
          sound: preferences.sounds.enabled ? (notificationData.sound || 'default') : undefined,
          badge: notificationData.badge,
          data: {
            ...notificationData.data,
            deepLink: notificationData.deepLink,
            id: notificationData.id,
          },
          categoryIdentifier: notificationData.category,
        },
        trigger: null, // Immediate notification
        identifier: notificationData.id,
      });

      // Add to history
      this.addToHistory(notificationData);

      logger.info('[NotificationService] Local notification sent', { notificationId: notificationData.id });
    } catch (error) {
      logger.error('[NotificationService] Failed to show local notification', error);
    }
  }

  private getChannelId(priority: string): string {
    switch (priority) {
      case 'high':
        return 'high_priority';
      case 'low':
        return 'promotional';
      default:
        return 'default';
    }
  }

  public async scheduleLocalNotification(
    notificationData: NotificationData,
    scheduleDate: Date,
  ): Promise<void> {
    try {
      const preferences = await this.getPreferences();

      if (!preferences.enabled) {
        return;
      }

      // Use DateTriggerInput type for scheduling
      const trigger = {
        type: SchedulableTriggerInputTypes.DATE as typeof SchedulableTriggerInputTypes.DATE,
        date: scheduleDate,
      };

      await Notifications.scheduleNotificationAsync({
        content: {
          title: notificationData.title,
          body: notificationData.body,
          sound: preferences.sounds.enabled ? (notificationData.sound || 'default') : undefined,
          badge: notificationData.badge,
          data: {
            ...notificationData.data,
            deepLink: notificationData.deepLink,
            id: notificationData.id,
          },
          categoryIdentifier: notificationData.category,
        },
        trigger,
        identifier: notificationData.id,
      });

      logger.info('[NotificationService] Notification scheduled', { scheduleDate });
    } catch (error) {
      logger.error('[NotificationService] Failed to schedule notification', error);
    }
  }

  public async cancelScheduledNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      logger.info('[NotificationService] Scheduled notification canceled', { notificationId });
    } catch (error) {
      logger.error('[NotificationService] Failed to cancel scheduled notification', error);
    }
  }

  public async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      logger.info('[NotificationService] All notifications canceled');
    } catch (error) {
      logger.error('[NotificationService] Failed to cancel all notifications', error);
    }
  }

  private shouldShowBasedOnPreferences(
    notificationData: NotificationData,
    preferences: NotificationPreferences,
  ): boolean {
    // Check category preferences
    const category = notificationData.category || 'default';
    if (preferences.categories[category] === false) {
      return false;
    }

    // Check quiet hours
    if (this.isWithinQuietHours()) {
      return false;
    }

    // Check frequency limits
    if (!this.checkFrequencyLimits(preferences)) {
      return false;
    }

    return true;
  }

  private isWithinQuietHours(): boolean {
    if (!this.preferences?.quietHours.enabled) {
      return false;
    }

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const { start, end } = this.preferences.quietHours;

    if (start <= end) {
      return currentTime >= start && currentTime <= end;
    } else {
      // Quiet hours span midnight
      return currentTime >= start || currentTime <= end;
    }
  }

  private checkFrequencyLimits(preferences: NotificationPreferences): boolean {
    const now = Date.now();
    const hourAgo = now - (60 * 60 * 1000);

    const recentNotifications = this.notificationHistory.filter(
      notification => {
        const timestamp = parseInt(notification.id.split('_')[1] || '0', 10);
        return timestamp > hourAgo;
      },
    );

    return recentNotifications.length < preferences.frequency.maxPerHour;
  }

  private addToHistory(notificationData: NotificationData): void {
    this.notificationHistory.unshift(notificationData);

    // Keep only last 100 notifications
    if (this.notificationHistory.length > 100) {
      this.notificationHistory = this.notificationHistory.slice(0, 100);
    }
  }

  private async handleDeepLink(deepLink: string): Promise<void> {
    try {
      const canOpen = await Linking.canOpenURL(deepLink);
      if (canOpen) {
        await Linking.openURL(deepLink);
      } else {
        logger.warn('[NotificationService] Cannot open deep link', { deepLink });
      }
    } catch (error) {
      logger.error('[NotificationService] Failed to handle deep link', error);
    }
  }

  public async getPreferences(): Promise<NotificationPreferences> {
    if (!this.preferences) {
      await this.loadPreferences();
    }
    return this.preferences!;
  }

  private async loadPreferences(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('notification_preferences');
      if (stored) {
        this.preferences = JSON.parse(stored);
      } else {
        this.preferences = this.getDefaultPreferences();
        await this.savePreferences(this.preferences);
      }
    } catch (error) {
      logger.error('[NotificationService] Failed to load preferences', error);
      this.preferences = this.getDefaultPreferences();
    }
  }

  public async savePreferences(preferences: NotificationPreferences): Promise<void> {
    try {
      this.preferences = preferences;
      await AsyncStorage.setItem('notification_preferences', JSON.stringify(preferences));
      logger.info('[NotificationService] Preferences saved');
    } catch (error) {
      logger.error('[NotificationService] Failed to save preferences', error);
    }
  }

  private getDefaultPreferences(): NotificationPreferences {
    return {
      enabled: true,
      categories: {
        default: true,
        watchlist: true,
        subscription: true,
        promotional: true,
        security: true,
        updates: true,
      },
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00',
      },
      frequency: {
        maxPerHour: 10,
        batchingSimilar: true,
      },
      sounds: {
        enabled: true,
      },
      vibration: true,
      showPreviews: true,
    };
  }

  public async requestPermission(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        logger.info('[NotificationService] Permission not granted');
        return false;
      }

      return true;
    } catch (error) {
      logger.error('[NotificationService] Failed to request permission', error);
      return false;
    }
  }

  public async checkPermission(): Promise<boolean> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      logger.error('[NotificationService] Failed to check permission', error);
      return false;
    }
  }

  public getNotificationHistory(): NotificationData[] {
    return [...this.notificationHistory];
  }

  public async clearNotificationHistory(): Promise<void> {
    this.notificationHistory = [];
    logger.info('[NotificationService] History cleared');
  }

  public getWatchlistService(): IWatchlistNotificationService {
    if (!this.watchlistService) {
      // Lazy-load to avoid circular dependency
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { WatchlistNotificationService } = require('./watchlistNotificationService');
      this.watchlistService = new WatchlistNotificationService() as IWatchlistNotificationService;
    }
    return this.watchlistService;
  }

  public getSubscriptionService(): ISubscriptionNotificationService {
    if (!this.subscriptionService) {
      // Lazy-load to avoid circular dependency
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { SubscriptionNotificationService } = require('./subscriptionNotificationService');
      this.subscriptionService = new SubscriptionNotificationService() as ISubscriptionNotificationService;
    }
    return this.subscriptionService;
  }

  public async sendNotification(notification: NotificationData): Promise<void> {
    await this.showLocalNotification(notification);
  }

  /**
   * Get the Expo push token for push notifications
   * This can be used with Azure Notification Hubs
   */
  public async getExpoPushToken(): Promise<string | null> {
    try {
      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        return null;
      }

      const token = await Notifications.getExpoPushTokenAsync({
        projectId: '00000000-0000-0000-0000-000000000000',
      });

      logger.info('[NotificationService] Expo push token obtained', { token: token.data });
      return token.data;
    } catch (error) {
      logger.error('[NotificationService] Failed to get Expo push token', error);
      return null;
    }
  }

  /**
   * Get the device push token for native push notifications
   * This can be used directly with APNs (iOS) or Azure Notification Hubs (Android)
   */
  public async getDevicePushToken(): Promise<string | null> {
    try {
      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        return null;
      }

      const token = await Notifications.getDevicePushTokenAsync();
      logger.info('[NotificationService] Device push token obtained', { token: token.data });
      return token.data;
    } catch (error) {
      logger.error('[NotificationService] Failed to get device push token', error);
      return null;
    }
  }

  /**
   * Set the badge count on the app icon
   */
  public async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      logger.error('[NotificationService] Failed to set badge count', error);
    }
  }

  /**
   * Get the current badge count
   */
  public async getBadgeCount(): Promise<number> {
    try {
      return await Notifications.getBadgeCountAsync();
    } catch (error) {
      logger.error('[NotificationService] Failed to get badge count', error);
      return 0;
    }
  }
}

export default NotificationService.getInstance();
