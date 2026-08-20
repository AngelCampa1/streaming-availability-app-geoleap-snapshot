import { SeoApiClient, seoApiClient } from '../api-client';
import type {
  SeoPage,
  SeoTemplate,
  ContentGenerationRequest,
  PerformanceMetrics,
  SystemStatus,
  KeywordOpportunity,
} from '../types';
import { server } from '@/mocks/server';

// Mock fetch at module level
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

// Helper to create proper Response mock
const createMockResponse = (data: any, ok = true, status = 200) => ({
  ok,
  status,
  statusText: ok ? 'OK' : 'Error',
  json: async () => data,
  clone: function() {
    return { json: async () => data };
  },
  headers: new Headers(),
  redirected: false,
  type: 'basic' as ResponseType,
  url: '',
  bodyUsed: false,
  arrayBuffer: async () => new ArrayBuffer(0),
  blob: async () => new Blob(),
  formData: async () => new FormData(),
  text: async () => JSON.stringify(data),
  body: null,
} as Response);

describe('SeoApiClient', () => {
  let client: SeoApiClient;

  // Disable MSW for these tests since we're mocking fetch directly
  beforeAll(() => {
    server.close();

    // Mock EventSource for real-time updates test
    global.EventSource = jest.fn().mockImplementation((url: string) => ({
      url,
      close: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    })) as any;
  });

  beforeEach(() => {
    client = new SeoApiClient('/api/seo');
    mockFetch.mockClear();
  });

  afterEach(() => {
    mockFetch.mockReset();
  });

  describe('constructor', () => {
    it('should create instance with default base URL', () => {
      const defaultClient = new SeoApiClient();
      expect(defaultClient).toBeInstanceOf(SeoApiClient);
    });

    it('should create instance with custom base URL', () => {
      const customClient = new SeoApiClient('/custom/api');
      expect(customClient).toBeInstanceOf(SeoApiClient);
    });
  });

  describe('getDashboardOverview', () => {
    it('should fetch dashboard overview', async () => {
      const mockResponse = {
        totalPages: 150,
        activePages: 120,
        recentGeneration: 20,
        systemHealth: 'healthy' as const,
        performance: {
          avgResponseTime: 200,
          uptime: 99.9,
          cacheHitRatio: 0.85,
        },
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(
        
        mockResponse
      ));

      const result = await client.getDashboardOverview();

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/seo/dashboard/overview',
        expect.objectContaining({
          credentials: 'include',
        })
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getPages', () => {
    it('should fetch pages without parameters', async () => {
      const mockResponse = {
        pages: [] as SeoPage[],
        total: 0,
        hasMore: false,
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(
        
        mockResponse
      ));

      const result = await client.getPages();

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/seo/pages?',
        expect.any(Object)
      );
      expect(result).toEqual(mockResponse);
    });

    it('should fetch pages with pagination', async () => {
      const mockResponse = {
        pages: [] as SeoPage[],
        total: 100,
        hasMore: true,
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(
        
        mockResponse
      ));

      await client.getPages({ page: 2, limit: 20 });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/seo/pages?page=2&limit=20',
        expect.any(Object)
      );
    });

    it('should fetch pages with search filter', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(
        
        ({ pages: [], total: 0, hasMore: false })
      ));

      await client.getPages({ search: 'test query' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('search=test+query'),
        expect.any(Object)
      );
    });

    it('should fetch pages with status filter', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(
        
        ({ pages: [], total: 0, hasMore: false })
      ));

      await client.getPages({ status: 'published' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('status=published'),
        expect.any(Object)
      );
    });

    it('should fetch pages with template filter', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(
        
        ({ pages: [], total: 0, hasMore: false })
      ));

      await client.getPages({ template: 'movie-detail' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('template=movie-detail'),
        expect.any(Object)
      );
    });

    it('should fetch pages with sorting', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(
        
        ({ pages: [], total: 0, hasMore: false })
      ));

      await client.getPages({ sortBy: 'createdAt', sortOrder: 'desc' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('sortBy=createdAt'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('sortOrder=desc'),
        expect.any(Object)
      );
    });

    it('should fetch pages with all parameters', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(
        { pages: [], total: 0, hasMore: false }
      ));

      await client.getPages({
        page: 3,
        limit: 50,
        search: 'action movies',
        status: 'published',
        template: 'movie',
        sortBy: 'views',
        sortOrder: 'desc',
      });

      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain('page=3');
      expect(callUrl).toContain('limit=50');
      expect(callUrl).toContain('search=action+movies');
      expect(callUrl).toContain('status=published');
      expect(callUrl).toContain('template=movie');
      expect(callUrl).toContain('sortBy=views');
      expect(callUrl).toContain('sortOrder=desc');
    });
  });

  describe('getPage', () => {
    it('should fetch single page by ID', async () => {
      const mockPage: Partial<SeoPage> = {
        id: 'page-123',
        title: 'Test Page',
        slug: 'test-page',
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(
        
        mockPage
      ));

      const result = await client.getPage('page-123');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/seo/pages/page-123',
        expect.any(Object)
      );
      expect(result).toEqual(mockPage);
    });
  });

  describe('deletePage', () => {
    it('should delete page by ID', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(
        
        ({})
      ));

      await client.deletePage('page-123');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/seo/pages/page-123',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  describe('deletePages', () => {
    it('should bulk delete pages', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(
        
        ({})
      ));

      await client.deletePages(['page-1', 'page-2', 'page-3']);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/seo/pages/bulk-delete',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ ids: ['page-1', 'page-2', 'page-3'] }),
        })
      );
    });
  });

  describe('regeneratePage', () => {
    it('should regenerate single page', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(
        
        ({})
      ));

      await client.regeneratePage('page-123');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/seo/pages/page-123/regenerate',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  describe('regeneratePages', () => {
    it('should bulk regenerate pages', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(
        
        ({})
      ));

      await client.regeneratePages(['page-1', 'page-2']);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/seo/pages/bulk-regenerate',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ ids: ['page-1', 'page-2'] }),
        })
      );
    });
  });

  describe('updatePage', () => {
    it('should update page with partial data', async () => {
      const updates = { title: 'Updated Title', status: 'published' as const };
      const mockResponse: Partial<SeoPage> = {
        id: 'page-123',
        ...updates,
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(
        
        mockResponse
      ));

      const result = await client.updatePage('page-123', updates);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/seo/pages/page-123',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updates),
        })
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('generatePages', () => {
    it('should start page generation job', async () => {
      const request: ContentGenerationRequest = {
        templateId: 'template-1',
        batchSize: 100,
        priority: 'high',
        targetKeywords: ['movie', 'streaming'],
      };

      const mockResponse = {
        jobId: 'job-123',
        estimatedPages: 100,
        estimatedDuration: 300,
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(
        
        mockResponse
      ));

      const result = await client.generatePages(request);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/seo/generation/start',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(request),
        })
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getGenerationStatus', () => {
    it('should get generation job status', async () => {
      const mockStatus = {
        status: 'running' as const,
        progress: 45,
        pagesGenerated: 45,
        estimatedRemaining: 55,
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(
        
        mockStatus
      ));

      const result = await client.getGenerationStatus('job-123');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/seo/generation/job-123/status',
        expect.any(Object)
      );
      expect(result).toEqual(mockStatus);
    });
  });

  describe('cancelGeneration', () => {
    it('should cancel generation job', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(
        
        ({})
      ));

      await client.cancelGeneration('job-123');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/seo/generation/job-123/cancel',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  describe('getKeywordOpportunities', () => {
    it('should fetch keyword opportunities without filters', async () => {
      const mockKeywords: KeywordOpportunity[] = [
        {
          keyword: 'streaming movies',
          volume: 50000,
          difficulty: 0.6,
          competition: 0.7,
          cpc: 1.5,
          trend: [100, 110, 120],
          relatedKeywords: ['watch movies', 'online streaming'],
          estimatedTraffic: 5000,
        },
      ];

      mockFetch.mockResolvedValueOnce(createMockResponse(
        
        mockKeywords
      ));

      const result = await client.getKeywordOpportunities();

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/seo/keywords/opportunities?',
        expect.any(Object)
      );
      expect(result).toEqual(mockKeywords);
    });

    it('should fetch keyword opportunities with filters', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(
        
        []
      ));

      await client.getKeywordOpportunities({
        limit: 50,
        minVolume: 1000,
        maxDifficulty: 0.5,
        category: 'movies',
      });

      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain('limit=50');
      expect(callUrl).toContain('minVolume=1000');
      expect(callUrl).toContain('maxDifficulty=0.5');
      expect(callUrl).toContain('category=movies');
    });
  });

  describe('getTemplates', () => {
    it('should fetch all templates', async () => {
      const mockTemplates: Partial<SeoTemplate>[] = [
        { id: 'template-1', name: 'Movie Detail' },
        { id: 'template-2', name: 'TV Show Detail' },
      ];

      mockFetch.mockResolvedValueOnce(createMockResponse(
        
        mockTemplates
      ));

      const result = await client.getTemplates();

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/seo/templates',
        expect.any(Object)
      );
      expect(result).toEqual(mockTemplates);
    });
  });

  describe('getTemplate', () => {
    it('should fetch single template', async () => {
      const mockTemplate: Partial<SeoTemplate> = {
        id: 'template-1',
        name: 'Movie Detail',
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(
        
        mockTemplate
      ));

      const result = await client.getTemplate('template-1');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/seo/templates/template-1',
        expect.any(Object)
      );
      expect(result).toEqual(mockTemplate);
    });
  });

  describe('createTemplate', () => {
    it('should create new template', async () => {
      const newTemplate = {
        name: 'New Template',
        description: 'Test template',
        category: 'movies',
        template: '<html></html>',
        variables: [],
        seoSettings: {
          titlePattern: 'Test',
          descriptionPattern: 'Test desc',
          keywordPattern: 'keywords',
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        usageCount: 0,
      };

      const mockResponse: SeoTemplate = {
        id: 'template-new',
        ...newTemplate,
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(
        
        mockResponse
      ));

      const result = await client.createTemplate(newTemplate);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/seo/templates',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(newTemplate),
        })
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('updateTemplate', () => {
    it('should update template', async () => {
      const updates = { name: 'Updated Name' };
      const mockResponse: Partial<SeoTemplate> = {
        id: 'template-1',
        ...updates,
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(
        
        mockResponse
      ));

      const result = await client.updateTemplate('template-1', updates);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/seo/templates/template-1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updates),
        })
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('deleteTemplate', () => {
    it('should delete template', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(
        
        ({})
      ));

      await client.deleteTemplate('template-1');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/seo/templates/template-1',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  describe('getPerformanceMetrics', () => {
    it('should fetch performance metrics without filters', async () => {
      const mockMetrics: Partial<PerformanceMetrics> = {
        timeRange: '7d',
        overview: {
          totalViews: 10000,
          totalClicks: 500,
          avgCtr: 0.05,
          avgPosition: 15.5,
        },
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(
        
        mockMetrics
      ));

      const result = await client.getPerformanceMetrics();

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/seo/analytics/performance?',
        expect.any(Object)
      );
      expect(result).toEqual(mockMetrics);
    });

    it('should fetch performance metrics with time range', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(
        
        ({})
      ));

      await client.getPerformanceMetrics({ timeRange: '30d' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('timeRange=30d'),
        expect.any(Object)
      );
    });

    it('should fetch performance metrics for specific page', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(
        
        ({})
      ));

      await client.getPerformanceMetrics({ pageId: 'page-123' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('pageId=page-123'),
        expect.any(Object)
      );
    });
  });

  describe('getContentQualityScores', () => {
    it('should fetch quality scores for all pages', async () => {
      const mockScores = [
        {
          pageId: 'page-1',
          overallScore: 85,
          scores: {
            readability: 90,
            seoOptimization: 80,
            contentLength: 85,
            keywordDensity: 85,
          },
        },
      ];

      mockFetch.mockResolvedValueOnce(createMockResponse(
        
        mockScores
      ));

      const result = await client.getContentQualityScores();

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/seo/analytics/quality-scores',
        expect.any(Object)
      );
      expect(result).toEqual(mockScores);
    });

    it('should fetch quality scores for specific pages', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(
        
        []
      ));

      await client.getContentQualityScores(['page-1', 'page-2']);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/seo/analytics/quality-scores?pageIds=page-1,page-2',
        expect.any(Object)
      );
    });
  });

  describe('getInternalLinks', () => {
    it('should fetch internal link structure', async () => {
      const mockLinks = {
        nodes: [
          { id: 'page-1', title: 'Page 1', url: '/page-1', pageRank: 0.5 },
        ],
        links: [
          { source: 'page-1', target: 'page-2', weight: 1 },
        ],
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(
        
        mockLinks
      ));

      const result = await client.getInternalLinks();

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/seo/analytics/internal-links',
        expect.any(Object)
      );
      expect(result).toEqual(mockLinks);
    });
  });

  describe('getSystemStatus', () => {
    it('should fetch system status', async () => {
      const mockStatus: Partial<SystemStatus> = {
        overall: 'healthy',
        components: [],
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(
        
        mockStatus
      ));

      const result = await client.getSystemStatus();

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/seo/admin/system-status',
        expect.any(Object)
      );
      expect(result).toEqual(mockStatus);
    });
  });

  describe('getBackgroundJobs', () => {
    it('should fetch background jobs', async () => {
      const mockJobs = [
        {
          id: 'job-1',
          name: 'Page Generation',
          status: 'running' as const,
          progress: 50,
          startedAt: new Date().toISOString(),
        },
      ];

      mockFetch.mockResolvedValueOnce(createMockResponse(
        
        mockJobs
      ));

      const result = await client.getBackgroundJobs();

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/seo/admin/jobs',
        expect.any(Object)
      );
      expect(result).toEqual(mockJobs);
    });
  });

  describe('cancelJob', () => {
    it('should cancel background job', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(
        
        ({})
      ));

      await client.cancelJob('job-123');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/seo/admin/jobs/job-123/cancel',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  describe('retryJob', () => {
    it('should retry failed job', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(
        
        ({})
      ));

      await client.retryJob('job-123');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/seo/admin/jobs/job-123/retry',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  describe('getSystemLogs', () => {
    it('should fetch system logs without filters', async () => {
      const mockLogs = {
        logs: [
          {
            id: 'log-1',
            timestamp: new Date().toISOString(),
            level: 'info',
            component: 'generator',
            message: 'Pages generated',
          },
        ],
        total: 1,
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(
        
        mockLogs
      ));

      const result = await client.getSystemLogs();

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/seo/admin/logs?',
        expect.any(Object)
      );
      expect(result).toEqual(mockLogs);
    });

    it('should fetch system logs with filters', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(
        
        ({ logs: [], total: 0 })
      ));

      await client.getSystemLogs({
        level: 'error',
        component: 'generator',
        limit: 100,
        offset: 50,
      });

      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain('level=error');
      expect(callUrl).toContain('component=generator');
      expect(callUrl).toContain('limit=100');
      expect(callUrl).toContain('offset=50');
    });
  });

  describe('updateSystemConfig', () => {
    it('should update system configuration', async () => {
      const config = {
        maxConcurrentJobs: 5,
        cacheExpiry: 3600,
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(
        
        ({})
      ));

      await client.updateSystemConfig(config);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/seo/admin/config',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(config),
        })
      );
    });
  });

  describe('createEventSource', () => {
    it('should create EventSource for real-time updates', () => {
      const endpoint = '/generation/job-123/progress';
      const eventSource = client.createEventSource(endpoint);

      expect(global.EventSource).toHaveBeenCalledWith('/api/seo/generation/job-123/progress');
      expect(eventSource.url).toContain('/api/seo/generation/job-123/progress');
    });
  });

  describe('error handling', () => {
    it('should throw error on failed API request', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(
        {},
        false,
        500
      ));

      await expect(client.getDashboardOverview()).rejects.toThrow(
        'API request failed: 500 Error'
      );
    });

    it('should throw error on 404', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(
        {},
        false,
        404
      ));

      await expect(client.getPage('nonexistent')).rejects.toThrow(
        'API request failed: 404 Error'
      );
    });

    it('should throw error on 401 unauthorized', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(
        {},
        false,
        401
      ));

      await expect(client.deleteTemplate('template-1')).rejects.toThrow(
        'API request failed: 401 Error'
      );
    });
  });

  describe('singleton instance', () => {
    it('should export singleton instance', () => {
      expect(seoApiClient).toBeInstanceOf(SeoApiClient);
    });

    it('should be reusable across imports', () => {
      const instance1 = seoApiClient;
      const instance2 = seoApiClient;
      expect(instance1).toBe(instance2);
    });
  });

  describe('credentials and headers', () => {
    it('should include credentials in all requests', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(
        
        ({})
      ));

      await client.getDashboardOverview();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          credentials: 'include',
        })
      );
    });

    it('should set Content-Type header for POST requests', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(
        
        ({ jobId: 'test', estimatedPages: 0, estimatedDuration: 0 })
      ));

      await client.generatePages({
        templateId: 'test',
        batchSize: 10,
        priority: 'low',
        targetKeywords: [],
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should set Content-Type header for PUT requests', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(
        
        ({})
      ));

      await client.updatePage('page-1', { title: 'Updated' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });
  });
});
