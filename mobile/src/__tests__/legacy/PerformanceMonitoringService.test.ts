/**
 * Performance Monitoring Service Unit Tests
 *
 * Comprehensive unit tests for the performance monitoring service
 * covering all major functionality and edge cases
 */

import { PerformanceMonitoringService } from '@/services/monitoring/PerformanceMonitoringService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import { getEnvironmentConfig } from '@/config/environment';

// Mock the config environment before importing
jest.mock('@/config/environment', () => ({
  getEnvironmentConfig: jest.fn(() => ({
    API_BASE_URL: 'http://localhost:8020',
    ENVIRONMENT: 'test',
    ENABLE_LOGGING: false,
    NETWORK_TIMEOUT: 5000,
    CACHE_DURATION: 300000,
    MAX_RETRIES: 3,
    BATCH_SIZE: 20,
    VERSION: '1.0.0',
    BUILD_NUMBER: '1',
    performance: {
      enableMonitoring: true,
      enableProfiling: true,
      enableNetworkLogging: true,
      enableMemoryTracking: true,
      enableFrameRateMonitoring: true,
      reportInterval: 60000,
      performanceThresholds: {
        startupTime: 3000,
        apiResponseTime: 2000,
        renderTime: 16,
        memoryUsage: 100 * 1024 * 1024,
        frameRate: 55,
      },
    },
    analytics: {
      enabled: true,
      samplingRate: 1.0,
      batchSize: 20,
      flushInterval: 30000,
      enableSessionTracking: true,
      enableScreenTracking: true,
      enableExceptionTracking: true,
    },
  })),
}));

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('react-native', () => ({
  DeviceEventEmitter: {
    emit: jest.fn(),
    addListener: jest.fn(),
  },
  Platform: {
    OS: 'ios',
    Version: '14.0',
  },
}));

// Mock console methods to prevent async logging after test completion
const originalConsoleError = console.error;
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.error = jest.fn();
  console.log = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.log = originalConsoleLog;
  console.warn = originalConsoleWarn;
});

jest.mock('@/config/environment');

describe('PerformanceMonitoringService', () => {
  let service: PerformanceMonitoringService;
  let mockConfig: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();

    // Setup mock config
    mockConfig = {
      performance: {
        enableMonitoring: true,
        enableProfiling: true,
        enableNetworkLogging: true,
        enableMemoryTracking: true,
        enableFrameRateMonitoring: true,
        reportInterval: 60000,
        performanceThresholds: {
          startupTime: 3000,
          apiResponseTime: 2000,
          renderTime: 16,
          memoryUsage: 100 * 1024 * 1024,
          frameRate: 55,
        },
      },
      analytics: {
        enabled: true,
      },
      VERSION: '1.0.0',
      BUILD_NUMBER: '1',
      ENVIRONMENT: 'test',
    };

    (getEnvironmentConfig as jest.Mock).mockReturnValue(mockConfig);

    service = PerformanceMonitoringService.getInstance();
    service.clearSession();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    service.clearSession();
    service.stopMonitoring();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = PerformanceMonitoringService.getInstance();
      const instance2 = PerformanceMonitoringService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should maintain state across getInstance calls', () => {
      const instance1 = PerformanceMonitoringService.getInstance();
      instance1.startMonitoring();

      const instance2 = PerformanceMonitoringService.getInstance();
      expect(instance2.isMonitoring).toBe(true);
    });
  });

  describe('Initialization', () => {
    it('should initialize successfully when monitoring is enabled', async () => {
      await service.initialize();

      expect(service.isMonitoring).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should not initialize when monitoring is disabled', async () => {
      mockConfig.performance.enableMonitoring = false;
      (getEnvironmentConfig as jest.Mock).mockReturnValue(mockConfig);

      // Reset singleton to force re-initialization with new config
      (PerformanceMonitoringService as any).instance = undefined;
      const newService = PerformanceMonitoringService.getInstance();
      await newService.initialize();

      expect(newService.isMonitoring).toBe(false);
    });

    it('should handle initialization errors gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      await expect(service.initialize()).resolves.not.toThrow();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Monitoring Lifecycle', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should start monitoring', () => {
      const initialSessionId = service.sessionId;

      service.startMonitoring();

      expect(service.isMonitoring).toBe(true);
      expect(service.sessionId).not.toBe(initialSessionId);
      expect(DeviceEventEmitter.emit).toHaveBeenCalledWith(
        'performance_metric',
        expect.objectContaining({
          name: 'performance_monitoring_initialized',
          type: 'custom',
        }),
      );
    });

    it('should stop monitoring', () => {
      service.stopMonitoring();

      expect(service.isMonitoring).toBe(false);
      expect(DeviceEventEmitter.emit).toHaveBeenCalledWith(
        'performance_metric',
        expect.objectContaining({
          name: 'monitoring_session_ended',
          type: 'custom',
        }),
      );
    });

    it('should not start monitoring if already monitoring', () => {
      const initialSessionId = service.sessionId;

      service.startMonitoring();

      expect(service.sessionId).toBe(initialSessionId);
    });

    it('should not stop monitoring if not monitoring', () => {
      service.stopMonitoring();
      service.stopMonitoring(); // Call twice

      expect(service.isMonitoring).toBe(false);
    });
  });

  describe('Metric Logging', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should log a performance metric', () => {
      const metric = {
        type: 'api' as const,
        name: 'api_request_time',
        value: 150,
        unit: 'ms' as const,
        threshold: 1000,
      };

      service.logMetric(metric);

      const report = service.getCurrentReport();
      expect(report.metrics).toHaveLength(2); // init metric + our metric
      expect(report.metrics[1]).toMatchObject(metric);
      expect(report.metrics[1].id).toBeDefined();
      expect(report.metrics[1].timestamp).toBeDefined();
    });

    it('should not log metrics when not monitoring', () => {
      service.stopMonitoring();
      service.clearSession(); // Clear existing metrics

      service.logMetric({
        type: 'custom',
        name: 'test_metric',
        value: 100,
        unit: 'ms',
      });

      const report = service.getCurrentReport();
      // Should only have the initialization metric if any, but not the new metric
      expect(report.metrics.filter(m => m.name === 'test_metric')).toHaveLength(0);
    });

    it('should create alert when threshold is exceeded', () => {
      const alertSpy = jest.spyOn(console, 'warn');

      service.logMetric({
        type: 'api',
        name: 'slow_request',
        value: 2000,
        unit: 'ms',
        threshold: 1000,
      });

      const alerts = service.getAlerts();
      expect(alerts).toHaveLength(1);
      expect(alerts[0]).toMatchObject({
        type: 'threshold',
        metric: 'slow_request',
        value: 2000,
        threshold: 1000,
        severity: 'high',
      });
      expect(alertSpy).toHaveBeenCalled();
    });

    it('should emit metric event', () => {
      service.logMetric({
        type: 'custom',
        name: 'test_metric',
        value: 100,
        unit: 'ms',
      });

      expect(DeviceEventEmitter.emit).toHaveBeenCalledWith(
        'performance_metric',
        expect.objectContaining({
          name: 'test_metric',
          value: 100,
        }),
      );
    });
  });

  describe('Function Measurement', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should measure async function execution time', async () => {
      const mockFn = jest.fn().mockResolvedValue('result');

      const result = await service.measureAsync('test_function', mockFn, { tag: 'test' }, 1000);

      expect(result).toBe('result');
      expect(mockFn).toHaveBeenCalled();

      const report = service.getCurrentReport();
      const metric = report.metrics.find(m => m.name === 'test_function');
      expect(metric).toBeDefined();
      expect(metric?.type).toBe('custom');
      expect(metric?.unit).toBe('ms');
      expect(metric?.tags).toEqual({ tag: 'test' });
    });

    it('should measure sync function execution time', () => {
      const mockFn = jest.fn().mockReturnValue('result');

      const result = service.measure('test_sync_function', mockFn, { tag: 'sync' }, 500);

      expect(result).toBe('result');
      expect(mockFn).toHaveBeenCalled();

      const report = service.getCurrentReport();
      const metric = report.metrics.find(m => m.name === 'test_sync_function');
      expect(metric).toBeDefined();
      expect(metric?.type).toBe('custom');
      expect(metric?.unit).toBe('ms');
    });

    it('should log error metrics when function throws', async () => {
      const error = new Error('Test error');
      const mockFn = jest.fn().mockRejectedValue(error);

      await expect(service.measureAsync('failing_function', mockFn)).rejects.toThrow('Test error');

      const report = service.getCurrentReport();
      const errorMetric = report.metrics.find(m => m.name === 'failing_function_error');
      expect(errorMetric).toBeDefined();
      expect(errorMetric?.tags).toEqual({ error: 'true' });
    });

    it('should log error metrics when sync function throws', () => {
      const error = new Error('Test error');
      const mockFn = jest.fn().mockImplementation(() => {
        throw error;
      });

      expect(() => service.measure('failing_sync_function', mockFn)).toThrow('Test error');

      const report = service.getCurrentReport();
      const errorMetric = report.metrics.find(m => m.name === 'failing_sync_function_error');
      expect(errorMetric).toBeDefined();
      expect(errorMetric?.tags).toEqual({ error: 'true' });
    });
  });

  describe('Performance Reports', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should generate current performance report', () => {
      service.logMetric({
        type: 'custom',
        name: 'test_metric_1',
        value: 100,
        unit: 'ms',
      });

      service.logMetric({
        type: 'custom',
        name: 'test_metric_2',
        value: 200,
        unit: 'ms',
      });

      const report = service.getCurrentReport();

      expect(report).toMatchObject({
        sessionId: expect.any(String),
        startTime: expect.any(Number),
        endTime: expect.any(Number),
        duration: expect.any(Number),
        metrics: expect.any(Array),
        aggregates: expect.any(Object),
        deviceInfo: expect.any(Object),
        appInfo: expect.any(Object),
      });

      expect(report.metrics).toHaveLength(3); // init + 2 custom metrics
      expect(report.aggregates).toHaveProperty('test_metric_1');
      expect(report.aggregates).toHaveProperty('test_metric_2');
    });

    it('should calculate aggregates correctly', () => {
      // Add multiple metrics with the same name
      for (let i = 0; i < 5; i++) {
        service.logMetric({
          type: 'custom',
          name: 'repeated_metric',
          value: i * 100,
          unit: 'ms',
        });
      }

      const report = service.getCurrentReport();
      const aggregate = report.aggregates.repeated_metric;

      expect(aggregate).toMatchObject({
        count: 5,
        sum: 1000, // 0 + 100 + 200 + 300 + 400
        avg: 200,
        min: 0,
        max: 400,
      });
    });

    it('should handle empty metrics gracefully', () => {
      service.clearSession();
      const report = service.getCurrentReport();

      expect(report.metrics).toHaveLength(0);
      expect(Object.keys(report.aggregates)).toHaveLength(0);
    });
  });

  describe('Alert Management', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should get all alerts', () => {
      service.logMetric({
        type: 'custom',
        name: 'metric_1',
        value: 100,
        unit: 'ms',
        threshold: 50,
      });

      service.logMetric({
        type: 'custom',
        name: 'metric_2',
        value: 200,
        unit: 'ms',
        threshold: 150,
      });

      const alerts = service.getAlerts();
      expect(alerts).toHaveLength(2);
    });

    it('should filter alerts by severity', () => {
      service.clearSession(); // Clear existing alerts

      // Create critical alert (3x threshold)
      service.logMetric({
        type: 'custom',
        name: 'critical_metric',
        value: 3000,
        unit: 'ms',
        threshold: 1000,
      });

      // Create medium alert (1.8x threshold)
      service.logMetric({
        type: 'custom',
        name: 'medium_metric',
        value: 1800,
        unit: 'ms',
        threshold: 1000,
      });

      const allAlerts = service.getAlerts();
      const criticalAlerts = service.getAlerts('critical');
      const mediumAlerts = service.getAlerts('medium');

      expect(allAlerts.length).toBeGreaterThan(0);
      expect(criticalAlerts.length).toBeGreaterThan(0);
      expect(mediumAlerts.length).toBeGreaterThan(0);
      expect(criticalAlerts[0].severity).toBe('critical');
      expect(mediumAlerts[0].severity).toBe('medium');
    });

    it('should determine alert severity correctly', () => {
      service.clearSession(); // Clear existing alerts

      // Low severity (1.2x threshold)
      service.logMetric({
        type: 'custom',
        name: 'low_alert',
        value: 120,
        unit: 'ms',
        threshold: 100,
      });

      // High severity (2.5x threshold)
      service.logMetric({
        type: 'custom',
        name: 'high_alert',
        value: 250,
        unit: 'ms',
        threshold: 100,
      });

      const alerts = service.getAlerts();
      expect(alerts.length).toBeGreaterThanOrEqual(2);

      // Find the specific alerts by name
      const lowAlert = alerts.find(a => a.metric === 'low_alert');
      const highAlert = alerts.find(a => a.metric === 'high_alert');

      expect(lowAlert?.severity).toBe('low');
      expect(highAlert?.severity).toBe('high');
    });
  });

  describe('Session Management', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should clear session data', () => {
      service.logMetric({
        type: 'custom',
        name: 'test_metric',
        value: 100,
        unit: 'ms',
        threshold: 50,
      });

      expect(service.getCurrentReport().metrics).toHaveLength(2); // init + test
      expect(service.getAlerts()).toHaveLength(1);

      service.clearSession();

      expect(service.getCurrentReport().metrics).toHaveLength(0);
      expect(service.getAlerts()).toHaveLength(0);
      expect(service.sessionId).toBeDefined();
      expect(service.startTime).toBeDefined();
    });

    it('should generate unique session IDs', () => {
      const initialSessionId = service.sessionId;
      service.clearSession();
      const newSessionId = service.sessionId;

      expect(initialSessionId).not.toBe(newSessionId);
      expect(initialSessionId).toMatch(/^perf_\d+_[a-z0-9]+$/);
      expect(newSessionId).toMatch(/^perf_\d+_[a-z0-9]+$/);
    });
  });

  describe('Storage Integration', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should store session data on stop', async () => {
      service.logMetric({
        type: 'custom',
        name: 'test_metric',
        value: 100,
        unit: 'ms',
      });

      service.stopMonitoring();

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        expect.stringMatching(/^perf_session_/),
        expect.stringContaining('test_metric'),
      );
    });

    it('should handle storage errors gracefully', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      service.stopMonitoring();

      expect(console.error).toHaveBeenCalledWith(
        'Failed to store session data:',
        expect.any(Error),
      );
      expect(service.isMonitoring).toBe(false);
    });

    it('should cleanup old sessions', async () => {
      // Mock multiple existing sessions
      const existingSessions = Array.from({ length: 15 }, (_, i) => ({
        key: `perf_session_session_${i}`,
        timestamp: Date.now() - (i * 1000),
      }));

      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue(
        existingSessions.map(s => s.key),
      );

      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        const session = existingSessions.find(s => s.key === key);
        return Promise.resolve(JSON.stringify(session));
      });

      await service.cleanupOldSessions();

      // Should keep only 10 most recent sessions
      expect(AsyncStorage.removeItem).toHaveBeenCalledTimes(5);
    });
  });

  describe('Device Info Collection', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should collect device information', () => {
      const report = service.getCurrentReport();

      expect(report.deviceInfo).toMatchObject({
        platform: expect.any(String),
        version: expect.any(String),
        model: expect.any(String),
        memoryTotal: expect.any(Number),
        storageTotal: expect.any(Number),
      });
    });

    it('should collect app information', () => {
      const report = service.getCurrentReport();

      expect(report.appInfo).toMatchObject({
        version: mockConfig.VERSION,
        buildNumber: mockConfig.BUILD_NUMBER,
        environment: mockConfig.ENVIRONMENT,
      });
    });
  });

  describe('Memory and Performance Metrics', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should collect memory metrics', () => {
      // Trigger memory collection manually for testing
      service.collectMemoryMetrics();

      const report = service.getCurrentReport();
      const memoryMetric = report.metrics.find(m => m.name === 'memory_usage');

      expect(memoryMetric).toBeDefined();
      expect(memoryMetric?.type).toBe('memory');
      expect(memoryMetric?.unit).toBe('bytes');
    });

    it('should collect frame rate metrics', () => {
      // Trigger frame rate collection manually for testing
      service.collectFrameRateMetrics();

      const report = service.getCurrentReport();
      const frameRateMetric = report.metrics.find(m => m.name === 'frame_rate');

      expect(frameRateMetric).toBeDefined();
      expect(frameRateMetric?.type).toBe('custom');
      expect(frameRateMetric?.unit).toBe('fps');
    });
  });

  describe('Event Emission', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should emit performance report events', () => {
      service.logMetric({
        type: 'custom',
        name: 'test_metric',
        value: 100,
        unit: 'ms',
      });

      // Manually trigger report generation for testing
      service.generateReport();

      expect(DeviceEventEmitter.emit).toHaveBeenCalledWith(
        'performance_report',
        expect.objectContaining({
          sessionId: expect.any(String),
          metrics: expect.any(Array),
        }),
      );
    });

    it('should emit alert events', () => {
      service.logMetric({
        type: 'custom',
        name: 'test_metric',
        value: 1000,
        unit: 'ms',
        threshold: 500,
      });

      expect(DeviceEventEmitter.emit).toHaveBeenCalledWith(
        'performance_alert',
        expect.objectContaining({
          type: 'threshold',
          severity: expect.any(String),
        }),
      );
    });
  });

  describe('Analytics Integration', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should send reports to analytics when enabled', () => {
      const consoleSpy = jest.spyOn(console, 'log');

      service.sendReportToAnalytics({
        sessionId: 'test_session',
        metrics: [],
        aggregates: {},
        deviceInfo: {},
        appInfo: {},
        startTime: Date.now(),
        endTime: Date.now(),
        duration: 1000,
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Sending performance report to analytics:',
        expect.objectContaining({
          sessionId: 'test_session',
          metricsCount: 0,
          duration: 1000,
        }),
      );
    });

    it('should not send reports when analytics is disabled', () => {
      mockConfig.analytics.enabled = false;
      (getEnvironmentConfig as jest.Mock).mockReturnValue(mockConfig);

      const consoleSpy = jest.spyOn(console, 'log');

      // Call the method with a complete mock object that has all required properties
      const mockReport = {
        sessionId: 'test_session',
        metrics: [],
        aggregates: {},
        deviceInfo: {},
        appInfo: {},
        startTime: Date.now(),
        endTime: Date.now(),
        duration: 1000,
      };

      service.sendReportToAnalytics(mockReport);

      // When analytics is disabled, the method should return early without logging
      expect(consoleSpy).not.toHaveBeenCalledWith(
        'Sending performance report to analytics:',
        expect.any(Object),
      );
    });
  });
});
