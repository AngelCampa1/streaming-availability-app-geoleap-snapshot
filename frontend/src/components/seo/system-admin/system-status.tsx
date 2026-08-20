'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw, Server, Database, Cpu, HardDrive, Wifi } from 'lucide-react';
import { SystemStatus as SystemStatusType } from '@/lib/seo/types';

interface SystemStatusProps {
  status: SystemStatusType;
  onRefresh: () => void;
  refreshing: boolean;
}

export function SystemStatus({ status, onRefresh, refreshing }: SystemStatusProps) {
  const getStatusIcon = (statusValue: string) => {
    switch (statusValue) {
      case 'healthy':
        return CheckCircle2;
      case 'warning':
        return AlertTriangle;
      case 'critical':
        return XCircle;
      default:
        return AlertTriangle;
    }
  };

  const getStatusColor = (statusValue: string) => {
    switch (statusValue) {
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

  const getBadgeVariant = (statusValue: string) => {
    switch (statusValue) {
      case 'healthy':
        return 'default' as const;
      case 'warning':
        return 'secondary' as const;
      case 'critical':
        return 'destructive' as const;
      default:
        return 'outline' as const;
    }
  };

  const getComponentIcon = (name: string) => {
    if (name.toLowerCase().includes('database')) return Database;
    if (name.toLowerCase().includes('server') || name.toLowerCase().includes('api')) return Server;
    if (name.toLowerCase().includes('cache')) return HardDrive;
    return Wifi;
  };

  const formatUptime = (uptime: number) => {
    const days = Math.floor(uptime / (24 * 60 * 60));
    const hours = Math.floor((uptime % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((uptime % (60 * 60)) / 60);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const OverallIcon = getStatusIcon(status.overall);

  return (
    <div className="space-y-6">
      {/* Overall Status */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <OverallIcon className={`h-5 w-5 ${getStatusColor(status.overall)}`} />
              <span>System Status</span>
            </CardTitle>
            <CardDescription>Last checked: {new Date().toLocaleString()}</CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={getBadgeVariant(status.overall)} className="capitalize">
              {status.overall}
            </Badge>
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* System Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatUptime(status.metrics.uptime)}</div>
            <p className="text-xs text-muted-foreground">
              {((status.metrics.uptime / (30 * 24 * 60 * 60)) * 100).toFixed(2)}% this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            <Wifi className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status.metrics.responseTime}ms</div>
            <p className="text-xs text-muted-foreground">Average response time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status.metrics.memoryUsage.toFixed(1)}%</div>
            <Progress value={status.metrics.memoryUsage} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status.metrics.cpuUsage.toFixed(1)}%</div>
            <Progress value={status.metrics.cpuUsage} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disk Usage</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status.metrics.diskUsage.toFixed(1)}%</div>
            <Progress value={status.metrics.diskUsage} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Connections</CardTitle>
            <Wifi className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status.metrics.activeConnections}</div>
            <p className="text-xs text-muted-foreground">Current connections</p>
          </CardContent>
        </Card>
      </div>

      {/* Component Status */}
      <Card>
        <CardHeader>
          <CardTitle>Component Health</CardTitle>
          <CardDescription>Status of individual system components</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {status.components.map((component, index) => {
              const ComponentIcon = getComponentIcon(component.name);
              const StatusIcon = getStatusIcon(component.status);

              return (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <ComponentIcon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{component.name}</div>
                      {component.message && <div className="text-xs text-muted-foreground">{component.message}</div>}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-xs text-muted-foreground">
                      {new Date(component.lastCheck).toLocaleTimeString()}
                    </div>
                    <Badge variant={getBadgeVariant(component.status)}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {component.status}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Background Jobs & Cache Status */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Background Jobs</CardTitle>
            <CardDescription>Queue status and job processing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm">Pending</span>
                <Badge variant="secondary">{status.backgroundJobs.pending}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Running</span>
                <Badge variant="default">{status.backgroundJobs.running}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Failed</span>
                <Badge variant={status.backgroundJobs.failed > 0 ? 'destructive' : 'outline'}>
                  {status.backgroundJobs.failed}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cache Performance</CardTitle>
            <CardDescription>Cache hit ratio and statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Hit Ratio</span>
                <div className="text-right">
                  <div className="font-medium">{status.cache.hitRatio.toFixed(1)}%</div>
                  <Progress value={status.cache.hitRatio} className="h-1 w-16" />
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Size</span>
                <span className="font-medium">{(status.cache.size / 1024 / 1024).toFixed(1)}MB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Evictions</span>
                <span className="font-medium">{status.cache.evictions}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
