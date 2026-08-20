/**
 * VpnProviderComparisonScreen Tests
 * Phase 3.2: VPN Screen Tests
 */

import React from 'react';
import { renderWithProviders } from '../../utils/test-helpers';
import { VpnProviderComparisonScreen } from '../../../screens/vpn/VpnProviderComparisonScreen';
import { VPN_PROVIDERS } from '../../../types/vpn.types';
import { fireEvent, waitFor } from '@testing-library/react-native';

// Mock navigation
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockNavigation = {
  goBack: mockGoBack,
  navigate: mockNavigate,
};

// Mock route with no providerId (default comparison)
const mockRouteNoProvider = {
  params: {},
};

// Mock route with specific providerId
const mockRouteWithProvider = {
  params: { providerId: 'nordvpn' },
};

describe('VpnProviderComparisonScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the screen with header', () => {
      const { getByText } = renderWithProviders(
        <VpnProviderComparisonScreen
          navigation={mockNavigation as any}
          route={mockRouteNoProvider as any}
        />
      );

      expect(getByText('Compare VPN Providers')).toBeTruthy();
    });

    it('should show top 3 providers when no providerId is passed', () => {
      const { getByText } = renderWithProviders(
        <VpnProviderComparisonScreen
          navigation={mockNavigation as any}
          route={mockRouteNoProvider as any}
        />
      );

      // Check that top 3 providers are displayed
      const top3 = VPN_PROVIDERS.slice(0, 3);
      top3.forEach(provider => {
        expect(getByText(provider.displayName)).toBeTruthy();
      });
    });

    it('should show specific provider first when providerId is passed', () => {
      const { getByText } = renderWithProviders(
        <VpnProviderComparisonScreen
          navigation={mockNavigation as any}
          route={mockRouteWithProvider as any}
        />
      );

      // NordVPN should be displayed
      expect(getByText('NordVPN')).toBeTruthy();
    });

    it('should display Feature column header', () => {
      const { getByText } = renderWithProviders(
        <VpnProviderComparisonScreen
          navigation={mockNavigation as any}
          route={mockRouteNoProvider as any}
        />
      );

      expect(getByText('Feature')).toBeTruthy();
    });

    it('should display pricing section labels', () => {
      const { getByText } = renderWithProviders(
        <VpnProviderComparisonScreen
          navigation={mockNavigation as any}
          route={mockRouteNoProvider as any}
        />
      );

      expect(getByText('PRICING')).toBeTruthy();
      expect(getByText('Monthly Price')).toBeTruthy();
      expect(getByText('Yearly Price')).toBeTruthy();
    });

    it('should display ratings section', () => {
      const { getByText } = renderWithProviders(
        <VpnProviderComparisonScreen
          navigation={mockNavigation as any}
          route={mockRouteNoProvider as any}
        />
      );

      expect(getByText('RATINGS')).toBeTruthy();
      expect(getByText('Overall Rating')).toBeTruthy();
      expect(getByText('Speed')).toBeTruthy();
      expect(getByText('Security')).toBeTruthy();
      expect(getByText('Ease of Use')).toBeTruthy();
    });

    it('should display network section', () => {
      const { getByText } = renderWithProviders(
        <VpnProviderComparisonScreen
          navigation={mockNavigation as any}
          route={mockRouteNoProvider as any}
        />
      );

      expect(getByText('NETWORK')).toBeTruthy();
      expect(getByText('Server Count')).toBeTruthy();
      expect(getByText('Countries')).toBeTruthy();
    });

    it('should display features section', () => {
      const { getByText } = renderWithProviders(
        <VpnProviderComparisonScreen
          navigation={mockNavigation as any}
          route={mockRouteNoProvider as any}
        />
      );

      expect(getByText('FEATURES')).toBeTruthy();
      expect(getByText('Kill Switch')).toBeTruthy();
      expect(getByText('No-Logs Policy')).toBeTruthy();
      expect(getByText('Split Tunneling')).toBeTruthy();
    });

    it('should display guarantee section', () => {
      const { getByText } = renderWithProviders(
        <VpnProviderComparisonScreen
          navigation={mockNavigation as any}
          route={mockRouteNoProvider as any}
        />
      );

      expect(getByText('GUARANTEE')).toBeTruthy();
      expect(getByText('Free Trial')).toBeTruthy();
      expect(getByText('Money-Back Guarantee')).toBeTruthy();
    });

    it('should display Choose buttons for each provider', () => {
      const { getAllByText } = renderWithProviders(
        <VpnProviderComparisonScreen
          navigation={mockNavigation as any}
          route={mockRouteNoProvider as any}
        />
      );

      const chooseButtons = getAllByText('Choose');
      expect(chooseButtons.length).toBe(3); // 3 providers shown
    });
  });

  describe('Navigation', () => {
    it('should navigate back when back button is pressed', () => {
      const { getByLabelText } = renderWithProviders(
        <VpnProviderComparisonScreen
          navigation={mockNavigation as any}
          route={mockRouteNoProvider as any}
        />
      );

      const backButton = getByLabelText('Back');
      fireEvent.press(backButton);

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('should navigate to VpnGuidance when Choose button is pressed', () => {
      const { getAllByText } = renderWithProviders(
        <VpnProviderComparisonScreen
          navigation={mockNavigation as any}
          route={mockRouteNoProvider as any}
        />
      );

      const chooseButtons = getAllByText('Choose');
      fireEvent.press(chooseButtons[0]);

      expect(mockNavigate).toHaveBeenCalledWith('VpnGuidance');
    });
  });

  describe('Data Display', () => {
    it('should display provider monthly prices', () => {
      const { getByText } = renderWithProviders(
        <VpnProviderComparisonScreen
          navigation={mockNavigation as any}
          route={mockRouteNoProvider as any}
        />
      );

      const firstProvider = VPN_PROVIDERS[0];
      expect(getByText(`$${firstProvider.monthlyPrice}/mo`)).toBeTruthy();
    });

    it('should display provider server counts', () => {
      const { getByText } = renderWithProviders(
        <VpnProviderComparisonScreen
          navigation={mockNavigation as any}
          route={mockRouteNoProvider as any}
        />
      );

      const firstProvider = VPN_PROVIDERS[0];
      expect(getByText(`${firstProvider.serverCount}+`)).toBeTruthy();
    });

    it('should display provider refund days', () => {
      const { getAllByText } = renderWithProviders(
        <VpnProviderComparisonScreen
          navigation={mockNavigation as any}
          route={mockRouteNoProvider as any}
        />
      );

      const firstProvider = VPN_PROVIDERS[0];
      // Multiple providers may have the same refund period
      const refundTexts = getAllByText(`${firstProvider.refundDays} days`);
      expect(refundTexts.length).toBeGreaterThan(0);
    });

    it('should show rating stars for providers', () => {
      const { getAllByText } = renderWithProviders(
        <VpnProviderComparisonScreen
          navigation={mockNavigation as any}
          route={mockRouteNoProvider as any}
        />
      );

      // Rating stars format: ★★★★☆ 4.7
      const ratingPatterns = getAllByText(/★+☆*\s+\d\.\d/);
      expect(ratingPatterns.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing route params gracefully', () => {
      const routeWithUndefinedParams = { params: undefined };

      expect(() => {
        renderWithProviders(
          <VpnProviderComparisonScreen
            navigation={mockNavigation as any}
            route={routeWithUndefinedParams as any}
          />
        );
      }).not.toThrow();
    });

    // BUG-VPN-001: FIXED - Invalid providerId now falls back to top 3 providers
    it('should handle invalid providerId by showing top 3', () => {
      const invalidProviderRoute = { params: { providerId: 'invalid-provider-id' } };

      // Fixed: Component now handles invalid providerId gracefully
      const { getAllByText } = renderWithProviders(
        <VpnProviderComparisonScreen
          navigation={mockNavigation as any}
          route={invalidProviderRoute as any}
        />
      );

      // Should still show choose buttons (graceful fallback to top 3)
      const chooseButtons = getAllByText('Choose');
      expect(chooseButtons.length).toBe(3); // Fallback to top 3 providers
    });
  });
});
