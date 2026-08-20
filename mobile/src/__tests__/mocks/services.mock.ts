/**
 * Shared mock factories for service layer
 *
 * This file provides mock implementations and factories for core services
 * used in offline sync, network monitoring, and data synchronization.
 */

// ========================
// Type Definitions
// ========================

export interface QueuedRequest {
  id: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  data?: any;
  timestamp: number;
  retries: number;
  maxRetries: number;
  priority?: 'high' | 'normal' | 'low';
}

export interface SyncStats {
  queuedCount: number;
  failedCount: number;
  lastSyncTime?: number;
}

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean;
  type: 'wifi' | 'cellular' | 'none';
  details?: any;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface SyncConflict {
  id: string;
  resource: string;
  clientVersion: any;
  serverVersion: any;
  resolved: boolean;
  timestamp: number;
}

export interface SyncResult {
  synced: number;
  conflicts: number;
  errors: number;
}

// ========================
// OfflineService Mock
// ========================

export function createMockOfflineService() {
  const mockQueuedRequests: QueuedRequest[] = [];

  return {
    queueRequest: jest.fn((request: Partial<QueuedRequest>) => {
      const queuedRequest: QueuedRequest = {
        id: `request-${Date.now()}`,
        endpoint: request.endpoint || '/api/test',
        method: request.method || 'GET',
        data: request.data,
        timestamp: Date.now(),
        retries: 0,
        maxRetries: 3,
        priority: request.priority || 'normal',
      };
      mockQueuedRequests.push(queuedRequest);
      return Promise.resolve(queuedRequest.id);
    }),

    getQueuedRequests: jest.fn(() => Promise.resolve([...mockQueuedRequests])),

    clearQueue: jest.fn(() => {
      mockQueuedRequests.length = 0;
      return Promise.resolve();
    }),

    removeRequest: jest.fn((requestId: string) => {
      const index = mockQueuedRequests.findIndex(r => r.id === requestId);
      if (index !== -1) {
        mockQueuedRequests.splice(index, 1);
      }
      return Promise.resolve();
    }),

    retryFailedRequests: jest.fn(() => Promise.resolve({
      successful: 0,
      failed: 0,
    })),

    getStats: jest.fn((): Promise<SyncStats> => Promise.resolve({
      queuedCount: mockQueuedRequests.length,
      failedCount: 0,
      lastSyncTime: Date.now(),
    })),

    onSyncChange: jest.fn((callback: (stats: SyncStats) => void) => {
      // Return unsubscribe function
      return jest.fn();
    }),

    // Test utilities
    __getQueue: () => [...mockQueuedRequests],
    __clearQueue: () => { mockQueuedRequests.length = 0; },
  };
}

// ========================
// SyncService Mock
// ========================

export function createMockSyncService() {
  const mockConflicts: SyncConflict[] = [];
  const mockSyncStatus = {
    isSyncing: false,
    isConnected: true,
    lastSyncTime: Date.now(),
  };

  return {
    sync: jest.fn((data?: any): Promise<SyncResult> => {
      return Promise.resolve({
        synced: data ? 1 : 0,
        conflicts: mockConflicts.length,
        errors: 0,
      });
    }),

    forceSync: jest.fn((): Promise<SyncResult> => {
      return Promise.resolve({
        synced: 0,
        conflicts: 0,
        errors: 0,
      });
    }),

    resolveConflict: jest.fn((conflictId: string, resolution: 'client' | 'server' | 'manual', data?: any) => {
      const conflict = mockConflicts.find(c => c.id === conflictId);
      if (conflict) {
        conflict.resolved = true;
      }
      return Promise.resolve();
    }),

    getConflicts: jest.fn(() => Promise.resolve([...mockConflicts])),

    getSyncStatus: jest.fn(() => ({ ...mockSyncStatus })),

    onSyncStatusChange: jest.fn((callback: (status: any) => void) => {
      // Return unsubscribe function
      return jest.fn();
    }),

    onConflict: jest.fn((callback: (conflict: SyncConflict) => void) => {
      // Return unsubscribe function
      return jest.fn();
    }),

    // Test utilities
    __addConflict: (conflict: Partial<SyncConflict>) => {
      mockConflicts.push({
        id: `conflict-${Date.now()}`,
        resource: conflict.resource || 'test-resource',
        clientVersion: conflict.clientVersion || {},
        serverVersion: conflict.serverVersion || {},
        resolved: false,
        timestamp: Date.now(),
      });
    },
    __clearConflicts: () => { mockConflicts.length = 0; },
    __setSyncStatus: (status: Partial<typeof mockSyncStatus>) => {
      Object.assign(mockSyncStatus, status);
    },
  };
}

// ========================
// NetworkService Mock
// ========================

export function createMockNetworkService() {
  let currentStatus: NetworkStatus = {
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
    details: null,
    quality: 'excellent',
  };

  const listeners: Set<(status: NetworkStatus) => void> = new Set();
  const qualityListeners: Set<(quality: string) => void> = new Set();

  // Integrate with NetworkSimulator if available
  try {
    // Dynamic import for optional NetworkSimulator integration
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { NetworkSimulator } = require('../utils/networkSimulator');
    NetworkSimulator.subscribe((netInfoState: any) => {
      currentStatus = {
        isConnected: netInfoState.isConnected,
        isInternetReachable: netInfoState.isInternetReachable,
        type: netInfoState.type,
        details: netInfoState.details,
        quality: netInfoState.isConnected ? 'excellent' : 'poor',
      };
      listeners.forEach(callback => callback({ ...currentStatus }));
      qualityListeners.forEach(callback => callback(currentStatus.quality));
    });
  } catch (e) {
    // NetworkSimulator not available, use static state
  }

  return {
    getCurrentStatus: jest.fn(() => ({ ...currentStatus })),

    testConnection: jest.fn(() => Promise.resolve(currentStatus.isConnected && currentStatus.isInternetReachable)),

    getConnectionQuality: jest.fn(() => Promise.resolve(currentStatus.quality)),

    getQualityLevel: jest.fn(() => currentStatus.quality),

    onConnectionChange: jest.fn((callback: (status: NetworkStatus) => void) => {
      listeners.add(callback);
      // Immediately notify with current status
      callback({ ...currentStatus });
      // Return unsubscribe function
      return () => {
        listeners.delete(callback);
      };
    }),

    onQualityChange: jest.fn((callback: (quality: string) => void) => {
      qualityListeners.add(callback);
      // Immediately notify with current quality
      callback(currentStatus.quality);
      // Return unsubscribe function
      return () => {
        qualityListeners.delete(callback);
      };
    }),

    // Test utilities
    __setStatus: (status: Partial<NetworkStatus>) => {
      currentStatus = { ...currentStatus, ...status };
      listeners.forEach(callback => callback({ ...currentStatus }));
    },
    __setQuality: (quality: NetworkStatus['quality']) => {
      currentStatus.quality = quality;
      qualityListeners.forEach(callback => callback(quality));
    },
    __getListenerCount: () => listeners.size,
    __getQualityListenerCount: () => qualityListeners.size,
    __clearListeners: () => {
      listeners.clear();
      qualityListeners.clear();
    },
  };
}

// ========================
// Comprehensive Reset
// ========================

/**
 * Create a complete set of mocked services
 * @returns Object containing all service mocks
 */
export function createMockServices() {
  return {
    offlineService: createMockOfflineService(),
    syncService: createMockSyncService(),
    networkService: createMockNetworkService(),
  };
}

/**
 * Reset all service mocks to initial state
 * @param services Services object from createMockServices()
 */
export function resetServiceMocks(services: ReturnType<typeof createMockServices>): void {
  // Clear all queues and internal state
  services.offlineService.__clearQueue();
  services.syncService.__clearConflicts();
  services.networkService.__clearListeners();

  // Reset jest mocks
  jest.clearAllMocks();
}
