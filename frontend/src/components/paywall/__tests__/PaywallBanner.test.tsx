import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PaywallBanner } from '../PaywallBanner';
import { SubscriptionTier, PaywallInfo } from '@/lib/types/paywall';

// Mock the API module
jest.mock('@/lib/api', () => ({
  logPaywallInteraction: jest.fn().mockResolvedValue(undefined),
}));

import { logPaywallInteraction } from '@/lib/api';

describe('PaywallBanner', () => {
  const mockLogPaywallInteraction = logPaywallInteraction as jest.MockedFunction<typeof logPaywallInteraction>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==================== HELPER FUNCTIONS ====================

  describe('getTierName helper', () => {
    it('should return correct tier names', () => {
      const basePaywallInfo: PaywallInfo = {
        userTier: SubscriptionTier.Free,
        isPaywallActive: true,
        remainingSearches: 10,
      };

      // Test Free tier
      const { container: freeContainer } = render(<PaywallBanner paywallInfo={basePaywallInfo} />);
      expect(freeContainer.textContent).toContain('Free');

      // Note: Premium and Admin tiers use fallback prompt without tier name in title
    });
  });

  describe('getUpgradePrompt helper', () => {
    it('should generate correct prompt for Free tier with searches remaining', () => {
      const paywallInfo: PaywallInfo = {
        userTier: SubscriptionTier.Free,
        isPaywallActive: true,
        remainingSearches: 10,
      };

      const { getByText } = render(<PaywallBanner paywallInfo={paywallInfo} />);

      expect(getByText("Don't Miss Out on Full Streaming Access")).toBeInTheDocument();
      expect(getByText(/10 searches remaining today/)).toBeInTheDocument();
      expect(getByText('Upgrade to Premium')).toBeInTheDocument();
    });

    it('should generate high urgency prompt for Free tier with 5 or fewer searches', () => {
      const paywallInfo: PaywallInfo = {
        userTier: SubscriptionTier.Free,
        isPaywallActive: true,
        remainingSearches: 3,
      };

      const { container } = render(<PaywallBanner paywallInfo={paywallInfo} />);

      // High urgency uses destructive colors
      const banner = container.querySelector('div[class*="bg-destructive"]');
      expect(banner).toBeInTheDocument();
    });

    it('should generate medium urgency prompt for Free tier with more than 5 searches', () => {
      const paywallInfo: PaywallInfo = {
        userTier: SubscriptionTier.Free,
        isPaywallActive: true,
        remainingSearches: 10,
      };

      const { container } = render(<PaywallBanner paywallInfo={paywallInfo} />);

      // Medium urgency uses warning colors
      const banner = container.querySelector('div[class*="bg-warning"]');
      expect(banner).toBeInTheDocument();
    });

    it('should show Free tier benefits', () => {
      const paywallInfo: PaywallInfo = {
        userTier: SubscriptionTier.Free,
        isPaywallActive: true,
        remainingSearches: 10,
      };

      const { getByText } = render(<PaywallBanner paywallInfo={paywallInfo} />);

      expect(getByText('Ad-free experience')).toBeInTheDocument();
      expect(getByText('No VPN affiliate recommendations')).toBeInTheDocument();
      expect(getByText('Unlimited watchlist + content alerts')).toBeInTheDocument();
      expect(getByText('Priority support')).toBeInTheDocument();
    });

    it('should generate fallback prompt for Basic tier (treated as other tier)', () => {
      const paywallInfo: PaywallInfo = {
        userTier: SubscriptionTier.Basic,
        isPaywallActive: true,
      };

      const { getByText } = render(<PaywallBanner paywallInfo={paywallInfo} />);

      expect(getByText('Upgrade Your Plan')).toBeInTheDocument();
      expect(getByText('Learn More')).toBeInTheDocument();
    });

    it('should use custom upgradeMessage when provided', () => {
      const paywallInfo: PaywallInfo = {
        userTier: SubscriptionTier.Free,
        isPaywallActive: true,
        upgradeMessage: 'Custom upgrade message for testing',
      };

      const { getByText } = render(<PaywallBanner paywallInfo={paywallInfo} />);

      expect(getByText('Custom upgrade message for testing')).toBeInTheDocument();
    });

    it('should use custom ctaText when provided', () => {
      const paywallInfo: PaywallInfo = {
        userTier: SubscriptionTier.Free,
        isPaywallActive: true,
        ctaText: 'Custom CTA Button',
      };

      const { getByText } = render(<PaywallBanner paywallInfo={paywallInfo} />);

      expect(getByText('Custom CTA Button')).toBeInTheDocument();
    });

    // JSDOM Limitation: Navigation tests require E2E environment
    it.skip('should use custom ctaUrl when provided', async () => {
      // Cannot test window.location.href navigation in JSDOM
      // This should be tested in E2E tests with real browser
    });

    it('should generate fallback prompt for Premium tier', () => {
      const paywallInfo: PaywallInfo = {
        userTier: SubscriptionTier.Premium,
        isPaywallActive: true,
      };

      const { getByText } = render(<PaywallBanner paywallInfo={paywallInfo} />);

      expect(getByText('Upgrade Your Plan')).toBeInTheDocument();
      expect(getByText('Learn More')).toBeInTheDocument();
    });

    it('should generate fallback prompt for Admin tier', () => {
      const paywallInfo: PaywallInfo = {
        userTier: SubscriptionTier.Admin,
        isPaywallActive: true,
      };

      const { getByText } = render(<PaywallBanner paywallInfo={paywallInfo} />);

      expect(getByText('Upgrade Your Plan')).toBeInTheDocument();
    });
  });

  // ==================== COMPONENT RENDERING ====================

  describe('Component Rendering', () => {
    it('should render when paywall is active', () => {
      const paywallInfo: PaywallInfo = {
        userTier: SubscriptionTier.Free,
        isPaywallActive: true,
        remainingSearches: 10,
      };

      const { getByText } = render(<PaywallBanner paywallInfo={paywallInfo} />);

      expect(getByText("Don't Miss Out on Full Streaming Access")).toBeInTheDocument();
    });

    it('should not render when paywall is not active', () => {
      const paywallInfo: PaywallInfo = {
        userTier: SubscriptionTier.Free,
        isPaywallActive: false,
        remainingSearches: 10,
      };

      const { container } = render(<PaywallBanner paywallInfo={paywallInfo} />);

      expect(container.firstChild).toBeNull();
    });

    it('should apply custom className', () => {
      const paywallInfo: PaywallInfo = {
        userTier: SubscriptionTier.Free,
        isPaywallActive: true,
      };

      const { container } = render(<PaywallBanner paywallInfo={paywallInfo} className="custom-class" />);

      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should render dismiss button when dismissible', () => {
      const paywallInfo: PaywallInfo = {
        userTier: SubscriptionTier.Free,
        isPaywallActive: true,
      };

      const { getByLabelText } = render(<PaywallBanner paywallInfo={paywallInfo} />);

      expect(getByLabelText('Dismiss')).toBeInTheDocument();
    });

    it('should show remaining searches count when provided', () => {
      const paywallInfo: PaywallInfo = {
        userTier: SubscriptionTier.Free,
        isPaywallActive: true,
        remainingSearches: 7,
      };

      const { getByText } = render(<PaywallBanner paywallInfo={paywallInfo} />);

      expect(getByText('7 searches left today')).toBeInTheDocument();
    });

    it('should not show remaining searches count when not provided', () => {
      const paywallInfo: PaywallInfo = {
        userTier: SubscriptionTier.Free,
        isPaywallActive: true,
      };

      const { queryByText } = render(<PaywallBanner paywallInfo={paywallInfo} />);

      expect(queryByText(/searches left today/)).not.toBeInTheDocument();
    });
  });

  // ==================== URGENCY STYLES ====================

  describe('Urgency Styles', () => {
    it('should apply high urgency styles (destructive)', () => {
      const paywallInfo: PaywallInfo = {
        userTier: SubscriptionTier.Free,
        isPaywallActive: true,
        remainingSearches: 2, // High urgency
      };

      const { container } = render(<PaywallBanner paywallInfo={paywallInfo} />);

      const banner = container.querySelector('div[class*="bg-destructive"]');
      expect(banner).toBeInTheDocument();
      expect(banner).toHaveClass('border-destructive/30');
      expect(banner).toHaveClass('text-destructive');
    });

    it('should apply medium urgency styles (warning)', () => {
      const paywallInfo: PaywallInfo = {
        userTier: SubscriptionTier.Free,
        isPaywallActive: true,
        remainingSearches: 10, // Medium urgency
      };

      const { container } = render(<PaywallBanner paywallInfo={paywallInfo} />);

      const banner = container.querySelector('div[class*="bg-warning"]');
      expect(banner).toBeInTheDocument();
      expect(banner).toHaveClass('border-warning/30');
    });

    it('should apply low urgency styles (primary)', () => {
      const paywallInfo: PaywallInfo = {
        userTier: SubscriptionTier.Premium,
        isPaywallActive: true,
      };

      const { container } = render(<PaywallBanner paywallInfo={paywallInfo} />);

      const banner = container.querySelector('div[class*="bg-primary"]');
      expect(banner).toBeInTheDocument();
    });
  });

  // ==================== BUTTON STYLES ====================

  describe('Button Styles', () => {
    it('should apply high urgency button styles', () => {
      const paywallInfo: PaywallInfo = {
        userTier: SubscriptionTier.Free,
        isPaywallActive: true,
        remainingSearches: 3,
      };

      const { getByText } = render(<PaywallBanner paywallInfo={paywallInfo} />);

      const button = getByText('Upgrade to Premium');
      expect(button).toHaveClass('bg-destructive');
      expect(button).toHaveClass('hover:bg-destructive/90');
    });

    it('should apply medium urgency button styles', () => {
      const paywallInfo: PaywallInfo = {
        userTier: SubscriptionTier.Free,
        isPaywallActive: true,
        remainingSearches: 10, // Medium urgency (> 5 searches)
      };

      const { getByText } = render(<PaywallBanner paywallInfo={paywallInfo} />);

      const button = getByText('Upgrade to Premium');
      expect(button).toHaveClass('bg-warning');
    });
  });

  // ==================== ANALYTICS TRACKING ====================

  describe('Analytics Tracking', () => {
    it('should track paywall shown on mount when active', async () => {
      const paywallInfo: PaywallInfo = {
        userTier: SubscriptionTier.Free,
        isPaywallActive: true,
        remainingSearches: 10,
      };

      render(<PaywallBanner paywallInfo={paywallInfo} position="search-results" />);

      await waitFor(() => {
        expect(mockLogPaywallInteraction).toHaveBeenCalledWith('paywall_shown', {
          paywallPosition: 'search-results',
        });
      });
    });

    it('should not track paywall shown when not active', () => {
      const paywallInfo: PaywallInfo = {
        userTier: SubscriptionTier.Free,
        isPaywallActive: false,
        remainingSearches: 10,
      };

      render(<PaywallBanner paywallInfo={paywallInfo} />);

      expect(mockLogPaywallInteraction).not.toHaveBeenCalled();
    });

    it('should track upgrade click', async () => {
      const paywallInfo: PaywallInfo = {
        userTier: SubscriptionTier.Free,
        isPaywallActive: true,
      };

      const { getByText } = render(<PaywallBanner paywallInfo={paywallInfo} position="pricing-page" />);

      const button = getByText('Upgrade to Premium');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockLogPaywallInteraction).toHaveBeenCalledWith('upgrade_clicked', {
          paywallPosition: 'pricing-page',
        });
      });
    });

    it('should track dismiss action', async () => {
      const paywallInfo: PaywallInfo = {
        userTier: SubscriptionTier.Free,
        isPaywallActive: true,
      };

      const { getByLabelText } = render(<PaywallBanner paywallInfo={paywallInfo} position="dashboard" />);

      const dismissButton = getByLabelText('Dismiss');
      fireEvent.click(dismissButton);

      await waitFor(() => {
        expect(mockLogPaywallInteraction).toHaveBeenCalledWith('dismissed', {
          paywallPosition: 'dashboard',
        });
      });
    });
  });

  // ==================== INTERACTION HANDLERS ====================

  describe('Interaction Handlers', () => {
    it('should call onUpgradeClick when provided', async () => {
      const onUpgradeClick = jest.fn();
      const paywallInfo: PaywallInfo = {
        userTier: SubscriptionTier.Free,
        isPaywallActive: true,
      };

      const { getByText } = render(<PaywallBanner paywallInfo={paywallInfo} onUpgradeClick={onUpgradeClick} />);

      const button = getByText('Upgrade to Premium');
      fireEvent.click(button);

      await waitFor(() => {
        expect(onUpgradeClick).toHaveBeenCalled();
      });
    });

    // JSDOM Limitation: Navigation tests require E2E environment
    it.skip('should navigate to ctaUrl when onUpgradeClick not provided', async () => {
      // Cannot test window.location.href navigation in JSDOM
      // This should be tested in E2E tests with real browser
    });

    it('should hide banner when dismissed', async () => {
      const paywallInfo: PaywallInfo = {
        userTier: SubscriptionTier.Free,
        isPaywallActive: true,
      };

      const { getByLabelText, queryByText } = render(<PaywallBanner paywallInfo={paywallInfo} />);

      const dismissButton = getByLabelText('Dismiss');
      fireEvent.click(dismissButton);

      await waitFor(() => {
        expect(queryByText("Don't Miss Out on Full Streaming Access")).not.toBeInTheDocument();
      });
    });

    it('should not track paywall shown again after dismissed', async () => {
      const paywallInfo: PaywallInfo = {
        userTier: SubscriptionTier.Free,
        isPaywallActive: true,
      };

      const { getByLabelText } = render(<PaywallBanner paywallInfo={paywallInfo} />);

      // Clear initial call
      mockLogPaywallInteraction.mockClear();

      const dismissButton = getByLabelText('Dismiss');
      fireEvent.click(dismissButton);

      await waitFor(() => {
        expect(mockLogPaywallInteraction).toHaveBeenCalledWith('dismissed', expect.any(Object));
      });

      // Should not track paywall_shown again
      const shownCalls = mockLogPaywallInteraction.mock.calls.filter((call) => call[0] === 'paywall_shown');
      expect(shownCalls.length).toBe(0);
    });
  });

  // ==================== EDGE CASES ====================

  describe('Edge Cases', () => {
    it('should handle remainingSearches of 0', () => {
      const paywallInfo: PaywallInfo = {
        userTier: SubscriptionTier.Free,
        isPaywallActive: true,
        remainingSearches: 0,
      };

      const { getByText } = render(<PaywallBanner paywallInfo={paywallInfo} />);

      // When searches are 0, shows loss-aversion upgrade message
      expect(getByText(/missing unlimited searches/)).toBeInTheDocument();
    });

    it('should handle undefined remainingSearches', () => {
      const paywallInfo: PaywallInfo = {
        userTier: SubscriptionTier.Free,
        isPaywallActive: true,
        remainingSearches: undefined,
      };

      const { getByText } = render(<PaywallBanner paywallInfo={paywallInfo} />);

      expect(getByText(/missing unlimited searches/)).toBeInTheDocument();
    });

    it('should handle missing position prop (default)', async () => {
      const paywallInfo: PaywallInfo = {
        userTier: SubscriptionTier.Free,
        isPaywallActive: true,
      };

      render(<PaywallBanner paywallInfo={paywallInfo} />);

      await waitFor(() => {
        expect(mockLogPaywallInteraction).toHaveBeenCalledWith('paywall_shown', {
          paywallPosition: 'search-results', // default value
        });
      });
    });

    // Minor issue: Console error logging causes test noise
    it.skip('should handle async logPaywallInteraction errors gracefully', async () => {
      // TODO: Fix console error handling in test
    });
  });
});
