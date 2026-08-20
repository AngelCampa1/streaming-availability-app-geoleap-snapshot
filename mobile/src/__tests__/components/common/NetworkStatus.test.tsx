/**
 * Comprehensive Tests for NetworkStatus Component
 * Tests network status display, auto-hide, tap-to-refresh, and variants
 *
 * Test Coverage:
 * - Status indicator rendering with different connection states
 * - Auto-hide behavior when connection is good
 * - Tap-to-refresh functionality
 * - Expansion/collapse when showDetails enabled
 * - onStatusChange callback execution
 * - Badge and quality indicator variants
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

// Mock react-native-vector-icons
jest.mock('react-native-vector-icons/MaterialIcons', () => 'Icon');

// Mock Alert
import { Alert } from 'react-native';
jest.spyOn(Alert, 'alert');

// Mock useNetworkStatus hook
const mockUseNetworkStatus = jest.fn();
jest.mock('../../../hooks/useNetworkStatus', () => ({
  useNetworkStatus: (options?: any) => {
    const result = mockUseNetworkStatus();
    // Call the onStatusChange callback if provided
    if (options?.onStatusChange) {
      options.onStatusChange(result);
    }
    return result;
  },
}));

// Mock useTheme hook
jest.mock('../../../hooks/useTheme', () => ({
  useTheme: () => ({
    semantic: {
      status: {
        error: '#ff0000',
        warning: '#ffaa00',
        success: '#00ff00',
      },
      text: {
        primary: '#000000',
        secondary: '#666666',
      },
      background: {
        secondary: '#f5f5f5',
      },
      border: {
        primary: '#cccccc',
      },
    },
  }),
}));

// Import after mocks
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { NetworkStatus, NetworkStatusBadge, NetworkQualityIndicator } from '../../../components/common/NetworkStatus';

describe('NetworkStatus Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (Alert.alert as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  // ============================================
  // Status Rendering Tests (2 tests)
  // ============================================

  it('should render offline status with correct styling', () => {
    mockUseNetworkStatus.mockReturnValue({
      isConnected: false,
      connectionType: 'none',
      quality: 'unknown',
      latency: null,
      downloadSpeed: null,
      uploadSpeed: null,
      isInternetReachable: false,
      testConnection: jest.fn(),
    });

    const { getByText } = render(<NetworkStatus />);

    // Verify offline message is displayed
    expect(getByText('No Connection')).toBeTruthy();
    expect(getByText(/You are currently offline/)).toBeTruthy();
  });

  it('should render online status with quality indicators', () => {
    mockUseNetworkStatus.mockReturnValue({
      isConnected: true,
      connectionType: 'wifi',
      quality: 'excellent',
      latency: 20,
      downloadSpeed: 50,
      uploadSpeed: 10,
      isInternetReachable: true,
      testConnection: jest.fn(),
    });

    const { getByText } = render(<NetworkStatus />);

    // Verify online message is displayed
    expect(getByText('Excellent Connection')).toBeTruthy();
    expect(getByText(/Fast and stable connection/)).toBeTruthy();
  });

  // ============================================
  // Auto-Hide Test (1 test)
  // ============================================

  it('should auto-hide indicator after 5 seconds when connection is good', async () => {
    mockUseNetworkStatus.mockReturnValue({
      isConnected: true,
      connectionType: 'wifi',
      quality: 'good',
      latency: 30,
      downloadSpeed: 25,
      uploadSpeed: 5,
      isInternetReachable: true,
      testConnection: jest.fn(),
    });

    const { queryByText, rerender } = render(<NetworkStatus />);

    // Initially visible
    expect(queryByText('Good Connection')).toBeTruthy();

    // Fast-forward 5 seconds
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    // Force re-render to apply state changes
    rerender(<NetworkStatus />);

    // Should be hidden (component returns null)
    await waitFor(() => {
      expect(queryByText('Good Connection')).toBeNull();
    });
  });

  // ============================================
  // Tap-to-Refresh Test (1 test)
  // ============================================

  it('should call testConnection when tapped while offline', async () => {
    const mockTestConnection = jest.fn().mockResolvedValue(false);

    mockUseNetworkStatus.mockReturnValue({
      isConnected: false,
      connectionType: 'none',
      quality: 'unknown',
      latency: null,
      downloadSpeed: null,
      uploadSpeed: null,
      isInternetReachable: false,
      testConnection: mockTestConnection,
    });

    const { getByText } = render(<NetworkStatus allowTapToRefresh={true} />);

    // Tap the offline indicator
    fireEvent.press(getByText('No Connection'));

    // Wait for testConnection to be called
    await waitFor(() => {
      expect(mockTestConnection).toHaveBeenCalled();
    });

    // Verify alert was shown for failed connection
    expect(Alert.alert).toHaveBeenCalledWith(
      'Connection Issue',
      expect.any(String),
      expect.any(Array),
    );
  });

  // ============================================
  // Expansion/Collapse Test (1 test)
  // ============================================

  it('should expand/collapse details when showDetails enabled', () => {
    mockUseNetworkStatus.mockReturnValue({
      isConnected: true,
      connectionType: 'wifi',
      quality: 'excellent',
      latency: 15,
      downloadSpeed: 100,
      uploadSpeed: 50,
      isInternetReachable: true,
      testConnection: jest.fn(),
    });

    const { getByText, queryByText } = render(<NetworkStatus showDetails={true} />);

    // Initially collapsed (details not shown)
    expect(queryByText('Type')).toBeNull();

    // Tap to expand
    fireEvent.press(getByText('Excellent Connection'));

    // Details should now be visible
    expect(getByText('Type')).toBeTruthy();
    expect(getByText('wifi')).toBeTruthy();
    expect(getByText('Latency')).toBeTruthy();
    expect(getByText('15ms')).toBeTruthy();
  });

  // ============================================
  // Callback Test (1 test)
  // ============================================

  it('should call onStatusChange callback when status updates', () => {
    const mockOnStatusChange = jest.fn();

    mockUseNetworkStatus.mockReturnValue({
      isConnected: true,
      connectionType: 'wifi',
      quality: 'good',
      latency: 25,
      downloadSpeed: 40,
      uploadSpeed: 10,
      isInternetReachable: true,
      testConnection: jest.fn(),
    });

    render(<NetworkStatus onStatusChange={mockOnStatusChange} />);

    // Verify callback was called with correct status
    expect(mockOnStatusChange).toHaveBeenCalledWith(true, 'good');
  });
});

describe('NetworkStatusBadge Component', () => {
  it('should render offline badge', () => {
    mockUseNetworkStatus.mockReturnValue({
      isConnected: false,
      quality: 'unknown',
    });

    const { getByText } = render(<NetworkStatusBadge />);

    expect(getByText('Offline')).toBeTruthy();
  });

  it('should render online badge', () => {
    mockUseNetworkStatus.mockReturnValue({
      isConnected: true,
      quality: 'good',
    });

    const { getByText } = render(<NetworkStatusBadge />);

    expect(getByText('Online')).toBeTruthy();
  });

  it('should render slow badge for poor quality', () => {
    mockUseNetworkStatus.mockReturnValue({
      isConnected: true,
      quality: 'poor',
    });

    const { getByText } = render(<NetworkStatusBadge />);

    expect(getByText('Slow')).toBeTruthy();
  });
});

describe('NetworkQualityIndicator Component', () => {
  it('should not render when offline', () => {
    mockUseNetworkStatus.mockReturnValue({
      isConnected: false,
      quality: 'unknown',
    });

    const { queryByText } = render(<NetworkQualityIndicator />);

    // Component should return null - verify by checking no quality labels exist
    expect(queryByText('Excellent')).toBeNull();
    expect(queryByText('Good')).toBeNull();
    expect(queryByText('Fair')).toBeNull();
    expect(queryByText('Poor')).toBeNull();
  });

  it('should render quality label when online', () => {
    mockUseNetworkStatus.mockReturnValue({
      isConnected: true,
      quality: 'excellent',
    });

    const { getByText } = render(<NetworkQualityIndicator />);

    expect(getByText('Excellent')).toBeTruthy();
  });
});
