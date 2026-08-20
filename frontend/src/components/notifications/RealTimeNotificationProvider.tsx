'use client';

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import * as signalR from '@microsoft/signalr';
import { ToastContainer, useToastNotifications, ToastNotification } from './NotificationToast';
import { AppNotification } from './NotificationCenter';
import { logger } from '@/lib/logger';

export interface RealTimeNotificationConfig {
  signalRUrl?: string;
  websocketUrl?: string;
  enableSignalR: boolean;
  enableWebSocket: boolean;
  reconnectAttempts: number;
  reconnectInterval: number;
  heartbeatInterval: number;
  authToken?: string;
  userId?: string;
}

interface NotificationPayload {
  id: string;
  type: 'notification' | 'broadcast' | 'targeted';
  data: {
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
    metadata?: {
      contentId?: string;
      imageUrl?: string;
      url?: string;
      source?: string;
    };
  };
  timestamp: string;
  targetUsers?: string[];
  channels: ('push' | 'email' | 'in-app' | 'sms')[];
}

interface RealTimeNotificationContextType {
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  notifications: AppNotification[];
  unreadCount: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  subscribe: (channel: string, callback: (data: any) => void) => void;
  unsubscribe: (channel: string) => void;
  sendNotification: (payload: NotificationPayload) => void;
  markAsRead: (notificationId: string) => void;
  clearAll: () => void;
  reconnect: () => void;
}

const RealTimeNotificationContext = createContext<RealTimeNotificationContextType | null>(null);

export function useRealTimeNotifications() {
  const context = useContext(RealTimeNotificationContext);
  if (!context) {
    throw new Error('useRealTimeNotifications must be used within RealTimeNotificationProvider');
  }
  return context;
}

interface RealTimeNotificationProviderProps {
  children: React.ReactNode;
  config: RealTimeNotificationConfig;
  showToasts?: boolean;
  toastPosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  maxToasts?: number;
}

export function RealTimeNotificationProvider({
  children,
  config,
  showToasts = true,
  toastPosition = 'top-right',
  maxToasts = 5,
}: RealTimeNotificationProviderProps) {
  // SignalR connection
  const signalRConnectionRef = useRef<signalR.HubConnection | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);

  // State
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>(
    'disconnected'
  );
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [subscriptions, setSubscriptions] = useState<Map<string, (data: any) => void>>(new Map());

  // Toast notifications
  const toastSystem = useToastNotifications();

  // Reconnection state
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<NodeJS.Timeout | undefined>(undefined);

  // Initialize SignalR connection
  const initializeSignalR = useCallback(async () => {
    if (!config.enableSignalR || !config.signalRUrl) return;

    try {
      setConnectionStatus('connecting');

      const connection = new signalR.HubConnectionBuilder()
        .withUrl(config.signalRUrl, {
          accessTokenFactory: () => config.authToken || '',
          transport: signalR.HttpTransportType.WebSockets,
        })
        .withAutomaticReconnect({
          nextRetryDelayInMilliseconds: retryContext => {
            if (retryContext.previousRetryCount < config.reconnectAttempts) {
              return config.reconnectInterval * Math.pow(2, retryContext.previousRetryCount);
            }
            return null;
          },
        })
        .configureLogging(signalR.LogLevel.Information)
        .build();

      // Connection event handlers
      connection.onclose(error => {
        logger.info('[RealTimeNotificationProvider] SignalR connection closed', { error });
        setIsConnected(false);
        setConnectionStatus('disconnected');
        handleReconnect();
      });

      connection.onreconnecting(error => {
        logger.info('[RealTimeNotificationProvider] SignalR reconnecting', { error });
        setConnectionStatus('connecting');
      });

      connection.onreconnected(connectionId => {
        logger.info('[RealTimeNotificationProvider] SignalR reconnected', { connectionId });
        setIsConnected(true);
        setConnectionStatus('connected');
        reconnectAttempts.current = 0;

        // Re-subscribe to user-specific channel
        if (config.userId) {
          connection.invoke('JoinUserGroup', config.userId);
        }
      });

      // Notification handlers
      connection.on('ReceiveNotification', (payload: NotificationPayload) => {
        handleIncomingNotification(payload);
      });

      connection.on('ReceiveBroadcast', (payload: NotificationPayload) => {
        handleIncomingNotification(payload);
      });

      connection.on('UserNotification', (payload: NotificationPayload) => {
        if (!payload.targetUsers || payload.targetUsers.includes(config.userId || '')) {
          handleIncomingNotification(payload);
        }
      });

      // Custom channel subscriptions
      subscriptions.forEach((callback, channel) => {
        connection.on(channel, callback);
      });

      await connection.start();
      logger.info('[RealTimeNotificationProvider] SignalR connected');

      signalRConnectionRef.current = connection;
      setIsConnected(true);
      setConnectionStatus('connected');
      reconnectAttempts.current = 0;

      // Join user-specific group
      if (config.userId) {
        await connection.invoke('JoinUserGroup', config.userId);
      }
    } catch (error) {
      console.error('SignalR connection error:', error);
      setConnectionStatus('error');
      handleReconnect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, subscriptions]);

  // Initialize WebSocket connection
  const initializeWebSocket = useCallback(() => {
    if (!config.enableWebSocket || !config.websocketUrl) return;

    try {
      setConnectionStatus('connecting');

      const ws = new WebSocket(config.websocketUrl);

      ws.onopen = () => {
        logger.info('[RealTimeNotificationProvider] WebSocket connected');
        setIsConnected(true);
        setConnectionStatus('connected');
        reconnectAttempts.current = 0;

        // Send authentication if token provided
        if (config.authToken) {
          ws.send(
            JSON.stringify({
              type: 'auth',
              token: config.authToken,
              userId: config.userId,
            })
          );
        }
      };

      ws.onmessage = event => {
        try {
          const payload: NotificationPayload = JSON.parse(event.data);
          handleIncomingNotification(payload);
        } catch (error) {
          console.error('WebSocket message parse error:', error);
        }
      };

      ws.onclose = event => {
        logger.info('[RealTimeNotificationProvider] WebSocket closed', { code: event.code, reason: event.reason });
        setIsConnected(false);
        setConnectionStatus('disconnected');
        handleReconnect();
      };

      ws.onerror = error => {
        console.error('WebSocket error:', error);
        setConnectionStatus('error');
      };

      websocketRef.current = ws;
    } catch (error) {
      console.error('WebSocket connection error:', error);
      setConnectionStatus('error');
      handleReconnect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  // Handle incoming notifications
  const handleIncomingNotification = useCallback(
    (payload: NotificationPayload) => {
      const notification: AppNotification = {
        id: payload.id,
        title: payload.data.title,
        message: payload.data.message,
        type: payload.data.type,
        category: payload.data.category as 'watchlist' | 'security' | 'system' | 'billing' | 'social' | 'content',
        priority: payload.data.priority,
        timestamp: new Date(payload.timestamp),
        read: false,
        archived: false,
        starred: false,
        actionable: Boolean(payload.data.actions?.length),
        actions: payload.data.actions?.map(action => ({
          id: action.id,
          label: action.label,
          type: action.type,
          url: action.url,
          action: () => {
            if (action.url) {
              window.open(action.url, '_blank');
            }
          },
        })),
        metadata: payload.data.metadata,
      };

      // Add to notifications list
      setNotifications(prev => [notification, ...prev.slice(0, 99)]);

      // Show toast if enabled and in-app channel is included
      if (showToasts && payload.channels.includes('in-app')) {
        const toastNotification: Omit<ToastNotification, 'id' | 'timestamp'> = {
          title: notification.title,
          message: notification.message,
          type: notification.type,
          category: notification.category,
          priority: notification.priority,
          duration: notification.priority === 'critical' ? 10000 : 5000,
          actions: notification.actions?.slice(0, 2).map(action => ({
            id: action.id,
            label: action.label,
            type: action.type,
            action: action.action || (() => {}),
          })),
          metadata: notification.metadata,
        };

        toastSystem.addNotification(toastNotification);
      }

      // Play sound for high priority notifications
      if (['high', 'critical'].includes(notification.priority)) {
        playNotificationSound();
      }

      // Show browser notification for critical notifications
      if (notification.priority === 'critical' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico',
          tag: notification.id,
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [showToasts, toastSystem]
  );

  // Handle reconnection
  const handleReconnect = useCallback(() => {
    if (reconnectAttempts.current >= config.reconnectAttempts) {
      logger.info('[RealTimeNotificationProvider] Max reconnection attempts reached');
      return;
    }

    const delay = config.reconnectInterval * Math.pow(2, reconnectAttempts.current);
    reconnectAttempts.current++;

    logger.info('[RealTimeNotificationProvider] Attempting reconnection', {
      attempt: reconnectAttempts.current,
      max: config.reconnectAttempts,
      delay
    });

    reconnectTimer.current = setTimeout(() => {
      if (config.enableSignalR) {
        initializeSignalR();
      } else if (config.enableWebSocket) {
        initializeWebSocket();
      }
    }, delay);
  }, [config, initializeSignalR, initializeWebSocket]);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    try {
      const audio = new Audio('/sounds/notification.mp3');
      audio.volume = 0.3;
      audio.play().catch(() => {
        // Ignore play failures (user interaction required)
      });
    } catch (_error) {
      // Ignore audio errors
    }
  }, []);

  // Context methods
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subscribe = useCallback((channel: string, callback: (data: any) => void) => {
    setSubscriptions(prev => new Map(prev).set(channel, callback));

    // Add to existing connection if available
    if (signalRConnectionRef.current?.state === signalR.HubConnectionState.Connected) {
      signalRConnectionRef.current.on(channel, callback);
    }
  }, []);

  const unsubscribe = useCallback((channel: string) => {
    setSubscriptions(prev => {
      const newMap = new Map(prev);
      newMap.delete(channel);
      return newMap;
    });

    // Remove from existing connection if available
    if (signalRConnectionRef.current?.state === signalR.HubConnectionState.Connected) {
      signalRConnectionRef.current.off(channel);
    }
  }, []);

  const sendNotification = useCallback(async (payload: NotificationPayload) => {
    try {
      if (signalRConnectionRef.current?.state === signalR.HubConnectionState.Connected) {
        await signalRConnectionRef.current.invoke('SendNotification', payload);
      } else if (websocketRef.current?.readyState === WebSocket.OPEN) {
        websocketRef.current.send(JSON.stringify({ ...payload, messageType: 'notification' }));
      } else {
        throw new Error('No active connection available');
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }, []);

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => prev.map(n => (n.id === notificationId ? { ...n, read: true } : n)));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    toastSystem.clearAll();
  }, [toastSystem]);

  const reconnect = useCallback(() => {
    // Close existing connections
    if (signalRConnectionRef.current) {
      signalRConnectionRef.current.stop();
    }
    if (websocketRef.current) {
      websocketRef.current.close();
    }

    // Clear reconnect timer
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
    }

    // Reset attempts and reconnect
    reconnectAttempts.current = 0;

    if (config.enableSignalR) {
      initializeSignalR();
    } else if (config.enableWebSocket) {
      initializeWebSocket();
    }
  }, [config, initializeSignalR, initializeWebSocket]);

  // Initialize connections on mount
  useEffect(() => {
    if (config.enableSignalR) {
      initializeSignalR();
    } else if (config.enableWebSocket) {
      initializeWebSocket();
    }

    return () => {
      if (signalRConnectionRef.current) {
        signalRConnectionRef.current.stop();
      }
      if (websocketRef.current) {
        websocketRef.current.close();
      }
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initializeSignalR, initializeWebSocket]);

  // Heartbeat for WebSocket
  useEffect(() => {
    if (!config.enableWebSocket || !websocketRef.current) return;

    const heartbeat = setInterval(() => {
      if (websocketRef.current?.readyState === WebSocket.OPEN) {
        websocketRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, config.heartbeatInterval);

    return () => clearInterval(heartbeat);
  }, [config.enableWebSocket, config.heartbeatInterval]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const contextValue: RealTimeNotificationContextType = {
    isConnected,
    connectionStatus,
    notifications,
    unreadCount,
    subscribe,
    unsubscribe,
    sendNotification,
    markAsRead,
    clearAll,
    reconnect,
  };

  return (
    <RealTimeNotificationContext.Provider value={contextValue}>
      {children}
      {showToasts && (
        <ToastContainer
          notifications={toastSystem.notifications}
          position={toastPosition}
          maxNotifications={maxToasts}
        />
      )}
    </RealTimeNotificationContext.Provider>
  );
}

// Default configuration
export const defaultNotificationConfig: RealTimeNotificationConfig = {
  signalRUrl: '/api/notifications',
  websocketUrl: 'wss://localhost:3001/notifications',
  enableSignalR: true,
  enableWebSocket: false,
  reconnectAttempts: 5,
  reconnectInterval: 1000,
  heartbeatInterval: 30000,
};

// Convenience hook for common notification patterns
export function useNotificationActions() {
  const { sendNotification, markAsRead } = useRealTimeNotifications();

  const showWatchlistUpdate = useCallback(
    (contentTitle: string, platform: string, contentId: string) => {
      const payload: NotificationPayload = {
        id: `watchlist-${contentId}-${Date.now()}`,
        type: 'notification',
        data: {
          title: 'Watchlist Update',
          message: `${contentTitle} is now available on ${platform}`,
          type: 'info',
          category: 'watchlist',
          priority: 'medium',
          actions: [
            {
              id: 'watch-now',
              label: 'Watch Now',
              type: 'primary',
              url: `/watch/${contentId}`,
            },
            {
              id: 'view-details',
              label: 'View Details',
              type: 'secondary',
              url: `/content/${contentId}`,
            },
          ],
          metadata: {
            contentId,
            source: platform,
          },
        },
        timestamp: new Date().toISOString(),
        channels: ['push', 'in-app'],
      };

      sendNotification(payload);
    },
    [sendNotification]
  );

  const showSecurityAlert = useCallback(
    (message: string, severity: 'low' | 'high' = 'high') => {
      const payload: NotificationPayload = {
        id: `security-${Date.now()}`,
        type: 'notification',
        data: {
          title: 'Security Alert',
          message,
          type: 'warning',
          category: 'security',
          priority: severity === 'high' ? 'critical' : 'medium',
          actions: [
            {
              id: 'review-security',
              label: 'Review',
              type: 'primary',
              url: '/account/security',
            },
          ],
          metadata: {
            source: 'security-system',
          },
        },
        timestamp: new Date().toISOString(),
        channels: ['push', 'email', 'in-app'],
      };

      sendNotification(payload);
    },
    [sendNotification]
  );

  return {
    showWatchlistUpdate,
    showSecurityAlert,
    markAsRead,
  };
}
