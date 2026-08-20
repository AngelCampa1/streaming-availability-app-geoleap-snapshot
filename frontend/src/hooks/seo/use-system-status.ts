/**
 * System Status Hook - Fetches system health status from the backend
 */

import { useState, useEffect, useCallback } from 'react';
import { seoApiClient } from '@/lib/seo/api-client';
import { SystemStatus } from '@/lib/seo/types';

export function useSystemStatus() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await seoApiClient.getSystemStatus();
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load system status');
      // Return default status on error to prevent UI breakage
      setStatus({
        overall: 'warning',
        components: [
          { name: 'API Server', status: 'warning', message: 'Unable to fetch status', lastCheck: new Date().toISOString() }
        ],
        metrics: {
          uptime: 0,
          responseTime: 0,
          memoryUsage: 0,
          cpuUsage: 0,
          diskUsage: 0,
          activeConnections: 0
        },
        backgroundJobs: { pending: 0, running: 0, failed: 0 },
        cache: { hitRatio: 0, size: 0, evictions: 0 }
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    fetchStatus();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  return { status, loading, error, refreshing, refresh };
}
