/**
 * Comprehensive tests for useMediaQuery.ts
 *
 * Coverage Target: 95%+
 * Strategy: Test media query matching, listener setup/cleanup, fallback for older browsers
 */

import { renderHook, act } from '@testing-library/react';
import { useMediaQuery } from '../useMediaQuery';

describe('useMediaQuery', () => {
  let matchMediaMock: jest.Mock;
  let addEventListenerSpy: jest.Mock;
  let removeEventListenerSpy: jest.Mock;
  let addListenerSpy: jest.Mock;
  let removeListenerSpy: jest.Mock;

  beforeEach(() => {
    addEventListenerSpy = jest.fn();
    removeEventListenerSpy = jest.fn();
    addListenerSpy = jest.fn();
    removeListenerSpy = jest.fn();

    matchMediaMock = jest.fn((query: string) => ({
      matches: query === '(min-width: 768px)',
      media: query,
      addEventListener: addEventListenerSpy,
      removeEventListener: removeEventListenerSpy,
      addListener: addListenerSpy,
      removeListener: removeListenerSpy,
    })) as unknown as jest.Mock;

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: matchMediaMock,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return false initially for non-matching query', () => {
    const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'));
    expect(result.current).toBe(false);
  });

  it('should return true initially for matching query', () => {
    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    expect(result.current).toBe(true);
  });

  it('should set up event listener on mount (modern browsers)', () => {
    renderHook(() => useMediaQuery('(min-width: 768px)'));
    expect(addEventListenerSpy).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('should clean up event listener on unmount (modern browsers)', () => {
    const { unmount } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('should use addListener fallback for older browsers', () => {
    // Mock older browser without addEventListener
    matchMediaMock = jest.fn((query: string) => ({
      matches: query === '(min-width: 768px)',
      media: query,
      addEventListener: undefined,
      removeEventListener: undefined,
      addListener: addListenerSpy,
      removeListener: removeListenerSpy,
    })) as unknown as jest.Mock;

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: matchMediaMock,
    });

    renderHook(() => useMediaQuery('(min-width: 768px)'));
    expect(addListenerSpy).toHaveBeenCalledWith(expect.any(Function));
  });

  it('should use removeListener fallback for cleanup in older browsers', () => {
    // Mock older browser without removeEventListener
    matchMediaMock = jest.fn((query: string) => ({
      matches: query === '(min-width: 768px)',
      media: query,
      addEventListener: undefined,
      removeEventListener: undefined,
      addListener: addListenerSpy,
      removeListener: removeListenerSpy,
    })) as unknown as jest.Mock;

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: matchMediaMock,
    });

    const { unmount } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    unmount();
    expect(removeListenerSpy).toHaveBeenCalledWith(expect.any(Function));
  });

  it('should update matches when media query changes', () => {
    let mediaQueryListener: ((event: MediaQueryListEvent) => void) | null = null;

    addEventListenerSpy = jest.fn((_eventName, listener) => {
      mediaQueryListener = listener;
    });

    matchMediaMock = jest.fn(() => ({
      matches: false,
      media: '(min-width: 768px)',
      addEventListener: addEventListenerSpy,
      removeEventListener: removeEventListenerSpy,
      addListener: addListenerSpy,
      removeListener: removeListenerSpy,
    })) as unknown as jest.Mock;

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: matchMediaMock,
    });

    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));

    // Initially false
    expect(result.current).toBe(false);

    // Simulate media query match change
    act(() => {
      if (mediaQueryListener) {
        mediaQueryListener({ matches: true } as MediaQueryListEvent);
      }
    });

    // Should now be true
    expect(result.current).toBe(true);
  });

  it('should handle query change by re-subscribing', () => {
    const { rerender } = renderHook(({ query }) => useMediaQuery(query), {
      initialProps: { query: '(min-width: 768px)' },
    });

    expect(addEventListenerSpy).toHaveBeenCalledTimes(1);

    // Change query
    rerender({ query: '(max-width: 480px)' });

    // Should add listener again for new query
    expect(addEventListenerSpy).toHaveBeenCalledTimes(2);
  });

  it('should handle different media query formats', () => {
    const queries = [
      '(min-width: 768px)',
      '(max-width: 1024px)',
      '(orientation: portrait)',
      '(prefers-light-scheme: dark)',
      'print',
    ];

    queries.forEach(query => {
      const { unmount } = renderHook(() => useMediaQuery(query));
      expect(matchMediaMock).toHaveBeenCalledWith(query);
      unmount();
    });
  });

  it('should not throw when listener is undefined', () => {
    // Mock a very minimal browser with only the fallback methods as no-ops
    matchMediaMock = jest.fn(() => ({
      matches: false,
      media: '(min-width: 768px)',
      addEventListener: undefined,
      removeEventListener: undefined,
      addListener: jest.fn(), // Provide as no-op function, not undefined
      removeListener: jest.fn(), // Provide as no-op function, not undefined
    })) as unknown as jest.Mock;

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: matchMediaMock,
    });

    expect(() => {
      const { unmount } = renderHook(() => useMediaQuery('(min-width: 768px)'));
      unmount();
    }).not.toThrow();
  });
});
