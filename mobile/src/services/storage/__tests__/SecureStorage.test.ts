/**
 * Comprehensive Tests for SecureStorage Service
 * Target: 0% → 80%+ coverage
 *
 * Test Categories:
 * 1. Singleton Pattern
 * 2. Keychain Availability Detection
 * 3. AsyncStorage Fallback (Expo Go)
 * 4. Token Management
 * 5. User Data Management
 * 6. Biometric Key Storage
 * 7. Security Settings
 * 8. App Settings
 * 9. Session Data
 * 10. VPN Credentials (BUG-178 fix)
 * 11. Encryption/Decryption
 * 12. Error Handling
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import { SecureStorageService } from '../SecureStorage';
import { AuthTokens, User, SecuritySettings } from '../../../types/auth';

// Mock dependencies
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    Version: '17.0',
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
    getAllKeys: jest.fn(),
    multiRemove: jest.fn(),
  },
}));

// Note: react-native-keychain is mocked centrally in jest.setup.libraries.js
// with functional storage that preserves encryption_key across tests

// NOTE: react-native-aes-crypto mock is defined in jest.setup.libraries.js
// We don't override it here to ensure consistent behavior across all tests

jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const mockedAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockedKeychain = Keychain as jest.Mocked<typeof Keychain>;

// Shared functional keychain storage across all tests (must be outside describe block)
const keychainStorage: Record<string, any> = {};

describe('SecureStorageService', () => {
  let secureStorage: SecureStorageService;

  // Mock data
  const mockTokens: AuthTokens = {
    accessToken: 'test-access-token',
    refreshToken: 'test-refresh-token',
    expiresAt: Date.now() + 3600000,
    tokenType: 'Bearer',
  };

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    displayName: 'Test User',
    profilePicture: null,
    isPremium: false,
    createdAt: new Date().toISOString(),
  };

  const mockSecuritySettings: SecuritySettings = {
    biometricEnabled: true,
    requireBiometricForSensitiveActions: true,
    autoLockEnabled: false,
    autoLockTimeout: 300,
    lastPasswordChange: new Date().toISOString(),
  };

  beforeEach(() => {
    // Clear functional keychain storage (preserves encryption_key)
    if (mockedKeychain.__clearStorage) {
      mockedKeychain.__clearStorage();
    }

    // Reset singleton instance (use reflection to access private static field)
    // @ts-expect-error - Accessing private static field for testing
    SecureStorageService.instance = undefined;

    // Reset all mocks to clear global mock implementations
    jest.resetAllMocks();

    // Reset functional storage (clear all keys)
    Object.keys(keychainStorage).forEach(key => delete keychainStorage[key]);

    // Default: AsyncStorage available
    mockedAsyncStorage.getItem.mockResolvedValue(null);
    mockedAsyncStorage.setItem.mockResolvedValue();
    mockedAsyncStorage.removeItem.mockResolvedValue();
    mockedAsyncStorage.clear.mockResolvedValue();
    mockedAsyncStorage.getAllKeys.mockResolvedValue([]);
    mockedAsyncStorage.multiRemove.mockResolvedValue();

    // Setup Keychain mocks to use functional storage
    mockedKeychain.setInternetCredentials.mockImplementation((server, username, password, options) => {
      keychainStorage[server] = {
        username,
        password,
        service: options?.service || 'GeoLeap',
        storage: 'keychain',
      };
      return Promise.resolve({ service: options?.service || 'GeoLeap', storage: 'keychain' });
    });
    mockedKeychain.getInternetCredentials.mockImplementation((server) => {
      if (keychainStorage[server]) {
        return Promise.resolve(keychainStorage[server]);
      }
      return Promise.resolve(false);
    });
    mockedKeychain.resetInternetCredentials.mockImplementation((server) => {
      if (keychainStorage[server]) {
        delete keychainStorage[server];
        return Promise.resolve(true);
      }
      return Promise.resolve(false);
    });

    // Mock getSupportedBiometryType
    mockedKeychain.getSupportedBiometryType.mockResolvedValue(null);
  });

  // ============================================
  // 1. Singleton Pattern
  // ============================================
  describe('Singleton Pattern', () => {
    it('should return the same instance on multiple getInstance calls', () => {
      const instance1 = SecureStorageService.getInstance();
      const instance2 = SecureStorageService.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should create instance only once', () => {
      const instance1 = SecureStorageService.getInstance();
      const instance2 = SecureStorageService.getInstance();
      const instance3 = SecureStorageService.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance2).toBe(instance3);
    });
  });

  // ============================================
  // 2. Keychain Availability Detection
  // ============================================
  describe('Keychain Availability Detection', () => {
    it('should detect Keychain availability on native build', async () => {
      mockedKeychain.getInternetCredentials.mockResolvedValueOnce(false);

      secureStorage = SecureStorageService.getInstance();

      // Wait for initialization
      await secureStorage.storeTokens(mockTokens);

      // Should use Keychain, not AsyncStorage
      expect(mockedKeychain.setInternetCredentials).toHaveBeenCalled();
      expect(mockedAsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('should detect Expo Go and use AsyncStorage fallback', async () => {
      // Simulate Expo Go error
      mockedKeychain.getInternetCredentials.mockRejectedValue(
        new Error('getInternetCredentialsForServer is null')
      );

      secureStorage = SecureStorageService.getInstance();

      // Wait for initialization and operation
      await secureStorage.storeTokens(mockTokens);

      // Should use AsyncStorage fallback
      expect(mockedAsyncStorage.setItem).toHaveBeenCalled();
      expect(mockedKeychain.setInternetCredentials).not.toHaveBeenCalled();
    });

    it('should detect web platform and use AsyncStorage', async () => {
      // Mock web platform
      (Platform.OS as any) = 'web';

      // Reset singleton to trigger re-initialization
      // @ts-expect-error - Accessing private static field for testing
      SecureStorageService.instance = undefined;

      secureStorage = SecureStorageService.getInstance();

      await secureStorage.storeTokens(mockTokens);

      // Should use AsyncStorage on web
      expect(mockedAsyncStorage.setItem).toHaveBeenCalled();

      // Restore iOS platform
      (Platform.OS as any) = 'ios';
    });

    it('should handle Keychain module not available', async () => {
      // Simulate missing Keychain module
      mockedKeychain.getInternetCredentials.mockRejectedValue(
        new Error('Keychain module not available')
      );

      secureStorage = SecureStorageService.getInstance();

      await secureStorage.storeTokens(mockTokens);

      // Should fallback to AsyncStorage
      expect(mockedAsyncStorage.setItem).toHaveBeenCalled();
    });
  });

  // ============================================
  // 3. AsyncStorage Fallback (Expo Go)
  // ============================================
  describe('AsyncStorage Fallback (Expo Go)', () => {
    beforeEach(async () => {
      // Force Expo Go mode
      mockedKeychain.getInternetCredentials.mockRejectedValue(
        new Error('getInternetCredentialsForServer is null')
      );

      // Reset singleton
      // @ts-expect-error
      SecureStorageService.instance = undefined;

      secureStorage = SecureStorageService.getInstance();
    });

    it('should store encryption key in AsyncStorage in Expo Go mode', async () => {
      await secureStorage.storeTokens(mockTokens);

      // Should store encryption key
      expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(
        expect.stringContaining('encryption_key'),
        expect.any(String)
      );
    });

    it('should use base64 encoding instead of AES encryption in Expo Go', async () => {
      await secureStorage.storeTokens(mockTokens);

      // Should use AsyncStorage
      expect(mockedAsyncStorage.setItem).toHaveBeenCalled();

      const [[_key, storedData]] = mockedAsyncStorage.setItem.mock.calls.filter(
        call => call[0].includes('auth_tokens')
      );

      // Should be base64 encoded (not AES encrypted)
      expect(storedData).toBeDefined();
      expect(storedData).toContain('expo-go-dev'); // IV marker for Expo Go
    });

    it('should retrieve tokens from AsyncStorage in Expo Go mode', async () => {
      // In Expo Go mode, data is base64 encoded with 'expo-go-dev' IV marker
      const storageItem = {
        data: mockTokens,
        timestamp: Date.now(),
        encrypted: true,
        version: '1.0.0',
      };
      const jsonString = JSON.stringify(storageItem);
      const base64Encoded = Buffer.from(jsonString).toString('base64');
      const storedFormat = `expo-go-dev:${base64Encoded}`; // Format: IV:encrypted

      mockedAsyncStorage.getItem.mockResolvedValue(storedFormat);

      const tokens = await secureStorage.getTokens();

      expect(tokens).toEqual(mockTokens);
      expect(mockedAsyncStorage.getItem).toHaveBeenCalled();
    });
  });

  // ============================================
  // 4. Token Management
  // ============================================
  describe('Token Management', () => {
    beforeEach(() => {
      mockedKeychain.getInternetCredentials.mockResolvedValueOnce(false);
      secureStorage = SecureStorageService.getInstance();
    });

    it('should store tokens with default encryption', async () => {
      await secureStorage.storeTokens(mockTokens);

      expect(mockedKeychain.setInternetCredentials).toHaveBeenCalledWith(
        'auth_tokens',
        'tokens',
        expect.any(String),
        expect.objectContaining({
          service: 'GeoLeap',
        })
      );
    });

    it('should store tokens with biometric protection', async () => {
      await secureStorage.storeTokens(mockTokens, { biometric: true });

      expect(mockedKeychain.setInternetCredentials).toHaveBeenCalledWith(
        'auth_tokens',
        'tokens',
        expect.any(String),
        expect.objectContaining({
          accessControl: 'BiometryAny',
          authenticationType: 'AuthenticationWithBiometrics',
        })
      );
    });

    it('should retrieve stored tokens successfully', async () => {
      // Store tokens first
      await secureStorage.storeTokens(mockTokens);

      // Then retrieve them
      const tokens = await secureStorage.getTokens();

      expect(tokens).toBeDefined();
      expect(tokens?.accessToken).toBe(mockTokens.accessToken);
      expect(tokens?.refreshToken).toBe(mockTokens.refreshToken);
      expect(mockedKeychain.getInternetCredentials).toHaveBeenCalledWith('auth_tokens');
    });

    it('should return null if tokens not found', async () => {
      mockedKeychain.getInternetCredentials.mockResolvedValueOnce(false);

      const tokens = await secureStorage.getTokens();

      expect(tokens).toBeNull();
    });

    it('should remove tokens successfully', async () => {
      await secureStorage.removeTokens();

      expect(mockedKeychain.resetInternetCredentials).toHaveBeenCalledWith('auth_tokens');
    });

    it('should handle token storage error and fallback to AsyncStorage', async () => {
      mockedKeychain.setInternetCredentials.mockRejectedValue(
        new Error('Keychain storage failed')
      );

      await secureStorage.storeTokens(mockTokens);

      // Should fallback to AsyncStorage
      expect(mockedAsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should handle token retrieval error and fallback to AsyncStorage', async () => {
      mockedKeychain.getInternetCredentials.mockRejectedValue(
        new Error('Keychain retrieval failed')
      );

      const mockStoredData = JSON.stringify({
        data: mockTokens,
        timestamp: Date.now(),
        encrypted: false,
        version: '1.0.0',
      });

      mockedAsyncStorage.getItem.mockResolvedValue(mockStoredData);

      const tokens = await secureStorage.getTokens();

      expect(tokens).toEqual(mockTokens);
      expect(mockedAsyncStorage.getItem).toHaveBeenCalled();
    });
  });

  // ============================================
  // 5. User Data Management
  // ============================================
  describe('User Data Management', () => {
    beforeEach(() => {
      mockedKeychain.getInternetCredentials.mockResolvedValueOnce(false);
      secureStorage = SecureStorageService.getInstance();
    });

    it('should store user data with encryption', async () => {
      await secureStorage.storeUser(mockUser);

      expect(mockedKeychain.setInternetCredentials).toHaveBeenCalledWith(
        'user_data',
        'user',
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should store user data with biometric requirement', async () => {
      await secureStorage.storeUser(mockUser, { requireBiometricOnAccess: true });

      expect(mockedKeychain.setInternetCredentials).toHaveBeenCalledWith(
        'user_data',
        'user',
        expect.any(String),
        expect.objectContaining({
          accessControl: 'BiometryAny',
          authenticationType: 'AuthenticationWithBiometrics',
        })
      );
    });

    it('should retrieve stored user data successfully', async () => {
      // Store user first
      await secureStorage.storeUser(mockUser);

      // Then retrieve
      const user = await secureStorage.getUser();

      expect(user).toBeDefined();
      expect(user?.id).toBe(mockUser.id);
      expect(user?.email).toBe(mockUser.email);
      expect(mockedKeychain.getInternetCredentials).toHaveBeenCalledWith('user_data');
    });

    it('should return null if user data not found', async () => {
      mockedKeychain.getInternetCredentials.mockResolvedValueOnce(false);

      const user = await secureStorage.getUser();

      expect(user).toBeNull();
    });
  });

  // ============================================
  // 6. Biometric Key Storage
  // ============================================
  describe('Biometric Key Storage', () => {
    beforeEach(() => {
      mockedKeychain.getInternetCredentials.mockResolvedValueOnce(false);
      secureStorage = SecureStorageService.getInstance();
    });

    it('should store biometric key with biometric protection', async () => {
      await secureStorage.storeBiometricKey('test-biometric-key');

      expect(mockedKeychain.setInternetCredentials).toHaveBeenCalledWith(
        'biometric_key',
        'biometric',
        expect.any(String),
        expect.objectContaining({
          accessControl: 'BiometryAny',
          authenticationType: 'AuthenticationWithBiometrics',
        })
      );
    });

    it('should retrieve biometric key successfully', async () => {
      // Store key first
      await secureStorage.storeBiometricKey('test-biometric-key');

      // Then retrieve
      const key = await secureStorage.getBiometricKey();

      expect(key).toBe('test-biometric-key');
    });

    it('should return null if biometric key not found', async () => {
      mockedKeychain.getInternetCredentials.mockResolvedValueOnce(false);

      const key = await secureStorage.getBiometricKey();

      expect(key).toBeNull();
    });
  });

  // ============================================
  // 7. Security Settings
  // ============================================
  describe('Security Settings', () => {
    beforeEach(() => {
      mockedKeychain.getInternetCredentials.mockResolvedValueOnce(false);
      secureStorage = SecureStorageService.getInstance();
    });

    it('should store security settings', async () => {
      await secureStorage.storeSecuritySettings(mockSecuritySettings);

      // Security settings use AsyncStorage directly (not Keychain)
      expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(
        'security_settings',
        expect.any(String)
      );
    });

    it('should retrieve security settings successfully', async () => {
      // Store settings first
      await secureStorage.storeSecuritySettings(mockSecuritySettings);

      // Mock AsyncStorage to return the stored settings
      const storedData = JSON.stringify(mockSecuritySettings);
      mockedAsyncStorage.getItem.mockResolvedValue(storedData);

      // Then retrieve
      const settings = await secureStorage.getSecuritySettings();

      expect(settings).toBeDefined();
      expect(settings?.biometricEnabled).toBe(mockSecuritySettings.biometricEnabled);
      expect(settings?.requireBiometricForSensitiveActions).toBe(mockSecuritySettings.requireBiometricForSensitiveActions);
    });

    it('should return null if security settings not found', async () => {
      mockedKeychain.getInternetCredentials.mockResolvedValueOnce(false);

      const settings = await secureStorage.getSecuritySettings();

      expect(settings).toBeNull();
    });
  });

  // ============================================
  // 8. App Settings
  // ============================================
  describe('App Settings', () => {
    beforeEach(() => {
      mockedKeychain.getInternetCredentials.mockResolvedValueOnce(false);
      secureStorage = SecureStorageService.getInstance();
    });

    const mockAppSettings = {
      theme: 'light',
      language: 'en',
      notifications: true,
    };

    it('should store app settings', async () => {
      await secureStorage.storeAppSettings(mockAppSettings);

      // App settings use AsyncStorage directly (not Keychain)
      expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(
        'app_settings',
        expect.any(String)
      );
    });

    it('should retrieve app settings successfully', async () => {
      // Store settings first
      await secureStorage.storeAppSettings(mockAppSettings);

      // Mock AsyncStorage to return the stored settings
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockAppSettings));

      // Then retrieve
      const settings = await secureStorage.getAppSettings();

      expect(settings).toEqual(mockAppSettings);
    });

    it('should return null if app settings not found', async () => {
      mockedKeychain.getInternetCredentials.mockResolvedValueOnce(false);

      const settings = await secureStorage.getAppSettings();

      expect(settings).toBeNull();
    });
  });

  // ============================================
  // 9. Session Data
  // ============================================
  describe('Session Data', () => {
    beforeEach(() => {
      mockedKeychain.getInternetCredentials.mockResolvedValueOnce(false);
      secureStorage = SecureStorageService.getInstance();
    });

    const mockSessionData = {
      lastActive: Date.now(),
      deviceId: 'device-123',
      sessionId: 'session-456',
    };

    it('should store session data', async () => {
      await secureStorage.storeSessionData(mockSessionData);

      // Session data uses AsyncStorage directly (not Keychain)
      expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(
        'session_data',
        expect.any(String)
      );
    });

    it('should retrieve session data successfully', async () => {
      // Store session data first
      await secureStorage.storeSessionData(mockSessionData);

      // Mock AsyncStorage to return the stored session
      const sessionWrapper = {
        data: mockSessionData,
        timestamp: Date.now(),
        expiresAt: Date.now() + (24 * 60 * 60 * 1000),
      };
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify(sessionWrapper));

      // Then retrieve
      const sessionData = await secureStorage.getSessionData();

      expect(sessionData).toBeDefined();
      expect(sessionData?.deviceId).toBe(mockSessionData.deviceId);
      expect(sessionData?.sessionId).toBe(mockSessionData.sessionId);
    });

    it('should return null if session data not found', async () => {
      mockedKeychain.getInternetCredentials.mockResolvedValueOnce(false);

      const sessionData = await secureStorage.getSessionData();

      expect(sessionData).toBeNull();
    });

    it('should return null if session data expired (older than 24 hours)', async () => {
      const expiredTimestamp = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago
      const expiredExpiresAt = expiredTimestamp + (24 * 60 * 60 * 1000); // Already expired

      const mockStoredData = JSON.stringify({
        data: mockSessionData,
        timestamp: expiredTimestamp,
        expiresAt: expiredExpiresAt,
      });

      // Session data uses AsyncStorage, not Keychain
      mockedAsyncStorage.getItem.mockResolvedValue(mockStoredData);

      const sessionData = await secureStorage.getSessionData();

      expect(sessionData).toBeNull();
    });
  });

  // ============================================
  // 10. VPN Credentials (BUG-178 fix)
  // ============================================
  describe('VPN Credentials (BUG-178 fix)', () => {
    beforeEach(() => {
      mockedKeychain.getInternetCredentials.mockResolvedValueOnce(false);
      secureStorage = SecureStorageService.getInstance();
    });

    const mockVpnCredentials = {
      username: 'vpn-user',
      password: 'vpn-password',
      serverUrl: 'vpn.example.com',
    };

    it('should store VPN credentials with encryption', async () => {
      await secureStorage.storeVpnCredentials(
        'server-123',
        mockVpnCredentials.username,
        mockVpnCredentials.password,
        mockVpnCredentials.serverUrl
      );

      expect(mockedKeychain.setInternetCredentials).toHaveBeenCalledWith(
        'vpn_credentials_server-123',
        'vpn-user',
        expect.any(String),
        expect.objectContaining({
          accessControl: 'DevicePasscode',
          accessible: 'WhenUnlockedThisDeviceOnly',
          authenticationType: 'AuthenticationWithBiometricsDevicePasscode',
        })
      );
    });

    it('should retrieve VPN credentials successfully', async () => {
      // Store credentials first
      await secureStorage.storeVpnCredentials(
        'server-123',
        mockVpnCredentials.username,
        mockVpnCredentials.password,
        mockVpnCredentials.serverUrl
      );

      // Then retrieve them
      const credentials = await secureStorage.getVpnCredentials('server-123');

      expect(credentials).toBeDefined();
      expect(credentials?.username).toBe(mockVpnCredentials.username);
      expect(credentials?.password).toBe(mockVpnCredentials.password);
      expect(credentials?.serverUrl).toBe(mockVpnCredentials.serverUrl);
      expect(mockedKeychain.getInternetCredentials).toHaveBeenCalledWith(
        'vpn_credentials_server-123'
      );
    });

    it('should remove VPN credentials for specific server', async () => {
      await secureStorage.removeVpnCredentials('server-123');

      expect(mockedKeychain.resetInternetCredentials).toHaveBeenCalledWith(
        'vpn_credentials_server-123'
      );
    });

    it('should clear all VPN credentials', async () => {
      // NOTE: This test only works in Expo Go mode (AsyncStorage fallback)
      // because Keychain doesn't support listing all keys
      // Force Expo Go mode for this test
      mockedKeychain.getInternetCredentials.mockRejectedValue(
        new Error('getInternetCredentialsForServer is null')
      );

      // Reset singleton to apply Expo Go mode
      // @ts-expect-error - Accessing private static field for testing
      SecureStorageService.instance = undefined;
      secureStorage = SecureStorageService.getInstance();

      // Mock getAllKeys to return VPN credential keys
      mockedAsyncStorage.getAllKeys.mockResolvedValue([
        '@geoleap_secure_vpn_credentials_server-1',
        '@geoleap_secure_vpn_credentials_server-2',
        '@geoleap_secure_auth_tokens',
      ]);

      await secureStorage.clearAllVpnCredentials();

      // Should remove VPN credentials keys
      expect(mockedAsyncStorage.multiRemove).toHaveBeenCalledWith([
        '@geoleap_secure_vpn_credentials_server-1',
        '@geoleap_secure_vpn_credentials_server-2',
      ]);
    });

    it('should use WHEN_UNLOCKED_THIS_DEVICE_ONLY security level (exclude from backups)', async () => {
      await secureStorage.storeVpnCredentials(
        'server-123',
        mockVpnCredentials.username,
        mockVpnCredentials.password,
        mockVpnCredentials.serverUrl
      );

      // Verify highest security level used
      expect(mockedKeychain.setInternetCredentials).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          accessControl: 'DevicePasscode',
          accessible: 'WhenUnlockedThisDeviceOnly',
        })
      );
    });
  });

  // ============================================
  // 11. Encryption/Decryption
  // ============================================
  describe('Encryption/Decryption', () => {
    beforeEach(() => {
      mockedKeychain.getInternetCredentials.mockResolvedValueOnce(false);
      secureStorage = SecureStorageService.getInstance();
    });

    it('should encrypt tokens before storing', async () => {
      await secureStorage.storeTokens(mockTokens, { encrypt: true });

      // Find the auth_tokens call (not encryption_key call)
      const authTokensCall = mockedKeychain.setInternetCredentials.mock.calls.find(
        call => call[0] === 'auth_tokens'
      );
      expect(authTokensCall).toBeDefined();

      const [_key, _username, storedData] = authTokensCall!;

      // Should contain encryption metadata (IV:encrypted format)
      expect(storedData).toContain(':');
    });

    it('should decrypt tokens when retrieving', async () => {
      // Store tokens with encryption first
      await secureStorage.storeTokens(mockTokens, { encrypt: true });

      // Then retrieve them
      const tokens = await secureStorage.getTokens({ encrypt: true });

      expect(tokens).toBeDefined();
      expect(tokens?.accessToken).toBe(mockTokens.accessToken);
    });

    it('should handle decryption failure gracefully', async () => {
      // Store invalid encrypted data directly
      keychainStorage['auth_tokens'] = {
        service: 'GeoLeap',
        username: 'tokens',
        password: 'invalid-encrypted-data-without-iv',
        storage: 'keychain',
      };

      // parseStorageItem will throw, but getTokens catches and returns null
      const tokens = await secureStorage.getTokens({ encrypt: true });

      expect(tokens).toBeNull();
      // Should also try AsyncStorage fallback
      expect(mockedAsyncStorage.getItem).toHaveBeenCalledWith(
        '@geoleap_secure_auth_tokens'
      );
    });
  });

  // ============================================
  // 12. Error Handling
  // ============================================
  describe('Error Handling', () => {
    beforeEach(() => {
      mockedKeychain.getInternetCredentials.mockResolvedValueOnce(false);
      secureStorage = SecureStorageService.getInstance();
    });

    it('should throw error if token storage fails completely', async () => {
      mockedKeychain.setInternetCredentials.mockRejectedValue(
        new Error('Keychain write failed')
      );
      mockedAsyncStorage.setItem.mockRejectedValue(
        new Error('AsyncStorage write failed')
      );

      await expect(secureStorage.storeTokens(mockTokens)).rejects.toThrow(
        'Failed to store authentication tokens'
      );
    });

    it('should handle null/undefined data gracefully', async () => {
      mockedKeychain.getInternetCredentials.mockResolvedValue({
        service: 'GeoLeap',
        username: 'tokens',
        password: '', // Empty password
        storage: 'keychain',
      });

      const tokens = await secureStorage.getTokens();

      expect(tokens).toBeNull();
    });

    it('should handle invalid JSON data gracefully', async () => {
      // Store invalid JSON directly in keychain storage
      keychainStorage['auth_tokens'] = {
        service: 'GeoLeap',
        username: 'tokens',
        password: 'invalid-json-{]',
        storage: 'keychain',
      };

      // parseStorageItem will throw, but getTokens catches and returns null
      const tokens = await secureStorage.getTokens();

      expect(tokens).toBeNull();
      // Should also try AsyncStorage fallback
      expect(mockedAsyncStorage.getItem).toHaveBeenCalledWith(
        '@geoleap_secure_auth_tokens'
      );
    });

    it('should handle version mismatch in stored data', async () => {
      const mockStoredData = JSON.stringify({
        data: mockTokens,
        timestamp: Date.now(),
        encrypted: false,
        version: '0.9.0', // Old version
      });

      // Store directly in keychain storage
      keychainStorage['auth_tokens'] = {
        service: 'GeoLeap',
        username: 'tokens',
        password: mockStoredData,
        storage: 'keychain',
      };

      const tokens = await secureStorage.getTokens();

      // Should still return data despite version mismatch
      expect(tokens).toEqual(mockTokens);
    });

    it('should handle missing IV in encrypted data', async () => {
      const mockStoredData = JSON.stringify({
        data: mockTokens,
        timestamp: Date.now(),
        encrypted: true,
        version: '1.0.0',
      });

      // Missing IV (no ':' separator) - store directly
      keychainStorage['auth_tokens'] = {
        service: 'GeoLeap',
        username: 'tokens',
        password: `encrypted-${mockStoredData}`, // No IV
        storage: 'keychain',
      };

      // parseStorageItem will throw due to missing IV, but getTokens catches and returns null
      const tokens = await secureStorage.getTokens({ encrypt: true });

      expect(tokens).toBeNull();
      // Should also try AsyncStorage fallback
      expect(mockedAsyncStorage.getItem).toHaveBeenCalledWith(
        '@geoleap_secure_auth_tokens'
      );
    });

    it('should clear all storage successfully', async () => {
      await secureStorage.clearAll();

      // Should reset Keychain keys (auth_tokens, biometric_key, user_data)
      expect(mockedKeychain.resetInternetCredentials).toHaveBeenCalledTimes(3);
      expect(mockedKeychain.resetInternetCredentials).toHaveBeenCalledWith('auth_tokens');
      expect(mockedKeychain.resetInternetCredentials).toHaveBeenCalledWith('user_data');
      expect(mockedKeychain.resetInternetCredentials).toHaveBeenCalledWith('biometric_key');

      // Should also clear AsyncStorage items (security_settings, app_settings, session_data, etc)
      expect(mockedAsyncStorage.removeItem).toHaveBeenCalledWith('security_settings');
      expect(mockedAsyncStorage.removeItem).toHaveBeenCalledWith('app_settings');
      expect(mockedAsyncStorage.removeItem).toHaveBeenCalledWith('session_data');
    });

    it('should handle clearAll errors gracefully', async () => {
      mockedKeychain.resetInternetCredentials.mockRejectedValue(
        new Error('Keychain clear failed')
      );

      // Should throw error when clearing fails
      await expect(secureStorage.clearAll()).rejects.toThrow(
        'Failed to clear all stored data'
      );
    });
  });

  // ============================================
  // 13. Storage Initialization
  // ============================================
  describe('Storage Initialization', () => {
    it('should initialize storage on first operation', async () => {
      secureStorage = SecureStorageService.getInstance();

      await secureStorage.storeTokens(mockTokens);

      // Should have checked keychain availability
      expect(mockedKeychain.getInternetCredentials).toHaveBeenCalled();
    });

    it('should only initialize once across multiple operations', async () => {
      secureStorage = SecureStorageService.getInstance();

      await secureStorage.storeTokens(mockTokens);
      await secureStorage.storeUser(mockUser);
      await secureStorage.storeSecuritySettings(mockSecuritySettings);

      // Keychain test should only be called once during initialization
      const testCalls = mockedKeychain.getInternetCredentials.mock.calls.filter(
        call => call[0] === '__keychain_test__'
      );
      expect(testCalls.length).toBe(1);
    });

    it('should handle initialization failure gracefully', async () => {
      mockedKeychain.getInternetCredentials.mockRejectedValue(
        new Error('Keychain unavailable')
      );
      mockedAsyncStorage.getItem.mockRejectedValue(
        new Error('AsyncStorage unavailable')
      );
      mockedAsyncStorage.setItem.mockRejectedValue(
        new Error('AsyncStorage unavailable')
      );

      // Reset singleton
      // @ts-expect-error
      SecureStorageService.instance = undefined;

      secureStorage = SecureStorageService.getInstance();

      // Should throw error if unable to initialize
      await expect(secureStorage.storeTokens(mockTokens)).rejects.toThrow();
    });
  });
});
