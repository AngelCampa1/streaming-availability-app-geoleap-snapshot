/**
 * SecureStorageService Integration Tests
 *
 * Testing Philosophy:
 * - Coverage over passing percentage
 * - Execute REAL business logic (encryption, base64, storage operations)
 * - Only mock external I/O (Keychain, AsyncStorage, Platform)
 * - Test all critical code paths
 *
 * What We Mock:
 * - react-native-keychain (native module)
 * - @react-native-async-storage/async-storage (external I/O)
 * - Platform (React Native environment)
 * - logger (avoid test pollution)
 *
 * What We DON'T Mock (Real Code Execution):
 * - All storage operations (tokens, user, settings, VPN credentials)
 * - Base64 encoding/decoding logic
 * - Encryption/decryption logic
 * - Biometric support checks
 * - Fallback mechanisms
 * - Data validation
 */

import { SecureStorageService } from '../../services/storage/SecureStorage';
import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { AuthTokens, User, SecuritySettings } from '../../types/auth';

// Mock dependencies
jest.mock('react-native-keychain');
jest.mock('@react-native-async-storage/async-storage');
// NOTE: react-native-aes-crypto mock is defined in jest.setup.libraries.js
// We don't override it here to ensure consistent behavior across all tests
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('SecureStorageService Integration Tests', () => {
  let secureStorage: SecureStorageService;
  const mockKeychain = Keychain as jest.Mocked<typeof Keychain>;
  const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

  // Shared keychain storage for mock implementations
  const keychainStorage: Record<string, any> = {};

  // Shared AsyncStorage storage for mock implementations
  const asyncStorageData: Record<string, string> = {};

  // Mock Platform
  const originalPlatform = Platform.OS;

  beforeAll(() => {
    // Set platform to iOS by default (supports Keychain)
    Object.defineProperty(Platform, 'OS', {
      get: () => 'ios',
      configurable: true,
    });
  });

  afterAll(() => {
    // Restore original platform
    Object.defineProperty(Platform, 'OS', {
      get: () => originalPlatform,
      configurable: true,
    });
  });

  beforeEach(() => {
    // CRITICAL: Reset Platform.OS to 'ios' BEFORE resetting singleton
    // Tests may have changed it to 'android' or 'web', which causes initialization in fallback mode
    Object.defineProperty(Platform, 'OS', {
      get: () => 'ios',
      configurable: true,
    });

    // Clear mock keychain storage BEFORE clearing mocks
    // This preserves the encryption key across tests
    if (mockKeychain.__clearStorage) {
      mockKeychain.__clearStorage();
    }

    // Reset singleton instance to ensure fresh initialization
    // @ts-expect-error - Accessing private static field for testing
    SecureStorageService.instance = undefined;

    // Clear mock call history only (don't reset implementations from centralized mock)
    jest.clearAllMocks();

    // Clear AsyncStorage data
    Object.keys(asyncStorageData).forEach(key => delete asyncStorageData[key]);

    // Setup functional AsyncStorage mocks
    mockAsyncStorage.setItem.mockImplementation((key, value) => {
      asyncStorageData[key] = value;
      return Promise.resolve();
    });
    mockAsyncStorage.getItem.mockImplementation((key) => {
      return Promise.resolve(asyncStorageData[key] || null);
    });
    mockAsyncStorage.removeItem.mockImplementation((key) => {
      delete asyncStorageData[key];
      return Promise.resolve();
    });
    mockAsyncStorage.clear.mockImplementation(() => {
      Object.keys(asyncStorageData).forEach(key => delete asyncStorageData[key]);
      return Promise.resolve();
    });
    mockAsyncStorage.getAllKeys.mockImplementation(() => {
      return Promise.resolve(Object.keys(asyncStorageData));
    });
    mockAsyncStorage.multiRemove.mockImplementation((keys) => {
      keys.forEach(key => delete asyncStorageData[key]);
      return Promise.resolve();
    });

    // Ensure keychain mock has implementations (centralized mock should provide these)
    // but clearAllMocks() removes them, so we need to restore them
    // Clear the keychainStorage but preserve encryption_key
    Object.keys(keychainStorage).forEach(key => {
      if (key !== 'encryption_key') {
        delete keychainStorage[key];
      }
    });

    // Re-setup mock implementations that clearAllMocks() removed
    mockKeychain.setInternetCredentials.mockImplementation((server, username, password, options) => {
      keychainStorage[server] = {
        username,
        password,
        service: options?.service || 'GeoLeap',
        storage: 'keychain',
      };
      return Promise.resolve({ service: options?.service || 'GeoLeap', storage: 'keychain' });
    });
    mockKeychain.getInternetCredentials.mockImplementation((server) => {
      if (keychainStorage[server]) {
        return Promise.resolve(keychainStorage[server]);
      }
      return Promise.resolve(false);
    });
    mockKeychain.resetInternetCredentials.mockImplementation((server) => {
      if (keychainStorage[server]) {
        delete keychainStorage[server];
        return Promise.resolve(true);
      }
      return Promise.resolve(false);
    });
    mockKeychain.getSupportedBiometryType.mockResolvedValue(Keychain.BIOMETRY_TYPE.FACE_ID);

    // Get fresh instance for each test
    secureStorage = SecureStorageService.getInstance();
  });

  // ===================================================================
  // 1. INITIALIZATION & CONFIGURATION
  // ===================================================================
  describe('Initialization & Configuration', () => {
    it('should initialize as singleton', () => {
      const instance1 = SecureStorageService.getInstance();
      const instance2 = SecureStorageService.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should detect keychain availability on iOS', async () => {
      mockKeychain.getSupportedBiometryType.mockResolvedValueOnce(Keychain.BIOMETRY_TYPE.TOUCH_ID);

      const supported = await secureStorage.isBiometricSupported();

      expect(supported).toBe(true);
    });

    it('should detect keychain availability on Android', async () => {
      Object.defineProperty(Platform, 'OS', {
        get: () => 'android',
        configurable: true,
      });

      mockKeychain.getSupportedBiometryType.mockResolvedValueOnce(Keychain.BIOMETRY_TYPE.FINGERPRINT);

      const supported = await secureStorage.isBiometricSupported();

      expect(supported).toBe(true);
    });

    it('should use AsyncStorage fallback on web platform', async () => {
      Object.defineProperty(Platform, 'OS', {
        get: () => 'web',
        configurable: true,
      });

      // Reset singleton to pick up the new Platform.OS value
      // @ts-expect-error - Accessing private static field for testing
      SecureStorageService.instance = undefined;

      const newInstance = SecureStorageService.getInstance();
      expect(newInstance.isUsingFallback()).toBe(true);
    });

    it('should handle keychain unavailability gracefully', async () => {
      mockKeychain.getSupportedBiometryType.mockRejectedValueOnce(new Error('Keychain not available'));

      const supported = await secureStorage.isBiometricSupported();

      expect(supported).toBe(false);
    });
  });

  // ===================================================================
  // 2. AUTH TOKENS STORAGE
  // ===================================================================
  describe('Auth Tokens Storage', () => {
    const mockTokens: AuthTokens = {
      accessToken: 'access_token_123',
      refreshToken: 'refresh_token_456',
      expiresAt: Date.now() + 3600000,
      tokenType: 'Bearer',
    };

    it('should store tokens in keychain', async () => {
      await secureStorage.storeTokens(mockTokens);

      expect(mockKeychain.setInternetCredentials).toHaveBeenCalledWith(
        'auth_tokens',
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          service: 'GeoLeap',
        })
      );
    });

    it('should retrieve tokens from keychain', async () => {
      // First store the tokens
      await secureStorage.storeTokens(mockTokens);

      // Then retrieve them
      const tokens = await secureStorage.getTokens();

      expect(tokens).toEqual(mockTokens);
    });

    it('should return null when no tokens stored', async () => {
      mockKeychain.getInternetCredentials.mockResolvedValueOnce(false);

      const tokens = await secureStorage.getTokens();

      expect(tokens).toBeNull();
    });

    it('should remove tokens from keychain', async () => {
      await secureStorage.removeTokens();

      expect(mockKeychain.resetInternetCredentials).toHaveBeenCalledWith(
        'auth_tokens'
      );
    });

    it('should store tokens with biometric authentication', async () => {
      await secureStorage.storeTokens(mockTokens, {
        biometric: true,
        promptMessage: 'Authenticate to save tokens',
      });

      expect(mockKeychain.setInternetCredentials).toHaveBeenCalledWith(
        'auth_tokens',
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY,
        })
      );
    });

    it('should retrieve tokens with biometric authentication', async () => {
      // First store the tokens with biometric
      await secureStorage.storeTokens(mockTokens, {
        biometric: true,
      });

      // Then retrieve them with biometric
      const tokens = await secureStorage.getTokens({
        biometric: true,
        promptMessage: 'Authenticate to access tokens',
      });

      expect(tokens).toEqual(mockTokens);
    });

    it('should fallback to AsyncStorage if keychain fails', async () => {
      mockKeychain.setInternetCredentials.mockRejectedValueOnce(new Error('Keychain error'));

      const storedData = JSON.stringify({
        data: mockTokens,
        timestamp: Date.now(),
        version: '1.0.0',
      });

      mockAsyncStorage.setItem.mockResolvedValueOnce(undefined);

      await secureStorage.storeTokens(mockTokens);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        expect.stringContaining('auth_tokens'),
        expect.any(String)
      );
    });
  });

  // ===================================================================
  // 3. USER DATA STORAGE
  // ===================================================================
  describe('User Data Storage', () => {
    const mockUser: User = {
      id: 'user_123',
      email: 'test@example.com',
      name: 'Test User',
      emailVerified: true,
    };

    it('should store user data in keychain', async () => {
      await secureStorage.storeUser(mockUser);

      expect(mockKeychain.setInternetCredentials).toHaveBeenCalledWith(
        'user_data',
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          service: 'GeoLeap',
        })
      );
    });

    it('should retrieve user data from keychain', async () => {
      // First store the user
      await secureStorage.storeUser(mockUser);

      // Then retrieve it
      const user = await secureStorage.getUser();

      expect(user).toEqual(mockUser);
    });

    it('should return null when no user data stored', async () => {
      mockKeychain.getInternetCredentials.mockResolvedValueOnce(false);

      const user = await secureStorage.getUser();

      expect(user).toBeNull();
    });

    it('should handle corrupted user data gracefully', async () => {
      // Provide data in the expected format (key:base64) but with invalid JSON after decoding
      mockKeychain.getInternetCredentials.mockResolvedValueOnce({
        username: 'user_data',
        password: 'test-key:aW52YWxpZCBqc29ueyAge30=', // "invalid json{  }" in base64
        service: 'GeoLeap',
        storage: 'keychain',
      });

      // The implementation catches parsing errors and returns null after trying fallback
      const result = await secureStorage.getUser();
      expect(result).toBeNull();
    });
  });

  // ===================================================================
  // 4. BIOMETRIC KEY STORAGE
  // ===================================================================
  describe('Biometric Key Storage', () => {
    const mockBiometricKey = 'biometric_key_abc123';

    it('should store biometric key', async () => {
      await secureStorage.storeBiometricKey(mockBiometricKey, {
        biometric: true,
      });

      expect(mockKeychain.setInternetCredentials).toHaveBeenCalledWith(
        'biometric_key',
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY,
        })
      );
    });

    it('should retrieve biometric key', async () => {
      // First store the key
      await secureStorage.storeBiometricKey(mockBiometricKey, {
        biometric: true,
      });

      // Then retrieve it
      const key = await secureStorage.getBiometricKey({
        biometric: true,
      });

      expect(key).toBe(mockBiometricKey);
    });

    it('should remove biometric key', async () => {
      await secureStorage.removeBiometricKey();

      expect(mockKeychain.resetInternetCredentials).toHaveBeenCalled();
    });

    it('should return null when no biometric key stored', async () => {
      mockKeychain.getInternetCredentials.mockResolvedValueOnce(false);

      const key = await secureStorage.getBiometricKey();

      expect(key).toBeNull();
    });
  });

  // ===================================================================
  // 5. SECURITY SETTINGS STORAGE
  // ===================================================================
  describe('Security Settings Storage', () => {
    const mockSettings: SecuritySettings = {
      biometricEnabled: true,
      requireBiometricOnLaunch: true,
      autoLockTimeout: 300,
      secureScreenshotPrevention: true,
    };

    it('should store security settings', async () => {
      mockAsyncStorage.setItem.mockResolvedValueOnce(undefined);

      await secureStorage.storeSecuritySettings(mockSettings);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        expect.stringContaining('security_settings'),
        expect.any(String)
      );
    });

    it('should retrieve security settings', async () => {
      // First store the settings
      await secureStorage.storeSecuritySettings(mockSettings);

      // Then retrieve them
      const settings = await secureStorage.getSecuritySettings();

      expect(settings).toEqual(mockSettings);
    });

    it('should return null when no security settings stored', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce(null);

      const settings = await secureStorage.getSecuritySettings();

      expect(settings).toBeNull();
    });
  });

  // ===================================================================
  // 6. APP SETTINGS STORAGE
  // ===================================================================
  describe('App Settings Storage', () => {
    const mockAppSettings = {
      theme: 'light',
      language: 'en',
      notifications: true,
      autoUpdate: false,
    };

    it('should store app settings', async () => {
      await secureStorage.storeAppSettings(mockAppSettings);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        expect.stringContaining('app_settings'),
        expect.any(String)
      );
    });

    it('should retrieve app settings', async () => {
      // First store the settings
      await secureStorage.storeAppSettings(mockAppSettings);

      // Then retrieve them
      const settings = await secureStorage.getAppSettings();

      expect(settings).toEqual(mockAppSettings);
    });

    it('should return null when no app settings stored', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce(null);

      const settings = await secureStorage.getAppSettings();

      expect(settings).toBeNull();
    });
  });

  // ===================================================================
  // 7. SESSION DATA STORAGE
  // ===================================================================
  describe('Session Data Storage', () => {
    const mockSessionData = {
      sessionId: 'session_123',
      startTime: Date.now(),
      lastActivity: Date.now(),
      ipAddress: '192.168.1.1',
    };

    it('should store session data', async () => {
      await secureStorage.storeSessionData(mockSessionData);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        expect.stringContaining('session_data'),
        expect.any(String)
      );
    });

    it('should retrieve session data', async () => {
      const storedData = JSON.stringify({
        data: mockSessionData,
        timestamp: Date.now(),
        version: '1.0.0',
      });

      mockAsyncStorage.getItem.mockResolvedValueOnce(storedData);

      const data = await secureStorage.getSessionData();

      expect(data).toEqual(mockSessionData);
    });

    it('should clear session data', async () => {
      await secureStorage.clearSessionData();

      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(
        expect.stringContaining('session_data')
      );
    });

    it('should return null when no session data stored', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce(null);

      const data = await secureStorage.getSessionData();

      expect(data).toBeNull();
    });
  });

  // ===================================================================
  // 8. VPN CREDENTIALS STORAGE
  // ===================================================================
  describe('VPN Credentials Storage', () => {
    const serverId = 'vpn_server_us_east_1';
    const mockVpnCreds = {
      username: 'vpn_user_123',
      password: 'vpn_pass_456',
      certificate: 'cert_data_789',
    };

    it('should store VPN credentials', async () => {
      await secureStorage.storeVpnCredentials(
        serverId,
        mockVpnCreds.username,
        mockVpnCreds.password,
        undefined,
        { certificate: mockVpnCreds.certificate }
      );

      expect(mockKeychain.setInternetCredentials).toHaveBeenCalledWith(
        expect.stringContaining(serverId),
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          accessControl: Keychain.ACCESS_CONTROL.DEVICE_PASSCODE,
        })
      );
    });

    it('should retrieve VPN credentials', async () => {
      // First store the credentials
      await secureStorage.storeVpnCredentials(
        serverId,
        mockVpnCreds.username,
        mockVpnCreds.password,
        undefined,
        { certificate: mockVpnCreds.certificate }
      );

      // Then retrieve them
      const creds = await secureStorage.getVpnCredentials(serverId);

      expect(creds).toMatchObject({
        username: mockVpnCreds.username,
        password: mockVpnCreds.password,
        serverConfig: { certificate: mockVpnCreds.certificate },
      });
    });

    it('should remove VPN credentials', async () => {
      await secureStorage.removeVpnCredentials(serverId);

      expect(mockKeychain.resetInternetCredentials).toHaveBeenCalled();
    });

    it('should check if VPN credentials exist', async () => {
      // First store the credentials
      await secureStorage.storeVpnCredentials(
        serverId,
        mockVpnCreds.username,
        mockVpnCreds.password,
        undefined,
        { certificate: mockVpnCreds.certificate }
      );

      // Then check if they exist
      const exists = await secureStorage.hasVpnCredentials(serverId);

      expect(exists).toBe(true);
    });

    it('should return false when VPN credentials do not exist', async () => {
      mockKeychain.getInternetCredentials.mockResolvedValueOnce(false);

      const exists = await secureStorage.hasVpnCredentials(serverId);

      expect(exists).toBe(false);
    });

    it('should clear all VPN credentials', async () => {
      // Switch to web platform to use AsyncStorage fallback
      Object.defineProperty(Platform, 'OS', {
        get: () => 'web',
        configurable: true,
      });

      // Reset singleton to pick up new platform
      // @ts-expect-error - Accessing private static field for testing
      SecureStorageService.instance = undefined;
      const fallbackStorage = SecureStorageService.getInstance();

      // Pre-populate AsyncStorage with VPN credentials (using correct prefix)
      await mockAsyncStorage.setItem('@geoleap_secure_vpn_credentials_server1', 'test-vpn-data');
      await mockAsyncStorage.setItem('@geoleap_secure_vpn_credentials_server2', 'test-vpn-data');
      await mockAsyncStorage.setItem('@geoleap_secure_other_data', 'test-other-data');

      await fallbackStorage.clearAllVpnCredentials();

      expect(mockAsyncStorage.multiRemove).toHaveBeenCalledWith(
        expect.arrayContaining([
          '@geoleap_secure_vpn_credentials_server1',
          '@geoleap_secure_vpn_credentials_server2',
        ])
      );
    });
  });

  // ===================================================================
  // 9. BIOMETRIC SUPPORT
  // ===================================================================
  describe('Biometric Support', () => {
    it('should detect Face ID support', async () => {
      mockKeychain.getSupportedBiometryType.mockResolvedValueOnce(Keychain.BIOMETRY_TYPE.FACE_ID);

      const type = await secureStorage.getSupportedBiometricType();

      expect(type).toBe('FaceID');
    });

    it('should detect Touch ID support', async () => {
      mockKeychain.getSupportedBiometryType.mockResolvedValueOnce(Keychain.BIOMETRY_TYPE.TOUCH_ID);

      const type = await secureStorage.getSupportedBiometricType();

      expect(type).toBe('TouchID');
    });

    it('should detect fingerprint support on Android', async () => {
      mockKeychain.getSupportedBiometryType.mockResolvedValueOnce(Keychain.BIOMETRY_TYPE.FINGERPRINT);

      const type = await secureStorage.getSupportedBiometricType();

      expect(type).toBe('Fingerprint');
    });

    it('should detect iris support on Android', async () => {
      mockKeychain.getSupportedBiometryType.mockResolvedValueOnce(Keychain.BIOMETRY_TYPE.IRIS);

      const type = await secureStorage.getSupportedBiometricType();

      expect(type).toBe('Iris');
    });

    it('should return null when biometric not supported', async () => {
      mockKeychain.getSupportedBiometryType.mockResolvedValueOnce(null);

      const type = await secureStorage.getSupportedBiometricType();

      expect(type).toBeNull();
    });
  });

  // ===================================================================
  // 10. CLEAR OPERATIONS
  // ===================================================================
  describe('Clear Operations', () => {
    it('should clear all secure storage', async () => {
      // Pre-populate AsyncStorage with some secure data
      await mockAsyncStorage.setItem('@geoleap_secure_auth_tokens', 'test-data');
      await mockAsyncStorage.setItem('@geoleap_secure_user_data', 'test-data');
      await mockAsyncStorage.setItem('@geoleap_secure_session_data', 'test-data');

      await secureStorage.clearAll();

      // clearAll calls resetInternetCredentials for keychain and removeItem for AsyncStorage
      expect(mockKeychain.resetInternetCredentials).toHaveBeenCalled();
      expect(mockAsyncStorage.removeItem).toHaveBeenCalled();
    });

    it('should handle errors during clear all gracefully', async () => {
      mockKeychain.resetInternetCredentials.mockRejectedValueOnce(new Error('Keychain error'));

      // The implementation throws an error when clearAll fails
      await expect(secureStorage.clearAll()).rejects.toThrow('Failed to clear all stored data');
    });
  });

  // ===================================================================
  // 11. AUTHENTICATION STATUS
  // ===================================================================
  describe('Authentication Status', () => {
    it('should return true when auth data exists', async () => {
      const mockTokens: AuthTokens = {
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 3600000,
        tokenType: 'Bearer',
      };

      const storedData = JSON.stringify({
        data: mockTokens,
        timestamp: Date.now(),
        version: '1.0.0',
      });

      mockKeychain.getInternetCredentials.mockResolvedValueOnce({
        username: 'auth_tokens',
        password: storedData,
        service: 'GeoLeap',
        storage: 'keychain',
      });

      const hasAuth = await secureStorage.hasAuthenticationData();

      expect(hasAuth).toBe(true);
    });

    it('should return false when no auth data exists', async () => {
      mockKeychain.getInternetCredentials.mockResolvedValueOnce(false);

      const hasAuth = await secureStorage.hasAuthenticationData();

      expect(hasAuth).toBe(false);
    });
  });

  // ===================================================================
  // 12. STORAGE INFO
  // ===================================================================
  describe('Storage Info', () => {
    it('should return storage information', async () => {
      const mockTokens: AuthTokens = {
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 3600000,
        tokenType: 'Bearer',
      };

      const mockUser: User = {
        id: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
        emailVerified: true,
      };

      // Store tokens and user
      await secureStorage.storeTokens(mockTokens);
      await secureStorage.storeUser(mockUser);

      const info = await secureStorage.getStorageInfo();

      expect(info).toHaveProperty('hasTokens');
      expect(info).toHaveProperty('hasUser');
      expect(info).toHaveProperty('hasBiometricKey');
      expect(info).toHaveProperty('usingFallback');
      expect(info).toHaveProperty('biometricSupported');
      expect(info.hasTokens).toBe(true);
      expect(info.hasUser).toBe(true);
    });

    it('should indicate fallback usage', () => {
      Object.defineProperty(Platform, 'OS', {
        get: () => 'web',
        configurable: true,
      });

      // Reset singleton to pick up the new Platform.OS value
      // @ts-expect-error - Accessing private static field for testing
      SecureStorageService.instance = undefined;

      const newInstance = SecureStorageService.getInstance();
      const fallback = newInstance.isUsingFallback();

      expect(fallback).toBe(true);
    });
  });

  // ===================================================================
  // 13. ERROR HANDLING & EDGE CASES
  // ===================================================================
  describe('Error Handling & Edge Cases', () => {
    it('should handle keychain setInternetCredentials errors', async () => {
      mockKeychain.setInternetCredentials.mockRejectedValueOnce(new Error('Keychain error'));

      const mockTokens: AuthTokens = {
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 3600000,
        tokenType: 'Bearer',
      };

      // Should fallback to AsyncStorage
      await expect(secureStorage.storeTokens(mockTokens)).resolves.not.toThrow();
      expect(mockAsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should handle keychain getInternetCredentials errors', async () => {
      mockKeychain.getInternetCredentials.mockRejectedValueOnce(new Error('Keychain error'));

      const tokens = await secureStorage.getTokens();

      expect(tokens).toBeNull();
    });

    it('should handle AsyncStorage setItem errors', async () => {
      mockAsyncStorage.setItem.mockRejectedValueOnce(new Error('Storage error'));

      const mockSettings = { theme: 'light' };

      // The implementation throws an error when AsyncStorage fails
      await expect(secureStorage.storeAppSettings(mockSettings)).rejects.toThrow('Failed to store app settings');
    });

    it('should handle AsyncStorage getItem errors', async () => {
      mockAsyncStorage.getItem.mockRejectedValueOnce(new Error('Storage error'));

      const settings = await secureStorage.getAppSettings();

      expect(settings).toBeNull();
    });

    it('should handle corrupted JSON data gracefully', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce('invalid json{{{');

      const settings = await secureStorage.getSecuritySettings();

      expect(settings).toBeNull();
    });

    it('should handle empty data gracefully', async () => {
      mockKeychain.getInternetCredentials.mockResolvedValueOnce({
        username: 'auth_tokens',
        password: '',
        service: 'GeoLeap',
        storage: 'keychain',
      });

      const tokens = await secureStorage.getTokens();

      expect(tokens).toBeNull();
    });

    it('should handle biometric authentication failure', async () => {
      mockKeychain.getInternetCredentials.mockRejectedValueOnce(
        new Error('User canceled biometric authentication')
      );

      const tokens = await secureStorage.getTokens({ biometric: true });

      expect(tokens).toBeNull();
    });

    it('should handle null/undefined inputs gracefully', async () => {
      await expect(secureStorage.storeTokens(null as any)).resolves.not.toThrow();
      await expect(secureStorage.storeUser(undefined as any)).resolves.not.toThrow();
    });
  });

  // ===================================================================
  // 14. CONCURRENT OPERATIONS
  // ===================================================================
  describe('Concurrent Operations', () => {
    it('should handle concurrent token storage', async () => {
      const tokens1: AuthTokens = {
        accessToken: 'token1',
        refreshToken: 'refresh1',
        expiresAt: Date.now() + 3600000,
        tokenType: 'Bearer',
      };

      const tokens2: AuthTokens = {
        accessToken: 'token2',
        refreshToken: 'refresh2',
        expiresAt: Date.now() + 3600000,
        tokenType: 'Bearer',
      };

      await Promise.all([
        secureStorage.storeTokens(tokens1),
        secureStorage.storeTokens(tokens2),
      ]);

      // Both should complete without errors
      expect(mockKeychain.setInternetCredentials).toHaveBeenCalledTimes(2);
    });

    it('should handle concurrent reads', async () => {
      // First store some tokens
      const mockTokens: AuthTokens = {
        accessToken: 'test-token',
        refreshToken: 'test-refresh',
        expiresAt: Date.now() + 3600000,
        tokenType: 'Bearer',
      };
      await secureStorage.storeTokens(mockTokens);

      // Then perform concurrent reads
      const reads = await Promise.all([
        secureStorage.getTokens(),
        secureStorage.getTokens(),
        secureStorage.getTokens(),
      ]);

      expect(reads).toHaveLength(3);
      // All reads should return the same tokens
      reads.forEach(tokens => {
        expect(tokens).toEqual(mockTokens);
      });
    });
  });

  // ===================================================================
  // 15. INTEGRATION SCENARIOS
  // ===================================================================
  describe('Integration Scenarios', () => {
    it('should handle complete authentication flow', async () => {
      // 1. Check if authenticated (should be false initially)
      mockKeychain.getInternetCredentials.mockResolvedValueOnce(false);
      const hasAuth = await secureStorage.hasAuthenticationData();
      expect(hasAuth).toBe(false);

      // 2. Store tokens
      const tokens: AuthTokens = {
        accessToken: 'new_token',
        refreshToken: 'new_refresh',
        expiresAt: Date.now() + 3600000,
        tokenType: 'Bearer',
      };
      await secureStorage.storeTokens(tokens);

      // Verify store was called
      expect(mockKeychain.setInternetCredentials).toHaveBeenCalled();

      // 3. Clear all
      mockAsyncStorage.getAllKeys.mockResolvedValueOnce([]);
      await secureStorage.clearAll();
      expect(mockKeychain.resetInternetCredentials).toHaveBeenCalled();
    });

    it('should handle VPN credential lifecycle', async () => {
      const serverId = 'vpn_us_1';
      const credentials = {
        username: 'vpn_user',
        password: 'vpn_pass',
        certificate: 'cert_data',
      };

      // 1. Check credentials don't exist
      mockKeychain.getInternetCredentials.mockResolvedValueOnce(false);
      const exists = await secureStorage.hasVpnCredentials(serverId);
      expect(exists).toBe(false);

      // 2. Store credentials
      await secureStorage.storeVpnCredentials(
        serverId,
        credentials.username,
        credentials.password,
        undefined,
        { certificate: credentials.certificate }
      );

      // Verify store was called
      expect(mockKeychain.setInternetCredentials).toHaveBeenCalled();

      // 3. Remove credentials
      await secureStorage.removeVpnCredentials(serverId);
      expect(mockKeychain.resetInternetCredentials).toHaveBeenCalled();
    });
  });
});
