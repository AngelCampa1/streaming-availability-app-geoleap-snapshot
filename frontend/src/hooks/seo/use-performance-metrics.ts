/**
 * Performance Metrics Hook - Fetches SEO performance analytics from the backend
 */

import { useState, useEffect, useCallback } from 'react';
import { seoApiClient } from '@/lib/seo/api-client';
import { PerformanceMetrics } from '@/lib/seo/types';

export function usePerformanceMetrics(timeRange: '24h' | '7d' | '30d' | '90d' = '30d') {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      const data = await seoApiClient.getPerformanceMetrics({ timeRange });
      setMetrics(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load performance metrics');
      // Return default metrics on error
      setMetrics({
        timeRange,
        overview: {
          totalViews: 0,
          totalClicks: 0,
          avgCtr: 0,
          avgPosition: 0
        },
        coreWebVitals: {
          lcp: { value: 0, trend: 0, distribution: { good: 0, needsImprovement: 0, poor: 0 } },
          fid: { value: 0, trend: 0, distribution: { good: 0, needsImprovement: 0, poor: 0 } },
          cls: { value: 0, trend: 0, distribution: { good: 0, needsImprovement: 0, poor: 0 } }
        },
        traffic: [],
        topPages: [],
        topKeywords: []
      });
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  const refresh = useCallback(async () => {
    await fetchMetrics();
  }, [fetchMetrics]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return { metrics, loading, error, refresh };
}
