'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  Bell,
  BellOff,
  ChevronDown,
  ChevronUp,
  Star,
  Archive,
  Trash2,
  Settings,
  CheckCircle,
  AlertTriangle,
  Info,
  Clock,
  Move,
  Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppNotification } from './NotificationCenter';
import { useRealTimeNotifications } from './RealTimeNotificationProvider';
import { logger } from '@/lib/logger';

interface SwipeAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  action: (notification: AppNotification) => void;
}

interface NotificationMobileProps {
  className?: string;
  trigger?: React.ReactNode;
  onSettingsClick?: () => void;
  maxNotifications?: number;
  enableSwipeActions?: boolean;
  compactMode?: boolean;
}

export function NotificationMobile({
  className = '',
  trigger,
  onSettingsClick,
  maxNotifications = 50,
  enableSwipeActions = true,
  compactMode = false,
}: NotificationMobileProps) {
  const { notifications, unreadCount, markAsRead, clearAll, isConnected } = useRealTimeNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [swipingId, setSwipingId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const touchCurrentRef = useRef<{ x: number; y: number } | null>(null);

  // Filter notifications
  const filteredNotifications = notifications
    .filter(n => !n.archived)
    .filter(n => selectedCategory === 'all' || n.category === selectedCategory)
    .slice(0, maxNotifications);

  // Swipe actions configuration
  const leftSwipeActions: SwipeAction[] = [
    {
      id: 'star',
      label: 'Star',
      icon: <Star className="w-4 h-4" />,
      color: 'bg-warning',
      action: notification => {
        // Toggle star
        logger.info('[NotificationMobile] Toggle star', { notificationId: notification.id });
      },
    },
    {
      id: 'archive',
      label: 'Archive',
      icon: <Archive className="w-4 h-4" />,
      color: 'bg-primary',
      action: notification => {
        logger.info('[NotificationMobile] Archive', { notificationId: notification.id });
      },
    },
  ];

  const rightSwipeActions: SwipeAction[] = [
    {
      id: 'delete',
      label: 'Delete',
      icon: <Trash2 className="w-4 h-4" />,
      color: 'bg-error',
      action: notification => {
        logger.info('[NotificationMobile] Delete', { notificationId: notification.id });
      },
    },
  ];

  // Touch handlers for swipe gestures
  const handleTouchStart = (e: React.TouchEvent, notificationId: string) => {
    if (!enableSwipeActions) return;

    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
    touchCurrentRef.current = { x: touch.clientX, y: touch.clientY };
    setSwipingId(notificationId);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!enableSwipeActions || !touchStartRef.current || !swipingId) return;

    const touch = e.touches[0];
    touchCurrentRef.current = { x: touch.clientX, y: touch.clientY };

    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);

    // Only allow horizontal swipe if vertical movement is minimal
    if (deltaY < 30) {
      e.preventDefault(); // Prevent scrolling
      setSwipeOffset(Math.max(-120, Math.min(120, deltaX)));
    }
  };

  const handleTouchEnd = () => {
    if (!enableSwipeActions || !touchStartRef.current || !swipingId) return;

    const threshold = 60; // Minimum swipe distance to trigger action

    if (Math.abs(swipeOffset) > threshold) {
      const notification = notifications.find(n => n.id === swipingId);
      if (notification) {
        if (swipeOffset > 0) {
          // Right swipe - execute left actions
          leftSwipeActions[0]?.action(notification);
        } else {
          // Left swipe - execute right actions
          rightSwipeActions[0]?.action(notification);
        }
      }
    }

    // Reset swipe state
    setSwipeOffset(0);
    setSwipingId(null);
    touchStartRef.current = null;
    touchCurrentRef.current = null;
  };

  const handleNotificationClick = (notification: AppNotification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }

    if (compactMode) {
      setExpandedId(expandedId === notification.id ? null : notification.id);
    }

    // Handle primary action if available
    if (notification.actions && notification.actions.length > 0) {
      const primaryAction = notification.actions[0];
      if (primaryAction.url) {
        window.open(primaryAction.url, '_blank');
      } else if (primaryAction.action) {
        primaryAction.action();
      }
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
        return <AlertTriangle className={`${iconClass} text-error`} />;
      default:
        return <Info className={`${iconClass} text-primary`} />;
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

  const categories = Array.from(new Set(notifications.map(n => n.category)));

  const defaultTrigger = (
    <Button variant="ghost" size="sm" className="relative">
      <Bell className="w-5 h-5" />
      {unreadCount > 0 && (
        <Badge
          variant="destructive"
          className="absolute -top-1 -right-1 h-5 w-5 text-xs flex items-center justify-center p-0"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      )}
    </Button>
  );

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>{trigger || defaultTrigger}</SheetTrigger>

      <SheetContent side="right" className={cn('w-full sm:w-96 p-0', className)}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Bell className="w-5 h-5" />
                <SheetTitle>Notifications</SheetTitle>
                {unreadCount > 0 && <Badge variant="secondary">{unreadCount} new</Badge>}
              </div>

              <div className="flex items-center space-x-2">
                {/* Connection status */}
                <div className={cn('w-2 h-2 rounded-full', isConnected ? 'bg-success' : 'bg-destructive')} />

                <Button variant="ghost" size="sm" onClick={() => setShowFilters(!showFilters)}>
                  <Filter className="w-4 h-4" />
                </Button>

                <Button variant="ghost" size="sm" onClick={onSettingsClick}>
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <SheetDescription className="mt-1">
              {isConnected ? 'Live updates enabled' : 'Offline - updates paused'}
            </SheetDescription>

            {/* Filters */}
            {showFilters && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center space-x-2 overflow-x-auto">
                  <Button
                    variant={selectedCategory === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory('all')}
                    className="whitespace-nowrap"
                  >
                    All
                  </Button>
                  {categories.map(category => (
                    <Button
                      key={category}
                      variant={selectedCategory === category ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedCategory(category)}
                      className="whitespace-nowrap capitalize"
                    >
                      {category}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          {unreadCount > 0 && (
            <div className="p-3 border-b bg-primary/10">
              <div className="flex items-center justify-between">
                <span className="text-sm text-primary">{unreadCount} unread notifications</span>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const unreadIds = filteredNotifications.filter(n => !n.read).map(n => n.id);
                      unreadIds.forEach(id => markAsRead(id));
                    }}
                    className="text-xs h-7"
                  >
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Mark all read
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Swipe Instructions */}
          {enableSwipeActions && filteredNotifications.length > 0 && (
            <div className="px-4 py-2 bg-muted border-b">
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <Move className="w-3 h-3" />
                <span>Swipe left to delete, right to star</span>
              </div>
            </div>
          )}

          {/* Notifications List */}
          <ScrollArea className="flex-1">
            <div className="p-2">
              {filteredNotifications.length === 0 ? (
                <div className="text-center py-12">
                  <BellOff className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No notifications</p>
                  <p className="text-sm text-muted-foreground">You&apos;re all caught up!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredNotifications.map(notification => (
                    <div key={notification.id} className="relative">
                      {/* Swipe Actions Background */}
                      {enableSwipeActions && swipingId === notification.id && (
                        <div className="absolute inset-0 flex items-center justify-between px-4">
                          {/* Left side actions (shown when swiping right) */}
                          <div className="flex items-center space-x-2">
                            {leftSwipeActions.map(action => (
                              <div
                                key={action.id}
                                className={cn(
                                  'w-10 h-10 rounded-full flex items-center justify-center text-white',
                                  action.color
                                )}
                              >
                                {action.icon}
                              </div>
                            ))}
                          </div>

                          {/* Right side actions (shown when swiping left) */}
                          <div className="flex items-center space-x-2">
                            {rightSwipeActions.map(action => (
                              <div
                                key={action.id}
                                className={cn(
                                  'w-10 h-10 rounded-full flex items-center justify-center text-white',
                                  action.color
                                )}
                              >
                                {action.icon}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Notification Card */}
                      <Card
                        className={cn(
                          'transition-transform duration-200 cursor-pointer',
                          !notification.read && 'border-l-4 border-l-primary',
                          swipingId === notification.id && 'z-10 shadow-lg'
                        )}
                        style={{
                          transform: swipingId === notification.id ? `translateX(${swipeOffset}px)` : 'translateX(0)',
                        }}
                        onTouchStart={e => handleTouchStart(e, notification.id)}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0 mt-0.5">{getTypeIcon(notification.type)}</div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between mb-1">
                                <h4
                                  className={cn(
                                    'text-sm font-medium line-clamp-1',
                                    !notification.read
                                      ? 'text-foreground'
                                      : 'text-muted-foreground'
                                  )}
                                >
                                  {notification.title}
                                </h4>

                                <div className="flex items-center space-x-1 ml-2">
                                  {notification.starred && <Star className="w-3 h-3 text-warning fill-current" />}
                                  {!notification.read && <div className="w-2 h-2 bg-primary rounded-full" />}
                                  {compactMode && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-4 w-4 p-0"
                                      onClick={e => {
                                        e.stopPropagation();
                                        setExpandedId(expandedId === notification.id ? null : notification.id);
                                      }}
                                    >
                                      {expandedId === notification.id ? (
                                        <ChevronUp className="w-3 h-3" />
                                      ) : (
                                        <ChevronDown className="w-3 h-3" />
                                      )}
                                    </Button>
                                  )}
                                </div>
                              </div>

                              <p
                                className={cn(
                                  'text-xs text-muted-foreground mb-2',
                                  compactMode && expandedId !== notification.id ? 'line-clamp-1' : 'line-clamp-2'
                                )}
                              >
                                {notification.message}
                              </p>

                              {/* Expanded content */}
                              {(!compactMode || expandedId === notification.id) && (
                                <>
                                  {/* Actions */}
                                  {notification.actions && notification.actions.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mb-2">
                                      {notification.actions.slice(0, 2).map(action => (
                                        <Button
                                          key={action.id}
                                          variant={action.type === 'primary' ? 'default' : 'outline'}
                                          size="sm"
                                          className="text-xs h-6 px-2"
                                          onClick={e => {
                                            e.stopPropagation();
                                            if (action.url) {
                                              window.open(action.url, '_blank');
                                            } else if (action.action) {
                                              action.action();
                                            }
                                          }}
                                        >
                                          {action.label}
                                        </Button>
                                      ))}
                                    </div>
                                  )}
                                </>
                              )}

                              {/* Metadata */}
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <div className="flex items-center space-x-2">
                                  <Clock className="w-3 h-3" />
                                  <span>{formatTime(notification.timestamp)}</span>
                                  <Badge variant="outline" className="text-xs capitalize">
                                    {notification.category}
                                  </Badge>
                                </div>

                                {notification.priority === 'critical' && (
                                  <Badge variant="destructive" className="text-xs">
                                    Critical
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Footer */}
          {filteredNotifications.length > 0 && (
            <div className="p-4 border-t">
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAll}
                  className="flex items-center space-x-2 text-error"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Clear All</span>
                </Button>

                <div className="text-xs text-muted-foreground">
                  {filteredNotifications.length} of {notifications.length} notifications
                </div>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Hook for mobile-specific notification handling
export function useNotificationMobile() {
  const [isVisible, setIsVisible] = useState(true);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Detect mobile device
  const isMobile =
    typeof window !== 'undefined' &&
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // Handle visibility changes (e.g., when app goes to background)
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Track user interactions for engagement metrics
  const trackInteraction = (type: 'tap' | 'swipe' | 'dismiss') => {
    setHasInteracted(true);
    logger.info('[useNotificationMobile] Mobile notification interaction', { type });
  };

  return {
    isMobile,
    isVisible,
    hasInteracted,
    trackInteraction,
  };
}
