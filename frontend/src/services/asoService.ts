import { ApiClient } from '@/lib/api';

const apiClient = new ApiClient();
import {
  AsoKeyword,
  CreateAsoKeywordDto,
  AppStoreListing,
  CreateAppStoreListingDto,
  AppStoreReview,
  AsoAbTest,
  CreateAsoAbTestDto,
  AsoAnalytics,
  KeywordDiscoveryRequest,
  ReviewAnalytics,
  CompetitorAnalysis,
  RankingTrends,
  WebToAppAttribution,
  SeoAsoSynchronization,
  AppStore,
  AbTestStatus,
  AnalyticsGranularity,
} from '@/types/aso';

export class AsoService {
  private readonly basePath = '/api/aso';

  // Keyword Management
  async getKeywords(appStore?: AppStore, country?: string): Promise<AsoKeyword[]> {
    const params = new URLSearchParams();
    if (appStore !== undefined) params.append('appStore', appStore.toString());
    if (country) params.append('country', country);

    const response = await apiClient.get<{ data: AsoKeyword[] }>(`${this.basePath}/keywords?${params}`);
    return response.data;
  }

  async getKeyword(id: number): Promise<AsoKeyword> {
    const response = await apiClient.get<{ data: AsoKeyword }>(`${this.basePath}/keywords/${id}`);
    return response.data;
  }

  async createKeyword(dto: CreateAsoKeywordDto): Promise<AsoKeyword> {
    const response = await apiClient.post<{ data: AsoKeyword }>(`${this.basePath}/keywords`, dto);
    return response.data;
  }

  async updateKeyword(id: number, dto: CreateAsoKeywordDto): Promise<AsoKeyword> {
    const response = await apiClient.put<{ data: AsoKeyword }>(`${this.basePath}/keywords/${id}`, dto);
    return response.data;
  }

  async deleteKeyword(id: number): Promise<void> {
    await apiClient.delete(`${this.basePath}/keywords/${id}`);
  }

  async bulkImportKeywords(keywords: CreateAsoKeywordDto[]): Promise<{
    importedCount: number;
    totalRequested: number;
    keywords: AsoKeyword[];
  }> {
    const response = await apiClient.post<{ data: { importedCount: number; totalRequested: number; keywords: AsoKeyword[] } }>(`${this.basePath}/keywords/bulk-import`, keywords);
    return response.data;
  }

  // ML-Powered Keyword Discovery
  async discoverKeywords(request: KeywordDiscoveryRequest): Promise<{
    discoveredCount: number;
    seedKeywords: string;
    keywords: AsoKeyword[];
  }> {
    const response = await apiClient.post<{ data: { discoveredCount: number; seedKeywords: string; keywords: AsoKeyword[] } }>(`${this.basePath}/keywords/discover`, request);
    return response.data;
  }

  async analyzeCompetitorKeywords(
    bundleId: string,
    appStore: AppStore,
    country: string = 'US'
  ): Promise<{
    competitorBundleId: string;
    keywordCount: number;
    keywords: AsoKeyword[];
  }> {
    const params = new URLSearchParams({
      bundleId,
      appStore: appStore.toString(),
      country,
    });

    const response = await apiClient.post<{ data: { competitorBundleId: string; keywordCount: number; keywords: AsoKeyword[] } }>(`${this.basePath}/keywords/analyze-competitor?${params}`);
    return response.data;
  }

  async updateKeywordMetrics(id: number): Promise<{ message: string }> {
    const response = await apiClient.post<{ data: { message: string } }>(`${this.basePath}/keywords/${id}/update-metrics`);
    return response.data;
  }

  async getKeywordPerformance(fromDate?: string): Promise<Record<string, unknown>> {
    const params = new URLSearchParams();
    if (fromDate) params.append('fromDate', fromDate);

    const response = await apiClient.get<{ data: Record<string, unknown> }>(`${this.basePath}/keywords/performance?${params}`);
    return response.data;
  }

  // App Store Listing Management
  async getListings(appStore?: AppStore): Promise<AppStoreListing[]> {
    const params = new URLSearchParams();
    if (appStore !== undefined) params.append('appStore', appStore.toString());

    const response = await apiClient.get(`${this.basePath}/listings?${params}`);
    return (response as { data: unknown }).data as never;
  }

  async getListing(id: number): Promise<AppStoreListing> {
    const response = await apiClient.get(`${this.basePath}/listings/${id}`);
    return (response as { data: unknown }).data as never;
  }

  async createListing(dto: CreateAppStoreListingDto): Promise<AppStoreListing> {
    const response = await apiClient.post(`${this.basePath}/listings`, dto);
    return (response as { data: unknown }).data as never;
  }

  async updateListing(id: number, dto: CreateAppStoreListingDto): Promise<AppStoreListing> {
    const response = await apiClient.put(`${this.basePath}/listings/${id}`, dto);
    return (response as { data: unknown }).data as never;
  }

  async deleteListing(id: number): Promise<void> {
    await apiClient.delete(`${this.basePath}/listings/${id}`);
  }

  // Review Management
  async getReviews(listingId: number, fromDate?: string): Promise<AppStoreReview[]> {
    const params = new URLSearchParams();
    if (fromDate) params.append('fromDate', fromDate);

    const response = await apiClient.get(`${this.basePath}/listings/${listingId}/reviews?${params}`);
    return (response as { data: unknown }).data as never;
  }

  async analyzeReviewSentiment(reviewId: number): Promise<AppStoreReview> {
    const response = await apiClient.post(`${this.basePath}/reviews/${reviewId}/analyze-sentiment`);
    return (response as { data: unknown }).data as never;
  }

  async getReviewAnalytics(listingId: number, fromDate?: string): Promise<ReviewAnalytics> {
    const params = new URLSearchParams();
    if (fromDate) params.append('fromDate', fromDate);

    const response = await apiClient.get(`${this.basePath}/listings/${listingId}/reviews/analytics?${params}`);
    return (response as { data: unknown }).data as never;
  }

  async syncReviews(listingId: number): Promise<{ message: string }> {
    const response = await apiClient.post(`${this.basePath}/listings/${listingId}/reviews/sync`);
    return (response as { data: unknown }).data as never;
  }

  // A/B Testing
  async getAbTests(status?: AbTestStatus): Promise<AsoAbTest[]> {
    const params = new URLSearchParams();
    if (status !== undefined) params.append('status', status.toString());

    const response = await apiClient.get(`${this.basePath}/ab-tests?${params}`);
    return (response as { data: unknown }).data as never;
  }

  async getAbTest(id: number): Promise<AsoAbTest> {
    const response = await apiClient.get(`${this.basePath}/ab-tests/${id}`);
    return (response as { data: unknown }).data as never;
  }

  async createAbTest(dto: CreateAsoAbTestDto): Promise<AsoAbTest> {
    const response = await apiClient.post(`${this.basePath}/ab-tests`, dto);
    return (response as { data: unknown }).data as never;
  }

  async startAbTest(id: number): Promise<AsoAbTest> {
    const response = await apiClient.post(`${this.basePath}/ab-tests/${id}/start`);
    return (response as { data: unknown }).data as never;
  }

  async stopAbTest(id: number): Promise<AsoAbTest> {
    const response = await apiClient.post(`${this.basePath}/ab-tests/${id}/stop`);
    return (response as { data: unknown }).data as never;
  }

  async getAbTestResults(id: number): Promise<Record<string, unknown>> {
    const response = await apiClient.get(`${this.basePath}/ab-tests/${id}/results`);
    return (response as { data: Record<string, unknown> }).data;
  }

  async updateAbTestMetrics(id: number): Promise<{ message: string }> {
    const response = await apiClient.post(`${this.basePath}/ab-tests/${id}/update-metrics`);
    return (response as { data: unknown }).data as never;
  }

  // Analytics and Reporting
  async getAnalytics(
    listingId: number,
    fromDate: string,
    toDate: string,
    granularity: AnalyticsGranularity = AnalyticsGranularity.Daily
  ): Promise<AsoAnalytics[]> {
    const params = new URLSearchParams({
      fromDate,
      toDate,
      granularity: granularity.toString(),
    });

    const response = await apiClient.get(`${this.basePath}/listings/${listingId}/analytics?${params}`);
    return (response as { data: unknown }).data as never;
  }

  async getCompetitorAnalysis(listingId: number): Promise<CompetitorAnalysis> {
    const response = await apiClient.get(`${this.basePath}/listings/${listingId}/competitor-analysis`);
    return (response as { data: unknown }).data as never;
  }

  async getRankingTrends(listingId: number, fromDate?: string): Promise<RankingTrends> {
    const params = new URLSearchParams();
    if (fromDate) params.append('fromDate', fromDate);

    const response = await apiClient.get(`${this.basePath}/listings/${listingId}/ranking-trends?${params}`);
    return (response as { data: unknown }).data as never;
  }

  async generateAsoReport(fromDate: string, toDate: string): Promise<Record<string, unknown>> {
    const params = new URLSearchParams({ fromDate, toDate });

    const response = await apiClient.get(`${this.basePath}/reports/comprehensive?${params}`);
    return (response as { data: Record<string, unknown> }).data;
  }

  // Cross-Platform Integration
  async synchronizeWithSeoKeywords(): Promise<SeoAsoSynchronization> {
    const response = await apiClient.post(`${this.basePath}/integration/sync-seo-keywords`);
    return (response as { data: unknown }).data as never;
  }

  async getWebToAppAttribution(fromDate?: string): Promise<WebToAppAttribution> {
    const params = new URLSearchParams();
    if (fromDate) params.append('fromDate', fromDate);

    const response = await apiClient.get(`${this.basePath}/integration/web-to-app-attribution?${params}`);
    return (response as { data: unknown }).data as never;
  }

  async optimizeDeepLinks(listingId: number): Promise<{
    listingId: number;
    optimizedLinksCount: number;
    deepLinks: string[];
  }> {
    const response = await apiClient.post(`${this.basePath}/listings/${listingId}/optimize-deep-links`);
    return (response as { data: unknown }).data as never;
  }

  // Utility methods
  async healthCheck(): Promise<Record<string, unknown>> {
    const response = await apiClient.get(`${this.basePath}/health`);
    return (response as { data: Record<string, unknown> }).data;
  }

  // Helper methods for data processing
  formatKeywordData(keywords: AsoKeyword[]) {
    return keywords.map(keyword => ({
      ...keyword,
      difficultyPercentage: Math.round(keyword.difficulty * 100),
      relevancePercentage: Math.round(keyword.relevance * 100),
      conversionPercentage: Math.round(keyword.conversionPotential * 100),
      competitionPercentage: Math.round(keyword.competitionDensity * 100),
      rankChange: keyword.previousRank && keyword.currentRank ? keyword.previousRank - keyword.currentRank : 0,
      isRankImproving: keyword.previousRank && keyword.currentRank ? keyword.currentRank < keyword.previousRank : false,
    }));
  }

  getAppStoreDisplayName(appStore: AppStore): string {
    switch (appStore) {
      case AppStore.iOS:
        return 'App Store (iOS)';
      case AppStore.GooglePlay:
        return 'Google Play Store';
      case AppStore.Both:
        return 'Both Stores';
      default:
        return 'Unknown';
    }
  }

  // UNIFIED COLOR SYSTEM - Sentiment colors match design tokens
  getSentimentColor(sentimentScore: number): string {
    if (sentimentScore >= 0.5) return '#22c55e'; // Success Green 500 (matches --success)
    if (sentimentScore >= 0.1) return '#4ade80'; // Success Green 400
    if (sentimentScore >= -0.1) return '#f59e0b'; // Warning Amber 500 (matches --warning)
    if (sentimentScore >= -0.5) return '#fb923c'; // Warning Orange 400
    return '#ef4444'; // Error Red 500 (matches --error)
  }

  getRankingChangeIcon(change: number): string {
    if (change > 0) return '↗️'; // Improvement (rank decreased)
    if (change < 0) return '↘️'; // Decline (rank increased)
    return '→'; // No change
  }

  formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  calculateStatisticalSignificance(
    controlConversion: number,
    variantConversion: number,
    controlSample: number,
    variantSample: number
  ): {
    pValue: number;
    isSignificant: boolean;
    uplift: number;
    confidenceInterval: [number, number];
  } {
    // Simplified statistical significance calculation
    // In production, use a proper statistical library

    const pooledRate =
      (controlConversion * controlSample + variantConversion * variantSample) / (controlSample + variantSample);

    const standardError = Math.sqrt(pooledRate * (1 - pooledRate) * (1 / controlSample + 1 / variantSample));

    const zScore = Math.abs(variantConversion - controlConversion) / Math.max(0.001, standardError);

    // Approximate p-value from z-score
    const pValue = Math.max(0.001, 2 * (1 - this.normalCdf(Math.abs(zScore))));

    const uplift = controlConversion > 0 ? ((variantConversion - controlConversion) / controlConversion) * 100 : 0;

    const marginOfError = 1.96 * standardError; // 95% confidence
    const confidenceInterval: [number, number] = [
      variantConversion - controlConversion - marginOfError,
      variantConversion - controlConversion + marginOfError,
    ];

    return {
      pValue,
      isSignificant: pValue < 0.05,
      uplift,
      confidenceInterval,
    };
  }

  private normalCdf(x: number): number {
    // Approximation of normal cumulative distribution function
    return 0.5 * (1 + Math.sign(x) * Math.sqrt(1 - Math.exp((-2 * x * x) / Math.PI)));
  }

  // Export utilities
  async exportData(
    type: 'keywords' | 'listings' | 'reviews' | 'ab-tests',
    format: 'csv' | 'xlsx' | 'json' = 'csv'
  ): Promise<Blob> {
    let data: Array<Record<string, unknown>> = [];

    switch (type) {
      case 'keywords':
        data = await this.getKeywords() as unknown as Array<Record<string, unknown>>;
        break;
      case 'listings':
        data = await this.getListings() as unknown as Array<Record<string, unknown>>;
        break;
      case 'reviews':
        // Would need to aggregate reviews from all listings
        break;
      case 'ab-tests':
        data = await this.getAbTests() as unknown as Array<Record<string, unknown>>;
        break;
    }

    if (format === 'csv') {
      return this.convertToCSV(data);
    } else if (format === 'json') {
      return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    }

    throw new Error(`Format ${format} not supported`);
  }

  private convertToCSV(data: Array<Record<string, unknown>>): Blob {
    if (!data.length) return new Blob([''], { type: 'text/csv' });

    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row =>
      Object.values(row)
        .map(value => (typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value))
        .join(',')
    );

    const csv = [headers, ...rows].join('\n');
    return new Blob([csv], { type: 'text/csv' });
  }
}

export const asoService = new AsoService();
