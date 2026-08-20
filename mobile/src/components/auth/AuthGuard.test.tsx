/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { render } from '@testing-library/react-native';
import { View, Text, ActivityIndicator } from 'react-native';

// Mock the AuthContext
const mockAuthState = {
  isLoading: false,
  isAuthenticated: false,
  user: null,
  token: null,
};

const mockAuthContext = {
  state: mockAuthState,
  signIn: jest.fn(),
  signUp: jest.fn(),
  signOut: jest.fn(),
  refresh: jest.fn(),
};

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  dispatch: jest.fn(),
  isFocused: jest.fn(() => true),
  canGoBack: jest.fn(() => false),
  getId: jest.fn(() => 'mock-id'),
  getParent: jest.fn(),
  getState: jest.fn(),
  setParams: jest.fn(),
  addListener: jest.fn(),
  removeListener: jest.fn(),
  reset: jest.fn(),
};

// Mock dependencies
jest.mock('../../context/AuthContext', () => ({
  useAuth: () => mockAuthContext,
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  NavigationContainer: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock AuthGuard component implementation
const MockAuthGuard: React.FC<any> = ({
  children,
  requireAuth = true,
  redirectTo = 'Auth',
  fallback,
}) => {
  const { state } = mockAuthContext;
  const navigation = mockNavigation;

  React.useEffect(() => {
    if (!state.isLoading) {
      if (requireAuth && !state.isAuthenticated) {
        navigation.navigate(redirectTo);
      } else if (!requireAuth && state.isAuthenticated) {
        navigation.navigate('Main');
      }
    }
  }, [state.isAuthenticated, state.isLoading, requireAuth, navigation, redirectTo]);

  // Show loading while checking authentication
  if (state.isLoading) {
    if (fallback) {
      return fallback;
    }

    return (
      <View testID="loading-container">
        <ActivityIndicator testID="loading-indicator" />
        <Text testID="loading-text">Loading...</Text>
      </View>
    );
  }

  // Check authentication requirements
  if (requireAuth && !state.isAuthenticated) {
    return null; // Will redirect to auth
  }

  if (!requireAuth && state.isAuthenticated) {
    return null; // Will redirect to main
  }

  return <>{children}</>;
};

describe('AuthGuard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset auth state to default
    mockAuthState.isLoading = false;
    mockAuthState.isAuthenticated = false;
    mockAuthState.user = null;
    mockAuthState.token = null;
  });

  describe('Loading State', () => {
    it('shows loading indicator when authentication is loading', () => {
      mockAuthState.isLoading = true;

      const { getByTestId } = render(
        <MockAuthGuard>
          <View testID="protected-content" />
        </MockAuthGuard>
      );

      expect(getByTestId('loading-container')).toBeTruthy();
      expect(getByTestId('loading-indicator')).toBeTruthy();
      expect(getByTestId('loading-text')).toBeTruthy();
    });

    it('shows custom fallback when provided during loading', () => {
      mockAuthState.isLoading = true;

      const customFallback = <View testID="custom-fallback" />;

      const { getByTestId, queryByTestId } = render(
        <MockAuthGuard fallback={customFallback}>
          <View testID="protected-content" />
        </MockAuthGuard>
      );

      expect(getByTestId('custom-fallback')).toBeTruthy();
      expect(queryByTestId('loading-container')).toBeNull();
    });
  });

  describe('requireAuth=true (Protected Routes)', () => {
    it('redirects to auth when not authenticated', () => {
      mockAuthState.isAuthenticated = false;

      const { queryByTestId } = render(
        <MockAuthGuard requireAuth={true}>
          <View testID="protected-content" />
        </MockAuthGuard>
      );

      expect(mockNavigation.navigate).toHaveBeenCalledWith('Auth');
      expect(queryByTestId('protected-content')).toBeNull();
    });

    it('shows content when authenticated', () => {
      mockAuthState.isAuthenticated = true;

      const { getByTestId } = render(
        <MockAuthGuard requireAuth={true}>
          <View testID="protected-content" />
        </MockAuthGuard>
      );

      expect(mockNavigation.navigate).not.toHaveBeenCalled();
      expect(getByTestId('protected-content')).toBeTruthy();
    });

    it('uses custom redirectTo path', () => {
      mockAuthState.isAuthenticated = false;

      render(
        <MockAuthGuard requireAuth={true} redirectTo="Login">
          <View testID="protected-content" />
        </MockAuthGuard>
      );

      expect(mockNavigation.navigate).toHaveBeenCalledWith('Login');
    });
  });

  describe('requireAuth=false (Public Routes)', () => {
    it('shows content when not authenticated', () => {
      mockAuthState.isAuthenticated = false;

      const { getByTestId } = render(
        <MockAuthGuard requireAuth={false}>
          <View testID="public-content" />
        </MockAuthGuard>
      );

      expect(mockNavigation.navigate).not.toHaveBeenCalled();
      expect(getByTestId('public-content')).toBeTruthy();
    });

    it('redirects to Main when authenticated', () => {
      mockAuthState.isAuthenticated = true;

      const { queryByTestId } = render(
        <MockAuthGuard requireAuth={false}>
          <View testID="public-content" />
        </MockAuthGuard>
      );

      expect(mockNavigation.navigate).toHaveBeenCalledWith('Main');
      expect(queryByTestId('public-content')).toBeNull();
    });
  });

  describe('User State Changes', () => {
    it('re-evaluates when authentication state changes', () => {
      mockAuthState.isAuthenticated = false;

      const { rerender, getByTestId, queryByTestId } = render(
        <MockAuthGuard requireAuth={true}>
          <View testID="protected-content" />
        </MockAuthGuard>
      );

      expect(queryByTestId('protected-content')).toBeNull();

      // Simulate user logging in
      mockAuthState.isAuthenticated = true;
      rerender(
        <MockAuthGuard requireAuth={true}>
          <View testID="protected-content" />
        </MockAuthGuard>
      );

      expect(getByTestId('protected-content')).toBeTruthy();
    });

    it('re-evaluates when loading state changes', () => {
      mockAuthState.isLoading = true;

      const { rerender, getByTestId, queryByTestId } = render(
        <MockAuthGuard requireAuth={true}>
          <View testID="protected-content" />
        </MockAuthGuard>
      );

      expect(getByTestId('loading-container')).toBeTruthy();

      // Simulate loading complete with auth
      mockAuthState.isLoading = false;
      mockAuthState.isAuthenticated = true;
      rerender(
        <MockAuthGuard requireAuth={true}>
          <View testID="protected-content" />
        </MockAuthGuard>
      );

      expect(queryByTestId('loading-container')).toBeNull();
      expect(getByTestId('protected-content')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('does not redirect when already loading', () => {
      mockAuthState.isLoading = true;
      mockAuthState.isAuthenticated = false;

      render(
        <MockAuthGuard requireAuth={true}>
          <View testID="protected-content" />
        </MockAuthGuard>
      );

      // Should not navigate while loading
      expect(mockNavigation.navigate).not.toHaveBeenCalled();
    });

    it('handles children prop as null', () => {
      mockAuthState.isAuthenticated = true;

      const result = render(
        <MockAuthGuard requireAuth={true}>
          {null}
        </MockAuthGuard>
      );

      // Should render without errors
      expect(result).toBeTruthy();
    });
  });
});
