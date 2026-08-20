'use client';

import { AppNotification } from './NotificationCenter';
import { NotificationSettings } from './NotificationPreferences';
import { NotificationHistoryItem } from './NotificationHistory';

export interface NotificationSubscription {
  id: string;
  userId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
  createdAt: Date;
  lastUsed?: Date;
}

export interface NotificationDeliveryOptions {
  userId?: string;
  userIds?: string[];
  channels: ('push' | 'email' | 'in-app' | 'sms')[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  scheduledFor?: Date;
  expiresAt?: Date;
  templateId?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  templateData?: Record<string, any>;
}

export class NotificationAPI {
  private baseUrl: string;
  private authToken: string | null = null;

  constructor(baseUrl: string = '/api/notifications') {
    this.baseUrl = baseUrl;
  }

  setAuthToken(token: string) {
    this.authToken = token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error ${response.status}: ${error}`);
    }

    return response.json();
  }

  // Notification CRUD operations
  async getNotifications(
    params: {
      limit?: number;
      offset?: number;
      category?: string;
      read?: boolean;
      archived?: boolean;
    } = {}
  ): Promise<{ notifications: AppNotification[]; total: number }> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.set(key, value.toString());
      }
    });

    return this.request<{ notifications: AppNotification[]; total: number }>(`?${searchParams.toString()}`);
  }

  async markAsRead(notificationIds: string[]): Promise<void> {
    await this.request('/mark-read', {
      method: 'POST',
      body: JSON.stringify({ ids: notificationIds }),
    });
  }

  async markAsUnread(notificationIds: string[]): Promise<void> {
    await this.request('/mark-unread', {
      method: 'POST',
      body: JSON.stringify({ ids: notificationIds }),
    });
  }

  async archive(notificationIds: string[]): Promise<void> {
    await this.request('/archive', {
      method: 'POST',
      body: JSON.stringify({ ids: notificationIds }),
    });
  }

  async delete(notificationIds: string[]): Promise<void> {
    await this.request('/delete', {
      method: 'POST',
      body: JSON.stringify({ ids: notificationIds }),
    });
  }

  async star(notificationId: string): Promise<void> {
    await this.request(`/${notificationId}/star`, {
      method: 'POST',
    });
  }

  async unstar(notificationId: string): Promise<void> {
    await this.request(`/${notificationId}/unstar`, {
      method: 'POST',
    });
  }

  // Push subscription management
  async subscribeToPush(subscription: PushSubscription): Promise<NotificationSubscription> {
    return this.request<NotificationSubscription>('/subscribe', {
      method: 'POST',
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.getKey('p256dh')
            ? btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!)))
            : '',
          auth: subscription.getKey('auth')
            ? btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!)))
            : '',
        },
        userAgent: navigator.userAgent,
      }),
    });
  }

  async unsubscribeFromPush(subscriptionId: string): Promise<void> {
    await this.request(`/subscribe/${subscriptionId}`, {
      method: 'DELETE',
    });
  }

  async updateSubscription(
    subscriptionId: string,
    data: Partial<NotificationSubscription>
  ): Promise<NotificationSubscription> {
    return this.request<NotificationSubscription>(`/subscribe/${subscriptionId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Settings management
  async getSettings(): Promise<NotificationSettings> {
    return this.request<NotificationSettings>('/settings');
  }

  async updateSettings(settings: NotificationSettings): Promise<NotificationSettings> {
    return this.request<NotificationSettings>('/settings', {
      method: 'POST',
      body: JSON.stringify(settings),
    });
  }

  async resetSettings(): Promise<NotificationSettings> {
    return this.request<NotificationSettings>('/settings/reset', {
      method: 'POST',
    });
  }

  // History and analytics
  async getHistory(
    params: {
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
      category?: string;
      channel?: string;
      status?: string;
    } = {}
  ): Promise<{ history: NotificationHistoryItem[]; total: number }> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        if (value instanceof Date) {
          searchParams.set(key, value.toISOString());
        } else {
          searchParams.set(key, value.toString());
        }
      }
    });

    return this.request<{ history: NotificationHistoryItem[]; total: number }>(`/history?${searchParams.toString()}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getAnalytics(timeframe: '24h' | '7d' | '30d' = '7d'): Promise<any> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.request<any>(`/analytics?timeframe=${timeframe}`);
  }

  // Notification sending (admin/testing)
  async sendNotification(
    notification: {
      title: string;
      message: string;
      type: 'info' | 'success' | 'warning' | 'error';
      category: string;
      priority: 'low' | 'medium' | 'high' | 'critical';
      actions?: Array<{
        id: string;
        label: string;
        type: 'primary' | 'secondary' | 'destructive';
        url?: string;
      }>;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      metadata?: Record<string, any>;
    },
    options: NotificationDeliveryOptions
  ): Promise<{ id: string; status: string }> {
    return this.request<{ id: string; status: string }>('/send', {
      method: 'POST',
      body: JSON.stringify({ notification, options }),
    });
  }

  // Test notifications
  async sendTestNotification(type: 'push' | 'email' | 'in-app' = 'push'): Promise<void> {
    await this.request('/test', {
      method: 'POST',
      body: JSON.stringify({ type }),
    });
  }

  // Real-time connection
  createEventSource(): EventSource {
    const url = `${this.baseUrl}/stream`;
    const eventSource = new EventSource(url, {
      withCredentials: true,
    });

    return eventSource;
  }

  // Utility methods
  async validateVapidKey(publicKey: string): Promise<boolean> {
    try {
      await this.request('/vapid/validate', {
        method: 'POST',
        body: JSON.stringify({ publicKey }),
      });
      return true;
    } catch {
      return false;
    }
  }

  async getVapidPublicKey(): Promise<string> {
    const response = await this.request<{ publicKey: string }>('/vapid/public-key');
    return response.publicKey;
  }

  // Watchlist integration
  async subscribeToWatchlistUpdates(contentId: string): Promise<void> {
    await this.request('/watchlist/subscribe', {
      method: 'POST',
      body: JSON.stringify({ contentId }),
    });
  }

  async unsubscribeFromWatchlistUpdates(contentId: string): Promise<void> {
    await this.request('/watchlist/unsubscribe', {
      method: 'POST',
      body: JSON.stringify({ contentId }),
    });
  }

  async getWatchlistSubscriptions(): Promise<string[]> {
    const response = await this.request<{ contentIds: string[] }>('/watchlist/subscriptions');
    return response.contentIds;
  }
}

// Singleton instance
export const notificationAPI = new NotificationAPI();

// React hook for easy API usage
import { useCallback, useState } from 'react';

export function useNotificationAPI() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeRequest = useCallback(async <T>(fn: () => Promise<T>): Promise<T | null> => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await fn();
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Notification API error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // SECURITY: Auth is handled via httpOnly cookies (credentials: 'include')
  // No longer need to set auth token from localStorage - tokens are in cookies

  return {
    api: notificationAPI,
    isLoading,
    error,
    executeRequest,
    clearError: () => setError(null),
  };
}

// Helper functions for common operations
export const NotificationHelpers = {
  // Create notification for watchlist updates
  createWatchlistNotification: (contentTitle: string, platform: string, contentId: string) => ({
    title: 'Watchlist Update',
    message: `${contentTitle} is now available on ${platform}`,
    type: 'info' as const,
    category: 'watchlist',
    priority: 'medium' as const,
    actions: [
      {
        id: 'watch-now',
        label: 'Watch Now',
        type: 'primary' as const,
        url: `/watch/${contentId}`,
      },
      {
        id: 'view-details',
        label: 'View Details',
        type: 'secondary' as const,
        url: `/content/${contentId}`,
      },
    ],
    metadata: {
      contentId,
      source: platform,
      imageUrl: `/api/content/${contentId}/thumbnail`,
    },
  }),

  // Create security alert notification
  createSecurityAlert: (message: string, severity: 'low' | 'high' = 'high') => ({
    title: 'Security Alert',
    message,
    type: 'warning' as const,
    category: 'security',
    priority: severity === 'high' ? ('critical' as const) : ('medium' as const),
    actions: [
      {
        id: 'review-security',
        label: 'Review',
        type: 'primary' as const,
        url: '/account/security',
      },
      {
        id: 'dismiss',
        label: 'Dismiss',
        type: 'secondary' as const,
      },
    ],
    metadata: {
      source: 'security-system',
    },
  }),

  // Create system maintenance notification
  createMaintenanceNotification: (startTime: Date, endTime: Date) => ({
    title: 'System Maintenance',
    message: `Scheduled maintenance from ${startTime.toLocaleTimeString()} to ${endTime.toLocaleTimeString()}`,
    type: 'info' as const,
    category: 'system',
    priority: 'low' as const,
    metadata: {
      source: 'admin',
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
    },
  }),
};
