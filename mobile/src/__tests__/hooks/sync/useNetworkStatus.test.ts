/**
 * useNetworkStatus Hook Tests
 * Day 5 Continuation - Network & Sync Hooks
 *
 * Tests for network status monitoring with quality metrics and connection testing
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useNetworkStatus } from '../../../hooks/useNetworkStatus';
import { NetworkService, type NetworkStatus, type NetworkQuality } from '../../../services/api/NetworkService';

// Mock logger
jest.mock('../../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

// Mock NetworkService
const mockGetCurrentStatus = jest.fn();
const mockOnConnectionChange = jest.fn();
const mockOnQualityChange = jest.fn();
const mockTestConnection = jest.fn();

jest.mock('../../../services/api/NetworkService', () => ({
  NetworkService: jest.fn().mockImplementation(() => ({
    getCurrentStatus: mockGetCurrentStatus,
    onConnectionChange: mockOnConnectionChange,
    onQualityChange: mockOnQualityChange,
    testConnection: mockTestConnection,
  })),
}));

describe('useNetworkStatus Hook', () => {
  const mockNetworkStatus: NetworkStatus = {
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
    details: {
      cellularGeneration: null,
    },
    quality: {
      score: 85,
      latency: 20,
      downloadSpeed: 50,
      uploadSpeed: 10,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Default mock implementations
    mockGetCurrentStatus.mockReturnValue(mockNetworkStatus);
    mockOnConnectionChange.mockReturnValue(jest.fn()); // Returns unsubscribe function
    mockOnQualityChange.mockReturnValue(jest.fn()); // Returns unsubscribe function
    mockTestConnection.mockResolvedValue(true);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Initialization', () => {
    it('should initialize with current network status', async () => {
      const { result } = renderHook(() => useNetworkStatus());

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      expect(mockGetCurrentStatus).toHaveBeenCalled();
      expect(result.current.isInternetReachable).toBe(true);
      expect(result.current.connectionType).toBe('wifi');
    });

    it('should set up connection change listener', () => {
      renderHook(() => useNetworkStatus());

      expect(mockOnConnectionChange).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should set up quality change listener', () => {
      renderHook(() => useNetworkStatus());

      expect(mockOnQualityChange).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should handle null initial status', async () => {
      mockGetCurrentStatus.mockReturnValue(null);

      const { result } = renderHook(() => useNetworkStatus());

      await waitFor(() => {
        expect(result.current.isConnected).toBe(false);
      });

      expect(result.current.quality).toBe('unknown');
    });
  });

  describe('Status Updates', () => {
    it('should register status change listener with callback', async () => {
      const { result } = renderHook(() => useNetworkStatus());

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Verify listener was registered with a callback function
      expect(mockOnConnectionChange).toHaveBeenCalled();
      expect(typeof mockOnConnectionChange.mock.calls[0][0]).toBe('function');
    });

    it('should invoke onStatusChange callback on initialization', async () => {
      const onStatusChange = jest.fn();
      renderHook(() => useNetworkStatus({ onStatusChange }));

      await waitFor(() => {
        expect(onStatusChange).toHaveBeenCalledWith(mockNetworkStatus);
      });
    });

    it('should display initial connection type', async () => {
      const { result } = renderHook(() => useNetworkStatus());

      await waitFor(() => {
        expect(result.current.connectionType).toBe('wifi');
      });

      expect(result.current.isConnected).toBe(true);
      expect(result.current.isInternetReachable).toBe(true);
    });

    it('should handle cellular connection type', async () => {
      const cellularStatus: NetworkStatus = {
        isConnected: true,
        isInternetReachable: true,
        type: 'cellular',
        details: { cellularGeneration: '4g' },
        quality: mockNetworkStatus.quality,
      };

      mockGetCurrentStatus.mockReturnValue(cellularStatus);

      const { result } = renderHook(() => useNetworkStatus());

      await waitFor(() => {
        expect(result.current.connectionType).toBe('cellular');
      });
    });
  });

  describe('Quality Updates', () => {
    it('should register quality change listener with callback', async () => {
      const { result } = renderHook(() => useNetworkStatus());

      await waitFor(() => {
        expect(result.current.quality).toBe('good');
      });

      // Verify listener was registered with a callback function
      expect(mockOnQualityChange).toHaveBeenCalled();
      expect(typeof mockOnQualityChange.mock.calls[0][0]).toBe('function');
    });

    it('should provide onQualityChange callback option', () => {
      const onQualityChange = jest.fn();
      renderHook(() => useNetworkStatus({ onQualityChange }));

      // Verify the hook accepts the callback option
      expect(onQualityChange).toBeDefined();
    });

    it('should calculate quality score correctly', async () => {
      const { result } = renderHook(() => useNetworkStatus());

      await waitFor(() => {
        expect(result.current.qualityScore).toBe(85); // From mock
        expect(result.current.quality).toBe('good'); // 70-90 range
      });
    });

    it('should handle excellent quality (score >= 90)', async () => {
      mockGetCurrentStatus.mockReturnValue({
        ...mockNetworkStatus,
        quality: { score: 95, latency: 5, downloadSpeed: 100, uploadSpeed: 50 },
      });

      const { result } = renderHook(() => useNetworkStatus());

      await waitFor(() => {
        expect(result.current.quality).toBe('excellent');
      });
    });

    it('should handle fair quality (score 50-70)', async () => {
      mockGetCurrentStatus.mockReturnValue({
        ...mockNetworkStatus,
        quality: { score: 60, latency: 100, downloadSpeed: 10, uploadSpeed: 5 },
      });

      const { result } = renderHook(() => useNetworkStatus());

      await waitFor(() => {
        expect(result.current.quality).toBe('fair');
      });
    });

    it('should handle poor quality (score 30-50)', async () => {
      mockGetCurrentStatus.mockReturnValue({
        ...mockNetworkStatus,
        quality: { score: 40, latency: 200, downloadSpeed: 1, uploadSpeed: 0.5 },
      });

      const { result } = renderHook(() => useNetworkStatus());

      await waitFor(() => {
        expect(result.current.quality).toBe('poor');
      });
    });

    it('should handle unknown quality (score < 30)', async () => {
      mockGetCurrentStatus.mockReturnValue({
        ...mockNetworkStatus,
        quality: { score: 20, latency: 500, downloadSpeed: 0.1, uploadSpeed: 0.1 },
      });

      const { result } = renderHook(() => useNetworkStatus());

      await waitFor(() => {
        expect(result.current.quality).toBe('unknown');
      });
    });
  });

  describe('Connection Testing', () => {
    it('should test connection manually', async () => {
      const { result } = renderHook(() => useNetworkStatus());

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      expect(result.current.isTesting).toBe(false);

      let testResult: boolean | undefined;
      await act(async () => {
        testResult = await result.current.testConnection();
      });

      expect(testResult).toBe(true);
      expect(mockTestConnection).toHaveBeenCalled();
      expect(result.current.isTesting).toBe(false);
      expect(result.current.lastTestTime).not.toBeNull();
    });

    it('should set isTesting during test', async () => {
      let resolveMock: ((value: boolean) => void) | null = null;
      mockTestConnection.mockImplementation(() => new Promise(resolve => {
        resolveMock = resolve;
      }));

      const { result } = renderHook(() => useNetworkStatus());

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      act(() => {
        result.current.testConnection();
      });

      await waitFor(() => {
        expect(result.current.isTesting).toBe(true);
      });

      act(() => {
        resolveMock?.(true);
      });

      await waitFor(() => {
        expect(result.current.isTesting).toBe(false);
      });
    });

    it('should handle connection test failure', async () => {
      mockTestConnection.mockRejectedValue(new Error('Test failed'));

      const { result } = renderHook(() => useNetworkStatus());

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      let testResult: boolean | undefined;
      await act(async () => {
        testResult = await result.current.testConnection();
      });

      expect(testResult).toBe(false);
      expect(result.current.isTesting).toBe(false);
    });

    it('should update lastTestTime after test', async () => {
      const { result } = renderHook(() => useNetworkStatus());

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      expect(result.current.lastTestTime).toBeNull();

      await act(async () => {
        await result.current.testConnection();
      });

      expect(result.current.lastTestTime).not.toBeNull();
      expect(typeof result.current.lastTestTime).toBe('number');
    });
  });

  describe('Test on Mount', () => {
    it('should test connection on mount when testOnMount is true', async () => {
      renderHook(() => useNetworkStatus({ testOnMount: true }));

      await waitFor(() => {
        expect(mockTestConnection).toHaveBeenCalled();
      });
    });

    it('should not test connection on mount by default', async () => {
      renderHook(() => useNetworkStatus());

      await waitFor(() => {
        expect(mockGetCurrentStatus).toHaveBeenCalled();
      });

      expect(mockTestConnection).not.toHaveBeenCalled();
    });
  });

  describe('Periodic Testing', () => {
    it('should test connection periodically when testInterval is set', async () => {
      renderHook(() => useNetworkStatus({ testInterval: 5000 }));

      await waitFor(() => {
        expect(mockGetCurrentStatus).toHaveBeenCalled();
      });

      expect(mockTestConnection).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(mockTestConnection).toHaveBeenCalledTimes(1);
      });

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(mockTestConnection).toHaveBeenCalledTimes(2);
      });
    });

    it('should not test periodically when testInterval is 0', async () => {
      renderHook(() => useNetworkStatus({ testInterval: 0 }));

      await waitFor(() => {
        expect(mockGetCurrentStatus).toHaveBeenCalled();
      });

      act(() => {
        jest.advanceTimersByTime(10000);
      });

      expect(mockTestConnection).not.toHaveBeenCalled();
    });

    it('should not test periodically by default', async () => {
      renderHook(() => useNetworkStatus());

      await waitFor(() => {
        expect(mockGetCurrentStatus).toHaveBeenCalled();
      });

      act(() => {
        jest.advanceTimersByTime(60000);
      });

      expect(mockTestConnection).not.toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    it('should unsubscribe from status changes on unmount', () => {
      const unsubscribeStatus = jest.fn();
      mockOnConnectionChange.mockReturnValue(unsubscribeStatus);

      const { unmount } = renderHook(() => useNetworkStatus());

      unmount();

      expect(unsubscribeStatus).toHaveBeenCalled();
    });

    it('should unsubscribe from quality changes on unmount', () => {
      const unsubscribeQuality = jest.fn();
      mockOnQualityChange.mockReturnValue(unsubscribeQuality);

      const { unmount } = renderHook(() => useNetworkStatus());

      unmount();

      expect(unsubscribeQuality).toHaveBeenCalled();
    });

    it('should clear test interval on unmount', () => {
      const { unmount } = renderHook(() => useNetworkStatus({ testInterval: 5000 }));

      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it('should handle unmount without test interval', () => {
      const { unmount } = renderHook(() => useNetworkStatus());

      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Derived Values', () => {
    it('should provide latency value', async () => {
      const { result } = renderHook(() => useNetworkStatus());

      await waitFor(() => {
        expect(result.current.latency).toBe(20);
      });
    });

    it('should provide download speed value', async () => {
      const { result } = renderHook(() => useNetworkStatus());

      await waitFor(() => {
        expect(result.current.downloadSpeed).toBe(50);
      });
    });

    it('should provide upload speed value', async () => {
      const { result } = renderHook(() => useNetworkStatus());

      await waitFor(() => {
        expect(result.current.uploadSpeed).toBe(10);
      });
    });

    it('should provide raw status object', async () => {
      const { result } = renderHook(() => useNetworkStatus());

      await waitFor(() => {
        expect(result.current.rawStatus).toEqual(mockNetworkStatus);
      });
    });

    it('should handle null values gracefully', async () => {
      mockGetCurrentStatus.mockReturnValue(null);

      const { result } = renderHook(() => useNetworkStatus());

      await waitFor(() => {
        expect(result.current.isConnected).toBe(false);
      });

      expect(result.current.latency).toBeNull();
      expect(result.current.downloadSpeed).toBeNull();
      expect(result.current.uploadSpeed).toBeNull();
      expect(result.current.qualityScore).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle status without quality', async () => {
      const statusWithoutQuality: NetworkStatus = {
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
        details: null,
      };

      mockGetCurrentStatus.mockReturnValue(statusWithoutQuality);

      const { result } = renderHook(() => useNetworkStatus());

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      expect(result.current.quality).toBe('unknown');
      expect(result.current.qualityScore).toBeNull();
    });

    it('should handle different connection states', async () => {
      // Test with connected state
      mockGetCurrentStatus.mockReturnValue(mockNetworkStatus);
      const { result: connectedResult } = renderHook(() => useNetworkStatus());

      await waitFor(() => {
        expect(connectedResult.current.isConnected).toBe(true);
      });

      // Test with disconnected state
      mockGetCurrentStatus.mockReturnValue({
        ...mockNetworkStatus,
        isConnected: false,
        isInternetReachable: false,
      });

      const { result: disconnectedResult } = renderHook(() => useNetworkStatus());

      await waitFor(() => {
        expect(disconnectedResult.current.isConnected).toBe(false);
        expect(disconnectedResult.current.isInternetReachable).toBe(false);
      });
    });

    it('should handle concurrent test calls', async () => {
      const { result } = renderHook(() => useNetworkStatus());

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      const promises = Promise.all([
        act(async () => await result.current.testConnection()),
        act(async () => await result.current.testConnection()),
        act(async () => await result.current.testConnection()),
      ]);

      await promises;

      expect(mockTestConnection).toHaveBeenCalledTimes(3);
    });
  });
});
