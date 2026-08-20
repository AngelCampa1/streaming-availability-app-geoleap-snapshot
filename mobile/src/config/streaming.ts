/**
 * Streaming API Configuration for React Native
 * Manages streaming-availability API configuration and React Native compatibility
 */

import { Platform } from 'react-native';
import { logger as loggerImport } from '../utils/logger';

// Safe logger wrapper that handles undefined cases in test environments
const logger = {
  debug: (...args: unknown[]) => {
    if (loggerImport && typeof loggerImport.debug === 'function') {
      loggerImport.debug(...(args as Parameters<typeof loggerImport.debug>));
    }
  },
  info: (...args: unknown[]) => {
    if (loggerImport && typeof loggerImport.info === 'function') {
      loggerImport.info(...(args as Parameters<typeof loggerImport.info>));
    }
  },
  warn: (...args: unknown[]) => {
    if (loggerImport && typeof loggerImport.warn === 'function') {
      loggerImport.warn(...(args as Parameters<typeof loggerImport.warn>));
    }
  },
  error: (...args: unknown[]) => {
    if (loggerImport && typeof loggerImport.error === 'function') {
      loggerImport.error(...(args as Parameters<typeof loggerImport.error>));
    } else {
      console.error(...args);
    }
  },
};

export interface StreamingConfig {
  apiKey: string;
  baseURL: string;
  defaultCountry: string;
  defaultLanguage: string;
  timeout: number;
  retryAttempts: number;
  enableCache: boolean;
  cacheExpiry: number;
}

class StreamingConfigManager {
  private static instance: StreamingConfigManager;
  private config: StreamingConfig;

  private constructor() {
    this.config = this.loadConfig();
  }

  public static getInstance(): StreamingConfigManager {
    if (!StreamingConfigManager.instance) {
      StreamingConfigManager.instance = new StreamingConfigManager();
    }
    return StreamingConfigManager.instance;
  }

  /**
   * Load configuration from environment variables and defaults
   */
  private loadConfig(): StreamingConfig {
    // Try multiple environment variable patterns for React Native compatibility
    const apiKey =
      process.env.STREAMING_AVAILABILITY_API_KEY ||
      process.env.EXPO_PUBLIC_STREAMING_API_KEY ||
      process.env.REACT_APP_STREAMING_API_KEY ||
      '';

    if (!apiKey) {
      logger.warn('Streaming Availability API key not found in environment variables');
      logger.info('Please set STREAMING_AVAILABILITY_API_KEY in your environment');
      logger.info('For Expo, use EXPO_PUBLIC_STREAMING_API_KEY');
      logger.info('For React Native CLI, use STREAMING_AVAILABILITY_API_KEY');
    }

    return {
      apiKey,
      baseURL: 'https://streaming-availability.p.rapidapi.com',
      defaultCountry: 'us',
      defaultLanguage: 'en',
      timeout: 15000, // 15 seconds for mobile networks
      retryAttempts: 3,
      enableCache: true,
      cacheExpiry: 5 * 60 * 1000, // 5 minutes
    };
  }

  /**
   * Get current configuration
   */
  public getConfig(): StreamingConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  public updateConfig(updates: Partial<StreamingConfig>): void {
    this.config = { ...this.config, ...updates };
    logger.info('Streaming config updated:', updates);
  }

  /**
   * Set API key
   */
  public setApiKey(apiKey: string): void {
    this.config.apiKey = apiKey;
    logger.info('Streaming API key updated');
  }

  /**
   * Check if API key is configured
   */
  public hasApiKey(): boolean {
    return Boolean(this.config.apiKey && this.config.apiKey.trim().length > 0);
  }

  /**
   * Get platform-specific headers
   */
  public getPlatformHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Platform': Platform.OS,
      'X-Platform-Version': Platform.Version.toString(),
      'X-App-Version': '1.0.0', // This could come from app.json
      'User-Agent': this.getUserAgent(),
    };
  }

  /**
   * Get React Native compatible user agent
   */
  private getUserAgent(): string {
    const platform = Platform.OS;
    const version = Platform.Version;

    return `GeoLeap-Mobile/${platform}/${version}`;
  }

  /**
   * Get country based on device locale or default
   */
  public getDeviceCountry(): string {
    try {
      // React Native doesn't have direct locale access like web
      // This would typically come from a localization library
      // For now, return default
      return this.config.defaultCountry;
    } catch (error) {
      logger.warn('Failed to get device country, using default:', error);
      return this.config.defaultCountry;
    }
  }

  /**
   * Get language based on device locale or default
   */
  public getDeviceLanguage(): string {
    try {
      // React Native doesn't have direct locale access like web
      // This would typically come from a localization library
      // For now, return default
      return this.config.defaultLanguage;
    } catch (error) {
      logger.warn('Failed to get device language, using default:', error);
      return this.config.defaultLanguage;
    }
  }

  /**
   * Validate configuration
   */
  public validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.config.apiKey) {
      errors.push('API key is required');
    }

    if (!this.config.baseURL) {
      errors.push('Base URL is required');
    }

    if (this.config.timeout <= 0) {
      errors.push('Timeout must be greater than 0');
    }

    if (this.config.retryAttempts < 0) {
      errors.push('Retry attempts must be non-negative');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Log configuration status (for debugging)
   */
  public logConfigStatus(): void {
    logger.info('Streaming Configuration Status:');
    logger.info('- API Key configured:', this.hasApiKey());
    logger.info('- Base URL:', this.config.baseURL);
    logger.info('- Default country:', this.config.defaultCountry);
    logger.info('- Default language:', this.config.defaultLanguage);
    logger.info('- Timeout:', this.config.timeout);
    logger.info('- Retry attempts:', this.config.retryAttempts);
    logger.info('- Cache enabled:', this.config.enableCache);
    logger.info('- Platform:', Platform.OS);
  }
}

// Export singleton instance
export const streamingConfig = StreamingConfigManager.getInstance();

// Export convenience functions
export const getStreamingConfig = (): StreamingConfig => streamingConfig.getConfig();
export const hasStreamingApiKey = (): boolean => streamingConfig.hasApiKey();
export const setStreamingApiKey = (apiKey: string): void => streamingConfig.setApiKey(apiKey);
export const getPlatformHeaders = (): Record<string, string> => streamingConfig.getPlatformHeaders();

export default streamingConfig;
