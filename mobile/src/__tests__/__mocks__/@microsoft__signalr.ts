/**
 * Mock implementation of @microsoft/signalr for testing
 *
 * This mock provides a test-friendly implementation of SignalR's HubConnection
 * that allows tests to simulate connection events, trigger server-to-client
 * method calls, and verify handler cleanup.
 */

type EventHandler = (...args: any[]) => void;

interface ConnectionHandlers {
  onreconnecting?: (error?: Error) => void;
  onreconnected?: (connectionId?: string) => void;
  onclose?: (error?: Error) => void;
}

class MockHubConnection {
  private handlers = new Map<string, EventHandler>();
  private connectionHandlers: ConnectionHandlers = {};
  public state: string = 'Disconnected';

  // Mock methods
  start = jest.fn(() => {
    this.state = 'Connected';
    return Promise.resolve();
  });

  stop = jest.fn(() => {
    this.state = 'Disconnected';
    return Promise.resolve();
  });

  send = jest.fn((_methodName: string, ..._args: any[]) => {
    return Promise.resolve();
  });

  invoke = jest.fn((_methodName: string, ..._args: any[]) => {
    return Promise.resolve();
  });

  // Event subscription methods
  on(event: string, handler: EventHandler): void {
    this.handlers.set(event, handler);
  }

  off(event: string, _handler?: EventHandler): void {
    this.handlers.delete(event);
  }

  onreconnecting(callback: (error?: Error) => void): void {
    this.connectionHandlers.onreconnecting = callback;
  }

  onreconnected(callback: (connectionId?: string) => void): void {
    this.connectionHandlers.onreconnected = callback;
  }

  onclose(callback: (error?: Error) => void): void {
    this.connectionHandlers.onclose = callback;
  }

  // Test utilities - not part of actual SignalR API
  __trigger(event: string, ...args: any[]): void {
    const handler = this.handlers.get(event);
    if (handler) {
      handler(...args);
    }
  }

  __triggerReconnecting(error?: Error): void {
    if (this.connectionHandlers.onreconnecting) {
      this.state = 'Reconnecting';
      this.connectionHandlers.onreconnecting(error);
    }
  }

  __triggerReconnected(connectionId?: string): void {
    if (this.connectionHandlers.onreconnected) {
      this.state = 'Connected';
      this.connectionHandlers.onreconnected(connectionId);
    }
  }

  __triggerClose(error?: Error): void {
    if (this.connectionHandlers.onclose) {
      this.state = 'Disconnected';
      this.connectionHandlers.onclose(error);
    }
  }

  __getHandlerCount(): number {
    return this.handlers.size;
  }

  __clearHandlers(): void {
    this.handlers.clear();
    this.connectionHandlers = {};
  }

  __hasHandler(event: string): boolean {
    return this.handlers.has(event);
  }

  __getAllHandlers(): string[] {
    return Array.from(this.handlers.keys());
  }
}

export class HubConnectionBuilder {
  private url: string = '';
  private reconnectDelays: number[] = [];
  private logLevel: number = 0;

  withUrl(url: string, _options?: any): this {
    this.url = url;
    return this;
  }

  withAutomaticReconnect(delays?: number[]): this {
    this.reconnectDelays = delays || [0, 2000, 10000, 30000];
    return this;
  }

  configureLogging(logLevel: number): this {
    this.logLevel = logLevel;
    return this;
  }

  build(): MockHubConnection {
    const connection = new MockHubConnection();

    // Store configuration for debugging if needed
    (connection as any).__url = this.url;
    (connection as any).__reconnectDelays = this.reconnectDelays;
    (connection as any).__logLevel = this.logLevel;

    return connection;
  }
}

// Enum exports
export enum HttpTransportType {
  None = 0,
  WebSockets = 1,
  ServerSentEvents = 2,
  LongPolling = 4,
}

export enum LogLevel {
  Trace = 0,
  Debug = 1,
  Information = 2,
  Warning = 3,
  Error = 4,
  Critical = 5,
  None = 6,
}

export enum HubConnectionState {
  Disconnected = 'Disconnected',
  Connecting = 'Connecting',
  Connected = 'Connected',
  Disconnecting = 'Disconnecting',
  Reconnecting = 'Reconnecting',
}

// Default export for convenience
export default {
  HubConnectionBuilder,
  HttpTransportType,
  LogLevel,
  HubConnectionState,
};
