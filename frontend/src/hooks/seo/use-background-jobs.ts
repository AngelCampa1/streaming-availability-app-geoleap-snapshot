/**
 * Background Jobs Hook - Fetches and manages background jobs from the backend
 */

import { useState, useEffect, useCallback } from 'react';
import { seoApiClient } from '@/lib/seo/api-client';

interface BackgroundJob {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  startedAt: string;
  completedAt?: string;
  error?: string;
}

export function useBackgroundJobs() {
  const [jobs, setJobs] = useState<BackgroundJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      const data = await seoApiClient.getBackgroundJobs();
      setJobs(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load background jobs');
      // Return empty list on error
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const cancelJob = useCallback(async (jobId: string) => {
    try {
      await seoApiClient.cancelJob(jobId);
      await fetchJobs(); // Refresh jobs after cancel
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to cancel job');
    }
  }, [fetchJobs]);

  const retryJob = useCallback(async (jobId: string) => {
    try {
      await seoApiClient.retryJob(jobId);
      await fetchJobs(); // Refresh jobs after retry
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to retry job');
    }
  }, [fetchJobs]);

  const refresh = useCallback(async () => {
    await fetchJobs();
  }, [fetchJobs]);

  useEffect(() => {
    fetchJobs();

    // Auto-refresh every 10 seconds for jobs
    const interval = setInterval(fetchJobs, 10000);
    return () => clearInterval(interval);
  }, [fetchJobs]);

  return { jobs, loading, error, cancelJob, retryJob, refresh };
}
