/**
 * ProtectedRoute Component Tests
 * Day 5 Continuation - Auth Components
 *
 * Tests for protected route with authentication and permission checks
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import ProtectedRoute from '../../../components/auth/ProtectedRoute';

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

// Mock AuthContext
const mockAuthState = {
  isAuthenticated: false,
  user: null,
  loading: false,
  error: null,
};

jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    state: mockAuthState,
  }),
}));

// Mock theme
jest.mock('../../../theme/ThemeProvider', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        error: { 500: '#ef4444' },
        warning: { 500: '#f59e0b' },
        primary: { 500: '#7c3aed' },
        white: '#ffffff',
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
        1: 4,
        4: 16,
        6: 24,
        8: 32,
      },
      borderRadius: {
        lg: 16,
      },
      typography: {
        fontSize: {
          base: 14,
        },
        fontWeight: {
          bold: '700',
        },
        lineHeight: {
          relaxed: 1.625,
        },
      },
    },
  }),
}));

// Mock react-native-paper components
jest.mock('react-native-paper', () => ({
  Button: ({ children, onPress, mode, style, ...props }: any) => {
    const MockButton = require('react-native').TouchableOpacity;
    const MockText = require('react-native').Text;
    return (
      <MockButton onPress={onPress} style={style} testID={`button-${mode}`} {...props}>
        <MockText>{children}</MockText>
      </MockButton>
    );
  },
  Text: ({ children, variant, style, ...props }: any) => {
    const MockText = require('react-native').Text;
    return (
      <MockText style={style} testID={`text-${variant}`} {...props}>
        {children}
      </MockText>
    );
  },
  Surface: ({ children, style, ...props }: any) => {
    const MockView = require('react-native').View;
    return (
      <MockView style={style} testID="surface" {...props}>
        {children}
      </MockView>
    );
  },
  IconButton: ({ icon, size, iconColor, style, ...props }: any) => {
    const MockView = require('react-native').View;
    const MockText = require('react-native').Text;
    return (
      <MockView style={style} testID={`icon-button-${icon}`} {...props}>
        <MockText>{icon}</MockText>
      </MockView>
    );
  },
}));

// Mock SafeAreaView
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, style, ...props }: any) => {
    const MockView = require('react-native').View;
    return (
      <MockView style={style} testID="safe-area-view" {...props}>
        {children}
      </MockView>
    );
  },
}));

describe('ProtectedRoute Component', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockGoBack.mockClear();
    mockAuthState.isAuthenticated = false;
    mockAuthState.user = null;
  });

  describe('Unauthenticated State', () => {
    it('should render access required message when not authenticated', () => {
      const { getByText } = render(
        <ProtectedRoute>
          <Text>Protected Content</Text>
        </ProtectedRoute>
      );

      expect(getByText('Access Required')).toBeTruthy();
      expect(getByText('You need to be signed in to access this feature.')).toBeTruthy();
    });

    it('should not render children when not authenticated', () => {
      const { queryByText } = render(
        <ProtectedRoute>
          <Text>Protected Content</Text>
        </ProtectedRoute>
      );

      expect(queryByText('Protected Content')).toBeNull();
    });

    it('should show lock icon when not authenticated', () => {
      const { getByTestId } = render(
        <ProtectedRoute>
          <Text>Protected Content</Text>
        </ProtectedRoute>
      );

      expect(getByTestId('icon-button-lock')).toBeTruthy();
    });

    it('should show sign in button by default', () => {
      const { getByText } = render(
        <ProtectedRoute>
          <Text>Protected Content</Text>
        </ProtectedRoute>
      );

      expect(getByText('Sign In')).toBeTruthy();
    });

    it('should navigate to Auth screen when sign in button is pressed', () => {
      const { getByText } = render(
        <ProtectedRoute>
          <Text>Protected Content</Text>
        </ProtectedRoute>
      );

      const signInButton = getByText('Sign In');
      fireEvent.press(signInButton);

      expect(mockNavigate).toHaveBeenCalledWith('Auth');
    });

    it('should hide sign in button when showLoginButton is false', () => {
      const { queryByText } = render(
        <ProtectedRoute showLoginButton={false}>
          <Text>Protected Content</Text>
        </ProtectedRoute>
      );

      expect(queryByText('Sign In')).toBeNull();
    });

    it('should render custom fallback title', () => {
      const { getByText } = render(
        <ProtectedRoute fallbackTitle="Premium Feature">
          <Text>Protected Content</Text>
        </ProtectedRoute>
      );

      expect(getByText('Premium Feature')).toBeTruthy();
    });

    it('should render custom fallback message', () => {
      const { getByText } = render(
        <ProtectedRoute fallbackMessage="Upgrade to access this feature.">
          <Text>Protected Content</Text>
        </ProtectedRoute>
      );

      expect(getByText('Upgrade to access this feature.')).toBeTruthy();
    });
  });

  describe('Authenticated State', () => {
    beforeEach(() => {
      mockAuthState.isAuthenticated = true;
      mockAuthState.user = { id: '1', email: 'test@example.com', name: 'Test User' };
    });

    it('should render children when authenticated', () => {
      const { getByText } = render(
        <ProtectedRoute>
          <Text>Protected Content</Text>
        </ProtectedRoute>
      );

      expect(getByText('Protected Content')).toBeTruthy();
    });

    it('should not render access required message when authenticated', () => {
      const { queryByText } = render(
        <ProtectedRoute>
          <Text>Protected Content</Text>
        </ProtectedRoute>
      );

      expect(queryByText('Access Required')).toBeNull();
    });

    it('should render multiple children when authenticated', () => {
      const { getByText } = render(
        <ProtectedRoute>
          <Text>First Child</Text>
          <Text>Second Child</Text>
        </ProtectedRoute>
      );

      expect(getByText('First Child')).toBeTruthy();
      expect(getByText('Second Child')).toBeTruthy();
    });
  });

  describe('Permission Checks', () => {
    beforeEach(() => {
      mockAuthState.isAuthenticated = true;
      mockAuthState.user = { id: '1', email: 'test@example.com', name: 'Test User' };
    });

    it('should render children when no permissions required', () => {
      const { getByText } = render(
        <ProtectedRoute>
          <Text>Protected Content</Text>
        </ProtectedRoute>
      );

      expect(getByText('Protected Content')).toBeTruthy();
    });

    it('should render children when permissions are required (permission check not implemented)', () => {
      // Note: Permission checking is not implemented yet (always returns true)
      const { getByText } = render(
        <ProtectedRoute requiredPermissions={['admin', 'premium']}>
          <Text>Protected Content</Text>
        </ProtectedRoute>
      );

      expect(getByText('Protected Content')).toBeTruthy();
    });
  });

  describe('SafeAreaView Integration', () => {
    it('should render within SafeAreaView when not authenticated', () => {
      const { getByTestId } = render(
        <ProtectedRoute>
          <Text>Protected Content</Text>
        </ProtectedRoute>
      );

      expect(getByTestId('safe-area-view')).toBeTruthy();
    });
  });

  describe('Styling', () => {
    it('should apply surface component for card-like appearance', () => {
      const { getByTestId } = render(
        <ProtectedRoute>
          <Text>Protected Content</Text>
        </ProtectedRoute>
      );

      expect(getByTestId('surface')).toBeTruthy();
    });
  });
});
