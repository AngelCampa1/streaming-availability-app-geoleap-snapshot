import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { SubscriptionStatus } from '../SubscriptionStatus';
import { SubscriptionTier, UserSubscription } from '@/lib/types/paywall';
import { getUserSubscription, logPaywallInteraction } from '@/lib/api';

// Mock API
jest.mock('@/lib/api', () => ({
  getUserSubscription: jest.fn(),
  logPaywallInteraction: jest.fn(),
}));

const mockGetUserSubscription = getUserSubscription as jest.MockedFunction<typeof getUserSubscription>;
const mockLogPaywallInteraction = logPaywallInteraction as jest.MockedFunction<typeof logPaywallInteraction>;

describe('SubscriptionStatus', () => {
  const mockFreeSubscription: UserSubscription = {
    id: 'sub-1',
    userId: 'user-1',
    tier: SubscriptionTier.Free,
    isActive: true,
    startDate: new Date('2024-01-01').toISOString(),
    autoRenew: false,
  };

  const mockPremiumSubscription: UserSubscription = {
    id: 'sub-2',
    userId: 'user-2',
    tier: SubscriptionTier.Premium,
    isActive: true,
    startDate: new Date('2024-01-01').toISOString(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
    autoRenew: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUserSubscription.mockResolvedValue(mockFreeSubscription);
  });

  describe('Loading State', () => {
    it('should show loading skeleton', () => {
      render(<SubscriptionStatus />);

      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should hide loading skeleton after data loads', async () => {
      render(<SubscriptionStatus />);

      await waitFor(() => {
        expect(document.querySelectorAll('.animate-pulse').length).toBe(0);
      });
    });
  });

  describe('Helper Functions (via component rendering)', () => {
    it('should display Free tier name and icon', async () => {
      render(<SubscriptionStatus />);

      await waitFor(() => {
        expect(screen.getByText(/free/i)).toBeInTheDocument();
        expect(screen.getByText(/🆓/)).toBeInTheDocument();
      });
    });

    it('should display Basic tier name and icon', async () => {
      mockGetUserSubscription.mockResolvedValueOnce({
        ...mockFreeSubscription,
        tier: SubscriptionTier.Basic,
      });

      render(<SubscriptionStatus />);

      await waitFor(() => {
        expect(screen.getByText(/basic/i)).toBeInTheDocument();
        expect(screen.getByText(/⭐/)).toBeInTheDocument();
      });
    });

    it('should display Premium tier name and icon', async () => {
      mockGetUserSubscription.mockResolvedValueOnce(mockPremiumSubscription);

      render(<SubscriptionStatus />);

      await waitFor(() => {
        expect(screen.getByText(/premium/i)).toBeInTheDocument();
        expect(screen.getByText(/👑/)).toBeInTheDocument();
      });
    });

    it('should display Admin tier name and icon', async () => {
      mockGetUserSubscription.mockResolvedValueOnce({
        ...mockFreeSubscription,
        tier: SubscriptionTier.Admin,
      });

      render(<SubscriptionStatus />);

      await waitFor(() => {
        expect(screen.getByText(/admin/i)).toBeInTheDocument();
        expect(screen.getByText(/🔧/)).toBeInTheDocument();
      });
    });

    it.skip('should format dates correctly', async () => {
      const testDate = new Date('2024-06-15').toISOString();
      mockGetUserSubscription.mockResolvedValueOnce({
        ...mockPremiumSubscription,
        startDate: testDate,
        endDate: new Date('2025-06-15').toISOString(),
      });

      render(<SubscriptionStatus />);

      await waitFor(() => {
        expect(screen.getByText(/jun 15, 2024/i)).toBeInTheDocument();
      });
    });
  });

  describe('Free Tier Display', () => {
    it('should show Free tier status', async () => {
      render(<SubscriptionStatus />);

      await waitFor(() => {
        expect(screen.getByText(/free/i)).toBeInTheDocument();
      });
    });

    it('should show upgrade buttons for Free tier', async () => {
      render(<SubscriptionStatus />);

      await waitFor(() => {
        const upgradeButtons = screen.getAllByRole('button', { name: /upgrade/i });
        expect(upgradeButtons.length).toBeGreaterThan(0);
      });
    });

    it('should call onUpgradeClick when upgrade button clicked', async () => {
      const mockOnUpgrade = jest.fn();

      render(<SubscriptionStatus onUpgradeClick={mockOnUpgrade} />);

      await waitFor(() => {
        const upgradeButtons = screen.getAllByRole('button', { name: /upgrade/i });
        fireEvent.click(upgradeButtons[0]); // Click first upgrade button
      });

      expect(mockLogPaywallInteraction).toHaveBeenCalledWith('upgrade_clicked', {
        paywallPosition: 'subscription-status',
      });
      expect(mockOnUpgrade).toHaveBeenCalledTimes(1);
    });

    it.skip('should show "No expiration" for Free tier without end date', async () => {
      render(<SubscriptionStatus showDetails={true} />);

      await waitFor(() => {
        expect(screen.getByText(/no expiration/i)).toBeInTheDocument();
      });
    });

    it('should not show manage button for Free tier', async () => {
      render(<SubscriptionStatus />);

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /manage/i })).not.toBeInTheDocument();
      });
    });
  });

  describe('Premium Tier Display', () => {
    beforeEach(() => {
      mockGetUserSubscription.mockResolvedValue(mockPremiumSubscription);
    });

    it('should show Premium tier status', async () => {
      render(<SubscriptionStatus />);

      await waitFor(() => {
        expect(screen.getByText(/premium/i)).toBeInTheDocument();
      });
    });

    it('should show "Active" status for active subscription', async () => {
      render(<SubscriptionStatus />);

      await waitFor(() => {
        expect(screen.getByText(/active/i)).toBeInTheDocument();
      });
    });

    it.skip('should show renewal date when autoRenew is true', async () => {
      render(<SubscriptionStatus showDetails={true} />);

      await waitFor(() => {
        expect(screen.getByText(/renews on/i)).toBeInTheDocument();
      });
    });

    it.skip('should show expiry date when autoRenew is false', async () => {
      mockGetUserSubscription.mockResolvedValueOnce({
        ...mockPremiumSubscription,
        autoRenew: false,
      });

      render(<SubscriptionStatus showDetails={true} />);

      await waitFor(() => {
        expect(screen.getByText(/expires on/i)).toBeInTheDocument();
      });
    });

    it('should show manage button for Premium tier', async () => {
      render(<SubscriptionStatus />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /manage/i })).toBeInTheDocument();
      });
    });

    it('should call onManageClick when manage button clicked', async () => {
      const mockOnManage = jest.fn();

      render(<SubscriptionStatus onManageClick={mockOnManage} />);

      await waitFor(() => {
        const manageButton = screen.getByRole('button', { name: /manage/i });
        fireEvent.click(manageButton);
      });

      expect(mockOnManage).toHaveBeenCalledTimes(1);
    });

    // JSDOM Limitation: Navigation tests require E2E environment
    it.skip('should navigate to billing page when manage clicked without callback', async () => {
      // Cannot test window.location.href navigation in JSDOM
      render(<SubscriptionStatus />);

      await waitFor(() => {
        const manageButton = screen.getByRole('button', { name: /manage/i });
        fireEvent.click(manageButton);
        expect(window.location.href).toContain('/account/billing');
      });
    });

    it('should not show upgrade button for Premium tier', async () => {
      render(<SubscriptionStatus />);

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /upgrade/i })).not.toBeInTheDocument();
      });
    });
  });

  describe('Basic Tier Display', () => {
    beforeEach(() => {
      mockGetUserSubscription.mockResolvedValue({
        ...mockFreeSubscription,
        tier: SubscriptionTier.Basic,
        endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        autoRenew: true,
      });
    });

    it('should show Basic tier status', async () => {
      render(<SubscriptionStatus />);

      await waitFor(() => {
        expect(screen.getByText(/basic/i)).toBeInTheDocument();
      });
    });

    it('should show upgrade buttons for Basic tier', async () => {
      render(<SubscriptionStatus />);

      await waitFor(() => {
        const upgradeButtons = screen.getAllByRole('button', { name: /upgrade/i });
        expect(upgradeButtons.length).toBeGreaterThan(0);
      });
    });

    it('should show manage button for Basic tier', async () => {
      render(<SubscriptionStatus />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /manage/i })).toBeInTheDocument();
      });
    });
  });

  describe('Expiry Warning', () => {
    it.skip('should show warning when subscription expires in < 7 days', async () => {
      mockGetUserSubscription.mockResolvedValueOnce({
        ...mockPremiumSubscription,
        endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days
        autoRenew: false,
      });

      render(<SubscriptionStatus showDetails={true} />);

      await waitFor(() => {
        expect(screen.getByText(/expires soon/i)).toBeInTheDocument();
      });
    });

    it.skip('should show critical warning when subscription expires in < 3 days', async () => {
      mockGetUserSubscription.mockResolvedValueOnce({
        ...mockPremiumSubscription,
        endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days
        autoRenew: false,
      });

      render(<SubscriptionStatus showDetails={true} />);

      await waitFor(() => {
        const warning = screen.getByText(/expires soon/i);
        expect(warning).toBeInTheDocument();
      });
    });

    it('should not show warning when subscription expires in > 7 days', async () => {
      mockGetUserSubscription.mockResolvedValueOnce({
        ...mockPremiumSubscription,
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        autoRenew: false,
      });

      render(<SubscriptionStatus showDetails={true} />);

      await waitFor(() => {
        expect(screen.queryByText(/expires soon/i)).not.toBeInTheDocument();
      });
    });

    it('should not show warning when autoRenew is true', async () => {
      mockGetUserSubscription.mockResolvedValueOnce({
        ...mockPremiumSubscription,
        endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        autoRenew: true,
      });

      render(<SubscriptionStatus showDetails={true} />);

      await waitFor(() => {
        expect(screen.queryByText(/expires soon/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Inactive Subscription', () => {
    it('should show "Inactive" status when subscription is not active', async () => {
      mockGetUserSubscription.mockResolvedValueOnce({
        ...mockPremiumSubscription,
        isActive: false,
      });

      render(<SubscriptionStatus />);

      await waitFor(() => {
        expect(screen.getByText(/inactive/i)).toBeInTheDocument();
      });
    });

    it.skip('should show reactivate button for inactive paid subscription', async () => {
      mockGetUserSubscription.mockResolvedValueOnce({
        ...mockPremiumSubscription,
        isActive: false,
      });

      render(<SubscriptionStatus />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /reactivate|upgrade/i })).toBeInTheDocument();
      });
    });
  });

  describe('Show Details Toggle', () => {
    it.skip('should show full details when showDetails=true', async () => {
      render(<SubscriptionStatus showDetails={true} />);

      await waitFor(() => {
        expect(screen.getByText(/no expiration/i)).toBeInTheDocument();
      });
    });

    it('should hide details when showDetails=false', async () => {
      render(<SubscriptionStatus showDetails={false} />);

      await waitFor(() => {
        expect(screen.queryByText(/no expiration|expires on|renews on/i)).not.toBeInTheDocument();
      });
    });

    it('should show tier badge even when showDetails=false', async () => {
      render(<SubscriptionStatus showDetails={false} />);

      await waitFor(() => {
        expect(screen.getByText(/free/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error message when API fails', async () => {
      mockGetUserSubscription.mockRejectedValueOnce(new Error('API Error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(<SubscriptionStatus />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load subscription/i)).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });

    it.skip('should fallback to Free tier when API fails', async () => {
      mockGetUserSubscription.mockRejectedValueOnce(new Error('API Error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(<SubscriptionStatus />);

      await waitFor(() => {
        expect(screen.getByText(/free/i)).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });

    it('should log error to console when API fails', async () => {
      const error = new Error('API Error');
      mockGetUserSubscription.mockRejectedValueOnce(error);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(<SubscriptionStatus />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch subscription:', error);
      });

      consoleSpy.mockRestore();
    });

    it('should show error state when subscription is null', async () => {
      mockGetUserSubscription.mockResolvedValueOnce(null as any);

      render(<SubscriptionStatus />);

      await waitFor(() => {
        expect(screen.getByText(/unable to load subscription/i)).toBeInTheDocument();
      });
    });
  });

  describe('Custom Props', () => {
    it('should apply custom className', async () => {
      const { container } = render(<SubscriptionStatus className="custom-subscription-status" />);

      await waitFor(() => {
        expect(container.querySelector('.custom-subscription-status')).toBeInTheDocument();
      });
    });

    it.skip('should work without optional callbacks', async () => {
      render(<SubscriptionStatus />);

      await waitFor(() => {
        const upgradeButton = screen.getByRole('button', { name: /upgrade/i });
        expect(upgradeButton).toBeInTheDocument();
        // Clicking without callback should not throw
        fireEvent.click(upgradeButton);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle subscription with past end date', async () => {
      mockGetUserSubscription.mockResolvedValueOnce({
        ...mockPremiumSubscription,
        endDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
        isActive: false,
      });

      render(<SubscriptionStatus showDetails={true} />);

      await waitFor(() => {
        expect(screen.getByText(/inactive/i)).toBeInTheDocument();
      });
    });

    it('should handle subscription without userId', async () => {
      mockGetUserSubscription.mockResolvedValueOnce({
        ...mockFreeSubscription,
        userId: '',
      });

      render(<SubscriptionStatus />);

      await waitFor(() => {
        expect(screen.getByText(/free/i)).toBeInTheDocument();
      });
    });

    it('should handle subscription without id', async () => {
      mockGetUserSubscription.mockResolvedValueOnce({
        ...mockFreeSubscription,
        id: '',
      });

      render(<SubscriptionStatus />);

      await waitFor(() => {
        expect(screen.getByText(/free/i)).toBeInTheDocument();
      });
    });

    it('should handle missing startDate gracefully', async () => {
      mockGetUserSubscription.mockResolvedValueOnce({
        ...mockFreeSubscription,
        startDate: '',
      });

      render(<SubscriptionStatus showDetails={true} />);

      await waitFor(() => {
        expect(screen.getByText(/free/i)).toBeInTheDocument();
      });
    });
  });
});
