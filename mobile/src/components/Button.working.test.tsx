import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import Button from './Button';

// Mock useTheme hook
jest.mock('../hooks/useTheme', () => {
  const theme = {
    spacing: Array.from({ length: 50 }, (_, i) => i * 4),
    colors: {
      primary: { 100: '#ede9fe', 500: '#7c3aed', 600: '#6d28d9' },
      secondary: { 500: '#f59e0b' },
      error: { 100: '#fee2e2', 500: '#ef4444', 600: '#dc2626' },
      success: { 500: '#10b981', 600: '#059669' },
      warning: { 500: '#f59e0b', 600: '#d97706' },
      neutral: { 100: '#f5f5f5', 200: '#e5e5e5', 300: '#d4d4d4', 500: '#737373', 700: '#404040', 900: '#171717' },
    },
    semantic: {
      text: { primary: '#000000', secondary: '#666666', tertiary: '#999999', inverse: '#ffffff', disabled: '#9ca3af' },
      background: { primary: '#ffffff', secondary: '#f5f5f5' },
      border: { primary: '#e5e5e5' },
    },
    typography: {
      fontSize: { xs: 11, sm: 12, base: 14, md: 14, lg: 16, xl: 18 },
      fontWeight: { normal: '400', medium: '500', semibold: '600', bold: '700' },
      lineHeight: { tight: 1.2, normal: 1.5 },
    },
    borderRadius: { sm: 4, md: 8, lg: 12, xl: 16, full: 9999 },
    shadows: {
      sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
    },
  };
  return {
    useTheme: () => ({ theme }),
    default: () => ({ theme }),
  };
});

describe('Button Component - Working Tests', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    mockOnPress.mockClear();
  });

  describe('Basic Rendering', () => {
    it('renders correctly with title', () => {
      const { getByText } = render(
        <Button title="Test Button" onPress={mockOnPress} />,
      );

      expect(getByText('Test Button')).toBeTruthy();
    });

    it('renders with custom testID', () => {
      const { getByTestId } = render(
        <Button title="Test" onPress={mockOnPress} testID="custom-button" />,
      );

      expect(getByTestId('custom-button')).toBeTruthy();
    });

    it('renders with accessibility props', () => {
      const { getByRole } = render(
        <Button
          title="Test"
          onPress={mockOnPress}
          accessibilityLabel="Test button"
          accessibilityHint="Press to test"
        />,
      );

      const button = getByRole('button');
      // Use toContain to handle potential prefixes added by React Native
      expect(button.props.accessibilityLabel).toContain('Test button');
      expect(button.props.accessibilityHint).toContain('Press to test');
    });
  });

  describe('Interaction', () => {
    it('calls onPress when pressed', () => {
      const { getByText } = render(
        <Button title="Press Me" onPress={mockOnPress} />,
      );

      fireEvent.press(getByText('Press Me'));
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('does not call onPress when disabled', () => {
      const { getByText } = render(
        <Button title="Disabled" onPress={mockOnPress} disabled={true} />,
      );

      fireEvent.press(getByText('Disabled'));
      expect(mockOnPress).not.toHaveBeenCalled();
    });

    it('does not call onPress when loading', () => {
      const { getByTestId } = render(
        <Button title="Loading" onPress={mockOnPress} loading={true} testID="button" />,
      );

      fireEvent.press(getByTestId('button'));
      expect(mockOnPress).not.toHaveBeenCalled();
    });
  });

  describe('Variants', () => {
    it('renders with primary variant', () => {
      const { getByText } = render(
        <Button title="Primary" onPress={mockOnPress} variant="primary" />,
      );

      expect(getByText('Primary')).toBeTruthy();
    });

    it('renders with secondary variant', () => {
      const { getByText } = render(
        <Button title="Secondary" onPress={mockOnPress} variant="secondary" />,
      );

      expect(getByText('Secondary')).toBeTruthy();
    });

    it('renders with danger variant', () => {
      const { getByText } = render(
        <Button title="Danger" onPress={mockOnPress} variant="danger" />,
      );

      expect(getByText('Danger')).toBeTruthy();
    });
  });

  describe('Sizes', () => {
    it('renders with small size', () => {
      const { getByText } = render(
        <Button title="Small" onPress={mockOnPress} size="small" />,
      );

      expect(getByText('Small')).toBeTruthy();
    });

    it('renders with medium size (default)', () => {
      const { getByText } = render(
        <Button title="Medium" onPress={mockOnPress} size="medium" />,
      );

      expect(getByText('Medium')).toBeTruthy();
    });

    it('renders with large size', () => {
      const { getByText } = render(
        <Button title="Large" onPress={mockOnPress} size="large" />,
      );

      expect(getByText('Large')).toBeTruthy();
    });
  });

  describe('States', () => {
    it('renders disabled state', () => {
      const { getByText } = render(
        <Button title="Disabled" onPress={mockOnPress} disabled={true} />,
      );

      expect(getByText('Disabled')).toBeTruthy();
    });

    it('renders loading state', () => {
      const { getByTestId } = render(
        <Button title="Loading" onPress={mockOnPress} loading={true} testID="button" />,
      );

      expect(getByTestId('button')).toBeTruthy();
    });
  });

  describe('Layout Options', () => {
    it('renders full width', () => {
      const { getByText } = render(
        <Button title="Full Width" onPress={mockOnPress} fullWidth={true} />,
      );

      expect(getByText('Full Width')).toBeTruthy();
    });

    it('renders with rounded corners', () => {
      const { getByText } = render(
        <Button title="Rounded" onPress={mockOnPress} rounded={true} />,
      );

      expect(getByText('Rounded')).toBeTruthy();
    });
  });

  describe('Icons', () => {
    it('renders with left icon', () => {
      const LeftIcon = () => <></>;
      const { getByText } = render(
        <Button title="With Icon" onPress={mockOnPress} leftIcon={<LeftIcon />} />,
      );

      expect(getByText('With Icon')).toBeTruthy();
    });

    it('renders with right icon', () => {
      const RightIcon = () => <></>;
      const { getByText } = render(
        <Button title="With Icon" onPress={mockOnPress} rightIcon={<RightIcon />} />,
      );

      expect(getByText('With Icon')).toBeTruthy();
    });
  });
});
