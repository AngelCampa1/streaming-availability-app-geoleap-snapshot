'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, RefreshCw, AlertCircle, FileCheck, TrendingDown, Plus } from 'lucide-react';
import { DashboardStats } from '@/lib/seo/types';

interface QuickActionsProps {
  stats: DashboardStats;
  onAction: (action: string) => void;
}

export function QuickActions({ stats, onAction }: QuickActionsProps) {
  const actions = [
    {
      id: 'generate-pages',
      title: 'Generate New Pages',
      description: 'Start batch page generation',
      icon: Plus,
      variant: 'default' as const,
      onClick: () => onAction('generate-pages'),
    },
    {
      id: 'review-pending',
      title: 'Review Pending',
      description: `${stats.quickActions.pendingReviews} pages need review`,
      icon: FileCheck,
      variant: 'outline' as const,
      badge: stats.quickActions.pendingReviews,
      onClick: () => onAction('review-pending'),
    },
    {
      id: 'fix-failures',
      title: 'Fix Failed Jobs',
      description: `${stats.quickActions.failedJobs} jobs need attention`,
      icon: AlertCircle,
      variant: 'outline' as const,
      badge: stats.quickActions.failedJobs,
      badgeVariant: 'destructive' as const,
      onClick: () => onAction('fix-failures'),
    },
    {
      id: 'optimize-performance',
      title: 'Optimize Performance',
      description: `${stats.quickActions.lowPerformingPages} underperforming pages`,
      icon: TrendingDown,
      variant: 'outline' as const,
      badge: stats.quickActions.lowPerformingPages,
      badgeVariant: 'secondary' as const,
      onClick: () => onAction('optimize-performance'),
    },
    {
      id: 'refresh-cache',
      title: 'Refresh Cache',
      description: 'Clear and warm cache',
      icon: RefreshCw,
      variant: 'outline' as const,
      onClick: () => onAction('refresh-cache'),
    },
    {
      id: 'run-diagnostics',
      title: 'Run Diagnostics',
      description: 'System health check',
      icon: Play,
      variant: 'outline' as const,
      onClick: () => onAction('run-diagnostics'),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Common tasks and system operations</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {actions.map(action => {
            const Icon = action.icon;
            return (
              <Button
                key={action.id}
                variant={action.variant}
                className="h-auto flex-col items-start p-4 text-left"
                onClick={action.onClick}
              >
                <div className="flex w-full items-center justify-between">
                  <Icon className="h-4 w-4" />
                  {action.badge !== undefined && action.badge > 0 && (
                    <Badge variant={action.badgeVariant || 'secondary'} className="text-xs">
                      {action.badge}
                    </Badge>
                  )}
                </div>
                <div className="mt-2 w-full">
                  <div className="font-medium">{action.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">{action.description}</div>
                </div>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
