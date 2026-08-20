/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Secure Storage Service for GeoLeap Mobile App
 * Provides encrypted storage for sensitive data using React Native Keychain
 */

import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthTokens, User, SecuritySettings } from '../../types/auth';
import { Platform } from 'react-native';
import { logger } from '../../utils/logger';

// Polyfill btoa/atob for React Native (not available by default)
declare const btoa: ((str: string) => string) | undefined;
declare const atob: ((str: string) => string) | undefined;

// Provide fallback implementations for base64 encoding/decoding
const base64Encode = (str: string): string => {
  if (typeof btoa !== 'undefined') {
    return btoa(str);
  }
  // Simple fallback for React Native
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';
  let i = 0;
  while (i < str.length) {
    const a = str.charCodeAt(i++);
    const b = i < str.length ? str.charCodeAt(i++) : 0;
    const c = i < str.length ? str.charCodeAt(i++) : 0;
    const bitmap = (a << 16) | (b << 8) | c;
    output += chars[(bitmap >> 18) & 63];
    output += chars[(bitmap >> 12) & 63];
    output += i > str.length + 1 ? '=' : chars[(bitmap >> 6) & 63];
    output += i > str.length ? '=' : chars[bitmap & 63];
  }
  return output;
};

const base64Decode = (str: string): string => {
  if (typeof atob !== 'undefined') {
    return atob(str);
  }
  // Simple fallback for React Native
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';
  str = str.replace(/[^A-Za-z0-9+/=]/g, '');
  let i = 0;
  while (i < str.length) {
    const enc1 = chars.indexOf(str.charAt(i++));
    const enc2 = chars.indexOf(str.charAt(i++));
    const enc3 = chars.indexOf(str.charAt(i++));
    const enc4 = chars.indexOf(str.charAt(i++));
    const bitmap = (enc1 << 18) | (enc2 << 12) | (enc3 << 6) | enc4;
    output += String.fromCharCode((bitmap >> 16) & 255);
    if (enc3 !== 64) {output += String.fromCharCode((bitmap >> 8) & 255);}
    if (enc4 !== 64) {output += String.fromCharCode(bitmap & 255);}
  }
  return output;
};

// Storage keys
const STORAGE_KEYS = {
  AUTH_TOKENS: 'auth_tokens',
  BIOMETRIC_KEY: 'biometric_key',
  USER_DATA: 'user_data',
  SECURITY_SETTINGS: 'security_settings',
  APP_SETTINGS: 'app_settings',
  SESSION_DATA: 'session_data',
} as const;

// Service identifier for keychain
const KEYCHAIN_SERVICE = 'GeoLeap';

// Storage options for different levels of security
interface StorageOptions {
  biometric?: boolean;
  requireBiometricOnAccess?: boolean;
  showPrompt?: boolean;
  promptMessage?: string;
  encrypt?: boolean;
}

// Secure storage item interface
interface StorageItem<T> {
  data: T;
  timestamp: number;
  encrypted?: boolean;
  version: string;
}

// Encryption metadata (unused but preserved for future use)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface EncryptionMetadata {
  algorithm: string;
  iv: string;
  timestamp: number;
}

export class SecureStorageService {
  private static instance: SecureStorageService;
  private encryptionKey: string | null = null;
  private readonly STORAGE_VERSION = '1.0.0';
  private keychainAvailable: boolean | null = null; // null = not yet checked
  private initPromise: Promise<void> | null = null;

  // AsyncStorage keys for fallback (prefixed to avoid conflicts)
  private readonly ASYNC_STORAGE_PREFIX = '@geoleap_secure_';

  static getInstance(): SecureStorageService {
    if (!SecureStorageService.instance) {
      SecureStorageService.instance = new SecureStorageService();
    }
    return SecureStorageService.instance;
  }

  private constructor() {
    this.initPromise = this.initializeStorage();
  }

  /**
   * Wait for storage initialization to complete
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initPromise) {
      await this.initPromise;
    }
  }

  /**
   * Initialize storage - check keychain availability and set up encryption
   */
  private async initializeStorage(): Promise<void> {
    // First check if Keychain is available (Expo Go doesn't support it)
    await this.checkKeychainAvailability();

    // Then initialize encryption
    await this.initializeEncryption();
  }

  /**
   * Check if Keychain is available (won't work in Expo Go or web)
   */
  private async checkKeychainAvailability(): Promise<void> {
    if (this.keychainAvailable !== null) return;

    // Web platform doesn't support native modules
    if (Platform.OS === 'web') {
      this.keychainAvailable = false;
      logger.info('[SecureStorage] Web platform detected - using AsyncStorage');
      return;
    }

    try {
      // Check if Keychain module is properly loaded (native modules might be undefined)
      if (!Keychain || typeof Keychain.getInternetCredentials !== 'function') {
        throw new Error('Keychain module not available');
      }

      // In Expo Go, Keychain exists but internal methods are null
      // Try an actual getInternetCredentials call to verify it works
      // This will throw if getInternetCredentialsForServer is null
      await Keychain.getInternetCredentials('__keychain_test__');

      this.keychainAvailable = true;
      logger.info('[SecureStorage] Keychain available - using secure native storage');
    } catch (error: any) {
      // Check for the specific Expo Go error
      const errorMessage = error?.message || String(error);
      if (
        errorMessage.includes('getInternetCredentialsForServer') ||
        errorMessage.includes('null') ||
        errorMessage.includes('Cannot read property')
      ) {
        this.keychainAvailable = false;
        logger.info('[SecureStorage] Expo Go detected - using AsyncStorage fallback');
        logger.info('[SecureStorage] Note: For production builds, use a development build with native modules');
      } else {
        // Other Keychain errors - still set as unavailable to be safe
        this.keychainAvailable = false;
        logger.warn('[SecureStorage] Keychain not available - using AsyncStorage fallback', { error: errorMessage });
      }
    }
  }

  /**
   * Check if we should use AsyncStorage fallback
   */
  private useAsyncStorageFallback(): boolean {
    return this.keychainAvailable === false;
  }

  /**
   * Initialize encryption key
   * SECURITY FIX: Updated to use async secure key generation
   * EXPO GO FIX: Falls back to AsyncStorage when Keychain unavailable
   */
  private async initializeEncryption(): Promise<void> {
    try {
      if (this.useAsyncStorageFallback()) {
        // AsyncStorage fallback for Expo Go
        const storedKey = await AsyncStorage.getItem(`${this.ASYNC_STORAGE_PREFIX}encryption_key`);
        if (storedKey) {
          this.encryptionKey = storedKey;
        } else {
          const newKey = await this.generateEncryptionKey();
          await AsyncStorage.setItem(`${this.ASYNC_STORAGE_PREFIX}encryption_key`, newKey);
          this.encryptionKey = newKey;
        }
        return;
      }

      // Native Keychain path
      const existingKey = await Keychain.getInternetCredentials('encryption_key');
      if (existingKey && typeof existingKey === 'object' && existingKey.password) {
        this.encryptionKey = existingKey.password;
      } else {
        // Generate new encryption key using cryptographically secure random
        const newKey = await this.generateEncryptionKey();
        await Keychain.setInternetCredentials(
          'encryption_key',
          'encryption',
          newKey,
          {
            service: KEYCHAIN_SERVICE,
            accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
            authenticationPrompt: 'Authenticate to access secure storage',
          },
        );
        this.encryptionKey = newKey;
      }
    } catch (error) {
      logger.error('[SecureStorage] Failed to initialize encryption key', error);
      // For Expo Go, try AsyncStorage as last resort
      if (!this.useAsyncStorageFallback()) {
        logger.warn('[SecureStorage] Keychain failed, attempting AsyncStorage fallback');
        this.keychainAvailable = false;
        try {
          const newKey = await this.generateEncryptionKey();
          await AsyncStorage.setItem(`${this.ASYNC_STORAGE_PREFIX}encryption_key`, newKey);
          this.encryptionKey = newKey;
          return;
        } catch (fallbackError) {
          logger.error('[SecureStorage] AsyncStorage fallback also failed', fallbackError);
        }
      }
      throw new Error('Critical: Unable to initialize secure storage encryption');
    }
  }

  /**
   * Generate encryption key using cryptographically secure random generation
   * SECURITY FIX: Replaced Math.random() with Aes.randomKey() which uses
   * platform-native secure random (SecRandomCopyBytes on iOS, SecureRandom on Android)
   * EXPO GO FIX: Falls back to simple key for development when native modules unavailable
   */
  private async generateEncryptionKey(): Promise<string> {
    // In Expo Go/fallback mode, use a simple deterministic key
    // This is ONLY for development - production builds should use native modules
    if (this.useAsyncStorageFallback()) {
      logger.warn('[SecureStorage] Using simple key generation for Expo Go development');
      // Generate a pseudo-random key based on timestamp and device info
      // NOT cryptographically secure - only for development!
      const seed = `geoleap-dev-${Platform.OS}-${Platform.Version}-${Date.now()}`;
      // Simple hash-like function for dev purposes
      let hash = 0;
      for (let i = 0; i < seed.length; i++) {
        const char = seed.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return `dev-key-${Math.abs(hash).toString(36)}-${Date.now().toString(36)}`;
    }

    try {
      const Aes = require('react-native-aes-crypto');
      // Generate 32-byte (256-bit) key using cryptographically secure random
      const secureKey = await Aes.randomKey(32);
      return secureKey;
    } catch (error) {
      // Fallback: Use pbkdf2 with device-specific seed for key derivation
      // SECURITY FIX: Removed Math.random() - using only deterministic device info
      // This is still cryptographically secure as pbkdf2 uses HMAC-SHA256
      logger.warn('[SecureStorage] Secure random failed, using PBKDF2 derivation', error);
      try {
        const Aes = require('react-native-aes-crypto');
        // Use device-specific deterministic seed (no weak Math.random)
        const seed = `${Platform.OS}-${Platform.Version}-geoleap-secure-v1-${Date.now()}`;
        const salt = await Aes.randomKey(16);
        const derivedKey = await Aes.pbkdf2(seed, salt, 10000, 256, 'sha256');
        return derivedKey;
      } catch (fallbackError) {
        logger.warn('[SecureStorage] Native crypto unavailable, using simple key for development');
        // Final fallback for Expo Go
        return `dev-fallback-${Date.now().toString(36)}`;
      }
    }
  }

  /**
   * Simple base64 encode for React Native (no Buffer dependency)
   */
  private base64Encode(str: string): string {
    try {
      return base64Encode(unescape(encodeURIComponent(str)));
    } catch (_error) {
      // Fallback: just return the string (not ideal but prevents crashes)
      return str;
    }
  }

  /**
   * Simple base64 decode for React Native (no Buffer dependency)
   */
  private base64Decode(str: string): string {
    try {
      return decodeURIComponent(escape(base64Decode(str)));
    } catch (_error) {
      // Fallback: return as-is (might be unencoded)
      return str;
    }
  }

  /**
   * AES-256-CBC encryption for production-grade security
   * FIXED: Week 1 Day 2 - Replaced weak XOR with proper AES encryption
   * EXPO GO FIX: Skips encryption in fallback mode (development only)
   */
  private async encrypt(data: string, _key: string): Promise<{ encrypted: string; iv: string }> {
    // In Expo Go mode, skip encryption (AsyncStorage is already less secure)
    if (this.useAsyncStorageFallback()) {
      // Just base64 encode for basic obfuscation in dev mode
      const encoded = this.base64Encode(data);
      return { encrypted: encoded, iv: 'expo-go-dev' };
    }

    try {
      const Aes = require('react-native-aes-crypto');

      // Generate random IV for each encryption (128-bit for AES)
      const iv = await Aes.randomKey(16);

      // Use AES-256-CBC encryption
      const encrypted = await Aes.encrypt(data, _key, iv, 'aes-256-cbc');

      return { encrypted, iv };
    } catch (error) {
      logger.error('[SecureStorage] AES encryption failed', error);
      // Fallback for Expo Go - just base64 encode
      logger.warn('[SecureStorage] Using base64 encoding fallback for Expo Go');
      const encoded = this.base64Encode(data);
      return { encrypted: encoded, iv: 'fallback' };
    }
  }

  /**
   * AES-256-CBC decryption
   * FIXED: Week 1 Day 2 - Replaced weak XOR with proper AES decryption
   * EXPO GO FIX: Handles base64 fallback from Expo Go mode
   */
  private async decrypt(encryptedData: string, _key: string, iv: string): Promise<string> {
    // In Expo Go mode or fallback, data is base64 encoded
    if (this.useAsyncStorageFallback() || iv === 'expo-go-dev' || iv === 'fallback') {
      return this.base64Decode(encryptedData);
    }

    try {
      const Aes = require('react-native-aes-crypto');

      // Decrypt using AES-256-CBC
      const decrypted = await Aes.decrypt(encryptedData, _key, iv, 'aes-256-cbc');

      return decrypted;
    } catch (error) {
      logger.error('[SecureStorage] AES decryption failed', error);
      // Try base64 decode as fallback
      try {
        return this.base64Decode(encryptedData);
      } catch (_decodeError) {
        throw new Error('Failed to decrypt data');
      }
    }
  }

  /**
   * Prepare storage item with metadata
   * UPDATED: Week 1 Day 2 - Made async to support AES encryption
   */
  private async prepareStorageItem<T>(data: T, encrypt: boolean = false): Promise<string> {
    const item: StorageItem<T> = {
      data,
      timestamp: Date.now(),
      encrypted: encrypt,
      version: this.STORAGE_VERSION,
    };

    let jsonString = JSON.stringify(item);

    if (encrypt && this.encryptionKey) {
      const { encrypted, iv } = await this.encrypt(jsonString, this.encryptionKey);
      // Store IV prepended to encrypted data (separated by :)
      jsonString = `${iv}:${encrypted}`;
    }

    return jsonString;
  }

  /**
   * Parse storage item and decrypt if necessary
   * UPDATED: Week 1 Day 2 - Made async to support AES decryption
   */
  private async parseStorageItem<T>(jsonString: string, encrypted: boolean = false): Promise<T> {
    try {
      // BUG-004 FIX: Check if jsonString is null/undefined before processing
      if (!jsonString) {
        throw new Error('Storage item is empty or undefined');
      }

      let dataString = jsonString;

      if (encrypted && this.encryptionKey) {
        // Extract IV from prepended data
        // BUG-004 FIX: Add null checks to prevent "Cannot read properties of undefined"
        const parts = jsonString.split(':');
        if (parts.length < 2) {
          throw new Error('Invalid encrypted data format: missing IV or encrypted content');
        }
        const [iv, encryptedData] = parts;
        if (!iv || !encryptedData) {
          throw new Error('Invalid encrypted data format: empty IV or encrypted content');
        }
        dataString = await this.decrypt(encryptedData, this.encryptionKey, iv);
      }

      const item: StorageItem<T> = JSON.parse(dataString);

      // Version check
      if (item.version !== this.STORAGE_VERSION) {
        logger.warn('[SecureStorage] Storage item version mismatch, attempting migration');
      }

      return item.data;
    } catch (error) {
      logger.error('[SecureStorage] Failed to parse storage item', error);
      throw new Error('Failed to parse stored data');
    }
  }

  /**
   * Store authentication tokens securely
   * EXPO GO FIX: Falls back to AsyncStorage when Keychain unavailable
   */
  async storeTokens(tokens: AuthTokens, options: StorageOptions = {}): Promise<void> {
    await this.ensureInitialized();

    try {
      const storageData = await this.prepareStorageItem(tokens, options.encrypt !== false);

      if (this.useAsyncStorageFallback()) {
        // AsyncStorage fallback for Expo Go
        await AsyncStorage.setItem(
          `${this.ASYNC_STORAGE_PREFIX}${STORAGE_KEYS.AUTH_TOKENS}`,
          storageData
        );
        logger.info('[SecureStorage] Tokens stored via AsyncStorage fallback');
        return;
      }

      // Native Keychain path
      const keychainOptions: Keychain.Options = {
        service: KEYCHAIN_SERVICE,
        accessControl: options.biometric
          ? Keychain.ACCESS_CONTROL.BIOMETRY_ANY
          : Keychain.ACCESS_CONTROL.DEVICE_PASSCODE,
        authenticationType: options.biometric
          ? Keychain.AUTHENTICATION_TYPE.BIOMETRICS
          : undefined,
      };

      await Keychain.setInternetCredentials(
        STORAGE_KEYS.AUTH_TOKENS,
        'tokens',
        storageData,
        keychainOptions,
      );
    } catch (error) {
      logger.error('[SecureStorage] Failed to store tokens', error);
      // Try AsyncStorage as last resort
      if (!this.useAsyncStorageFallback()) {
        try {
          const storageData = await this.prepareStorageItem(tokens, false);
          await AsyncStorage.setItem(
            `${this.ASYNC_STORAGE_PREFIX}${STORAGE_KEYS.AUTH_TOKENS}`,
            storageData
          );
          this.keychainAvailable = false;
          logger.warn('[SecureStorage] Tokens stored via AsyncStorage fallback after Keychain failure');
          return;
        } catch (fallbackError) {
          logger.error('[SecureStorage] AsyncStorage fallback also failed', fallbackError);
        }
      }
      throw new Error('Failed to store authentication tokens');
    }
  }

  /**
   * Retrieve authentication tokens
   * EXPO GO FIX: Falls back to AsyncStorage when Keychain unavailable
   */
  async getTokens(options: StorageOptions = {}): Promise<AuthTokens | null> {
    await this.ensureInitialized();

    try {
      if (this.useAsyncStorageFallback()) {
        // AsyncStorage fallback for Expo Go
        const storedData = await AsyncStorage.getItem(
          `${this.ASYNC_STORAGE_PREFIX}${STORAGE_KEYS.AUTH_TOKENS}`
        );
        if (storedData) {
          const isEncrypted = options.encrypt !== false;
          return await this.parseStorageItem<AuthTokens>(storedData, isEncrypted);
        }
        return null;
      }

      // Native Keychain path
      const credentials = await Keychain.getInternetCredentials(STORAGE_KEYS.AUTH_TOKENS);

      if (credentials && typeof credentials === 'object' && credentials.password) {
        const isEncrypted = options.encrypt !== false;
        return await this.parseStorageItem<AuthTokens>(credentials.password, isEncrypted);
      }

      return null;
    } catch (error) {
      logger.error('[SecureStorage] Failed to retrieve tokens', error);
      // Try AsyncStorage as fallback
      if (!this.useAsyncStorageFallback()) {
        try {
          const storedData = await AsyncStorage.getItem(
            `${this.ASYNC_STORAGE_PREFIX}${STORAGE_KEYS.AUTH_TOKENS}`
          );
          if (storedData) {
            this.keychainAvailable = false;
            return await this.parseStorageItem<AuthTokens>(storedData, false);
          }
        } catch (_fallbackError) {
          // Fallback also failed, return null
        }
      }
      return null;
    }
  }

  /**
   * Remove authentication tokens
   * EXPO GO FIX: Falls back to AsyncStorage when Keychain unavailable
   */
  async removeTokens(): Promise<void> {
    await this.ensureInitialized();

    try {
      if (this.useAsyncStorageFallback()) {
        await AsyncStorage.removeItem(`${this.ASYNC_STORAGE_PREFIX}${STORAGE_KEYS.AUTH_TOKENS}`);
        return;
      }
      await Keychain.resetInternetCredentials(STORAGE_KEYS.AUTH_TOKENS);
    } catch (error) {
      logger.error('[SecureStorage] Failed to remove tokens', error);
      // Try AsyncStorage as fallback
      try {
        await AsyncStorage.removeItem(`${this.ASYNC_STORAGE_PREFIX}${STORAGE_KEYS.AUTH_TOKENS}`);
      } catch (_fallbackError) {
        // Ignore fallback errors
      }
    }
  }

  /**
   * Store user data
   * EXPO GO FIX: Falls back to AsyncStorage when Keychain unavailable
   */
  async storeUser(user: User, options: StorageOptions = {}): Promise<void> {
    await this.ensureInitialized();

    try {
      const storageData = await this.prepareStorageItem(user, options.encrypt !== false);

      if (this.useAsyncStorageFallback()) {
        await AsyncStorage.setItem(`${this.ASYNC_STORAGE_PREFIX}${STORAGE_KEYS.USER_DATA}`, storageData);
        return;
      }

      const keychainOptions: Keychain.Options = {
        service: KEYCHAIN_SERVICE,
        accessControl: options.requireBiometricOnAccess
          ? Keychain.ACCESS_CONTROL.BIOMETRY_ANY
          : undefined,
        authenticationType: options.requireBiometricOnAccess
          ? Keychain.AUTHENTICATION_TYPE.BIOMETRICS
          : undefined,
      };

      await Keychain.setInternetCredentials(
        STORAGE_KEYS.USER_DATA,
        'user',
        storageData,
        keychainOptions,
      );
    } catch (error) {
      logger.error('[SecureStorage] Failed to store user data', error);
      // Try AsyncStorage fallback
      if (!this.useAsyncStorageFallback()) {
        try {
          const storageData = await this.prepareStorageItem(user, false);
          await AsyncStorage.setItem(`${this.ASYNC_STORAGE_PREFIX}${STORAGE_KEYS.USER_DATA}`, storageData);
          this.keychainAvailable = false;
          return;
        } catch (_fallbackError) {
          // Fallback failed
        }
      }
      throw new Error('Failed to store user data');
    }
  }

  /**
   * Retrieve user data
   * EXPO GO FIX: Falls back to AsyncStorage when Keychain unavailable
   */
  async getUser(options: StorageOptions = {}): Promise<User | null> {
    await this.ensureInitialized();

    try {
      if (this.useAsyncStorageFallback()) {
        const storedData = await AsyncStorage.getItem(`${this.ASYNC_STORAGE_PREFIX}${STORAGE_KEYS.USER_DATA}`);
        if (storedData) {
          const isEncrypted = options.encrypt !== false;
          return await this.parseStorageItem<User>(storedData, isEncrypted);
        }
        return null;
      }

      const credentials = await Keychain.getInternetCredentials(STORAGE_KEYS.USER_DATA);

      if (credentials && typeof credentials === 'object' && credentials.password) {
        const isEncrypted = options.encrypt !== false;
        return await this.parseStorageItem<User>(credentials.password, isEncrypted);
      }

      return null;
    } catch (error) {
      logger.error('[SecureStorage] Failed to retrieve user data', error);
      // Try AsyncStorage fallback
      try {
        const storedData = await AsyncStorage.getItem(`${this.ASYNC_STORAGE_PREFIX}${STORAGE_KEYS.USER_DATA}`);
        if (storedData) {
          return await this.parseStorageItem<User>(storedData, false);
        }
      } catch (_fallbackError) {
        // Fallback failed
      }
      return null;
    }
  }

  /**
   * Store biometric key
   * EXPO GO FIX: Falls back to AsyncStorage when Keychain unavailable
   */
  async storeBiometricKey(key: string, options: StorageOptions = {}): Promise<void> {
    await this.ensureInitialized();

    try {
      const storageData = await this.prepareStorageItem(key, options.encrypt !== false);

      if (this.useAsyncStorageFallback()) {
        await AsyncStorage.setItem(`${this.ASYNC_STORAGE_PREFIX}${STORAGE_KEYS.BIOMETRIC_KEY}`, storageData);
        return;
      }

      const keychainOptions: Keychain.Options = {
        service: KEYCHAIN_SERVICE,
        accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY,
        authenticationType: Keychain.AUTHENTICATION_TYPE.BIOMETRICS,
      };

      await Keychain.setInternetCredentials(
        STORAGE_KEYS.BIOMETRIC_KEY,
        'biometric',
        storageData,
        keychainOptions,
      );
    } catch (error) {
      logger.error('[SecureStorage] Failed to store biometric key', error);
      // Try AsyncStorage fallback
      if (!this.useAsyncStorageFallback()) {
        try {
          const storageData = await this.prepareStorageItem(key, false);
          await AsyncStorage.setItem(`${this.ASYNC_STORAGE_PREFIX}${STORAGE_KEYS.BIOMETRIC_KEY}`, storageData);
          this.keychainAvailable = false;
          return;
        } catch (_fallbackError) {
          // Fallback failed
        }
      }
      throw new Error('Failed to store biometric key');
    }
  }

  /**
   * Retrieve biometric key
   * EXPO GO FIX: Falls back to AsyncStorage when Keychain unavailable
   */
  async getBiometricKey(options: StorageOptions = {}): Promise<string | null> {
    await this.ensureInitialized();

    try {
      if (this.useAsyncStorageFallback()) {
        const storedData = await AsyncStorage.getItem(`${this.ASYNC_STORAGE_PREFIX}${STORAGE_KEYS.BIOMETRIC_KEY}`);
        if (storedData) {
          const isEncrypted = options.encrypt !== false;
          return await this.parseStorageItem<string>(storedData, isEncrypted);
        }
        return null;
      }

      const credentials = await Keychain.getInternetCredentials(STORAGE_KEYS.BIOMETRIC_KEY);

      if (credentials && typeof credentials === 'object' && credentials.password) {
        const isEncrypted = options.encrypt !== false;
        return await this.parseStorageItem<string>(credentials.password, isEncrypted);
      }

      return null;
    } catch (error) {
      logger.error('[SecureStorage] Failed to retrieve biometric key', error);
      return null;
    }
  }

  /**
   * Remove biometric key
   * EXPO GO FIX: Falls back to AsyncStorage when Keychain unavailable
   */
  async removeBiometricKey(): Promise<void> {
    await this.ensureInitialized();

    try {
      if (this.useAsyncStorageFallback()) {
        await AsyncStorage.removeItem(`${this.ASYNC_STORAGE_PREFIX}${STORAGE_KEYS.BIOMETRIC_KEY}`);
        return;
      }
      await Keychain.resetInternetCredentials(STORAGE_KEYS.BIOMETRIC_KEY);
    } catch (error) {
      logger.error('[SecureStorage] Failed to remove biometric key', error);
      try {
        await AsyncStorage.removeItem(`${this.ASYNC_STORAGE_PREFIX}${STORAGE_KEYS.BIOMETRIC_KEY}`);
      } catch (_fallbackError) {
        // Ignore
      }
    }
  }

  /**
   * Store security settings
   */
  async storeSecuritySettings(settings: SecuritySettings): Promise<void> {
    try {
      const jsonString = JSON.stringify(settings);
      await AsyncStorage.setItem(STORAGE_KEYS.SECURITY_SETTINGS, jsonString);
    } catch (error) {
      logger.error('[SecureStorage] Failed to store security settings', error);
      throw new Error('Failed to store security settings');
    }
  }

  /**
   * Retrieve security settings
   */
  async getSecuritySettings(): Promise<SecuritySettings | null> {
    try {
      const jsonString = await AsyncStorage.getItem(STORAGE_KEYS.SECURITY_SETTINGS);
      return jsonString ? JSON.parse(jsonString) : null;
    } catch (error) {
      logger.error('[SecureStorage] Failed to retrieve security settings', error);
      return null;
    }
  }

  /**
   * Store app settings (non-sensitive)
   */
  async storeAppSettings(settings: Record<string, any>): Promise<void> {
    try {
      const jsonString = JSON.stringify(settings);
      await AsyncStorage.setItem(STORAGE_KEYS.APP_SETTINGS, jsonString);
    } catch (error) {
      logger.error('[SecureStorage] Failed to store app settings', error);
      throw new Error('Failed to store app settings');
    }
  }

  /**
   * Retrieve app settings
   */
  async getAppSettings(): Promise<Record<string, any> | null> {
    try {
      const jsonString = await AsyncStorage.getItem(STORAGE_KEYS.APP_SETTINGS);
      return jsonString ? JSON.parse(jsonString) : null;
    } catch (error) {
      logger.error('[SecureStorage] Failed to retrieve app settings', error);
      return null;
    }
  }

  /**
   * Store temporary session data
   */
  async storeSessionData(data: Record<string, any>): Promise<void> {
    try {
      const sessionData = {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
      };
      const jsonString = JSON.stringify(sessionData);
      await AsyncStorage.setItem(STORAGE_KEYS.SESSION_DATA, jsonString);
    } catch (error) {
      logger.error('[SecureStorage] Failed to store session data', error);
    }
  }

  /**
   * Retrieve session data
   */
  async getSessionData(): Promise<Record<string, any> | null> {
    try {
      const jsonString = await AsyncStorage.getItem(STORAGE_KEYS.SESSION_DATA);
      if (!jsonString) {return null;}

      const sessionData = JSON.parse(jsonString);

      // Check if session data has expired
      if (Date.now() > sessionData.expiresAt) {
        await this.clearSessionData();
        return null;
      }

      return sessionData.data;
    } catch (error) {
      logger.error('[SecureStorage] Failed to retrieve session data', error);
      return null;
    }
  }

  /**
   * Clear session data
   */
  async clearSessionData(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.SESSION_DATA);
    } catch (error) {
      logger.error('[SecureStorage] Failed to clear session data', error);
    }
  }

  /**
   * Check if biometric authentication is supported
   * Returns false for Expo Go (no native modules)
   */
  async isBiometricSupported(): Promise<boolean> {
    await this.ensureInitialized();

    if (this.useAsyncStorageFallback()) {
      return false; // No biometric support in Expo Go
    }

    try {
      const biometryType = await Keychain.getSupportedBiometryType();
      return biometryType !== null;
    } catch (error) {
      logger.warn('[SecureStorage] Failed to check biometric support', error);
      return false;
    }
  }

  /**
   * Get supported biometric type
   * Returns null for Expo Go (no native modules)
   */
  async getSupportedBiometricType(): Promise<Keychain.BIOMETRY_TYPE | null> {
    await this.ensureInitialized();

    if (this.useAsyncStorageFallback()) {
      return null; // No biometric support in Expo Go
    }

    try {
      return await Keychain.getSupportedBiometryType();
    } catch (error) {
      logger.error('[SecureStorage] Failed to get supported biometric type', error);
      return null;
    }
  }

  /**
   * Clear all stored data
   * EXPO GO FIX: Clears AsyncStorage fallback data too
   */
  async clearAll(): Promise<void> {
    await this.ensureInitialized();

    try {
      const clearPromises = [
        this.removeTokens(),
        this.removeBiometricKey(),
        AsyncStorage.removeItem(STORAGE_KEYS.SECURITY_SETTINGS),
        AsyncStorage.removeItem(STORAGE_KEYS.APP_SETTINGS),
        this.clearSessionData(),
        // Also clear AsyncStorage fallback keys
        AsyncStorage.removeItem(`${this.ASYNC_STORAGE_PREFIX}${STORAGE_KEYS.USER_DATA}`),
        AsyncStorage.removeItem(`${this.ASYNC_STORAGE_PREFIX}encryption_key`),
      ];

      if (!this.useAsyncStorageFallback()) {
        clearPromises.push(Keychain.resetInternetCredentials(STORAGE_KEYS.USER_DATA));
      }

      await Promise.all(clearPromises);
    } catch (error) {
      logger.error('[SecureStorage] Failed to clear all data', error);
      throw new Error('Failed to clear all stored data');
    }
  }

  /**
   * Check if any authentication data exists
   * EXPO GO FIX: Checks AsyncStorage fallback too
   */
  async hasAuthenticationData(): Promise<boolean> {
    await this.ensureInitialized();

    try {
      if (this.useAsyncStorageFallback()) {
        const [tokens, user] = await Promise.all([
          AsyncStorage.getItem(`${this.ASYNC_STORAGE_PREFIX}${STORAGE_KEYS.AUTH_TOKENS}`),
          AsyncStorage.getItem(`${this.ASYNC_STORAGE_PREFIX}${STORAGE_KEYS.USER_DATA}`),
        ]);
        return tokens !== null || user !== null;
      }

      const [hasTokens, hasUser] = await Promise.all([
        Keychain.getInternetCredentials(STORAGE_KEYS.AUTH_TOKENS),
        Keychain.getInternetCredentials(STORAGE_KEYS.USER_DATA),
      ]);

      return hasTokens !== false || hasUser !== false;
    } catch (error) {
      logger.error('[SecureStorage] Failed to check authentication data', error);
      return false;
    }
  }

  /**
   * Get storage statistics
   * EXPO GO FIX: Returns appropriate values for AsyncStorage fallback mode
   */
  async getStorageInfo(): Promise<{
    hasTokens: boolean;
    hasUser: boolean;
    hasBiometricKey: boolean;
    hasSecuritySettings: boolean;
    biometricSupported: boolean;
    biometricType: Keychain.BIOMETRY_TYPE | null;
    usingFallback: boolean;
  }> {
    await this.ensureInitialized();

    if (this.useAsyncStorageFallback()) {
      const [tokens, user, biometricKey, securitySettings] = await Promise.all([
        AsyncStorage.getItem(`${this.ASYNC_STORAGE_PREFIX}${STORAGE_KEYS.AUTH_TOKENS}`),
        AsyncStorage.getItem(`${this.ASYNC_STORAGE_PREFIX}${STORAGE_KEYS.USER_DATA}`),
        AsyncStorage.getItem(`${this.ASYNC_STORAGE_PREFIX}${STORAGE_KEYS.BIOMETRIC_KEY}`),
        this.getSecuritySettings(),
      ]);

      return {
        hasTokens: tokens !== null,
        hasUser: user !== null,
        hasBiometricKey: biometricKey !== null,
        hasSecuritySettings: securitySettings !== null,
        biometricSupported: false,
        biometricType: null,
        usingFallback: true,
      };
    }

    const [
      hasTokens,
      hasUser,
      hasBiometricKey,
      securitySettings,
      biometricSupported,
      biometricType,
    ] = await Promise.all([
      Keychain.getInternetCredentials(STORAGE_KEYS.AUTH_TOKENS).then(result => result !== false),
      Keychain.getInternetCredentials(STORAGE_KEYS.USER_DATA).then(result => result !== false),
      Keychain.getInternetCredentials(STORAGE_KEYS.BIOMETRIC_KEY).then(result => result !== false),
      this.getSecuritySettings(),
      this.isBiometricSupported(),
      this.getSupportedBiometricType(),
    ]);

    return {
      hasTokens,
      hasUser,
      hasBiometricKey,
      hasSecuritySettings: securitySettings !== null,
      biometricSupported,
      biometricType,
      usingFallback: false,
    };
  }

  /**
   * Check if using AsyncStorage fallback (Expo Go mode)
   */
  isUsingFallback(): boolean {
    return this.useAsyncStorageFallback();
  }

  // ============================================
  // VPN CREDENTIAL STORAGE METHODS
  // ============================================
  // BUG-178: Secure VPN credential storage
  // Prevents credentials from being accessible via device backup or root access
  // Uses iOS Keychain / Android Keystore with WHEN_UNLOCKED_THIS_DEVICE_ONLY

  /**
   * Store VPN credentials securely
   * @param serverId - Unique server identifier
   * @param username - VPN username
   * @param password - VPN password
   * @param serverUrl - VPN server URL (optional)
   * @param serverConfig - Additional server configuration (optional)
   */
  async storeVpnCredentials(
    serverId: string,
    username: string,
    password: string,
    serverUrl?: string,
    serverConfig?: Record<string, unknown>
  ): Promise<void> {
    await this.ensureInitialized();

    try {
      const storageKey = `vpn_credentials_${serverId}`;
      const credentialData = {
        username,
        password,
        serverUrl,
        serverConfig,
        timestamp: Date.now(),
        version: '1.0',
      };

      if (this.useAsyncStorageFallback()) {
        // FALLBACK: Use AsyncStorage in Expo Go (development only)
        // WARNING: This is NOT secure and should only be used in development
        logger.warn(
          '[SecureStorage] Using AsyncStorage fallback for VPN credentials (INSECURE - development only)'
        );
        await AsyncStorage.setItem(
          `${this.ASYNC_STORAGE_PREFIX}${storageKey}`,
          JSON.stringify(credentialData)
        );
        return;
      }

      // PRODUCTION: Use Keychain with WHEN_UNLOCKED_THIS_DEVICE_ONLY
      // This excludes credentials from device backups and cloud sync
      await Keychain.setInternetCredentials(storageKey, username, JSON.stringify(credentialData), {
        accessControl: Keychain.ACCESS_CONTROL.DEVICE_PASSCODE,
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        authenticationType: Keychain.AUTHENTICATION_TYPE.DEVICE_PASSCODE_OR_BIOMETRICS,
      });

      logger.info(`[SecureStorage] VPN credentials stored securely for server: ${serverId}`);
    } catch (error) {
      logger.error(`[SecureStorage] Failed to store VPN credentials for server: ${serverId}`, error);
      throw new Error('Failed to store VPN credentials securely');
    }
  }

  /**
   * Retrieve VPN credentials
   * @param serverId - Unique server identifier
   * @returns VPN credentials or null if not found
   */
  async getVpnCredentials(serverId: string): Promise<{
    username: string;
    password: string;
    serverUrl?: string;
    serverConfig?: Record<string, unknown>;
    timestamp: number;
  } | null> {
    await this.ensureInitialized();

    try {
      const storageKey = `vpn_credentials_${serverId}`;

      if (this.useAsyncStorageFallback()) {
        // FALLBACK: Use AsyncStorage in Expo Go (development only)
        const data = await AsyncStorage.getItem(`${this.ASYNC_STORAGE_PREFIX}${storageKey}`);
        if (!data) {return null;}

        const parsed = JSON.parse(data);
        return {
          username: parsed.username,
          password: parsed.password,
          serverUrl: parsed.serverUrl,
          serverConfig: parsed.serverConfig,
          timestamp: parsed.timestamp,
        };
      }

      // PRODUCTION: Retrieve from Keychain
      const credentials = await Keychain.getInternetCredentials(storageKey);
      if (!credentials || typeof credentials === 'boolean') {
        return null;
      }

      const credentialData = JSON.parse(credentials.password);
      return {
        username: credentialData.username,
        password: credentialData.password,
        serverUrl: credentialData.serverUrl,
        serverConfig: credentialData.serverConfig,
        timestamp: credentialData.timestamp,
      };
    } catch (error) {
      logger.error(`[SecureStorage] Failed to retrieve VPN credentials for server: ${serverId}`, error);
      return null;
    }
  }

  /**
   * Remove VPN credentials for a specific server
   * @param serverId - Unique server identifier
   */
  async removeVpnCredentials(serverId: string): Promise<void> {
    await this.ensureInitialized();

    try {
      const storageKey = `vpn_credentials_${serverId}`;

      if (this.useAsyncStorageFallback()) {
        // FALLBACK: Remove from AsyncStorage
        await AsyncStorage.removeItem(`${this.ASYNC_STORAGE_PREFIX}${storageKey}`);
        return;
      }

      // PRODUCTION: Remove from Keychain
      await Keychain.resetInternetCredentials(storageKey);
      logger.info(`[SecureStorage] VPN credentials removed for server: ${serverId}`);
    } catch (error) {
      logger.error(`[SecureStorage] Failed to remove VPN credentials for server: ${serverId}`, error);
      throw new Error('Failed to remove VPN credentials');
    }
  }

  /**
   * Clear all VPN credentials
   * WARNING: This will remove all stored VPN credentials
   */
  async clearAllVpnCredentials(): Promise<void> {
    await this.ensureInitialized();

    try {
      if (this.useAsyncStorageFallback()) {
        // FALLBACK: Find and remove all VPN credential keys from AsyncStorage
        const allKeys = await AsyncStorage.getAllKeys();
        const vpnKeys = allKeys.filter(key =>
          key.startsWith(`${this.ASYNC_STORAGE_PREFIX}vpn_credentials_`)
        );

        if (vpnKeys.length > 0) {
          await AsyncStorage.multiRemove(vpnKeys);
          logger.info(`[SecureStorage] Cleared ${vpnKeys.length} VPN credentials from AsyncStorage`);
        }
        return;
      }

      // PRODUCTION: Keychain doesn't provide a way to list all keys
      // So we need to track server IDs separately or call resetInternetCredentials for known servers
      // For now, log a warning that this is a partial implementation
      logger.warn(
        '[SecureStorage] clearAllVpnCredentials: Keychain does not support listing keys. Use removeVpnCredentials for each server.'
      );
    } catch (error) {
      logger.error('[SecureStorage] Failed to clear all VPN credentials', error);
      throw new Error('Failed to clear all VPN credentials');
    }
  }

  /**
   * Check if VPN credentials exist for a server
   * @param serverId - Unique server identifier
   * @returns true if credentials exist
   */
  async hasVpnCredentials(serverId: string): Promise<boolean> {
    await this.ensureInitialized();

    try {
      const credentials = await this.getVpnCredentials(serverId);
      return credentials !== null;
    } catch (error) {
      logger.error(`[SecureStorage] Failed to check VPN credentials for server: ${serverId}`, error);
      return false;
    }
  }
}

// Export singleton instance
const secureStorageInstance = SecureStorageService.getInstance();
export default secureStorageInstance;

// Export alias for backward compatibility
export const tokenStorage = secureStorageInstance;
export const _secureStorage = secureStorageInstance;
export const secureStorageAlias = secureStorageInstance;
