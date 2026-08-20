/**
 * Tests for ExitIntentPopup component
 *
 * Coverage: renders for anonymous users, hides for premium, hides on excluded paths
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock next/navigation
const mockPathname = jest.fn().mockReturnValue('/search');
jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
}));

// Mock useAuth
const mockUseAuth = jest.fn();
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock useSubscription
const mockUseSubscription = jest.fn();
jest.mock('@/hooks/useSubscription', () => ({
  useSubscription: () => mockUseSubscription(),
}));

// Mock useExitIntent
const mockUseExitIntent = jest.fn();
jest.mock('@/hooks/useExitIntent', () => ({
  useExitIntent: () => mockUseExitIntent(),
}));

// Mock useABTest
jest.mock('@/lib/ab-testing', () => ({
  useABTest: () => ({ config: {}, trackConversion: jest.fn() }),
}));

// Mock Dialog components
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2 data-testid="dialog-title">{children}</h2>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p data-testid="dialog-description">{children}</p>
  ),
}));

// Mock Button component
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode; variant?: string; asChild?: boolean }) => (
    <button {...props}>{children}</button>
  ),
}));

import { ExitIntentPopup } from '../ExitIntentPopup';

describe('ExitIntentPopup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname.mockReturnValue('/search');
    mockUseExitIntent.mockReturnValue({ showExitIntent: true, dismiss: jest.fn() });
  });

  describe('anonymous user', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: null, isAuthenticated: false });
      mockUseSubscription.mockReturnValue({
        subscription: null,
        loading: false,
      });
    });

    it('should render sign-up CTA for anonymous users', () => {
      render(<ExitIntentPopup />);

      expect(screen.getByTestId('dialog')).toBeInTheDocument();
      expect(screen.getByText(/your results disappear when you leave/i)).toBeInTheDocument();
      expect(screen.getByText(/Sign Up Free/i)).toBeInTheDocument();
    });
  });

  describe('free user', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: { id: '1', email: 'test@test.com' }, isAuthenticated: true });
      mockUseSubscription.mockReturnValue({
        subscription: { tier: 0 }, // Free tier
        loading: false,
      });
    });

    it('should render free trial CTA for free users', () => {
      render(<ExitIntentPopup />);

      expect(screen.getByTestId('dialog')).toBeInTheDocument();
      expect(screen.getByText(/Start Free Trial/i)).toBeInTheDocument();
    });
  });

  describe('premium user', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: { id: '1', email: 'test@test.com' }, isAuthenticated: true });
      mockUseSubscription.mockReturnValue({
        subscription: { tier: 2 }, // Premium tier
        loading: false,
      });
    });

    it('should NOT render for premium users', () => {
      render(<ExitIntentPopup />);

      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
    });
  });

  describe('excluded paths', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: null, isAuthenticated: false });
      mockUseSubscription.mockReturnValue({
        subscription: null,
        loading: false,
      });
    });

    const excludedPaths = ['/auth/login', '/auth/register', '/upgrade', '/payment/success', '/pricing', '/admin/dashboard'];

    excludedPaths.forEach((path) => {
      it(`should NOT render on ${path}`, () => {
        mockPathname.mockReturnValue(path);

        render(<ExitIntentPopup />);

        expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('exit intent not triggered', () => {
    it('should NOT render when exit intent is not shown', () => {
      mockUseAuth.mockReturnValue({ user: null, isAuthenticated: false });
      mockUseSubscription.mockReturnValue({
        subscription: null,
        loading: false,
      });
      mockUseExitIntent.mockReturnValue({ showExitIntent: false, dismiss: jest.fn() });

      render(<ExitIntentPopup />);

      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
    });
  });

  describe('dismiss', () => {
    it('should call dismiss when dismiss button is clicked', () => {
      const mockDismiss = jest.fn();
      mockUseAuth.mockReturnValue({ user: null, isAuthenticated: false });
      mockUseSubscription.mockReturnValue({
        subscription: null,
        loading: false,
      });
      mockUseExitIntent.mockReturnValue({ showExitIntent: true, dismiss: mockDismiss });

      render(<ExitIntentPopup />);

      const dismissButton = screen.getByLabelText(/dismiss/i);
      dismissButton.click();

      expect(mockDismiss).toHaveBeenCalled();
    });
  });
});
