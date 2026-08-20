'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { seoApiClient } from '@/lib/seo/api-client';

interface RealTimeNotification {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

interface RealTimeUpdatesProps {
  onUpdate?: (notification: RealTimeNotification) => void;
}

export function RealTimeUpdates({ onUpdate }: RealTimeUpdatesProps) {
  const [notifications, setNotifications] = useState<RealTimeNotification[]>([]);
  const [connected, setConnected] = useState(false);
  const [_eventSource, setEventSource] = useState<EventSource | null>(null);

  useEffect(() => {
    // Set up Server-Sent Events connection for real-time updates
    const source = seoApiClient.createEventSource('/events/real-time');

    source.onopen = () => {
      setConnected(true);
    };

    source.onmessage = event => {
      try {
        const data = JSON.parse(event.data);
        const notification: RealTimeNotification = {
          id: Date.now().toString(),
          type: data.type || 'info',
          title: data.title,
          message: data.message,
          timestamp: new Date().toISOString(),
          read: false,
        };

        setNotifications(prev => [notification, ...prev.slice(0, 19)]); // Keep last 20 notifications
        onUpdate?.(notification);
      } catch (error) {
        console.error('Error parsing SSE data:', error);
      }
    };

    source.onerror = error => {
      console.error('SSE connection error:', error);
      setConnected(false);
    };

    setEventSource(source);

    // Cleanup on unmount
    return () => {
      source.close();
      setEventSource(null);
      setConnected(false);
    };
  }, [onUpdate]);

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return CheckCircle2;
      case 'warning':
        return AlertTriangle;
      case 'error':
        return AlertTriangle;
      case 'info':
        return Info;
      default:
        return Bell;
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'text-success';
      case 'warning':
        return 'text-warning';
      case 'error':
        return 'text-error';
      case 'info':
        return 'text-primary';
      default:
        return 'text-muted-foreground';
    }
  };

  const getBadgeVariant = (type: string) => {
    switch (type) {
      case 'success':
        return 'default' as const;
      case 'warning':
        return 'secondary' as const;
      case 'error':
        return 'destructive' as const;
      case 'info':
        return 'outline' as const;
      default:
        return 'outline' as const;
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <div className="flex items-center space-x-2">
              <Bell className="h-4 w-4" />
              <span>Live Updates</span>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-xs px-1.5 py-0.5 min-w-[20px] h-5">
                  {unreadCount}
                </Badge>
              )}
            </div>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Badge variant={connected ? 'default' : 'secondary'} className="text-xs">
              {connected ? 'Connected' : 'Disconnected'}
            </Badge>
            {notifications.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAll}>
                Clear
              </Button>
            )}
          </div>
        </div>
        <CardDescription>Real-time system notifications and updates</CardDescription>
      </CardHeader>

      <CardContent className="max-h-96 overflow-y-auto space-y-3">
        {notifications.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No recent notifications</p>
          </div>
        ) : (
          notifications.map(notification => {
            const Icon = getIcon(notification.type);
            return (
              <div
                key={notification.id}
                className={`flex items-start space-x-3 p-3 rounded-lg border ${
                  notification.read ? 'bg-background' : 'bg-muted/30'
                }`}
                onClick={() => markAsRead(notification.id)}
              >
                <Icon className={`h-4 w-4 mt-0.5 ${getIconColor(notification.type)}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium truncate">{notification.title}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
                      onClick={e => {
                        e.stopPropagation();
                        dismissNotification(notification.id);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{notification.message}</p>
                  <div className="flex items-center justify-between">
                    <Badge variant={getBadgeVariant(notification.type)} className="text-xs">
                      {notification.type}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{formatTime(notification.timestamp)}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
