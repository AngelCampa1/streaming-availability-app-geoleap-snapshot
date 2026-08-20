/**
 * TokenStorage Tests
 *
 * Tests REAL business logic for secure token storage.
 * Target: 80%+ coverage
 *
 * Philosophy: Execute real service logic, only mock external I/O
 * - Mock: react-native-keychain (external secure storage)
 * - Real: All business logic, token management, biometric handling
 */

import * as Keychain from 'react-native-keychain';
import { TokenStorageService } from '../../services/tokenStorage';
import { AuthTokens } from '../../types/auth';

// Mock react-native-keychain (external I/O only)
jest.mock('react-native-keychain');
// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('TokenStorage', () => {
  let storage: TokenStorageService;

  beforeEach(() => {
    // Clear mocks
    jest.clearAllMocks();

    // Reset the singleton instance to ensure fresh state
    (TokenStorageService as any).instance = null;

    // Mock Keychain methods with default success responses
    (Keychain.setInternetCredentials as jest.Mock).mockResolvedValue(true);
    (Keychain.getInternetCredentials as jest.Mock).mockResolvedValue(false);
    (Keychain.resetInternetCredentials as jest.Mock).mockResolvedValue(true);
    (Keychain.getSupportedBiometryType as jest.Mock).mockResolvedValue(null);

    // Get fresh instance AFTER mocks are set up
    storage = TokenStorageService.getInstance();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = TokenStorageService.getInstance();
      const instance2 = TokenStorageService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('storeTokens()', () => {
    it('should store tokens without biometric authentication', async () => {
      const tokens: AuthTokens = {
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-456',
        expiresAt: Date.now() + 3600000,
      };

      await storage.storeTokens(tokens);

      expect(Keychain.setInternetCredentials).toHaveBeenCalledWith(
        'auth_tokens',
        'user',
        JSON.stringify(tokens),
        expect.objectContaining({
          service: 'GeoLeap',
          accessControl: undefined,
          authenticationType: undefined,
        })
      );
    });

    it('should store tokens with biometric authentication', async () => {
      const tokens: AuthTokens = {
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-456',
        expiresAt: Date.now() + 3600000,
      };

      await storage.storeTokens(tokens, { biometric: true });

      expect(Keychain.setInternetCredentials).toHaveBeenCalledWith(
        'auth_tokens',
        'user',
        JSON.stringify(tokens),
        expect.objectContaining({
          service: 'GeoLeap',
          accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY,
          authenticationType: Keychain.AUTHENTICATION_TYPE.BIOMETRICS,
        })
      );
    });

    it('should handle storage errors gracefully', async () => {
      (Keychain.setInternetCredentials as jest.Mock).mockRejectedValue(
        new Error('Keychain error')
      );

      const tokens: AuthTokens = {
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-456',
        expiresAt: Date.now() + 3600000,
      };

      // Service wraps error with custom message
      await expect(storage.storeTokens(tokens)).rejects.toThrow('Failed to store authentication tokens');
    });
  });

  describe('getTokens()', () => {
    it('should retrieve stored tokens successfully', async () => {
      const storedTokens: AuthTokens = {
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-456',
        expiresAt: Date.now() + 3600000,
      };

      (Keychain.getInternetCredentials as jest.Mock).mockResolvedValue({
        username: 'user',
        password: JSON.stringify(storedTokens),
      });

      const tokens = await storage.getTokens();

      expect(tokens).toEqual(storedTokens);
      expect(Keychain.getInternetCredentials).toHaveBeenCalledWith(
        'auth_tokens',
        expect.objectContaining({
          service: 'GeoLeap',
        })
      );
    });

    it('should retrieve tokens with biometric option (option is unused)', async () => {
      const storedTokens: AuthTokens = {
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-456',
        expiresAt: Date.now() + 3600000,
      };

      (Keychain.getInternetCredentials as jest.Mock).mockResolvedValue({
        username: 'user',
        password: JSON.stringify(storedTokens),
      });

      // Note: _options parameter is unused in implementation
      const tokens = await storage.getTokens({ biometric: true });

      expect(tokens).toEqual(storedTokens);
      // Service doesn't actually use biometric options for retrieval
      expect(Keychain.getInternetCredentials).toHaveBeenCalledWith(
        'auth_tokens',
        expect.objectContaining({
          service: 'GeoLeap',
        })
      );
    });

    it('should return null when no tokens exist', async () => {
      (Keychain.getInternetCredentials as jest.Mock).mockResolvedValue(false);

      const tokens = await storage.getTokens();

      expect(tokens).toBeNull();
    });

    it('should return null when credentials have no password', async () => {
      (Keychain.getInternetCredentials as jest.Mock).mockResolvedValue({
        username: 'user',
        password: '',
      });

      const tokens = await storage.getTokens();

      expect(tokens).toBeNull();
    });

    it('should handle retrieval errors gracefully', async () => {
      (Keychain.getInternetCredentials as jest.Mock).mockRejectedValue(
        new Error('Keychain error')
      );

      // Service catches error and returns null
      const tokens = await storage.getTokens();
      expect(tokens).toBeNull();
    });
  });

  describe('removeTokens()', () => {
    it('should remove stored tokens', async () => {
      await storage.removeTokens();

      // Service implementation doesn't pass service option to resetInternetCredentials
      expect(Keychain.resetInternetCredentials).toHaveBeenCalledWith('auth_tokens');
    });

    it('should handle removal errors gracefully', async () => {
      (Keychain.resetInternetCredentials as jest.Mock).mockRejectedValue(
        new Error('Keychain error')
      );

      // Service catches error and doesn't throw
      await expect(storage.removeTokens()).resolves.not.toThrow();
    });
  });

  describe('hasTokens()', () => {
    it('should return true when tokens exist', async () => {
      (Keychain.getInternetCredentials as jest.Mock).mockResolvedValue({
        username: 'user',
        password: JSON.stringify({
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresAt: Date.now(),
        }),
      });

      const hasTokens = await storage.hasTokens();

      expect(hasTokens).toBe(true);
      // Service doesn't pass options to getInternetCredentials
      expect(Keychain.getInternetCredentials).toHaveBeenCalledWith('auth_tokens');
    });

    it('should return false when no tokens exist', async () => {
      (Keychain.getInternetCredentials as jest.Mock).mockResolvedValue(false);

      const hasTokens = await storage.hasTokens();

      expect(hasTokens).toBe(false);
    });

    it('should return true even when credentials have empty password', async () => {
      (Keychain.getInternetCredentials as jest.Mock).mockResolvedValue({
        username: 'user',
        password: '',
      });

      // Service checks credentials !== false, not password content
      const hasTokens = await storage.hasTokens();

      expect(hasTokens).toBe(true);
    });

    it('should handle errors and return false', async () => {
      (Keychain.getInternetCredentials as jest.Mock).mockRejectedValue(
        new Error('Keychain error')
      );

      const hasTokens = await storage.hasTokens();

      expect(hasTokens).toBe(false);
    });
  });

  describe('storeBiometricKey()', () => {
    it('should store biometric key', async () => {
      const key = 'biometric-key-123';

      await storage.storeBiometricKey(key);

      expect(Keychain.setInternetCredentials).toHaveBeenCalledWith(
        'biometric_key',
        'biometric',
        key,
        expect.objectContaining({
          service: 'GeoLeap',
          accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY,
          authenticationType: Keychain.AUTHENTICATION_TYPE.BIOMETRICS,
        })
      );
    });

    it('should handle storage errors gracefully', async () => {
      (Keychain.setInternetCredentials as jest.Mock).mockRejectedValue(
        new Error('Keychain error')
      );

      // Service wraps error with custom message
      await expect(storage.storeBiometricKey('key')).rejects.toThrow('Failed to store biometric key');
    });
  });

  describe('getBiometricKey()', () => {
    it('should retrieve stored biometric key', async () => {
      const storedKey = 'biometric-key-123';

      (Keychain.getInternetCredentials as jest.Mock).mockResolvedValue({
        username: 'biometric',
        password: storedKey,
      });

      const key = await storage.getBiometricKey();

      expect(key).toBe(storedKey);
      // Service doesn't pass options to getInternetCredentials
      expect(Keychain.getInternetCredentials).toHaveBeenCalledWith('biometric_key');
    });

    it('should return null when no biometric key exists', async () => {
      (Keychain.getInternetCredentials as jest.Mock).mockResolvedValue(false);

      const key = await storage.getBiometricKey();

      expect(key).toBeNull();
    });

    it('should return null when credentials have no password', async () => {
      (Keychain.getInternetCredentials as jest.Mock).mockResolvedValue({
        username: 'biometric',
        password: '',
      });

      const key = await storage.getBiometricKey();

      expect(key).toBeNull();
    });

    it('should handle retrieval errors gracefully', async () => {
      (Keychain.getInternetCredentials as jest.Mock).mockRejectedValue(
        new Error('Keychain error')
      );

      // Service catches error and returns null
      const key = await storage.getBiometricKey();
      expect(key).toBeNull();
    });
  });

  describe('removeBiometricKey()', () => {
    it('should remove stored biometric key', async () => {
      await storage.removeBiometricKey();

      // Service doesn't pass options to resetInternetCredentials
      expect(Keychain.resetInternetCredentials).toHaveBeenCalledWith('biometric_key');
    });

    it('should handle removal errors gracefully', async () => {
      (Keychain.resetInternetCredentials as jest.Mock).mockRejectedValue(
        new Error('Keychain error')
      );

      // Service catches error and doesn't throw
      await expect(storage.removeBiometricKey()).resolves.not.toThrow();
    });
  });

  describe('getSupportedBiometrics()', () => {
    it('should return Face ID when supported', async () => {
      (Keychain.getSupportedBiometryType as jest.Mock).mockResolvedValue(
        Keychain.BIOMETRY_TYPE.FACE_ID
      );

      const biometrics = await storage.getSupportedBiometrics();

      expect(biometrics).toBe(Keychain.BIOMETRY_TYPE.FACE_ID);
    });

    it('should return Touch ID when supported', async () => {
      (Keychain.getSupportedBiometryType as jest.Mock).mockResolvedValue(
        Keychain.BIOMETRY_TYPE.TOUCH_ID
      );

      const biometrics = await storage.getSupportedBiometrics();

      expect(biometrics).toBe(Keychain.BIOMETRY_TYPE.TOUCH_ID);
    });

    it('should return Fingerprint when supported', async () => {
      (Keychain.getSupportedBiometryType as jest.Mock).mockResolvedValue(
        Keychain.BIOMETRY_TYPE.FINGERPRINT
      );

      const biometrics = await storage.getSupportedBiometrics();

      expect(biometrics).toBe(Keychain.BIOMETRY_TYPE.FINGERPRINT);
    });

    it('should return Iris when supported', async () => {
      (Keychain.getSupportedBiometryType as jest.Mock).mockResolvedValue(
        Keychain.BIOMETRY_TYPE.IRIS
      );

      const biometrics = await storage.getSupportedBiometrics();

      expect(biometrics).toBe(Keychain.BIOMETRY_TYPE.IRIS);
    });

    it('should return Face when supported', async () => {
      (Keychain.getSupportedBiometryType as jest.Mock).mockResolvedValue(
        Keychain.BIOMETRY_TYPE.FACE
      );

      const biometrics = await storage.getSupportedBiometrics();

      expect(biometrics).toBe(Keychain.BIOMETRY_TYPE.FACE);
    });

    it('should return null when no biometrics supported', async () => {
      (Keychain.getSupportedBiometryType as jest.Mock).mockResolvedValue(null);

      const biometrics = await storage.getSupportedBiometrics();

      expect(biometrics).toBeNull();
    });

    it('should handle errors and return null', async () => {
      (Keychain.getSupportedBiometryType as jest.Mock).mockRejectedValue(
        new Error('Biometry error')
      );

      const biometrics = await storage.getSupportedBiometrics();

      expect(biometrics).toBeNull();
    });
  });

  describe('isBiometricSupported()', () => {
    it('should return true when biometrics are supported', async () => {
      (Keychain.getSupportedBiometryType as jest.Mock).mockResolvedValue(
        Keychain.BIOMETRY_TYPE.FACE_ID
      );

      const isSupported = await storage.isBiometricSupported();

      expect(isSupported).toBe(true);
    });

    it('should return false when no biometrics are supported', async () => {
      (Keychain.getSupportedBiometryType as jest.Mock).mockResolvedValue(null);

      const isSupported = await storage.isBiometricSupported();

      expect(isSupported).toBe(false);
    });

    it('should handle errors and return false', async () => {
      (Keychain.getSupportedBiometryType as jest.Mock).mockRejectedValue(
        new Error('Biometry error')
      );

      const isSupported = await storage.isBiometricSupported();

      expect(isSupported).toBe(false);
    });
  });

  describe('clearAll()', () => {
    it('should clear both tokens and biometric key', async () => {
      await storage.clearAll();

      expect(Keychain.resetInternetCredentials).toHaveBeenCalledTimes(2);
      // Service doesn't pass options to resetInternetCredentials
      expect(Keychain.resetInternetCredentials).toHaveBeenCalledWith('auth_tokens');
      expect(Keychain.resetInternetCredentials).toHaveBeenCalledWith('biometric_key');
    });

    it('should handle errors gracefully', async () => {
      (Keychain.resetInternetCredentials as jest.Mock).mockRejectedValue(
        new Error('Keychain error')
      );

      // clearAll catches errors and doesn't throw
      await expect(storage.clearAll()).resolves.not.toThrow();
    });
  });

  describe('Integration Scenarios', () => {
    it('should complete full token lifecycle: store -> retrieve -> remove', async () => {
      const tokens: AuthTokens = {
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-456',
        expiresAt: Date.now() + 3600000,
      };

      // Store tokens
      await storage.storeTokens(tokens);
      expect(Keychain.setInternetCredentials).toHaveBeenCalled();

      // Mock retrieval
      (Keychain.getInternetCredentials as jest.Mock).mockResolvedValue({
        username: 'user',
        password: JSON.stringify(tokens),
      });

      // Retrieve tokens
      const retrievedTokens = await storage.getTokens();
      expect(retrievedTokens).toEqual(tokens);

      // Check tokens exist
      const hasTokens = await storage.hasTokens();
      expect(hasTokens).toBe(true);

      // Remove tokens
      await storage.removeTokens();
      expect(Keychain.resetInternetCredentials).toHaveBeenCalled();
    });

    it('should complete biometric token lifecycle', async () => {
      const tokens: AuthTokens = {
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-456',
        expiresAt: Date.now() + 3600000,
      };

      // Check biometric support
      (Keychain.getSupportedBiometryType as jest.Mock).mockResolvedValue(
        Keychain.BIOMETRY_TYPE.FACE_ID
      );
      const isSupported = await storage.isBiometricSupported();
      expect(isSupported).toBe(true);

      // Store with biometric
      await storage.storeTokens(tokens, { biometric: true });
      expect(Keychain.setInternetCredentials).toHaveBeenCalledWith(
        'auth_tokens',
        'user',
        JSON.stringify(tokens),
        expect.objectContaining({
          accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY,
        })
      );

      // Store biometric key (uses 'biometric' as username)
      await storage.storeBiometricKey('bio-key-123');
      expect(Keychain.setInternetCredentials).toHaveBeenCalledWith(
        'biometric_key',
        'biometric',
        'bio-key-123',
        expect.objectContaining({
          accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY,
        })
      );
    });

    it('should handle complete data clearing', async () => {
      // Store tokens and biometric key
      await storage.storeTokens({
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: Date.now(),
      });
      await storage.storeBiometricKey('key');

      // Clear all data
      await storage.clearAll();

      // Verify both were cleared (service doesn't pass options)
      expect(Keychain.resetInternetCredentials).toHaveBeenCalledWith('auth_tokens');
      expect(Keychain.resetInternetCredentials).toHaveBeenCalledWith('biometric_key');
    });
  });
});
