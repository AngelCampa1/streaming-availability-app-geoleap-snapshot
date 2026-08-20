import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';
import MobileVpnSelection from '../MobileVpnSelection';
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

describe('MobileVpnSelection', () => {
  // Test data
  const mockProviders = [
    {
      id: 'nordvpn',
      name: 'NordVPN',
      description: 'Fast, secure, and reliable VPN service with excellent streaming support',
      monthlyPrice: 11.99,
      annualPrice: 59.88,
      hasFreeTrial: true,
      freeTrialDays: 30,
      overallRating: 4.7,
      totalRatings: 1250,
      isFeatured: true,
      logoUrl: 'https://example.com/nordvpn.png',
      affiliateUrl: 'https://nordvpn.com/offer',
      websiteUrl: 'https://nordvpn.com',
      hasKillSwitch: true,
      hasNoLogsPolicy: true,
      supportsStreaming: true,
      supportsP2P: true,
      serverCount: 5500,
      countryCount: 60,
    },
    {
      id: 'expressvpn',
      name: 'ExpressVPN',
      description: 'Premium VPN with excellent speeds and security features',
      monthlyPrice: 12.95,
      annualPrice: 99.95,
      hasFreeTrial: false,
      overallRating: 4.8,
      totalRatings: 980,
      isFeatured: false,
      websiteUrl: 'https://expressvpn.com',
      hasKillSwitch: true,
      hasNoLogsPolicy: true,
      supportsStreaming: true,
      supportsP2P: true,
      serverCount: 3000,
      countryCount: 94,
    },
  ];

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
      http.get('/api/vpnguidance/providers', () => {
        return HttpResponse.json(mockProviders);
      })
    );
  });

  // Test Category 1: Category Tabs (5 tests)

  describe('Category Tabs', () => {
    it('should render all 5 category tabs with correct labels', async () => {
      render(<MobileVpnSelection />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('NordVPN')).toBeInTheDocument();
      });

      // Check all category tabs are present
      const categoryLabels = ['Featured', 'Streaming', 'Security', 'Best Value', 'Fastest'];

      categoryLabels.forEach(label => {
        expect(screen.getByRole('tab', { name: new RegExp(label, 'i') })).toBeInTheDocument();
      });
    });

    it('should default to featured category on mount', async () => {
      let capturedParams: URLSearchParams | null = null;

      server.use(
        http.get('/api/vpnguidance/providers', ({ request }) => {
          const url = new URL(request.url);
          capturedParams = url.searchParams;
          return HttpResponse.json(mockProviders);
        })
      );

      render(<MobileVpnSelection />);

      await waitFor(() => {
        expect(capturedParams).not.toBeNull();
      });

      // Should fetch with featured=true
      expect(capturedParams!.get('featured')).toBe('true');

      // Featured tab should be active
      const featuredTab = screen.getByRole('tab', { name: /Featured/i });
      expect(featuredTab).toHaveAttribute('data-state', 'active');
    });

    it('should switch category when clicking different tab', async () => {
      const user = userEvent.setup();
      render(<MobileVpnSelection />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('NordVPN')).toBeInTheDocument();
      });

      // Click on "Streaming" tab
      const streamingTab = screen.getByRole('tab', { name: /Streaming/i });
      await user.click(streamingTab);

      // Tab should now be active
      await waitFor(() => {
        expect(streamingTab).toHaveAttribute('data-state', 'active');
      });
    });

    it('should trigger API fetch when category changes', async () => {
      const user = userEvent.setup();
      let requestCount = 0;

      server.use(
        http.get('/api/vpnguidance/providers', () => {
          requestCount++;
          return HttpResponse.json(mockProviders);
        })
      );

      render(<MobileVpnSelection />);

      // Wait for initial fetch (featured)
      await waitFor(() => {
        expect(screen.getByText('NordVPN')).toBeInTheDocument();
      });
      expect(requestCount).toBe(1);

      // Click on "Streaming" tab
      const streamingTab = screen.getByRole('tab', { name: /Streaming/i });
      await user.click(streamingTab);

      // Should trigger second fetch
      await waitFor(() => {
        expect(requestCount).toBe(2);
      }, { timeout: 3000 });
    });

    it('should send correct query parameters for each category', async () => {
      const user = userEvent.setup();
      const capturedParams: Map<string, URLSearchParams> = new Map();

      server.use(
        http.get('/api/vpnguidance/providers', ({ request }) => {
          const url = new URL(request.url);
          const category = url.searchParams.get('featured') ? 'featured' :
                          url.searchParams.get('supportsStreaming') ? 'streaming' :
                          url.searchParams.get('maxPrice') ? 'value' : 'other';
          capturedParams.set(category, url.searchParams);
          return HttpResponse.json(mockProviders);
        })
      );

      render(<MobileVpnSelection />);

      // Wait for featured category load
      await waitFor(() => {
        expect(screen.getByText('NordVPN')).toBeInTheDocument();
      });

      // Test streaming category
      await user.click(screen.getByRole('tab', { name: /Streaming/i }));
      await waitFor(() => {
        expect(capturedParams.has('streaming')).toBe(true);
      });
      expect(capturedParams.get('streaming')?.get('supportsStreaming')).toBe('true');

      // Test value category
      await user.click(screen.getByRole('tab', { name: /Best Value/i }));
      await waitFor(() => {
        expect(capturedParams.has('value')).toBe(true);
      });
      expect(capturedParams.get('value')?.get('maxPrice')).toBe('15');
    });
  });

  // Test Category 2: Provider Cards (6 tests)

  describe('Provider Cards', () => {
    it('should render provider card with all details', async () => {
      render(<MobileVpnSelection />);

      await waitFor(() => {
        expect(screen.getByText('NordVPN')).toBeInTheDocument();
      });

      // Check provider name
      expect(screen.getByText('NordVPN')).toBeInTheDocument();

      // Check rating
      expect(screen.getByText('4.7')).toBeInTheDocument();
      expect(screen.getByText('(1250)')).toBeInTheDocument();

      // Check description
      expect(screen.getByText(/Fast, secure, and reliable VPN service/i)).toBeInTheDocument();
    });

    it('should display featured badge when isFeatured is true', async () => {
      render(<MobileVpnSelection />);

      await waitFor(() => {
        expect(screen.getByText('NordVPN')).toBeInTheDocument();
      });

      // NordVPN is featured, ExpressVPN is not
      // "Featured" appears in both category tab and provider badge, so check length > 1
      const featuredBadges = screen.getAllByText('Featured');
      expect(featuredBadges.length).toBeGreaterThan(1);
    });

    it('should display server and country stats', async () => {
      render(<MobileVpnSelection />);

      await waitFor(() => {
        expect(screen.getByText('NordVPN')).toBeInTheDocument();
      });

      // Check server count (formatted with commas)
      expect(screen.getByText('5,500')).toBeInTheDocument();

      // Check country count
      expect(screen.getByText('60')).toBeInTheDocument();
    });

    it('should display feature badges correctly', async () => {
      render(<MobileVpnSelection />);

      await waitFor(() => {
        expect(screen.getByText('NordVPN')).toBeInTheDocument();
      });

      // Both providers have these features, so use getAllByText
      expect(screen.getAllByText('Kill Switch').length).toBeGreaterThan(0);
      expect(screen.getAllByText('No Logs').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Streaming').length).toBeGreaterThan(0);
      expect(screen.getAllByText('P2P').length).toBeGreaterThan(0);
    });

    it('should display pricing with savings badge when annual is cheaper', async () => {
      render(<MobileVpnSelection />);

      await waitFor(() => {
        expect(screen.getByText('NordVPN')).toBeInTheDocument();
      });

      // NordVPN annual: $59.88/12 = $4.99/mo, monthly: $11.99
      // Should show $4.99 with savings badge
      expect(screen.getByText('$4.99')).toBeInTheDocument();

      // "/annual" appears on multiple providers, use getAllByText
      expect(screen.getAllByText('/annual').length).toBeGreaterThan(0);

      // Should show savings percentage (appears on both providers)
      expect(screen.getAllByText(/Save \d+%/i).length).toBeGreaterThan(0);
    });

    it('should display free trial info when hasFreeTrial is true', async () => {
      render(<MobileVpnSelection />);

      await waitFor(() => {
        expect(screen.getByText('NordVPN')).toBeInTheDocument();
      });

      // NordVPN has free trial
      expect(screen.getByText('Free Trial')).toBeInTheDocument();
      expect(screen.getByText('30 days')).toBeInTheDocument();
    });
  });

  // Test Category 3: API Integration (4 tests)

  describe('API Integration', () => {
    it('should fetch providers on mount with featured category', async () => {
      let fetchCalled = false;

      server.use(
        http.get('/api/vpnguidance/providers', ({ request }) => {
          const url = new URL(request.url);
          if (url.searchParams.get('featured') === 'true') {
            fetchCalled = true;
          }
          return HttpResponse.json(mockProviders);
        })
      );

      render(<MobileVpnSelection />);

      await waitFor(() => {
        expect(fetchCalled).toBe(true);
      });
    });

    it('should send correct query parameters based on category', async () => {
      let capturedParams: URLSearchParams | null = null;

      server.use(
        http.get('/api/vpnguidance/providers', ({ request }) => {
          const url = new URL(request.url);
          capturedParams = url.searchParams;
          return HttpResponse.json(mockProviders);
        })
      );

      render(<MobileVpnSelection />);

      await waitFor(() => {
        expect(capturedParams).not.toBeNull();
      });

      // Default featured category should send featured=true
      expect(capturedParams!.get('featured')).toBe('true');
    });

    it('should handle successful API response and display providers', async () => {
      render(<MobileVpnSelection />);

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('NordVPN')).toBeInTheDocument();
      });

      // Check both providers are displayed
      expect(screen.getByText('NordVPN')).toBeInTheDocument();
      expect(screen.getByText('ExpressVPN')).toBeInTheDocument();
    });

    it('should handle API error gracefully', async () => {
      // Mock console.error to avoid polluting test output
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      server.use(
        http.get('/api/vpnguidance/providers', () => {
          return HttpResponse.json(
            { error: 'Service unavailable' },
            { status: 500 }
          );
        })
      );

      render(<MobileVpnSelection />);

      // Should not throw error, but show empty state
      await waitFor(() => {
        expect(screen.getByText(/No VPN providers found/i)).toBeInTheDocument();
      });

      consoleErrorSpy.mockRestore();
    });
  });

  // Test Category 4: Loading State (2 tests)

  describe('Loading State', () => {
    it('should show skeleton cards while loading', async () => {
      // Delay the response to test loading state
      server.use(
        http.get('/api/vpnguidance/providers', async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return HttpResponse.json(mockProviders);
        })
      );

      const { container } = render(<MobileVpnSelection />);

      // Should show loading skeletons (3 cards)
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThanOrEqual(3);

      // Wait for actual data
      await waitFor(() => {
        expect(screen.getByText('NordVPN')).toBeInTheDocument();
      });
    });

    it('should hide skeleton after data loads', async () => {
      const { container } = render(<MobileVpnSelection />);

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('NordVPN')).toBeInTheDocument();
      });

      // Skeletons should be gone
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBe(0);
    });
  });

  // Test Category 5: Empty State (2 tests)

  describe('Empty State', () => {
    it('should show empty message when no providers found', async () => {
      server.use(
        http.get('/api/vpnguidance/providers', () => {
          return HttpResponse.json([]);
        })
      );

      render(<MobileVpnSelection />);

      await waitFor(() => {
        expect(screen.getByText(/No VPN providers found for the selected category/i)).toBeInTheDocument();
      });

      // Should show "View Featured Providers" button
      expect(screen.getByText('View Featured Providers')).toBeInTheDocument();
    });

    it('should reset to featured category when clicking View Featured button', async () => {
      const user = userEvent.setup();

      // Featured returns providers, but we'll start on a different category
      server.use(
        http.get('/api/vpnguidance/providers', ({ request }) => {
          const url = new URL(request.url);
          // Streaming category returns empty, featured returns providers
          if (url.searchParams.get('supportsStreaming') === 'true') {
            return HttpResponse.json([]);
          }
          return HttpResponse.json(mockProviders);
        })
      );

      render(<MobileVpnSelection />);

      // Wait for featured to load initially (has providers)
      await waitFor(() => {
        expect(screen.getByText('NordVPN')).toBeInTheDocument();
      });

      // Click on Streaming tab (which has no providers)
      await user.click(screen.getByRole('tab', { name: /Streaming/i }));

      // Wait for empty state to appear
      await waitFor(() => {
        expect(screen.getByText(/No VPN providers found/i)).toBeInTheDocument();
      });

      // Click "View Featured Providers" button
      const viewFeaturedButton = screen.getByText('View Featured Providers');
      await user.click(viewFeaturedButton);

      // Should switch back to featured and show providers
      await waitFor(() => {
        expect(screen.getByText('NordVPN')).toBeInTheDocument();
      });

      // Featured tab should be active
      const featuredTab = screen.getByRole('tab', { name: /Featured/i });
      expect(featuredTab).toHaveAttribute('data-state', 'active');
    });
  });

  // Test Category 6: Interactions (3 tests)

  describe('Interactions', () => {
    it('should open filter sheet when clicking Filters button', async () => {
      const user = userEvent.setup();
      render(<MobileVpnSelection />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('NordVPN')).toBeInTheDocument();
      });

      // Click Filters button
      const filtersButton = screen.getByRole('button', { name: /Filters/i });
      await user.click(filtersButton);

      // Filter sheet should open
      await waitFor(() => {
        expect(screen.getByText('Filter VPN Providers')).toBeInTheDocument();
        expect(screen.getByText('Customize your VPN search criteria')).toBeInTheDocument();
      });
    });

    it('should have Get Started button linking to affiliate URL', async () => {
      render(<MobileVpnSelection />);

      await waitFor(() => {
        expect(screen.getByText('NordVPN')).toBeInTheDocument();
      });

      // Find all "Get Started" buttons (there are 2 providers)
      const getStartedButtons = screen.getAllByText('Get Started');
      expect(getStartedButtons.length).toBeGreaterThan(0);

      // Check first one (NordVPN with affiliate URL)
      const nordVpnButton = getStartedButtons[0].closest('a');
      expect(nordVpnButton).toHaveAttribute('href', 'https://nordvpn.com/offer');
      expect(nordVpnButton).toHaveAttribute('target', '_blank');
      expect(nordVpnButton).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should have external link button linking to website URL', async () => {
      const { container } = render(<MobileVpnSelection />);

      await waitFor(() => {
        expect(screen.getByText('NordVPN')).toBeInTheDocument();
      });

      // Find all anchor elements with nordvpn.com
      const nordvpnLinks = container.querySelectorAll('a[href*="nordvpn.com"]');
      expect(nordvpnLinks.length).toBeGreaterThan(0);

      // Find the website link (not the affiliate link) by filtering
      const websiteLinks = Array.from(nordvpnLinks).filter(link =>
        link.getAttribute('href') === 'https://nordvpn.com'
      );

      expect(websiteLinks.length).toBeGreaterThan(0);

      // Check it has correct attributes
      const websiteLink = websiteLinks[0];
      expect(websiteLink).toHaveAttribute('target', '_blank');
      expect(websiteLink).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });
});
