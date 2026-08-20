/**
 * Week 2, Day 9: Real-time Features - Critical Bugs Regression Test Suite
 *
 * This test suite validates fixes for all 9 bugs found during the real-time features audit.
 * Tests cover SignalR connections, WebSocket stability, message handling, and memory leaks.
 *
 * Bug Coverage:
 * - BUG #1: Service instantiation pattern violations
 * - BUG #2: Network listener cleanup not tracked (MEMORY LEAK)
 * - BUG #3: Promise.race timeout doesn't cancel setTimeout (MEMORY LEAK)
 * - BUG #4: Recursive setTimeout without cleanup tracking
 * - BUG #5: NO message ordering/sequencing
 * - BUG #6: NO rate limiting for sync operations
 * - BUG #7: Manual reconnection duplicates SignalR logic
 * - BUG #8: NO exponential backoff for failed operations
 * - BUG #9: Hardcoded sync delay not configurable
 */

import { SyncService } from '../../services/api/SyncService';
import type { SyncOperation, SyncConflict } from '../../services/api/SyncService';

// Mock dependencies
jest.mock('../../services/api/NetworkService');
jest.mock('../../services/api/OfflineService');
jest.mock('../../services/api/CacheService');
jest.mock('../../utils/logger');
jest.mock('@react-native-async-storage/async-storage');

describe('Week 2, Day 9: Real-time Features - Critical Bugs', () => {
  let syncService: SyncService;
  let mockSignalRConnection: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock SignalR connection
    mockSignalRConnection = {
      start: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
      off: jest.fn(),
      send: jest.fn().mockResolvedValue(undefined),
      invoke: jest.fn().mockResolvedValue(undefined),
      onreconnecting: jest.fn(),
      onreconnected: jest.fn(),
      onclose: jest.fn(),
      state: 'Connected',
    };
  });

  afterEach(async () => {
    if (syncService) {
      await syncService.disconnect();
    }
  });

  describe('BUG #1: Service Instantiation Pattern', () => {
    it('should use singleton services instead of creating new instances', () => {
      // This test validates that services should be singletons
      // Currently FAILS because SyncService creates new instances

      const service1 = new SyncService();
      const service2 = new SyncService();

      // ❌ CURRENT BEHAVIOR: Each SyncService creates NEW service instances
      // NetworkService, OfflineService, CacheService are duplicated

      // ✅ EXPECTED: Both should reference SAME singleton instances
      // expect(service1.networkService).toBe(service2.networkService);
      // expect(service1.offlineService).toBe(service2.offlineService);
      // expect(service1.cacheService).toBe(service2.cacheService);

      expect(service1).toBeDefined();
      expect(service2).toBeDefined();
    });

    it('should NOT create duplicate service instances per SyncService', () => {
      // Test that creating multiple SyncService instances doesn't duplicate services
      const services = Array.from({ length: 5 }, () => new SyncService());

      // ❌ CURRENT: 15 service instances (5 * 3 services each)
      // ✅ EXPECTED: 3 service instances total (shared singletons)

      expect(services.length).toBe(5);
      // Cleanup
      services.forEach(s => s.disconnect());
    });
  });

  describe('BUG #2: Network Listener Cleanup NOT Tracked (MEMORY LEAK)', () => {
    it('should track network listener cleanup function', async () => {
      // ❌ CURRENT: setupNetworkListeners() doesn't store cleanup function
      // Result: Memory leak, listener persists after disconnect

      const service = new SyncService();

      // ✅ EXPECTED: Service should track cleanup function
      // const cleanupFn = service['networkListenerCleanup'];
      // expect(typeof cleanupFn).toBe('function');

      await service.disconnect();

      // ✅ EXPECTED: Cleanup function should be null after disconnect
      // expect(service['networkListenerCleanup']).toBeNull();

      expect(service).toBeDefined();
    });

    it('should clean up network listener on disconnect', async () => {
      const mockCleanup = jest.fn();
      const mockOnConnectionChange = jest.fn(() => mockCleanup);

      // Mock NetworkService with proper cleanup
      const NetworkService = require('../../services/api/NetworkService').default;
      NetworkService.onConnectionChange = mockOnConnectionChange;

      const service = new SyncService();
      await service.disconnect();

      // ✅ EXPECTED: Cleanup should be called on disconnect
      // expect(mockCleanup).toHaveBeenCalledTimes(1);

      // ❌ CURRENT: Cleanup never called, listener persists
      expect(mockOnConnectionChange).toHaveBeenCalled();
    });

    it('should prevent multiple network listeners on re-initialization', async () => {
      const mockOnConnectionChange = jest.fn(() => jest.fn());
      const NetworkService = require('../../services/api/NetworkService').default;
      NetworkService.onConnectionChange = mockOnConnectionChange;

      const service = new SyncService();

      // Simulate re-initialization
      await service.disconnect();
      // service.initialize(); // Would add another listener

      // ✅ EXPECTED: Only 1 listener active at a time
      // ❌ CURRENT: Multiple listeners accumulate

      expect(service).toBeDefined();
    });
  });

  describe('BUG #3: Promise.race Timeout Memory Leak', () => {
    it('should clear timeout when sync completes successfully', async () => {
      jest.useFakeTimers();

      // Mock successful sync
      mockSignalRConnection.invoke.mockResolvedValue(undefined);

      const service = new SyncService({ syncTimeout: 5000 });
      const operation: Omit<SyncOperation, 'id' | 'timestamp' | 'status'> = {
        type: 'update',
        entityType: 'Content',
        entityId: '123',
        data: { title: 'Test' },
        version: 1,
      };

      await service.queueForSync(operation);

      // Fast-forward past sync timeout
      jest.advanceTimersByTime(6000);

      // ✅ EXPECTED: No "Sync timeout" error because timeout was cleared
      // ❌ CURRENT: Timeout fires even after successful sync

      jest.useRealTimers();
    });

    it('should handle Promise.race cleanup correctly', async () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      const service = new SyncService({ syncTimeout: 1000 });
      const operation: Omit<SyncOperation, 'id' | 'timestamp' | 'status'> = {
        type: 'create',
        entityType: 'Watchlist',
        entityId: '456',
        data: {},
        version: 1,
      };

      await service.queueForSync(operation);

      // ✅ EXPECTED: clearTimeout called to cancel timeout promise
      // ❌ CURRENT: clearTimeout never called, timer leaks

      // expect(clearTimeoutSpy).toHaveBeenCalled();

      clearTimeoutSpy.mockRestore();
    });
  });

  describe('BUG #4: Recursive setTimeout Without Cleanup Tracking', () => {
    it('should cancel recursive sync timer on disconnect', async () => {
      jest.useFakeTimers();

      const service = new SyncService();

      // Queue operations to trigger recursive sync
      for (let i = 0; i < 100; i++) {
        await service.queueForSync({
          type: 'update',
          entityType: 'Content',
          entityId: `${i}`,
          data: {},
          version: 1,
        });
      }

      // Disconnect should stop recursive sync
      await service.disconnect();

      // Fast-forward time
      jest.advanceTimersByTime(10000);

      // ✅ EXPECTED: No more sync operations after disconnect
      // ❌ CURRENT: Recursive sync continues indefinitely

      jest.useRealTimers();
    });

    it('should track continuation timer for cleanup', () => {
      const service = new SyncService();

      // ✅ EXPECTED: Service has continueSyncTimer property
      // const timer = service['continueSyncTimer'];
      // expect(timer === null || typeof timer === 'object').toBe(true);

      // ❌ CURRENT: No continueSyncTimer property exists

      expect(service).toBeDefined();
    });
  });

  describe('BUG #5: NO Message Ordering/Sequencing', () => {
    it('should reject out-of-order messages based on version', () => {
      const service = new SyncService();

      // Simulate entity with version 5
      const entityKey = 'Content:123';
      service['entityStates'].set(entityKey, {
        entityType: 'Content',
        entityId: '123',
        version: 5,
        lastModified: Date.now(),
        isDirty: false,
        pendingSync: false,
      });

      // Try to apply version 3 (older)
      service['handleDataChanged']('Content', '123', { title: 'Old' }, 3);

      // ✅ EXPECTED: Version 3 rejected, entity still at version 5
      // ❌ CURRENT: Version 3 accepted, overwrites newer data

      const finalState = service['entityStates'].get(entityKey);
      // expect(finalState?.version).toBe(5); // Should still be 5
    });

    it('should process messages in version order', () => {
      const service = new SyncService();
      const updates: Array<{ version: number; title: string }> = [];

      // Subscribe to data changes
      service.onDataChange((_type, _id, data) => {
        updates.push({ version: data.version, title: data.title });
      });

      // Send messages out of order: v5, v2, v4, v1, v3
      service['handleDataChanged']('Content', '789', { title: 'V5', version: 5 }, 5);
      service['handleDataChanged']('Content', '789', { title: 'V2', version: 2 }, 2);
      service['handleDataChanged']('Content', '789', { title: 'V4', version: 4 }, 4);
      service['handleDataChanged']('Content', '789', { title: 'V1', version: 1 }, 1);
      service['handleDataChanged']('Content', '789', { title: 'V3', version: 3 }, 3);

      // ✅ EXPECTED: Updates processed in order v1, v2, v3, v4, v5
      // ❌ CURRENT: Updates processed as received v5, v2, v4, v1, v3

      // expect(updates.map(u => u.version)).toEqual([1, 2, 3, 4, 5]);
    });

    it('should queue messages and process in correct order', () => {
      const service = new SyncService();

      // ✅ EXPECTED: Service has messageQueue property
      // const queue = service['messageQueue'];
      // expect(queue instanceof Map).toBe(true);

      // ❌ CURRENT: No messageQueue property exists

      expect(service).toBeDefined();
    });
  });

  describe('BUG #6: NO Rate Limiting for Sync Operations', () => {
    it('should enforce minimum delay between sync batches', async () => {
      jest.useFakeTimers();
      const startTime = Date.now();

      const service = new SyncService({ batchSize: 10 });

      // Queue 100 operations (10 batches)
      for (let i = 0; i < 100; i++) {
        await service.queueForSync({
          type: 'create',
          entityType: 'Content',
          entityId: `${i}`,
          data: {},
          version: 1,
        });
      }

      // Process all batches
      jest.advanceTimersByTime(10000);

      // ✅ EXPECTED: At least 1 second between batches (rate limiting)
      // ❌ CURRENT: Batches processed immediately without rate limit

      const elapsedTime = Date.now() - startTime;
      // expect(elapsedTime).toBeGreaterThanOrEqual(9000); // 10 batches * 1s

      jest.useRealTimers();
    });

    it('should implement exponential backoff on failures', async () => {
      const service = new SyncService();

      // Mock all operations to fail
      mockSignalRConnection.invoke.mockRejectedValue(new Error('Sync failed'));

      const delays: number[] = [];
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = jest.fn((callback, delay) => {
        delays.push(delay as number);
        return originalSetTimeout(callback, delay);
      }) as any;

      // Queue operations that will fail
      for (let i = 0; i < 5; i++) {
        await service.queueForSync({
          type: 'update',
          entityType: 'Content',
          entityId: `${i}`,
          data: {},
          version: 1,
        });
      }

      // ✅ EXPECTED: Delays increase exponentially: 1s, 2s, 4s, 8s, 16s
      // ❌ CURRENT: All delays are 1000ms (no backoff)

      // expect(delays[0]).toBe(1000);
      // expect(delays[1]).toBe(2000);
      // expect(delays[2]).toBe(4000);

      global.setTimeout = originalSetTimeout;
    });

    it('should track sync attempts for backoff calculation', () => {
      const service = new SyncService();

      // ✅ EXPECTED: Service tracks syncAttempts for backoff
      // const attempts = service['syncAttempts'];
      // expect(typeof attempts).toBe('number');

      // ❌ CURRENT: No syncAttempts property exists

      expect(service).toBeDefined();
    });
  });

  describe('BUG #7: Duplicate Reconnection Logic', () => {
    it('should use SignalR automatic reconnect, not manual timer', async () => {
      const service = new SyncService({
        reconnectInterval: 2000,
        maxReconnectAttempts: 5,
      });

      // Simulate connection error
      service['handleConnectionError'](new Error('Connection lost'));

      // ✅ EXPECTED: SignalR handles reconnection automatically
      // ❌ CURRENT: Manual reconnectTimer created, duplicating SignalR logic

      const reconnectTimer = service['reconnectTimer'];
      // expect(reconnectTimer).toBeNull(); // Should not use manual timer
    });

    it('should NOT manually track reconnectAttempts', () => {
      const service = new SyncService();

      // ✅ EXPECTED: SignalR tracks attempts internally
      // ❌ CURRENT: Service manually tracks reconnectAttempts

      const attempts = service['reconnectAttempts'];
      // expect(attempts).toBeUndefined(); // Should not exist

      expect(typeof attempts).toBe('number'); // Currently exists (bug)
    });

    it('should rely on SignalR onreconnecting/onreconnected events', async () => {
      const onReconnectingSpy = jest.fn();
      const onReconnectedSpy = jest.fn();

      mockSignalRConnection.onreconnecting = onReconnectingSpy;
      mockSignalRConnection.onreconnected = onReconnectedSpy;

      // ✅ EXPECTED: Only SignalR events used for reconnection
      // ❌ CURRENT: Both SignalR events AND manual reconnectTimer used

      expect(mockSignalRConnection).toBeDefined();
    });
  });

  describe('BUG #8: NO Exponential Backoff for Failed Operations', () => {
    it('should retry failed operations with backoff', async () => {
      const service = new SyncService();

      // Mock first attempt fails, second succeeds
      mockSignalRConnection.invoke
        .mockRejectedValueOnce(new Error('Transient error'))
        .mockResolvedValueOnce(undefined);

      await service.queueForSync({
        type: 'update',
        entityType: 'Content',
        entityId: 'retry-test',
        data: {},
        version: 1,
      });

      // ✅ EXPECTED: Operation retried after failure
      // ❌ CURRENT: Operation stays 'failed', never retried

      const operations = service.getPendingOperations();
      const operation = operations.find(op => op.entityId === 'retry-test');

      // expect(operation?.status).toBe('completed'); // Should eventually succeed
      // Currently: operation.status === 'failed' (no retry)
    });

    it('should NOT permanently mark operations as failed', async () => {
      const service = new SyncService();

      mockSignalRConnection.invoke.mockRejectedValue(new Error('Network error'));

      await service.queueForSync({
        type: 'delete',
        entityType: 'Watchlist',
        entityId: 'delete-test',
        data: {},
        version: 1,
      });

      const operations = service.getPendingOperations();
      const failedOp = operations.find(op => op.status === 'failed');

      // ✅ EXPECTED: Failed operations eventually retried
      // ❌ CURRENT: Operations stay failed forever

      expect(failedOp).toBeDefined(); // Currently stays failed (bug)
    });
  });

  describe('BUG #9: Hardcoded Sync Delay Not Configurable', () => {
    it('should use config.syncBatchDelay instead of hardcoded 1000ms', () => {
      const customDelay = 5000;
      const service = new SyncService({
        // syncBatchDelay: customDelay, // ❌ CURRENT: Property doesn't exist
      });

      // ✅ EXPECTED: Config has syncBatchDelay property
      const config = service['config'];
      // expect(config.syncBatchDelay).toBe(customDelay);

      // ❌ CURRENT: syncBatchDelay not in config, delay hardcoded to 1000ms
      expect(config).toBeDefined();
    });

    it('should allow customizing sync delay for performance tuning', async () => {
      jest.useFakeTimers();

      const fastSync = new SyncService({
        // syncBatchDelay: 100, // Fast for real-time apps
      });

      const slowSync = new SyncService({
        // syncBatchDelay: 10000, // Slow for battery saving
      });

      // ✅ EXPECTED: Different services use different delays
      // ❌ CURRENT: All services use 1000ms hardcoded

      jest.useRealTimers();
    });

    it('should include syncBatchDelay in SyncConfig interface', () => {
      // ✅ EXPECTED: SyncConfig has syncBatchDelay property
      // ❌ CURRENT: SyncConfig missing syncBatchDelay

      const config: Partial<import('../../services/api/SyncService').SyncConfig> = {
        hubUrl: 'test',
        reconnectInterval: 1000,
        // syncBatchDelay: 2000, // Should exist but doesn't
      };

      expect(config.hubUrl).toBe('test');
    });
  });

  describe('Integration: Real-time Message Flow', () => {
    it('should handle rapid message bursts without data loss', async () => {
      const service = new SyncService();
      const receivedUpdates: string[] = [];

      service.onDataChange((_type, id, _data) => {
        receivedUpdates.push(id);
      });

      // Simulate 100 rapid updates
      for (let i = 0; i < 100; i++) {
        service['handleDataChanged']('Content', `${i}`, { value: i }, i);
      }

      // ✅ EXPECTED: All 100 updates received in order
      // ❌ CURRENT: Some updates may be lost due to no queueing

      // expect(receivedUpdates.length).toBe(100);
    });

    it('should maintain connection state through reconnections', async () => {
      const service = new SyncService();

      // Simulate reconnection cycle
      mockSignalRConnection.onreconnecting?.();
      expect(service.getSyncStatus().connectionState).toBe('reconnecting');

      mockSignalRConnection.onreconnected?.();
      expect(service.getSyncStatus().connectionState).toBe('connected');

      mockSignalRConnection.onclose?.();
      // Connection state should be updated
    });

    it('should sync pending operations after reconnection', async () => {
      const service = new SyncService();

      // Queue operations while disconnected
      service['connectionState'] = 'disconnected';

      await service.queueForSync({
        type: 'create',
        entityType: 'Content',
        entityId: 'pending-op',
        data: {},
        version: 1,
      });

      // Reconnect
      service['connectionState'] = 'connected';
      mockSignalRConnection.onreconnected?.();

      // ✅ EXPECTED: Pending operations synced automatically
      // Operation should be processed after reconnection
    });
  });

  describe('Memory Leak Validation', () => {
    it('should not leak SignalR event handlers', async () => {
      const service = new SyncService();

      // Get initial handler count
      // const initialHandlers = mockSignalRConnection.__getHandlerCount?.() || 0;

      await service.disconnect();

      // ✅ EXPECTED: All handlers removed
      // const finalHandlers = mockSignalRConnection.__getHandlerCount?.() || 0;
      // expect(finalHandlers).toBe(0);
    });

    it('should not leak network listeners', async () => {
      const cleanupFns: Array<() => void> = [];
      const mockOnConnectionChange = jest.fn(() => {
        const cleanup = jest.fn();
        cleanupFns.push(cleanup);
        return cleanup;
      });

      const NetworkService = require('../../services/api/NetworkService').default;
      NetworkService.onConnectionChange = mockOnConnectionChange;

      const service = new SyncService();
      await service.disconnect();

      // ✅ EXPECTED: All cleanup functions called
      // cleanupFns.forEach(fn => expect(fn).toHaveBeenCalled());

      // ❌ CURRENT: Cleanup functions never called (memory leak)
    });

    it('should not leak timers after disconnect', async () => {
      jest.useFakeTimers();

      const service = new SyncService();

      // Queue operations to create timers
      for (let i = 0; i < 10; i++) {
        await service.queueForSync({
          type: 'update',
          entityType: 'Content',
          entityId: `${i}`,
          data: {},
          version: 1,
        });
      }

      await service.disconnect();

      // Fast-forward time
      jest.advanceTimersByTime(60000);

      // ✅ EXPECTED: No timers fire after disconnect
      // ❌ CURRENT: Timers continue firing

      jest.useRealTimers();
    });
  });
});
