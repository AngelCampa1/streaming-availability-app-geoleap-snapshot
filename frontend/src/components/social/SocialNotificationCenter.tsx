'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Users,
  Heart,
  MessageCircle,
  Share2,
  UserPlus,
  Star,
  TrendingUp,
  X,
  Settings,
  Volume2,
  VolumeX,
  Info,
} from 'lucide-react';
import { useSocialAuth } from './SocialAuthProvider';
import { logger } from '@/lib/logger';

interface SocialNotification {
  id: string;
  type:
    | 'friend_request'
    | 'friend_accepted'
    | 'activity_like'
    | 'activity_comment'
    | 'activity_share'
    | 'recommendation'
    | 'mention'
    | 'achievement'
    | 'trending'
    | 'system';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';

  // Sender information
  fromUser?: {
    id: string;
    username: string;
    displayName: string;
    avatar?: string;
    provider: string;
  };

  // Related content
  content?: {
    id: string;
    type: 'movie' | 'show' | 'review' | 'list';
    title: string;
    image?: string;
  };

  // Actions available
  actions?: {
    primary?: {
      label: string;
      action: string;
      destructive?: boolean;
    };
    secondary?: {
      label: string;
      action: string;
    };
  };

  // Grouping information
  groupId?: string;
  groupCount?: number;

  // Metadata
  platform?: string;
  url?: string;
  metadata?: Record<string, any>;
}

interface NotificationSettings {
  enabled: boolean;
  sound: boolean;
  push: boolean;
  email: boolean;

  // Notification types
  friendRequests: boolean;
  friendActivity: boolean;
  contentInteractions: boolean;
  recommendations: boolean;
  mentions: boolean;
  achievements: boolean;
  trending: boolean;
  system: boolean;

  // Timing settings
  quietHours: {
    enabled: boolean;
    startTime: string;
    endTime: string;
  };

  // Frequency settings
  frequency: 'real_time' | 'hourly' | 'daily' | 'weekly';
  batchNotifications: boolean;
  maxNotificationsPerHour: number;
}

interface SocialNotificationCenterProps {
  className?: string;
  showInHeader?: boolean;
  maxVisible?: number;
}

export function SocialNotificationCenter({
  className = '',
  showInHeader = false,
  maxVisible = 50,
}: SocialNotificationCenterProps) {
  const { user } = useSocialAuth();
  const [notifications, setNotifications] = useState<SocialNotification[]>([]);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [playSound, setPlaySound] = useState(true);

  const wsRef = useRef<WebSocket | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Notification type configurations
  const notificationTypes = {
    friend_request: { icon: UserPlus, color: 'text-primary', label: 'Friend Requests' },
    friend_accepted: { icon: Users, color: 'text-success', label: 'Friend Accepted' },
    activity_like: { icon: Heart, color: 'text-destructive', label: 'Likes' },
    activity_comment: { icon: MessageCircle, color: 'text-accent', label: 'Comments' },
    activity_share: { icon: Share2, color: 'text-success', label: 'Shares' },
    recommendation: { icon: Star, color: 'text-warning', label: 'Recommendations' },
    mention: { icon: MessageCircle, color: 'text-primary', label: 'Mentions' },
    achievement: { icon: TrendingUp, color: 'text-warning', label: 'Achievements' },
    trending: { icon: TrendingUp, color: 'text-accent', label: 'Trending' },
    system: { icon: Info, color: 'text-muted-foreground', label: 'System' },
  };

  // Load notifications and settings
  useEffect(() => {
    loadNotifications();
    loadNotificationSettings();
    connectWebSocket();

    // Load notification sound
    audioRef.current = new Audio('/notification-sound.mp3');

    return () => {
      wsRef.current?.close();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadNotifications = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/social-notifications', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadNotificationSettings = async () => {
    try {
      const response = await fetch('/api/social-notifications/settings', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error);
    }
  };

  const connectWebSocket = () => {
    if (!user) return;

    try {
      const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/social-notifications/ws`;
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        logger.info('[SocialNotificationCenter] Connected to notifications WebSocket');
        wsRef.current?.send(
          JSON.stringify({
            type: 'auth',
            // SECURITY: Auth via httpOnly cookies
          })
        );
      };

      wsRef.current.onmessage = event => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'notification') {
            const notification = data.notification as SocialNotification;
            addNotification(notification);

            // Play sound if enabled
            if (settings?.sound && playSound && audioRef.current) {
              audioRef.current.play().catch(() => {
                // Ignore autoplay errors
              });
            }

            // Show browser notification if permitted
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(notification.title, {
                body: notification.message,
                icon: notification.fromUser?.avatar || '/icon-192.png',
                tag: notification.id,
              });
            }
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      wsRef.current.onclose = () => {
        logger.info('[SocialNotificationCenter] WebSocket connection closed');
        // Reconnect after 5 seconds
        setTimeout(connectWebSocket, 5000);
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  };

  const addNotification = (notification: SocialNotification) => {
    setNotifications(prev => {
      // Check if this is part of a group
      const existingGroupIndex = prev.findIndex(n => n.groupId === notification.groupId && notification.groupId);

      if (existingGroupIndex >= 0 && notification.groupId) {
        // Update existing group
        const updated = [...prev];
        updated[existingGroupIndex] = {
          ...updated[existingGroupIndex],
          groupCount: (updated[existingGroupIndex].groupCount || 1) + 1,
          timestamp: notification.timestamp,
        };
        return updated;
      } else {
        // Add new notification
        return [notification, ...prev].slice(0, maxVisible);
      }
    });
  };

  const markAsRead = async (notificationIds: string[]) => {
    try {
      // SECURITY: Use credentials: 'include' for cookie-based auth (no localStorage)
      await fetch('/api/social-notifications/mark-read', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationIds }),
      });

      setNotifications(prev =>
        prev.map(notification =>
          notificationIds.includes(notification.id) ? { ...notification, read: true } : notification
        )
      );
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
    }
  };

  const markAllAsRead = () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length > 0) {
      markAsRead(unreadIds);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await fetch(`/api/social-notifications/${notificationId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const handleNotificationAction = async (notification: SocialNotification, actionType: 'primary' | 'secondary') => {
    const action = actionType === 'primary' ? notification.actions?.primary : notification.actions?.secondary;
    if (!action) return;

    try {
      // SECURITY: Use credentials: 'include' for cookie-based auth (no localStorage)
      const response = await fetch('/api/social-notifications/action', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notificationId: notification.id,
          action: action.action,
        }),
      });

      if (response.ok) {
        // Mark as read and optionally remove
        markAsRead([notification.id]);

        if (action.action === 'accept_friend_request' || action.action === 'decline_friend_request') {
          deleteNotification(notification.id);
        }
      }
    } catch (error) {
      console.error('Failed to handle notification action:', error);
    }
  };

  const _updateNotificationSettings = async (newSettings: Partial<NotificationSettings>) => {
    try {
      // SECURITY: Use credentials: 'include' for cookie-based auth (no localStorage)
      const response = await fetch('/api/social-notifications/settings', {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSettings),
      });

      if (response.ok) {
        setSettings(prev => (prev ? { ...prev, ...newSettings } : null));
      }
    } catch (error) {
      console.error('Failed to update notification settings:', error);
    }
  };

  const getFilteredNotifications = () => {
    if (activeFilter === 'all') return notifications;
    if (activeFilter === 'unread') return notifications.filter(n => !n.read);
    return notifications.filter(n => n.type === activeFilter);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-destructive';
      case 'high':
        return 'border-l-warning';
      case 'medium':
        return 'border-l-warning';
      case 'low':
        return 'border-l-success';
      default:
        return 'border-l-border';
    }
  };

  const getRelativeTime = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = now.getTime() - time.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const renderNotification = (notification: SocialNotification) => {
    const typeConfig = notificationTypes[notification.type];
    const Icon = typeConfig?.icon || Bell;
    const isSelected = selectedNotifications.has(notification.id);

    return (
      <div
        key={notification.id}
        className={`p-4 border-l-4 ${getPriorityColor(notification.priority)} ${
          notification.read ? 'bg-background' : 'bg-primary/5'
        } hover:bg-muted transition-colors`}
      >
        <div className="flex items-start space-x-3">
          {/* Selection checkbox */}
          <input
            type="checkbox"
            checked={isSelected}
            onChange={e => {
              const newSelected = new Set(selectedNotifications);
              if (e.target.checked) {
                newSelected.add(notification.id);
              } else {
                newSelected.delete(notification.id);
              }
              setSelectedNotifications(newSelected);
            }}
            className="mt-1 text-primary"
          />

          {/* User avatar or notification icon */}
          <div className="flex-shrink-0">
            {notification.fromUser?.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={notification.fromUser.avatar}
                alt={notification.fromUser.displayName}
                className="w-10 h-10 rounded-full"
              />
            ) : (
              <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                <Icon size={20} className={typeConfig?.color || 'text-muted-foreground'} />
              </div>
            )}
          </div>

          {/* Notification content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{notification.title}</p>
                <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>

                {notification.content && (
                  <div className="flex items-center space-x-2 mt-2 p-2 bg-muted rounded-md">
                    {notification.content.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={notification.content.image}
                        alt={notification.content.title}
                        className="w-8 h-8 rounded object-cover"
                      />
                    )}
                    <span className="text-sm font-medium text-foreground">{notification.content.title}</span>
                  </div>
                )}

                {notification.groupCount && notification.groupCount > 1 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    +{notification.groupCount - 1} more {typeConfig?.label?.toLowerCase()}
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-2 ml-4">
                <span className="text-xs text-muted-foreground">{getRelativeTime(notification.timestamp)}</span>

                <button
                  onClick={() => deleteNotification(notification.id)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Actions */}
            {notification.actions && (
              <div className="flex space-x-2 mt-3">
                {notification.actions.primary && (
                  <button
                    onClick={() => handleNotificationAction(notification, 'primary')}
                    className={`px-3 py-1 text-sm rounded-md font-medium ${
                      notification.actions.primary.destructive
                        ? 'bg-destructive text-white hover:bg-destructive/90'
                        : 'bg-primary text-primary-foreground hover:bg-primary/90'
                    }`}
                  >
                    {notification.actions.primary.label}
                  </button>
                )}

                {notification.actions.secondary && (
                  <button
                    onClick={() => handleNotificationAction(notification, 'secondary')}
                    className="px-3 py-1 text-sm border border-border rounded-md hover:bg-muted"
                  >
                    {notification.actions.secondary.label}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (showInHeader) {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-2 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-md"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-destructive text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-96 bg-card border border-border rounded-lg shadow-lg z-50 max-h-96 overflow-hidden">
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-foreground">Notifications</h3>
                <div className="flex items-center space-x-2">
                  {unreadCount > 0 && (
                    <button onClick={markAllAsRead} className="text-sm text-primary hover:text-primary/80">
                      Mark all read
                    </button>
                  )}
                  <button onClick={() => setShowSettings(!showSettings)} className="text-muted-foreground hover:text-foreground">
                    <Settings size={16} />
                  </button>
                </div>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {getFilteredNotifications().slice(0, 10).map(renderNotification)}

              {notifications.length === 0 && (
                <div className="text-center py-8">
                  <Bell size={32} className="mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No notifications yet</p>
                </div>
              )}
            </div>

            {notifications.length > 10 && (
              <div className="p-3 border-t border-border text-center">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    // Navigate to full notifications page
                    window.location.href = '/notifications';
                  }}
                  className="text-sm text-primary hover:text-primary/80"
                >
                  View all notifications
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Full notification center view
  return (
    <div className={`max-w-4xl mx-auto ${className}`} ref={containerRef}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
            <p className="text-muted-foreground">Stay updated with your social activity</p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPlaySound(!playSound)}
              className={`p-2 rounded-md ${playSound ? 'text-primary' : 'text-muted-foreground'}`}
              title={playSound ? 'Disable sound' : 'Enable sound'}
            >
              {playSound ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>

            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 text-muted-foreground hover:text-foreground rounded-md"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <select
            value={activeFilter}
            onChange={e => setActiveFilter(e.target.value)}
            className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
          >
            <option value="all">All Notifications</option>
            <option value="unread">Unread</option>
            {Object.entries(notificationTypes).map(([key, config]) => (
              <option key={key} value={key}>
                {config.label}
              </option>
            ))}
          </select>

          {unreadCount > 0 && (
            <span className="px-2 py-1 bg-primary/10 text-primary text-sm rounded-full">{unreadCount} unread</span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {selectedNotifications.size > 0 && (
            <>
              <button
                onClick={() => markAsRead(Array.from(selectedNotifications))}
                className="px-3 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Mark as read ({selectedNotifications.size})
              </button>
              <button
                onClick={() => setSelectedNotifications(new Set())}
                className="px-3 py-2 text-sm border border-border rounded-md hover:bg-muted"
              >
                Clear selection
              </button>
            </>
          )}

          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="px-3 py-2 text-sm border border-border rounded-md hover:bg-muted"
            >
              Mark all as read
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12">
            <Bell size={32} className="animate-pulse text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Loading notifications...</p>
          </div>
        ) : getFilteredNotifications().length === 0 ? (
          <div className="text-center py-12">
            <Bell size={48} className="mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No notifications</h3>
            <p className="text-muted-foreground">You&apos;re all caught up!</p>
          </div>
        ) : (
          <div className="divide-y divide-border">{getFilteredNotifications().map(renderNotification)}</div>
        )}
      </div>
    </div>
  );
}

export default SocialNotificationCenter;
