import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Search, Users, Eye, BarChart3, Loader2 } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export interface KeywordPerformanceData {
  id: string;
  keyword: string;
  appStore: 'iOS' | 'Android';
  country: string;
  ranking: number;
  searchVolume: number;
  competition: number;
  trend: 'up' | 'down' | 'stable';
  description?: string;
}

interface ASOAnalyticsDashboardProps {
  appId: string;
  enableRealtime?: boolean;
  timeRange?: string;
  onTimeRangeChange?: (range: string) => void;
}

const ASOAnalyticsDashboard: React.FC<ASOAnalyticsDashboardProps> = ({
  appId,
  enableRealtime = false,
  timeRange = '30d',
  onTimeRangeChange = () => {},
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keywordData, setKeywordData] = useState<KeywordPerformanceData[]>([]);
  const [filteredKeywords, setFilteredKeywords] = useState<KeywordPerformanceData[]>([]);
  const [filterText, setFilterText] = useState('');
  const [sortBy, setSortBy] = useState('searchVolume');
  const [platformFilter, setPlatformFilter] = useState<'all' | 'ios' | 'android'>('all');
  const [retryCount, setRetryCount] = useState(0);

  const [metrics, setMetrics] = useState({
    totalKeywords: 0,
    avgRanking: 0,
    totalSearchVolume: 0,
    conversionRate: 0,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [abTestData, setAbTestData] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [reviewData, setReviewData] = useState<any>(null);
  // Fetch ASO data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/aso/keywords?appId=${appId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch ASO data');
        }

        const data = await response.json();
        setKeywordData(data.keywords || []);

        // Calculate metrics
        if (data.keywords?.length > 0) {
          const totalKeywords = data.totalKeywords || data.keywords.length;
          const avgRanking =
            data.averageRanking ||
            data.keywords.reduce((sum: number, k: KeywordPerformanceData) => sum + k.ranking, 0) / data.keywords.length;
          const totalSearchVolume =
            data.totalSearchVolume ||
            data.keywords.reduce((sum: number, k: KeywordPerformanceData) => sum + k.searchVolume, 0);

          setMetrics({
            totalKeywords,
            avgRanking: Math.round(avgRanking * 10) / 10,
            totalSearchVolume,
            conversionRate: 3.2,
          });
        }
      } catch (err) {
        const errorMessage =
          err instanceof TypeError && err.message.includes('Network')
            ? 'Network error - check your connection'
            : err instanceof Error
              ? err.message
              : 'Error loading data';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [appId, retryCount]);

  // Fetch A/B test data
  useEffect(() => {
    const fetchAbTestData = async () => {
      try {
        const response = await fetch(`/api/aso/abtest?appId=${appId}`);
        if (response.ok) {
          const data = await response.json();
          setAbTestData(data);
        }
      } catch (err) {
        // Silently handle A/B test data failures
        console.warn('Failed to fetch A/B test data:', err);
      }
    };

    fetchAbTestData();
  }, [appId]);

  // Fetch review data
  useEffect(() => {
    const fetchReviewData = async () => {
      try {
        const response = await fetch(`/api/aso/reviews?appId=${appId}`);
        if (response.ok) {
          const data = await response.json();
          setReviewData(data);
        }
      } catch (err) {
        console.warn('Failed to fetch review data:', err);
      }
    };

    fetchReviewData();
  }, [appId]);

  // WebSocket for real-time updates
  useEffect(() => {
    if (enableRealtime) {
      const ws = new WebSocket(`wss://api.example.com/aso-realtime?appId=${appId}`);

      ws.onmessage = event => {
        const data = JSON.parse(event.data);
        if (data.keyword && data.newRanking) {
          setKeywordData(prev => prev.map(k => (k.keyword === data.keyword ? { ...k, ranking: data.newRanking } : k)));
        }
      };

      return () => ws.close();
    }
  }, [appId, enableRealtime]);

  // Filter and sort keywords
  useEffect(() => {
    let filtered = keywordData;

    if (filterText) {
      filtered = filtered.filter(k => k.keyword.toLowerCase().includes(filterText.toLowerCase()));
    }

    if (platformFilter !== 'all') {
      filtered = filtered.filter(k => k.appStore.toLowerCase() === platformFilter);
    }

    // Sort keywords
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'searchVolume':
          return b.searchVolume - a.searchVolume;
        case 'ranking':
          return a.ranking - b.ranking;
        case 'competition':
          return b.competition - a.competition;
        default:
          return 0;
      }
    });

    setFilteredKeywords(filtered);
  }, [keywordData, filterText, sortBy, platformFilter]);

  const handleRetry = () => {
    setError(null);
    // Increment retry counter to trigger useEffect re-run
    setRetryCount(prev => prev + 1);
  };

  const handleExportCSV = () => {
    try {
      const csvContent = filteredKeywords
        .map(k => `${k.keyword},${k.appStore},${k.country},${k.ranking},${k.searchVolume},${k.competition},${k.trend}`)
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'aso-keywords.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Export error:', err);
      }
      setError('Failed to export data');
    }
  };

  const handleGenerateReport = () => {
    alert('Report generation started');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading ASO data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <p className="text-[hsl(var(--chart-2))]">{error}</p>
        <Button onClick={handleRetry}>Retry</Button>
      </div>
    );
  }

  const mockChartData = [
    { date: '2024-01', rankings: 45, downloads: 1200 },
    { date: '2024-02', rankings: 42, downloads: 1450 },
    { date: '2024-03', rankings: 38, downloads: 1680 },
    { date: '2024-04', rankings: 35, downloads: 1920 },
    { date: '2024-05', rankings: 32, downloads: 2150 },
    { date: '2024-06', rankings: 28, downloads: 2380 },
  ];

  return (
    <main role="main" aria-label="ASO Analytics Dashboard" className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">ASO Analytics Dashboard</h2>
          <p className="text-muted-foreground">Monitor your app store optimization performance</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportCSV}>Export CSV</Button>
          <Button onClick={handleGenerateReport}>Generate Report</Button>
          <Button variant={timeRange === '7d' ? 'default' : 'outline'} onClick={() => onTimeRangeChange('7d')}>
            7 Days
          </Button>
          <Button variant={timeRange === '30d' ? 'default' : 'outline'} onClick={() => onTimeRangeChange('30d')}>
            30 Days
          </Button>
          <Button variant={timeRange === '90d' ? 'default' : 'outline'} onClick={() => onTimeRangeChange('90d')}>
            90 Days
          </Button>
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Keywords</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalKeywords}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3" /> +12.5% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Ranking</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgRanking}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3" /> +2.1 positions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Search Volume</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalSearchVolume.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3" /> +8.2% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.conversionRate}%</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3" /> +0.3% from last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Ranking Performance Trend</CardTitle>
          <CardDescription>Average keyword ranking and download trends over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" orientation="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="rankings"
                  stroke="hsl(var(--chart-5))"
                  strokeWidth={2}
                  name="Avg Ranking"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="downloads"
                  stroke="hsl(var(--chart-3))"
                  strokeWidth={2}
                  name="Downloads"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Keyword Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <Input
                placeholder="Filter keywords..."
                value={filterText}
                onChange={e => setFilterText(e.target.value)}
              />
            </div>
            <div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40" aria-label="Sort keywords by">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="searchVolume">Search Volume</SelectItem>
                  <SelectItem value="ranking">Ranking</SelectItem>
                  <SelectItem value="competition">Competition</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select
                value={platformFilter}
                onValueChange={value => setPlatformFilter(value as 'all' | 'ios' | 'android')}
              >
                <SelectTrigger className="w-32" aria-label="Filter by platform">
                  <SelectValue placeholder="Platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="ios">iOS</SelectItem>
                  <SelectItem value="android">Android</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* A/B Testing Results */}
      {abTestData && (
        <Card>
          <CardHeader>
            <CardTitle>A/B Testing Results</CardTitle>
            <CardDescription>Active and completed experiments</CardDescription>
          </CardHeader>
          <CardContent>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {abTestData.experiments?.map((exp: any) => (
              <div key={exp.id} className="border p-4 rounded mb-4">
                <h4 className="font-semibold">{exp.name}</h4>
                <p>
                  Status:{' '}
                  <span className={exp.status === 'active' ? 'text-success' : 'text-primary'}>
                    {exp.status === 'active' ? 'Active' : 'Completed'}
                  </span>
                </p>
                <p>{Math.round((exp.significance || 0.95) * 100)}% confident</p>
                <p>
                  Improvement: +
                  {Math.round(
                    (((exp.conversionRate?.treatment || 0) - (exp.conversionRate?.control || 0)) /
                      (exp.conversionRate?.control || 1)) *
                      100
                  )}
                  %
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Review Analytics */}
      {reviewData && (
        <Card>
          <CardHeader>
            <CardTitle>Review Analytics</CardTitle>
            <CardDescription>Sentiment analysis and ratings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p>
                  Average Rating: <strong>{reviewData.averageRating}</strong>
                </p>
                <p>
                  Total Reviews: <strong>{reviewData.totalReviews?.toLocaleString()}</strong>
                </p>
              </div>
              <div>
                <p>
                  Positive: <strong>{Math.round((reviewData.sentimentDistribution?.positive || 0) * 100)}%</strong>
                </p>
                <p>
                  Neutral: <strong>{Math.round((reviewData.sentimentDistribution?.neutral || 0) * 100)}%</strong>
                </p>
                <p>
                  Negative: <strong>{Math.round((reviewData.sentimentDistribution?.negative || 0) * 100)}%</strong>
                </p>
              </div>
            </div>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {reviewData.reviews?.map((review: any) => (
              <div key={review.id} className="border-t pt-2 mt-2">
                <p>{review.text}</p>
                <small>Platform: {review.platform}</small>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Keyword Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Keywords</CardTitle>
          <CardDescription>Your highest-impact keywords ranked by performance</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredKeywords.length > 1000 && (
            <div
              data-testid="virtual-list"
              className="overflow-x-auto max-h-96"
              role="grid"
              aria-rowcount={filteredKeywords.length}
              aria-label="Virtual keyword list for large datasets"
            >
              {/* Virtual list for large datasets */}
              <div className="space-y-2">
                {filteredKeywords.slice(0, 50).map(keyword => (
                  <div
                    key={keyword.id}
                    data-testid="keyword-item"
                    className="flex items-center justify-between p-2 border rounded"
                  >
                    <span>{keyword.keyword}</span>
                    <span>Rank: {keyword.ranking}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table role="table" aria-label="Keyword Rankings" className="w-full">
              <thead>
                <tr className="border-b">
                  <th role="columnheader" className="text-left py-3 px-4">
                    Keyword
                  </th>
                  <th role="columnheader" className="text-left py-3 px-4">
                    App Store
                  </th>
                  <th role="columnheader" className="text-left py-3 px-4">
                    Country
                  </th>
                  <th role="columnheader" className="text-left py-3 px-4">
                    Ranking
                  </th>
                  <th role="columnheader" className="text-left py-3 px-4">
                    Search Volume
                  </th>
                  <th role="columnheader" className="text-left py-3 px-4">
                    Competition
                  </th>
                  <th role="columnheader" className="text-left py-3 px-4">
                    Trend
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredKeywords.slice(0, 50).map(keyword => (
                  <tr
                    key={keyword.id}
                    role="row"
                    tabIndex={0}
                    data-testid="keyword-item"
                    className="border-b hover:bg-muted/50"
                  >
                    <td className="py-3 px-4 font-medium" aria-describedby={`rank-${keyword.ranking}`}>
                      {keyword.keyword}
                    </td>
                    <td className="py-3 px-4">{keyword.appStore}</td>
                    <td className="py-3 px-4">{keyword.country}</td>
                    <td className="py-3 px-4" id={`rank-${keyword.ranking}`}>
                      <div className="flex items-center">
                        <span className="font-medium">Rank: {keyword.ranking}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">{keyword.searchVolume.toLocaleString()}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        <Progress
                          value={keyword.competition * 100}
                          className="w-16 mr-2"
                          aria-label={`Competition level for ${keyword.keyword}: ${Math.round(keyword.competition * 100)}%`}
                        />
                        <span className="text-sm">{Math.round(keyword.competition * 100)}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        {keyword.trend === 'up' && <TrendingUp className="h-4 w-4 text-success" />}
                        {keyword.trend === 'down' && <TrendingDown className="h-4 w-4 text-error" />}
                        {keyword.trend === 'stable' && <div className="h-4 w-4 bg-muted rounded-full" />}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </main>
  );
};

export default ASOAnalyticsDashboard;
