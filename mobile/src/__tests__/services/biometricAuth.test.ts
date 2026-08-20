/**
 * BiometricAuthService Tests
 *
 * Tests REAL business logic for biometric authentication.
 * Target: 80%+ coverage
 *
 * Philosophy: Execute real service logic, only mock external I/O
 * - Mock: expo-local-authentication, TokenStorageService, logger
 * - Real: All business logic, type mapping, settings management
 */

import * as LocalAuthentication from 'expo-local-authentication';
import { BiometricAuthService } from '../../services/biometricAuth';
import { TokenStorageService } from '../../services/tokenStorage';

// Mock external dependencies (I/O only)
jest.mock('expo-local-authentication');
jest.mock('../../services/tokenStorage');
jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe('BiometricAuthService', () => {
  let service: BiometricAuthService;
  let mockTokenStorage: jest.Mocked<TokenStorageService>;

  beforeEach(() => {
    // Clear mocks
    jest.clearAllMocks();

    // Reset the singleton instance to ensure fresh state
    (BiometricAuthService as any).instance = null;

    // Mock TokenStorageService
    mockTokenStorage = {
      storeBiometricKey: jest.fn().mockResolvedValue(undefined),
      getBiometricKey: jest.fn().mockResolvedValue(null),
      removeBiometricKey: jest.fn().mockResolvedValue(undefined),
    } as any;
    (TokenStorageService.getInstance as jest.Mock).mockReturnValue(mockTokenStorage);

    // Mock LocalAuthentication defaults
    (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
    (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
    (LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock).mockResolvedValue([
      LocalAuthentication.AuthenticationType.FINGERPRINT,
    ]);
    (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({ success: true });

    // Get fresh instance AFTER mocks are set up
    service = BiometricAuthService.getInstance();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = BiometricAuthService.getInstance();
      const instance2 = BiometricAuthService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('isAvailable()', () => {
    it('should return available true when hardware exists and user is enrolled', async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock).mockResolvedValue([
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
      ]);

      const result = await service.isAvailable();

      expect(result).toEqual({ available: true, biometryType: 'FaceID' });
      expect(LocalAuthentication.hasHardwareAsync).toHaveBeenCalled();
      expect(LocalAuthentication.isEnrolledAsync).toHaveBeenCalled();
      expect(LocalAuthentication.supportedAuthenticationTypesAsync).toHaveBeenCalled();
    });

    it('should return available false when hardware does not exist', async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(false);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);

      const result = await service.isAvailable();

      expect(result).toEqual({ available: false, biometryType: 'None' });
      expect(LocalAuthentication.supportedAuthenticationTypesAsync).not.toHaveBeenCalled();
    });

    it('should return available false when user is not enrolled', async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(false);

      const result = await service.isAvailable();

      expect(result).toEqual({ available: false, biometryType: 'None' });
      expect(LocalAuthentication.supportedAuthenticationTypesAsync).not.toHaveBeenCalled();
    });

    it('should map FINGERPRINT type correctly', async () => {
      (LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock).mockResolvedValue([
        LocalAuthentication.AuthenticationType.FINGERPRINT,
      ]);

      const result = await service.isAvailable();

      expect(result.biometryType).toBe('TouchID');
    });

    it('should map FACIAL_RECOGNITION type correctly', async () => {
      (LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock).mockResolvedValue([
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
      ]);

      const result = await service.isAvailable();

      expect(result.biometryType).toBe('FaceID');
    });

    it('should map IRIS type to Fingerprint', async () => {
      (LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock).mockResolvedValue([
        LocalAuthentication.AuthenticationType.IRIS,
      ]);

      const result = await service.isAvailable();

      expect(result.biometryType).toBe('Fingerprint');
    });

    it('should prioritize FACIAL_RECOGNITION over FINGERPRINT', async () => {
      (LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock).mockResolvedValue([
        LocalAuthentication.AuthenticationType.FINGERPRINT,
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
      ]);

      const result = await service.isAvailable();

      expect(result.biometryType).toBe('FaceID');
    });

    it('should handle errors gracefully', async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockRejectedValue(
        new Error('Hardware check failed')
      );

      const result = await service.isAvailable();

      expect(result).toEqual({ available: false, biometryType: 'None' });
    });
  });

  describe('createKeys()', () => {
    it('should create and store biometric key', async () => {
      const result = await service.createKeys();

      expect(result.publicKey).toMatch(/^biometric_key_\d+_[a-z0-9]+$/);
      expect(mockTokenStorage.storeBiometricKey).toHaveBeenCalledWith(
        expect.stringMatching(/^biometric_key_\d+_[a-z0-9]+$/)
      );
    });

    it('should generate unique keys on each call', async () => {
      const result1 = await service.createKeys();
      const result2 = await service.createKeys();

      expect(result1.publicKey).not.toBe(result2.publicKey);
    });

    it('should handle storage errors', async () => {
      mockTokenStorage.storeBiometricKey.mockRejectedValue(new Error('Storage error'));

      await expect(service.createKeys()).rejects.toThrow('Failed to create biometric keys');
    });
  });

  describe('deleteKeys()', () => {
    it('should delete biometric keys', async () => {
      await service.deleteKeys();

      expect(mockTokenStorage.removeBiometricKey).toHaveBeenCalled();
    });

    it('should handle deletion errors', async () => {
      mockTokenStorage.removeBiometricKey.mockRejectedValue(new Error('Deletion error'));

      await expect(service.deleteKeys()).rejects.toThrow('Failed to delete biometric keys');
    });
  });

  describe('biometricKeysExist()', () => {
    it('should return true when keys exist', async () => {
      mockTokenStorage.getBiometricKey.mockResolvedValue('key-123');

      const result = await service.biometricKeysExist();

      expect(result).toBe(true);
      expect(mockTokenStorage.getBiometricKey).toHaveBeenCalled();
    });

    it('should return false when keys do not exist', async () => {
      mockTokenStorage.getBiometricKey.mockResolvedValue(null);

      const result = await service.biometricKeysExist();

      expect(result).toBe(false);
    });

    it('should handle errors and return false', async () => {
      mockTokenStorage.getBiometricKey.mockRejectedValue(new Error('Storage error'));

      const result = await service.biometricKeysExist();

      expect(result).toBe(false);
    });
  });

  describe('authenticate()', () => {
    it('should authenticate successfully and return signature', async () => {
      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({ success: true });

      const result = await service.authenticate();

      expect(result.success).toBe(true);
      expect(result.signature).toMatch(/^\d+_GeoLeap_[a-z0-9]+$/);
      expect(LocalAuthentication.authenticateAsync).toHaveBeenCalledWith({
        promptMessage: 'Authenticate to access your account',
        fallbackLabel: 'Use passcode',
        disableDeviceFallback: false,
      });
    });

    it('should use custom prompt message', async () => {
      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({ success: true });

      await service.authenticate('Custom message');

      expect(LocalAuthentication.authenticateAsync).toHaveBeenCalledWith({
        promptMessage: 'Custom message',
        fallbackLabel: 'Use passcode',
        disableDeviceFallback: false,
      });
    });

    it('should return success false when authentication fails', async () => {
      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({ success: false });

      const result = await service.authenticate();

      expect(result).toEqual({ success: false });
    });

    it('should handle authentication errors', async () => {
      (LocalAuthentication.authenticateAsync as jest.Mock).mockRejectedValue(
        new Error('Auth error')
      );

      const result = await service.authenticate();

      expect(result).toEqual({ success: false });
    });
  });

  describe('simplePrompt()', () => {
    it('should show simple prompt and return success', async () => {
      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({ success: true });

      const result = await service.simplePrompt();

      expect(result).toEqual({ success: true });
      expect(LocalAuthentication.authenticateAsync).toHaveBeenCalledWith({
        promptMessage: 'Authenticate to continue',
        fallbackLabel: 'Use device passcode',
        disableDeviceFallback: false,
      });
    });

    it('should use custom prompt message', async () => {
      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({ success: true });

      await service.simplePrompt('Verify identity');

      expect(LocalAuthentication.authenticateAsync).toHaveBeenCalledWith({
        promptMessage: 'Verify identity',
        fallbackLabel: 'Use device passcode',
        disableDeviceFallback: false,
      });
    });

    it('should return error when authentication fails with warning', async () => {
      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({
        success: false,
        warning: 'User canceled',
      });

      const result = await service.simplePrompt();

      expect(result).toEqual({ success: false, error: 'User canceled' });
    });

    it('should return default error when authentication fails without warning', async () => {
      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({
        success: false,
      });

      const result = await service.simplePrompt();

      expect(result).toEqual({ success: false, error: 'Authentication failed' });
    });

    it('should handle exceptions', async () => {
      (LocalAuthentication.authenticateAsync as jest.Mock).mockRejectedValue(
        new Error('Biometric error')
      );

      const result = await service.simplePrompt();

      expect(result).toEqual({ success: false, error: 'Biometric error' });
    });

    it('should handle non-Error exceptions', async () => {
      (LocalAuthentication.authenticateAsync as jest.Mock).mockRejectedValue('String error');

      const result = await service.simplePrompt();

      expect(result).toEqual({ success: false, error: 'Unknown error' });
    });
  });

  describe('enableBiometric()', () => {
    it('should enable biometric successfully', async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({ success: true });

      await service.enableBiometric('user-123');

      expect(mockTokenStorage.storeBiometricKey).toHaveBeenCalled();
      expect(LocalAuthentication.authenticateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          promptMessage: 'Set up biometric authentication',
        })
      );
    });

    it('should throw error when biometric is not available', async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(false);

      await expect(service.enableBiometric('user-123')).rejects.toThrow(
        'Biometric authentication is not available on this device'
      );
      expect(mockTokenStorage.storeBiometricKey).not.toHaveBeenCalled();
    });

    it('should throw error when authentication test fails', async () => {
      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({ success: false });

      await expect(service.enableBiometric('user-123')).rejects.toThrow(
        'Biometric authentication test failed'
      );
    });

    it('should wrap key creation errors', async () => {
      mockTokenStorage.storeBiometricKey.mockRejectedValue(new Error('Storage full'));

      // Service wraps storage errors with custom message
      await expect(service.enableBiometric('user-123')).rejects.toThrow('Failed to create biometric keys');
    });
  });

  describe('disableBiometric()', () => {
    it('should disable biometric successfully', async () => {
      await service.disableBiometric();

      expect(mockTokenStorage.removeBiometricKey).toHaveBeenCalled();
    });

    it('should handle deletion errors', async () => {
      mockTokenStorage.removeBiometricKey.mockRejectedValue(new Error('Delete failed'));

      await expect(service.disableBiometric()).rejects.toThrow(
        'Failed to disable biometric authentication'
      );
    });
  });

  describe('isBiometricEnabled()', () => {
    it('should return true when biometric is enabled', async () => {
      mockTokenStorage.getBiometricKey.mockResolvedValue('key-123');

      const result = await service.isBiometricEnabled();

      expect(result).toBe(true);
    });

    it('should return false when biometric is not enabled', async () => {
      mockTokenStorage.getBiometricKey.mockResolvedValue(null);

      const result = await service.isBiometricEnabled();

      expect(result).toBe(false);
    });

    it('should return false on errors', async () => {
      mockTokenStorage.getBiometricKey.mockRejectedValue(new Error('Storage error'));

      const result = await service.isBiometricEnabled();

      expect(result).toBe(false);
    });
  });

  describe('getBiometricSettings()', () => {
    it('should return settings when biometric is available and enabled', async () => {
      (LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock).mockResolvedValue([
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
      ]);
      mockTokenStorage.getBiometricKey.mockResolvedValue('key-123');

      const result = await service.getBiometricSettings();

      expect(result).toEqual({
        enabled: true,
        type: 'FaceID',
        promptMessage: 'Authenticate to access your account',
      });
    });

    it('should return enabled false when not available', async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(false);
      mockTokenStorage.getBiometricKey.mockResolvedValue('key-123');

      const result = await service.getBiometricSettings();

      expect(result).toEqual({
        enabled: false,
        type: 'None',
        promptMessage: 'Authenticate to access your account',
      });
    });

    it('should return enabled false when not enabled', async () => {
      mockTokenStorage.getBiometricKey.mockResolvedValue(null);

      const result = await service.getBiometricSettings();

      expect(result).toEqual({
        enabled: false,
        type: 'TouchID',
        promptMessage: 'Authenticate to access your account',
      });
    });

    it('should handle errors gracefully', async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockRejectedValue(
        new Error('Hardware error')
      );

      const result = await service.getBiometricSettings();

      expect(result).toEqual({
        enabled: false,
        type: 'None',
        promptMessage: 'Authenticate to access your account',
      });
    });
  });

  describe('getBiometricTypeName()', () => {
    it('should return "Touch ID" for TouchID', () => {
      const result = service.getBiometricTypeName('TouchID');
      expect(result).toBe('Touch ID');
    });

    it('should return "Face ID" for FaceID', () => {
      const result = service.getBiometricTypeName('FaceID');
      expect(result).toBe('Face ID');
    });

    it('should return "Fingerprint" for Fingerprint', () => {
      const result = service.getBiometricTypeName('Fingerprint');
      expect(result).toBe('Fingerprint');
    });

    it('should return "Biometric" for None', () => {
      const result = service.getBiometricTypeName('None');
      expect(result).toBe('Biometric');
    });

    it('should return "Biometric" for unknown type', () => {
      const result = service.getBiometricTypeName('Unknown' as any);
      expect(result).toBe('Biometric');
    });
  });

  describe('Integration Scenarios', () => {
    it('should complete full enable flow', async () => {
      // Check availability
      const availability = await service.isAvailable();
      expect(availability.available).toBe(true);

      // Enable biometric
      await service.enableBiometric('user-123');

      // Verify enabled
      mockTokenStorage.getBiometricKey.mockResolvedValue('key-123');
      const enabled = await service.isBiometricEnabled();
      expect(enabled).toBe(true);

      // Get settings
      const settings = await service.getBiometricSettings();
      expect(settings.enabled).toBe(true);
    });

    it('should complete full disable flow', async () => {
      // Setup: biometric is enabled
      mockTokenStorage.getBiometricKey.mockResolvedValue('key-123');

      // Verify enabled first
      const enabledBefore = await service.isBiometricEnabled();
      expect(enabledBefore).toBe(true);

      // Disable biometric
      await service.disableBiometric();
      expect(mockTokenStorage.removeBiometricKey).toHaveBeenCalled();

      // Verify disabled
      mockTokenStorage.getBiometricKey.mockResolvedValue(null);
      const enabledAfter = await service.isBiometricEnabled();
      expect(enabledAfter).toBe(false);
    });

    it('should handle authentication flow with existing keys', async () => {
      // Check if keys exist
      mockTokenStorage.getBiometricKey.mockResolvedValue('key-123');
      const keysExist = await service.biometricKeysExist();
      expect(keysExist).toBe(true);

      // Authenticate
      const authResult = await service.authenticate('Login to app');
      expect(authResult.success).toBe(true);
      expect(authResult.signature).toBeDefined();
    });
  });
});
