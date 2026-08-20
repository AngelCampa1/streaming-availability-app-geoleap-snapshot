/**
 * StreamingDetailsModal Component Tests
 *
 * Tests the modal for displaying streaming availability across countries
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StreamingDetailsModal } from '../StreamingDetailsModal';
import { useStreamingDetails } from '@/hooks/useStreamingDetails';
import { useUserSubscriptions } from '@/hooks/useUserSubscriptions';

// Mock hooks
jest.mock('@/hooks/useStreamingDetails');
jest.mock('@/hooks/useUserSubscriptions');

// Mock child components
jest.mock('../CountryAvailability', () => ({
  CountryAvailability: ({ details: _details, userCountry }: any) => (
    <div data-testid="country-availability">
      Country Availability for {userCountry}
    </div>
  ),
}));

jest.mock('../subscriptions/QuickSubscriptionSetup', () => ({
  QuickSubscriptionSetup: ({ onComplete }: any) => (
    <div data-testid="quick-subscription-setup">
      <button onClick={onComplete}>Complete Setup</button>
    </div>
  ),
}));

const mockUseStreamingDetails = useStreamingDetails as jest.MockedFunction<typeof useStreamingDetails>;
const mockUseUserSubscriptions = useUserSubscriptions as jest.MockedFunction<typeof useUserSubscriptions>;

describe('StreamingDetailsModal', () => {
  const mockOnClose = jest.fn();

  const defaultStreamingDetailsHook = {
    details: null,
    location: null,
    loading: false,
    error: null,
    fetchStreamingDetails: jest.fn(),
    fetchUserLocation: jest.fn(),
  };

  const defaultUserSubscriptionsHook = {
    subscriptionCount: 2,
    hasSetupSubscriptions: true,
    getServiceIds: jest.fn(() => ['netflix', 'hulu']),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseStreamingDetails.mockReturnValue(defaultStreamingDetailsHook);
    mockUseUserSubscriptions.mockReturnValue(defaultUserSubscriptionsHook as any);
  });

  describe('Rendering', () => {
    it('does not render when isOpen is false', () => {
      const { container } = render(
        <StreamingDetailsModal showId="show-123" showTitle="Breaking Bad" isOpen={false} onClose={mockOnClose} />
      );

      expect(container.firstChild).toBeNull();
    });

    it('renders modal when isOpen is true', () => {
      render(<StreamingDetailsModal showId="show-123" showTitle="Breaking Bad" isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText(/Where to Watch "Breaking Bad"/i)).toBeInTheDocument();
    });

    it('displays show title in header', () => {
      render(<StreamingDetailsModal showId="show-123" showTitle="Stranger Things" isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText(/Where to Watch "Stranger Things"/i)).toBeInTheDocument();
    });

    it('displays description text', () => {
      render(<StreamingDetailsModal showId="show-123" showTitle="Breaking Bad" isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText(/VPN to these countries to watch on your existing subscriptions/i)).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('displays loading skeleton when loading', () => {
      mockUseStreamingDetails.mockReturnValue({
        ...defaultStreamingDetailsHook,
        loading: true,
      });

      const { container } = render(
        <StreamingDetailsModal showId="show-123" showTitle="Breaking Bad" isOpen={true} onClose={mockOnClose} />
      );

      const loadingElements = container.querySelectorAll('.animate-pulse');
      expect(loadingElements.length).toBeGreaterThan(0);
    });

    it('calls fetch functions when modal opens', () => {
      const fetchStreamingDetails = jest.fn();
      const fetchUserLocation = jest.fn();

      mockUseStreamingDetails.mockReturnValue({
        ...defaultStreamingDetailsHook,
        fetchStreamingDetails,
        fetchUserLocation,
      });

      render(<StreamingDetailsModal showId="show-123" showTitle="Breaking Bad" isOpen={true} onClose={mockOnClose} />);

      expect(fetchStreamingDetails).toHaveBeenCalledWith('show-123', ['netflix', 'hulu']);
      expect(fetchUserLocation).toHaveBeenCalled();
    });

    it('does not call fetch functions when already loaded', () => {
      const fetchStreamingDetails = jest.fn();
      const fetchUserLocation = jest.fn();

      mockUseStreamingDetails.mockReturnValue({
        ...defaultStreamingDetailsHook,
        fetchStreamingDetails,
        fetchUserLocation,
      });

      const { rerender } = render(
        <StreamingDetailsModal showId="show-123" showTitle="Breaking Bad" isOpen={true} onClose={mockOnClose} />
      );

      // Reset mocks to check second render doesn't call
      fetchStreamingDetails.mockClear();
      fetchUserLocation.mockClear();

      rerender(<StreamingDetailsModal showId="show-123" showTitle="Breaking Bad" isOpen={true} onClose={mockOnClose} />);

      expect(fetchStreamingDetails).not.toHaveBeenCalled();
      expect(fetchUserLocation).not.toHaveBeenCalled();
    });
  });

  describe('Error State', () => {
    it('displays error message when error occurs', () => {
      mockUseStreamingDetails.mockReturnValue({
        ...defaultStreamingDetailsHook,
        error: 'Failed to load streaming details',
      });

      render(<StreamingDetailsModal showId="show-123" showTitle="Breaking Bad" isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText(/Error loading streaming details/i)).toBeInTheDocument();
      expect(screen.getByText(/Failed to load streaming details/i)).toBeInTheDocument();
    });
  });

  describe('Success State', () => {
    const mockDetails = {
      id: 'show-123',
      title: 'Breaking Bad',
      countriesWithUserSubscriptions: 3,
      totalCountries: 10,
      availabilityByCountry: {},
      userServicesWithContent: ['netflix', 'hulu'],
    };

    const mockLocation = {
      countryCode: 'US',
      countryName: 'United States',
      autoDetected: true,
    };

    it('displays location information when available', () => {
      mockUseStreamingDetails.mockReturnValue({
        ...defaultStreamingDetailsHook,
        details: mockDetails,
        location: mockLocation,
      });

      render(<StreamingDetailsModal showId="show-123" showTitle="Breaking Bad" isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText(/Your location:/i)).toBeInTheDocument();
      expect(screen.getByText(/United States/i)).toBeInTheDocument();
      expect(screen.getByText(/auto-detected/i)).toBeInTheDocument();
    });

    it('displays country availability component', () => {
      mockUseStreamingDetails.mockReturnValue({
        ...defaultStreamingDetailsHook,
        details: mockDetails,
        location: mockLocation,
      });

      render(<StreamingDetailsModal showId="show-123" showTitle="Breaking Bad" isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByTestId('country-availability')).toBeInTheDocument();
    });

    it('shows VPN instructions when countries have user subscriptions', () => {
      mockUseStreamingDetails.mockReturnValue({
        ...defaultStreamingDetailsHook,
        details: mockDetails,
        location: mockLocation,
      });

      render(<StreamingDetailsModal showId="show-123" showTitle="Breaking Bad" isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText(/How to Watch with VPN/i)).toBeInTheDocument();
      expect(screen.getByText(/Connect your VPN to one of the countries highlighted in green above/i)).toBeInTheDocument();
    });

    it('does not show VPN instructions when no countries have user subscriptions', () => {
      mockUseStreamingDetails.mockReturnValue({
        ...defaultStreamingDetailsHook,
        details: { ...mockDetails, countriesWithUserSubscriptions: 0 },
        location: mockLocation,
      });

      render(<StreamingDetailsModal showId="show-123" showTitle="Breaking Bad" isOpen={true} onClose={mockOnClose} />);

      expect(screen.queryByText(/How to Watch with VPN/i)).not.toBeInTheDocument();
    });
  });

  describe('Subscription Setup', () => {
    it('shows subscription setup when user has no subscriptions and no matches', () => {
      mockUseUserSubscriptions.mockReturnValue({
        ...defaultUserSubscriptionsHook,
        subscriptionCount: 0,
        hasSetupSubscriptions: false,
      } as any);

      mockUseStreamingDetails.mockReturnValue({
        ...defaultStreamingDetailsHook,
        details: {
          id: 'show-123',
          title: 'Breaking Bad',
          countriesWithUserSubscriptions: 0,
          totalCountries: 10,
          availabilityByCountry: {},
          userServicesWithContent: [],
        },
      });

      render(<StreamingDetailsModal showId="show-123" showTitle="Breaking Bad" isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByTestId('quick-subscription-setup')).toBeInTheDocument();
    });

    it('displays subscription count indicator', () => {
      mockUseStreamingDetails.mockReturnValue({
        ...defaultStreamingDetailsHook,
        details: {
          id: 'show-123',
          title: 'Breaking Bad',
          countriesWithUserSubscriptions: 3,
          totalCountries: 10,
          availabilityByCountry: {},
          userServicesWithContent: ['netflix', 'hulu'],
        },
      });

      render(<StreamingDetailsModal showId="show-123" showTitle="Breaking Bad" isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText(/Showing results for your 2 streaming services/i)).toBeInTheDocument();
    });

    it('uses singular form for 1 subscription', () => {
      mockUseUserSubscriptions.mockReturnValue({
        ...defaultUserSubscriptionsHook,
        subscriptionCount: 1,
      } as any);

      mockUseStreamingDetails.mockReturnValue({
        ...defaultStreamingDetailsHook,
        details: {
          id: 'show-123',
          title: 'Breaking Bad',
          countriesWithUserSubscriptions: 1,
          totalCountries: 10,
          availabilityByCountry: {},
          userServicesWithContent: ['netflix'],
        },
      });

      render(<StreamingDetailsModal showId="show-123" showTitle="Breaking Bad" isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText(/Showing results for your 1 streaming service$/i)).toBeInTheDocument();
    });

    it('allows editing services', async () => {
      const user = userEvent.setup();

      mockUseStreamingDetails.mockReturnValue({
        ...defaultStreamingDetailsHook,
        details: {
          id: 'show-123',
          title: 'Breaking Bad',
          countriesWithUserSubscriptions: 3,
          totalCountries: 10,
          availabilityByCountry: {},
          userServicesWithContent: ['netflix', 'hulu'],
        },
      });

      render(<StreamingDetailsModal showId="show-123" showTitle="Breaking Bad" isOpen={true} onClose={mockOnClose} />);

      const editButton = screen.getByText(/Edit services/i);
      await user.click(editButton);

      expect(screen.getByTestId('quick-subscription-setup')).toBeInTheDocument();
    });
  });

  describe('Modal Interactions', () => {
    it('calls onClose when close button clicked', async () => {
      const user = userEvent.setup();

      render(<StreamingDetailsModal showId="show-123" showTitle="Breaking Bad" isOpen={true} onClose={mockOnClose} />);

      const closeButton = screen.getByRole('button', { name: /close modal/i });
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when footer close button clicked', async () => {
      const user = userEvent.setup();

      render(<StreamingDetailsModal showId="show-123" showTitle="Breaking Bad" isOpen={true} onClose={mockOnClose} />);

      const footerCloseButton = screen.getByRole('button', { name: /^close$/i });
      await user.click(footerCloseButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when backdrop clicked', async () => {
      const user = userEvent.setup();

      const { container } = render(<StreamingDetailsModal showId="show-123" showTitle="Breaking Bad" isOpen={true} onClose={mockOnClose} />);

      // Find the backdrop (the outermost div with onClick handler)
      const backdrop = container.firstChild as HTMLElement;
      if (backdrop) {
        await user.click(backdrop);
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      }
    });

    it('does not close when modal content clicked', async () => {
      const user = userEvent.setup();

      render(<StreamingDetailsModal showId="show-123" showTitle="Breaking Bad" isOpen={true} onClose={mockOnClose} />);

      const modalContent = screen.getByText(/Where to Watch/i);
      await user.click(modalContent);

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('State Management', () => {
    it('resets state when modal closes', () => {
      const fetchStreamingDetails = jest.fn();

      mockUseStreamingDetails.mockReturnValue({
        ...defaultStreamingDetailsHook,
        fetchStreamingDetails,
      });

      const { rerender } = render(
        <StreamingDetailsModal showId="show-123" showTitle="Breaking Bad" isOpen={true} onClose={mockOnClose} />
      );

      expect(fetchStreamingDetails).toHaveBeenCalledTimes(1);

      // Close modal
      rerender(<StreamingDetailsModal showId="show-123" showTitle="Breaking Bad" isOpen={false} onClose={mockOnClose} />);

      // Reopen modal
      rerender(<StreamingDetailsModal showId="show-123" showTitle="Breaking Bad" isOpen={true} onClose={mockOnClose} />);

      expect(fetchStreamingDetails).toHaveBeenCalledTimes(2);
    });

    it('refetches when showId changes', () => {
      const fetchStreamingDetails = jest.fn();

      mockUseStreamingDetails.mockReturnValue({
        ...defaultStreamingDetailsHook,
        fetchStreamingDetails,
      });

      const { rerender } = render(
        <StreamingDetailsModal showId="show-123" showTitle="Breaking Bad" isOpen={true} onClose={mockOnClose} />
      );

      expect(fetchStreamingDetails).toHaveBeenCalledWith('show-123', ['netflix', 'hulu']);

      // Close and reopen with new showId to trigger refetch
      rerender(
        <StreamingDetailsModal showId="show-123" showTitle="Breaking Bad" isOpen={false} onClose={mockOnClose} />
      );

      rerender(
        <StreamingDetailsModal showId="show-456" showTitle="Stranger Things" isOpen={true} onClose={mockOnClose} />
      );

      // Should be called twice total (once for each showId)
      expect(fetchStreamingDetails).toHaveBeenCalledTimes(2);
      expect(fetchStreamingDetails).toHaveBeenCalledWith('show-456', ['netflix', 'hulu']);
    });
  });
});
