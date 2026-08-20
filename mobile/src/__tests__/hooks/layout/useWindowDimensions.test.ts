/**
 * Comprehensive Tests for useWindowDimensions Hook
 * Tests window dimensions tracking and orientation detection
 *
 * Test Coverage:
 * - Initial dimensions and orientation
 * - Dimension changes (rotation)
 * - Event listener cleanup
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

// Import after mocks
import { renderHook, act } from '@testing-library/react-native';
import { Dimensions } from 'react-native';
import { useWindowDimensions } from '../../../hooks/useWindowDimensions';

describe('useWindowDimensions Hook', () => {
  let mockAddEventListener: jest.SpyInstance;
  let mockGet: jest.SpyInstance;
  let dimensionsChangeCallback: ((event: { window: any }) => void) | null = null;

  beforeEach(() => {
    jest.clearAllMocks();
    dimensionsChangeCallback = null;

    // Setup spies on existing Dimensions mock
    mockGet = jest.spyOn(Dimensions, 'get').mockReturnValue({
      width: 375,
      height: 812,
      scale: 2,
      fontScale: 1,
    });

    mockAddEventListener = jest.spyOn(Dimensions, 'addEventListener').mockImplementation((_event: string, callback: any) => {
      dimensionsChangeCallback = callback;
      return {
        remove: jest.fn(() => {
          dimensionsChangeCallback = null;
        }),
      };
    });
  });

  afterEach(() => {
    mockAddEventListener.mockRestore();
    mockGet.mockRestore();
  });

  // ============================================
  // Initial Dimensions Test (1 test)
  // ============================================

  it('should return initial dimensions with orientation helpers', () => {
    const { result } = renderHook(() => useWindowDimensions());

    // Verify Dimensions.get was called
    expect(mockGet).toHaveBeenCalledWith('window');

    // Verify dimensions
    expect(result.current.width).toBe(375);
    expect(result.current.height).toBe(812);
    expect(result.current.scale).toBe(2);
    expect(result.current.fontScale).toBe(1);

    // Verify orientation helpers (portrait)
    expect(result.current.isPortrait).toBe(true);
    expect(result.current.isLandscape).toBe(false);

    // Verify aspect ratio (width / height)
    expect(result.current.aspectRatio).toBeCloseTo(375 / 812, 5);

    // Verify addEventListener was called
    expect(mockAddEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  // ============================================
  // Dimension Changes Test (1 test)
  // ============================================

  it('should update dimensions when window size changes', () => {
    const { result } = renderHook(() => useWindowDimensions());

    // Initial state (portrait)
    expect(result.current.isPortrait).toBe(true);
    expect(result.current.isLandscape).toBe(false);
    expect(result.current.width).toBe(375);
    expect(result.current.height).toBe(812);

    // Simulate rotation to landscape
    act(() => {
      if (dimensionsChangeCallback) {
        dimensionsChangeCallback({
          window: {
            width: 812,
            height: 375,
            scale: 2,
            fontScale: 1,
          },
        });
      }
    });

    // Verify dimensions updated
    expect(result.current.width).toBe(812);
    expect(result.current.height).toBe(375);

    // Verify orientation helpers updated (landscape)
    expect(result.current.isLandscape).toBe(true);
    expect(result.current.isPortrait).toBe(false);

    // Verify aspect ratio updated
    expect(result.current.aspectRatio).toBeCloseTo(812 / 375, 5);
  });

  // ============================================
  // Cleanup Test (1 test)
  // ============================================

  it('should remove event listener on unmount', () => {
    const removeMock = jest.fn();

    mockAddEventListener.mockReturnValueOnce({
      remove: removeMock,
    });

    const { unmount } = renderHook(() => useWindowDimensions());

    // Verify listener was added
    expect(mockAddEventListener).toHaveBeenCalled();

    // Unmount the hook
    unmount();

    // Verify listener was removed
    expect(removeMock).toHaveBeenCalled();
  });
});
