/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * TYPE-SAFE VERSION of AsoService (Week 3 Day 3)
 *
 * Eliminates all 'as any' assertions using:
 * - ApiResponse<T> wrapper types
 * - Proper TypeScript generics
 * - Type guards from type-guards.ts
 *
 * This is a REFERENCE IMPLEMENTATION showing the refactoring pattern.
 * Once validated, we'll apply this pattern to the original asoService.ts.
 */

import { ApiClient } from '@/lib/api';
import { ApiResponse, BulkOperationResponse } from '@/types/api-response';
import { isDefined } from '@/lib/type-guards';
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

const apiClient = new ApiClient();

/**
 * Response type helpers for ASO API
 */
interface KeywordDiscoveryResponse {
  discoveredCount: number;
  seedKeywords: string;
  keywords: AsoKeyword[];
}

interface CompetitorKeywordsResponse {
  competitorBundleId: string;
  keywordCount: number;
  keywords: AsoKeyword[];
}

interface MessageResponse {
  message: string;
}

interface DeepLinksResponse {
  listingId: number;
  optimizedLinksCount: number;
  deepLinks: string[];
}

interface AbTestResults {
  [key: string]: any;
}

interface ReportData {
  [key: string]: any;
}

export class AsoServiceV2 {
  private readonly basePath = '/api/aso';

  // =================================================================
  // KEYWORD MANAGEMENT - Type-safe implementations
  // =================================================================

  async getKeywords(appStore?: AppStore, country?: string): Promise<AsoKeyword[]> {
    const params = new URLSearchParams();
    if (isDefined(appStore)) params.append('appStore', appStore.toString());
    if (isDefined(country)) params.append('country', country);

    const response = await apiClient.get<ApiResponse<AsoKeyword[]>>(`${this.basePath}/keywords?${params}`);
    return response.data;
  }

  async getKeyword(id: number): Promise<AsoKeyword> {
    const response = await apiClient.get<ApiResponse<AsoKeyword>>(`${this.basePath}/keywords/${id}`);
    return response.data;
  }

  async createKeyword(dto: CreateAsoKeywordDto): Promise<AsoKeyword> {
    const response = await apiClient.post<ApiResponse<AsoKeyword>>(`${this.basePath}/keywords`, dto);
    return response.data;
  }

  async updateKeyword(id: number, dto: CreateAsoKeywordDto): Promise<AsoKeyword> {
    const response = await apiClient.put<ApiResponse<AsoKeyword>>(`${this.basePath}/keywords/${id}`, dto);
    return response.data;
  }

  async deleteKeyword(id: number): Promise<void> {
    await apiClient.delete(`${this.basePath}/keywords/${id}`);
  }

  async bulkImportKeywords(keywords: CreateAsoKeywordDto[]): Promise<BulkOperationResponse<AsoKeyword>> {
    const response = await apiClient.post<BulkOperationResponse<AsoKeyword>>(
      `${this.basePath}/keywords/bulk-import`,
      keywords
    );
    return response;
  }

  // =================================================================
  // ML-POWERED KEYWORD DISCOVERY - Type-safe implementations
  // =================================================================

  async discoverKeywords(request: KeywordDiscoveryRequest): Promise<KeywordDiscoveryResponse> {
    const response = await apiClient.post<ApiResponse<KeywordDiscoveryResponse>>(
      `${this.basePath}/keywords/discover`,
      request
    );
    return response.data;
  }

  async analyzeCompetitorKeywords(
    bundleId: string,
    appStore: AppStore,
    country: string = 'US'
  ): Promise<CompetitorKeywordsResponse> {
    const params = new URLSearchParams({
      bundleId,
      appStore: appStore.toString(),
      country,
    });

    const response = await apiClient.post<ApiResponse<CompetitorKeywordsResponse>>(
      `${this.basePath}/keywords/analyze-competitor?${params}`
    );
    return response.data;
  }

  async updateKeywordMetrics(id: number): Promise<MessageResponse> {
    const response = await apiClient.post<ApiResponse<MessageResponse>>(
      `${this.basePath}/keywords/${id}/update-metrics`
    );
    return response.data;
  }

  async getKeywordPerformance(fromDate?: string): Promise<Record<string, any>> {
    const params = new URLSearchParams();
    if (isDefined(fromDate)) params.append('fromDate', fromDate);

    const response = await apiClient.get<ApiResponse<Record<string, any>>>(
      `${this.basePath}/keywords/performance?${params}`
    );
    return response.data;
  }

  // =================================================================
  // APP STORE LISTING MANAGEMENT - Type-safe implementations
  // =================================================================

  async getListings(appStore?: AppStore): Promise<AppStoreListing[]> {
    const params = new URLSearchParams();
    if (isDefined(appStore)) params.append('appStore', appStore.toString());

    const response = await apiClient.get<ApiResponse<AppStoreListing[]>>(`${this.basePath}/listings?${params}`);
    return response.data;
  }

  async getListing(id: number): Promise<AppStoreListing> {
    const response = await apiClient.get<ApiResponse<AppStoreListing>>(`${this.basePath}/listings/${id}`);
    return response.data;
  }

  async createListing(dto: CreateAppStoreListingDto): Promise<AppStoreListing> {
    const response = await apiClient.post<ApiResponse<AppStoreListing>>(`${this.basePath}/listings`, dto);
    return response.data;
  }

  async updateListing(id: number, dto: CreateAppStoreListingDto): Promise<AppStoreListing> {
    const response = await apiClient.put<ApiResponse<AppStoreListing>>(`${this.basePath}/listings/${id}`, dto);
    return response.data;
  }

  async deleteListing(id: number): Promise<void> {
    await apiClient.delete(`${this.basePath}/listings/${id}`);
  }

  // =================================================================
  // REVIEW MANAGEMENT - Type-safe implementations
  // =================================================================

  async getReviews(listingId: number, fromDate?: string): Promise<AppStoreReview[]> {
    const params = new URLSearchParams();
    if (isDefined(fromDate)) params.append('fromDate', fromDate);

    const response = await apiClient.get<ApiResponse<AppStoreReview[]>>(
      `${this.basePath}/listings/${listingId}/reviews?${params}`
    );
    return response.data;
  }

  async analyzeReviewSentiment(reviewId: number): Promise<AppStoreReview> {
    const response = await apiClient.post<ApiResponse<AppStoreReview>>(
      `${this.basePath}/reviews/${reviewId}/analyze-sentiment`
    );
    return response.data;
  }

  async getReviewAnalytics(listingId: number, fromDate?: string): Promise<ReviewAnalytics> {
    const params = new URLSearchParams();
    if (isDefined(fromDate)) params.append('fromDate', fromDate);

    const response = await apiClient.get<ApiResponse<ReviewAnalytics>>(
      `${this.basePath}/listings/${listingId}/reviews/analytics?${params}`
    );
    return response.data;
  }

  async syncReviews(listingId: number): Promise<MessageResponse> {
    const response = await apiClient.post<ApiResponse<MessageResponse>>(
      `${this.basePath}/listings/${listingId}/reviews/sync`
    );
    return response.data;
  }

  // =================================================================
  // A/B TESTING - Type-safe implementations
  // =================================================================

  async getAbTests(status?: AbTestStatus): Promise<AsoAbTest[]> {
    const params = new URLSearchParams();
    if (isDefined(status)) params.append('status', status.toString());

    const response = await apiClient.get<ApiResponse<AsoAbTest[]>>(`${this.basePath}/ab-tests?${params}`);
    return response.data;
  }

  async getAbTest(id: number): Promise<AsoAbTest> {
    const response = await apiClient.get<ApiResponse<AsoAbTest>>(`${this.basePath}/ab-tests/${id}`);
    return response.data;
  }

  async createAbTest(dto: CreateAsoAbTestDto): Promise<AsoAbTest> {
    const response = await apiClient.post<ApiResponse<AsoAbTest>>(`${this.basePath}/ab-tests`, dto);
    return response.data;
  }

  async startAbTest(id: number): Promise<AsoAbTest> {
    const response = await apiClient.post<ApiResponse<AsoAbTest>>(`${this.basePath}/ab-tests/${id}/start`);
    return response.data;
  }

  async stopAbTest(id: number): Promise<AsoAbTest> {
    const response = await apiClient.post<ApiResponse<AsoAbTest>>(`${this.basePath}/ab-tests/${id}/stop`);
    return response.data;
  }

  async getAbTestResults(id: number): Promise<AbTestResults> {
    const response = await apiClient.get<ApiResponse<AbTestResults>>(`${this.basePath}/ab-tests/${id}/results`);
    return response.data;
  }

  async updateAbTestMetrics(id: number): Promise<MessageResponse> {
    const response = await apiClient.post<ApiResponse<MessageResponse>>(
      `${this.basePath}/ab-tests/${id}/update-metrics`
    );
    return response.data;
  }

  // =================================================================
  // ANALYTICS AND REPORTING - Type-safe implementations
  // =================================================================

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

    const response = await apiClient.get<ApiResponse<AsoAnalytics[]>>(
      `${this.basePath}/listings/${listingId}/analytics?${params}`
    );
    return response.data;
  }

  async getCompetitorAnalysis(listingId: number): Promise<CompetitorAnalysis> {
    const response = await apiClient.get<ApiResponse<CompetitorAnalysis>>(
      `${this.basePath}/listings/${listingId}/competitor-analysis`
    );
    return response.data;
  }

  async getRankingTrends(listingId: number, fromDate?: string): Promise<RankingTrends> {
    const params = new URLSearchParams();
    if (isDefined(fromDate)) params.append('fromDate', fromDate);

    const response = await apiClient.get<ApiResponse<RankingTrends>>(
      `${this.basePath}/listings/${listingId}/ranking-trends?${params}`
    );
    return response.data;
  }

  async generateAsoReport(fromDate: string, toDate: string): Promise<ReportData> {
    const params = new URLSearchParams({ fromDate, toDate });

    const response = await apiClient.get<ApiResponse<ReportData>>(`${this.basePath}/reports/comprehensive?${params}`);
    return response.data;
  }

  // =================================================================
  // CROSS-PLATFORM INTEGRATION - Type-safe implementations
  // =================================================================

  async synchronizeWithSeoKeywords(): Promise<SeoAsoSynchronization> {
    const response = await apiClient.post<ApiResponse<SeoAsoSynchronization>>(
      `${this.basePath}/integration/sync-seo-keywords`
    );
    return response.data;
  }

  async getWebToAppAttribution(fromDate?: string): Promise<WebToAppAttribution> {
    const params = new URLSearchParams();
    if (isDefined(fromDate)) params.append('fromDate', fromDate);

    const response = await apiClient.get<ApiResponse<WebToAppAttribution>>(
      `${this.basePath}/integration/web-to-app-attribution?${params}`
    );
    return response.data;
  }

  async optimizeDeepLinks(listingId: number): Promise<DeepLinksResponse> {
    const response = await apiClient.post<ApiResponse<DeepLinksResponse>>(
      `${this.basePath}/listings/${listingId}/optimize-deep-links`
    );
    return response.data;
  }

  // =================================================================
  // UTILITY METHODS - Type-safe implementations
  // =================================================================

  async healthCheck(): Promise<Record<string, any>> {
    const response = await apiClient.get<ApiResponse<Record<string, any>>>(`${this.basePath}/health`);
    return response.data;
  }

  // =================================================================
  // HELPER METHODS - No changes needed (pure functions)
  // =================================================================

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
    const pooledRate =
      (controlConversion * controlSample + variantConversion * variantSample) / (controlSample + variantSample);

    const standardError = Math.sqrt(pooledRate * (1 - pooledRate) * (1 / controlSample + 1 / variantSample));

    const zScore = Math.abs(variantConversion - controlConversion) / Math.max(0.001, standardError);
    const pValue = Math.max(0.001, 2 * (1 - this.normalCdf(Math.abs(zScore))));

    const uplift = controlConversion > 0 ? ((variantConversion - controlConversion) / controlConversion) * 100 : 0;

    const marginOfError = 1.96 * standardError;
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
    return 0.5 * (1 + Math.sign(x) * Math.sqrt(1 - Math.exp((-2 * x * x) / Math.PI)));
  }

  // =================================================================
  // EXPORT UTILITIES - Type-safe implementations
  // =================================================================

  async exportData(
    type: 'keywords' | 'listings' | 'reviews' | 'ab-tests',
    format: 'csv' | 'xlsx' | 'json' = 'csv'
  ): Promise<Blob> {
    let data: any[] = [];

    switch (type) {
      case 'keywords':
        data = await this.getKeywords();
        break;
      case 'listings':
        data = await this.getListings();
        break;
      case 'reviews':
        // Would need to aggregate reviews from all listings
        break;
      case 'ab-tests':
        data = await this.getAbTests();
        break;
    }

    if (format === 'csv') {
      return this.convertToCSV(data);
    } else if (format === 'json') {
      return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    }

    throw new Error(`Format ${format} not supported`);
  }

  private convertToCSV(data: any[]): Blob {
    if (!data.length) return new Blob([''], { type: 'text/csv' });

    const firstItem = data[0];
    if (!isDefined(firstItem) || typeof firstItem !== 'object') {
      return new Blob([''], { type: 'text/csv' });
    }

    const headers = Object.keys(firstItem as Record<string, any>).join(',');
    const rows = data.map(row => {
      if (!isDefined(row) || typeof row !== 'object') return '';

      return Object.values(row as Record<string, any>)
        .map(value => (typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value))
        .join(',');
    });

    const csv = [headers, ...rows].join('\n');
    return new Blob([csv], { type: 'text/csv' });
  }
}

export const asoServiceV2 = new AsoServiceV2();
