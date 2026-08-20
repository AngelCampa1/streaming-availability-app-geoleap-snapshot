/**
 * AuthContext user-scope wiring tests
 * Verifies that per-user data scoping is applied on login and cleared on logout.
 * This directly tests the M1 fix: applyUserScopeOnLogin / clearUserScopeOnLogout.
 *
 * Note: jest.mock factories are hoisted before const declarations, so we
 * use jest.requireMock() to retrieve mock references after setup rather than
 * closing over variables declared with const.
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';

// ---------------------------------------------------------------------------
// Module mocks (factories use inline jest.fn() to avoid TDZ issues)
// ---------------------------------------------------------------------------

jest.mock('../../services/search/SearchHistoryService', () => {
  // Use a stable singleton object so all getInstance() calls return the same mock functions
  const sharedInstance = {
    setCurrentUser: jest.fn(),
    clearUserData: jest.fn().mockResolvedValue(undefined),
  };
  return {
    SearchHistoryService: {
      getInstance: jest.fn(() => sharedInstance),
    },
  };
});

jest.mock('../../services/watchlist/WatchlistService', () => ({
  watchlistService: {
    setCurrentUser: jest.fn(),
    clearUserData: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../services/recommendations/RecommendationService', () => ({
  recommendationService: {
    setCurrentUser: jest.fn(),
    clearUserData: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../services/analytics/AnalyticsService', () => ({
  analyticsService: {
    setUserId: jest.fn().mockResolvedValue(undefined),
    clearUserData: jest.fn().mockResolvedValue(undefined),
    dispose: jest.fn(),
    initialize: jest.fn().mockResolvedValue(undefined),
  },
}));

// ---------------------------------------------------------------------------
// Auth service mocks
// ---------------------------------------------------------------------------

const TEST_USER_ID = 'user-123';
const TEST_TOKENS = { accessToken: 'access', refreshToken: 'refresh' };

jest.mock('../../services/api/AuthService', () => ({
  authService: {
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn().mockResolvedValue(undefined),
    getUserProfile: jest.fn(),
    socialLogin: jest.fn(),
    isAuthenticated: jest.fn().mockResolvedValue(false),
    getCurrentUser: jest.fn().mockReturnValue(null),
    getCurrentTokens: jest.fn().mockReturnValue(null),
    forgotPassword: jest.fn().mockResolvedValue(undefined),
    resetPassword: jest.fn().mockResolvedValue(undefined),
    enableBiometricAuthentication: jest.fn().mockResolvedValue(undefined),
    disableBiometricAuthentication: jest.fn().mockResolvedValue(undefined),
    updateUserProfile: jest.fn(),
    refreshToken: jest.fn(),
  },
}));

jest.mock('../../services/auth/TokenManager', () => ({
  tokenManager: {
    setTokens: jest.fn().mockResolvedValue(undefined),
    clearTokens: jest.fn().mockResolvedValue(undefined),
    isAuthenticated: jest.fn().mockResolvedValue(false),
    getCurrentUser: jest.fn().mockReturnValue(null),
  },
}));

jest.mock('../../services/storage/SecureStorage', () => ({
  _secureStorage: {
    getTokens: jest.fn().mockResolvedValue({ accessToken: 'access', refreshToken: 'refresh' }),
    storeTokens: jest.fn().mockResolvedValue(undefined),
    clearTokens: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../services/biometricAuth', () => ({
  biometricAuth: {
    isAvailable: jest.fn().mockResolvedValue({ available: false, biometryType: 'None' }),
    isBiometricEnabled: jest.fn().mockResolvedValue(false),
    authenticate: jest.fn().mockResolvedValue({ success: false }),
  },
}));

jest.mock('../../services/oauthService', () => ({
  OAuthService: {
    signInWithGoogle: jest.fn().mockResolvedValue({
      tokens: { idToken: 'google-id-token' },
      user: { id: 'g-user', email: 'g@example.com', name: 'G User', photo: null },
    }),
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    log: jest.fn(),
  },
}));

// Import AFTER all mocks
import { AuthProvider, useAuth } from '../AuthContext';

// ---------------------------------------------------------------------------
// Helper: retrieve mock instances after modules are loaded
// ---------------------------------------------------------------------------

function getMocks() {
  const { SearchHistoryService } = jest.requireMock('../../services/search/SearchHistoryService');
  const searchInstance = SearchHistoryService.getInstance();

  const { watchlistService } = jest.requireMock('../../services/watchlist/WatchlistService');
  const { recommendationService } = jest.requireMock('../../services/recommendations/RecommendationService');
  const { analyticsService } = jest.requireMock('../../services/analytics/AnalyticsService');
  const { authService } = jest.requireMock('../../services/api/AuthService');

  return { searchInstance, watchlistService, recommendationService, analyticsService, authService };
}

const makeTestUser = (id: string) => ({ id, email: `${id}@example.com`, name: 'Test User' });

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AuthContext - per-user data scoping (M1)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { authService } = getMocks();
    authService.isAuthenticated.mockResolvedValue(false);
    authService.getCurrentUser.mockReturnValue(null);
    authService.getCurrentTokens.mockReturnValue(null);
    authService.login.mockResolvedValue({ user: makeTestUser(TEST_USER_ID), tokens: TEST_TOKENS });
    authService.register.mockResolvedValue({ user: makeTestUser(TEST_USER_ID), tokens: TEST_TOKENS });
    authService.logout.mockResolvedValue(undefined);
    authService.updateUserProfile.mockResolvedValue(makeTestUser(TEST_USER_ID));
  });

  describe('login applies user scope', () => {
    it('calls setCurrentUser on SearchHistoryService with user id', async () => {
      const { searchInstance } = getMocks();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login({ email: 'test@example.com', password: 'secret' });
      });

      expect(searchInstance.setCurrentUser).toHaveBeenCalledWith(TEST_USER_ID);
    });

    it('calls setCurrentUser on WatchlistService with user id', async () => {
      const { watchlistService } = getMocks();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login({ email: 'test@example.com', password: 'secret' });
      });

      expect(watchlistService.setCurrentUser).toHaveBeenCalledWith(TEST_USER_ID);
    });

    it('calls setCurrentUser on RecommendationService with user id', async () => {
      const { recommendationService } = getMocks();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login({ email: 'test@example.com', password: 'secret' });
      });

      expect(recommendationService.setCurrentUser).toHaveBeenCalledWith(TEST_USER_ID);
    });

    it('calls analyticsService.setUserId with user id', async () => {
      const { analyticsService } = getMocks();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login({ email: 'test@example.com', password: 'secret' });
      });

      expect(analyticsService.setUserId).toHaveBeenCalledWith(TEST_USER_ID);
    });
  });

  describe('register applies user scope', () => {
    it('calls setCurrentUser on all services after registration', async () => {
      const { searchInstance, watchlistService, recommendationService, analyticsService } = getMocks();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.register({
          email: 'test@example.com',
          password: 'secret',
          name: 'Test User',
          confirmPassword: 'secret',
        });
      });

      expect(searchInstance.setCurrentUser).toHaveBeenCalledWith(TEST_USER_ID);
      expect(watchlistService.setCurrentUser).toHaveBeenCalledWith(TEST_USER_ID);
      expect(recommendationService.setCurrentUser).toHaveBeenCalledWith(TEST_USER_ID);
      expect(analyticsService.setUserId).toHaveBeenCalledWith(TEST_USER_ID);
    });
  });

  describe('logout clears user scope', () => {
    async function loginThenLogout(result: ReturnType<typeof renderHook<ReturnType<typeof useAuth>, unknown>>['result']) {
      await act(async () => {
        await result.current.login({ email: 'test@example.com', password: 'secret' });
      });
      jest.clearAllMocks();
      // Re-set async mocks after clearAllMocks
      const { authService } = getMocks();
      authService.logout.mockResolvedValue(undefined);
      await act(async () => {
        await result.current.logout();
      });
    }

    it('calls clearUserData on SearchHistoryService on logout', async () => {
      const { searchInstance } = getMocks();
      const { result } = renderHook(() => useAuth(), { wrapper });
      await loginThenLogout(result);
      expect(searchInstance.clearUserData).toHaveBeenCalled();
    });

    it('calls clearUserData on WatchlistService on logout', async () => {
      const { watchlistService } = getMocks();
      const { result } = renderHook(() => useAuth(), { wrapper });
      await loginThenLogout(result);
      expect(watchlistService.clearUserData).toHaveBeenCalled();
    });

    it('calls clearUserData on RecommendationService on logout', async () => {
      const { recommendationService } = getMocks();
      const { result } = renderHook(() => useAuth(), { wrapper });
      await loginThenLogout(result);
      expect(recommendationService.clearUserData).toHaveBeenCalled();
    });

    it('calls clearUserData on AnalyticsService on logout', async () => {
      const { analyticsService } = getMocks();
      const { result } = renderHook(() => useAuth(), { wrapper });
      await loginThenLogout(result);
      expect(analyticsService.clearUserData).toHaveBeenCalled();
    });

    it('does not dispose AnalyticsService on logout so analytics survives re-login', async () => {
      const { analyticsService } = getMocks();
      const { result } = renderHook(() => useAuth(), { wrapper });
      await loginThenLogout(result);
      expect(analyticsService.dispose).not.toHaveBeenCalled();
    });

    it('user A data is cleared before user B logs in', async () => {
      const { authService, searchInstance } = getMocks();
      authService.login
        .mockResolvedValueOnce({ user: makeTestUser('user-A'), tokens: TEST_TOKENS })
        .mockResolvedValueOnce({ user: makeTestUser('user-B'), tokens: TEST_TOKENS });
      authService.logout.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Login as user A
      await act(async () => { await result.current.login({ email: 'a@example.com', password: 'secret' }); });
      expect(searchInstance.setCurrentUser).toHaveBeenCalledWith('user-A');

      // Logout - clear scope
      jest.clearAllMocks();
      authService.logout.mockResolvedValue(undefined);
      await act(async () => { await result.current.logout(); });
      expect(searchInstance.clearUserData).toHaveBeenCalled();

      // Login as user B
      jest.clearAllMocks();
      await act(async () => { await result.current.login({ email: 'b@example.com', password: 'secret' }); });
      expect(searchInstance.setCurrentUser).toHaveBeenCalledWith('user-B');
    });
  });

  describe('session restore applies user scope', () => {
    it('applies user scope on app relaunch when an authenticated session is restored', async () => {
      const { authService, searchInstance, watchlistService, recommendationService, analyticsService } = getMocks();
      // Simulate a persisted authenticated session on mount.
      authService.isAuthenticated.mockResolvedValue(true);
      authService.getCurrentUser.mockReturnValue(makeTestUser(TEST_USER_ID));
      authService.getCurrentTokens.mockReturnValue(TEST_TOKENS);
      authService.getUserProfile.mockResolvedValue(makeTestUser(TEST_USER_ID));

      renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(searchInstance.setCurrentUser).toHaveBeenCalledWith(TEST_USER_ID);
      });
      expect(watchlistService.setCurrentUser).toHaveBeenCalledWith(TEST_USER_ID);
      expect(recommendationService.setCurrentUser).toHaveBeenCalledWith(TEST_USER_ID);
      expect(analyticsService.setUserId).toHaveBeenCalledWith(TEST_USER_ID);
    });
  });

  describe('logout is resilient to clear failures', () => {
    it('still clears remaining services and completes when one clearUserData rejects', async () => {
      const { authService, searchInstance, watchlistService, recommendationService, analyticsService } = getMocks();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login({ email: 'test@example.com', password: 'secret' });
      });

      jest.clearAllMocks();
      authService.logout.mockResolvedValue(undefined);
      // First service throws; logout must still clear the others and resolve.
      searchInstance.clearUserData.mockRejectedValueOnce(new Error('storage failure'));

      await act(async () => {
        await expect(result.current.logout()).resolves.toBeUndefined();
      });

      expect(watchlistService.clearUserData).toHaveBeenCalled();
      expect(recommendationService.clearUserData).toHaveBeenCalled();
      expect(analyticsService.clearUserData).toHaveBeenCalled();
    });
  });
});
