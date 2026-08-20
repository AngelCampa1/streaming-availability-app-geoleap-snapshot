/**
 * Manual mock for TokenManager
 */

export const tokenManager = {
  getTokens: jest.fn(),
  setTokens: jest.fn(),
  clearTokens: jest.fn(),
  refreshTokens: jest.fn(),
  isTokenExpired: jest.fn(),
  getAccessToken: jest.fn(),
  getRefreshToken: jest.fn(),
};
