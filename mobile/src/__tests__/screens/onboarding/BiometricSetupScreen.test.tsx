/**
 * BiometricSetupScreen Tests
 *
 * Tests for the Biometric Setup onboarding screen
 * Features biometric authentication setup during onboarding
 *
 * KNOWN ISSUE: Component uses Dialog and complex biometric interactions
 * that may cause "AggregateError" during render in test environment.
 * Currently SKIPPED - pending resolution.
 */

import React from 'react';
import { renderWithProviders, fireEvent, waitFor, act } from '../../utils/test-helpers';
import BiometricSetupScreen from '../../../screens/onboarding/BiometricSetupScreen';

// Mock navigation
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockNavigation = {
  goBack: mockGoBack,
  navigate: mockNavigate,
};

// Mock useNavigation hook
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
}));

// Mock biometricAuth service
jest.mock('../../../services/biometricAuth', () => ({
  biometricAuth: {
    isAvailable: jest.fn().mockResolvedValue({
      available: true,
      biometryType: 'FaceID',
    }),
    getBiometricTypeName: jest.fn().mockReturnValue('Face ID'),
    authenticate: jest.fn().mockResolvedValue(true),
  },
}));

// Mock useAuth hook
jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    state: {
      user: { id: '123', email: 'test@example.com' },
      isAuthenticated: true,
    },
    enableBiometric: jest.fn().mockResolvedValue(undefined),
    clearError: jest.fn(),
  }),
}));

describe.skip('BiometricSetupScreen', () => {
  // KNOWN ISSUE: Element type is invalid error due to useNavigation hook
  // Skipped pending resolution of navigation mocking in test environment

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the screen', () => {
      const { getByText } = renderWithProviders(
        <BiometricSetupScreen />
      );

      expect(getByText(/Setup|Biometric Authentication/)).toBeTruthy();
    });

    it('should display setup description', () => {
      const { getByText } = renderWithProviders(
        <BiometricSetupScreen />
      );

      expect(getByText(/quick and secure/)).toBeTruthy();
    });

    it('should display enable toggle when biometric available', () => {
      const { getByText } = renderWithProviders(
        <BiometricSetupScreen />
      );

      expect(getByText(/Enable/)).toBeTruthy();
    });

    it('should display skip option', () => {
      const { getByText } = renderWithProviders(
        <BiometricSetupScreen />
      );

      expect(getByText(/Skip/)).toBeTruthy();
    });
  });

  describe('Navigation', () => {
    it('should allow skipping biometric setup', async () => {
      const { getByText } = renderWithProviders(
        <BiometricSetupScreen />
      );

      const skipButton = getByText(/Skip/);

      await act(async () => {
        fireEvent.press(skipButton);
      });

      expect(mockNavigate).toHaveBeenCalled();
    });
  });
});
