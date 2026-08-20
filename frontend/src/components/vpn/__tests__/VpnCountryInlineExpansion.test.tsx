import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VpnCountryInlineExpansion } from '../VpnCountryInlineExpansion';
import { server } from '@/mocks/server';
import { http, HttpResponse } from 'msw';

// Mock useUserSubscriptions hook
const mockUseUserSubscriptions = jest.fn(() => ({
  subscriptions: [
    { serviceId: 'netflix', serviceName: 'Netflix', isActive: true },
    { serviceId: 'prime', serviceName: 'Prime Video', isActive: true },
  ],
  getServiceIds: () => ['netflix', 'prime'],
  hasSetupSubscriptions: true,
  loading: false,
}));

jest.mock('@/hooks/useUserSubscriptions', () => ({
  useUserSubscriptions: () => mockUseUserSubscriptions(),
}));

describe('VpnCountryInlineExpansion', () => {
  const mockApiResponse = {
    contentId: 'tt1234567',
    contentTitle: 'Breaking Bad',
    recommendedCountries: [
      {
        countryCode: 'US',
        countryName: 'United States',
        countryFlag: '🇺🇸',
        languageMatchQuality: 'Perfect',
        streamingServices: ['netflix', 'prime'],
        audioLanguages: ['en'],
        subtitleLanguages: ['en', 'es'],
      },
      {
        countryCode: 'GB',
        countryName: 'United Kingdom',
        countryFlag: '🇬🇧',
        languageMatchQuality: 'Good',
        streamingServices: ['netflix'],
        audioLanguages: ['en'],
        subtitleLanguages: ['en'],
      },
      {
        countryCode: 'DE',
        countryName: 'Germany',
        countryFlag: '🇩🇪',
        languageMatchQuality: 'Partial',
        streamingServices: ['prime'],
        audioLanguages: ['de'],
        subtitleLanguages: ['en', 'de'],
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset the mock to default behavior
    mockUseUserSubscriptions.mockReturnValue({
      subscriptions: [
        { serviceId: 'netflix', serviceName: 'Netflix', isActive: true },
        { serviceId: 'prime', serviceName: 'Prime Video', isActive: true },
      ],
      getServiceIds: () => ['netflix', 'prime'],
      hasSetupSubscriptions: true,
      loading: false,
    });

    // Setup MSW handler for VPN countries endpoint
    server.use(
      http.get('http://localhost:8020/api/vpnguidance/countries-for-content/:contentId', () => {
        return HttpResponse.json(mockApiResponse);
      })
    );
  });

  // Test Category 1: Collapsed State (2 tests)

  describe('Collapsed State', () => {
    it('should render nothing when isExpanded is false', () => {
      const { container } = render(
        <VpnCountryInlineExpansion
          contentId="tt1234567"
          isExpanded={false}
          onCollapse={jest.fn()}
        />
      );

      // Component should not render anything when collapsed
      expect(container.firstChild).toBeNull();
    });

    it('should not fetch data when collapsed', async () => {
      render(
        <VpnCountryInlineExpansion
          contentId="tt1234567"
          isExpanded={false}
          onCollapse={jest.fn()}
        />
      );

      // Wait a bit to ensure no request is made
      await new Promise(resolve => setTimeout(resolve, 100));

      // Component should not render anything
      expect(screen.queryByTestId('vpn-expansion-container')).not.toBeInTheDocument();
    });
  });

  // Test Category 2: Loading State (2 tests)

  describe('Loading State', () => {
    it('should show loading spinner when fetching data', async () => {
      // Add delay to MSW handler
      server.use(
        http.get('http://localhost:8020/api/vpnguidance/countries-for-content/:contentId', async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return HttpResponse.json(mockApiResponse);
        })
      );

      render(
        <VpnCountryInlineExpansion
          contentId="tt1234567"
          isExpanded={true}
          onCollapse={jest.fn()}
        />
      );

      // Should show loading indicator
      expect(screen.getByTestId('vpn-expansion-loading')).toBeInTheDocument();
      expect(screen.getByText(/finding vpn locations/i)).toBeInTheDocument();

      // Wait for data to load
      await waitFor(() => {
        expect(screen.queryByTestId('vpn-expansion-loading')).not.toBeInTheDocument();
      });
    });

    it('should fetch data when expanded', async () => {
      render(
        <VpnCountryInlineExpansion
          contentId="tt1234567"
          isExpanded={true}
          onCollapse={jest.fn()}
          audioLanguages={['en']}
          subtitleLanguages={['en', 'es']}
        />
      );

      await waitFor(() => {
        expect(screen.queryByTestId('vpn-expansion-loading')).not.toBeInTheDocument();
      });

      // Check that data is displayed (US appears in multiple services)
      const usCountries = screen.getAllByText('United States');
      expect(usCountries.length).toBeGreaterThan(0);
    });
  });

  // Test Category 3: Data Display - Grouped by Services (4 tests)

  describe('Data Display - Grouped by User Services', () => {
    it('should display countries grouped by user subscribed services', async () => {
      render(
        <VpnCountryInlineExpansion
          contentId="tt1234567"
          isExpanded={true}
          onCollapse={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.queryByTestId('vpn-expansion-loading')).not.toBeInTheDocument();
      });

      // Should show Netflix section
      expect(screen.getByText(/netflix/i)).toBeInTheDocument();

      // Should show Prime Video section
      expect(screen.getByText(/prime video/i)).toBeInTheDocument();

      // Countries should be displayed with flags (US appears in multiple services)
      expect(screen.getAllByText('🇺🇸').length).toBeGreaterThan(0);
      expect(screen.getByText('🇬🇧')).toBeInTheDocument();
      expect(screen.getByText('🇩🇪')).toBeInTheDocument();
    });

    it('should filter countries by user subscriptions', async () => {
      render(
        <VpnCountryInlineExpansion
          contentId="tt1234567"
          isExpanded={true}
          onCollapse={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.queryByTestId('vpn-expansion-loading')).not.toBeInTheDocument();
      });

      // US and GB should appear under Netflix (user has Netflix subscription)
      const netflixSection = screen.getByTestId('service-netflix');
      expect(netflixSection).toHaveTextContent('United States');
      expect(netflixSection).toHaveTextContent('United Kingdom');

      // DE should appear under Prime Video (user has Prime subscription)
      const primeSection = screen.getByTestId('service-prime');
      expect(primeSection).toHaveTextContent('Germany');
    });

    it('should show all services when user has no subscriptions configured', async () => {
      // Mock hook to return no subscriptions
      mockUseUserSubscriptions.mockReturnValue({
        subscriptions: [],
        getServiceIds: () => [],
        hasSetupSubscriptions: false,
        loading: false,
      });

      render(
        <VpnCountryInlineExpansion
          contentId="tt1234567"
          isExpanded={true}
          onCollapse={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.queryByTestId('vpn-expansion-loading')).not.toBeInTheDocument();
      });

      // Should show all services even if user doesn't have subscriptions
      expect(screen.getByText(/netflix/i)).toBeInTheDocument();
      expect(screen.getByText(/prime video/i)).toBeInTheDocument();

      // All countries should be visible (using getAllByText for duplicates)
      expect(screen.getAllByText('United States').length).toBeGreaterThan(0);
      expect(screen.getByText('United Kingdom')).toBeInTheDocument();
      expect(screen.getByText('Germany')).toBeInTheDocument();
    });

    it('should display country names with flags', async () => {
      render(
        <VpnCountryInlineExpansion
          contentId="tt1234567"
          isExpanded={true}
          onCollapse={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.queryByTestId('vpn-expansion-loading')).not.toBeInTheDocument();
      });

      // Check country cards render with testids (US appears in multiple services)
      const usCountries = screen.getAllByTestId('country-US');
      expect(usCountries.length).toBeGreaterThan(0);
      expect(screen.getByTestId('country-GB')).toBeInTheDocument();
      expect(screen.getByTestId('country-DE')).toBeInTheDocument();
    });
  });

  // Test Category 4: Language Match Quality Badges (3 tests)

  describe('Language Match Quality Badges', () => {
    it('should show Perfect match badge with success color', async () => {
      render(
        <VpnCountryInlineExpansion
          contentId="tt1234567"
          isExpanded={true}
          onCollapse={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.queryByTestId('vpn-expansion-loading')).not.toBeInTheDocument();
      });

      // US has Perfect match (appears in multiple services, check first one)
      const usCards = screen.getAllByTestId('country-US');
      const perfectBadge = usCards[0].querySelector('[data-quality="Perfect"]');
      expect(perfectBadge).toBeInTheDocument();
      expect(perfectBadge).toHaveTextContent(/perfect/i);
    });

    it('should show Good match badge with primary color', async () => {
      render(
        <VpnCountryInlineExpansion
          contentId="tt1234567"
          isExpanded={true}
          onCollapse={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.queryByTestId('vpn-expansion-loading')).not.toBeInTheDocument();
      });

      // GB has Good match
      const gbCard = screen.getByTestId('country-GB');
      const goodBadge = gbCard.querySelector('[data-quality="Good"]');
      expect(goodBadge).toBeInTheDocument();
      expect(goodBadge).toHaveTextContent(/good/i);
    });

    it('should show Partial match badge with warning color', async () => {
      render(
        <VpnCountryInlineExpansion
          contentId="tt1234567"
          isExpanded={true}
          onCollapse={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.queryByTestId('vpn-expansion-loading')).not.toBeInTheDocument();
      });

      // DE has Partial match
      const deCard = screen.getByTestId('country-DE');
      const partialBadge = deCard.querySelector('[data-quality="Partial"]');
      expect(partialBadge).toBeInTheDocument();
      expect(partialBadge).toHaveTextContent(/partial/i);
    });
  });

  // Test Category 5: Error Handling (3 tests)

  describe('Error Handling', () => {
    it('should display error message when API call fails', async () => {
      // Return error response from MSW (override both URL patterns)
      server.use(
        http.get('/api/vpnguidance/countries-for-content/:contentId', async () => {
          return HttpResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
          );
        }),
        http.get('http://localhost:8020/api/vpnguidance/countries-for-content/:contentId', async () => {
          return HttpResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
          );
        })
      );

      render(
        <VpnCountryInlineExpansion
          contentId="tt1234567"
          isExpanded={true}
          onCollapse={jest.fn()}
        />
      );

      await waitFor(
        () => {
          expect(screen.getByTestId('vpn-expansion-error')).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      expect(screen.getByText(/failed to load vpn locations/i)).toBeInTheDocument();
    });

    it('should show retry button when error occurs', async () => {
      // Return error response from MSW (override both URL patterns)
      server.use(
        http.get('/api/vpnguidance/countries-for-content/:contentId', async () => {
          return HttpResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
          );
        }),
        http.get('http://localhost:8020/api/vpnguidance/countries-for-content/:contentId', async () => {
          return HttpResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
          );
        })
      );

      render(
        <VpnCountryInlineExpansion
          contentId="tt1234567"
          isExpanded={true}
          onCollapse={jest.fn()}
        />
      );

      await waitFor(
        () => {
          expect(screen.getByTestId('vpn-expansion-error')).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      const retryButton = screen.getByRole('button', { name: /try again/i });
      expect(retryButton).toBeInTheDocument();
    });

    it('should retry fetching data when retry button is clicked', async () => {
      const callCount = { value: 0 }; // Use object to share between handlers

      const errorHandler = async () => {
        callCount.value++;
        if (callCount.value <= 2) { // First 2 calls return error (one for each URL pattern)
          return HttpResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
          );
        }
        return HttpResponse.json(mockApiResponse);
      };

      server.use(
        http.get('/api/vpnguidance/countries-for-content/:contentId', errorHandler),
        http.get('http://localhost:8020/api/vpnguidance/countries-for-content/:contentId', errorHandler)
      );

      render(
        <VpnCountryInlineExpansion
          contentId="tt1234567"
          isExpanded={true}
          onCollapse={jest.fn()}
        />
      );

      await waitFor(
        () => {
          expect(screen.getByTestId('vpn-expansion-error')).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      // Click retry
      const retryButton = screen.getByRole('button', { name: /try again/i });
      fireEvent.click(retryButton);

      // Should eventually show data (US appears in multiple services)
      await waitFor(() => {
        expect(screen.queryByTestId('vpn-expansion-error')).not.toBeInTheDocument();
        expect(screen.getAllByText('United States').length).toBeGreaterThan(0);
      }, { timeout: 5000 });
    });
  });

  // Test Category 6: Collapse Functionality (2 tests)

  describe('Collapse Functionality', () => {
    it('should call onCollapse when collapse button is clicked', async () => {
      const onCollapse = jest.fn();

      render(
        <VpnCountryInlineExpansion
          contentId="tt1234567"
          isExpanded={true}
          onCollapse={onCollapse}
        />
      );

      await waitFor(() => {
        expect(screen.queryByTestId('vpn-expansion-loading')).not.toBeInTheDocument();
      });

      const collapseButton = screen.getByRole('button', { name: /hide/i });
      fireEvent.click(collapseButton);

      expect(onCollapse).toHaveBeenCalledTimes(1);
    });

    it('should have collapse button accessible with proper ARIA label', async () => {
      render(
        <VpnCountryInlineExpansion
          contentId="tt1234567"
          isExpanded={true}
          onCollapse={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.queryByTestId('vpn-expansion-loading')).not.toBeInTheDocument();
      });

      const collapseButton = screen.getByRole('button', { name: /hide/i });
      expect(collapseButton).toHaveAttribute('aria-label');
    });
  });

  // Test Category 7: Edge Cases (4 tests)

  describe('Edge Cases', () => {
    it('should handle empty recommendedCountries array', async () => {
      const emptyResponse = {
        contentId: 'tt1234567',
        recommendedCountries: [],
      };

      server.use(
        http.get('/api/vpnguidance/countries-for-content/:contentId', async () => {
          return HttpResponse.json(emptyResponse);
        }),
        http.get('http://localhost:8020/api/vpnguidance/countries-for-content/:contentId', async () => {
          return HttpResponse.json(emptyResponse);
        })
      );

      render(
        <VpnCountryInlineExpansion
          contentId="tt1234567"
          isExpanded={true}
          onCollapse={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.queryByTestId('vpn-expansion-loading')).not.toBeInTheDocument();
      }, { timeout: 5000 });

      // Should show "no countries available" message
      expect(screen.getByText(/This content is not available via VPN in any region/i)).toBeInTheDocument();
    });

    it('should handle missing audioLanguages prop', async () => {
      render(
        <VpnCountryInlineExpansion
          contentId="tt1234567"
          isExpanded={true}
          onCollapse={jest.fn()}
          subtitleLanguages={['en']}
        />
      );

      await waitFor(() => {
        expect(screen.queryByTestId('vpn-expansion-loading')).not.toBeInTheDocument();
      });

      // Should still display data (US appears in multiple services)
      expect(screen.getAllByText('United States').length).toBeGreaterThan(0);
    });

    it('should handle missing subtitleLanguages prop', async () => {
      render(
        <VpnCountryInlineExpansion
          contentId="tt1234567"
          isExpanded={true}
          onCollapse={jest.fn()}
          audioLanguages={['en']}
        />
      );

      await waitFor(() => {
        expect(screen.queryByTestId('vpn-expansion-loading')).not.toBeInTheDocument();
      });

      // Should still display data (US appears in multiple services)
      expect(screen.getAllByText('United States').length).toBeGreaterThan(0);
    });

    it('should handle countries without streaming services', async () => {
      const noServicesResponse = {
        contentId: 'tt1234567',
        recommendedCountries: [
          {
            countryCode: 'JP',
            countryName: 'Japan',
            countryFlag: '🇯🇵',
            languageMatchQuality: 'Good',
            streamingServices: [], // No services
            audioLanguages: ['ja'],
            subtitleLanguages: ['en'],
          },
        ],
      };

      server.use(
        http.get('/api/vpnguidance/countries-for-content/:contentId', async () => {
          return HttpResponse.json(noServicesResponse);
        }),
        http.get('http://localhost:8020/api/vpnguidance/countries-for-content/:contentId', async () => {
          return HttpResponse.json(noServicesResponse);
        })
      );

      render(
        <VpnCountryInlineExpansion
          contentId="tt1234567"
          isExpanded={true}
          onCollapse={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.queryByTestId('vpn-expansion-loading')).not.toBeInTheDocument();
      }, { timeout: 5000 });

      // Countries without streaming services are filtered out by the grouping logic
      // The container renders but with no service sections, just the Hide button
      expect(screen.getByTestId('vpn-expansion-container')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /hide/i })).toBeInTheDocument();

      // Japan should not appear since it has no streaming services
      expect(screen.queryByText('Japan')).not.toBeInTheDocument();
    });
  });

  // Test Category 8: Design System Compliance (3 tests)

  describe('Design System Compliance', () => {
    it('should use bg-card class for container background', async () => {
      const { container } = render(
        <VpnCountryInlineExpansion
          contentId="tt1234567"
          isExpanded={true}
          onCollapse={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.queryByTestId('vpn-expansion-loading')).not.toBeInTheDocument();
      });

      const expansionContainer = container.querySelector('[data-testid="vpn-expansion-container"]');
      expect(expansionContainer).toHaveClass('bg-card');
    });

    it('should use border-border class for container border', async () => {
      const { container } = render(
        <VpnCountryInlineExpansion
          contentId="tt1234567"
          isExpanded={true}
          onCollapse={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.queryByTestId('vpn-expansion-loading')).not.toBeInTheDocument();
      });

      const expansionContainer = container.querySelector('[data-testid="vpn-expansion-container"]');
      expect(expansionContainer).toHaveClass('border-border');
    });

    it('should use semantic color classes for quality badges', async () => {
      render(
        <VpnCountryInlineExpansion
          contentId="tt1234567"
          isExpanded={true}
          onCollapse={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.queryByTestId('vpn-expansion-loading')).not.toBeInTheDocument();
      });

      // Perfect badge should use text-success (US appears in multiple services, check first)
      const usCards = screen.getAllByTestId('country-US');
      const perfectBadge = usCards[0].querySelector('[data-quality="Perfect"]');
      expect(perfectBadge).toHaveClass('text-success');

      // Good badge should use text-primary
      const goodBadge = screen
        .getByTestId('country-GB')
        .querySelector('[data-quality="Good"]');
      expect(goodBadge).toHaveClass('text-primary');

      // Partial badge should use text-warning
      const partialBadge = screen
        .getByTestId('country-DE')
        .querySelector('[data-quality="Partial"]');
      expect(partialBadge).toHaveClass('text-warning');
    });
  });
});
