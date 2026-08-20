/**
 * Infrastructure Smoke Tests
 *
 * These tests validate that the test infrastructure (NetworkSimulator,
 * MemoryLeakDetector, SignalR mock, and service mocks) is working correctly
 * before proceeding with comprehensive test suites.
 */

import { NetworkSimulator } from './utils/networkSimulator';
import { MemoryLeakDetector } from './utils/memoryLeakDetector';
import { HubConnectionBuilder } from './__mocks__/@microsoft__signalr';
import {
  createMockOfflineService,
  createMockSyncService,
  createMockNetworkService,
} from './mocks/services.mock';
import { createMockQueryClient, resetAllMocks } from './mocks/hooks.mock';

describe('Infrastructure Smoke Tests', () => {
  afterEach(() => {
    NetworkSimulator.reset();
    resetAllMocks();
  });

  describe('NetworkSimulator', () => {
    it('should start in online state', () => {
      const state = NetworkSimulator.getCurrentState();

      expect(state.isConnected).toBe(true);
      expect(state.isInternetReachable).toBe(true);
      expect(state.type).toBe('wifi');
    });

    it('should simulate going offline', () => {
      NetworkSimulator.goOffline();
      const state = NetworkSimulator.getCurrentState();

      expect(state.isConnected).toBe(false);
      expect(state.isInternetReachable).toBe(false);
      expect(state.type).toBe('none');
    });

    it('should notify subscribers of state changes', () => {
      const callback = jest.fn();
      const unsubscribe = NetworkSimulator.subscribe(callback);

      // Should be called immediately with current state
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          isConnected: true,
        })
      );

      // Should notify on state change
      NetworkSimulator.goOffline();
      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenLastCalledWith(
        expect.objectContaining({
          isConnected: false,
        })
      );

      unsubscribe();

      // Should not notify after unsubscribe
      NetworkSimulator.goOnline();
      expect(callback).toHaveBeenCalledTimes(2);
    });
  });

  describe('MemoryLeakDetector', () => {
    it('should detect no leaks when listeners are properly cleaned up', () => {
      const detector = new MemoryLeakDetector();
      const mockObject = { listeners: [] };

      detector.recordBaseline(mockObject, 'listeners');

      // Simulate 10 mount/unmount cycles with proper cleanup
      for (let i = 0; i < 10; i++) {
        mockObject.listeners.push(() => {});
        mockObject.listeners.pop();
      }

      expect(() => {
        detector.assertNoLeaks(mockObject, ['listeners']);
      }).not.toThrow();
    });

    it('should detect leaks when listeners accumulate', () => {
      const detector = new MemoryLeakDetector();
      const mockObject = { listeners: [] };

      detector.recordBaseline(mockObject, 'listeners');

      // Simulate leak: add listeners without cleanup
      for (let i = 0; i < 10; i++) {
        mockObject.listeners.push(() => {});
      }

      expect(() => {
        detector.assertNoLeaks(mockObject, ['listeners'], 1);
      }).toThrow(/Memory leaks detected/);
    });

    it('should handle Set and Map types', () => {
      const detector = new MemoryLeakDetector();
      const mockObject = {
        setListeners: new Set<() => void>(),
        mapListeners: new Map<string, () => void>(),
      };

      detector.recordBaseline(mockObject, 'setListeners');
      detector.recordBaseline(mockObject, 'mapListeners');

      // Add listeners
      mockObject.setListeners.add(() => {});
      mockObject.mapListeners.set('key1', () => {});

      // Should detect leaks
      expect(() => {
        detector.assertNoLeaks(mockObject, ['setListeners', 'mapListeners'], 0);
      }).toThrow();

      // Clean up
      mockObject.setListeners.clear();
      mockObject.mapListeners.clear();

      // Should pass now
      expect(() => {
        detector.assertNoLeaks(mockObject, ['setListeners', 'mapListeners'], 0);
      }).not.toThrow();
    });
  });

  describe('SignalR Mock', () => {
    it('should create a hub connection', () => {
      const connection = new HubConnectionBuilder()
        .withUrl('https://test-api.com/hub')
        .withAutomaticReconnect()
        .configureLogging(2)
        .build();

      expect(connection).toBeDefined();
      expect(connection.start).toBeDefined();
      expect(connection.on).toBeDefined();
      expect(connection.off).toBeDefined();
    });

    it('should handle start and stop', async () => {
      const connection = new HubConnectionBuilder()
        .withUrl('https://test-api.com/hub')
        .build();

      await connection.start();
      expect(connection.state).toBe('Connected');

      await connection.stop();
      expect(connection.state).toBe('Disconnected');
    });

    it('should register and trigger event handlers', () => {
      const connection = new HubConnectionBuilder().withUrl('test').build();
      const handler = jest.fn();

      connection.on('testEvent', handler);

      // Trigger event using test utility
      (connection as any).__trigger('testEvent', 'arg1', 'arg2');

      expect(handler).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should track handler cleanup', () => {
      const connection = new HubConnectionBuilder().withUrl('test').build();

      connection.on('event1', jest.fn());
      connection.on('event2', jest.fn());

      expect((connection as any).__getHandlerCount()).toBe(2);

      connection.off('event1');
      expect((connection as any).__getHandlerCount()).toBe(1);

      (connection as any).__clearHandlers();
      expect((connection as any).__getHandlerCount()).toBe(0);
    });
  });

  describe('Service Mocks', () => {
    it('should create OfflineService mock', async () => {
      const service = createMockOfflineService();

      await service.queueRequest({ endpoint: '/api/test' });

      const stats = await service.getStats();
      expect(stats.queuedCount).toBe(1);

      await service.clearQueue();

      const statsAfterClear = await service.getStats();
      expect(statsAfterClear.queuedCount).toBe(0);
    });

    it('should create SyncService mock', async () => {
      const service = createMockSyncService();

      const result = await service.sync({ data: 'test' });
      expect(result.synced).toBe(1);

      const status = service.getSyncStatus();
      expect(status).toBeDefined();
      expect(status.isConnected).toBe(true);
    });

    it('should create NetworkService mock', () => {
      const service = createMockNetworkService();

      const status = service.getCurrentStatus();
      expect(status.isConnected).toBe(true);
      expect(status.type).toBe('wifi');

      // Test status change
      service.__setStatus({ isConnected: false, type: 'none' });
      const newStatus = service.getCurrentStatus();
      expect(newStatus.isConnected).toBe(false);
    });

    it('should track NetworkService listeners', () => {
      const service = createMockNetworkService();
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      const unsub1 = service.onConnectionChange(callback1);
      const unsub2 = service.onConnectionChange(callback2);

      expect(service.__getListenerCount()).toBe(2);

      unsub1();
      expect(service.__getListenerCount()).toBe(1);

      unsub2();
      expect(service.__getListenerCount()).toBe(0);
    });
  });

  describe('React Query Mock', () => {
    it('should create a query client with test defaults', () => {
      const queryClient = createMockQueryClient();

      expect(queryClient).toBeDefined();
      const defaultOptions = queryClient.getDefaultOptions();

      expect(defaultOptions.queries?.retry).toBe(false);
      expect(defaultOptions.mutations?.retry).toBe(false);
    });

    it('should allow custom options', () => {
      const queryClient = createMockQueryClient({
        queries: { retry: 3 },
      });

      const defaultOptions = queryClient.getDefaultOptions();
      expect(defaultOptions.queries?.retry).toBe(3);
    });
  });
});
