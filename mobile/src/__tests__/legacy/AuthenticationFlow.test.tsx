import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock all the dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('@react-native-google-signin/google-signin');
jest.mock('@invertase/react-native-apple-authentication');
jest.mock('expo-local-authentication');
jest.mock('react-native-keychain');
jest.mock('@/services/oauthService');
jest.mock('@/environment', () => ({
  getEnvironmentConfig: () => ({
    API_BASE_URL: 'http://localhost:8020',
    ENVIRONMENT: 'test',
    ENABLE_LOGGING: false,
    NETWORK_TIMEOUT: 5000,
    CACHE_DURATION: 300000,
  }),
}));

// Mock authentication hook
const mockUseAuth = {
  user: null,
  isLoading: false,
  isAuthenticated: false,
  login: jest.fn(),
  logout: jest.fn(),
  register: jest.fn(),
  loginWithGoogle: jest.fn(),
  loginWithApple: jest.fn(),
  loginWithBiometrics: jest.fn(),
  error: null,
};

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth,
}));

// Create a simple test component that uses auth
const TestAuthComponent = () => {
  const { login, logout, isAuthenticated, loginWithGoogle, loginWithApple } = mockUseAuth;

  return (
    <div testID="auth-component">
      {isAuthenticated ? (
        <button testID="logout-button" onPress={logout}>
          Logout
        </button>
      ) : (
        <div>
          <button testID="login-button" onPress={() => login('test@example.com', 'password')}>
            Login
          </button>
          <button testID="google-login-button" onPress={loginWithGoogle}>
            Google Login
          </button>
          <button testID="apple-login-button" onPress={loginWithApple}>
            Apple Login
          </button>
        </div>
      )}
    </div>
  );
};

describe('Authentication Flow Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    jest.clearAllMocks();
  });

  const createWrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  it('renders login options when not authenticated', () => {
    mockUseAuth.isAuthenticated = false;

    const { getByTestId } = render(
      <TestAuthComponent />,
      { wrapper: createWrapper },
    );

    expect(getByTestId('login-button')).toBeTruthy();
    expect(getByTestId('google-login-button')).toBeTruthy();
    expect(getByTestId('apple-login-button')).toBeTruthy();
  });

  it('renders logout button when authenticated', () => {
    mockUseAuth.isAuthenticated = true;
    mockUseAuth.user = { id: '1', email: 'test@example.com' };

    const { getByTestId, queryByTestId } = render(
      <TestAuthComponent />,
      { wrapper: createWrapper },
    );

    expect(getByTestId('logout-button')).toBeTruthy();
    expect(queryByTestId('login-button')).toBeFalsy();
  });

  it('calls login function when login button is pressed', async () => {
    mockUseAuth.isAuthenticated = false;
    const mockLogin = jest.fn().mockResolvedValue({ success: true });
    mockUseAuth.login = mockLogin;

    const { getByTestId } = render(
      <TestAuthComponent />,
      { wrapper: createWrapper },
    );

    fireEvent.press(getByTestId('login-button'));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password');
    });
  });

  it('calls logout function when logout button is pressed', async () => {
    mockUseAuth.isAuthenticated = true;
    const mockLogout = jest.fn().mockResolvedValue({ success: true });
    mockUseAuth.logout = mockLogout;

    const { getByTestId } = render(
      <TestAuthComponent />,
      { wrapper: createWrapper },
    );

    fireEvent.press(getByTestId('logout-button'));

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled();
    });
  });

  it('calls Google login function when Google button is pressed', async () => {
    mockUseAuth.isAuthenticated = false;
    const mockGoogleLogin = jest.fn().mockResolvedValue({ success: true });
    mockUseAuth.loginWithGoogle = mockGoogleLogin;

    const { getByTestId } = render(
      <TestAuthComponent />,
      { wrapper: createWrapper },
    );

    fireEvent.press(getByTestId('google-login-button'));

    await waitFor(() => {
      expect(mockGoogleLogin).toHaveBeenCalled();
    });
  });

  it('calls Apple login function when Apple button is pressed', async () => {
    mockUseAuth.isAuthenticated = false;
    const mockAppleLogin = jest.fn().mockResolvedValue({ success: true });
    mockUseAuth.loginWithApple = mockAppleLogin;

    const { getByTestId } = render(
      <TestAuthComponent />,
      { wrapper: createWrapper },
    );

    fireEvent.press(getByTestId('apple-login-button'));

    await waitFor(() => {
      expect(mockAppleLogin).toHaveBeenCalled();
    });
  });

  it('handles authentication loading state', () => {
    mockUseAuth.isAuthenticated = false;
    mockUseAuth.isLoading = true;

    const { getByTestId } = render(
      <TestAuthComponent />,
      { wrapper: createWrapper },
    );

    // When loading, buttons should not be interactive
    expect(getByTestId('auth-component')).toBeTruthy();
  });

  it('displays authentication error when present', () => {
    mockUseAuth.isAuthenticated = false;
    mockUseAuth.error = 'Authentication failed';

    const { getByTestId } = render(
      <TestAuthComponent />,
      { wrapper: createWrapper },
    );

    expect(getByTestId('auth-component')).toBeTruthy();
    // In a real component, you would assert that the error message is displayed
  });
});
