/**
 * Notification Analytics Service
 *
 * Tracks notification events and metrics locally.
 * Now integrated with AnalyticsManager for unified backend sync.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AnalyticsManager } from './analytics/AnalyticsManager';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

export interface NotificationEvent {
  id: string;
  type: 'received' | 'opened' | 'dismissed' | 'action_taken' | 'permission_requested' | 'permission_granted' | 'permission_denied';
  templateId?: string;
  category?: string;
  priority?: string;
  actionId?: string;
  timestamp: number;
  userId?: string;
  deviceInfo?: {
    platform: string;
    osVersion: string;
    appVersion: string;
  };
  metadata?: Record<string, unknown>;
}

export interface NotificationMetrics {
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalDismissed: number;
  openRate: number;
  dismissRate: number;
  categoryBreakdown: Record<string, number>;
  templatePerformance: Record<string, {
    sent: number;
    opened: number;
    dismissed: number;
    openRate: number;
  }>;
  timeDistribution: Record<string, number>;
  actionPerformance: Record<string, number>;
}

export interface AnalyticsConfig {
  enableTracking: boolean;
  batchSize: number;
  uploadInterval: number; // in minutes
  retentionDays: number;
}

export class NotificationAnalytics {
  private static instance: NotificationAnalytics;
  private config: AnalyticsConfig;
  private eventQueue: NotificationEvent[] = [];
  private uploadTimer: ReturnType<typeof setInterval> | null = null;
  private isUploading = false;
  private analyticsManager: AnalyticsManager;

  private constructor() {
    this.config = this.getDefaultConfig();
    this.analyticsManager = AnalyticsManager.getInstance();
  }

  public static getInstance(): NotificationAnalytics {
    if (!NotificationAnalytics.instance) {
      NotificationAnalytics.instance = new NotificationAnalytics();
    }
    return NotificationAnalytics.instance;
  }

  private getDefaultConfig(): AnalyticsConfig {
    return {
      enableTracking: true,
      batchSize: 50,
      uploadInterval: 30, // 30 minutes
      retentionDays: 30,
    };
  }

  public async initialize(): Promise<void> {
    try {
      await this.loadConfig();
      await this.loadEventQueue();
      this.startPeriodicUpload();

      logger.info('[NotificationAnalytics] Initialized successfully (local tracking only)');
    } catch (error) {
      logger.error('[NotificationAnalytics] Failed to initialize', error);
    }
  }

  public async trackEvent(event: Omit<NotificationEvent, 'id' | 'timestamp'>): Promise<void> {
    if (!this.config.enableTracking) {
      return;
    }

    try {
      const fullEvent: NotificationEvent = {
        ...event,
        id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        deviceInfo: await this.getDeviceInfo(),
      };

      // Add to local queue
      this.eventQueue.push(fullEvent);

      // Save queue to storage
      await this.saveEventQueue();

      // Upload if queue is full
      if (this.eventQueue.length >= this.config.batchSize) {
        this.uploadEvents();
      }

      logger.debug('[NotificationAnalytics] Event tracked', { type: fullEvent.type, templateId: fullEvent.templateId });
    } catch (error) {
      logger.error('[NotificationAnalytics] Failed to track notification event', error);
    }
  }

  private async getDeviceInfo() {
    return {
      platform: 'react-native',
      osVersion: 'unknown',
      appVersion: 'unknown',
    };
  }

  public async trackNotificationReceived(templateId: string, category: string, priority: string): Promise<void> {
    await this.trackEvent({
      type: 'received',
      templateId,
      category,
      priority,
    });
  }

  public async trackNotificationOpened(templateId: string, category: string): Promise<void> {
    await this.trackEvent({
      type: 'opened',
      templateId,
      category,
    });
  }

  public async trackNotificationDismissed(templateId: string, category: string): Promise<void> {
    await this.trackEvent({
      type: 'dismissed',
      templateId,
      category,
    });
  }

  public async trackNotificationAction(templateId: string, actionId: string, category: string): Promise<void> {
    await this.trackEvent({
      type: 'action_taken',
      templateId,
      category,
      actionId,
    });
  }

  public async trackPermissionRequested(): Promise<void> {
    await this.trackEvent({
      type: 'permission_requested',
    });
  }

  public async trackPermissionGranted(): Promise<void> {
    await this.trackEvent({
      type: 'permission_granted',
    });
  }

  public async trackPermissionDenied(): Promise<void> {
    await this.trackEvent({
      type: 'permission_denied',
    });
  }

  private startPeriodicUpload(): void {
    if (this.uploadTimer) {
      clearInterval(this.uploadTimer);
    }

    const intervalMs = this.config.uploadInterval * 60 * 1000;
    this.uploadTimer = setInterval(() => {
      if (this.eventQueue.length > 0 && !this.isUploading) {
        this.uploadEvents();
      }
    }, intervalMs);

    logger.info('[NotificationAnalytics] Analytics upload scheduled', { intervalMinutes: this.config.uploadInterval });
  }

  private async uploadEvents(): Promise<void> {
    if (this.isUploading || this.eventQueue.length === 0) {
      return;
    }

    this.isUploading = true;

    try {
      logger.info('[NotificationAnalytics] Processing notification events', { count: this.eventQueue.length });

      // Create batch of events to upload
      const eventsToUpload = [...this.eventQueue];

      // Send to AnalyticsManager for unified backend sync
      for (const event of eventsToUpload) {
        await this.analyticsManager.trackEvent({
          id: uuidv4(),
          timestamp: event.timestamp,
          eventType: `notification_${event.type}`,
          category: 'notification',
          source: 'notifications',
          data: {
            templateId: event.templateId,
            category: event.category,
            priority: event.priority,
            actionId: event.actionId,
            userId: event.userId,
            deviceInfo: event.deviceInfo,
            metadata: event.metadata,
          },
          retryCount: 0,
        });
      }

      // Calculate and log metrics for local insights
      const metrics = this.calculateMetrics(eventsToUpload);
      logger.debug('[NotificationAnalytics] Notification metrics calculated', { metrics });

      // Clear uploaded events
      this.eventQueue = [];
      await this.saveEventQueue();

      logger.info('[NotificationAnalytics] Events processed and sent to AnalyticsManager successfully');
    } catch (error) {
      logger.error('[NotificationAnalytics] Failed to process events', error);
    } finally {
      this.isUploading = false;
    }
  }

  public calculateMetrics(events?: NotificationEvent[]): NotificationMetrics {
    const eventsToAnalyze = events || this.eventQueue;

    const metrics: NotificationMetrics = {
      totalSent: 0,
      totalDelivered: 0,
      totalOpened: 0,
      totalDismissed: 0,
      openRate: 0,
      dismissRate: 0,
      categoryBreakdown: {},
      templatePerformance: {},
      timeDistribution: {},
      actionPerformance: {},
    };

    eventsToAnalyze.forEach(event => {
      // Count by type
      switch (event.type) {
        case 'received':
          metrics.totalDelivered++;
          break;
        case 'opened':
          metrics.totalOpened++;
          break;
        case 'dismissed':
          metrics.totalDismissed++;
          break;
        case 'action_taken':
          if (event.actionId) {
            metrics.actionPerformance[event.actionId] =
              (metrics.actionPerformance[event.actionId] || 0) + 1;
          }
          break;
      }

      // Category breakdown
      if (event.category) {
        metrics.categoryBreakdown[event.category] =
          (metrics.categoryBreakdown[event.category] || 0) + 1;
      }

      // Template performance
      if (event.templateId) {
        if (!metrics.templatePerformance[event.templateId]) {
          metrics.templatePerformance[event.templateId] = {
            sent: 0,
            opened: 0,
            dismissed: 0,
            openRate: 0,
          };
        }

        const template = metrics.templatePerformance[event.templateId];
        switch (event.type) {
          case 'received':
            template.sent++;
            break;
          case 'opened':
            template.opened++;
            break;
          case 'dismissed':
            template.dismissed++;
            break;
        }
      }

      // Time distribution (hour of day)
      const hour = new Date(event.timestamp).getHours();
      const hourKey = `${hour.toString().padStart(2, '0')}:00`;
      metrics.timeDistribution[hourKey] =
        (metrics.timeDistribution[hourKey] || 0) + 1;
    });

    // Calculate rates
    if (metrics.totalDelivered > 0) {
      metrics.openRate = (metrics.totalOpened / metrics.totalDelivered) * 100;
      metrics.dismissRate = (metrics.totalDismissed / metrics.totalDelivered) * 100;
    }

    // Calculate template open rates
    Object.keys(metrics.templatePerformance).forEach(templateId => {
      const template = metrics.templatePerformance[templateId];
      if (template.sent > 0) {
        template.openRate = (template.opened / template.sent) * 100;
      }
    });

    return metrics;
  }

  public async getMetrics(days: number = 7): Promise<NotificationMetrics> {
    try {
      await this.loadEventQueue();

      // Filter events by date range
      const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
      const recentEvents = this.eventQueue.filter(event => event.timestamp > cutoffTime);

      return this.calculateMetrics(recentEvents);
    } catch (error) {
      logger.error('[NotificationAnalytics] Failed to get metrics', error);
      return this.calculateMetrics([]);
    }
  }

  public async exportEvents(startDate: Date, endDate: Date): Promise<NotificationEvent[]> {
    try {
      await this.loadEventQueue();

      return this.eventQueue.filter(event =>
        event.timestamp >= startDate.getTime() &&
        event.timestamp <= endDate.getTime(),
      );
    } catch (error) {
      logger.error('[NotificationAnalytics] Failed to export events', error);
      return [];
    }
  }

  private async loadConfig(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('notification_analytics_config');
      if (stored) {
        this.config = { ...this.config, ...JSON.parse(stored) };
      }
    } catch (error) {
      logger.error('[NotificationAnalytics] Failed to load analytics config', error);
    }
  }

  public async saveConfig(config: Partial<AnalyticsConfig>): Promise<void> {
    try {
      this.config = { ...this.config, ...config };
      await AsyncStorage.setItem('notification_analytics_config', JSON.stringify(this.config));

      // Restart upload timer if interval changed
      if (config.uploadInterval) {
        this.startPeriodicUpload();
      }
    } catch (error) {
      logger.error('[NotificationAnalytics] Failed to save analytics config', error);
    }
  }

  private async loadEventQueue(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('notification_analytics_events');
      if (stored) {
        const events = JSON.parse(stored);

        // Clean up old events based on retention policy
        const cutoffTime = Date.now() - (this.config.retentionDays * 24 * 60 * 60 * 1000);
        this.eventQueue = events.filter((event: NotificationEvent) =>
          event.timestamp > cutoffTime,
        );

        // Save cleaned queue back to storage
        await this.saveEventQueue();
      }
    } catch (error) {
      logger.error('[NotificationAnalytics] Failed to load event queue', error);
      this.eventQueue = [];
    }
  }

  private async saveEventQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem('notification_analytics_events', JSON.stringify(this.eventQueue));
    } catch (error) {
      logger.error('[NotificationAnalytics] Failed to save event queue', error);
    }
  }

  public getConfig(): AnalyticsConfig {
    return { ...this.config };
  }

  public getQueueStatus(): { size: number; isUploading: boolean } {
    return {
      size: this.eventQueue.length,
      isUploading: this.isUploading,
    };
  }

  public async clearAllData(): Promise<void> {
    try {
      this.eventQueue = [];
      await AsyncStorage.removeItem('notification_analytics_events');
      await AsyncStorage.removeItem('notification_analytics_config');

      logger.info('[NotificationAnalytics] All analytics data cleared');
    } catch (error) {
      logger.error('[NotificationAnalytics] Failed to clear analytics data', error);
    }
  }

  public async forceUpload(): Promise<void> {
    await this.uploadEvents();
  }

  public dispose(): void {
    if (this.uploadTimer) {
      clearInterval(this.uploadTimer);
      this.uploadTimer = null;
    }
  }
}

export default NotificationAnalytics.getInstance();
