/**
 * Manual mock for AuthService
 */

export const authService = {
  login: jest.fn(),
  logout: jest.fn(),
  register: jest.fn(),
  refreshTokens: jest.fn(),
  isAuthenticated: jest.fn(),
  getCurrentUser: jest.fn(),
  getCurrentTokens: jest.fn(),
  getUserProfile: jest.fn(),
  requestPasswordReset: jest.fn(),
  resetPassword: jest.fn(),
  verifyEmail: jest.fn(),
  updateProfile: jest.fn(),
  updatePassword: jest.fn(),
  enableTwoFactor: jest.fn(),
  verifyTwoFactor: jest.fn(),
  getSecuritySettings: jest.fn(),
  updateSecuritySettings: jest.fn(),
  getSocialConnections: jest.fn(),
  connectSocial: jest.fn(),
  disconnectSocial: jest.fn(),
};

export class AuthService {
  static getInstance = jest.fn(() => authService);
}
