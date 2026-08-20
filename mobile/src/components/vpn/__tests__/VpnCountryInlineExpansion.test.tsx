/**
 * VpnCountryInlineExpansion Mobile Component Tests
 * React Native version with LayoutAnimation
 */

import React from 'react';
import { render, waitFor, fireEvent, configure } from '@testing-library/react-native';

// Configure longer timeout for async operations
configure({ asyncUtilTimeout: 3000 });
import { LayoutAnimation } from 'react-native';
import { VpnCountryInlineExpansion } from '../VpnCountryInlineExpansion';
import { ThemeProvider } from '../../../theme/ThemeProvider';
import { useUserSubscriptions } from '../../../hooks/useUserSubscriptions';
import { useAuth } from '../../../context/AuthContext';

// Mock AuthContext
jest.mock('../../../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock useUserSubscriptions hook
jest.mock('../../../hooks/useUserSubscriptions', () => ({
  useUserSubscriptions: jest.fn(),
}));

// Mock LayoutAnimation
jest.spyOn(LayoutAnimation, 'configureNext').mockImplementation(() => {});

// Mock fetch - using same pattern as useUserSubscriptions.test.ts
global.fetch = jest.fn() as jest.Mock;
const mockFetch = global.fetch as jest.Mock;

// Wrapper with theme
const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider>{component}</ThemeProvider>);
};

const mockUseUserSubscriptions = useUserSubscriptions as jest.MockedFunction<
  typeof useUserSubscriptions
>;

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('VpnCountryInlineExpansion (Mobile)', () => {
  // Use stable array references to prevent useEffect loops
  const stableAudioLanguages: string[] = [];
  const stableSubtitleLanguages: string[] = [];

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

    // Mock useAuth to provide required state structure
    mockUseAuth.mockReturnValue({
      state: {
        isAuthenticated: false,
        user: null,
        loading: false,
        error: null,
      },
      login: jest.fn(),
      logout: jest.fn(),
      register: jest.fn(),
    });

    mockUseUserSubscriptions.mockReturnValue({
      subscriptions: [
        { serviceId: 'netflix', serviceName: 'Netflix', isActive: true },
        { serviceId: 'prime', serviceName: 'Prime Video', isActive: true },
      ],
      getServiceIds: jest.fn(() => ['netflix', 'prime']),
      hasSetupSubscriptions: true,
      loading: false,
      error: null,
      toggleSubscription: jest.fn(),
      setMultipleSubscriptions: jest.fn(),
      hasSubscription: jest.fn(),
      subscriptionCount: 2,
      refetch: jest.fn(),
    });

    // Reset and setup fetch mock with proper promise resolution
    mockFetch.mockReset();
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => mockApiResponse,
      } as any)
    );
  });

  // Test Category 1: Collapsed State (2 tests)

  describe('Collapsed State', () => {
    it('should render nothing when isExpanded is false', () => {
      const { queryByTestId } = renderWithTheme(
        <VpnCountryInlineExpansion
          contentId="tt1234567"
          isExpanded={false}
          onCollapse={jest.fn()}
          audioLanguages={stableAudioLanguages}
          subtitleLanguages={stableSubtitleLanguages}
        />
      );

      expect(queryByTestId('vpn-expansion-container')).toBeNull();
    });

    it('should not fetch data when collapsed', () => {
      renderWithTheme(
        <VpnCountryInlineExpansion
          contentId="tt1234567"
          isExpanded={false}
          onCollapse={jest.fn()}
          audioLanguages={stableAudioLanguages}
          subtitleLanguages={stableSubtitleLanguages}
        />
      );

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  // Test Category 2: Loading State (2 tests)

  describe('Loading State', () => {
    it('should show loading indicator when fetching data', async () => {
      mockFetch.mockImplementation(
        () =>
          new Promise(resolve =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: () => Promise.resolve(mockApiResponse),
                } as any),
              100
            )
          )
      );

      const { getByTestId, queryByTestId } = renderWithTheme(
        <VpnCountryInlineExpansion
          contentId="tt1234567"
          isExpanded={true}
          onCollapse={jest.fn()}
          audioLanguages={stableAudioLanguages}
          subtitleLanguages={stableSubtitleLanguages}
        />
      );

      // Should show loading indicator
      expect(getByTestId('vpn-expansion-loading')).toBeTruthy();

      // Wait for data to load
      await waitFor(() => {
        expect(queryByTestId('vpn-expansion-loading')).toBeNull();
      });
    });

    it('should fetch data when expanded', async () => {
      renderWithTheme(
        <VpnCountryInlineExpansion
          contentId="tt1234567"
          isExpanded={true}
          onCollapse={jest.fn()}
          audioLanguages={['en']}
          subtitleLanguages={['en', 'es']}
        />
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/vpnguidance/countries-for-content/tt1234567'),
          expect.any(Object)
        );
      });
    });
  });

  // Test Category 3: Data Display - Grouped by Services (4 tests)

  describe('Data Display - Grouped by User Services', () => {
    it('should display countries grouped by user subscribed services', async () => {
      const { getByText, queryByTestId } = renderWithTheme(
        <VpnCountryInlineExpansion
          contentId="tt1234567"
          isExpanded={true}
          onCollapse={jest.fn()}
          audioLanguages={stableAudioLanguages}
          subtitleLanguages={stableSubtitleLanguages}
        />
      );

      await waitFor(() => {
        expect(queryByTestId('vpn-expansion-loading')).toBeNull();
      });

      // Should show Netflix section
      expect(getByText('Netflix')).toBeTruthy();

      // Should show Prime Video section
      expect(getByText('Prime Video')).toBeTruthy();
    });

    it('should filter countries by user subscriptions', async () => {
      const { getAllByTestId, getByTestId, queryByTestId } = renderWithTheme(
        <VpnCountryInlineExpansion
          contentId="tt1234567"
          isExpanded={true}
          onCollapse={jest.fn()}
          audioLanguages={stableAudioLanguages}
          subtitleLanguages={stableSubtitleLanguages}
        />
      );

      await waitFor(() => {
        expect(queryByTestId('vpn-expansion-loading')).toBeNull();
      });

      // US and GB should appear under Netflix
      expect(getByTestId('service-netflix')).toBeTruthy();
      const usElements = getAllByTestId('country-US');
      expect(usElements.length).toBeGreaterThan(0);
      const gbElements = getAllByTestId('country-GB');
      expect(gbElements.length).toBeGreaterThan(0);

      // DE should appear under Prime
      expect(getByTestId('service-prime')).toBeTruthy();
      const deElements = getAllByTestId('country-DE');
      expect(deElements.length).toBeGreaterThan(0);
    });

    it('should show all services when user has no subscriptions configured', async () => {
      mockUseUserSubscriptions.mockReturnValue({
        subscriptions: [],
        getServiceIds: () => [],
        hasSetupSubscriptions: false,
        loading: false,
        error: null,
        toggleSubscription: jest.fn(),
        setMultipleSubscriptions: jest.fn(),
        hasSubscription: jest.fn(),
        subscriptionCount: 0,
        refetch: jest.fn(),
      });

      const { getByText, queryByTestId } = renderWithTheme(
        <VpnCountryInlineExpansion
          contentId="tt1234567"
          isExpanded={true}
          onCollapse={jest.fn()}
          audioLanguages={stableAudioLanguages}
          subtitleLanguages={stableSubtitleLanguages}
        />
      );

      await waitFor(() => {
        expect(queryByTestId('vpn-expansion-loading')).toBeNull();
      });

      // Should show all services
      expect(getByText('Netflix')).toBeTruthy();
      expect(getByText('Prime Video')).toBeTruthy();
    });

    it('should display country names with flags', async () => {
      const { getAllByTestId, getAllByText, getByText, queryByTestId } = renderWithTheme(
        <VpnCountryInlineExpansion
          contentId="tt1234567"
          isExpanded={true}
          onCollapse={jest.fn()}
          audioLanguages={stableAudioLanguages}
          subtitleLanguages={stableSubtitleLanguages}
        />
      );

      await waitFor(() => {
        expect(queryByTestId('vpn-expansion-loading')).toBeNull();
      });

      // Check countries render
      const usElements = getAllByTestId('country-US');
      expect(usElements.length).toBeGreaterThan(0);
      const usTexts = getAllByText('United States');
      expect(usTexts.length).toBeGreaterThan(0);
      const usFlags = getAllByText('🇺🇸');
      expect(usFlags.length).toBeGreaterThan(0);
    });
  });

  // Test Category 4: Language Match Quality Badges (3 tests)

  describe('Language Match Quality Badges', () => {
    it('should show Perfect match badge', async () => {
      const { getAllByText, queryByTestId } = renderWithTheme(
        <VpnCountryInlineExpansion
          contentId="tt1234567"
          isExpanded={true}
          onCollapse={jest.fn()}
          audioLanguages={stableAudioLanguages}
          subtitleLanguages={stableSubtitleLanguages}
        />
      );

      await waitFor(() => {
        expect(queryByTestId('vpn-expansion-loading')).toBeNull();
      });

      const perfectBadges = getAllByText('Perfect');
      expect(perfectBadges.length).toBeGreaterThan(0);
    });

    it('should show Good match badge', async () => {
      const { getByText, queryByTestId } = renderWithTheme(
        <VpnCountryInlineExpansion
          contentId="tt1234567"
          isExpanded={true}
          onCollapse={jest.fn()}
          audioLanguages={stableAudioLanguages}
          subtitleLanguages={stableSubtitleLanguages}
        />
      );

      await waitFor(() => {
        expect(queryByTestId('vpn-expansion-loading')).toBeNull();
      });

      expect(getByText('Good')).toBeTruthy();
    });

    it('should show Partial match badge', async () => {
      const { getByText, queryByTestId } = renderWithTheme(
        <VpnCountryInlineExpansion
          contentId="tt1234567"
          isExpanded={true}
          onCollapse={jest.fn()}
          audioLanguages={stableAudioLanguages}
          subtitleLanguages={stableSubtitleLanguages}
        />
      );

      await waitFor(() => {
        expect(queryByTestId('vpn-expansion-loading')).toBeNull();
      }, { timeout: 3000 });

      expect(getByText('Partial')).toBeTruthy();
    });
  });

  // Test Category 5: Error Handling (3 tests)

  describe('Error Handling', () => {
    it('should display error message when API call fails', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const { getByTestId, getByText } = renderWithTheme(
        <VpnCountryInlineExpansion
          contentId="tt1234567"
          isExpanded={true}
          onCollapse={jest.fn()}
          audioLanguages={stableAudioLanguages}
          subtitleLanguages={stableSubtitleLanguages}
        />
      );

      await waitFor(() => {
        expect(getByTestId('vpn-expansion-error')).toBeTruthy();
      });

      expect(getByText(/failed to load vpn locations/i)).toBeTruthy();
    });

    it('should show retry button when error occurs', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const { getByTestId, getByText } = renderWithTheme(
        <VpnCountryInlineExpansion
          contentId="tt1234567"
          isExpanded={true}
          onCollapse={jest.fn()}
          audioLanguages={stableAudioLanguages}
          subtitleLanguages={stableSubtitleLanguages}
        />
      );

      await waitFor(() => {
        expect(getByTestId('vpn-expansion-error')).toBeTruthy();
      });

      expect(getByText(/try again/i)).toBeTruthy();
    });

    it('should retry fetching data when retry button is pressed', async () => {
      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockApiResponse),
        } as any);
      });

      const { getByTestId, getAllByText, queryByTestId } = renderWithTheme(
        <VpnCountryInlineExpansion
          contentId="tt1234567"
          isExpanded={true}
          onCollapse={jest.fn()}
          audioLanguages={stableAudioLanguages}
          subtitleLanguages={stableSubtitleLanguages}
        />
      );

      await waitFor(() => {
        expect(getByTestId('vpn-expansion-error')).toBeTruthy();
      });

      // Press retry
      const retryButtons = getAllByText(/try again/i);
      fireEvent.press(retryButtons[0]);

      // Should eventually show data
      await waitFor(() => {
        expect(queryByTestId('vpn-expansion-error')).toBeNull();
        const usTexts = getAllByText('United States');
        expect(usTexts.length).toBeGreaterThan(0);
      }, { timeout: 3000 });
    });
  });

  // Test Category 6: Collapse Functionality (2 tests)

  describe('Collapse Functionality', () => {
    it('should call onCollapse when collapse button is pressed', async () => {
      const onCollapse = jest.fn();

      const { getByText, queryByTestId } = renderWithTheme(
        <VpnCountryInlineExpansion
          contentId="tt1234567"
          isExpanded={true}
          onCollapse={onCollapse}
          audioLanguages={stableAudioLanguages}
          subtitleLanguages={stableSubtitleLanguages}
        />
      );

      // Wait for loading to complete AND data to render
      await waitFor(() => {
        expect(queryByTestId('vpn-expansion-loading')).toBeNull();
      });

      // Additional wait to ensure DOM has updated with data
      await waitFor(() => {
        expect(getByText(/hide/i)).toBeTruthy();
      });

      const collapseButton = getByText(/hide/i);
      fireEvent.press(collapseButton);

      expect(onCollapse).toHaveBeenCalledTimes(1);
    });

    it('should have collapse button accessible', async () => {
      const { getByText, queryByTestId } = renderWithTheme(
        <VpnCountryInlineExpansion
          contentId="tt1234567"
          isExpanded={true}
          onCollapse={jest.fn()}
          audioLanguages={stableAudioLanguages}
          subtitleLanguages={stableSubtitleLanguages}
        />
      );

      await waitFor(() => {
        expect(queryByTestId('vpn-expansion-loading')).toBeNull();
      }, { timeout: 3000 });

      const collapseButton = getByText(/hide/i);
      expect(collapseButton).toBeTruthy();
    });
  });

  // Test Category 7: Edge Cases (3 tests)

  describe('Edge Cases', () => {
    it('should handle empty recommendedCountries array', async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            contentId: 'tt1234567',
            recommendedCountries: [],
          }),
        } as any)
      );

      const { getByText, queryByTestId } = renderWithTheme(
        <VpnCountryInlineExpansion
          contentId="tt1234567"
          isExpanded={true}
          onCollapse={jest.fn()}
          audioLanguages={stableAudioLanguages}
          subtitleLanguages={stableSubtitleLanguages}
        />
      );

      await waitFor(() => {
        expect(queryByTestId('vpn-expansion-loading')).toBeNull();
      });

      expect(getByText(/not available via vpn/i)).toBeTruthy();
    });

    it('should handle missing audioLanguages prop', async () => {
      const { getAllByText, queryByTestId } = renderWithTheme(
        <VpnCountryInlineExpansion
          contentId="tt1234567"
          isExpanded={true}
          onCollapse={jest.fn()}
          audioLanguages={stableAudioLanguages}
          subtitleLanguages={['en']}
        />
      );

      await waitFor(() => {
        expect(queryByTestId('vpn-expansion-loading')).toBeNull();
      });

      const usTexts = getAllByText('United States');
      expect(usTexts.length).toBeGreaterThan(0);
    });

    it('should handle missing subtitleLanguages prop', async () => {
      const { getAllByText, queryByTestId } = renderWithTheme(
        <VpnCountryInlineExpansion
          contentId="tt1234567"
          isExpanded={true}
          onCollapse={jest.fn()}
          audioLanguages={['en']}
          subtitleLanguages={stableSubtitleLanguages}
        />
      );

      await waitFor(() => {
        expect(queryByTestId('vpn-expansion-loading')).toBeNull();
      });

      const usTexts = getAllByText('United States');
      expect(usTexts.length).toBeGreaterThan(0);
    });
  });

  // Test Category 8: Theme Integration (2 tests)

  describe('Theme Integration', () => {
    it('should use theme tokens for container styling', async () => {
      const { getByTestId, queryByTestId } = renderWithTheme(
        <VpnCountryInlineExpansion
          contentId="tt1234567"
          isExpanded={true}
          onCollapse={jest.fn()}
          audioLanguages={stableAudioLanguages}
          subtitleLanguages={stableSubtitleLanguages}
        />
      );

      await waitFor(() => {
        expect(queryByTestId('vpn-expansion-loading')).toBeNull();
      });

      const container = getByTestId('vpn-expansion-container');
      expect(container.props.style).toBeDefined();
      // Should use theme colors and spacing
      expect(container.props.style.backgroundColor).toBeDefined();
    });

    it('should apply theme colors to quality badges', async () => {
      const { getAllByTestId, queryByTestId } = renderWithTheme(
        <VpnCountryInlineExpansion
          contentId="tt1234567"
          isExpanded={true}
          onCollapse={jest.fn()}
          audioLanguages={stableAudioLanguages}
          subtitleLanguages={stableSubtitleLanguages}
        />
      );

      await waitFor(() => {
        expect(queryByTestId('vpn-expansion-loading')).toBeNull();
      }, { timeout: 3000 });

      // Badges should have theme-based colors
      const perfectBadges = getAllByTestId('badge-Perfect');
      expect(perfectBadges.length).toBeGreaterThan(0);
      expect(perfectBadges[0].props.style).toBeDefined();
    });
  });
});
