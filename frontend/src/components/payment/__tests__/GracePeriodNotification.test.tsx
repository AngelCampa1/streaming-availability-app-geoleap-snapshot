import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GracePeriodNotification, useGracePeriodAlert } from '../GracePeriodNotification';
import { usePaymentRecovery } from '../../../hooks/usePaymentRecovery';
import { useRouter } from 'next/navigation';

// Mock dependencies (boundary mocking only)
jest.mock('../../../hooks/usePaymentRecovery');
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

const mockUsePaymentRecovery = usePaymentRecovery as jest.MockedFunction<typeof usePaymentRecovery>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

describe('GracePeriodNotification', () => {
  const mockPush = jest.fn();

  const defaultMockGracePeriod = {
    id: '1',
    userId: 'user-1',
    subscriptionId: 'sub-1',
    startDate: '2025-12-26T00:00:00Z',
    endDate: '2025-12-31T23:59:59Z',
    status: 'active' as const,
    restrictedFeatures: [],
    failedPaymentId: 'payment-1',
    createdAt: '2025-12-26T00:00:00Z',
    updatedAt: '2025-12-26T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    } as any);

    mockUsePaymentRecovery.mockReturnValue({
      inGracePeriod: true,
      gracePeriod: defaultMockGracePeriod,
      restrictedFeatures: [],
      getGracePeriodDaysRemaining: () => 5,
      canRetryPayment: jest.fn(),
      getFailedPayments: jest.fn(),
      retryFailedPayment: jest.fn(),
      getRecoveryStats: jest.fn(),
      isFeatureRestricted: jest.fn(),
    } as any);
  });

  describe('Rendering Conditions', () => {
    it('renders notification when in grace period', () => {
      render(<GracePeriodNotification />);

      expect(screen.getByText(/Payment Issue Requires Attention/i)).toBeInTheDocument();
    });

    it('does not render when not in grace period', () => {
      mockUsePaymentRecovery.mockReturnValue({
        inGracePeriod: false,
        gracePeriod: null,
        restrictedFeatures: [],
        getGracePeriodDaysRemaining: () => 0,
      } as any);

      const { container } = render(<GracePeriodNotification />);

      expect(container.firstChild).toBeNull();
    });

    it('does not render when grace period is null', () => {
      mockUsePaymentRecovery.mockReturnValue({
        inGracePeriod: true,
        gracePeriod: null,
        restrictedFeatures: [],
        getGracePeriodDaysRemaining: () => 5,
      } as any);

      const { container } = render(<GracePeriodNotification />);

      expect(container.firstChild).toBeNull();
    });

    it('does not render when showOnlyIfActive=true and status is not active', () => {
      mockUsePaymentRecovery.mockReturnValue({
        inGracePeriod: true,
        gracePeriod: { ...defaultMockGracePeriod, status: 'expired' as const },
        restrictedFeatures: [],
        getGracePeriodDaysRemaining: () => 5,
      } as any);

      const { container } = render(<GracePeriodNotification showOnlyIfActive={true} />);

      expect(container.firstChild).toBeNull();
    });

    it('renders when showOnlyIfActive=false regardless of status', () => {
      mockUsePaymentRecovery.mockReturnValue({
        inGracePeriod: true,
        gracePeriod: { ...defaultMockGracePeriod, status: 'expired' as const },
        restrictedFeatures: [],
        getGracePeriodDaysRemaining: () => 5,
      } as any);

      render(<GracePeriodNotification showOnlyIfActive={false} />);

      expect(screen.getByText(/Payment Issue Requires Attention/i)).toBeInTheDocument();
    });
  });

  describe('Dismiss Functionality', () => {
    it.skip('dismisses notification when X button clicked', async () => {
      const user = userEvent.setup();
      const { container } = render(<GracePeriodNotification dismissible={true} />);

      // Verify component is initially rendered
      expect(screen.getByText(/Payment Issue Requires Attention/i)).toBeInTheDocument();

      // Find dismiss button by ghost variant (the X button has variant="ghost")
      const allButtons = screen.getAllByRole('button');
      // The dismiss button is the last button (after "Update Payment Method" and "View Details")
      const dismissButton = allButtons[allButtons.length - 1];

      await user.click(dismissButton);

      // Component should disappear after dismissal - check that container is empty
      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });

    it('does not show dismiss button when dismissible=false', () => {
      render(<GracePeriodNotification dismissible={false} />);

      const allButtons = screen.getAllByRole('button');
      // Should only have 2 buttons: "Update Payment Method" and "View Details"
      // No dismiss button
      expect(allButtons).toHaveLength(2);
      expect(screen.getByText('Update Payment Method')).toBeInTheDocument();
      expect(screen.getByText('View Details')).toBeInTheDocument();
    });
  });

  describe('Compact Mode', () => {
    it('renders compact notification when compact=true', () => {
      mockUsePaymentRecovery.mockReturnValue({
        inGracePeriod: true,
        gracePeriod: defaultMockGracePeriod,
        restrictedFeatures: [],
        getGracePeriodDaysRemaining: () => 5,
      } as any);

      render(<GracePeriodNotification compact={true} />);

      expect(screen.getByText(/Payment issue - 5 days remaining/i)).toBeInTheDocument();
      expect(screen.getByText('Fix Now')).toBeInTheDocument();
    });

    it('displays singular "day" when 1 day remaining in compact mode', () => {
      mockUsePaymentRecovery.mockReturnValue({
        inGracePeriod: true,
        gracePeriod: defaultMockGracePeriod,
        restrictedFeatures: [],
        getGracePeriodDaysRemaining: () => 1,
      } as any);

      render(<GracePeriodNotification compact={true} />);

      expect(screen.getByText(/Payment issue - 1 day remaining/i)).toBeInTheDocument();
    });
  });

  describe('Full Mode', () => {
    it('renders full notification with all details', () => {
      render(<GracePeriodNotification compact={false} />);

      expect(screen.getByText(/Payment Issue Requires Attention/i)).toBeInTheDocument();
      expect(screen.getByText(/5 days remaining/i)).toBeInTheDocument();
      expect(screen.getByText('Update Payment Method')).toBeInTheDocument();
      expect(screen.getByText('View Details')).toBeInTheDocument();
    });

    it('displays singular "day" when 1 day remaining in full mode', () => {
      mockUsePaymentRecovery.mockReturnValue({
        inGracePeriod: true,
        gracePeriod: defaultMockGracePeriod,
        restrictedFeatures: [],
        getGracePeriodDaysRemaining: () => 1,
      } as any);

      render(<GracePeriodNotification compact={false} />);

      expect(screen.getByText(/1 day remaining/i)).toBeInTheDocument();
    });

    it('displays formatted end date', () => {
      const endDate = '2025-12-31T23:59:59Z';
      mockUsePaymentRecovery.mockReturnValue({
        inGracePeriod: true,
        gracePeriod: { ...defaultMockGracePeriod, endDate },
        restrictedFeatures: [],
        getGracePeriodDaysRemaining: () => 5,
      } as any);

      render(<GracePeriodNotification compact={false} />);

      // Check that the formatted date is displayed
      const formattedDate = new Date(endDate).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });

      expect(screen.getByText(formattedDate, { exact: false })).toBeInTheDocument();
    });

    it('displays restricted features when present', () => {
      mockUsePaymentRecovery.mockReturnValue({
        inGracePeriod: true,
        gracePeriod: defaultMockGracePeriod,
        restrictedFeatures: ['Advanced Search', 'Watchlist Export', 'Premium Recommendations'],
        getGracePeriodDaysRemaining: () => 5,
      } as any);

      render(<GracePeriodNotification compact={false} />);

      expect(screen.getByText(/Currently restricted:/i)).toBeInTheDocument();
      expect(screen.getByText(/Advanced Search/i)).toBeInTheDocument();
      expect(screen.getByText(/Watchlist Export/i)).toBeInTheDocument();
      expect(screen.getByText(/Premium Recommendations/i)).toBeInTheDocument();
    });

    it('displays "and X more" when more than 3 restricted features', () => {
      mockUsePaymentRecovery.mockReturnValue({
        inGracePeriod: true,
        gracePeriod: defaultMockGracePeriod,
        restrictedFeatures: ['Feature 1', 'Feature 2', 'Feature 3', 'Feature 4', 'Feature 5'],
        getGracePeriodDaysRemaining: () => 5,
      } as any);

      render(<GracePeriodNotification compact={false} />);

      expect(screen.getByText(/and 2 more/i)).toBeInTheDocument();
    });

    it('does not display restricted features section when empty', () => {
      mockUsePaymentRecovery.mockReturnValue({
        inGracePeriod: true,
        gracePeriod: defaultMockGracePeriod,
        restrictedFeatures: [],
        getGracePeriodDaysRemaining: () => 5,
      } as any);

      render(<GracePeriodNotification compact={false} />);

      expect(screen.queryByText(/Currently restricted:/i)).not.toBeInTheDocument();
    });
  });

  describe('Urgency-Based Styling', () => {
    it('applies critical styling when 1 day remaining', () => {
      mockUsePaymentRecovery.mockReturnValue({
        inGracePeriod: true,
        gracePeriod: defaultMockGracePeriod,
        restrictedFeatures: [],
        getGracePeriodDaysRemaining: () => 1,
      } as any);

      const { container } = render(<GracePeriodNotification />);

      const alert = container.querySelector('[role="alert"]');
      expect(alert).toHaveClass('border-destructive');
      expect(alert).toHaveClass('bg-destructive/5');
    });

    it('applies urgent styling when 2-3 days remaining', () => {
      mockUsePaymentRecovery.mockReturnValue({
        inGracePeriod: true,
        gracePeriod: defaultMockGracePeriod,
        restrictedFeatures: [],
        getGracePeriodDaysRemaining: () => 3,
      } as any);

      const { container } = render(<GracePeriodNotification />);

      const alert = container.querySelector('[role="alert"]');
      expect(alert).toHaveClass('border-warning');
      expect(alert).toHaveClass('bg-warning/5');
    });

    it('applies normal styling when more than 3 days remaining', () => {
      mockUsePaymentRecovery.mockReturnValue({
        inGracePeriod: true,
        gracePeriod: defaultMockGracePeriod,
        restrictedFeatures: [],
        getGracePeriodDaysRemaining: () => 5,
      } as any);

      const { container } = render(<GracePeriodNotification />);

      const alert = container.querySelector('[role="alert"]');
      expect(alert).toHaveClass('border-warning/60');
      expect(alert).toHaveClass('bg-warning/3');
    });
  });

  describe('Navigation Actions', () => {
    it('navigates to /payment when "Fix Now" clicked in compact mode', () => {
      render(<GracePeriodNotification compact={true} />);

      const fixNowButton = screen.getByText('Fix Now');
      fireEvent.click(fixNowButton);

      expect(mockPush).toHaveBeenCalledWith('/payment');
    });

    it('navigates to /payment when "Update Payment Method" clicked in full mode', () => {
      render(<GracePeriodNotification compact={false} />);

      const updateButton = screen.getByText('Update Payment Method');
      fireEvent.click(updateButton);

      expect(mockPush).toHaveBeenCalledWith('/payment');
    });

    it('navigates to dashboard payment-recovery tab when "View Details" clicked', () => {
      render(<GracePeriodNotification compact={false} />);

      const viewDetailsButton = screen.getByText('View Details');
      fireEvent.click(viewDetailsButton);

      expect(mockPush).toHaveBeenCalledWith('/dashboard?tab=payment-recovery');
    });
  });

  describe('Custom Props', () => {
    it('applies custom className', () => {
      const { container } = render(<GracePeriodNotification className="custom-class" />);

      const alert = container.querySelector('[role="alert"]');
      expect(alert).toHaveClass('custom-class');
    });
  });

  describe('useGracePeriodAlert Hook', () => {
    it('returns correct alert state when in grace period', () => {
      mockUsePaymentRecovery.mockReturnValue({
        inGracePeriod: true,
        gracePeriod: defaultMockGracePeriod,
        restrictedFeatures: [],
        getGracePeriodDaysRemaining: () => 5,
      } as any);

      const TestComponent = () => {
        const alert = useGracePeriodAlert();
        return (
          <div>
            <span data-testid="should-show">{String(alert.shouldShowAlert)}</span>
            <span data-testid="days-remaining">{alert.daysRemaining}</span>
            <span data-testid="is-urgent">{String(alert.isUrgent)}</span>
            <span data-testid="is-critical">{String(alert.isCritical)}</span>
          </div>
        );
      };

      render(<TestComponent />);

      expect(screen.getByTestId('should-show')).toHaveTextContent('true');
      expect(screen.getByTestId('days-remaining')).toHaveTextContent('5');
      expect(screen.getByTestId('is-urgent')).toHaveTextContent('false');
      expect(screen.getByTestId('is-critical')).toHaveTextContent('false');
    });

    it('returns isUrgent=true when 3 days remaining', () => {
      mockUsePaymentRecovery.mockReturnValue({
        inGracePeriod: true,
        gracePeriod: defaultMockGracePeriod,
        restrictedFeatures: [],
        getGracePeriodDaysRemaining: () => 3,
      } as any);

      const TestComponent = () => {
        const alert = useGracePeriodAlert();
        return <span data-testid="is-urgent">{String(alert.isUrgent)}</span>;
      };

      render(<TestComponent />);

      expect(screen.getByTestId('is-urgent')).toHaveTextContent('true');
    });

    it('returns isCritical=true when 1 day remaining', () => {
      mockUsePaymentRecovery.mockReturnValue({
        inGracePeriod: true,
        gracePeriod: defaultMockGracePeriod,
        restrictedFeatures: [],
        getGracePeriodDaysRemaining: () => 1,
      } as any);

      const TestComponent = () => {
        const alert = useGracePeriodAlert();
        return <span data-testid="is-critical">{String(alert.isCritical)}</span>;
      };

      render(<TestComponent />);

      expect(screen.getByTestId('is-critical')).toHaveTextContent('true');
    });

    it('returns shouldShowAlert=false when not in grace period', () => {
      mockUsePaymentRecovery.mockReturnValue({
        inGracePeriod: false,
        gracePeriod: null,
        restrictedFeatures: [],
        getGracePeriodDaysRemaining: () => 0,
      } as any);

      const TestComponent = () => {
        const alert = useGracePeriodAlert();
        return <span data-testid="should-show">{String(alert.shouldShowAlert)}</span>;
      };

      render(<TestComponent />);

      expect(screen.getByTestId('should-show')).toHaveTextContent('false');
    });
  });
});
