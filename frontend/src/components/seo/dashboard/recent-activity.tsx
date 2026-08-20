'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, AlertTriangle, Loader2, Globe } from 'lucide-react';
import { DashboardStats } from '@/lib/seo/types';

interface RecentActivityProps {
  stats: DashboardStats;
}

export function RecentActivity({ stats }: RecentActivityProps) {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'generation':
        return Globe;
      case 'publication':
        return CheckCircle2;
      case 'error':
        return AlertTriangle;
      default:
        return Loader2;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'generation':
        return 'text-primary';
      case 'publication':
        return 'text-success';
      case 'error':
        return 'text-error';
      default:
        return 'text-muted-foreground';
    }
  };

  const getBadgeVariant = (type: string) => {
    switch (type) {
      case 'generation':
        return 'default' as const;
      case 'publication':
        return 'secondary' as const;
      case 'error':
        return 'destructive' as const;
      default:
        return 'outline' as const;
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Latest system events and operations</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] w-full">
          <div className="space-y-4">
            {stats.recentActivity.map((activity, index) => {
              const Icon = getActivityIcon(activity.type);
              return (
                <div key={index} className="flex items-start space-x-3">
                  <div className={`mt-0.5 ${getActivityColor(activity.type)}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium leading-none">{activity.message}</p>
                      <Badge variant={getBadgeVariant(activity.type)}>{activity.type}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{formatTime(activity.timestamp)}</p>
                  </div>
                </div>
              );
            })}

            {stats.recentActivity.length === 0 && (
              <div className="text-center py-8">
                <div className="text-muted-foreground text-sm">No recent activity</div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
