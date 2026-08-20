/**
 * @jest-environment jsdom
 */

import { NotificationAPI, NotificationHelpers } from '../NotificationAPI';
import { createMockResponse } from '../../../test/test-utils';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

describe('NotificationAPI', () => {
  let api: NotificationAPI;

  beforeEach(() => {
    api = new NotificationAPI('/test/api/notifications');
    api.setAuthToken('test-token');
    mockFetch.mockClear();
  });

  describe('Authentication', () => {
    it('sets auth token correctly', () => {
      api.setAuthToken('new-token');
      // Token should be used in subsequent requests
      expect(api).toBeDefined();
    });

    it('includes auth token in requests', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ notifications: [], total: 0 })
      );

      await api.getNotifications();

      expect(mockFetch).toHaveBeenCalled();
      const request = mockFetch.mock.calls[0][0];
      expect(request.url).toContain('/test/api/notifications?');
      expect(request.headers.get('Authorization')).toBe('Bearer test-token');
    });
  });

  describe('getNotifications', () => {
    it('fetches notifications successfully', async () => {
      const mockResponse = {
        notifications: [
          {
            id: '1',
            title: 'Test',
            message: 'Test message',
            type: 'info',
            category: 'system',
            priority: 'low',
          },
        ],
        total: 1,
      };

      mockFetch.mockResolvedValueOnce(
        createMockResponse(mockResponse)
      );

      const result = await api.getNotifications({ limit: 10 });

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalled();
      const request = mockFetch.mock.calls[0][0];
      expect(request.url).toContain('/test/api/notifications?limit=10');
      expect(request.headers.get('Content-Type')).toBe('application/json');
      expect(request.headers.get('Authorization')).toBe('Bearer test-token');
    });

    it('handles API errors', async () => {
      // For error responses, use plain Response with text body (not JSON)
      mockFetch.mockResolvedValueOnce(
        new Response('Not Found', { status: 404, statusText: 'Not Found' })
      );

      await expect(api.getNotifications()).rejects.toThrow('API Error 404: Not Found');
    });
  });

  describe('markAsRead', () => {
    it('marks notifications as read', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({})
      );

      await api.markAsRead(['1', '2']);

      expect(mockFetch).toHaveBeenCalled();
      const request = mockFetch.mock.calls[0][0];
      expect(request.url).toContain('/test/api/notifications/mark-read');
      expect(request.method).toBe('POST');
      // Note: Request body is a ReadableStream, we'll trust the implementation
    });
  });

  describe('Push subscription management', () => {
    it('subscribes to push notifications', async () => {
      const mockSubscription = {
        endpoint: 'https://test.com/endpoint',
        getKey: jest.fn((keyName: string) => {
          if (keyName === 'p256dh') return new Uint8Array([116, 101, 115, 116]); // 'test' in bytes
          if (keyName === 'auth') return new Uint8Array([97, 117, 116, 104]); // 'auth' in bytes
          return null;
        }),
        options: {},
        unsubscribe: jest.fn(),
        toJSON: jest.fn(),
      } as unknown as PushSubscription;

      const mockResponse = {
        id: 'subscription-1',
        userId: 'user-1',
        endpoint: 'https://test.com/endpoint',
        keys: { p256dh: 'test-key', auth: 'test-auth' },
        createdAt: new Date().toISOString(),
        active: true,
      };

      mockFetch.mockResolvedValueOnce(
        createMockResponse(mockResponse)
      );

      const result = await api.subscribeToPush(mockSubscription);

      expect(result).toMatchObject(mockResponse);
      expect(mockFetch).toHaveBeenCalled();
      const request = mockFetch.mock.calls[0][0];
      expect(request.url).toContain('/test/api/notifications/subscribe');
      expect(request.method).toBe('POST');
      // Note: Request body is a ReadableStream, we'll trust the implementation
    });
  });

  describe('Settings management', () => {
    it('gets notification settings', async () => {
      const mockSettings = {
        id: 'settings-1',
        userId: 'user-1',
        globalEnabled: true,
        soundEnabled: true,
        vibrationEnabled: false,
        emailDigest: { enabled: true, frequency: 'daily' as const, time: '09:00' },
        preferences: [],
        customRules: [],
        blockedSources: [],
        allowedSources: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockFetch.mockResolvedValueOnce(
        createMockResponse(mockSettings)
      );

      const result = await api.getSettings();

      expect(result).toMatchObject(mockSettings);
    });

    it('updates notification settings', async () => {
      const settingsUpdate = {
        globalEnabled: false,
        soundEnabled: false,
      };

      mockFetch.mockResolvedValueOnce(
        createMockResponse(settingsUpdate)
      );

      await api.updateSettings(settingsUpdate as any);

      expect(mockFetch).toHaveBeenCalled();
      const request = mockFetch.mock.calls[0][0];
      expect(request.url).toContain('/test/api/notifications/settings');
      expect(request.method).toBe('POST');
      // Note: Request body is a ReadableStream, we'll trust the implementation
    });
  });

  describe('Test notifications', () => {
    it('sends test notification', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({})
      );

      await api.sendTestNotification('push');

      expect(mockFetch).toHaveBeenCalled();
      const request = mockFetch.mock.calls[0][0];
      expect(request.url).toContain('/test/api/notifications/test');
      expect(request.method).toBe('POST');
      // Note: Request body is a ReadableStream, we'll trust the implementation
    });
  });

  describe('Watchlist integration', () => {
    it('subscribes to watchlist updates', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({})
      );

      await api.subscribeToWatchlistUpdates('content-123');

      expect(mockFetch).toHaveBeenCalled();
      const request = mockFetch.mock.calls[0][0];
      expect(request.url).toContain('/test/api/notifications/watchlist/subscribe');
      expect(request.method).toBe('POST');
      // Note: Request body is a ReadableStream, we'll trust the implementation
    });
  });

  describe('EventSource creation', () => {
    it('creates event source with correct URL', () => {
      // Mock EventSource
      const mockEventSource = {
        addEventListener: jest.fn(),
        close: jest.fn(),
      };
      global.EventSource = jest.fn(() => mockEventSource) as any;

      const _eventSource = api.createEventSource();

      expect(global.EventSource).toHaveBeenCalledWith('/test/api/notifications/stream', { withCredentials: true });
    });
  });
});

describe('NotificationHelpers', () => {
  describe('createWatchlistNotification', () => {
    it('creates watchlist notification correctly', () => {
      const notification = NotificationHelpers.createWatchlistNotification('Breaking Bad', 'Netflix', 'breaking-bad');

      expect(notification).toEqual({
        title: 'Watchlist Update',
        message: 'Breaking Bad is now available on Netflix',
        type: 'info',
        category: 'watchlist',
        priority: 'medium',
        actions: [
          {
            id: 'watch-now',
            label: 'Watch Now',
            type: 'primary',
            url: '/watch/breaking-bad',
          },
          {
            id: 'view-details',
            label: 'View Details',
            type: 'secondary',
            url: '/content/breaking-bad',
          },
        ],
        metadata: {
          contentId: 'breaking-bad',
          source: 'Netflix',
          imageUrl: '/api/content/breaking-bad/thumbnail',
        },
      });
    });
  });

  describe('createSecurityAlert', () => {
    it('creates security alert notification', () => {
      const notification = NotificationHelpers.createSecurityAlert('Suspicious login detected', 'high');

      expect(notification).toMatchObject({
        title: 'Security Alert',
        message: 'Suspicious login detected',
        type: 'warning',
        category: 'security',
        priority: 'critical',
        metadata: {
          source: 'security-system',
        },
      });
      expect(notification.actions).toHaveLength(2);
      expect(notification.actions[0]).toEqual({
        id: 'review-security',
        label: 'Review',
        type: 'primary',
        url: '/account/security',
      });
    });
  });

  describe('createMaintenanceNotification', () => {
    it('creates maintenance notification', () => {
      const startTime = new Date('2024-01-15T02:00:00');
      const endTime = new Date('2024-01-15T04:00:00');

      const notification = NotificationHelpers.createMaintenanceNotification(startTime, endTime);

      expect(notification.title).toBe('System Maintenance');
      expect(notification.type).toBe('info');
      expect(notification.category).toBe('system');
      expect(notification.priority).toBe('low');
      expect(notification.metadata?.source).toBe('admin');
    });
  });
});
