import React from 'react';
import { render } from '@testing-library/react-native';
import { StreamingServiceIcon } from '../../subscription/StreamingServiceIcon';
import { ThemeProvider } from '../../../theme/ThemeProvider';

// Mock the assets module
jest.mock('@/assets', () => ({
  STREAMING_LOGOS: {
    netflix: { id: 'netflix', color: '#E50914', icon: '🎬' },
    hbo: { id: 'hbo', color: '#5822B4', icon: '🎭' },
    disney: { id: 'disney', color: '#113CCF', icon: '🏰' },
    amazon: { id: 'amazon', color: '#00A8E1', icon: '📦' },
    hulu: { id: 'hulu', color: '#1CE783', icon: '🟢' },
  },
  getStreamingLogo: (serviceId: string) => {
    const logos: Record<string, { id: string; color: string; icon: string }> = {
      netflix: { id: 'netflix', color: '#E50914', icon: '🎬' },
      hbo: { id: 'hbo', color: '#5822B4', icon: '🎭' },
      disney: { id: 'disney', color: '#113CCF', icon: '🏰' },
      amazon: { id: 'amazon', color: '#00A8E1', icon: '📦' },
      hulu: { id: 'hulu', color: '#1CE783', icon: '🟢' },
    };
    return logos[serviceId] || null;
  },
  hasStreamingLogo: (serviceId: string): boolean => {
    const logos = ['netflix', 'hbo', 'disney', 'amazon', 'hulu'];
    return logos.includes(serviceId);
  },
}));

// Wrapper with theme
const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider>{component}</ThemeProvider>);
};

describe('StreamingServiceIcon - Logo Integration', () => {
  describe('Rendering with Logos', () => {
    it('renders logo icon for known service with logo', () => {
      const { getByTestId } = renderWithTheme(
        <StreamingServiceIcon serviceId="netflix" />
      );

      // Should render a logo icon
      const logo = getByTestId('streaming-logo-image');
      expect(logo).toBeTruthy();
    });

    it('renders fallback emoji for unknown service', () => {
      const { getByText } = renderWithTheme(
        <StreamingServiceIcon serviceId="unknown-service" />
      );

      // Should show fallback emoji
      const fallback = getByText('📺');
      expect(fallback).toBeTruthy();
    });

    it('uses correct logo icon from STREAMING_LOGOS', () => {
      const { getByTestId, getByText } = renderWithTheme(
        <StreamingServiceIcon serviceId="netflix" />
      );

      const logo = getByTestId('streaming-logo-image');
      expect(logo).toBeTruthy();
      // Netflix should show the movie camera emoji
      expect(getByText('🎬')).toBeTruthy();
    });
  });

  describe('Size Variants', () => {
    it('renders small size (32px)', () => {
      const { getByTestId } = renderWithTheme(
        <StreamingServiceIcon serviceId="netflix" size="small" />
      );

      const container = getByTestId('streaming-icon-container');
      const style = Array.isArray(container.props.style)
        ? Object.assign({}, ...container.props.style)
        : container.props.style;
      expect(style.width).toBe(32);
      expect(style.height).toBe(32);
    });

    it('renders medium size (48px)', () => {
      const { getByTestId } = renderWithTheme(
        <StreamingServiceIcon serviceId="hbo" size="medium" />
      );

      const container = getByTestId('streaming-icon-container');
      const style = Array.isArray(container.props.style)
        ? Object.assign({}, ...container.props.style)
        : container.props.style;
      expect(style.width).toBe(48);
      expect(style.height).toBe(48);
    });

    it('renders large size (64px)', () => {
      const { getByTestId } = renderWithTheme(
        <StreamingServiceIcon serviceId="disney" size="large" />
      );

      const container = getByTestId('streaming-icon-container');
      const style = Array.isArray(container.props.style)
        ? Object.assign({}, ...container.props.style)
        : container.props.style;
      expect(style.width).toBe(64);
      expect(style.height).toBe(64);
    });
  });

  describe('Theme Integration', () => {
    it('applies theme colors for fallback', () => {
      const { getByTestId } = renderWithTheme(
        <StreamingServiceIcon serviceId="unknown-service" />
      );

      const container = getByTestId('streaming-icon-container');
      const style = Array.isArray(container.props.style)
        ? Object.assign({}, ...container.props.style)
        : container.props.style;
      // Should have backgroundColor from theme
      expect(style.backgroundColor).toBeDefined();
    });

    it('applies theme shadows to logo container', () => {
      const { getByTestId } = renderWithTheme(
        <StreamingServiceIcon serviceId="netflix" />
      );

      const container = getByTestId('streaming-icon-container');
      const style = Array.isArray(container.props.style)
        ? Object.assign({}, ...container.props.style)
        : container.props.style;
      expect(style.shadowColor).toBeDefined();
      expect(style.elevation).toBeDefined();
    });
  });

  describe('Service Name Display', () => {
    it('shows service name when showName is true', () => {
      const { getByText } = renderWithTheme(
        <StreamingServiceIcon serviceId="netflix" showName={true} />
      );

      expect(getByText('Netflix')).toBeTruthy();
    });

    it('hides service name when showName is false', () => {
      const { queryByText } = renderWithTheme(
        <StreamingServiceIcon serviceId="netflix" showName={false} />
      );

      expect(queryByText('Netflix')).toBeNull();
    });
  });

  describe('Integration with POPULAR_SERVICES', () => {
    const services = ['netflix', 'hbo', 'disney', 'amazon', 'hulu'];

    services.forEach(serviceId => {
      it(`maps ${serviceId} to correct logo asset`, () => {
        const { getByTestId } = renderWithTheme(
          <StreamingServiceIcon serviceId={serviceId} />
        );

        const logoIcon = getByTestId('streaming-logo-image');
        expect(logoIcon).toBeTruthy();
        // Logo icon should have text content (emoji)
        expect(logoIcon.props.children).toBeTruthy();
      });
    });

    it('falls back gracefully for missing logo', () => {
      const { getByText } = renderWithTheme(
        <StreamingServiceIcon serviceId="service-without-logo" />
      );

      // Should render fallback emoji
      const fallback = getByText('📺');
      expect(fallback).toBeTruthy();
    });
  });

  describe('Logo Icon Properties', () => {
    it('renders logo icon with proper styling', () => {
      const { getByTestId } = renderWithTheme(
        <StreamingServiceIcon serviceId="netflix" />
      );

      const logoIcon = getByTestId('streaming-logo-image');
      expect(logoIcon).toBeTruthy();
      expect(logoIcon.props.style).toBeDefined();
    });

    it('has accessible testID for testing', () => {
      const { getByTestId } = renderWithTheme(
        <StreamingServiceIcon serviceId="netflix" />
      );

      expect(getByTestId('streaming-logo-image')).toBeTruthy();
      expect(getByTestId('streaming-icon-container')).toBeTruthy();
    });
  });
});
