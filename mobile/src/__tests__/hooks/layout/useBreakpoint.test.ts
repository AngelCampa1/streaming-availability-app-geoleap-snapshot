/**
 * useBreakpoint Hook Tests
 * Day 5 Continuation - Simple Utility Hooks
 *
 * Tests for breakpoint detection and responsive design utilities
 */

import { renderHook, act } from '@testing-library/react-native';
import { Dimensions } from 'react-native';
import {
  useBreakpoint,
  useBreakpointUp,
  useBreakpointDown,
  useBreakpointBetween,
  getCurrentBreakpoint,
} from '../../../hooks/useBreakpoint';

// Mock Dimensions with default implementation
jest.mock('react-native', () => ({
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 667, scale: 2, fontScale: 1 })),
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}));

const mockDimensions = Dimensions as jest.Mocked<typeof Dimensions>;

describe('getCurrentBreakpoint', () => {
  it('should return sm for widths below 414', () => {
    expect(getCurrentBreakpoint(375)).toBe('sm');
    expect(getCurrentBreakpoint(400)).toBe('sm');
  });

  it('should return md for widths 414-767', () => {
    expect(getCurrentBreakpoint(414)).toBe('md');
    expect(getCurrentBreakpoint(600)).toBe('md');
  });

  it('should return lg for widths 768-1023', () => {
    expect(getCurrentBreakpoint(768)).toBe('lg');
    expect(getCurrentBreakpoint(900)).toBe('lg');
  });

  it('should return xl for widths 1024-1279', () => {
    expect(getCurrentBreakpoint(1024)).toBe('xl');
    expect(getCurrentBreakpoint(1200)).toBe('xl');
  });

  it('should return 2xl for widths 1280+', () => {
    expect(getCurrentBreakpoint(1280)).toBe('2xl');
    expect(getCurrentBreakpoint(1920)).toBe('2xl');
  });
});

describe('useBreakpoint', () => {
  beforeEach(() => {
    mockDimensions.get.mockClear();
    mockDimensions.addEventListener.mockClear();
  });

  it('should return current breakpoint based on window width', () => {
    mockDimensions.get.mockImplementation(() => ({ width: 414, height: 896, scale: 2, fontScale: 1 }));

    const { result } = renderHook(() => useBreakpoint());

    expect(result.current).toBe('md');
  });

  it('should update breakpoint when dimensions change', () => {
    let changeHandler: ((dims: { window: { width: number; height: number } }) => void) | null = null;

    mockDimensions.get.mockImplementation(() => ({ width: 375, height: 667, scale: 2, fontScale: 1 }));
    mockDimensions.addEventListener.mockImplementation((_event, handler) => {
      changeHandler = handler as typeof changeHandler;
      return { remove: jest.fn() };
    });

    const { result } = renderHook(() => useBreakpoint());

    expect(result.current).toBe('sm');

    // Simulate dimension change to tablet size
    act(() => {
      if (changeHandler) {
        changeHandler({ window: { width: 768, height: 1024 } });
      }
    });

    expect(result.current).toBe('lg');
  });

  it('should clean up event listener on unmount', () => {
    const removeMock = jest.fn();
    mockDimensions.get.mockImplementation(() => ({ width: 414, height: 896, scale: 2, fontScale: 1 }));
    mockDimensions.addEventListener.mockImplementation(() => ({ remove: removeMock }));

    const { unmount } = renderHook(() => useBreakpoint());

    unmount();

    expect(removeMock).toHaveBeenCalled();
  });
});

describe('useBreakpointUp', () => {
  beforeEach(() => {
    mockDimensions.get.mockClear();
    mockDimensions.addEventListener.mockClear();
  });

  it('should return true when current breakpoint is larger than target', () => {
    mockDimensions.get.mockImplementation(() => ({ width: 768, height: 1024, scale: 2, fontScale: 1 })); // lg

    const { result } = renderHook(() => useBreakpointUp('md'));

    expect(result.current).toBe(true);
  });

  it('should return true when current breakpoint equals target', () => {
    mockDimensions.get.mockImplementation(() => ({ width: 768, height: 1024, scale: 2, fontScale: 1 })); // lg

    const { result } = renderHook(() => useBreakpointUp('lg'));

    expect(result.current).toBe(true);
  });

  it('should return false when current breakpoint is smaller than target', () => {
    mockDimensions.get.mockImplementation(() => ({ width: 375, height: 667, scale: 2, fontScale: 1 })); // sm

    const { result } = renderHook(() => useBreakpointUp('md'));

    expect(result.current).toBe(false);
  });
});

describe('useBreakpointDown', () => {
  beforeEach(() => {
    mockDimensions.get.mockClear();
    mockDimensions.addEventListener.mockClear();
  });

  it('should return true when current breakpoint is smaller than target', () => {
    mockDimensions.get.mockImplementation(() => ({ width: 375, height: 667, scale: 2, fontScale: 1 })); // sm

    const { result } = renderHook(() => useBreakpointDown('md'));

    expect(result.current).toBe(true);
  });

  it('should return true when current breakpoint equals target', () => {
    mockDimensions.get.mockImplementation(() => ({ width: 414, height: 896, scale: 2, fontScale: 1 })); // md

    const { result } = renderHook(() => useBreakpointDown('md'));

    expect(result.current).toBe(true);
  });

  it('should return false when current breakpoint is larger than target', () => {
    mockDimensions.get.mockImplementation(() => ({ width: 1024, height: 1366, scale: 2, fontScale: 1 })); // xl

    const { result } = renderHook(() => useBreakpointDown('md'));

    expect(result.current).toBe(false);
  });
});

describe('useBreakpointBetween', () => {
  beforeEach(() => {
    mockDimensions.get.mockClear();
    mockDimensions.addEventListener.mockClear();
  });

  it('should return true when current breakpoint is within range', () => {
    mockDimensions.get.mockImplementation(() => ({ width: 768, height: 1024, scale: 2, fontScale: 1 })); // lg

    const { result } = renderHook(() => useBreakpointBetween('md', 'xl'));

    expect(result.current).toBe(true);
  });

  it('should return true when current breakpoint equals min boundary', () => {
    mockDimensions.get.mockImplementation(() => ({ width: 414, height: 896, scale: 2, fontScale: 1 })); // md

    const { result } = renderHook(() => useBreakpointBetween('md', 'xl'));

    expect(result.current).toBe(true);
  });

  it('should return true when current breakpoint equals max boundary', () => {
    mockDimensions.get.mockImplementation(() => ({ width: 1024, height: 1366, scale: 2, fontScale: 1 })); // xl

    const { result } = renderHook(() => useBreakpointBetween('md', 'xl'));

    expect(result.current).toBe(true);
  });

  it('should return false when current breakpoint is below range', () => {
    mockDimensions.get.mockImplementation(() => ({ width: 375, height: 667, scale: 2, fontScale: 1 })); // sm

    const { result } = renderHook(() => useBreakpointBetween('md', 'xl'));

    expect(result.current).toBe(false);
  });

  it('should return false when current breakpoint is above range', () => {
    mockDimensions.get.mockImplementation(() => ({ width: 1280, height: 1024, scale: 2, fontScale: 1 })); // 2xl

    const { result } = renderHook(() => useBreakpointBetween('md', 'xl'));

    expect(result.current).toBe(false);
  });
});
