/**
 * AnalyticsTransformer - Data Transformation Layer
 *
 * Transforms mobile analytics events to backend API format.
 *
 * Key transformations:
 * - Converts JavaScript timestamps (ms) to ISO 8601 DateTime strings
 * - Serializes event data objects to JSON strings
 * - Adds device context (platform, screen resolution, deviceId)
 * - Includes session tracking (sessionId, userId)
 * - Enforces consent metadata (hasConsent, consentCategories)
 */

import { Dimensions, Platform } from 'react-native';
import { QueuedEvent, AnalyticsConfig, UserBehaviorEventRequest } from './types';

export class AnalyticsTransformer {
  /**
   * Transform mobile QueuedEvent to backend UserBehaviorEventRequest format
   *
   * @param event - Mobile analytics event from queue
   * @param config - Analytics configuration (session, device, consent)
   * @returns Formatted event ready for backend API
   *
   * @example
   * ```typescript
   * const event: QueuedEvent = {
   *   id: 'evt-123',
   *   timestamp: Date.now(),
   *   eventType: 'button_click',
   *   category: 'engagement',
   *   source: 'analytics',
   *   data: { button: 'submit' },
   *   retryCount: 0
   * };
   *
   * const config: AnalyticsConfig = {
   *   userId: 'user-456',
   *   sessionId: 'session-789',
   *   deviceId: 'device-abc',
   *   hasConsent: true,
   *   consentCategories: 'analytics,marketing'
   * };
   *
   * const transformed = transformer.toUserBehaviorEvent(event, config);
   * // Result includes all metadata formatted for backend
   * ```
   */
  toUserBehaviorEvent(event: QueuedEvent, config: AnalyticsConfig): UserBehaviorEventRequest {
    return {
      eventType: event.eventType,
      category: event.category,
      userId: config.userId,
      sessionId: config.sessionId,
      deviceId: config.deviceId,
      clientTimestamp: new Date(event.timestamp).toISOString(),
      properties: JSON.stringify(event.data),
      hasConsent: config.hasConsent,
      consentCategories: config.consentCategories,
      screenResolution: `${Dimensions.get('window').width}×${Dimensions.get('window').height}`,
      platform: Platform.OS,
    };
  }
}

export default AnalyticsTransformer;
