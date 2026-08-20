/**
 * ValidationMessage Component Tests
 * Day 5 Continuation - Simple Auth Components
 *
 * Tests for validation message display, validators, and validation hook
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { renderHook } from '@testing-library/react-native';
import { ValidationMessage, validators, useValidation } from '../../../components/auth/ValidationMessage';

// Mock theme
jest.mock('../../../hooks/useTheme', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        error: { 500: '#ef4444' },
        success: { 500: '#10b981' },
        warning: { 500: '#f59e0b' },
        primary: { 500: '#7c3aed' },
        neutral: { 900: '#0f172a' },
      },
      semantic: {
        text: { primary: '#0f172a', secondary: '#64748b' },
        background: { secondary: '#f8fafc' },
        border: { primary: '#e2e8f0' },
      },
      spacing: {
        0.5: 2,
        1: 4,
        2: 8,
        3: 12,
      },
      borderRadius: { md: 12 },
      typography: {
        fontSize: { sm: 12, base: 14, md: 16 },
      },
    },
  }),
}));

describe('ValidationMessage Component', () => {
  it('should render error message with correct styling', () => {
    const { getByText } = render(
      <ValidationMessage message="Invalid email" type="error" />
    );

    expect(getByText('Invalid email')).toBeTruthy();
    expect(getByText('❌')).toBeTruthy(); // Default error icon
  });

  it('should render success message with correct icon', () => {
    const { getByText } = render(
      <ValidationMessage message="Form submitted successfully" type="success" />
    );

    expect(getByText('Form submitted successfully')).toBeTruthy();
    expect(getByText('✅')).toBeTruthy(); // Default success icon
  });

  it('should render warning message', () => {
    const { getByText } = render(
      <ValidationMessage message="Weak password" type="warning" />
    );

    expect(getByText('Weak password')).toBeTruthy();
    expect(getByText('⚠️')).toBeTruthy(); // Default warning icon
  });

  it('should render info message', () => {
    const { getByText } = render(
      <ValidationMessage message="Password must be 8 characters" type="info" />
    );

    expect(getByText('Password must be 8 characters')).toBeTruthy();
    expect(getByText('ℹ️')).toBeTruthy(); // Default info icon
  });

  it('should use custom icon when provided', () => {
    const { getByText, queryByText } = render(
      <ValidationMessage message="Custom message" type="error" icon="🚨" />
    );

    expect(getByText('🚨')).toBeTruthy();
    expect(queryByText('❌')).toBeNull(); // Default icon should not be rendered
  });

  it('should not render when visible is false', () => {
    const { queryByText } = render(
      <ValidationMessage message="Hidden message" visible={false} />
    );

    expect(queryByText('Hidden message')).toBeNull();
  });

  it('should show dismiss button when dismissible', () => {
    const mockDismiss = jest.fn();
    const { getByText } = render(
      <ValidationMessage message="Dismissible message" dismissible onDismiss={mockDismiss} />
    );

    const dismissButton = getByText('✕');
    expect(dismissButton).toBeTruthy();

    fireEvent.press(dismissButton);
    expect(mockDismiss).toHaveBeenCalled();
  });

  it('should not show dismiss button when not dismissible', () => {
    const { queryByText } = render(
      <ValidationMessage message="Non-dismissible message" dismissible={false} />
    );

    expect(queryByText('✕')).toBeNull();
  });
});

describe('validators', () => {
  describe('email validator', () => {
    it('should validate correct email addresses', () => {
      expect(validators.email('test@example.com')).toBe(true);
      expect(validators.email('user+tag@domain.co.uk')).toBe(true);
      expect(validators.email('name.surname@company.org')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(validators.email('invalid')).toBe(false);
      expect(validators.email('no@domain')).toBe(false);
      expect(validators.email('@example.com')).toBe(false);
      expect(validators.email('user@')).toBe(false);
      expect(validators.email('')).toBe(false);
    });
  });

  describe('password validator', () => {
    it('should validate strong passwords', () => {
      const result = validators.password('Test123!@#');
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject passwords shorter than 8 characters', () => {
      const result = validators.password('Test1!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters');
    });

    it('should reject passwords without uppercase letters', () => {
      const result = validators.password('test1234!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain uppercase letter');
    });

    it('should reject passwords without lowercase letters', () => {
      const result = validators.password('TEST1234!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain lowercase letter');
    });

    it('should reject passwords without numbers', () => {
      const result = validators.password('TestTest!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain number');
    });

    it('should reject passwords without special characters', () => {
      const result = validators.password('Test1234');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain special character');
    });

    it('should return multiple errors for weak passwords', () => {
      const result = validators.password('weak');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('required validator', () => {
    it('should pass for non-empty values', () => {
      expect(validators.required('test')).toBe(true);
      expect(validators.required('  value  ')).toBe(true);
    });

    it('should fail for empty values', () => {
      expect(validators.required('')).toBe(false);
      expect(validators.required('   ')).toBe(false);
    });
  });

  describe('minLength validator', () => {
    it('should pass when length meets minimum', () => {
      expect(validators.minLength('hello', 3)).toBe(true);
      expect(validators.minLength('test', 4)).toBe(true);
    });

    it('should fail when length is below minimum', () => {
      expect(validators.minLength('hi', 3)).toBe(false);
      expect(validators.minLength('', 1)).toBe(false);
    });
  });

  describe('maxLength validator', () => {
    it('should pass when length is within maximum', () => {
      expect(validators.maxLength('hello', 10)).toBe(true);
      expect(validators.maxLength('test', 4)).toBe(true);
    });

    it('should fail when length exceeds maximum', () => {
      expect(validators.maxLength('hello world', 5)).toBe(false);
      expect(validators.maxLength('testing', 6)).toBe(false);
    });
  });

  describe('phone validator', () => {
    it('should validate correct phone numbers', () => {
      expect(validators.phone('+1 (555) 123-4567')).toBe(true);
      expect(validators.phone('555-123-4567')).toBe(true);
      expect(validators.phone('+44 20 1234 5678')).toBe(true);
      expect(validators.phone('1234567890')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(validators.phone('123')).toBe(false); // Too short
      expect(validators.phone('abc-def-ghij')).toBe(false); // Contains letters
      expect(validators.phone('')).toBe(false);
    });
  });

  describe('name validator', () => {
    it('should validate correct names', () => {
      expect(validators.name('John Doe')).toBe(true);
      expect(validators.name("O'Brien")).toBe(true);
      expect(validators.name('Mary-Jane')).toBe(true);
      expect(validators.name('Al')).toBe(true); // Minimum 2 characters
    });

    it('should reject invalid names', () => {
      expect(validators.name('A')).toBe(false); // Too short
      expect(validators.name('John123')).toBe(false); // Contains numbers
      expect(validators.name('   ')).toBe(false); // Only whitespace
      expect(validators.name('')).toBe(false);
    });
  });
});

describe('useValidation hook', () => {
  it('should validate required field', () => {
    const { result } = renderHook(() => useValidation());

    const error = result.current.validateField({ value: '', required: true });
    expect(error).toBe('This field is required');

    const noError = result.current.validateField({ value: 'test', required: true });
    expect(noError).toBeNull();
  });

  it('should validate email field', () => {
    const { result } = renderHook(() => useValidation());

    const error = result.current.validateField({ value: 'invalid', type: 'email' });
    expect(error).toBe('Please enter a valid email address');

    const noError = result.current.validateField({ value: 'test@example.com', type: 'email' });
    expect(noError).toBeNull();
  });

  it('should validate password field', () => {
    const { result } = renderHook(() => useValidation());

    const error = result.current.validateField({ value: 'weak', type: 'password' });
    expect(error).toBeTruthy(); // Should have at least one error

    const noError = result.current.validateField({ value: 'Strong123!@#', type: 'password' });
    expect(noError).toBeNull();
  });

  it('should validate name field', () => {
    const { result } = renderHook(() => useValidation());

    const error = result.current.validateField({ value: 'A', type: 'name' });
    expect(error).toBe('Please enter a valid name');

    const noError = result.current.validateField({ value: 'John Doe', type: 'name' });
    expect(noError).toBeNull();
  });

  it('should validate phone field', () => {
    const { result } = renderHook(() => useValidation());

    const error = result.current.validateField({ value: '123', type: 'phone' });
    expect(error).toBe('Please enter a valid phone number');

    const noError = result.current.validateField({ value: '+1 555-123-4567', type: 'phone' });
    expect(noError).toBeNull();
  });

  it('should validate minLength', () => {
    const { result } = renderHook(() => useValidation());

    const error = result.current.validateField({ value: 'ab', minLength: 3 });
    expect(error).toBe('Must be at least 3 characters');

    const noError = result.current.validateField({ value: 'abc', minLength: 3 });
    expect(noError).toBeNull();
  });

  it('should validate maxLength', () => {
    const { result } = renderHook(() => useValidation());

    const error = result.current.validateField({ value: 'toolong', maxLength: 5 });
    expect(error).toBe('Must be no more than 5 characters');

    const noError = result.current.validateField({ value: 'short', maxLength: 5 });
    expect(noError).toBeNull();
  });

  it('should return existing error if provided', () => {
    const { result } = renderHook(() => useValidation());

    const error = result.current.validateField({ value: 'test', error: 'Custom error' });
    expect(error).toBe('Custom error');
  });

  it('should skip validation for empty optional fields', () => {
    const { result } = renderHook(() => useValidation());

    const error = result.current.validateField({
      value: '',
      required: false,
      minLength: 5,
      type: 'email'
    });
    expect(error).toBeNull(); // Empty but not required, should pass
  });

  it('should validate multiple fields in a form', () => {
    const { result } = renderHook(() => useValidation());

    const fields = {
      email: { value: 'invalid', type: 'email' as const },
      password: { value: 'weak', type: 'password' as const },
      name: { value: 'John Doe', type: 'name' as const },
    };

    const errors = result.current.validateForm(fields);

    expect(errors.email).toBeTruthy(); // Invalid email
    expect(errors.password).toBeTruthy(); // Weak password
    expect(errors.name).toBeUndefined(); // Valid name
  });

  it('should return empty object when all fields are valid', () => {
    const { result } = renderHook(() => useValidation());

    const fields = {
      email: { value: 'test@example.com', type: 'email' as const },
      password: { value: 'Strong123!@#', type: 'password' as const },
      name: { value: 'John Doe', type: 'name' as const },
    };

    const errors = result.current.validateForm(fields);

    expect(Object.keys(errors).length).toBe(0);
  });

  it('should provide access to validators object', () => {
    const { result } = renderHook(() => useValidation());

    expect(result.current.validators).toBeDefined();
    expect(result.current.validators.email).toBeDefined();
    expect(result.current.validators.password).toBeDefined();
  });
});
