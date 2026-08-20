/* eslint-disable @typescript-eslint/no-explicit-any */
// ASO (App Store Optimization) Types

export enum AppStore {
  iOS = 1,
  GooglePlay = 2,
  Both = 3,
}

export enum KeywordSource {
  Manual = 1,
  MLDiscovery = 2,
  CompetitorAnalysis = 3,
  SearchConsole = 4,
  AppStoreConnect = 5,
}

export enum KeywordStatus {
  Active = 1,
  Inactive = 2,
  Testing = 3,
  Archived = 4,
}

export enum ListingStatus {
  Draft = 1,
  InReview = 2,
  Live = 3,
  Rejected = 4,
  Archived = 5,
}

export enum SentimentLabel {
  VeryNegative = 1,
  Negative = 2,
  Neutral = 3,
  Positive = 4,
  VeryPositive = 5,
}

export enum AbTestType {
  Title = 1,
  Subtitle = 2,
  Description = 3,
  Keywords = 4,
  Screenshots = 5,
  Icon = 6,
  Full = 7,
}

export enum AbTestStatus {
  Draft = 1,
  Running = 2,
  Completed = 3,
  Stopped = 4,
  Archived = 5,
}

export enum AnalyticsGranularity {
  Hourly = 1,
  Daily = 2,
  Weekly = 3,
  Monthly = 4,
}

export interface AsoKeyword {
  id: number;
  keyword: string;
  appStore: AppStore;
  country: string;
  language: string;
  searchVolume: number;
  difficulty: number; // 0-1
  relevance: number; // 0-1
  conversionPotential: number; // 0-1
  currentRank?: number;
  bestRank?: number;
  previousRank?: number;
  competitionDensity: number;
  topCompetitors: string[];
  source: KeywordSource;
  status: KeywordStatus;
  createdAt: string;
  lastUpdated: string;
}

export interface CreateAsoKeywordDto {
  keyword: string;
  appStore: AppStore;
  country: string;
  language: string;
  source: KeywordSource;
  status: KeywordStatus;
}

export interface AppStoreListing {
  id: number;
  appName: string;
  bundleId: string;
  appStore: AppStore;
  country: string;
  language: string;
  title: string;
  subtitle: string;
  description: string;
  keywords: string;
  promotionalText: string;
  releaseNotes: string;
  screenshots: string[];
  previewVideos: string[];
  iconUrl?: string;
  conversionRate: number;
  downloads: number;
  views: number;
  rating: number;
  reviewCount: number;
  status: ListingStatus;
  createdAt: string;
  publishedAt?: string;
}

export interface CreateAppStoreListingDto {
  appName: string;
  bundleId: string;
  appStore: AppStore;
  country: string;
  language: string;
  title: string;
  subtitle: string;
  description: string;
  keywords: string;
  promotionalText: string;
  releaseNotes: string;
  screenshots: string[];
  previewVideos: string[];
  iconUrl?: string;
}

export interface AppStoreReview {
  id: number;
  reviewId: string;
  reviewerName: string;
  rating: number;
  title: string;
  content: string;
  version: string;
  reviewDate: string;
  country: string;
  language: string;
  sentimentScore: number; // -1 to 1
  sentimentLabel: SentimentLabel;
  confidence: number;
  topics: string[];
  issues: string[];
  compliments: string[];
  hasDeveloperResponse: boolean;
  developerResponse?: string;
  responseDate?: string;
  isHelpful: boolean;
  isVerifiedPurchase: boolean;
}

export interface KeywordRanking {
  id: number;
  keywordId: number;
  listingId: number;
  rank: number;
  previousRank?: number;
  rankChange: number;
  rankedAt: string;
  categoryRank?: number;
  category?: string;
  visibilityScore?: number;
}

export interface AbTestMetrics {
  views: number;
  downloads: number;
  conversionRate: number;
  uniqueUsers: number;
  averageRating: number;
  reviewCount: number;
  revenue: number;
  customMetrics: Record<string, number>;
}

export interface AsoAbTest {
  id: number;
  name: string;
  description: string;
  type: AbTestType;
  status: AbTestStatus;
  controlListingId: number;
  variantListingId: number;
  trafficSplit: number;
  controlMetrics: AbTestMetrics;
  variantMetrics: AbTestMetrics;
  statisticalSignificance?: number;
  confidenceLevel: number;
  isStatisticallySignificant: boolean;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  lastUpdated: string;
  keywordIds: number[];
}

export interface CreateAsoAbTestDto {
  name: string;
  description: string;
  type: AbTestType;
  controlListingId: number;
  variantListingId: number;
  trafficSplit: number;
  confidenceLevel: number;
  keywordIds: number[];
}

export interface CompetitorMetrics {
  appName: string;
  bundleId: string;
  rank: number;
  rating: number;
  reviewCount: number;
  estimatedDownloads: number;
  topKeywords: string[];
}

export interface AsoAnalytics {
  date: string;
  granularity: AnalyticsGranularity;
  views: number;
  downloads: number;
  conversionRate: number;
  organicViews: number;
  searchViews: number;
  browseViews: number;
  referralViews: number;
  keywordViews: Record<string, number>;
  keywordConversions: Record<string, number>;
  averageRating: number;
  totalReviews: number;
  newReviews: number;
  sentimentScore: number;
  categoryRankings: Record<string, number>;
  keywordRankings: Record<string, number>;
  competitorData: Record<string, CompetitorMetrics>;
}

export interface KeywordDiscoveryRequest {
  seedKeywords: string; // comma-separated
  appStore: AppStore;
  country: string;
  language: string;
  competitorBundleIds?: string; // comma-separated
  maxResults: number;
  minRelevance: number;
}

// Chart and visualization types
export interface KeywordPerformanceData {
  keyword: string;
  currentRank?: number;
  previousRank?: number;
  change: number;
  searchVolume: number;
  difficulty: number;
  conversionPotential: number;
  trend: number[];
}

export interface ReviewAnalytics {
  totalReviews: number;
  averageRating: number;
  averageSentiment: number;
  ratingDistribution: Record<string, number>;
  sentimentDistribution: Record<string, number>;
  topIssues: Record<string, number>;
  topCompliments: Record<string, number>;
  responseRate: number;
}

export interface CompetitorAnalysis {
  totalCompetitors: number;
  topCompetitors: CompetitorMetrics[];
  rankingComparison: Array<{
    appName: string;
    rank: number;
    rating: number;
    reviewCount: number;
  }>;
  keywordOverlap: {
    overlapPercentage: number;
    commonKeywords: string[];
    uniqueKeywords: string[];
  };
  gapAnalysis: Array<{
    keyword: string;
    opportunity: string;
    competitorUsage: number;
  }>;
}

export interface RankingTrends {
  totalDataPoints: number;
  keywordTrends: Array<{
    keyword: string;
    trend: Array<{ date: string; rank: number }>;
    bestRank: number;
    worstRank: number;
    currentRank: number;
    averageRank: number;
  }>;
  overallTrend: Array<{ date: string; averageRank: number }>;
  categoryPerformance: Array<{
    category: string;
    averageRank: number;
    keywordCount: number;
  }>;
}

export interface WebToAppAttribution {
  totalWebVisitors: number;
  appStoreVisits: number;
  appDownloads: number;
  conversionFunnel: {
    webVisitors: number;
    appStoreClicks: number;
    appStoreViews: number;
    downloads: number;
    webToAppStoreConversion: number;
    appStoreToDownloadConversion: number;
  };
  topReferringSources: Array<{
    source: string;
    visitors: number;
    conversions: number;
  }>;
  bestPerformingContent: Array<{
    page: string;
    visitors: number;
    appStoreClicks: number;
  }>;
}

export interface SeoAsoSynchronization {
  seoKeywords: number;
  asoKeywords: number;
  commonKeywords: string[];
  seoOnlyKeywords: string[];
  asoOnlyKeywords: string[];
  recommendedCrossPromotion: Array<{
    type: 'SEOToASO' | 'ASOToSEO';
    keyword: string;
    reason: string;
    conversionPotential?: number;
  }>;
}

// API response types
export interface AsoApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  errors?: string[];
}

export interface PaginatedAsoResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Filter and search types
export interface AsoFilters {
  appStore?: AppStore;
  country?: string;
  status?: KeywordStatus | ListingStatus | AbTestStatus;
  dateRange?: {
    start: string;
    end: string;
  };
  search?: string;
}

export interface KeywordFilters extends AsoFilters {
  minSearchVolume?: number;
  maxDifficulty?: number;
  minRelevance?: number;
  source?: KeywordSource;
}

export interface ReviewFilters extends AsoFilters {
  minRating?: number;
  maxRating?: number;
  sentimentLabel?: SentimentLabel;
  hasResponse?: boolean;
  isVerified?: boolean;
}

// Dashboard summary types
export interface AsoDashboardSummary {
  totalKeywords: number;
  activeKeywords: number;
  totalListings: number;
  liveListings: number;
  runningAbTests: number;
  averageRating: number;
  totalDownloads: number;
  conversionRate: number;
  topPerformingKeywords: KeywordPerformanceData[];
  recentReviews: AppStoreReview[];
  rankingChanges: Array<{
    keyword: string;
    change: number;
    isImprovement: boolean;
  }>;
}

export interface AsoRecommendation {
  type: 'Keyword Opportunity' | 'A/B Test Suggestion' | 'Review Management';
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High';
  impact: string;
  actionUrl?: string;
}

// Notification types for real-time updates
export interface AsoNotification {
  id: string;
  type: 'keyword_ranking_change' | 'ab_test_result' | 'review_alert' | 'competitor_change';
  title: string;
  message: string;
  data: Record<string, any>;
  timestamp: string;
  isRead: boolean;
}

// Chart configuration types
export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'area' | 'scatter';
  title: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  colors?: string[];
  showLegend?: boolean;
  showTooltip?: boolean;
  height?: number;
}

export interface KeywordChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    borderColor?: string;
    backgroundColor?: string;
    fill?: boolean;
  }>;
}

// Export utility types
export type AsoExportFormat = 'csv' | 'xlsx' | 'pdf';
export type AsoReportType = 'keywords' | 'rankings' | 'reviews' | 'ab_tests' | 'comprehensive';

export interface AsoExportRequest {
  type: AsoReportType;
  format: AsoExportFormat;
  dateRange: {
    start: string;
    end: string;
  };
  filters?: AsoFilters;
  includeCharts?: boolean;
}

// Localization support
export interface AsoLocalization {
  country: string;
  language: string;
  isEnabled: boolean;
  keywordCount: number;
  listingCount: number;
  averageRank?: number;
  conversionRate?: number;
}
