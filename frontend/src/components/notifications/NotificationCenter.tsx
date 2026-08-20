'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Bell,
  Check,
  CheckCircle,
  AlertTriangle,
  Info,
  Star,
  Archive,
  Trash2,
  Settings,
  Filter,
  Search,
  Volume2,
  VolumeX,
  Clock,
  User,
  RefreshCw,
  Eye,
  EyeOff,
} from 'lucide-react';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  category: 'watchlist' | 'system' | 'security' | 'social' | 'billing' | 'content';
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  read: boolean;
  archived: boolean;
  starred: boolean;
  actionable: boolean;
  actions?: Array<{
    id: string;
    label: string;
    type: 'primary' | 'secondary' | 'destructive';
    url?: string;
    action?: () => void;
  }>;
  metadata?: {
    contentId?: string;
    userId?: string;
    source?: string;
    referenceId?: string;
  };
}

export interface NotificationFilters {
  showRead: boolean;
  showUnread: boolean;
  categories: string[];
  priorities: string[];
  types: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  search: string;
}

interface NotificationCenterProps {
  className?: string;
  onNotificationAction?: (notificationId: string, actionId: string) => void;
  onSettingsClick?: () => void;
  maxNotifications?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

const mockNotifications: AppNotification[] = [
  {
    id: '1',
    title: 'New Episode Available',
    message: 'Breaking Bad Season 5 Episode 12 is now available on Netflix US',
    type: 'info',
    category: 'watchlist',
    priority: 'medium',
    timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
    read: false,
    archived: false,
    starred: true,
    actionable: true,
    actions: [
      { id: 'watch', label: 'Watch Now', type: 'primary' },
      { id: 'details', label: 'View Details', type: 'secondary' },
    ],
    metadata: { contentId: 'breaking-bad-s5e12', source: 'netflix' },
  },
  {
    id: '2',
    title: 'Content Expiring Soon',
    message: 'The Office will leave Netflix US in 3 days',
    type: 'warning',
    category: 'watchlist',
    priority: 'high',
    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
    read: false,
    archived: false,
    starred: false,
    actionable: true,
    actions: [
      { id: 'watch', label: 'Watch Now', type: 'primary' },
      { id: 'find-alternative', label: 'Find Alternative', type: 'secondary' },
    ],
    metadata: { contentId: 'the-office', source: 'netflix' },
  },
  {
    id: '3',
    title: 'Security Alert',
    message: 'New login from Chrome on Windows detected',
    type: 'warning',
    category: 'security',
    priority: 'high',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    read: true,
    archived: false,
    starred: false,
    actionable: true,
    actions: [
      { id: 'approve', label: 'This Was Me', type: 'primary' },
      { id: 'secure', label: 'Secure Account', type: 'destructive' },
    ],
    metadata: { source: 'security-system' },
  },
  {
    id: '4',
    title: 'System Maintenance',
    message: 'Scheduled maintenance tonight from 2:00 AM - 4:00 AM EST',
    type: 'info',
    category: 'system',
    priority: 'low',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    read: true,
    archived: false,
    starred: false,
    actionable: false,
    metadata: { source: 'admin' },
  },
];

export function NotificationCenter({
  className = '',
  onNotificationAction,
  onSettingsClick,
  maxNotifications = 100,
  autoRefresh = true,
  refreshInterval = 30000,
}: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<AppNotification[]>(mockNotifications);
  const [filters, setFilters] = useState<NotificationFilters>({
    showRead: true,
    showUnread: true,
    categories: [],
    priorities: [],
    types: [],
    search: '',
  });

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);

  // Auto-refresh notifications
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(async () => {
      setIsRefreshing(true);
      try {
        // In real app, fetch from API
        await new Promise(resolve => setTimeout(resolve, 1000));
        // setNotifications(await fetchNotifications());
      } finally {
        setIsRefreshing(false);
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    return notifications
      .filter(notification => {
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

        // Filter by types
        if (filters.types.length > 0 && !filters.types.includes(notification.type)) {
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
      })
      .slice(0, maxNotifications);
  }, [notifications, filters, maxNotifications]);

  // Stats
  const stats = useMemo(() => {
    const unreadCount = notifications.filter(n => !n.read && !n.archived).length;
    const starredCount = notifications.filter(n => n.starred && !n.archived).length;
    const criticalCount = notifications.filter(n => n.priority === 'critical' && !n.read && !n.archived).length;

    return { unreadCount, starredCount, criticalCount };
  }, [notifications]);

  // Notification actions
  const markAsRead = useCallback((ids: string[]) => {
    setNotifications(prev => prev.map(n => (ids.includes(n.id) ? { ...n, read: true } : n)));
  }, []);

  const markAsUnread = useCallback((ids: string[]) => {
    setNotifications(prev => prev.map(n => (ids.includes(n.id) ? { ...n, read: false } : n)));
  }, []);

  const archiveNotifications = useCallback((ids: string[]) => {
    setNotifications(prev => prev.map(n => (ids.includes(n.id) ? { ...n, archived: true } : n)));
    setSelectedNotifications([]);
  }, []);

  const deleteNotifications = useCallback((ids: string[]) => {
    setNotifications(prev => prev.filter(n => !ids.includes(n.id)));
    setSelectedNotifications([]);
  }, []);

  const toggleStar = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, starred: !n.starred } : n)));
  }, []);

  const handleNotificationAction = useCallback(
    (notificationId: string, actionId: string) => {
      onNotificationAction?.(notificationId, actionId);
      markAsRead([notificationId]);
    },
    [onNotificationAction, markAsRead]
  );

  const markAllAsRead = useCallback(() => {
    const unreadIds = filteredNotifications.filter(n => !n.read).map(n => n.id);
    markAsRead(unreadIds);
  }, [filteredNotifications, markAsRead]);

  const toggleNotificationSelection = (id: string) => {
    setSelectedNotifications(prev => (prev.includes(id) ? prev.filter(notifId => notifId !== id) : [...prev, id]));
  };

  const selectAllVisible = () => {
    setSelectedNotifications(filteredNotifications.map(n => n.id));
  };

  const clearSelection = () => {
    setSelectedNotifications([]);
  };

  const getNotificationIcon = (notification: AppNotification) => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-success" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-warning" />;
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-error" />;
      default:
        return <Info className="w-5 h-5 text-primary" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'watchlist':
        return <Star className="w-4 h-4" />;
      case 'security':
        return <AlertTriangle className="w-4 h-4" />;
      case 'billing':
        return <User className="w-4 h-4" />;
      case 'social':
        return <User className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
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
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Bell className="w-6 h-6 text-foreground" />
            {stats.unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive rounded-full text-xs text-destructive-foreground flex items-center justify-center">
                {stats.unreadCount > 99 ? '99+' : stats.unreadCount}
              </span>
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Notifications</h2>
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <span>{stats.unreadCount} unread</span>
              <span>{stats.starredCount} starred</span>
              {stats.criticalCount > 0 && (
                <span className="text-destructive font-medium">{stats.criticalCount} critical</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={soundEnabled ? 'text-primary' : 'text-muted-foreground'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? 'text-primary' : 'text-muted-foreground'}
          >
            <Filter className="w-4 h-4" />
          </Button>

          <Button variant="ghost" size="sm" onClick={onSettingsClick}>
            <Settings className="w-4 h-4" />
          </Button>

          <Button variant="outline" size="sm" onClick={() => window.location.reload()} disabled={isRefreshing}>
            {isRefreshing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search notifications..."
                  value={filters.search}
                  onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filters.showUnread}
                    onChange={e => setFilters(prev => ({ ...prev, showUnread: e.target.checked }))}
                  />
                  <label htmlFor="show-unread" className="text-sm">
                    Show Unread
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filters.showRead}
                    onChange={e => setFilters(prev => ({ ...prev, showRead: e.target.checked }))}
                  />
                  <label htmlFor="show-read" className="text-sm">
                    Show Read
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Categories</label>
                {['watchlist', 'security', 'system', 'billing'].map(category => (
                  <div key={category} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`category-${category}`}
                      checked={filters.categories.includes(category)}
                      onChange={e => {
                        setFilters(prev => ({
                          ...prev,
                          categories: e.target.checked
                            ? [...prev.categories, category]
                            : prev.categories.filter(c => c !== category),
                        }));
                      }}
                    />
                    <label htmlFor={`category-${category}`} className="text-sm capitalize">
                      {category}
                    </label>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Priority</label>
                {['critical', 'high', 'medium', 'low'].map(priority => (
                  <div key={priority} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`priority-${priority}`}
                      checked={filters.priorities.includes(priority)}
                      onChange={e => {
                        setFilters(prev => ({
                          ...prev,
                          priorities: e.target.checked
                            ? [...prev.priorities, priority]
                            : prev.priorities.filter(p => p !== priority),
                        }));
                      }}
                    />
                    <label htmlFor={`priority-${priority}`} className="text-sm capitalize">
                      {priority}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk Actions */}
      {selectedNotifications.length > 0 && (
        <div className="flex items-center justify-between bg-primary/10 border border-primary/20 p-3 rounded-lg">
          <span className="text-sm text-primary">{selectedNotifications.length} notifications selected</span>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => markAsRead(selectedNotifications)}>
              <Check className="w-4 h-4 mr-1" />
              Mark Read
            </Button>
            <Button variant="outline" size="sm" onClick={() => archiveNotifications(selectedNotifications)}>
              <Archive className="w-4 h-4 mr-1" />
              Archive
            </Button>
            <Button variant="destructive" size="sm" onClick={() => deleteNotifications(selectedNotifications)}>
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </Button>
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={selectAllVisible}>
            Select All
          </Button>
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            Mark All Read
          </Button>
        </div>

        <div className="text-sm text-muted-foreground">
          Showing {filteredNotifications.length} of {notifications.filter(n => !n.archived).length}
        </div>
      </div>

      {/* Notifications List */}
      <ScrollArea className="h-[600px]">
        <div className="space-y-2">
          {filteredNotifications.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Bell className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium text-foreground mb-2">No notifications</h3>
                <p className="text-muted-foreground">
                  {notifications.length === 0
                    ? "You're all caught up!"
                    : 'No notifications match your current filters.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredNotifications.map(notification => (
              <Card
                key={notification.id}
                className={`transition-all duration-200 hover:shadow-md ${
                  !notification.read ? 'border-l-4 border-l-primary' : ''
                } ${selectedNotifications.includes(notification.id) ? 'ring-2 ring-primary' : ''}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedNotifications.includes(notification.id)}
                      onChange={() => toggleNotificationSelection(notification.id)}
                      className="mt-1"
                    />

                    <div className="flex-shrink-0 mt-0.5">{getNotificationIcon(notification)}</div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4
                              className={`text-sm font-medium ${
                                !notification.read ? 'text-foreground' : 'text-foreground/80'
                              }`}
                            >
                              {notification.title}
                            </h4>
                            <Badge
                              variant={notification.priority === 'critical' ? 'destructive' : 'outline'}
                              className="text-xs"
                            >
                              {notification.priority}
                            </Badge>
                            <Badge variant="outline" className="text-xs capitalize">
                              {notification.category}
                            </Badge>
                            {!notification.read && <div className="w-2 h-2 bg-primary rounded-full" />}
                          </div>

                          <p className={`text-sm ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {notification.message}
                          </p>

                          {notification.actions && notification.actions.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                              {notification.actions.map(action => (
                                <Button
                                  key={action.id}
                                  variant={
                                    action.type === 'primary'
                                      ? 'default'
                                      : action.type === 'destructive'
                                        ? 'destructive'
                                        : 'outline'
                                  }
                                  size="sm"
                                  onClick={() => handleNotificationAction(notification.id, action.id)}
                                  className="text-xs h-7"
                                >
                                  {action.label}
                                </Button>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center space-x-1 ml-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleStar(notification.id)}
                            className={
                              notification.starred ? 'text-warning' : 'text-muted-foreground'
                            }
                          >
                            <Star className="w-4 h-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              notification.read ? markAsUnread([notification.id]) : markAsRead([notification.id])
                            }
                            className="text-muted-foreground hover:text-foreground"
                          >
                            {notification.read ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => archiveNotifications([notification.id])}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Archive className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center space-x-2">
                          <Clock className="w-3 h-3" />
                          <span>{formatTime(notification.timestamp)}</span>
                          {getCategoryIcon(notification.category)}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
