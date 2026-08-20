/**
 * API Configuration for GeoLeap Mobile App
 * Production backend: https://api.geoleap.app
 */

import { validateEnv, getApiUrl, isProductionApi } from './validateEnv';

// Validate environment on module load (skip in test environment)
if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
  validateEnv();
}

// Get API URL from validated environment variable
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.geoleap.app';

export interface ApiConfig {
  baseURL: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  headers: Record<string, string>;
}

export interface Endpoints {
  auth: {
    login: string;
    register: string;
    logout: string;
    refresh: string;
    forgotPassword: string;
    resetPassword: string;
    profile: string;
    updateProfile: string;
  };
  social: {
    google: string;
    apple: string;
    facebook: string;
    authenticate: string;
  };
  users: {
    profile: string;
    preferences: string;
    watchlist: string;
    history: string;
    subscription: string;
    subscriptionStatus: string;
    verifyReceipt: string;
  };
  streaming: {
    search: string;
    details: string;
    recommendations: string;
    watchlist: string;
  };
}

// Development configuration - uses EXPO_PUBLIC_API_URL from environment
const developmentConfig: ApiConfig = {
  baseURL: API_BASE_URL,
  timeout: 15000, // 15 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Client-Platform': 'mobile',
    'X-Client-Version': '1.0.0',
    'X-Auth-Mode': 'header', // Mobile uses header-based auth, not cookies
  },
};

// Production configuration - uses EXPO_PUBLIC_API_URL from environment
const productionConfig: ApiConfig = {
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Client-Platform': 'mobile',
    'X-Client-Version': '1.0.0',
    'X-Auth-Mode': 'header', // Mobile uses header-based auth, not cookies
  },
};

// Staging configuration - uses EXPO_PUBLIC_API_URL or staging default
const stagingConfig: ApiConfig = {
  baseURL: API_BASE_URL.includes('staging') ? API_BASE_URL : 'https://staging-api.geoleap.app',
  timeout: 12000, // 12 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Client-Platform': 'mobile',
    'X-Client-Version': '1.0.0-staging',
    'X-Auth-Mode': 'header', // Mobile uses header-based auth, not cookies
  },
};

// API endpoints configuration - includes /api prefix since baseURL no longer has it
export const endpoints: Endpoints = {
  auth: {
    login: '/api/auth/login',
    register: '/api/auth/register',
    logout: '/api/auth/logout',
    refresh: '/api/auth/refresh',
    forgotPassword: '/api/auth/forgot-password',
    resetPassword: '/api/auth/reset-password',
    profile: '/api/auth/profile',
    updateProfile: '/api/auth/profile',
  },
  social: {
    google: '/api/socialauth/google',
    apple: '/api/socialauth/apple',
    facebook: '/api/socialauth/facebook',
    authenticate: '/api/socialauth/authenticate',
  },
  users: {
    // NOTE: Backend uses /api/user-profile (hyphenated), not /api/users/profile
    profile: '/api/user-profile',
    // NOTE: Backend PreferencesController uses /api/preferences
    preferences: '/api/preferences',
    // NOTE: Backend WatchlistController uses /api/watchlist
    watchlist: '/api/watchlist',
    history: '/api/watchlist/history',
    // BUG-021 FIX: Add subscription endpoint
    subscription: '/api/subscription',
    subscriptionStatus: '/api/subscription/status',
    verifyReceipt: '/api/subscription/verify-receipt',
  },
  streaming: {
    search: '/api/streaming/search',
    details: '/api/streaming/details',
    recommendations: '/api/streaming/recommendations',
    watchlist: '/api/streaming/watchlist',
  },
};

// Environment detection based on API URL
const getEnvironment = (): 'development' | 'staging' | 'production' => {
  if (API_BASE_URL.includes('staging')) {
    return 'staging';
  }

  if (isProductionApi()) {
    return 'production';
  }

  return 'development';
};

// Get current configuration
export const getApiConfig = (): ApiConfig => {
  const environment = getEnvironment();

  switch (environment) {
    case 'development':
      return developmentConfig;
    case 'staging':
      return stagingConfig;
    case 'production':
      return productionConfig;
    default:
      return developmentConfig;
  }
};

// Current configuration
export const apiConfig = getApiConfig();

// Helper functions
export const buildUrl = (endpoint: string): string => {
  return `${apiConfig.baseURL}${endpoint}`;
};

export const getAuthHeaders = (accessToken?: string): Record<string, string> => {
  const headers = { ...apiConfig.headers };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return headers;
};

// Network status checking
export const isNetworkAvailable = async (): Promise<boolean> => {
  // This would typically use @react-native-community/netinfo
  // For now, return true as a fallback
  return true;
};

// API error codes mapping
export const API_ERROR_CODES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMIT: 'RATE_LIMIT',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type ApiErrorCode = typeof API_ERROR_CODES[keyof typeof API_ERROR_CODES];

// Default export
export default {
  config: apiConfig,
  endpoints,
  buildUrl,
  getAuthHeaders,
  isNetworkAvailable,
  API_ERROR_CODES,
};
