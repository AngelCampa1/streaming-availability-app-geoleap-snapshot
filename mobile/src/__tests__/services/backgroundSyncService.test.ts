/**
 * BackgroundSyncService Tests
 *
 * Tests background sync task management with AsyncStorage persistence
 * and network connectivity checks.
 */

import backgroundSyncService, { SyncTask, SyncConfig, SyncStats } from '../../services/backgroundSyncService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { logger } from '../../utils/logger';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('@react-native-community/netinfo');
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe('BackgroundSyncService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

    // Reset service state
    (backgroundSyncService as any).tasks = [];
    (backgroundSyncService as any).stats = {
      totalTasks: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      lastSyncTime: null,
      averageSyncDuration: 0,
    };
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await backgroundSyncService.initialize();

      expect(AsyncStorage.getItem).toHaveBeenCalledWith('pendingSyncTasks');
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('backgroundSyncStats');
      expect(logger.info).toHaveBeenCalledWith(
        '[BackgroundSyncService] BackgroundSyncService initialized (simplified version)'
      );
    });

    it('should load existing pending tasks from AsyncStorage', async () => {
      const mockTasks: SyncTask[] = [
        {
          id: 'task-1',
          type: 'watchlist',
          data: { items: [] },
          priority: 'high',
          timestamp: Date.now(),
          retryCount: 0,
          maxRetries: 3,
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === 'pendingSyncTasks') {
          return Promise.resolve(JSON.stringify(mockTasks));
        }
        return Promise.resolve(null);
      });

      await backgroundSyncService.initialize();

      expect((backgroundSyncService as any).tasks).toHaveLength(1);
      expect((backgroundSyncService as any).tasks[0].id).toBe('task-1');
    });

    it('should load existing stats from AsyncStorage', async () => {
      const mockStats = {
        totalTasks: 10,
        successfulSyncs: 8,
        failedSyncs: 2,
        lastSyncTime: new Date('2025-01-13T10:00:00').toISOString(),
        averageSyncDuration: 500,
      };

      (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === 'backgroundSyncStats') {
          return Promise.resolve(JSON.stringify(mockStats));
        }
        return Promise.resolve(null);
      });

      await backgroundSyncService.initialize();

      const stats = backgroundSyncService.getSyncStats();
      expect(stats.totalTasks).toBe(10);
      expect(stats.successfulSyncs).toBe(8);
      expect(stats.failedSyncs).toBe(2);
      expect(stats.lastSyncTime).toBeInstanceOf(Date);
    });

    it('should handle AsyncStorage errors gracefully during initialization', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      await expect(backgroundSyncService.initialize()).resolves.not.toThrow();

      // Should log errors for both loadPendingTasks and loadStats
      expect(logger.error).toHaveBeenCalledWith(
        '[BackgroundSyncService] Failed to load pending tasks',
        expect.any(Error)
      );
      expect(logger.error).toHaveBeenCalledWith(
        '[BackgroundSyncService] Failed to load sync stats',
        expect.any(Error)
      );
    });
  });

  describe('Add Sync Task', () => {
    it('should add a sync task with default priority', async () => {
      const taskId = await backgroundSyncService.addSyncTask('content', { id: 'content-1' });

      expect(taskId).toBeDefined();
      expect(taskId).toContain('content_');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'pendingSyncTasks',
        expect.stringContaining('content')
      );
    });

    it('should add a sync task with custom priority', async () => {
      const taskId = await backgroundSyncService.addSyncTask('watchlist', { items: [] }, 'high');

      expect(taskId).toContain('watchlist_');
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should generate unique task IDs', async () => {
      const id1 = await backgroundSyncService.addSyncTask('analytics', {}, 'low');
      const id2 = await backgroundSyncService.addSyncTask('analytics', {}, 'low');

      expect(id1).not.toBe(id2);
    });

    it('should add task with all priority levels', async () => {
      const lowId = await backgroundSyncService.addSyncTask('preferences', {}, 'low');
      const mediumId = await backgroundSyncService.addSyncTask('preferences', {}, 'medium');
      const highId = await backgroundSyncService.addSyncTask('preferences', {}, 'high');

      expect(lowId).toBeDefined();
      expect(mediumId).toBeDefined();
      expect(highId).toBeDefined();
    });
  });

  describe('Force Sync Now', () => {
    it('should not sync when sync is disabled', async () => {
      await backgroundSyncService.updateSyncConfig({ enabled: false });
      await backgroundSyncService.addSyncTask('content', {});

      await backgroundSyncService.forceSyncNow();

      expect(NetInfo.fetch).not.toHaveBeenCalled();
    });

    it('should not sync when network is not connected', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: false });
      await backgroundSyncService.updateSyncConfig({ enabled: true });
      await backgroundSyncService.addSyncTask('content', {});

      await backgroundSyncService.forceSyncNow();

      expect(NetInfo.fetch).toHaveBeenCalled();
      // Tasks should still be in queue
      const stats = backgroundSyncService.getSyncStats();
      expect(stats.successfulSyncs).toBe(0);
    });

    it('should process tasks when network is connected', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: true });

      // Mock processTask to resolve immediately
      const processTaskSpy = jest.spyOn(backgroundSyncService as any, 'processTask')
        .mockResolvedValue(undefined);

      await backgroundSyncService.addSyncTask('watchlist', { items: [] });

      await backgroundSyncService.forceSyncNow();

      const stats = backgroundSyncService.getSyncStats();
      expect(stats.successfulSyncs).toBe(1);
      expect(stats.lastSyncTime).toBeInstanceOf(Date);
      expect(processTaskSpy).toHaveBeenCalled();

      processTaskSpy.mockRestore();
    });

    it('should update sync stats after successful sync', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: true });

      const processTaskSpy = jest.spyOn(backgroundSyncService as any, 'processTask')
        .mockResolvedValue(undefined);

      await backgroundSyncService.addSyncTask('analytics', {});

      await backgroundSyncService.forceSyncNow();

      const stats = backgroundSyncService.getSyncStats();
      expect(stats.totalTasks).toBe(0); // Task was removed after successful sync
      expect(stats.successfulSyncs).toBe(1);
      expect(stats.failedSyncs).toBe(0);
      expect(stats.lastSyncTime).not.toBeNull();
      expect(stats.averageSyncDuration).toBeGreaterThanOrEqual(0);

      processTaskSpy.mockRestore();
    });

    it('should retry failed tasks up to maxRetries', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: true });

      // Mock processTask to fail
      const processTaskSpy = jest.spyOn(backgroundSyncService as any, 'processTask')
        .mockRejectedValue(new Error('Sync failed'));

      await backgroundSyncService.addSyncTask('content', {});

      // First sync attempt - should increment retryCount
      await backgroundSyncService.forceSyncNow();

      expect(logger.error).toHaveBeenCalled();

      processTaskSpy.mockRestore();
    });

    it('should remove task after maxRetries exceeded', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: true });

      const processTaskSpy = jest.spyOn(backgroundSyncService as any, 'processTask')
        .mockRejectedValue(new Error('Sync failed'));

      const taskId = await backgroundSyncService.addSyncTask('content', {});

      // Set retryCount to maxRetries - 1
      (backgroundSyncService as any).tasks[0].retryCount = 2; // maxRetries is 3

      await backgroundSyncService.forceSyncNow();

      const stats = backgroundSyncService.getSyncStats();
      expect(stats.failedSyncs).toBe(1);

      processTaskSpy.mockRestore();
    });
  });

  describe('Clear Pending Tasks', () => {
    it('should clear all pending tasks', async () => {
      await backgroundSyncService.addSyncTask('content', {});
      await backgroundSyncService.addSyncTask('watchlist', {});

      await backgroundSyncService.clearPendingTasks();

      expect(AsyncStorage.setItem).toHaveBeenCalledWith('pendingSyncTasks', JSON.stringify([]));
    });
  });

  describe('Update Sync Config', () => {
    it('should update sync config partially', async () => {
      await backgroundSyncService.updateSyncConfig({ minimumInterval: 30 });

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'backgroundSyncConfig',
        expect.stringContaining('"minimumInterval":30')
      );
    });

    it('should update multiple config options', async () => {
      await backgroundSyncService.updateSyncConfig({
        syncOnWifi: true,
        syncOnCellular: true,
        maxRetries: 5,
      });

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'backgroundSyncConfig',
        expect.stringContaining('"syncOnWifi":true')
      );
    });

    it('should toggle sync enabled state', async () => {
      await backgroundSyncService.updateSyncConfig({ enabled: false });
      await backgroundSyncService.updateSyncConfig({ enabled: true });

      expect(AsyncStorage.setItem).toHaveBeenCalledTimes(2);
    });
  });

  describe('Get Sync Stats', () => {
    it('should return a copy of sync stats', () => {
      const stats1 = backgroundSyncService.getSyncStats();
      const stats2 = backgroundSyncService.getSyncStats();

      expect(stats1).toEqual(stats2);
      expect(stats1).not.toBe(stats2); // Should be different object instances
    });

    it('should return default stats initially', () => {
      const stats = backgroundSyncService.getSyncStats();

      expect(stats.totalTasks).toBe(0);
      expect(stats.successfulSyncs).toBe(0);
      expect(stats.failedSyncs).toBe(0);
      expect(stats.lastSyncTime).toBeNull();
      expect(stats.averageSyncDuration).toBe(0);
    });
  });

  describe('AsyncStorage Error Handling', () => {
    it('should handle error when loading pending tasks', async () => {
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === 'pendingSyncTasks') {
          return Promise.reject(new Error('Storage error'));
        }
        return Promise.resolve(null);
      });

      await backgroundSyncService.initialize();

      expect(logger.error).toHaveBeenCalledWith(
        '[BackgroundSyncService] Failed to load pending tasks',
        expect.any(Error)
      );
    });

    it('should handle error when saving pending tasks', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Storage full'));

      await backgroundSyncService.addSyncTask('content', {});

      expect(logger.error).toHaveBeenCalledWith(
        '[BackgroundSyncService] Failed to save pending tasks',
        expect.any(Error)
      );
    });

    it('should handle error when loading stats', async () => {
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === 'backgroundSyncStats') {
          return Promise.reject(new Error('Storage error'));
        }
        return Promise.resolve(null);
      });

      await backgroundSyncService.initialize();

      expect(logger.error).toHaveBeenCalledWith(
        '[BackgroundSyncService] Failed to load sync stats',
        expect.any(Error)
      );
    });

    it('should handle error when saving stats', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: true });

      const processTaskSpy = jest.spyOn(backgroundSyncService as any, 'processTask')
        .mockResolvedValue(undefined);

      (AsyncStorage.setItem as jest.Mock).mockImplementation((key: string) => {
        if (key === 'backgroundSyncStats') {
          return Promise.reject(new Error('Storage error'));
        }
        return Promise.resolve(undefined);
      });

      await backgroundSyncService.addSyncTask('analytics', {});

      await backgroundSyncService.forceSyncNow();

      expect(logger.error).toHaveBeenCalledWith(
        '[BackgroundSyncService] Failed to save sync stats',
        expect.any(Error)
      );

      processTaskSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('should handle malformed JSON in AsyncStorage', async () => {
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === 'pendingSyncTasks') {
          return Promise.resolve('invalid json{');
        }
        return Promise.resolve(null);
      });

      await backgroundSyncService.initialize();

      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle sync with no pending tasks', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: true });

      await backgroundSyncService.forceSyncNow();

      const stats = backgroundSyncService.getSyncStats();
      expect(stats.lastSyncTime).toBeInstanceOf(Date);
    });

    it('should handle multiple task types', async () => {
      await backgroundSyncService.addSyncTask('content', {});
      await backgroundSyncService.addSyncTask('watchlist', {});
      await backgroundSyncService.addSyncTask('preferences', {});
      await backgroundSyncService.addSyncTask('analytics', {});

      expect(AsyncStorage.setItem).toHaveBeenCalledTimes(4);
    });
  });
});
