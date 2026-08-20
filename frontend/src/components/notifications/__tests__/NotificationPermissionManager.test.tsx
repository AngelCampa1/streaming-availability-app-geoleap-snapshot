import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationPermissionManager } from '../NotificationPermissionManager';

// Mock Notification API
const mockRequestPermission = jest.fn();
const MockNotificationConstructor = jest.fn();

// Create a proper Notification constructor mock
class NotificationMock {
  static permission: NotificationPermission = 'default';
  static requestPermission = mockRequestPermission;

  constructor(public title: string, public options?: NotificationOptions) {
    MockNotificationConstructor(title, options);
  }
}

Object.defineProperty(global, 'Notification', {
  writable: true,
  configurable: true,
  value: NotificationMock,
});

// Mock navigator.permissions
const mockPermissionsQuery = jest.fn();
Object.defineProperty(navigator, 'permissions', {
  writable: true,
  configurable: true,
  value: {
    query: mockPermissionsQuery,
  },
});

// Mock PushManager
Object.defineProperty(global.window, 'PushManager', {
  writable: true,
  configurable: true,
  value: {},
});

// Mock serviceWorker
Object.defineProperty(navigator, 'serviceWorker', {
  writable: true,
  configurable: true,
  value: {},
});

// Mock alert
global.alert = jest.fn();

describe('NotificationPermissionManager', () => {
  const mockOnPermissionChange = jest.fn();
  const originalUserAgent = navigator.userAgent;

  beforeEach(() => {
    jest.clearAllMocks();
    NotificationMock.permission = 'default';
    mockRequestPermission.mockResolvedValue('granted');
    mockPermissionsQuery.mockResolvedValue({ state: 'prompt' });
  });

  afterEach(() => {
    // Restore original userAgent
    Object.defineProperty(navigator, 'userAgent', {
      value: originalUserAgent,
      configurable: true,
    });
  });

  describe('Rendering & Basic Functionality', () => {
    it('renders without crashing', () => {
      expect(() => {
        render(<NotificationPermissionManager />);
      }).not.toThrow();
    });

    it('displays permission manager title', async () => {
      render(<NotificationPermissionManager />);

      await waitFor(() => {
        expect(screen.getByText('Permission Manager')).toBeInTheDocument();
      });
    });

    it('displays description text', async () => {
      render(<NotificationPermissionManager />);

      await waitFor(() => {
        expect(screen.getByText('Manage browser permissions for notifications')).toBeInTheDocument();
      });
    });

    it('displays refresh button', async () => {
      render(<NotificationPermissionManager />);

      await waitFor(() => {
        expect(screen.getByText('Refresh')).toBeInTheDocument();
      });
    });
  });

  describe('Browser Detection', () => {
    it('detects Chrome browser', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        configurable: true,
      });

      render(<NotificationPermissionManager />);

      await waitFor(() => {
        expect(screen.getByText('Chrome')).toBeInTheDocument();
      });
    });

    it('detects Firefox browser', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
        configurable: true,
      });

      render(<NotificationPermissionManager />);

      await waitFor(() => {
        expect(screen.getByText('Firefox')).toBeInTheDocument();
      });
    });

    it('detects Safari browser', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
        configurable: true,
      });

      render(<NotificationPermissionManager />);

      await waitFor(() => {
        expect(screen.getByText('Safari')).toBeInTheDocument();
      });
    });

    it('detects Edge browser', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
        configurable: true,
      });

      render(<NotificationPermissionManager />);

      await waitFor(() => {
        expect(screen.getByText('Edge')).toBeInTheDocument();
      });
    });

    it('detects Windows OS', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        configurable: true,
      });

      render(<NotificationPermissionManager />);

      await waitFor(() => {
        expect(screen.getByText('Windows')).toBeInTheDocument();
      });
    });

    it('detects macOS', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        configurable: true,
      });

      render(<NotificationPermissionManager />);

      await waitFor(() => {
        expect(screen.getByText('macOS')).toBeInTheDocument();
      });
    });

    it('detects mobile device', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
        configurable: true,
      });

      render(<NotificationPermissionManager />);

      await waitFor(() => {
        expect(screen.getByText('Mobile')).toBeInTheDocument();
      });
    });

    it('detects desktop device', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        configurable: true,
      });

      render(<NotificationPermissionManager />);

      await waitFor(() => {
        expect(screen.getByText('Desktop')).toBeInTheDocument();
      });
    });
  });

  describe('Browser Compatibility', () => {
    it('displays browser compatibility section', async () => {
      render(<NotificationPermissionManager />);

      await waitFor(() => {
        expect(screen.getByText('Browser Compatibility')).toBeInTheDocument();
      });
    });

    it('displays compatibility score', async () => {
      render(<NotificationPermissionManager />);

      await waitFor(() => {
        expect(screen.getByText(/\/100 compatibility/)).toBeInTheDocument();
      });
    });

    it('shows fully compatible status when all features supported', async () => {
      render(<NotificationPermissionManager />);

      await waitFor(() => {
        expect(screen.getByText('Fully Compatible')).toBeInTheDocument();
      });
    });

    it('displays feature support progress bar', async () => {
      const { container } = render(<NotificationPermissionManager />);

      await waitFor(() => {
        const progressBar = container.querySelector('[role="progressbar"]');
        expect(progressBar).toBeInTheDocument();
      });
    });
  });

  describe('Permission Status', () => {
    it('displays notification permission section', async () => {
      render(<NotificationPermissionManager />);

      await waitFor(() => {
        expect(screen.getByText('Notification Permission')).toBeInTheDocument();
      });
    });

    it('shows default permission status', async () => {
      NotificationMock.permission = 'default';

      render(<NotificationPermissionManager />);

      await waitFor(() => {
        expect(screen.getByText('Permission Not Requested')).toBeInTheDocument();
      });
    });

    it('shows granted permission status', async () => {
      NotificationMock.permission = 'granted';

      render(<NotificationPermissionManager />);

      await waitFor(() => {
        expect(screen.getByText('Notifications Enabled')).toBeInTheDocument();
        expect(screen.getByText('You will receive all notifications')).toBeInTheDocument();
      });
    });

    it('shows denied permission status', async () => {
      NotificationMock.permission = 'denied';

      render(<NotificationPermissionManager />);

      await waitFor(() => {
        expect(screen.getByText('Notifications Blocked')).toBeInTheDocument();
      });
    });

    it('displays enable notifications button when permission is default', async () => {
      NotificationMock.permission = 'default';

      render(<NotificationPermissionManager />);

      await waitFor(() => {
        expect(screen.getByText('Enable Notifications')).toBeInTheDocument();
      });
    });

    it('does not display enable button when permission is granted', async () => {
      NotificationMock.permission = 'granted';

      render(<NotificationPermissionManager />);

      await waitFor(() => {
        expect(screen.queryByText('Enable Notifications')).not.toBeInTheDocument();
      });
    });

    it('displays request again button when permission is denied', async () => {
      NotificationMock.permission = 'denied';

      render(<NotificationPermissionManager />);

      await waitFor(() => {
        expect(screen.getByText('Request Again')).toBeInTheDocument();
      });
    });
  });

  describe('Permission Request', () => {
    it('requests notification permission when button clicked', async () => {
      const user = userEvent.setup();
      NotificationMock.permission = 'default';

      render(<NotificationPermissionManager onPermissionChange={mockOnPermissionChange} />);

      await waitFor(() => {
        expect(screen.getByText('Enable Notifications')).toBeInTheDocument();
      });

      const enableButton = screen.getByText('Enable Notifications');
      await user.click(enableButton);

      await waitFor(() => {
        expect(mockRequestPermission).toHaveBeenCalled();
      });
    });

    it('calls onPermissionChange callback after permission granted', async () => {
      const user = userEvent.setup();
      NotificationMock.permission = 'default';
      mockRequestPermission.mockResolvedValue('granted');

      render(<NotificationPermissionManager onPermissionChange={mockOnPermissionChange} />);

      await waitFor(() => {
        expect(screen.getByText('Enable Notifications')).toBeInTheDocument();
      });

      const enableButton = screen.getByText('Enable Notifications');
      await user.click(enableButton);

      await waitFor(() => {
        expect(mockOnPermissionChange).toHaveBeenCalledWith('granted');
      });
    });

    it('shows error message when permission is denied', async () => {
      const user = userEvent.setup();
      NotificationMock.permission = 'default';
      mockRequestPermission.mockResolvedValue('denied');

      render(<NotificationPermissionManager />);

      await waitFor(() => {
        expect(screen.getByText('Enable Notifications')).toBeInTheDocument();
      });

      const enableButton = screen.getByText('Enable Notifications');
      await user.click(enableButton);

      await waitFor(() => {
        expect(screen.getByText(/Notification permission was denied/)).toBeInTheDocument();
      });
    });

    it('auto-requests permission when autoRequest is true', async () => {
      NotificationMock.permission = 'default';

      render(<NotificationPermissionManager autoRequest={true} />);

      await waitFor(() => {
        expect(mockRequestPermission).toHaveBeenCalled();
      }, { timeout: 2000 });
    });

    it('handles already granted permission with autoRequest enabled', async () => {
      NotificationMock.permission = 'granted';

      render(<NotificationPermissionManager autoRequest={true} />);

      // Wait for component to check permissions and display granted status
      await waitFor(() => {
        const grantedBadge = screen.queryByText('granted');
        expect(grantedBadge).toBeInTheDocument();
      }, { timeout: 2000 });

      // Component should display granted status correctly
      const enableButton = screen.queryByText('Enable Notifications');
      expect(enableButton).not.toBeInTheDocument();
    });
  });

  describe('Feature Support', () => {
    it('displays basic notifications support status', async () => {
      render(<NotificationPermissionManager />);

      await waitFor(() => {
        expect(screen.getByText('Basic Notifications')).toBeInTheDocument();
        expect(screen.getByText('Supported')).toBeInTheDocument();
      });
    });

    it('displays push messages support status', async () => {
      render(<NotificationPermissionManager />);

      await waitFor(() => {
        const pushText = screen.getAllByText(/Push Messages|Push/i);
        expect(pushText.length).toBeGreaterThan(0);
      });
    });

    it('displays background sync support status', async () => {
      render(<NotificationPermissionManager />);

      await waitFor(() => {
        expect(screen.getByText('Background Sync')).toBeInTheDocument();
      });
    });
  });

  describe('Permission Denied Help', () => {
    it('shows help alert when permission is denied', async () => {
      NotificationMock.permission = 'denied';

      render(<NotificationPermissionManager />);

      await waitFor(() => {
        const blockedTexts = screen.getAllByText(/currently blocked/i);
        expect(blockedTexts.length).toBeGreaterThan(0);
      });
    });

    it('displays view instructions button when denied', async () => {
      NotificationMock.permission = 'denied';

      render(<NotificationPermissionManager />);

      await waitFor(() => {
        expect(screen.getByText('View Instructions')).toBeInTheDocument();
      });
    });

    it('shows browser-specific instructions when instructions button clicked', async () => {
      const user = userEvent.setup();
      NotificationMock.permission = 'denied';

      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        configurable: true,
      });

      render(<NotificationPermissionManager />);

      await waitFor(() => {
        expect(screen.getByText('View Instructions')).toBeInTheDocument();
      });

      const instructionsButton = screen.getByText('View Instructions');
      await user.click(instructionsButton);

      expect(global.alert).toHaveBeenCalledWith(expect.stringContaining('Chrome'));
    });

    it('does not show help alert when permission is granted', async () => {
      NotificationMock.permission = 'granted';

      render(<NotificationPermissionManager />);

      await waitFor(() => {
        expect(screen.queryByText(/currently blocked/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Advanced Information', () => {
    it('displays advanced information section when showAdvancedInfo is true', async () => {
      render(<NotificationPermissionManager showAdvancedInfo={true} />);

      await waitFor(() => {
        expect(screen.getByText('Advanced Information')).toBeInTheDocument();
      });
    });

    it('does not display advanced information when showAdvancedInfo is false', async () => {
      render(<NotificationPermissionManager showAdvancedInfo={false} />);

      await waitFor(() => {
        // Wait for component to render
        expect(screen.getByText('Permission Manager')).toBeInTheDocument();
      });

      expect(screen.queryByText('Advanced Information')).not.toBeInTheDocument();
    });

    it('displays browser features in advanced section', async () => {
      render(<NotificationPermissionManager showAdvancedInfo={true} />);

      await waitFor(() => {
        expect(screen.getByText('Browser Features')).toBeInTheDocument();
        expect(screen.getByText('Notifications API')).toBeInTheDocument();
        expect(screen.getByText('Push Manager')).toBeInTheDocument();
        expect(screen.getByText('Service Worker')).toBeInTheDocument();
      });
    });

    it('displays permission status in advanced section', async () => {
      render(<NotificationPermissionManager showAdvancedInfo={true} />);

      await waitFor(() => {
        expect(screen.getByText('Permission Status')).toBeInTheDocument();
      });
    });

    it('shows iOS-specific notes for iOS devices', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        configurable: true,
      });

      render(<NotificationPermissionManager showAdvancedInfo={true} />);

      await waitFor(() => {
        // iOS-specific note mentions iOS 16.4+
        const element = screen.getByText(/iOS 16\.4\+/);
        expect(element).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('shows Safari-specific notes for Safari browser', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
        configurable: true,
      });

      render(<NotificationPermissionManager showAdvancedInfo={true} />);

      await waitFor(() => {
        expect(screen.getByText(/Safari:/)).toBeInTheDocument();
      });
    });

    it('shows Firefox-specific notes for Firefox browser', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
        configurable: true,
      });

      render(<NotificationPermissionManager showAdvancedInfo={true} />);

      await waitFor(() => {
        expect(screen.getByText(/Firefox:/)).toBeInTheDocument();
      });
    });
  });

  describe('Refresh Functionality', () => {
    it('refreshes permissions when refresh button clicked', async () => {
      const user = userEvent.setup();
      render(<NotificationPermissionManager onPermissionChange={mockOnPermissionChange} />);

      await waitFor(() => {
        expect(screen.getByText('Refresh')).toBeInTheDocument();
      });

      const refreshButton = screen.getByText('Refresh');
      await user.click(refreshButton);

      // Should call onPermissionChange during refresh
      await waitFor(() => {
        expect(mockOnPermissionChange).toHaveBeenCalled();
      });
    });

    it('displays refresh button', async () => {
      render(<NotificationPermissionManager />);

      await waitFor(() => {
        expect(screen.getByText('Refresh')).toBeInTheDocument();
      });

      const refreshButton = screen.getByText('Refresh').closest('button');
      expect(refreshButton).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('displays error alert when permission check fails', async () => {
      // Mock console.error to suppress expected error
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Make Notification.permission throw an error
      Object.defineProperty(NotificationMock, 'permission', {
        get: () => {
          throw new Error('Permission check failed');
        },
        configurable: true,
      });

      render(<NotificationPermissionManager />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to check browser permissions/)).toBeInTheDocument();
      });

      consoleErrorSpy.mockRestore();

      // Restore normal permission behavior
      Object.defineProperty(NotificationMock, 'permission', {
        value: 'default',
        writable: true,
        configurable: true,
      });
    });

    it('handles permission request error gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const user = userEvent.setup();

      NotificationMock.permission = 'default';
      mockRequestPermission.mockRejectedValue(new Error('Request failed'));

      render(<NotificationPermissionManager />);

      await waitFor(() => {
        expect(screen.getByText('Enable Notifications')).toBeInTheDocument();
      });

      const enableButton = screen.getByText('Enable Notifications');
      await user.click(enableButton);

      await waitFor(() => {
        expect(screen.getByText(/Failed to request notification permission/)).toBeInTheDocument();
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Additional Permissions', () => {
    it('checks geolocation permission if supported', async () => {
      mockPermissionsQuery.mockResolvedValue({ state: 'granted' });

      render(<NotificationPermissionManager />);

      await waitFor(() => {
        expect(mockPermissionsQuery).toHaveBeenCalledWith({ name: 'geolocation' });
      });
    });

    it('handles unsupported permission queries gracefully', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      mockPermissionsQuery.mockRejectedValue(new Error('Not supported'));

      render(<NotificationPermissionManager />);

      await waitFor(() => {
        expect(screen.getByText('Permission Manager')).toBeInTheDocument();
      });

      consoleWarnSpy.mockRestore();
    });
  });
});
