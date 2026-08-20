/**
 * Centralized API Configuration
 * CRITICAL FIX: Single source of truth for API base URL
 *
 * This fixes CRITICAL-010: Port configuration inconsistencies
 * All API clients should import from this file
 */

/**
 * API Base URL Configuration
 *
 * Production Strategy: Use same-origin requests (empty base URL) to leverage
 * Next.js rewrites that proxy /api/* to the backend. This makes cookies
 * first-party, avoiding Chrome's third-party cookie blocking.
 *
 * Development Strategy: Direct connection to backend at localhost:8020
 *
 * CRITICAL: In production, NEXT_PUBLIC_USE_PROXY=true enables same-origin proxying
 * to solve cross-domain cookie issues (Chrome third-party cookie deprecation)
 */
const _useProxy = process.env.NEXT_PUBLIC_USE_PROXY === 'true';
const _isProduction = process.env.NODE_ENV === 'production';
const isBrowser = typeof window !== 'undefined';

// Use same-origin requests (empty base URL) in browser to leverage Next.js route handlers
// that proxy /api/* to the backend with proper cookie forwarding.
// This solves CORS issues and makes cookies first-party.
// IMPORTANT: Only use empty URL in browser - server-side/build needs full URL
export const API_BASE_URL = isBrowser
  ? ''
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8020');

/**
 * Server-side API URL for build-time and SSR requests
 * This should always be a full URL, not empty
 * Uses INTERNAL_API_URL for container-to-container communication
 */
export const SERVER_API_URL = process.env.INTERNAL_API_URL
  || process.env.NEXT_PUBLIC_API_URL
  || 'http://localhost:8020';

/**
 * WebSocket URL for real-time features
 * Uses wss:// in https contexts for secure connections (SSR-safe)
 */
export const WS_BASE_URL =
  process.env.NEXT_PUBLIC_WS_URL ||
  (typeof window !== 'undefined' && window.location.protocol === 'https:'
    ? `wss://${window.location.host}`
    : 'ws://localhost:8020');

/**
 * API Version
 */
export const API_VERSION = 'v1';

/**
 * Full API URL with version
 */
export const API_URL = `${API_BASE_URL}/api`;

/**
 * API Endpoints
 */
export const API_ENDPOINTS = {
  AUTH: `${API_URL}/auth`,
  USERS: `${API_URL}/users`,
  CONTENT: `${API_URL}/content`,
  SEARCH: `${API_URL}/search`,
  WATCHLIST: `${API_URL}/watchlist`,
  NOTIFICATIONS: `${API_URL}/notifications`,
  PREFERENCES: `${API_URL}/preferences`,
  SUBSCRIPTION: `${API_URL}/subscription`,
  VPN: `${API_URL}/vpn`,
  ANALYTICS: `${API_URL}/analytics`,
} as const;

/**
 * Request timeout configurations
 */
export const API_TIMEOUTS = {
  DEFAULT: 30000, // 30 seconds
  UPLOAD: 120000, // 2 minutes for file uploads
  LONG_POLL: 60000, // 1 minute for long polling
} as const;

/**
 * Retry configuration
 */
export const API_RETRY_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
  BACKOFF_MULTIPLIER: 2,
} as const;
