import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { logger } from '../utils/logger';

export interface SyncTask {
  id: string;
  type: 'content' | 'watchlist' | 'preferences' | 'analytics';
  data: unknown;
  priority: 'low' | 'medium' | 'high';
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

export interface SyncConfig {
  enabled: boolean;
  minimumInterval: number;
  syncOnWifi: boolean;
  syncOnCellular: boolean;
  maxRetries: number;
}

export interface SyncStats {
  totalTasks: number;
  successfulSyncs: number;
  failedSyncs: number;
  lastSyncTime: Date | null;
  averageSyncDuration: number;
}

class BackgroundSyncService {
  private tasks: SyncTask[] = [];
  private config: SyncConfig = {
    enabled: true,
    minimumInterval: 15,
    syncOnWifi: true,
    syncOnCellular: false,
    maxRetries: 3,
  };
  private stats: SyncStats = {
    totalTasks: 0,
    successfulSyncs: 0,
    failedSyncs: 0,
    lastSyncTime: null,
    averageSyncDuration: 0,
  };

  async initialize(): Promise<void> {
    try {
      await this.loadPendingTasks();
      await this.loadStats();
      logger.info('[BackgroundSyncService] BackgroundSyncService initialized (simplified version)');
    } catch (error) {
      logger.error('[BackgroundSyncService] Failed to initialize BackgroundSyncService', error);
    }
  }

  async addSyncTask(type: SyncTask['type'],
 data: unknown, priority: SyncTask['priority'] = 'medium'): Promise<string> {
    const task: SyncTask = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      priority,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: this.config.maxRetries,
    };

    this.tasks.push(task);
    await this.savePendingTasks();
    return task.id;
  }

  async forceSyncNow(): Promise<void> {
    if (!this.config.enabled) {return;}

    const networkState = await NetInfo.fetch();
    if (!networkState.isConnected) {return;}

    const startTime = Date.now();
    const tasksToSync = [...this.tasks];

    for (const task of tasksToSync) {
      try {
        await this.processTask(task);
        this.stats.successfulSyncs++;
        this.removeTask(task.id);
      } catch (error) {
        logger.error('[BackgroundSyncService] Failed to sync task', { taskId: task.id, error });
        task.retryCount++;
        if (task.retryCount >= task.maxRetries) {
          this.stats.failedSyncs++;
          this.removeTask(task.id);
        }
      }
    }

    this.stats.lastSyncTime = new Date();
    this.stats.averageSyncDuration = Date.now() - startTime;
    await this.saveStats();
    await this.savePendingTasks();
  }

  private async processTask(task: SyncTask): Promise<void> {
    // Simplified task processing - in real implementation this would
    // make API calls to sync data
    logger.info('[BackgroundSyncService] Processing sync task', { taskType: task.type, data: task.data });
    await new Promise<void>(resolve => setTimeout(resolve, 100)); // Simulate processing
  }

  private removeTask(taskId: string): void {
    this.tasks = this.tasks.filter(task => task.id !== taskId);
  }

  async clearPendingTasks(): Promise<void> {
    this.tasks = [];
    await this.savePendingTasks();
  }

  async updateSyncConfig(config: Partial<SyncConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    await AsyncStorage.setItem('backgroundSyncConfig', JSON.stringify(this.config));
  }

  getSyncStats(): SyncStats {
    return { ...this.stats };
  }

  private async loadPendingTasks(): Promise<void> {
    try {
      const tasksJson = await AsyncStorage.getItem('pendingSyncTasks');
      if (tasksJson) {
        this.tasks = JSON.parse(tasksJson);
      }
    } catch (error) {
      logger.error('[BackgroundSyncService] Failed to load pending tasks', error);
    }
  }

  private async savePendingTasks(): Promise<void> {
    try {
      await AsyncStorage.setItem('pendingSyncTasks', JSON.stringify(this.tasks));
    } catch (error) {
      logger.error('[BackgroundSyncService] Failed to save pending tasks', error);
    }
  }

  private async loadStats(): Promise<void> {
    try {
      const statsJson = await AsyncStorage.getItem('backgroundSyncStats');
      if (statsJson) {
        const loadedStats = JSON.parse(statsJson);
        this.stats = {
          ...loadedStats,
          lastSyncTime: loadedStats.lastSyncTime ? new Date(loadedStats.lastSyncTime) : null,
        };
      }
    } catch (error) {
      logger.error('[BackgroundSyncService] Failed to load sync stats', error);
    }
  }

  private async saveStats(): Promise<void> {
    try {
      await AsyncStorage.setItem('backgroundSyncStats', JSON.stringify(this.stats));
    } catch (error) {
      logger.error('[BackgroundSyncService] Failed to save sync stats', error);
    }
  }
}

export const backgroundSyncService = new BackgroundSyncService();
export default backgroundSyncService;
