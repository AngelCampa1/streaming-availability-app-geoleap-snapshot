/**
 * SubscriptionManagement Component Tests
 *
 * Phase 14a: Comprehensive test suite for subscription management component
 * Coverage Target: 80-90%
 *
 * Test Categories:
 * 1. Helper Functions (5 tests)
 * 2. Component Rendering (15 tests)
 * 3. API Integration (8 tests)
 * 4. User Actions (12 tests)
 * 5. Edge Cases (5 tests)
 *
 * Mocking Strategy: Boundary-only mocking
 * - Mock API functions from '@/lib/api'
 * - Test REAL component logic and rendering
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SubscriptionManagement } from '../SubscriptionManagement';
import { SubscriptionTier } from '@/lib/types/paywall';
import * as api from '@/lib/api';

// Mock API functions at boundary
jest.mock('@/lib/api', () => ({
  getUserSubscription: jest.fn(),
  getCurrentSubscription: jest.fn(),
  getSubscriptionHistory: jest.fn(),
  createBillingPortalSession: jest.fn(),
  cancelUserSubscription: jest.fn(),
  reactivateSubscription: jest.fn(),
  logPaywallInteraction: jest.fn(),
}));

const mockApi = api as jest.Mocked<typeof api>;

describe('SubscriptionManagement Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // CATEGORY 1: COMPONENT RENDERING STATES (15 tests)
  // ============================================================================

  describe('Rendering States', () => {
    it('renders loading skeleton initially', () => {
      mockApi.getUserSubscription.mockImplementation(() => new Promise(() => {}));
      mockApi.getCurrentSubscription.mockImplementation(() => new Promise(() => {}));

      render(<SubscriptionManagement />);

      // Loading skeleton doesn't have text, check for the animation class
      const skeleton = document.querySelector('.animate-pulse');
      expect(skeleton).toBeInTheDocument();
    });

    it('renders error state with retry button when fetch fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      mockApi.getUserSubscription.mockRejectedValue(new Error('Network error'));
      mockApi.getCurrentSubscription.mockRejectedValue(new Error('Network error'));

      render(<SubscriptionManagement />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load subscription information/i)).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    it('retries fetching subscription when Try Again is clicked', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      mockApi.getUserSubscription.mockRejectedValueOnce(new Error('Network error'));
      mockApi.getCurrentSubscription.mockRejectedValueOnce(new Error('Network error'));

      render(<SubscriptionManagement />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load subscription information/i)).toBeInTheDocument();
      });

      // Setup successful retry
      mockApi.getUserSubscription.mockResolvedValueOnce({
        id: 'sub_1',
        userId: 'user_1',
        tier: SubscriptionTier.Free,
        isActive: true,
        startDate: '2024-01-01T00:00:00Z',
        autoRenew: false,
      });
      mockApi.getCurrentSubscription.mockResolvedValueOnce({
        id: 'sub_1',
        planType: 'Free',
        status: 'active',
        currentPeriodStart: '2024-01-01T00:00:00Z',
        currentPeriodEnd: '2024-02-01T00:00:00Z',
        amount: 0,
        currency: 'USD',
        interval: 'month',
        isCanceled: false,
      });

      fireEvent.click(screen.getByRole('button', { name: /try again/i }));

      await waitFor(() => {
        expect(screen.getByText(/free plan/i)).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });

    it('returns null when subscription is null (after loading)', async () => {
      mockApi.getUserSubscription.mockResolvedValue(undefined as any);
      mockApi.getCurrentSubscription.mockResolvedValue(null);

      const { container } = render(<SubscriptionManagement />);

      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });

    it('renders Free tier with correct icon, name, and benefits', async () => {
      mockApi.getUserSubscription.mockResolvedValue({
        id: 'sub_1',
        userId: 'user_1',
        tier: SubscriptionTier.Free,
        isActive: true,
        startDate: '2024-01-01T00:00:00Z',
        autoRenew: false,
      });
      mockApi.getCurrentSubscription.mockResolvedValue({
        id: 'sub_1',
        planType: 'Free',
        status: 'active',
        currentPeriodStart: '2024-01-01T00:00:00Z',
        currentPeriodEnd: '2024-02-01T00:00:00Z',
        amount: 0,
        currency: 'USD',
        interval: 'month',
        isCanceled: false,
      });

      render(<SubscriptionManagement />);

      await waitFor(() => {
        expect(screen.getByText(/free plan/i)).toBeInTheDocument();
      });

      expect(screen.getByText('🆓')).toBeInTheDocument();
      expect(screen.getByText(/5 search results per query/i)).toBeInTheDocument();
      expect(screen.getByText(/20 searches per day/i)).toBeInTheDocument();
      expect(screen.getByText(/upgrade to basic/i)).toBeInTheDocument();
      expect(screen.getByText(/upgrade to premium/i)).toBeInTheDocument();
    });

    it('renders Basic tier with correct icon, name, and benefits', async () => {
      mockApi.getUserSubscription.mockResolvedValue({
        id: 'sub_2',
        userId: 'user_1',
        tier: SubscriptionTier.Basic,
        isActive: true,
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-02-01T00:00:00Z',
        autoRenew: true,
      });
      mockApi.getCurrentSubscription.mockResolvedValue({
        id: 'sub_2',
        planType: 'Basic',
        status: 'active',
        currentPeriodStart: '2024-01-01T00:00:00Z',
        currentPeriodEnd: '2024-02-01T00:00:00Z',
        amount: 9.99,
        currency: 'USD',
        interval: 'month',
        isCanceled: false,
      });

      render(<SubscriptionManagement />);

      await waitFor(() => {
        expect(screen.getByText(/basic plan/i)).toBeInTheDocument();
      });

      expect(screen.getByText('⭐')).toBeInTheDocument();
      expect(screen.getByText(/50 search results per query/i)).toBeInTheDocument();
      expect(screen.getByText(/200 searches per day/i)).toBeInTheDocument();
      expect(screen.getByText(/upgrade to premium/i)).toBeInTheDocument();
      expect(screen.getByText(/manage billing/i)).toBeInTheDocument();
    });

    it('renders Premium tier with correct icon, name, and benefits', async () => {
      mockApi.getUserSubscription.mockResolvedValue({
        id: 'sub_3',
        userId: 'user_1',
        tier: SubscriptionTier.Premium,
        isActive: true,
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-02-01T00:00:00Z',
        autoRenew: true,
      });
      mockApi.getCurrentSubscription.mockResolvedValue({
        id: 'sub_3',
        planType: 'Premium',
        status: 'active',
        currentPeriodStart: '2024-01-01T00:00:00Z',
        currentPeriodEnd: '2024-02-01T00:00:00Z',
        amount: 19.99,
        currency: 'USD',
        interval: 'month',
        isCanceled: false,
      });

      render(<SubscriptionManagement />);

      await waitFor(() => {
        expect(screen.getByText(/premium plan/i)).toBeInTheDocument();
      });

      expect(screen.getByText('👑')).toBeInTheDocument();
      expect(screen.getByText(/all features unlocked/i)).toBeInTheDocument();
      expect(screen.getByText(/unlimited searches & results/i)).toBeInTheDocument();
      expect(screen.getByText(/direct streaming links/i)).toBeInTheDocument();
      expect(screen.queryByText(/upgrade to premium/i)).not.toBeInTheDocument();
    });

    it('displays billing information with auto-renew badge', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 15);

      mockApi.getUserSubscription.mockResolvedValue({
        id: 'sub_2',
        userId: 'user_1',
        tier: SubscriptionTier.Basic,
        isActive: true,
        startDate: '2024-01-01T00:00:00Z',
        endDate: futureDate.toISOString(),
        autoRenew: true,
      });
      mockApi.getCurrentSubscription.mockResolvedValue({
        id: 'sub_2',
        planType: 'Basic',
        status: 'active',
        currentPeriodStart: '2024-01-01T00:00:00Z',
        currentPeriodEnd: futureDate.toISOString(),
        amount: 9.99,
        currency: 'USD',
        interval: 'month',
        isCanceled: false,
      });

      render(<SubscriptionManagement />);

      await waitFor(() => {
        expect(screen.getByText(/next billing date/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/auto-renew on/i)).toBeInTheDocument();
    });

    it('displays expiring soon warning (7 days or less)', async () => {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 5);

      mockApi.getUserSubscription.mockResolvedValue({
        id: 'sub_2',
        userId: 'user_1',
        tier: SubscriptionTier.Basic,
        isActive: true,
        startDate: '2024-01-01T00:00:00Z',
        endDate: expiryDate.toISOString(),
        autoRenew: false,
      });
      mockApi.getCurrentSubscription.mockResolvedValue({
        id: 'sub_2',
        planType: 'Basic',
        status: 'active',
        currentPeriodStart: '2024-01-01T00:00:00Z',
        currentPeriodEnd: expiryDate.toISOString(),
        amount: 9.99,
        currency: 'USD',
        interval: 'month',
        isCanceled: false,
      });

      render(<SubscriptionManagement />);

      await waitFor(() => {
        expect(screen.getByText(/expires in 5 days/i)).toBeInTheDocument();
      });
    });

    it('displays expired subscription warning', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);

      mockApi.getUserSubscription.mockResolvedValue({
        id: 'sub_2',
        userId: 'user_1',
        tier: SubscriptionTier.Basic,
        isActive: false,
        startDate: '2024-01-01T00:00:00Z',
        endDate: pastDate.toISOString(),
        autoRenew: false,
      });
      mockApi.getCurrentSubscription.mockResolvedValue({
        id: 'sub_2',
        planType: 'Basic',
        status: 'canceled',
        currentPeriodStart: '2024-01-01T00:00:00Z',
        currentPeriodEnd: pastDate.toISOString(),
        amount: 9.99,
        currency: 'USD',
        interval: 'month',
        isCanceled: true,
      });

      render(<SubscriptionManagement />);

      await waitFor(() => {
        expect(screen.getByText(/subscription expired/i)).toBeInTheDocument();
      });
    });

    it('shows reactivate button for canceled but not expired subscription', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);

      mockApi.getUserSubscription.mockResolvedValue({
        id: 'sub_2',
        userId: 'user_1',
        tier: SubscriptionTier.Basic,
        isActive: true,
        startDate: '2024-01-01T00:00:00Z',
        endDate: futureDate.toISOString(),
        autoRenew: false,
      });
      mockApi.getCurrentSubscription.mockResolvedValue({
        id: 'sub_2',
        planType: 'Basic',
        status: 'active',
        currentPeriodStart: '2024-01-01T00:00:00Z',
        currentPeriodEnd: futureDate.toISOString(),
        amount: 9.99,
        currency: 'USD',
        interval: 'month',
        isCanceled: true,
      });

      render(<SubscriptionManagement />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /reactivate plan/i })).toBeInTheDocument();
      });
    });

    it('shows cancel button for active non-free subscriptions', async () => {
      mockApi.getUserSubscription.mockResolvedValue({
        id: 'sub_2',
        userId: 'user_1',
        tier: SubscriptionTier.Basic,
        isActive: true,
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-02-01T00:00:00Z',
        autoRenew: true,
      });
      mockApi.getCurrentSubscription.mockResolvedValue({
        id: 'sub_2',
        planType: 'Basic',
        status: 'active',
        currentPeriodStart: '2024-01-01T00:00:00Z',
        currentPeriodEnd: '2024-02-01T00:00:00Z',
        amount: 9.99,
        currency: 'USD',
        interval: 'month',
        isCanceled: false,
      });

      render(<SubscriptionManagement />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancel plan/i })).toBeInTheDocument();
      });
    });

    it('does not show upgrade buttons for Premium tier', async () => {
      mockApi.getUserSubscription.mockResolvedValue({
        id: 'sub_3',
        userId: 'user_1',
        tier: SubscriptionTier.Premium,
        isActive: true,
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-02-01T00:00:00Z',
        autoRenew: true,
      });
      mockApi.getCurrentSubscription.mockResolvedValue({
        id: 'sub_3',
        planType: 'Premium',
        status: 'active',
        currentPeriodStart: '2024-01-01T00:00:00Z',
        currentPeriodEnd: '2024-02-01T00:00:00Z',
        amount: 19.99,
        currency: 'USD',
        interval: 'month',
        isCanceled: false,
      });

      render(<SubscriptionManagement />);

      await waitFor(() => {
        expect(screen.getByText(/premium plan/i)).toBeInTheDocument();
      });

      expect(screen.queryByText(/upgrade to/i)).not.toBeInTheDocument();
    });

    it('does not show manage billing button for Free tier', async () => {
      mockApi.getUserSubscription.mockResolvedValue({
        id: 'sub_1',
        userId: 'user_1',
        tier: SubscriptionTier.Free,
        isActive: true,
        startDate: '2024-01-01T00:00:00Z',
        autoRenew: false,
      });
      mockApi.getCurrentSubscription.mockResolvedValue({
        id: 'sub_1',
        planType: 'Free',
        status: 'active',
        currentPeriodStart: '2024-01-01T00:00:00Z',
        currentPeriodEnd: '2024-02-01T00:00:00Z',
        amount: 0,
        currency: 'USD',
        interval: 'month',
        isCanceled: false,
      });

      render(<SubscriptionManagement />);

      await waitFor(() => {
        expect(screen.getByText(/free plan/i)).toBeInTheDocument();
      });

      expect(screen.queryByText(/manage billing/i)).not.toBeInTheDocument();
    });

    it('displays formatted member since date', async () => {
      mockApi.getUserSubscription.mockResolvedValue({
        id: 'sub_2',
        userId: 'user_1',
        tier: SubscriptionTier.Basic,
        isActive: true,
        startDate: '2024-01-15T00:00:00Z',
        endDate: '2024-02-15T00:00:00Z',
        autoRenew: true,
      });
      mockApi.getCurrentSubscription.mockResolvedValue({
        id: 'sub_2',
        planType: 'Basic',
        status: 'active',
        currentPeriodStart: '2024-01-15T00:00:00Z',
        currentPeriodEnd: '2024-02-15T00:00:00Z',
        amount: 9.99,
        currency: 'USD',
        interval: 'month',
        isCanceled: false,
      });

      const { container } = render(<SubscriptionManagement />);

      await waitFor(() => {
        expect(screen.getByText(/basic plan/i)).toBeInTheDocument();
      });

      // Check that the formatted date appears somewhere in the component
      // Date format: "Active • Member since January 15, 2024"
      const text = container.textContent || '';
      expect(text).toMatch(/member since/i);
      expect(text).toMatch(/january/i);
      expect(text).toMatch(/2024/);
    });
  });

  // ============================================================================
  // CATEGORY 2: USER ACTIONS & INTERACTIONS (12 tests)
  // ============================================================================

  describe('User Actions', () => {
    it('calls onUpgradeClick callback when Upgrade to Basic is clicked', async () => {
      const onUpgradeClick = jest.fn();

      mockApi.getUserSubscription.mockResolvedValue({
        id: 'sub_1',
        userId: 'user_1',
        tier: SubscriptionTier.Free,
        isActive: true,
        startDate: '2024-01-01T00:00:00Z',
        autoRenew: false,
      });
      mockApi.getCurrentSubscription.mockResolvedValue({
        id: 'sub_1',
        planType: 'Free',
        status: 'active',
        currentPeriodStart: '2024-01-01T00:00:00Z',
        currentPeriodEnd: '2024-02-01T00:00:00Z',
        amount: 0,
        currency: 'USD',
        interval: 'month',
        isCanceled: false,
      });

      render(<SubscriptionManagement onUpgradeClick={onUpgradeClick} />);

      await waitFor(() => {
        expect(screen.getByText(/free plan/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /upgrade to basic/i }));

      expect(onUpgradeClick).toHaveBeenCalledWith(SubscriptionTier.Basic);
    });

    it('calls onUpgradeClick callback when Upgrade to Premium is clicked', async () => {
      const onUpgradeClick = jest.fn();

      mockApi.getUserSubscription.mockResolvedValue({
        id: 'sub_1',
        userId: 'user_1',
        tier: SubscriptionTier.Free,
        isActive: true,
        startDate: '2024-01-01T00:00:00Z',
        autoRenew: false,
      });
      mockApi.getCurrentSubscription.mockResolvedValue({
        id: 'sub_1',
        planType: 'Free',
        status: 'active',
        currentPeriodStart: '2024-01-01T00:00:00Z',
        currentPeriodEnd: '2024-02-01T00:00:00Z',
        amount: 0,
        currency: 'USD',
        interval: 'month',
        isCanceled: false,
      });

      render(<SubscriptionManagement onUpgradeClick={onUpgradeClick} />);

      await waitFor(() => {
        expect(screen.getByText(/free plan/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /upgrade to premium/i }));

      expect(onUpgradeClick).toHaveBeenCalledWith(SubscriptionTier.Premium);
    });

    it('opens billing portal when Manage Billing is clicked', async () => {
      mockApi.getUserSubscription.mockResolvedValue({
        id: 'sub_2',
        userId: 'user_1',
        tier: SubscriptionTier.Basic,
        isActive: true,
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-02-01T00:00:00Z',
        autoRenew: true,
      });
      mockApi.getCurrentSubscription.mockResolvedValue({
        id: 'sub_2',
        planType: 'Basic',
        status: 'active',
        currentPeriodStart: '2024-01-01T00:00:00Z',
        currentPeriodEnd: '2024-02-01T00:00:00Z',
        amount: 9.99,
        currency: 'USD',
        interval: 'month',
        isCanceled: false,
      });
      mockApi.createBillingPortalSession.mockResolvedValue({
        portalUrl: 'https://billing.stripe.com/session/test_123',
      });
      mockApi.logPaywallInteraction.mockResolvedValue(undefined);

      render(<SubscriptionManagement />);

      await waitFor(() => {
        expect(screen.getByText(/basic plan/i)).toBeInTheDocument();
      });

      const manageBillingButton = screen.getByRole('button', { name: /manage billing/i });

      // Note: Component will redirect to portal URL after successful API call
      // We test the API calls but cannot test actual redirect in JSDOM
      fireEvent.click(manageBillingButton);

      await waitFor(() => {
        expect(mockApi.createBillingPortalSession).toHaveBeenCalled();
      });

      expect(mockApi.logPaywallInteraction).toHaveBeenCalledWith('upgrade_clicked', {
        paywallPosition: 'subscription-management',
      });
    });

    it('shows cancel confirmation modal when Cancel Plan is clicked', async () => {
      mockApi.getUserSubscription.mockResolvedValue({
        id: 'sub_2',
        userId: 'user_1',
        tier: SubscriptionTier.Basic,
        isActive: true,
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-02-01T00:00:00Z',
        autoRenew: true,
      });
      mockApi.getCurrentSubscription.mockResolvedValue({
        id: 'sub_2',
        planType: 'Basic',
        status: 'active',
        currentPeriodStart: '2024-01-01T00:00:00Z',
        currentPeriodEnd: '2024-02-01T00:00:00Z',
        amount: 9.99,
        currency: 'USD',
        interval: 'month',
        isCanceled: false,
      });

      render(<SubscriptionManagement />);

      await waitFor(() => {
        expect(screen.getByText(/basic plan/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /cancel plan/i }));

      expect(screen.getByText(/cancel your subscription\?/i)).toBeInTheDocument();
      expect(screen.getByText('😢')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /keep plan/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /yes, cancel/i })).toBeInTheDocument();
    });

    it('closes cancel modal when Keep Plan is clicked', async () => {
      mockApi.getUserSubscription.mockResolvedValue({
        id: 'sub_2',
        userId: 'user_1',
        tier: SubscriptionTier.Basic,
        isActive: true,
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-02-01T00:00:00Z',
        autoRenew: true,
      });
      mockApi.getCurrentSubscription.mockResolvedValue({
        id: 'sub_2',
        planType: 'Basic',
        status: 'active',
        currentPeriodStart: '2024-01-01T00:00:00Z',
        currentPeriodEnd: '2024-02-01T00:00:00Z',
        amount: 9.99,
        currency: 'USD',
        interval: 'month',
        isCanceled: false,
      });

      render(<SubscriptionManagement />);

      await waitFor(() => {
        expect(screen.getByText(/basic plan/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /cancel plan/i }));
      expect(screen.getByText(/cancel your subscription\?/i)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /keep plan/i }));

      await waitFor(() => {
        expect(screen.queryByText(/cancel your subscription\?/i)).not.toBeInTheDocument();
      });
    });

    it('cancels subscription successfully and shows success message', async () => {
      const onDowngradeComplete = jest.fn();

      mockApi.getUserSubscription.mockResolvedValue({
        id: 'sub_2',
        userId: 'user_1',
        tier: SubscriptionTier.Basic,
        isActive: true,
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-02-01T00:00:00Z',
        autoRenew: true,
      });
      mockApi.getCurrentSubscription.mockResolvedValue({
        id: 'sub_2',
        planType: 'Basic',
        status: 'active',
        currentPeriodStart: '2024-01-01T00:00:00Z',
        currentPeriodEnd: '2024-02-01T00:00:00Z',
        amount: 9.99,
        currency: 'USD',
        interval: 'month',
        isCanceled: false,
      });
      mockApi.cancelUserSubscription.mockResolvedValue({
        id: 'sub_2',
        status: 'canceled',
        planType: 'Basic',
        amount: 9.99,
        currency: 'USD',
        interval: 'month',
        currentPeriodStart: '2024-01-01T00:00:00Z',
        currentPeriodEnd: '2024-02-01T00:00:00Z',
        isCanceled: true,
      });
      mockApi.logPaywallInteraction.mockResolvedValue(undefined);

      render(<SubscriptionManagement onDowngradeComplete={onDowngradeComplete} />);

      await waitFor(() => {
        expect(screen.getByText(/basic plan/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /cancel plan/i }));
      fireEvent.click(screen.getByRole('button', { name: /yes, cancel/i }));

      await waitFor(() => {
        expect(mockApi.cancelUserSubscription).toHaveBeenCalledWith('sub_2');
      });

      expect(mockApi.logPaywallInteraction).toHaveBeenCalledWith('dismissed', {
        paywallPosition: 'subscription-management',
      });

      await waitFor(() => {
        expect(screen.getByText(/your subscription has been cancelled/i)).toBeInTheDocument();
      });

      expect(onDowngradeComplete).toHaveBeenCalled();
    });

    it('reactivates subscription successfully and shows success message', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);

      mockApi.getUserSubscription.mockResolvedValue({
        id: 'sub_2',
        userId: 'user_1',
        tier: SubscriptionTier.Basic,
        isActive: true,
        startDate: '2024-01-01T00:00:00Z',
        endDate: futureDate.toISOString(),
        autoRenew: false,
      });
      mockApi.getCurrentSubscription.mockResolvedValue({
        id: 'sub_2',
        planType: 'Basic',
        status: 'active',
        currentPeriodStart: '2024-01-01T00:00:00Z',
        currentPeriodEnd: futureDate.toISOString(),
        amount: 9.99,
        currency: 'USD',
        interval: 'month',
        isCanceled: true,
      });
      mockApi.reactivateSubscription.mockResolvedValue({
        id: 'sub_2',
        status: 'active',
        planType: 'Basic',
        amount: 9.99,
        currency: 'USD',
        interval: 'month',
        currentPeriodStart: '2024-01-01T00:00:00Z',
        currentPeriodEnd: futureDate.toISOString(),
        isCanceled: false,
      });

      render(<SubscriptionManagement />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /reactivate plan/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /reactivate plan/i }));

      await waitFor(() => {
        expect(mockApi.reactivateSubscription).toHaveBeenCalledWith('sub_2');
      });

      await waitFor(() => {
        expect(screen.getByText(/your subscription has been reactivated/i)).toBeInTheDocument();
      });
    });

    it('dismisses error message when dismiss button is clicked', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      mockApi.getUserSubscription.mockResolvedValue({
        id: 'sub_2',
        userId: 'user_1',
        tier: SubscriptionTier.Basic,
        isActive: true,
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-02-01T00:00:00Z',
        autoRenew: true,
      });
      mockApi.getCurrentSubscription.mockResolvedValue({
        id: 'sub_2',
        planType: 'Basic',
        status: 'active',
        currentPeriodStart: '2024-01-01T00:00:00Z',
        currentPeriodEnd: '2024-02-01T00:00:00Z',
        amount: 9.99,
        currency: 'USD',
        interval: 'month',
        isCanceled: false,
      });
      mockApi.createBillingPortalSession.mockRejectedValue(new Error('Portal error'));

      render(<SubscriptionManagement />);

      await waitFor(() => {
        expect(screen.getByText(/basic plan/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /manage billing/i }));

      await waitFor(() => {
        expect(screen.getByText(/failed to open billing portal/i)).toBeInTheDocument();
      });

      // Find dismiss button by SVG path - it's the button with X icon in error message
      const allButtons = screen.getAllByRole('button');
      const dismissButton = allButtons.find(btn =>
        btn.querySelector('svg path[fill-rule="evenodd"]')
      );
      expect(dismissButton).toBeDefined();
      fireEvent.click(dismissButton!);

      await waitFor(() => {
        expect(screen.queryByText(/failed to open billing portal/i)).not.toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });

    it('dismisses success message when dismiss button is clicked', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);

      mockApi.getUserSubscription.mockResolvedValue({
        id: 'sub_2',
        userId: 'user_1',
        tier: SubscriptionTier.Basic,
        isActive: true,
        startDate: '2024-01-01T00:00:00Z',
        endDate: futureDate.toISOString(),
        autoRenew: false,
      });
      mockApi.getCurrentSubscription.mockResolvedValue({
        id: 'sub_2',
        planType: 'Basic',
        status: 'active',
        currentPeriodStart: '2024-01-01T00:00:00Z',
        currentPeriodEnd: futureDate.toISOString(),
        amount: 9.99,
        currency: 'USD',
        interval: 'month',
        isCanceled: true,
      });
      mockApi.reactivateSubscription.mockResolvedValue({
        id: 'sub_2',
        status: 'active',
        planType: 'Basic',
        amount: 9.99,
        currency: 'USD',
        interval: 'month',
        currentPeriodStart: '2024-01-01T00:00:00Z',
        currentPeriodEnd: futureDate.toISOString(),
        isCanceled: false,
      });

      render(<SubscriptionManagement />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /reactivate plan/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /reactivate plan/i }));

      await waitFor(() => {
        expect(screen.getByText(/your subscription has been reactivated/i)).toBeInTheDocument();
      });

      // Find dismiss button by SVG path - it's the button with X icon in success message
      const allButtons = screen.getAllByRole('button');
      const dismissButton = allButtons.find(btn =>
        btn.querySelector('svg path[fill-rule="evenodd"]')
      );
      expect(dismissButton).toBeDefined();
      fireEvent.click(dismissButton!);

      await waitFor(() => {
        expect(screen.queryByText(/your subscription has been reactivated/i)).not.toBeInTheDocument();
      });
    });

    it('toggles subscription history visibility', async () => {
      mockApi.getUserSubscription.mockResolvedValue({
        id: 'sub_2',
        userId: 'user_1',
        tier: SubscriptionTier.Basic,
        isActive: true,
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-02-01T00:00:00Z',
        autoRenew: true,
      });
      mockApi.getCurrentSubscription.mockResolvedValue({
        id: 'sub_2',
        planType: 'Basic',
        status: 'active',
        currentPeriodStart: '2024-01-01T00:00:00Z',
        currentPeriodEnd: '2024-02-01T00:00:00Z',
        amount: 9.99,
        currency: 'USD',
        interval: 'month',
        isCanceled: false,
      });
      mockApi.getSubscriptionHistory.mockResolvedValue([
        {
          id: 'sub_1',
          planType: 'Basic',
          status: 'active',
          currentPeriodStart: '2024-01-01T00:00:00Z',
          currentPeriodEnd: '2024-02-01T00:00:00Z',
          amount: 9.99,
          currency: 'USD',
          interval: 'month',
          isCanceled: false,
        },
      ]);

      render(<SubscriptionManagement />);

      await waitFor(() => {
        expect(screen.getByText(/basic plan/i)).toBeInTheDocument();
      });

      const viewHistoryButton = screen.getByRole('button', { name: /view history/i });
      fireEvent.click(viewHistoryButton);

      await waitFor(() => {
        expect(screen.getByText(/subscription history/i)).toBeInTheDocument();
      });

      expect(mockApi.getSubscriptionHistory).toHaveBeenCalled();

      fireEvent.click(screen.getByRole('button', { name: /hide history/i }));

      await waitFor(() => {
        expect(screen.queryByText(/subscription history/i)).not.toBeInTheDocument();
      });
    });

    it('displays subscription history with correct formatting', async () => {
      mockApi.getUserSubscription.mockResolvedValue({
        id: 'sub_3',
        userId: 'user_1',
        tier: SubscriptionTier.Premium,
        isActive: true,
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-02-01T00:00:00Z',
        autoRenew: true,
      });
      mockApi.getCurrentSubscription.mockResolvedValue({
        id: 'sub_3',
        planType: 'Premium',
        status: 'active',
        currentPeriodStart: '2024-01-01T00:00:00Z',
        currentPeriodEnd: '2024-02-01T00:00:00Z',
        amount: 19.99,
        currency: 'USD',
        interval: 'month',
        isCanceled: false,
      });
      mockApi.getSubscriptionHistory.mockResolvedValue([
        {
          id: 'sub_1',
          planType: 'Basic',
          status: 'canceled',
          currentPeriodStart: '2023-11-01T00:00:00Z',
          currentPeriodEnd: '2023-12-01T00:00:00Z',
          amount: 9.99,
          currency: 'USD',
          interval: 'month',
          isCanceled: true,
        },
        {
          id: 'sub_2',
          planType: 'Premium',
          status: 'active',
          currentPeriodStart: '2024-01-01T00:00:00Z',
          currentPeriodEnd: '2024-02-01T00:00:00Z',
          amount: 19.99,
          currency: 'USD',
          interval: 'month',
          isCanceled: false,
        },
      ]);

      render(<SubscriptionManagement />);

      await waitFor(() => {
        expect(screen.getByText(/premium plan/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /view history/i }));

      await waitFor(() => {
        expect(screen.getByText(/basic plan/i)).toBeInTheDocument();
      });

      expect(screen.getByText('$9.99/month')).toBeInTheDocument();
      expect(screen.getByText('$19.99/month')).toBeInTheDocument();
      expect(screen.getByText(/canceled/i)).toBeInTheDocument();
      expect(screen.getAllByText(/active/i).length).toBeGreaterThan(0);
    });

    it('displays no history message when history is empty', async () => {
      mockApi.getUserSubscription.mockResolvedValue({
        id: 'sub_1',
        userId: 'user_1',
        tier: SubscriptionTier.Free,
        isActive: true,
        startDate: '2024-01-01T00:00:00Z',
        autoRenew: false,
      });
      mockApi.getCurrentSubscription.mockResolvedValue({
        id: 'sub_1',
        planType: 'Free',
        status: 'active',
        currentPeriodStart: '2024-01-01T00:00:00Z',
        currentPeriodEnd: '2024-02-01T00:00:00Z',
        amount: 0,
        currency: 'USD',
        interval: 'month',
        isCanceled: false,
      });
      mockApi.getSubscriptionHistory.mockResolvedValue([]);

      render(<SubscriptionManagement />);

      await waitFor(() => {
        expect(screen.getByText(/free plan/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /view history/i }));

      await waitFor(() => {
        expect(screen.getByText(/no subscription history available/i)).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // CATEGORY 3: ERROR HANDLING (5 tests)
  // ============================================================================

  describe('Error Handling', () => {
    it('handles billing portal error gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      mockApi.getUserSubscription.mockResolvedValue({
        id: 'sub_2',
        userId: 'user_1',
        tier: SubscriptionTier.Basic,
        isActive: true,
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-02-01T00:00:00Z',
        autoRenew: true,
      });
      mockApi.getCurrentSubscription.mockResolvedValue({
        id: 'sub_2',
        planType: 'Basic',
        status: 'active',
        currentPeriodStart: '2024-01-01T00:00:00Z',
        currentPeriodEnd: '2024-02-01T00:00:00Z',
        amount: 9.99,
        currency: 'USD',
        interval: 'month',
        isCanceled: false,
      });
      mockApi.createBillingPortalSession.mockRejectedValue(new Error('Portal error'));

      render(<SubscriptionManagement />);

      await waitFor(() => {
        expect(screen.getByText(/basic plan/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /manage billing/i }));

      await waitFor(() => {
        expect(screen.getByText(/failed to open billing portal/i)).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });

    it('handles cancellation error gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      mockApi.getUserSubscription.mockResolvedValue({
        id: 'sub_2',
        userId: 'user_1',
        tier: SubscriptionTier.Basic,
        isActive: true,
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-02-01T00:00:00Z',
        autoRenew: true,
      });
      mockApi.getCurrentSubscription.mockResolvedValue({
        id: 'sub_2',
        planType: 'Basic',
        status: 'active',
        currentPeriodStart: '2024-01-01T00:00:00Z',
        currentPeriodEnd: '2024-02-01T00:00:00Z',
        amount: 9.99,
        currency: 'USD',
        interval: 'month',
        isCanceled: false,
      });
      mockApi.cancelUserSubscription.mockRejectedValue(new Error('Cancellation error'));

      render(<SubscriptionManagement />);

      await waitFor(() => {
        expect(screen.getByText(/basic plan/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /cancel plan/i }));
      fireEvent.click(screen.getByRole('button', { name: /yes, cancel/i }));

      await waitFor(() => {
        expect(screen.getByText(/failed to cancel subscription/i)).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });

    it('handles reactivation error gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);

      mockApi.getUserSubscription.mockResolvedValue({
        id: 'sub_2',
        userId: 'user_1',
        tier: SubscriptionTier.Basic,
        isActive: true,
        startDate: '2024-01-01T00:00:00Z',
        endDate: futureDate.toISOString(),
        autoRenew: false,
      });
      mockApi.getCurrentSubscription.mockResolvedValue({
        id: 'sub_2',
        planType: 'Basic',
        status: 'active',
        currentPeriodStart: '2024-01-01T00:00:00Z',
        currentPeriodEnd: futureDate.toISOString(),
        amount: 9.99,
        currency: 'USD',
        interval: 'month',
        isCanceled: true,
      });
      mockApi.reactivateSubscription.mockRejectedValue(new Error('Reactivation error'));

      render(<SubscriptionManagement />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /reactivate plan/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /reactivate plan/i }));

      await waitFor(() => {
        expect(screen.getByText(/failed to reactivate subscription/i)).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });

    it('handles subscription history fetch error gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      mockApi.getUserSubscription.mockResolvedValue({
        id: 'sub_2',
        userId: 'user_1',
        tier: SubscriptionTier.Basic,
        isActive: true,
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-02-01T00:00:00Z',
        autoRenew: true,
      });
      mockApi.getCurrentSubscription.mockResolvedValue({
        id: 'sub_2',
        planType: 'Basic',
        status: 'active',
        currentPeriodStart: '2024-01-01T00:00:00Z',
        currentPeriodEnd: '2024-02-01T00:00:00Z',
        amount: 9.99,
        currency: 'USD',
        interval: 'month',
        isCanceled: false,
      });
      mockApi.getSubscriptionHistory.mockRejectedValue(new Error('History fetch error'));

      render(<SubscriptionManagement />);

      await waitFor(() => {
        expect(screen.getByText(/basic plan/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /view history/i }));

      await waitFor(() => {
        expect(screen.getByText(/failed to load subscription history/i)).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });

    it('handles missing currentSubscription.id gracefully', async () => {
      mockApi.getUserSubscription.mockResolvedValue({
        id: 'sub_2',
        userId: 'user_1',
        tier: SubscriptionTier.Basic,
        isActive: true,
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-02-01T00:00:00Z',
        autoRenew: true,
      });
      mockApi.getCurrentSubscription.mockResolvedValue(null);

      render(<SubscriptionManagement />);

      await waitFor(() => {
        expect(screen.getByText(/basic plan/i)).toBeInTheDocument();
      });

      // Cancel button should still be visible
      fireEvent.click(screen.getByRole('button', { name: /cancel plan/i }));

      // But cancellation should not call API if currentSubscription is null
      fireEvent.click(screen.getByRole('button', { name: /yes, cancel/i }));

      // API should not be called
      expect(mockApi.cancelUserSubscription).not.toHaveBeenCalled();
    });
  });
});
