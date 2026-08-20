'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  X,
  CheckCircle,
  AlertTriangle,
  Info,
  AlertCircle,
  Bell,
  Star,
  Clock,
  Share2,
  Bookmark,
  MapPin,
  User,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ModalNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  category: 'watchlist' | 'system' | 'security' | 'social' | 'billing' | 'content';
  priority: 'low' | 'medium' | 'high' | 'critical';
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
    videoUrl?: string;
    url?: string;
    source?: string;
    location?: string;
    tags?: string[];
    relatedContent?: Array<{
      id: string;
      title: string;
      imageUrl?: string;
    }>;
  };
  expandedContent?: {
    description?: string;
    details?: Record<string, any>;
    media?: Array<{
      type: 'image' | 'video';
      url: string;
      caption?: string;
    }>;
  };
}

interface NotificationModalProps {
  notification: ModalNotification;
  isOpen: boolean;
  onClose: () => void;
  onAction?: (notificationId: string, actionId: string) => void;
  showFullContent?: boolean;
  enableSharing?: boolean;
}

export function NotificationModal({
  notification,
  isOpen,
  onClose,
  onAction,
  showFullContent = true,
  enableSharing = true,
}: NotificationModalProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [_currentMediaIndex, setCurrentMediaIndex] = useState(0);

  const handleAction = (actionId: string) => {
    onAction?.(notification.id, actionId);
    onClose();
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: notification.title,
        text: notification.message,
        url: notification.metadata?.url || window.location.href,
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(
        `${notification.title}\n${notification.message}\n${notification.metadata?.url || window.location.href}`
      );
    }
  };

  const getTypeStyles = () => {
    switch (notification.type) {
      case 'success':
        return {
          bg: 'bg-success/10',
          border: 'border-success/20',
          icon: 'text-success',
          accent: 'bg-success',
        };
      case 'warning':
        return {
          bg: 'bg-warning/10',
          border: 'border-warning/20',
          icon: 'text-warning',
          accent: 'bg-warning',
        };
      case 'error':
        return {
          bg: 'bg-error/10',
          border: 'border-error/20',
          icon: 'text-error',
          accent: 'bg-error',
        };
      default:
        return {
          bg: 'bg-primary/10',
          border: 'border-primary/20',
          icon: 'text-primary',
          accent: 'bg-primary',
        };
    }
  };

  const getTypeIcon = () => {
    const iconClass = 'w-6 h-6';
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
      case 'billing':
        return <User className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleString();
  };

  const styles = getTypeStyles();
  const hasExpandedContent =
    notification.expandedContent &&
    (notification.expandedContent.description ||
      notification.expandedContent.details ||
      (notification.expandedContent.media && notification.expandedContent.media.length > 0));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn('max-w-2xl max-h-[80vh] p-0 overflow-hidden', styles.bg, styles.border)}>
        {/* Header */}
        <DialogHeader className="p-6 pb-4">
          <div className="flex items-start space-x-4">
            <div className={cn('flex-shrink-0 mt-1', styles.icon)}>{getTypeIcon()}</div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <DialogTitle className="text-xl font-bold text-foreground pr-4">{notification.title}</DialogTitle>

                <div className="flex items-center space-x-2 flex-shrink-0">
                  {notification.priority === 'critical' && (
                    <Badge variant="destructive" className="text-xs">
                      Critical
                    </Badge>
                  )}

                  {hasExpandedContent && showFullContent && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="h-8 w-8 p-0"
                    >
                      {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </Button>
                  )}

                  <DialogClose asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <X className="w-4 h-4" />
                    </Button>
                  </DialogClose>
                </div>
              </div>

              <DialogDescription className="text-foreground text-base mb-3">{notification.message}</DialogDescription>

              {/* Metadata */}
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <div className="flex items-center space-x-1">
                  {getCategoryIcon()}
                  <span className="capitalize">{notification.category}</span>
                </div>

                <div className="flex items-center space-x-1">
                  <Clock className="w-4 h-4" />
                  <span>{formatTime(notification.timestamp)}</span>
                </div>

                {notification.metadata?.location && (
                  <div className="flex items-center space-x-1">
                    <MapPin className="w-4 h-4" />
                    <span>{notification.metadata.location}</span>
                  </div>
                )}

                {notification.metadata?.source && (
                  <Badge variant="outline" className="text-xs">
                    {notification.metadata.source}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <ScrollArea className={cn('flex-1', isExpanded ? 'h-96' : 'h-auto')}>
          <div className="px-6 pb-4 space-y-4">
            {/* Featured Media */}
            {notification.metadata?.imageUrl && (
              <div className="rounded-lg overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={notification.metadata.imageUrl}
                  alt={notification.title}
                  className="w-full h-48 object-cover"
                />
              </div>
            )}

            {notification.metadata?.videoUrl && (
              <div className="rounded-lg overflow-hidden bg-muted">
                <video controls className="w-full h-48 object-cover" poster={notification.metadata.imageUrl}>
                  <source src={notification.metadata.videoUrl} />
                  Your browser does not support the video tag.
                </video>
              </div>
            )}

            {/* Tags */}
            {notification.metadata?.tags && notification.metadata.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {notification.metadata.tags.map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Expanded Content */}
            {isExpanded && hasExpandedContent && (
              <div className="space-y-4 pt-4 border-t">
                {notification.expandedContent?.description && (
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Details</h4>
                    <p className="text-foreground">{notification.expandedContent.description}</p>
                  </div>
                )}

                {notification.expandedContent?.details && (
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Additional Information</h4>
                    <div className="space-y-2">
                      {Object.entries(notification.expandedContent.details).map(([key, value]) => (
                        <div key={key} className="flex justify-between text-sm">
                          <span className="text-muted-foreground capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}:
                          </span>
                          <span className="text-foreground">
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {notification.expandedContent?.media && notification.expandedContent.media.length > 0 && (
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Media Gallery</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {notification.expandedContent.media.map((media, index) => (
                        <div key={index} className="relative rounded-lg overflow-hidden bg-muted">
                          {media.type === 'image' ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={media.url}
                              alt={media.caption || `Media ${index + 1}`}
                              className="w-full h-24 object-cover cursor-pointer"
                              onClick={() => setCurrentMediaIndex(index)}
                            />
                          ) : (
                            <video
                              src={media.url}
                              className="w-full h-24 object-cover cursor-pointer"
                              onClick={() => setCurrentMediaIndex(index)}
                            />
                          )}
                          {media.caption && (
                            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1">
                              {media.caption}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Related Content */}
            {notification.metadata?.relatedContent && notification.metadata.relatedContent.length > 0 && (
              <div className="pt-4 border-t">
                <h4 className="font-medium text-foreground mb-3">Related Content</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {notification.metadata.relatedContent.map(content => (
                    <Card key={content.id} className="p-3 hover:bg-accent cursor-pointer">
                      <div className="flex items-center space-x-3">
                        {content.imageUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={content.imageUrl} alt={content.title} className="w-12 h-12 object-cover rounded" />
                        )}
                        <div className="flex-1 min-w-0">
                          <h5 className="text-sm font-medium text-foreground truncate">{content.title}</h5>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 bg-muted">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-2">
              {enableSharing && (
                <Button variant="ghost" size="sm" onClick={handleShare} className="flex items-center space-x-1">
                  <Share2 className="w-4 h-4" />
                  <span>Share</span>
                </Button>
              )}

              <Button variant="ghost" size="sm" className="flex items-center space-x-1">
                <Bookmark className="w-4 h-4" />
                <span>Save</span>
              </Button>
            </div>

            <div className="flex items-center space-x-2">
              {notification.actions?.map(action => (
                <Button
                  key={action.id}
                  variant={
                    action.type === 'primary' ? 'default' : action.type === 'destructive' ? 'destructive' : 'outline'
                  }
                  size="sm"
                  onClick={() => handleAction(action.id)}
                  className="flex items-center space-x-1"
                >
                  {action.icon}
                  <span>{action.label}</span>
                </Button>
              ))}

              <DialogClose asChild>
                <Button variant="outline" size="sm">
                  Close
                </Button>
              </DialogClose>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Quick Modal Components
export interface QuickNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  actions?: Array<{
    label: string;
    action: () => void;
    type?: 'primary' | 'secondary' | 'destructive';
  }>;
}

export function QuickNotificationModal({
  isOpen,
  onClose,
  type,
  title,
  message,
  actions,
}: QuickNotificationModalProps) {
  const notification: ModalNotification = {
    id: 'quick-modal',
    title,
    message,
    type,
    category: 'system',
    priority: type === 'error' ? 'high' : 'medium',
    timestamp: new Date(),
    actions: actions?.map((action, index) => ({
      id: `action-${index}`,
      label: action.label,
      type: action.type || 'secondary',
      action: action.action,
    })),
  };

  return (
    <NotificationModal
      notification={notification}
      isOpen={isOpen}
      onClose={onClose}
      showFullContent={false}
      enableSharing={false}
    />
  );
}

// Hook for managing notification modals
export function useNotificationModal() {
  const [currentNotification, setCurrentNotification] = useState<ModalNotification | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const showModal = (notification: ModalNotification) => {
    setCurrentNotification(notification);
    setIsOpen(true);
  };

  const hideModal = () => {
    setIsOpen(false);
    setTimeout(() => setCurrentNotification(null), 200);
  };

  const showQuickModal = (
    type: 'info' | 'success' | 'warning' | 'error',
    title: string,
    message: string,
    actions?: QuickNotificationModalProps['actions']
  ) => {
    const notification: ModalNotification = {
      id: `quick-${Date.now()}`,
      title,
      message,
      type,
      category: 'system',
      priority: type === 'error' ? 'high' : 'medium',
      timestamp: new Date(),
      actions: actions?.map((action, index) => ({
        id: `action-${index}`,
        label: action.label,
        type: action.type || 'secondary',
        action: () => {
          action.action();
          hideModal();
        },
      })),
    };
    showModal(notification);
  };

  const ModalComponent = currentNotification ? (
    <NotificationModal notification={currentNotification} isOpen={isOpen} onClose={hideModal} />
  ) : null;

  return {
    showModal,
    hideModal,
    showQuickModal,
    ModalComponent,
    isOpen,
  };
}
