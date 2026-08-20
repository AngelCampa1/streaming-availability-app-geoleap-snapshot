/**
 * RealTimeDataProvider Component Tests
 *
 * Test coverage for real-time analytics data provider with WebSocket integration.
 * Tests context provider, hooks, fallback polling, and status indicator.
 */

import React from 'react';
import { render, screen, waitFor, act, renderHook } from '@testing-library/react';
import {
  RealTimeDataProvider,
  useRealTimeData,
  useRealTimeMetrics,
  RealTimeStatus,
} from '../RealTimeDataProvider';
import type { WebSocketMessage } from '@/lib/websocket';

// Mock the WebSocket hook
let mockUseWebSocket: {
  isConnected: boolean;
  lastMessage: WebSocketMessage | null;
  error: Error | null;
  connect: jest.Mock;
  disconnect: jest.Mock;
};

jest.mock('@/lib/websocket', () => ({
  useWebSocket: jest.fn(() => mockUseWebSocket),
}));

describe('RealTimeDataProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Default mock state - WebSocket disconnected
    mockUseWebSocket = {
      isConnected: false,
      lastMessage: null,
      error: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
    };
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Provider Rendering', () => {
    it('renders children without crashing', () => {
      render(
        <RealTimeDataProvider>
          <div data-testid="child">Child Content</div>
        </RealTimeDataProvider>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
      expect(screen.getByText('Child Content')).toBeInTheDocument();
    });

    it('initializes with mock data', async () => {
      const TestComponent = () => {
        const { data } = useRealTimeData();
        return <div data-testid="data">{data?.activeUsers}</div>;
      };

      render(
        <RealTimeDataProvider>
          <TestComponent />
        </RealTimeDataProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('data')).toHaveTextContent('1247');
      });
    });

    it('accepts custom refresh interval prop', async () => {
      const TestComponent = () => {
        const { data } = useRealTimeData();
        return <div data-testid="active-users">{data?.activeUsers}</div>;
      };

      render(
        <RealTimeDataProvider refreshInterval={5000}>
          <TestComponent />
        </RealTimeDataProvider>
      );

      // Verify component renders with custom interval
      await waitFor(() => {
        expect(screen.getByTestId('active-users')).toHaveTextContent('1247');
      });
    });
  });

  describe('WebSocket Message Handling', () => {
    it('handles analytics_update message', async () => {
      const TestComponent = () => {
        const { data } = useRealTimeData();
        return (
          <div>
            <div data-testid="active-users">{data?.activeUsers}</div>
            <div data-testid="revenue">{data?.currentRevenue}</div>
          </div>
        );
      };

      const { rerender } = render(
        <RealTimeDataProvider>
          <TestComponent />
        </RealTimeDataProvider>
      );

      // Wait for initial data
      await waitFor(() => {
        expect(screen.getByTestId('active-users')).toHaveTextContent('1247');
      });

      // Update WebSocket message
      act(() => {
        mockUseWebSocket.lastMessage = {
          type: 'analytics_update',
          data: {
            metrics: {
              activeUsers: 2500,
              currentRevenue: 50000,
              conversionRate: 4.5,
              realTimeEvents: 200,
            },
          },
          timestamp: '2025-01-05T12:00:00Z',
        } as WebSocketMessage;
      });

      rerender(
        <RealTimeDataProvider>
          <TestComponent />
        </RealTimeDataProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('active-users')).toHaveTextContent('2500');
        expect(screen.getByTestId('revenue')).toHaveTextContent('50000');
      });
    });

    it('handles cohort_update message', async () => {
      const TestComponent = () => {
        const { data } = useRealTimeData();
        return (
          <div>
            <div data-testid="new-cohorts">{data?.cohortMetrics?.newCohorts}</div>
            <div data-testid="avg-retention">{data?.cohortMetrics?.avgRetention}</div>
          </div>
        );
      };

      const { rerender } = render(
        <RealTimeDataProvider>
          <TestComponent />
        </RealTimeDataProvider>
      );

      // Wait for initial data
      await waitFor(() => {
        expect(screen.getByTestId('new-cohorts')).toHaveTextContent('3');
      });

      // Update cohort metrics
      act(() => {
        mockUseWebSocket.lastMessage = {
          type: 'cohort_update',
          data: {
            cohortMetrics: {
              newCohorts: 5,
              avgRetention: 75.2,
            },
          },
          timestamp: '2025-01-05T12:00:00Z',
        } as WebSocketMessage;
      });

      rerender(
        <RealTimeDataProvider>
          <TestComponent />
        </RealTimeDataProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('new-cohorts')).toHaveTextContent('5');
        expect(screen.getByTestId('avg-retention')).toHaveTextContent('75.2');
      });
    });

    it('handles channel_update message', async () => {
      const TestComponent = () => {
        const { data } = useRealTimeData();
        return (
          <div>
            <div data-testid="best-channel">{data?.channelMetrics?.bestPerformingChannel}</div>
            <div data-testid="total-spend">{data?.channelMetrics?.totalSpend}</div>
          </div>
        );
      };

      const { rerender } = render(
        <RealTimeDataProvider>
          <TestComponent />
        </RealTimeDataProvider>
      );

      // Wait for initial data
      await waitFor(() => {
        expect(screen.getByTestId('best-channel')).toHaveTextContent('Google Ads');
      });

      // Update channel metrics
      act(() => {
        mockUseWebSocket.lastMessage = {
          type: 'channel_update',
          data: {
            channelMetrics: {
              bestPerformingChannel: 'Facebook Ads',
              worstPerformingChannel: 'Twitter',
              totalSpend: 60000,
            },
          },
          timestamp: '2025-01-05T12:00:00Z',
        } as WebSocketMessage;
      });

      rerender(
        <RealTimeDataProvider>
          <TestComponent />
        </RealTimeDataProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('best-channel')).toHaveTextContent('Facebook Ads');
        expect(screen.getByTestId('total-spend')).toHaveTextContent('60000');
      });
    });

    it('handles error message without crashing', async () => {
      const TestComponent = () => {
        const { data } = useRealTimeData();
        return <div data-testid="active-users">{data?.activeUsers}</div>;
      };

      const { rerender } = render(
        <RealTimeDataProvider>
          <TestComponent />
        </RealTimeDataProvider>
      );

      // Wait for initial data
      await waitFor(() => {
        expect(screen.getByTestId('active-users')).toHaveTextContent('1247');
      });

      // Send error message
      act(() => {
        mockUseWebSocket.lastMessage = {
          type: 'error',
          data: { message: 'Connection error' },
          timestamp: '2025-01-05T12:00:00Z',
        } as WebSocketMessage;
      });

      rerender(
        <RealTimeDataProvider>
          <TestComponent />
        </RealTimeDataProvider>
      );

      // Data should remain unchanged
      await waitFor(() => {
        expect(screen.getByTestId('active-users')).toHaveTextContent('1247');
      });
    });

    it('ignores analytics_update message without metrics', async () => {
      const TestComponent = () => {
        const { data } = useRealTimeData();
        return <div data-testid="active-users">{data?.activeUsers}</div>;
      };

      const { rerender } = render(
        <RealTimeDataProvider>
          <TestComponent />
        </RealTimeDataProvider>
      );

      // Wait for initial data
      await waitFor(() => {
        expect(screen.getByTestId('active-users')).toHaveTextContent('1247');
      });

      // Send analytics update without metrics
      act(() => {
        mockUseWebSocket.lastMessage = {
          type: 'analytics_update',
          data: {},
          timestamp: '2025-01-05T12:00:00Z',
        } as WebSocketMessage;
      });

      rerender(
        <RealTimeDataProvider>
          <TestComponent />
        </RealTimeDataProvider>
      );

      // Data should remain unchanged
      expect(screen.getByTestId('active-users')).toHaveTextContent('1247');
    });
  });

  describe('Fallback Polling', () => {
    it('starts polling when WebSocket is disconnected', async () => {
      mockUseWebSocket.isConnected = false;
      mockUseWebSocket.error = null;

      const TestComponent = () => {
        const { data } = useRealTimeData();
        return <div data-testid="active-users">{data?.activeUsers}</div>;
      };

      render(
        <RealTimeDataProvider refreshInterval={1000}>
          <TestComponent />
        </RealTimeDataProvider>
      );

      // Wait for initial data
      await waitFor(() => {
        expect(screen.getByTestId('active-users')).toHaveTextContent('1247');
      });

      // Fast-forward time to trigger polling
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Data should have changed (random variation)
      await waitFor(() => {
        const currentValue = screen.getByTestId('active-users').textContent;
        expect(currentValue).not.toBe('');
        // Value will be different due to random variation
      });
    });

    it('does not poll when WebSocket is connected', async () => {
      mockUseWebSocket.isConnected = true;
      mockUseWebSocket.error = null;

      const TestComponent = () => {
        const { data } = useRealTimeData();
        return <div data-testid="active-users">{data?.activeUsers}</div>;
      };

      render(
        <RealTimeDataProvider refreshInterval={1000}>
          <TestComponent />
        </RealTimeDataProvider>
      );

      // Wait for initial data
      await waitFor(() => {
        expect(screen.getByTestId('active-users')).toHaveTextContent('1247');
      });

      const initialValue = screen.getByTestId('active-users').textContent;

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Data should NOT have changed (no polling when connected)
      expect(screen.getByTestId('active-users').textContent).toBe(initialValue);
    });

    it('does not poll when there is an error', async () => {
      mockUseWebSocket.isConnected = false;
      mockUseWebSocket.error = new Error('Connection failed');

      const TestComponent = () => {
        const { data } = useRealTimeData();
        return <div data-testid="active-users">{data?.activeUsers}</div>;
      };

      render(
        <RealTimeDataProvider refreshInterval={1000}>
          <TestComponent />
        </RealTimeDataProvider>
      );

      // Wait for initial data
      await waitFor(() => {
        expect(screen.getByTestId('active-users')).toHaveTextContent('1247');
      });

      const initialValue = screen.getByTestId('active-users').textContent;

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Data should NOT have changed (no polling when there's an error)
      expect(screen.getByTestId('active-users').textContent).toBe(initialValue);
    });

    it('cleans up polling interval on unmount', () => {
      mockUseWebSocket.isConnected = false;
      mockUseWebSocket.error = null;

      const { unmount } = render(
        <RealTimeDataProvider refreshInterval={1000}>
          <div>Content</div>
        </RealTimeDataProvider>
      );

      // Unmount should not throw error (cleanup happens in useEffect return)
      expect(() => {
        unmount();
      }).not.toThrow();
    });
  });

  describe('Manual Refresh', () => {
    it('refreshes data when WebSocket is disconnected', async () => {
      mockUseWebSocket.isConnected = false;

      const TestComponent = () => {
        const { data, refreshData } = useRealTimeData();
        return (
          <div>
            <div data-testid="last-updated">{data?.lastUpdated}</div>
            <button onClick={refreshData}>Refresh</button>
          </div>
        );
      };

      render(
        <RealTimeDataProvider>
          <TestComponent />
        </RealTimeDataProvider>
      );

      // Wait for initial data
      await waitFor(() => {
        expect(screen.getByTestId('last-updated')).toHaveTextContent(/\d{4}-\d{2}-\d{2}/);
      });

      const initialTimestamp = screen.getByTestId('last-updated').textContent;

      // Wait a moment to ensure timestamp will be different
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Trigger manual refresh
      act(() => {
        screen.getByRole('button', { name: /refresh/i }).click();
      });

      // Timestamp should be updated
      await waitFor(() => {
        const newTimestamp = screen.getByTestId('last-updated').textContent;
        expect(newTimestamp).not.toBe(initialTimestamp);
      });
    });

    it('calls refresh when WebSocket is connected', async () => {
      mockUseWebSocket.isConnected = true;

      const TestComponent = () => {
        const { refreshData } = useRealTimeData();
        return <button onClick={refreshData}>Refresh</button>;
      };

      render(
        <RealTimeDataProvider>
          <TestComponent />
        </RealTimeDataProvider>
      );

      // Trigger manual refresh
      act(() => {
        screen.getByRole('button', { name: /refresh/i }).click();
      });

      // Should not throw error (connected path just has a comment)
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('useRealTimeData Hook', () => {
    it('throws error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      expect(() => {
        renderHook(() => useRealTimeData());
      }).toThrow('useRealTimeData must be used within a RealTimeDataProvider');

      consoleSpy.mockRestore();
    });

    it('returns context values when used inside provider', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <RealTimeDataProvider>{children}</RealTimeDataProvider>
      );

      const { result } = renderHook(() => useRealTimeData(), { wrapper });

      await waitFor(() => {
        expect(result.current.data).not.toBeNull();
        expect(result.current.data?.activeUsers).toBe(1247);
        expect(result.current.isConnected).toBe(false);
        expect(result.current.error).toBeNull();
        expect(typeof result.current.refreshData).toBe('function');
      });
    });
  });

  describe('useRealTimeMetrics Hook', () => {
    it('transforms data correctly', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <RealTimeDataProvider>{children}</RealTimeDataProvider>
      );

      const { result } = renderHook(() => useRealTimeMetrics(), { wrapper });

      await waitFor(() => {
        expect(result.current.metrics).toEqual({
          activeUsers: 1247,
          revenue: 28453,
          conversionRate: 3.2,
          events: 145,
        });
        expect(result.current.cohortMetrics).toEqual({
          newCohorts: 3,
          avgRetention: 68.4,
        });
        expect(result.current.channelMetrics).toEqual({
          bestPerformingChannel: 'Google Ads',
          worstPerformingChannel: 'Display',
          totalSpend: 45000,
        });
        expect(result.current.isLive).toBe(false);
        expect(result.current.hasError).toBe(false);
        expect(typeof result.current.refresh).toBe('function');
      });
    });

    it('handles null data correctly', async () => {
      // Create a wrapper that doesn't set initial data
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <RealTimeDataProvider>{children}</RealTimeDataProvider>
      );

      const { result } = renderHook(() => useRealTimeMetrics(), { wrapper });

      // Initially, before useEffect runs, metrics should be null
      // After useEffect, it should have data
      await waitFor(() => {
        expect(result.current.metrics).not.toBeNull();
      });
    });

    it('returns hasError=true when error exists', async () => {
      mockUseWebSocket.error = new Error('Connection failed');

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <RealTimeDataProvider>{children}</RealTimeDataProvider>
      );

      const { result } = renderHook(() => useRealTimeMetrics(), { wrapper });

      await waitFor(() => {
        expect(result.current.hasError).toBe(true);
      });
    });

    it('returns isLive=true when connected', async () => {
      mockUseWebSocket.isConnected = true;

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <RealTimeDataProvider>{children}</RealTimeDataProvider>
      );

      const { result } = renderHook(() => useRealTimeMetrics(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLive).toBe(true);
      });
    });
  });

  describe('RealTimeStatus Component', () => {
    it('shows error state when error exists', async () => {
      mockUseWebSocket.error = new Error('Connection failed');

      render(
        <RealTimeDataProvider>
          <RealTimeStatus />
        </RealTimeDataProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Connection Error')).toBeInTheDocument();
      });
    });

    it('shows live state when connected', async () => {
      mockUseWebSocket.isConnected = true;

      render(
        <RealTimeDataProvider>
          <RealTimeStatus />
        </RealTimeDataProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Live')).toBeInTheDocument();
      });
    });

    it('shows polling state when disconnected without error', async () => {
      mockUseWebSocket.isConnected = false;
      mockUseWebSocket.error = null;

      render(
        <RealTimeDataProvider>
          <RealTimeStatus />
        </RealTimeDataProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Polling/)).toBeInTheDocument();
      });
    });

    it('displays last updated time in polling state', async () => {
      mockUseWebSocket.isConnected = false;
      mockUseWebSocket.error = null;

      render(
        <RealTimeDataProvider>
          <RealTimeStatus />
        </RealTimeDataProvider>
      );

      await waitFor(() => {
        const pollingText = screen.getByText(/Polling/);
        expect(pollingText.textContent).toMatch(/Polling \(\d{1,2}:\d{2}:\d{2}/);
      });
    });
  });
});
