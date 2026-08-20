'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Server,
  Database,
  Zap,
  Wifi,
  RefreshCw,
  Bell,
  TrendingUp,
  Monitor,
  Cloud,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// Types for monitoring data
interface SystemHealthMetrics {
  overallStatus: string;
  healthScore: number;
  cpuUsagePercent: number;
  memoryUsageMB: number;
  availableMemoryMB: number;
  databaseHealthy: boolean;
  redisHealthy: boolean;
  uptimeSeconds: number;
  activeConnections: number;
  requestsPerMinute: number;
  errorRate: number;
  lastUpdated: string;
}

interface InfrastructureMetrics {
  azureRegion: string;
  appServiceCpuPercentage: number;
  appServiceMemoryPercentage: number;
  sqlDatabaseDtuPercentage: number;
  sqlDatabaseStoragePercentage: number;
  cdnCacheHitRatio: number;
  cdnBandwidthUsageMbps: number;
  networkLatencyMs: number;
  diskIoOperationsPerSecond: number;
  lastUpdated: string;
}

interface MonitoringAlert {
  id: number;
  title: string;
  description: string;
  severity: string;
  category: string;
  source: string;
  status: string;
  createdAt: string;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}

interface AlertMetrics {
  activeAlerts: number;
  alerts24Hours: number;
  alerts7Days: number;
  criticalAlerts24Hours: number;
  warningAlerts24Hours: number;
  infoAlerts24Hours: number;
  averageResolutionTimeMinutes: number;
  mostFrequentAlertType: string;
  lastUpdated: string;
}

interface MonitoringDashboardProps {
  className?: string;
}

const REFRESH_INTERVAL = 30000; // 30 seconds

export default function SystemMonitoringDashboard({ className }: MonitoringDashboardProps) {
  // State management
  const [systemHealth, setSystemHealth] = useState<SystemHealthMetrics | null>(null);
  const [infrastructure, setInfrastructure] = useState<InfrastructureMetrics | null>(null);
  const [alerts, setAlerts] = useState<MonitoringAlert[]>([]);
  const [alertMetrics, setAlertMetrics] = useState<AlertMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');

  // Fetch monitoring data
  const fetchMonitoringData = useCallback(async () => {
    try {
      setError(null);

      const [healthResponse, infrastructureResponse, alertsResponse, alertMetricsResponse] = await Promise.all([
        fetch('/api/monitoring/health'),
        fetch('/api/monitoring/infrastructure'),
        fetch('/api/monitoring/alerts/active'),
        fetch('/api/monitoring/alerts/metrics'),
      ]);

      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        setSystemHealth(healthData);
      }

      if (infrastructureResponse.ok) {
        const infraData = await infrastructureResponse.json();
        setInfrastructure(infraData);
      }

      if (alertsResponse.ok) {
        const alertsData = await alertsResponse.json();
        setAlerts(alertsData);
      }

      if (alertMetricsResponse.ok) {
        const metricsData = await alertMetricsResponse.json();
        setAlertMetrics(metricsData);
      }
    } catch (err) {
      setError('Failed to fetch monitoring data');
      console.error('Error fetching monitoring data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Setup auto-refresh
  useEffect(() => {
    fetchMonitoringData();

    if (autoRefresh) {
      const interval = setInterval(fetchMonitoringData, REFRESH_INTERVAL);
      return () => clearInterval(interval);
    }
  }, [fetchMonitoringData, autoRefresh]);

  // Setup SignalR connection for real-time updates
  useEffect(() => {
    // Note: In a real implementation, you would establish SignalR connection here
    // For now, we'll simulate connection status
    setConnectionStatus('connected');
  }, []);

  // Helper functions
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'healthy':
      case 'good':
        return 'text-success bg-success/10';
      case 'warning':
      case 'needs-improvement':
        return 'text-warning bg-warning/10';
      case 'critical':
      case 'poor':
        return 'text-error bg-error/10';
      default:
        return 'text-muted-foreground bg-muted';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'text-error bg-error/10';
      case 'warning':
        return 'text-warning bg-warning/10';
      case 'info':
        return 'text-primary bg-primary/10';
      default:
        return 'text-muted-foreground bg-muted';
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const acknowledgeAlert = async (alertId: number) => {
    try {
      const response = await fetch(`/api/monitoring/alerts/${alertId}/acknowledge`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          alertId,
          acknowledgedBy: 'Current User', // Replace with actual user info
        }),
      });

      if (response.ok) {
        // Refresh alerts
        fetchMonitoringData();
      }
    } catch (err) {
      console.error('Error acknowledging alert:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2 text-lg">Loading monitoring data...</span>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">System Monitoring</h1>
          <p className="text-muted-foreground">Real-time system health and performance monitoring</p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Connection Status */}
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${connectionStatus === 'connected' ? 'bg-success' : 'bg-error'}`}
            />
            <span className="text-sm text-muted-foreground">
              {connectionStatus === 'connected' ? 'Real-time' : 'Disconnected'}
            </span>
          </div>

          {/* Auto-refresh Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="flex items-center gap-2"
          >
            {autoRefresh ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            Auto-refresh {autoRefresh ? 'On' : 'Off'}
          </Button>

          {/* Manual Refresh */}
          <Button variant="outline" size="sm" onClick={fetchMonitoringData} className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert className="border-error/20 bg-error/10">
          <AlertTriangle className="h-4 w-4 text-error" />
          <AlertDescription className="text-error">{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Dashboard Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="infrastructure">Infrastructure</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* System Health Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Overall Health */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Health</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemHealth?.healthScore || 0}%</div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className={getStatusColor(systemHealth?.overallStatus || 'unknown')}>
                    {systemHealth?.overallStatus || 'Unknown'}
                  </Badge>
                </div>
                <Progress value={systemHealth?.healthScore || 0} className="mt-3" />
              </CardContent>
            </Card>

            {/* CPU Usage */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemHealth?.cpuUsagePercent.toFixed(1) || 0}%</div>
                <Progress value={systemHealth?.cpuUsagePercent || 0} className="mt-3" />
              </CardContent>
            </Card>

            {/* Memory Usage */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
                <Server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatBytes((systemHealth?.memoryUsageMB || 0) * 1024 * 1024)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Available: {formatBytes((systemHealth?.availableMemoryMB || 0) * 1024 * 1024)}
                </p>
                <Progress
                  value={
                    systemHealth?.memoryUsageMB && systemHealth?.availableMemoryMB
                      ? (systemHealth.memoryUsageMB / (systemHealth.memoryUsageMB + systemHealth.availableMemoryMB)) *
                        100
                      : 0
                  }
                  className="mt-3"
                />
              </CardContent>
            </Card>

            {/* Active Alerts */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
                <Bell className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-error">{alertMetrics?.activeAlerts || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {alertMetrics?.criticalAlerts24Hours || 0} critical in 24h
                </p>
              </CardContent>
            </Card>
          </div>

          {/* System Status Indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Database</p>
                  <div className="flex items-center gap-2 mt-1">
                    {systemHealth?.databaseHealthy ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-success" />
                        <span className="text-sm text-success">Healthy</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 text-error" />
                        <span className="text-sm text-error">Unhealthy</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <Wifi className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Redis Cache</p>
                  <div className="flex items-center gap-2 mt-1">
                    {systemHealth?.redisHealthy ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-success" />
                        <span className="text-sm text-success">Connected</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 text-error" />
                        <span className="text-sm text-error">Disconnected</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-success" />
                <div>
                  <p className="text-sm font-medium">Uptime</p>
                  <p className="text-sm text-muted-foreground mt-1">{formatUptime(systemHealth?.uptimeSeconds || 0)}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Request Rate</p>
                  <p className="text-sm text-muted-foreground mt-1">{systemHealth?.requestsPerMinute.toFixed(1) || 0}/min</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Recent Alerts */}
          {alerts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Recent Alerts
                </CardTitle>
                <CardDescription>Most recent system alerts requiring attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {alerts.slice(0, 5).map(alert => (
                    <div key={alert.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge className={getSeverityColor(alert.severity)}>{alert.severity}</Badge>
                        <div>
                          <p className="font-medium">{alert.title}</p>
                          <p className="text-sm text-muted-foreground">{alert.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      {alert.status === 'Active' && (
                        <Button variant="outline" size="sm" onClick={() => acknowledgeAlert(alert.id)}>
                          Acknowledge
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Infrastructure Tab */}
        <TabsContent value="infrastructure" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Azure App Service */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cloud className="h-5 w-5" />
                  Azure App Service
                </CardTitle>
                <CardDescription>Region: {infrastructure?.azureRegion || 'Unknown'}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>CPU Usage</span>
                    <span>{infrastructure?.appServiceCpuPercentage.toFixed(1) || 0}%</span>
                  </div>
                  <Progress value={infrastructure?.appServiceCpuPercentage || 0} />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Memory Usage</span>
                    <span>{infrastructure?.appServiceMemoryPercentage.toFixed(1) || 0}%</span>
                  </div>
                  <Progress value={infrastructure?.appServiceMemoryPercentage || 0} />
                </div>
              </CardContent>
            </Card>

            {/* Azure SQL Database */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Azure SQL Database
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>DTU Usage</span>
                    <span>{infrastructure?.sqlDatabaseDtuPercentage.toFixed(1) || 0}%</span>
                  </div>
                  <Progress value={infrastructure?.sqlDatabaseDtuPercentage || 0} />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Storage Usage</span>
                    <span>{infrastructure?.sqlDatabaseStoragePercentage.toFixed(1) || 0}%</span>
                  </div>
                  <Progress value={infrastructure?.sqlDatabaseStoragePercentage || 0} />
                </div>
              </CardContent>
            </Card>

            {/* CDN Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wifi className="h-5 w-5" />
                  CDN Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Cache Hit Ratio</span>
                    <span>{((infrastructure?.cdnCacheHitRatio || 0) * 100).toFixed(1)}%</span>
                  </div>
                  <Progress value={(infrastructure?.cdnCacheHitRatio || 0) * 100} />
                </div>
                <div className="flex justify-between text-sm">
                  <span>Bandwidth Usage</span>
                  <span>{infrastructure?.cdnBandwidthUsageMbps.toFixed(1) || 0} Mbps</span>
                </div>
              </CardContent>
            </Card>

            {/* Network & I/O */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  Network & I/O
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span>Network Latency</span>
                  <span>{infrastructure?.networkLatencyMs.toFixed(1) || 0}ms</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Disk I/O Operations</span>
                  <span>{infrastructure?.diskIoOperationsPerSecond.toFixed(0) || 0} IOPS</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-error">{alertMetrics?.activeAlerts || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">24h Alert Volume</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{alertMetrics?.alerts24Hours || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {alertMetrics?.criticalAlerts24Hours || 0} critical
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Avg Resolution Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{alertMetrics?.averageResolutionTimeMinutes.toFixed(1) || 0}m</div>
              </CardContent>
            </Card>
          </div>

          {/* Alert List */}
          <Card>
            <CardHeader>
              <CardTitle>All Alerts</CardTitle>
              <CardDescription>System alerts requiring attention or acknowledgment</CardDescription>
            </CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-success mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No Active Alerts</h3>
                  <p className="text-muted-foreground">All systems are operating normally.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {alerts.map(alert => (
                    <div key={alert.id} className="border border-border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge className={getSeverityColor(alert.severity)}>{alert.severity}</Badge>
                            <Badge variant="outline">{alert.category}</Badge>
                            <span className="text-sm text-muted-foreground">{alert.source}</span>
                          </div>
                          <h4 className="font-medium text-foreground mb-1">{alert.title}</h4>
                          <p className="text-sm text-muted-foreground mb-2">{alert.description}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Created: {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}</span>
                            {alert.acknowledgedBy && <span>Acknowledged by: {alert.acknowledgedBy}</span>}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 ml-4">
                          <Badge variant={alert.status === 'Active' ? 'destructive' : 'secondary'}>
                            {alert.status}
                          </Badge>
                          {alert.status === 'Active' && (
                            <Button variant="outline" size="sm" onClick={() => acknowledgeAlert(alert.id)}>
                              Acknowledge
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Metrics Chart */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Performance Trends</CardTitle>
                <CardDescription>System performance metrics over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={[]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="cpu" stroke="hsl(var(--chart-1))" name="CPU %" />
                      <Line type="monotone" dataKey="memory" stroke="hsl(var(--chart-2))" name="Memory %" />
                      <Line type="monotone" dataKey="responseTime" stroke="hsl(var(--chart-3))" name="Response Time (ms)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
