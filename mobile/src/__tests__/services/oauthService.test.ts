/**
 * OAuthService Unit Tests
 * Tests the OAuth service implementation for Google and Apple Sign-In
 */

import { Platform } from 'react-native';

// Mock expo-apple-authentication
jest.mock('expo-apple-authentication', () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
  signInAsync: jest.fn(() => Promise.resolve({
    user: 'apple-user-123',
    email: 'test@icloud.com',
    fullName: {
      givenName: 'John',
      familyName: 'Doe',
    },
    identityToken: 'mock-apple-identity-token',
    authorizationCode: 'mock-apple-auth-code',
  })),
  AppleAuthenticationScope: {
    FULL_NAME: 0,
    EMAIL: 1,
  },
}));

// Mock the Google Sign-In module
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(() => Promise.resolve(true)),
    signIn: jest.fn(() => Promise.resolve({
      data: {
        idToken: 'mock-google-id-token',
        user: {
          id: 'google-user-123',
          email: 'test@gmail.com',
          name: 'John Doe',
          photo: 'https://example.com/photo.jpg',
        },
      },
    })),
    signOut: jest.fn(() => Promise.resolve()),
  },
}));

// Mock config - default to development for mocked results
jest.mock('../../config/environment', () => ({
  config: {
    ENVIRONMENT: 'development',
  },
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Import the service AFTER mocks are set up
import { OAuthService } from '../../services/oauthService';

describe('OAuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('signInWithGoogle', () => {
    it('should return OAuth result with idToken and user info', async () => {
      const result = await OAuthService.signInWithGoogle();

      expect(result).toHaveProperty('tokens');
      expect(result).toHaveProperty('user');
      expect(result.tokens.idToken).toBeDefined();
      expect(result.user.email).toBeDefined();
    });

    it('should return mock result in development environment', async () => {
      const result = await OAuthService.signInWithGoogle();

      // In development mode, we get mock results
      expect(result.tokens.idToken).toBe('mock_google_id_token');
      expect(result.user.email).toBe('test@gmail.com');
    });

    it('should have correct structure for Google result', async () => {
      const result = await OAuthService.signInWithGoogle();

      // Verify structure
      expect(result.tokens).toHaveProperty('idToken');
      expect(result.tokens).toHaveProperty('expiresAt');
      expect(result.user).toHaveProperty('id');
      expect(result.user).toHaveProperty('email');
      expect(result.user).toHaveProperty('name');

      // Verify types
      expect(typeof result.tokens.idToken).toBe('string');
      expect(typeof result.tokens.expiresAt).toBe('number');
      expect(typeof result.user.id).toBe('string');
      expect(typeof result.user.email).toBe('string');
    });
  });

  describe('signInWithApple', () => {
    const originalPlatform = Platform.OS;

    afterEach(() => {
      // Restore original platform
      Object.defineProperty(Platform, 'OS', { value: originalPlatform, writable: true });
    });

    it('should throw error on non-iOS platform', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'android', writable: true });

      await expect(OAuthService.signInWithApple()).rejects.toThrow(
        'Apple Sign-In is only available on iOS'
      );
    });

    it('should return OAuth result with identityToken on iOS in development', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });

      const result = await OAuthService.signInWithApple();

      expect(result).toHaveProperty('tokens');
      expect(result).toHaveProperty('user');
      expect(result.tokens.idToken).toBeDefined();
    });

    it('should return mock result in development environment on iOS', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });

      const result = await OAuthService.signInWithApple();

      // In development mode on iOS, we get mock results
      expect(result.tokens.idToken).toBe('mock_apple_id_token');
      expect(result.user.email).toBe('test@icloud.com');
    });
  });

  describe('isGoogleAvailable', () => {
    it('should return boolean indicating Google Sign-In availability', () => {
      const result = OAuthService.isGoogleAvailable();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('isAppleAvailable', () => {
    const originalPlatform = Platform.OS;

    afterEach(() => {
      Object.defineProperty(Platform, 'OS', { value: originalPlatform, writable: true });
    });

    it('should return false on non-iOS platforms', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'android', writable: true });

      const result = await OAuthService.isAppleAvailable();

      expect(result).toBe(false);
    });

    it('should check availability on iOS', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });

      const result = await OAuthService.isAppleAvailable();

      expect(typeof result).toBe('boolean');
    });
  });

  describe('signOut', () => {
    it('should call sign out without throwing', async () => {
      await expect(OAuthService.signOut()).resolves.not.toThrow();
    });
  });

  describe('OAuthResult interface', () => {
    it('should have correct structure for Apple result on iOS', async () => {
      const originalPlatform = Platform.OS;
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });

      const result = await OAuthService.signInWithApple();

      // Verify structure
      expect(result.tokens).toHaveProperty('idToken');
      expect(result.tokens).toHaveProperty('expiresAt');
      expect(result.user).toHaveProperty('id');
      expect(result.user).toHaveProperty('email');
      expect(result.user).toHaveProperty('name');

      // Verify types
      expect(typeof result.tokens.idToken).toBe('string');
      expect(typeof result.tokens.expiresAt).toBe('number');
      expect(typeof result.user.id).toBe('string');

      Object.defineProperty(Platform, 'OS', { value: originalPlatform, writable: true });
    });
  });
});
