/**
 * StreamingServiceSelectionScreen Tests
 *
 * Tests for the Streaming Service Selection onboarding screen
 * Features service selection and preference saving
 */

import React from 'react';
import { renderWithProviders, fireEvent, waitFor, act } from '../../utils/test-helpers';
import { StreamingServiceSelectionScreen } from '../../../screens/onboarding/StreamingServiceSelectionScreen';

// Mock Banner component to avoid Animated.multiply issue
jest.mock('react-native-paper', () => {
  const RNP = jest.requireActual('react-native-paper');
  const { View, Text } = require('react-native');
  return {
    ...RNP,
    Banner: ({ visible, children, icon }: any) => {
      if (!visible) return null;
      return (
        <View testID="banner">
          {icon && <Text testID="banner-icon">{icon}</Text>}
          {children}
        </View>
      );
    },
  };
});

// Mock navigation
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockNavigation = {
  goBack: mockGoBack,
  navigate: mockNavigate,
};

// Mock useStreamingServices hook
const mockSelectService = jest.fn();
const mockDeselectService = jest.fn();
const mockSavePreferences = jest.fn().mockResolvedValue(undefined);

jest.mock('../../../hooks/useStreamingServices', () => ({
  useStreamingServices: () => ({
    selectedServices: ['netflix', 'disney'],
    selectService: mockSelectService,
    deselectService: mockDeselectService,
    savePreferences: mockSavePreferences,
    isSaving: false,
    hasUnsavedChanges: false,
  }),
}));

// Mock ServiceSelector component
jest.mock('../../../components/streaming/ServiceSelector', () => ({
  ServiceSelector: ({ onToggleService }: any) => {
    const { View, Text, TouchableOpacity } = require('react-native');
    return (
      <View testID="service-selector">
        <TouchableOpacity testID="service-netflix" onPress={() => onToggleService('netflix')}>
          <Text>Netflix</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="service-disney" onPress={() => onToggleService('disney')}>
          <Text>Disney+</Text>
        </TouchableOpacity>
      </View>
    );
  },
}));

describe('StreamingServiceSelectionScreen', () => {
  const defaultRoute = {
    params: {
      isOnboarding: true,
      userId: '123',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the screen', () => {
      const { getByText } = renderWithProviders(
        <StreamingServiceSelectionScreen
          navigation={mockNavigation as any}
          route={defaultRoute as any}
        />
      );

      expect(getByText(/Select Your Streaming Services/)).toBeTruthy();
    });

    it('should display service selector', () => {
      const { getByTestId } = renderWithProviders(
        <StreamingServiceSelectionScreen
          navigation={mockNavigation as any}
          route={defaultRoute as any}
        />
      );

      expect(getByTestId('service-selector')).toBeTruthy();
    });

    it('should display continue button', () => {
      const { getByText } = renderWithProviders(
        <StreamingServiceSelectionScreen
          navigation={mockNavigation as any}
          route={defaultRoute as any}
        />
      );

      expect(getByText('Continue')).toBeTruthy();
    });
  });

  describe('Service Selection', () => {
    it('should call selectService when unselected service is toggled', async () => {
      const { getByTestId } = renderWithProviders(
        <StreamingServiceSelectionScreen
          navigation={mockNavigation as any}
          route={defaultRoute as any}
        />
      );

      const netflixService = getByTestId('service-netflix');

      await act(async () => {
        fireEvent.press(netflixService);
      });

      expect(mockDeselectService).toHaveBeenCalledWith('netflix');
    });
  });

  describe('Navigation', () => {
    it('should navigate to ContentPreferences on continue in onboarding mode', async () => {
      jest.useFakeTimers();

      const { getByText } = renderWithProviders(
        <StreamingServiceSelectionScreen
          navigation={mockNavigation as any}
          route={defaultRoute as any}
        />
      );

      const continueButton = getByText('Continue');

      await act(async () => {
        fireEvent.press(continueButton);
      });

      await waitFor(() => {
        expect(mockSavePreferences).toHaveBeenCalled();
      });

      act(() => {
        jest.advanceTimersByTime(1500);
      });

      expect(mockNavigate).toHaveBeenCalledWith('ContentPreferences');

      jest.useRealTimers();
    });

    it('should go back when not in onboarding mode', async () => {
      jest.useFakeTimers();

      const nonOnboardingRoute = {
        params: {
          isOnboarding: false,
          userId: '123',
        },
      };

      const { getByText } = renderWithProviders(
        <StreamingServiceSelectionScreen
          navigation={mockNavigation as any}
          route={nonOnboardingRoute as any}
        />
      );

      const continueButton = getByText('Save Changes');

      await act(async () => {
        fireEvent.press(continueButton);
      });

      act(() => {
        jest.advanceTimersByTime(1500);
      });

      expect(mockGoBack).toHaveBeenCalled();

      jest.useRealTimers();
    });
  });
});
