'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Bell,
  X,
  Check,
  AlertTriangle,
  Info,
  CheckCircle,
  AlertCircle,
  Volume2,
  VolumeX,
  Settings,
  Trash2,
  Archive,
  Star,
  Clock,
  User,
  CreditCard,
  MessageSquare,
  Activity,
  Search,
} from 'lucide-react';

// Notification types and interfaces
interface NotificationData {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  category: 'system' | 'customer' | 'payment' | 'support' | 'security' | 'analytics';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
  actions?: Array<{
    id: string;
    label: string;
    action: () => void;
    style?: 'primary' | 'secondary' | 'destructive';
  }>;
  metadata?: Record<string, unknown>;
  expires?: Date;
  starred?: boolean;
  archived?: boolean;
}

interface NotificationSettings {
  soundEnabled: boolean;
  showToasts: boolean;
  autoMarkRead: boolean;
  categories: Record<string, boolean>;
  priorities: Record<string, boolean>;
}

interface RealTimeNotificationsProps {
  className?: string;
  maxNotifications?: number;
  autoCleanupOld?: boolean;
  onNotificationAction?: (notificationId: string, actionId: string) => void;
}

// Mock notification generator for demo
const generateMockNotification = (): NotificationData => {
  const _types: NotificationData['type'][] = ['info', 'warning', 'error', 'success'];
  const _categories: NotificationData['category'][] = ['system', 'customer', 'payment', 'support', 'security'];
  const _priorities: NotificationData['priority'][] = ['low', 'medium', 'high', 'critical'];

  const templates = [
    {
      type: 'warning',
      category: 'payment',
      title: 'Payment Failed',
      message: "Customer John Doe's payment of $29.99 failed due to insufficient funds.",
      priority: 'high',
    },
    {
      type: 'success',
      category: 'customer',
      title: 'New Customer Registration',
      message: 'New premium customer Jane Smith just signed up.',
      priority: 'medium',
    },
    {
      type: 'error',
      category: 'system',
      title: 'API Rate Limit Exceeded',
      message: 'Payment gateway rate limit exceeded. Some transactions may be delayed.',
      priority: 'critical',
    },
    {
      type: 'info',
      category: 'support',
      title: 'Support Ticket Assigned',
      message: 'Ticket #12345 has been assigned to Mike Wilson.',
      priority: 'low',
    },
    {
      type: 'warning',
      category: 'security',
      title: 'Suspicious Login Attempt',
      message: 'Multiple failed login attempts from IP 192.168.1.1.',
      priority: 'high',
    },
  ];

  const template = templates[Math.floor(Math.random() * templates.length)];

  return {
    id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
    type: template.type as NotificationData['type'],
    category: template.category as NotificationData['category'],
    title: template.title,
    message: template.message,
    timestamp: new Date(),
    read: false,
    priority: template.priority as NotificationData['priority'],
    starred: Math.random() > 0.8,
    archived: false,
    actions:
      template.category === 'payment'
        ? [
            {
              id: 'retry',
              label: 'Retry Payment',
              action: () => {
                // TODO: Implement retry payment
              },
              style: 'primary' as const,
            },
            {
              id: 'contact',
              label: 'Contact Customer',
              action: () => {
                // TODO: Implement contact customer
              },
              style: 'secondary' as const,
            },
          ]
        : template.category === 'support'
          ? [
              {
                id: 'view_ticket',
                label: 'View Ticket',
                action: () => {
                  // TODO: Implement view ticket
                },
                style: 'primary' as const,
              },
            ]
          : undefined,
  };
};

const NotificationIcon: React.FC<{
  type: NotificationData['type'];
  category: NotificationData['category'];
  className?: string;
}> = ({ type, category, className = '' }) => {
  const iconProps = { className: `w-5 h-5 ${className}` };

  if (category === 'payment') return <CreditCard {...iconProps} />;
  if (category === 'customer') return <User {...iconProps} />;
  if (category === 'support') return <MessageSquare {...iconProps} />;
  if (category === 'security') return <AlertTriangle {...iconProps} />;
  if (category === 'system') return <Activity {...iconProps} />;

  switch (type) {
    case 'error':
      return <AlertCircle {...iconProps} className={`w-5 h-5 text-error ${className}`} />;
    case 'warning':
      return <AlertTriangle {...iconProps} className={`w-5 h-5 text-warning ${className}`} />;
    case 'success':
      return <CheckCircle {...iconProps} className={`w-5 h-5 text-success ${className}`} />;
    case 'info':
    default:
      return <Info {...iconProps} className={`w-5 h-5 text-primary ${className}`} />;
  }
};

const NotificationCard: React.FC<{
  notification: NotificationData;
  onMarkRead: (id: string) => void;
  onMarkUnread: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onStar: (id: string) => void;
  onAction: (notificationId: string, actionId: string) => void;
  compact?: boolean;
}> = ({ notification, onMarkRead, onMarkUnread, onArchive, onDelete, onStar, onAction, compact = false }) => {
  const [expanded, _setExpanded] = useState(false);

  const typeColors = {
    info: 'border-primary/30 bg-primary/10',
    warning: 'border-warning/30 bg-warning/10',
    error: 'border-error/30 bg-error/10',
    success: 'border-success/30 bg-success/10',
  };

  const priorityColors = {
    low: 'text-muted-foreground',
    medium: 'text-primary',
    high: 'text-warning',
    critical: 'text-error',
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <Card
      className={`p-4 transition-all duration-200 hover:shadow-md ${
        notification.read ? 'opacity-75' : ''
      } ${typeColors[notification.type]} ${notification.priority === 'critical' ? 'ring-2 ring-red-500' : ''}`}
    >
      <div className="flex items-start space-x-3">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          <NotificationIcon type={notification.type} category={notification.category} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <h4 className={`text-sm font-medium ${notification.read ? 'text-muted-foreground' : 'text-foreground'}`}>
                  {notification.title}
                </h4>
                <Badge variant="outline" className={`text-xs ${priorityColors[notification.priority]}`}>
                  {notification.priority}
                </Badge>
                {!notification.read && <div className="w-2 h-2 bg-primary rounded-full" />}
              </div>

              <p
                className={`text-sm ${
                  notification.read ? 'text-muted-foreground' : 'text-foreground'
                } ${compact && !expanded ? 'line-clamp-2' : ''}`}
              >
                {notification.message}
              </p>

              {notification.actions && notification.actions.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {notification.actions.map(action => (
                    <Button
                      key={action.id}
                      variant={action.style === 'primary' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => onAction(notification.id, action.id)}
                      className="text-xs"
                    >
                      {action.label}
                    </Button>
                  ))}
                  \n{' '}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-1 ml-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onStar(notification.id)}
                className={notification.starred ? 'text-warning' : 'text-muted-foreground'}
              >
                <Star className="w-4 h-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => (notification.read ? onMarkUnread(notification.id) : onMarkRead(notification.id))}
                className="text-muted-foreground hover:text-foreground"
              >
                {notification.read ? <Bell className="w-4 h-4" /> : <Check className="w-4 h-4" />}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => onArchive(notification.id)}
                className="text-muted-foreground hover:text-foreground"
              >
                <Archive className="w-4 h-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(notification.id)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Metadata */}
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <div className="flex items-center space-x-2">
              <Clock className="w-3 h-3" />
              <span>{formatTime(notification.timestamp)}</span>
              <Badge variant="outline" className="text-xs capitalize">
                {notification.category}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

const NotificationToast: React.FC<{
  notification: NotificationData;
  onDismiss: (id: string) => void;
  onAction: (notificationId: string, actionId: string) => void;
}> = ({ notification, onDismiss, onAction }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(notification.id);
    }, 5000);

    return () => clearTimeout(timer);
  }, [notification.id, onDismiss]);

  const typeColors = {
    info: 'bg-primary',
    warning: 'bg-warning',
    error: 'bg-error',
    success: 'bg-success',
  };

  return (
    <div className={`${typeColors[notification.type]} text-white p-4 rounded-lg shadow-lg max-w-sm`}>
      <div className="flex items-start space-x-3">
        <NotificationIcon type={notification.type} category={notification.category} className="text-white" />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium">{notification.title}</h4>
          <p className="text-xs opacity-90 mt-1">{notification.message}</p>

          {notification.actions && notification.actions.length > 0 && (
            <div className="flex space-x-2 mt-2">
              {notification.actions.slice(0, 2).map(action => (
                <Button
                  key={action.id}
                  variant="outline"
                  size="sm"
                  onClick={() => onAction(notification.id, action.id)}
                  className="text-xs bg-white/20 border-white/30 text-white hover:bg-white/30"
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDismiss(notification.id)}
          className="text-white hover:bg-white/20"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export const RealTimeNotifications: React.FC<RealTimeNotificationsProps> = ({
  className = '',
  maxNotifications = 100,
  autoCleanupOld = true,
  onNotificationAction,
}) => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [toastNotifications, setToastNotifications] = useState<NotificationData[]>([]);
  const [settings, setSettings] = useState<NotificationSettings>({
    soundEnabled: true,
    showToasts: true,
    autoMarkRead: false,
    categories: {
      system: true,
      customer: true,
      payment: true,
      support: true,
      security: true,
      analytics: true,
    },
    priorities: {
      low: true,
      medium: true,
      high: true,
      critical: true,
    },
  });

  const [filters, setFilters] = useState({
    showRead: true,
    showUnread: true,
    categories: [] as string[],
    priorities: [] as string[],
    search: '',
  });

  const [showSettings, setShowSettings] = useState(false);

  // Simulate receiving real-time notifications
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        // 30% chance every 5 seconds
        const newNotification = generateMockNotification();

        setNotifications(prev => {
          const updated = [newNotification, ...prev];

          // Apply max limit
          if (updated.length > maxNotifications) {
            return updated.slice(0, maxNotifications);
          }

          return updated;
        });

        // Show toast if enabled
        if (settings.showToasts) {
          setToastNotifications(prev => [newNotification, ...prev.slice(0, 2)]);
        }

        // Play sound if enabled
        if (settings.soundEnabled) {
          // In a real app, you'd play a notification sound
          // Notification sound would be played here
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [maxNotifications, settings.showToasts, settings.soundEnabled]);

  // Auto cleanup old notifications
  useEffect(() => {
    if (!autoCleanupOld) return;

    const cleanup = setInterval(() => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      setNotifications(prev => prev.filter(n => n.timestamp > threeDaysAgo && !n.archived));
    }, 60000); // Check every minute

    return () => clearInterval(cleanup);
  }, [autoCleanupOld]);

  // Notification actions
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAsUnread = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: false } : n)));
  }, []);

  const archiveNotification = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, archived: true } : n)));
  }, []);

  const deleteNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const starNotification = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, starred: !n.starred } : n)));
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToastNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const handleNotificationAction = useCallback(
    (notificationId: string, actionId: string) => {
      onNotificationAction?.(notificationId, actionId);

      // Auto-mark as read when action is taken
      markAsRead(notificationId);

      // Remove from toast if present
      dismissToast(notificationId);
    },
    [onNotificationAction, markAsRead, dismissToast]
  );

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    setToastNotifications([]);
  }, []);

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter(notification => {
      // Filter by read status
      if (!filters.showRead && notification.read) return false;
      if (!filters.showUnread && !notification.read) return false;

      // Filter by archived status
      if (notification.archived) return false;

      // Filter by categories
      if (filters.categories.length > 0 && !filters.categories.includes(notification.category)) {
        return false;
      }

      // Filter by priorities
      if (filters.priorities.length > 0 && !filters.priorities.includes(notification.priority)) {
        return false;
      }

      // Filter by search
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return (
          notification.title.toLowerCase().includes(searchLower) ||
          notification.message.toLowerCase().includes(searchLower)
        );
      }

      return true;
    });
  }, [notifications, filters]);

  const unreadCount = useMemo(() => notifications.filter(n => !n.read && !n.archived).length, [notifications]);

  const priorityCount = useMemo(() => {
    const counts = { low: 0, medium: 0, high: 0, critical: 0 };
    notifications.forEach(n => {
      if (!n.read && !n.archived) {
        counts[n.priority]++;
      }
    });
    return counts;
  }, [notifications]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Bell className="w-6 h-6 text-foreground" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-error rounded-full text-xs text-error-foreground flex items-center justify-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Notifications</h2>
            <p className="text-sm text-muted-foreground">
              {unreadCount} unread, {notifications.length} total
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSettings(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }))}
            className={settings.soundEnabled ? 'text-primary' : 'text-muted-foreground'}
          >
            {settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>

          <Button variant="ghost" size="sm" onClick={() => setShowSettings(!showSettings)}>
            <Settings className="w-4 h-4" />
          </Button>

          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            Mark All Read
          </Button>

          <Button variant="outline" size="sm" onClick={clearAll}>
            Clear All
          </Button>
        </div>
      </div>

      {/* Priority Summary */}
      {(priorityCount.critical > 0 || priorityCount.high > 0) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(priorityCount).map(
            ([priority, count]) =>
              count > 0 && (
                <Card key={priority} className="p-3">
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        priority === 'critical'
                          ? 'bg-error'
                          : priority === 'high'
                            ? 'bg-warning'
                            : priority === 'medium'
                              ? 'bg-primary'
                              : 'bg-muted-foreground'
                      }`}
                    />
                    <span className="text-sm font-medium capitalize">{priority}</span>
                    <Badge variant="outline">{count}</Badge>
                  </div>
                </Card>
              )
          )}
        </div>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-foreground">Filters</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setFilters({
                  showRead: true,
                  showUnread: true,
                  categories: [],
                  priorities: [],
                  search: '',
                })
              }
            >
              Reset
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search notifications..."
                value={filters.search}
                onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full pl-10 pr-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Status</label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.showUnread}
                    onChange={e => setFilters(prev => ({ ...prev, showUnread: e.target.checked }))}
                    className="rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="ml-2 text-sm text-foreground">Unread</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.showRead}
                    onChange={e => setFilters(prev => ({ ...prev, showRead: e.target.checked }))}
                    className="rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="ml-2 text-sm text-foreground">Read</span>
                </label>
              </div>
            </div>

            {/* Priority Filter */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Priority</label>
              <select
                multiple
                value={filters.priorities}
                onChange={e =>
                  setFilters(prev => ({
                    ...prev,
                    priorities: Array.from(e.target.selectedOptions, option => option.value),
                  }))
                }
                className="w-full border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
                size={4}
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <Card className="p-8 text-center">
            <Bell className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium text-foreground mb-2">No notifications</h3>
            <p className="text-muted-foreground">
              {notifications.length === 0 ? "You're all caught up!" : 'No notifications match your current filters.'}
            </p>
          </Card>
        ) : (
          filteredNotifications.map(notification => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onMarkRead={markAsRead}
              onMarkUnread={markAsUnread}
              onArchive={archiveNotification}
              onDelete={deleteNotification}
              onStar={starNotification}
              onAction={handleNotificationAction}
            />
          ))
        )}
      </div>

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 space-y-2 z-[1700]">
        {toastNotifications.map(notification => (
          <NotificationToast
            key={notification.id}
            notification={notification}
            onDismiss={dismissToast}
            onAction={handleNotificationAction}
          />
        ))}
      </div>
    </div>
  );
};

export default RealTimeNotifications;
