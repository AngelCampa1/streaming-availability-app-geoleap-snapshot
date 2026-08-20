/**
 * AnalyticsTransformer Tests - TDD RED PHASE
 * Write tests FIRST before implementation
 * These tests will FAIL until AnalyticsTransformer is properly implemented
 */

import { Dimensions, Platform } from 'react-native';
import { AnalyticsTransformer } from '../AnalyticsTransformer';
import { QueuedEvent, AnalyticsConfig } from '../types';

// Mock React Native modules
jest.mock('react-native', () => ({
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 812 })),
  },
  Platform: {
    OS: 'ios',
  },
}));

describe('AnalyticsTransformer', () => {
  let transformer: AnalyticsTransformer;

  beforeEach(() => {
    transformer = new AnalyticsTransformer();

    // Reset mocks
    (Dimensions.get as jest.Mock).mockReturnValue({ width: 375, height: 812 });
    (Platform as any).OS = 'ios';
  });

  it('should convert JavaScript timestamp (ms) to ISO DateTime string', () => {
    const event: QueuedEvent = {
      id: 'event-1',
      timestamp: 1700000000000, // Nov 14, 2023, 22:13:20 GMT
      eventType: 'test_event',
      category: 'test',
      source: 'analytics',
      data: {},
      retryCount: 0,
    };

    const config: AnalyticsConfig = {
      sessionId: 'session-123',
      deviceId: 'device-456',
      hasConsent: true,
      consentCategories: 'analytics',
    };

    const result = transformer.toUserBehaviorEvent(event, config);

    expect(result.clientTimestamp).toBe('2023-11-14T22:13:20.000Z');
  });

  it('should serialize properties object to JSON string', () => {
    const event: QueuedEvent = {
      id: 'event-1',
      timestamp: Date.now(),
      eventType: 'test_event',
      category: 'test',
      source: 'analytics',
      data: { foo: 'bar', count: 42, nested: { key: 'value' } },
      retryCount: 0,
    };

    const config: AnalyticsConfig = {
      sessionId: 'session-123',
      deviceId: 'device-456',
      hasConsent: true,
      consentCategories: 'analytics',
    };

    const result = transformer.toUserBehaviorEvent(event, config);

    expect(result.properties).toBe(JSON.stringify({ foo: 'bar', count: 42, nested: { key: 'value' } }));
  });

  it('should add hasConsent field from config', () => {
    const event: QueuedEvent = {
      id: 'event-1',
      timestamp: Date.now(),
      eventType: 'test_event',
      category: 'test',
      source: 'analytics',
      data: {},
      retryCount: 0,
    };

    const config: AnalyticsConfig = {
      sessionId: 'session-123',
      deviceId: 'device-456',
      hasConsent: true,
      consentCategories: 'analytics',
    };

    const result = transformer.toUserBehaviorEvent(event, config);

    expect(result.hasConsent).toBe(true);
  });

  it('should add consentCategories from config', () => {
    const event: QueuedEvent = {
      id: 'event-1',
      timestamp: Date.now(),
      eventType: 'test_event',
      category: 'test',
      source: 'analytics',
      data: {},
      retryCount: 0,
    };

    const config: AnalyticsConfig = {
      sessionId: 'session-123',
      deviceId: 'device-456',
      hasConsent: true,
      consentCategories: 'analytics,marketing',
    };

    const result = transformer.toUserBehaviorEvent(event, config);

    expect(result.consentCategories).toBe('analytics,marketing');
  });

  it('should add deviceId from config', () => {
    const event: QueuedEvent = {
      id: 'event-1',
      timestamp: Date.now(),
      eventType: 'test_event',
      category: 'test',
      source: 'analytics',
      data: {},
      retryCount: 0,
    };

    const config: AnalyticsConfig = {
      sessionId: 'session-123',
      deviceId: 'device-456-abc',
      hasConsent: true,
      consentCategories: 'analytics',
    };

    const result = transformer.toUserBehaviorEvent(event, config);

    expect(result.deviceId).toBe('device-456-abc');
  });

  it('should add sessionId from config', () => {
    const event: QueuedEvent = {
      id: 'event-1',
      timestamp: Date.now(),
      eventType: 'test_event',
      category: 'test',
      source: 'analytics',
      data: {},
      retryCount: 0,
    };

    const config: AnalyticsConfig = {
      sessionId: 'session-789-xyz',
      deviceId: 'device-456',
      hasConsent: true,
      consentCategories: 'analytics',
    };

    const result = transformer.toUserBehaviorEvent(event, config);

    expect(result.sessionId).toBe('session-789-xyz');
  });

  it('should calculate screenResolution from Dimensions', () => {
    const event: QueuedEvent = {
      id: 'event-1',
      timestamp: Date.now(),
      eventType: 'test_event',
      category: 'test',
      source: 'analytics',
      data: {},
      retryCount: 0,
    };

    const config: AnalyticsConfig = {
      sessionId: 'session-123',
      deviceId: 'device-456',
      hasConsent: true,
      consentCategories: 'analytics',
    };

    const result = transformer.toUserBehaviorEvent(event, config);

    expect(result.screenResolution).toBe('375×812');
  });

  it('should include platform (ios/android)', () => {
    const event: QueuedEvent = {
      id: 'event-1',
      timestamp: Date.now(),
      eventType: 'test_event',
      category: 'test',
      source: 'analytics',
      data: {},
      retryCount: 0,
    };

    const config: AnalyticsConfig = {
      sessionId: 'session-123',
      deviceId: 'device-456',
      hasConsent: true,
      consentCategories: 'analytics',
    };

    const result = transformer.toUserBehaviorEvent(event, config);

    expect(result.platform).toBe('ios');

    // Test Android
    (Platform as any).OS = 'android';
    const androidResult = transformer.toUserBehaviorEvent(event, config);
    expect(androidResult.platform).toBe('android');
  });

  it('should handle missing optional fields gracefully', () => {
    const event: QueuedEvent = {
      id: 'event-1',
      timestamp: Date.now(),
      eventType: 'test_event',
      category: 'test',
      source: 'analytics',
      data: {},
      retryCount: 0,
    };

    const config: AnalyticsConfig = {
      // userId is optional
      sessionId: 'session-123',
      deviceId: 'device-456',
      hasConsent: true,
      consentCategories: 'analytics',
    };

    const result = transformer.toUserBehaviorEvent(event, config);

    // Should not throw error
    expect(result.userId).toBeUndefined();
    expect(result.eventType).toBe('test_event');
    expect(result.category).toBe('test');
  });
});
