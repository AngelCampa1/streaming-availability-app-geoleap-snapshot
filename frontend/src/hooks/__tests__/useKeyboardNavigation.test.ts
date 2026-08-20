/**
 * Comprehensive tests for useKeyboardNavigation.ts
 *
 * Coverage Target: 85%+
 * Strategy: Test keyboard handlers, focus management, skip links, edge cases
 */

import { renderHook, act } from '@testing-library/react';
import { useKeyboardNavigation, useFocusManagement, useSkipLinks } from '../useKeyboardNavigation';

describe('useKeyboardNavigation', () => {
  let addEventListenerSpy: jest.SpyInstance;
  let removeEventListenerSpy: jest.SpyInstance;

  beforeEach(() => {
    addEventListenerSpy = jest.spyOn(document, 'addEventListener');
    removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should attach keydown listener when enabled', () => {
    renderHook(() => useKeyboardNavigation({ enabled: true }));

    expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('should not attach listener when disabled', () => {
    renderHook(() => useKeyboardNavigation({ enabled: false }));

    expect(addEventListenerSpy).not.toHaveBeenCalled();
  });

  it('should remove listener on unmount', () => {
    const { unmount } = renderHook(() => useKeyboardNavigation({ enabled: true }));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('should handle Escape key', () => {
    const onEscape = jest.fn();
    renderHook(() => useKeyboardNavigation({ onEscape }));

    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

    act(() => {
      document.dispatchEvent(event);
    });

    expect(onEscape).toHaveBeenCalled();
    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it('should handle Enter key', () => {
    const onEnter = jest.fn();
    renderHook(() => useKeyboardNavigation({ onEnter }));

    const event = new KeyboardEvent('keydown', { key: 'Enter' });

    act(() => {
      document.dispatchEvent(event);
    });

    expect(onEnter).toHaveBeenCalled();
  });

  it('should handle ArrowUp key', () => {
    const onArrowUp = jest.fn();
    renderHook(() => useKeyboardNavigation({ onArrowUp }));

    const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
    const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

    act(() => {
      document.dispatchEvent(event);
    });

    expect(onArrowUp).toHaveBeenCalled();
    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it('should handle ArrowDown key', () => {
    const onArrowDown = jest.fn();
    renderHook(() => useKeyboardNavigation({ onArrowDown }));

    const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
    const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

    act(() => {
      document.dispatchEvent(event);
    });

    expect(onArrowDown).toHaveBeenCalled();
    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it('should handle ArrowLeft key', () => {
    const onArrowLeft = jest.fn();
    renderHook(() => useKeyboardNavigation({ onArrowLeft }));

    const event = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
    const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

    act(() => {
      document.dispatchEvent(event);
    });

    expect(onArrowLeft).toHaveBeenCalled();
    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it('should handle ArrowRight key', () => {
    const onArrowRight = jest.fn();
    renderHook(() => useKeyboardNavigation({ onArrowRight }));

    const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
    const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

    act(() => {
      document.dispatchEvent(event);
    });

    expect(onArrowRight).toHaveBeenCalled();
    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it('should handle Tab key', () => {
    const onTab = jest.fn();
    renderHook(() => useKeyboardNavigation({ onTab }));

    const event = new KeyboardEvent('keydown', { key: 'Tab' });

    act(() => {
      document.dispatchEvent(event);
    });

    expect(onTab).toHaveBeenCalled();
  });

  it('should handle Shift+Tab key', () => {
    const onShiftTab = jest.fn();
    renderHook(() => useKeyboardNavigation({ onShiftTab }));

    const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true });

    act(() => {
      document.dispatchEvent(event);
    });

    expect(onShiftTab).toHaveBeenCalled();
  });

  it('should handle Home key', () => {
    const onHome = jest.fn();
    renderHook(() => useKeyboardNavigation({ onHome }));

    const event = new KeyboardEvent('keydown', { key: 'Home' });
    const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

    act(() => {
      document.dispatchEvent(event);
    });

    expect(onHome).toHaveBeenCalled();
    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it('should handle End key', () => {
    const onEnd = jest.fn();
    renderHook(() => useKeyboardNavigation({ onEnd }));

    const event = new KeyboardEvent('keydown', { key: 'End' });
    const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

    act(() => {
      document.dispatchEvent(event);
    });

    expect(onEnd).toHaveBeenCalled();
    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it('should not trigger callbacks when disabled', () => {
    const onEscape = jest.fn();
    const onEnter = jest.fn();

    renderHook(() => useKeyboardNavigation({ onEscape, onEnter, enabled: false }));

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    });

    expect(onEscape).not.toHaveBeenCalled();
    expect(onEnter).not.toHaveBeenCalled();
  });

  it('should ignore unhandled keys', () => {
    const onEscape = jest.fn();
    renderHook(() => useKeyboardNavigation({ onEscape }));

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'A' }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Space' }));
    });

    expect(onEscape).not.toHaveBeenCalled();
  });

  it('should handle multiple key handlers', () => {
    const onEscape = jest.fn();
    const onEnter = jest.fn();
    const onArrowUp = jest.fn();

    renderHook(() => useKeyboardNavigation({ onEscape, onEnter, onArrowUp }));

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    });

    expect(onEscape).toHaveBeenCalledTimes(1);
    expect(onEnter).toHaveBeenCalledTimes(1);
    expect(onArrowUp).toHaveBeenCalledTimes(1);
  });
});

describe('useFocusManagement', () => {
  let container: HTMLElement;

  beforeEach(() => {
    // Create test container with focusable elements
    container = document.createElement('div');
    container.innerHTML = `
      <button id="btn1">Button 1</button>
      <a href="#" id="link1">Link 1</a>
      <input id="input1" type="text" />
      <button id="btn2">Button 2</button>
    `;
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('should return containerRef', () => {
    const { result } = renderHook(() => useFocusManagement());

    expect(result.current.containerRef).toBeDefined();
    expect(result.current.containerRef.current).toBeNull(); // Not attached yet
  });

  it('should focus first element', () => {
    const { result } = renderHook(() => useFocusManagement());

    act(() => {
      result.current.containerRef.current = container;
      result.current.focusFirstElement();
    });

    expect(document.activeElement?.id).toBe('btn1');
  });

  it('should focus last element', () => {
    const { result } = renderHook(() => useFocusManagement());

    act(() => {
      result.current.containerRef.current = container;
      result.current.focusLastElement();
    });

    expect(document.activeElement?.id).toBe('btn2');
  });

  it('should focus next element', () => {
    const { result } = renderHook(() => useFocusManagement());

    act(() => {
      result.current.containerRef.current = container;
      result.current.focusFirstElement(); // Focus btn1
    });

    expect(document.activeElement?.id).toBe('btn1');

    act(() => {
      result.current.focusNextElement();
    });

    expect(document.activeElement?.id).toBe('link1');
  });

  it('should wrap to first element when at end', () => {
    const { result } = renderHook(() => useFocusManagement());

    act(() => {
      result.current.containerRef.current = container;
      result.current.focusLastElement(); // Focus btn2
    });

    expect(document.activeElement?.id).toBe('btn2');

    act(() => {
      result.current.focusNextElement(); // Should wrap to btn1
    });

    expect(document.activeElement?.id).toBe('btn1');
  });

  it('should focus previous element', () => {
    const { result } = renderHook(() => useFocusManagement());

    act(() => {
      result.current.containerRef.current = container;
      result.current.focusLastElement(); // Focus btn2
    });

    expect(document.activeElement?.id).toBe('btn2');

    act(() => {
      result.current.focusPreviousElement();
    });

    expect(document.activeElement?.id).toBe('input1');
  });

  it('should wrap to last element when at beginning', () => {
    const { result } = renderHook(() => useFocusManagement());

    act(() => {
      result.current.containerRef.current = container;
      result.current.focusFirstElement(); // Focus btn1
    });

    expect(document.activeElement?.id).toBe('btn1');

    act(() => {
      result.current.focusPreviousElement(); // Should wrap to btn2
    });

    expect(document.activeElement?.id).toBe('btn2');
  });

  it('should trap focus on Tab at last element', () => {
    const { result } = renderHook(() => useFocusManagement());

    act(() => {
      result.current.containerRef.current = container;
      result.current.focusLastElement(); // Focus btn2
    });

    const event = new KeyboardEvent('keydown', { key: 'Tab' });
    const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

    act(() => {
      result.current.trapFocus(event);
    });

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(document.activeElement?.id).toBe('btn1');
  });

  it('should trap focus on Shift+Tab at first element', () => {
    const { result } = renderHook(() => useFocusManagement());

    act(() => {
      result.current.containerRef.current = container;
      result.current.focusFirstElement(); // Focus btn1
    });

    const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true });
    const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

    act(() => {
      result.current.trapFocus(event);
    });

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(document.activeElement?.id).toBe('btn2');
  });

  it('should not trap focus for non-Tab keys', () => {
    const { result } = renderHook(() => useFocusManagement());

    act(() => {
      result.current.containerRef.current = container;
      result.current.focusFirstElement();
    });

    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

    act(() => {
      result.current.trapFocus(event);
    });

    expect(preventDefaultSpy).not.toHaveBeenCalled();
  });

  it('should handle container with no focusable elements', () => {
    const emptyContainer = document.createElement('div');
    emptyContainer.innerHTML = '<div>No focusable elements</div>';
    document.body.appendChild(emptyContainer);

    const { result } = renderHook(() => useFocusManagement());

    act(() => {
      result.current.containerRef.current = emptyContainer;
      result.current.focusFirstElement();
    });

    // Should not throw error
    expect(document.activeElement).toBe(document.body);

    document.body.removeChild(emptyContainer);
  });

  it('should handle null containerRef', () => {
    const { result } = renderHook(() => useFocusManagement());

    expect(() => {
      act(() => {
        result.current.focusFirstElement();
        result.current.focusLastElement();
        result.current.focusNextElement();
        result.current.focusPreviousElement();
      });
    }).not.toThrow();
  });
});

describe('useSkipLinks', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    // Mock scrollIntoView since it's not implemented in jsdom
    Element.prototype.scrollIntoView = jest.fn();
  });

  it('should skip to main element', () => {
    const main = document.createElement('main');
    main.tabIndex = -1;
    document.body.appendChild(main);

    const focusSpy = jest.spyOn(main, 'focus');
    const scrollSpy = jest.spyOn(main, 'scrollIntoView');

    const { result } = renderHook(() => useSkipLinks());

    act(() => {
      result.current.skipToMain();
    });

    expect(focusSpy).toHaveBeenCalled();
    expect(scrollSpy).toHaveBeenCalledWith({ behavior: 'smooth' });
  });

  it('should skip to element with role="main"', () => {
    const main = document.createElement('div');
    main.setAttribute('role', 'main');
    main.tabIndex = -1;
    document.body.appendChild(main);

    const focusSpy = jest.spyOn(main, 'focus');

    const { result } = renderHook(() => useSkipLinks());

    act(() => {
      result.current.skipToMain();
    });

    expect(focusSpy).toHaveBeenCalled();
  });

  it('should handle missing main element', () => {
    const { result } = renderHook(() => useSkipLinks());

    expect(() => {
      act(() => {
        result.current.skipToMain();
      });
    }).not.toThrow();
  });

  it('should skip to navigation element', () => {
    const nav = document.createElement('nav');
    nav.tabIndex = -1;
    document.body.appendChild(nav);

    const focusSpy = jest.spyOn(nav, 'focus');
    const scrollSpy = jest.spyOn(nav, 'scrollIntoView');

    const { result } = renderHook(() => useSkipLinks());

    act(() => {
      result.current.skipToNavigation();
    });

    expect(focusSpy).toHaveBeenCalled();
    expect(scrollSpy).toHaveBeenCalledWith({ behavior: 'smooth' });
  });

  it('should skip to element with role="navigation"', () => {
    const nav = document.createElement('div');
    nav.setAttribute('role', 'navigation');
    nav.tabIndex = -1;
    document.body.appendChild(nav);

    const focusSpy = jest.spyOn(nav, 'focus');

    const { result } = renderHook(() => useSkipLinks());

    act(() => {
      result.current.skipToNavigation();
    });

    expect(focusSpy).toHaveBeenCalled();
  });

  it('should handle missing navigation element', () => {
    const { result } = renderHook(() => useSkipLinks());

    expect(() => {
      act(() => {
        result.current.skipToNavigation();
      });
    }).not.toThrow();
  });
});
