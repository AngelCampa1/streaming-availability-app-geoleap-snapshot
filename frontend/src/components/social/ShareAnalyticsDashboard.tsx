'use client';

import React, { useState, useEffect } from'react';
import {
  TrendingUp,
  Share2,
  Users,
  MousePointer,
  BarChart3,
  Calendar,
  Filter,
  Download,
  RefreshCw,
} from'lucide-react';
import { Card } from'../ui/card';
import { Button } from'../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from'../ui/select';
import { Badge } from'../ui/badge';
import { SOCIAL_PLATFORMS } from'../../lib/types/social-sharing';
import { useShareAnalytics } from'../../hooks/useSocialSharing';

interface ShareAnalyticsDashboardProps {
  contentId?: string;
  timeRange?:'7d' |'30d' |'90d' |'all';
  className?: string;
}

interface TopPerformingContent {
  id: string;
  title: string;
  shares: number;
  clicks: number;
}

interface SharesByDay {
  day: string;
  shares: number;
}

interface DashboardData {
  totalViralReach: number;
  avgSharesPerUser: number;
  topPerformingContent: TopPerformingContent[];
  sharesByDay: SharesByDay[];
  platformGrowth: Record<string, number>;
  userEngagement: {
    shareRate: number;
    clickThroughRate: number;
    conversionRate: number;
  };
}

export const ShareAnalyticsDashboard: React.FC<ShareAnalyticsDashboardProps> = ({
  contentId,
  timeRange ='30d',
  className ='',
}) => {
  const [selectedTimeRange, setSelectedTimeRange] = useState<'7d' |'30d' |'90d' |'all'>(timeRange);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const { analytics, refreshAnalytics, isLoading } = useShareAnalytics(contentId);

  // Mock additional data for dashboard
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalViralReach: 0,
    avgSharesPerUser: 0,
    topPerformingContent: [],
    sharesByDay: [],
    platformGrowth: {},
    userEngagement: {
      shareRate: 0,
      clickThroughRate: 0,
      conversionRate: 0,
    },
  });

  useEffect(() => {
    // Simulate fetching additional dashboard data
    const fetchDashboardData = async () => {
      // This would be real API calls in production
      setDashboardData({
        totalViralReach: Math.floor(Math.random() * 10000) + 1000,
        avgSharesPerUser: parseFloat((Math.random() * 5 + 1).toFixed(2)),
        topPerformingContent: [
          { id:'1', title:'Popular Movie', shares: 145, clicks: 432 },
          { id:'2', title:'Trending Series', shares: 123, clicks: 389 },
          { id:'3', title:'Classic Film', shares: 98, clicks: 267 },
        ],
        sharesByDay: Array.from({ length: 7 }, (_, i) => ({
          day: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { weekday:'short' }),
          shares: Math.floor(Math.random() * 50) + 10,
        })),
        platformGrowth: {
          facebook: 15.2,
          twitter: 8.7,
          whatsapp: 22.1,
          instagram: 18.9,
        },
        userEngagement: {
          shareRate: 0.045,
          clickThroughRate: 0.123,
          conversionRate: analytics.conversionRate || 0.067,
        },
      });
    };

    fetchDashboardData();
  }, [analytics.conversionRate, selectedTimeRange]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) +'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) +'K';
    }
    return num.toString();
  };

  const formatPercentage = (num: number) => {
    return (num * 100).toFixed(2) +'%';
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded-lg"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 bg-muted rounded-lg"></div>
          <div className="h-64 bg-muted rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Share Analytics</h2>
          <p className="text-muted-foreground">Track your content sharing performance across platforms</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Time Range Filter */}
          <Select
            value={selectedTimeRange}
            onValueChange={value => setSelectedTimeRange(value as'7d' |'30d' |'90d' |'all')}
          >
            <SelectTrigger className="w-32">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>

          {/* Platform Filter */}
          <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
            <SelectTrigger className="w-40">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="All platforms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All platforms</SelectItem>
              {Object.entries(SOCIAL_PLATFORMS).map(([key, platform]) => (
                <SelectItem key={key} value={key}>
                  <span className="flex items-center gap-2">
                    <span>{platform.icon}</span>
                    {platform.displayName}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Refresh Button */}
          <Button variant="outline" size="sm" onClick={refreshAnalytics} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 ${isLoading ?'animate-spin' :''}`} />
          </Button>

          {/* Export Button */}
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Shares</p>
              <p className="text-3xl font-bold text-foreground">{formatNumber(analytics.totalShares)}</p>
              <p className="text-sm text-success  flex items-center gap-1 mt-1">
                <TrendingUp className="w-4 h-4" />
                +12.5% from last period
              </p>
            </div>
            <div className="p-3 bg-primary/10  rounded-lg">
              <Share2 className="w-6 h-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Click-Through Rate</p>
              <p className="text-3xl font-bold text-foreground">
                {formatPercentage(dashboardData.userEngagement.clickThroughRate)}
              </p>
              <p className="text-sm text-success  flex items-center gap-1 mt-1">
                <TrendingUp className="w-4 h-4" />
                +3.2% from last period
              </p>
            </div>
            <div className="p-3 bg-success/10  rounded-lg">
              <MousePointer className="w-6 h-6 text-success" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Conversion Rate</p>
              <p className="text-3xl font-bold text-foreground">{formatPercentage(analytics.conversionRate)}</p>
              <p className="text-sm text-primary flex items-center gap-1 mt-1">
                <TrendingUp className="w-4 h-4" />
                +1.8% from last period
              </p>
            </div>
            <div className="p-3 bg-accent/10  rounded-lg">
              <Users className="w-6 h-6 text-accent" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Viral Reach</p>
              <p className="text-3xl font-bold text-foreground">{formatNumber(dashboardData.totalViralReach)}</p>
              <p className="text-sm text-warning flex items-center gap-1 mt-1">
                <TrendingUp className="w-4 h-4" />
                +8.9% from last period
              </p>
            </div>
            <div className="p-3 bg-warning/10  rounded-lg">
              <BarChart3 className="w-6 h-6 text-warning" />
            </div>
          </div>
        </Card>
      </div>

      {/* Platform Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Platform Performance</h3>
          <div className="space-y-4">
            {Object.entries(analytics.platformBreakdown).map(([platform, shares]) => {
              const platformConfig = SOCIAL_PLATFORMS[platform];
              const percentage = analytics.totalShares > 0 ? (shares / analytics.totalShares) * 100 : 0;

              return (
                <div key={platform} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{platformConfig?.icon ||'📱'}</span>
                    <div>
                      <p className="font-medium">{platformConfig?.displayName || platform}</p>
                      <p className="text-sm text-muted-foreground">{shares} shares</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-12 text-right">{percentage.toFixed(1)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Sharing Trends</h3>
          <div className="space-y-4">
            <div className="h-48 flex items-end justify-between gap-2">
              {dashboardData.sharesByDay.map((day, index) => (
                <div key={index} className="flex-1 flex flex-col items-center gap-2">
                  <div
                    className="w-full bg-primary rounded-t transition-all duration-300 hover:bg-primary/80"
                    style={{
                      height: `${(day.shares / Math.max(...dashboardData.sharesByDay.map(d => d.shares))) * 100}%`,
                      minHeight:'4px',
                    }}
                    title={`${day.shares} shares`}
                  />
                  <span className="text-xs text-muted-foreground">{day.day}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center gap-4 pt-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-primary rounded"></div>
                <span className="text-sm text-muted-foreground">Daily Shares</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Top Performing Content */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Top Performing Content</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 text-sm font-medium text-muted-foreground">Content</th>
                <th className="text-right py-2 text-sm font-medium text-muted-foreground">Shares</th>
                <th className="text-right py-2 text-sm font-medium text-muted-foreground">Clicks</th>
                <th className="text-right py-2 text-sm font-medium text-muted-foreground">CTR</th>
                <th className="text-right py-2 text-sm font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {dashboardData.topPerformingContent.map((content, index) => (
                <tr key={content.id} className="border-b border-border">
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10  rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">#{index + 1}</span>
                      </div>
                      <span className="font-medium">{content.title}</span>
                    </div>
                  </td>
                  <td className="text-right py-3 font-medium">{content.shares}</td>
                  <td className="text-right py-3 font-medium">{content.clicks}</td>
                  <td className="text-right py-3 font-medium">
                    {((content.clicks / content.shares) * 100).toFixed(1)}%
                  </td>
                  <td className="text-right py-3">
                    <Badge variant={index === 0 ?'default' :'secondary'}>
                      {index === 0 ?'Trending' :'Popular'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default ShareAnalyticsDashboard;
