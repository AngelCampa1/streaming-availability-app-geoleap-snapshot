/**
 * Comprehensive tests for asoService.ts
 *
 * Coverage Target: 70%+ (API methods + helper methods)
 * Strategy: Test all API methods with mocked ApiClient + all helper methods
 * Phase 9: Complete asoService coverage (25.78% → 70%+)
 */

import type { AsoKeyword } from '@/types/aso';
import { AppStore, AbTestStatus, AnalyticsGranularity, KeywordSource, KeywordStatus } from '@/types/aso';

//  Mock ApiClient - create mocks INSIDE factory to avoid hoisting issues
jest.mock('@/lib/api', () => {
  // Create mock functions inside the factory
  const mockGet = jest.fn();
  const mockPost = jest.fn();
  const mockPut = jest.fn();
  const mockDelete = jest.fn();

  const mockInstance = {
    get: mockGet,
    post: mockPost,
    put: mockPut,
    delete: mockDelete,
  };

  // Store in globalThis so tests can access them
  (globalThis as any).__asoServiceMocks = mockInstance;

  return {
    ApiClient: jest.fn().mockImplementation(() => mockInstance),
  };
});

// Import asoService AFTER mock
import { asoService } from '../asoService';

// Get references to the mocks for use in tests
const mockGet = (globalThis as any).__asoServiceMocks.get;
const mockPost = (globalThis as any).__asoServiceMocks.post;
const mockPut = (globalThis as any).__asoServiceMocks.put;
const mockDelete = (globalThis as any).__asoServiceMocks.delete;

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockKeyword: AsoKeyword = {
  id: 1,
  keyword: 'streaming vpn',
  appStore: AppStore.iOS,
  searchVolume: 5000,
  difficulty: 0.7,
  relevance: 0.8,
  conversionPotential: 0.6,
  competitionDensity: 0.5,
  currentRank: 3,
  previousRank: 5,
  country: 'us',
  language: 'en',
  topCompetitors: ['com.competitor1', 'com.competitor2'],
  source: KeywordSource.Manual,
  status: KeywordStatus.Active,
  createdAt: new Date().toISOString(),
  lastUpdated: new Date().toISOString(),
};

describe('AsoService - Helper Methods (Pure Functions)', () => {
  beforeEach(() => {
    // Clear mock calls but preserve return values
    mockGet.mockClear();
    mockPost.mockClear();
    mockPut.mockClear();
    mockDelete.mockClear();
  });

  describe('formatKeywordData', () => {
    it('should format array of keywords with calculated percentages', () => {
      const result = asoService.formatKeywordData([mockKeyword]);

      expect(result).toHaveLength(1);
      expect(result[0].difficultyPercentage).toBe(70); // 0.7 * 100
      expect(result[0].relevancePercentage).toBe(80); // 0.8 * 100
      expect(result[0].conversionPercentage).toBe(60); // 0.6 * 100
      expect(result[0].competitionPercentage).toBe(50); // 0.5 * 100
    });

    it('should calculate rank change correctly', () => {
      const result = asoService.formatKeywordData([mockKeyword]);

      expect(result[0].rankChange).toBe(2); // previousRank - currentRank = 5 - 3
      expect(result[0].isRankImproving).toBe(true); // currentRank < previousRank
    });

    it('should handle keyword without previous rank', () => {
      const keyword = { ...mockKeyword, previousRank: undefined };
      const result = asoService.formatKeywordData([keyword as any]);

      expect(result[0].rankChange).toBe(0);
      expect(result[0].isRankImproving).toBe(false);
    });

    it('should handle multiple keywords', () => {
      const keywords = [
        mockKeyword,
        { ...mockKeyword, id: 2, keyword: 'fast vpn', currentRank: 10, previousRank: 8 },
      ];
      const result = asoService.formatKeywordData(keywords);

      expect(result).toHaveLength(2);
      expect(result[1].rankChange).toBe(-2); // Rank declined
      expect(result[1].isRankImproving).toBe(false);
    });
  });

  describe('getAppStoreDisplayName', () => {
    it('should return iOS display name', () => {
      expect(asoService.getAppStoreDisplayName(AppStore.iOS)).toBe('App Store (iOS)');
    });

    it('should return Google Play display name', () => {
      expect(asoService.getAppStoreDisplayName(AppStore.GooglePlay)).toBe('Google Play Store');
    });

    it('should return Both Stores display name', () => {
      expect(asoService.getAppStoreDisplayName(AppStore.Both)).toBe('Both Stores');
    });

    it('should return Unknown for invalid store', () => {
      expect(asoService.getAppStoreDisplayName(999 as AppStore)).toBe('Unknown');
    });
  });

  describe('getSentimentColor', () => {
    it('should return Success Green for positive sentiment', () => {
      expect(asoService.getSentimentColor(0.8)).toBe('#22c55e'); // Success Green 500
      expect(asoService.getSentimentColor(0.5)).toBe('#22c55e');
    });

    it('should return Success Green 400 for slightly positive', () => {
      expect(asoService.getSentimentColor(0.3)).toBe('#4ade80'); // Success Green 400
      expect(asoService.getSentimentColor(0.1)).toBe('#4ade80');
    });

    it('should return Warning Amber for neutral', () => {
      expect(asoService.getSentimentColor(0.05)).toBe('#f59e0b'); // Warning Amber 500
      expect(asoService.getSentimentColor(-0.05)).toBe('#f59e0b');
    });

    it('should return Warning Orange for slightly negative', () => {
      expect(asoService.getSentimentColor(-0.2)).toBe('#fb923c'); // Warning Orange 400
      expect(asoService.getSentimentColor(-0.4)).toBe('#fb923c');
    });

    it('should return Error Red for very negative', () => {
      expect(asoService.getSentimentColor(-0.6)).toBe('#ef4444'); // Error Red 500
      expect(asoService.getSentimentColor(-0.9)).toBe('#ef4444');
    });
  });

  describe('getRankingChangeIcon', () => {
    it('should return up arrow for positive change (improvement)', () => {
      expect(asoService.getRankingChangeIcon(5)).toBe('↗️');
      expect(asoService.getRankingChangeIcon(1)).toBe('↗️');
    });

    it('should return down arrow for negative change (decline)', () => {
      expect(asoService.getRankingChangeIcon(-5)).toBe('↘️');
      expect(asoService.getRankingChangeIcon(-1)).toBe('↘️');
    });

    it('should return right arrow for no change', () => {
      expect(asoService.getRankingChangeIcon(0)).toBe('→');
    });
  });

  describe('formatNumber', () => {
    it('should format numbers in millions', () => {
      expect(asoService.formatNumber(1500000)).toBe('1.5M');
      expect(asoService.formatNumber(2000000)).toBe('2.0M');
      expect(asoService.formatNumber(1234567)).toBe('1.2M');
    });

    it('should format numbers in thousands', () => {
      expect(asoService.formatNumber(5000)).toBe('5.0K');
      expect(asoService.formatNumber(1500)).toBe('1.5K');
      expect(asoService.formatNumber(12345)).toBe('12.3K');
    });

    it('should return small numbers as strings', () => {
      expect(asoService.formatNumber(500)).toBe('500');
      expect(asoService.formatNumber(100)).toBe('100');
      expect(asoService.formatNumber(0)).toBe('0');
    });

    it('should handle edge cases', () => {
      expect(asoService.formatNumber(1000000)).toBe('1.0M');
      expect(asoService.formatNumber(999999)).toBe('1000.0K');
      expect(asoService.formatNumber(1000)).toBe('1.0K');
      expect(asoService.formatNumber(999)).toBe('999');
    });
  });

  describe('calculateStatisticalSignificance', () => {
    it('should calculate p-value and uplift for meaningful difference', () => {
      const result = asoService.calculateStatisticalSignificance(
        0.05, // control conversion
        0.07, // variant conversion
        10000, // control sample
        10000  // variant sample
      );

      expect(result).toHaveProperty('pValue');
      expect(result).toHaveProperty('isSignificant');
      expect(result).toHaveProperty('uplift');
      expect(result).toHaveProperty('confidenceInterval');

      expect(result.pValue).toBeGreaterThanOrEqual(0);
      expect(result.pValue).toBeLessThanOrEqual(1);
      expect(result.uplift).toBeCloseTo(40, 0); // 40% uplift
      expect(result.confidenceInterval).toHaveLength(2);
    });

    it('should handle zero conversion rates', () => {
      const result = asoService.calculateStatisticalSignificance(0, 0, 1000, 1000);

      expect(result.uplift).toBe(0);
      expect(result.pValue).toBeGreaterThanOrEqual(0);
      expect(result.confidenceInterval).toBeDefined();
    });

    it('should calculate uplift correctly for 50% improvement', () => {
      const result = asoService.calculateStatisticalSignificance(
        0.1,  // control
        0.15, // variant
        5000,
        5000
      );

      expect(result.uplift).toBeCloseTo(50, 0); // 50% uplift
    });

    it('should mark results as significant or not based on p-value', () => {
      // Large sample with meaningful difference should be significant
      const significant = asoService.calculateStatisticalSignificance(
        0.05,
        0.07,
        10000,
        10000
      );

      expect(significant.isSignificant).toBe(significant.pValue < 0.05);
    });

    it('should calculate confidence intervals', () => {
      const result = asoService.calculateStatisticalSignificance(0.05, 0.07, 10000, 10000);

      expect(result.confidenceInterval[0]).toBeLessThan(result.confidenceInterval[1]);
    });
  });

  describe('Export Utilities', () => {
    beforeEach(() => {
      mockGet.mockClear();
      mockPost.mockClear();
      mockPut.mockClear();
      mockDelete.mockClear();
    });

    it('should export keywords as JSON', async () => {
      mockGet.mockResolvedValue({ data: [mockKeyword] });

      const result = await asoService.exportData('keywords', 'json');

      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('application/json');

      const text = await result.text();
      const data = JSON.parse(text);
      expect(data).toHaveLength(1);
      expect(data[0].keyword).toBe('streaming vpn');
    });

    it('should export keywords as CSV', async () => {
      mockGet.mockResolvedValue({ data: [mockKeyword] });

      const result = await asoService.exportData('keywords', 'csv');

      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('text/csv');

      const text = await result.text();
      expect(text).toContain('id,keyword,appStore');
      expect(text).toContain('streaming vpn');
    });

    it('should export listings as CSV', async () => {
      const mockListing = { id: 1, name: 'Test App' };
      mockGet.mockResolvedValue({ data: [mockListing] });

      const result = await asoService.exportData('listings', 'csv');

      expect(result).toBeInstanceOf(Blob);
      const text = await result.text();
      expect(text).toContain('id,name');
    });

    it('should export ab-tests as JSON', async () => {
      const mockAbTest = { id: 1, name: 'Test A/B' };
      mockGet.mockResolvedValue({ data: [mockAbTest] });

      const result = await asoService.exportData('ab-tests', 'json');

      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('application/json');
    });

    it('should throw error for unsupported format', async () => {
      await expect(asoService.exportData('keywords', 'xlsx' as any)).rejects.toThrow('Format xlsx not supported');
    });

    it('should handle empty data for CSV export', () => {
      const blob = asoService['convertToCSV']([]);
      expect(blob.type).toBe('text/csv');
    });

    it('should escape CSV values with quotes', async () => {
      const data = [{ name: 'Test "Quote"', value: 123 }];
      const blob = asoService['convertToCSV'](data);

      const text = await blob.text();
      expect(text).toContain('""Quote""'); // Escaped quotes
    });
  });
});

describe('AsoService - API Methods', () => {
  beforeEach(() => {
    mockGet.mockClear();
    mockPost.mockClear();
    mockPut.mockClear();
    mockDelete.mockClear();
  });

  describe('Keyword Management', () => {
    it('should get all keywords', async () => {

      const mockKeywords: AsoKeyword[] = [
        {
          id: 1,
          keyword: 'vpn',
          appStore: AppStore.iOS,
          searchVolume: 1000,
          difficulty: 0.5,
          relevance: 0.7,
          conversionPotential: 0.6,
          competitionDensity: 0.4,
          country: 'us',
          language: 'en',
          topCompetitors: ['com.competitor1'],
          source: KeywordSource.Manual,
          status: KeywordStatus.Active,
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
        },
      ];
      mockGet.mockResolvedValue({ data: mockKeywords });

      const result = await asoService.getKeywords();

      expect(mockGet).toHaveBeenCalledWith('/api/aso/keywords?');
      expect(result).toEqual(mockKeywords);
    });

    it('should get keywords with appStore filter', async () => {

      mockGet.mockResolvedValue({ data: [] });

      await asoService.getKeywords(AppStore.iOS);

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('appStore=1'));
    });

    it('should get keywords with country filter', async () => {

      mockGet.mockResolvedValue({ data: [] });

      await asoService.getKeywords(undefined, 'US');

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('country=US'));
    });

    it('should get single keyword by id', async () => {

      const mockKeyword = { id: 1, keyword: 'test' };
      mockGet.mockResolvedValue({ data: mockKeyword });

      const result = await asoService.getKeyword(1);

      expect(mockGet).toHaveBeenCalledWith('/api/aso/keywords/1');
      expect(result).toEqual(mockKeyword);
    });

    it('should create keyword', async () => {

      const newKeyword = { keyword: 'new vpn', appStore: AppStore.iOS, country: 'US' };
      mockPost.mockResolvedValue({ data: { id: 1, ...newKeyword } });

      const result = await asoService.createKeyword(newKeyword as any);

      expect(mockPost).toHaveBeenCalledWith('/api/aso/keywords', newKeyword);
      expect(result.id).toBe(1);
    });

    it('should update keyword', async () => {

      const updateData = { keyword: 'updated', appStore: AppStore.iOS, country: 'US' };
      mockPut.mockResolvedValue({ data: { id: 1, ...updateData } });

      const result = await asoService.updateKeyword(1, updateData as any);

      expect(mockPut).toHaveBeenCalledWith('/api/aso/keywords/1', updateData);
      expect(result.keyword).toBe('updated');
    });

    it('should delete keyword', async () => {

      mockDelete.mockResolvedValue(undefined);

      await asoService.deleteKeyword(1);

      expect(mockDelete).toHaveBeenCalledWith('/api/aso/keywords/1');
    });

    it('should bulk import keywords', async () => {

      const keywords = [{ keyword: 'test1' }, { keyword: 'test2' }];
      mockPost.mockResolvedValue({
        data: { importedCount: 2, totalRequested: 2, keywords: [] },
      });

      const result = await asoService.bulkImportKeywords(keywords as any);

      expect(mockPost).toHaveBeenCalledWith('/api/aso/keywords/bulk-import', keywords);
      expect(result.importedCount).toBe(2);
    });
  });

  describe('ML-Powered Keyword Discovery', () => {
    it('should discover keywords', async () => {

      const request = { seedKeywords: 'vpn, streaming', appStore: AppStore.iOS, country: 'US' };
      mockPost.mockResolvedValue({
        data: { discoveredCount: 10, seedKeywords: 'vpn, streaming', keywords: [] },
      });

      const result = await asoService.discoverKeywords(request as any);

      expect(mockPost).toHaveBeenCalledWith('/api/aso/keywords/discover', request);
      expect(result.discoveredCount).toBe(10);
    });

    it('should analyze competitor keywords', async () => {

      mockPost.mockResolvedValue({
        data: { competitorBundleId: 'com.test', keywordCount: 5, keywords: [] },
      });

      const result = await asoService.analyzeCompetitorKeywords('com.test', AppStore.iOS, 'US');

      expect(mockPost).toHaveBeenCalledWith(
        expect.stringContaining('bundleId=com.test&appStore=1&country=US')
      );
      expect(result.keywordCount).toBe(5);
    });

    it('should update keyword metrics', async () => {

      mockPost.mockResolvedValue({ data: { message: 'Updated' } });

      const result = await asoService.updateKeywordMetrics(1);

      expect(mockPost).toHaveBeenCalledWith('/api/aso/keywords/1/update-metrics');
      expect(result.message).toBe('Updated');
    });

    it('should get keyword performance', async () => {

      mockGet.mockResolvedValue({ data: { performance: 'data' } });

      const result = await asoService.getKeywordPerformance('2024-01-01');

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('fromDate=2024-01-01'));
      expect(result).toHaveProperty('performance');
    });
  });

  describe('App Store Listing Management', () => {
    it('should get all listings', async () => {

      mockGet.mockResolvedValue({ data: [] });

      await asoService.getListings();

      expect(mockGet).toHaveBeenCalledWith('/api/aso/listings?');
    });

    it('should get listings with appStore filter', async () => {

      mockGet.mockResolvedValue({ data: [] });

      await asoService.getListings(AppStore.GooglePlay);

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('appStore=2'));
    });

    it('should get single listing', async () => {

      mockGet.mockResolvedValue({ data: { id: 1 } });

      await asoService.getListing(1);

      expect(mockGet).toHaveBeenCalledWith('/api/aso/listings/1');
    });

    it('should create listing', async () => {

      const newListing = { name: 'Test App', appStore: AppStore.iOS };
      mockPost.mockResolvedValue({ data: { id: 1, ...newListing } });

      await asoService.createListing(newListing as any);

      expect(mockPost).toHaveBeenCalledWith('/api/aso/listings', newListing);
    });

    it('should update listing', async () => {

      const updateData = { name: 'Updated' };
      mockPut.mockResolvedValue({ data: { id: 1, ...updateData } });

      await asoService.updateListing(1, updateData as any);

      expect(mockPut).toHaveBeenCalledWith('/api/aso/listings/1', updateData);
    });

    it('should delete listing', async () => {

      mockDelete.mockResolvedValue(undefined);

      await asoService.deleteListing(1);

      expect(mockDelete).toHaveBeenCalledWith('/api/aso/listings/1');
    });
  });

  describe('Review Management', () => {
    it('should get reviews for listing', async () => {

      mockGet.mockResolvedValue({ data: [] });

      await asoService.getReviews(1);

      expect(mockGet).toHaveBeenCalledWith('/api/aso/listings/1/reviews?');
    });

    it('should get reviews with fromDate filter', async () => {

      mockGet.mockResolvedValue({ data: [] });

      await asoService.getReviews(1, '2024-01-01');

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('fromDate=2024-01-01'));
    });

    it('should analyze review sentiment', async () => {

      mockPost.mockResolvedValue({ data: { sentiment: 0.8 } });

      await asoService.analyzeReviewSentiment(1);

      expect(mockPost).toHaveBeenCalledWith('/api/aso/reviews/1/analyze-sentiment');
    });

    it('should get review analytics', async () => {

      mockGet.mockResolvedValue({ data: { averageRating: 4.5 } });

      await asoService.getReviewAnalytics(1, '2024-01-01');

      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('/api/aso/listings/1/reviews/analytics')
      );
    });

    it('should sync reviews', async () => {

      mockPost.mockResolvedValue({ data: { message: 'Synced' } });

      await asoService.syncReviews(1);

      expect(mockPost).toHaveBeenCalledWith('/api/aso/listings/1/reviews/sync');
    });
  });

  describe('A/B Testing', () => {
    it('should get all ab tests', async () => {

      mockGet.mockResolvedValue({ data: [] });

      await asoService.getAbTests();

      expect(mockGet).toHaveBeenCalledWith('/api/aso/ab-tests?');
    });

    it('should get ab tests with status filter', async () => {

      mockGet.mockResolvedValue({ data: [] });

      await asoService.getAbTests(AbTestStatus.Draft);

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('status=1'));
    });

    it('should get single ab test', async () => {

      mockGet.mockResolvedValue({ data: { id: 1 } });

      await asoService.getAbTest(1);

      expect(mockGet).toHaveBeenCalledWith('/api/aso/ab-tests/1');
    });

    it('should create ab test', async () => {

      const newTest = { name: 'Test', controlVariant: 'A', testVariant: 'B' };
      mockPost.mockResolvedValue({ data: { id: 1, ...newTest } });

      await asoService.createAbTest(newTest as any);

      expect(mockPost).toHaveBeenCalledWith('/api/aso/ab-tests', newTest);
    });

    it('should start ab test', async () => {

      mockPost.mockResolvedValue({ data: { id: 1, status: AbTestStatus.Running } });

      await asoService.startAbTest(1);

      expect(mockPost).toHaveBeenCalledWith('/api/aso/ab-tests/1/start');
    });

    it('should stop ab test', async () => {

      mockPost.mockResolvedValue({ data: { id: 1, status: AbTestStatus.Completed } });

      await asoService.stopAbTest(1);

      expect(mockPost).toHaveBeenCalledWith('/api/aso/ab-tests/1/stop');
    });

    it('should get ab test results', async () => {

      mockGet.mockResolvedValue({ data: { results: 'data' } });

      await asoService.getAbTestResults(1);

      expect(mockGet).toHaveBeenCalledWith('/api/aso/ab-tests/1/results');
    });

    it('should update ab test metrics', async () => {

      mockPost.mockResolvedValue({ data: { message: 'Updated' } });

      await asoService.updateAbTestMetrics(1);

      expect(mockPost).toHaveBeenCalledWith('/api/aso/ab-tests/1/update-metrics');
    });
  });

  describe('Analytics and Reporting', () => {
    it('should get analytics with all parameters', async () => {

      mockGet.mockResolvedValue({ data: [] });

      await asoService.getAnalytics(1, '2024-01-01', '2024-01-31', AnalyticsGranularity.Daily);

      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('fromDate=2024-01-01&toDate=2024-01-31&granularity=')
      );
    });

    it('should get competitor analysis', async () => {

      mockGet.mockResolvedValue({ data: { competitors: [] } });

      await asoService.getCompetitorAnalysis(1);

      expect(mockGet).toHaveBeenCalledWith('/api/aso/listings/1/competitor-analysis');
    });

    it('should get ranking trends', async () => {

      mockGet.mockResolvedValue({ data: { trends: [] } });

      await asoService.getRankingTrends(1, '2024-01-01');

      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('/api/aso/listings/1/ranking-trends')
      );
    });

    it('should generate aso report', async () => {

      mockGet.mockResolvedValue({ data: { report: 'data' } });

      await asoService.generateAsoReport('2024-01-01', '2024-01-31');

      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('fromDate=2024-01-01&toDate=2024-01-31')
      );
    });
  });

  describe('Cross-Platform Integration', () => {
    it('should synchronize with seo keywords', async () => {

      mockPost.mockResolvedValue({ data: { syncedCount: 10 } });

      await asoService.synchronizeWithSeoKeywords();

      expect(mockPost).toHaveBeenCalledWith('/api/aso/integration/sync-seo-keywords');
    });

    it('should get web to app attribution', async () => {

      mockGet.mockResolvedValue({ data: { attributions: [] } });

      await asoService.getWebToAppAttribution('2024-01-01');

      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('/api/aso/integration/web-to-app-attribution')
      );
    });

    it('should optimize deep links', async () => {

      mockPost.mockResolvedValue({
        data: { listingId: 1, optimizedLinksCount: 5, deepLinks: [] },
      });

      await asoService.optimizeDeepLinks(1);

      expect(mockPost).toHaveBeenCalledWith('/api/aso/listings/1/optimize-deep-links');
    });
  });

  describe('Utility Methods', () => {
    it('should perform health check', async () => {

      mockGet.mockResolvedValue({ data: { status: 'healthy' } });

      const result = await asoService.healthCheck();

      expect(mockGet).toHaveBeenCalledWith('/api/aso/health');
      expect(result.status).toBe('healthy');
    });
  });
});
