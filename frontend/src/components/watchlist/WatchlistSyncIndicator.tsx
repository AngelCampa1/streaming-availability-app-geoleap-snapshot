// Real-time Sync Status Indicator Component

'use client';

import React from 'react';
import { WatchlistSyncStatus } from '@/types/watchlist';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { Wifi, WifiOff, RefreshCw, AlertCircle, Clock, Signal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface WatchlistSyncIndicatorProps {
  syncStatus: WatchlistSyncStatus;
  onForceSync?: () => void;
  className?: string;
}

export const WatchlistSyncIndicator: React.FC<WatchlistSyncIndicatorProps> = ({
  syncStatus,
  onForceSync,
  className,
}) => {
  // Get connection status icon and color
  const getConnectionIcon = () => {
    switch (syncStatus.connectionQuality) {
      case 'excellent':
        return <Wifi className="h-4 w-4 text-success" />;
      case 'good':
        return <Signal className="h-4 w-4 text-success" />;
      case 'poor':
        return <AlertCircle className="h-4 w-4 text-warning" />;
      case 'disconnected':
        return <WifiOff className="h-4 w-4 text-error" />;
      default:
        return <WifiOff className="h-4 w-4 text-muted-foreground" />;
    }
  };

  // Get connection status text
  const getConnectionText = () => {
    if (!syncStatus.isConnected) {
      return 'Disconnected';
    }

    if (syncStatus.syncInProgress) {
      return 'Syncing...';
    }

    if (syncStatus.pendingChanges > 0) {
      return `${syncStatus.pendingChanges} pending changes`;
    }

    return 'All synced';
  };

  // Get status badge variant
  const getStatusVariant = () => {
    if (!syncStatus.isConnected) return 'destructive';
    if (syncStatus.pendingChanges > 0) return 'secondary';
    return 'default';
  };

  // Format last sync time
  const formatLastSync = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return format(date, 'MMM dd, HH:mm');
  };

  return (
    <TooltipProvider>
      <div className={cn('flex items-center justify-between px-4 py-2 bg-muted/50', className)}>
        {/* Connection Status */}
        <div className="flex items-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2">
                {getConnectionIcon()}
                <Badge variant={getStatusVariant()} className="text-xs">
                  {getConnectionText()}
                </Badge>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-sm">
                <div className="font-semibold mb-1">Connection Status</div>
                <div>Quality: {syncStatus.connectionQuality}</div>
                <div>Connected: {syncStatus.isConnected ? 'Yes' : 'No'}</div>
                <div>Last sync: {formatLastSync(syncStatus.lastSync)}</div>
                {syncStatus.pendingChanges > 0 && <div>Pending: {syncStatus.pendingChanges} changes</div>}
              </div>
            </TooltipContent>
          </Tooltip>

          {/* Sync Progress */}
          {syncStatus.syncInProgress && (
            <div className="flex items-center gap-2">
              <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
              <div className="w-20">
                <Progress value={75} className="h-1" />
              </div>
            </div>
          )}
        </div>

        {/* Last Sync Time */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>Last sync: {formatLastSync(syncStatus.lastSync)}</span>
          </div>

          {/* Force Sync Button */}
          {onForceSync && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={onForceSync}
                  disabled={syncStatus.syncInProgress}
                >
                  <RefreshCw className={cn('h-3 w-3', syncStatus.syncInProgress && 'animate-spin')} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <span>Force sync</span>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};
