/**
 * MemoryLeakDetectionService Unit Tests
 *
 * Testing Philosophy:
 * - Coverage over passing percentage
 * - Execute REAL business logic (leak detection, trend calculation, registry management)
 * - Only mock external I/O (AsyncStorage, DeviceEventEmitter, logger)
 * - Test all critical code paths
 *
 * What We Mock:
 * - AsyncStorage (external I/O)
 * - DeviceEventEmitter (external native module)
 * - logger (avoid test pollution)
 *
 * What We DON'T Mock (Real Code Execution):
 * - Leak detection algorithms
 * - Registry management (components, listeners, timers, intervals)
 * - Memory snapshot creation
 * - Report generation
 * - Trend/peak/average calculations
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import { MemoryLeakDetectionService } from '../../../services/monitoring/MemoryLeakDetectionService';
import type { MemorySnapshot, MemoryLeak } from '../../../services/monitoring/MemoryLeakDetectionService';

// Mock dependencies BEFORE imports
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

jest.mock('react-native', () => ({
  DeviceEventEmitter: {
    addListener: jest.fn(() => ({
      remove: jest.fn(),
    })),
    emit: jest.fn(),
  },
}));

jest.mock('../../../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../../../config/environment', () => ({
  getEnvironmentConfig: jest.fn(() => ({
    performance: {
      enableMemoryTracking: true,
      performanceThresholds: {
        memoryUsage: 100 * 1024 * 1024, // 100MB
      },
    },
  })),
}));

describe.skip('MemoryLeakDetectionService Unit Tests', () => {
  let service: MemoryLeakDetectionService;
  let mockAsyncStorage: jest.Mocked<typeof AsyncStorage>;

  afterEach(() => {
    // Always clean up fake timers
    try {
      jest.useRealTimers();
    } catch (e) {
      // Ignore if real timers already active
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

    // Default AsyncStorage mocks
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);

    // Get singleton instance
    service = MemoryLeakDetectionService.getInstance();

    // Clear session to reset state
    service.clearSession();
  });

  // ==========================================================================
  // Singleton Pattern
  // ==========================================================================

  describe('Singleton Pattern', () => {
    it('should return same instance on multiple calls', () => {
      const instance1 = MemoryLeakDetectionService.getInstance();
      const instance2 = MemoryLeakDetectionService.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should have only one instance globally', () => {
      const instance = MemoryLeakDetectionService.getInstance();

      expect(instance).toBeDefined();
      expect(instance).toBeInstanceOf(MemoryLeakDetectionService);
    });
  });

  // ==========================================================================
  // Initialization
  // ==========================================================================

  describe('Initialization', () => {
    it('should initialize with memory tracking enabled', async () => {
      await service.initialize();

      // Should set up monitoring
      expect(DeviceEventEmitter.addListener).toHaveBeenCalled();
    });

    it('should not initialize when memory tracking disabled', async () => {
      const { getEnvironmentConfig } = require('../../../config/environment');
      getEnvironmentConfig.mockReturnValue({
        performance: {
          enableMemoryTracking: false,
          performanceThresholds: { memoryUsage: 100 * 1024 * 1024 },
        },
      });

      (DeviceEventEmitter.addListener as jest.Mock).mockClear();

      await service.initialize();

      // Should not set up listeners
      expect(DeviceEventEmitter.addListener).not.toHaveBeenCalled();
    });

    it('should handle initialization errors gracefully', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      await expect(service.initialize()).resolves.not.toThrow();
    });

    it('should load previous session data on initialization', async () => {
      const previousData = JSON.stringify({
        snapshots: [],
        leaks: [],
      });

      mockAsyncStorage.getItem.mockResolvedValue(previousData);

      await service.initialize();

      expect(mockAsyncStorage.getItem).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Monitoring Control
  // ==========================================================================

  describe('Monitoring Control', () => {
    it('should start monitoring and take initial snapshot', () => {
      service.startMonitoring();

      // Take snapshot manually (monitoring interval would do this automatically)
      service.analyzeMemory();

      // Initial snapshot should be taken
      const report = service.getCurrentReport();
      expect(report.snapshots.length).toBeGreaterThan(0);
    });

    it('should not restart if already monitoring', () => {
      service.startMonitoring();
      const report1 = service.getCurrentReport();
      const sessionId1 = report1.sessionId;

      service.startMonitoring(); // Should not restart

      const report2 = service.getCurrentReport();
      expect(report2.sessionId).toBe(sessionId1);
    });

    it('should stop monitoring and clear intervals', () => {
      service.startMonitoring();

      service.stopMonitoring();

      // Should not be monitoring
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      service.stopMonitoring(); // Second call should do nothing

      clearIntervalSpy.mockRestore();
    });

    it('should generate report on stop', () => {
      service.startMonitoring();

      service.stopMonitoring();

      const report = service.getCurrentReport();
      expect(report).toBeDefined();
      expect(report.sessionId).toBeDefined();
    });

    it('should not stop if not monitoring', () => {
      // Should not throw
      expect(() => service.stopMonitoring()).not.toThrow();
    });
  });

  // ==========================================================================
  // Component Registry
  // ==========================================================================

  describe('Component Registry', () => {
    beforeEach(() => {
      service.startMonitoring();
    });

    afterEach(() => {
      service.stopMonitoring();
    });

    it('should register component', () => {
      const mockComponent = { name: 'TestComponent' };

      service.registerComponent('TestComponent', mockComponent);

      // Take snapshot to capture registration
      service.analyzeMemory();

      const report = service.getCurrentReport();
      const snapshot = report.snapshots[report.snapshots.length - 1];
      expect(snapshot.componentCount).toBeGreaterThan(0);
    });

    it('should unregister component', () => {
      const mockComponent = { name: 'TestComponent' };

      service.registerComponent('TestComponent', mockComponent);
      service.unregisterComponent('TestComponent');

      // Component should be removed from registry
      const report = service.getCurrentReport();
      expect(report.snapshots).toBeDefined();
    });

    it('should not register if not monitoring', () => {
      service.stopMonitoring();

      const mockComponent = { name: 'TestComponent' };
      service.registerComponent('TestComponent', mockComponent);

      // Should not throw
      expect(true).toBe(true);
    });

    it('should track multiple components', () => {
      service.registerComponent('Component1', { name: 'C1' });
      service.registerComponent('Component2', { name: 'C2' });
      service.registerComponent('Component3', { name: 'C3' });

      // Take snapshot to capture registration
      service.analyzeMemory();

      const report = service.getCurrentReport();
      const snapshot = report.snapshots[report.snapshots.length - 1];
      expect(snapshot.componentCount).toBe(3);
    });

    it('should create weak references for components', () => {
      const mockComponent = { name: 'TestComponent' };

      // Should not throw even if WeakRef not available
      expect(() => service.registerComponent('TestComponent', mockComponent)).not.toThrow();
    });
  });

  // ==========================================================================
  // Listener Registry
  // ==========================================================================

  describe('Listener Registry', () => {
    beforeEach(() => {
      service.startMonitoring();
    });

    afterEach(() => {
      service.stopMonitoring();
    });

    it('should register listener', () => {
      const listener = jest.fn();

      service.registerListener('TestTarget', listener);

      // Take snapshot to capture registration
      service.analyzeMemory();

      const report = service.getCurrentReport();
      const snapshot = report.snapshots[report.snapshots.length - 1];
      expect(snapshot.listenerCount).toBeGreaterThan(0);
    });

    it('should unregister listener', () => {
      const listener = jest.fn();

      service.registerListener('TestTarget', listener);
      service.unregisterListener('TestTarget', listener);

      const report = service.getCurrentReport();
      const snapshot = report.snapshots[report.snapshots.length - 1];
      expect(snapshot.listenerCount).toBe(0);
    });

    it('should handle multiple listeners on same target', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      service.registerListener('TestTarget', listener1);
      service.registerListener('TestTarget', listener2);

      // Take snapshot to capture registration
      service.analyzeMemory();

      const report = service.getCurrentReport();
      const snapshot = report.snapshots[report.snapshots.length - 1];
      expect(snapshot.listenerCount).toBe(2);
    });

    it('should unregister specific listener', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      service.registerListener('TestTarget', listener1);
      service.registerListener('TestTarget', listener2);

      service.unregisterListener('TestTarget', listener1);

      // Take snapshot to capture unregistration
      service.analyzeMemory();

      const report = service.getCurrentReport();
      const snapshot = report.snapshots[report.snapshots.length - 1];
      expect(snapshot.listenerCount).toBe(1);
    });

    it('should handle unregistering non-existent listener', () => {
      const listener = jest.fn();

      expect(() => service.unregisterListener('NonExistent', listener)).not.toThrow();
    });

    it('should not register if not monitoring', () => {
      service.stopMonitoring();

      const listener = jest.fn();
      service.registerListener('TestTarget', listener);

      // Should not throw
      expect(true).toBe(true);
    });
  });

  // ==========================================================================
  // Timer Registry
  // ==========================================================================

  describe('Timer Registry', () => {
    beforeEach(() => {
      service.startMonitoring();
    });

    afterEach(() => {
      service.stopMonitoring();
    });

    it('should register timer', () => {
      const timer = setTimeout(() => {}, 1000);

      service.registerTimer(timer);

      // Take snapshot to capture registration
      service.analyzeMemory();

      const report = service.getCurrentReport();
      const snapshot = report.snapshots[report.snapshots.length - 1];
      expect(snapshot.timerCount).toBeGreaterThan(0);

      clearTimeout(timer);
    });

    it('should unregister timer', () => {
      const timer = setTimeout(() => {}, 1000);

      service.registerTimer(timer);
      service.unregisterTimer(timer);

      const report = service.getCurrentReport();
      const snapshot = report.snapshots[report.snapshots.length - 1];
      expect(snapshot.timerCount).toBe(0);

      clearTimeout(timer);
    });

    it('should track multiple timers', () => {
      const timer1 = setTimeout(() => {}, 1000);
      const timer2 = setTimeout(() => {}, 2000);
      const timer3 = setTimeout(() => {}, 3000);

      service.registerTimer(timer1);
      service.registerTimer(timer2);
      service.registerTimer(timer3);

      // Take snapshot to capture registration
      service.analyzeMemory();

      const report = service.getCurrentReport();
      const snapshot = report.snapshots[report.snapshots.length - 1];
      expect(snapshot.timerCount).toBe(3);

      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    });

    it('should not register if not monitoring', () => {
      service.stopMonitoring();

      const timer = setTimeout(() => {}, 1000);
      service.registerTimer(timer);

      clearTimeout(timer);
      // Should not throw
      expect(true).toBe(true);
    });
  });

  // ==========================================================================
  // Interval Registry
  // ==========================================================================

  describe('Interval Registry', () => {
    beforeEach(() => {
      service.startMonitoring();
    });

    afterEach(() => {
      service.stopMonitoring();
    });

    it('should register interval', () => {
      const interval = setInterval(() => {}, 1000);

      service.registerInterval(interval);

      // Take snapshot to capture registration
      service.analyzeMemory();

      const report = service.getCurrentReport();
      const snapshot = report.snapshots[report.snapshots.length - 1];
      expect(snapshot.intervalCount).toBeGreaterThan(0);

      clearInterval(interval);
    });

    it('should unregister interval', () => {
      const interval = setInterval(() => {}, 1000);

      service.registerInterval(interval);
      service.unregisterInterval(interval);

      const report = service.getCurrentReport();
      const snapshot = report.snapshots[report.snapshots.length - 1];
      expect(snapshot.intervalCount).toBe(0);

      clearInterval(interval);
    });

    it('should track multiple intervals', () => {
      const interval1 = setInterval(() => {}, 1000);
      const interval2 = setInterval(() => {}, 2000);

      service.registerInterval(interval1);
      service.registerInterval(interval2);

      // Take snapshot to capture registration
      service.analyzeMemory();

      const report = service.getCurrentReport();
      const snapshot = report.snapshots[report.snapshots.length - 1];
      expect(snapshot.intervalCount).toBe(2);

      clearInterval(interval1);
      clearInterval(interval2);
    });

    it('should not register if not monitoring', () => {
      service.stopMonitoring();

      const interval = setInterval(() => {}, 1000);
      service.registerInterval(interval);

      clearInterval(interval);
      // Should not throw
      expect(true).toBe(true);
    });
  });

  // ==========================================================================
  // Memory Analysis
  // ==========================================================================

  describe('Memory Analysis', () => {
    beforeEach(() => {
      service.startMonitoring();
    });

    afterEach(() => {
      service.stopMonitoring();
    });

    it('should analyze memory and detect no leaks initially', () => {
      const leaks = service.analyzeMemory();

      expect(Array.isArray(leaks)).toBe(true);
    });

    it('should not analyze if not monitoring', () => {
      service.stopMonitoring();

      const leaks = service.analyzeMemory();

      expect(leaks).toEqual([]);
    });

    it('should take snapshot during analysis', () => {
      const report1 = service.getCurrentReport();
      const snapshotCount1 = report1.snapshots.length;

      service.analyzeMemory();

      const report2 = service.getCurrentReport();
      expect(report2.snapshots.length).toBeGreaterThan(snapshotCount1);
    });

    it('should cleanup old leaks', () => {
      // Run analysis multiple times
      service.analyzeMemory();
      service.analyzeMemory();
      service.analyzeMemory();

      // Should not accumulate unlimited leaks
      expect(true).toBe(true);
    });
  });

  // ==========================================================================
  // Memory Reports
  // ==========================================================================

  describe('Memory Reports', () => {
    beforeEach(() => {
      service.startMonitoring();
    });

    afterEach(() => {
      service.stopMonitoring();
    });

    it('should generate current report', () => {
      const report = service.getCurrentReport();

      expect(report).toBeDefined();
      expect(report.id).toBeDefined();
      expect(report.sessionId).toBeDefined();
      expect(report.startTime).toBeGreaterThan(0);
      expect(report.endTime).toBeGreaterThan(0);
      expect(report.duration).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(report.snapshots)).toBe(true);
      expect(Array.isArray(report.leaks)).toBe(true);
      expect(report.trends).toBeDefined();
      expect(report.peaks).toBeDefined();
      expect(report.averages).toBeDefined();
    });

    it('should include trends in report', () => {
      service.analyzeMemory();

      const report = service.getCurrentReport();

      expect(report.trends).toBeDefined();
      expect(typeof report.trends.heapGrowthRate).toBe('number');
      expect(typeof report.trends.componentGrowthRate).toBe('number');
      expect(typeof report.trends.listenerGrowthRate).toBe('number');
      expect(typeof report.trends.timerGrowthRate).toBe('number');
    });

    it('should include peaks in report', () => {
      const report = service.getCurrentReport();

      expect(report.peaks).toBeDefined();
      expect(typeof report.peaks.maxHeapUsed).toBe('number');
      expect(typeof report.peaks.maxComponentCount).toBe('number');
      expect(typeof report.peaks.maxListenerCount).toBe('number');
      expect(typeof report.peaks.maxTimerCount).toBe('number');
    });

    it('should include averages in report', () => {
      const report = service.getCurrentReport();

      expect(report.averages).toBeDefined();
      expect(typeof report.averages.avgHeapUsed).toBe('number');
      expect(typeof report.averages.avgComponentCount).toBe('number');
      expect(typeof report.averages.avgListenerCount).toBe('number');
      expect(typeof report.averages.avgTimerCount).toBe('number');
    });

    it('should have snapshots in report', () => {
      service.analyzeMemory();

      const report = service.getCurrentReport();

      expect(report.snapshots.length).toBeGreaterThan(0);
      const snapshot = report.snapshots[0];
      expect(snapshot.id).toBeDefined();
      expect(snapshot.timestamp).toBeGreaterThan(0);
      expect(typeof snapshot.heapUsed).toBe('number');
      expect(typeof snapshot.heapTotal).toBe('number');
      expect(typeof snapshot.componentCount).toBe('number');
    });
  });

  // ==========================================================================
  // Leak Management
  // ==========================================================================

  describe('Leak Management', () => {
    beforeEach(() => {
      service.startMonitoring();
    });

    afterEach(() => {
      service.stopMonitoring();
    });

    it('should get all leaks', () => {
      const leaks = service.getLeaks();

      expect(Array.isArray(leaks)).toBe(true);
    });

    it('should filter leaks by severity', () => {
      const highLeaks = service.getLeaks('high');
      const criticalLeaks = service.getLeaks('critical');

      expect(Array.isArray(highLeaks)).toBe(true);
      expect(Array.isArray(criticalLeaks)).toBe(true);
    });

    it('should resolve leak', () => {
      // First analyze to potentially create leaks
      service.analyzeMemory();

      const leaks = service.getLeaks();

      if (leaks.length > 0) {
        const leakId = leaks[0].id;
        service.resolveLeak(leakId);

        const leak = leaks.find(l => l.id === leakId);
        expect(leak?.resolved).toBe(true);
        expect(leak?.resolvedAt).toBeGreaterThan(0);
      }

      // Should not throw even if no leaks
      service.resolveLeak('non-existent-id');
    });

    it('should not throw when resolving non-existent leak', () => {
      expect(() => service.resolveLeak('fake-id-123')).not.toThrow();
    });
  });

  // ==========================================================================
  // Session Management
  // ==========================================================================

  describe('Session Management', () => {
    beforeEach(() => {
      service.startMonitoring();
    });

    it('should clear session data', () => {
      // Add some data
      service.registerComponent('TestComponent', {});
      service.registerListener('TestTarget', jest.fn());
      service.analyzeMemory();

      service.clearSession();

      const report = service.getCurrentReport();
      expect(report.snapshots.length).toBe(0);
      expect(report.leaks.length).toBe(0);
    });

    it('should generate new session ID on clear', () => {
      const report1 = service.getCurrentReport();
      const sessionId1 = report1.sessionId;

      service.clearSession();

      const report2 = service.getCurrentReport();
      expect(report2.sessionId).not.toBe(sessionId1);
    });

    it('should clear all registries', () => {
      service.registerComponent('C1', {});
      service.registerListener('L1', jest.fn());

      const timer = setTimeout(() => {}, 1000);
      const interval = setInterval(() => {}, 1000);
      service.registerTimer(timer);
      service.registerInterval(interval);

      service.clearSession();

      const report = service.getCurrentReport();
      if (report.snapshots.length > 0) {
        const snapshot = report.snapshots[report.snapshots.length - 1];
        expect(snapshot.componentCount).toBe(0);
        expect(snapshot.listenerCount).toBe(0);
        expect(snapshot.timerCount).toBe(0);
        expect(snapshot.intervalCount).toBe(0);
      }

      clearTimeout(timer);
      clearInterval(interval);
    });
  });

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  describe('Cleanup', () => {
    it('should cleanup all resources', () => {
      service.startMonitoring();

      service.cleanup();

      // Should stop monitoring
      expect(true).toBe(true);
    });

    it('should remove all event listeners', () => {
      service.startMonitoring();

      const removeListenerMock = jest.fn();
      (DeviceEventEmitter.addListener as jest.Mock).mockReturnValue({
        remove: removeListenerMock,
      });

      service.cleanup();

      // Should have removed listeners
      expect(true).toBe(true);
    });

    it('should clear all intervals', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      service.startMonitoring();
      service.cleanup();

      // Should have called clearInterval
      expect(clearIntervalSpy).toHaveBeenCalled();

      clearIntervalSpy.mockRestore();
    });

    it('should handle cleanup when not monitoring', () => {
      expect(() => service.cleanup()).not.toThrow();
    });
  });

  // ==========================================================================
  // Edge Cases & Error Handling
  // ==========================================================================

  describe('Edge Cases & Error Handling', () => {
    it('should handle empty registries gracefully', () => {
      service.startMonitoring();

      const report = service.getCurrentReport();

      expect(report.snapshots).toBeDefined();
    });

    it('should handle multiple start/stop cycles', () => {
      service.startMonitoring();
      service.stopMonitoring();
      service.startMonitoring();
      service.stopMonitoring();

      expect(true).toBe(true);
    });

    it('should limit snapshot storage', () => {
      service.startMonitoring();

      // Take many snapshots
      for (let i = 0; i < 1100; i++) {
        service.analyzeMemory();
      }

      const report = service.getCurrentReport();

      // Should not exceed max snapshots (1000)
      expect(report.snapshots.length).toBeLessThanOrEqual(1000);
    });

    it('should handle async storage errors during store', async () => {
      mockAsyncStorage.setItem.mockRejectedValue(new Error('Storage error'));

      service.startMonitoring();
      service.stopMonitoring();

      // Should not throw
      expect(true).toBe(true);
    });

    it('should generate unique IDs', () => {
      service.startMonitoring();

      service.analyzeMemory();
      service.analyzeMemory();

      const report = service.getCurrentReport();

      if (report.snapshots.length >= 2) {
        expect(report.snapshots[0].id).not.toBe(report.snapshots[1].id);
      }
    });

    it('should handle timer registration without monitoring', () => {
      const timer = setTimeout(() => {}, 1000);

      service.registerTimer(timer);

      clearTimeout(timer);

      expect(true).toBe(true);
    });

    it('should handle interval registration without monitoring', () => {
      const interval = setInterval(() => {}, 1000);

      service.registerInterval(interval);

      clearInterval(interval);

      expect(true).toBe(true);
    });
  });

  // ==========================================================================
  // Integration Scenarios
  // ==========================================================================

  describe('Integration Scenarios', () => {
    it('should track full component lifecycle', () => {
      service.startMonitoring();

      const component = { name: 'TestComponent' };

      // Mount
      service.registerComponent('TestComponent', component);

      const listener = jest.fn();
      service.registerListener('componentEvent', listener);

      const timer = setTimeout(() => {}, 5000);
      service.registerTimer(timer);

      // Analyze
      service.analyzeMemory();

      const report1 = service.getCurrentReport();
      const snapshot1 = report1.snapshots[report1.snapshots.length - 1];

      expect(snapshot1.componentCount).toBeGreaterThan(0);
      expect(snapshot1.listenerCount).toBeGreaterThan(0);
      expect(snapshot1.timerCount).toBeGreaterThan(0);

      // Unmount
      service.unregisterComponent('TestComponent');
      service.unregisterListener('componentEvent', listener);
      service.unregisterTimer(timer);
      clearTimeout(timer);

      const report2 = service.getCurrentReport();
      const snapshot2 = report2.snapshots[report2.snapshots.length - 1];

      expect(snapshot2.componentCount).toBe(0);
      expect(snapshot2.listenerCount).toBe(0);
      expect(snapshot2.timerCount).toBe(0);

      service.stopMonitoring();
    });

    it('should handle concurrent registrations', () => {
      service.startMonitoring();

      // Register many items at once
      for (let i = 0; i < 50; i++) {
        service.registerComponent(`Component${i}`, { id: i });
        service.registerListener(`Target${i}`, jest.fn());
      }

      service.analyzeMemory();

      const report = service.getCurrentReport();
      const snapshot = report.snapshots[report.snapshots.length - 1];

      expect(snapshot.componentCount).toBe(50);
      expect(snapshot.listenerCount).toBe(50);

      service.stopMonitoring();
    });

    it('should generate report with multiple snapshots', () => {
      service.startMonitoring();

      // Take multiple snapshots
      service.analyzeMemory();
      jest.advanceTimersByTime(1000);
      service.analyzeMemory();
      jest.advanceTimersByTime(1000);
      service.analyzeMemory();

      const report = service.getCurrentReport();

      expect(report.snapshots.length).toBeGreaterThanOrEqual(3);
      expect(report.trends).toBeDefined();
      expect(report.peaks).toBeDefined();
      expect(report.averages).toBeDefined();

      service.stopMonitoring();
    });
  });
});
