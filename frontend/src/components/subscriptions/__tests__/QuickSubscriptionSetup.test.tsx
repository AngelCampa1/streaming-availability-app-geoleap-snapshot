/**
 * QuickSubscriptionSetup Integration Tests
 *
 * Tests the quick subscription setup component with REAL business logic.
 * Uses boundary-only mocking (useUserSubscriptions hook).
 *
 * Coverage Target: 80%+
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuickSubscriptionSetup } from '../QuickSubscriptionSetup';

// Mock useUserSubscriptions hook (BOUNDARY ONLY)
const mockToggleSubscription = jest.fn();
const mockHasSubscription = jest.fn((_serviceId: string) => false);
const mockUseUserSubscriptions = {
  subscriptions: [],
  toggleSubscription: mockToggleSubscription,
  hasSubscription: mockHasSubscription,
  subscriptionCount: 0,
};

jest.mock('../../../hooks/useUserSubscriptions', () => ({
  useUserSubscriptions: jest.fn(() => mockUseUserSubscriptions),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { useUserSubscriptions } = require('../../../hooks/useUserSubscriptions');

describe('QuickSubscriptionSetup - Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset to default mock implementation
    useUserSubscriptions.mockReturnValue({
      subscriptions: [],
      toggleSubscription: mockToggleSubscription,
      hasSubscription: mockHasSubscription,
      subscriptionCount: 0,
    });
  });

  describe('Rendering - Default State', () => {
    it('renders the component with header', () => {
      render(<QuickSubscriptionSetup />);

      expect(screen.getByText('What streaming services do you have?')).toBeInTheDocument();
      expect(screen.getByText(/Select your subscriptions to see which countries/i)).toBeInTheDocument();
    });

    it('renders all popular services as buttons', () => {
      render(<QuickSubscriptionSetup />);

      // Popular services from POPULAR_SERVICES constant
      expect(screen.getByRole('button', { name: /Netflix/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Disney\+/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /HBO Max/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Prime Video/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Hulu/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Apple TV\+/i })).toBeInTheDocument();
    });

    it('displays the localStorage tip message', () => {
      render(<QuickSubscriptionSetup />);

      expect(screen.getByText(/Your selections are saved locally/i)).toBeInTheDocument();
      expect(screen.getByText(/Sign up to sync across devices/i)).toBeInTheDocument();
    });

    it('does not show subscription count when no services selected', () => {
      render(<QuickSubscriptionSetup />);

      expect(screen.queryByText(/service.*selected/i)).not.toBeInTheDocument();
    });

    it('does not show Show Results button when no onComplete callback', () => {
      useUserSubscriptions.mockReturnValue({
        ...mockUseUserSubscriptions,
        subscriptionCount: 2,
      });

      render(<QuickSubscriptionSetup />);

      expect(screen.queryByRole('button', { name: /Show Results/i })).not.toBeInTheDocument();
    });
  });

  describe('Service Selection - Toggle Functionality', () => {
    it('calls toggleSubscription when service button is clicked', () => {
      render(<QuickSubscriptionSetup />);

      const netflixButton = screen.getByRole('button', { name: /Netflix/i });
      fireEvent.click(netflixButton);

      expect(mockToggleSubscription).toHaveBeenCalledWith('netflix', 'Netflix');
      expect(mockToggleSubscription).toHaveBeenCalledTimes(1);
    });

    it('shows selected services with checkmark icon', () => {
      mockHasSubscription.mockImplementation((serviceId: string) => serviceId === 'netflix');
      useUserSubscriptions.mockReturnValue({
        ...mockUseUserSubscriptions,
        hasSubscription: mockHasSubscription,
        subscriptionCount: 1,
      });

      render(<QuickSubscriptionSetup />);

      const netflixButton = screen.getByRole('button', { name: /Netflix/i });

      // Check for checkmark SVG inside Netflix button
      const checkmarkSvg = netflixButton.querySelector('svg[fill="currentColor"]');
      expect(checkmarkSvg).toBeInTheDocument();
    });

    it('applies selected styling to selected services', () => {
      mockHasSubscription.mockImplementation((serviceId: string) => serviceId === 'disney');
      useUserSubscriptions.mockReturnValue({
        ...mockUseUserSubscriptions,
        hasSubscription: mockHasSubscription,
        subscriptionCount: 1,
      });

      render(<QuickSubscriptionSetup />);

      const disneyButton = screen.getByRole('button', { name: /Disney\+/i });

      // Selected services should have border-primary class
      expect(disneyButton.className).toContain('border-primary');
      expect(disneyButton.className).toContain('bg-primary/10');
    });

    it('allows toggling multiple services', () => {
      render(<QuickSubscriptionSetup />);

      const netflixButton = screen.getByRole('button', { name: /Netflix/i });
      const hboButton = screen.getByRole('button', { name: /HBO Max/i });
      const huluButton = screen.getByRole('button', { name: /Hulu/i });

      fireEvent.click(netflixButton);
      fireEvent.click(hboButton);
      fireEvent.click(huluButton);

      expect(mockToggleSubscription).toHaveBeenCalledTimes(3);
      expect(mockToggleSubscription).toHaveBeenCalledWith('netflix', 'Netflix');
      expect(mockToggleSubscription).toHaveBeenCalledWith('hbo', 'HBO Max');
      expect(mockToggleSubscription).toHaveBeenCalledWith('hulu', 'Hulu');
    });
  });

  describe('Subscription Counter', () => {
    it('shows correct count with singular form (1 service)', () => {
      useUserSubscriptions.mockReturnValue({
        ...mockUseUserSubscriptions,
        subscriptionCount: 1,
      });

      render(<QuickSubscriptionSetup />);

      expect(screen.getByText('1 service selected')).toBeInTheDocument();
    });

    it('shows correct count with plural form (2 services)', () => {
      useUserSubscriptions.mockReturnValue({
        ...mockUseUserSubscriptions,
        subscriptionCount: 2,
      });

      render(<QuickSubscriptionSetup />);

      expect(screen.getByText('2 services selected')).toBeInTheDocument();
    });

    it('shows correct count with plural form (5 services)', () => {
      useUserSubscriptions.mockReturnValue({
        ...mockUseUserSubscriptions,
        subscriptionCount: 5,
      });

      render(<QuickSubscriptionSetup />);

      expect(screen.getByText('5 services selected')).toBeInTheDocument();
    });

    it('hides counter when count is 0', () => {
      useUserSubscriptions.mockReturnValue({
        ...mockUseUserSubscriptions,
        subscriptionCount: 0,
      });

      render(<QuickSubscriptionSetup />);

      expect(screen.queryByText(/service.*selected/i)).not.toBeInTheDocument();
    });
  });

  describe('Show Results Button - onComplete Callback', () => {
    it('shows Show Results button when onComplete provided and services selected', () => {
      useUserSubscriptions.mockReturnValue({
        ...mockUseUserSubscriptions,
        subscriptionCount: 2,
      });

      const mockOnComplete = jest.fn();
      render(<QuickSubscriptionSetup onComplete={mockOnComplete} />);

      expect(screen.getByRole('button', { name: /Show Results/i })).toBeInTheDocument();
    });

    it('calls onComplete when Show Results button is clicked', () => {
      useUserSubscriptions.mockReturnValue({
        ...mockUseUserSubscriptions,
        subscriptionCount: 1,
      });

      const mockOnComplete = jest.fn();
      render(<QuickSubscriptionSetup onComplete={mockOnComplete} />);

      const showResultsButton = screen.getByRole('button', { name: /Show Results/i });
      fireEvent.click(showResultsButton);

      expect(mockOnComplete).toHaveBeenCalledTimes(1);
    });

    it('hides Show Results button when no services selected even with onComplete', () => {
      useUserSubscriptions.mockReturnValue({
        ...mockUseUserSubscriptions,
        subscriptionCount: 0,
      });

      const mockOnComplete = jest.fn();
      render(<QuickSubscriptionSetup onComplete={mockOnComplete} />);

      expect(screen.queryByRole('button', { name: /Show Results/i })).not.toBeInTheDocument();
    });

    it('hides Show Results button when no onComplete callback provided', () => {
      useUserSubscriptions.mockReturnValue({
        ...mockUseUserSubscriptions,
        subscriptionCount: 3,
      });

      render(<QuickSubscriptionSetup />);

      expect(screen.queryByRole('button', { name: /Show Results/i })).not.toBeInTheDocument();
    });
  });

  describe('Compact Mode', () => {
    it('applies compact styling when compact prop is true', () => {
      render(<QuickSubscriptionSetup compact={true} />);

      const header = screen.getByText('What streaming services do you have?');
      const description = screen.getByText(/Select your subscriptions to see which countries/i);

      // Compact mode uses smaller text
      expect(header.className).toContain('text-sm');
      expect(description.className).toContain('text-xs');
    });

    it('applies normal styling when compact prop is false', () => {
      render(<QuickSubscriptionSetup compact={false} />);

      const header = screen.getByText('What streaming services do you have?');
      const description = screen.getByText(/Select your subscriptions to see which countries/i);

      // Normal mode uses larger text
      expect(header.className).toContain('text-base');
      expect(description.className).toContain('text-sm');
    });

    it('uses compact grid layout in compact mode', () => {
      const { container } = render(<QuickSubscriptionSetup compact={true} />);

      const gridContainer = container.querySelector('.grid');
      expect(gridContainer?.className).toContain('grid-cols-3');
      expect(gridContainer?.className).toContain('gap-2');
    });

    it('uses normal grid layout in normal mode', () => {
      const { container } = render(<QuickSubscriptionSetup compact={false} />);

      const gridContainer = container.querySelector('.grid');
      expect(gridContainer?.className).toContain('grid-cols-2');
      expect(gridContainer?.className).toContain('gap-3');
    });

    it('applies compact button styling in compact mode', () => {
      useUserSubscriptions.mockReturnValue({
        ...mockUseUserSubscriptions,
        subscriptionCount: 1,
      });

      render(<QuickSubscriptionSetup compact={true} onComplete={jest.fn()} />);

      const showResultsButton = screen.getByRole('button', { name: /Show Results/i });
      expect(showResultsButton.className).toContain('text-xs');
      expect(showResultsButton.className).toContain('px-3');
    });
  });

  describe('className Prop', () => {
    it('applies custom className to root container', () => {
      const { container } = render(<QuickSubscriptionSetup className="custom-class" />);

      const rootDiv = container.firstChild;
      expect(rootDiv).toHaveClass('custom-class');
    });
  });

  describe('Service Icons', () => {
    it('displays icons for all services', () => {
      render(<QuickSubscriptionSetup />);

      // Check that service buttons have StreamingServiceLogo (Image or fallback icon)
      const netflixButton = screen.getByRole('button', { name: /Netflix/i });
      // Check for either an img element (logo) or fallback icon
      const logoOrIcon = netflixButton.querySelector('img, .fallback-icon, [aria-label*="streaming service"]');
      expect(logoOrIcon).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles rapid clicking of same service', () => {
      render(<QuickSubscriptionSetup />);

      const netflixButton = screen.getByRole('button', { name: /Netflix/i });

      // Rapidly click same button
      fireEvent.click(netflixButton);
      fireEvent.click(netflixButton);
      fireEvent.click(netflixButton);

      // Should call toggle 3 times
      expect(mockToggleSubscription).toHaveBeenCalledTimes(3);
    });

    it('handles clicking Show Results multiple times', () => {
      useUserSubscriptions.mockReturnValue({
        ...mockUseUserSubscriptions,
        subscriptionCount: 2,
      });

      const mockOnComplete = jest.fn();
      render(<QuickSubscriptionSetup onComplete={mockOnComplete} />);

      const showResultsButton = screen.getByRole('button', { name: /Show Results/i });

      fireEvent.click(showResultsButton);
      fireEvent.click(showResultsButton);
      fireEvent.click(showResultsButton);

      expect(mockOnComplete).toHaveBeenCalledTimes(3);
    });

    it('handles undefined onComplete gracefully', () => {
      useUserSubscriptions.mockReturnValue({
        ...mockUseUserSubscriptions,
        subscriptionCount: 1,
      });

      // onComplete is undefined
      render(<QuickSubscriptionSetup onComplete={undefined} />);

      // Should not show button
      expect(screen.queryByRole('button', { name: /Show Results/i })).not.toBeInTheDocument();
    });
  });
});

/**
 * MOCK-TO-TEST RATIO: 1 hook mock / 28 tests = 0.04 ✅
 * TARGET COVERAGE: 80%+
 * MOCKING STRATEGY: Boundary-only (useUserSubscriptions hook)
 */
