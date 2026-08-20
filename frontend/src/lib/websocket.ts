/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React from 'react';
import { logger } from '@/lib/logger';

export interface WebSocketMessage {
  type: 'analytics_update' | 'cohort_update' | 'channel_update' | 'error';
  data: any;
  timestamp: string;
}

export interface WebSocketConnection {
  connect: () => void;
  disconnect: () => void;
  send: (message: any) => void;
  onMessage: (callback: (message: WebSocketMessage) => void) => void;
  onOpen: (callback: () => void) => void;
  onError: (callback: (error: Error) => void) => void;
  onClose: (callback: () => void) => void;
  isConnected: () => boolean;
}

class WebSocketService implements WebSocketConnection {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private messageCallbacks: ((message: WebSocketMessage) => void)[] = [];
  private openCallbacks: (() => void)[] = [];
  private errorCallbacks: ((error: Error) => void)[] = [];
  private closeCallbacks: (() => void)[] = [];
  private reconnectTimeout: NodeJS.Timeout | null = null;
  // FIXED: Week 1 Day 3 - Track polling interval for proper cleanup
  private pollingInterval: NodeJS.Timeout | null = null;

  constructor(url: string = '') {
    // In production, this would be your WebSocket server URL
    // For development, we'll use a mock URL that falls back to polling
    this.url =
      url ||
      (typeof window !== 'undefined'
        ? `ws://${window.location.hostname}:${Number(window.location.port) + 1}/analytics-ws`
        : 'ws://localhost:3001/analytics-ws');
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        if (process.env.NODE_ENV !== 'test') {
          logger.info('[WebSocketService] WebSocket connected for real-time analytics');
        }
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.openCallbacks.forEach(cb => cb());

        // Send subscription message for analytics updates
        this.send({
          type: 'subscribe',
          topics: ['analytics', 'cohorts', 'channels'],
          interval: 30000, // 30 seconds
        });
      };

      this.ws.onmessage = event => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.messageCallbacks.forEach(callback => callback(message));
        } catch (error) {
          if (process.env.NODE_ENV !== 'test') {
            logger.error('[WebSocketService] Failed to parse WebSocket message', { error: error instanceof Error ? error.message : String(error) });
          }
          this.errorCallbacks.forEach(callback => callback(error as Error));
        }
      };

      this.ws.onerror = event => {
        // Only log WebSocket errors in non-test environments
        if (process.env.NODE_ENV !== 'test') {
          logger.error('[WebSocketService] WebSocket error', event);
        }
        const error = new Error('WebSocket connection error');
        this.errorCallbacks.forEach(callback => callback(error));
      };

      this.ws.onclose = event => {
        if (process.env.NODE_ENV !== 'test') {
          logger.info('[WebSocketService] WebSocket connection closed', { code: event.code });
        }
        this.ws = null;
        this.closeCallbacks.forEach(callback => callback());

        // Attempt to reconnect if not intentionally closed
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.attemptReconnect();
        }
      };
    } catch (error) {
      logger.error('[WebSocketService] Failed to connect WebSocket', { error: error instanceof Error ? error.message : String(error) });
      this.errorCallbacks.forEach(callback => callback(error as Error));
      this.fallbackToPolling();
    }
  }

  disconnect(): void {
    // FIXED: Week 1 Day 3 - Clear all timers to prevent memory leaks
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    // FIXED: Week 1 Day 3 - Clear all callbacks to prevent memory leaks
    this.messageCallbacks = [];
    this.openCallbacks = [];
    this.errorCallbacks = [];
    this.closeCallbacks = [];
  }

  send(message: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      if (process.env.NODE_ENV !== 'test') {
        logger.warn('[WebSocketService] WebSocket not connected, message not sent', message);
      }
    }
  }

  onMessage(callback: (message: WebSocketMessage) => void): void {
    this.messageCallbacks.push(callback);
  }

  onOpen(callback: () => void): void {
    this.openCallbacks.push(callback);
  }

  onError(callback: (error: Error) => void): void {
    this.errorCallbacks.push(callback);
  }

  onClose(callback: () => void): void {
    this.closeCallbacks.push(callback);
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private attemptReconnect(): void {
    this.reconnectAttempts++;
    if (process.env.NODE_ENV !== 'test') {
      logger.info('[WebSocketService] Attempting WebSocket reconnect', {
        attempt: this.reconnectAttempts,
        max: this.maxReconnectAttempts
      });
    }

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, this.reconnectDelay);

    // Exponential backoff with jitter
    this.reconnectDelay = Math.min(this.reconnectDelay * 2 + Math.random() * 1000, 30000);
  }

  private fallbackToPolling(): void {
    if (process.env.NODE_ENV !== 'test') {
      logger.info('[WebSocketService] WebSocket failed, falling back to polling mode');
    }

    // FIXED: Week 1 Day 3 - Clear existing polling interval before starting new one
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    // Simulate WebSocket messages using polling
    this.pollingInterval = setInterval(() => {
      if (this.messageCallbacks.length === 0) {
        if (this.pollingInterval) {
          clearInterval(this.pollingInterval);
          this.pollingInterval = null;
        }
        return;
      }

      // Simulate real-time analytics updates
      const mockMessage: WebSocketMessage = {
        type: 'analytics_update',
        data: {
          metrics: {
            activeUsers: Math.floor(Math.random() * 1000) + 500,
            currentRevenue: Math.floor(Math.random() * 10000) + 5000,
            conversionRate: Math.random() * 5 + 2,
            realTimeEvents: Math.floor(Math.random() * 100) + 50,
          },
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      };

      this.messageCallbacks.forEach(callback => callback(mockMessage));
    }, 60000); // Poll every 60 seconds as fallback
  }
}

// Singleton instance with reference counting
let wsInstance: WebSocketService | null = null;
let wsRefCount = 0;

export function createWebSocketConnection(url?: string): WebSocketConnection {
  if (!wsInstance) {
    wsInstance = new WebSocketService(url);
  }
  wsRefCount++;
  return wsInstance;
}

// React hook for WebSocket functionality
export function useWebSocket(autoConnect = true) {
  const [isConnected, setIsConnected] = React.useState(false);
  const [lastMessage, setLastMessage] = React.useState<WebSocketMessage | null>(null);
  const [error, setError] = React.useState<Error | null>(null);
  const wsRef = React.useRef<WebSocketConnection | null>(null);

  React.useEffect(() => {
    if (typeof window === 'undefined') return; // Skip on server-side

    wsRef.current = createWebSocketConnection();

    const handleMessage = (message: WebSocketMessage) => {
      setLastMessage(message);
      setError(null);
    };

    const handleOpen = () => setIsConnected(true);

    const handleError = (error: Error) => {
      setError(error);
      setIsConnected(false);
    };

    const handleClose = () => {
      setIsConnected(false);
    };

    wsRef.current.onMessage(handleMessage);
    wsRef.current.onOpen(handleOpen);
    wsRef.current.onError(handleError);
    wsRef.current.onClose(handleClose);

    if (autoConnect) {
      wsRef.current.connect();
      // If the socket was already open before connect() was called (e.g. shared
      // singleton), the onOpen event has already fired and won't fire again.
      // Sync state to match the real socket state in that case.
      if (wsRef.current.isConnected()) {
        setIsConnected(true);
      }
    }

    return () => {
      wsRefCount--;
      if (wsRefCount <= 0) {
        wsRef.current?.disconnect();
        wsRefCount = 0;
      }
    };
  }, [autoConnect]);

  const connect = React.useCallback(() => {
    wsRef.current?.connect();
    if (wsRef.current?.isConnected()) {
      setIsConnected(true);
    }
  }, []);

  const disconnect = React.useCallback(() => {
    wsRef.current?.disconnect();
    setIsConnected(false);
  }, []);

  const sendMessage = React.useCallback((message: any) => {
    wsRef.current?.send(message);
  }, []);

  return {
    isConnected,
    lastMessage,
    error,
    connect,
    disconnect,
    sendMessage,
  };
}

// Export additional utilities
export { wsInstance as webSocketInstance };

/** @internal Test-only: resets the module-level singleton so the next createWebSocketConnection call creates a fresh instance. */
export function _resetWebSocketSingletonForTests(): void {
  wsInstance = null;
  wsRefCount = 0;
}
