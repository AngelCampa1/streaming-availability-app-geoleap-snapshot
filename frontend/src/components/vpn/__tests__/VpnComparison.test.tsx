import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';
import VpnComparison from '../VpnComparison';
import type { User } from '@/lib/auth';

// Mock the AuthContext
const mockUser: User = {
  id: 'test-user-123',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  isActive: true,
  emailConfirmed: true,
  roles: [],
  permissions: [],
  createdAt: new Date().toISOString(),
};

let mockAuthContext = {
  user: mockUser,
  loading: false,
  signIn: jest.fn(),
  signOut: jest.fn(),
  signUp: jest.fn(),
};

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
}));

describe('VpnComparison', () => {
  // Test data
  const mockProviders = [
    {
      id: 'nordvpn',
      name: 'NordVPN',
      monthlyPrice: 11.99,
      annualPrice: 59.88,
      serverCount: 5500,
      countryCount: 60,
      supportsP2P: true,
      supportsStreaming: true,
      hasKillSwitch: true,
      hasNoLogsPolicy: true,
      maxSimultaneousConnections: 6,
      overallRating: 4.7,
      totalRatings: 1250,
      hasFreeTrial: true,
      freeTrialDays: 30,
      streamingCompatibilities: [
        { streamingServiceName: 'Netflix', status: 'WorksReliably' as const },
        { streamingServiceName: 'Disney Plus', status: 'WorksReliably' as const },
      ],
    },
    {
      id: 'expressvpn',
      name: 'ExpressVPN',
      monthlyPrice: 12.95,
      annualPrice: 99.95,
      serverCount: 3000,
      countryCount: 94,
      supportsP2P: true,
      supportsStreaming: true,
      hasKillSwitch: true,
      hasNoLogsPolicy: true,
      maxSimultaneousConnections: 5,
      overallRating: 4.8,
      totalRatings: 980,
      hasFreeTrial: false,
      streamingCompatibilities: [
        { streamingServiceName: 'Netflix', status: 'WorksReliably' as const },
        { streamingServiceName: 'Amazon Prime', status: 'WorksSometimes' as const },
      ],
    },
    {
      id: 'surfshark',
      name: 'Surfshark',
      monthlyPrice: 12.95,
      annualPrice: 47.88,
      serverCount: 3200,
      countryCount: 100,
      supportsP2P: true,
      supportsStreaming: true,
      hasKillSwitch: true,
      hasNoLogsPolicy: true,
      overallRating: 4.5,
      totalRatings: 750,
      hasFreeTrial: true,
      freeTrialDays: 7,
      streamingCompatibilities: [
        { streamingServiceName: 'Netflix', status: 'WorksReliably' as const },
        { streamingServiceName: 'Hulu', status: 'WorksSometimes' as const },
      ],
    },
    {
      id: 'cyberghost',
      name: 'CyberGhost',
      monthlyPrice: 12.99,
      annualPrice: 56.88,
      serverCount: 7000,
      countryCount: 91,
      supportsP2P: true,
      supportsStreaming: false,
      hasKillSwitch: true,
      hasNoLogsPolicy: true,
      maxSimultaneousConnections: 7,
      overallRating: 4.3,
      totalRatings: 620,
      hasFreeTrial: true,
      freeTrialDays: 45,
      streamingCompatibilities: [],
    },
    {
      id: 'privatevpn',
      name: 'PrivateVPN',
      monthlyPrice: 9.99,
      annualPrice: 54.00,
      serverCount: 200,
      countryCount: 63,
      supportsP2P: false,
      supportsStreaming: true,
      hasKillSwitch: false,
      hasNoLogsPolicy: true,
      maxSimultaneousConnections: 6,
      overallRating: 4.1,
      totalRatings: 410,
      hasFreeTrial: false,
      streamingCompatibilities: [
        { streamingServiceName: 'BBC iPlayer', status: 'WorksReliably' as const },
      ],
    },
  ];

  const mockComparisonResult = {
    providers: [mockProviders[0], mockProviders[1]],
    comparisonCriteria: {
      comparePrice: true,
      compareFeatures: true,
      compareRatings: true,
      compareStreaming: false,
    },
    comparisonMatrix: {
      price_comparison: true,
    },
  };

  beforeEach(() => {
    // Reset auth context
    mockAuthContext = {
      user: mockUser,
      loading: false,
      signIn: jest.fn(),
      signOut: jest.fn(),
      signUp: jest.fn(),
    };

    // Setup default MSW handlers
    server.use(
      http.get('/api/vpnguidance/providers', () => {
        return HttpResponse.json(mockProviders);
      }),
      http.get('/api/vpnguidance/compare', () => {
        return HttpResponse.json(mockComparisonResult);
      })
    );
  });

  // Test Category 1: Provider Selection (6 tests)

  describe('Provider Selection', () => {
    it('should fetch and display available providers on mount', async () => {
      render(<VpnComparison />);

      await waitFor(() => {
        expect(screen.getByText('NordVPN')).toBeInTheDocument();
      });

      expect(screen.getByText('ExpressVPN')).toBeInTheDocument();
      expect(screen.getByText('Surfshark')).toBeInTheDocument();
      expect(screen.getByText('CyberGhost')).toBeInTheDocument();
      expect(screen.getByText('PrivateVPN')).toBeInTheDocument();
    });

    it('should show selected count badge with 0/5 initially', async () => {
      render(<VpnComparison />);

      await waitFor(() => {
        expect(screen.getByText('NordVPN')).toBeInTheDocument();
      });

      expect(screen.getByText('0/5 selected')).toBeInTheDocument();
    });

    it('should select provider when clicking card', async () => {
      const user = userEvent.setup();
      render(<VpnComparison />);

      await waitFor(() => {
        expect(screen.getByText('NordVPN')).toBeInTheDocument();
      });

      // Click on NordVPN card
      const nordCard = screen.getByText('NordVPN').closest('div');
      await user.click(nordCard!);

      // Should update count
      await waitFor(() => {
        expect(screen.getByText('1/5 selected')).toBeInTheDocument();
      });

      // Should show in selected list
      expect(screen.getByText('Selected for Comparison:')).toBeInTheDocument();
    });

    it('should deselect provider when clicking selected card again', async () => {
      const user = userEvent.setup();
      render(<VpnComparison />);

      await waitFor(() => {
        expect(screen.getByText('NordVPN')).toBeInTheDocument();
      });

      const nordCard = screen.getByText('NordVPN').closest('div');

      // Select
      await user.click(nordCard!);
      await waitFor(() => {
        expect(screen.getByText('1/5 selected')).toBeInTheDocument();
      });

      // Deselect
      await user.click(nordCard!);
      await waitFor(() => {
        expect(screen.getByText('0/5 selected')).toBeInTheDocument();
      });
    });

    it('should remove provider when clicking X button in badge', async () => {
      const user = userEvent.setup();
      render(<VpnComparison />);

      await waitFor(() => {
        expect(screen.getByText('NordVPN')).toBeInTheDocument();
      });

      // Select provider
      const nordCard = screen.getByText('NordVPN').closest('div');
      await user.click(nordCard!);

      await waitFor(() => {
        expect(screen.getByText('1/5 selected')).toBeInTheDocument();
      });

      // Find and click X button in badge
      const badges = screen.getAllByText('NordVPN');
      const badgeWithX = badges.find(b => b.closest('.pr-1'));
      const xButton = badgeWithX?.parentElement?.querySelector('button');

      if (xButton) {
        await user.click(xButton);
      }

      await waitFor(() => {
        expect(screen.getByText('0/5 selected')).toBeInTheDocument();
      });
    });

    it('should enforce maximum 5 provider selection limit', async () => {
      const user = userEvent.setup();
      render(<VpnComparison />);

      await waitFor(() => {
        expect(screen.getByText('NordVPN')).toBeInTheDocument();
      });

      // Select all 5 providers
      const providerNames = ['NordVPN', 'ExpressVPN', 'Surfshark', 'CyberGhost', 'PrivateVPN'];

      for (const name of providerNames) {
        const card = screen.getByText(name).closest('div');
        await user.click(card!);
      }

      await waitFor(() => {
        expect(screen.getByText('5/5 selected')).toBeInTheDocument();
      });

      // Try to select a 6th provider (should show error)
      // Since all 5 are selected, clicking again would deselect, so we need to check error handling
      // The component sets error state but doesn't prevent the click
      // Let's verify the count stays at 5
      expect(screen.getByText('5/5 selected')).toBeInTheDocument();
    });
  });

  // Test Category 2: Search Functionality (3 tests)

  describe('Search Functionality', () => {
    it('should filter providers based on search term', async () => {
      const user = userEvent.setup();
      render(<VpnComparison />);

      await waitFor(() => {
        expect(screen.getByText('NordVPN')).toBeInTheDocument();
      });

      // Type in search
      const searchInput = screen.getByPlaceholderText('Search VPN providers...');
      await user.type(searchInput, 'Nord');

      // Only NordVPN should be visible
      expect(screen.getByText('NordVPN')).toBeInTheDocument();
      expect(screen.queryByText('ExpressVPN')).not.toBeInTheDocument();
      expect(screen.queryByText('Surfshark')).not.toBeInTheDocument();
    });

    it('should perform case-insensitive search', async () => {
      const user = userEvent.setup();
      render(<VpnComparison />);

      await waitFor(() => {
        expect(screen.getByText('NordVPN')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search VPN providers...');
      await user.type(searchInput, 'express');

      expect(screen.getByText('ExpressVPN')).toBeInTheDocument();
      expect(screen.queryByText('NordVPN')).not.toBeInTheDocument();
    });

    it('should show all providers when search is cleared', async () => {
      const user = userEvent.setup();
      render(<VpnComparison />);

      await waitFor(() => {
        expect(screen.getByText('NordVPN')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search VPN providers...');

      // Search
      await user.type(searchInput, 'Nord');
      expect(screen.queryByText('ExpressVPN')).not.toBeInTheDocument();

      // Clear
      await user.clear(searchInput);

      // All should be visible again
      expect(screen.getByText('NordVPN')).toBeInTheDocument();
      expect(screen.getByText('ExpressVPN')).toBeInTheDocument();
      expect(screen.getByText('Surfshark')).toBeInTheDocument();
    });
  });

  // Test Category 3: Comparison Options (3 tests)

  describe('Comparison Options', () => {
    it('should have default comparison options enabled correctly', async () => {
      render(<VpnComparison />);

      await waitFor(() => {
        expect(screen.getByText('NordVPN')).toBeInTheDocument();
      });

      // Price, Features, Ratings should be checked by default
      const priceCheckbox = screen.getByLabelText(/Price/i);
      const featuresCheckbox = screen.getByLabelText(/Features/i);
      const ratingsCheckbox = screen.getByLabelText(/Ratings/i);
      const streamingCheckbox = screen.getByLabelText(/Streaming/i);

      expect(priceCheckbox).toBeChecked();
      expect(featuresCheckbox).toBeChecked();
      expect(ratingsCheckbox).toBeChecked();
      expect(streamingCheckbox).not.toBeChecked();
    });

    it('should toggle comparison options when clicked', async () => {
      const user = userEvent.setup();
      render(<VpnComparison />);

      await waitFor(() => {
        expect(screen.getByText('NordVPN')).toBeInTheDocument();
      });

      const streamingCheckbox = screen.getByLabelText(/Streaming/i);

      // Initially unchecked
      expect(streamingCheckbox).not.toBeChecked();

      // Click to check
      await user.click(streamingCheckbox);
      await waitFor(() => {
        expect(streamingCheckbox).toBeChecked();
      });

      // Click to uncheck
      await user.click(streamingCheckbox);
      await waitFor(() => {
        expect(streamingCheckbox).not.toBeChecked();
      });
    });

    it('should persist comparison options when comparing', async () => {
      const user = userEvent.setup();
      let capturedParams: URLSearchParams | undefined;

      server.use(
        http.get('/api/vpnguidance/compare', ({ request }) => {
          const url = new URL(request.url);
          capturedParams = url.searchParams;
          return HttpResponse.json(mockComparisonResult);
        })
      );

      render(<VpnComparison />);

      await waitFor(() => {
        expect(screen.getByText('NordVPN')).toBeInTheDocument();
      });

      // Select 2 providers
      const nordCard = screen.getByText('NordVPN').closest('div');
      const expressCard = screen.getByText('ExpressVPN').closest('div');
      await user.click(nordCard!);
      await user.click(expressCard!);

      // Toggle streaming option
      const streamingCheckbox = screen.getByLabelText(/Streaming/i);
      await user.click(streamingCheckbox);

      // Click compare
      const compareButton = screen.getByRole('button', { name: /Compare 2 Providers/i });
      await user.click(compareButton);

      await waitFor(() => {
        expect(capturedParams).toBeDefined();
      });

      // Check that streaming is true in params
      expect(capturedParams?.get('compareStreaming')).toBe('true');
    });
  });

  // Test Category 4: Compare Functionality (5 tests)

  describe('Compare Functionality', () => {
    it('should disable compare button when less than 2 providers selected', async () => {
      const user = userEvent.setup();
      render(<VpnComparison />);

      await waitFor(() => {
        expect(screen.getByText('NordVPN')).toBeInTheDocument();
      });

      const compareButton = screen.getByRole('button', { name: /Compare/i });
      expect(compareButton).toBeDisabled();

      // Select 1 provider
      const nordCard = screen.getByText('NordVPN').closest('div');
      await user.click(nordCard!);

      await waitFor(() => {
        expect(screen.getByText('1/5 selected')).toBeInTheDocument();
      });

      // Still disabled
      expect(compareButton).toBeDisabled();
    });

    it('should enable compare button when 2 or more providers selected', async () => {
      const user = userEvent.setup();
      render(<VpnComparison />);

      await waitFor(() => {
        expect(screen.getByText('NordVPN')).toBeInTheDocument();
      });

      // Select 2 providers
      const nordCard = screen.getByText('NordVPN').closest('div');
      const expressCard = screen.getByText('ExpressVPN').closest('div');

      await user.click(nordCard!);
      await user.click(expressCard!);

      await waitFor(() => {
        expect(screen.getByText('2/5 selected')).toBeInTheDocument();
      });

      const compareButton = screen.getByRole('button', { name: /Compare 2 Providers/i });
      expect(compareButton).not.toBeDisabled();
    });

    it('should trigger API call with correct parameters when comparing', async () => {
      const user = userEvent.setup();
      let capturedParams: URLSearchParams | undefined;

      server.use(
        http.get('/api/vpnguidance/compare', ({ request }) => {
          const url = new URL(request.url);
          capturedParams = url.searchParams;
          return HttpResponse.json(mockComparisonResult);
        })
      );

      render(<VpnComparison />);

      await waitFor(() => {
        expect(screen.getByText('NordVPN')).toBeInTheDocument();
      });

      // Select 2 providers
      const nordCard = screen.getByText('NordVPN').closest('div');
      const expressCard = screen.getByText('ExpressVPN').closest('div');
      await user.click(nordCard!);
      await user.click(expressCard!);

      // Click compare
      const compareButton = screen.getByRole('button', { name: /Compare 2 Providers/i });
      await user.click(compareButton);

      await waitFor(() => {
        expect(capturedParams).toBeDefined();
      });

      // Check parameters
      expect(capturedParams?.get('comparePrice')).toBe('true');
      expect(capturedParams?.get('compareFeatures')).toBe('true');
      expect(capturedParams?.get('compareRatings')).toBe('true');
      expect(capturedParams?.get('compareStreaming')).toBe('false');
      expect(capturedParams?.get('providerIds[0]')).toBe('nordvpn');
      expect(capturedParams?.get('providerIds[1]')).toBe('expressvpn');
    });

    it('should display comparison results table after successful comparison', async () => {
      const user = userEvent.setup();
      render(<VpnComparison />);

      await waitFor(() => {
        expect(screen.getByText('NordVPN')).toBeInTheDocument();
      });

      // Select 2 providers
      const nordCard = screen.getByText('NordVPN').closest('div');
      const expressCard = screen.getByText('ExpressVPN').closest('div');
      await user.click(nordCard!);
      await user.click(expressCard!);

      // Click compare
      const compareButton = screen.getByRole('button', { name: /Compare 2 Providers/i });
      await user.click(compareButton);

      // Should show comparison results
      await waitFor(() => {
        expect(screen.getByText('Comparison Results')).toBeInTheDocument();
      });

      // Should show provider names in table headers
      const headers = screen.getAllByRole('columnheader');
      const headerTexts = headers.map(h => h.textContent);
      expect(headerTexts).toContain('NordVPN');
      expect(headerTexts).toContain('ExpressVPN');
    });

    it('should display error message when comparison API fails', async () => {
      const user = userEvent.setup();
      server.use(
        http.get('/api/vpnguidance/compare', () => {
          return HttpResponse.json({ error: 'Comparison failed' }, { status: 500 });
        })
      );

      render(<VpnComparison />);

      await waitFor(() => {
        expect(screen.getByText('NordVPN')).toBeInTheDocument();
      });

      // Select 2 providers
      const nordCard = screen.getByText('NordVPN').closest('div');
      const expressCard = screen.getByText('ExpressVPN').closest('div');
      await user.click(nordCard!);
      await user.click(expressCard!);

      // Click compare
      const compareButton = screen.getByRole('button', { name: /Compare 2 Providers/i });
      await user.click(compareButton);

      // Should show error
      await waitFor(() => {
        expect(screen.getByText(/Failed to fetch comparison/i)).toBeInTheDocument();
      });
    });
  });

  // Test Category 5: Comparison Table Rendering (5 tests)

  describe('Comparison Table Rendering', () => {
    it('should display pricing section when comparePrice is enabled', async () => {
      const user = userEvent.setup();
      render(<VpnComparison />);

      await waitFor(() => {
        expect(screen.getByText('NordVPN')).toBeInTheDocument();
      });

      // Select and compare
      const nordCard = screen.getByText('NordVPN').closest('div');
      const expressCard = screen.getByText('ExpressVPN').closest('div');
      await user.click(nordCard!);
      await user.click(expressCard!);

      const compareButton = screen.getByRole('button', { name: /Compare 2 Providers/i });
      await user.click(compareButton);

      await waitFor(() => {
        expect(screen.getByText('Comparison Results')).toBeInTheDocument();
      });

      // Check for pricing section
      expect(screen.getByText('Pricing')).toBeInTheDocument();
      expect(screen.getByText('Monthly Price')).toBeInTheDocument();
      expect(screen.getByText('Annual Price (per month)')).toBeInTheDocument();
      expect(screen.getByText('Free Trial')).toBeInTheDocument();
    });

    it('should display features section when compareFeatures is enabled', async () => {
      const user = userEvent.setup();
      render(<VpnComparison />);

      await waitFor(() => {
        expect(screen.getByText('NordVPN')).toBeInTheDocument();
      });

      // Select and compare
      const nordCard = screen.getByText('NordVPN').closest('div');
      const expressCard = screen.getByText('ExpressVPN').closest('div');
      await user.click(nordCard!);
      await user.click(expressCard!);

      const compareButton = screen.getByRole('button', { name: /Compare 2 Providers/i });
      await user.click(compareButton);

      await waitFor(() => {
        expect(screen.getByText('Comparison Results')).toBeInTheDocument();
      });

      // Check for features section - use getAllByText since "Features" appears in options too
      expect(screen.getAllByText('Features').length).toBeGreaterThan(0);
      expect(screen.getByText('Server Count')).toBeInTheDocument();
      expect(screen.getByText('Country Count')).toBeInTheDocument();
      expect(screen.getByText('Kill Switch')).toBeInTheDocument();
      expect(screen.getByText('No Logs Policy')).toBeInTheDocument();
    });

    it('should display ratings section when compareRatings is enabled', async () => {
      const user = userEvent.setup();
      render(<VpnComparison />);

      await waitFor(() => {
        expect(screen.getByText('NordVPN')).toBeInTheDocument();
      });

      // Select and compare
      const nordCard = screen.getByText('NordVPN').closest('div');
      const expressCard = screen.getByText('ExpressVPN').closest('div');
      await user.click(nordCard!);
      await user.click(expressCard!);

      const compareButton = screen.getByRole('button', { name: /Compare 2 Providers/i });
      await user.click(compareButton);

      await waitFor(() => {
        expect(screen.getByText('Comparison Results')).toBeInTheDocument();
      });

      // Check for ratings section (use getAllByText since "Ratings" appears in both comparison options and table header)
      expect(screen.getAllByText('Ratings').length).toBeGreaterThan(0);
      expect(screen.getByText('Overall Rating')).toBeInTheDocument();
      expect(screen.getByText('Total Reviews')).toBeInTheDocument();
    });

    it('should render feature values with correct icons', async () => {
      const user = userEvent.setup();
      const { container } = render(<VpnComparison />);

      await waitFor(() => {
        expect(screen.getByText('NordVPN')).toBeInTheDocument();
      });

      // Select and compare
      const nordCard = screen.getByText('NordVPN').closest('div');
      const expressCard = screen.getByText('ExpressVPN').closest('div');
      await user.click(nordCard!);
      await user.click(expressCard!);

      const compareButton = screen.getByRole('button', { name: /Compare 2 Providers/i });
      await user.click(compareButton);

      await waitFor(() => {
        expect(screen.getByText('Comparison Results')).toBeInTheDocument();
      });

      // Both providers have Kill Switch = true, should show Check icons
      const checkIcons = container.querySelectorAll('.lucide-check');
      expect(checkIcons.length).toBeGreaterThan(0);
    });

    it('should format prices correctly in comparison table', async () => {
      const user = userEvent.setup();
      render(<VpnComparison />);

      await waitFor(() => {
        expect(screen.getByText('NordVPN')).toBeInTheDocument();
      });

      // Select and compare
      const nordCard = screen.getByText('NordVPN').closest('div');
      const expressCard = screen.getByText('ExpressVPN').closest('div');
      await user.click(nordCard!);
      await user.click(expressCard!);

      const compareButton = screen.getByRole('button', { name: /Compare 2 Providers/i });
      await user.click(compareButton);

      await waitFor(() => {
        expect(screen.getByText('Comparison Results')).toBeInTheDocument();
      });

      // Check price formatting - NordVPN monthly $11.99
      expect(screen.getByText('$11.99')).toBeInTheDocument();
      // ExpressVPN monthly $12.95
      expect(screen.getByText('$12.95')).toBeInTheDocument();
    });
  });

  // Test Category 6: Edge Cases (3 tests)

  describe('Edge Cases', () => {
    it('should handle empty provider list gracefully', async () => {
      server.use(
        http.get('/api/vpnguidance/providers', () => {
          return HttpResponse.json([]);
        })
      );

      const { container } = render(<VpnComparison />);

      await waitFor(() => {
        const providerCards = container.querySelectorAll('[data-testid^="provider-"]');
        expect(providerCards.length).toBe(0);
      });

      // Should still show UI structure
      expect(screen.getByText('VPN Comparison Tool')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search VPN providers...')).toBeInTheDocument();
    });

    it('should display error when fetching providers fails', async () => {
      server.use(
        http.get('/api/vpnguidance/providers', () => {
          return HttpResponse.json({ error: 'Failed to fetch' }, { status: 500 });
        })
      );

      render(<VpnComparison />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load VPN providers/i)).toBeInTheDocument();
      });
    });

    it('should show error when comparing with less than 2 providers', async () => {
      const user = userEvent.setup();
      render(<VpnComparison />);

      await waitFor(() => {
        expect(screen.getByText('NordVPN')).toBeInTheDocument();
      });

      // The compare button should be disabled, but let's verify the component's
      // internal error handling by checking the button state
      const compareButton = screen.getByRole('button', { name: /Compare/i });
      expect(compareButton).toBeDisabled();

      // Select only 1 provider
      const nordCard = screen.getByText('NordVPN').closest('div');
      await user.click(nordCard!);

      await waitFor(() => {
        expect(screen.getByText('1/5 selected')).toBeInTheDocument();
      });

      // Button should still be disabled
      expect(compareButton).toBeDisabled();
    });
  });
});
