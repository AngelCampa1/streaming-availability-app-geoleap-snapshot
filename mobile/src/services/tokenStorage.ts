import * as Keychain from 'react-native-keychain';
import { AuthTokens } from '../types/auth';
import { logger } from '../utils/logger';

const KEYCHAIN_SERVICE = 'GeoLeap';
const TOKEN_KEY = 'auth_tokens';
const BIOMETRIC_KEY = 'biometric_key';

interface StorageOptions {
  biometric?: boolean;
  showPrompt?: boolean;
  promptMessage?: string;
}

export class TokenStorageService {
  private static instance: TokenStorageService;

  static getInstance(): TokenStorageService {
    if (!TokenStorageService.instance) {
      TokenStorageService.instance = new TokenStorageService();
    }
    return TokenStorageService.instance;
  }

  /**
   * Store authentication tokens securely
   */
  async storeTokens(tokens: AuthTokens, options: StorageOptions = {}): Promise<void> {
    try {
      const tokenData = JSON.stringify(tokens);

      const keychainOptions: Keychain.Options = {
        service: KEYCHAIN_SERVICE,
        accessControl: options.biometric
          ? Keychain.ACCESS_CONTROL.BIOMETRY_ANY
          : undefined,
        authenticationType: options.biometric
          ? Keychain.AUTHENTICATION_TYPE.BIOMETRICS
          : undefined,
      };

      await Keychain.setInternetCredentials(
        TOKEN_KEY,
        'user',
        tokenData,
        keychainOptions,
      );
    } catch (error) {
      logger.error('[TokenStorage] Failed to store tokens', error);
      throw new Error('Failed to store authentication tokens');
    }
  }

  /**
   * Retrieve authentication tokens
   */
  async getTokens(_options: StorageOptions = {}): Promise<AuthTokens | null> {
    try {
      const keychainOptions: Keychain.Options = {
        service: KEYCHAIN_SERVICE,
      };

      const credentials = await Keychain.getInternetCredentials(
        TOKEN_KEY,
        keychainOptions,
      );

      if (credentials && credentials.password) {
        return JSON.parse(credentials.password) as AuthTokens;
      }
      return null;
    } catch (error) {
      logger.error('[TokenStorage] Failed to retrieve tokens', error);
      return null;
    }
  }

  /**
   * Remove stored tokens
   */
  async removeTokens(): Promise<void> {
    try {
      await Keychain.resetInternetCredentials(TOKEN_KEY);
    } catch (error) {
      logger.error('[TokenStorage] Failed to remove tokens', error);
    }
  }

  /**
   * Check if tokens exist
   */
  async hasTokens(): Promise<boolean> {
    try {
      const credentials = await Keychain.getInternetCredentials(TOKEN_KEY);
      return credentials !== false;
    } catch (error) {
      logger.warn('[TokenStorage] Failed to check tokens', error);
      return false;
    }
  }

  /**
   * Store biometric key for additional security
   */
  async storeBiometricKey(key: string): Promise<void> {
    try {
      const keychainOptions: Keychain.Options = {
        service: KEYCHAIN_SERVICE,
        accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY,
        authenticationType: Keychain.AUTHENTICATION_TYPE.BIOMETRICS,
      };

      await Keychain.setInternetCredentials(
        BIOMETRIC_KEY,
        'biometric',
        key,
        keychainOptions,
      );
    } catch (error) {
      logger.error('[TokenStorage] Failed to store biometric key', error);
      throw new Error('Failed to store biometric key');
    }
  }

  /**
   * Retrieve biometric key
   */
  async getBiometricKey(): Promise<string | null> {
    try {
      const credentials = await Keychain.getInternetCredentials(BIOMETRIC_KEY);
      if (credentials && credentials.password) {
        return credentials.password;
      }
      return null;
    } catch (error) {
      logger.error('[TokenStorage] Failed to retrieve biometric key', error);
      return null;
    }
  }

  /**
   * Remove biometric key
   */
  async removeBiometricKey(): Promise<void> {
    try {
      await Keychain.resetInternetCredentials(BIOMETRIC_KEY);
    } catch (error) {
      logger.error('[TokenStorage] Failed to remove biometric key', error);
    }
  }

  /**
   * Get supported biometric authentication types
   */
  async getSupportedBiometrics(): Promise<Keychain.BIOMETRY_TYPE | null> {
    try {
      return await Keychain.getSupportedBiometryType();
    } catch (error) {
      logger.error('[TokenStorage] Failed to get supported biometrics', error);
      return null;
    }
  }

  /**
   * Check if device supports biometric authentication
   */
  async isBiometricSupported(): Promise<boolean> {
    try {
      const biometryType = await Keychain.getSupportedBiometryType();
      return biometryType !== null;
    } catch (error) {
      logger.warn('[TokenStorage] Failed to check biometric support', error);
      return false;
    }
  }

  /**
   * Clear all stored data
   */
  async clearAll(): Promise<void> {
    try {
      await Promise.all([
        this.removeTokens(),
        this.removeBiometricKey(),
      ]);
    } catch (error) {
      logger.error('[TokenStorage] Failed to clear all data', error);
    }
  }
}

export const tokenStorage = TokenStorageService.getInstance();
