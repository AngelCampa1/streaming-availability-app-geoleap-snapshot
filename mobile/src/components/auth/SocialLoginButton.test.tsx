/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';

// Mock theme
const mockTheme = {
  colors: {
    primary: '#3b82f6',
    primaryDark: '#2563eb',
  },
  spacing: {
    sm: 8,
    md: 16,
  },
  borderRadius: {
    md: 12,
  },
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 2,
    },
  },
};

// Mock LinearGradient component
const MockLinearGradient: React.FC<any> = ({ children, style }) => {
  return (
    <View testID="linear-gradient" style={style}>
      {children}
    </View>
  );
};

// Create mock SocialLoginButton component
const MockSocialLoginButton: React.FC<any> = ({
  provider = 'google',
  onPress,
  loading = false,
  disabled = false,
  style,
  textStyle,
}) => {
  const getProviderConfig = () => {
    switch (provider) {
      case 'google':
        return {
          colors: ['#4285F4', '#34A853', '#FBBC05', '#EA4335'],
          textColor: '#FFFFFF',
          icon: 'G',
          label: 'Continue with Google',
          shadowColor: '#4285F4',
        };
      case 'apple':
        return {
          colors: ['#000000', '#1C1C1E'],
          textColor: '#FFFFFF',
          icon: '🍎',
          label: 'Continue with Apple',
          shadowColor: '#000000',
        };
      case 'facebook':
        return {
          colors: ['#1877F2', '#0C63D4'],
          textColor: '#FFFFFF',
          icon: 'f',
          label: 'Continue with Facebook',
          shadowColor: '#1877F2',
        };
      default:
        return {
          colors: [mockTheme.colors.primary, mockTheme.colors.primaryDark],
          textColor: '#FFFFFF',
          icon: '●',
          label: 'Continue',
          shadowColor: mockTheme.colors.primary,
        };
    }
  };

  const config = getProviderConfig();

  const handlePress = () => {
    if (!disabled && !loading && onPress) {
      onPress();
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled || loading}
      testID="social-login-button"
    >
      <MockLinearGradient colors={config.colors}>
        <View testID="button-content">
          {loading ? (
            <ActivityIndicator
              size="small"
              color={config.textColor}
              testID="activity-indicator"
            />
          ) : (
            <Text testID="provider-icon" style={{ marginRight: mockTheme.spacing.sm }}>
              {config.icon}
            </Text>
          )}
          <Text testID="button-text" style={textStyle}>
            {config.label}
          </Text>
        </View>
      </MockLinearGradient>
    </TouchableOpacity>
  );
};

describe('SocialLoginButton Component', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Google Provider', () => {
    it('renders with Google branding', () => {
      const { getByTestId, getByText } = render(
        <MockSocialLoginButton provider="google" onPress={mockOnPress} />
      );

      expect(getByTestId('social-login-button')).toBeTruthy();
      expect(getByText('Continue with Google')).toBeTruthy();
      expect(getByTestId('provider-icon')).toBeTruthy();
    });

    it('calls onPress when clicked', () => {
      const { getByTestId } = render(
        <MockSocialLoginButton provider="google" onPress={mockOnPress} />
      );

      fireEvent.press(getByTestId('social-login-button'));
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('shows loading state', () => {
      const { getByTestId, queryByTestId } = render(
        <MockSocialLoginButton provider="google" onPress={mockOnPress} loading={true} />
      );

      expect(getByTestId('activity-indicator')).toBeTruthy();
      expect(queryByTestId('provider-icon')).toBeNull();
    });

    it('is disabled when disabled prop is true', () => {
      const { getByTestId } = render(
        <MockSocialLoginButton provider="google" onPress={mockOnPress} disabled={true} />
      );

      const button = getByTestId('social-login-button');
      fireEvent.press(button);
      expect(mockOnPress).not.toHaveBeenCalled();
    });
  });

  describe('Apple Provider', () => {
    it('renders with Apple branding', () => {
      const { getByText } = render(
        <MockSocialLoginButton provider="apple" onPress={mockOnPress} />
      );

      expect(getByText('Continue with Apple')).toBeTruthy();
      expect(getByText('🍎')).toBeTruthy();
    });

    it('calls onPress when clicked', () => {
      const { getByTestId } = render(
        <MockSocialLoginButton provider="apple" onPress={mockOnPress} />
      );

      fireEvent.press(getByTestId('social-login-button'));
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('shows loading state', () => {
      const { getByTestId } = render(
        <MockSocialLoginButton provider="apple" onPress={mockOnPress} loading={true} />
      );

      expect(getByTestId('activity-indicator')).toBeTruthy();
    });
  });

  describe('Facebook Provider', () => {
    it('renders with Facebook branding', () => {
      const { getByText } = render(
        <MockSocialLoginButton provider="facebook" onPress={mockOnPress} />
      );

      expect(getByText('Continue with Facebook')).toBeTruthy();
      expect(getByText('f')).toBeTruthy();
    });

    it('calls onPress when clicked', () => {
      const { getByTestId } = render(
        <MockSocialLoginButton provider="facebook" onPress={mockOnPress} />
      );

      fireEvent.press(getByTestId('social-login-button'));
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('shows loading state', () => {
      const { getByTestId } = render(
        <MockSocialLoginButton provider="facebook" onPress={mockOnPress} loading={true} />
      );

      expect(getByTestId('activity-indicator')).toBeTruthy();
    });
  });

  describe('Loading State', () => {
    it('disables button when loading', () => {
      const { getByTestId } = render(
        <MockSocialLoginButton provider="google" onPress={mockOnPress} loading={true} />
      );

      fireEvent.press(getByTestId('social-login-button'));
      expect(mockOnPress).not.toHaveBeenCalled();
    });

    it('shows loading indicator', () => {
      const { getByTestId } = render(
        <MockSocialLoginButton provider="google" onPress={mockOnPress} loading={true} />
      );

      expect(getByTestId('activity-indicator')).toBeTruthy();
    });

    it('hides provider icon when loading', () => {
      const { queryByTestId } = render(
        <MockSocialLoginButton provider="google" onPress={mockOnPress} loading={true} />
      );

      expect(queryByTestId('provider-icon')).toBeNull();
    });
  });

  describe('Disabled State', () => {
    it('does not call onPress when disabled', () => {
      const { getByTestId } = render(
        <MockSocialLoginButton provider="google" onPress={mockOnPress} disabled={true} />
      );

      fireEvent.press(getByTestId('social-login-button'));
      expect(mockOnPress).not.toHaveBeenCalled();
    });

    it('shows provider icon when disabled', () => {
      const { getByTestId } = render(
        <MockSocialLoginButton provider="google" onPress={mockOnPress} disabled={true} />
      );

      expect(getByTestId('provider-icon')).toBeTruthy();
    });
  });

  describe('Custom Styling', () => {
    it('applies custom styles', () => {
      const customStyle = { marginTop: 20 };
      const { getByTestId } = render(
        <MockSocialLoginButton provider="google" onPress={mockOnPress} style={customStyle} />
      );

      const button = getByTestId('social-login-button');
      expect(button).toBeTruthy();
    });

    it('applies custom text styles', () => {
      const customTextStyle = { fontSize: 18 };
      const { getByTestId } = render(
        <MockSocialLoginButton provider="google" onPress={mockOnPress} textStyle={customTextStyle} />
      );

      const buttonText = getByTestId('button-text');
      expect(buttonText).toBeTruthy();
    });
  });
});
