'use client';

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Bell, BellOff, Settings, CheckCircle, AlertTriangle, Info, Star, Clock, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppNotification } from './NotificationCenter';
import { useRealTimeNotifications } from './RealTimeNotificationProvider';

interface NotificationBadgeProps {
  className?: string;
  maxPreviewItems?: number;
  showBadgeCount?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'icon' | 'button' | 'compact';
  onOpenCenter?: () => void;
  position?: 'bottom-left' | 'bottom-right' | 'bottom-center';
}

export function NotificationBadge({
  className = '',
  maxPreviewItems = 5,
  showBadgeCount = true,
  size = 'md',
  variant = 'icon',
  onOpenCenter,
  position = 'bottom-right',
}: NotificationBadgeProps) {
  const { notifications, unreadCount, markAsRead, clearAll, isConnected, connectionStatus } =
    useRealTimeNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const [hasNewNotifications, setHasNewNotifications] = useState(false);

  // Animation for new notifications
  useEffect(() => {
    if (unreadCount > 0) {
      setHasNewNotifications(true);
      const timer = setTimeout(() => setHasNewNotifications(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [unreadCount]);

  // Get recent notifications for preview
  const recentNotifications = notifications.filter(n => !n.archived).slice(0, maxPreviewItems);

  const handleNotificationClick = (notification: AppNotification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }

    // Handle notification actions
    if (notification.actions && notification.actions.length > 0) {
      const primaryAction = notification.actions[0];
      if (primaryAction.url) {
        window.open(primaryAction.url, '_blank');
      } else if (primaryAction.action) {
        primaryAction.action();
      }
    }

    setIsOpen(false);
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 'w-4 h-4';
      case 'lg':
        return 'w-6 h-6';
      default:
        return 'w-5 h-5';
    }
  };

  const getBadgeSize = () => {
    switch (size) {
      case 'sm':
        return 'w-4 h-4 text-xs';
      case 'lg':
        return 'w-6 h-6 text-sm';
      default:
        return 'w-5 h-5 text-xs';
    }
  };

  const getButtonSize = () => {
    switch (size) {
      case 'sm':
        return 'min-h-[44px] min-w-[44px]';
      case 'lg':
        return 'min-h-[44px] min-w-[44px]';
      default:
        return 'min-h-[44px] min-w-[44px]';
    }
  };

  const getTypeIcon = (type: string) => {
    const iconClass = 'w-4 h-4';
    switch (type) {
      case 'success':
        return <CheckCircle className={`${iconClass} text-success`} />;
      case 'warning':
        return <AlertTriangle className={`${iconClass} text-warning`} />;
      case 'error':
        return <AlertTriangle className={`${iconClass} text-destructive`} />;
      default:
        return <Info className={`${iconClass} text-info`} />;
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;

    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  const triggerButton = (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        'relative p-3 flex items-center justify-center',
        getButtonSize(),
        hasNewNotifications && 'animate-pulse',
        !isConnected && 'opacity-50',
        className
      )}
    >
      <div className="relative">
        <Bell className={getIconSize()} />

        {/* Connection status indicator */}
        {!isConnected && <div className="absolute -top-1 -right-1 w-2 h-2 bg-destructive rounded-full" />}

        {/* Unread count badge */}
        {showBadgeCount && unreadCount > 0 && (
          <Badge
            variant="destructive"
            className={cn(
              'absolute -top-2 -right-2 px-1 min-w-0 h-5 text-xs font-bold',
              getBadgeSize(),
              'flex items-center justify-center'
            )}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}

        {/* New notification pulse */}
        {hasNewNotifications && <div className="absolute inset-0 rounded-full border-2 border-primary animate-ping" />}
      </div>
    </Button>
  );

  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center space-x-2', className)}>
        <Bell className={getIconSize()} />
        {unreadCount > 0 && (
          <Badge variant="destructive" className="text-xs">
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </div>
    );
  }

  if (variant === 'button') {
    return (
      <Button
        onClick={onOpenCenter}
        variant="outline"
        size="sm"
        className={cn('flex items-center space-x-2 min-h-[44px]', className)}
      >
        <Bell className={getIconSize()} />
        <span>Notifications</span>
        {unreadCount > 0 && (
          <Badge variant="destructive" className="ml-2">
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>

      <PopoverContent
        className={cn(
          'w-80 p-0',
          position === 'bottom-left' && 'mr-auto',
          position === 'bottom-center' && 'mx-auto',
          position === 'bottom-right' && 'ml-auto'
        )}
        align={position === 'bottom-left' ? 'start' : position === 'bottom-right' ? 'end' : 'center'}
        side="bottom"
      >
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Bell className="w-4 h-4" />
              <span className="font-medium text-sm">Notifications</span>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {unreadCount} new
                </Badge>
              )}
            </div>

            <div className="flex items-center space-x-1">
              {/* Connection status */}
              <div className="flex items-center space-x-1">
                <div
                  className={cn(
                    'w-2 h-2 rounded-full',
                    isConnected
                      ? 'bg-success'
                      : connectionStatus === 'connecting'
                        ? 'bg-warning animate-pulse'
                        : 'bg-destructive'
                  )}
                />
                <span className="text-xs text-muted-foreground">
                  {isConnected ? 'Live' : connectionStatus === 'connecting' ? 'Connecting' : 'Offline'}
                </span>
              </div>

              <Button variant="ghost" size="sm" onClick={onOpenCenter} className="min-h-[44px] min-w-[44px] p-3 flex items-center justify-center">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {recentNotifications.length === 0 ? (
            <div className="text-center py-8">
              <BellOff className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No notifications</p>
            </div>
          ) : (
            <>
              <ScrollArea className="max-h-80">
                <div className="space-y-2">
                  {recentNotifications.map((notification, index) => (
                    <div key={notification.id}>
                      <div
                        className={cn(
                          'p-3 rounded-lg border border-border cursor-pointer transition-colors hover:bg-accent',
                          !notification.read && 'bg-accent/50 border-primary/30'
                        )}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-0.5">{getTypeIcon(notification.type)}</div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-1">
                              <h4
                                className={cn(
                                  'text-sm font-medium line-clamp-1',
                                  !notification.read ? 'text-foreground' : 'text-muted-foreground'
                                )}
                              >
                                {notification.title}
                              </h4>

                              <div className="flex items-center space-x-1 ml-2">
                                {notification.starred && (
                                  <Star className="w-3 h-3 text-warning fill-current" />
                                )}
                                {!notification.read && <div className="w-2 h-2 bg-primary rounded-full" />}
                              </div>
                            </div>

                            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{notification.message}</p>

                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <div className="flex items-center space-x-1">
                                <Clock className="w-3 h-3" />
                                <span>{formatTime(notification.timestamp)}</span>
                              </div>

                              <Badge variant="outline" className="text-xs capitalize">
                                {notification.category}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>

                      {index < recentNotifications.length - 1 && <Separator className="my-2" />}
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <Separator className="my-3" />

              {/* Footer actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {unreadCount > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const unreadIds = recentNotifications.filter(n => !n.read).map(n => n.id);
                        unreadIds.forEach(id => markAsRead(id));
                      }}
                      className="text-xs min-h-[44px] px-3"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Mark all read
                    </Button>
                  )}

                  {notifications.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearAll}
                      className="text-xs min-h-[44px] px-3 text-destructive border-destructive/30 hover:bg-destructive/10"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Clear all
                    </Button>
                  )}
                </div>

                <Button variant="ghost" size="sm" onClick={onOpenCenter} className="text-xs min-h-[44px] px-3">
                  View all
                </Button>
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Hook for easy integration with navigation components
export function useNotificationBadge() {
  const { notifications, unreadCount, connectionStatus } = useRealTimeNotifications();

  return {
    unreadCount,
    hasNotifications: notifications.length > 0,
    isConnected: connectionStatus === 'connected',
    connectionStatus,
  };
}
