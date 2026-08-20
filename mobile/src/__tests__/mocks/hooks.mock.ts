import { QueryClient } from'@tanstack/react-query';

/**
 * Shared mock utilities for React hooks and context providers
 *
 * This file provides reusable mocks for common dependencies in hook and
 * component tests, including navigation, React Query, theme, and auth context.
 */

// ========================
// Navigation Mocks
// ========================

export const mockNavigate = jest.fn();
export const mockGoBack = jest.fn();
export const mockAddListener = jest.fn(() => jest.fn()); // Returns unsubscribe function
export const mockRemoveListener = jest.fn();
export const mockSetOptions = jest.fn();
export const mockReset = jest.fn();
export const mockReplace = jest.fn();

export const mockNavigation = {
  navigate: mockNavigate,
  goBack: mockGoBack,
  addListener: mockAddListener,
  removeListener: mockRemoveListener,
  setOptions: mockSetOptions,
  reset: mockReset,
  replace: mockReplace,
  canGoBack: jest.fn(() => true),
  isFocused: jest.fn(() => true),
  getState: jest.fn(() => ({ routes: [], index: 0 })),
  getParent: jest.fn(() => undefined),
};

export const mockRoute = {
  key:'test-route-key',
  name:'TestScreen',
  params: {},
};

/**
 * Reset all navigation mocks
 */
export function resetNavigationMocks(): void {
  mockNavigate.mockClear();
  mockGoBack.mockClear();
  mockAddListener.mockClear();
  mockRemoveListener.mockClear();
  mockSetOptions.mockClear();
  mockReset.mockClear();
  mockReplace.mockClear();
}

// ========================
// React Query Mocks
// ========================

/**
 * Create a mock QueryClient for testing
 * @param options Optional QueryClient configuration
 * @returns QueryClient instance with test-friendly defaults
 */
export function createMockQueryClient(options?: any): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Disable retries in tests
        cacheTime: 0, // Don't cache between tests
        staleTime: 0, // Always consider data stale
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
        ...options?.queries,
      },
      mutations: {
        retry: false, // Disable retries in tests
        ...options?.mutations,
      },
    },
    logger: {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
  });
}

// Individual query/mutation mocks
export const mockUseQuery = jest.fn();
export const mockUseInfiniteQuery = jest.fn();
export const mockUseMutation = jest.fn();
export const mockQueryClient = createMockQueryClient();

/**
 * Reset React Query mocks
 */
export function resetReactQueryMocks(): void {
  mockUseQuery.mockClear();
  mockUseInfiniteQuery.mockClear();
  mockUseMutation.mockClear();
  mockQueryClient.clear();
}

// ========================
// Theme Mocks
// ========================

export const mockTheme = {
  spacing: {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
  },
  colors: {
    // Primary brand colors
    primary: {
      50:'#faf5ff',
      100:'#f3e8ff',
      200:'#e9d5ff',
      300:'#d8b4fe',
      400:'#c084fc',
      500:'#7c3aed', // Stream Violet
      600:'#9333ea',
      700:'#7e22ce',
      800:'#6b21a8',
      900:'#581c87',
    },
    // Golden Popcorn accent
    secondary: {
      50:'#fffbeb',
      100:'#fef3c7',
      200:'#fde68a',
      300:'#fcd34d',
      400:'#fbbf24',
      500:'#f59e0b', // Golden Popcorn
      600:'#d97706',
      700:'#b45309',
      800:'#92400e',
      900:'#78350f',
    },
    // Success/Available
    success: {
      500:'#10b981', // Stream Green
    },
    // Error states
    error: {
      500:'#ef4444',
      600:'#dc2626',
    },
    // Gray scale
    gray: {
      50:'#f9fafb',
      100:'#f3f4f6',
      200:'#e5e7eb',
      300:'#d1d5db',
      400:'#9ca3af',
      500:'#6b7280',
      600:'#4b5563',
      700:'#374151',
      800:'#1f2937',
      900:'#111827',
    },
    // Overlay colors
    overlay: {
      light:'rgba(0, 0, 0, 0.4)',
      darkStrong:'rgba(0, 0, 0, 0.7)',
    },
  },
  semantic: {
    text: {
      primary:'#111827',
      secondary:'#6b7280',
      disabled:'#9ca3af',
      inverse:'#ffffff',
    },
    background: {
      primary:'#ffffff',
      secondary:'#f9fafb',
      tertiary:'#f3f4f6',
    },
    border: {
      primary:'#e5e7eb',
      secondary:'#d1d5db',
    },
  },
  typography: {
    fontFamily: {
      regular:'System',
      medium:'System',
      bold:'System',
    },
    fontSize: {
      xs: 12,
      sm: 14,
      base: 16,
      lg: 18,
      xl: 20,'2xl': 24,'3xl': 30,
    },
  },
};

export const mockUseTheme = jest.fn(() => mockTheme);

// ========================
// Auth Context Mocks
// ========================

export const mockUser = {
  id:'test-user-123',
  email:'test@example.com',
  name:'Test User',
  subscriptionTier:'premium' as const,
  createdAt: new Date('2024-01-01'),
};

export const mockTokens = {
  accessToken:'mock-access-token',
  refreshToken:'mock-refresh-token',
  expiresIn: 3600,
};

export const mockLogin = jest.fn();
export const mockLogout = jest.fn();
export const mockRefreshToken = jest.fn();
export const mockLoginWithBiometric = jest.fn();

export const mockAuthContext = {
  user: mockUser,
  tokens: mockTokens,
  isAuthenticated: true,
  isLoading: false,
  error: null,
  login: mockLogin,
  logout: mockLogout,
  refreshToken: mockRefreshToken,
  loginWithBiometric: mockLoginWithBiometric,
};

/**
 * Reset auth context mocks
 */
export function resetAuthMocks(): void {
  mockLogin.mockClear();
  mockLogout.mockClear();
  mockRefreshToken.mockClear();
  mockLoginWithBiometric.mockClear();
}

// ========================
// Comprehensive Reset
// ========================

/**
 * Reset all shared mocks
 */
export function resetAllMocks(): void {
  resetNavigationMocks();
  resetReactQueryMocks();
  resetAuthMocks();
  mockUseTheme.mockClear();
}
