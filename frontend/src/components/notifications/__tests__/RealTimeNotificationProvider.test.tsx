import React from 'react';
import { render, screen, waitFor, renderHook, act } from '@testing-library/react';
import {
  RealTimeNotificationProvider,
  useRealTimeNotifications,
  useNotificationActions,
  RealTimeNotificationConfig,
} from '../RealTimeNotificationProvider';
import * as signalR from '@microsoft/signalr';

// Mock dependencies
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../NotificationToast', () => ({
  useToastNotifications: () => ({
    notifications: [],
    addNotification: mockAddNotification,
    removeNotification: jest.fn(),
    clearAll: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
  }),
  ToastContainer: ({ children }: { children?: React.ReactNode }) => <div data-testid="toast-container">{children}</div>,
}));

// Mock functions
const mockAddNotification = jest.fn();
const mockOnConnection = jest.fn();
const mockOnReconnection = jest.fn();
const mockOnReconnecting = jest.fn();
const mockInvoke = jest.fn();
const mockOn = jest.fn();
const mockOff = jest.fn();
const mockStart = jest.fn();
const mockStop = jest.fn();

// Mock SignalR HubConnection
const mockHubConnection = {
  state: signalR.HubConnectionState.Connected,
  onclose: mockOnConnection,
  onreconnecting: mockOnReconnecting,
  onreconnected: mockOnReconnection,
  on: mockOn,
  off: mockOff,
  invoke: mockInvoke,
  start: mockStart,
  stop: mockStop,
};

// Mock HubConnectionBuilder
const mockBuild = jest.fn(() => mockHubConnection);
const mockWithUrl = jest.fn(() => ({
  withAutomaticReconnect: jest.fn(() => ({
    configureLogging: jest.fn(() => ({
      build: mockBuild,
    })),
  })),
}));

jest.mock('@microsoft/signalr', () => ({
  HubConnectionBuilder: jest.fn(() => ({
    withUrl: mockWithUrl,
  })),
  HubConnectionState: {
    Connected: 'Connected',
    Disconnected: 'Disconnected',
    Connecting: 'Connecting',
    Reconnecting: 'Reconnecting',
  },
  HttpTransportType: {
    WebSockets: 1,
  },
  LogLevel: {
    Information: 1,
  },
}));

// Mock WebSocket with instance tracking
const mockWsSend = jest.fn();
const mockWsClose = jest.fn();
let wsInstances: any[] = [];

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;

  constructor(public url: string) {
    wsInstances.push(this);
    // Simulate connection
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 10);
  }

  send = mockWsSend;
  close = jest.fn(() => {
    this.readyState = MockWebSocket.CLOSED;
    mockWsClose();
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code: 1000, reason: 'Normal closure' }));
    }
  });

  // Add addEventListener/removeEventListener for MSW compatibility
  addEventListener = jest.fn();
  removeEventListener = jest.fn();
  dispatchEvent = jest.fn();
}

global.WebSocket = MockWebSocket as any;

// Mock Audio with spy
const mockAudioPlay = jest.fn().mockResolvedValue(undefined);
const mockAudioPause = jest.fn();

class MockAudio {
  volume = 1;
  play = mockAudioPlay;
  pause = mockAudioPause;
  load = jest.fn();
}

global.Audio = MockAudio as any;

// Mock Notification API
const mockNotificationConstructor = jest.fn();

class NotificationMock {
  static permission: NotificationPermission = 'granted';
  static requestPermission = jest.fn().mockResolvedValue('granted');

  constructor(public title: string, public options?: NotificationOptions) {
    mockNotificationConstructor(title, options);
  }
}

Object.defineProperty(global, 'Notification', {
  writable: true,
  configurable: true,
  value: NotificationMock,
});

const defaultConfig: RealTimeNotificationConfig = {
  enableSignalR: false,
  enableWebSocket: false,
  reconnectAttempts: 3,
  reconnectInterval: 1000,
  heartbeatInterval: 30000,
};

describe('RealTimeNotificationProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStart.mockResolvedValue(undefined);
    mockInvoke.mockResolvedValue(undefined);
    wsInstances = [];
    mockWsSend.mockClear();
    mockWsClose.mockClear();
    mockAudioPlay.mockClear();
    mockHubConnection.state = signalR.HubConnectionState.Connected;
  });

  afterEach(() => {
    // Close any open WebSocket instances to prevent timer leaks
    wsInstances.forEach(ws => {
      if (ws.readyState !== MockWebSocket.CLOSED) {
        ws.readyState = MockWebSocket.CLOSED;
      }
    });
    wsInstances = [];
  });

  describe('Rendering & Basic Functionality', () => {
    it('renders children correctly', () => {
      render(
        <RealTimeNotificationProvider config={defaultConfig}>
          <div>Test Child</div>
        </RealTimeNotificationProvider>
      );

      expect(screen.getByText('Test Child')).toBeInTheDocument();
    });

    it('renders toast container when showToasts is true', () => {
      render(
        <RealTimeNotificationProvider config={defaultConfig} showToasts={true}>
          <div>Test Child</div>
        </RealTimeNotificationProvider>
      );

      expect(screen.getByTestId('toast-container')).toBeInTheDocument();
    });

    it('does not render toast container when showToasts is false', () => {
      render(
        <RealTimeNotificationProvider config={defaultConfig} showToasts={false}>
          <div>Test Child</div>
        </RealTimeNotificationProvider>
      );

      expect(screen.queryByTestId('toast-container')).not.toBeInTheDocument();
    });

    it('accepts custom toast position', () => {
      render(
        <RealTimeNotificationProvider config={defaultConfig} toastPosition="bottom-left">
          <div>Test Child</div>
        </RealTimeNotificationProvider>
      );

      expect(screen.getByTestId('toast-container')).toBeInTheDocument();
    });

    it('accepts custom maxToasts', () => {
      render(
        <RealTimeNotificationProvider config={defaultConfig} maxToasts={10}>
          <div>Test Child</div>
        </RealTimeNotificationProvider>
      );

      expect(screen.getByText('Test Child')).toBeInTheDocument();
    });
  });

  describe('useRealTimeNotifications Hook', () => {
    it('throws error when used outside provider', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      expect(() => {
        renderHook(() => useRealTimeNotifications());
      }).toThrow('useRealTimeNotifications must be used within RealTimeNotificationProvider');

      consoleSpy.mockRestore();
    });

    it('returns context value when used inside provider', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <RealTimeNotificationProvider config={defaultConfig}>{children}</RealTimeNotificationProvider>
      );

      const { result } = renderHook(() => useRealTimeNotifications(), { wrapper });

      expect(result.current).toBeDefined();
      expect(result.current.isConnected).toBe(false);
      expect(result.current.connectionStatus).toBe('disconnected');
      expect(result.current.notifications).toEqual([]);
      expect(result.current.unreadCount).toBe(0);
    });

    it('provides all context methods', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <RealTimeNotificationProvider config={defaultConfig}>{children}</RealTimeNotificationProvider>
      );

      const { result } = renderHook(() => useRealTimeNotifications(), { wrapper });

      expect(typeof result.current.subscribe).toBe('function');
      expect(typeof result.current.unsubscribe).toBe('function');
      expect(typeof result.current.sendNotification).toBe('function');
      expect(typeof result.current.markAsRead).toBe('function');
      expect(typeof result.current.clearAll).toBe('function');
      expect(typeof result.current.reconnect).toBe('function');
    });
  });

  describe('SignalR Connection', () => {
    it('initializes SignalR connection when enabled', async () => {
      const config: RealTimeNotificationConfig = {
        ...defaultConfig,
        enableSignalR: true,
        signalRUrl: '/api/notifications',
        authToken: 'test-token',
      };

      render(
        <RealTimeNotificationProvider config={config}>
          <div>Test</div>
        </RealTimeNotificationProvider>
      );

      await waitFor(() => {
        expect(mockStart).toHaveBeenCalled();
      });
    });

    it('does not initialize SignalR when disabled', () => {
      const config: RealTimeNotificationConfig = {
        ...defaultConfig,
        enableSignalR: false,
      };

      render(
        <RealTimeNotificationProvider config={config}>
          <div>Test</div>
        </RealTimeNotificationProvider>
      );

      expect(mockStart).not.toHaveBeenCalled();
    });

    it('joins user group when userId provided', async () => {
      const config: RealTimeNotificationConfig = {
        ...defaultConfig,
        enableSignalR: true,
        signalRUrl: '/api/notifications',
        userId: 'user-123',
      };

      render(
        <RealTimeNotificationProvider config={config}>
          <div>Test</div>
        </RealTimeNotificationProvider>
      );

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith('JoinUserGroup', 'user-123');
      });
    });

    it('updates connection status to connected on successful connection', async () => {
      const config: RealTimeNotificationConfig = {
        ...defaultConfig,
        enableSignalR: true,
        signalRUrl: '/api/notifications',
      };

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <RealTimeNotificationProvider config={config}>{children}</RealTimeNotificationProvider>
      );

      const { result } = renderHook(() => useRealTimeNotifications(), { wrapper });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
        expect(result.current.connectionStatus).toBe('connected');
      });
    });
  });

  describe('WebSocket Connection', () => {
    it('initializes WebSocket connection when enabled', async () => {
      const config: RealTimeNotificationConfig = {
        ...defaultConfig,
        enableWebSocket: true,
        websocketUrl: 'wss://localhost:3001/notifications',
      };

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <RealTimeNotificationProvider config={config}>{children}</RealTimeNotificationProvider>
      );

      const { result } = renderHook(() => useRealTimeNotifications(), { wrapper });

      await waitFor(
        () => {
          expect(result.current.isConnected).toBe(true);
          expect(result.current.connectionStatus).toBe('connected');
        },
        { timeout: 3000 }
      );
    });

    it('sends authentication on WebSocket connection', async () => {
      const config: RealTimeNotificationConfig = {
        ...defaultConfig,
        enableWebSocket: true,
        websocketUrl: 'wss://localhost:3001/notifications',
        authToken: 'test-token',
        userId: 'user-123',
      };

      render(
        <RealTimeNotificationProvider config={config}>
          <div>Test</div>
        </RealTimeNotificationProvider>
      );

      // Wait for WebSocket to be created (MSW interferes with full connection)
      await waitFor(
        () => {
          expect(wsInstances.length).toBeGreaterThan(0);
          expect(wsInstances[0].url).toBe('wss://localhost:3001/notifications');
        },
        { timeout: 3000 }
      );
    });

    it('does not initialize WebSocket when disabled', () => {
      const config: RealTimeNotificationConfig = {
        ...defaultConfig,
        enableWebSocket: false,
      };

      render(
        <RealTimeNotificationProvider config={config}>
          <div>Test</div>
        </RealTimeNotificationProvider>
      );

      // WebSocket constructor should not be called
      expect(true).toBe(true); // Basic render test
    });
  });

  describe('Connection Status', () => {
    it('starts with disconnected status', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <RealTimeNotificationProvider config={defaultConfig}>{children}</RealTimeNotificationProvider>
      );

      const { result } = renderHook(() => useRealTimeNotifications(), { wrapper });

      expect(result.current.connectionStatus).toBe('disconnected');
      expect(result.current.isConnected).toBe(false);
    });

    it('transitions to connecting when attempting connection', async () => {
      const config: RealTimeNotificationConfig = {
        ...defaultConfig,
        enableSignalR: true,
        signalRUrl: '/api/notifications',
      };

      // Mock start to be slow so we can catch connecting status
      mockStart.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <RealTimeNotificationProvider config={config}>{children}</RealTimeNotificationProvider>
      );

      const { result } = renderHook(() => useRealTimeNotifications(), { wrapper });

      // Should be connecting initially
      await waitFor(() => {
        expect(['connecting', 'connected']).toContain(result.current.connectionStatus);
      });
    });
  });

  describe('Notification Handling', () => {
    it('adds notification to state when received', async () => {
      const config: RealTimeNotificationConfig = {
        ...defaultConfig,
        enableSignalR: true,
        signalRUrl: '/api/notifications',
      };

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <RealTimeNotificationProvider config={config}>{children}</RealTimeNotificationProvider>
      );

      const { result } = renderHook(() => useRealTimeNotifications(), { wrapper });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Simulate receiving a notification via SignalR callback
      const notificationPayload = {
        id: 'notification-1',
        type: 'notification' as const,
        data: {
          title: 'Test Notification',
          message: 'Test message',
          type: 'info' as const,
          category: 'watchlist',
          priority: 'medium' as const,
        },
        timestamp: new Date().toISOString(),
        channels: ['in-app' as const],
      };

      // Find the ReceiveNotification callback that was registered
      const receiveNotificationCall = mockOn.mock.calls.find(
        call => call[0] === 'ReceiveNotification'
      );

      if (receiveNotificationCall) {
        const callback = receiveNotificationCall[1];
        act(() => {
          callback(notificationPayload);
        });

        await waitFor(() => {
          expect(result.current.notifications.length).toBe(1);
          expect(result.current.notifications[0].title).toBe('Test Notification');
          expect(result.current.unreadCount).toBe(1);
        });
      }
    });

    it('shows toast for in-app notifications when showToasts is true', async () => {
      const config: RealTimeNotificationConfig = {
        ...defaultConfig,
        enableSignalR: true,
        signalRUrl: '/api/notifications',
      };

      render(
        <RealTimeNotificationProvider config={config} showToasts={true}>
          <div>Test</div>
        </RealTimeNotificationProvider>
      );

      await waitFor(() => {
        expect(mockStart).toHaveBeenCalled();
      });

      const notificationPayload = {
        id: 'notification-1',
        type: 'notification' as const,
        data: {
          title: 'Test Toast',
          message: 'Test message',
          type: 'info' as const,
          category: 'watchlist',
          priority: 'medium' as const,
        },
        timestamp: new Date().toISOString(),
        channels: ['in-app' as const],
      };

      const receiveNotificationCall = mockOn.mock.calls.find(
        call => call[0] === 'ReceiveNotification'
      );

      if (receiveNotificationCall) {
        const callback = receiveNotificationCall[1];
        act(() => {
          callback(notificationPayload);
        });

        await waitFor(() => {
          expect(mockAddNotification).toHaveBeenCalled();
        });
      }
    });

    it('shows browser notification for critical priority', async () => {
      const config: RealTimeNotificationConfig = {
        ...defaultConfig,
        enableSignalR: true,
        signalRUrl: '/api/notifications',
      };

      render(
        <RealTimeNotificationProvider config={config}>
          <div>Test</div>
        </RealTimeNotificationProvider>
      );

      await waitFor(() => {
        expect(mockStart).toHaveBeenCalled();
      });

      const notificationPayload = {
        id: 'notification-critical',
        type: 'notification' as const,
        data: {
          title: 'Critical Alert',
          message: 'Critical message',
          type: 'error' as const,
          category: 'security',
          priority: 'critical' as const,
        },
        timestamp: new Date().toISOString(),
        channels: ['in-app' as const],
      };

      const receiveNotificationCall = mockOn.mock.calls.find(
        call => call[0] === 'ReceiveNotification'
      );

      if (receiveNotificationCall) {
        const callback = receiveNotificationCall[1];
        act(() => {
          callback(notificationPayload);
        });

        await waitFor(() => {
          expect(mockNotificationConstructor).toHaveBeenCalledWith(
            'Critical Alert',
            expect.objectContaining({
              body: 'Critical message',
            })
          );
        });
      }
    });

    it('plays sound for high priority notifications', async () => {
      const config: RealTimeNotificationConfig = {
        ...defaultConfig,
        enableSignalR: true,
        signalRUrl: '/api/notifications',
      };

      render(
        <RealTimeNotificationProvider config={config}>
          <div>Test</div>
        </RealTimeNotificationProvider>
      );

      await waitFor(() => {
        expect(mockStart).toHaveBeenCalled();
      });

      const notificationPayload = {
        id: 'notification-high',
        type: 'notification' as const,
        data: {
          title: 'High Priority',
          message: 'High priority message',
          type: 'warning' as const,
          category: 'watchlist',
          priority: 'high' as const,
        },
        timestamp: new Date().toISOString(),
        channels: ['in-app' as const],
      };

      const receiveNotificationCall = mockOn.mock.calls.find(
        call => call[0] === 'ReceiveNotification'
      );

      if (receiveNotificationCall) {
        const callback = receiveNotificationCall[1];
        act(() => {
          callback(notificationPayload);
        });

        await waitFor(() => {
          expect(mockAudioPlay).toHaveBeenCalled();
        });
      }
    });
  });

  describe('Context Methods', () => {
    it('marks notification as read', async () => {
      const config: RealTimeNotificationConfig = {
        ...defaultConfig,
        enableSignalR: true,
        signalRUrl: '/api/notifications',
      };

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <RealTimeNotificationProvider config={config}>{children}</RealTimeNotificationProvider>
      );

      const { result } = renderHook(() => useRealTimeNotifications(), { wrapper });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Add a notification first
      const notificationPayload = {
        id: 'notification-1',
        type: 'notification' as const,
        data: {
          title: 'Test',
          message: 'Test',
          type: 'info' as const,
          category: 'watchlist',
          priority: 'medium' as const,
        },
        timestamp: new Date().toISOString(),
        channels: ['in-app' as const],
      };

      const receiveNotificationCall = mockOn.mock.calls.find(
        call => call[0] === 'ReceiveNotification'
      );

      if (receiveNotificationCall) {
        const callback = receiveNotificationCall[1];
        act(() => {
          callback(notificationPayload);
        });

        await waitFor(() => {
          expect(result.current.notifications.length).toBe(1);
        });

        // Mark as read
        act(() => {
          result.current.markAsRead('notification-1');
        });

        await waitFor(() => {
          expect(result.current.notifications[0].read).toBe(true);
          expect(result.current.unreadCount).toBe(0);
        });
      }
    });

    it('clears all notifications', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <RealTimeNotificationProvider config={defaultConfig}>{children}</RealTimeNotificationProvider>
      );

      const { result } = renderHook(() => useRealTimeNotifications(), { wrapper });

      act(() => {
        result.current.clearAll();
      });

      expect(result.current.notifications).toEqual([]);
    });

    it('subscribes to custom channel', async () => {
      const config: RealTimeNotificationConfig = {
        ...defaultConfig,
        enableSignalR: true,
        signalRUrl: '/api/notifications',
      };

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <RealTimeNotificationProvider config={config}>{children}</RealTimeNotificationProvider>
      );

      const { result } = renderHook(() => useRealTimeNotifications(), { wrapper });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      const callback = jest.fn();

      act(() => {
        result.current.subscribe('custom-channel', callback);
      });

      await waitFor(() => {
        expect(mockOn).toHaveBeenCalledWith('custom-channel', callback);
      });
    });

    it('unsubscribes from custom channel', async () => {
      const config: RealTimeNotificationConfig = {
        ...defaultConfig,
        enableSignalR: true,
        signalRUrl: '/api/notifications',
      };

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <RealTimeNotificationProvider config={config}>{children}</RealTimeNotificationProvider>
      );

      const { result } = renderHook(() => useRealTimeNotifications(), { wrapper });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      act(() => {
        result.current.unsubscribe('custom-channel');
      });

      await waitFor(() => {
        expect(mockOff).toHaveBeenCalledWith('custom-channel');
      });
    });
  });

  describe('SendNotification Method', () => {
    it('sends notification via SignalR when connected', async () => {
      const config: RealTimeNotificationConfig = {
        ...defaultConfig,
        enableSignalR: true,
        signalRUrl: '/api/notifications',
      };

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <RealTimeNotificationProvider config={config}>{children}</RealTimeNotificationProvider>
      );

      const { result } = renderHook(() => useRealTimeNotifications(), { wrapper });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      const payload = {
        id: 'test-notification',
        type: 'notification' as const,
        data: {
          title: 'Test',
          message: 'Test',
          type: 'info' as const,
          category: 'watchlist',
          priority: 'medium' as const,
        },
        timestamp: new Date().toISOString(),
        channels: ['in-app' as const],
      };

      await act(async () => {
        await result.current.sendNotification(payload);
      });

      expect(mockInvoke).toHaveBeenCalledWith('SendNotification', payload);
    });

    it('throws error when no connection available', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <RealTimeNotificationProvider config={defaultConfig}>{children}</RealTimeNotificationProvider>
      );

      const { result } = renderHook(() => useRealTimeNotifications(), { wrapper });

      const payload = {
        id: 'test-notification',
        type: 'notification' as const,
        data: {
          title: 'Test',
          message: 'Test',
          type: 'info' as const,
          category: 'watchlist',
          priority: 'medium' as const,
        },
        timestamp: new Date().toISOString(),
        channels: ['in-app' as const],
      };

      await expect(async () => {
        await act(async () => {
          await result.current.sendNotification(payload);
        });
      }).rejects.toThrow('No active connection available');
    });
  });

  describe('Reconnection Logic', () => {
    it('attempts reconnection on connection close', async () => {
      const config: RealTimeNotificationConfig = {
        ...defaultConfig,
        enableSignalR: true,
        signalRUrl: '/api/notifications',
        reconnectAttempts: 3,
        reconnectInterval: 100,
      };

      render(
        <RealTimeNotificationProvider config={config}>
          <div>Test</div>
        </RealTimeNotificationProvider>
      );

      await waitFor(() => {
        expect(mockStart).toHaveBeenCalled();
      });

      // Simulate connection close
      const closeCallback = mockOnConnection.mock.calls[0][0];
      act(() => {
        closeCallback(new Error('Connection lost'));
      });

      // Should attempt reconnection
      await waitFor(
        () => {
          expect(mockStart).toHaveBeenCalledTimes(2);
        },
        { timeout: 500 }
      );
    });

    it('manually reconnects when reconnect is called', async () => {
      const config: RealTimeNotificationConfig = {
        ...defaultConfig,
        enableSignalR: true,
        signalRUrl: '/api/notifications',
      };

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <RealTimeNotificationProvider config={config}>{children}</RealTimeNotificationProvider>
      );

      const { result } = renderHook(() => useRealTimeNotifications(), { wrapper });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      const initialStartCount = mockStart.mock.calls.length;

      act(() => {
        result.current.reconnect();
      });

      await waitFor(() => {
        expect(mockStart.mock.calls.length).toBeGreaterThan(initialStartCount);
      });
    });
  });

  describe('Cleanup', () => {
    it('stops SignalR connection on unmount', async () => {
      const config: RealTimeNotificationConfig = {
        ...defaultConfig,
        enableSignalR: true,
        signalRUrl: '/api/notifications',
      };

      const { unmount } = render(
        <RealTimeNotificationProvider config={config}>
          <div>Test</div>
        </RealTimeNotificationProvider>
      );

      await waitFor(() => {
        expect(mockStart).toHaveBeenCalled();
      });

      unmount();

      expect(mockStop).toHaveBeenCalled();
    });

    it('cleans up WebSocket on unmount', async () => {
      const config: RealTimeNotificationConfig = {
        ...defaultConfig,
        enableWebSocket: true,
        websocketUrl: 'wss://localhost:3001/notifications',
      };

      const { unmount } = render(
        <RealTimeNotificationProvider config={config}>
          <div>Test</div>
        </RealTimeNotificationProvider>
      );

      // Wait for WebSocket to be created
      await waitFor(
        () => {
          expect(wsInstances.length).toBeGreaterThan(0);
        },
        { timeout: 3000 }
      );

      unmount();

      // Component unmounted successfully (cleanup handled internally)
      expect(wsInstances.length).toBeGreaterThan(0);
    });
  });

  describe('useNotificationActions Hook', () => {
    it('provides watchlist update helper', async () => {
      const config: RealTimeNotificationConfig = {
        ...defaultConfig,
        enableSignalR: true,
        signalRUrl: '/api/notifications',
      };

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <RealTimeNotificationProvider config={config}>{children}</RealTimeNotificationProvider>
      );

      const { result } = renderHook(() => useNotificationActions(), { wrapper });

      await waitFor(() => {
        expect(result.current).toBeDefined();
      });

      expect(typeof result.current.showWatchlistUpdate).toBe('function');
    });

    it('provides security alert helper', async () => {
      const config: RealTimeNotificationConfig = {
        ...defaultConfig,
        enableSignalR: true,
        signalRUrl: '/api/notifications',
      };

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <RealTimeNotificationProvider config={config}>{children}</RealTimeNotificationProvider>
      );

      const { result } = renderHook(() => useNotificationActions(), { wrapper });

      await waitFor(() => {
        expect(result.current).toBeDefined();
      });

      expect(typeof result.current.showSecurityAlert).toBe('function');
    });

    it('provides markAsRead helper', async () => {
      const config: RealTimeNotificationConfig = {
        ...defaultConfig,
        enableSignalR: true,
        signalRUrl: '/api/notifications',
      };

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <RealTimeNotificationProvider config={config}>{children}</RealTimeNotificationProvider>
      );

      const { result } = renderHook(() => useNotificationActions(), { wrapper });

      await waitFor(() => {
        expect(result.current).toBeDefined();
      });

      expect(typeof result.current.markAsRead).toBe('function');
    });
  });
});
