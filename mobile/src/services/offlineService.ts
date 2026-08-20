/**
 * Offline Service - US-11.6 Implementation
 * Handles offline functionality including caching and sync
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { logger } from '../utils/logger';

const OFFLINE_CACHE_PREFIX = '@offline_cache_';
const OFFLINE_QUEUE_KEY = '@offline_queue';

export interface OfflineAction {
  id: string;
  type: 'create' | 'update' | 'delete';
  endpoint: string;
  payload: unknown;
  timestamp: number;
  retryCount: number;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class OfflineService {
  private isOnline: boolean = true;
  private actionQueue: OfflineAction[] = [];
  private listeners: Set<(isOnline: boolean) => void> = new Set();

  constructor() {
    this.initNetworkListener();
    this.loadQueueFromStorage();
  }

  private initNetworkListener = () => {
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? true;

      // Notify listeners
      this.listeners.forEach(listener => listener(this.isOnline));

      // Process queue when coming back online
      if (wasOffline && this.isOnline) {
        this.processQueue();
      }
    });
  };

  private loadQueueFromStorage = async () => {
    try {
      const stored = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      if (stored) {
        this.actionQueue = JSON.parse(stored);
      }
    } catch (error) {
      logger.error('[OfflineService] Failed to load offline queue', error);
    }
  };

  private saveQueueToStorage = async () => {
    try {
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(this.actionQueue));
    } catch (error) {
      logger.error('[OfflineService] Failed to save offline queue', error);
    }
  };

  getIsOnline = (): boolean => {
    return this.isOnline;
  };

  addNetworkListener = (listener: (isOnline: boolean) => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  // Cache operations
  cacheData = async <T>(key: string, data: T, ttlMinutes: number = 60): Promise<void> => {
    try {
      const cacheEntry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + ttlMinutes * 60 * 1000,
      };
      await AsyncStorage.setItem(
        `${OFFLINE_CACHE_PREFIX}${key}`,
        JSON.stringify(cacheEntry)
      );
    } catch (error) {
      logger.error('[OfflineService] Failed to cache data', error);
    }
  };

  getCachedData = async <T>(key: string): Promise<T | null> => {
    try {
      const stored = await AsyncStorage.getItem(`${OFFLINE_CACHE_PREFIX}${key}`);
      if (!stored) return null;

      const cacheEntry: CacheEntry<T> = JSON.parse(stored);

      // Check if expired
      if (Date.now() > cacheEntry.expiresAt) {
        await AsyncStorage.removeItem(`${OFFLINE_CACHE_PREFIX}${key}`);
        return null;
      }

      return cacheEntry.data;
    } catch (error) {
      logger.error('[OfflineService] Failed to get cached data', error);
      return null;
    }
  };

  clearCache = async (key?: string): Promise<void> => {
    try {
      if (key) {
        await AsyncStorage.removeItem(`${OFFLINE_CACHE_PREFIX}${key}`);
      } else {
        const keys = await AsyncStorage.getAllKeys();
        const cacheKeys = keys.filter(k => k.startsWith(OFFLINE_CACHE_PREFIX));
        await AsyncStorage.multiRemove(cacheKeys);
      }
    } catch (error) {
      logger.error('[OfflineService] Failed to clear cache', error);
    }
  };

  // Action queue operations
  queueAction = async (action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>): Promise<void> => {
    const newAction: OfflineAction = {
      ...action,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.actionQueue.push(newAction);
    await this.saveQueueToStorage();

    // Try to process immediately if online
    if (this.isOnline) {
      this.processQueue();
    }
  };

  getQueueLength = (): number => {
    return this.actionQueue.length;
  };

  processQueue = async (): Promise<void> => {
    if (!this.isOnline || this.actionQueue.length === 0) return;

    const actionsToProcess = [...this.actionQueue];
    const processedIds: string[] = [];
    const failedActions: OfflineAction[] = [];

    for (const action of actionsToProcess) {
      try {
        // In a real implementation, this would make the actual API call
        // For now, we'll simulate success
        logger.info('[OfflineService] Processing offline action', { action });
        processedIds.push(action.id);
      } catch (error) {
        action.retryCount += 1;
        if (action.retryCount < 3) {
          failedActions.push(action);
        } else {
          logger.error('[OfflineService] Offline action failed after 3 retries', { action });
        }
      }
    }

    // Update queue with only failed actions
    this.actionQueue = failedActions;
    await this.saveQueueToStorage();
  };

  // Sync status
  getSyncStatus = (): { pending: number; lastSync: number | null } => {
    return {
      pending: this.actionQueue.length,
      lastSync: this.actionQueue.length > 0
        ? Math.min(...this.actionQueue.map(a => a.timestamp))
        : null,
    };
  };
}

export const offlineService = new OfflineService();
export default offlineService;
