'use client';

import * as React from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, Eye, MousePointer, Search, Timer } from 'lucide-react';
import { PerformanceMetrics } from '@/lib/seo/types';

interface PerformanceChartsProps {
  metrics: PerformanceMetrics;
}

export function PerformanceCharts({ metrics }: PerformanceChartsProps) {
  const getTrendIcon = (trend: number) => {
    if (trend > 0) return TrendingUp;
    if (trend < 0) return TrendingDown;
    return Minus;
  };

  const getTrendColor = (trend: number) => {
    if (trend > 0) return 'text-success';
    if (trend < 0) return 'text-error';
    return 'text-muted-foreground';
  };

  const formatTrend = (trend: number) => {
    const sign = trend > 0 ? '+' : '';
    return `${sign}${trend.toFixed(1)}%`;
  };

  const getCWVStatus = (value: number, good: number, poor: number) => {
    if (value <= good) return { status: 'Good', color: 'text-success', bg: 'bg-success/10' };
    if (value <= poor) return { status: 'Needs Improvement', color: 'text-warning', bg: 'bg-warning/10' };
    return { status: 'Poor', color: 'text-error', bg: 'bg-error/10' };
  };

  const lcpStatus = getCWVStatus(metrics.coreWebVitals.lcp.value, 2.5, 4.0);
  const fidStatus = getCWVStatus(metrics.coreWebVitals.fid.value, 100, 300);
  const clsStatus = getCWVStatus(metrics.coreWebVitals.cls.value, 0.1, 0.25);

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.overview.totalViews.toLocaleString()}</div>
            <div className="flex items-center space-x-1 text-xs">
              <span className="text-muted-foreground">vs previous period</span>
              <Badge variant="secondary" className="text-xs">
                +12.3%
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.overview.totalClicks.toLocaleString()}</div>
            <div className="flex items-center space-x-1 text-xs">
              <span className="text-muted-foreground">vs previous period</span>
              <Badge variant="secondary" className="text-xs">
                +8.7%
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg CTR</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(metrics.overview.avgCtr * 100).toFixed(1)}%</div>
            <div className="flex items-center space-x-1 text-xs">
              <span className="text-muted-foreground">vs previous period</span>
              <Badge variant="secondary" className="text-xs">
                -2.1%
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Position</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.overview.avgPosition.toFixed(1)}</div>
            <div className="flex items-center space-x-1 text-xs">
              <span className="text-muted-foreground">vs previous period</span>
              <Badge variant="secondary" className="text-xs">
                -0.8
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Core Web Vitals */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Largest Contentful Paint (LCP)</CardTitle>
            <CardDescription>Loading performance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{metrics.coreWebVitals.lcp.value.toFixed(1)}s</span>
              <div className="flex items-center space-x-1">
                {React.createElement(getTrendIcon(metrics.coreWebVitals.lcp.trend), {
                  className: `h-4 w-4 ${getTrendColor(metrics.coreWebVitals.lcp.trend)}`,
                })}
                <span className={`text-sm ${getTrendColor(metrics.coreWebVitals.lcp.trend)}`}>
                  {formatTrend(metrics.coreWebVitals.lcp.trend)}
                </span>
              </div>
            </div>
            <Badge className={`${lcpStatus.bg} ${lcpStatus.color} border-0`}>{lcpStatus.status}</Badge>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Good (&lt;2.5s)</span>
                <span>{metrics.coreWebVitals.lcp.distribution.good}%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Needs Work</span>
                <span>{metrics.coreWebVitals.lcp.distribution.needsImprovement}%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Poor</span>
                <span>{metrics.coreWebVitals.lcp.distribution.poor}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">First Input Delay (FID)</CardTitle>
            <CardDescription>Interactivity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{metrics.coreWebVitals.fid.value.toFixed(0)}ms</span>
              <div className="flex items-center space-x-1">
                {React.createElement(getTrendIcon(metrics.coreWebVitals.fid.trend), {
                  className: `h-4 w-4 ${getTrendColor(metrics.coreWebVitals.fid.trend)}`,
                })}
                <span className={`text-sm ${getTrendColor(metrics.coreWebVitals.fid.trend)}`}>
                  {formatTrend(metrics.coreWebVitals.fid.trend)}
                </span>
              </div>
            </div>
            <Badge className={`${fidStatus.bg} ${fidStatus.color} border-0`}>{fidStatus.status}</Badge>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Good (&lt;100ms)</span>
                <span>{metrics.coreWebVitals.fid.distribution.good}%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Needs Work</span>
                <span>{metrics.coreWebVitals.fid.distribution.needsImprovement}%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Poor</span>
                <span>{metrics.coreWebVitals.fid.distribution.poor}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Cumulative Layout Shift (CLS)</CardTitle>
            <CardDescription>Visual stability</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{metrics.coreWebVitals.cls.value.toFixed(3)}</span>
              <div className="flex items-center space-x-1">
                {React.createElement(getTrendIcon(metrics.coreWebVitals.cls.trend), {
                  className: `h-4 w-4 ${getTrendColor(metrics.coreWebVitals.cls.trend)}`,
                })}
                <span className={`text-sm ${getTrendColor(metrics.coreWebVitals.cls.trend)}`}>
                  {formatTrend(metrics.coreWebVitals.cls.trend)}
                </span>
              </div>
            </div>
            <Badge className={`${clsStatus.bg} ${clsStatus.color} border-0`}>{clsStatus.status}</Badge>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Good (&lt;0.1)</span>
                <span>{metrics.coreWebVitals.cls.distribution.good}%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Needs Work</span>
                <span>{metrics.coreWebVitals.cls.distribution.needsImprovement}%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Poor</span>
                <span>{metrics.coreWebVitals.cls.distribution.poor}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Traffic Chart Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Traffic Trends</CardTitle>
          <CardDescription>Views, clicks, and impressions over time ({metrics.timeRange})</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center bg-muted/20 rounded">
            <p className="text-muted-foreground">Traffic chart visualization would be rendered here</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
