/**
 * Environment Variable Validation
 *
 * Validates required environment variables at app startup to fail fast
 * and provide clear error messages for configuration issues.
 */

import { logger } from '../utils/logger';

/**
 * Validates that all required environment variables are set
 * @throws {Error} If required environment variables are missing
 */
export function validateEnv(): void {
  // Check for required API URL
  if (!process.env.EXPO_PUBLIC_API_URL) {
    throw new Error(
      'EXPO_PUBLIC_API_URL is required in .env file. ' +
      'Please ensure .env exists with: EXPO_PUBLIC_API_URL=https://api.geoleap.app/api'
    );
  }

  // Warn if using localhost (development only)
  if (process.env.EXPO_PUBLIC_API_URL.includes('localhost')) {
    logger.warn('[ValidateEnv] ⚠️ WARNING: API URL points to localhost. ' +
      'This should only be used in development. Production builds should use https://api.geoleap.app/api');
  }

  // Validate URL format
  try {
    new URL(process.env.EXPO_PUBLIC_API_URL);
  } catch (error) {
    throw new Error(
      `EXPO_PUBLIC_API_URL is not a valid URL: ${process.env.EXPO_PUBLIC_API_URL}. ` +
      'Expected format: https://api.geoleap.app/api'
    );
  }

  // Log successful validation
  logger.info('[ValidateEnv] Environment validation passed', {
    apiUrl: process.env.EXPO_PUBLIC_API_URL,
    isProduction: !process.env.EXPO_PUBLIC_API_URL.includes('localhost')
  });
}

/**
 * Gets the validated API base URL
 * @returns {string} The API base URL
 * @throws {Error} If EXPO_PUBLIC_API_URL is not set
 */
export function getApiUrl(): string {
  if (!process.env.EXPO_PUBLIC_API_URL) {
    throw new Error('EXPO_PUBLIC_API_URL not configured. Call validateEnv() at app startup.');
  }

  return process.env.EXPO_PUBLIC_API_URL;
}

/**
 * Checks if running in production mode (not localhost)
 * @returns {boolean} True if using production API
 */
export function isProductionApi(): boolean {
  return !process.env.EXPO_PUBLIC_API_URL?.includes('localhost');
}
