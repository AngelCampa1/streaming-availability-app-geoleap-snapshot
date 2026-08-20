'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Bell,
  BellOff,
  CheckCircle,
  AlertCircle,
  Info,
  Clock,
  Trash2,
} from 'lucide-react';
import { logger } from '@/lib/logger';
import AppLayout from '@/components/layout/AppLayout';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
  category?: string;
}

export default function NotificationsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    // Wait for auth check to complete before making auth decisions
    if (authLoading) return;

    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    const loadNotifications = async () => {
      const abortController = new AbortController();

      try {
        setLoading(true);
        // Auth is verified by useEffect, credentials include cookies

        const response = await fetch('/api/notifications', {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: abortController.signal,
        });

        if (response.ok) {
          const data = await response.json();
          // Handle both array response and paginated response format
          if (Array.isArray(data)) {
            setNotifications(data);
          } else if (data.notifications) {
            // Map from API response format to component format
            setNotifications(data.notifications.map((n: {
              id: string;
              title: string;
              message: string;
              type: string;
              isRead: boolean;
              createdAt: string;
              category?: string;
            }) => ({
              id: n.id,
              title: n.title,
              message: n.message,
              type: n.type as Notification['type'] || 'info',
              read: n.isRead,
              createdAt: n.createdAt,
              category: n.category,
            })));
          } else {
            setNotifications([]);
          }
        } else {
          // Mock data for demo if API not available
          setNotifications([
            {
              id: '1',
              title: 'New Content Available',
              message: 'Your favorite show "Stranger Things" is now available in your region.',
              type: 'info',
              read: false,
              createdAt: new Date().toISOString(),
              category: 'content',
            },
            {
              id: '2',
              title: 'Price Alert',
              message: 'The movie "Inception" is now available for rent at a lower price.',
              type: 'success',
              read: false,
              createdAt: new Date(Date.now() - 3600000).toISOString(),
              category: 'price',
            },
            {
              id: '3',
              title: 'Subscription Reminder',
              message: 'Your premium subscription will expire in 7 days.',
              type: 'warning',
              read: true,
              createdAt: new Date(Date.now() - 7200000).toISOString(),
              category: 'subscription',
            },
          ]);
        }

        logger.info('Notifications loaded successfully');
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          logger.info('Notifications loading cancelled');
          return;
        }

        const errorMessage = err instanceof Error ? err.message : 'Failed to load notifications';
        setError(errorMessage);
        logger.error('Notifications loading failed', { error: errorMessage });
      } finally {
        setLoading(false);
      }

      return () => abortController.abort();
    };

    loadNotifications();
  }, [authLoading, isAuthenticated, router]);

  const handleMarkAllRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
      if (unreadIds.length === 0) return;

      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationIds: unreadIds }),
      });

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      logger.info('Marked all notifications as read');
    } catch (err) {
      logger.error('Failed to mark all notifications as read', { error: err });
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationIds: [id] }),
      });

      setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
      logger.info('Marked notification as read', { id });
    } catch (err) {
      logger.error('Failed to mark notification as read', { error: err });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      setNotifications(prev => prev.filter(n => n.id !== id));
      logger.info('Deleted notification', { id });
    } catch (err) {
      logger.error('Failed to delete notification', { error: err });
    }
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-success" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-warning" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-error" />;
      default:
        return <Info className="h-5 w-5 text-info" />;
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <AppLayout>
        <div className="py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Bell className="h-8 w-8 text-primary" />
              Notifications
              {unreadCount > 0 && (
                <Badge variant="default" className="ml-2">
                  {unreadCount} new
                </Badge>
              )}
            </h1>
            <p className="text-muted-foreground mt-1">Stay updated with your content and subscriptions</p>
          </div>
          {notifications.length > 0 && unreadCount > 0 && (
            <Button onClick={handleMarkAllRead} variant="outline" className="min-h-[44px]">
              <CheckCircle className="h-5 w-5 mr-2" />
              Mark All as Read
            </Button>
          )}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                onClick={() => setFilter('all')}
                className="min-h-[44px]"
              >
                All Notifications
              </Button>
              <Button
                variant={filter === 'unread' ? 'default' : 'outline'}
                onClick={() => setFilter('unread')}
                className="min-h-[44px]"
              >
                Unread ({unreadCount})
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notifications List */}
        {filteredNotifications.length > 0 ? (
          <div className="space-y-4">
            {filteredNotifications.map(notification => (
              <Card
                key={notification.id}
                className={`${!notification.read ? 'border-primary/50 bg-primary/5' : ''}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-1">{getNotificationIcon(notification.type)}</div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-semibold text-lg flex items-center gap-2">
                            {notification.title}
                            {!notification.read && (
                              <Badge variant="default" className="text-xs">
                                New
                              </Badge>
                            )}
                          </h3>
                          <p className="text-muted-foreground mt-1">{notification.message}</p>
                        </div>
                        <div className="flex gap-2">
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkRead(notification.id)}
                              className="min-h-[44px]"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(notification.id)}
                            className="min-h-[44px] text-error hover:text-error"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {new Date(notification.createdAt).toLocaleString()}
                        </div>
                        {notification.category && <Badge variant="outline">{notification.category}</Badge>}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <BellOff className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Notifications</h3>
              <p className="text-muted-foreground">
                {filter === 'unread'
                  ? "You're all caught up! No unread notifications."
                  : "You don't have any notifications yet."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
