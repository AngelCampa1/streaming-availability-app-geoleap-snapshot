'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  TrendingDown,
  Search,
  Star,
  MessageSquare,
  Target,
  Plus,
  Download,
  Smartphone,
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { asoService } from '@/services/asoService';
import { logger } from '@/lib/logger';
import { designTokens } from '@/lib/design-tokens';
import { AsoKeyword, AppStoreListing, AsoAbTest, AsoDashboardSummary, KeywordStatus, AbTestStatus } from '@/types/aso';

// UNIFIED COLOR SYSTEM - Stream Violet palette chart colors
// See docs/UNIFIED_COLOR_SYSTEM.md
const COLORS = [
  designTokens.semantic.success[500],
  designTokens.brand.primary[500],
  designTokens.brand.gold[500],
  designTokens.semantic.error[500],
  designTokens.brand.cyan[500],
  '#fb923c',
];

export default function AsoDashboard() {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<AsoDashboardSummary | null>(null);
  const [keywords, setKeywords] = useState<AsoKeyword[]>([]);
  const [listings, setListings] = useState<AppStoreListing[]>([]);
  const [abTests, setAbTests] = useState<AsoAbTest[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load all ASO data in parallel
      const [keywordsData, listingsData, abTestsData] = await Promise.all([
        asoService.getKeywords(),
        asoService.getListings(),
        asoService.getAbTests(),
        asoService.getKeywordPerformance(),
      ]);

      setKeywords(keywordsData);
      setListings(listingsData);
      setAbTests(abTestsData);

      // Calculate dashboard summary
      const summary: AsoDashboardSummary = {
        totalKeywords: keywordsData.length,
        activeKeywords: keywordsData.filter(k => k.status === KeywordStatus.Active).length,
        totalListings: listingsData.length,
        liveListings: listingsData.filter(l => l.status === 3).length, // ListingStatus.Live
        runningAbTests: abTestsData.filter(t => t.status === AbTestStatus.Running).length,
        averageRating:
          listingsData.length > 0 ? listingsData.reduce((sum, l) => sum + l.rating, 0) / listingsData.length : 0,
        totalDownloads: listingsData.reduce((sum, l) => sum + l.downloads, 0),
        conversionRate:
          listingsData.length > 0
            ? listingsData.reduce((sum, l) => sum + l.conversionRate, 0) / listingsData.length
            : 0,
        topPerformingKeywords: keywordsData
          .filter(k => k.currentRank && k.currentRank <= 10)
          .slice(0, 5)
          .map(k => ({
            keyword: k.keyword,
            currentRank: k.currentRank,
            previousRank: k.previousRank,
            change: k.previousRank && k.currentRank ? k.previousRank - k.currentRank : 0,
            searchVolume: k.searchVolume,
            difficulty: k.difficulty,
            conversionPotential: k.conversionPotential,
            trend: [], // Would be populated with historical data
          })),
        recentReviews: [], // Would be loaded separately
        rankingChanges: keywordsData
          .filter(k => k.currentRank && k.previousRank)
          .map(k => ({
            keyword: k.keyword,
            change: k.previousRank! - k.currentRank!,
            isImprovement: k.currentRank! < k.previousRank!,
          }))
          .slice(0, 10),
      };

      setDashboardData(summary);
    } catch (error) {
      logger.error('Error loading ASO dashboard:', { error });
    } finally {
      setLoading(false);
    }
  };

  const keywordRankingData = keywords
    .filter(k => k.currentRank && k.currentRank <= 50)
    .slice(0, 10)
    .map(k => ({
      keyword: k.keyword.length > 20 ? k.keyword.substring(0, 20) + '...' : k.keyword,
      rank: k.currentRank,
      volume: k.searchVolume,
      difficulty: Math.round(k.difficulty * 100),
    }));

  const appStoreDistribution = listings.reduce(
    (acc, listing) => {
      const store = asoService.getAppStoreDisplayName(listing.appStore);
      acc[store] = (acc[store] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const appStoreChartData = Object.entries(appStoreDistribution).map(([name, value]) => ({
    name,
    value,
  }));

  const conversionTrendData = listings.map(listing => ({
    name: listing.appName.length > 15 ? listing.appName.substring(0, 15) + '...' : listing.appName,
    conversionRate: Math.round(listing.conversionRate * 100),
    downloads: listing.downloads,
    views: listing.views,
  }));

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">ASO Dashboard</h1>
          <p className="text-muted-foreground mt-1">App Store Optimization insights and management</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Keyword
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Keywords</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData?.totalKeywords || 0}</div>
            <p className="text-xs text-muted-foreground">{dashboardData?.activeKeywords || 0} active keywords</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">App Listings</CardTitle>
            <Smartphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData?.totalListings || 0}</div>
            <p className="text-xs text-muted-foreground">{dashboardData?.liveListings || 0} live listings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData?.averageRating ? dashboardData.averageRating.toFixed(1) : '0.0'}
            </div>
            <p className="text-xs text-muted-foreground">Across all apps</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Downloads</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{asoService.formatNumber(dashboardData?.totalDownloads || 0)}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData?.conversionRate ? `${(dashboardData.conversionRate * 100).toFixed(1)}%` : '0%'} conversion
              rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="keywords">Keywords</TabsTrigger>
          <TabsTrigger value="listings">Listings</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="ab-tests">A/B Tests</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Keyword Rankings Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Top Keyword Rankings</CardTitle>
                <CardDescription>Current ranking positions for your best performing keywords</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={keywordRankingData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="keyword" angle={-45} textAnchor="end" height={100} fontSize={12} />
                    <YAxis domain={[0, 50]} reversed />
                    <Tooltip formatter={(value, name) => [value, name === 'rank' ? 'Rank' : name]} />
                    <Bar dataKey="rank" fill={designTokens.brand.primary[500]} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* App Store Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>App Store Distribution</CardTitle>
                <CardDescription>Distribution of your apps across app stores</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={appStoreChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={
                        ((entry: { name: string; percent: number }) =>
                          `${entry.name} ${(entry.percent * 100).toFixed(0)}%`) as never
                      }
                      outerRadius={80}
                      fill={designTokens.brand.primary[500]}
                      dataKey="value"
                    >
                      {appStoreChartData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Conversion Rate Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Conversion Rates by App</CardTitle>
                <CardDescription>App store conversion performance</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={conversionTrendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} fontSize={12} />
                    <YAxis domain={[0, 'dataMax']} />
                    <Tooltip
                      formatter={(value, name) => [
                        name === 'conversionRate' ? `${value}%` : asoService.formatNumber(Number(value)),
                        name === 'conversionRate' ? 'Conversion Rate' : name === 'downloads' ? 'Downloads' : 'Views',
                      ]}
                    />
                    <Bar dataKey="conversionRate" fill={designTokens.semantic.success[500]} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Recent Ranking Changes */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Ranking Changes</CardTitle>
                <CardDescription>Latest keyword ranking movements</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardData?.rankingChanges.slice(0, 8).map((change, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            change.isImprovement ? 'bg-success' : change.change < 0 ? 'bg-destructive' : 'bg-muted'
                          }`}
                        />
                        <span className="text-sm font-medium truncate max-w-40">{change.keyword}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {change.change !== 0 &&
                          (change.isImprovement ? (
                            <TrendingUp className="h-4 w-4 text-success" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-destructive" />
                          ))}
                        <span
                          className={`text-sm font-medium ${
                            change.isImprovement
                              ? 'text-success'
                              : change.change < 0
                                ? 'text-destructive'
                                : 'text-muted-foreground'
                          }`}
                        >
                          {change.change > 0 ? '+' : ''}
                          {change.change}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="keywords" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Keyword Performance</CardTitle>
              <CardDescription>Track and analyze your ASO keywords</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardData?.topPerformingKeywords.map((keyword, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-medium text-primary">
                        {keyword.currentRank}
                      </div>
                      <div>
                        <div className="font-medium">{keyword.keyword}</div>
                        <div className="text-sm text-muted-foreground">
                          Volume: {asoService.formatNumber(keyword.searchVolume)} | Difficulty:{' '}
                          {Math.round(keyword.difficulty * 100)}% | Potential:{' '}
                          {Math.round(keyword.conversionPotential * 100)}%
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      {keyword.change !== 0 && (
                        <div
                          className={`flex items-center space-x-1 text-sm ${
                            keyword.change > 0 ? 'text-success' : 'text-destructive'
                          }`}
                        >
                          {keyword.change > 0 ? (
                            <TrendingUp className="h-4 w-4" />
                          ) : (
                            <TrendingDown className="h-4 w-4" />
                          )}
                          <span>{Math.abs(keyword.change)}</span>
                        </div>
                      )}
                      <Badge variant={keyword.currentRank && keyword.currentRank <= 10 ? 'default' : 'secondary'}>
                        Top {keyword.currentRank && keyword.currentRank <= 10 ? '10' : '50'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="listings" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {listings.map(listing => (
              <Card key={listing.id}>
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    {listing.iconUrl && (
                      <div className="relative w-12 h-12">
                        <Image
                          src={listing.iconUrl}
                          alt={listing.appName}
                          fill
                          className="rounded-lg object-cover"
                          sizes="48px"
                        />
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-lg">{listing.appName}</CardTitle>
                      <CardDescription>{asoService.getAppStoreDisplayName(listing.appStore)}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Rating</span>
                      <div className="flex items-center space-x-1">
                        <Star className="h-4 w-4 fill-warning text-warning" />
                        <span className="font-medium">{listing.rating.toFixed(1)}</span>
                        <span className="text-sm text-muted-foreground">({listing.reviewCount})</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Downloads</span>
                      <span className="font-medium">{asoService.formatNumber(listing.downloads)}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Conversion Rate</span>
                      <span className="font-medium">{(listing.conversionRate * 100).toFixed(1)}%</span>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-muted-foreground">Views to Downloads</span>
                        <span className="text-sm font-medium">
                          {listing.views > 0 ? ((listing.downloads / listing.views) * 100).toFixed(1) : 0}%
                        </span>
                      </div>
                      <Progress
                        value={listing.views > 0 ? (listing.downloads / listing.views) * 100 : 0}
                        className="h-2"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="reviews" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Review Management</CardTitle>
              <CardDescription>Monitor and analyze app store reviews</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">Review Analytics Coming Soon</h3>
                <p className="text-muted-foreground mb-4">
                  Sentiment analysis and review management features are being developed.
                </p>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Sync Reviews
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ab-tests" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>A/B Tests</CardTitle>
              <CardDescription>Statistical testing for app store optimization</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {abTests.length > 0 ? (
                  abTests.map(test => (
                    <div key={test.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">{test.name}</h4>
                        <Badge
                          variant={
                            test.status === AbTestStatus.Running
                              ? 'default'
                              : test.status === AbTestStatus.Completed
                                ? 'secondary'
                                : 'outline'
                          }
                        >
                          {AbTestStatus[test.status]}
                        </Badge>
                      </div>

                      <p className="text-sm text-muted-foreground mb-4">{test.description}</p>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-muted/50 p-3 rounded">
                          <div className="text-sm font-medium">Control</div>
                          <div className="text-lg font-bold">
                            {(test.controlMetrics.conversionRate * 100).toFixed(1)}%
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {asoService.formatNumber(test.controlMetrics.views)} views
                          </div>
                        </div>

                        <div className="bg-primary/10 p-3 rounded">
                          <div className="text-sm font-medium">Variant</div>
                          <div className="text-lg font-bold">
                            {(test.variantMetrics.conversionRate * 100).toFixed(1)}%
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {asoService.formatNumber(test.variantMetrics.views)} views
                          </div>
                        </div>
                      </div>

                      {test.isStatisticallySignificant && (
                        <div className="mt-3 p-2 bg-success/10 border border-success/30 rounded">
                          <div className="text-sm text-success-foreground">✓ Statistically significant result</div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Target className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No A/B Tests Yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Create your first A/B test to optimize your app store listings.
                    </p>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create A/B Test
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
