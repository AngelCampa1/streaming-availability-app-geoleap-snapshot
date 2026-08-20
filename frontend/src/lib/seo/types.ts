/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * SEO Management Interface Types
 */

export interface SeoPage {
  id: string;
  title: string;
  slug: string;
  url: string;
  metaDescription: string;
  keywords: string[];
  templateId: string;
  status: 'draft' | 'published' | 'archived';
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  performance: {
    views: number;
    clicks: number;
    impressions: number;
    ctr: number;
    avgPosition: number;
  };
  seoMetrics: {
    coreWebVitals: {
      lcp: number;
      fid: number;
      cls: number;
      passed: boolean;
    };
    lighthouse: {
      performance: number;
      accessibility: number;
      seo: number;
      bestPractices: number;
    };
  };
  content: {
    wordCount: number;
    readabilityScore: number;
    keywordDensity: Record<string, number>;
  };
}

export interface SeoTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  template: string; // HTML template with placeholders
  variables: {
    name: string;
    type: 'string' | 'number' | 'array' | 'object';
    required: boolean;
    defaultValue?: any;
    description: string;
  }[];
  seoSettings: {
    titlePattern: string;
    descriptionPattern: string;
    keywordPattern: string;
    structuredData?: any;
  };
  createdAt: string;
  updatedAt: string;
  usageCount: number;
}

export interface ContentGenerationRequest {
  templateId: string;
  batchSize: number;
  priority: 'low' | 'medium' | 'high';
  targetKeywords: string[];
  dataSource?: {
    type: 'api' | 'database' | 'file';
    config: any;
  };
  filters?: {
    minVolume?: number;
    maxDifficulty?: number;
    excludeKeywords?: string[];
  };
  schedule?: {
    startDate: string;
    frequency: 'once' | 'daily' | 'weekly' | 'monthly';
  };
}

export interface KeywordOpportunity {
  keyword: string;
  volume: number;
  difficulty: number;
  competition: number;
  cpc: number;
  trend: number[];
  relatedKeywords: string[];
  estimatedTraffic: number;
  existingPage?: {
    id: string;
    title: string;
    position: number;
  };
}

export interface PerformanceMetrics {
  timeRange: string;
  overview: {
    totalViews: number;
    totalClicks: number;
    avgCtr: number;
    avgPosition: number;
  };
  coreWebVitals: {
    lcp: {
      value: number;
      trend: number;
      distribution: { good: number; needsImprovement: number; poor: number };
    };
    fid: {
      value: number;
      trend: number;
      distribution: { good: number; needsImprovement: number; poor: number };
    };
    cls: {
      value: number;
      trend: number;
      distribution: { good: number; needsImprovement: number; poor: number };
    };
  };
  traffic: {
    date: string;
    views: number;
    clicks: number;
    impressions: number;
  }[];
  topPages: {
    pageId: string;
    title: string;
    views: number;
    clicks: number;
    ctr: number;
    position: number;
  }[];
  topKeywords: {
    keyword: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }[];
}

export interface SystemStatus {
  overall: 'healthy' | 'warning' | 'critical';
  components: {
    name: string;
    status: 'healthy' | 'warning' | 'critical';
    message?: string;
    lastCheck: string;
  }[];
  metrics: {
    uptime: number;
    responseTime: number;
    memoryUsage: number;
    cpuUsage: number;
    diskUsage: number;
    activeConnections: number;
  };
  backgroundJobs: {
    pending: number;
    running: number;
    failed: number;
  };
  cache: {
    hitRatio: number;
    size: number;
    evictions: number;
  };
}

export interface DashboardStats {
  totalPages: number;
  activePages: number;
  recentGeneration: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
  performance: {
    avgResponseTime: number;
    uptime: number;
    cacheHitRatio: number;
  };
  recentActivity: {
    type: 'generation' | 'publication' | 'error';
    message: string;
    timestamp: string;
  }[];
  quickActions: {
    pendingReviews: number;
    failedJobs: number;
    lowPerformingPages: number;
  };
}

// Chart data types
export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor?: string;
    backgroundColor?: string;
    fill?: boolean;
  }[];
}

export interface TableColumn<T> {
  key: keyof T;
  title: string;
  sortable?: boolean;
  render?: (value: any, item: T) => React.ReactNode;
  width?: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export interface FilterOptions {
  status?: string[];
  template?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  performance?: {
    minViews?: number;
    maxViews?: number;
    minCtr?: number;
    maxCtr?: number;
  };
}

export interface BulkAction {
  id: string;
  label: string;
  icon?: string;
  action: (selectedIds: string[]) => Promise<void>;
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
}
