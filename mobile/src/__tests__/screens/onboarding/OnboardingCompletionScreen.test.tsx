/**
 * OnboardingCompletionScreen Tests
 *
 * Tests for the Onboarding Completion screen
 * Features animated completion UI and setup summary
 */

import React from 'react';
import { renderWithProviders, fireEvent, waitFor, act } from '../../utils/test-helpers';
import { OnboardingCompletionScreen } from '../../../screens/onboarding/OnboardingCompletionScreen';

// Mock navigation
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockReset = jest.fn();
const mockNavigation = {
  goBack: mockGoBack,
  navigate: mockNavigate,
  reset: mockReset,
};

// Mock Animated to avoid animation complexity in tests
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Animated: {
      ...RN.Animated,
      timing: () => ({
        start: (callback?: () => void) => callback && callback(),
      }),
      sequence: () => ({
        start: (callback?: () => void) => callback && callback(),
      }),
      parallel: () => ({
        start: (callback?: () => void) => callback && callback(),
      }),
      Value: jest.fn(() => ({
        setValue: jest.fn(),
        interpolate: jest.fn(() => ({ interpolate: jest.fn() })),
      })),
    },
  };
});

describe('OnboardingCompletionScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the screen', () => {
      const { getByText } = renderWithProviders(
        <OnboardingCompletionScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByText(/You're all set!/)).toBeTruthy();
    });

    it('should display completion message', () => {
      const { getByText } = renderWithProviders(
        <OnboardingCompletionScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByText(/Your GeoLeap profile is ready/)).toBeTruthy();
    });

    it('should display get started button', () => {
      const { getByText } = renderWithProviders(
        <OnboardingCompletionScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByText(/Get Started|Start Exploring|Continue/)).toBeTruthy();
    });
  });

  describe('Setup Items Display', () => {
    it('should display streaming services item', () => {
      const { getByText } = renderWithProviders(
        <OnboardingCompletionScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByText('Streaming Services')).toBeTruthy();
    });

    it('should display content preferences item', () => {
      const { getByText } = renderWithProviders(
        <OnboardingCompletionScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByText('Content Preferences')).toBeTruthy();
    });

    it('should display region settings item', () => {
      const { getByText } = renderWithProviders(
        <OnboardingCompletionScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByText('Region Settings')).toBeTruthy();
    });

    it('should display genre preferences item', () => {
      const { getByText } = renderWithProviders(
        <OnboardingCompletionScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByText('Genre Preferences')).toBeTruthy();
    });
  });

  describe('Navigation', () => {
    it('should navigate to main app on get started', async () => {
      const { getByText } = renderWithProviders(
        <OnboardingCompletionScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const getStartedButton = getByText(/Get Started|Start Exploring|Continue/);

      await act(async () => {
        fireEvent.press(getStartedButton);
      });

      expect(mockReset).toHaveBeenCalled();
    });
  });
});
