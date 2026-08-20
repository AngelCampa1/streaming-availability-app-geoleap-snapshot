/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationBadge } from '../NotificationBadge';

// Mock the real-time provider
const mockUseRealTimeNotifications: {
  notifications: any[];
  unreadCount: number;
  markAsRead: jest.Mock;
  clearAll: jest.Mock;
  isConnected: boolean;
  connectionStatus: 'connected' | 'disconnected';
} = {
  notifications: [],
  unreadCount: 0,
  markAsRead: jest.fn() as any,
  clearAll: jest.fn() as any,
  isConnected: true,
  connectionStatus: 'connected' as const,
};

jest.mock('../RealTimeNotificationProvider', () => ({
  useRealTimeNotifications: () => mockUseRealTimeNotifications,
}));

const mockNotifications = [
  {
    id: '1',
    title: 'Test Notification',
    message: 'This is a test message',
    type: 'info' as const,
    category: 'watchlist' as const,
    priority: 'medium' as const,
    timestamp: new Date(),
    read: false,
    archived: false,
    starred: false,
    actionable: true,
    actions: [{ id: 'view', label: 'View', type: 'primary' as const }],
  },
];

describe('NotificationBadge', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRealTimeNotifications.notifications = [...mockNotifications];
    mockUseRealTimeNotifications.unreadCount = 1;
  });

  it('renders badge with unread count', () => {
    render(<NotificationBadge />);

    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('does not show badge when no unread notifications', () => {
    mockUseRealTimeNotifications.unreadCount = 0;

    render(<NotificationBadge showBadgeCount={true} />);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('opens popover on click', async () => {
    render(<NotificationBadge />);

    const badgeButton = screen.getByRole('button');
    await user.click(badgeButton);

    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('Test Notification')).toBeInTheDocument();
  });

  it('shows connection status', async () => {
    render(<NotificationBadge />);

    const badgeButton = screen.getByRole('button');
    await user.click(badgeButton);

    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('handles disconnected state', async () => {
    mockUseRealTimeNotifications.isConnected = false;
    mockUseRealTimeNotifications.connectionStatus = 'disconnected';

    render(<NotificationBadge />);

    const badgeButton = screen.getByRole('button');
    await user.click(badgeButton);

    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('renders in compact mode', () => {
    render(<NotificationBadge variant="compact" />);

    // Should render simplified version without popover
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('renders as button variant', () => {
    const mockOnOpenCenter = jest.fn() as any;

    render(<NotificationBadge variant="button" onOpenCenter={mockOnOpenCenter} />);

    const button = screen.getByText('Notifications');
    expect(button).toBeInTheDocument();
  });

  it('handles notification click', async () => {
    render(<NotificationBadge />);

    const badgeButton = screen.getByRole('button');
    await user.click(badgeButton);

    const notification = screen.getByText('Test Notification');
    await user.click(notification);

    expect(mockUseRealTimeNotifications.markAsRead).toHaveBeenCalledWith('1');
  });

  it('handles mark all read', async () => {
    render(<NotificationBadge />);

    const badgeButton = screen.getByRole('button');
    await user.click(badgeButton);

    const markAllReadButton = screen.getByText('Mark all read');
    await user.click(markAllReadButton);

    expect(mockUseRealTimeNotifications.markAsRead).toHaveBeenCalled();
  });

  it('handles clear all', async () => {
    render(<NotificationBadge />);

    const badgeButton = screen.getByRole('button');
    await user.click(badgeButton);

    const clearAllButton = screen.getByText('Clear all');
    await user.click(clearAllButton);

    expect(mockUseRealTimeNotifications.clearAll).toHaveBeenCalled();
  });

  it('shows empty state when no notifications', async () => {
    mockUseRealTimeNotifications.notifications = [];
    mockUseRealTimeNotifications.unreadCount = 0;

    render(<NotificationBadge />);

    const badgeButton = screen.getByRole('button');
    await user.click(badgeButton);

    expect(screen.getByText('No notifications')).toBeInTheDocument();
  });

  it('displays correct size variants', () => {
    const { rerender } = render(<NotificationBadge size="sm" />);
    // All sizes use min-h-[44px] min-w-[44px] for accessibility compliance
    expect(screen.getByRole('button')).toHaveClass('min-h-[44px]', 'min-w-[44px]');

    rerender(<NotificationBadge size="lg" />);
    expect(screen.getByRole('button')).toHaveClass('min-h-[44px]', 'min-w-[44px]');
  });

  it('handles settings click', async () => {
    const mockOnOpenCenter = jest.fn() as any;

    render(<NotificationBadge onOpenCenter={mockOnOpenCenter} />);

    const badgeButton = screen.getByRole('button');
    await user.click(badgeButton);

    // Look for "View all" button which opens the notification center
    const viewAllButton = screen.getByText(/view all/i);
    await user.click(viewAllButton);

    expect(mockOnOpenCenter).toHaveBeenCalled();
  });

  it('animates on new notifications', () => {
    const { rerender } = render(<NotificationBadge />);

    // Simulate new notification
    mockUseRealTimeNotifications.unreadCount = 2;
    rerender(<NotificationBadge />);

    const badgeButton = screen.getByRole('button');
    expect(badgeButton).toHaveClass('animate-pulse');
  });

  it('formats time correctly', async () => {
    const pastNotification = {
      ...mockNotifications[0],
      timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
    };

    mockUseRealTimeNotifications.notifications = [pastNotification];

    render(<NotificationBadge />);

    const badgeButton = screen.getByRole('button');
    await user.click(badgeButton);

    expect(screen.getByText('5m')).toBeInTheDocument();
  });

  it('handles different popover positions', () => {
    const { rerender } = render(<NotificationBadge position="bottom-left" />);

    rerender(<NotificationBadge position="bottom-right" />);
    rerender(<NotificationBadge position="bottom-center" />);

    // Test passes if no errors thrown during rerenders
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
