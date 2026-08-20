import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { VpnRecommendationCard, type VpnRecommendationData } from '../VpnRecommendationCard';

describe('VpnRecommendationCard', () => {
  // Test data
  const mockRecommendation: VpnRecommendationData = {
    vpnName: 'NordVPN',
    overallScore: 4.7,
    countries: [
      {
        countryCode: 'US',
        countryName: 'United States',
        audioLanguages: ['en', 'es'],
        subtitleLanguages: ['en', 'fr'],
        matchQuality: 'Perfect',
      },
      {
        countryCode: 'GB',
        countryName: 'United Kingdom',
        audioLanguages: ['en'],
        subtitleLanguages: ['en'],
        matchQuality: 'Good',
      },
    ],
    warnings: ['This VPN may have slower speeds in your region'],
    isBestMatch: true,
  };

  // Test Category 1: Basic Rendering (5 tests)

  describe('Basic Rendering', () => {
    it('should render card with VPN name and overall score', () => {
      render(<VpnRecommendationCard recommendation={mockRecommendation} />);

      // Card should be present
      expect(screen.getByTestId('vpn-recommendation-card')).toBeInTheDocument();

      // VPN name should be displayed
      expect(screen.getByText('NordVPN')).toBeInTheDocument();

      // Overall score should be displayed
      expect(screen.getByText('4.7')).toBeInTheDocument();
    });

    it('should display "Best Language Match" badge when isBestMatch is true', () => {
      render(<VpnRecommendationCard recommendation={mockRecommendation} />);

      const badge = screen.getByTestId('best-match-badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('Best Language Match');
    });

    it('should not display best match badge when isBestMatch is false', () => {
      const recommendationWithoutBadge = {
        ...mockRecommendation,
        isBestMatch: false,
      };

      render(<VpnRecommendationCard recommendation={recommendationWithoutBadge} />);

      expect(screen.queryByTestId('best-match-badge')).not.toBeInTheDocument();
    });

    it('should display match quality indicator with correct quality', () => {
      render(<VpnRecommendationCard recommendation={mockRecommendation} />);

      // Should show LanguageMatchIndicator with "Perfect" quality
      // (since countries include a "Perfect" match)
      const indicator = screen.getByTestId('language-match-indicator');
      expect(indicator).toBeInTheDocument();
      expect(indicator).toHaveTextContent('Perfect Match');
    });

    it('should display correct country count summary', () => {
      render(<VpnRecommendationCard recommendation={mockRecommendation} />);

      // Should show "2 countries available"
      expect(screen.getByText(/2 countries available/i)).toBeInTheDocument();
    });
  });

  // Test Category 2: Expand/Collapse Functionality (4 tests)

  describe('Expand/Collapse Functionality', () => {
    it('should initially hide country details (collapsed state)', () => {
      render(<VpnRecommendationCard recommendation={mockRecommendation} />);

      // Country details should not be visible initially
      expect(screen.queryByText('Available Countries')).not.toBeInTheDocument();
      expect(screen.queryByTestId('country-US')).not.toBeInTheDocument();

      // Toggle button should show "Show Country Details"
      expect(screen.getByText('Show Country Details')).toBeInTheDocument();
    });

    it('should expand to show country details when toggle button is clicked', () => {
      render(<VpnRecommendationCard recommendation={mockRecommendation} />);

      const toggleButton = screen.getByTestId('toggle-countries');
      fireEvent.click(toggleButton);

      // Country details should now be visible
      expect(screen.getByText('Available Countries')).toBeInTheDocument();
      expect(screen.getByTestId('country-US')).toBeInTheDocument();
      expect(screen.getByTestId('country-GB')).toBeInTheDocument();
    });

    it('should collapse to hide country details when toggle is clicked again', () => {
      render(<VpnRecommendationCard recommendation={mockRecommendation} />);

      const toggleButton = screen.getByTestId('toggle-countries');

      // Expand
      fireEvent.click(toggleButton);
      expect(screen.getByText('Available Countries')).toBeInTheDocument();

      // Collapse
      fireEvent.click(toggleButton);
      expect(screen.queryByText('Available Countries')).not.toBeInTheDocument();
      expect(screen.queryByTestId('country-US')).not.toBeInTheDocument();
    });

    it('should change toggle button text between "Show" and "Hide"', () => {
      render(<VpnRecommendationCard recommendation={mockRecommendation} />);

      const toggleButton = screen.getByTestId('toggle-countries');

      // Initially collapsed
      expect(toggleButton).toHaveTextContent('Show Country Details');

      // After expanding
      fireEvent.click(toggleButton);
      expect(toggleButton).toHaveTextContent('Hide Country Details');

      // After collapsing again
      fireEvent.click(toggleButton);
      expect(toggleButton).toHaveTextContent('Show Country Details');
    });
  });

  // Test Category 3: Country Details Display (4 tests)

  describe('Country Details Display', () => {
    it('should display all countries with names and codes when expanded', () => {
      render(<VpnRecommendationCard recommendation={mockRecommendation} />);

      // Expand the card
      fireEvent.click(screen.getByTestId('toggle-countries'));

      // Check United States
      expect(screen.getByText('United States')).toBeInTheDocument();
      expect(screen.getByText('US')).toBeInTheDocument();

      // Check United Kingdom
      expect(screen.getByText('United Kingdom')).toBeInTheDocument();
      expect(screen.getByText('GB')).toBeInTheDocument();
    });

    it('should display match quality indicator for each country', () => {
      render(<VpnRecommendationCard recommendation={mockRecommendation} />);

      // Expand the card
      fireEvent.click(screen.getByTestId('toggle-countries'));

      // Both countries should have LanguageMatchIndicator
      // US has "Perfect" match, GB has "Good" match
      const indicators = screen.getAllByTestId('language-match-indicator');
      expect(indicators.length).toBeGreaterThanOrEqual(2);
    });

    it('should display audio languages for each country', () => {
      render(<VpnRecommendationCard recommendation={mockRecommendation} />);

      // Expand the card
      fireEvent.click(screen.getByTestId('toggle-countries'));

      // Check Audio label appears
      const audioLabels = screen.getAllByText('Audio:');
      expect(audioLabels.length).toBeGreaterThan(0);

      // US has 'en' and 'es' audio
      const usCountry = screen.getByTestId('country-US');
      expect(usCountry).toHaveTextContent('en');
      expect(usCountry).toHaveTextContent('es');

      // GB has 'en' audio
      const gbCountry = screen.getByTestId('country-GB');
      expect(gbCountry).toHaveTextContent('en');
    });

    it('should display subtitle languages for each country', () => {
      render(<VpnRecommendationCard recommendation={mockRecommendation} />);

      // Expand the card
      fireEvent.click(screen.getByTestId('toggle-countries'));

      // Check Subtitles label appears
      const subtitleLabels = screen.getAllByText('Subtitles:');
      expect(subtitleLabels.length).toBeGreaterThan(0);

      // US has 'en' and 'fr' subtitles
      const usCountry = screen.getByTestId('country-US');
      expect(usCountry).toHaveTextContent('fr'); // French unique to US

      // GB has 'en' subtitles
      const gbCountry = screen.getByTestId('country-GB');
      expect(gbCountry).toHaveTextContent('en');
    });
  });

  // Test Category 4: Warnings Display (2 tests)

  describe('Warnings Display', () => {
    it('should display warnings when provided', () => {
      render(<VpnRecommendationCard recommendation={mockRecommendation} />);

      // Warning should be visible
      const warning = screen.getByTestId('warning-0');
      expect(warning).toBeInTheDocument();
      expect(warning).toHaveTextContent('This VPN may have slower speeds in your region');
    });

    it('should not display warnings section when warnings are empty or undefined', () => {
      const recommendationWithoutWarnings = {
        ...mockRecommendation,
        warnings: undefined,
      };

      render(<VpnRecommendationCard recommendation={recommendationWithoutWarnings} />);

      // No warnings should be visible
      expect(screen.queryByTestId(/warning-\d+/)).not.toBeInTheDocument();
    });
  });

  // Test Category 5: Edge Cases (4 tests)

  describe('Edge Cases', () => {
    it('should handle empty countries array gracefully', () => {
      const recommendationWithNoCountries: VpnRecommendationData = {
        vpnName: 'TestVPN',
        countries: [],
        overallScore: 3.5,
      };

      render(<VpnRecommendationCard recommendation={recommendationWithNoCountries} />);

      // Should show "0 countries available"
      expect(screen.getByText(/0 countries available/i)).toBeInTheDocument();

      // Toggle button should NOT be present with no countries
      expect(screen.queryByTestId('toggle-countries')).not.toBeInTheDocument();

      // Match quality should be "None" for empty countries
      const indicator = screen.getByTestId('language-match-indicator');
      expect(indicator).toHaveTextContent('No Match');
    });

    it('should determine best match quality as "Perfect" when any country has Perfect match', () => {
      render(<VpnRecommendationCard recommendation={mockRecommendation} />);

      // Should show "Perfect Match" since US has Perfect quality
      const indicator = screen.getByTestId('language-match-indicator');
      expect(indicator).toHaveTextContent('Perfect Match');
    });

    it('should determine best match quality as "Good" when no Perfect but has Good', () => {
      const recommendationWithGoodMatch: VpnRecommendationData = {
        vpnName: 'TestVPN',
        countries: [
          {
            countryCode: 'DE',
            countryName: 'Germany',
            audioLanguages: ['de'],
            subtitleLanguages: ['en'],
            matchQuality: 'Good',
          },
          {
            countryCode: 'FR',
            countryName: 'France',
            audioLanguages: ['fr'],
            subtitleLanguages: ['en'],
            matchQuality: 'Partial',
          },
        ],
        overallScore: 4.0,
      };

      render(<VpnRecommendationCard recommendation={recommendationWithGoodMatch} />);

      // Should show "Good Match" (Good > Partial)
      const indicator = screen.getByTestId('language-match-indicator');
      expect(indicator).toHaveTextContent('Good Match');
    });

    it('should apply custom className to the card', () => {
      const customClass = 'custom-vpn-card';
      const { container } = render(
        <VpnRecommendationCard
          recommendation={mockRecommendation}
          className={customClass}
        />
      );

      const card = container.querySelector('[data-testid="vpn-recommendation-card"]');
      expect(card?.className).toContain(customClass);
    });
  });

  // Additional test: Single country display
  describe('Single Country Handling', () => {
    it('should show singular "country" when only one country available', () => {
      const singleCountryRecommendation: VpnRecommendationData = {
        vpnName: 'SingleVPN',
        countries: [
          {
            countryCode: 'CA',
            countryName: 'Canada',
            audioLanguages: ['en', 'fr'],
            subtitleLanguages: ['en'],
            matchQuality: 'Perfect',
          },
        ],
        overallScore: 4.5,
      };

      render(<VpnRecommendationCard recommendation={singleCountryRecommendation} />);

      // Should show "1 country available" (singular)
      expect(screen.getByText(/1 country available/i)).toBeInTheDocument();
    });
  });
});
