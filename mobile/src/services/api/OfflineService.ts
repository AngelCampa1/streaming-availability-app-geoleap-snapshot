/**
 * Offline Service for GeoLeap Mobile App
 * Handles offline queue management, request persistence, and synchronization
 * Ensures app functionality when network is unavailable
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import networkServiceSingleton, { NetworkService } from './NetworkService';
import { logger as loggerImport } from '../../utils/logger';

// Safe logger wrapper that handles undefined cases in test environments
const logger = {
  debug: (...args: Parameters<typeof console.log>) => loggerImport?.debug?.(...args),
  info: (...args: Parameters<typeof console.log>) => loggerImport?.info?.(...args),
  warn: (...args: Parameters<typeof console.warn>) => loggerImport?.warn?.(...args),
  error: (...args: Parameters<typeof console.error>) => {
    if (loggerImport?.error) {
      loggerImport.error(...args);
    } else {
      console.error(...args);
    }
  },
};

export interface QueuedRequest {
  id: string;
  endpoint: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, any>;
  priority: 'high' | 'normal' | 'low';
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  tags?: string[];
  expiresAt?: number; // TTL: timestamp when cached data expires
  ttl?: number; // TTL: duration in milliseconds (default: 24 hours)
}

export interface SyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entityType: string;
  entityId: string;
  data: any;
  timestamp: number;
  processed: boolean;
  conflictResolution?: 'client' | 'server' | 'merge';
}

export interface OfflineStats {
  queuedRequests: number;
  pendingSyncOperations: number;
  lastSyncTime: number | null;
  isOnline: boolean;
  offlineDuration: number;
}

export interface ConflictResolutionStrategy {
  type: 'client' | 'server' | 'merge' | 'manual';
  mergeFunction?: (clientData: any, serverData: any) => any;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
}

const isSensitiveBodyKey = (key: string): boolean => {
  const normalizedKey = key.toLowerCase().replace(/[_-]/g, '');
  return normalizedKey.includes('authorization')
    || normalizedKey.includes('bearer')
    || normalizedKey === 'token'
    || normalizedKey.includes('idtoken')
    || normalizedKey.includes('accesstoken')
    || normalizedKey.includes('refreshtoken')
    || normalizedKey.includes('password')
    || normalizedKey.includes('apikey')
    || normalizedKey.includes('secret')
    || normalizedKey.includes('credential')
    || normalizedKey.includes('passcode');
};

const sanitizeOfflineBody = (value: any): any => {
  if (Array.isArray(value)) {
    return value.map(sanitizeOfflineBody);
  }

  if (value && typeof value === 'object') {
    return Object.entries(value).reduce<Record<string, any>>((sanitized, [key, nestedValue]) => {
      if (!isSensitiveBodyKey(key)) {
        sanitized[key] = sanitizeOfflineBody(nestedValue);
      }
      return sanitized;
    }, {});
  }

  return value;
};

class OfflineService {
  private networkService: NetworkService;
  private queue: QueuedRequest[] = [];
  private syncOperations: SyncOperation[] = [];
  private isProcessing = false;
  private isOnline = true;
  private offlineStartTime: number | null = null;
  private conflictResolutions: Map<string, ConflictResolutionStrategy> = new Map();
  private syncCallbacks: ((stats: OfflineStats) => void)[] = [];
  private queueProcessingInterval: ReturnType<typeof setInterval> | null = null;

  // Cache statistics
  private cacheStats: CacheStats = { hits: 0, misses: 0, size: 0 };

  // Aliased property for backward compatibility
  public get queuedRequests(): QueuedRequest[] {
    return this.queue;
  }

  public set queuedRequests(requests: QueuedRequest[]) {
    this.queue = requests;
  }

  private readonly STORAGE_KEYS = {
    REQUEST_QUEUE: 'offline_request_queue',
    SYNC_OPERATIONS: 'offline_sync_operations',
    CONFLICT_RESOLUTIONS: 'offline_conflict_resolutions',
    OFFLINE_START_TIME: 'offline_start_time',
  };

  constructor(networkService?: NetworkService) {
    this.networkService = networkService ?? networkServiceSingleton;
    this.initialize();
  }

  /**
   * Initialize offline service
   */
  public async initialize(): Promise<void> {
    try {
      // Load persisted data
      await this.loadPersistedData();

      // Setup network listeners
      this.setupNetworkListeners();

      // Start queue processing
      this.startQueueProcessing();

      logger.info('OfflineService initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize OfflineService:', error);
    }
  }

  /**
   * Load persisted data from AsyncStorage
   */
  private async loadPersistedData(): Promise<void> {
    try {
      // Load request queue
      const queueData = await AsyncStorage.getItem(this.STORAGE_KEYS.REQUEST_QUEUE);
      if (queueData) {
        this.queue = JSON.parse(queueData).map((request: QueuedRequest) => ({
          endpoint: request.endpoint,
          method: request.method,
          body: sanitizeOfflineBody(request.body),
          params: request.params,
          priority: request.priority,
          maxRetries: request.maxRetries || 3,
          tags: request.tags,
          expiresAt: request.expiresAt,
          ttl: request.ttl,
          id: request.id,
          timestamp: request.timestamp,
          retryCount: request.retryCount || 0,
        }));
        await this.persistData();
      }

      // Load sync operations
      const syncData = await AsyncStorage.getItem(this.STORAGE_KEYS.SYNC_OPERATIONS);
      if (syncData) {
        this.syncOperations = JSON.parse(syncData);
      }

      // Load conflict resolutions
      const conflictData = await AsyncStorage.getItem(this.STORAGE_KEYS.CONFLICT_RESOLUTIONS);
      if (conflictData) {
        const resolutions = JSON.parse(conflictData);
        this.conflictResolutions = new Map(Object.entries(resolutions));
      }

      // Load offline start time
      const offlineTime = await AsyncStorage.getItem(this.STORAGE_KEYS.OFFLINE_START_TIME);
      if (offlineTime) {
        this.offlineStartTime = parseInt(offlineTime, 10);
      }

      logger.info('Loaded persisted offline data:', {
        queueLength: this.queue.length,
        syncOperations: this.syncOperations.length,
        conflictResolutions: this.conflictResolutions.size,
      });
    } catch (error) {
      logger.error('Failed to load persisted offline data:', error);
    }
  }

  /**
   * Persist data to AsyncStorage
   */
  private async persistData(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.setItem(this.STORAGE_KEYS.REQUEST_QUEUE, JSON.stringify(this.queue)),
        AsyncStorage.setItem(this.STORAGE_KEYS.SYNC_OPERATIONS, JSON.stringify(this.syncOperations)),
        AsyncStorage.setItem(
          this.STORAGE_KEYS.CONFLICT_RESOLUTIONS,
          JSON.stringify(Object.fromEntries(this.conflictResolutions)),
        ),
        this.offlineStartTime
          ? AsyncStorage.setItem(this.STORAGE_KEYS.OFFLINE_START_TIME, this.offlineStartTime.toString())
          : AsyncStorage.removeItem(this.STORAGE_KEYS.OFFLINE_START_TIME),
      ]);

      logger.debug('Persisted offline data successfully');
    } catch (error) {
      logger.error('Failed to persist offline data:', error);
    }
  }

  /**
   * Setup network status listeners
   */
  private setupNetworkListeners(): void {
    this.networkService.onConnectionChange((status) => {
      const wasOffline = !this.isOnline;
      this.isOnline = status.isConnected;

      if (status.isConnected && wasOffline) {
        // We just came back online
        this.handleBackOnline();
      } else if (!status.isConnected && this.isOnline) {
        // We just went offline
        this.handleGoneOffline();
      }

      this.notifySyncCallbacks();
    });
  }

  /**
   * Handle going offline
   */
  private handleGoneOffline(): void {
    this.offlineStartTime = Date.now();
    logger.warn('Device went offline at:', new Date(this.offlineStartTime).toISOString());
    this.persistData();
  }

  /**
   * Handle coming back online
   */
  private async handleBackOnline(): Promise<void> {
    if (this.offlineStartTime) {
      const offlineDuration = Date.now() - this.offlineStartTime;
      logger.info('Device back online after', offlineDuration, 'ms offline');
      this.offlineStartTime = null;
    }

    // Start processing queue and sync operations
    this.processQueue();
    this.processSyncOperations();
    await this.persistData();
  }

  /**
   * Start queue processing loop
   */
  private startQueueProcessing(): void {
    // Clear any existing interval
    if (this.queueProcessingInterval) {
      clearInterval(this.queueProcessingInterval);
    }

    this.queueProcessingInterval = setInterval(() => {
      if (this.isOnline && !this.isProcessing) {
        this.processQueue();
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Stop queue processing and cleanup resources
   */
  public cleanup(): void {
    if (this.queueProcessingInterval) {
      clearInterval(this.queueProcessingInterval);
      this.queueProcessingInterval = null;
    }
  }

  /**
   * Queue a request for when back online
   */
  async queueRequest(request: Omit<QueuedRequest, 'id' | 'timestamp' | 'retryCount'>): Promise<string> {
    const queuedRequest: QueuedRequest = {
      endpoint: request.endpoint,
      method: request.method,
      body: sanitizeOfflineBody(request.body),
      params: request.params,
      priority: request.priority,
      maxRetries: request.maxRetries || 3,
      tags: request.tags,
      expiresAt: request.expiresAt,
      ttl: request.ttl,
      id: this.generateRequestId(),
      timestamp: Date.now(),
      retryCount: 0,
    };

    // Insert based on priority
    this.insertRequestByPriority(queuedRequest);

    // Persist queue
    await this.persistData();

    logger.debug('Request queued:', {
      id: queuedRequest.id,
      method: queuedRequest.method,
      endpoint: queuedRequest.endpoint,
      priority: queuedRequest.priority,
    });

    this.notifySyncCallbacks();
    return queuedRequest.id;
  }

  /**
   * Insert request into queue based on priority
   */
  private insertRequestByPriority(request: QueuedRequest): void {
    const priorityOrder = { high: 0, normal: 1, low: 2 };
    const requestPriority = priorityOrder[request.priority];

    let insertIndex = this.queue.length;
    for (let i = 0; i < this.queue.length; i++) {
      if (priorityOrder[this.queue[i].priority] > requestPriority) {
        insertIndex = i;
        break;
      }
    }

    this.queue.splice(insertIndex, 0, request);
  }

  /**
   * Process queued requests
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0 || !this.isOnline) {
      return;
    }

    this.isProcessing = true;
    logger.debug('Processing offline queue:', this.queue.length, 'requests');

    try {
      const requestsToProcess = [...this.queue];
      const failedRequests: QueuedRequest[] = [];

      for (const request of requestsToProcess) {
        try {
          await this.processQueuedRequest(request);
          // Remove successful request from queue
          this.queue = this.queue.filter(r => r.id !== request.id);
        } catch (error: any) {
          logger.warn('Failed to process queued request:', {
            id: request.id,
            error: error?.message,
            retryCount: request.retryCount,
          });

          // Update retry count
          request.retryCount++;

          // Check if we should retry or discard
          if (request.retryCount < request.maxRetries) {
            failedRequests.push(request);
          } else {
            logger.error('Max retries exceeded for request:', request.id);
            // Could emit an event or store failed requests for manual review
          }
        }
      }

      // Update queue with failed requests
      this.queue = failedRequests;
      await this.persistData();

    } catch (error) {
      logger.error('Error processing offline queue:', error);
    } finally {
      this.isProcessing = false;
      this.notifySyncCallbacks();
    }
  }

  /**
   * Process a single queued request
   */
  async processQueuedRequest(request: QueuedRequest): Promise<void> {

    // @ts-ignore - Dynamic import
    const apiService = (await import('./ApiService')).default;

    const options = {
      method: request.method,
      body: request.body,
      params: request.params,
      skipCache: true,
      retryAttempts: 0, // Don't retry individual queued requests
    };

    let endpoint = request.endpoint;
    if (!endpoint.startsWith('http')) {
      // @ts-expect-error - config/api dynamic import
      const { buildUrl } = await import('../../config/api');
      endpoint = buildUrl(endpoint);
    }

    logger.debug('Executing queued request:', {
      id: request.id,
      method: request.method,
      endpoint,
    });

    await apiService.makeRequest(endpoint, options);
  }

  /**
   * Add sync operation for data synchronization
   */
  async addSyncOperation(operation: Omit<SyncOperation, 'id' | 'timestamp' | 'processed'>): Promise<string> {
    const syncOp: SyncOperation = {
      ...operation,
      id: this.generateRequestId(),
      timestamp: Date.now(),
      processed: false,
    };

    this.syncOperations.push(syncOp);
    await this.persistData();

    logger.debug('Sync operation added:', {
      id: syncOp.id,
      type: syncOp.type,
      entityType: syncOp.entityType,
      entityId: syncOp.entityId,
    });

    // Try to process immediately if online
    if (this.isOnline) {
      this.processSyncOperations();
    }

    return syncOp.id;
  }

  /**
   * Process sync operations
   */
  private async processSyncOperations(): Promise<void> {
    if (!this.isOnline || this.syncOperations.length === 0) {
      return;
    }

    logger.debug('Processing sync operations:', this.syncOperations.length);

    try {
      const operationsToProcess = this.syncOperations.filter(op => !op.processed);

      for (const operation of operationsToProcess) {
        try {
          await this.processSyncOperation(operation);
          operation.processed = true;
        } catch (error: any) {
          logger.warn('Failed to process sync operation:', {
            id: operation.id,
            error: error?.message,
          });
        }
      }

      // Remove processed operations
      this.syncOperations = this.syncOperations.filter(op => !op.processed);
      await this.persistData();

    } catch (error) {
      logger.error('Error processing sync operations:', error);
    }
  }

  /**
   * Process individual sync operation
   */
  private async processSyncOperation(operation: SyncOperation): Promise<void> {

    // @ts-ignore - Dynamic import
    const apiService = (await import('./ApiService')).default;

    let endpoint = `/sync/${operation.entityType}`;
    if (operation.entityId) {
      endpoint += `/${operation.entityId}`;
    }

    const options = {
      method: this.getSyncMethod(operation.type),
      body: operation.data,
      skipCache: true,
    };

    await apiService.makeRequest(endpoint, options);

    logger.debug('Sync operation processed:', operation.id);
  }

  /**
   * Get HTTP method for sync operation type
   */
  private getSyncMethod(type: SyncOperation['type']): 'POST' | 'PUT' | 'DELETE' {
    switch (type) {
      case 'create':
        return 'POST';
      case 'update':
        return 'PUT';
      case 'delete':
        return 'DELETE';
      default:
        return 'POST';
    }
  }

  /**
   * Register conflict resolution strategy
   */
  registerConflictResolution(
    entityType: string,
    strategy: ConflictResolutionStrategy,
  ): void {
    this.conflictResolutions.set(entityType, strategy);
    this.persistData();
  }

  /**
   * Handle sync conflict
   */
  async handleConflict(
    entityType: string,
    clientData: any,
    serverData: any,
  ): Promise<any> {
    const strategy = this.conflictResolutions.get(entityType);

    if (!strategy) {
      logger.warn('No conflict resolution strategy for:', entityType);
      return serverData; // Default to server data
    }

    switch (strategy.type) {
      case 'client':
        return clientData;
      case 'server':
        return serverData;
      case 'merge':
        if (strategy.mergeFunction) {
          return strategy.mergeFunction(clientData, serverData);
        }
        // Default merge strategy - prefer client data for defined fields
        return { ...serverData, ...clientData };
      case 'manual':
        // Emit event for manual resolution
        logger.warn('Manual conflict resolution required for:', entityType);
        return serverData; // Temporary fallback
      default:
        return serverData;
    }
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get offline statistics
   */
  getStats(): OfflineStats {
    const offlineDuration = this.offlineStartTime
      ? Date.now() - this.offlineStartTime
      : 0;

    return {
      queuedRequests: this.queue.length,
      pendingSyncOperations: this.syncOperations.length,
      lastSyncTime: null, // TODO: Track last successful sync
      isOnline: this.isOnline,
      offlineDuration,
    };
  }

  /**
   * Subscribe to sync status updates
   */
  onSyncChange(callback: (stats: OfflineStats) => void): () => void {
    this.syncCallbacks.push(callback);

    // Immediately call with current stats
    callback(this.getStats());

    // Return unsubscribe function
    return () => {
      const index = this.syncCallbacks.indexOf(callback);
      if (index > -1) {
        this.syncCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Notify all sync callbacks
   */
  private notifySyncCallbacks(): void {
    const stats = this.getStats();
    this.syncCallbacks.forEach(callback => {
      try {
        callback(stats);
      } catch (error) {
        logger.error('Error in sync callback:', error);
      }
    });
  }

  /**
   * Clear all offline data
   */
  async clearAllData(): Promise<void> {
    this.queue = [];
    this.syncOperations = [];
    this.conflictResolutions.clear();
    this.offlineStartTime = null;

    await this.persistData();
    this.notifySyncCallbacks();

    logger.info('All offline data cleared');
  }

  /**
   * Retry failed requests manually
   */
  async retryFailedRequests(): Promise<void> {
    if (this.isOnline) {
      await this.processQueue();
    } else {
      throw new Error('Cannot retry requests while offline');
    }
  }

  /**
   * Get all queued requests (for debugging)
   */
  getQueuedRequests(): QueuedRequest[] {
    return [...this.queue];
  }

  /**
   * Get all sync operations (for debugging)
   */
  getSyncOperations(): SyncOperation[] {
    return [...this.syncOperations];
  }

  /**
   * Clear all cached data
   */
  public async clearAllCache(): Promise<void> {
    try {
      this.queuedRequests = [];
      this.syncOperations = [];
      this.cacheStats = { hits: 0, misses: 0, size: 0 };
      await AsyncStorage.removeItem('offline_requests');
      await AsyncStorage.removeItem('sync_operations');
      logger.info('All offline cache cleared');
    } catch (error) {
      logger.error('Failed to clear all cache:', error);
      throw error;
    }
  }

  /**
   * Sync all pending offline actions
   */
  public async syncOfflineActions(): Promise<void> {
    try {
      // Process queued requests
      const requests = [...this.queuedRequests];
      for (const request of requests) {
        try {
          await this.processQueuedRequest(request);
          this.removeQueuedRequest(request.id);
        } catch (error) {
          logger.error('Failed to sync request:', request.id, error);
        }
      }

      // Process sync operations
      const operations = [...this.syncOperations.filter(op => !op.processed)];
      for (const operation of operations) {
        try {
          await this.processSyncOperation(operation);
        } catch (error) {
          logger.error('Failed to sync operation:', operation.id, error);
        }
      }

      logger.info('Offline actions sync completed');
    } catch (error) {
      logger.error('Failed to sync offline actions:', error);
      throw error;
    }
  }

  /**
   * Remove a queued request by ID
   */
  public removeQueuedRequest(id: string): void {
    this.queue = this.queue.filter(request => request.id !== id);
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): CacheStats {
    return { ...this.cacheStats };
  }
}

// Export singleton instance
const offlineService = new OfflineService();

// Export static methods for backward compatibility
export class OfflineServiceClass extends OfflineService {
  public static async initialize(): Promise<void> {
    return offlineService.initialize();
  }

  public static async clearAllCache(): Promise<void> {
    return offlineService.clearAllCache();
  }

  public static async syncOfflineActions(): Promise<void> {
    return offlineService.syncOfflineActions();
  }

  public static get queuedRequests(): QueuedRequest[] {
    return offlineService.queuedRequests;
  }

  public static get cacheStats(): CacheStats {
    return offlineService.getCacheStats();
  }

  public static removeQueuedRequest(id: string): void {
    return offlineService.removeQueuedRequest(id);
  }
}

export default offlineService;
export { OfflineService };
