/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * SEO API Client - Handles all communication with the programmatic SEO backend
 */

import {
  SeoPage,
  SeoTemplate,
  ContentGenerationRequest,
  PerformanceMetrics,
  SystemStatus,
  KeywordOpportunity,
} from './types';

export class SeoApiClient {
  private baseUrl: string;
  private headers: HeadersInit;

  constructor(baseUrl: string = '/api/seo') {
    this.baseUrl = baseUrl;
    this.headers = {
      'Content-Type': 'application/json',
    };
  }

  // Authentication - SECURITY: Use credentials: 'include' for cookie-based auth
  private getHeaders(): HeadersInit {
    return this.headers;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = this.getHeaders();

    // SECURITY: Use credentials: 'include' for cookie-based auth instead of localStorage tokens
    const response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        ...headers,
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Dashboard API
  async getDashboardOverview(): Promise<{
    totalPages: number;
    activePages: number;
    recentGeneration: number;
    systemHealth: 'healthy' | 'warning' | 'critical';
    performance: {
      avgResponseTime: number;
      uptime: number;
      cacheHitRatio: number;
    };
  }> {
    return this.request('/dashboard/overview');
  }

  // Page Management API
  async getPages(
    params: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
      template?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<{
    pages: SeoPage[];
    total: number;
    hasMore: boolean;
  }> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        query.append(key, value.toString());
      }
    });

    return this.request(`/pages?${query.toString()}`);
  }

  async getPage(id: string): Promise<SeoPage> {
    return this.request(`/pages/${id}`);
  }

  async deletePage(id: string): Promise<void> {
    await this.request(`/pages/${id}`, { method: 'DELETE' });
  }

  async deletePages(ids: string[]): Promise<void> {
    await this.request('/pages/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
  }

  async regeneratePage(id: string): Promise<void> {
    await this.request(`/pages/${id}/regenerate`, { method: 'POST' });
  }

  async regeneratePages(ids: string[]): Promise<void> {
    await this.request('/pages/bulk-regenerate', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
  }

  async updatePage(id: string, updates: Partial<SeoPage>): Promise<SeoPage> {
    return this.request(`/pages/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // Content Generation API
  async generatePages(request: ContentGenerationRequest): Promise<{
    jobId: string;
    estimatedPages: number;
    estimatedDuration: number;
  }> {
    return this.request('/generation/start', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getGenerationStatus(jobId: string): Promise<{
    status: 'pending' | 'running' | 'completed' | 'failed';
    progress: number;
    pagesGenerated: number;
    estimatedRemaining?: number;
    errors?: string[];
  }> {
    return this.request(`/generation/${jobId}/status`);
  }

  async cancelGeneration(jobId: string): Promise<void> {
    await this.request(`/generation/${jobId}/cancel`, { method: 'POST' });
  }

  async getKeywordOpportunities(
    params: {
      limit?: number;
      minVolume?: number;
      maxDifficulty?: number;
      category?: string;
    } = {}
  ): Promise<KeywordOpportunity[]> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        query.append(key, value.toString());
      }
    });

    return this.request(`/keywords/opportunities?${query.toString()}`);
  }

  // Template Management API
  async getTemplates(): Promise<SeoTemplate[]> {
    return this.request('/templates');
  }

  async getTemplate(id: string): Promise<SeoTemplate> {
    return this.request(`/templates/${id}`);
  }

  async createTemplate(template: Omit<SeoTemplate, 'id'>): Promise<SeoTemplate> {
    return this.request('/templates', {
      method: 'POST',
      body: JSON.stringify(template),
    });
  }

  async updateTemplate(id: string, updates: Partial<SeoTemplate>): Promise<SeoTemplate> {
    return this.request(`/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteTemplate(id: string): Promise<void> {
    await this.request(`/templates/${id}`, { method: 'DELETE' });
  }

  // Performance Analytics API
  async getPerformanceMetrics(
    params: {
      timeRange?: '24h' | '7d' | '30d' | '90d';
      pageId?: string;
    } = {}
  ): Promise<PerformanceMetrics> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        query.append(key, value.toString());
      }
    });

    return this.request(`/analytics/performance?${query.toString()}`);
  }

  async getContentQualityScores(pageIds?: string[]): Promise<
    {
      pageId: string;
      overallScore: number;
      scores: {
        readability: number;
        seoOptimization: number;
        contentLength: number;
        keywordDensity: number;
      };
    }[]
  > {
    const query = pageIds ? `?pageIds=${pageIds.join(',')}` : '';
    return this.request(`/analytics/quality-scores${query}`);
  }

  async getInternalLinks(): Promise<{
    nodes: { id: string; title: string; url: string; pageRank: number }[];
    links: { source: string; target: string; weight: number }[];
  }> {
    return this.request('/analytics/internal-links');
  }

  // System Administration API
  async getSystemStatus(): Promise<SystemStatus> {
    return this.request('/admin/system-status');
  }

  async getBackgroundJobs(): Promise<
    {
      id: string;
      name: string;
      status: 'pending' | 'running' | 'completed' | 'failed';
      progress: number;
      startedAt: string;
      completedAt?: string;
      error?: string;
    }[]
  > {
    return this.request('/admin/jobs');
  }

  async cancelJob(jobId: string): Promise<void> {
    await this.request(`/admin/jobs/${jobId}/cancel`, { method: 'POST' });
  }

  async retryJob(jobId: string): Promise<void> {
    await this.request(`/admin/jobs/${jobId}/retry`, { method: 'POST' });
  }

  async getSystemLogs(
    params: {
      level?: 'info' | 'warning' | 'error';
      component?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{
    logs: {
      id: string;
      timestamp: string;
      level: string;
      component: string;
      message: string;
      metadata?: any;
    }[];
    total: number;
  }> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        query.append(key, value.toString());
      }
    });

    return this.request(`/admin/logs?${query.toString()}`);
  }

  async updateSystemConfig(config: Record<string, any>): Promise<void> {
    await this.request('/admin/config', {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  }

  // Real-time updates
  createEventSource(endpoint: string): EventSource {
    return new EventSource(`${this.baseUrl}${endpoint}`);
  }
}

// Singleton instance
export const seoApiClient = new SeoApiClient();
