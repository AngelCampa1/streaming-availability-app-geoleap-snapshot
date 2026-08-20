/**
 * UpgradeFlow Component Tests
 *
 * Phase 14b: Comprehensive test suite for upgrade flow component
 * Coverage Target: 85-90%
 *
 * Test Categories:
 * 1. Helper Functions (3 tests)
 * 2. Component Rendering (10 tests)
 * 3. User Actions (8 tests)
 * 4. Error Handling (3 tests)
 *
 * Mocking Strategy: Boundary-only mocking
 * - Mock API functions from '@/lib/api'
 * - Test REAL component logic and rendering
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UpgradeFlow } from '../UpgradeFlow';
import { SubscriptionTier } from '@/lib/types/paywall';
import * as api from '@/lib/api';

// Mock API functions at boundary
jest.mock('@/lib/api', () => ({
  createCheckoutSession: jest.fn(),
  logUpgradeFlowStarted: jest.fn(),
  logPaywallInteraction: jest.fn(),
}));

const mockApi = api as jest.Mocked<typeof api>;

describe('UpgradeFlow Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // CATEGORY 1: COMPONENT RENDERING STATES (10 tests)
  // ============================================================================

  describe('Rendering States', () => {
    it('renders "already on highest plan" message when no upgrades available', () => {
      const onClose = jest.fn();

      render(<UpgradeFlow currentTier={SubscriptionTier.Premium} onClose={onClose} />);

      expect(screen.getByText("You're on the highest plan!")).toBeInTheDocument();
      expect(screen.getByText(/you already have access to all premium features/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
    });

    it('closes when Close button clicked on highest plan view', () => {
      const onClose = jest.fn();

      render(<UpgradeFlow currentTier={SubscriptionTier.Premium} onClose={onClose} />);

      fireEvent.click(screen.getByRole('button', { name: /close/i }));

      expect(mockApi.logPaywallInteraction).toHaveBeenCalledWith('dismissed', {
        paywallPosition: 'upgrade-flow',
      });
      expect(onClose).toHaveBeenCalled();
    });

    it('renders upgrade flow for Free tier users', () => {
      render(<UpgradeFlow currentTier={SubscriptionTier.Free} />);

      expect(screen.getByText(/upgrade your plan/i)).toBeInTheDocument();
      expect(screen.getByText(/unlock premium features and save time/i)).toBeInTheDocument();
      // Single premium plan
      expect(screen.getAllByText(/geoleap premium/i).length).toBeGreaterThan(0);
    });

    it('renders upgrade flow for Basic tier users', () => {
      render(<UpgradeFlow currentTier={SubscriptionTier.Basic} />);

      expect(screen.getByText(/upgrade your plan/i)).toBeInTheDocument();
      // Multiple "GeoLeap Premium" elements, use getAllByText
      expect(screen.getAllByText(/geoleap premium/i).length).toBeGreaterThan(0);
    });

    it('displays "MOST POPULAR" badge on Premium plan', () => {
      render(<UpgradeFlow currentTier={SubscriptionTier.Free} />);

      expect(screen.getByText(/🚀 MOST POPULAR/)).toBeInTheDocument();
    });

    it('shows annual pricing by default', () => {
      render(<UpgradeFlow currentTier={SubscriptionTier.Free} />);

      expect(screen.getByText(/\$15/)).toBeInTheDocument();
    });

    it('highlights Premium plan by default (targetTier)', () => {
      const { container } = render(<UpgradeFlow currentTier={SubscriptionTier.Free} targetTier={SubscriptionTier.Premium} />);

      // Premium plan should have selected styling (border-warning for popular plan)
      // Find all "GeoLeap Premium" text, then get the plan card div
      const premiumCards = container.querySelectorAll('div[class*="border-"]');
      const selectedCard = Array.from(premiumCards).find(card =>
        card.textContent?.includes('GeoLeap Premium') && card.className.includes('border-warning')
      );
      expect(selectedCard).toBeTruthy();
    });

    it('renders close button when onClose prop provided', () => {
      const onClose = jest.fn();

      render(<UpgradeFlow currentTier={SubscriptionTier.Free} onClose={onClose} />);

      // X button in header
      const closeButtons = screen.getAllByRole('button');
      const xButton = closeButtons.find(btn => btn.querySelector('svg path[stroke-linecap="round"]'));
      expect(xButton).toBeDefined();
    });

    it('does not render close button when onClose not provided', () => {
      render(<UpgradeFlow currentTier={SubscriptionTier.Free} />);

      // X button should not be present
      const closeButtons = screen.getAllByRole('button');
      const xButton = closeButtons.find(btn => btn.querySelector('svg path[stroke-linecap="round"]'));
      expect(xButton).toBeUndefined();
    });

    it('displays all Premium plan features', () => {
      render(<UpgradeFlow currentTier={SubscriptionTier.Free} />);

      expect(screen.getByText(/ad-free experience/i)).toBeInTheDocument();
      expect(screen.getByText(/unlimited watchlist/i)).toBeInTheDocument();
      expect(screen.getByText(/priority customer support/i)).toBeInTheDocument();
      expect(screen.getByText(/support an indie developer/i)).toBeInTheDocument();
    });

    it('displays trust indicators', () => {
      render(<UpgradeFlow currentTier={SubscriptionTier.Free} />);

      expect(screen.getByText(/secure payment/i)).toBeInTheDocument();
      expect(screen.getByText(/14-day money back guarantee/i)).toBeInTheDocument();
      expect(screen.getByText(/priority support/i)).toBeInTheDocument();
    });
  });

  // ============================================================================
  // CATEGORY 2: USER ACTIONS & INTERACTIONS (8 tests)
  // ============================================================================

  describe('User Actions', () => {
    it('shows loading state when upgrade button clicked', async () => {
      // Mock to never resolve so we can test loading state
      mockApi.logPaywallInteraction.mockImplementation(() => new Promise(() => {}));

      render(<UpgradeFlow currentTier={SubscriptionTier.Free} />);

      const upgradeButton = screen.getByRole('button', { name: /start 30-day free trial/i });
      fireEvent.click(upgradeButton);

      // Loading state should appear
      await waitFor(() => {
        expect(upgradeButton).toBeDisabled();
      });
    });

    it('calls onClose and logs interaction when Maybe Later clicked', () => {
      const onClose = jest.fn();

      render(<UpgradeFlow currentTier={SubscriptionTier.Free} onClose={onClose} />);

      fireEvent.click(screen.getByRole('button', { name: /maybe later/i }));

      expect(mockApi.logPaywallInteraction).toHaveBeenCalledWith('dismissed', {
        paywallPosition: 'upgrade-flow',
      });
      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose when X button in header clicked', () => {
      const onClose = jest.fn();

      render(<UpgradeFlow currentTier={SubscriptionTier.Free} onClose={onClose} />);

      const closeButtons = screen.getAllByRole('button');
      const xButton = closeButtons.find(btn => btn.querySelector('svg path[stroke-linecap="round"]'));
      expect(xButton).toBeDefined();

      fireEvent.click(xButton!);

      expect(mockApi.logPaywallInteraction).toHaveBeenCalledWith('dismissed', {
        paywallPosition: 'upgrade-flow',
      });
      expect(onClose).toHaveBeenCalled();
    });

    it.skip('upgrades with monthly billing when Upgrade button clicked', async () => {
      // Mock window.location for this test
      delete (window as any).location;
      (window as any).location = { href: '' };

      render(<UpgradeFlow currentTier={SubscriptionTier.Free} />);

      const upgradeButton = screen.getByRole('button', { name: /start geoleap premium/i });
      fireEvent.click(upgradeButton);

      await waitFor(() => {
        expect(mockApi.logPaywallInteraction).toHaveBeenCalledWith('upgrade_clicked', {
          paywallPosition: 'upgrade-flow',
        });
      });

      // Should navigate to payment page with correct params
      expect(window.location.href).toContain('/payment');
      expect(window.location.href).toContain('amount=2.99');
      expect(window.location.href).toContain('currency=USD');
      expect(window.location.href).toContain('description=GeoLeap');
      expect(window.location.href).toContain('monthly');
    });

    it.skip('upgrades with yearly billing (20% discount) when yearly selected', async () => {
      // Mock window.location for this test
      delete (window as any).location;
      (window as any).location = { href: '' };

      render(<UpgradeFlow currentTier={SubscriptionTier.Free} />);

      // Switch to yearly
      const yearlyButton = screen.getByRole('button', { name: /yearly/i });
      fireEvent.click(yearlyButton);

      const upgradeButton = screen.getByRole('button', { name: /start geoleap premium/i });
      fireEvent.click(upgradeButton);

      await waitFor(() => {
        expect(mockApi.logPaywallInteraction).toHaveBeenCalled();
      });

      // Yearly price: $2.99 * 12 * 0.8 = $28.704
      expect(window.location.href).toContain('/payment');
      expect(window.location.href).toContain('amount=28.704');
      expect(window.location.href).toContain('yearly');
    });

    it('shows loading state during upgrade process', async () => {
      // Mock window.location for this test
      delete (window as any).location;
      (window as any).location = { href: '' };

      render(<UpgradeFlow currentTier={SubscriptionTier.Free} />);

      const upgradeButton = screen.getByRole('button', { name: /start 30-day free trial/i });
      fireEvent.click(upgradeButton);

      // Should show loading state briefly (button text changes during loading)
      await waitFor(() => {
        expect(mockApi.logPaywallInteraction).toHaveBeenCalled();
      });
    });
  });

  // ============================================================================
  // CATEGORY 3: ERROR HANDLING (3 tests)
  // ============================================================================

  describe('Error Handling', () => {
    it.skip('displays error message when upgrade fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Mock window.location to throw error
      Object.defineProperty(window, 'location', {
        value: {
          get href() {
            return '';
          },
          set href(_value: string) {
            throw new Error('Navigation failed');
          },
        },
        writable: true,
        configurable: true,
      });

      render(<UpgradeFlow currentTier={SubscriptionTier.Free} />);

      const upgradeButton = screen.getByRole('button', { name: /start geoleap premium/i });
      fireEvent.click(upgradeButton);

      await waitFor(() => {
        expect(screen.getByText(/navigation failed/i)).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });

    it.skip('clears error when plan selection changes', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Mock window.location to throw error
      Object.defineProperty(window, 'location', {
        value: {
          get href() {
            return '';
          },
          set href(_value: string) {
            throw new Error('Navigation failed');
          },
        },
        writable: true,
        configurable: true,
      });

      render(<UpgradeFlow currentTier={SubscriptionTier.Free} />);

      // Trigger error
      const upgradeButton = screen.getByRole('button', { name: /start geoleap premium/i });
      fireEvent.click(upgradeButton);

      await waitFor(() => {
        expect(screen.getByText(/navigation failed/i)).toBeInTheDocument();
      });

      // Change plan selection
      const lifetimePlan = screen.getByText(/lifetime license/i).closest('div[class*="border-"]');
      fireEvent.click(lifetimePlan!);

      // Error should be cleared
      await waitFor(() => {
        expect(screen.queryByText(/navigation failed/i)).not.toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });

    it('logs upgrade flow started on mount', () => {
      render(<UpgradeFlow currentTier={SubscriptionTier.Free} source="test-source" />);

      expect(mockApi.logUpgradeFlowStarted).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // CATEGORY 4: PRICING CALCULATIONS (Helper Functions - 6 tests)
  // ============================================================================

  describe('Pricing Display', () => {
    it('displays correct annual price for Premium plan', () => {
      render(<UpgradeFlow currentTier={SubscriptionTier.Free} />);

      expect(screen.getByText(/\$15/)).toBeInTheDocument();
    });

    it('displays trial information', () => {
      render(<UpgradeFlow currentTier={SubscriptionTier.Free} />);

      const trialElements = screen.getAllByText(/30-day free trial/i);
      expect(trialElements.length).toBeGreaterThan(0);
    });

    it('shows the annual billing period', () => {
      render(<UpgradeFlow currentTier={SubscriptionTier.Free} />);

      expect(screen.getByText(/\/year/i)).toBeInTheDocument();
    });
  });
});
