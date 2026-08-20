/**
 * VpnGuidanceScreen Tests
 * Phase 3.2: VPN Screen Tests
 */

import React from 'react';
import { renderWithProviders } from '../../utils/test-helpers';
import { VpnGuidanceScreen } from '../../../screens/vpn/VpnGuidanceScreen';
import { fireEvent, waitFor } from '@testing-library/react-native';

// Mock logger
jest.mock('../../../utils/logger', () => ({
  logger: {
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock navigation
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockNavigation = {
  goBack: mockGoBack,
  navigate: mockNavigate,
};

// Mock hooks
jest.mock('../../../hooks/useStreamingServices', () => ({
  useStreamingServices: jest.fn(() => ({
    selectedServices: ['netflix', 'hulu'],
    isLoading: false,
    error: null,
  })),
}));

jest.mock('../../../hooks/useVpnRecommendations', () => ({
  useVpnRecommendations: jest.fn(() => ({
    recommendations: [
      {
        provider: {
          id: 'nordvpn',
          name: 'NordVPN',
          displayName: 'NordVPN',
          color: '#4687ff',
          monthlyPrice: 11.95,
          yearlyPrice: 99.00,
          rating: 4.7,
          speedRating: 4.8,
          securityRating: 4.9,
          easeOfUseRating: 4.5,
          serverCount: 5500,
          serverLocations: ['US', 'UK', 'CA'],
          features: [{ id: 'kill-switch', name: 'Kill Switch' }],
          streamingSupport: [{ serviceId: 'netflix', serviceName: 'Netflix', supported: true, regions: ['US'], reliability: 'excellent' }],
          trialAvailable: false,
          trialDays: 0,
          refundDays: 30,
        },
        score: 95,
        matchedServices: ['netflix'],
        pricePerMonth: 8.25,
      },
    ],
    hasRecommendations: true,
    isLoading: false,
  })),
}));

describe('VpnGuidanceScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the screen with header', () => {
      const { getByText } = renderWithProviders(
        <VpnGuidanceScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByText('VPN Guidance')).toBeTruthy();
    });

    it('should display title text', () => {
      const { getByText } = renderWithProviders(
        <VpnGuidanceScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByText('Find Your Perfect VPN')).toBeTruthy();
    });

    it('should show recommendations subtitle with service count', () => {
      const { getByText } = renderWithProviders(
        <VpnGuidanceScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByText(/Based on your 2 streaming services/)).toBeTruthy();
    });

    it('should display segmented buttons for view modes', () => {
      const { getByText } = renderWithProviders(
        <VpnGuidanceScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByText('For You')).toBeTruthy();
      expect(getByText('All VPNs')).toBeTruthy();
    });

    it('should display info box explaining VPN purpose', () => {
      const { getByText } = renderWithProviders(
        <VpnGuidanceScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByText('Why do I need a VPN?')).toBeTruthy();
    });
  });

  describe('Navigation', () => {
    it('should navigate back when back button is pressed', () => {
      const { getByLabelText } = renderWithProviders(
        <VpnGuidanceScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const backButton = getByLabelText('Back');
      fireEvent.press(backButton);

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('View Mode Switching', () => {
    it('should show search bar in All VPNs view', async () => {
      const { getAllByText, getByPlaceholderText } = renderWithProviders(
        <VpnGuidanceScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const allVpnsButtons = getAllByText('All VPNs');
      fireEvent.press(allVpnsButtons[0]);

      await waitFor(() => {
        expect(getByPlaceholderText('Search VPN providers...')).toBeTruthy();
      });
    });
  });

  describe('Provider Cards', () => {
    it('should display provider card with NordVPN', () => {
      const { getByText } = renderWithProviders(
        <VpnGuidanceScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByText('NordVPN')).toBeTruthy();
    });

    it('should display provider server count', () => {
      const { getByText } = renderWithProviders(
        <VpnGuidanceScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Component displays serverCount with a '+' suffix
      expect(getByText('5500+')).toBeTruthy();
    });

    it('should display provider pricing info', () => {
      const { getByText } = renderWithProviders(
        <VpnGuidanceScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Price is shown as "$8.25" but rendered in separate elements
      expect(getByText('/month (yearly plan)')).toBeTruthy();
    });

    it('should display Get Started button', () => {
      const { getByText } = renderWithProviders(
        <VpnGuidanceScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByText('Get Started')).toBeTruthy();
    });

    it('should display Learn More button', () => {
      const { getByText } = renderWithProviders(
        <VpnGuidanceScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByText('Learn More')).toBeTruthy();
    });
  });

  describe('Banner Display', () => {
    it('should not show banner when services are selected', () => {
      const { queryByText } = renderWithProviders(
        <VpnGuidanceScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(queryByText('Select Services')).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle no recommendations gracefully', () => {
      const useVpnRecommendationsMock = require('../../../hooks/useVpnRecommendations').useVpnRecommendations;
      useVpnRecommendationsMock.mockReturnValueOnce({
        recommendations: [],
        hasRecommendations: false,
        isLoading: false,
      });

      const { getByText } = renderWithProviders(
        <VpnGuidanceScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByText('Browse all available VPN providers:')).toBeTruthy();
    });
  });
});
