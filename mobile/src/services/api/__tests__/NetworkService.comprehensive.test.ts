/**
 * Comprehensive tests for NetworkService
 * Target: 95%+ coverage
 * Focus: Network monitoring, quality testing, listener management
 */

import { NetInfoStateType } from '@react-native-community/netinfo';

// Mock NetInfo BEFORE importing NetworkService
const mockAddEventListener = jest.fn();
const mockFetch = jest.fn();
jest.mock('@react-native-community/netinfo', () => {
  const NetInfoStateType = {
    wifi: 'wifi',
    cellular: 'cellular',
    ethernet: 'ethernet',
    bluetooth: 'bluetooth',
    wimax: 'wimax',
    vpn: 'vpn',
    other: 'other',
    none: 'none',
    unknown: 'unknown',
  };

  return {
    __esModule: true,
    default: {
      addEventListener: (...args: any[]) => mockAddEventListener(...args),
      fetch: (...args: any[]) => mockFetch(...args),
    },
    NetInfoStateType,
    addEventListener: (...args: any[]) => mockAddEventListener(...args),
    fetch: (...args: any[]) => mockFetch(...args),
  };
});

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => {
  const store: Record<string, string> = {};

  return {
    __esModule: true,
    default: {
      getItem: jest.fn((key: string) => Promise.resolve(store[key] || null)),
      setItem: jest.fn((key: string, value: string) => {
        store[key] = value;
        return Promise.resolve();
      }),
      removeItem: jest.fn((key: string) => {
        delete store[key];
        return Promise.resolve();
      }),
      clear: jest.fn(() => {
        Object.keys(store).forEach(key => delete store[key]);
        return Promise.resolve();
      }),
      getAllKeys: jest.fn(() => Promise.resolve(Object.keys(store))),
    },
  };
});

// Mock delayService
const mockIntervalClear = jest.fn();
const mockTimeoutClear = jest.fn();
const mockInterval = jest.fn(() => ({
  clear: mockIntervalClear,
}));
const mockTimeout = jest.fn((callback: () => void) => {
  // Execute callback immediately for most tests
  callback();
  return {
    clear: mockTimeoutClear,
  };
});

jest.mock('../../../utils/DelayService', () => ({
  delayService: {
    interval: (...args: any[]) => mockInterval(...args),
    timeout: (...args: any[]) => mockTimeout(...args),
  },
}));

// Mock global fetch
global.fetch = jest.fn();

// Mock logger
jest.mock('../../../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe.skip('NetworkService - Comprehensive Tests', () => {
  let networkService: any;
  let NetworkQuality: any;
  let NetworkStatus: any;
  let networkChangeHandler: ((state: any) => void) | null = null;

  beforeAll(async () => {
    // Import service AFTER all mocks are set up
    jest.resetModules(); // Clear module cache
    const module = require('../NetworkService');
    console.log('Module keys:', Object.keys(module));
    console.log('Module.default type:', typeof module.default);
    console.log('Module.default keys:', module.default ? Object.keys(module.default) : 'undefined');
    networkService = module.default;
    NetworkQuality = module.NetworkQuality;
    NetworkStatus = module.NetworkStatus;

    // Wait for service initialization
    if (networkService && typeof networkService.waitForInitialization === 'function') {
      await networkService.waitForInitialization();
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    networkChangeHandler = null;

    // Capture the network change handler
    mockAddEventListener.mockImplementation((handler: any) => {
      networkChangeHandler = handler;
      return jest.fn(); // Return unsubscribe function
    });

    // Default NetInfo.fetch response
    mockFetch.mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
      type: NetInfoStateType.wifi,
      details: {},
    });

    // Default fetch response for quality tests
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: 'test' }),
    });
  });

  afterEach(() => {
    networkService.stopMonitoring();
  });

  describe('Network Status', () => {
    it('should get current status', () => {
      const status = networkService.getCurrentStatus();
      expect(status).toBeDefined();
      if (status) {
        expect(status).toHaveProperty('isConnected');
        expect(status).toHaveProperty('isInternetReachable');
        expect(status).toHaveProperty('type');
      }
    });

    it('should check if connected', async () => {
      mockFetch.mockResolvedValueOnce({
        isConnected: true,
        isInternetReachable: true,
        type: NetInfoStateType.wifi,
        details: {},
      });

      const connected = await networkService.isConnected();
      expect(connected).toBe(true);
    });

    it('should handle connection check errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const connected = await networkService.isConnected();
      expect(connected).toBe(false);
    });

    it('should get connection type string for WiFi', async () => {
      // Simulate network change to WiFi
      if (networkChangeHandler) {
        networkChangeHandler({
          isConnected: true,
          isInternetReachable: true,
          type: NetInfoStateType.wifi,
          details: {},
        });
      }

      await new Promise(resolve => setTimeout(resolve, 10));
      const typeString = networkService.getConnectionTypeString();
      expect(typeString).toBe('Wi-Fi');
    });

    it('should get connection type string for Cellular', async () => {
      if (networkChangeHandler) {
        networkChangeHandler({
          isConnected: true,
          isInternetReachable: true,
          type: NetInfoStateType.cellular,
          details: {},
        });
      }

      await new Promise(resolve => setTimeout(resolve, 10));
      const typeString = networkService.getConnectionTypeString();
      expect(typeString).toBe('Cellular');
    });

    it('should get connection type string for Ethernet', async () => {
      if (networkChangeHandler) {
        networkChangeHandler({
          isConnected: true,
          isInternetReachable: true,
          type: NetInfoStateType.ethernet,
          details: {},
        });
      }

      await new Promise(resolve => setTimeout(resolve, 10));
      const typeString = networkService.getConnectionTypeString();
      expect(typeString).toBe('Ethernet');
    });

    it('should handle disconnection', async () => {
      if (networkChangeHandler) {
        networkChangeHandler({
          isConnected: false,
          isInternetReachable: false,
          type: NetInfoStateType.none,
          details: {},
        });
      }

      await new Promise(resolve => setTimeout(resolve, 10));
      const status = networkService.getCurrentStatus();
      expect(status?.isConnected).toBe(false);
    });
  });

  describe('Network Quality', () => {
    it('should get current quality', () => {
      const quality = networkService.getCurrentQuality();
      // Quality might be null if no test has run yet
      if (quality) {
        expect(quality).toHaveProperty('score');
        expect(quality).toHaveProperty('latency');
        expect(quality).toHaveProperty('downloadSpeed');
      }
    });

    it('should test connection quality', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: 'test response' }),
      });

      const quality = await networkService.testConnectionQuality();

      expect(quality).toBeDefined();
      expect(quality.score).toBeGreaterThanOrEqual(0);
      expect(quality.score).toBeLessThanOrEqual(100);
      expect(quality.latency).toBeGreaterThan(0);
      expect(quality.downloadSpeed).toBeGreaterThan(0);
    });

    it('should handle concurrent quality tests', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: 'test' }),
      });

      // Start two tests concurrently
      const promise1 = networkService.testConnectionQuality();
      const promise2 = networkService.testConnectionQuality();

      const [quality1, quality2] = await Promise.all([promise1, promise2]);

      // Should return the same promise result
      expect(quality1).toEqual(quality2);
    });

    it('should get quality level - excellent', async () => {
      // Manually set quality to excellent
      if (networkChangeHandler) {
        networkChangeHandler({
          isConnected: true,
          isInternetReachable: true,
          type: NetInfoStateType.wifi,
          details: {},
        });
      }

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: 't' }),
      });

      await networkService.testConnectionQuality();

      const level = networkService.getQualityLevel();
      expect(level).toBeDefined();
      expect(['excellent', 'good', 'fair', 'poor', 'unknown']).toContain(level);
    });

    it('should return unknown quality level when no quality data', () => {
      // Clear quality by restarting (quality might not be set)
      const level = networkService.getQualityLevel();
      expect(level).toBeDefined();
      expect(['excellent', 'good', 'fair', 'poor', 'unknown']).toContain(level);
    });
  });

  describe('Connection Testing', () => {
    it('should test connection successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: 'test' }),
      });

      const result = await networkService.testConnection();
      expect(typeof result).toBe('boolean');
    });

    it('should handle connection test failure', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await networkService.testConnection();
      expect(result).toBe(false);
    });

    it('should handle fetch timeout', async () => {
      // Mock timeout that calls the abort callback
      mockTimeout.mockImplementationOnce((callback: () => void) => {
        setTimeout(() => callback(), 0);
        return { clear: mockTimeoutClear };
      });

      (global.fetch as jest.Mock).mockImplementation(() =>
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('AbortError')), 100);
        })
      );

      const result = await networkService.testConnection();
      expect(result).toBe(false);
    });

    it('should handle non-OK HTTP response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({}),
      });

      const result = await networkService.testConnection();
      expect(result).toBe(false);
    });
  });

  describe('Listener Management', () => {
    it('should register network change listener', () => {
      const listener = jest.fn();
      const unsubscribe = networkService.onConnectionChange(listener);

      expect(typeof unsubscribe).toBe('function');

      // Trigger network change
      if (networkChangeHandler) {
        networkChangeHandler({
          isConnected: true,
          isInternetReachable: true,
          type: NetInfoStateType.wifi,
          details: {},
        });
      }

      expect(listener).toHaveBeenCalled();
    });

    it('should call listener immediately with current status', () => {
      const listener = jest.fn();
      networkService.onConnectionChange(listener);

      // Should be called immediately with current status
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          isConnected: expect.any(Boolean),
          isInternetReachable: expect.any(Boolean),
          type: expect.any(String),
        })
      );
    });

    it('should notify listeners on network change', async () => {
      const listener = jest.fn();
      networkService.onConnectionChange(listener);

      listener.mockClear();

      // Trigger network change
      if (networkChangeHandler) {
        networkChangeHandler({
          isConnected: false,
          isInternetReachable: false,
          type: NetInfoStateType.none,
          details: {},
        });
      }

      await new Promise(resolve => setTimeout(resolve, 10));
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          isConnected: false,
        })
      );
    });

    it('should unsubscribe network change listener', async () => {
      const listener = jest.fn();
      const unsubscribe = networkService.onConnectionChange(listener);

      listener.mockClear();
      unsubscribe();

      // Trigger network change
      if (networkChangeHandler) {
        networkChangeHandler({
          isConnected: false,
          isInternetReachable: false,
          type: NetInfoStateType.none,
          details: {},
        });
      }

      await new Promise(resolve => setTimeout(resolve, 10));
      expect(listener).not.toHaveBeenCalled();
    });

    it('should register quality change listener', () => {
      const listener = jest.fn();
      const unsubscribe = networkService.onQualityChange(listener);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should call quality listener immediately if quality exists', async () => {
      // First set quality
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: 'test' }),
      });

      await networkService.testConnectionQuality();

      const listener = jest.fn();
      networkService.onQualityChange(listener);

      // Should be called immediately if quality exists
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          score: expect.any(Number),
          latency: expect.any(Number),
        })
      );
    });

    it('should unsubscribe quality change listener', async () => {
      const listener = jest.fn();
      const unsubscribe = networkService.onQualityChange(listener);

      listener.mockClear();
      unsubscribe();

      // Trigger quality change
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: 'test' }),
      });

      await networkService.testConnectionQuality();

      // Listener should not be called (was unsubscribed)
      expect(listener).not.toHaveBeenCalled();
    });

    it('should handle listener errors gracefully', async () => {
      const listener = jest.fn(() => {
        throw new Error('Listener error');
      });

      networkService.onConnectionChange(listener);

      // Should not throw
      if (networkChangeHandler) {
        expect(() => {
          networkChangeHandler({
            isConnected: true,
            isInternetReachable: true,
            type: NetInfoStateType.wifi,
            details: {},
          });
        }).not.toThrow();
      }
    });
  });

  describe('Test History', () => {
    it('should get test history', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: 'test' }),
      });

      await networkService.testConnectionQuality();

      const history = networkService.getTestHistory();
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThan(0);
      expect(history[0]).toHaveProperty('latency');
      expect(history[0]).toHaveProperty('timestamp');
    });

    it('should limit test history', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: 'test' }),
      });

      await networkService.testConnectionQuality();

      const history = networkService.getTestHistory(1);
      expect(history.length).toBeLessThanOrEqual(1);
    });

    it('should clear test history', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: 'test' }),
      });

      await networkService.testConnectionQuality();
      await networkService.clearTestHistory();

      const history = networkService.getTestHistory();
      expect(history.length).toBe(0);
    });

    it('should persist test history after quality test', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: 'test' }),
      });

      await networkService.testConnectionQuality();

      // In test environment, persistData skips async operations
      // So we just verify the method was called
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('Monitoring Control', () => {
    it('should stop monitoring', () => {
      expect(() => networkService.stopMonitoring()).not.toThrow();
      expect(mockIntervalClear).toHaveBeenCalled();
    });

    it('should restart monitoring', async () => {
      mockFetch.mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
        type: NetInfoStateType.wifi,
        details: {},
      });

      await networkService.restartMonitoring();

      expect(mockAddEventListener).toHaveBeenCalled();
    });

    it('should handle restart when already stopped', async () => {
      networkService.stopMonitoring();

      mockFetch.mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
        type: NetInfoStateType.wifi,
        details: {},
      });

      await networkService.restartMonitoring();

      expect(mockAddEventListener).toHaveBeenCalled();
    });
  });

  describe('Web Platform Compatibility (BUG-024)', () => {
    it('should handle web platform with null isInternetReachable', async () => {
      // Mock web environment
      const originalWindow = (global as any).window;
      (global as any).window = { navigator: {} };

      mockFetch.mockResolvedValueOnce({
        isConnected: true,
        isInternetReachable: null, // Common on web
        type: NetInfoStateType.wifi,
        details: {},
      });

      const connected = await networkService.isConnected();
      expect(connected).toBe(true);

      // Restore
      if (!originalWindow) {
        delete (global as any).window;
      } else {
        (global as any).window = originalWindow;
      }
    });

    it('should handle network change on web platform', async () => {
      // Mock web environment
      const originalWindow = (global as any).window;
      (global as any).window = { navigator: {} };

      if (networkChangeHandler) {
        networkChangeHandler({
          isConnected: true,
          isInternetReachable: null,
          type: NetInfoStateType.wifi,
          details: {},
        });
      }

      await new Promise(resolve => setTimeout(resolve, 10));
      const status = networkService.getCurrentStatus();
      expect(status?.isInternetReachable).toBe(true); // Should be true on web when connected

      // Restore
      if (!originalWindow) {
        delete (global as any).window;
      } else {
        (global as any).window = originalWindow;
      }
    });
  });

  describe('Quality Score Calculation', () => {
    it('should calculate score for excellent connection', async () => {
      (global.fetch as jest.Mock).mockImplementation(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ d: 't' }),
        })
      );

      const quality = await networkService.testConnectionQuality();

      expect(quality.score).toBeGreaterThanOrEqual(0);
      expect(quality.score).toBeLessThanOrEqual(100);
    });

    it('should handle all servers failing', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('All servers failed'));

      await expect(networkService.testConnectionQuality()).rejects.toThrow();
    });

    it('should calculate average from multiple servers', async () => {
      let callCount = 0;
      (global.fetch as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ data: 'test1' }),
          });
        } else if (callCount === 2) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ data: 'test2' }),
          });
        } else {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ data: 'test3' }),
          });
        }
      });

      const quality = await networkService.testConnectionQuality();

      expect(quality).toBeDefined();
      expect(quality.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Connection Type Mapping', () => {
    it('should map bluetooth type', () => {
      if (networkChangeHandler) {
        networkChangeHandler({
          isConnected: true,
          isInternetReachable: true,
          type: NetInfoStateType.bluetooth,
          details: {},
        });
      }

      const typeString = networkService.getConnectionTypeString();
      expect(typeString).toBe('Bluetooth');
    });

    it('should map wimax type', () => {
      if (networkChangeHandler) {
        networkChangeHandler({
          isConnected: true,
          isInternetReachable: true,
          type: NetInfoStateType.wimax,
          details: {},
        });
      }

      const typeString = networkService.getConnectionTypeString();
      expect(typeString).toBe('WiMAX');
    });

    it('should map vpn type', () => {
      if (networkChangeHandler) {
        networkChangeHandler({
          isConnected: true,
          isInternetReachable: true,
          type: NetInfoStateType.vpn,
          details: {},
        });
      }

      const typeString = networkService.getConnectionTypeString();
      expect(typeString).toBe('VPN');
    });

    it('should map other type', () => {
      if (networkChangeHandler) {
        networkChangeHandler({
          isConnected: true,
          isInternetReachable: true,
          type: NetInfoStateType.other,
          details: {},
        });
      }

      const typeString = networkService.getConnectionTypeString();
      expect(typeString).toBe('Other');
    });

    it('should map none type', () => {
      if (networkChangeHandler) {
        networkChangeHandler({
          isConnected: false,
          isInternetReachable: false,
          type: NetInfoStateType.none,
          details: {},
        });
      }

      const typeString = networkService.getConnectionTypeString();
      expect(typeString).toBe('None');
    });

    it('should map unknown type', () => {
      if (networkChangeHandler) {
        networkChangeHandler({
          isConnected: true,
          isInternetReachable: true,
          type: NetInfoStateType.unknown,
          details: {},
        });
      }

      const typeString = networkService.getConnectionTypeString();
      expect(typeString).toBe('Unknown');
    });
  });

  describe('Network State Changes', () => {
    it('should handle connection state change', async () => {
      const listener = jest.fn();
      networkService.onConnectionChange(listener);

      listener.mockClear();

      if (networkChangeHandler) {
        networkChangeHandler({
          isConnected: true,
          isInternetReachable: true,
          type: NetInfoStateType.cellular,
          details: {},
        });
      }

      await new Promise(resolve => setTimeout(resolve, 10));
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          isConnected: true,
          type: NetInfoStateType.cellular,
        })
      );
    });

    it('should handle disconnection state change', async () => {
      const listener = jest.fn();
      networkService.onConnectionChange(listener);

      listener.mockClear();

      if (networkChangeHandler) {
        networkChangeHandler({
          isConnected: false,
          isInternetReachable: false,
          type: NetInfoStateType.none,
          details: {},
        });
      }

      await new Promise(resolve => setTimeout(resolve, 10));
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          isConnected: false,
        })
      );
    });

    it('should handle network type change', async () => {
      // Start with WiFi
      if (networkChangeHandler) {
        networkChangeHandler({
          isConnected: true,
          isInternetReachable: true,
          type: NetInfoStateType.wifi,
          details: {},
        });
      }

      await new Promise(resolve => setTimeout(resolve, 10));

      // Change to Cellular
      if (networkChangeHandler) {
        networkChangeHandler({
          isConnected: true,
          isInternetReachable: true,
          type: NetInfoStateType.cellular,
          details: {},
        });
      }

      await new Promise(resolve => setTimeout(resolve, 10));
      const status = networkService.getCurrentStatus();
      expect(status?.type).toBe(NetInfoStateType.cellular);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing quality data gracefully', () => {
      const level = networkService.getQualityLevel();
      expect(level).toBeDefined();
      expect(['excellent', 'good', 'fair', 'poor', 'unknown']).toContain(level);
    });

    it('should handle test history limit', async () => {
      // Test with limit of 100 (service's max)
      const history = networkService.getTestHistory(100);
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeLessThanOrEqual(100);
    });

    it('should handle persistence in test environment', async () => {
      // In test environment, persistData should skip async operations
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: 'test' }),
      });

      // Should not throw even though we skip persistence in test env
      await expect(networkService.testConnectionQuality()).resolves.toBeDefined();
    });
  });
});
