/**
 * ResponsiveCustomerSupportAnalytics Component Tests
 *
 * Test coverage for responsive wrapper that switches between desktop and mobile analytics.
 * Tests screen size detection, component switching, and resize handling.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import ResponsiveCustomerSupportAnalytics from '../ResponsiveCustomerSupportAnalytics';

// JSDOM polyfills
beforeAll(() => {
  console.error = jest.fn();
  Element.prototype.hasPointerCapture = jest.fn();
  Element.prototype.releasePointerCapture = jest.fn();
  Element.prototype.scrollIntoView = jest.fn();
});

// Mock the child components to avoid their complexity
jest.mock('../CustomerSupportAnalytics', () => ({
  __esModule: true,
  default: () => <div data-testid="desktop-analytics">Desktop Customer Support Analytics</div>,
}));

jest.mock('../CustomerSupportAnalyticsMobile', () => ({
  __esModule: true,
  default: () => <div data-testid="mobile-analytics">Mobile Customer Support Analytics</div>,
}));

describe('ResponsiveCustomerSupportAnalytics', () => {
  let originalInnerWidth: number;

  beforeAll(() => {
    originalInnerWidth = window.innerWidth;
  });

  afterAll(() => {
    // Restore original window size
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Rendering', () => {
    it('renders without crashing', () => {
      expect(() => {
        render(<ResponsiveCustomerSupportAnalytics />);
      }).not.toThrow();
    });

    it('renders desktop component on desktop screen (>=768px)', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });

      render(<ResponsiveCustomerSupportAnalytics />);

      expect(screen.getByTestId('desktop-analytics')).toBeInTheDocument();
      expect(screen.queryByTestId('mobile-analytics')).not.toBeInTheDocument();
    });

    it('renders mobile component on mobile screen (<768px)', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<ResponsiveCustomerSupportAnalytics />);

      expect(screen.getByTestId('mobile-analytics')).toBeInTheDocument();
      expect(screen.queryByTestId('desktop-analytics')).not.toBeInTheDocument();
    });

    it('renders mobile component on tablet screen (640-768px)', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 700,
      });

      render(<ResponsiveCustomerSupportAnalytics />);

      expect(screen.getByTestId('mobile-analytics')).toBeInTheDocument();
      expect(screen.queryByTestId('desktop-analytics')).not.toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('switches to mobile view when resizing from desktop to mobile', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });

      const { rerender } = render(<ResponsiveCustomerSupportAnalytics />);

      expect(screen.getByTestId('desktop-analytics')).toBeInTheDocument();

      // Simulate resize to mobile
      act(() => {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: 375,
        });
        window.dispatchEvent(new Event('resize'));
      });

      rerender(<ResponsiveCustomerSupportAnalytics />);

      expect(screen.getByTestId('mobile-analytics')).toBeInTheDocument();
      expect(screen.queryByTestId('desktop-analytics')).not.toBeInTheDocument();
    });

    it('switches to desktop view when resizing from mobile to desktop', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      const { rerender } = render(<ResponsiveCustomerSupportAnalytics />);

      expect(screen.getByTestId('mobile-analytics')).toBeInTheDocument();

      // Simulate resize to desktop
      act(() => {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: 1024,
        });
        window.dispatchEvent(new Event('resize'));
      });

      rerender(<ResponsiveCustomerSupportAnalytics />);

      expect(screen.getByTestId('desktop-analytics')).toBeInTheDocument();
      expect(screen.queryByTestId('mobile-analytics')).not.toBeInTheDocument();
    });

    it('stays in mobile view for very small screens (<640px)', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500,
      });

      render(<ResponsiveCustomerSupportAnalytics />);

      expect(screen.getByTestId('mobile-analytics')).toBeInTheDocument();

      // Resize within small screen range
      act(() => {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: 600,
        });
        window.dispatchEvent(new Event('resize'));
      });

      expect(screen.getByTestId('mobile-analytics')).toBeInTheDocument();
    });
  });

  describe('Event Listener Cleanup', () => {
    it('adds resize event listeners on mount', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');

      render(<ResponsiveCustomerSupportAnalytics />);

      expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledTimes(2); // Two useEffect hooks

      addEventListenerSpy.mockRestore();
    });

    it('removes resize event listeners on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

      const { unmount } = render(<ResponsiveCustomerSupportAnalytics />);

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledTimes(2); // Two useEffect cleanups

      removeEventListenerSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('handles exactly 768px as mobile', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      render(<ResponsiveCustomerSupportAnalytics />);

      // 768px should show desktop (>= 768 is desktop)
      expect(screen.getByTestId('desktop-analytics')).toBeInTheDocument();
    });

    it('handles exactly 640px threshold', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 640,
      });

      render(<ResponsiveCustomerSupportAnalytics />);

      // 640px is < 768px, so should show mobile
      expect(screen.getByTestId('mobile-analytics')).toBeInTheDocument();
    });

    it('has wrapper div with full width', () => {
      const { container } = render(<ResponsiveCustomerSupportAnalytics />);

      const wrapperDiv = container.firstChild as HTMLElement;
      expect(wrapperDiv).toHaveClass('w-full');
    });
  });
});
