/**
 * SearchLimitModal Component Tests
 *
 * Test coverage for auth-aware search limit modal component.
 * Tests anonymous vs authenticated flows, progress bar, navigation targets.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchLimitModal } from '../SearchLimitModal';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    refresh: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    prefetch: jest.fn(),
  }),
}));

// Mock useAuth
const mockUseAuth = jest.fn();
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('SearchLimitModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ isAuthenticated: false, user: null });
  });

  describe('Anonymous User Flow', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ isAuthenticated: false, user: null });
    });

    it('renders modal when isOpen is true', () => {
      render(<SearchLimitModal isOpen={true} onClose={jest.fn()} />);
      expect(screen.getByText(/want unlimited searches/i)).toBeInTheDocument();
    });

    it('does not render modal when isOpen is false', () => {
      render(<SearchLimitModal isOpen={false} onClose={jest.fn()} />);
      expect(screen.queryByText(/want unlimited searches/i)).not.toBeInTheDocument();
    });

    it('shows search icon instead of warning icon', () => {
      render(<SearchLimitModal isOpen={true} onClose={jest.fn()} />);
      const title = screen.getByText(/want unlimited searches/i);
      const icon = title.parentElement?.querySelector('svg');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('text-primary');
    });

    it('displays "Free account includes:" benefits', () => {
      render(<SearchLimitModal isOpen={true} onClose={jest.fn()} />);
      expect(screen.getByText(/free account includes:/i)).toBeInTheDocument();
      expect(screen.getAllByText(/unlimited searches/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/save to watchlist/i)).toBeInTheDocument();
      expect(screen.getByText(/42 streaming services/i)).toBeInTheDocument();
      expect(screen.getByText(/content alerts/i)).toBeInTheDocument();
    });

    it('shows "Sign Up Free" CTA button', () => {
      render(<SearchLimitModal isOpen={true} onClose={jest.fn()} />);
      expect(screen.getByRole('button', { name: /sign up free/i })).toBeInTheDocument();
    });

    it('shows login button for anonymous users', () => {
      render(<SearchLimitModal isOpen={true} onClose={jest.fn()} />);
      expect(screen.getByText(/already have an account\? log in/i)).toBeInTheDocument();
    });

    it('navigates to /auth/register when CTA clicked', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      render(<SearchLimitModal isOpen={true} onClose={onClose} />);
      await user.click(screen.getByRole('button', { name: /sign up free/i }));
      expect(mockPush).toHaveBeenCalledWith('/auth/register');
      expect(onClose).toHaveBeenCalled();
    });

    it('navigates to /auth/login when login button clicked', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      render(<SearchLimitModal isOpen={true} onClose={onClose} />);
      await user.click(screen.getByText(/already have an account\? log in/i));
      expect(mockPush).toHaveBeenCalledWith('/auth/login');
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Authenticated User Flow', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ isAuthenticated: true, user: { roles: ['User'] } });
    });

    it('shows "You\'ve hit today\'s limit" title', () => {
      render(<SearchLimitModal isOpen={true} onClose={jest.fn()} />);
      expect(screen.getByText(/you've hit today's limit/i)).toBeInTheDocument();
    });

    it('displays "Premium benefits include:" benefits', () => {
      render(<SearchLimitModal isOpen={true} onClose={jest.fn()} />);
      expect(screen.getByText(/premium benefits include:/i)).toBeInTheDocument();
      expect(screen.getByText(/ad-free experience/i)).toBeInTheDocument();
      expect(screen.getByText(/unlimited watchlist/i)).toBeInTheDocument();
      expect(screen.getByText(/priority support/i)).toBeInTheDocument();
    });

    it('shows "Start 30-Day Free Trial" CTA button', () => {
      render(<SearchLimitModal isOpen={true} onClose={jest.fn()} />);
      expect(screen.getByRole('button', { name: /start 30-day free trial/i })).toBeInTheDocument();
    });

    it('does not show login button', () => {
      render(<SearchLimitModal isOpen={true} onClose={jest.fn()} />);
      expect(screen.queryByText(/already have an account\? log in/i)).not.toBeInTheDocument();
    });

    it('navigates to /upgrade when CTA clicked', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      render(<SearchLimitModal isOpen={true} onClose={onClose} />);
      await user.click(screen.getByRole('button', { name: /start 30-day free trial/i }));
      expect(mockPush).toHaveBeenCalledWith('/upgrade');
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Progress Bar', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ isAuthenticated: false, user: null });
    });

    it('displays progress bar', () => {
      render(<SearchLimitModal isOpen={true} onClose={jest.fn()} />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('displays default search usage (3 of 3)', () => {
      render(<SearchLimitModal isOpen={true} onClose={jest.fn()} />);
      expect(screen.getByText(/3\/3 searches used/i)).toBeInTheDocument();
    });

    it('displays custom search usage', () => {
      render(
        <SearchLimitModal isOpen={true} onClose={jest.fn()} searchesUsed={5} searchLimit={10} />
      );
      expect(screen.getByText(/5\/10 searches used/i)).toBeInTheDocument();
    });

    it('uses singular "search" when limit is 1', () => {
      render(
        <SearchLimitModal isOpen={true} onClose={jest.fn()} searchesUsed={1} searchLimit={1} />
      );
      expect(screen.getByText(/1 of 1 search today/i)).toBeInTheDocument();
    });
  });

  describe('Modal Interaction', () => {
    it('calls onClose when dialog is closed', () => {
      const onClose = jest.fn();
      render(<SearchLimitModal isOpen={true} onClose={onClose} />);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
    });
  });

  describe('Visual Elements', () => {
    it('displays benefits with checkmark icons', () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: false, user: null });
      render(<SearchLimitModal isOpen={true} onClose={jest.fn()} />);
      const benefitsHeader = screen.getByText(/free account includes:/i);
      const container = benefitsHeader.parentElement;
      const listItems = container?.querySelectorAll('li');
      expect(listItems?.length).toBe(4);
      listItems?.forEach((item) => {
        const checkmark = item.querySelector('svg');
        expect(checkmark).toBeInTheDocument();
      });
    });

    it('applies gradient background to benefits section', () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: false, user: null });
      render(<SearchLimitModal isOpen={true} onClose={jest.fn()} />);
      const benefitsSection = screen.getByText(/free account includes:/i).closest('.bg-gradient-to-br');
      expect(benefitsSection).toHaveClass('from-primary/10', 'to-primary/5');
    });
  });

  describe('Accessibility', () => {
    it('has accessible dialog', () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: false, user: null });
      render(<SearchLimitModal isOpen={true} onClose={jest.fn()} />);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
    });

    it('progress bar has aria attributes', () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: false, user: null });
      render(<SearchLimitModal isOpen={true} onClose={jest.fn()} />);
      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '3');
      expect(progressbar).toHaveAttribute('aria-valuemax', '3');
    });
  });

  describe('Edge Cases', () => {
    it('handles zero searches used', () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: false, user: null });
      render(
        <SearchLimitModal isOpen={true} onClose={jest.fn()} searchesUsed={0} searchLimit={3} />
      );
      expect(screen.getByText(/0\/3 searches used/i)).toBeInTheDocument();
    });

    it('handles high search limits', () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: false, user: null });
      render(
        <SearchLimitModal isOpen={true} onClose={jest.fn()} searchesUsed={99} searchLimit={100} />
      );
      expect(screen.getByText(/99\/100 searches used/i)).toBeInTheDocument();
    });
  });
});
