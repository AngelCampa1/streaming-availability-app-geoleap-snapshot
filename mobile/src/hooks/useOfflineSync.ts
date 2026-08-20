/**
 * Offline Sync Hook for GeoLeap Mobile App
 * Provides comprehensive offline synchronization capabilities
 * Handles data queuing, conflict resolution, and sync status management
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { OfflineService, type OfflineStats, type QueuedRequest } from '../services/api/OfflineService';
import { SyncService, type SyncStatus, type SyncConflict } from '../services/api/SyncService';
import { NetworkService, type NetworkStatus } from '../services/api/NetworkService';
import { logger } from '../utils/logger';

export interface UseOfflineSyncOptions {
  autoSync?: boolean;
  conflictResolution?: 'client' | 'server' | 'merge' | 'manual';
  onSyncStart?: () => void;
  onSyncComplete?: (stats: OfflineStats) => void;
  onSyncError?: (error: Error) => void;
  onConflict?: (conflict: SyncConflict) => void;
  onOnline?: () => void;
  onOffline?: () => void;
  syncInterval?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface OfflineSyncState {
  isOnline: boolean;
  isSyncing: boolean;
  hasPendingChanges: boolean;
  hasConflicts: boolean;
  queuedRequests: QueuedRequest[];
  conflicts: SyncConflict[];
  lastSyncTime: number | null;
  offlineDuration: number;
  networkQuality: string;
  syncProgress: {
    total: number;
    completed: number;
    failed: number;
  };
}

export interface SyncActions {
  forceSync: () => Promise<void>;
  resolveConflict: (conflictId: string, resolution: 'client' | 'server' | 'merge', resolvedData?: any) => Promise<void>;
  clearQueue: () => Promise<void>;
  retryFailedRequests: () => Promise<void>;
  clearConflicts: () => Promise<void>;
  pauseSync: () => void;
  resumeSync: () => void;
}

/**
 * Custom hook for offline synchronization
 */
export function useOfflineSync(options: UseOfflineSyncOptions = {}): OfflineSyncState & SyncActions {
  const {
    autoSync = true,
    conflictResolution = 'merge',
    onSyncStart,
    onSyncComplete,
    onSyncError,
    onConflict,
    onOnline,
    onOffline,
    syncInterval = 30000, // 30 seconds
    retryAttempts: _retryAttempts = 3,
    retryDelay: _retryDelay = 2000, // 2 seconds
  } = options;

  // Services
  const offlineService = useRef(new OfflineService());
  const syncService = useRef(new SyncService({ conflictResolution }));
  const networkService = useRef(new NetworkService());

  // State
  const [state, setState] = useState<OfflineSyncState>({
    isOnline: true,
    isSyncing: false,
    hasPendingChanges: false,
    hasConflicts: false,
    queuedRequests: [],
    conflicts: [],
    lastSyncTime: null,
    offlineDuration: 0,
    networkQuality: 'unknown',
    syncProgress: {
      total: 0,
      completed: 0,
      failed: 0,
    },
  });

  // Refs
  const mountedRef = useRef(true);
  const isPausedRef = useRef(false);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isOnlineRef = useRef(true);
  const offlineStartTimeRef = useRef<number | null>(null);

  // Safe state update
  const safeSetState = useCallback((updater: (prev: OfflineSyncState) => OfflineSyncState) => {
    if (mountedRef.current) {
      setState(updater);
    }
  }, []);

  // Update sync progress
  const updateSyncProgress = useCallback((completed: number, failed: number, total: number) => {
    safeSetState(prev => ({
      ...prev,
      syncProgress: { completed, failed, total },
    }));
  }, [safeSetState]);

  // Handle network status change
  const handleNetworkChange = useCallback((networkStatus: NetworkStatus) => {
    const wasOnline = isOnlineRef.current;
    const isOnline = networkStatus.isConnected && networkStatus.isInternetReachable;
    isOnlineRef.current = isOnline;

    safeSetState(prev => ({
      ...prev,
      isOnline,
      networkQuality: networkService.current.getQualityLevel(),
      offlineDuration: !isOnline && offlineStartTimeRef.current
        ? Date.now() - offlineStartTimeRef.current
        : 0,
    }));

    if (isOnline && !wasOnline) {
      // Just came back online
      logger.info('Device back online, starting sync');
      offlineStartTimeRef.current = null;
      onOnline?.();

      if (autoSync && !isPausedRef.current) {
        // Start sync immediately
        forceSync();
      }
    } else if (!isOnline && wasOnline) {
      // Just went offline
      logger.warn('Device went offline');
      offlineStartTimeRef.current = Date.now();
      onOffline?.();
    }
  }, [autoSync, onOnline, onOffline, safeSetState]);

  // Handle offline stats change
  const handleOfflineStatsChange = useCallback((stats: OfflineStats) => {
    safeSetState(prev => ({
      ...prev,
      hasPendingChanges: stats.queuedRequests > 0,
      queuedRequests: offlineService.current.getQueuedRequests(),
      lastSyncTime: stats.lastSyncTime,
      offlineDuration: stats.offlineDuration,
    }));
  }, [safeSetState]);

  // Handle sync status change
  const handleSyncStatusChange = useCallback((syncStatus: SyncStatus) => {
    safeSetState(prev => ({
      ...prev,
      isSyncing: syncStatus.syncInProgress,
      hasPendingChanges: syncStatus.pendingChanges > 0,
      hasConflicts: syncStatus.conflictCount > 0,
      lastSyncTime: syncStatus.lastSyncTime,
    }));
  }, [safeSetState]);

  // Handle sync conflict
  const handleSyncConflict = useCallback((conflict: SyncConflict) => {
    logger.warn('Sync conflict detected:', conflict);
    onConflict?.(conflict);

    safeSetState(prev => ({
      ...prev,
      hasConflicts: true,
      conflicts: syncService.current.getConflicts(),
    }));
  }, [onConflict, safeSetState]);

  // Force synchronization
  const forceSync = useCallback(async () => {
    if (!isOnlineRef.current || isPausedRef.current) {
      return;
    }

    try {
      onSyncStart?.();
      safeSetState(prev => ({ ...prev, isSyncing: true }));

      logger.info('Starting forced synchronization');

      // Get current stats
      const _stats = await offlineService.current.getStats();
      const queuedRequests = await offlineService.current.getQueuedRequests();

      updateSyncProgress(0, 0, queuedRequests.length);

      // Process queued requests
      let completed = 0;
      let failed = 0;

      for (const request of queuedRequests) {
        try {
          await offlineService.current.processQueuedRequest(request);
          completed++;
        } catch (error) {
          logger.error('Failed to process queued request:', error);
          failed++;
        }

        updateSyncProgress(completed, failed, queuedRequests.length);
      }

      // Process sync operations
      if (syncService.current.getSyncStatus().isConnected) {
        await syncService.current.forceSync();
      }

      const finalStats = await offlineService.current.getStats();
      const finalQueuedRequests = await offlineService.current.getQueuedRequests();
      safeSetState(prev => ({
        ...prev,
        isSyncing: false,
        hasPendingChanges: finalStats.queuedRequests > 0,
        queuedRequests: finalQueuedRequests,
        lastSyncTime: Date.now(),
      }));

      onSyncComplete?.(finalStats);
      logger.info('Synchronization completed:', finalStats);

    } catch (error) {
      logger.error('Synchronization failed:', error);
      safeSetState(prev => ({ ...prev, isSyncing: false }));
      onSyncError?.(error instanceof Error ? error : new Error('Sync failed'));
    }
  }, [onSyncStart, onSyncComplete, onSyncError, safeSetState, updateSyncProgress]);

  // Resolve conflict
  const resolveConflict = useCallback(async (
    conflictId: string,
    resolution: 'client' | 'server' | 'merge',
    resolvedData?: any,
  ) => {
    try {
      await syncService.current.resolveConflict(conflictId, resolution, resolvedData);

      const conflicts = await syncService.current.getConflicts();
      safeSetState(prev => ({
        ...prev,
        hasConflicts: conflicts.length > 0,
        conflicts,
      }));

      logger.info('Conflict resolved:', { conflictId, resolution });

    } catch (error) {
      logger.error('Failed to resolve conflict:', error);
      throw error;
    }
  }, [safeSetState]);

  // Clear queue
  const clearQueue = useCallback(async () => {
    try {
      await offlineService.current.clearAllData();

      safeSetState(prev => ({
        ...prev,
        hasPendingChanges: false,
        queuedRequests: [],
      }));

      logger.info('Offline queue cleared');
    } catch (error) {
      logger.error('Failed to clear queue:', error);
      throw error;
    }
  }, [safeSetState]);

  // Retry failed requests
  const retryFailedRequests = useCallback(async () => {
    if (!isOnlineRef.current) {
      throw new Error('Cannot retry requests while offline');
    }

    try {
      await offlineService.current.retryFailedRequests();

      safeSetState(prev => ({
        ...prev,
        queuedRequests: offlineService.current.getQueuedRequests(),
      }));

      logger.info('Failed requests retried');
    } catch (error) {
      logger.error('Failed to retry requests:', error);
      throw error;
    }
  }, [safeSetState]);

  // Clear conflicts
  const clearConflicts = useCallback(async () => {
    try {
      const conflicts = syncService.current.getConflicts();

      // Auto-resolve conflicts with default strategy
      for (const conflict of conflicts) {
        await resolveConflict(conflict.id, conflictResolution as 'client' | 'server' | 'merge');
      }

      safeSetState(prev => ({
        ...prev,
        hasConflicts: false,
        conflicts: [],
      }));

      logger.info('All conflicts cleared');
    } catch (error) {
      logger.error('Failed to clear conflicts:', error);
      throw error;
    }
  }, [conflictResolution, resolveConflict, safeSetState]);

  // Pause sync
  const pauseSync = useCallback(() => {
    isPausedRef.current = true;
    logger.info('Sync paused');
  }, []);

  // Resume sync
  const resumeSync = useCallback(() => {
    isPausedRef.current = false;
    logger.info('Sync resumed');

    if (isOnlineRef.current && autoSync) {
      forceSync();
    }
  }, [autoSync, forceSync]);


  // Initialize services and listeners
  useEffect(() => {
    let cleanupNetwork: (() => void) | null = null;
    let cleanupOffline: (() => void) | null = null;
    let cleanupSync: (() => void) | null = null;
    // BUG FIX: Track conflict listener cleanup
    let cleanupConflict: (() => void) | null = null;

    const initialize = async () => {
      try {
        // Setup network listener
        cleanupNetwork = networkService.current.onConnectionChange(handleNetworkChange);

        // Setup offline stats listener
        cleanupOffline = offlineService.current.onSyncChange(handleOfflineStatsChange);

        // Setup sync status listener
        cleanupSync = syncService.current.onSyncStatusChange(handleSyncStatusChange);

        // Setup conflict listener
        // BUG FIX: Track conflict listener for cleanup
        cleanupConflict = syncService.current.onConflict(handleSyncConflict);

        // Get initial states
        const initialNetworkStatus = networkService.current.getCurrentStatus();
        if (initialNetworkStatus) {
          handleNetworkChange(initialNetworkStatus);
        }

        const initialOfflineStats = await offlineService.current.getStats();
        handleOfflineStatsChange(initialOfflineStats);

        const initialSyncStatus = syncService.current.getSyncStatus();
        handleSyncStatusChange(initialSyncStatus);

        logger.info('Offline sync hook initialized');

      } catch (error) {
        logger.error('Failed to initialize offline sync hook:', error);
      }
    };

    initialize();

    // Setup periodic sync
    if (autoSync && syncInterval > 0) {
      syncIntervalRef.current = setInterval(() => {
        if (isOnlineRef.current && !isPausedRef.current) {
          forceSync();
        }
      }, syncInterval);
    }

    return () => {
      mountedRef.current = false;

      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }

      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }

      cleanupNetwork?.();
      cleanupOffline?.();
      cleanupSync?.();
      // BUG FIX: Clean up conflict listener
      cleanupConflict?.();
    };
  }, [
    autoSync,
    syncInterval,
    handleNetworkChange,
    handleOfflineStatsChange,
    handleSyncStatusChange,
    handleSyncConflict,
    forceSync,
  ]);

  return {
    // State
    ...state,

    // Actions
    forceSync,
    resolveConflict,
    clearQueue,
    retryFailedRequests,
    clearConflicts,
    pauseSync,
    resumeSync,
  };
}

/**
 * Hook for specific entity synchronization
 */
export function useEntitySync<T = any>(
  entityType: string,
  entityId: string,
  options: {
    initialData?: T;
    conflictResolver?: (clientData: T, serverData: T) => Promise<T>;
    onSync?: (data: T) => void;
    onConflict?: (conflict: SyncConflict) => void;
  } = {},
) {
  const {
    initialData,
    conflictResolver,
    onSync,
    onConflict,
  } = options;

  const [data, setData] = useState<T | undefined>(initialData);
  const [isDirty, setIsDirty] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'pending' | 'conflict' | 'error'>('synced');

  const offlineSyncHook = useOfflineSync({
    onConflict: onConflict,
  });

  const { forceSync, resolveConflict } = offlineSyncHook;

  // Update local data
  const updateData = useCallback((newData: T, _options: { syncImmediately?: boolean } = {}) => {
    const previousData = data;
    setData(newData);
    setIsDirty(true);
    setSyncStatus('pending');

    // Queue for sync if data changed
    if (JSON.stringify(previousData) !== JSON.stringify(newData)) {
      // Note: queueForSync functionality will be implemented via the parent hook
      logger.info('Data changed, marked for sync:', entityType, entityId);
    }
  }, [data, entityType, entityId]);

  // Handle data changes from sync
  useEffect(() => {
    const localSyncService = new SyncService({ conflictResolution: 'merge' });
    const unsubscribe = localSyncService.onDataChange((type, id, syncData) => {
      if (type === entityType && id === entityId) {
        setData(syncData);
        setIsDirty(false);
        setSyncStatus('synced');
        onSync?.(syncData);
      }
    });

    return unsubscribe;
  }, [entityType, entityId, onSync]);

  // Handle conflicts for this entity
  useEffect(() => {
    const localSyncService = new SyncService({ conflictResolution: 'merge' });
    const unsubscribe = localSyncService.onConflict(async (conflict) => {
      if (conflict.entityType === entityType && conflict.entityId === entityId) {
        setSyncStatus('conflict');

        if (conflictResolver) {
          try {
            const resolvedData = await conflictResolver(conflict.clientData, conflict.serverData);
            await resolveConflict(conflict.id, 'merge', resolvedData);
            setData(resolvedData);
            setIsDirty(false);
            setSyncStatus('synced');
          } catch (error) {
            logger.error('Failed to resolve entity conflict:', error);
            setSyncStatus('error');
          }
        }
      }
    });

    return unsubscribe;
  }, [entityType, entityId, conflictResolver, resolveConflict]);

  return {
    data,
    updateData,
    isDirty,
    syncStatus,
    forceSync: () => forceSync(),
    markAsSynced: () => {
      setIsDirty(false);
      setSyncStatus('synced');
    },
  };
}

export default useOfflineSync;
