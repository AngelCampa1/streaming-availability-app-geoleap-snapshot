'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  X,
  CheckCircle,
  AlertTriangle,
  Info,
  AlertCircle,
  Bell,
  Star,
  Clock,
  Play,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ToastNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  category: 'watchlist' | 'system' | 'security' | 'social' | 'billing' | 'content';
  priority: 'low' | 'medium' | 'high' | 'critical';
  duration?: number; // in milliseconds, 0 for persistent
  timestamp: Date;
  actions?: Array<{
    id: string;
    label: string;
    type: 'primary' | 'secondary' | 'destructive';
    icon?: React.ReactNode;
    action: () => void;
  }>;
  metadata?: {
    contentId?: string;
    imageUrl?: string;
    url?: string;
    source?: string;
  };
  onDismiss?: (id: string) => void;
  onAction?: (notificationId: string, actionId: string) => void;
}

interface NotificationToastProps {
  notification: ToastNotification;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  maxWidth?: number;
  showTimestamp?: boolean;
  enableInteraction?: boolean;
}

export function NotificationToast({
  notification,
  position = 'top-right',
  maxWidth = 400,
  showTimestamp = true,
  enableInteraction = true,
}: NotificationToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    // Animate in
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (notification.duration && notification.duration > 0) {
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev - 100 / (notification.duration! / 100);
          if (newProgress <= 0) {
            handleDismiss();
            return 0;
          }
          return newProgress;
        });
      }, 100);

      return () => clearInterval(progressInterval);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notification.duration]);

  const handleDismiss = useCallback(() => {
    setIsLeaving(true);
    setTimeout(() => {
      notification.onDismiss?.(notification.id);
    }, 300);
  }, [notification]);

  const handleAction = useCallback(
    (actionId: string) => {
      notification.onAction?.(notification.id, actionId);
      handleDismiss();
    },
    [notification, handleDismiss]
  );

  const getTypeStyles = () => {
    switch (notification.type) {
      case 'success':
        return {
          bg: 'bg-success/10 border-success/20',
          icon: 'text-success',
          accent: 'bg-success',
        };
      case 'warning':
        return {
          bg: 'bg-warning/10 border-warning/20',
          icon: 'text-warning',
          accent: 'bg-warning',
        };
      case 'error':
        return {
          bg: 'bg-destructive/10 border-destructive/20',
          icon: 'text-destructive',
          accent: 'bg-destructive',
        };
      default:
        return {
          bg: 'bg-primary/10 border-primary/20',
          icon: 'text-primary',
          accent: 'bg-primary',
        };
    }
  };

  const getTypeIcon = () => {
    const iconClass = 'w-5 h-5';
    switch (notification.type) {
      case 'success':
        return <CheckCircle className={iconClass} />;
      case 'warning':
        return <AlertTriangle className={iconClass} />;
      case 'error':
        return <AlertCircle className={iconClass} />;
      default:
        return <Info className={iconClass} />;
    }
  };

  const getCategoryIcon = () => {
    switch (notification.category) {
      case 'watchlist':
        return <Star className="w-4 h-4" />;
      case 'security':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const getPositionClasses = () => {
    const baseClasses = 'fixed z-50';
    switch (position) {
      case 'top-left':
        return `${baseClasses} top-4 left-4`;
      case 'top-center':
        return `${baseClasses} top-4 left-1/2 transform -translate-x-1/2`;
      case 'top-right':
        return `${baseClasses} top-4 right-4`;
      case 'bottom-left':
        return `${baseClasses} bottom-4 left-4`;
      case 'bottom-center':
        return `${baseClasses} bottom-4 left-1/2 transform -translate-x-1/2`;
      case 'bottom-right':
        return `${baseClasses} bottom-4 right-4`;
      default:
        return `${baseClasses} top-4 right-4`;
    }
  };

  const getAnimationClasses = () => {
    const baseTransition = 'transition-all duration-300 ease-in-out';

    if (isLeaving) {
      switch (position) {
        case 'top-left':
        case 'bottom-left':
          return `${baseTransition} transform -translate-x-full opacity-0`;
        case 'top-center':
        case 'bottom-center':
          return `${baseTransition} transform -translate-y-8 opacity-0`;
        default:
          return `${baseTransition} transform translate-x-full opacity-0`;
      }
    }

    if (isVisible) {
      return `${baseTransition} transform translate-x-0 translate-y-0 opacity-100`;
    }

    // Initial state
    switch (position) {
      case 'top-left':
      case 'bottom-left':
        return `${baseTransition} transform -translate-x-full opacity-0`;
      case 'top-center':
      case 'bottom-center':
        return `${baseTransition} transform -translate-y-8 opacity-0`;
      default:
        return `${baseTransition} transform translate-x-full opacity-0`;
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const styles = getTypeStyles();

  return (
    <div
      className={cn(getPositionClasses(), getAnimationClasses())}
      style={{ maxWidth }}
      role="alert"
      aria-live={notification.priority === 'critical' ? 'assertive' : 'polite'}
      aria-atomic="true"
    >
      <Card className={cn('shadow-lg', styles.bg)}>
        {/* Progress bar for timed notifications */}
        {notification.duration && notification.duration > 0 && (
          <div className="h-1 w-full bg-border rounded-t-lg overflow-hidden" aria-hidden="true">
            <div
              className={`h-full transition-all duration-100 ease-linear ${styles.accent}`}
              style={{ width: `${progress}%` }}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Time remaining for notification"
            />
          </div>
        )}

        <div className="p-4">
          <div className="flex items-start space-x-3">
            {/* Left accent bar for critical notifications */}
            {notification.priority === 'critical' && <div className={`w-1 h-full ${styles.accent} rounded-full`} />}

            {/* Icon */}
            <div className={cn('flex-shrink-0 mt-0.5', styles.icon)}>{getTypeIcon()}</div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Header */}
              <div className="flex items-start justify-between mb-1">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="text-sm font-semibold text-foreground">{notification.title}</h4>
                    {notification.priority === 'critical' && (
                      <Badge variant="destructive" className="text-xs">
                        Critical
                      </Badge>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>
                </div>

                {/* Close button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDismiss}
                  className="flex-shrink-0 h-6 w-6 p-0 hover:bg-accent"
                  aria-label="Dismiss notification"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                  <span className="sr-only">Dismiss notification</span>
                </Button>
              </div>

              {/* Image preview for content notifications */}
              {notification.metadata?.imageUrl && (
                <div className="mb-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={notification.metadata.imageUrl}
                    alt={`${notification.title} preview image`}
                    className="w-full h-20 object-cover rounded-lg"
                    loading="lazy"
                  />
                </div>
              )}

              {/* Actions */}
              {enableInteraction && notification.actions && notification.actions.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
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
                      onClick={() => handleAction(action.id)}
                      className="text-xs h-7 flex items-center space-x-1"
                    >
                      {action.icon}
                      <span>{action.label}</span>
                    </Button>
                  ))}
                </div>
              )}

              {/* Metadata */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center space-x-2">
                  {getCategoryIcon()}
                  <span className="capitalize">{notification.category}</span>
                  {showTimestamp && (
                    <>
                      <Clock className="w-3 h-3" />
                      <span>{formatTime(notification.timestamp)}</span>
                    </>
                  )}
                </div>

                {notification.metadata?.source && (
                  <span className="text-xs opacity-60">{notification.metadata.source}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// Toast Container Component
export interface ToastContainerProps {
  notifications: ToastNotification[];
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  maxNotifications?: number;
  stackDirection?: 'up' | 'down';
  spacing?: number;
}

export function ToastContainer({
  notifications,
  position = 'top-right',
  maxNotifications = 5,
  stackDirection = 'down',
  spacing = 12,
}: ToastContainerProps) {
  const visibleNotifications = notifications.slice(0, maxNotifications);

  const getContainerClasses = () => {
    const baseClasses = 'fixed z-50 pointer-events-none';
    switch (position) {
      case 'top-left':
        return `${baseClasses} top-4 left-4`;
      case 'top-center':
        return `${baseClasses} top-4 left-1/2 transform -translate-x-1/2`;
      case 'top-right':
        return `${baseClasses} top-4 right-4`;
      case 'bottom-left':
        return `${baseClasses} bottom-4 left-4`;
      case 'bottom-center':
        return `${baseClasses} bottom-4 left-1/2 transform -translate-x-1/2`;
      case 'bottom-right':
        return `${baseClasses} bottom-4 right-4`;
      default:
        return `${baseClasses} top-4 right-4`;
    }
  };

  return (
    <div className={getContainerClasses()}>
      <div
        className={`flex ${stackDirection === 'up' ? 'flex-col-reverse' : 'flex-col'} space-y-${spacing / 4}`}
        style={{ gap: `${spacing}px` }}
      >
        {visibleNotifications.map((notification, index) => (
          <div
            key={notification.id}
            className="pointer-events-auto"
            style={{
              transform: `scale(${1 - index * 0.02})`,
              zIndex: 1000 - index,
            }}
          >
            <NotificationToast notification={notification} position={position} />
          </div>
        ))}
      </div>
    </div>
  );
}

// Hook for managing toast notifications
export function useToastNotifications() {
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);

  const addNotification = useCallback((notification: Omit<ToastNotification, 'id' | 'timestamp'>) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date();

    const newNotification: ToastNotification = {
      ...notification,
      id,
      timestamp,
      duration: notification.duration ?? 5000, // Default 5 seconds
      onDismiss: (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
        notification.onDismiss?.(id);
      },
    };

    setNotifications(prev => [newNotification, ...prev]);
    return id;
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Quick notification functions
  const showSuccess = useCallback(
    (title: string, message: string, options?: Partial<ToastNotification>) => {
      return addNotification({
        title,
        message,
        type: 'success',
        category: 'system',
        priority: 'low',
        ...options,
      });
    },
    [addNotification]
  );

  const showError = useCallback(
    (title: string, message: string, options?: Partial<ToastNotification>) => {
      return addNotification({
        title,
        message,
        type: 'error',
        category: 'system',
        priority: 'high',
        duration: 8000, // Longer duration for errors
        ...options,
      });
    },
    [addNotification]
  );

  const showWarning = useCallback(
    (title: string, message: string, options?: Partial<ToastNotification>) => {
      return addNotification({
        title,
        message,
        type: 'warning',
        category: 'system',
        priority: 'medium',
        ...options,
      });
    },
    [addNotification]
  );

  const showInfo = useCallback(
    (title: string, message: string, options?: Partial<ToastNotification>) => {
      return addNotification({
        title,
        message,
        type: 'info',
        category: 'system',
        priority: 'low',
        ...options,
      });
    },
    [addNotification]
  );

  const showWatchlistUpdate = useCallback(
    (title: string, message: string, actions?: ToastNotification['actions']) => {
      return addNotification({
        title,
        message,
        type: 'info',
        category: 'watchlist',
        priority: 'medium',
        actions: actions || [
          {
            id: 'view',
            label: 'View',
            type: 'primary',
            icon: <Eye className="w-3 h-3" />,
            action: () => {},
          },
          {
            id: 'watch',
            label: 'Watch Now',
            type: 'secondary',
            icon: <Play className="w-3 h-3" />,
            action: () => {},
          },
        ],
      });
    },
    [addNotification]
  );

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAll,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showWatchlistUpdate,
  };
}
