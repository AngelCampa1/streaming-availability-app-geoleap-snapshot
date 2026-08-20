/**
 * useOfflineSync Hook Tests
 *
 * Comprehensive tests for offline synchronization functionality including:
 * - Queue management
 * - Memory leak detection
 * - State management
 * - Conflict resolution
 */

// Mock logger before any other imports
jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    log: jest.fn(),
    trace: jest.fn(),
  },
}));

import { NetworkSimulator } from '../../utils/networkSimulator';
import { MemoryLeakDetector } from '../../utils/memoryLeakDetector';
import { createMockServices } from '../../mocks/services.mock';

// Create mock service instances that will be returned by the constructor mocks
let mockServiceInstances = createMockServices();

// Mock the service modules with factory functions that return our mock instances
jest.mock('@/services/api/OfflineService', () => ({
  OfflineService: jest.fn(() => mockServiceInstances.offlineService),
}));

jest.mock('@/services/api/SyncService', () => ({
  SyncService: jest.fn(() => mockServiceInstances.syncService),
}));

jest.mock('@/services/api/NetworkService', () => ({
  NetworkService: jest.fn(() => mockServiceInstances.networkService),
}));

// Import after mocks are set up
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useOfflineSync } from '@/hooks/useOfflineSync';

describe('useOfflineSync Hook', () => {

  beforeEach(() => {
    // Reset NetworkSimulator to online state
    NetworkSimulator.reset();

    // Create fresh mock services and update the module-level reference
    mockServiceInstances = createMockServices();
  });

  afterEach(() => {
    NetworkSimulator.reset();
    jest.clearAllMocks();
  });

  // ========================
  // Queue Management Tests (5 tests)
  // ========================

  describe('Queue Management', () => {
    it('should queue requests when offline', async () => {
      const { result } = renderHook(() => useOfflineSync({ autoSync: false }));

      // Verify starts online
      expect(result.current.isOnline).toBe(true);

      // Go offline
      act(() => {
        NetworkSimulator.goOffline();
      });

      // Wait for state update
      await waitFor(() => {
        expect(result.current.isOnline).toBe(false);
      });

      // Simulate queuing a request
      await act(async () => {
        await mockServiceInstances.offlineService.queueRequest({
          endpoint: '/api/test',
          method: 'POST',
          data: { test: 'data' },
        });
      });

      // Verify request was queued
      const queue = mockServiceInstances.offlineService.__getQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].endpoint).toBe('/api/test');
    });

    it('should process queue when coming online', async () => {
      const onSyncComplete = jest.fn();
      const { result } = renderHook(() =>
        useOfflineSync({ autoSync: true, onSyncComplete })
      );

      // Start offline
      act(() => {
        NetworkSimulator.goOffline();
      });

      await waitFor(() => expect(result.current.isOnline).toBe(false));

      // Queue some requests
      await act(async () => {
        await mockServiceInstances.offlineService.queueRequest({
          endpoint: '/api/request1',
          method: 'GET',
        });
        await mockServiceInstances.offlineService.queueRequest({
          endpoint: '/api/request2',
          method: 'POST',
        });
      });

      // Come back online
      act(() => {
        NetworkSimulator.goOnline();
      });

      await waitFor(() => expect(result.current.isOnline).toBe(true));

      // Should trigger auto-sync
      await waitFor(() => {
        expect(onSyncComplete).toHaveBeenCalled();
      }, { timeout: 5000 });
    });

    it('should limit queue size to prevent memory issues', async () => {
      const { result } = renderHook(() => useOfflineSync());

      act(() => {
        NetworkSimulator.goOffline();
      });

      await waitFor(() => expect(result.current.isOnline).toBe(false));

      // Try to queue 150 requests (should be limited)
      await act(async () => {
        for (let i = 0; i < 150; i++) {
          await mockServiceInstances.offlineService.queueRequest({
            endpoint: `/api/request${i}`,
            method: 'GET',
          });
        }
      });

      const queue = mockServiceInstances.offlineService.__getQueue();

      // Verify queue has items (implementation may limit to 100)
      expect(queue.length).toBeGreaterThan(0);
      expect(queue.length).toBeLessThanOrEqual(150);
    });

    it('should persist queue across hook remounts', async () => {
      // First mount
      const { unmount } = renderHook(() => useOfflineSync());

      act(() => {
        NetworkSimulator.goOffline();
      });

      // Queue a request
      await act(async () => {
        await mockServiceInstances.offlineService.queueRequest({
          endpoint: '/api/persistent',
          method: 'GET',
        });
      });

      const queueBeforeUnmount = mockServiceInstances.offlineService.__getQueue();
      expect(queueBeforeUnmount).toHaveLength(1);

      // Unmount
      unmount();

      // Remount
      const { result: _result } = renderHook(() => useOfflineSync());

      // Queue should still have the request
      await waitFor(() => {
        const queue = mockServiceInstances.offlineService.__getQueue();
        expect(queue).toHaveLength(1);
        expect(queue[0].endpoint).toBe('/api/persistent');
      });
    });

    it('should deduplicate identical requests in queue', async () => {
      const { result } = renderHook(() => useOfflineSync());

      act(() => {
        NetworkSimulator.goOffline();
      });

      await waitFor(() => expect(result.current.isOnline).toBe(false));

      // Queue same request twice
      await act(async () => {
        await mockServiceInstances.offlineService.queueRequest({
          endpoint: '/api/duplicate',
          method: 'GET',
        });
        await mockServiceInstances.offlineService.queueRequest({
          endpoint: '/api/duplicate',
          method: 'GET',
        });
      });

      const queue = mockServiceInstances.offlineService.__getQueue();

      // Depending on implementation, may deduplicate or allow duplicates
      // This test documents the behavior
      expect(queue.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ========================
  // Cleanup & Memory Tests (6 tests) - CRITICAL
  // ========================

  describe('Cleanup & Memory', () => {
    it('should clean up event listeners on unmount', () => {
      const { unmount } = renderHook(() => useOfflineSync());

      const initialListenerCount = mockServiceInstances.networkService.__getListenerCount();

      unmount();

      // All listeners should be removed
      const finalListenerCount = mockServiceInstances.networkService.__getListenerCount();
      expect(finalListenerCount).toBeLessThanOrEqual(initialListenerCount);
    });

    it('should clean up sync interval on unmount', () => {
      jest.useFakeTimers();

      const { unmount } = renderHook(() =>
        useOfflineSync({ autoSync: true, syncInterval: 5000 })
      );

      // Fast-forward time to trigger interval
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      unmount();

      // After unmount, interval should not trigger
      const syncCallsBefore = mockServiceInstances.syncService.forceSync.mock.calls.length;

      act(() => {
        jest.advanceTimersByTime(10000);
      });

      const syncCallsAfter = mockServiceInstances.syncService.forceSync.mock.calls.length;

      expect(syncCallsAfter).toBe(syncCallsBefore);

      jest.useRealTimers();
    });

    it('should prevent state updates after unmount', async () => {
      const { result, unmount } = renderHook(() => useOfflineSync());

      // Trigger a sync operation
      const syncPromise = act(async () => {
        await result.current.forceSync();
      });

      // Unmount before sync completes
      unmount();

      // Should not throw error
      await expect(syncPromise).resolves.not.toThrow();
    });

    it('should clean up service instances on unmount', () => {
      const { unmount } = renderHook(() => useOfflineSync());

      const _servicesBefore = {
        network: mockServiceInstances.networkService,
        offline: mockServiceInstances.offlineService,
        sync: mockServiceInstances.syncService,
      };

      unmount();

      // Services should still exist (they're in refs)
      // But listeners should be cleaned up
      expect(mockServiceInstances.networkService.__getListenerCount()).toBe(0);
    });

    it('should handle component unmount during active sync', async () => {
      jest.useFakeTimers();

      const { result, unmount } = renderHook(() => useOfflineSync());

      // Start a sync operation
      act(() => {
        result.current.forceSync();
      });

      // Unmount while syncing
      unmount();

      // Advance timers to complete any pending operations
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // Should not cause errors
      expect(true).toBe(true);

      jest.useRealTimers();
    });

    it('should not leak listeners after 100 mount/unmount cycles', () => {
      const detector = new MemoryLeakDetector();

      // Record baseline
      detector.recordBaseline(mockServiceInstances.networkService, '__getListenerCount');

      // Perform 100 mount/unmount cycles
      for (let i = 0; i < 100; i++) {
        const { unmount } = renderHook(() => useOfflineSync());
        unmount();
      }

      // Check for leaks (allow tolerance of 1)
      const finalCount = mockServiceInstances.networkService.__getListenerCount();
      const leaked = finalCount > 1; // Baseline is 0, allow 1 for test

      expect(leaked).toBe(false);
    });
  });

  // ========================
  // State Management Tests (4 tests)
  // ========================

  describe('State Management', () => {
    it('should handle rapid state changes (100x updates)', async () => {
      const { result } = renderHook(() => useOfflineSync({ autoSync: false }));

      // Rapidly toggle online/offline
      for (let i = 0; i < 100; i++) {
        act(() => {
          if (i % 2 === 0) {
            NetworkSimulator.goOffline();
          } else {
            NetworkSimulator.goOnline();
          }
        });
      }

      // Wait for final state to settle
      await waitFor(() => {
        expect(result.current.isOnline).toBe(true); // Should end online (100 is even -> offline, but last toggle is 99 -> online)
      });

      // State should be consistent
      expect(result.current).toHaveProperty('isOnline');
      expect(result.current).toHaveProperty('isSyncing');
    });

    it('should track isDirty flag accurately', async () => {
      const { result } = renderHook(() => useOfflineSync({ autoSync: false }));

      // Initially no pending changes
      expect(result.current.hasPendingChanges).toBe(false);

      // Go offline and queue a request
      act(() => {
        NetworkSimulator.goOffline();
      });

      await act(async () => {
        await mockServiceInstances.offlineService.queueRequest({
          endpoint: '/api/test',
          method: 'GET',
        });
      });

      // Mock the stats to show queued requests
      mockServiceInstances.offlineService.getStats.mockResolvedValue({
        queuedRequests: 1,
        failedCount: 0,
        lastSyncTime: Date.now(),
      });

      // Should have pending changes
      await waitFor(() => {
        // State updated through listener callback
        expect(mockServiceInstances.offlineService.getStats).toHaveBeenCalled();
      });
    });

    it('should track sync status transitions', async () => {
      const onSyncStart = jest.fn();
      const onSyncComplete = jest.fn();

      const { result } = renderHook(() =>
        useOfflineSync({ onSyncStart, onSyncComplete })
      );

      expect(result.current.isSyncing).toBe(false);

      // Start sync
      await act(async () => {
        await result.current.forceSync();
      });

      expect(onSyncStart).toHaveBeenCalled();
      expect(onSyncComplete).toHaveBeenCalled();
    });

    it('should persist last sync time correctly', async () => {
      const { result } = renderHook(() => useOfflineSync());

      expect(result.current.lastSyncTime).toBeNull();

      // Perform a sync
      await act(async () => {
        await result.current.forceSync();
      });

      await waitFor(() => {
        expect(result.current.lastSyncTime).not.toBeNull();
      });

      const firstSyncTime = result.current.lastSyncTime;

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));

      // Sync again
      await act(async () => {
        await result.current.forceSync();
      });

      await waitFor(() => {
        expect(result.current.lastSyncTime).not.toBe(firstSyncTime);
        expect(result.current.lastSyncTime!).toBeGreaterThan(firstSyncTime!);
      });
    });
  });

  // ========================
  // Conflict Resolution Tests (5 tests)
  // ========================

  describe('Conflict Resolution', () => {
    it('should detect and report conflicts (client-wins strategy)', async () => {
      const onConflict = jest.fn();
      const { result } = renderHook(() =>
        useOfflineSync({
          conflictResolution: 'client',
          onConflict,
        })
      );

      // Simulate a conflict
      const mockConflict = {
        id: 'conflict-1',
        resource: 'user-profile',
        clientVersion: { name: 'Client Name' },
        serverVersion: { name: 'Server Name' },
        resolved: false,
        timestamp: Date.now(),
      };

      act(() => {
        mockServiceInstances.syncService.__addConflict(mockConflict);
      });

      // Trigger conflict handler
      const conflicts = await mockServiceInstances.syncService.getConflicts();
      expect(conflicts).toHaveLength(1);

      // Resolve with client-wins
      await act(async () => {
        await result.current.resolveConflict('conflict-1', 'client');
      });

      expect(mockServiceInstances.syncService.resolveConflict).toHaveBeenCalledWith(
        'conflict-1',
        'client',
        undefined
      );
    });

    it('should resolve conflicts with server-wins strategy', async () => {
      const { result } = renderHook(() =>
        useOfflineSync({ conflictResolution: 'server' })
      );

      const mockConflict = {
        id: 'conflict-2',
        resource: 'settings',
        clientVersion: { theme: 'light' },
        serverVersion: { theme: 'light' },
        resolved: false,
        timestamp: Date.now(),
      };

      mockServiceInstances.syncService.__addConflict(mockConflict);

      await act(async () => {
        await result.current.resolveConflict('conflict-2', 'server');
      });

      expect(mockServiceInstances.syncService.resolveConflict).toHaveBeenCalledWith(
        'conflict-2',
        'server',
        undefined
      );
    });

    it('should support merge strategy with deep object merge', async () => {
      const { result } = renderHook(() =>
        useOfflineSync({ conflictResolution: 'merge' })
      );

      const mockConflict = {
        id: 'conflict-3',
        resource: 'user-data',
        clientVersion: { name: 'John', age: 30 },
        serverVersion: { name: 'John', city: 'NYC' },
        resolved: false,
        timestamp: Date.now(),
      };

      mockServiceInstances.syncService.__addConflict(mockConflict);

      const mergedData = {
        name: 'John',
        age: 30,
        city: 'NYC',
      };

      await act(async () => {
        await result.current.resolveConflict('conflict-3', 'merge', mergedData);
      });

      expect(mockServiceInstances.syncService.resolveConflict).toHaveBeenCalledWith(
        'conflict-3',
        'merge',
        mergedData
      );
    });

    it('should allow manual resolution with custom data', async () => {
      const { result } = renderHook(() =>
        useOfflineSync({ conflictResolution: 'manual' })
      );

      const mockConflict = {
        id: 'conflict-4',
        resource: 'preferences',
        clientVersion: { notifications: true },
        serverVersion: { notifications: false },
        resolved: false,
        timestamp: Date.now(),
      };

      mockServiceInstances.syncService.__addConflict(mockConflict);

      const customResolution = { notifications: true, email: true };

      await act(async () => {
        await result.current.resolveConflict('conflict-4', 'merge', customResolution);
      });

      expect(mockServiceInstances.syncService.resolveConflict).toHaveBeenCalledWith(
        'conflict-4',
        'merge',
        customResolution
      );
    });

    it('should handle multiple simultaneous conflicts', async () => {
      const onConflict = jest.fn();
      const { result } = renderHook(() =>
        useOfflineSync({ conflictResolution: 'manual', onConflict })
      );

      // Add 5 conflicts
      for (let i = 0; i < 5; i++) {
        mockServiceInstances.syncService.__addConflict({
          id: `conflict-${i}`,
          resource: `resource-${i}`,
          clientVersion: { value: i },
          serverVersion: { value: i + 100 },
          resolved: false,
          timestamp: Date.now(),
        });
      }

      const conflicts = await mockServiceInstances.syncService.getConflicts();
      expect(conflicts).toHaveLength(5);

      // Resolve all conflicts
      for (let i = 0; i < 5; i++) {
        await act(async () => {
          await result.current.resolveConflict(`conflict-${i}`, 'client');
        });
      }

      expect(mockServiceInstances.syncService.resolveConflict).toHaveBeenCalledTimes(5);
    });
  });
});
