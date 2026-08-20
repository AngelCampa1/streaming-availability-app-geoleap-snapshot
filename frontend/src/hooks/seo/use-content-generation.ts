/**
 * Content Generation Hook - Manages batch page generation and progress tracking
 */

import { useState, useEffect, useCallback } from 'react';
import { seoApiClient } from '@/lib/seo/api-client';
import { ContentGenerationRequest, SeoTemplate, KeywordOpportunity } from '@/lib/seo/types';

export function useContentGeneration() {
  const [templates, setTemplates] = useState<SeoTemplate[]>([]);
  const [keywords, setKeywords] = useState<KeywordOpportunity[]>([]);
  const [activeJobs, setActiveJobs] = useState<
    {
      jobId: string;
      status: 'pending' | 'running' | 'completed' | 'failed';
      progress: number;
      pagesGenerated: number;
      estimatedRemaining?: number;
      errors?: string[];
      request: ContentGenerationRequest;
    }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    try {
      const templatesData = await seoApiClient.getTemplates();
      setTemplates(templatesData);
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    }
  }, []);

  const fetchKeywordOpportunities = useCallback(
    async (
      params: {
        limit?: number;
        minVolume?: number;
        maxDifficulty?: number;
        category?: string;
      } = {}
    ) => {
      try {
        setLoading(true);
        const keywordsData = await seoApiClient.getKeywordOpportunities(params);
        setKeywords(keywordsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch keyword opportunities');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const startGeneration = async (request: ContentGenerationRequest): Promise<string> => {
    try {
      setLoading(true);
      const response = await seoApiClient.generatePages(request);

      // Add to active jobs
      const newJob = {
        jobId: response.jobId,
        status: 'pending' as const,
        progress: 0,
        pagesGenerated: 0,
        request,
      };

      setActiveJobs(prev => [...prev, newJob]);
      setError(null);

      return response.jobId;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start generation');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const cancelGeneration = async (jobId: string) => {
    try {
      await seoApiClient.cancelGeneration(jobId);
      setActiveJobs(prev => prev.filter(job => job.jobId !== jobId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel generation');
      throw err;
    }
  };

  const updateJobStatus = useCallback(async (jobId: string) => {
    try {
      const status = await seoApiClient.getGenerationStatus(jobId);
      setActiveJobs(prev => prev.map(job => (job.jobId === jobId ? { ...job, ...status } : job)));

      // Remove completed or failed jobs after a delay
      if (status.status === 'completed' || status.status === 'failed') {
        setTimeout(() => {
          setActiveJobs(prev => prev.filter(job => job.jobId !== jobId));
        }, 10000);
      }
    } catch (err) {
      console.error('Failed to update job status:', err);
    }
  }, []);

  // Poll active jobs for status updates
  useEffect(() => {
    if (activeJobs.length === 0) return;

    const interval = setInterval(() => {
      activeJobs.forEach(job => {
        if (job.status === 'pending' || job.status === 'running') {
          updateJobStatus(job.jobId);
        }
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [activeJobs, updateJobStatus]);

  useEffect(() => {
    fetchTemplates();
    fetchKeywordOpportunities({ limit: 100 });
  }, [fetchTemplates, fetchKeywordOpportunities]);

  return {
    templates,
    keywords,
    activeJobs,
    loading,
    error,
    startGeneration,
    cancelGeneration,
    fetchKeywordOpportunities,
    refreshTemplates: fetchTemplates,
  };
}
