import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AffiliateRecommendation } from './AffiliateRecommendation';
import { AffiliatePartner } from '@/lib/types/affiliate';
import { SubscriptionTier } from '@/lib/types/paywall';

// Mock useSubscription
jest.mock('@/hooks/useSubscription', () => ({
  useSubscription: jest.fn(),
}));

import { useSubscription } from '@/hooks/useSubscription';

const mockUseSubscription = useSubscription as jest.MockedFunction<typeof useSubscription>;

const mockPartners: AffiliatePartner[] = [
  {
    id: 'partner-1',
    name: 'ExpressVPN',
    affiliateUrlTemplate: 'https://expressvpn.com/?ref=geo',
    priority: 1,
    isActive: true,
    commissionType: 'flat',
    createdAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'partner-2',
    name: 'NordVPN',
    affiliateUrlTemplate: 'https://nordvpn.com/?ref=geo',
    priority: 2,
    isActive: true,
    commissionType: 'flat',
    createdAt: '2025-01-01T00:00:00Z',
  },
];

const freeSubscription = {
  subscription: {
    id: '1',
    userId: 'u1',
    tier: SubscriptionTier.Free,
    isActive: true,
    startDate: new Date().toISOString(),
    autoRenew: false,
  },
  usage: null,
  loading: false,
  error: null,
  refreshSubscription: jest.fn(),
  refreshUsage: jest.fn(),
  hasFeatureAccess: jest.fn().mockReturnValue(false),
  remainingSearches: -1,
  remainingResults: -1,
  isUnlimited: true,
  daysUntilExpiry: -1,
  isExpiringSoon: false,
  isExpired: false,
};

const premiumSubscription = {
  ...freeSubscription,
  subscription: {
    id: '1',
    userId: 'u1',
    tier: SubscriptionTier.Premium,
    isActive: true,
    startDate: new Date().toISOString(),
    autoRenew: false,
  },
};

describe('AffiliateRecommendation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders partner buttons for free users', () => {
    mockUseSubscription.mockReturnValue(freeSubscription);

    render(
      <AffiliateRecommendation
        partners={mockPartners}
        onTrackClick={jest.fn().mockResolvedValue(null)}
      />
    );

    expect(screen.getByText('ExpressVPN')).toBeInTheDocument();
    expect(screen.getByText('NordVPN')).toBeInTheDocument();
  });

  it('does NOT render for premium users', () => {
    mockUseSubscription.mockReturnValue(premiumSubscription);

    const { container } = render(
      <AffiliateRecommendation
        partners={mockPartners}
        onTrackClick={jest.fn().mockResolvedValue(null)}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('does NOT render when partners array is empty', () => {
    mockUseSubscription.mockReturnValue(freeSubscription);

    const { container } = render(
      <AffiliateRecommendation
        partners={[]}
        onTrackClick={jest.fn().mockResolvedValue(null)}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('calls onTrackClick when partner button is clicked', async () => {
    mockUseSubscription.mockReturnValue(freeSubscription);
    const mockTrackClick = jest.fn().mockResolvedValue(null);

    render(
      <AffiliateRecommendation
        partners={mockPartners}
        onTrackClick={mockTrackClick}
      />
    );

    fireEvent.click(screen.getByText('ExpressVPN'));

    await waitFor(() => {
      expect(mockTrackClick).toHaveBeenCalledWith('partner-1');
    });
  });

  it('opens window.open with returned URL when trackClick returns a URL', async () => {
    mockUseSubscription.mockReturnValue(freeSubscription);
    const mockOpen = jest.spyOn(window, 'open').mockImplementation(() => null);
    const mockTrackClick = jest.fn().mockResolvedValue('https://tracked.url');

    render(
      <AffiliateRecommendation
        partners={mockPartners}
        onTrackClick={mockTrackClick}
      />
    );

    fireEvent.click(screen.getByText('ExpressVPN'));

    await waitFor(() => {
      expect(mockOpen).toHaveBeenCalledWith('https://tracked.url', '_blank', 'noopener,noreferrer');
    });

    mockOpen.mockRestore();
  });
});
