import { NotificationService } from './notificationService';
import { NotificationAnalytics } from './notificationAnalytics';
import { logger } from '../utils/logger';

export interface WatchlistItem {
  id: string;
  title: string;
  type: 'movie' | 'tv';
  posterUrl?: string;
  userId: string;
}

export interface AvailabilityUpdate {
  contentId: string;
  title: string;
  service: string;
  available: boolean;
  expiresAt?: Date;
  newEpisodes?: number;
}

export class WatchlistNotificationService {
  private notificationService: NotificationService;
  private analytics: NotificationAnalytics;

  constructor() {
    this.notificationService = NotificationService.getInstance();
    this.analytics = NotificationAnalytics.getInstance();
  }

  /**
   * AC1: Users receive push notifications for watchlist item availability changes
   */
  async sendAvailabilityNotification(update: AvailabilityUpdate): Promise<void> {
    try {
      const notification = {
        title: update.available
          ? `📺 ${update.title} is now available!`
          : `⚠️ ${update.title} leaving ${update.service} soon`,
        body: update.available
          ? `Watch now on ${update.service}`
          : update.expiresAt
            ? `Expires ${update.expiresAt.toLocaleDateString()}`
            : 'Watch before it\'s removed',
        data: {
          type: 'watchlist_availability',
          contentId: update.contentId,
          service: update.service,
          deepLink: `geoleap://content/${update.contentId}`,
          available: update.available.toString(),
        },
        imageUrl: `https://api.geoleap.com/images/content/${update.contentId}/poster`,
        actions: update.available ? [
          {
            id: 'watch_now',
            title: 'Watch Now',
            deepLink: `geoleap://watch/${update.contentId}?service=${update.service}`,
          },
          {
            id: 'add_calendar',
            title: 'Add to Calendar',
            deepLink: `geoleap://calendar/add/${update.contentId}`,
          },
        ] : [
          {
            id: 'watch_now',
            title: 'Watch Before Removal',
            deepLink: `geoleap://watch/${update.contentId}?service=${update.service}`,
          },
        ],
        category: 'watchlist',
        priority: 'high' as 'low' | 'normal' | 'high',
        id: `watchlist_${Date.now()}`,
      };

      await this.notificationService.showLocalNotification(notification);

      // Track analytics
      // await this.analytics.trackEvent('notification_sent', {
      //   type: 'watchlist_availability',
      //   content_id: update.contentId,
      //   service: update.service,
      //   available: update.available,
      // });

    } catch (error) {
      logger.error('[WatchlistNotificationService] Failed to send availability notification', error);
      throw error;
    }
  }

  /**
   * AC1: New episodes available notifications
   */
  async sendNewEpisodeNotification(update: AvailabilityUpdate): Promise<void> {
    if (!update.newEpisodes || update.newEpisodes <= 0) {return;}

    try {
      const episodeText = update.newEpisodes === 1 ? 'episode' : 'episodes';

      const notification = {
        id: `new_episodes_${update.contentId}_${Date.now()}`,
        title: `🆕 New ${episodeText} available!`,
        body: `${update.newEpisodes} new ${episodeText} of ${update.title} on ${update.service}`,
        data: {
          type: 'new_episodes',
          contentId: update.contentId,
          service: update.service,
          episodeCount: update.newEpisodes.toString(),
          deepLink: `geoleap://content/${update.contentId}/episodes`,
        },
        imageUrl: `https://api.geoleap.com/images/content/${update.contentId}/banner`,
        actions: [
          {
            id: 'watch_latest',
            title: 'Watch Latest',
            deepLink: `geoleap://watch/${update.contentId}/latest?service=${update.service}`,
          },
          {
            id: 'view_all',
            title: 'View All Episodes',
            deepLink: `geoleap://content/${update.contentId}/episodes`,
          },
        ],
        category: 'content',
        priority: 'high' as 'low' | 'normal' | 'high',
      };

      await this.notificationService.sendNotification(notification);

      await this.analytics.trackEvent({
        type: 'received',
        templateId: 'new_episodes',
        category: 'content',
        priority: 'high',
        metadata: {
          content_id: update.contentId,
          episode_count: update.newEpisodes,
        },
      });

    } catch (error) {
      logger.error('[WatchlistNotificationService] Failed to send new episode notification', error);
      throw error;
    }
  }

  /**
   * AC2: Content recommendations based on viewing history
   */
  async sendPersonalizedRecommendation(recommendation: {
    contentId: string;
    title: string;
    reason: string;
    service: string;
    genre: string;
    rating: number;
  }): Promise<void> {
    try {
      const notification = {
        id: `recommendation_${recommendation.contentId}_${Date.now()}`,
        title: '🎯 Recommended for you',
        body: `${recommendation.title} - ${recommendation.reason}`,
        data: {
          type: 'personalized_recommendation',
          contentId: recommendation.contentId,
          service: recommendation.service,
          genre: recommendation.genre,
          rating: recommendation.rating.toString(),
          deepLink: `geoleap://content/${recommendation.contentId}?source=recommendation`,
        },
        imageUrl: `https://api.geoleap.com/images/content/${recommendation.contentId}/poster`,
        actions: [
          {
            id: 'view_details',
            title: 'View Details',
            deepLink: `geoleap://content/${recommendation.contentId}`,
          },
          {
            id: 'add_watchlist',
            title: 'Add to Watchlist',
            deepLink: `geoleap://watchlist/add/${recommendation.contentId}`,
          },
        ],
        category: 'recommendations',
        priority: 'normal' as 'low' | 'normal' | 'high',
      };

      await this.notificationService.sendNotification(notification);

      await this.analytics.trackEvent({
        type: 'received',
        templateId: 'personalized_recommendation',
        category: 'recommendations',
        priority: 'normal',
        metadata: {
          content_id: recommendation.contentId,
          genre: recommendation.genre,
          rating: recommendation.rating,
        },
      });

    } catch (error) {
      logger.error('[WatchlistNotificationService] Failed to send recommendation notification', error);
      throw error;
    }
  }

  /**
   * AC: Batch notifications to prevent spam
   */
  async sendBatchWatchlistUpdates(updates: AvailabilityUpdate[]): Promise<void> {
    if (updates.length === 0) {return;}

    try {
      if (updates.length === 1) {
        await this.sendAvailabilityNotification(updates[0]);
        return;
      }

      const availableCount = updates.filter(u => u.available).length;
      const leavingCount = updates.filter(u => !u.available).length;

      const title = '📺 Watchlist Updates';
      let body = '';

      if (availableCount > 0 && leavingCount > 0) {
        body = `${availableCount} items now available, ${leavingCount} leaving soon`;
      } else if (availableCount > 0) {
        body = `${availableCount} watchlist items are now available`;
      } else {
        body = `${leavingCount} watchlist items leaving soon`;
      }

      const notification = {
        id: `watchlist_batch_${Date.now()}`,
        title,
        body,
        data: {
          type: 'watchlist_batch',
          updateCount: updates.length.toString(),
          availableCount: availableCount.toString(),
          leavingCount: leavingCount.toString(),
          deepLink: 'geoleap://watchlist',
        },
        actions: [
          {
            id: 'view_watchlist',
            title: 'View Watchlist',
            deepLink: 'geoleap://watchlist',
          },
          {
            id: 'view_available',
            title: 'View Available',
            deepLink: 'geoleap://watchlist?filter=available',
          },
        ],
        category: 'watchlist',
        priority: 'normal' as 'low' | 'normal' | 'high',
      };

      await this.notificationService.sendNotification(notification);

      await this.analytics.trackEvent({
        type: 'received',
        templateId: 'watchlist_batch',
        category: 'watchlist',
        priority: 'normal',
        metadata: {
          update_count: updates.length,
          available_count: availableCount,
          leaving_count: leavingCount,
        },
      });

    } catch (error) {
      logger.error('[WatchlistNotificationService] Failed to send batch watchlist notifications', error);
      throw error;
    }
  }
}
