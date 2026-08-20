/**
 * VpnProviderComparison Component Tests
 *
 * Tests the VPN provider comparison component
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VpnProviderComparison } from '../VpnProviderComparison';

const createMockProvider = (overrides: any = {}) => ({
  id: 'provider-1',
  name: 'ExpressVPN',
  description: 'Fast and secure VPN',
  websiteUrl: 'https://expressvpn.com',
  affiliateUrl: 'https://affiliate.expressvpn.com',
  logoUrl: 'https://example.com/logo.png',
  monthlyPrice: 12.95,
  annualPrice: 99.95,
  hasFreeTrial: true,
  freeTrialDays: 30,
  serverCount: 3000,
  countryCount: 94,
  supportsP2P: true,
  supportsStreaming: true,
  hasKillSwitch: true,
  hasNoLogsPolicy: true,
  maxSimultaneousConnections: 5,
  supportedPlatforms: ['Windows', 'Mac', 'iOS', 'Android'],
  overallRating: 4.5,
  totalRatings: 1250,
  isFeatured: false,
  streamingCompatibilities: [
    {
      streamingServiceId: 'netflix',
      streamingServiceName: 'Netflix',
      status: 'WorksReliably' as const,
      notes: 'Works great',
      lastTested: '2024-01-01',
      compatibleRegions: ['US', 'UK'],
    },
  ],
  serverLocations: [
    {
      country: 'United States',
      countryCode: 'US',
      city: 'New York',
      serverCount: 50,
      isOptimizedForStreaming: true,
      isP2PFriendly: true,
    },
  ],
  ...overrides,
});

describe('VpnProviderComparison', () => {
  const mockOnProviderClick = jest.fn();
  const mockOnAffiliateClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders comparison header', () => {
      render(<VpnProviderComparison providers={[]} />);

      expect(screen.getByText(/VPN Provider Comparison/i)).toBeInTheDocument();
    });

    it('renders empty state when no providers', () => {
      render(<VpnProviderComparison providers={[]} />);

      expect(screen.getByText(/No VPN providers to compare/i)).toBeInTheDocument();
      expect(screen.getByText(/Add some VPN providers to see the comparison table/i)).toBeInTheDocument();
    });

    it('renders provider information', () => {
      const provider = createMockProvider();

      render(<VpnProviderComparison providers={[provider]} />);

      expect(screen.getAllByText('ExpressVPN')[0]).toBeInTheDocument();
      expect(screen.getByText('Fast and secure VPN')).toBeInTheDocument();
    });

    it('renders multiple providers', () => {
      const providers = [
        createMockProvider({ id: '1', name: 'ExpressVPN' }),
        createMockProvider({ id: '2', name: 'NordVPN' }),
        createMockProvider({ id: '3', name: 'Surfshark' }),
      ];

      render(<VpnProviderComparison providers={providers} />);

      expect(screen.getAllByText('ExpressVPN').length).toBeGreaterThan(0);
      expect(screen.getAllByText('NordVPN').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Surfshark').length).toBeGreaterThan(0);
    });
  });

  describe('Comparison Criteria', () => {
    it('renders all comparison criteria checkboxes', () => {
      render(<VpnProviderComparison providers={[]} />);

      expect(screen.getByLabelText(/pricing/i)).toBeChecked();
      expect(screen.getByLabelText(/features/i)).toBeChecked();
      expect(screen.getByLabelText(/ratings/i)).toBeChecked();
      expect(screen.getByLabelText(/streaming/i)).toBeChecked();
      expect(screen.getByLabelText(/servers/i)).toBeChecked();
    });

    it('toggles pricing comparison', async () => {
      const user = userEvent.setup();
      const provider = createMockProvider();

      render(<VpnProviderComparison providers={[provider]} />);

      const pricingCheckbox = screen.getByLabelText(/pricing/i);
      await user.click(pricingCheckbox);

      expect(pricingCheckbox).not.toBeChecked();
    });

    it('toggles features comparison', async () => {
      const user = userEvent.setup();

      render(<VpnProviderComparison providers={[createMockProvider()]} />);

      const featuresCheckbox = screen.getByLabelText(/features/i);
      await user.click(featuresCheckbox);

      expect(featuresCheckbox).not.toBeChecked();
    });
  });

  describe('Pricing Display', () => {
    it('displays monthly price', () => {
      const provider = createMockProvider({ monthlyPrice: 12.95 });

      render(<VpnProviderComparison providers={[provider]} />);

      expect(screen.getAllByText(/\$12\.95\/mo/i)[0]).toBeInTheDocument();
    });

    it('displays annual price', () => {
      const provider = createMockProvider({ annualPrice: 99.95 });

      render(<VpnProviderComparison providers={[provider]} />);

      // Annual price shown as monthly: 99.95 / 12 = 8.33
      expect(screen.getAllByText(/\$8\.33\/mo/i)[0]).toBeInTheDocument();
    });

    it('shows free trial badge when available', () => {
      const provider = createMockProvider({ hasFreeTrial: true, freeTrialDays: 30 });

      render(<VpnProviderComparison providers={[provider]} />);

      expect(screen.getAllByText(/30 day free trial/i).length).toBeGreaterThan(0);
    });

    it('does not show free trial badge when unavailable', () => {
      const provider = createMockProvider({ hasFreeTrial: false });

      render(<VpnProviderComparison providers={[provider]} />);

      expect(screen.queryByText(/free trial/i)).not.toBeInTheDocument();
    });
  });

  describe('Ratings Display', () => {
    it('renders star rating', () => {
      const provider = createMockProvider({ overallRating: 4.5 });

      render(<VpnProviderComparison providers={[provider]} />);

      expect(screen.getAllByText('4.5')[0]).toBeInTheDocument();
    });

    it('shows "No ratings" when no rating available', () => {
      const provider = createMockProvider({ overallRating: undefined });

      render(<VpnProviderComparison providers={[provider]} />);

      expect(screen.getAllByText(/No ratings/i)[0]).toBeInTheDocument();
    });

    it('displays total ratings count', () => {
      const provider = createMockProvider({ totalRatings: 1250 });

      render(<VpnProviderComparison providers={[provider]} />);

      expect(screen.getByText(/1250 reviews/i)).toBeInTheDocument();
    });
  });

  describe('Features Display', () => {
    it('shows kill switch feature', () => {
      const provider = createMockProvider({ hasKillSwitch: true });

      render(<VpnProviderComparison providers={[provider]} />);

      expect(screen.getAllByText(/Kill Switch/i).length).toBeGreaterThan(0);
    });

    it('shows no logs policy', () => {
      const provider = createMockProvider({ hasNoLogsPolicy: true });

      render(<VpnProviderComparison providers={[provider]} />);

      expect(screen.getAllByText(/No Logs/i).length).toBeGreaterThan(0);
    });

    it('shows streaming support', () => {
      const provider = createMockProvider({ supportsStreaming: true });

      render(<VpnProviderComparison providers={[provider]} />);

      expect(screen.getAllByText(/Streaming/i).length).toBeGreaterThan(0);
    });

    it('shows P2P support', () => {
      const provider = createMockProvider({ supportsP2P: true });

      render(<VpnProviderComparison providers={[provider]} />);

      expect(screen.getAllByText(/P2P/i).length).toBeGreaterThan(0);
    });

    it('displays max simultaneous connections', () => {
      const provider = createMockProvider({ maxSimultaneousConnections: 5 });

      render(<VpnProviderComparison providers={[provider]} />);

      expect(screen.getAllByText(/5/i).length).toBeGreaterThan(0);
    });
  });

  describe('Server Network Display', () => {
    it('displays server count with formatting', () => {
      const provider = createMockProvider({ serverCount: 3000 });

      render(<VpnProviderComparison providers={[provider]} />);

      expect(screen.getAllByText(/3,000/i)[0]).toBeInTheDocument();
    });

    it('displays country count', () => {
      const provider = createMockProvider({ countryCount: 94 });

      render(<VpnProviderComparison providers={[provider]} />);

      expect(screen.getAllByText(/94/i).length).toBeGreaterThan(0);
    });
  });

  describe('Streaming Compatibility', () => {
    it('displays streaming services', () => {
      const provider = createMockProvider({
        streamingCompatibilities: [
          {
            streamingServiceId: 'netflix',
            streamingServiceName: 'Netflix',
            status: 'WorksReliably',
            lastTested: '2024-01-01',
          },
        ],
      });

      render(<VpnProviderComparison providers={[provider]} />);

      expect(screen.getAllByText(/Netflix/i).length).toBeGreaterThan(0);
    });

    it('shows limited streaming services with +more badge', () => {
      const provider = createMockProvider({
        streamingCompatibilities: [
          { streamingServiceId: '1', streamingServiceName: 'Netflix', status: 'WorksReliably', lastTested: '2024-01-01' },
          { streamingServiceId: '2', streamingServiceName: 'Hulu', status: 'WorksReliably', lastTested: '2024-01-01' },
          { streamingServiceId: '3', streamingServiceName: 'Disney+', status: 'WorksReliably', lastTested: '2024-01-01' },
          { streamingServiceId: '4', streamingServiceName: 'Amazon Prime', status: 'WorksReliably', lastTested: '2024-01-01' },
          { streamingServiceId: '5', streamingServiceName: 'HBO Max', status: 'WorksReliably', lastTested: '2024-01-01' },
        ],
      });

      render(<VpnProviderComparison providers={[provider]} />);

      expect(screen.getAllByText(/\+1 more/i).length).toBeGreaterThan(0);
    });

    it('applies correct status colors', () => {
      const provider = createMockProvider({
        streamingCompatibilities: [
          {
            streamingServiceId: 'netflix',
            streamingServiceName: 'Netflix',
            status: 'WorksReliably',
            lastTested: '2024-01-01',
          },
        ],
      });

      const { container } = render(<VpnProviderComparison providers={[provider]} />);

      // Find badge with success color class
      const badges = container.querySelectorAll('.bg-success\\/10');
      expect(badges.length).toBeGreaterThan(0);
    });
  });

  describe('Featured Badge', () => {
    it('shows featured badge for featured providers', () => {
      const provider = createMockProvider({ isFeatured: true });

      render(<VpnProviderComparison providers={[provider]} />);

      expect(screen.getAllByText(/Featured/i).length).toBeGreaterThan(0);
    });

    it('does not show featured badge for non-featured providers', () => {
      const provider = createMockProvider({ isFeatured: false });

      render(<VpnProviderComparison providers={[provider]} />);

      expect(screen.queryByText(/Featured/i)).not.toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('calls onProviderClick when Learn More clicked', async () => {
      const user = userEvent.setup();
      const provider = createMockProvider();

      render(
        <VpnProviderComparison
          providers={[provider]}
          onProviderClick={mockOnProviderClick}
          onAffiliateClick={mockOnAffiliateClick}
        />
      );

      const learnMoreButtons = screen.getAllByText(/Learn More/i);
      await user.click(learnMoreButtons[0]);

      expect(mockOnProviderClick).toHaveBeenCalledWith(provider);
    });

    it('calls onAffiliateClick when Get Started clicked', async () => {
      const user = userEvent.setup();
      const provider = createMockProvider();

      render(
        <VpnProviderComparison
          providers={[provider]}
          onProviderClick={mockOnProviderClick}
          onAffiliateClick={mockOnAffiliateClick}
        />
      );

      const getStartedButtons = screen.getAllByText(/Get Started/i);
      await user.click(getStartedButtons[0]);

      expect(mockOnAffiliateClick).toHaveBeenCalledWith(provider);
    });

    it('does not crash when callbacks not provided', async () => {
      const user = userEvent.setup();
      const provider = createMockProvider();

      render(<VpnProviderComparison providers={[provider]} />);

      const learnMoreButtons = screen.getAllByText(/Learn More/i);
      await user.click(learnMoreButtons[0]);

      // Should not crash
      expect(learnMoreButtons[0]).toBeInTheDocument();
    });
  });

  describe('Responsive Views', () => {
    it('renders mobile view cards', () => {
      const provider = createMockProvider();

      const { container } = render(<VpnProviderComparison providers={[provider]} />);

      // Mobile view uses "block md:hidden"
      const mobileView = container.querySelector('.block.md\\:hidden');
      expect(mobileView).toBeInTheDocument();
    });

    it('renders desktop table view', () => {
      const provider = createMockProvider();

      const { container } = render(<VpnProviderComparison providers={[provider]} />);

      // Desktop view uses "hidden md:block"
      const desktopView = container.querySelector('.hidden.md\\:block');
      expect(desktopView).toBeInTheDocument();
    });
  });

  describe('Logo Display', () => {
    it('renders provider logo when available', () => {
      const provider = createMockProvider({ logoUrl: 'https://example.com/logo.png' });

      render(<VpnProviderComparison providers={[provider]} />);

      const logos = screen.getAllByAltText('ExpressVPN');
      expect(logos.length).toBeGreaterThan(0);
      expect(logos[0]).toHaveAttribute('src', 'https://example.com/logo.png');
    });

    it('does not crash when logo URL missing', () => {
      const provider = createMockProvider({ logoUrl: undefined });

      expect(() => {
        render(<VpnProviderComparison providers={[provider]} />);
      }).not.toThrow();
    });
  });
});
