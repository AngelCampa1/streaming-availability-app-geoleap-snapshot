/**
 * Environment Configuration - Production Ready
 *
 * Centralized environment configuration for all environments
 * with type safety, validation, and performance optimizations
 */

// Platform import removed - not currently used but may be needed for platform-specific config

// Environment types
export type Environment = 'development' | 'staging' | 'production';

// API Configuration
export interface ApiConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  enableLogging: boolean;
  enableCache: boolean;
  cacheTimeout: number;
}

// Analytics Configuration
export interface AnalyticsConfig {
  enabled: boolean;
  samplingRate: number;
  batchSize: number;
  flushInterval: number;
  enableSessionTracking: boolean;
  enableScreenTracking: boolean;
  enableExceptionTracking: boolean;
}

// Performance Configuration
export interface PerformanceConfig {
  enableMonitoring: boolean;
  enableProfiling: boolean;
  enableNetworkLogging: boolean;
  enableMemoryTracking: boolean;
  enableFrameRateMonitoring: boolean;
  reportInterval: number;
  performanceThresholds: {
    startupTime: number;
    apiResponseTime: number;
    renderTime: number;
    memoryUsage: number;
    frameRate: number;
  };
}

// Feature Flags Configuration
export interface FeatureFlags {
  enableBiometricAuth: boolean;
  enableVoiceSearch: boolean;
  enableBarcodeScanning: boolean;
  enablePushNotifications: boolean;
  enableOfflineMode: boolean;
  enableAnalytics: boolean;
  enableCrashReporting: boolean;
  enablePerformanceMonitoring: boolean;
  enableBetaFeatures: boolean;
  // VPN functionality is not yet implemented. This flag gates the VPN UI.
  // Keep false until a real VPN client library is integrated.
  enableVpn: boolean;
}

// Enhanced Environment Configuration
export interface EnvironmentConfig {
  API_URL: string;
  API_TIMEOUT: number;
  ENABLE_LOGGING: boolean;
  ENABLE_CRASH_REPORTING: boolean;
  ENABLE_ANALYTICS: boolean;
  ENVIRONMENT: Environment;
  VERSION: string;
  BUILD_NUMBER: string;
  SENTRY_DSN?: string;
  FEATURE_FLAGS: Record<string, boolean>;
  PERFORMANCE_CONFIG: {
    ENABLE_METRICS: boolean;
    ENABLE_PROFILING: boolean;
    SAMPLING_RATE: number;
  };
  NETWORK_CONFIG: {
    TIMEOUT: number;
    RETRY_ATTEMPTS: number;
    RETRY_DELAY: number;
  };
  CACHE_CONFIG: {
    MAX_SIZE: number;
    TTL: number;
  };
  // Enhanced configuration sections
  api: ApiConfig;
  analytics: AnalyticsConfig;
  performance: PerformanceConfig;
  features: FeatureFlags;
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    enableConsole: boolean;
    enableRemoteLogging: boolean;
  };
  security: {
    enableSSL: boolean;
    enableCertificatePinning: boolean;
    enableRequestSigning: boolean;
    sessionTimeout: number;
  };
}

const getEnvironmentConfig = (): EnvironmentConfig => {
  const environment = __DEV__ ? 'development' : process.env.NODE_ENV === 'production' ? 'production' : 'staging';

  const baseConfig: EnvironmentConfig = {
    API_URL: getApiUrl(environment),
    API_TIMEOUT: getApiTimeout(environment),
    ENABLE_LOGGING: environment !== 'production',
    ENABLE_CRASH_REPORTING: environment !== 'development',
    ENABLE_ANALYTICS: environment !== 'development',
    ENVIRONMENT: environment,
    VERSION: getAppVersion(),
    BUILD_NUMBER: getBuildNumber(),
    SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN,
    FEATURE_FLAGS: getFeatureFlags(environment),
    PERFORMANCE_CONFIG: {
      ENABLE_METRICS: environment !== 'production',
      ENABLE_PROFILING: environment === 'development',
      SAMPLING_RATE: environment === 'production' ? 0.1 : 1.0,
    },
    NETWORK_CONFIG: {
      TIMEOUT: getApiTimeout(environment),
      RETRY_ATTEMPTS: environment === 'production' ? 3 : 1,
      RETRY_DELAY: 1000,
    },
    CACHE_CONFIG: {
      MAX_SIZE: 50 * 1024 * 1024, // 50MB
      TTL: 5 * 60 * 1000, // 5 minutes
    },
    // Enhanced configuration sections
    api: getApiConfig(environment),
    analytics: getAnalyticsConfig(environment),
    performance: getPerformanceConfig(environment),
    features: getFeatureConfig(environment),
    logging: {
      level: environment === 'production' ? 'error' : environment === 'staging' ? 'warn' : 'debug',
      enableConsole: environment !== 'production',
      enableRemoteLogging: environment !== 'development',
    },
    security: {
      enableSSL: true,
      enableCertificatePinning: environment === 'production',
      enableRequestSigning: environment === 'production',
      sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
    },
  };

  return baseConfig;
};

const getApiUrl = (_environment: string): string => {
  // OVERRIDE: Always use production API regardless of environment
  // This allows testing with real production backend during development
  return 'https://api.geoleap.app/api';
};

const getApiTimeout = (environment: string): number => {
  switch (environment) {
    case 'development':
      return 30000; // 30 seconds
    case 'staging':
      return 15000; // 15 seconds
    case 'production':
      return 10000; // 10 seconds
    default:
      return 30000;
  }
};

const getAppVersion = (): string => {
  // This would typically come from package.json or build config
  return process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0';
};

const getBuildNumber = (): string => {
  return process.env.EXPO_PUBLIC_BUILD_NUMBER || '1';
};

const getFeatureFlags = (environment: string): Record<string, boolean> => {
  const baseFlags = {
    ENABLE_OFFLINE_MODE: true,
    ENABLE_PUSH_NOTIFICATIONS: true,
    ENABLE_BIOMETRIC_AUTH: true,
    ENABLE_VOICE_SEARCH: true,
    ENABLE_BARCODE_SCANNER: true,
    ENABLE_SOCIAL_SHARING: true,
    ENABLE_DARK_MODE: true,
    ENABLE_ANALYTICS: environment !== 'development',
    ENABLE_CRASH_REPORTING: environment !== 'development',
    ENABLE_PERFORMANCE_MONITORING: environment === 'development',
    ENABLE_FEATURE_FLAGS: true,
  };

  const environmentSpecificFlags = {
    development: {
      ENABLE_DEBUG_MODE: true,
      ENABLE_LOGGING: true,
      ENABLE_NETWORK_INSPECTOR: true,
      ENABLE_COMPONENT_DEBUGGER: true,
      ENABLE_FLIPPER: true,
    },
    staging: {
      ENABLE_DEBUG_MODE: false,
      ENABLE_LOGGING: true,
      ENABLE_NETWORK_INSPECTOR: false,
      ENABLE_COMPONENT_DEBUGGER: false,
      ENABLE_FLIPPER: false,
    },
    production: {
      ENABLE_DEBUG_MODE: false,
      ENABLE_LOGGING: false,
      ENABLE_NETWORK_INSPECTOR: false,
      ENABLE_COMPONENT_DEBUGGER: false,
      ENABLE_FLIPPER: false,
    },
  };

  return {
    ...baseFlags,
    ...environmentSpecificFlags[environment as keyof typeof environmentSpecificFlags],
  };
};

const getApiConfig = (environment: string): ApiConfig => {
  return {
    baseUrl: getApiUrl(environment),
    timeout: getApiTimeout(environment),
    retryAttempts: environment === 'production' ? 3 : 1,
    retryDelay: 1000,
    enableLogging: environment !== 'production',
    enableCache: true,
    cacheTimeout: 5 * 60 * 1000, // 5 minutes
  };
};

const getAnalyticsConfig = (environment: string): AnalyticsConfig => {
  return {
    enabled: environment !== 'development',
    samplingRate: environment === 'production' ? 0.1 : 1.0,
    batchSize: 50,
    flushInterval: 30 * 1000, // 30 seconds
    enableSessionTracking: true,
    enableScreenTracking: true,
    enableExceptionTracking: true,
  };
};

const getPerformanceConfig = (environment: string): PerformanceConfig => {
  return {
    enableMonitoring: environment !== 'production',
    enableProfiling: environment === 'development',
    enableNetworkLogging: environment !== 'production',
    enableMemoryTracking: environment === 'development',
    enableFrameRateMonitoring: environment === 'development',
    reportInterval: 60 * 1000, // 1 minute
    performanceThresholds: {
      startupTime: 3000, // 3 seconds
      apiResponseTime: 2000, // 2 seconds
      renderTime: 16, // 16ms for 60fps
      memoryUsage: 100 * 1024 * 1024, // 100MB
      frameRate: 55, // minimum 55fps
    },
  };
};

const getFeatureConfig = (environment: string): FeatureFlags => {
  return {
    enableBiometricAuth: true,
    enableVoiceSearch: true,
    enableBarcodeScanning: true,
    enablePushNotifications: true,
    enableOfflineMode: true,
    enableAnalytics: environment !== 'development',
    enableCrashReporting: environment !== 'development',
    enablePerformanceMonitoring: environment === 'development',
    enableBetaFeatures: environment === 'development',
    // VPN is not yet implemented - keep disabled until a real VPN library is integrated.
    enableVpn: false,
  };
};

// Export configuration and function
export const config = getEnvironmentConfig();
export { getEnvironmentConfig };

// Utility functions
export const isProduction = (): boolean => config.ENVIRONMENT === 'production';
export const isDevelopment = (): boolean => config.ENVIRONMENT === 'development';
export const isStaging = (): boolean => config.ENVIRONMENT === 'staging';

export const isFeatureEnabled = (feature: string): boolean => {
  return config.FEATURE_FLAGS[feature] || false;
};

export const getApiEndpoint = (path: string): string => {
  return `${config.API_URL}${path}`;
};

export const getTimeoutDuration = (type: 'short' | 'medium' | 'long' = 'medium'): number => {
  const timeouts = {
    short: config.API_TIMEOUT / 2,
    medium: config.API_TIMEOUT,
    long: config.API_TIMEOUT * 2,
  };
  return timeouts[type];
};

export default config;
