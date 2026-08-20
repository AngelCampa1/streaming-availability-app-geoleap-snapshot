/**
 * Manual mock for SecureStorage
 */

export const _secureStorage = {
  getTokens: jest.fn(),
  setTokens: jest.fn(),
  clearTokens: jest.fn(),
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};
