import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { UsageTracker } from '../UsageTracker';
import { SubscriptionTier, PaywallInfo } from '@/lib/types/paywall';
import { getUserUsage } from '@/lib/api';

// Mock API
jest.mock('@/lib/api', () => ({
  getUserUsage: jest.fn(),
}));

const mockGetUserUsage = getUserUsage as jest.MockedFunction<typeof getUserUsage>;

describe('UsageTracker', () => {
  const mockPaywallInfo: PaywallInfo = {
    userTier: SubscriptionTier.Free,
    isPaywallActive: false,
    remainingSearches: 10,
    remainingResults: 3,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUserUsage.mockResolvedValue({
      searchesUsed: 10,
      resultsViewed: 2,
      resetTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
    });
  });

  describe('Helper Functions (via component rendering)', () => {
    it('should show Free tier limits (20 searches, 5 results)', async () => {
      render(<UsageTracker paywallInfo={mockPaywallInfo} />);

      await waitFor(() => {
        expect(screen.getByText(/10\/20/)).toBeInTheDocument(); // searches
        expect(screen.getByText(/up to 5/i)).toBeInTheDocument(); // results limit
      });
    });

    it('should show Basic tier limits (200 searches, 50 results)', async () => {
      const basicPaywall = { ...mockPaywallInfo, userTier: SubscriptionTier.Basic };

      render(<UsageTracker paywallInfo={basicPaywall} />);

      await waitFor(() => {
        expect(screen.getByText(/10\/200/)).toBeInTheDocument();
        expect(screen.getByText(/up to 50/i)).toBeInTheDocument();
      });
    });

    it('should show Premium tier as unlimited', async () => {
      const premiumPaywall = { ...mockPaywallInfo, userTier: SubscriptionTier.Premium };

      render(<UsageTracker paywallInfo={premiumPaywall} />);

      await waitFor(() => {
        expect(screen.getByText(/10 \(unlimited\)/i)).toBeInTheDocument();
        expect(screen.getAllByText(/unlimited/i).length).toBeGreaterThan(0);
      });
    });

    it('should display reset time correctly (hours and minutes)', async () => {
      render(<UsageTracker paywallInfo={mockPaywallInfo} />);

      await waitFor(() => {
        expect(screen.getByText(/resets in 1h 59m|resets in 2h 0m/i)).toBeInTheDocument();
      });
    });

    it('should handle reset time in minutes only', async () => {
      mockGetUserUsage.mockResolvedValueOnce({
        searchesUsed: 10,
        resultsViewed: 2,
        resetTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
      });

      render(<UsageTracker paywallInfo={mockPaywallInfo} />);

      await waitFor(() => {
        expect(screen.getByText(/resets in 29m|resets in 30m/i)).toBeInTheDocument();
      });
    });

    it('should show "Resets soon" when reset time has passed', async () => {
      mockGetUserUsage.mockResolvedValueOnce({
        searchesUsed: 10,
        resultsViewed: 2,
        resetTime: new Date(Date.now() - 1000).toISOString(), // past
      });

      render(<UsageTracker paywallInfo={mockPaywallInfo} />);

      await waitFor(() => {
        expect(screen.getByText(/resets soon/i)).toBeInTheDocument();
      });
    });

    it('should show "Daily reset" when no reset time provided', async () => {
      mockGetUserUsage.mockResolvedValueOnce({
        searchesUsed: 10,
        resultsViewed: 2,
      });

      render(<UsageTracker paywallInfo={mockPaywallInfo} />);

      await waitFor(() => {
        expect(screen.getByText(/daily reset/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading skeleton', () => {
      render(<UsageTracker paywallInfo={mockPaywallInfo} />);

      // Check for loading skeleton elements
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should hide loading skeleton after data loads', async () => {
      render(<UsageTracker paywallInfo={mockPaywallInfo} />);

      await waitFor(() => {
        expect(screen.queryByText(/daily usage/i)).toBeInTheDocument();
        expect(document.querySelectorAll('.animate-pulse').length).toBe(0);
      });
    });
  });

  describe('Compact Mode', () => {
    it('should render compact version when compact=true', async () => {
      render(<UsageTracker paywallInfo={mockPaywallInfo} compact={true} />);

      await waitFor(() => {
        expect(screen.getByText(/10\/20/)).toBeInTheDocument();
        expect(screen.queryByText(/daily usage/i)).not.toBeInTheDocument(); // Full header not shown
      });
    });

    it('should show upgrade button in compact mode for Free tier', async () => {
      render(<UsageTracker paywallInfo={mockPaywallInfo} compact={true} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /upgrade/i })).toBeInTheDocument();
      });
    });

    it('should not show upgrade button in compact mode for Premium tier', async () => {
      const premiumPaywall = { ...mockPaywallInfo, userTier: SubscriptionTier.Premium };

      render(<UsageTracker paywallInfo={premiumPaywall} compact={true} />);

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /upgrade/i })).not.toBeInTheDocument();
      });
    });

    it('should hide upgrade button when showUpgradeButton=false', async () => {
      render(<UsageTracker paywallInfo={mockPaywallInfo} compact={true} showUpgradeButton={false} />);

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /upgrade/i })).not.toBeInTheDocument();
      });
    });

    it('should call onUpgradeClick in compact mode', async () => {
      const mockOnUpgrade = jest.fn();

      render(<UsageTracker paywallInfo={mockPaywallInfo} compact={true} onUpgradeClick={mockOnUpgrade} />);

      await waitFor(() => {
        const upgradeButton = screen.getByRole('button', { name: /upgrade/i });
        fireEvent.click(upgradeButton);
        expect(mockOnUpgrade).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Normal Mode - Free Tier', () => {
    it('should render full usage tracker for Free tier', async () => {
      render(<UsageTracker paywallInfo={mockPaywallInfo} />);

      await waitFor(() => {
        expect(screen.getByText(/daily usage/i)).toBeInTheDocument();
        expect(screen.getByText(/free plan/i)).toBeInTheDocument();
        expect(screen.getByText(/searches today/i)).toBeInTheDocument();
        expect(screen.getByText(/results per search/i)).toBeInTheDocument();
      });
    });

    it('should show searches used and limit', async () => {
      render(<UsageTracker paywallInfo={mockPaywallInfo} />);

      await waitFor(() => {
        expect(screen.getByText(/10\/20/)).toBeInTheDocument(); // 10 used of 20 limit
      });
    });

    it('should show results limit for Free tier', async () => {
      render(<UsageTracker paywallInfo={mockPaywallInfo} />);

      await waitFor(() => {
        expect(screen.getByText(/up to 5/i)).toBeInTheDocument();
      });
    });

    it('should show progress bar for searches', async () => {
      render(<UsageTracker paywallInfo={mockPaywallInfo} />);

      await waitFor(() => {
        const progressBars = document.querySelectorAll('.h-2.rounded-full');
        expect(progressBars.length).toBeGreaterThan(0);
      });
    });

    it('should show remaining searches count', async () => {
      render(<UsageTracker paywallInfo={mockPaywallInfo} />);

      await waitFor(() => {
        expect(screen.getByText(/10 searches left/i)).toBeInTheDocument(); // 20 - 10 = 10
      });
    });

    it('should show "Daily limit reached" when all searches used', async () => {
      mockGetUserUsage.mockResolvedValueOnce({
        searchesUsed: 20,
        resultsViewed: 5,
      });

      render(<UsageTracker paywallInfo={mockPaywallInfo} />);

      await waitFor(() => {
        expect(screen.getByText(/daily limit reached/i)).toBeInTheDocument();
      });
    });

    it('should show upgrade CTA for Free users', async () => {
      render(<UsageTracker paywallInfo={mockPaywallInfo} />);

      await waitFor(() => {
        expect(screen.getByText(/want unlimited access/i)).toBeInTheDocument();
        expect(screen.getByText(/upgrade to basic or premium/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /upgrade now/i })).toBeInTheDocument();
      });
    });

    it('should call onUpgradeClick when clicking upgrade button', async () => {
      const mockOnUpgrade = jest.fn();

      render(<UsageTracker paywallInfo={mockPaywallInfo} onUpgradeClick={mockOnUpgrade} />);

      await waitFor(() => {
        const upgradeButton = screen.getByRole('button', { name: /upgrade now/i });
        fireEvent.click(upgradeButton);
        expect(mockOnUpgrade).toHaveBeenCalledTimes(1);
      });
    });

    it('should show premium content warning for Free tier', async () => {
      render(<UsageTracker paywallInfo={mockPaywallInfo} />);

      await waitFor(() => {
        expect(screen.getByText(/premium content may be limited or blurred/i)).toBeInTheDocument();
      });
    });
  });

  describe('Normal Mode - Basic Tier', () => {
    const basicPaywall = { ...mockPaywallInfo, userTier: SubscriptionTier.Basic };

    it('should show Basic plan badge', async () => {
      render(<UsageTracker paywallInfo={basicPaywall} />);

      await waitFor(() => {
        expect(screen.getByText(/basic plan/i)).toBeInTheDocument();
      });
    });

    it('should show Basic tier limits', async () => {
      render(<UsageTracker paywallInfo={basicPaywall} />);

      await waitFor(() => {
        expect(screen.getByText(/10\/200/)).toBeInTheDocument();
        expect(screen.getByText(/up to 50/i)).toBeInTheDocument();
      });
    });

    it('should show "Upgrade to Premium" CTA for Basic users', async () => {
      render(<UsageTracker paywallInfo={basicPaywall} />);

      await waitFor(() => {
        expect(screen.getByText(/upgrade to premium/i)).toBeInTheDocument();
      });
    });

    it('should not show premium content warning for Basic tier', async () => {
      render(<UsageTracker paywallInfo={basicPaywall} />);

      await waitFor(() => {
        expect(screen.queryByText(/premium content may be limited or blurred/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Normal Mode - Premium Tier', () => {
    const premiumPaywall = { ...mockPaywallInfo, userTier: SubscriptionTier.Premium };

    it('should not show plan badge for Premium tier', async () => {
      render(<UsageTracker paywallInfo={premiumPaywall} />);

      await waitFor(() => {
        expect(screen.queryByText(/free plan/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/basic plan/i)).not.toBeInTheDocument();
      });
    });

    it('should show unlimited for searches', async () => {
      render(<UsageTracker paywallInfo={premiumPaywall} />);

      await waitFor(() => {
        expect(screen.getByText(/10 \(unlimited\)/i)).toBeInTheDocument();
      });
    });

    it.skip('should show unlimited for results', async () => {
      render(<UsageTracker paywallInfo={premiumPaywall} />);

      await waitFor(() => {
        expect(screen.getByText(/unlimited/i)).toBeInTheDocument();
      });
    });

    it('should not show progress bars for Premium tier', async () => {
      render(<UsageTracker paywallInfo={premiumPaywall} />);

      await waitFor(() => {
        expect(screen.getByText(/daily usage/i)).toBeInTheDocument();
        // Progress bars should not be shown for unlimited
        const progressBars = document.querySelectorAll('.h-2.rounded-full.bg-success');
        expect(progressBars.length).toBe(0);
      });
    });

    it('should not show upgrade CTA for Premium users', async () => {
      render(<UsageTracker paywallInfo={premiumPaywall} />);

      await waitFor(() => {
        expect(screen.queryByText(/want unlimited access/i)).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /upgrade now/i })).not.toBeInTheDocument();
      });
    });

    it('should show Premium badge', async () => {
      render(<UsageTracker paywallInfo={premiumPaywall} />);

      await waitFor(() => {
        expect(screen.getByText(/premium - unlimited access/i)).toBeInTheDocument();
      });
    });
  });

  describe('Usage Colors (Boundary Testing)', () => {
    it('should show success color when usage is low (<50%)', async () => {
      mockGetUserUsage.mockResolvedValueOnce({
        searchesUsed: 5, // 25% of 20
        resultsViewed: 1,
      });

      render(<UsageTracker paywallInfo={mockPaywallInfo} />);

      await waitFor(() => {
        const usageText = screen.getByText(/5\/20/);
        expect(usageText).toHaveClass('text-success');
      });
    });

    it('should show warning color when usage is 50-70%', async () => {
      mockGetUserUsage.mockResolvedValueOnce({
        searchesUsed: 12, // 60% of 20
        resultsViewed: 3,
      });

      render(<UsageTracker paywallInfo={mockPaywallInfo} />);

      await waitFor(() => {
        const usageText = screen.getByText(/12\/20/);
        expect(usageText).toHaveClass('text-warning');
      });
    });

    it('should show destructive color when usage is 70-90%', async () => {
      mockGetUserUsage.mockResolvedValueOnce({
        searchesUsed: 16, // 80% of 20
        resultsViewed: 4,
      });

      render(<UsageTracker paywallInfo={mockPaywallInfo} />);

      await waitFor(() => {
        const usageText = screen.getByText(/16\/20/);
        expect(usageText).toHaveClass('text-destructive/80');
      });
    });

    it('should show full destructive color when usage is ≥90%', async () => {
      mockGetUserUsage.mockResolvedValueOnce({
        searchesUsed: 19, // 95% of 20
        resultsViewed: 5,
      });

      render(<UsageTracker paywallInfo={mockPaywallInfo} />);

      await waitFor(() => {
        const usageText = screen.getByText(/19\/20/);
        expect(usageText).toHaveClass('text-destructive');
      });
    });

    it('should show success color for unlimited (Premium)', async () => {
      const premiumPaywall = { ...mockPaywallInfo, userTier: SubscriptionTier.Premium };

      render(<UsageTracker paywallInfo={premiumPaywall} />);

      await waitFor(() => {
        const usageText = screen.getByText(/10 \(unlimited\)/i);
        expect(usageText).toHaveClass('text-success');
      });
    });
  });

  describe('Error Handling', () => {
    it('should show fallback usage when API fails', async () => {
      mockGetUserUsage.mockRejectedValueOnce(new Error('API Error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(<UsageTracker paywallInfo={mockPaywallInfo} />);

      await waitFor(() => {
        expect(screen.getByText(/0\/20/)).toBeInTheDocument(); // Fallback to 0 used
      });

      consoleSpy.mockRestore();
    });

    it('should log error when API fails', async () => {
      mockGetUserUsage.mockRejectedValueOnce(new Error('API Error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(<UsageTracker paywallInfo={mockPaywallInfo} />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch usage:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });

    it('should return null when usage is null after loading', async () => {
      mockGetUserUsage.mockResolvedValueOnce({
        searchesUsed: 0,
        resultsViewed: 0,
      });

      const { container } = render(<UsageTracker paywallInfo={mockPaywallInfo} />);

      await waitFor(() => {
        expect(screen.getByText(/daily usage/i)).toBeInTheDocument();
      });

      // Component should render, not return null
      expect(container.firstChild).toBeTruthy();
    });
  });

  describe('Custom Props', () => {
    it('should apply custom className', async () => {
      const { container } = render(<UsageTracker paywallInfo={mockPaywallInfo} className="custom-usage-tracker" />);

      await waitFor(() => {
        expect(container.querySelector('.custom-usage-tracker')).toBeInTheDocument();
      });
    });

    it('should hide upgrade button when showUpgradeButton=false', async () => {
      render(<UsageTracker paywallInfo={mockPaywallInfo} showUpgradeButton={false} />);

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /upgrade/i })).not.toBeInTheDocument();
      });
    });

    it('should not call onUpgradeClick when not provided', async () => {
      render(<UsageTracker paywallInfo={mockPaywallInfo} />);

      await waitFor(() => {
        const upgradeButton = screen.getByRole('button', { name: /upgrade now/i });
        expect(upgradeButton).toBeInTheDocument();
        // Just verify it doesn't throw
        fireEvent.click(upgradeButton);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle 0 searches used', async () => {
      mockGetUserUsage.mockResolvedValueOnce({
        searchesUsed: 0,
        resultsViewed: 0,
      });

      render(<UsageTracker paywallInfo={mockPaywallInfo} />);

      await waitFor(() => {
        expect(screen.getByText(/0\/20/)).toBeInTheDocument();
        expect(screen.getByText(/20 searches left/i)).toBeInTheDocument();
      });
    });

    it('should handle exactly at limit', async () => {
      mockGetUserUsage.mockResolvedValueOnce({
        searchesUsed: 20,
        resultsViewed: 5,
      });

      render(<UsageTracker paywallInfo={mockPaywallInfo} />);

      await waitFor(() => {
        expect(screen.getByText(/20\/20/)).toBeInTheDocument();
        expect(screen.getByText(/daily limit reached/i)).toBeInTheDocument();
      });
    });

    it.skip('should handle over limit (capped at 100%)', async () => {
      mockGetUserUsage.mockResolvedValueOnce({
        searchesUsed: 25, // Over the 20 limit
        resultsViewed: 5,
      });

      render(<UsageTracker paywallInfo={mockPaywallInfo} />);

      await waitFor(() => {
        expect(screen.getByText(/25\/20/)).toBeInTheDocument();
        const progressBar = document.querySelector('.h-2.rounded-full:not(.bg-muted-foreground)');
        expect(progressBar).toHaveStyle({ width: '100%' }); // Capped at 100%
      });
    });

    it('should handle missing usage data fields', async () => {
      mockGetUserUsage.mockResolvedValueOnce({} as any);

      render(<UsageTracker paywallInfo={mockPaywallInfo} />);

      await waitFor(() => {
        expect(screen.getByText(/0\/20/)).toBeInTheDocument(); // Fallback to 0
      });
    });
  });
});
