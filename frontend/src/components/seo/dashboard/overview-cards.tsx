'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Globe, Activity, Zap, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { DashboardStats } from '@/lib/seo/types';

interface OverviewCardsProps {
  stats: DashboardStats;
}

export function OverviewCards({ stats }: OverviewCardsProps) {
  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy':
        return 'text-success';
      case 'warning':
        return 'text-warning';
      case 'critical':
        return 'text-error';
      default:
        return 'text-muted-foreground';
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy':
        return CheckCircle2;
      case 'warning':
        return AlertTriangle;
      case 'critical':
        return AlertTriangle;
      default:
        return Activity;
    }
  };

  const HealthIcon = getHealthIcon(stats.systemHealth);

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Pages */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Pages</CardTitle>
          <Globe className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalPages.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">{stats.activePages.toLocaleString()} active</p>
          <div className="mt-2">
            <Progress value={(stats.activePages / stats.totalPages) * 100} className="h-1" />
          </div>
        </CardContent>
      </Card>

      {/* Recent Generation */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Recent Generation</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.recentGeneration}</div>
          <p className="text-xs text-muted-foreground">Pages generated today</p>
          <div className="mt-2 flex items-center space-x-2">
            <Badge variant="secondary" className="text-xs">
              +12% vs yesterday
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* System Health */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">System Health</CardTitle>
          <HealthIcon className={`h-4 w-4 ${getHealthColor(stats.systemHealth)}`} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold capitalize">{stats.systemHealth}</div>
          <p className="text-xs text-muted-foreground">{stats.performance.uptime}% uptime</p>
          <div className="mt-2">
            <Progress value={stats.performance.uptime} className="h-1" />
          </div>
        </CardContent>
      </Card>

      {/* Performance */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Performance</CardTitle>
          <Zap className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.performance.avgResponseTime}ms</div>
          <p className="text-xs text-muted-foreground">{stats.performance.cacheHitRatio}% cache hit ratio</p>
          <div className="mt-2">
            <Progress value={stats.performance.cacheHitRatio} className="h-1" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
