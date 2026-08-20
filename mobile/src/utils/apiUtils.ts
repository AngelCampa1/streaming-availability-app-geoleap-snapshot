/**
 * API Utility Functions for GeoLeap Mobile App
 * Provides helper functions for API operations, error handling, and data transformation
 * Includes validation, formatting, and common utility functions
 */

import { API_ERROR_CODES, type ApiErrorCode } from '../config/api';
import { logger } from './logger';

export interface ApiError extends Error {
  code: ApiErrorCode;
  status?: number;
  details?: any;
  originalError?: any;
}

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
}

export interface ValidationRules {
  [key: string]: ValidationRule;
}

export interface ValidationError {
  field: string;
  message: string;
  value: any;
}

/**
 * Create a standardized API error
 */
export function createApiError(
  message: string,
  code: ApiErrorCode = API_ERROR_CODES.UNKNOWN_ERROR,
  status?: number,
  details?: any,
  originalError?: any,
): ApiError {
  const error = new Error(message) as ApiError;
  error.code = code;
  error.status = status;
  error.details = details;
  error.originalError = originalError;
  return error;
}

/**
 * Check if an error is a network error
 */
export function isNetworkError(error: any): boolean {
  // Note: navigator.onLine is not available in React Native
  return (
    error?.code === API_ERROR_CODES.NETWORK_ERROR ||
    error?.code === API_ERROR_CODES.TIMEOUT_ERROR ||
    error?.message?.includes('network') ||
    error?.message?.includes('timeout')
  );
}

/**
 * Check if an error is an authentication error
 */
export function isAuthError(error: any): boolean {
  return (
    error?.code === API_ERROR_CODES.AUTHENTICATION_ERROR ||
    error?.status === 401 ||
    error?.status === 403
  );
}

/**
 * Check if an error is a server error
 */
export function isServerError(error: any): boolean {
  return (
    error?.code === API_ERROR_CODES.SERVER_ERROR ||
    (error?.status && error.status >= 500 && error.status < 600)
  );
}

/**
 * Check if an error is a validation error
 */
export function isValidationError(error: any): boolean {
  return (
    error?.code === API_ERROR_CODES.VALIDATION_ERROR ||
    error?.status === 422 ||
    error?.status === 400
  );
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(error: any): string {
  if (!error) {return 'An unknown error occurred';}

  // If the error already has a user-friendly message
  if (error.message && !error.message.includes('HTTP') && !error.message.includes('fetch')) {
    return error.message;
  }

  // Handle specific error codes
  switch (error?.code) {
    case API_ERROR_CODES.NETWORK_ERROR:
      return 'No internet connection. Please check your network settings.';
    case API_ERROR_CODES.TIMEOUT_ERROR:
      return 'Request timed out. Please try again.';
    case API_ERROR_CODES.SERVER_ERROR:
      return 'Server is temporarily unavailable. Please try again later.';
    case API_ERROR_CODES.AUTHENTICATION_ERROR:
      return 'You need to log in to access this feature.';
    case API_ERROR_CODES.VALIDATION_ERROR:
      return 'Please check your input and try again.';
    case API_ERROR_CODES.NOT_FOUND:
      return 'The requested resource was not found.';
    case API_ERROR_CODES.RATE_LIMIT:
      return 'Too many requests. Please wait a moment and try again.';
    default:
      // Handle HTTP status codes
      switch (error?.status) {
        case 400:
          return 'Invalid request. Please check your input.';
        case 401:
          return 'You need to log in to access this feature.';
        case 403:
          return 'You don\'t have permission to access this feature.';
        case 404:
          return 'The requested resource was not found.';
        case 422:
          return 'Please check your input and try again.';
        case 429:
          return 'Too many requests. Please wait a moment and try again.';
        case 500:
          return 'Server error. Please try again later.';
        case 502:
        case 503:
        case 504:
          return 'Service temporarily unavailable. Please try again later.';
        default:
          return 'Something went wrong. Please try again.';
      }
  }
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000,
  maxDelay: number = 10000,
): Promise<T> {
  let lastError: any;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry on certain error types
      if (isAuthError(error) || isValidationError(error) || (error as any)?.status === 404) {
        throw error;
      }

      if (attempt < maxAttempts) {
        const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
        logger.debug(`Retrying in ${delay}ms (attempt ${attempt}/${maxAttempts})`);
        await new Promise<void>(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Debounce function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

/**
 * Throttle function calls
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number,
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Validate data against rules
 */
export function validateData(data: any, rules: ValidationRules): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const [field, rule] of Object.entries(rules)) {
    const value = data[field];

    // Required validation
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push({
        field,
        message: `${field} is required`,
        value,
      });
      continue;
    }

    // Skip other validations if value is empty and not required
    if (value === undefined || value === null || value === '') {
      continue;
    }

    // Type-specific validations
    if (typeof value === 'string') {
      // Min length validation
      if (rule.minLength && value.length < rule.minLength) {
        errors.push({
          field,
          message: `${field} must be at least ${rule.minLength} characters long`,
          value,
        });
      }

      // Max length validation
      if (rule.maxLength && value.length > rule.maxLength) {
        errors.push({
          field,
          message: `${field} must be no more than ${rule.maxLength} characters long`,
          value,
        });
      }

      // Pattern validation
      if (rule.pattern && !rule.pattern.test(value)) {
        errors.push({
          field,
          message: `${field} format is invalid`,
          value,
        });
      }
    }

    // Custom validation
    if (rule.custom) {
      const customError = rule.custom(value);
      if (customError) {
        errors.push({
          field,
          message: customError,
          value,
        });
      }
    }
  }

  return errors;
}

/**
 * Common validation rules
 */
export const ValidationRules = {
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    custom: (value: string) => {
      if (value.length > 254) {return 'Email address is too long';}
      return null;
    },
  },
  password: {
    required: true,
    minLength: 8,
    custom: (value: string) => {
      if (!/[A-Z]/.test(value)) {return 'Password must contain at least one uppercase letter';}
      if (!/[a-z]/.test(value)) {return 'Password must contain at least one lowercase letter';}
      if (!/\d/.test(value)) {return 'Password must contain at least one number';}
      if (value.length > 128) {return 'Password is too long';}
      return null;
    },
  },
  name: {
    required: true,
    minLength: 2,
    maxLength: 50,
    pattern: /^[a-zA-Z\s'-]+$/,
    custom: (value: string) => {
      if (value.trim().length !== value.length) {return 'Name cannot start or end with spaces';}
      return null;
    },
  },
  username: {
    required: true,
    minLength: 3,
    maxLength: 30,
    pattern: /^[a-zA-Z0-9_-]+$/,
    custom: (value: string) => {
      if (!/^[a-zA-Z]/.test(value)) {return 'Username must start with a letter';}
      if (/_-/.test(value)) {return 'Username cannot contain underscore followed by hyphen';}
      return null;
    },
  },
  phoneNumber: {
    required: false,
    pattern: /^\+?[\d\s-()]+$/,
    custom: (value: string) => {
      const digitsOnly = value.replace(/\D/g, '');
      if (digitsOnly.length < 10) {return 'Phone number must have at least 10 digits';}
      if (digitsOnly.length > 15) {return 'Phone number is too long';}
      return null;
    },
  },
  searchQuery: {
    required: true,
    minLength: 1,
    maxLength: 100,
    custom: (value: string) => {
      if (value.trim().length === 0) {return 'Search query cannot be empty';}
      if (/^\s+$/.test(value)) {return 'Search query cannot be only whitespace';}
      return null;
    },
  },
};

/**
 * Sanitize user input
 */
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[^\w\s-.,!?@#$%^&*()_+=[\]{}|\\:"'<>/]/g, ''); // Remove special characters except common ones
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) {return '0 B';}

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Format duration
 */
export function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Generate a unique ID
 */
export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 9);
  return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }

  if (obj instanceof Array) {
    return obj.map(item => deepClone(item)) as unknown as T;
  }

  if (typeof obj === 'object') {
    const cloned = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty.call(Object.prototype, key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }

  return obj;
}

/**
 * Check if two objects are deeply equal
 */
export function deepEqual(a: any, b: any): boolean {
  if (a === b) {return true;}

  if (a === null || b === null) {return a === b;}

  if (typeof a !== typeof b) {return false;}

  if (typeof a === 'object') {
    if (Array.isArray(a) !== Array.isArray(b)) {return false;}

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) {return false;}

    for (const key of keysA) {
      if (!keysB.includes(key) || !deepEqual(a[key], b[key])) {
        return false;
      }
    }

    return true;
  }

  return false;
}

/**
 * Base64 decode polyfill for React Native
 */
function base64Decode(str: string): string {
  // Simple base64 decode for React Native
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';

  // Remove padding
  str = str.replace(/=+$/, '');

  for (let i = 0; i < str.length; i += 4) {
    const encoded1 = chars.indexOf(str[i]);
    const encoded2 = chars.indexOf(str[i + 1]);
    const encoded3 = chars.indexOf(str[i + 2]);
    const encoded4 = chars.indexOf(str[i + 3]);

    const byte1 = (encoded1 << 2) | (encoded2 >> 4);
    const byte2 = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    const byte3 = ((encoded3 & 3) << 6) | encoded4;

    output += String.fromCharCode(byte1);
    if (encoded3 !== -1) output += String.fromCharCode(byte2);
    if (encoded4 !== -1) output += String.fromCharCode(byte3);
  }

  return output;
}

/**
 * Parse JWT token (without verification)
 */
export function parseJWT(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      base64Decode(base64)
        .split('')
        .map(c => `%${('00' + c.charCodeAt(0).toString(16)).slice(-2)}`)
        .join(''),
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    logger.error('Failed to parse JWT token:', error);
    return null;
  }
}

/**
 * Check if JWT token is expired
 */
export function isTokenExpired(token: string): boolean {
  const payload = parseJWT(token);
  if (!payload || !payload.exp) {
    return true; // Assume expired if we can't parse
  }

  const currentTime = Math.floor(Date.now() / 1000);
  return payload.exp < currentTime;
}

/**
 * Get time until token expires
 */
export function getTokenExpiresIn(token: string): number {
  const payload = parseJWT(token);
  if (!payload || !payload.exp) {
    return 0;
  }

  const currentTime = Math.floor(Date.now() / 1000);
  return Math.max(0, payload.exp - currentTime);
}

/**
 * Build query string from object
 */
export function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });

  return searchParams.toString();
}

/**
 * Parse query string to object
 */
export function parseQueryString(queryString: string): Record<string, string> {
  const params: Record<string, string> = {};

  // Manual parsing for React Native compatibility (URLSearchParams methods not fully supported)
  if (!queryString) {return params;}

  const pairs = queryString.replace(/^\?/, '').split('&');
  pairs.forEach(pair => {
    const [key, value] = pair.split('=');
    if (key) {
      params[decodeURIComponent(key)] = value ? decodeURIComponent(value) : '';
    }
  });

  return params;
}

/**
 * Create a safe key for storage/caching
 */
export function createSafeKey(...parts: (string | number)[]): string {
  return parts
    .map(part => String(part).replace(/[^a-zA-Z0-9_-]/g, '_'))
    .filter(part => part.length > 0)
    .join('_');
}

/**
 * Transform API response data
 */
export function transformResponse<T, R>(
  data: T,
  transformer: (data: T) => R,
): R {
  try {
    return transformer(data);
  } catch (error) {
    logger.error('Failed to transform response data:', error);
    throw createApiError(
      'Failed to process response data',
      API_ERROR_CODES.UNKNOWN_ERROR,
      undefined,
      { originalError: error },
    );
  }
}

/**
 * Check if a value is empty (null, undefined, empty string, empty array, or empty object)
 */
export function isEmpty(value: any): boolean {
  if (value === null || value === undefined) {return true;}
  if (typeof value === 'string') {return value.trim().length === 0;}
  if (Array.isArray(value)) {return value.length === 0;}
  if (typeof value === 'object') {return Object.keys(value).length === 0;}
  return false;
}

export default {
  createApiError,
  isNetworkError,
  isAuthError,
  isServerError,
  isValidationError,
  getErrorMessage,
  retryWithBackoff,
  debounce,
  throttle,
  validateData,
  ValidationRules,
  sanitizeInput,
  formatFileSize,
  formatDuration,
  generateId,
  deepClone,
  deepEqual,
  parseJWT,
  isTokenExpired,
  getTokenExpiresIn,
  buildQueryString,
  parseQueryString,
  createSafeKey,
  transformResponse,
  isEmpty,
};
