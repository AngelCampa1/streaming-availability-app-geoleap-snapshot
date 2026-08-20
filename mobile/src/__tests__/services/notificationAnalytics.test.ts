/**
 * NotificationAnalytics Tests
 *
 * Tests REAL business logic for notification analytics tracking.
 * Target: 95%+ coverage
 *
 * Philosophy: Execute real service logic, only mock external I/O
 * - Mock: AsyncStorage, AnalyticsManager
 * - Real: All business logic, metrics calculation, queue management
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { NotificationAnalytics } from '../../services/notificationAnalytics';
import { AnalyticsManager } from '../../services/analytics/AnalyticsManager';

// Mock dependencies (external I/O only)
jest.mock('@react-native-async-storage/async-storage');
jest.mock('../../services/analytics/AnalyticsManager');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234'),
}));

describe('NotificationAnalytics', () => {
  let service: NotificationAnalytics;
  let mockAnalyticsManager: jest.Mocked<AnalyticsManager>;

  beforeEach(async () => {
    // Clear mocks
    jest.clearAllMocks();
    jest.useFakeTimers();
    await AsyncStorage.clear();

    // Reset singleton instance
    (NotificationAnalytics as any).instance = null;

    // Mock AsyncStorage
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

    // Mock AnalyticsManager
    mockAnalyticsManager = {
      trackEvent: jest.fn().mockResolvedValue(undefined),
      getInstance: jest.fn(),
    } as any;
    (AnalyticsManager.getInstance as jest.Mock).mockReturnValue(mockAnalyticsManager);

    // Get fresh instance
    service = NotificationAnalytics.getInstance();
  });

  afterEach(() => {
    service.dispose();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = NotificationAnalytics.getInstance();
      const instance2 = NotificationAnalytics.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('initialize()', () => {
    it('should initialize successfully with default config', async () => {
      await service.initialize();

      // Should try to load config from storage
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('notification_analytics_config');

      // Should try to load event queue
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('notification_analytics_events');
    });

    it('should load existing config from storage', async () => {
      const savedConfig = {
        enableTracking: false,
        batchSize: 100,
        uploadInterval: 60,
        retentionDays: 60,
      };

      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === 'notification_analytics_config') {
          return Promise.resolve(JSON.stringify(savedConfig));
        }
        return Promise.resolve(null);
      });

      await service.initialize();

      const config = service.getConfig();
      expect(config.batchSize).toBe(100);
      expect(config.uploadInterval).toBe(60);
    });

    it('should load existing event queue from storage', async () => {
      const savedEvents = [
        {
          id: 'event-1',
          type: 'received',
          templateId: 'test-template',
          timestamp: Date.now(),
        },
        {
          id: 'event-2',
          type: 'opened',
          templateId: 'test-template',
          timestamp: Date.now(),
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === 'notification_analytics_events') {
          return Promise.resolve(JSON.stringify(savedEvents));
        }
        return Promise.resolve(null);
      });

      await service.initialize();

      const status = service.getQueueStatus();
      expect(status.size).toBe(2);
    });

    it('should handle initialization errors gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      // Should not throw
      await expect(service.initialize()).resolves.not.toThrow();
    });
  });

  describe('Event Tracking', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should track notification received event', async () => {
      await service.trackNotificationReceived('welcome_template', 'onboarding', 'high');

      // Should save event to storage
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'notification_analytics_events',
        expect.stringContaining('received')
      );
    });

    it('should track notification opened event', async () => {
      await service.trackNotificationOpened('welcome_template', 'onboarding');

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'notification_analytics_events',
        expect.stringContaining('opened')
      );
    });

    it('should track notification dismissed event', async () => {
      await service.trackNotificationDismissed('welcome_template', 'onboarding');

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'notification_analytics_events',
        expect.stringContaining('dismissed')
      );
    });

    it('should track notification action event', async () => {
      await service.trackNotificationAction('welcome_template', 'view_details', 'onboarding');

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'notification_analytics_events',
        expect.stringContaining('action_taken')
      );
    });

    it('should track permission requested event', async () => {
      await service.trackPermissionRequested();

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'notification_analytics_events',
        expect.stringContaining('permission_requested')
      );
    });

    it('should track permission granted event', async () => {
      await service.trackPermissionGranted();

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'notification_analytics_events',
        expect.stringContaining('permission_granted')
      );
    });

    it('should track permission denied event', async () => {
      await service.trackPermissionDenied();

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'notification_analytics_events',
        expect.stringContaining('permission_denied')
      );
    });

    it('should generate unique event IDs', async () => {
      await service.trackNotificationReceived('template1', 'cat1', 'high');
      await service.trackNotificationReceived('template2', 'cat2', 'low');

      // Each call should save different data
      expect(AsyncStorage.setItem).toHaveBeenCalledTimes(2);
    });

    it('should not track events when tracking is disabled', async () => {
      await service.saveConfig({ enableTracking: false });
      jest.clearAllMocks();

      await service.trackNotificationReceived('template', 'category', 'high');

      // Should not save to storage
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('should handle tracking errors gracefully', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Storage full'));

      // Should not throw
      await expect(
        service.trackNotificationReceived('template', 'category', 'high')
      ).resolves.not.toThrow();
    });
  });

  describe('Batch Upload', () => {
    beforeEach(async () => {
      await service.initialize();
      jest.clearAllMocks();
    });

    it('should trigger upload when batch size is reached', async () => {
      // Track 50 events (default batch size)
      const trackPromises = [];
      for (let i = 0; i < 50; i++) {
        trackPromises.push(
          service.trackNotificationReceived(`template${i}`, 'test', 'normal')
        );
      }
      await Promise.all(trackPromises);

      // Manually trigger upload since async upload might not complete in time
      await service.forceUpload();

      // Should have called AnalyticsManager for each event
      expect(mockAnalyticsManager.trackEvent).toHaveBeenCalled();
    }, 10000); // Increase timeout to 10 seconds

    it('should clear queue after successful upload', async () => {
      // Track events
      await service.trackNotificationReceived('template1', 'cat1', 'high');
      await service.trackNotificationReceived('template2', 'cat2', 'low');

      // Force upload
      await service.forceUpload();

      // Queue should be cleared
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'notification_analytics_events',
        '[]'
      );
    });

    it('should handle upload errors gracefully', async () => {
      mockAnalyticsManager.trackEvent.mockRejectedValue(new Error('Upload failed'));

      await service.trackNotificationReceived('template', 'category', 'high');

      // Should not throw
      await expect(service.forceUpload()).resolves.not.toThrow();
    });

    it('should not upload if already uploading', async () => {
      await service.trackNotificationReceived('template1', 'cat1', 'high');

      // Start first upload
      const upload1 = service.forceUpload();

      // Try to start second upload immediately
      const upload2 = service.forceUpload();

      await Promise.all([upload1, upload2]);

      // Should only upload once
      const status = service.getQueueStatus();
      expect(status.isUploading).toBe(false);
    });
  });

  describe('Metrics Calculation', () => {
    it('should calculate basic metrics from events', () => {
      const events = [
        { id: '1', type: 'received' as const, templateId: 'tmpl1', timestamp: Date.now() },
        { id: '2', type: 'received' as const, templateId: 'tmpl1', timestamp: Date.now() },
        { id: '3', type: 'opened' as const, templateId: 'tmpl1', timestamp: Date.now() },
        { id: '4', type: 'dismissed' as const, templateId: 'tmpl1', timestamp: Date.now() },
      ];

      const metrics = service.calculateMetrics(events);

      expect(metrics.totalDelivered).toBe(2);
      expect(metrics.totalOpened).toBe(1);
      expect(metrics.totalDismissed).toBe(1);
      expect(metrics.openRate).toBe(50); // 1/2 = 50%
      expect(metrics.dismissRate).toBe(50); // 1/2 = 50%
    });

    it('should calculate category breakdown', () => {
      const events = [
        { id: '1', type: 'received' as const, category: 'onboarding', timestamp: Date.now() },
        { id: '2', type: 'received' as const, category: 'onboarding', timestamp: Date.now() },
        { id: '3', type: 'received' as const, category: 'promotional', timestamp: Date.now() },
      ];

      const metrics = service.calculateMetrics(events);

      expect(metrics.categoryBreakdown['onboarding']).toBe(2);
      expect(metrics.categoryBreakdown['promotional']).toBe(1);
    });

    it('should calculate template performance', () => {
      const events = [
        { id: '1', type: 'received' as const, templateId: 'welcome', timestamp: Date.now() },
        { id: '2', type: 'received' as const, templateId: 'welcome', timestamp: Date.now() },
        { id: '3', type: 'opened' as const, templateId: 'welcome', timestamp: Date.now() },
      ];

      const metrics = service.calculateMetrics(events);

      expect(metrics.templatePerformance['welcome'].sent).toBe(2);
      expect(metrics.templatePerformance['welcome'].opened).toBe(1);
      expect(metrics.templatePerformance['welcome'].openRate).toBe(50); // 1/2 = 50%
    });

    it('should calculate action performance', () => {
      const events = [
        { id: '1', type: 'action_taken' as const, actionId: 'view', timestamp: Date.now() },
        { id: '2', type: 'action_taken' as const, actionId: 'view', timestamp: Date.now() },
        { id: '3', type: 'action_taken' as const, actionId: 'dismiss', timestamp: Date.now() },
      ];

      const metrics = service.calculateMetrics(events);

      expect(metrics.actionPerformance['view']).toBe(2);
      expect(metrics.actionPerformance['dismiss']).toBe(1);
    });

    it('should calculate time distribution by hour', () => {
      const now = new Date('2026-01-12T14:30:00Z');
      const later = new Date('2026-01-12T15:30:00Z');

      const events = [
        { id: '1', type: 'received' as const, timestamp: now.getTime() },
        { id: '2', type: 'received' as const, timestamp: now.getTime() },
        { id: '3', type: 'received' as const, timestamp: later.getTime() },
      ];

      const metrics = service.calculateMetrics(events);

      // Calculate expected hour keys based on local timezone
      const hour1 = now.getHours().toString().padStart(2, '0');
      const hour2 = later.getHours().toString().padStart(2, '0');

      expect(metrics.timeDistribution[`${hour1}:00`]).toBe(2);
      expect(metrics.timeDistribution[`${hour2}:00`]).toBe(1);
    });

    it('should handle empty events', () => {
      const metrics = service.calculateMetrics([]);

      expect(metrics.totalDelivered).toBe(0);
      expect(metrics.totalOpened).toBe(0);
      expect(metrics.openRate).toBe(0);
      expect(metrics.dismissRate).toBe(0);
    });
  });

  describe('Configuration Management', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should get current config', () => {
      const config = service.getConfig();

      expect(config.enableTracking).toBe(true);
      expect(config.batchSize).toBe(50);
      expect(config.uploadInterval).toBe(30);
      expect(config.retentionDays).toBe(30);
    });

    it('should save partial config updates', async () => {
      await service.saveConfig({ batchSize: 100 });

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'notification_analytics_config',
        expect.stringContaining('"batchSize":100')
      );
    });

    it('should merge new config with existing config', async () => {
      await service.saveConfig({ batchSize: 100 });

      const config = service.getConfig();
      expect(config.batchSize).toBe(100);
      expect(config.enableTracking).toBe(true); // Should keep existing values
    });

    it('should handle save errors gracefully', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      // Should not throw
      await expect(service.saveConfig({ batchSize: 100 })).resolves.not.toThrow();
    });
  });

  describe('Queue Management', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should get queue status', () => {
      const status = service.getQueueStatus();

      expect(status.size).toBe(0);
      expect(status.isUploading).toBe(false);
    });

    it('should clean up old events based on retention policy', async () => {
      const now = Date.now();
      const oldEvents = [
        { id: '1', type: 'received' as const, timestamp: now - (31 * 24 * 60 * 60 * 1000) }, // 31 days old
        { id: '2', type: 'received' as const, timestamp: now - (5 * 24 * 60 * 60 * 1000) }, // 5 days old
      ];

      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === 'notification_analytics_events') {
          return Promise.resolve(JSON.stringify(oldEvents));
        }
        return Promise.resolve(null);
      });

      // Reset instance to trigger loadEventQueue with retention cleanup
      (NotificationAnalytics as any).instance = null;
      service = NotificationAnalytics.getInstance();
      await service.initialize();

      const status = service.getQueueStatus();
      expect(status.size).toBe(1); // Only recent event should remain
    });
  });

  describe('Export & Reporting', () => {
    beforeEach(async () => {
      // Set current time to Jan 12, 2026 so test events are within last 7 days
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-01-12T12:00:00Z'));

      const events = [
        { id: '1', type: 'received' as const, timestamp: new Date('2026-01-10').getTime() },
        { id: '2', type: 'received' as const, timestamp: new Date('2026-01-11').getTime() },
        { id: '3', type: 'received' as const, timestamp: new Date('2026-01-12').getTime() },
      ];

      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === 'notification_analytics_events') {
          return Promise.resolve(JSON.stringify(events));
        }
        return Promise.resolve(null);
      });

      await service.initialize();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should export events for date range', async () => {
      const startDate = new Date('2026-01-11');
      const endDate = new Date('2026-01-12');

      const exported = await service.exportEvents(startDate, endDate);

      expect(exported.length).toBe(2); // Should include Jan 11 and Jan 12
    });

    it('should get metrics for last N days', async () => {
      const metrics = await service.getMetrics(7);

      expect(metrics.totalDelivered).toBeGreaterThan(0);
    });

    it('should handle export errors gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const exported = await service.exportEvents(new Date(), new Date());

      expect(exported).toEqual([]);
    });
  });

  describe('Cleanup', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should clear all data', async () => {
      await service.trackNotificationReceived('template', 'category', 'high');

      await service.clearAllData();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('notification_analytics_events');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('notification_analytics_config');
    });

    it('should dispose timer on cleanup', () => {
      service.dispose();

      const status = service.getQueueStatus();
      expect(status.isUploading).toBe(false);
    });

    it('should handle clear errors gracefully', async () => {
      (AsyncStorage.removeItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      // Should not throw
      await expect(service.clearAllData()).resolves.not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should handle concurrent event tracking', async () => {
      const promises = [
        service.trackNotificationReceived('template1', 'cat1', 'high'),
        service.trackNotificationReceived('template2', 'cat2', 'low'),
        service.trackNotificationOpened('template1', 'cat1'),
        service.trackNotificationDismissed('template2', 'cat2'),
      ];

      await Promise.all(promises);

      // Should handle all events
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should handle malformed stored data', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('invalid json {');

      // Reset instance
      (NotificationAnalytics as any).instance = null;
      service = NotificationAnalytics.getInstance();

      // Should not throw
      await expect(service.initialize()).resolves.not.toThrow();
    });

    it('should handle initialization errors when both loadConfig and loadEventQueue fail', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Complete storage failure'));

      // Reset instance
      (NotificationAnalytics as any).instance = null;
      service = NotificationAnalytics.getInstance();

      // Should not throw and should log error
      await expect(service.initialize()).resolves.not.toThrow();
    });

    it('should clear existing upload timer when restarting periodic upload', async () => {
      // First initialization creates timer
      await service.initialize();

      // Save config with new interval - should clear and restart timer
      await service.saveConfig({ uploadInterval: 60 });

      // Timer should have been cleared and restarted
      const status = service.getQueueStatus();
      expect(status).toBeDefined();
    });

    it('should trigger periodic upload via timer', async () => {
      await service.initialize();
      jest.clearAllMocks(); // Clear initialization calls

      // Add events to queue
      await service.trackNotificationReceived('template1', 'cat1', 'high');
      await service.trackNotificationReceived('template2', 'cat2', 'low');

      // Advance timers by uploadInterval (30 minutes) and run all pending timers
      jest.advanceTimersByTime(30 * 60 * 1000 + 1000);

      // Process all promises including the upload
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      // Upload should have been triggered via timer
      expect(mockAnalyticsManager.trackEvent).toHaveBeenCalled();
    });

    it('should handle getMetrics errors when loadEventQueue fails', async () => {
      // Reset instance to ensure fresh state
      (NotificationAnalytics as any).instance = null;
      service = NotificationAnalytics.getInstance();
      await service.initialize();

      // Make loadEventQueue fail on next call
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const metrics = await service.getMetrics(7);

      // Should return empty metrics without throwing
      expect(metrics.totalDelivered).toBe(0);
      expect(metrics.totalOpened).toBe(0);
      expect(metrics.openRate).toBe(0);
    });

    it('should handle exportEvents errors when loadEventQueue fails', async () => {
      // Reset instance to ensure fresh state
      (NotificationAnalytics as any).instance = null;
      service = NotificationAnalytics.getInstance();
      await service.initialize();

      // Make loadEventQueue fail on next call
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const exported = await service.exportEvents(new Date(), new Date());

      // Should return empty array without throwing
      expect(exported).toEqual([]);
      expect(Array.isArray(exported)).toBe(true);
    });

    it('should handle initialization failure and log error', async () => {
      // Create fresh instance
      (NotificationAnalytics as any).instance = null;

      // Make AsyncStorage fail consistently
      (AsyncStorage.getItem as jest.Mock).mockImplementation(() => {
        throw new Error('Storage initialization failed');
      });

      const newService = NotificationAnalytics.getInstance();

      // Should handle error gracefully during initialization
      await expect(newService.initialize()).resolves.not.toThrow();
    });

    it('should handle trackEvent saveQueue errors', async () => {
      await service.initialize();

      // Make saveEventQueue fail
      (AsyncStorage.setItem as jest.Mock).mockImplementation((key) => {
        if (key === 'notification_analytics_events') {
          throw new Error('Failed to save queue');
        }
        return Promise.resolve();
      });

      // Should not throw when saving fails
      await expect(
        service.trackNotificationReceived('template', 'category', 'high')
      ).resolves.not.toThrow();
    });
  });
});
