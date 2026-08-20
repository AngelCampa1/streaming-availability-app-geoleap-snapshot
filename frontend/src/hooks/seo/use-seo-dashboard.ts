/**
 * SEO Dashboard Hook - Manages dashboard state and data fetching
 */

import { useState, useEffect } from 'react';
import { seoApiClient } from '@/lib/seo/api-client';
import { DashboardStats } from '@/lib/seo/types';

export function useSEODashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const data = await seoApiClient.getDashboardOverview();
      setStats({
        ...data,
        recentActivity: [
          {
            type: 'generation',
            message: 'Generated 150 new pages for Movie category',
            timestamp: new Date().toISOString(),
          },
          {
            type: 'publication',
            message: 'Published 45 pages to production',
            timestamp: new Date(Date.now() - 300000).toISOString(),
          },
          {
            type: 'error',
            message: '3 pages failed validation',
            timestamp: new Date(Date.now() - 600000).toISOString(),
          },
        ],
        quickActions: {
          pendingReviews: 12,
          failedJobs: 3,
          lowPerformingPages: 8,
        },
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
  };

  useEffect(() => {
    fetchDashboardData();

    // Set up auto-refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);

    return () => clearInterval(interval);
  }, []);

  return {
    stats,
    loading,
    error,
    refreshing,
    refresh,
  };
}
