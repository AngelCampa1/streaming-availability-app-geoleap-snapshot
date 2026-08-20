/**
 * Tests for useExitIntent hook
 *
 * Coverage: mouseleave trigger, delay respect, sessionStorage persistence
 */

import { renderHook, act } from '@testing-library/react';
import { useExitIntent } from '../useExitIntent';

// Mock sessionStorage
const mockSessionStorage: Record<string, string> = {};
const sessionStorageMock = {
  getItem: jest.fn((key: string) => mockSessionStorage[key] ?? null),
  setItem: jest.fn((key: string, value: string) => {
    mockSessionStorage[key] = value;
  }),
  removeItem: jest.fn((key: string) => {
    delete mockSessionStorage[key];
  }),
  clear: jest.fn(() => {
    Object.keys(mockSessionStorage).forEach((key) => delete mockSessionStorage[key]);
  }),
  get length() {
    return Object.keys(mockSessionStorage).length;
  },
  key: jest.fn(),
};

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
});

describe('useExitIntent', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    sessionStorageMock.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should not show exit intent initially', () => {
    const { result } = renderHook(() => useExitIntent());
    expect(result.current.showExitIntent).toBe(false);
  });

  it('should show exit intent when mouse leaves top of page after delay', () => {
    const { result } = renderHook(() => useExitIntent({ delay: 1000 }));

    // Advance past delay
    act(() => {
      jest.advanceTimersByTime(1001);
    });

    // Simulate mouse leaving top of page
    act(() => {
      const event = new MouseEvent('mouseleave', { clientY: -5 });
      document.dispatchEvent(event);
    });

    expect(result.current.showExitIntent).toBe(true);
  });

  it('should NOT show exit intent before delay expires', () => {
    const { result } = renderHook(() => useExitIntent({ delay: 5000 }));

    // Only advance 2 seconds (less than 5 second delay)
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    // Simulate mouse leaving top of page
    act(() => {
      const event = new MouseEvent('mouseleave', { clientY: -5 });
      document.dispatchEvent(event);
    });

    expect(result.current.showExitIntent).toBe(false);
  });

  it('should respect custom threshold', () => {
    const { result } = renderHook(() => useExitIntent({ delay: 0, threshold: 50 }));

    act(() => {
      jest.advanceTimersByTime(1);
    });

    // Mouse at y=30 which is <= threshold of 50
    act(() => {
      const event = new MouseEvent('mouseleave', { clientY: 30 });
      document.dispatchEvent(event);
    });

    expect(result.current.showExitIntent).toBe(true);
  });

  it('should NOT trigger when mouse leaves from below threshold', () => {
    const { result } = renderHook(() => useExitIntent({ delay: 0, threshold: 0 }));

    act(() => {
      jest.advanceTimersByTime(1);
    });

    // Mouse at y=100 which is > threshold of 0
    act(() => {
      const event = new MouseEvent('mouseleave', { clientY: 100 });
      document.dispatchEvent(event);
    });

    expect(result.current.showExitIntent).toBe(false);
  });

  it('should not show if already shown this session (sessionStorage)', () => {
    mockSessionStorage['exit-intent-shown'] = 'true';

    const { result } = renderHook(() => useExitIntent({ delay: 0 }));

    act(() => {
      jest.advanceTimersByTime(1);
    });

    act(() => {
      const event = new MouseEvent('mouseleave', { clientY: -5 });
      document.dispatchEvent(event);
    });

    expect(result.current.showExitIntent).toBe(false);
  });

  it('should set sessionStorage on dismiss', () => {
    const { result } = renderHook(() => useExitIntent({ delay: 0 }));

    act(() => {
      jest.advanceTimersByTime(1);
    });

    act(() => {
      const event = new MouseEvent('mouseleave', { clientY: -5 });
      document.dispatchEvent(event);
    });

    expect(result.current.showExitIntent).toBe(true);

    act(() => {
      result.current.dismiss();
    });

    expect(result.current.showExitIntent).toBe(false);
    expect(sessionStorageMock.setItem).toHaveBeenCalledWith('exit-intent-shown', 'true');
  });

  it('should use custom cookieKey for sessionStorage', () => {
    const { result } = renderHook(() =>
      useExitIntent({ delay: 0, cookieKey: 'custom-key' })
    );

    act(() => {
      jest.advanceTimersByTime(1);
    });

    act(() => {
      const event = new MouseEvent('mouseleave', { clientY: -5 });
      document.dispatchEvent(event);
    });

    act(() => {
      result.current.dismiss();
    });

    expect(sessionStorageMock.setItem).toHaveBeenCalledWith('custom-key', 'true');
  });

  it('should clean up event listener on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');

    const { unmount } = renderHook(() => useExitIntent({ delay: 0 }));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('mouseleave', expect.any(Function));
    removeEventListenerSpy.mockRestore();
  });
});
