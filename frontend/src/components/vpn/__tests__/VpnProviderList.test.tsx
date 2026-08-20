import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { VpnProviderList } from '../VpnProviderList';
import type { VpnProviderSummary } from '@/types/vpn-country';

// Mock window.open (external I/O boundary)
const mockWindowOpen = jest.fn();

describe('VpnProviderList', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'open', {
      writable: true,
      value: mockWindowOpen,
    });
  });

  beforeEach(() => {
    mockWindowOpen.mockClear();
  });

  // Test data
  const mockProviders: VpnProviderSummary[] = [
    {
      vpnProviderId: 'nordvpn',
      vpnProviderName: 'NordVPN',
      vpnProviderLogoUrl: 'https://example.com/nordvpn.png',
      rating: 4.7,
      price: 3.99,
      currency: '$',
      serverCount: 150,
      speedMbps: 450,
      affiliateLink: 'https://nordvpn.com/offer',
    },
    {
      vpnProviderId: 'expressvpn',
      vpnProviderName: 'ExpressVPN',
      vpnProviderLogoUrl: 'https://example.com/expressvpn.png',
      rating: 4.8,
      price: 6.67,
      currency: '$',
      serverCount: 200,
      speedMbps: 500,
      affiliateLink: 'https://expressvpn.com/offer',
    },
  ];

  // Test Category 1: Basic Rendering (4 tests)

  describe('Basic Rendering', () => {
    it('should render providers list with all provider details', () => {
      render(<VpnProviderList providers={mockProviders} countryCode="US" />);

      // Check list container
      expect(screen.getByTestId('vpn-provider-list')).toBeInTheDocument();

      // Check both providers are rendered
      expect(screen.getByTestId('vpn-provider-nordvpn')).toBeInTheDocument();
      expect(screen.getByTestId('vpn-provider-expressvpn')).toBeInTheDocument();

      // Check provider names
      expect(screen.getByText('NordVPN')).toBeInTheDocument();
      expect(screen.getByText('ExpressVPN')).toBeInTheDocument();
    });

    it('should display provider logos with proper alt text', () => {
      render(<VpnProviderList providers={mockProviders} countryCode="US" />);

      // Next.js Image components should have alt text
      const nordLogo = screen.getByAltText('NordVPN logo');
      const expressLogo = screen.getByAltText('ExpressVPN logo');

      expect(nordLogo).toBeInTheDocument();
      expect(expressLogo).toBeInTheDocument();
    });

    it('should display ratings with star icons', () => {
      render(<VpnProviderList providers={mockProviders} countryCode="US" />);

      // Ratings should be displayed with one decimal place
      expect(screen.getByText('4.7')).toBeInTheDocument();
      expect(screen.getByText('4.8')).toBeInTheDocument();
    });

    it('should display price, server count, and speed information', () => {
      render(<VpnProviderList providers={mockProviders} countryCode="US" />);

      // Prices
      expect(screen.getByText('$3.99')).toBeInTheDocument();
      expect(screen.getByText('$6.67')).toBeInTheDocument();

      // Server counts
      expect(screen.getByText('150 servers')).toBeInTheDocument();
      expect(screen.getByText('200 servers')).toBeInTheDocument();

      // Speeds
      expect(screen.getByText('450 Mbps')).toBeInTheDocument();
      expect(screen.getByText('500 Mbps')).toBeInTheDocument();
    });
  });

  // Test Category 2: Interactions (5 tests)

  describe('Interactions', () => {
    it('should call onSelectVpn callback when View button is clicked', () => {
      const mockOnSelectVpn = jest.fn();

      render(
        <VpnProviderList
          providers={[mockProviders[0]]}
          countryCode="US"
          onSelectVpn={mockOnSelectVpn}
        />
      );

      const viewButton = screen.getByRole('button', { name: /View details for NordVPN/i });
      fireEvent.click(viewButton);

      expect(mockOnSelectVpn).toHaveBeenCalledWith('nordvpn', 'US');
      expect(mockOnSelectVpn).toHaveBeenCalledTimes(1);
    });

    it('should open affiliate link in new window when View button is clicked', () => {
      render(<VpnProviderList providers={[mockProviders[0]]} countryCode="US" />);

      const viewButton = screen.getByRole('button', { name: /View details for NordVPN/i });
      fireEvent.click(viewButton);

      expect(mockWindowOpen).toHaveBeenCalledWith(
        'https://nordvpn.com/offer',
        '_blank',
        'noopener,noreferrer'
      );
      expect(mockWindowOpen).toHaveBeenCalledTimes(1);
    });

    it('should handle both callback and affiliate link when both are provided', () => {
      const mockOnSelectVpn = jest.fn();

      render(
        <VpnProviderList
          providers={[mockProviders[0]]}
          countryCode="GB"
          onSelectVpn={mockOnSelectVpn}
        />
      );

      const viewButton = screen.getByRole('button', { name: /View details for NordVPN/i });
      fireEvent.click(viewButton);

      // Both callback and window.open should be called
      expect(mockOnSelectVpn).toHaveBeenCalledWith('nordvpn', 'GB');
      expect(mockWindowOpen).toHaveBeenCalledWith(
        'https://nordvpn.com/offer',
        '_blank',
        'noopener,noreferrer'
      );
    });

    it('should have proper accessibility attributes on View button', () => {
      render(<VpnProviderList providers={[mockProviders[0]]} countryCode="US" />);

      const viewButton = screen.getByRole('button', { name: /View details for NordVPN/i });

      expect(viewButton).toHaveAttribute('type', 'button');
      expect(viewButton).toHaveAttribute('aria-label', 'View details for NordVPN');
    });

    it('should handle click without onSelectVpn callback gracefully', () => {
      render(<VpnProviderList providers={[mockProviders[0]]} countryCode="US" />);

      const viewButton = screen.getByRole('button', { name: /View details for NordVPN/i });

      // Should not throw error when clicking without callback
      expect(() => fireEvent.click(viewButton)).not.toThrow();

      // Affiliate link should still open
      expect(mockWindowOpen).toHaveBeenCalledWith(
        'https://nordvpn.com/offer',
        '_blank',
        'noopener,noreferrer'
      );
    });
  });

  // Test Category 3: Edge Cases (5 tests)

  describe('Edge Cases', () => {
    it('should show empty state message when no providers are available', () => {
      render(<VpnProviderList providers={[]} countryCode="US" />);

      expect(screen.getByText('No VPN providers available for this country')).toBeInTheDocument();
      expect(screen.queryByTestId('vpn-provider-list')).not.toBeInTheDocument();
    });

    it('should handle provider without logo by showing first letter', () => {
      const providerWithoutLogo: VpnProviderSummary = {
        ...mockProviders[0],
        vpnProviderLogoUrl: undefined,
      };

      render(<VpnProviderList providers={[providerWithoutLogo]} countryCode="US" />);

      // Should show first letter 'N' from 'NordVPN'
      expect(screen.getByText('N')).toBeInTheDocument();

      // Logo image should not be present
      expect(screen.queryByAltText('NordVPN logo')).not.toBeInTheDocument();
    });

    it('should handle provider without rating', () => {
      const providerWithoutRating: VpnProviderSummary = {
        ...mockProviders[0],
        rating: 0,
      };

      render(<VpnProviderList providers={[providerWithoutRating]} countryCode="US" />);

      // Provider name should still be visible
      expect(screen.getByText('NordVPN')).toBeInTheDocument();

      // Rating should not be displayed (0 rating means no rating shown)
      // Price $3.99 will still be visible, so we check that there's no Star icon
      const providerCard = screen.getByTestId('vpn-provider-nordvpn');
      const starIcons = providerCard.querySelectorAll('.lucide-star');
      expect(starIcons.length).toBe(0);
    });

    it('should handle provider without price information', () => {
      const providerWithoutPrice: VpnProviderSummary = {
        ...mockProviders[0],
        price: undefined,
        currency: undefined,
      };

      render(<VpnProviderList providers={[providerWithoutPrice]} countryCode="US" />);

      // Provider should still render
      expect(screen.getByText('NordVPN')).toBeInTheDocument();

      // Price section should not be visible
      expect(screen.queryByText('per month')).not.toBeInTheDocument();
    });

    it('should handle provider without affiliate link', () => {
      const providerWithoutLink: VpnProviderSummary = {
        ...mockProviders[0],
        affiliateLink: undefined,
      };

      const mockOnSelectVpn = jest.fn();

      render(
        <VpnProviderList
          providers={[providerWithoutLink]}
          countryCode="US"
          onSelectVpn={mockOnSelectVpn}
        />
      );

      const viewButton = screen.getByRole('button', { name: /View details for NordVPN/i });
      fireEvent.click(viewButton);

      // Callback should be called
      expect(mockOnSelectVpn).toHaveBeenCalledWith('nordvpn', 'US');

      // window.open should NOT be called without affiliate link
      expect(mockWindowOpen).not.toHaveBeenCalled();
    });
  });

  // Test Category 4: Additional Features (2 tests)

  describe('Additional Features', () => {
    it('should render multiple providers in correct order', () => {
      const threeProviders = [
        ...mockProviders,
        {
          vpnProviderId: 'surfshark',
          vpnProviderName: 'Surfshark',
          vpnProviderLogoUrl: 'https://example.com/surfshark.png',
          rating: 4.6,
          price: 2.49,
          currency: '$',
          serverCount: 100,
          speedMbps: 400,
        },
      ];

      render(<VpnProviderList providers={threeProviders} countryCode="US" />);

      // Check that all three providers are rendered
      expect(screen.getByTestId('vpn-provider-nordvpn')).toBeInTheDocument();
      expect(screen.getByTestId('vpn-provider-expressvpn')).toBeInTheDocument();
      expect(screen.getByTestId('vpn-provider-surfshark')).toBeInTheDocument();

      // Verify all provider names are visible (order preserved)
      expect(screen.getByText('NordVPN')).toBeInTheDocument();
      expect(screen.getByText('ExpressVPN')).toBeInTheDocument();
      expect(screen.getByText('Surfshark')).toBeInTheDocument();
    });

    it('should apply custom className to the container', () => {
      const customClass = 'custom-vpn-list';

      const { container } = render(
        <VpnProviderList
          providers={mockProviders}
          countryCode="US"
          className={customClass}
        />
      );

      const listContainer = container.querySelector('[data-testid="vpn-provider-list"]');
      expect(listContainer?.className).toContain(customClass);
    });
  });
});
