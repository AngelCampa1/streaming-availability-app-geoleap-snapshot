/**
 * WatchlistNotificationService Tests
 *
 * Tests watchlist notification functionality including availability updates,
 * new episodes, recommendations, and batch notifications.
 */

import {
  WatchlistNotificationService,
  WatchlistItem,
  AvailabilityUpdate,
} from '../../services/watchlistNotificationService';
import { NotificationService } from '../../services/notificationService';
import { NotificationAnalytics } from '../../services/notificationAnalytics';
import { logger } from '../../utils/logger';

// Mock dependencies
jest.mock('../../services/notificationService', () => ({
  NotificationService: {
    getInstance: jest.fn(),
  },
}));

jest.mock('../../services/notificationAnalytics', () => ({
  NotificationAnalytics: {
    getInstance: jest.fn(),
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('WatchlistNotificationService', () => {
  let service: WatchlistNotificationService;
  let mockNotificationService: jest.Mocked<NotificationService>;
  let mockAnalytics: jest.Mocked<NotificationAnalytics>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockNotificationService = {
      showLocalNotification: jest.fn().mockResolvedValue(undefined),
      sendNotification: jest.fn().mockResolvedValue(undefined),
      getInstance: jest.fn(),
    } as any;

    mockAnalytics = {
      trackEvent: jest.fn().mockResolvedValue(undefined),
      getInstance: jest.fn(),
    } as any;

    (NotificationService.getInstance as jest.Mock).mockReturnValue(mockNotificationService);
    (NotificationAnalytics.getInstance as jest.Mock).mockReturnValue(mockAnalytics);

    service = new WatchlistNotificationService();
  });

  describe('Constructor', () => {
    it('should initialize with NotificationService and NotificationAnalytics instances', () => {
      expect(NotificationService.getInstance).toHaveBeenCalled();
      expect(NotificationAnalytics.getInstance).toHaveBeenCalled();
    });
  });

  describe('Availability Notifications', () => {
    const mockUpdate: AvailabilityUpdate = {
      contentId: 'content_123',
      title: 'Stranger Things',
      service: 'Netflix',
      available: true,
    };

    it('should send notification when content becomes available', async () => {
      await service.sendAvailabilityNotification(mockUpdate);

      expect(mockNotificationService.showLocalNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '📺 Stranger Things is now available!',
          body: 'Watch now on Netflix',
          category: 'watchlist',
          priority: 'high',
        })
      );
    });

    it('should include watch now and add calendar actions when available', async () => {
      await service.sendAvailabilityNotification(mockUpdate);

      const notification = mockNotificationService.showLocalNotification.mock.calls[0][0];
      expect(notification.actions).toHaveLength(2);
      expect(notification.actions[0]).toMatchObject({
        id: 'watch_now',
        title: 'Watch Now',
      });
      expect(notification.actions[1]).toMatchObject({
        id: 'add_calendar',
        title: 'Add to Calendar',
      });
    });

    it('should send notification when content is leaving with expiry date', async () => {
      const expiryDate = new Date('2025-02-15');
      const leavingUpdate: AvailabilityUpdate = {
        ...mockUpdate,
        available: false,
        expiresAt: expiryDate,
      };

      await service.sendAvailabilityNotification(leavingUpdate);

      const notification = mockNotificationService.showLocalNotification.mock.calls[0][0];
      expect(notification.title).toBe('⚠️ Stranger Things leaving Netflix soon');
      expect(notification.body).toBe(`Expires ${expiryDate.toLocaleDateString()}`);
    });

    it('should send notification when content is leaving without expiry date', async () => {
      const leavingUpdate: AvailabilityUpdate = {
        ...mockUpdate,
        available: false,
      };

      await service.sendAvailabilityNotification(leavingUpdate);

      expect(mockNotificationService.showLocalNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '⚠️ Stranger Things leaving Netflix soon',
          body: "Watch before it's removed",
        })
      );
    });

    it('should include watch before removal action when leaving', async () => {
      const leavingUpdate: AvailabilityUpdate = {
        ...mockUpdate,
        available: false,
      };

      await service.sendAvailabilityNotification(leavingUpdate);

      const notification = mockNotificationService.showLocalNotification.mock.calls[0][0];
      expect(notification.actions).toHaveLength(1);
      expect(notification.actions[0]).toMatchObject({
        id: 'watch_now',
        title: 'Watch Before Removal',
      });
    });

    it('should include correct data in notification', async () => {
      await service.sendAvailabilityNotification(mockUpdate);

      const notification = mockNotificationService.showLocalNotification.mock.calls[0][0];
      expect(notification.data).toMatchObject({
        type: 'watchlist_availability',
        contentId: 'content_123',
        service: 'Netflix',
        deepLink: 'geoleap://content/content_123',
        available: 'true',
      });
    });

    it('should handle errors when sending availability notification', async () => {
      mockNotificationService.showLocalNotification.mockRejectedValue(new Error('Notification failed'));

      await expect(service.sendAvailabilityNotification(mockUpdate)).rejects.toThrow('Notification failed');
      expect(logger.error).toHaveBeenCalledWith(
        '[WatchlistNotificationService] Failed to send availability notification',
        expect.any(Error)
      );
    });
  });

  describe('New Episode Notifications', () => {
    const mockUpdate: AvailabilityUpdate = {
      contentId: 'series_456',
      title: 'The Office',
      service: 'Peacock',
      available: true,
      newEpisodes: 3,
    };

    it('should send notification for multiple new episodes', async () => {
      await service.sendNewEpisodeNotification(mockUpdate);

      expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '🆕 New episodes available!',
          body: '3 new episodes of The Office on Peacock',
          category: 'content',
          priority: 'high',
        })
      );
    });

    it('should use singular episode text for single episode', async () => {
      const singleEpisode: AvailabilityUpdate = {
        ...mockUpdate,
        newEpisodes: 1,
      };

      await service.sendNewEpisodeNotification(singleEpisode);

      const notification = mockNotificationService.sendNotification.mock.calls[0][0];
      expect(notification.title).toBe('🆕 New episode available!');
      expect(notification.body).toBe('1 new episode of The Office on Peacock');
    });

    it('should not send notification for zero episodes', async () => {
      const noEpisodes: AvailabilityUpdate = {
        ...mockUpdate,
        newEpisodes: 0,
      };

      await service.sendNewEpisodeNotification(noEpisodes);

      expect(mockNotificationService.sendNotification).not.toHaveBeenCalled();
      expect(mockAnalytics.trackEvent).not.toHaveBeenCalled();
    });

    it('should not send notification for negative episodes', async () => {
      const negativeEpisodes: AvailabilityUpdate = {
        ...mockUpdate,
        newEpisodes: -1,
      };

      await service.sendNewEpisodeNotification(negativeEpisodes);

      expect(mockNotificationService.sendNotification).not.toHaveBeenCalled();
    });

    it('should not send notification when newEpisodes is undefined', async () => {
      const noEpisodesField: AvailabilityUpdate = {
        contentId: 'series_456',
        title: 'The Office',
        service: 'Peacock',
        available: true,
      };

      await service.sendNewEpisodeNotification(noEpisodesField);

      expect(mockNotificationService.sendNotification).not.toHaveBeenCalled();
    });

    it('should include watch latest and view all actions', async () => {
      await service.sendNewEpisodeNotification(mockUpdate);

      const notification = mockNotificationService.sendNotification.mock.calls[0][0];
      expect(notification.actions).toHaveLength(2);
      expect(notification.actions[0]).toMatchObject({
        id: 'watch_latest',
        title: 'Watch Latest',
      });
      expect(notification.actions[1]).toMatchObject({
        id: 'view_all',
        title: 'View All Episodes',
      });
    });

    it('should track analytics event for new episodes', async () => {
      await service.sendNewEpisodeNotification(mockUpdate);

      expect(mockAnalytics.trackEvent).toHaveBeenCalledWith({
        type: 'received',
        templateId: 'new_episodes',
        category: 'content',
        priority: 'high',
        metadata: {
          content_id: 'series_456',
          episode_count: 3,
        },
      });
    });

    it('should handle errors when sending new episode notification', async () => {
      mockNotificationService.sendNotification.mockRejectedValue(new Error('Send failed'));

      await expect(service.sendNewEpisodeNotification(mockUpdate)).rejects.toThrow('Send failed');
      expect(logger.error).toHaveBeenCalledWith(
        '[WatchlistNotificationService] Failed to send new episode notification',
        expect.any(Error)
      );
    });
  });

  describe('Personalized Recommendations', () => {
    const mockRecommendation = {
      contentId: 'rec_789',
      title: 'Breaking Bad',
      reason: 'Because you watched Ozark',
      service: 'Netflix',
      genre: 'Crime Drama',
      rating: 9.5,
    };

    it('should send personalized recommendation notification', async () => {
      await service.sendPersonalizedRecommendation(mockRecommendation);

      expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '🎯 Recommended for you',
          body: 'Breaking Bad - Because you watched Ozark',
          category: 'recommendations',
          priority: 'normal',
        })
      );
    });

    it('should include view details and add watchlist actions', async () => {
      await service.sendPersonalizedRecommendation(mockRecommendation);

      const notification = mockNotificationService.sendNotification.mock.calls[0][0];
      expect(notification.actions).toHaveLength(2);
      expect(notification.actions[0]).toMatchObject({
        id: 'view_details',
        title: 'View Details',
      });
      expect(notification.actions[1]).toMatchObject({
        id: 'add_watchlist',
        title: 'Add to Watchlist',
      });
    });

    it('should include recommendation metadata in notification data', async () => {
      await service.sendPersonalizedRecommendation(mockRecommendation);

      const notification = mockNotificationService.sendNotification.mock.calls[0][0];
      expect(notification.data).toMatchObject({
        type: 'personalized_recommendation',
        contentId: 'rec_789',
        service: 'Netflix',
        genre: 'Crime Drama',
        rating: '9.5',
      });
    });

    it('should track analytics event for recommendation', async () => {
      await service.sendPersonalizedRecommendation(mockRecommendation);

      expect(mockAnalytics.trackEvent).toHaveBeenCalledWith({
        type: 'received',
        templateId: 'personalized_recommendation',
        category: 'recommendations',
        priority: 'normal',
        metadata: {
          content_id: 'rec_789',
          genre: 'Crime Drama',
          rating: 9.5,
        },
      });
    });

    it('should handle errors when sending recommendation notification', async () => {
      mockNotificationService.sendNotification.mockRejectedValue(new Error('Recommendation failed'));

      await expect(service.sendPersonalizedRecommendation(mockRecommendation)).rejects.toThrow('Recommendation failed');
      expect(logger.error).toHaveBeenCalledWith(
        '[WatchlistNotificationService] Failed to send recommendation notification',
        expect.any(Error)
      );
    });
  });

  describe('Batch Watchlist Updates', () => {
    it('should not send notification for empty updates array', async () => {
      await service.sendBatchWatchlistUpdates([]);

      expect(mockNotificationService.sendNotification).not.toHaveBeenCalled();
      expect(mockAnalytics.trackEvent).not.toHaveBeenCalled();
    });

    it('should send single notification for one update', async () => {
      const singleUpdate: AvailabilityUpdate = {
        contentId: 'content_1',
        title: 'Movie 1',
        service: 'Netflix',
        available: true,
      };

      await service.sendBatchWatchlistUpdates([singleUpdate]);

      expect(mockNotificationService.showLocalNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '📺 Movie 1 is now available!',
        })
      );
      // Should NOT call sendNotification for batch
      expect(mockNotificationService.sendNotification).not.toHaveBeenCalled();
    });

    it('should send batch notification for multiple updates with all available', async () => {
      const updates: AvailabilityUpdate[] = [
        { contentId: 'c1', title: 'Movie 1', service: 'Netflix', available: true },
        { contentId: 'c2', title: 'Movie 2', service: 'Hulu', available: true },
        { contentId: 'c3', title: 'Movie 3', service: 'Disney+', available: true },
      ];

      await service.sendBatchWatchlistUpdates(updates);

      expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '📺 Watchlist Updates',
          body: '3 watchlist items are now available',
          category: 'watchlist',
          priority: 'normal',
        })
      );
    });

    it('should send batch notification for multiple updates with all leaving', async () => {
      const updates: AvailabilityUpdate[] = [
        { contentId: 'c1', title: 'Movie 1', service: 'Netflix', available: false },
        { contentId: 'c2', title: 'Movie 2', service: 'Hulu', available: false },
      ];

      await service.sendBatchWatchlistUpdates(updates);

      expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '📺 Watchlist Updates',
          body: '2 watchlist items leaving soon',
        })
      );
    });

    it('should send batch notification for mixed available and leaving updates', async () => {
      const updates: AvailabilityUpdate[] = [
        { contentId: 'c1', title: 'Movie 1', service: 'Netflix', available: true },
        { contentId: 'c2', title: 'Movie 2', service: 'Hulu', available: true },
        { contentId: 'c3', title: 'Movie 3', service: 'Disney+', available: false },
      ];

      await service.sendBatchWatchlistUpdates(updates);

      expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '📺 Watchlist Updates',
          body: '2 items now available, 1 leaving soon',
        })
      );
    });

    it('should include correct batch data in notification', async () => {
      const updates: AvailabilityUpdate[] = [
        { contentId: 'c1', title: 'Movie 1', service: 'Netflix', available: true },
        { contentId: 'c2', title: 'Movie 2', service: 'Hulu', available: false },
      ];

      await service.sendBatchWatchlistUpdates(updates);

      const notification = mockNotificationService.sendNotification.mock.calls[0][0];
      expect(notification.data).toMatchObject({
        type: 'watchlist_batch',
        updateCount: '2',
        availableCount: '1',
        leavingCount: '1',
        deepLink: 'geoleap://watchlist',
      });
    });

    it('should include view watchlist and view available actions', async () => {
      const updates: AvailabilityUpdate[] = [
        { contentId: 'c1', title: 'Movie 1', service: 'Netflix', available: true },
        { contentId: 'c2', title: 'Movie 2', service: 'Hulu', available: true },
      ];

      await service.sendBatchWatchlistUpdates(updates);

      const notification = mockNotificationService.sendNotification.mock.calls[0][0];
      expect(notification.actions).toHaveLength(2);
      expect(notification.actions[0]).toMatchObject({
        id: 'view_watchlist',
        title: 'View Watchlist',
      });
      expect(notification.actions[1]).toMatchObject({
        id: 'view_available',
        title: 'View Available',
      });
    });

    it('should track analytics event for batch updates', async () => {
      const updates: AvailabilityUpdate[] = [
        { contentId: 'c1', title: 'Movie 1', service: 'Netflix', available: true },
        { contentId: 'c2', title: 'Movie 2', service: 'Hulu', available: false },
        { contentId: 'c3', title: 'Movie 3', service: 'Disney+', available: true },
      ];

      await service.sendBatchWatchlistUpdates(updates);

      expect(mockAnalytics.trackEvent).toHaveBeenCalledWith({
        type: 'received',
        templateId: 'watchlist_batch',
        category: 'watchlist',
        priority: 'normal',
        metadata: {
          update_count: 3,
          available_count: 2,
          leaving_count: 1,
        },
      });
    });

    it('should handle errors when sending batch notifications', async () => {
      const updates: AvailabilityUpdate[] = [
        { contentId: 'c1', title: 'Movie 1', service: 'Netflix', available: true },
        { contentId: 'c2', title: 'Movie 2', service: 'Hulu', available: true },
      ];

      mockNotificationService.sendNotification.mockRejectedValue(new Error('Batch failed'));

      await expect(service.sendBatchWatchlistUpdates(updates)).rejects.toThrow('Batch failed');
      expect(logger.error).toHaveBeenCalledWith(
        '[WatchlistNotificationService] Failed to send batch watchlist notifications',
        expect.any(Error)
      );
    });
  });
});
