'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  History,
  Search,
  Download,
  BarChart3,
  Clock,
  Bell,
  Eye,
  CheckCircle,
  AlertTriangle,
  Info,
  TrendingUp,
  PieChart,
  Activity,
} from 'lucide-react';
import { format, subDays, startOfWeek, startOfMonth } from 'date-fns';

export interface NotificationHistoryItem {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  category: 'watchlist' | 'system' | 'security' | 'social' | 'billing' | 'content';
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  readAt?: Date;
  archivedAt?: Date;
  deletedAt?: Date;
  interactionType?: 'viewed' | 'clicked' | 'dismissed' | 'acted';
  actionTaken?: string;
  deliveryChannel: 'push' | 'email' | 'in-app' | 'sms';
  deliveryStatus: 'delivered' | 'failed' | 'pending' | 'bounced';
  metadata?: {
    contentId?: string;
    userId?: string;
    source?: string;
    referenceId?: string;
    deviceType?: 'mobile' | 'desktop';
    browser?: string;
    location?: string;
  };
}

export interface NotificationAnalytics {
  totalSent: number;
  delivered: number;
  opened: number;
  clicked: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  categoryBreakdown: Record<string, number>;
  channelBreakdown: Record<string, number>;
  dailyStats: Array<{
    date: string;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
  }>;
}

interface NotificationHistoryProps {
  className?: string;
  maxItems?: number;
  showAnalytics?: boolean;
  onExport?: (data: NotificationHistoryItem[]) => void;
}

// Mock data
const mockHistoryData: NotificationHistoryItem[] = [
  {
    id: '1',
    title: 'New Episode Available',
    message: 'Breaking Bad Season 5 Episode 12 is now available',
    type: 'info',
    category: 'watchlist',
    priority: 'medium',
    timestamp: new Date('2024-01-15T10:30:00'),
    readAt: new Date('2024-01-15T10:35:00'),
    interactionType: 'clicked',
    actionTaken: 'watched',
    deliveryChannel: 'push',
    deliveryStatus: 'delivered',
    metadata: {
      contentId: 'breaking-bad-s5e12',
      deviceType: 'mobile',
      browser: 'Chrome',
      location: 'US',
    },
  },
  {
    id: '2',
    title: 'Security Alert',
    message: 'New login from unknown device',
    type: 'warning',
    category: 'security',
    priority: 'high',
    timestamp: new Date('2024-01-14T15:22:00'),
    readAt: new Date('2024-01-14T15:25:00'),
    interactionType: 'viewed',
    deliveryChannel: 'email',
    deliveryStatus: 'delivered',
    metadata: {
      deviceType: 'desktop',
      browser: 'Firefox',
      location: 'US',
    },
  },
  {
    id: '3',
    title: 'Content Expiring',
    message: 'The Office leaves Netflix in 3 days',
    type: 'warning',
    category: 'watchlist',
    priority: 'medium',
    timestamp: new Date('2024-01-13T09:00:00'),
    readAt: new Date('2024-01-13T09:15:00'),
    archivedAt: new Date('2024-01-13T09:16:00'),
    interactionType: 'dismissed',
    deliveryChannel: 'in-app',
    deliveryStatus: 'delivered',
    metadata: {
      contentId: 'the-office',
      deviceType: 'desktop',
      browser: 'Chrome',
    },
  },
  {
    id: '4',
    title: 'Payment Failed',
    message: 'Your subscription payment could not be processed',
    type: 'error',
    category: 'billing',
    priority: 'critical',
    timestamp: new Date('2024-01-12T14:30:00'),
    readAt: new Date('2024-01-12T16:45:00'),
    interactionType: 'acted',
    actionTaken: 'updated_payment',
    deliveryChannel: 'email',
    deliveryStatus: 'delivered',
    metadata: {
      deviceType: 'desktop',
      browser: 'Safari',
    },
  },
  {
    id: '5',
    title: 'System Maintenance',
    message: 'Scheduled maintenance tonight',
    type: 'info',
    category: 'system',
    priority: 'low',
    timestamp: new Date('2024-01-10T12:00:00'),
    deliveryChannel: 'in-app',
    deliveryStatus: 'delivered',
    metadata: {
      deviceType: 'mobile',
    },
  },
];

export function NotificationHistory({
  className = '',
  maxItems = 100,
  showAnalytics = true,
  onExport,
}: NotificationHistoryProps) {
  const [historyData] = useState<NotificationHistoryItem[]>(mockHistoryData);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedChannel, setSelectedChannel] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [activeTab, setActiveTab] = useState('history');

  // Filter and search logic
  const filteredData = useMemo(() => {
    const filtered = historyData.filter(item => {
      // Search filter
      const matchesSearch =
        !searchTerm ||
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.message.toLowerCase().includes(searchTerm.toLowerCase());

      // Category filter
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;

      // Channel filter
      const matchesChannel = selectedChannel === 'all' || item.deliveryChannel === selectedChannel;

      // Status filter
      const matchesStatus = selectedStatus === 'all' || item.deliveryStatus === selectedStatus;

      // Date range filter
      let matchesDate = true;
      if (dateRange !== 'all') {
        const now = new Date();
        let startDate: Date;

        switch (dateRange) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'week':
            startDate = startOfWeek(now);
            break;
          case 'month':
            startDate = startOfMonth(now);
            break;
          case '7days':
            startDate = subDays(now, 7);
            break;
          case '30days':
            startDate = subDays(now, 30);
            break;
          default:
            startDate = new Date(0);
        }

        matchesDate = item.timestamp >= startDate;
      }

      return matchesSearch && matchesCategory && matchesChannel && matchesStatus && matchesDate;
    });

    // Sort
    filtered.sort((a, b) => {
      let compareValue = 0;

      switch (sortBy) {
        case 'timestamp':
          compareValue = a.timestamp.getTime() - b.timestamp.getTime();
          break;
        case 'title':
          compareValue = a.title.localeCompare(b.title);
          break;
        case 'category':
          compareValue = a.category.localeCompare(b.category);
          break;
        case 'priority':
          const priorityOrder = { low: 0, medium: 1, high: 2, critical: 3 };
          compareValue = priorityOrder[a.priority] - priorityOrder[b.priority];
          break;
        default:
          break;
      }

      return sortOrder === 'desc' ? -compareValue : compareValue;
    });

    return filtered.slice(0, maxItems);
  }, [
    historyData,
    searchTerm,
    selectedCategory,
    selectedChannel,
    selectedStatus,
    dateRange,
    sortBy,
    sortOrder,
    maxItems,
  ]);

  // Analytics calculation
  const analytics = useMemo((): NotificationAnalytics => {
    const totalSent = historyData.length;
    const delivered = historyData.filter(item => item.deliveryStatus === 'delivered').length;
    const opened = historyData.filter(item => item.readAt).length;
    const clicked = historyData.filter(
      item => item.interactionType === 'clicked' || item.interactionType === 'acted'
    ).length;

    const deliveryRate = totalSent > 0 ? (delivered / totalSent) * 100 : 0;
    const openRate = delivered > 0 ? (opened / delivered) * 100 : 0;
    const clickRate = opened > 0 ? (clicked / opened) * 100 : 0;

    const categoryBreakdown = historyData.reduce(
      (acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const channelBreakdown = historyData.reduce(
      (acc, item) => {
        acc[item.deliveryChannel] = (acc[item.deliveryChannel] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // Generate daily stats for the last 7 days
    const dailyStats = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayData = historyData.filter(item => format(item.timestamp, 'yyyy-MM-dd') === dateStr);

      return {
        date: dateStr,
        sent: dayData.length,
        delivered: dayData.filter(item => item.deliveryStatus === 'delivered').length,
        opened: dayData.filter(item => item.readAt).length,
        clicked: dayData.filter(item => item.interactionType === 'clicked' || item.interactionType === 'acted').length,
      };
    }).reverse();

    return {
      totalSent,
      delivered,
      opened,
      clicked,
      deliveryRate,
      openRate,
      clickRate,
      categoryBreakdown,
      channelBreakdown,
      dailyStats,
    };
  }, [historyData]);

  const exportData = useCallback(() => {
    const exportItems = filteredData.map(item => ({
      ...item,
      timestamp: item.timestamp.toISOString(),
      readAt: item.readAt?.toISOString(),
      archivedAt: item.archivedAt?.toISOString(),
    }));

    if (onExport) {
      onExport(exportItems as unknown as NotificationHistoryItem[]);
    } else {
      // Default CSV export
      const csv = [
        'ID,Title,Message,Type,Category,Priority,Timestamp,Delivery Channel,Delivery Status,Read At,Interaction Type',
        ...exportItems.map(item =>
          [
            item.id,
            `"${item.title}"`,
            `"${item.message}"`,
            item.type,
            item.category,
            item.priority,
            item.timestamp,
            item.deliveryChannel,
            item.deliveryStatus,
            item.readAt || '',
            item.interactionType || '',
          ].join(',')
        ),
      ].join('\\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `notification-history-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }, [filteredData, onExport]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-warning" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-error" />;
      default:
        return <Info className="w-4 h-4 text-primary" />;
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'push':
        return <Bell className="w-4 h-4" />;
      case 'email':
        return <History className="w-4 h-4" />;
      case 'sms':
        return <History className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-success/10 text-success';
      case 'failed':
        return 'bg-error/10 text-error';
      case 'pending':
        return 'bg-warning/10 text-warning';
      case 'bounced':
        return 'bg-warning/10 text-warning';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <History className="w-6 h-6 text-foreground" />
          <div>
            <h2 className="text-xl font-bold text-foreground">Notification History</h2>
            <p className="text-sm text-muted-foreground">View and analyze your notification activity</p>
          </div>
        </div>

        <Button onClick={exportData} className="flex items-center space-x-2">
          <Download className="w-4 h-4" />
          <span>Export</span>
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="history">History</TabsTrigger>
          {showAnalytics && <TabsTrigger value="analytics">Analytics</TabsTrigger>}
        </TabsList>

        <TabsContent value="history" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search notifications..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="watchlist">Watchlist</SelectItem>
                    <SelectItem value="security">Security</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                    <SelectItem value="billing">Billing</SelectItem>
                    <SelectItem value="social">Social</SelectItem>
                    <SelectItem value="content">Content</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Channel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Channels</SelectItem>
                    <SelectItem value="push">Push</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="in-app">In-App</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="bounced">Bounced</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Date Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="7days">Last 7 Days</SelectItem>
                    <SelectItem value="30days">Last 30 Days</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={`${sortBy}-${sortOrder}`}
                  onValueChange={value => {
                    const [field, order] = value.split('-');
                    setSortBy(field);
                    setSortOrder(order as 'asc' | 'desc');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="timestamp-desc">Newest First</SelectItem>
                    <SelectItem value="timestamp-asc">Oldest First</SelectItem>
                    <SelectItem value="title-asc">Title A-Z</SelectItem>
                    <SelectItem value="title-desc">Title Z-A</SelectItem>
                    <SelectItem value="priority-desc">Priority High-Low</SelectItem>
                    <SelectItem value="category-asc">Category A-Z</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Bell className="w-5 h-5 text-primary" />
                  <div>
                    <div className="text-2xl font-bold">{filteredData.length}</div>
                    <div className="text-sm text-muted-foreground">Total</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-success" />
                  <div>
                    <div className="text-2xl font-bold">
                      {filteredData.filter(item => item.deliveryStatus === 'delivered').length}
                    </div>
                    <div className="text-sm text-muted-foreground">Delivered</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Eye className="w-5 h-5 text-primary" />
                  <div>
                    <div className="text-2xl font-bold">{filteredData.filter(item => item.readAt).length}</div>
                    <div className="text-sm text-muted-foreground">Opened</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Activity className="w-5 h-5 text-warning" />
                  <div>
                    <div className="text-2xl font-bold">
                      {
                        filteredData.filter(
                          item => item.interactionType === 'clicked' || item.interactionType === 'acted'
                        ).length
                      }
                    </div>
                    <div className="text-sm text-muted-foreground">Clicked</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* History List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Notifications</CardTitle>
                <div className="text-sm text-muted-foreground">
                  Showing {filteredData.length} of {historyData.length}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {filteredData.length === 0 ? (
                    <div className="text-center py-8">
                      <History className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                      <h3 className="text-lg font-medium text-foreground mb-2">No notifications found</h3>
                      <p className="text-muted-foreground">Try adjusting your filters or search terms</p>
                    </div>
                  ) : (
                    filteredData.map(item => (
                      <div
                        key={item.id}
                        className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-0.5">{getTypeIcon(item.type)}</div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <h4 className="text-sm font-medium text-foreground">{item.title}</h4>
                                <p className="text-sm text-foreground mt-1">{item.message}</p>
                              </div>

                              <div className="flex items-center space-x-2 ml-4">
                                <Badge className={getStatusColor(item.deliveryStatus)}>{item.deliveryStatus}</Badge>
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-1">
                                  <Clock className="w-3 h-3" />
                                  <span>{format(item.timestamp, 'MMM d, yyyy HH:mm')}</span>
                                </div>

                                <div className="flex items-center space-x-1">
                                  {getChannelIcon(item.deliveryChannel)}
                                  <span className="capitalize">{item.deliveryChannel}</span>
                                </div>

                                <Badge variant="outline" className="text-xs capitalize">
                                  {item.category}
                                </Badge>

                                <Badge
                                  variant={item.priority === 'critical' ? 'destructive' : 'outline'}
                                  className="text-xs"
                                >
                                  {item.priority}
                                </Badge>
                              </div>

                              <div className="flex items-center space-x-2">
                                {item.readAt && (
                                  <span className="text-success">Opened {format(item.readAt, 'HH:mm')}</span>
                                )}

                                {item.interactionType && (
                                  <Badge variant="outline" className="text-xs">
                                    {item.interactionType}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {showAnalytics && (
          <TabsContent value="analytics" className="space-y-6">
            {/* Performance Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5" />
                    <span>Delivery Rate</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-2">{analytics.deliveryRate.toFixed(1)}%</div>
                  <div className="text-sm text-muted-foreground">
                    {analytics.delivered} of {analytics.totalSent} delivered
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Eye className="w-5 h-5" />
                    <span>Open Rate</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-2">{analytics.openRate.toFixed(1)}%</div>
                  <div className="text-sm text-muted-foreground">
                    {analytics.opened} of {analytics.delivered} opened
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Activity className="w-5 h-5" />
                    <span>Click Rate</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-2">{analytics.clickRate.toFixed(1)}%</div>
                  <div className="text-sm text-muted-foreground">
                    {analytics.clicked} of {analytics.opened} clicked
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Category Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <PieChart className="w-5 h-5" />
                  <span>Category Distribution</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(analytics.categoryBreakdown).map(([category, count]) => (
                    <div key={category} className="flex items-center justify-between">
                      <span className="capitalize text-sm">{category}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full"
                            style={{ width: `${(count / analytics.totalSent) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-12 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Channel Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5" />
                  <span>Channel Performance</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(analytics.channelBreakdown).map(([channel, count]) => {
                    const channelData = historyData.filter(item => item.deliveryChannel === channel);
                    const delivered = channelData.filter(item => item.deliveryStatus === 'delivered').length;
                    const opened = channelData.filter(item => item.readAt).length;
                    const deliveryRate = count > 0 ? (delivered / count) * 100 : 0;
                    const openRate = delivered > 0 ? (opened / delivered) * 100 : 0;

                    return (
                      <div key={channel} className="p-3 border border-border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            {getChannelIcon(channel)}
                            <span className="font-medium capitalize">{channel}</span>
                          </div>
                          <div className="text-sm text-muted-foreground">{count} sent</div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Delivery Rate:</span>
                            <span className="ml-2 font-medium">{deliveryRate.toFixed(1)}%</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Open Rate:</span>
                            <span className="ml-2 font-medium">{openRate.toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
