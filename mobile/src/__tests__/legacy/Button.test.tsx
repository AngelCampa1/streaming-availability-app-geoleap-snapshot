import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '../../components/common/Button';

// Mock the theme module
jest.mock('../../theme/Theme', () => ({
  theme: {
    colors: {
      primary: '#2196F3',
      secondary: '#FF9800',
      error: '#F44336',
      text: '#212121',
      textDisabled: '#BDBDBD',
      border: '#E0E0E0',
    },
    primaryGradient: ['#2196F3', '#1976D2'],
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
    },
    borderRadius: {
      md: 8,
      lg: 12,
    },
    shadows: {
      sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.22,
        shadowRadius: 2.22,
        elevation: 3,
      },
    },
  },
}));

// Mock LinearGradient
jest.mock('react-native-linear-gradient', () => 'LinearGradient');

describe('Button Component', () => {
  it('renders correctly with basic props', () => {
    const _mockOnPress = jest.fn();
    const { getByText } = render(
      <Button title="Test Button" onPress={mockOnPress} />,
    );

    expect(getByText('Test Button')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const _mockOnPress = jest.fn();
    const { getByText } = render(
      <Button title="Press Me" onPress={mockOnPress} />,
    );

    fireEvent.press(getByText('Press Me'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const _mockOnPress = jest.fn();
    const { getByText } = render(
      <Button title="Disabled Button" onPress={mockOnPress} disabled={true} />,
    );

    fireEvent.press(getByText('Disabled Button'));
    expect(mockOnPress).not.toHaveBeenCalled();
  });

  it('renders loading state correctly', () => {
    const _mockOnPress = jest.fn();
    const { queryByText } = render(
      <Button title="Loading Button" onPress={mockOnPress} loading={true} />,
    );

    // When loading, the title text should not be visible
    expect(queryByText('Loading Button')).toBeFalsy();
  });

  it('renders different variants correctly', () => {
    const _mockOnPress = jest.fn();
    const variants = ['primary', 'secondary', 'outline', 'ghost'];

    variants.forEach(variant => {
      const { getByText } = render(
        <Button title={`${variant} Button`} onPress={mockOnPress} variant={variant} />,
      );
      expect(getByText(`${variant} Button`)).toBeTruthy();
    });
  });

  it('renders different sizes correctly', () => {
    const _mockOnPress = jest.fn();
    const sizes = ['small', 'medium', 'large'];

    sizes.forEach(size => {
      const { getByText } = render(
        <Button title={`${size} Button`} onPress={mockOnPress} size={size} />,
      );
      expect(getByText(`${size} Button`)).toBeTruthy();
    });
  });

  it('renders with icon when provided', () => {
    const _mockOnPress = jest.fn();
    const mockIcon = <div>Icon</div>;

    const { getByText } = render(
      <Button title="With Icon" onPress={mockOnPress} icon={mockIcon} />,
    );

    expect(getByText('With Icon')).toBeTruthy();
  });
});
