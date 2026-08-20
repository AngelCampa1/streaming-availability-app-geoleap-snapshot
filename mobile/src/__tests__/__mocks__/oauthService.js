// Mock for OAuthService - matches the static class implementation (Google + Apple only)
const OAuthService = {
  signInWithGoogle: jest.fn(() => Promise.resolve({
    tokens: {
      idToken: 'mock_google_id_token',
      accessToken: 'google_token',
      refreshToken: 'google_refresh',
      expiresAt: Date.now() + 3600000,
    },
    user: {
      id: 'google-user-id',
      email: 'test@gmail.com',
      name: 'Test User',
      photo: null,
    },
  })),
  signInWithApple: jest.fn(() => Promise.resolve({
    tokens: {
      idToken: 'mock_apple_id_token',
      accessToken: 'apple_token',
      refreshToken: 'apple_refresh',
      expiresAt: Date.now() + 3600000,
    },
    user: {
      id: 'apple-user-id',
      email: 'test@icloud.com',
      name: 'Test User',
      photo: null,
    },
  })),
  signOut: jest.fn(() => Promise.resolve()),
  isGoogleAvailable: jest.fn(() => true),
  isAppleAvailable: jest.fn(() => Promise.resolve(true)),
};

module.exports = { OAuthService };
module.exports.default = OAuthService;
