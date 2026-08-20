'use client';

import React, { useState, useEffect } from'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from'@/components/ui/card';
import { Button } from'@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from'@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from'@/components/ui/tabs';
import { Badge } from'@/components/ui/badge';
import { Progress } from'@/components/ui/progress';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from'recharts';
import {
  DownloadIcon,
  DollarSignIcon,
  TrendingUpIcon,
  TargetIcon,
} from'lucide-react';
import type { DateRange } from'react-day-picker';

interface ChannelPerformanceProps {
  dateRange?: DateRange;
  className?: string;
}

interface ChannelPerformanceData {
  channels: ChannelMetric[];
  attribution: AttributionData;
  efficiency: ChannelEfficiency[];
  trends: ChannelTrend[];
  customerJourney: JourneyData[];
  summary: PerformanceSummary;
}

interface ChannelMetric {
  channel: string;
  spend: number;
  revenue: number;
  roi: number;
  conversions: number;
  impressions: number;
  clicks: number;
  ctr: number;
  conversionRate: number;
  cpa: number;
  ltv: number;
  attribution: {
    firstTouch: number;
    lastTouch: number;
    linear: number;
    timeDecay: number;
  };
}

interface AttributionData {
  models: {
    firstTouch: ModelData[];
    lastTouch: ModelData[];
    linear: ModelData[];
    timeDecay: ModelData[];
    dataDrivern: ModelData[];
  };
  comparison: AttributionComparison[];
}

interface ModelData {
  channel: string;
  attribution: number;
  revenue: number;
  percentage: number;
}

interface AttributionComparison {
  channel: string;
  firstTouch: number;
  lastTouch: number;
  linear: number;
  timeDecay: number;
  difference: number;
}

interface ChannelEfficiency {
  channel: string;
  efficiency: number;
  saturationPoint: number;
  incrementalROI: number;
  scalability:'high' |'medium' |'low';
  recommendation: string;
}

interface ChannelTrend {
  date: string;
  channels: Record<
    string,
    {
      spend: number;
      revenue: number;
      conversions: number;
      roi: number;
    }
  >;
}

interface JourneyData {
  touchpoint: number;
  channels: Record<string, number>;
  conversionRate: number;
}

interface PerformanceSummary {
  totalSpend: number;
  totalRevenue: number;
  overallROI: number;
  bestChannel: string;
  worstChannel: string;
  budgetRecommendations: BudgetRecommendation[];
}

interface BudgetRecommendation {
  channel: string;
  currentBudget: number;
  recommendedBudget: number;
  expectedIncrease: number;
  confidence: number;
}

// Using CSS variables for chart colors (Recharts requires hex/rgb values)
const CHART_COLORS = ['hsl(var(--chart-1))','hsl(var(--chart-2))','hsl(var(--chart-3))','hsl(var(--chart-4))','hsl(var(--chart-5))','hsl(var(--accent))','hsl(var(--primary))','hsl(var(--secondary))',
];

/**
 * Channel Performance Component - Marketing channel effectiveness with attribution modeling
 */
export function ChannelPerformance({ dateRange, className }: ChannelPerformanceProps) {
  const [data, setData] = useState<ChannelPerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAttributionModel, setSelectedAttributionModel] = useState<'firstTouch' |'lastTouch' |'linear' |'timeDecay' |'dataDrivern'
  >('linear');
  const [selectedView, setSelectedView] = useState<'overview' |'attribution' |'efficiency' |'journey'>('overview');
  const [sortBy, setSortBy] = useState<'roi' |'revenue' |'spend' |'conversions'>('roi');

  useEffect(() => {
    loadChannelData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, selectedAttributionModel]);

  const loadChannelData = async (): Promise<void> => {
    if (!dateRange?.from || !dateRange?.to) return;

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString(),
        attributionModel: selectedAttributionModel,
        sortBy,
      });

      const response = await fetch(`/api/growth-analytics/channel-performance?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const channelData = await response.json();
      setData(channelData);
    } catch (err) {
      console.error('Failed to load channel performance data:', err);
      setError(err instanceof Error ? err.message :'Failed to load channel performance');
    } finally {
      setLoading(false);
    }
  };

  const exportChannelData = () => {
    if (!data) return;

    const csvContent = generateChannelCSV(data);
    const blob = new Blob([csvContent], { type:'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `channel-performance-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const generateChannelCSV = (data: ChannelPerformanceData): string => {
    const headers = ['Channel','Spend','Revenue','ROI','Conversions','CTR','Conversion Rate','CPA','LTV'];
    const rows = data.channels.map(channel => [
      channel.channel,
      channel.spend.toString(),
      channel.revenue.toString(),
      `${channel.roi.toFixed(2)}%`,
      channel.conversions.toString(),
      `${channel.ctr.toFixed(2)}%`,
      `${channel.conversionRate.toFixed(2)}%`,
      channel.cpa.toString(),
      channel.ltv.toString(),
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const formatNumber = (value: number, type:'number' |'currency' |'percentage' ='number'): string => {
    switch (type) {
      case'currency':
        return new Intl.NumberFormat('en-US', {
          style:'currency',
          currency:'USD',
        }).format(value);
      case'percentage':
        return `${value.toFixed(2)}%`;
      default:
        return new Intl.NumberFormat('en-US').format(value);
    }
  };

  const getROIColor = (roi: number): string => {
    if (roi >= 300) return'text-success';
    if (roi >= 200) return'text-success/80';
    if (roi >= 100) return'text-warning';
    if (roi >= 0) return'text-warning/70';
    return'text-destructive';
  };

  const getScalabilityBadge = (scalability: string) => {
    const variants = {
      high:'default',
      medium:'secondary',
      low:'destructive',
    } as const;
    return <Badge variant={variants[scalability as keyof typeof variants]}>{scalability}</Badge>;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-6 bg-muted rounded w-1/3"></div>
                <div className="h-32 bg-muted rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <div className="text-destructive text-center">
            <p className="font-medium">Error loading channel performance</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            No channel performance data available for the selected period
          </p>
        </CardContent>
      </Card>
    );
  }

  const sortedChannels = [...data.channels].sort((a, b) => {
    switch (sortBy) {
      case'roi':
        return b.roi - a.roi;
      case'revenue':
        return b.revenue - a.revenue;
      case'spend':
        return b.spend - a.spend;
      case'conversions':
        return b.conversions - a.conversions;
      default:
        return b.roi - a.roi;
    }
  });

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Controls Header */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Channel Performance</h2>
          <p className="text-muted-foreground">
            Marketing channel effectiveness with ROI calculation and attribution modeling
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <Select
            value={selectedAttributionModel}
            onValueChange={value =>
              setSelectedAttributionModel(value as'firstTouch' |'lastTouch' |'linear' |'timeDecay' |'dataDrivern')
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="firstTouch">First Touch</SelectItem>
              <SelectItem value="lastTouch">Last Touch</SelectItem>
              <SelectItem value="linear">Linear</SelectItem>
              <SelectItem value="timeDecay">Time Decay</SelectItem>
              <SelectItem value="dataDrivern">Data Driven</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={sortBy}
            onValueChange={value => setSortBy(value as'roi' |'revenue' |'spend' |'conversions')}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="roi">ROI</SelectItem>
              <SelectItem value="revenue">Revenue</SelectItem>
              <SelectItem value="spend">Spend</SelectItem>
              <SelectItem value="conversions">Conversions</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={exportChannelData}>
            <DownloadIcon className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spend</CardTitle>
            <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(data.summary.totalSpend,'currency')}</div>
            <p className="text-xs text-muted-foreground">Across all channels</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(data.summary.totalRevenue,'currency')}</div>
            <p className="text-xs text-muted-foreground">Attributed revenue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall ROI</CardTitle>
            <TargetIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getROIColor(data.summary.overallROI)}`}>
              {formatNumber(data.summary.overallROI,'percentage')}
            </div>
            <p className="text-xs text-muted-foreground">Return on investment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Best Channel</CardTitle>
            <Badge variant="default">{data.summary.bestChannel}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Top Performer</div>
            <p className="text-xs text-muted-foreground">Highest ROI channel</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs
        value={selectedView}
        onValueChange={value => setSelectedView(value as'overview' |'attribution' |'efficiency' |'journey')}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="attribution">Attribution</TabsTrigger>
          <TabsTrigger value="efficiency">Efficiency</TabsTrigger>
          <TabsTrigger value="journey">Customer Journey</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Channel Performance Chart */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Channel Performance Trends</CardTitle>
                <CardDescription>ROI and spend trends over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={data.trends}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" className="text-muted-foreground" />
                    <YAxis yAxisId="left" className="text-muted-foreground" />
                    <YAxis yAxisId="right" orientation="right" className="text-muted-foreground" />
                    <Tooltip
                      labelFormatter={value => new Date(value).toLocaleDateString()}
                      formatter={(value: number, name: string) => [
                        formatNumber(value, name.includes('roi') ?'percentage' :'currency'),
                        name,
                      ]}
                      contentStyle={{
                        backgroundColor:'hsl(var(--card))',
                        border:'1px solid hsl(var(--border))',
                        borderRadius:'0.5rem',
                        color:'hsl(var(--foreground))',
                      }}
                    />
                    <Legend />
                    {Object.keys(data.trends[0]?.channels || {}).map((channel, index) => (
                      <Line
                        key={channel}
                        yAxisId="left"
                        type="monotone"
                        dataKey={`channels.${channel}.roi`}
                        stroke={CHART_COLORS[index % CHART_COLORS.length]}
                        strokeWidth={2}
                        name={`${channel} ROI`}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Channel Performance Table */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Channel Performance Details</CardTitle>
                <CardDescription>Comprehensive metrics for each marketing channel</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Channel</th>
                        <th className="text-right p-2">Spend</th>
                        <th className="text-right p-2">Revenue</th>
                        <th className="text-right p-2">ROI</th>
                        <th className="text-right p-2">Conversions</th>
                        <th className="text-right p-2">CTR</th>
                        <th className="text-right p-2">CPA</th>
                        <th className="text-right p-2">LTV</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedChannels.map((channel, index) => (
                        <tr key={index} className="border-b last:border-0">
                          <td className="p-2">
                            <Badge variant="outline">{channel.channel}</Badge>
                          </td>
                          <td className="text-right p-2">{formatNumber(channel.spend,'currency')}</td>
                          <td className="text-right p-2">{formatNumber(channel.revenue,'currency')}</td>
                          <td className={`text-right p-2 font-medium ${getROIColor(channel.roi)}`}>
                            {formatNumber(channel.roi,'percentage')}
                          </td>
                          <td className="text-right p-2">{formatNumber(channel.conversions)}</td>
                          <td className="text-right p-2">{formatNumber(channel.ctr,'percentage')}</td>
                          <td className="text-right p-2">{formatNumber(channel.cpa,'currency')}</td>
                          <td className="text-right p-2">{formatNumber(channel.ltv,'currency')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Attribution Tab */}
        <TabsContent value="attribution" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Attribution Model Comparison */}
            <Card>
              <CardHeader>
                <CardTitle>Attribution Model Comparison</CardTitle>
                <CardDescription>Revenue attribution across different models</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.attribution.comparison}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="channel" className="text-muted-foreground" />
                    <YAxis className="text-muted-foreground" />
                    <Tooltip
                      formatter={(value: number) => formatNumber(value,'currency')}
                      contentStyle={{
                        backgroundColor:'hsl(var(--card))',
                        border:'1px solid hsl(var(--border))',
                        borderRadius:'0.5rem',
                        color:'hsl(var(--foreground))',
                      }}
                    />
                    <Legend />
                    <Bar dataKey="firstTouch" fill="hsl(var(--chart-1))" name="First Touch" />
                    <Bar dataKey="lastTouch" fill="hsl(var(--chart-2))" name="Last Touch" />
                    <Bar dataKey="linear" fill="hsl(var(--chart-3))" name="Linear" />
                    <Bar dataKey="timeDecay" fill="hsl(var(--chart-4))" name="Time Decay" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Current Model Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>{selectedAttributionModel.replace(/([A-Z])/g,' $1').trim()} Attribution</CardTitle>
                <CardDescription>Revenue distribution for selected model</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data.attribution.models[selectedAttributionModel]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      label={(entry: any) => `${entry.channel}: ${entry.percentage.toFixed(1)}%`}
                      outerRadius={100}
                      fill="hsl(var(--primary))"
                      dataKey="revenue"
                    >
                      {data.attribution.models[selectedAttributionModel].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatNumber(value,'currency')}
                      contentStyle={{
                        backgroundColor:'hsl(var(--card))',
                        border:'1px solid hsl(var(--border))',
                        borderRadius:'0.5rem',
                        color:'hsl(var(--foreground))',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Efficiency Tab */}
        <TabsContent value="efficiency" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Channel Efficiency Metrics */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Channel Efficiency Analysis</CardTitle>
                <CardDescription>Scalability and optimization recommendations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.efficiency.map((channel, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-lg">{channel.channel}</h4>
                        {getScalabilityBadge(channel.scalability)}
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-3">
                        <div>
                          <div className="text-sm text-muted-foreground">Efficiency Score</div>
                          <div className="text-xl font-bold">{channel.efficiency.toFixed(1)}/10</div>
                          <Progress value={channel.efficiency * 10} className="mt-1" />
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Saturation Point</div>
                          <div className="text-xl font-bold">{formatNumber(channel.saturationPoint,'currency')}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Incremental ROI</div>
                          <div className="text-xl font-bold">{formatNumber(channel.incrementalROI,'percentage')}</div>
                        </div>
                      </div>

                      <div className="text-sm text-muted-foreground">
                        <strong>Recommendation:</strong> {channel.recommendation}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Budget Recommendations */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Budget Optimization</CardTitle>
                <CardDescription>AI-powered budget allocation recommendations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.summary.budgetRecommendations.map((rec, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="font-medium">{rec.channel}</div>
                        <div className="text-sm text-muted-foreground">
                          Current: {formatNumber(rec.currentBudget,'currency')} → Recommended:{''}
                          {formatNumber(rec.recommendedBudget,'currency')}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-success">
                          +{formatNumber(rec.expectedIncrease,'percentage')}
                        </div>
                        <div className="text-sm text-muted-foreground">{rec.confidence}% confidence</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Customer Journey Tab */}
        <TabsContent value="journey" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Customer Journey Analysis</CardTitle>
              <CardDescription>Channel touchpoint analysis throughout the customer journey</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={data.customerJourney}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="touchpoint" className="text-muted-foreground" />
                  <YAxis className="text-muted-foreground" />
                  <Tooltip
                    formatter={(value: number, name: string) => [formatNumber(value), name]}
                    labelFormatter={value => `Touchpoint ${value}`}
                    contentStyle={{
                      backgroundColor:'hsl(var(--card))',
                      border:'1px solid hsl(var(--border))',
                      borderRadius:'0.5rem',
                      color:'hsl(var(--foreground))',
                    }}
                  />
                  <Legend />
                  {Object.keys(data.customerJourney[0]?.channels || {}).map((channel, index) => (
                    <Area
                      key={channel}
                      type="monotone"
                      dataKey={`channels.${channel}`}
                      stackId="1"
                      stroke={CHART_COLORS[index % CHART_COLORS.length]}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                      fillOpacity={0.6}
                      name={channel}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
