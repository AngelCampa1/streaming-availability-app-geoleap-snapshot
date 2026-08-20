/**
 * Tests for StickyCTA component
 *
 * Coverage: auth-aware CTA behavior, premium user hiding, dismiss functionality,
 * prop overrides.
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StickyCTA } from '../StickyCTA';

// Mock useAuth
const mockUseAuth = jest.fn();
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

function triggerScroll(y: number) {
  Object.defineProperty(window, 'scrollY', { value: y, writable: true, configurable: true });
  act(() => {
    window.dispatchEvent(new Event('scroll'));
    jest.runAllTimers();
  });
}

describe('StickyCTA', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      user: null,
    });
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true, configurable: true });

    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0);
      return 0;
    });
    jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('Auth-aware defaults', () => {
    it('shows "Sign Up Free" linking to register for anonymous users', () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: false, user: null });
      render(<StickyCTA />);
      triggerScroll(700);

      const link = screen.getByRole('link');
      expect(link).toHaveTextContent('Sign Up Free');
      expect(link).toHaveAttribute('href', '/auth/register');
    });

    it('shows "Go Premium" linking to upgrade for authenticated non-premium users', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        user: { id: '1', email: 'a@b.com', roles: ['User'], permissions: [], firstName: '', lastName: '', isActive: true, emailConfirmed: true, createdAt: '' },
      });
      render(<StickyCTA />);
      triggerScroll(700);

      const link = screen.getByRole('link');
      expect(link).toHaveTextContent(/go premium/i);
      expect(link).toHaveAttribute('href', '/upgrade');
    });

    it('does not render for premium users even after scrolling', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        user: { id: '1', email: 'a@b.com', roles: ['User', 'Premium'], permissions: [], firstName: '', lastName: '', isActive: true, emailConfirmed: true, createdAt: '' },
      });
      render(<StickyCTA />);
      triggerScroll(700);

      expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    });
  });

  describe('Prop overrides', () => {
    it('uses custom ctaText when provided', () => {
      render(<StickyCTA ctaText="Custom CTA" />);
      triggerScroll(700);

      expect(screen.getByRole('link')).toHaveTextContent('Custom CTA');
    });

    it('uses custom ctaHref when provided', () => {
      render(<StickyCTA ctaHref="/custom" />);
      triggerScroll(700);

      expect(screen.getByRole('link')).toHaveAttribute('href', '/custom');
    });
  });

  describe('Visibility', () => {
    it('does not render before scroll threshold', () => {
      render(<StickyCTA />);
      expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    });

    it('renders after scrolling past threshold', () => {
      render(<StickyCTA scrollThreshold={400} />);
      triggerScroll(500);

      expect(screen.getByRole('complementary')).toBeInTheDocument();
    });
  });

  describe('Dismiss', () => {
    it('hides when dismiss button is clicked', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<StickyCTA />);
      triggerScroll(700);

      const dismissBtn = screen.getByRole('button', { name: /dismiss/i });
      await user.click(dismissBtn);

      expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has complementary role with aria-label', () => {
      render(<StickyCTA />);
      triggerScroll(700);

      expect(screen.getByRole('complementary')).toHaveAttribute('aria-label', 'Call to action');
    });

    it('dismiss button has aria-label', () => {
      render(<StickyCTA />);
      triggerScroll(700);

      expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument();
    });
  });
});
