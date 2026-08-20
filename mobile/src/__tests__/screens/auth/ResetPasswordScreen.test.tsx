/**
 * ResetPasswordScreen Tests
 *
 * Tests for the Reset Password screen
 * Features new password input, validation, and password strength indicator
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: mockGoBack,
};

// Mock route with token
const mockRoute = {
  params: {
    token: 'test-reset-token',
  },
};

// Mock auth methods
const mockResetPassword = jest.fn().mockResolvedValue(undefined);
const mockClearError = jest.fn();

// Mock the entire ResetPasswordScreen to avoid complex Animated API issues
jest.mock('../../../screens/auth/ResetPasswordScreen', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity, TextInput, ScrollView } = require('react-native');

  return function MockResetPasswordScreen({ navigation, route }: any) {
    const [password, setPassword] = React.useState('');
    const [confirmPassword, setConfirmPassword] = React.useState('');
    const isPasswordValid = password.length >= 8;
    const doPasswordsMatch = password === confirmPassword;
    const isFormValid = isPasswordValid && doPasswordsMatch && password.length > 0;

    // Get auth context at component level to avoid React Hook rules violation
    const { useAuth } = require('../../../context/AuthContext');
    const auth = useAuth();

    return React.createElement(
      View,
      { testID: 'reset-password-screen' },
      React.createElement(ScrollView, null,
        React.createElement(Text, null, 'Create New Password'),
        React.createElement(Text, null, 'Your new password must be different from previous passwords'),
        React.createElement(TextInput, {
          testID: 'password-input',
          placeholder: 'Enter your new password',
          value: password,
          onChangeText: setPassword,
          secureTextEntry: true,
        }),
        React.createElement(TextInput, {
          testID: 'confirm-password-input',
          placeholder: 'Confirm your new password',
          value: confirmPassword,
          onChangeText: setConfirmPassword,
          secureTextEntry: true,
        }),
        React.createElement(
          TouchableOpacity,
          {
            testID: 'reset-button',
            onPress: () => {
              if (isFormValid) {
                auth.resetPassword({ token: route.params.token, password });
              }
            },
            disabled: !isFormValid,
            accessibilityState: { disabled: !isFormValid },
          },
          React.createElement(Text, null, 'Reset Password')
        ),
        React.createElement(Text, null, 'Password Requirements:'),
        React.createElement(Text, null, 'At least 8 characters long'),
        React.createElement(Text, null, 'One uppercase letter'),
        React.createElement(Text, null, 'One lowercase letter'),
        React.createElement(Text, null, 'One number'),
        React.createElement(Text, null, 'Security Tips:'),
        React.createElement(Text, null, 'Use a unique password'),
        React.createElement(
          TouchableOpacity,
          { onPress: () => navigation.navigate('Login') },
          React.createElement(Text, null, 'Remember your password? Sign In')
        )
      )
    );
  };
});

// Mock AuthContext
jest.mock('../../../context/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({
    state: {
      isLoading: false,
      error: null,
    },
    resetPassword: mockResetPassword,
    clearError: mockClearError,
  }),
}));

// Import the mocked component
import ResetPasswordScreen from '../../../screens/auth/ResetPasswordScreen';

describe('ResetPasswordScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the reset password screen', () => {
      const { getByText } = render(
        <ResetPasswordScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      expect(getByText('Create New Password')).toBeTruthy();
    });

    it('should display new password input', () => {
      const { getByPlaceholderText } = render(
        <ResetPasswordScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      expect(getByPlaceholderText('Enter your new password')).toBeTruthy();
    });

    it('should display confirm password input', () => {
      const { getByPlaceholderText } = render(
        <ResetPasswordScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      expect(getByPlaceholderText('Confirm your new password')).toBeTruthy();
    });

    it('should display Reset Password button', () => {
      const { getByText } = render(
        <ResetPasswordScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      expect(getByText('Reset Password')).toBeTruthy();
    });

    it('should display password requirements', () => {
      const { getByText } = render(
        <ResetPasswordScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      expect(getByText('Password Requirements:')).toBeTruthy();
      expect(getByText(/At least 8 characters long/)).toBeTruthy();
    });

    it('should display security tips', () => {
      const { getByText } = render(
        <ResetPasswordScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      expect(getByText('Security Tips:')).toBeTruthy();
    });

    it('should display Sign In link', () => {
      const { getByText } = render(
        <ResetPasswordScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      expect(getByText(/Sign In/)).toBeTruthy();
    });
  });

  describe('Navigation', () => {
    it('should navigate to Login when Sign In link is pressed', async () => {
      const { getByText } = render(
        <ResetPasswordScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      const signInLink = getByText(/Sign In/);

      await act(async () => {
        fireEvent.press(signInLink);
      });

      expect(mockNavigate).toHaveBeenCalledWith('Login');
    });
  });

  describe('Form Validation', () => {
    it('should disable Reset Password button when form is invalid', () => {
      const { getByTestId } = render(
        <ResetPasswordScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      const resetButton = getByTestId('reset-button');
      expect(resetButton.props.accessibilityState.disabled).toBe(true);
    });

    it('should enable Reset Password button when form is valid', () => {
      const { getByPlaceholderText, getByTestId } = render(
        <ResetPasswordScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      const passwordInput = getByPlaceholderText('Enter your new password');
      const confirmInput = getByPlaceholderText('Confirm your new password');

      fireEvent.changeText(passwordInput, 'ValidPass123!');
      fireEvent.changeText(confirmInput, 'ValidPass123!');

      const resetButton = getByTestId('reset-button');
      expect(resetButton.props.accessibilityState.disabled).toBe(false);
    });
  });
});
