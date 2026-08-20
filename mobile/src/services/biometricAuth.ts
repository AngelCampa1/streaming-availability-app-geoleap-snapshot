import * as LocalAuthentication from 'expo-local-authentication';
import { BiometricType, BiometricSettings } from '../types/auth';
import { TokenStorageService } from './tokenStorage';
import { logger } from '../utils/logger';

export class BiometricAuthService {
  private static instance: BiometricAuthService;

  static getInstance(): BiometricAuthService {
    if (!BiometricAuthService.instance) {
      BiometricAuthService.instance = new BiometricAuthService();
    }
    return BiometricAuthService.instance;
  }

  /**
   * Check if biometric authentication is available
   */
  async isAvailable(): Promise<{ available: boolean; biometryType: BiometricType }> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const available = hasHardware && isEnrolled;

      let biometryType: BiometricType = 'None';
      if (available) {
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        biometryType = this.mapAuthenticationTypes(types);
      }

      return { available, biometryType };
    } catch (error) {
      logger.error('[BiometricAuth] Availability check failed', error);
      return { available: false, biometryType: 'None' };
    }
  }

  /**
   * Create biometric keys for authentication
   * Note: expo-local-authentication doesn't manage keys, we use secure storage instead
   */
  async createKeys(): Promise<{ publicKey: string }> {
    try {
      // Generate a unique key identifier for this device
      const keyId = `biometric_key_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      await TokenStorageService.getInstance().storeBiometricKey(keyId);
      return { publicKey: keyId };
    } catch (error) {
      logger.error('[BiometricAuth] Failed to create biometric keys', error);
      throw new Error('Failed to create biometric keys');
    }
  }

  /**
   * Delete biometric keys
   */
  async deleteKeys(): Promise<void> {
    try {
      await TokenStorageService.getInstance().removeBiometricKey();
    } catch (error) {
      logger.error('[BiometricAuth] Failed to delete biometric keys', error);
      throw new Error('Failed to delete biometric keys');
    }
  }

  /**
   * Check if biometric keys exist
   */
  async biometricKeysExist(): Promise<boolean> {
    try {
      const key = await TokenStorageService.getInstance().getBiometricKey();
      return key !== null;
    } catch (error) {
      logger.error('[BiometricAuth] Failed to check biometric keys', error);
      return false;
    }
  }

  /**
   * Authenticate with biometrics
   */
  async authenticate(promptMessage?: string): Promise<{ success: boolean; signature?: string }> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: promptMessage || 'Authenticate to access your account',
        fallbackLabel: 'Use passcode',
        disableDeviceFallback: false,
      });

      if (result.success) {
        // Generate a signature based on timestamp for compatibility
        const epochTimeSeconds = Math.round((new Date()).getTime() / 1000).toString();
        const signature = `${epochTimeSeconds}_GeoLeap_${Math.random().toString(36).substring(2, 15)}`;
        return { success: true, signature };
      }

      return { success: false };
    } catch (error) {
      logger.error('[BiometricAuth] Authentication failed', error);
      return { success: false };
    }
  }

  /**
   * Simple biometric prompt without signature
   */
  async simplePrompt(promptMessage?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: promptMessage || 'Authenticate to continue',
        fallbackLabel: 'Use device passcode',
        disableDeviceFallback: false,
      });

      if (result.success) {
        return { success: true };
      }

      // TypeScript discriminated union - when success is false, warning property may exist
      const errorMessage = !result.success && 'warning' in result ? result.warning : 'Authentication failed';
      return { success: false, error: errorMessage };
    } catch (error) {
      logger.error('[BiometricAuth] Simple biometric prompt failed', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Enable biometric authentication for the user
   */
  async enableBiometric(_userId: string): Promise<void> {
    try {
      const { available } = await this.isAvailable();
      if (!available) {
        throw new Error('Biometric authentication is not available on this device');
      }

      // Create biometric keys
      await this.createKeys();

      // Test biometric authentication
      const { success } = await this.authenticate('Set up biometric authentication');
      if (!success) {
        throw new Error('Biometric authentication test failed');
      }
    } catch (error) {
      logger.error('[BiometricAuth] Failed to enable biometric', error);
      throw error;
    }
  }

  /**
   * Disable biometric authentication
   */
  async disableBiometric(): Promise<void> {
    try {
      await this.deleteKeys();
    } catch (error) {
      logger.error('[BiometricAuth] Failed to disable biometric', error);
      throw new Error('Failed to disable biometric authentication');
    }
  }

  /**
   * Check if biometric is enabled for user
   */
  async isBiometricEnabled(): Promise<boolean> {
    try {
      return await this.biometricKeysExist();
    } catch (_error) {
      return false;
    }
  }

  /**
   * Get biometric settings
   */
  async getBiometricSettings(): Promise<BiometricSettings> {
    try {
      const { available, biometryType } = await this.isAvailable();
      const enabled = await this.isBiometricEnabled();

      return {
        enabled: available && enabled,
        type: biometryType,
        promptMessage: 'Authenticate to access your account',
      };
    } catch (_error) {
      return {
        enabled: false,
        type: 'None',
        promptMessage: 'Authenticate to access your account',
      };
    }
  }

  /**
   * Map expo-local-authentication types to our BiometricType
   */
  private mapAuthenticationTypes(types: LocalAuthentication.AuthenticationType[]): BiometricType {
    // Check for facial recognition first (FaceID on iOS, face unlock on Android)
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return 'FaceID';
    }
    // Check for fingerprint (TouchID on iOS, fingerprint on Android)
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return 'TouchID';
    }
    // Check for iris (Android only)
    if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return 'Fingerprint'; // Map iris to fingerprint as generic biometric
    }
    return 'None';
  }

  /**
   * Get user-friendly biometric type name
   */
  getBiometricTypeName(type: BiometricType): string {
    switch (type) {
      case 'TouchID':
        return 'Touch ID';
      case 'FaceID':
        return 'Face ID';
      case 'Fingerprint':
        return 'Fingerprint';
      default:
        return 'Biometric';
    }
  }
}

export const biometricAuth = BiometricAuthService.getInstance();
