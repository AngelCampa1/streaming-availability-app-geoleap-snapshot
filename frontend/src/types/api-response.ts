/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Standardized API response types to eliminate 'as any' type assertions
 */

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  timestamp?: string;
}

/**
 * Paginated API response
 */
export interface PaginatedApiResponse<T> {
  data: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

/**
 * Bulk operation response
 */
export interface BulkOperationResponse<T> {
  importedCount: number;
  totalRequested: number;
  data: T[];
  errors?: Array<{
    index: number;
    error: string;
  }>;
}

/**
 * Analytics response
 */
export interface AnalyticsResponse<T> {
  data: T;
  periodStart: string;
  periodEnd: string;
  granularity: 'hour' | 'day' | 'week' | 'month';
}

/**
 * Search response
 */
export interface SearchResponse<T> {
  results: T[];
  totalResults: number;
  query: string;
  took: number; // Time in milliseconds
  facets?: Record<string, number>;
}

/**
 * Health check response
 */
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Record<
    string,
    {
      status: 'healthy' | 'degraded' | 'unhealthy';
      description?: string;
      duration?: number;
    }
  >;
  totalDuration: number;
  timestamp: string;
}

/**
 * Batch operation result
 */
export interface BatchOperationResult<T> {
  successful: T[];
  failed: Array<{
    item: Partial<T>;
    error: string;
  }>;
  successCount: number;
  failureCount: number;
}

/**
 * File upload response
 */
export interface FileUploadResponse {
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
}

/**
 * Operation status response
 */
export interface OperationStatusResponse {
  operationId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  progress?: number; // 0-100
  message?: string;
  startedAt: string;
  completedAt?: string;
  result?: any;
  error?: string;
}

/**
 * User-specific data response
 */
export interface UserDataResponse<T> {
  userId: string;
  data: T;
  lastUpdated: string;
}

/**
 * Rate limit info
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: string; // ISO 8601 timestamp
  retryAfter?: number; // Seconds
}

/**
 * API metadata
 */
export interface ApiMetadata {
  version: string;
  requestId: string;
  timestamp: string;
  processingTime: number; // Milliseconds
}

/**
 * Empty response for operations that don't return data
 */
export interface EmptyResponse {
  success: true;
}

/**
 * Helper type to unwrap API responses
 */
export type UnwrapApiResponse<T> = T extends ApiResponse<infer U> ? U : T;

/**
 * Helper type for nullable API responses
 */
export type NullableApiResponse<T> = ApiResponse<T | null>;

/**
 * Helper type for optional API responses
 */
export type OptionalApiResponse<T> = ApiResponse<T | undefined>;

/**
 * Typed fetch options
 */
export interface TypedRequestInit extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

/**
 * API client response with headers
 */
export interface ApiClientResponse<T> {
  data: T;
  headers: Headers;
  status: number;
  statusText: string;
}
