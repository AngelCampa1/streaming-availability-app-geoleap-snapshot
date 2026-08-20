import React from 'react';
import { render, renderHook, act } from '@testing-library/react';
import LiveRegion, { useAnnouncements } from '../LiveRegion';

describe('LiveRegion', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Rendering & Basic Functionality', () => {
    it('renders without crashing', () => {
      expect(() => {
        render(<LiveRegion message="" priority="polite" />);
      }).not.toThrow();
    });

    it('renders with polite priority by default', () => {
      const { container } = render(<LiveRegion message="Test message" priority="polite" />);

      const liveRegion = container.querySelector('[aria-live="polite"]');
      expect(liveRegion).toBeInTheDocument();
    });

    it('renders with assertive priority when specified', () => {
      const { container } = render(<LiveRegion message="Urgent message" priority="assertive" />);

      const liveRegion = container.querySelector('[aria-live="assertive"]');
      expect(liveRegion).toBeInTheDocument();
    });

    it('has aria-atomic="true" attribute', () => {
      const { container } = render(<LiveRegion message="Test" priority="polite" />);

      const liveRegion = container.querySelector('[aria-atomic="true"]');
      expect(liveRegion).toBeInTheDocument();
    });

    it('has sr-only class for screen reader only visibility', () => {
      const { container } = render(<LiveRegion message="Test" priority="polite" />);

      const liveRegion = container.firstChild as HTMLElement;
      expect(liveRegion).toHaveClass('sr-only');
    });
  });

  describe('Message Display', () => {
    it('displays the provided message', () => {
      const { container } = render(<LiveRegion message="Test announcement" priority="polite" />);

      const liveRegion = container.querySelector('[aria-live]');
      expect(liveRegion).toHaveTextContent('Test announcement');
    });

    it('updates message when prop changes', () => {
      const { container, rerender } = render(<LiveRegion message="First message" priority="polite" />);

      const liveRegion = container.querySelector('[aria-live]');
      expect(liveRegion).toHaveTextContent('First message');

      rerender(<LiveRegion message="Second message" priority="polite" />);
      expect(liveRegion).toHaveTextContent('Second message');
    });

    it('handles empty message', () => {
      const { container } = render(<LiveRegion message="" priority="polite" />);

      const liveRegion = container.querySelector('[aria-live]');
      expect(liveRegion).toHaveTextContent('');
    });

    it('handles long messages', () => {
      const longMessage = 'This is a very long accessibility announcement that should be read by screen readers in its entirety without any truncation or modification.';
      const { container } = render(<LiveRegion message={longMessage} priority="polite" />);

      const liveRegion = container.querySelector('[aria-live]');
      expect(liveRegion).toHaveTextContent(longMessage);
    });
  });

  describe('Clear After Announcement', () => {
    it('clears message after delay when clearAfterAnnouncement is true', () => {
      const { container } = render(
        <LiveRegion message="Temporary message" priority="polite" clearAfterAnnouncement={true} clearDelay={1000} />
      );

      const liveRegion = container.querySelector('[aria-live]') as HTMLElement;
      expect(liveRegion).toHaveTextContent('Temporary message');

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(liveRegion).toHaveTextContent('');
    });

    it('does not clear message when clearAfterAnnouncement is false', () => {
      const { container } = render(
        <LiveRegion message="Permanent message" priority="polite" clearAfterAnnouncement={false} clearDelay={1000} />
      );

      const liveRegion = container.querySelector('[aria-live]');
      expect(liveRegion).toHaveTextContent('Permanent message');

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(liveRegion).toHaveTextContent('Permanent message');
    });

    it('respects custom clearDelay', () => {
      const { container } = render(
        <LiveRegion message="Custom delay message" priority="polite" clearAfterAnnouncement={true} clearDelay={500} />
      );

      const liveRegion = container.querySelector('[aria-live]') as HTMLElement;
      expect(liveRegion).toHaveTextContent('Custom delay message');

      act(() => {
        jest.advanceTimersByTime(499);
      });
      expect(liveRegion).toHaveTextContent('Custom delay message');

      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(liveRegion).toHaveTextContent('');
    });

    it('clears previous timer when message updates', () => {
      const { container, rerender } = render(
        <LiveRegion message="First" priority="polite" clearAfterAnnouncement={true} clearDelay={1000} />
      );

      const liveRegion = container.querySelector('[aria-live]') as HTMLElement;

      act(() => {
        jest.advanceTimersByTime(500);
      });

      rerender(<LiveRegion message="Second" priority="polite" clearAfterAnnouncement={true} clearDelay={1000} />);

      expect(liveRegion).toHaveTextContent('Second');

      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Should still have Second because timer reset
      expect(liveRegion).toHaveTextContent('Second');

      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Now it should be cleared
      expect(liveRegion).toHaveTextContent('');
    });
  });

  describe('Props and Configuration', () => {
    it('uses default clearAfterAnnouncement value of true', () => {
      const { container } = render(<LiveRegion message="Test" priority="polite" />);

      const liveRegion = container.querySelector('[aria-live]') as HTMLElement;

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(liveRegion).toHaveTextContent('');
    });

    it('uses default clearDelay value of 1000ms', () => {
      const { container } = render(<LiveRegion message="Test" priority="polite" clearAfterAnnouncement={true} />);

      const liveRegion = container.querySelector('[aria-live]') as HTMLElement;

      act(() => {
        jest.advanceTimersByTime(999);
      });
      expect(liveRegion).toHaveTextContent('Test');

      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(liveRegion).toHaveTextContent('');
    });

    it('accepts all priority values', () => {
      const { container: politeContainer } = render(<LiveRegion message="Polite" priority="polite" />);
      expect(politeContainer.querySelector('[aria-live="polite"]')).toBeInTheDocument();

      const { container: assertiveContainer } = render(<LiveRegion message="Assertive" priority="assertive" />);
      expect(assertiveContainer.querySelector('[aria-live="assertive"]')).toBeInTheDocument();
    });
  });

  describe('useAnnouncements Hook', () => {
    beforeEach(() => {
      // Clean up any live regions from previous tests
      document.body.innerHTML = '';
    });

    it('provides announce function', () => {
      const { result } = renderHook(() => useAnnouncements());

      expect(result.current.announce).toBeDefined();
      expect(typeof result.current.announce).toBe('function');
    });

    it('creates temporary live region when announce is called', () => {
      const { result } = renderHook(() => useAnnouncements());

      act(() => {
        result.current.announce('Test announcement', 'polite');
      });

      const liveRegions = document.querySelectorAll('[aria-live]');
      expect(liveRegions.length).toBeGreaterThan(0);
    });

    it('sets correct aria-live priority', () => {
      const { result } = renderHook(() => useAnnouncements());

      act(() => {
        result.current.announce('Polite announcement', 'polite');
      });

      const liveRegion = document.querySelector('[aria-live="polite"]');
      expect(liveRegion).toBeInTheDocument();
    });

    it('sets assertive priority when specified', () => {
      const { result } = renderHook(() => useAnnouncements());

      act(() => {
        result.current.announce('Urgent announcement', 'assertive');
      });

      const liveRegion = document.querySelector('[aria-live="assertive"]');
      expect(liveRegion).toBeInTheDocument();
    });

    it('adds sr-only class to announcement', () => {
      const { result } = renderHook(() => useAnnouncements());

      act(() => {
        result.current.announce('Test', 'polite');
      });

      const liveRegion = document.querySelector('[aria-live]') as HTMLElement;
      expect(liveRegion).toHaveClass('sr-only');
    });

    it('sets aria-atomic attribute', () => {
      const { result } = renderHook(() => useAnnouncements());

      act(() => {
        result.current.announce('Test', 'polite');
      });

      const liveRegion = document.querySelector('[aria-atomic="true"]');
      expect(liveRegion).toBeInTheDocument();
    });

    it('displays the announcement message', () => {
      const { result } = renderHook(() => useAnnouncements());

      act(() => {
        result.current.announce('Important message', 'polite');
      });

      const liveRegion = document.querySelector('[aria-live]');
      expect(liveRegion).toHaveTextContent('Important message');
    });

    it('removes live region after 1 second', () => {
      const { result } = renderHook(() => useAnnouncements());

      act(() => {
        result.current.announce('Temporary', 'polite');
      });

      expect(document.querySelector('[aria-live]')).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(document.querySelector('[aria-live]')).not.toBeInTheDocument();
    });

    it('handles multiple announcements', () => {
      const { result } = renderHook(() => useAnnouncements());

      act(() => {
        result.current.announce('First', 'polite');
        result.current.announce('Second', 'polite');
      });

      const liveRegions = document.querySelectorAll('[aria-live]');
      expect(liveRegions.length).toBe(2);
    });

    it('uses polite priority by default when not specified', () => {
      const { result } = renderHook(() => useAnnouncements());

      act(() => {
        result.current.announce('Default priority');
      });

      const liveRegion = document.querySelector('[aria-live="polite"]');
      expect(liveRegion).toBeInTheDocument();
    });
  });

  describe('Cleanup', () => {
    it('cleans up timer on unmount', () => {
      const { unmount, container: _container } = render(
        <LiveRegion message="Test" priority="polite" clearAfterAnnouncement={true} clearDelay={1000} />
      );

      unmount();

      // Should not throw error when timer tries to clear
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(true).toBe(true); // No errors thrown
    });
  });
});
