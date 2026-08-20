/**
 * M6: verifyEmail endpoint removal tests
 * Verifies that the deprecated /api/auth/verify-email endpoint has been
 * removed from the api.ts endpoints object, and that AuthService.verifyEmail
 * throws a descriptive error instead of calling the removed endpoint.
 */

import { endpoints } from '../api';

describe('M6: verifyEmail endpoint removed from api.ts', () => {
  it('endpoints.auth does not contain a verifyEmail property', () => {
    expect((endpoints.auth as Record<string, unknown>).verifyEmail).toBeUndefined();
  });

  it('all remaining auth endpoints are defined and non-empty strings', () => {
    const { login, register, logout, refresh, forgotPassword, resetPassword, profile, updateProfile } = endpoints.auth;
    for (const ep of [login, register, logout, refresh, forgotPassword, resetPassword, profile, updateProfile]) {
      expect(typeof ep).toBe('string');
      expect((ep as string).length).toBeGreaterThan(0);
    }
  });

  it('endpoints.auth has exactly 8 entries (no verifyEmail)', () => {
    const keys = Object.keys(endpoints.auth);
    expect(keys).not.toContain('verifyEmail');
    expect(keys.length).toBe(8);
  });
});

// AuthService.verifyEmail test - using static mocks to avoid dynamic import issues
jest.mock('../../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../services/auth/TokenManager', () => ({
  tokenManager: {
    isAuthenticated: jest.fn().mockResolvedValue(false),
    getCurrentUser: jest.fn().mockReturnValue(null),
    setTokens: jest.fn().mockResolvedValue(undefined),
    clearTokens: jest.fn().mockResolvedValue(undefined),
    getCurrentTokens: jest.fn().mockReturnValue(null),
    getAccessToken: jest.fn().mockResolvedValue(null),
    refreshToken: jest.fn().mockResolvedValue(null),
  },
}));

jest.mock('../../services/storage/SecureStorage', () => ({
  _secureStorage: {},
  secureStorage: {},
}));

jest.mock('../../services/biometricAuth', () => ({
  biometricAuth: { isAvailable: jest.fn() },
}));

jest.mock('../../services/api/httpClient', () => ({
  httpClient: {
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    setAuthTokens: jest.fn(),
    clearAuthTokens: jest.fn(),
  },
}));

import { AuthService } from '../../services/api/AuthService';

describe('M6: AuthService.verifyEmail throws immediately (endpoint removed)', () => {
  it('verifyEmail always rejects with endpoint-removed message', async () => {
    const service = new AuthService();
    await expect(service.verifyEmail('any-token')).rejects.toThrow(
      'Email verification endpoint has been removed',
    );
  });

  it('verifyEmail does not make any HTTP calls', async () => {
    const { httpClient } = jest.requireMock('../../services/api/httpClient');
    const service = new AuthService();

    await expect(service.verifyEmail('any-token')).rejects.toThrow();
    expect(httpClient.post).not.toHaveBeenCalled();
  });
});
