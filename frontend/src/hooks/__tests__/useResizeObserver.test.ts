/**
 * Comprehensive tests for useResizeObserver.ts
 *
 * Coverage Target: 95%+
 * Strategy: Test ResizeObserver setup, observation, cleanup, dimension updates
 */

import { renderHook, act } from '@testing-library/react';
import { useResizeObserver } from '../useResizeObserver';

describe('useResizeObserver', () => {
  let resizeObserverMock: jest.Mock;
  let observeSpy: jest.Mock;
  let disconnectSpy: jest.Mock;
  let resizeCallback: ResizeObserverCallback | null = null;

  beforeEach(() => {
    observeSpy = jest.fn();
    disconnectSpy = jest.fn();

    resizeObserverMock = jest.fn((callback: ResizeObserverCallback) => {
      resizeCallback = callback;
      return {
        observe: observeSpy,
        disconnect: disconnectSpy,
        unobserve: jest.fn(),
      };
    });

    (global as any).ResizeObserver = resizeObserverMock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    resizeCallback = null;
  });

  it('should return initial dimensions of 0x0', () => {
    const { result } = renderHook(() => useResizeObserver(null));
    expect(result.current).toEqual({ width: 0, height: 0 });
  });

  it('should not observe when ref is null', () => {
    renderHook(() => useResizeObserver(null));
    expect(observeSpy).not.toHaveBeenCalled();
  });

  it('should observe element when ref is provided', () => {
    const element = document.createElement('div');
    renderHook(() => useResizeObserver(element));
    expect(observeSpy).toHaveBeenCalledWith(element);
  });

  it('should update dimensions when element resizes', () => {
    const element = document.createElement('div');
    const { result } = renderHook(() => useResizeObserver(element));

    // Initially 0x0
    expect(result.current).toEqual({ width: 0, height: 0 });

    // Simulate resize
    act(() => {
      if (resizeCallback) {
        const entries: ResizeObserverEntry[] = [
          {
            target: element,
            contentRect: {
              width: 800,
              height: 600,
              top: 0,
              left: 0,
              bottom: 600,
              right: 800,
              x: 0,
              y: 0,
            } as DOMRectReadOnly,
            borderBoxSize: [] as any,
            contentBoxSize: [] as any,
            devicePixelContentBoxSize: [] as any,
          },
        ];

        resizeCallback(entries, {} as ResizeObserver);
      }
    });

    // Should update to new dimensions
    expect(result.current).toEqual({ width: 800, height: 600 });
  });

  it('should handle multiple resize events', () => {
    const element = document.createElement('div');
    const { result } = renderHook(() => useResizeObserver(element));

    // First resize
    act(() => {
      if (resizeCallback) {
        resizeCallback(
          [
            {
              target: element,
              contentRect: { width: 800, height: 600 } as DOMRectReadOnly,
              borderBoxSize: [] as any,
              contentBoxSize: [] as any,
              devicePixelContentBoxSize: [] as any,
            } as ResizeObserverEntry,
          ],
          {} as ResizeObserver
        );
      }
    });

    expect(result.current).toEqual({ width: 800, height: 600 });

    // Second resize
    act(() => {
      if (resizeCallback) {
        resizeCallback(
          [
            {
              target: element,
              contentRect: { width: 1024, height: 768 } as DOMRectReadOnly,
              borderBoxSize: [] as any,
              contentBoxSize: [] as any,
              devicePixelContentBoxSize: [] as any,
            } as ResizeObserverEntry,
          ],
          {} as ResizeObserver
        );
      }
    });

    expect(result.current).toEqual({ width: 1024, height: 768 });
  });

  it('should disconnect observer on unmount', () => {
    const element = document.createElement('div');
    const { unmount } = renderHook(() => useResizeObserver(element));

    unmount();
    expect(disconnectSpy).toHaveBeenCalled();
  });

  it('should re-observe when ref changes', () => {
    const element1 = document.createElement('div');
    const element2 = document.createElement('div');

    const { rerender } = renderHook(
      ({ ref }: { ref: HTMLElement | null }) => useResizeObserver(ref),
      {
        initialProps: { ref: element1 as HTMLElement | null },
      }
    );

    expect(observeSpy).toHaveBeenCalledWith(element1);
    expect(observeSpy).toHaveBeenCalledTimes(1);

    // Change ref
    rerender({ ref: element2 as HTMLElement | null });

    // Should disconnect old observer and create new one
    expect(disconnectSpy).toHaveBeenCalledTimes(1);
    expect(observeSpy).toHaveBeenCalledWith(element2);
    expect(observeSpy).toHaveBeenCalledTimes(2);
  });

  it('should handle ref changing to null', () => {
    const element = document.createElement('div');

    const { rerender } = renderHook(
      ({ ref }: { ref: HTMLElement | null }) => useResizeObserver(ref),
      {
        initialProps: { ref: element as HTMLElement | null },
      }
    );

    expect(observeSpy).toHaveBeenCalledWith(element);

    // Change ref to null
    rerender({ ref: null });

    // Should disconnect observer
    expect(disconnectSpy).toHaveBeenCalled();
  });

  it('should handle ref changing from null to element', () => {
    const element = document.createElement('div');

    const { rerender } = renderHook(
      ({ ref }: { ref: HTMLElement | null }) => useResizeObserver(ref),
      {
        initialProps: { ref: null as HTMLElement | null },
      }
    );

    expect(observeSpy).not.toHaveBeenCalled();

    // Change ref to element
    rerender({ ref: element as HTMLElement | null });

    // Should start observing
    expect(observeSpy).toHaveBeenCalledWith(element);
  });

  it('should handle multiple entries in resize callback', () => {
    const element = document.createElement('div');
    const { result } = renderHook(() => useResizeObserver(element));

    act(() => {
      if (resizeCallback) {
        const entries: ResizeObserverEntry[] = [
          {
            target: element,
            contentRect: { width: 800, height: 600 } as DOMRectReadOnly,
            borderBoxSize: [] as any,
            contentBoxSize: [] as any,
            devicePixelContentBoxSize: [] as any,
          } as ResizeObserverEntry,
          {
            target: element,
            contentRect: { width: 1024, height: 768 } as DOMRectReadOnly,
            borderBoxSize: [] as any,
            contentBoxSize: [] as any,
            devicePixelContentBoxSize: [] as any,
          } as ResizeObserverEntry,
        ];

        resizeCallback(entries, {} as ResizeObserver);
      }
    });

    // Should use last entry's dimensions
    expect(result.current).toEqual({ width: 1024, height: 768 });
  });

  it('should handle decimal dimensions', () => {
    const element = document.createElement('div');
    const { result } = renderHook(() => useResizeObserver(element));

    act(() => {
      if (resizeCallback) {
        resizeCallback(
          [
            {
              target: element,
              contentRect: { width: 800.5, height: 600.75 } as DOMRectReadOnly,
              borderBoxSize: [] as any,
              contentBoxSize: [] as any,
              devicePixelContentBoxSize: [] as any,
            } as ResizeObserverEntry,
          ],
          {} as ResizeObserver
        );
      }
    });

    expect(result.current).toEqual({ width: 800.5, height: 600.75 });
  });

  it('should handle zero dimensions', () => {
    const element = document.createElement('div');
    const { result } = renderHook(() => useResizeObserver(element));

    act(() => {
      if (resizeCallback) {
        resizeCallback(
          [
            {
              target: element,
              contentRect: { width: 0, height: 0 } as DOMRectReadOnly,
              borderBoxSize: [] as any,
              contentBoxSize: [] as any,
              devicePixelContentBoxSize: [] as any,
            } as ResizeObserverEntry,
          ],
          {} as ResizeObserver
        );
      }
    });

    expect(result.current).toEqual({ width: 0, height: 0 });
  });
});
