/**
 * VpnSetupGuideScreen Tests
 * Phase 3.2: VPN Screen Tests
 */

import React from 'react';
import { renderWithProviders } from '../../utils/test-helpers';
import { VpnSetupGuideScreen } from '../../../screens/vpn/VpnSetupGuideScreen';
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

// Mock route with no params (defaults to iOS)
const mockRouteDefault = {
  params: {},
};

// Mock route with Android platform
const mockRouteAndroid = {
  params: { platform: 'android' },
};

describe('VpnSetupGuideScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the screen with header', () => {
      const { getByText } = renderWithProviders(
        <VpnSetupGuideScreen navigation={mockNavigation as any} route={mockRouteDefault as any} />
      );

      expect(getByText('VPN Setup Guide')).toBeTruthy();
    });

    it('should display Select Your Device section', () => {
      const { getByText } = renderWithProviders(
        <VpnSetupGuideScreen navigation={mockNavigation as any} route={mockRouteDefault as any} />
      );

      expect(getByText('Select Your Device')).toBeTruthy();
    });

    it('should display platform buttons', () => {
      const { getByText } = renderWithProviders(
        <VpnSetupGuideScreen navigation={mockNavigation as any} route={mockRouteDefault as any} />
      );

      expect(getByText('iOS')).toBeTruthy();
      expect(getByText('Android')).toBeTruthy();
      expect(getByText('Windows')).toBeTruthy();
      expect(getByText('Mac')).toBeTruthy();
    });

    it('should display iOS Setup Guide by default', () => {
      const { getByText } = renderWithProviders(
        <VpnSetupGuideScreen navigation={mockNavigation as any} route={mockRouteDefault as any} />
      );

      expect(getByText('iOS Setup Guide')).toBeTruthy();
    });

    it('should show number of steps', () => {
      const { getByText } = renderWithProviders(
        <VpnSetupGuideScreen navigation={mockNavigation as any} route={mockRouteDefault as any} />
      );

      expect(getByText(/\d+ simple steps to get started/)).toBeTruthy();
    });
  });

  describe('Platform Switching', () => {
    it('should switch to Android guide when Android is selected', async () => {
      const { getByText } = renderWithProviders(
        <VpnSetupGuideScreen navigation={mockNavigation as any} route={mockRouteDefault as any} />
      );

      const androidButton = getByText('Android');
      fireEvent.press(androidButton);

      await waitFor(() => {
        expect(getByText('Android Setup Guide')).toBeTruthy();
      });
    });

    it('should switch to Windows guide when Windows is selected', async () => {
      const { getByText } = renderWithProviders(
        <VpnSetupGuideScreen navigation={mockNavigation as any} route={mockRouteDefault as any} />
      );

      const windowsButton = getByText('Windows');
      fireEvent.press(windowsButton);

      await waitFor(() => {
        expect(getByText('Windows Setup Guide')).toBeTruthy();
      });
    });

    it('should switch to Mac guide when Mac is selected', async () => {
      const { getByText } = renderWithProviders(
        <VpnSetupGuideScreen navigation={mockNavigation as any} route={mockRouteDefault as any} />
      );

      const macButton = getByText('Mac');
      fireEvent.press(macButton);

      await waitFor(() => {
        expect(getByText('macOS Setup Guide')).toBeTruthy();
      });
    });

    it('should use platform from route params', () => {
      const { getByText } = renderWithProviders(
        <VpnSetupGuideScreen navigation={mockNavigation as any} route={mockRouteAndroid as any} />
      );

      expect(getByText('Android Setup Guide')).toBeTruthy();
    });
  });

  describe('Setup Steps', () => {
    it('should display step 1 with Download VPN App', () => {
      const { getByText } = renderWithProviders(
        <VpnSetupGuideScreen navigation={mockNavigation as any} route={mockRouteDefault as any} />
      );

      expect(getByText(/Step 1.*Download VPN App/)).toBeTruthy();
    });

    it('should display multiple steps', () => {
      const { getByText } = renderWithProviders(
        <VpnSetupGuideScreen navigation={mockNavigation as any} route={mockRouteDefault as any} />
      );

      expect(getByText(/Step 1/)).toBeTruthy();
      expect(getByText(/Step 2/)).toBeTruthy();
    });

    it('should expand step when pressed to show tips', async () => {
      const { getByText, queryByText } = renderWithProviders(
        <VpnSetupGuideScreen navigation={mockNavigation as any} route={mockRouteDefault as any} />
      );

      // First step should be expanded by default
      await waitFor(() => {
        expect(getByText('Tips:')).toBeTruthy();
      });
    });
  });

  describe('Help Section', () => {
    it('should display Need More Help section', () => {
      const { getByText } = renderWithProviders(
        <VpnSetupGuideScreen navigation={mockNavigation as any} route={mockRouteDefault as any} />
      );

      expect(getByText('Need More Help?')).toBeTruthy();
    });

    it('should display help description', () => {
      const { getByText } = renderWithProviders(
        <VpnSetupGuideScreen navigation={mockNavigation as any} route={mockRouteDefault as any} />
      );

      expect(getByText(/Contact our support team/)).toBeTruthy();
    });
  });

  describe('Action Buttons', () => {
    it('should display View FAQ button', () => {
      const { getByText } = renderWithProviders(
        <VpnSetupGuideScreen navigation={mockNavigation as any} route={mockRouteDefault as any} />
      );

      expect(getByText('View FAQ')).toBeTruthy();
    });

    it('should display Contact Support button', () => {
      const { getByText } = renderWithProviders(
        <VpnSetupGuideScreen navigation={mockNavigation as any} route={mockRouteDefault as any} />
      );

      expect(getByText('Contact Support')).toBeTruthy();
    });

    it('should display Compare VPN Providers button', () => {
      const { getByText } = renderWithProviders(
        <VpnSetupGuideScreen navigation={mockNavigation as any} route={mockRouteDefault as any} />
      );

      expect(getByText('Compare VPN Providers')).toBeTruthy();
    });
  });

  describe('Navigation', () => {
    it('should navigate back when back button is pressed', () => {
      const { getByLabelText } = renderWithProviders(
        <VpnSetupGuideScreen navigation={mockNavigation as any} route={mockRouteDefault as any} />
      );

      const backButton = getByLabelText('Back');
      fireEvent.press(backButton);

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('should navigate to Help when View FAQ is pressed', () => {
      const { getByText } = renderWithProviders(
        <VpnSetupGuideScreen navigation={mockNavigation as any} route={mockRouteDefault as any} />
      );

      const faqButton = getByText('View FAQ');
      fireEvent.press(faqButton);

      expect(mockNavigate).toHaveBeenCalledWith('Help');
    });

    it('should navigate to Support when Contact Support is pressed', () => {
      const { getByText } = renderWithProviders(
        <VpnSetupGuideScreen navigation={mockNavigation as any} route={mockRouteDefault as any} />
      );

      const supportButton = getByText('Contact Support');
      fireEvent.press(supportButton);

      expect(mockNavigate).toHaveBeenCalledWith('Support');
    });

    it('should navigate to VpnProviderComparison when Compare VPN Providers is pressed', () => {
      const { getByText } = renderWithProviders(
        <VpnSetupGuideScreen navigation={mockNavigation as any} route={mockRouteDefault as any} />
      );

      const compareButton = getByText('Compare VPN Providers');
      fireEvent.press(compareButton);

      expect(mockNavigate).toHaveBeenCalledWith('VpnProviderComparison', {});
    });
  });

  describe('Accessibility', () => {
    it('should have accessible back button', () => {
      const { getByLabelText } = renderWithProviders(
        <VpnSetupGuideScreen navigation={mockNavigation as any} route={mockRouteDefault as any} />
      );

      expect(getByLabelText('Back')).toBeTruthy();
    });
  });
});
