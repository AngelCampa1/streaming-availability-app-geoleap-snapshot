'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Filter, Download, Settings, BarChart3, Globe, Cog, Zap } from 'lucide-react';

// Dashboard Components
import { OverviewCards } from '@/components/seo/dashboard/overview-cards';
import { QuickActions } from '@/components/seo/dashboard/quick-actions';
import { RecentActivity } from '@/components/seo/dashboard/recent-activity';

// Page Management Components
import { PagesTable } from '@/components/seo/page-management/pages-table';
import { BulkActionsBar } from '@/components/seo/page-management/bulk-actions-bar';

// Content Generation Components
import { GenerationForm } from '@/components/seo/content-generation/generation-form';
import { GenerationProgress } from '@/components/seo/content-generation/generation-progress';
import type { ContentGenerationRequest } from '@/lib/seo/types';

// Analytics Components
import { PerformanceCharts } from '@/components/seo/analytics/performance-charts';

// System Admin Components
import { SystemStatus } from '@/components/seo/system-admin/system-status';
import { BackgroundJobs } from '@/components/seo/system-admin/background-jobs';

// Custom Hooks
import { useSEODashboard } from '@/hooks/seo/use-seo-dashboard';
import { useSEOPages } from '@/hooks/seo/use-seo-pages';
import { useContentGeneration } from '@/hooks/seo/use-content-generation';
import { useSystemStatus } from '@/hooks/seo/use-system-status';
import { useBackgroundJobs } from '@/hooks/seo/use-background-jobs';
import { usePerformanceMetrics } from '@/hooks/seo/use-performance-metrics';

export default function SEODashboardPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [analyticsTimeRange, setAnalyticsTimeRange] = useState<'24h' | '7d' | '30d' | '90d'>('30d');

  // Custom hooks for data management
  const { stats, loading: dashboardLoading, error: dashboardError, refresh: refreshDashboard } = useSEODashboard();
  const { status: systemStatus, refreshing: systemStatusRefreshing, refresh: refreshSystemStatus } = useSystemStatus();
  const { jobs: backgroundJobs, cancelJob, retryJob, refresh: refreshJobs } = useBackgroundJobs();
  const { metrics: analyticsData } = usePerformanceMetrics(analyticsTimeRange);
  const {
    pages,
    loading: _pagesLoading,
    selectedIds,
    pagination: _pagination,
    search,
    selectPage,
    selectAll,
    clearSelection,
    deleteSelectedPages,
    regenerateSelectedPages,
    deletePage,
    regeneratePage,
    sort,
    sortBy,
    sortOrder,
  } = useSEOPages();

  const { templates, activeJobs, startGeneration, cancelGeneration } = useContentGeneration();

  // Wrapper function to match GenerationForm expected signature
  const handleStartGeneration = async (request: ContentGenerationRequest): Promise<void> => {
    await startGeneration(request);
  };

  // Event handlers
  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'generate-pages':
        setActiveTab('generation');
        break;
      case 'review-pending':
        setActiveTab('pages');
        // Apply filter for pending review
        break;
      case 'fix-failures':
        setActiveTab('system');
        break;
      case 'optimize-performance':
        setActiveTab('analytics');
        break;
      default:
      // Unhandled action
    }
  };

  const handleSystemRefresh = async () => {
    await refreshSystemStatus();
  };

  const handleJobCancel = async (jobId: string) => {
    // Try to cancel from both hooks - generation jobs and background jobs
    try {
      await cancelGeneration(jobId);
    } catch {
      await cancelJob(jobId);
    }
  };

  const handleJobRetry = async (jobId: string) => {
    await retryJob(jobId);
  };

  if (dashboardError) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Dashboard</CardTitle>
            <CardDescription>{dashboardError}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={refreshDashboard}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">SEO Management</h1>
          <p className="text-muted-foreground">Comprehensive programmatic SEO dashboard and management interface</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="pages" className="flex items-center space-x-2">
            <Globe className="h-4 w-4" />
            <span>Pages</span>
          </TabsTrigger>
          <TabsTrigger value="generation" className="flex items-center space-x-2">
            <Zap className="h-4 w-4" />
            <span>Generation</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center space-x-2">
            <Cog className="h-4 w-4" />
            <span>System</span>
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          {dashboardLoading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="space-y-0 pb-2">
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-8 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-full"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : stats ? (
            <>
              <OverviewCards stats={stats} />
              <div className="grid gap-6 lg:grid-cols-2">
                <QuickActions stats={stats} onAction={handleQuickAction} />
                <RecentActivity stats={stats} />
              </div>
            </>
          ) : null}
        </TabsContent>

        {/* Pages Management Tab */}
        <TabsContent value="pages" className="space-y-6">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 flex items-center space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search pages..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && search(searchQuery)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" onClick={() => search(searchQuery)}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center space-x-2">
              <Select defaultValue="all">
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </div>
          </div>

          {/* Bulk Actions Bar */}
          <BulkActionsBar
            selectedCount={selectedIds.length}
            onClearSelection={clearSelection}
            onRegenerateSelected={regenerateSelectedPages}
            onDeleteSelected={deleteSelectedPages}
          />

          {/* Pages Table */}
          <PagesTable
            pages={pages}
            selectedIds={selectedIds}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSelectPage={selectPage}
            onSelectAll={selectAll}
            onSort={sort}
            onDeletePage={deletePage}
            onRegeneratePage={regeneratePage}
          />
        </TabsContent>

        {/* Content Generation Tab */}
        <TabsContent value="generation" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <GenerationForm templates={templates} onSubmit={handleStartGeneration} />
            <GenerationProgress jobs={activeJobs} onCancelJob={handleJobCancel} />
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Performance Analytics</h2>
              <p className="text-muted-foreground">SEO metrics, Core Web Vitals, and performance insights</p>
            </div>
            <Select value={analyticsTimeRange} onValueChange={(value) => setAnalyticsTimeRange(value as '24h' | '7d' | '30d' | '90d')}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">24 Hours</SelectItem>
                <SelectItem value="7d">7 Days</SelectItem>
                <SelectItem value="30d">30 Days</SelectItem>
                <SelectItem value="90d">90 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <PerformanceCharts metrics={analyticsData || { timeRange: '30d', overview: { totalViews: 0, totalClicks: 0, avgCtr: 0, avgPosition: 0 }, coreWebVitals: { lcp: { value: 0, trend: 0, distribution: { good: 0, needsImprovement: 0, poor: 0 } }, fid: { value: 0, trend: 0, distribution: { good: 0, needsImprovement: 0, poor: 0 } }, cls: { value: 0, trend: 0, distribution: { good: 0, needsImprovement: 0, poor: 0 } } }, traffic: [], topPages: [], topKeywords: [] }} />
        </TabsContent>

        {/* System Administration Tab */}
        <TabsContent value="system" className="space-y-6">
          <Tabs defaultValue="status" className="space-y-6">
            <TabsList>
              <TabsTrigger value="status">System Status</TabsTrigger>
              <TabsTrigger value="jobs">Background Jobs</TabsTrigger>
            </TabsList>

            <TabsContent value="status">
              {systemStatus && (
                <SystemStatus
                  status={systemStatus}
                  onRefresh={handleSystemRefresh}
                  refreshing={systemStatusRefreshing}
                />
              )}
            </TabsContent>

            <TabsContent value="jobs">
              <BackgroundJobs
                jobs={backgroundJobs}
                onCancelJob={handleJobCancel}
                onRetryJob={handleJobRetry}
                onRefresh={refreshJobs}
              />
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}
