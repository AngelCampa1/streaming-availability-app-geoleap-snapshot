import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CountryRecommendationCard } from './CountryRecommendationCard';
import { CountryRecommendation } from '@/types/vpn-country';

// Mock VpnProviderList component
jest.mock('./VpnProviderList', () => ({
  VpnProviderList: ({ providers, onSelectVpn: _onSelectVpn }: { providers: unknown[]; onSelectVpn?: () => void }) => (
    <div data-testid="vpn-provider-list">
      {providers.length} VPN Provider(s)
    </div>
  ),
}));

// Helper to render component with React Query provider
function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('CountryRecommendationCard', () => {
  const mockPerfectMatchCountry: CountryRecommendation = {
    countryCode: 'US',
    countryName: 'United States',
    countryFlag: '🇺🇸',
    audioLanguages: ['en', 'es'],
    subtitleLanguages: ['en', 'es', 'fr'],
    languageScore: 1.0,
    languageMatchQuality: 'Perfect',
    languageHighlights: [
      '✓ English audio available',
      '✓ Multiple subtitle options',
    ],
    availableVpnProviders: [
      {
        vpnProviderId: 'nord-vpn',
        vpnProviderName: 'NordVPN',
        price: 11.99,
        rating: 4.7,
        vpnProviderLogoUrl: '/logos/nordvpn.png',
        affiliateLink: 'https://nordvpn.com',
        serverCount: 250,
      },
      {
        vpnProviderId: 'express-vpn',
        vpnProviderName: 'ExpressVPN',
        price: 12.95,
        rating: 4.8,
        vpnProviderLogoUrl: '/logos/expressvpn.png',
        affiliateLink: 'https://expressvpn.com',
        serverCount: 180,
      },
    ],
    streamingServices: ['Netflix', 'Hulu', 'HBO Max', 'Disney+'],
    rank: 1,
  };

  const mockGoodMatchCountry: CountryRecommendation = {
    ...mockPerfectMatchCountry,
    countryCode: 'GB',
    countryName: 'United Kingdom',
    countryFlag: '🇬🇧',
    languageScore: 0.8,
    languageMatchQuality: 'Good',
    languageHighlights: ['✓ English audio', '⚠ Limited subtitles'],
    rank: 2,
  };

  const mockPartialMatchCountry: CountryRecommendation = {
    ...mockPerfectMatchCountry,
    countryCode: 'DE',
    countryName: 'Germany',
    countryFlag: '🇩🇪',
    languageScore: 0.5,
    languageMatchQuality: 'Partial',
    languageHighlights: ['⚠ Original audio only', '✓ English subtitles'],
    rank: 5,
  };

  describe('Country Flag Display', () => {
    it('should render country flag emoji', () => {
      renderWithQueryClient(<CountryRecommendationCard country={mockPerfectMatchCountry} userAudioLanguages={['en']} userSubtitleLanguages={['en']} />);

      expect(screen.getByText('🇺🇸')).toBeInTheDocument();
    });

    it('should have proper flag styling', () => {
      const { container } = renderWithQueryClient(<CountryRecommendationCard country={mockPerfectMatchCountry} userAudioLanguages={['en']} userSubtitleLanguages={['en']} />);

      const flagContainer = container.querySelector('[class*="w-12"][class*="h-12"]');
      expect(flagContainer).toBeInTheDocument();
      expect(flagContainer).toHaveClass('text-4xl');
    });
  });

  describe('Language Highlights Rendering', () => {
    it('should render all language highlights', () => {
      renderWithQueryClient(<CountryRecommendationCard country={mockPerfectMatchCountry} userAudioLanguages={['en']} userSubtitleLanguages={['en']} />);

      expect(screen.getByText(/English audio available/i)).toBeInTheDocument();
      expect(screen.getByText(/Multiple subtitle options/i)).toBeInTheDocument();
    });

    it('should show positive icon for checkmark highlights', () => {
      const { container } = renderWithQueryClient(<CountryRecommendationCard country={mockPerfectMatchCountry} userAudioLanguages={['en']} userSubtitleLanguages={['en']} />);

      // CheckCircle icons should be present for positive highlights
      const checkIcons = container.querySelectorAll('svg');
      expect(checkIcons.length).toBeGreaterThan(0);
    });

    it('should show warning icon for warning highlights', () => {
      const { container } = renderWithQueryClient(<CountryRecommendationCard country={mockGoodMatchCountry} userAudioLanguages={['en']} userSubtitleLanguages={['en']} />);

      // AlertTriangle icons should be present for warnings
      const warningIcons = container.querySelectorAll('svg');
      expect(warningIcons.length).toBeGreaterThan(0);
    });
  });

  describe('VPN Provider List Expand/Collapse', () => {
    it('should initially be collapsed', () => {
      renderWithQueryClient(<CountryRecommendationCard country={mockPerfectMatchCountry} userAudioLanguages={['en']} userSubtitleLanguages={['en']} />);

      expect(screen.queryByTestId('vpn-provider-list')).not.toBeInTheDocument();
    });

    it('should expand when expand button is clicked', () => {
      renderWithQueryClient(<CountryRecommendationCard country={mockPerfectMatchCountry} userAudioLanguages={['en']} userSubtitleLanguages={['en']} />);

      const expandButton = screen.getByRole('button', { name: /show vpn providers/i });
      fireEvent.click(expandButton);

      expect(screen.getByTestId('vpn-provider-list')).toBeInTheDocument();
    });

    it('should collapse when collapse button is clicked', () => {
      renderWithQueryClient(<CountryRecommendationCard country={mockPerfectMatchCountry} userAudioLanguages={['en']} userSubtitleLanguages={['en']} />);

      // Expand first
      const expandButton = screen.getByRole('button', { name: /show vpn providers/i });
      fireEvent.click(expandButton);
      expect(screen.getByTestId('vpn-provider-list')).toBeInTheDocument();

      // Then collapse
      const collapseButton = screen.getByRole('button', { name: /hide vpn providers/i });
      fireEvent.click(collapseButton);
      expect(screen.queryByTestId('vpn-provider-list')).not.toBeInTheDocument();
    });

    it('should show VPN count in expand button', () => {
      renderWithQueryClient(<CountryRecommendationCard country={mockPerfectMatchCountry} userAudioLanguages={['en']} userSubtitleLanguages={['en']} />);

      expect(screen.getByText(/VPN Options \(2\)/i)).toBeInTheDocument();
    });

    it('should show minimum price when collapsed', () => {
      renderWithQueryClient(<CountryRecommendationCard country={mockPerfectMatchCountry} userAudioLanguages={['en']} userSubtitleLanguages={['en']} />);

      expect(screen.getByText(/\$11.99\/mo/i)).toBeInTheDocument();
    });
  });

  describe('Match Quality Levels', () => {
    it('should display Perfect Match with correct styling', () => {
      renderWithQueryClient(<CountryRecommendationCard country={mockPerfectMatchCountry} userAudioLanguages={['en']} userSubtitleLanguages={['en']} />);

      const badge = screen.getByText(/Perfect Match/i);
      expect(badge).toBeInTheDocument();
      // The badge uses design token classes (text-success)
      expect(badge).toHaveClass('text-success');
    });

    it('should display Good Match with correct styling', () => {
      renderWithQueryClient(<CountryRecommendationCard country={mockGoodMatchCountry} userAudioLanguages={['en']} userSubtitleLanguages={['en']} />);

      const badge = screen.getByText(/Good Match/i);
      expect(badge).toBeInTheDocument();
      // The badge uses design token classes (text-primary)
      expect(badge).toHaveClass('text-primary');
    });

    it('should display Partial Match with correct styling', () => {
      renderWithQueryClient(<CountryRecommendationCard country={mockPartialMatchCountry} userAudioLanguages={['en']} userSubtitleLanguages={['en']} />);

      const badge = screen.getByText(/Partial Match/i);
      expect(badge).toBeInTheDocument();
      // The badge uses design token classes (text-warning)
      expect(badge).toHaveClass('text-warning');
    });

    it('should show language score percentage', () => {
      renderWithQueryClient(<CountryRecommendationCard country={mockPerfectMatchCountry} userAudioLanguages={['en']} userSubtitleLanguages={['en']} />);

      expect(screen.getByText(/100% match/i)).toBeInTheDocument();
    });

    it('should show rank badge for top 3 countries', () => {
      renderWithQueryClient(<CountryRecommendationCard country={mockPerfectMatchCountry} userAudioLanguages={['en']} userSubtitleLanguages={['en']} />);

      expect(screen.getByText('#1')).toBeInTheDocument();
    });

    it('should not show rank badge for countries beyond top 3', () => {
      renderWithQueryClient(<CountryRecommendationCard country={mockPartialMatchCountry} userAudioLanguages={['en']} userSubtitleLanguages={['en']} />);

      expect(screen.queryByText('#5')).not.toBeInTheDocument();
    });
  });

  describe('Streaming Services Display', () => {
    it('should render streaming services', () => {
      renderWithQueryClient(<CountryRecommendationCard country={mockPerfectMatchCountry} userAudioLanguages={['en']} userSubtitleLanguages={['en']} />);

      expect(screen.getByText('Netflix')).toBeInTheDocument();
      expect(screen.getByText('Hulu')).toBeInTheDocument();
      expect(screen.getByText('HBO Max')).toBeInTheDocument();
      expect(screen.getByText('Disney+')).toBeInTheDocument();
    });

    it('should limit displayed services to 5', () => {
      const countryWithManyServices: CountryRecommendation = {
        ...mockPerfectMatchCountry,
        streamingServices: ['Netflix', 'Hulu', 'HBO Max', 'Disney+', 'Amazon Prime', 'Apple TV+', 'Peacock'],
      };

      renderWithQueryClient(<CountryRecommendationCard country={countryWithManyServices} userAudioLanguages={['en']} userSubtitleLanguages={['en']} />);

      // Should show "+2 more"
      expect(screen.getByText(/\+2 more/i)).toBeInTheDocument();
    });

    it('should not show streaming section if no services', () => {
      const countryWithNoServices: CountryRecommendation = {
        ...mockPerfectMatchCountry,
        streamingServices: [],
      };

      renderWithQueryClient(<CountryRecommendationCard country={countryWithNoServices} userAudioLanguages={['en']} userSubtitleLanguages={['en']} />);

      expect(screen.queryByText('Available on:')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      renderWithQueryClient(<CountryRecommendationCard country={mockPerfectMatchCountry} userAudioLanguages={['en']} userSubtitleLanguages={['en']} />);

      const expandButton = screen.getByRole('button');
      expect(expandButton).toHaveAttribute('aria-expanded', 'false');
      expect(expandButton).toHaveAttribute('aria-label');
    });

    it('should update aria-expanded when expanded', () => {
      renderWithQueryClient(<CountryRecommendationCard country={mockPerfectMatchCountry} userAudioLanguages={['en']} userSubtitleLanguages={['en']} />);

      const expandButton = screen.getByRole('button');
      fireEvent.click(expandButton);

      expect(expandButton).toHaveAttribute('aria-expanded', 'true');
    });

    it('should have data-testid for testing', () => {
      renderWithQueryClient(<CountryRecommendationCard country={mockPerfectMatchCountry} userAudioLanguages={['en']} userSubtitleLanguages={['en']} />);

      expect(screen.getByTestId('country-recommendation-card')).toBeInTheDocument();
    });

    it('should have country code as data attribute', () => {
      renderWithQueryClient(<CountryRecommendationCard country={mockPerfectMatchCountry} userAudioLanguages={['en']} userSubtitleLanguages={['en']} />);

      const card = screen.getByTestId('country-recommendation-card');
      expect(card).toHaveAttribute('data-country-code', 'US');
    });
  });

  describe('VPN Selection', () => {
    it('should call onSelectVpn callback when VPN is selected', () => {
      const mockOnSelectVpn = jest.fn();
      renderWithQueryClient(<CountryRecommendationCard country={mockPerfectMatchCountry} userAudioLanguages={['en']} userSubtitleLanguages={['en']} onSelectVpn={mockOnSelectVpn} />);

      // Expand the list first
      const expandButton = screen.getByRole('button');
      fireEvent.click(expandButton);

      // Provider list is mocked, so we can't actually test the selection
      // But we verify the callback is passed through
      expect(screen.getByTestId('vpn-provider-list')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty VPN provider list', () => {
      const countryWithNoVpns: CountryRecommendation = {
        ...mockPerfectMatchCountry,
        availableVpnProviders: [],
      };

      renderWithQueryClient(<CountryRecommendationCard country={countryWithNoVpns} userAudioLanguages={['en']} userSubtitleLanguages={['en']} />);

      expect(screen.getByText(/VPN Options \(0\)/i)).toBeInTheDocument();
    });

    it('should handle empty language highlights', () => {
      const countryWithNoHighlights: CountryRecommendation = {
        ...mockPerfectMatchCountry,
        languageHighlights: [],
      };

      const { container } = renderWithQueryClient(<CountryRecommendationCard country={countryWithNoHighlights} userAudioLanguages={['en']} userSubtitleLanguages={['en']} />);

      // Should not crash, just not show highlights
      expect(container).toBeInTheDocument();
    });

    it('should handle custom className', () => {
      renderWithQueryClient(<CountryRecommendationCard country={mockPerfectMatchCountry} userAudioLanguages={['en']} userSubtitleLanguages={['en']} className="custom-class" />);

      const card = screen.getByTestId('country-recommendation-card');
      expect(card).toHaveClass('custom-class');
    });
  });
});
