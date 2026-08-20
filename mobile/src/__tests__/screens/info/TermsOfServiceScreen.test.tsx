/**
 * TermsOfServiceScreen Tests
 *
 * Tests for the Terms of Service screen component
 * Simple wrapper component that renders WebViewScreen
 */

import React from 'react';
import { renderWithProviders } from '../../utils/test-helpers';
import { TermsOfServiceScreen } from '../../../screens/info/TermsOfServiceScreen';

// Mock navigation
const mockGoBack = jest.fn();
const mockNavigation = {
  goBack: mockGoBack,
  navigate: jest.fn(),
};

// Mock WebViewScreen component
jest.mock('../../../components/common/WebViewScreen', () => ({
  WebViewScreen: ({ url, title, onClose, showNavigation }: any) => {
    const { View, Text, TouchableOpacity } = require('react-native');
    return (
      <View testID="webview-screen">
        <Text testID="webview-title">{title}</Text>
        <Text testID="webview-url">{url}</Text>
        <Text testID="webview-show-navigation">{showNavigation ? 'true' : 'false'}</Text>
        <TouchableOpacity testID="webview-close" onPress={onClose}>
          <Text>Close</Text>
        </TouchableOpacity>
      </View>
    );
  },
}));

describe('TermsOfServiceScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the WebViewScreen component', () => {
      const { getByTestId } = renderWithProviders(
        <TermsOfServiceScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByTestId('webview-screen')).toBeTruthy();
    });

    it('should pass correct title to WebViewScreen', () => {
      const { getByTestId } = renderWithProviders(
        <TermsOfServiceScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByTestId('webview-title').props.children).toBe('Terms of Service');
    });

    it('should pass correct URL to WebViewScreen', () => {
      const { getByTestId } = renderWithProviders(
        <TermsOfServiceScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByTestId('webview-url').props.children).toBe('https://geoleap.app/terms');
    });

    it('should disable navigation in WebViewScreen', () => {
      const { getByTestId } = renderWithProviders(
        <TermsOfServiceScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByTestId('webview-show-navigation').props.children).toBe('false');
    });
  });

  describe('Navigation', () => {
    it('should call goBack when onClose is triggered', () => {
      const { getByTestId } = renderWithProviders(
        <TermsOfServiceScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const closeButton = getByTestId('webview-close');
      const { fireEvent } = require('@testing-library/react-native');
      fireEvent.press(closeButton);

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });
});
