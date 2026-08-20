/**
 * NotificationToast Component Tests
 *
 * Test coverage for toast notification system with auto-dismiss, positions, and actions.
 * Tests NotificationToast, ToastContainer, and useToastNotifications hook.
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderHook } from '@testing-library/react';
import {
  NotificationToast,
  ToastContainer,
  useToastNotifications,
  type ToastNotification,
} from '../NotificationToast';

// Mock timers for auto-dismiss testing
jest.useFakeTimers();

const mockBaseNotification: ToastNotification = {
  id: 'toast-1',
  title: 'Test Toast',
  message: 'This is a test toast message',
  type: 'info',
  category: 'system',
  priority: 'medium',
  timestamp: new Date('2024-01-15T10:30:00Z'),
};

describe('NotificationToast', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
  });

  describe('Rendering & Basic Functionality', () => {
    it('renders without crashing', () => {
      expect(() => {
        render(<NotificationToast notification={mockBaseNotification} />);
      }).not.toThrow();
    });

    it('displays notification title', () => {
      render(<NotificationToast notification={mockBaseNotification} />);

      expect(screen.getByText('Test Toast')).toBeInTheDocument();
    });

    it('displays notification message', () => {
      render(<NotificationToast notification={mockBaseNotification} />);

      expect(screen.getByText('This is a test toast message')).toBeInTheDocument();
    });

    it('has alert role for accessibility', () => {
      render(<NotificationToast notification={mockBaseNotification} />);

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
    });

    it('uses polite aria-live for non-critical notifications', () => {
      render(<NotificationToast notification={mockBaseNotification} />);

      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-live', 'polite');
    });

    it('uses assertive aria-live for critical notifications', () => {
      const criticalNotification = { ...mockBaseNotification, priority: 'critical' as const };

      render(<NotificationToast notification={criticalNotification} />);

      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-live', 'assertive');
    });

    it('applies custom maxWidth', () => {
      const { container } = render(<NotificationToast notification={mockBaseNotification} maxWidth={500} />);

      const toast = container.firstChild as HTMLElement;
      expect(toast).toHaveStyle({ maxWidth: '500px' });
    });
  });

  describe('Notification Types & Icons', () => {
    it('displays success icon for success type', () => {
      const successNotification = { ...mockBaseNotification, type: 'success' as const };

      render(<NotificationToast notification={successNotification} />);

      const icon = document.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('displays warning icon for warning type', () => {
      const warningNotification = { ...mockBaseNotification, type: 'warning' as const };

      render(<NotificationToast notification={warningNotification} />);

      const icon = document.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('displays error icon for error type', () => {
      const errorNotification = { ...mockBaseNotification, type: 'error' as const };

      render(<NotificationToast notification={errorNotification} />);

      const icon = document.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('displays info icon for info type', () => {
      const infoNotification = { ...mockBaseNotification, type: 'info' as const };

      render(<NotificationToast notification={infoNotification} />);

      const icon = document.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Priority Handling', () => {
    it('displays critical badge for critical priority', () => {
      const criticalNotification = { ...mockBaseNotification, priority: 'critical' as const };

      render(<NotificationToast notification={criticalNotification} />);

      expect(screen.getByText('Critical')).toBeInTheDocument();
    });

    it('does not display badge for non-critical priorities', () => {
      const mediumNotification = { ...mockBaseNotification, priority: 'medium' as const };

      render(<NotificationToast notification={mediumNotification} />);

      expect(screen.queryByText('Critical')).not.toBeInTheDocument();
    });

    it('displays accent bar for critical priority', () => {
      const criticalNotification = { ...mockBaseNotification, priority: 'critical' as const };

      const { container } = render(<NotificationToast notification={criticalNotification} />);

      // Critical notifications have a left accent bar
      const accentBar = container.querySelector('.w-1');
      expect(accentBar).toBeInTheDocument();
    });
  });

  describe('Positions', () => {
    it('applies top-right position classes by default', () => {
      const { container } = render(<NotificationToast notification={mockBaseNotification} />);

      const toast = container.firstChild as HTMLElement;
      expect(toast.className).toContain('top-4');
      expect(toast.className).toContain('right-4');
    });

    it('applies top-left position classes', () => {
      const { container } = render(<NotificationToast notification={mockBaseNotification} position="top-left" />);

      const toast = container.firstChild as HTMLElement;
      expect(toast.className).toContain('top-4');
      expect(toast.className).toContain('left-4');
    });

    it('applies top-center position classes', () => {
      const { container } = render(<NotificationToast notification={mockBaseNotification} position="top-center" />);

      const toast = container.firstChild as HTMLElement;
      expect(toast.className).toContain('top-4');
      expect(toast.className).toContain('left-1/2');
    });

    it('applies bottom-right position classes', () => {
      const { container } = render(<NotificationToast notification={mockBaseNotification} position="bottom-right" />);

      const toast = container.firstChild as HTMLElement;
      expect(toast.className).toContain('bottom-4');
      expect(toast.className).toContain('right-4');
    });

    it('applies bottom-left position classes', () => {
      const { container } = render(<NotificationToast notification={mockBaseNotification} position="bottom-left" />);

      const toast = container.firstChild as HTMLElement;
      expect(toast.className).toContain('bottom-4');
      expect(toast.className).toContain('left-4');
    });

    it('applies bottom-center position classes', () => {
      const { container } = render(<NotificationToast notification={mockBaseNotification} position="bottom-center" />);

      const toast = container.firstChild as HTMLElement;
      expect(toast.className).toContain('bottom-4');
      expect(toast.className).toContain('left-1/2');
    });
  });

  describe('Auto-Dismiss & Progress Bar', () => {
    it('displays progress bar when duration is provided', () => {
      const timedNotification = { ...mockBaseNotification, duration: 3000 };

      const { container } = render(<NotificationToast notification={timedNotification} />);

      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toBeInTheDocument();
    });

    it('does not display progress bar when duration is 0', () => {
      const persistentNotification = { ...mockBaseNotification, duration: 0 };

      const { container } = render(<NotificationToast notification={persistentNotification} />);

      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).not.toBeInTheDocument();
    });

    it('does not display progress bar when duration is not provided', () => {
      const { container } = render(<NotificationToast notification={mockBaseNotification} />);

      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).not.toBeInTheDocument();
    });

    it('calls onDismiss after duration expires', async () => {
      const onDismiss = jest.fn();
      const timedNotification = { ...mockBaseNotification, duration: 1000, onDismiss };

      render(<NotificationToast notification={timedNotification} />);

      // Fast-forward through all animations: 50ms initial + 1000ms duration + 300ms exit
      act(() => {
        jest.advanceTimersByTime(1350);
      });

      await waitFor(() => {
        expect(onDismiss).toHaveBeenCalledWith('toast-1');
      });
    });

    it('progress bar starts at 100%', () => {
      const timedNotification = { ...mockBaseNotification, duration: 3000 };

      const { container } = render(<NotificationToast notification={timedNotification} />);

      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toHaveAttribute('aria-valuenow', '100');
    });
  });

  describe('Manual Dismiss', () => {
    it('displays dismiss button', () => {
      render(<NotificationToast notification={mockBaseNotification} />);

      const dismissButton = screen.getByLabelText('Dismiss notification');
      expect(dismissButton).toBeInTheDocument();
    });

    it('calls onDismiss when dismiss button clicked', async () => {
      const user = userEvent.setup({ delay: null });
      const onDismiss = jest.fn();
      const notification = { ...mockBaseNotification, onDismiss };

      render(<NotificationToast notification={notification} />);

      const dismissButton = screen.getByLabelText('Dismiss notification');
      await user.click(dismissButton);

      // Fast-forward animation time
      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(onDismiss).toHaveBeenCalledWith('toast-1');
    });

    it('has screen reader text for dismiss button', () => {
      render(<NotificationToast notification={mockBaseNotification} />);

      expect(screen.getByText('Dismiss notification')).toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    it('displays action buttons when provided', () => {
      const notificationWithActions = {
        ...mockBaseNotification,
        actions: [
          { id: 'action-1', label: 'View', type: 'primary' as const, action: jest.fn() },
          { id: 'action-2', label: 'Dismiss', type: 'secondary' as const, action: jest.fn() },
        ],
      };

      render(<NotificationToast notification={notificationWithActions} />);

      expect(screen.getByText('View')).toBeInTheDocument();
      expect(screen.getByText('Dismiss')).toBeInTheDocument();
    });

    it('calls onAction when action button clicked', async () => {
      const user = userEvent.setup({ delay: null });
      const mockAction = jest.fn();
      const onAction = jest.fn();

      const notificationWithActions = {
        ...mockBaseNotification,
        actions: [{ id: 'action-1', label: 'Test Action', type: 'primary' as const, action: mockAction }],
        onAction,
      };

      render(<NotificationToast notification={notificationWithActions} />);

      const actionButton = screen.getByText('Test Action');
      await user.click(actionButton);

      expect(onAction).toHaveBeenCalledWith('toast-1', 'action-1');
    });

    it('dismisses toast after action button clicked', async () => {
      const user = userEvent.setup({ delay: null });
      const onDismiss = jest.fn();

      const notificationWithActions = {
        ...mockBaseNotification,
        actions: [{ id: 'action-1', label: 'Test Action', type: 'primary' as const, action: jest.fn() }],
        onDismiss,
      };

      render(<NotificationToast notification={notificationWithActions} />);

      const actionButton = screen.getByText('Test Action');
      await user.click(actionButton);

      // Fast-forward animation time
      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(onDismiss).toHaveBeenCalled();
    });

    it('does not show actions when enableInteraction is false', () => {
      const notificationWithActions = {
        ...mockBaseNotification,
        actions: [{ id: 'action-1', label: 'Hidden Action', type: 'primary' as const, action: jest.fn() }],
      };

      render(<NotificationToast notification={notificationWithActions} enableInteraction={false} />);

      expect(screen.queryByText('Hidden Action')).not.toBeInTheDocument();
    });
  });

  describe('Image Preview', () => {
    it('displays image when imageUrl provided', () => {
      const notificationWithImage = {
        ...mockBaseNotification,
        metadata: { imageUrl: 'https://example.com/image.jpg' },
      };

      render(<NotificationToast notification={notificationWithImage} />);

      const image = screen.getByAltText('Test Toast preview image');
      expect(image).toHaveAttribute('src', 'https://example.com/image.jpg');
    });

    it('uses lazy loading for images', () => {
      const notificationWithImage = {
        ...mockBaseNotification,
        metadata: { imageUrl: 'https://example.com/image.jpg' },
      };

      render(<NotificationToast notification={notificationWithImage} />);

      const image = screen.getByAltText('Test Toast preview image');
      expect(image).toHaveAttribute('loading', 'lazy');
    });

    it('does not display image when imageUrl not provided', () => {
      render(<NotificationToast notification={mockBaseNotification} />);

      expect(screen.queryByAltText(/preview image/)).not.toBeInTheDocument();
    });
  });

  describe('Category Icons', () => {
    it('displays watchlist category icon', () => {
      const watchlistNotification = { ...mockBaseNotification, category: 'watchlist' as const };

      render(<NotificationToast notification={watchlistNotification} />);

      expect(screen.getByText('watchlist')).toBeInTheDocument();
    });

    it('displays security category icon', () => {
      const securityNotification = { ...mockBaseNotification, category: 'security' as const };

      render(<NotificationToast notification={securityNotification} />);

      expect(screen.getByText('security')).toBeInTheDocument();
    });

    it('displays system category by default', () => {
      render(<NotificationToast notification={mockBaseNotification} />);

      expect(screen.getByText('system')).toBeInTheDocument();
    });
  });

  describe('Timestamp Formatting', () => {
    it('displays "Just now" for very recent notifications', () => {
      const recentNotification = {
        ...mockBaseNotification,
        timestamp: new Date(Date.now() - 10000), // 10 seconds ago
      };

      render(<NotificationToast notification={recentNotification} showTimestamp={true} />);

      expect(screen.getByText('Just now')).toBeInTheDocument();
    });

    it('displays minutes for notifications under 1 hour', () => {
      const recentNotification = {
        ...mockBaseNotification,
        timestamp: new Date(Date.now() - 5 * 60000), // 5 minutes ago
      };

      render(<NotificationToast notification={recentNotification} showTimestamp={true} />);

      expect(screen.getByText('5m ago')).toBeInTheDocument();
    });

    it('displays hours for notifications under 24 hours', () => {
      const recentNotification = {
        ...mockBaseNotification,
        timestamp: new Date(Date.now() - 3 * 3600000), // 3 hours ago
      };

      render(<NotificationToast notification={recentNotification} showTimestamp={true} />);

      expect(screen.getByText('3h ago')).toBeInTheDocument();
    });

    it('displays days for older notifications', () => {
      const oldNotification = {
        ...mockBaseNotification,
        timestamp: new Date(Date.now() - 2 * 86400000), // 2 days ago
      };

      render(<NotificationToast notification={oldNotification} showTimestamp={true} />);

      expect(screen.getByText('2d ago')).toBeInTheDocument();
    });

    it('does not display timestamp when showTimestamp is false', () => {
      render(<NotificationToast notification={mockBaseNotification} showTimestamp={false} />);

      expect(screen.queryByText(/ago/)).not.toBeInTheDocument();
      expect(screen.queryByText('Just now')).not.toBeInTheDocument();
    });
  });

  describe('Metadata Source', () => {
    it('displays source when provided', () => {
      const notificationWithSource = {
        ...mockBaseNotification,
        metadata: { source: 'Netflix' },
      };

      render(<NotificationToast notification={notificationWithSource} />);

      expect(screen.getByText('Netflix')).toBeInTheDocument();
    });

    it('does not display source when not provided', () => {
      render(<NotificationToast notification={mockBaseNotification} />);

      // Should only show category, not any source
      const textElements = screen.queryAllByText(/Netflix|Hulu|Disney/);
      expect(textElements).toHaveLength(0);
    });
  });
});

describe('ToastContainer', () => {
  const mockNotifications: ToastNotification[] = [
    { ...mockBaseNotification, id: 'toast-1', title: 'First Toast' },
    { ...mockBaseNotification, id: 'toast-2', title: 'Second Toast' },
    { ...mockBaseNotification, id: 'toast-3', title: 'Third Toast' },
  ];

  describe('Rendering Multiple Toasts', () => {
    it('renders without crashing', () => {
      expect(() => {
        render(<ToastContainer notifications={mockNotifications} />);
      }).not.toThrow();
    });

    it('displays all notifications', () => {
      render(<ToastContainer notifications={mockNotifications} />);

      expect(screen.getByText('First Toast')).toBeInTheDocument();
      expect(screen.getByText('Second Toast')).toBeInTheDocument();
      expect(screen.getByText('Third Toast')).toBeInTheDocument();
    });

    it('renders empty container when no notifications', () => {
      const { container } = render(<ToastContainer notifications={[]} />);

      expect(container.firstChild?.childNodes.length).toBe(1);
    });
  });

  describe('Max Notifications Limit', () => {
    it('respects maxNotifications limit', () => {
      const manyNotifications: ToastNotification[] = Array.from({ length: 10 }, (_, i) => ({
        ...mockBaseNotification,
        id: `toast-${i}`,
        title: `Toast ${i}`,
      }));

      render(<ToastContainer notifications={manyNotifications} maxNotifications={3} />);

      expect(screen.getByText('Toast 0')).toBeInTheDocument();
      expect(screen.getByText('Toast 1')).toBeInTheDocument();
      expect(screen.getByText('Toast 2')).toBeInTheDocument();
      expect(screen.queryByText('Toast 3')).not.toBeInTheDocument();
    });

    it('uses default maxNotifications of 5', () => {
      const manyNotifications: ToastNotification[] = Array.from({ length: 10 }, (_, i) => ({
        ...mockBaseNotification,
        id: `toast-${i}`,
        title: `Toast ${i}`,
      }));

      render(<ToastContainer notifications={manyNotifications} />);

      expect(screen.getByText('Toast 0')).toBeInTheDocument();
      expect(screen.getByText('Toast 4')).toBeInTheDocument();
      expect(screen.queryByText('Toast 5')).not.toBeInTheDocument();
    });
  });

  describe('Positions', () => {
    it('applies top-right position by default', () => {
      const { container } = render(<ToastContainer notifications={mockNotifications} />);

      const containerElement = container.firstChild as HTMLElement;
      expect(containerElement.className).toContain('top-4');
      expect(containerElement.className).toContain('right-4');
    });

    it('applies top-left position', () => {
      const { container } = render(<ToastContainer notifications={mockNotifications} position="top-left" />);

      const containerElement = container.firstChild as HTMLElement;
      expect(containerElement.className).toContain('top-4');
      expect(containerElement.className).toContain('left-4');
    });

    it('applies bottom-right position', () => {
      const { container } = render(<ToastContainer notifications={mockNotifications} position="bottom-right" />);

      const containerElement = container.firstChild as HTMLElement;
      expect(containerElement.className).toContain('bottom-4');
      expect(containerElement.className).toContain('right-4');
    });
  });

  describe('Stack Direction', () => {
    it('uses down stack direction by default', () => {
      const { container } = render(<ToastContainer notifications={mockNotifications} />);

      const stackContainer = container.querySelector('.flex-col');
      expect(stackContainer).toBeInTheDocument();
    });

    it('applies up stack direction when specified', () => {
      const { container } = render(<ToastContainer notifications={mockNotifications} stackDirection="up" />);

      const stackContainer = container.querySelector('.flex-col-reverse');
      expect(stackContainer).toBeInTheDocument();
    });
  });

  describe('Scaling', () => {
    it('applies scaling to stacked notifications', () => {
      const { container } = render(<ToastContainer notifications={mockNotifications} />);

      const toastWrappers = container.querySelectorAll('[style*="transform"]');
      expect(toastWrappers.length).toBeGreaterThan(0);
    });
  });
});

describe('useToastNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  describe('Initial State', () => {
    it('initializes with empty notifications array', () => {
      const { result } = renderHook(() => useToastNotifications());

      expect(result.current.notifications).toEqual([]);
    });

    it('provides all expected functions', () => {
      const { result } = renderHook(() => useToastNotifications());

      expect(typeof result.current.addNotification).toBe('function');
      expect(typeof result.current.removeNotification).toBe('function');
      expect(typeof result.current.clearAll).toBe('function');
      expect(typeof result.current.showSuccess).toBe('function');
      expect(typeof result.current.showError).toBe('function');
      expect(typeof result.current.showWarning).toBe('function');
      expect(typeof result.current.showInfo).toBe('function');
      expect(typeof result.current.showWatchlistUpdate).toBe('function');
    });
  });

  describe('addNotification', () => {
    it('adds notification to the list', () => {
      const { result } = renderHook(() => useToastNotifications());

      act(() => {
        result.current.addNotification({
          title: 'Test',
          message: 'Message',
          type: 'info',
          category: 'system',
          priority: 'medium',
        });
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].title).toBe('Test');
    });

    it('generates unique id for notification', () => {
      const { result } = renderHook(() => useToastNotifications());

      act(() => {
        result.current.addNotification({
          title: 'Test 1',
          message: 'Message',
          type: 'info',
          category: 'system',
          priority: 'medium',
        });
        result.current.addNotification({
          title: 'Test 2',
          message: 'Message',
          type: 'info',
          category: 'system',
          priority: 'medium',
        });
      });

      const ids = result.current.notifications.map(n => n.id);
      expect(new Set(ids).size).toBe(2); // All IDs are unique
    });

    it('sets default duration of 5000ms', () => {
      const { result } = renderHook(() => useToastNotifications());

      act(() => {
        result.current.addNotification({
          title: 'Test',
          message: 'Message',
          type: 'info',
          category: 'system',
          priority: 'medium',
        });
      });

      expect(result.current.notifications[0].duration).toBe(5000);
    });

    it('returns notification id', () => {
      const { result } = renderHook(() => useToastNotifications());

      let id: string = '';
      act(() => {
        id = result.current.addNotification({
          title: 'Test',
          message: 'Message',
          type: 'info',
          category: 'system',
          priority: 'medium',
        });
      });

      expect(id).toBeTruthy();
      expect(result.current.notifications[0].id).toBe(id);
    });
  });

  describe('removeNotification', () => {
    it('removes notification by id', () => {
      const { result } = renderHook(() => useToastNotifications());

      let id: string = '';
      act(() => {
        id = result.current.addNotification({
          title: 'Test',
          message: 'Message',
          type: 'info',
          category: 'system',
          priority: 'medium',
        });
      });

      expect(result.current.notifications).toHaveLength(1);

      act(() => {
        result.current.removeNotification(id);
      });

      expect(result.current.notifications).toHaveLength(0);
    });

    it('does not affect other notifications', () => {
      const { result } = renderHook(() => useToastNotifications());

      let id1: string = '';
      let id2: string = '';

      act(() => {
        id1 = result.current.addNotification({
          title: 'Test 1',
          message: 'Message',
          type: 'info',
          category: 'system',
          priority: 'medium',
        });
        id2 = result.current.addNotification({
          title: 'Test 2',
          message: 'Message',
          type: 'info',
          category: 'system',
          priority: 'medium',
        });
      });

      act(() => {
        result.current.removeNotification(id1);
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].id).toBe(id2);
    });
  });

  describe('clearAll', () => {
    it('removes all notifications', () => {
      const { result } = renderHook(() => useToastNotifications());

      act(() => {
        result.current.addNotification({
          title: 'Test 1',
          message: 'Message',
          type: 'info',
          category: 'system',
          priority: 'medium',
        });
        result.current.addNotification({
          title: 'Test 2',
          message: 'Message',
          type: 'info',
          category: 'system',
          priority: 'medium',
        });
      });

      expect(result.current.notifications).toHaveLength(2);

      act(() => {
        result.current.clearAll();
      });

      expect(result.current.notifications).toHaveLength(0);
    });
  });

  describe('showSuccess', () => {
    it('creates success notification', () => {
      const { result } = renderHook(() => useToastNotifications());

      act(() => {
        result.current.showSuccess('Success', 'Operation completed');
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].type).toBe('success');
      expect(result.current.notifications[0].title).toBe('Success');
      expect(result.current.notifications[0].message).toBe('Operation completed');
    });

    it('uses low priority by default', () => {
      const { result } = renderHook(() => useToastNotifications());

      act(() => {
        result.current.showSuccess('Success', 'Message');
      });

      expect(result.current.notifications[0].priority).toBe('low');
    });
  });

  describe('showError', () => {
    it('creates error notification', () => {
      const { result } = renderHook(() => useToastNotifications());

      act(() => {
        result.current.showError('Error', 'Operation failed');
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].type).toBe('error');
    });

    it('uses high priority by default', () => {
      const { result } = renderHook(() => useToastNotifications());

      act(() => {
        result.current.showError('Error', 'Message');
      });

      expect(result.current.notifications[0].priority).toBe('high');
    });

    it('uses longer duration (8000ms) for errors', () => {
      const { result } = renderHook(() => useToastNotifications());

      act(() => {
        result.current.showError('Error', 'Message');
      });

      expect(result.current.notifications[0].duration).toBe(8000);
    });
  });

  describe('showWarning', () => {
    it('creates warning notification', () => {
      const { result } = renderHook(() => useToastNotifications());

      act(() => {
        result.current.showWarning('Warning', 'Please be careful');
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].type).toBe('warning');
    });

    it('uses medium priority by default', () => {
      const { result } = renderHook(() => useToastNotifications());

      act(() => {
        result.current.showWarning('Warning', 'Message');
      });

      expect(result.current.notifications[0].priority).toBe('medium');
    });
  });

  describe('showInfo', () => {
    it('creates info notification', () => {
      const { result } = renderHook(() => useToastNotifications());

      act(() => {
        result.current.showInfo('Info', 'Just so you know');
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].type).toBe('info');
    });

    it('uses low priority by default', () => {
      const { result } = renderHook(() => useToastNotifications());

      act(() => {
        result.current.showInfo('Info', 'Message');
      });

      expect(result.current.notifications[0].priority).toBe('low');
    });
  });

  describe('showWatchlistUpdate', () => {
    it('creates watchlist notification', () => {
      const { result } = renderHook(() => useToastNotifications());

      act(() => {
        result.current.showWatchlistUpdate('New Episode', 'Season 2 Episode 5 is available');
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].category).toBe('watchlist');
    });

    it('includes default View and Watch Now actions', () => {
      const { result } = renderHook(() => useToastNotifications());

      act(() => {
        result.current.showWatchlistUpdate('New Episode', 'Available now');
      });

      const notification = result.current.notifications[0];
      expect(notification.actions).toHaveLength(2);
      expect(notification.actions?.[0].label).toBe('View');
      expect(notification.actions?.[1].label).toBe('Watch Now');
    });

    it('allows custom actions', () => {
      const { result } = renderHook(() => useToastNotifications());

      const customActions = [{ id: 'custom', label: 'Custom Action', type: 'primary' as const, action: jest.fn() }];

      act(() => {
        result.current.showWatchlistUpdate('Title', 'Message', customActions);
      });

      expect(result.current.notifications[0].actions).toEqual(customActions);
    });
  });
});
