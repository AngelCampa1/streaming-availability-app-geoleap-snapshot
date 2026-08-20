/**
 * TDD Tests for StreamingServiceIcon SVG Logo Rendering
 *
 * These tests verify that StreamingServiceIcon renders actual SVG logos
 * instead of emoji text placeholders.
 *
 * RED phase: These tests should FAIL initially because the component
 * currently renders emoji text instead of SVG images.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { StreamingServiceIcon } from '../StreamingServiceIcon';
import { ThemeProvider } from '../../../theme/ThemeProvider';

// Wrapper with theme
const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider>{component}</ThemeProvider>);
};

describe('StreamingServiceIcon - SVG Logo Rendering (TDD)', () => {
  describe('Should render actual SVG logos instead of emoji', () => {
    const popularServices = [
      { id: 'netflix', name: 'Netflix' },
      { id: 'hbo', name: 'HBO Max' },
      { id: 'disney', name: 'Disney+' },
      { id: 'amazon', name: 'Amazon Prime' },
      { id: 'hulu', name: 'Hulu' },
      { id: 'paramount', name: 'Paramount+' },
      { id: 'peacock', name: 'Peacock' },
      { id: 'apple', name: 'Apple TV+' },
      { id: 'youtube', name: 'YouTube Premium' },
    ];

    popularServices.forEach(({ id, name }) => {
      it(`renders SVG logo for ${name} (not emoji text)`, () => {
        const { queryByTestId, UNSAFE_getAllByType } = renderWithTheme(
          <StreamingServiceIcon serviceId={id} />
        );

        // Should have a logo SVG container
        const logoContainer = queryByTestId('streaming-logo-svg');
        expect(logoContainer).toBeTruthy();

        // The logo should be rendered via SvgXml component (from react-native-svg)
        // This test will FAIL until we implement SVG rendering
        try {
          const { SvgXml } = require('react-native-svg');
          const svgElements = UNSAFE_getAllByType(SvgXml);
          expect(svgElements.length).toBeGreaterThan(0);
        } catch {
          // If react-native-svg is not installed yet, check for Image component
          const { Image } = require('react-native');
          const imageElements = UNSAFE_getAllByType(Image);
          // Should have at least one Image component for logo
          expect(imageElements.length).toBeGreaterThan(0);
        }
      });
    });

    it('does NOT render emoji characters for known services', () => {
      const { queryByText } = renderWithTheme(
        <StreamingServiceIcon serviceId="netflix" />
      );

      // These emoji should NOT appear if we're using actual SVG logos
      const emojiPatterns = ['🎬', '🎭', '🏰', '📦', '🟢', '⛰️', '🦚', '🍎', '▶️'];

      emojiPatterns.forEach(emoji => {
        const emojiElement = queryByText(emoji);
        // This assertion will FAIL initially because current impl uses emoji
        expect(emojiElement).toBeNull();
      });
    });
  });

  describe('SVG logo asset loading', () => {
    it('loads SVG content from bundled assets', () => {
      // This test verifies that STREAMING_LOGOS has svg property
      const { getStreamingLogo } = require('@/assets');
      const netflixLogo = getStreamingLogo('netflix');

      expect(netflixLogo).toBeTruthy();
      // Should have svg property with SVG content string
      expect(netflixLogo.svg).toBeDefined();
      expect(typeof netflixLogo.svg).toBe('string');
      expect(netflixLogo.svg).toContain('<svg');
    });

    it('provides SVG content for all popular services', () => {
      const { STREAMING_LOGOS } = require('@/assets');

      const expectedServices = [
        'netflix', 'hbo', 'disney', 'amazon', 'hulu',
        'paramount', 'peacock', 'apple', 'youtube', 'max',
      ];

      expectedServices.forEach(serviceId => {
        const logo = STREAMING_LOGOS[serviceId];
        expect(logo).toBeDefined();
        expect(logo.svg).toBeDefined();
        expect(logo.svg).toContain('<svg');
      });
    });
  });

  describe('Logo rendering with brand colors', () => {
    it('applies brand color as background while showing SVG logo', () => {
      const { getByTestId } = renderWithTheme(
        <StreamingServiceIcon serviceId="netflix" />
      );

      const container = getByTestId('streaming-icon-container');
      const style = Array.isArray(container.props.style)
        ? Object.assign({}, ...container.props.style)
        : container.props.style;

      // Netflix brand color
      expect(style.backgroundColor).toBe('#E50914');
    });
  });
});
