import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';
import VpnRecommendations from '../VpnRecommendations';
import type { User } from '@/lib/auth';

// Mock the AuthContext
const mockUser: User = {
  id: 'test-user-123',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  isActive: true,
  emailConfirmed: true,
  roles: ['User'],
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

describe('VpnRecommendations', () => {
  // Test data
  const mockRecommendationData = {
    recommendedProviders: [
      {
        id: 'nordvpn',
        name: 'NordVPN',
        description: 'Fast, secure, and reliable VPN service',
        websiteUrl: 'https://nordvpn.com',
        affiliateUrl: 'https://nordvpn.com/offer',
        logoUrl: 'https://example.com/nordvpn.png',
        monthlyPrice: 11.99,
        annualPrice: 59.88,
        hasFreeTrial: true,
        freeTrialDays: 30,
        serverCount: 5500,
        countryCount: 60,
        supportsP2P: true,
        supportsStreaming: true,
        hasKillSwitch: true,
        hasNoLogsPolicy: true,
        maxSimultaneousConnections: 6,
        supportedPlatforms: ['Windows', 'macOS', 'iOS', 'Android'],
        overallRating: 4.7,
        totalRatings: 1250,
        isFeatured: true,
        streamingCompatibilities: [
          {
            streamingServiceId: 'netflix',
            streamingServiceName: 'Netflix',
            status: 'WorksReliably' as const,
            lastTested: '2024-01-15',
          },
          {
            streamingServiceId: 'disney',
            streamingServiceName: 'Disney+',
            status: 'WorksReliably' as const,
            lastTested: '2024-01-15',
          },
        ],
        serverLocations: [],
      },
      {
        id: 'expressvpn',
        name: 'ExpressVPN',
        description: 'Premium VPN with excellent speeds',
        websiteUrl: 'https://expressvpn.com',
        logoUrl: 'https://example.com/expressvpn.png',
        monthlyPrice: 12.95,
        annualPrice: 99.95,
        hasFreeTrial: false,
        serverCount: 3000,
        countryCount: 94,
        supportsP2P: true,
        supportsStreaming: true,
        hasKillSwitch: true,
        hasNoLogsPolicy: true,
        maxSimultaneousConnections: 5,
        supportedPlatforms: ['Windows', 'macOS', 'Linux'],
        overallRating: 4.8,
        totalRatings: 980,
        isFeatured: false,
        streamingCompatibilities: [],
        serverLocations: [],
      },
    ],
    recommendationReason: 'Based on your preference for streaming services',
    recommendationType: 'BestForStreaming',
    confidenceScore: 0.92,
    criteria: {},
  };

  beforeEach(() => {
    // Reset auth context to authenticated state
    mockAuthContext = {
      user: mockUser,
      loading: false,
      signIn: jest.fn(),
      signOut: jest.fn(),
      signUp: jest.fn(),
    };

    // Setup default MSW handler
    server.use(
      http.get('/api/vpnguidance/recommendations', () => {
        return HttpResponse.json(mockRecommendationData);
      })
    );
  });

  // Test Category 1: Authentication (2 tests)

  describe('Authentication', () => {
    it('should show sign-in message when user is not authenticated', () => {
      (mockAuthContext as any).user = null;

      render(<VpnRecommendations />);

      expect(screen.getByText(/Please sign in to view VPN recommendations/i)).toBeInTheDocument();
      expect(screen.queryByText('VPN Recommendations')).not.toBeInTheDocument();
    });

    it('should show recommendations when user is authenticated', async () => {
      render(<VpnRecommendations />);

      // Should show main heading
      expect(screen.getByText('VPN Recommendations')).toBeInTheDocument();

      // Should eventually show provider cards after loading
      await waitFor(() => {
        expect(screen.getByText('NordVPN')).toBeInTheDocument();
      });
    });
  });

  // Test Category 2: Tab Navigation (3 tests)

  describe('Tab Navigation', () => {
    it('should render all 7 recommendation type tabs', async () => {
      render(<VpnRecommendations />);

      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByText('NordVPN')).toBeInTheDocument();
      });

      // Check all tabs are present using role="tab" to avoid confusion with feature badges
      const tabs = [
        'Best Overall',
        'Best Value',
        'Streaming',
        'P2P/Torrenting',
        'Beginners',
        'Security',
        'Speed',
      ];

      tabs.forEach(tabLabel => {
        expect(screen.getByRole('tab', { name: new RegExp(tabLabel, 'i') })).toBeInTheDocument();
      });
    });

    it('should change active tab when clicking different tab', async () => {
      const user = userEvent.setup();
      render(<VpnRecommendations />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('NordVPN')).toBeInTheDocument();
      });

      // Click on "Streaming" tab using role to avoid confusion with feature badges
      const streamingTab = screen.getByRole('tab', { name: /Streaming/i });
      await user.click(streamingTab);

      // Tab should now be active (checked via Radix UI data-state)
      await waitFor(() => {
        expect(streamingTab).toHaveAttribute('data-state', 'active');
      });
    });

    it('should fetch new recommendations when tab changes', async () => {
      const user = userEvent.setup();
      let requestCount = 0;
      server.use(
        http.get('/api/vpnguidance/recommendations', ({ request }) => {
          requestCount++;
          const url = new URL(request.url);
          const type = url.searchParams.get('type');

          return HttpResponse.json({
            ...mockRecommendationData,
            recommendationType: type,
          });
        })
      );

      render(<VpnRecommendations />);

      // Wait for initial fetch to complete
      await waitFor(() => {
        expect(screen.getByText('NordVPN')).toBeInTheDocument();
      });

      expect(requestCount).toBe(1);

      // Click "Best Value" tab using role to be specific
      const valueTab = screen.getByRole('tab', { name: /Best Value/i });
      await user.click(valueTab);

      // Should trigger another fetch - wait for loading state to change
      await waitFor(() => {
        expect(requestCount).toBe(2);
      }, { timeout: 3000 });
    });
  });

  // Test Category 3: API Integration (4 tests)

  describe('API Integration', () => {
    it('should fetch recommendations on mount when user is present', async () => {
      let fetchCalled = false;
      server.use(
        http.get('/api/vpnguidance/recommendations', () => {
          fetchCalled = true;
          return HttpResponse.json(mockRecommendationData);
        })
      );

      render(<VpnRecommendations />);

      await waitFor(() => {
        expect(fetchCalled).toBe(true);
      });
    });

    it('should send correct query parameters in API request', async () => {
      let capturedParams: URLSearchParams | undefined;

      server.use(
        http.get('/api/vpnguidance/recommendations', ({ request }) => {
          const url = new URL(request.url);
          capturedParams = url.searchParams;
          return HttpResponse.json(mockRecommendationData);
        })
      );

      render(<VpnRecommendations />);

      await waitFor(() => {
        expect(capturedParams).toBeDefined();
      });

      // Check default parameters - TypeScript now knows capturedParams is defined
      expect(capturedParams!.get('type')).toBe('BestOverall');
      expect(capturedParams!.get('budget')).toBe('25');
      // URLSearchParams decodes %20 back to space when getting the value
      expect(capturedParams!.get('streamingServices')).toBe('Netflix,Disney Plus');
    });

    it('should handle successful API response and display providers', async () => {
      render(<VpnRecommendations />);

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('NordVPN')).toBeInTheDocument();
      });

      // Check provider details are displayed
      expect(screen.getByText('Fast, secure, and reliable VPN service')).toBeInTheDocument();
      expect(screen.getByText('ExpressVPN')).toBeInTheDocument();
      expect(screen.getByText('Premium VPN with excellent speeds')).toBeInTheDocument();

      // Check recommendation reason is shown
      expect(screen.getByText('Based on your preference for streaming services')).toBeInTheDocument();

      // Check confidence score
      expect(screen.getByText(/Confidence: 92%/i)).toBeInTheDocument();
    });

    it('should handle API error and display error message', async () => {
      server.use(
        http.get('/api/vpnguidance/recommendations', () => {
          return HttpResponse.json(
            { error: 'Service unavailable' },
            { status: 500 }
          );
        })
      );

      render(<VpnRecommendations />);

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText(/Failed to fetch recommendations/i)).toBeInTheDocument();
      });

      // Retry button should be present
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });
  });

  // Test Category 4: Loading State (1 test)

  describe('Loading State', () => {
    it('should show skeleton loading cards while fetching data', async () => {
      // Delay the response to test loading state
      server.use(
        http.get('/api/vpnguidance/recommendations', async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return HttpResponse.json(mockRecommendationData);
        })
      );

      const { container } = render(<VpnRecommendations />);

      // Should show loading skeletons (6 cards) - look for animate-pulse class
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThanOrEqual(6);

      // Wait for actual data
      await waitFor(() => {
        expect(screen.getByText('NordVPN')).toBeInTheDocument();
      });
    });
  });

  // Test Category 5: Error Handling (2 tests)

  describe('Error Handling', () => {
    it('should display error message when API fails', async () => {
      server.use(
        http.get('/api/vpnguidance/recommendations', () => {
          return HttpResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
          );
        })
      );

      render(<VpnRecommendations />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to fetch recommendations/i)).toBeInTheDocument();
      });
    });

    it('should retry fetching when "Try Again" button is clicked', async () => {
      let requestCount = 0;

      server.use(
        http.get('/api/vpnguidance/recommendations', () => {
          requestCount++;
          if (requestCount === 1) {
            return HttpResponse.json({ error: 'Error' }, { status: 500 });
          }
          return HttpResponse.json(mockRecommendationData);
        })
      );

      render(<VpnRecommendations />);

      // Wait for error
      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });

      // Click retry
      fireEvent.click(screen.getByText('Try Again'));

      // Should show success data
      await waitFor(() => {
        expect(screen.getByText('NordVPN')).toBeInTheDocument();
      });
    });
  });

  // Test Category 6: Provider Cards (4 tests)

  describe('Provider Cards', () => {
    it('should render provider card with all details', async () => {
      render(<VpnRecommendations />);

      await waitFor(() => {
        expect(screen.getByText('NordVPN')).toBeInTheDocument();
      });

      // Check rating
      expect(screen.getByText('4.7')).toBeInTheDocument();
      expect(screen.getByText('(1250)')).toBeInTheDocument();

      // Check server info
      expect(screen.getByText(/5,500 servers in 60 countries/i)).toBeInTheDocument();

      // Check devices
      expect(screen.getByText(/6 simultaneous/i)).toBeInTheDocument();
    });

    it('should show "Featured" badge when provider is featured', async () => {
      render(<VpnRecommendations />);

      await waitFor(() => {
        expect(screen.getByText('NordVPN')).toBeInTheDocument();
      });

      // NordVPN is featured, ExpressVPN is not
      expect(screen.getByText('Featured')).toBeInTheDocument();
    });

    it('should display pricing correctly with annual discount', async () => {
      render(<VpnRecommendations />);

      await waitFor(() => {
        expect(screen.getByText('NordVPN')).toBeInTheDocument();
      });

      // NordVPN annual is $4.99/mo (59.88/12), monthly is $11.99
      // Should show both when annual is cheaper
      expect(screen.getByText(/\$4.99\/mo \(annual\) • \$11.99\/mo \(monthly\)/i)).toBeInTheDocument();
    });

    it('should show streaming effectiveness with progress bar', async () => {
      render(<VpnRecommendations />);

      await waitFor(() => {
        expect(screen.getByText('NordVPN')).toBeInTheDocument();
      });

      // Check streaming effectiveness section
      expect(screen.getByText('Streaming Effectiveness')).toBeInTheDocument();

      // NordVPN has 2/2 working services = 100%
      // Use getAllByText since "100%" might appear multiple times if there are multiple providers
      const percentages = screen.queryAllByText('100%');
      expect(percentages.length).toBeGreaterThan(0);

      // Check streaming service badges
      expect(screen.getByText(/Netflix: Works Reliably/i)).toBeInTheDocument();
      expect(screen.getByText(/Disney\+: Works Reliably/i)).toBeInTheDocument();
    });
  });

  // Test Category 7: Helper Functions (tested through rendering)

  describe('Helper Functions', () => {
    it('should calculate effectiveness score correctly', async () => {
      render(<VpnRecommendations />);

      await waitFor(() => {
        expect(screen.getByText('NordVPN')).toBeInTheDocument();
      });

      // NordVPN: 2 WorksReliably out of 2 total = 100%
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('should format price to show annual savings when applicable', async () => {
      render(<VpnRecommendations />);

      await waitFor(() => {
        expect(screen.getByText('NordVPN')).toBeInTheDocument();
      });

      // Annual price ($59.88/12 = $4.99/mo) is less than monthly ($11.99)
      // Should show both prices
      expect(screen.getByText(/\$4.99\/mo \(annual\)/i)).toBeInTheDocument();
    });

    it('should display security features as badges', async () => {
      render(<VpnRecommendations />);

      await waitFor(() => {
        expect(screen.getByText('NordVPN')).toBeInTheDocument();
      });

      // Check security feature badges - use getAllByText since both providers have these features
      expect(screen.getAllByText('Kill Switch').length).toBeGreaterThan(0);
      expect(screen.getAllByText('No Logs').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Streaming').length).toBeGreaterThan(0);
      expect(screen.getAllByText('P2P Friendly').length).toBeGreaterThan(0);
    });
  });
});
