/**
 * AnalyticsApiClient - Backend API Client for Analytics
 *
 * Handles HTTP communication with backend analytics endpoints.
 *
 * Key features:
 * - Exponential backoff retry logic (1s, 2s, 4s delays)
 * - 30-second timeout per request
 * - No retry on authentication errors (401/403)
 * - Batch event upload support
 * - Configurable base URL for different environments
 *
 * @example
 * ```typescript
 * const client = new AnalyticsApiClient('https://api.geoleap.com');
 *
 * const events: UserBehaviorEventRequest[] = [
 *   {
 *     eventType: 'button_click',
 *     category: 'engagement',
 *     sessionId: 'session-123',
 *     deviceId: 'device-456',
 *     clientTimestamp: new Date().toISOString(),
 *     properties: JSON.stringify({ button: 'submit' }),
 *     hasConsent: true
 *   }
 * ];
 *
 * await client.batchTrackUserBehavior(events);
 * ```
 */

import { UserBehaviorEventRequest, ViewingSession, BATCH_CONFIG, RETRY_DELAYS } from './types';
import { logger } from '../../utils/logger';

export class AnalyticsApiClient {
  private readonly baseUrl: string;
  private readonly timeout: number = 30000; // 30 seconds

  constructor(baseUrl?: string) {
    // Import API_CONFIG to get production backend URL
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { apiConfig } = require('../../config/api');

    // Use provided URL or fall back to API_CONFIG baseURL
    this.baseUrl = baseUrl || apiConfig.baseURL;

    if (!this.baseUrl) {
      throw new Error('Analytics API URL not configured. Check EXPO_PUBLIC_API_URL in .env');
    }

    if (__DEV__) {
      logger.debug('[AnalyticsApiClient] Initialized with base URL', { baseUrl: this.baseUrl });
    }
  }

  /**
   * Batch upload user behavior events with retry logic
   *
   * Implements:
   * - Exponential backoff retry (1s, 2s, 4s)
   * - No retry on 401/403 auth errors
   * - 30-second timeout per attempt
   * - Max 3 total attempts (initial + 2 retries)
   *
   * @param events - Array of user behavior events to upload
   * @throws Error on authentication errors (no retry)
   * @throws Error after max retry attempts exceeded
   *
   * @example
   * ```typescript
   * const client = new AnalyticsApiClient();
   * const events = [
   *   {
   *     eventType: 'button_click',
   *     category: 'engagement',
   *     sessionId: 'session-123',
   *     clientTimestamp: '2025-01-15T10:30:00.000Z',
   *     properties: '{"button":"submit"}',
   *     hasConsent: true
   *   }
   * ];
   *
   * try {
   *   await client.batchTrackUserBehavior(events);
   *   console.log('Events uploaded successfully');
   * } catch (error) {
   *   console.error('Upload failed:', error);
   * }
   * ```
   */
  async batchTrackUserBehavior(events: UserBehaviorEventRequest[]): Promise<void> {
    // BUG-005 FIX: Don't manually add /api - baseUrl already configured correctly
    const endpoint = `${this.baseUrl}/userbehavioranalytics/events/batch`;

    return this.retryWithBackoff(async () => {
      const response = await this.fetchWithTimeout(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(events),
      });

      // Check for auth errors - don't retry
      if (response.status === 401 || response.status === 403) {
        throw new Error(`Authentication error: ${response.statusText}`);
      }

      // Check for success
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    });
  }

  /**
   * Track viewing session
   *
   * Simpler endpoint without retry logic (can be enhanced later if needed)
   *
   * @param session - Viewing session data to track
   */
  async trackViewingSession(session: ViewingSession): Promise<void> {
    // BUG-005 FIX: Don't manually add /api - baseUrl already configured correctly
    const endpoint = `${this.baseUrl}/viewing/session`;

    const response = await this.fetchWithTimeout(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(session),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }

  /**
   * Fetch with timeout wrapper
   *
   * Aborts request after 30 seconds to prevent hanging
   * Uses Promise.race to work with both real and fake timers
   *
   * @private
   */
  private async fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController();

    // Timeout promise that rejects after specified time
    const timeoutPromise = new Promise<Response>((_, reject) => {
      setTimeout(() => {
        controller.abort();
        reject(new Error('Request timeout'));
      }, this.timeout);
    });

    // Fetch promise with abort signal
    const fetchPromise = fetch(url, {
      ...options,
      signal: controller.signal,
    });

    // Race between fetch and timeout - first to complete wins
    return Promise.race([fetchPromise, timeoutPromise]);
  }

  /**
   * Retry operation with exponential backoff
   *
   * Extracted for reusability across different operations
   *
   * @private
   */
  private async retryWithBackoff(operation: () => Promise<void>): Promise<void> {
    for (let attempt = 0; attempt < BATCH_CONFIG.MAX_RETRIES; attempt++) {
      try {
        await operation();
        return; // Success
      } catch (error) {
        // Don't retry on auth errors
        if (error instanceof Error && error.message.includes('Authentication error')) {
          throw error;
        }

        // On last attempt, throw the error
        if (attempt === BATCH_CONFIG.MAX_RETRIES - 1) {
          throw error;
        }

        // Wait before retry with exponential backoff
        await this.delay(RETRY_DELAYS[attempt]);
      }
    }
  }

  /**
   * Delay utility for retry backoff
   *
   * @private
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default AnalyticsApiClient;
