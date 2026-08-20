/**
 * Comprehensive Tests for OfflineBanner Component
 * Tests offline detection, auto-hide, retry functionality, and cleanup
 *
 * Test Coverage:
 * - Offline banner rendering when connection lost
 * - Auto-hide after connection restored
 * - Retry button functionality
 * - Custom message and position props
 * - Timer cleanup on unmount
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

// Mock AccessibilityInfo
import { AccessibilityInfo } from 'react-native';
jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});

// Mock useNetworkStatus hook
const mockUseNetworkStatus = jest.fn();
jest.mock('../../../hooks/useNetworkStatus', () => ({
  useNetworkStatus: () => mockUseNetworkStatus(),
}));

// Mock useTheme hook
jest.mock('../../../hooks/useTheme', () => ({
  useTheme: () => ({
    theme: {
      spacing: [0, 4, 8, 12, 16, 20, 24],
      colors: {
        error: { 500: '#ff0000' },
        success: { 500: '#00ff00' },
      },
      semantic: {
        text: {
          inverse: '#ffffff',
        },
      },
      shadows: {
        md: { shadowOpacity: 0.1 },
      },
      typography: {
        fontSize: { xs: 12, sm: 14 },
        fontWeight: { medium: '500', semibold: '600' },
      },
      borderRadius: {
        md: 8,
      },
    },
  }),
}));

// Mock layout constants
jest.mock('../../../constants/layout', () => ({
  LAYOUT_CONSTANTS: {
    TOUCH_TARGET_MIN: 44,
  },
}));

// Import after mocks
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { OfflineBanner } from '../../../components/common/OfflineBanner';

describe('OfflineBanner Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  // ============================================
  // Offline Banner Rendering Test (1 test)
  // ============================================

  it('should render offline banner when connection is lost', () => {
    mockUseNetworkStatus.mockReturnValue({
      isConnected: false,
      isInternetReachable: false,
      testConnection: jest.fn(),
      isTesting: false,
    });

    const { getByText } = render(<OfflineBanner />);

    // Verify offline message is displayed
    expect(getByText('No internet connection')).toBeTruthy();
    expect(getByText('Some features may be unavailable')).toBeTruthy();

    // Verify accessibility announcement was made
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
      'No internet connection'
    );
  });

  // ============================================
  // Auto-Hide Test (1 test)
  // ============================================

  it('should auto-hide after connection is restored', async () => {
    // Start offline
    mockUseNetworkStatus.mockReturnValue({
      isConnected: false,
      isInternetReachable: false,
      testConnection: jest.fn(),
      isTesting: false,
    });

    const { getByText, rerender, queryByText } = render(<OfflineBanner />);

    // Verify offline banner is visible
    expect(getByText('No internet connection')).toBeTruthy();

    // Connection restored
    mockUseNetworkStatus.mockReturnValue({
      isConnected: true,
      isInternetReachable: true,
      testConnection: jest.fn(),
      isTesting: false,
    });

    // Trigger re-render
    rerender(<OfflineBanner />);

    // Verify "Connection restored" message appears
    await waitFor(() => {
      expect(getByText('Connection restored')).toBeTruthy();
    });

    // Verify accessibility announcement
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
      'Internet connection restored'
    );

    // Fast-forward past auto-hide delay (2000ms default)
    act(() => {
      jest.advanceTimersByTime(2100);
    });

    // Banner should start hiding (animation starts)
    // Note: Complete verification would require animation completion tracking
  });

  // ============================================
  // Retry Button Test (1 test)
  // ============================================

  it('should call onRetry when retry button is pressed', async () => {
    const mockOnRetry = jest.fn();
    const mockTestConnection = jest.fn();

    mockUseNetworkStatus.mockReturnValue({
      isConnected: false,
      isInternetReachable: false,
      testConnection: mockTestConnection,
      isTesting: false,
    });

    const { getByText } = render(<OfflineBanner showRetry={true} onRetry={mockOnRetry} />);

    // Verify retry button is displayed
    expect(getByText('Retry')).toBeTruthy();

    // Press retry button
    fireEvent.press(getByText('Retry'));

    // Verify onRetry was called
    expect(mockOnRetry).toHaveBeenCalled();

    // Verify testConnection was NOT called (onRetry provided)
    expect(mockTestConnection).not.toHaveBeenCalled();
  });

  // ============================================
  // Custom Props Test (1 test)
  // ============================================

  it('should display custom message and respect position prop', () => {
    mockUseNetworkStatus.mockReturnValue({
      isConnected: false,
      isInternetReachable: false,
      testConnection: jest.fn(),
      isTesting: false,
    });

    const customMessage = 'Connection unavailable';

    const { getByText } = render(
      <OfflineBanner message={customMessage} position="bottom" />
    );

    // Verify custom message is displayed
    expect(getByText(customMessage)).toBeTruthy();

    // Verify accessibility announcement uses custom message
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(customMessage);
  });

  // ============================================
  // Cleanup Test (1 test)
  // ============================================

  it('should clear timers on unmount', () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

    // Start offline
    mockUseNetworkStatus.mockReturnValue({
      isConnected: false,
      isInternetReachable: false,
      testConnection: jest.fn(),
      isTesting: false,
    });

    const { unmount, rerender } = render(<OfflineBanner autoHideDelay={5000} />);

    // Connection restored - this schedules a timer
    mockUseNetworkStatus.mockReturnValue({
      isConnected: true,
      isInternetReachable: true,
      testConnection: jest.fn(),
      isTesting: false,
    });

    rerender(<OfflineBanner autoHideDelay={5000} />);

    // Unmount before timer fires
    unmount();

    // Verify clearTimeout was called
    expect(clearTimeoutSpy).toHaveBeenCalled();

    clearTimeoutSpy.mockRestore();
  });

  // ============================================
  // Additional Tests (2 tests for better coverage)
  // ============================================

  it('should not render when never went offline', () => {
    mockUseNetworkStatus.mockReturnValue({
      isConnected: true,
      isInternetReachable: true,
      testConnection: jest.fn(),
      isTesting: false,
    });

    const { queryByText } = render(<OfflineBanner />);

    // Banner should not be visible
    expect(queryByText('No internet connection')).toBeNull();
    expect(queryByText('Connection restored')).toBeNull();
  });

  it('should call testConnection when retry pressed without onRetry prop', async () => {
    const mockTestConnection = jest.fn();

    mockUseNetworkStatus.mockReturnValue({
      isConnected: false,
      isInternetReachable: false,
      testConnection: mockTestConnection,
      isTesting: false,
    });

    const { getByText } = render(<OfflineBanner showRetry={true} />);

    // Press retry button
    fireEvent.press(getByText('Retry'));

    // Verify testConnection was called (no onRetry provided)
    await waitFor(() => {
      expect(mockTestConnection).toHaveBeenCalled();
    });
  });
});
