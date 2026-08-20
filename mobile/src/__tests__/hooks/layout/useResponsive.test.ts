/**
 * useResponsive Hook Tests
 * Day 5 Continuation - Simple Utility Hooks
 *
 * Tests for responsive design hooks (useWindowDimensions, useOrientation)
 */

import { renderHook, act } from '@testing-library/react-native';
import { Dimensions } from 'react-native';
import {
  useWindowDimensions,
  useOrientation,
  useIsTablet,
  useScaledSize,
} from '../../../hooks/useResponsive';

// Mock Dimensions with default implementation
jest.mock('react-native', () => ({
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 812, scale: 2, fontScale: 1 })),
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
  PixelRatio: {
    roundToNearestPixel: jest.fn((value: number) => Math.round(value)),
  },
  Platform: {
    OS: 'ios',
  },
}));

// Mock utils/responsive functions
jest.mock('../../../utils/responsive', () => ({
  getBreakpoint: jest.fn(() => 'sm'),
  isTablet: jest.fn(() => false),
  isSmallDevice: jest.fn(() => true),
  isLargeDevice: jest.fn(() => false),
  isLandscape: jest.fn(() => false),
  isPortrait: jest.fn(() => true),
  getResponsiveValue: jest.fn((values) => values.sm ?? values.default),
  getSafePadding: jest.fn(() => ({ top: 44, bottom: 34, left: 0, right: 0 })),
}));

const mockDimensions = Dimensions as jest.Mocked<typeof Dimensions>;
const mockUtils = jest.requireMock('../../../utils/responsive');

describe('useWindowDimensions', () => {
  beforeEach(() => {
    mockDimensions.get.mockClear();
    mockDimensions.addEventListener.mockClear();
  });

  it('should return current window dimensions', () => {
    mockDimensions.get.mockImplementation(() => ({ width: 414, height: 896, scale: 2, fontScale: 1 }));

    const { result } = renderHook(() => useWindowDimensions());

    expect(result.current.width).toBe(414);
    expect(result.current.height).toBe(896);
  });

  it('should update dimensions when window size changes', () => {
    let changeHandler: ((dims: { window: { width: number; height: number; scale: number; fontScale: number } }) => void) | null = null;

    mockDimensions.get.mockImplementation(() => ({ width: 375, height: 667, scale: 2, fontScale: 1 }));
    mockDimensions.addEventListener.mockImplementation((_event, handler) => {
      changeHandler = handler as typeof changeHandler;
      return { remove: jest.fn() };
    });

    const { result } = renderHook(() => useWindowDimensions());

    expect(result.current.width).toBe(375);
    expect(result.current.height).toBe(667);

    // Simulate window resize
    act(() => {
      if (changeHandler) {
        changeHandler({ window: { width: 768, height: 1024, scale: 2, fontScale: 1 } });
      }
    });

    expect(result.current.width).toBe(768);
    expect(result.current.height).toBe(1024);
  });

  it('should clean up event listener on unmount', () => {
    const removeMock = jest.fn();
    mockDimensions.get.mockImplementation(() => ({ width: 375, height: 812, scale: 2, fontScale: 1 }));
    mockDimensions.addEventListener.mockImplementation(() => ({ remove: removeMock }));

    const { unmount } = renderHook(() => useWindowDimensions());

    unmount();

    expect(removeMock).toHaveBeenCalled();
  });
});

describe('useOrientation', () => {
  beforeEach(() => {
    mockDimensions.get.mockClear();
    mockDimensions.addEventListener.mockClear();
    mockUtils.isPortrait.mockClear();
    mockUtils.isLandscape.mockClear();
  });

  it('should return portrait for tall screens', () => {
    mockUtils.isPortrait.mockReturnValue(true);
    mockUtils.isLandscape.mockReturnValue(false);

    const { result } = renderHook(() => useOrientation());

    expect(result.current).toBe('portrait');
  });

  it('should return landscape for wide screens', () => {
    mockUtils.isPortrait.mockReturnValue(false);
    mockUtils.isLandscape.mockReturnValue(true);

    const { result } = renderHook(() => useOrientation());

    expect(result.current).toBe('landscape');
  });

  it('should update orientation when dimensions change', () => {
    let changeHandler: (() => void) | null = null;

    mockUtils.isPortrait.mockReturnValueOnce(true).mockReturnValueOnce(false);
    mockUtils.isLandscape.mockReturnValueOnce(false).mockReturnValueOnce(true);
    mockDimensions.addEventListener.mockImplementation((_event, handler) => {
      changeHandler = handler as typeof changeHandler;
      return { remove: jest.fn() };
    });

    const { result } = renderHook(() => useOrientation());

    expect(result.current).toBe('portrait');

    // Simulate rotation to landscape
    act(() => {
      if (changeHandler) {
        changeHandler();
      }
    });

    expect(result.current).toBe('landscape');
  });

  it('should clean up event listener on unmount', () => {
    const removeMock = jest.fn();
    mockUtils.isPortrait.mockReturnValue(true);
    mockDimensions.addEventListener.mockImplementation(() => ({ remove: removeMock }));

    const { unmount } = renderHook(() => useOrientation());

    unmount();

    expect(removeMock).toHaveBeenCalled();
  });
});

describe('useIsTablet', () => {
  beforeEach(() => {
    mockDimensions.get.mockClear();
    mockDimensions.addEventListener.mockClear();
    mockUtils.isTablet.mockClear();
  });

  it('should return false for phone-sized screens', () => {
    mockUtils.isTablet.mockReturnValue(false);

    const { result } = renderHook(() => useIsTablet());

    expect(result.current).toBe(false);
  });

  it('should return true for tablet-sized screens', () => {
    mockUtils.isTablet.mockReturnValue(true);

    const { result } = renderHook(() => useIsTablet());

    expect(result.current).toBe(true);
  });

  it('should update when screen size changes', () => {
    let changeHandler: (() => void) | null = null;

    mockUtils.isTablet.mockReturnValueOnce(false).mockReturnValueOnce(true);
    mockDimensions.addEventListener.mockImplementation((_event, handler) => {
      changeHandler = handler as typeof changeHandler;
      return { remove: jest.fn() };
    });

    const { result } = renderHook(() => useIsTablet());

    expect(result.current).toBe(false);

    // Simulate resize to tablet size
    act(() => {
      if (changeHandler) {
        changeHandler();
      }
    });

    expect(result.current).toBe(true);
  });

  it('should clean up event listener on unmount', () => {
    const removeMock = jest.fn();
    mockUtils.isTablet.mockReturnValue(false);
    mockDimensions.addEventListener.mockImplementation(() => ({ remove: removeMock }));

    const { unmount } = renderHook(() => useIsTablet());

    unmount();

    expect(removeMock).toHaveBeenCalled();
  });
});

describe('useScaledSize', () => {
  beforeEach(() => {
    mockDimensions.get.mockClear();
  });

  it('should scale size based on screen width', () => {
    mockDimensions.get.mockImplementation(() => ({ width: 375, height: 812, scale: 2, fontScale: 1 }));

    const { result } = renderHook(() => useScaledSize(16));

    // Base width is 375, so scaling factor should be 1.0
    // Result: 16 + ((16 * 375 / 375) - 16) * 0.5 = 16 + (16 - 16) * 0.5 = 16
    expect(result.current).toBe(16);
  });

  it('should scale up on larger screens', () => {
    mockDimensions.get.mockImplementation(() => ({ width: 750, height: 1624, scale: 2, fontScale: 1 }));

    const { result } = renderHook(() => useScaledSize(16));

    // Width is 2x base (750 vs 375), so scaling factor is 2.0
    // Result: 16 + ((16 * 750 / 375) - 16) * 0.5 = 16 + (32 - 16) * 0.5 = 16 + 8 = 24
    expect(result.current).toBe(24);
  });

  it('should scale down on smaller screens', () => {
    mockDimensions.get.mockImplementation(() => ({ width: 320, height: 568, scale: 2, fontScale: 1 }));

    const { result } = renderHook(() => useScaledSize(16));

    // Width is smaller than base (320 vs 375), so scaling factor is ~0.853
    // Result: 16 + ((16 * 320 / 375) - 16) * 0.5
    const expected = 16 + ((16 * 320 / 375) - 16) * 0.5;
    expect(result.current).toBeCloseTo(expected, 2);
  });

  it('should use custom scaling factor', () => {
    mockDimensions.get.mockImplementation(() => ({ width: 750, height: 1624, scale: 2, fontScale: 1 }));

    const { result } = renderHook(() => useScaledSize(16, 0.8));

    // Width is 2x base, factor is 0.8 instead of 0.5
    // Result: 16 + ((16 * 750 / 375) - 16) * 0.8 = 16 + (32 - 16) * 0.8 = 16 + 12.8 = 28.8
    expect(result.current).toBeCloseTo(28.8, 1);
  });

  it('should update when window size changes', () => {
    let changeHandler: ((dims: { window: { width: number; height: number; scale: number; fontScale: number } }) => void) | null = null;

    mockDimensions.get.mockImplementation(() => ({ width: 375, height: 812, scale: 2, fontScale: 1 }));
    mockDimensions.addEventListener.mockImplementation((_event, handler) => {
      changeHandler = handler as typeof changeHandler;
      return { remove: jest.fn() };
    });

    const { result } = renderHook(() => useScaledSize(16));

    expect(result.current).toBe(16);

    // Simulate resize to larger screen
    mockDimensions.get.mockImplementation(() => ({ width: 750, height: 1624, scale: 2, fontScale: 1 }));
    act(() => {
      if (changeHandler) {
        changeHandler({ window: { width: 750, height: 1624, scale: 2, fontScale: 1 } });
      }
    });

    expect(result.current).toBe(24);
  });
});
