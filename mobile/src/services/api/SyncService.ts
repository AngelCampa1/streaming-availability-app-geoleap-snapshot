/**
 * Data Synchronization Service for GeoLeap Mobile App
 * Handles real-time data synchronization with SignalR, incremental updates, and conflict resolution
 * Provides seamless data consistency across online/offline states
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { NetworkService } from './NetworkService';
import { OfflineService } from './OfflineService';
import { CacheService } from './CacheService';
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

export interface SyncConfig {
  hubUrl: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
  syncTimeout: number;
  batchSize: number;
  conflictResolution: 'client' | 'server' | 'merge' | 'manual';
}

export interface SyncStatus {
  isConnected: boolean;
  lastSyncTime: number | null;
  pendingChanges: number;
  conflictCount: number;
  syncInProgress: boolean;
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed';
}

export interface SyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete' | 'merge';
  entityType: string;
  entityId: string;
  data: any;
  timestamp: number;
  version: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'conflict';
  errorMessage?: string;
}

export interface SyncConflict {
  id: string;
  entityType: string;
  entityId: string;
  clientData: any;
  serverData: any;
  conflictType: 'version' | 'data' | 'delete';
  timestamp: number;
  resolution?: 'client' | 'server' | 'merge' | 'manual';
  resolvedData?: any;
}

export interface EntitySyncState {
  entityType: string;
  entityId: string;
  version: number;
  lastModified: number;
  isDirty: boolean;
  pendingSync: boolean;
}

type SyncStatusListener = (status: SyncStatus) => void;
type SyncConflictListener = (conflict: SyncConflict) => void;
type DataChangeListener = (entityType: string, entityId: string, data: any) => void;

class SyncService {
  private networkService: NetworkService;
  private offlineService: OfflineService;
  private cacheService: CacheService;
  private config: SyncConfig;
  private signalRConnection: any = null; // SignalR connection
  private connectionState: SyncStatus['connectionState'] = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private syncInProgress = false;
  private lastSyncTime: number | null = null;
  private pendingOperations: Map<string, SyncOperation> = new Map();
  private conflicts: Map<string, SyncConflict> = new Map();
  private entityStates: Map<string, EntitySyncState> = new Map();
  private syncStatusListeners: SyncStatusListener[] = [];
  private conflictListeners: SyncConflictListener[] = [];
  private dataChangeListeners: DataChangeListener[] = [];
  // BUG FIX: Track SignalR event handler names for cleanup
  private readonly signalREventNames = [
    'DataChanged',
    'EntityDeleted',
    'SyncConflict',
    'SyncComplete',
    'HeartbeatResponse',
  ] as const;

  private readonly STORAGE_KEYS = {
    PENDING_OPERATIONS: 'sync_pending_operations',
    CONFLICTS: 'sync_conflicts',
    ENTITY_STATES: 'sync_entity_states',
    LAST_SYNC_TIME: 'sync_last_sync_time',
  };

  constructor(config?: Partial<SyncConfig>) {
    this.networkService = new NetworkService();
    this.offlineService = new OfflineService();
    this.cacheService = new CacheService();

    // Build SignalR hub URL dynamically from API_CONFIG
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { apiConfig } = require('../../config/api');
    const baseUrl = apiConfig.baseURL.replace('/api', ''); // Remove /api suffix
    const defaultHubUrl = `${baseUrl}/syncHub`;

    this.config = {
      hubUrl: defaultHubUrl,
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      syncTimeout: 30000,
      batchSize: 50,
      conflictResolution: 'merge',
      ...config,
    };

    this.initialize();
  }

  /**
   * Initialize synchronization service
   */
  private async initialize(): Promise<void> {
    try {
      // Load persisted data
      await this.loadPersistedData();

      // Setup network listeners
      this.setupNetworkListeners();

      // Start SignalR connection
      await this.connect();

      logger.info('SyncService initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize SyncService:', error);
    }
  }

  /**
   * Load persisted data from AsyncStorage
   */
  private async loadPersistedData(): Promise<void> {
    try {
      // Load pending operations
      const operationsData = await AsyncStorage.getItem(this.STORAGE_KEYS.PENDING_OPERATIONS);
      if (operationsData) {
        const operations = JSON.parse(operationsData);
        this.pendingOperations = new Map(operations);
      }

      // Load conflicts
      const conflictsData = await AsyncStorage.getItem(this.STORAGE_KEYS.CONFLICTS);
      if (conflictsData) {
        const conflicts = JSON.parse(conflictsData);
        this.conflicts = new Map(conflicts);
      }

      // Load entity states
      const statesData = await AsyncStorage.getItem(this.STORAGE_KEYS.ENTITY_STATES);
      if (statesData) {
        const states = JSON.parse(statesData);
        this.entityStates = new Map(states);
      }

      // Load last sync time
      const syncTimeData = await AsyncStorage.getItem(this.STORAGE_KEYS.LAST_SYNC_TIME);
      if (syncTimeData) {
        this.lastSyncTime = parseInt(syncTimeData, 10);
      }

      logger.info('Loaded sync data:', {
        pendingOperations: this.pendingOperations.size,
        conflicts: this.conflicts.size,
        entityStates: this.entityStates.size,
        lastSyncTime: this.lastSyncTime ? new Date(this.lastSyncTime).toISOString() : null,
      });
    } catch (error) {
      logger.error('Failed to load persisted sync data:', error);
    }
  }

  /**
   * Persist data to AsyncStorage
   */
  private async persistData(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.setItem(
          this.STORAGE_KEYS.PENDING_OPERATIONS,
          JSON.stringify(Array.from(this.pendingOperations.entries())),
        ),
        AsyncStorage.setItem(
          this.STORAGE_KEYS.CONFLICTS,
          JSON.stringify(Array.from(this.conflicts.entries())),
        ),
        AsyncStorage.setItem(
          this.STORAGE_KEYS.ENTITY_STATES,
          JSON.stringify(Array.from(this.entityStates.entries())),
        ),
        this.lastSyncTime
          ? AsyncStorage.setItem(this.STORAGE_KEYS.LAST_SYNC_TIME, this.lastSyncTime.toString())
          : AsyncStorage.removeItem(this.STORAGE_KEYS.LAST_SYNC_TIME),
      ]);

      logger.debug('Persisted sync data successfully');
    } catch (error) {
      logger.error('Failed to persist sync data:', error);
    }
  }

  /**
   * Setup network event listeners
   */
  private setupNetworkListeners(): void {
    this.networkService.onConnectionChange((status) => {
      if (status.isConnected) {
        // Back online - try to reconnect and sync
        if (this.connectionState === 'disconnected' || this.connectionState === 'failed') {
          this.connect();
        }
        this.syncPendingChanges();
      } else {
        // Gone offline - handle gracefully
        this.handleDisconnection();
      }
    });
  }

  /**
   * Connect to SignalR hub
   */
  private async connect(): Promise<void> {
    if (this.connectionState === 'connected' || this.connectionState === 'connecting') {
      return;
    }

    try {
      this.connectionState = 'connecting';
      this.notifyStatusChange();

      logger.info('Connecting to SignalR hub:', this.config.hubUrl);

      // Dynamically import SignalR to avoid bundle issues
      // @ts-expect-error - Optional SignalR package
      const { HubConnectionBuilder } = await import('@microsoft/signalr');
      // @ts-expect-error - Optional SignalR package
      const { HttpTransportType } = await import('@microsoft/signalr');

      this.signalRConnection = new HubConnectionBuilder()
        .withUrl(this.config.hubUrl, {
          skipNegotiation: true,
          transport: HttpTransportType.WebSockets,
        })
        .withAutomaticReconnect({
          nextRetryDelayInMilliseconds: (retryContext) => {
            return Math.min(1000 * Math.pow(2, retryContext.previousRetryCount), 30000);
          },
        })
        // @ts-expect-error - Optional SignalR package
        .configureLogging((await import('@microsoft/signalr')).LogLevel.Information)
        .build();

      // Setup event handlers
      this.setupSignalREventHandlers();

      // Start connection
      await this.signalRConnection.start();

      this.connectionState = 'connected';
      this.reconnectAttempts = 0;

      // Start heartbeat
      this.startHeartbeat();

      // Sync pending changes
      this.syncPendingChanges();

      logger.info('Connected to SignalR hub successfully');
      this.notifyStatusChange();

    } catch (error) {
      logger.error('Failed to connect to SignalR hub:', error);
      this.handleConnectionError(error);
    }
  }

  /**
   * Setup SignalR event handlers
   */
  private setupSignalREventHandlers(): void {
    if (!this.signalRConnection) {return;}

    // Connection events
    this.signalRConnection.onreconnecting(() => {
      this.connectionState = 'reconnecting';
      logger.info('SignalR reconnecting...');
      this.notifyStatusChange();
    });

    this.signalRConnection.onreconnected(() => {
      this.connectionState = 'connected';
      this.reconnectAttempts = 0;
      logger.info('SignalR reconnected');
      this.notifyStatusChange();
      this.syncPendingChanges();
    });

    this.signalRConnection.onclose(() => {
      this.handleDisconnection();
    });

    // Data synchronization events
    this.signalRConnection.on('DataChanged', (entityType: string, entityId: string, data: any, version: number) => {
      this.handleDataChanged(entityType, entityId, data, version);
    });

    this.signalRConnection.on('EntityDeleted', (entityType: string, entityId: string, version: number) => {
      this.handleEntityDeleted(entityType, entityId, version);
    });

    this.signalRConnection.on('SyncConflict', (conflict: SyncConflict) => {
      this.handleSyncConflict(conflict);
    });

    this.signalRConnection.on('SyncComplete', (syncedCount: number) => {
      this.handleSyncComplete(syncedCount);
    });

    // Heartbeat response
    this.signalRConnection.on('HeartbeatResponse', () => {
      logger.debug('Heartbeat received from server');
    });
  }

  /**
   * Handle data change from server
   */
  private handleDataChanged(entityType: string, entityId: string, data: any, version: number): void {
    const entityKey = `${entityType}:${entityId}`;
    const currentState = this.entityStates.get(entityKey);

    // Check for version conflicts
    if (currentState && currentState.version > version) {
      // Local version is newer - potential conflict
      this.createConflict({
        id: this.generateId(),
        entityType,
        entityId,
        clientData: data, // Current local data would be fetched
        serverData: data,
        conflictType: 'version',
        timestamp: Date.now(),
      });
      return;
    }

    // Update local state
    this.entityStates.set(entityKey, {
      entityType,
      entityId,
      version,
      lastModified: Date.now(),
      isDirty: false,
      pendingSync: false,
    });

    // Update cache
    this.cacheService.set(`${entityType}:${entityId}`, data);

    // Remove from pending operations if it exists
    this.pendingOperations.delete(entityKey);

    // Notify listeners
    this.notifyDataChange(entityType, entityId, data);

    logger.debug('Data synchronized from server:', { entityType, entityId, version });

    this.persistData();
  }

  /**
   * Handle entity deletion from server
   */
  private handleEntityDeleted(entityType: string, entityId: string, version: number): void {
    const entityKey = `${entityType}:${entityId}`;
    const currentState = this.entityStates.get(entityKey);

    // Check for version conflicts
    if (currentState && currentState.version > version) {
      // Local version is newer - potential conflict
      this.createConflict({
        id: this.generateId(),
        entityType,
        entityId,
        clientData: null, // Local entity exists
        serverData: null, // Server deleted it
        conflictType: 'delete',
        timestamp: Date.now(),
      });
      return;
    }

    // Remove from local state
    this.entityStates.delete(entityKey);
    this.cacheService.remove(`${entityType}:${entityId}`);
    this.pendingOperations.delete(entityKey);

    // Notify listeners
    this.notifyDataChange(entityType, entityId, null);

    logger.debug('Entity deleted from server:', { entityType, entityId, version });

    this.persistData();
  }

  /**
   * Handle sync conflict from server
   */
  private handleSyncConflict(conflict: SyncConflict): void {
    this.conflicts.set(conflict.id, conflict);
    this.notifyConflictListeners(conflict);
    this.persistData();

    logger.warn('Sync conflict received:', conflict);
  }

  /**
   * Handle sync completion
   */
  private handleSyncComplete(syncedCount: number): void {
    this.lastSyncTime = Date.now();
    this.syncInProgress = false;
    this.notifyStatusChange();
    this.persistData();

    logger.info(`Sync completed: ${syncedCount} entities synchronized`);
  }

  /**
   * Handle disconnection
   */
  private handleDisconnection(): void {
    this.connectionState = 'disconnected';
    this.stopHeartbeat();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    logger.warn('Disconnected from SignalR hub');
    this.notifyStatusChange();
  }

  /**
   * Handle connection error
   */
  private handleConnectionError(_error: any): void {
    this.connectionState = 'failed';
    this.reconnectAttempts++;

    if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
      logger.info(`Attempting to reconnect in ${this.config.reconnectInterval}ms (attempt ${this.reconnectAttempts})`);

      this.reconnectTimer = setTimeout(() => {
        this.connect();
      }, this.config.reconnectInterval);
    } else {
      logger.error('Max reconnection attempts reached');
    }

    this.notifyStatusChange();
  }

  /**
   * Start heartbeat
   */
  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.heartbeatTimer = setInterval(() => {
      if (this.signalRConnection && this.connectionState === 'connected') {
        this.signalRConnection.send('Heartbeat')
          .catch(error => {
            logger.debug('Heartbeat failed:', error);
          });
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Queue data for synchronization
   */
  async queueForSync(
    operation: Omit<SyncOperation, 'id' | 'timestamp' | 'status'>,
  ): Promise<void> {
    const syncOperation: SyncOperation = {
      ...operation,
      id: this.generateId(),
      timestamp: Date.now(),
      status: 'pending',
    };

    const entityKey = `${operation.entityType}:${operation.entityId}`;
    this.pendingOperations.set(entityKey, syncOperation);

    // Update entity state
    const currentState = this.entityStates.get(entityKey) || {
      entityType: operation.entityType,
      entityId: operation.entityId,
      version: 0,
      lastModified: Date.now(),
      isDirty: false,
      pendingSync: false,
    };

    currentState.isDirty = true;
    currentState.pendingSync = true;
    this.entityStates.set(entityKey, currentState);

    await this.persistData();

    // Notify listeners that status has changed (pending changes increased)
    this.notifyStatusChange();

    // Try to sync immediately if connected
    if (this.connectionState === 'connected') {
      this.syncPendingChanges();
    }

    logger.debug('Operation queued for sync:', {
      id: syncOperation.id,
      type: operation.type,
      entityType: operation.entityType,
      entityId: operation.entityId,
    });
  }

  /**
   * Sync pending changes
   */
  private async syncPendingChanges(): Promise<void> {
    if (this.syncInProgress || this.pendingOperations.size === 0) {
      return;
    }

    this.syncInProgress = true;
    this.notifyStatusChange();

    try {
      const operations = Array.from(this.pendingOperations.values())
        .slice(0, this.config.batchSize);

      logger.debug(`Syncing ${operations.length} pending operations`);

      for (const operation of operations) {
        try {
          operation.status = 'processing';
          await this.syncOperation(operation);
          operation.status = 'completed';
        } catch (error) {
          operation.status = 'failed';
          operation.errorMessage = error?.message;
          logger.error('Failed to sync operation:', {
            id: operation.id,
            error: error?.message,
          });
        }
      }

      // Remove completed operations
      const completedOperations = Array.from(this.pendingOperations.entries())
        .filter(([_, op]) => op.status === 'completed');

      completedOperations.forEach(([key, _]) => {
        this.pendingOperations.delete(key);
      });

      // Continue syncing if there are more operations
      if (this.pendingOperations.size > 0) {
        setTimeout(() => this.syncPendingChanges(), 1000);
      }

      await this.persistData();

    } catch (error) {
      logger.error('Error during sync:', error);
    } finally {
      this.syncInProgress = false;
      this.notifyStatusChange();
    }
  }

  /**
   * Sync individual operation
   */
  private async syncOperation(operation: SyncOperation): Promise<void> {
    if (!this.signalRConnection || this.connectionState !== 'connected') {
      throw new Error('Not connected to sync server');
    }

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Sync timeout')), this.config.syncTimeout);
    });

    const syncPromise = this.signalRConnection.invoke('SyncOperation', operation);

    await Promise.race([syncPromise, timeoutPromise]);
  }

  /**
   * Create sync conflict
   */
  private createConflict(conflict: SyncConflict): void {
    this.conflicts.set(conflict.id, conflict);
    this.notifyConflictListeners(conflict);
    this.persistData();
  }

  /**
   * Resolve conflict
   */
  async resolveConflict(
    conflictId: string,
    resolution: 'client' | 'server' | 'merge',
    resolvedData?: any,
  ): Promise<void> {
    const conflict = this.conflicts.get(conflictId);
    if (!conflict) {
      throw new Error('Conflict not found');
    }

    conflict.resolution = resolution;
    conflict.resolvedData = resolvedData;

    // Apply resolution based on strategy
    switch (resolution) {
      case 'client':
        // Keep local data, sync to server
        if (conflict.clientData) {
          await this.queueForSync({
            type: 'update',
            entityType: conflict.entityType,
            entityId: conflict.entityId,
            data: conflict.clientData,
            version: 0, // Server will determine version
          });
        }
        break;

      case 'server':
        // Accept server data, update local
        if (conflict.serverData) {
          this.handleDataChanged(conflict.entityType, conflict.entityId, conflict.serverData, 0);
        } else {
          this.handleEntityDeleted(conflict.entityType, conflict.entityId, 0);
        }
        break;

      case 'merge':
        // Use resolved data
        if (resolvedData) {
          await this.queueForSync({
            type: 'update',
            entityType: conflict.entityType,
            entityId: conflict.entityId,
            data: resolvedData,
            version: 0,
          });
          this.handleDataChanged(conflict.entityType, conflict.entityId, resolvedData, 0);
        }
        break;
    }

    // Remove resolved conflict
    this.conflicts.delete(conflictId);
    await this.persistData();

    logger.info('Conflict resolved:', { conflictId, resolution });
  }

  /**
   * Get sync status
   */
  getSyncStatus(): SyncStatus {
    return {
      isConnected: this.connectionState === 'connected',
      lastSyncTime: this.lastSyncTime,
      pendingChanges: this.pendingOperations.size,
      conflictCount: this.conflicts.size,
      syncInProgress: this.syncInProgress,
      connectionState: this.connectionState,
    };
  }

  /**
   * Get all conflicts
   */
  getConflicts(): SyncConflict[] {
    return Array.from(this.conflicts.values());
  }

  /**
   * Get pending operations
   */
  getPendingOperations(): SyncOperation[] {
    return Array.from(this.pendingOperations.values());
  }

  /**
   * Force sync
   */
  async forceSync(): Promise<void> {
    if (this.connectionState === 'connected') {
      await this.syncPendingChanges();
    } else {
      throw new Error('Not connected to sync server');
    }
  }

  /**
   * Clear all sync data
   */
  async clearAllData(): Promise<void> {
    this.pendingOperations.clear();
    this.conflicts.clear();
    this.entityStates.clear();
    this.lastSyncTime = null;

    await this.persistData();
    this.notifyStatusChange();

    logger.info('All sync data cleared');
  }

  /**
   * Subscribe to sync status changes
   */
  onSyncStatusChange(listener: SyncStatusListener): () => void {
    this.syncStatusListeners.push(listener);

    // Immediately call with current status (handle errors gracefully)
    try {
      listener(this.getSyncStatus());
    } catch (error) {
      logger.error('[SyncService] Error in status change listener:', error);
    }

    // Return unsubscribe function
    return () => {
      const index = this.syncStatusListeners.indexOf(listener);
      if (index > -1) {
        this.syncStatusListeners.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to conflict notifications
   */
  onConflict(listener: SyncConflictListener): () => void {
    this.conflictListeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.conflictListeners.indexOf(listener);
      if (index > -1) {
        this.conflictListeners.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to data changes
   */
  onDataChange(listener: DataChangeListener): () => void {
    this.dataChangeListeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.dataChangeListeners.indexOf(listener);
      if (index > -1) {
        this.dataChangeListeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify status change listeners
   */
  private notifyStatusChange(): void {
    const status = this.getSyncStatus();
    this.syncStatusListeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        logger.error('Error in sync status listener:', error);
      }
    });
  }

  /**
   * Notify conflict listeners
   */
  private notifyConflictListeners(conflict: SyncConflict): void {
    this.conflictListeners.forEach(listener => {
      try {
        listener(conflict);
      } catch (error) {
        logger.error('Error in conflict listener:', error);
      }
    });
  }

  /**
   * Notify data change listeners
   */
  private notifyDataChange(entityType: string, entityId: string, data: any): void {
    this.dataChangeListeners.forEach(listener => {
      try {
        listener(entityType, entityId, data);
      } catch (error) {
        logger.error('Error in data change listener:', error);
      }
    });
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Disconnect from SignalR hub
   */
  async disconnect(): Promise<void> {
    if (this.signalRConnection) {
      try {
        // BUG FIX: Remove all SignalR event handlers to prevent memory leaks
        this.signalREventNames.forEach(eventName => {
          try {
            this.signalRConnection?.off(eventName);
          } catch (offError) {
            logger.debug(`Error removing ${eventName} handler:`, offError);
          }
        });

        // Also remove connection event handlers
        try {
          this.signalRConnection.onreconnecting(null);
          this.signalRConnection.onreconnected(null);
          this.signalRConnection.onclose(null);
        } catch (connectionHandlerError) {
          logger.debug('Error removing connection handlers:', connectionHandlerError);
        }

        await this.signalRConnection.stop();
      } catch (error) {
        logger.error('Error stopping SignalR connection:', error);
      }
      this.signalRConnection = null;
    }

    this.stopHeartbeat();
    this.handleDisconnection();

    // BUG FIX: Clear all listeners arrays to prevent memory leaks
    this.syncStatusListeners = [];
    this.conflictListeners = [];
    this.dataChangeListeners = [];
  }
}

// Export singleton instance
const syncService = new SyncService();
export default syncService;
export { SyncService };
