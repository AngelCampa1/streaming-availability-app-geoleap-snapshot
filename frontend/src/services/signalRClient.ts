/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { API_BASE_URL } from '@/config/api';

export interface PreferenceUpdateEvent {
  userId: string;
  category: string;
  key: string;
  value: any;
  timestamp: string;
}

export interface PreferencesUpdatedEvent {
  userId: string;
  preferences: Record<string, any>;
  timestamp: string;
}

export type SignalREventHandler = (...args: any[]) => void;

export class SignalRPreferencesClient {
  private connection: HubConnection | null = null;
  private connectionPromise: Promise<void> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private listeners: Map<string, Set<SignalREventHandler>> = new Map();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private baseUrl: string = API_BASE_URL) {}

  async connect(): Promise<void> {
    if (this.connection?.state === 'Connected') {
      return;
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this.establishConnection();
    return this.connectionPromise;
  }

  private async establishConnection(): Promise<void> {
    try {
      // SECURITY: Use cookie-based authentication instead of localStorage tokens
      // Cookies are sent automatically when withCredentials is enabled
      this.connection = new HubConnectionBuilder()
        .withUrl(`${this.baseUrl}/hubs/preferences`, {
          withCredentials: true, // Send httpOnly cookies for authentication
        })
        .withAutomaticReconnect({
          nextRetryDelayInMilliseconds: retryContext => {
            if (retryContext.previousRetryCount < 5) {
              return Math.min(1000 * Math.pow(2, retryContext.previousRetryCount), 30000);
            }
            return null; // Stop retrying after 5 attempts
          },
        })
        .configureLogging(LogLevel.Information)
        .build();

      // Set up event handlers
      this.setupEventHandlers();

      await this.connection.start();
      this.reconnectAttempts = 0;
      console.warn('SignalR Connected to preferences hub');

      // Re-register all listeners after connection
      this.reregisterListeners();
    } catch (error) {
      console.error('SignalR Connection failed:', error);
      this.connectionPromise = null;

      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        this.reconnectTimer = setTimeout(() => {
          this.reconnectTimer = null;
          this.connectionPromise = null;
          this.connect();
        }, delay);
      }

      throw error;
    }
  }

  private setupEventHandlers(): void {
    if (!this.connection) return;

    this.connection.onclose(error => {
      console.warn('SignalR Connection closed', error);
      this.connectionPromise = null;
    });

    this.connection.onreconnecting(error => {
      console.warn('SignalR Reconnecting...', error);
    });

    this.connection.onreconnected(connectionId => {
      console.warn('SignalR Reconnected', connectionId);
      this.reregisterListeners();
    });
  }

  private reregisterListeners(): void {
    if (!this.connection) return;

    // FIXED: Week 1 Day 3 - Only register if not already registered
    // SignalR's .on() is idempotent, but we track separately for cleanup
    for (const [eventName, handlers] of this.listeners) {
      for (const handler of handlers) {
        // Remove first to ensure no duplicates
        try {
          this.connection.off(eventName, handler);
        } catch {
          // Ignore errors if handler wasn't registered
        }
        // Then register
        this.connection.on(eventName, handler);
      }
    }
  }

  async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.connection) {
      // Unregister all event handlers to prevent memory leaks
      for (const [eventName, handlers] of this.listeners) {
        for (const handler of handlers) {
          try {
            this.connection.off(eventName, handler);
          } catch {
            // Ignore errors during cleanup
          }
        }
      }

      await this.connection.stop();
      this.connection = null;
      this.connectionPromise = null;
    }

    // FIXED: Week 1 Day 3 - Clear all listeners on disconnect
    this.listeners.clear();
    this.reconnectAttempts = 0;
  }

  // Event listener management
  on(eventName: string, handler: SignalREventHandler): void {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    this.listeners.get(eventName)!.add(handler);

    if (this.connection?.state === 'Connected') {
      this.connection.on(eventName, handler);
    }
  }

  off(eventName: string, handler: SignalREventHandler): void {
    const handlers = this.listeners.get(eventName);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.listeners.delete(eventName);
      }
    }

    if (this.connection?.state === 'Connected') {
      this.connection.off(eventName, handler);
    }
  }

  // Specific preference event handlers
  onPreferenceUpdated(handler: (event: PreferenceUpdateEvent) => void): void {
    this.on('PreferenceUpdated', handler);
  }

  onPreferencesUpdated(handler: (event: PreferencesUpdatedEvent) => void): void {
    this.on('PreferencesUpdated', handler);
  }

  onPreferenceReset(handler: (event: { userId: string; category?: string; timestamp: string }) => void): void {
    this.on('PreferenceReset', handler);
  }

  // Hub methods
  async joinUserGroup(userId: string): Promise<void> {
    if (this.connection?.state === 'Connected') {
      await this.connection.invoke('JoinUserGroup', userId);
    }
  }

  async leaveUserGroup(userId: string): Promise<void> {
    if (this.connection?.state === 'Connected') {
      await this.connection.invoke('LeaveUserGroup', userId);
    }
  }

  async notifyPreferenceChange(category: string, key: string, value: any): Promise<void> {
    if (this.connection?.state === 'Connected') {
      await this.connection.invoke('NotifyPreferenceChange', category, key, value);
    }
  }

  // Connection state
  get isConnected(): boolean {
    return this.connection?.state === 'Connected';
  }

  get connectionState(): string {
    return this.connection?.state || 'Disconnected';
  }
}

// Singleton instance
export const signalRPreferencesClient = new SignalRPreferencesClient();
