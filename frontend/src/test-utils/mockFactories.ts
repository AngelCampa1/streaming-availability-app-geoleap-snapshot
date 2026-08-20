/**
 * Mock Factories for Testing
 *
 * Provides factory functions to create complete mock objects for tests.
 * This ensures all tests use consistent, type-safe mocks.
 */

import type { User, AuthContext } from '@/lib/auth';

// ============================================================================
// User Mock Factory
// ============================================================================

/**
 * Creates a complete mock User object
 *
 * @param overrides - Partial User object to override defaults
 * @returns Complete User object with all required properties
 *
 * @example
 * ```ts
 * const user = createMockUser({ email: 'test@example.com' });
 * ```
 */
export function createMockUser(overrides?: Partial<User>): User {
  return {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    isActive: true,
    emailConfirmed: true,
    roles: ['User'],
    permissions: ['content:search:basic'],
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// ============================================================================
// AuthContext Mock Factory
// ============================================================================

/**
 * Creates a complete mock AuthContext object
 *
 * @param overrides - Partial AuthContext object to override defaults
 * @returns Complete AuthContext with all required properties
 *
 * @example
 * ```ts
 * // Unauthenticated context
 * const context = createMockAuthContext({ isAuthenticated: false });
 *
 * // Authenticated context with custom permissions
 * const context = createMockAuthContext({
 *   isAuthenticated: true,
 *   hasPermission: jest.fn().mockReturnValue(true),
 * });
 * ```
 */
export function createMockAuthContext(overrides?: Partial<AuthContext>): AuthContext {
  return {
    user: null,
    permissions: [],
    roles: [],
    login: jest.fn().mockResolvedValue({ success: true, message: 'Login successful' }),
    logout: jest.fn().mockResolvedValue(undefined),
    register: jest.fn().mockResolvedValue({ success: true, message: 'Registration successful' }),
    logoutAllSessions: jest.fn().mockResolvedValue(undefined),
    hasPermission: jest.fn().mockReturnValue(false),
    hasAnyPermission: jest.fn().mockReturnValue(false),
    hasRole: jest.fn().mockReturnValue(false),
    isAuthenticated: false,
    isLoading: false,
    sessionExpiring: false,
    extendSession: jest.fn().mockResolvedValue(undefined),
    checkAuthStatus: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

/**
 * Creates a mock AuthContext for an authenticated user
 *
 * @param userOverrides - Partial User object to override defaults
 * @returns Complete AuthContext for authenticated user
 *
 * @example
 * ```ts
 * const context = createAuthenticatedContext({ email: 'admin@example.com' });
 * ```
 */
export function createAuthenticatedContext(userOverrides?: Partial<User>): AuthContext {
  const user = createMockUser(userOverrides);

  return createMockAuthContext({
    user,
    permissions: user.permissions,
    roles: user.roles,
    isAuthenticated: true,
    hasPermission: jest.fn((permission: string) => user.permissions.includes(permission)),
    hasAnyPermission: jest.fn((permissions: string[]) =>
      permissions.some(p => user.permissions.includes(p))
    ),
    hasRole: jest.fn((role: string) => user.roles.includes(role)),
  });
}

/**
 * Creates a mock AuthContext for an admin user
 *
 * @param userOverrides - Partial User object to override defaults
 * @returns Complete AuthContext for admin user with admin permissions
 *
 * @example
 * ```ts
 * const context = createAdminContext();
 * ```
 */
export function createAdminContext(userOverrides?: Partial<User>): AuthContext {
  return createAuthenticatedContext({
    roles: ['Admin'],
    permissions: [
      'content:search:full',
      'admin:users:view',
      'admin:users:manage',
      'admin:system:configure',
    ],
    ...userOverrides,
  });
}

/**
 * Creates a mock AuthContext for a premium user
 *
 * @param userOverrides - Partial User object to override defaults
 * @returns Complete AuthContext for premium user with premium permissions
 *
 * @example
 * ```ts
 * const context = createPremiumContext();
 * ```
 */
export function createPremiumContext(userOverrides?: Partial<User>): AuthContext {
  return createAuthenticatedContext({
    roles: ['Premium'],
    permissions: [
      'content:search:full',
      'content:details:view',
      'user:watchlist:manage',
    ],
    ...userOverrides,
  });
}

// ============================================================================
// Onboarding Mock Factories
// ============================================================================

import type {
  OnboardingContextType,
  OnboardingStatus,
  StreamingService,
  RegionPreference,
  ContentPreference,
} from '@/lib/onboarding';

/**
 * Creates a complete mock StreamingService object
 */
export function createMockStreamingService(overrides?: Partial<StreamingService>): StreamingService {
  return {
    id: 'netflix-123',
    serviceName: 'Netflix',
    isActive: true,
    addedAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Creates a complete mock RegionPreference object
 */
export function createMockRegionPreference(overrides?: Partial<RegionPreference>): RegionPreference {
  return {
    countryCode: 'US',
    isPrimary: true,
    priority: 1,
    ...overrides,
  };
}

/**
 * Creates a complete mock ContentPreference object
 */
export function createMockContentPreference(overrides?: Partial<ContentPreference>): ContentPreference {
  return {
    contentType: 'movie',
    isEnabled: true,
    priority: 1,
    ...overrides,
  };
}

/**
 * Creates a complete mock OnboardingStatus object
 */
export function createMockOnboardingStatus(overrides?: Partial<OnboardingStatus>): OnboardingStatus {
  return {
    id: 'onboarding-123',
    userId: 'user-456',
    currentStep: 1,
    isCompleted: false,
    streamingServices: [],
    regionPreferences: [],
    contentPreferences: [],
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Creates a complete mock OnboardingContextType object
 */
export function createMockOnboardingContext(overrides?: Partial<OnboardingContextType>): OnboardingContextType {
  return {
    status: createMockOnboardingStatus(),
    progress: null,
    popularServices: [],
    personalizationPreferences: null,
    isLoading: false,
    error: null,
    getStatus: jest.fn().mockResolvedValue(undefined),
    startOnboarding: jest.fn().mockResolvedValue(undefined),
    updateStep: jest.fn().mockResolvedValue(undefined),
    addStreamingServices: jest.fn().mockResolvedValue(undefined),
    removeStreamingService: jest.fn().mockResolvedValue(true),
    addRegionPreferences: jest.fn().mockResolvedValue(undefined),
    addContentPreferences: jest.fn().mockResolvedValue(undefined),
    completeOnboarding: jest.fn().mockResolvedValue(undefined),
    skipOnboarding: jest.fn().mockResolvedValue(undefined),
    getProgress: jest.fn().mockResolvedValue(undefined),
    getPopularServices: jest.fn().mockResolvedValue(undefined),
    getPersonalizationPreferences: jest.fn().mockResolvedValue(undefined),
    trackAnalyticsEvent: jest.fn().mockResolvedValue(undefined),
    resetOnboarding: jest.fn().mockResolvedValue(true),
    clearError: jest.fn(),
    ...overrides,
  };
}

/**
 * Creates a complete onboarding data set for tests
 */
export function createMockOnboardingData() {
  return {
    streamingServices: [
      createMockStreamingService({ id: 'netflix', serviceName: 'Netflix' }),
      createMockStreamingService({ id: 'disney', serviceName: 'Disney+' }),
      createMockStreamingService({ id: 'hbo', serviceName: 'HBO Max' }),
    ],
    regionPreferences: [
      createMockRegionPreference({ countryCode: 'US', isPrimary: true, priority: 1 }),
      createMockRegionPreference({ countryCode: 'GB', isPrimary: false, priority: 2 }),
      createMockRegionPreference({ countryCode: 'CA', isPrimary: false, priority: 3 }),
    ],
    contentPreferences: [
      createMockContentPreference({ contentType: 'movie', isEnabled: true, priority: 1 }),
      createMockContentPreference({ contentType: 'tv_show', isEnabled: true, priority: 2 }),
      createMockContentPreference({ contentType: 'documentary', isEnabled: true, priority: 3 }),
    ],
  };
}
