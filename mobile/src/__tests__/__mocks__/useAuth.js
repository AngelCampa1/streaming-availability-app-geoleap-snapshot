// Mock for useAuth hook
const mockUseAuth = () => ({
  user: null,
  loading: false,
  error: null,
  login: jest.fn(() => Promise.resolve()),
  register: jest.fn(() => Promise.resolve()),
  logout: jest.fn(() => Promise.resolve()),
  loginWithGoogle: jest.fn(() => Promise.resolve()),
  loginWithApple: jest.fn(() => Promise.resolve()),
  loginWithFacebook: jest.fn(() => Promise.resolve()),
  enableBiometric: jest.fn(() => Promise.resolve()),
  disableBiometric: jest.fn(() => Promise.resolve()),
  isBiometricEnabled: false,
});

module.exports = {
  useAuth: mockUseAuth,
};
module.exports.default = mockUseAuth;
