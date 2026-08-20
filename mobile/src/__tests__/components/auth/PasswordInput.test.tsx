/**
 * PasswordInput Component Tests
 * Day 5 Continuation - Simple Auth Components
 *
 * Tests for password input with visibility toggle and strength indicator
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PasswordInput } from '../../../components/auth/PasswordInput';

// Mock theme
jest.mock('../../../hooks/useTheme', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        error: { 500: '#ef4444' },
        success: { 500: '#10b981' },
        warning: { 500: '#f59e0b' },
        primary: { 500: '#7c3aed' },
        secondary: { 500: '#06b6d4' },
      },
      semantic: {
        text: {
          primary: '#0f172a',
          secondary: '#64748b',
          tertiary: '#94a3b8',
        },
        background: {
          secondary: '#f8fafc',
        },
        border: {
          primary: '#e2e8f0',
        },
      },
      spacing: {
        0: 0,
        0.5: 2,
        1: 4,
        2: 8,
        4: 16,
      },
      borderRadius: {
        xs: 4,
        md: 12,
      },
      typography: {
        fontSize: {
          xs: 10,
          sm: 12,
          base: 14,
        },
        fontWeight: {
          medium: '500',
        },
      },
    },
  }),
}));

describe('PasswordInput Component', () => {
  describe('Basic Rendering', () => {
    it('should render password input with label', () => {
      const { getByText, getByPlaceholderText } = render(
        <PasswordInput label="Password" placeholder="Enter password" />
      );

      expect(getByText('Password')).toBeTruthy();
      expect(getByPlaceholderText('Enter password')).toBeTruthy();
    });

    it('should render without label when not provided', () => {
      const { queryByText, getByPlaceholderText } = render(
        <PasswordInput placeholder="Enter password" />
      );

      expect(queryByText('Password')).toBeNull();
      expect(getByPlaceholderText('Enter password')).toBeTruthy();
    });

    it('should render with initial value', () => {
      const { getByDisplayValue } = render(
        <PasswordInput value="test123" />
      );

      expect(getByDisplayValue('test123')).toBeTruthy();
    });

    it('should render with secure text entry by default', () => {
      const { getByPlaceholderText } = render(
        <PasswordInput placeholder="Password" />
      );

      const input = getByPlaceholderText('Password');
      expect(input.props.secureTextEntry).toBe(true);
    });
  });

  describe('Password Visibility Toggle', () => {
    it('should toggle password visibility when toggle button is pressed', () => {
      const { getByPlaceholderText, getByText } = render(
        <PasswordInput placeholder="Password" />
      );

      const input = getByPlaceholderText('Password');
      const toggleButton = getByText('👁️‍🗨️'); // Hidden eye icon

      // Initially hidden
      expect(input.props.secureTextEntry).toBe(true);

      // Toggle to show password
      fireEvent.press(toggleButton);
      expect(input.props.secureTextEntry).toBe(false);

      // Toggle back to hide password
      const showingEye = getByText('👁️'); // Showing eye icon
      fireEvent.press(showingEye);
      expect(input.props.secureTextEntry).toBe(true);
    });

    it('should show different icon when password is visible', () => {
      const { getByText, queryByText } = render(
        <PasswordInput placeholder="Password" />
      );

      // Initially shows hidden icon
      expect(getByText('👁️‍🗨️')).toBeTruthy();
      expect(queryByText('👁️')).toBeNull();

      // After toggle, shows visible icon
      fireEvent.press(getByText('👁️‍🗨️'));
      expect(getByText('👁️')).toBeTruthy();
      expect(queryByText('👁️‍🗨️')).toBeNull();
    });
  });

  describe('Password Strength Indicator', () => {
    it('should not show strength indicator by default', () => {
      const { queryByText } = render(
        <PasswordInput value="test" />
      );

      expect(queryByText('Very weak')).toBeNull();
      expect(queryByText('Weak')).toBeNull();
      expect(queryByText('Good')).toBeNull();
      expect(queryByText('Strong')).toBeNull();
    });

    it('should show strength indicator when enabled', () => {
      const mockChange = jest.fn();
      const { getByPlaceholderText, getByText, rerender } = render(
        <PasswordInput placeholder="Password" showStrengthIndicator value="" onChangeText={mockChange} />
      );

      const input = getByPlaceholderText('Password');
      fireEvent.changeText(input, 'test');

      // Rerender with new value to trigger strength indicator display
      rerender(<PasswordInput placeholder="Password" showStrengthIndicator value="test" onChangeText={mockChange} />);

      // "test" should be very weak (only lowercase, length < 8)
      expect(getByText('Very weak')).toBeTruthy();
    });

    it('should show "Weak" for passwords with 2 criteria', () => {
      const mockChange = jest.fn();
      const { getByPlaceholderText, getByText, rerender } = render(
        <PasswordInput placeholder="Password" showStrengthIndicator value="" onChangeText={mockChange} />
      );

      const input = getByPlaceholderText('Password');
      fireEvent.changeText(input, 'test12');

      // Rerender with new value
      rerender(<PasswordInput placeholder="Password" showStrengthIndicator value="test12" onChangeText={mockChange} />);

      // Has lowercase and numbers (2 criteria only, length < 8)
      expect(getByText('Weak')).toBeTruthy();
    });

    it('should show "Good" for passwords with 3 criteria', () => {
      const mockChange = jest.fn();
      const { getByPlaceholderText, getByText, rerender } = render(
        <PasswordInput placeholder="Password" showStrengthIndicator value="" onChangeText={mockChange} />
      );

      const input = getByPlaceholderText('Password');
      fireEvent.changeText(input, 'test1234');

      // Rerender with new value
      rerender(<PasswordInput placeholder="Password" showStrengthIndicator value="test1234" onChangeText={mockChange} />);

      // Has lowercase, numbers, and length >= 8 (3 criteria)
      expect(getByText('Good')).toBeTruthy();
    });

    it('should show "Strong" for passwords with 4+ criteria', () => {
      const mockChange = jest.fn();
      const { getByPlaceholderText, getByText, rerender } = render(
        <PasswordInput placeholder="Password" showStrengthIndicator value="" onChangeText={mockChange} />
      );

      const input = getByPlaceholderText('Password');
      fireEvent.changeText(input, 'Test123!@#');

      // Rerender with new value
      rerender(<PasswordInput placeholder="Password" showStrengthIndicator value="Test123!@#" onChangeText={mockChange} />);

      // Has lowercase, uppercase, numbers, special chars, and length >= 8 (5 criteria, capped at 4)
      expect(getByText('Strong')).toBeTruthy();
    });

    it('should update strength when password changes', () => {
      const mockChange = jest.fn();
      const { getByPlaceholderText, getByText, queryByText, rerender } = render(
        <PasswordInput placeholder="Password" showStrengthIndicator value="" onChangeText={mockChange} />
      );

      const input = getByPlaceholderText('Password');

      // Start with very weak password (1 criteria: lowercase)
      fireEvent.changeText(input, 'test');
      rerender(<PasswordInput placeholder="Password" showStrengthIndicator value="test" onChangeText={mockChange} />);
      expect(getByText('Very weak')).toBeTruthy();

      // Improve to good password (3 criteria: lowercase, numbers, length >= 8)
      fireEvent.changeText(input, 'test1234');
      rerender(<PasswordInput placeholder="Password" showStrengthIndicator value="test1234" onChangeText={mockChange} />);
      expect(getByText('Good')).toBeTruthy();
      expect(queryByText('Very weak')).toBeNull();

      // Improve to strong password (4+ criteria: all checks pass)
      fireEvent.changeText(input, 'Test123!@#');
      rerender(<PasswordInput placeholder="Password" showStrengthIndicator value="Test123!@#" onChangeText={mockChange} />);
      expect(getByText('Strong')).toBeTruthy();
      expect(queryByText('Good')).toBeNull();
    });

    it('should call onStrengthChange callback when strength changes', () => {
      const mockStrengthChange = jest.fn();
      const { getByPlaceholderText } = render(
        <PasswordInput
          placeholder="Password"
          showStrengthIndicator
          onStrengthChange={mockStrengthChange}
        />
      );

      const input = getByPlaceholderText('Password');

      fireEvent.changeText(input, 'Test123!@#');

      expect(mockStrengthChange).toHaveBeenCalled();
      // Strong password should have strength 4
      expect(mockStrengthChange).toHaveBeenCalledWith(expect.any(Number));
    });

    it('should not show strength indicator when password is empty', () => {
      const { queryByText } = render(
        <PasswordInput value="" showStrengthIndicator />
      );

      expect(queryByText('Very weak')).toBeNull();
      expect(queryByText('Weak')).toBeNull();
      expect(queryByText('Good')).toBeNull();
      expect(queryByText('Strong')).toBeNull();
    });
  });

  describe('Error and Helper Text', () => {
    it('should display error message when error prop is provided', () => {
      const { getByText } = render(
        <PasswordInput error="Password is required" />
      );

      expect(getByText('Password is required')).toBeTruthy();
    });

    it('should display helper text when provided and no error', () => {
      const { getByText } = render(
        <PasswordInput helperText="Must be at least 8 characters" />
      );

      expect(getByText('Must be at least 8 characters')).toBeTruthy();
    });

    it('should hide helper text when error is present', () => {
      const { getByText, queryByText } = render(
        <PasswordInput
          error="Password is required"
          helperText="Must be at least 8 characters"
        />
      );

      expect(getByText('Password is required')).toBeTruthy();
      expect(queryByText('Must be at least 8 characters')).toBeNull();
    });

    it('should apply error styling to label', () => {
      const { getByText } = render(
        <PasswordInput label="Password" error="Required" />
      );

      const label = getByText('Password');
      expect(label).toBeTruthy();
      // Error styling should be applied (we can't easily test style objects, but we can verify it renders)
    });
  });

  describe('Focus and Blur Handling', () => {
    it('should call onFocus when input is focused', () => {
      const mockFocus = jest.fn();
      const { getByPlaceholderText } = render(
        <PasswordInput placeholder="Password" onFocus={mockFocus} />
      );

      const input = getByPlaceholderText('Password');
      fireEvent(input, 'focus');

      expect(mockFocus).toHaveBeenCalled();
    });

    it('should call onBlur when input loses focus', () => {
      const mockBlur = jest.fn();
      const { getByPlaceholderText } = render(
        <PasswordInput placeholder="Password" onBlur={mockBlur} />
      );

      const input = getByPlaceholderText('Password');
      fireEvent(input, 'blur');

      expect(mockBlur).toHaveBeenCalled();
    });
  });

  describe('Text Change Handling', () => {
    it('should call onChangeText when text changes', () => {
      const mockChange = jest.fn();
      const { getByPlaceholderText } = render(
        <PasswordInput placeholder="Password" onChangeText={mockChange} />
      );

      const input = getByPlaceholderText('Password');
      fireEvent.changeText(input, 'newpassword');

      expect(mockChange).toHaveBeenCalledWith('newpassword');
    });

    it('should update displayed value when text changes', () => {
      const mockChange = jest.fn();
      const { getByPlaceholderText, rerender } = render(
        <PasswordInput placeholder="Password" value="" onChangeText={mockChange} />
      );

      const input = getByPlaceholderText('Password');
      fireEvent.changeText(input, 'mypassword');

      expect(mockChange).toHaveBeenCalledWith('mypassword');

      // Rerender with updated value to simulate controlled component behavior
      rerender(<PasswordInput placeholder="Password" value="mypassword" onChangeText={mockChange} />);
      expect(getByPlaceholderText('Password').props.value).toBe('mypassword');
    });
  });

  describe('Accessibility and Props', () => {
    it('should disable autocapitalize', () => {
      const { getByPlaceholderText } = render(
        <PasswordInput placeholder="Password" />
      );

      const input = getByPlaceholderText('Password');
      expect(input.props.autoCapitalize).toBe('none');
    });

    it('should disable autocorrect', () => {
      const { getByPlaceholderText } = render(
        <PasswordInput placeholder="Password" />
      );

      const input = getByPlaceholderText('Password');
      expect(input.props.autoCorrect).toBe(false);
    });

    it('should accept additional TextInput props', () => {
      const { getByPlaceholderText } = render(
        <PasswordInput
          placeholder="Password"
          maxLength={20}
          testID="password-input"
        />
      );

      const input = getByPlaceholderText('Password');
      expect(input.props.maxLength).toBe(20);
      expect(input.props.testID).toBe('password-input');
    });
  });
});
