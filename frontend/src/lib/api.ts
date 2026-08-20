import { SecurityService } from './security';
import { API_BASE_URL } from '@/config/api';
import { getOrCreateAnonymousId } from './anonymous-user';
import {
  PaywalledSearchResponse,
  GlobalSearchRequest,
  PaywalledSearchResult,
  ContentType,
  PaywallAnalytics,
  UserSubscription,
} from './types/paywall';
import { AutocompleteSuggestion, SearchHistoryItem, TrendingSearch } from './types/autocomplete';
import {
  PaymentTransaction,
  PaymentMethod,
  CreatePaymentIntentRequest,
  PaymentMethodRequest,
  PaymentError,
  PaymentErrorType,
  FailedPayment,
  PaymentRetryAttempt,
  GracePeriod,
  PaymentRecoverySession,
  ManualPaymentRetryRequest,
  CompleteRecoverySessionRequest,
  RecoveryMetrics,
} from './types/payment';

// Standardized API error response format
export interface ApiErrorResponse {
  correlationId: string;
  error: {
    code: string;
    message: string;
    details?: string;
    retryable: boolean;
    supportContact?: string;
    validationErrors?: Record<string, string[]>;
    retryAfterSeconds?: number;
    estimatedRecoveryTime?: string;
  };
  timestamp: string;
  path: string;
  traceId?: string;
}

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly correlationId: string;
  public readonly errorCode: string;
  public readonly isRetryable: boolean;
  public readonly supportContact?: string;
  public readonly validationErrors?: Record<string, string[]>;
  public readonly retryAfterSeconds?: number;
  public readonly path: string;
  public readonly traceId?: string;

  constructor(response: ApiErrorResponse, statusCode: number) {
    super(response.error.message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.correlationId = response.correlationId;
    this.errorCode = response.error.code;
    this.isRetryable = response.error.retryable;
    this.supportContact = response.error.supportContact;
    this.validationErrors = response.error.validationErrors;
    this.retryAfterSeconds = response.error.retryAfterSeconds;
    this.path = response.path;
    this.traceId = response.traceId;
  }
}

// Global error handler for API responses
const handleApiError = async (response: Response): Promise<never> => {
  try {
    // Check content-type before attempting JSON parse (BUG-002 fix)
    const contentType = response.headers.get('content-type');
    const text = await response.text();

    // Handle empty or non-JSON error responses
    if (!text || !contentType?.includes('application/json')) {
      // BUG-E2E-004 fix: Don't include raw HTML in error messages
      // If the response looks like HTML (contains tags), use a generic message instead
      const isHtmlResponse = text && (text.includes('<!DOCTYPE') || text.includes('<html') || text.includes('<body'));
      const userFriendlyMessage = isHtmlResponse
        ? `Server error (${response.status}). Please try again later.`
        : (text?.substring(0, 200) || `HTTP ${response.status}: ${response.statusText}`);

      const fallbackError: ApiErrorResponse = {
        correlationId: response.headers.get('x-correlation-id') || 'unknown',
        error: {
          code: response.status === 401 ? 'UNAUTHORIZED' : 'UNKNOWN_ERROR',
          message: userFriendlyMessage,
          retryable: response.status >= 500,
          supportContact: 'Contact support if this error persists.',
        },
        timestamp: new Date().toISOString(),
        path: 'unknown',
        traceId: response.headers.get('x-trace-id') || undefined,
      };
      throw new ApiError(fallbackError, response.status);
    }

    // Handle 403 with SearchBlockedResponse format (2-step conversion funnel)
    // Include full response JSON in message so frontend can parse blockReason
    if (response.status === 403) {
      try {
        const parsed = JSON.parse(text);
        // Check if this is a SearchBlockedResponse (has blockReason field)
        if (parsed.blockReason || parsed.BlockReason) {
          const fallbackError: ApiErrorResponse = {
            correlationId: response.headers.get('x-correlation-id') || 'unknown',
            error: {
              code: 'SEARCH_BLOCKED',
              // Include full JSON in message so OptimizedSearchResults can parse it
              message: `403 Search blocked: ${text}`,
              retryable: false,
              supportContact: 'Upgrade for unlimited searches.',
            },
            timestamp: new Date().toISOString(),
            path: 'unknown',
            traceId: response.headers.get('x-trace-id') || undefined,
          };
          throw new ApiError(fallbackError, response.status);
        }
      } catch (parseError) {
        // If parsing fails, fall through to standard handling
        if (parseError instanceof ApiError) throw parseError;
      }
    }

    const errorData: ApiErrorResponse = JSON.parse(text);
    throw new ApiError(errorData, response.status);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    // Fallback for any parsing errors
    const fallbackError: ApiErrorResponse = {
      correlationId: response.headers.get('x-correlation-id') || 'unknown',
      error: {
        code: 'UNKNOWN_ERROR',
        message: `HTTP ${response.status}: ${response.statusText}`,
        retryable: response.status >= 500,
        supportContact: 'Contact support if this error persists.',
      },
      timestamp: new Date().toISOString(),
      path: 'unknown',
      traceId: response.headers.get('x-trace-id') || undefined,
    };

    throw new ApiError(fallbackError, response.status);
  }
};

export class ApiClient {
  private baseUrl: string;
  private retryAttempts: number = 3;
  private retryDelay: number = 1000; // 1 second base delay
  private requestTimeout: number = 15000; // 15 second timeout (BUG-010 fix)

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  // BUG-010 fix: Add request timeout to prevent 42+ second waits
  private async fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.requestTimeout}ms`);
      }
      throw error;
    }
  }

  private async executeWithRetry<T>(operation: () => Promise<Response>, operationName: string): Promise<T> {
    let lastError: ApiError | Error | null = null;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const response = await operation();

        if (!response.ok) {
          await handleApiError(response);
        }

        // BUG-002/003 fix: Handle empty or non-JSON successful responses
        if (response.status === 204) {
          return {} as T;
        }
        const contentType = response.headers.get('content-type');
        const text = await response.text();
        if (!text || !contentType?.includes('application/json')) {
          return {} as T;
        }
        return JSON.parse(text) as T;
      } catch (error) {
        lastError = error as ApiError | Error;

        // BUG-012 fix: Immediately throw on 401/403 without retry or warning
        if (error instanceof ApiError) {
          if (error.statusCode === 401 || error.statusCode === 403) {
            throw error; // No retry, no warning for auth errors
          }

          // Don't retry non-retryable errors
          if (!error.isRetryable || attempt === this.retryAttempts) {
            throw error;
          }

          // Handle rate limiting with proper delay
          if (error.statusCode === 429 && error.retryAfterSeconds) {
            const delay = Math.min(error.retryAfterSeconds * 1000, 30000); // Cap at 30 seconds
            console.warn(`Rate limited. Waiting ${delay}ms before retry ${attempt + 1}`);
            await this.sleep(delay);
            continue;
          }
        }

        // Don't retry client errors (4xx) except rate limiting
        if (
          error instanceof ApiError &&
          error.statusCode >= 400 &&
          error.statusCode < 500 &&
          error.statusCode !== 429
        ) {
          throw error;
        }

        if (attempt < this.retryAttempts) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
          console.warn(`${operationName} failed (attempt ${attempt}). Retrying in ${delay}ms...`, error);
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new Error(`${operationName} failed after ${this.retryAttempts} attempts`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.executeWithRetry<T>(
      () =>
        this.fetchWithTimeout(`${this.baseUrl}${endpoint}`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      `GET ${endpoint}`
    );
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.executeWithRetry<T>(
      () =>
        SecurityService.secureRequest(`${this.baseUrl}${endpoint}`, {
          method: 'POST',
          body: data ? JSON.stringify(data) : undefined,
        }),
      `POST ${endpoint}`
    );
  }

  // E2E Bug Fix: Public POST method without CSRF (for anonymous search)
  // Includes X-Anonymous-Id header for search limit tracking
  async postPublic<T>(endpoint: string, data?: unknown): Promise<T> {
    // Get or create anonymous ID for search limit tracking
    const anonymousId = typeof window !== 'undefined' ? getOrCreateAnonymousId() : '';

    return this.executeWithRetry<T>(
      () =>
        this.fetchWithTimeout(`${this.baseUrl}${endpoint}`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...(anonymousId && { 'X-Anonymous-Id': anonymousId }),
          },
          body: data ? JSON.stringify(data) : undefined,
        }),
      `POST ${endpoint}`
    );
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.executeWithRetry<T>(
      () =>
        SecurityService.secureRequest(`${this.baseUrl}${endpoint}`, {
          method: 'PUT',
          body: data ? JSON.stringify(data) : undefined,
        }),
      `PUT ${endpoint}`
    );
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.executeWithRetry<T>(
      () =>
        SecurityService.secureRequest(`${this.baseUrl}${endpoint}`, {
          method: 'DELETE',
        }),
      `DELETE ${endpoint}`
    );
  }
}

const api = new ApiClient();

/**
 * SECURITY NOTE: All authenticated API calls should use this function or the api client.
 * Authentication tokens are stored in httpOnly cookies, NOT localStorage.
 * The 'credentials: include' option automatically sends cookies with requests.
 *
 * MIGRATION: Components still using localStorage.getItem('token') should migrate to:
 * - Use apiCall() for simple requests
 * - Use api.get/post/put/delete() for typed requests
 * - Use authenticatedFetch() for custom fetch needs
 *
 * DO NOT use:
 * - localStorage.getItem('token') or any token variant
 * - Authorization: `Bearer ${token}` headers (tokens are in cookies)
 */

/**
 * Authenticated fetch wrapper that uses httpOnly cookies
 * Use this when you need custom fetch logic with authentication
 */
export const authenticatedFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Authentication via httpOnly cookies
  });
};

// Generic API call function for consistency with admin components
export const apiCall = async <T = unknown>(endpoint: string, options?: RequestInit): Promise<T> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };

  // SECURITY: Authentication is handled ONLY via httpOnly cookies
  // localStorage token storage was removed to prevent XSS vulnerabilities
  // The 'credentials: include' option ensures cookies are sent with requests

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    credentials: 'include', // Authentication via httpOnly cookies only
    headers,
    ...options,
  });

  if (!response.ok) {
    // Try to parse error response from backend
    try {
      // BUG-002 fix: Check content-type before parsing JSON
      const contentType = response.headers.get('content-type');
      const text = await response.text();

      // Handle empty or non-JSON error responses
      if (!text || !contentType?.includes('application/json')) {
        const error = new Error(text || `HTTP ${response.status}: ${response.statusText}`) as Error & {
          statusCode: number;
        };
        error.statusCode = response.status;
        throw error;
      }

      const errorData = JSON.parse(text);

      // Check for ASP.NET Identity error format
      if (errorData.errors && Array.isArray(errorData.errors) && errorData.errors.length > 0) {
        const firstError = errorData.errors[0];

        // Check if errors are objects with code/description (ASP.NET Identity format)
        // vs simple strings (AuthResponseDto format)
        if (typeof firstError === 'object' && firstError !== null && 'code' in firstError) {
          // Format: { errors: [{ code: "DuplicateEmail", description: "Email 'test@example.com' is already registered." }] }
          const errorMessage =
            firstError.description || firstError.message || `HTTP ${response.status}: ${response.statusText}`;

          // Create a structured error with validation details
          const error = new Error(errorMessage) as Error & {
            statusCode: number;
            validationErrors?: Record<string, string[]>;
            errorCode?: string;
          };
          error.statusCode = response.status;
          error.errorCode = firstError.code;

          // Map ASP.NET Identity errors to field-specific errors
          const validationErrors: Record<string, string[]> = {};
          errorData.errors.forEach((err: { code: string; description: string }) => {
            if (err.code === 'DuplicateEmail' || err.code === 'InvalidEmail') {
              validationErrors['Email'] = [err.description];
            } else if (
              err.code === 'PasswordTooShort' ||
              err.code === 'PasswordRequiresNonAlphanumeric' ||
              err.code === 'PasswordRequiresDigit' ||
              err.code === 'PasswordRequiresUpper' ||
              err.code === 'PasswordRequiresLower'
            ) {
              validationErrors['Password'] = validationErrors['Password'] || [];
              validationErrors['Password'].push(err.description);
            } else if (err.code?.includes('Name')) {
              validationErrors['Name'] = [err.description];
            }
          });

          if (Object.keys(validationErrors).length > 0) {
            error.validationErrors = validationErrors;
          }

          throw error;
        }
        // If errors are strings, fall through to simple message handler below
      }

      // Check for standardized error format (correlationId, error object)
      if (errorData.error && errorData.error.message) {
        const error = new Error(errorData.error.message) as Error & {
          statusCode: number;
          validationErrors?: Record<string, string[]>;
          correlationId?: string;
        };
        error.statusCode = response.status;
        error.correlationId = errorData.correlationId;
        if (errorData.error.validationErrors) {
          error.validationErrors = errorData.error.validationErrors;
        }
        throw error;
      }

      // Check for simple message format
      if (errorData.message) {
        const error = new Error(errorData.message) as Error & { statusCode: number };
        error.statusCode = response.status;
        throw error;
      }

      // Fallback to generic error if no structured format found
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (parseError) {
      // If JSON parsing fails or error already thrown, re-throw or create generic error
      if (parseError instanceof Error && parseError.message !== `HTTP ${response.status}: ${response.statusText}`) {
        throw parseError;
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }

  // BUG-002/003 fix: Handle empty or non-JSON successful responses
  if (response.status === 204) {
    return {} as T;
  }
  const contentType = response.headers.get('content-type');
  const text = await response.text();
  if (!text || !contentType?.includes('application/json')) {
    return {} as T;
  }
  return JSON.parse(text) as T;
};

// Add searchContent function that was missing
export async function searchContent(
  query: string,
  filters?: {
    type?: string;
    year?: number;
    [key: string]: unknown;
  }
): Promise<{
  results: unknown[];
  totalResults: number;
  page: number;
  totalPages: number;
}> {
  const params = new URLSearchParams({ q: query });

  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
  }

  return apiCall(`/api/search?${params.toString()}`);
}

export interface HealthStatus {
  status: string;
  timestamp: string;
  service: string;
}

export interface SecurityInfo {
  timestamp: string;
  securityHeaders: {
    hsts: string;
    csp: string;
    xFrame: string;
    xContentType: string;
  };
  rateLimiting: string;
  sessionSecurity: string;
}

export async function fetchHealth(): Promise<HealthStatus> {
  return api.get<HealthStatus>('/api/health');
}

export async function fetchSecurityInfo(): Promise<SecurityInfo> {
  return api.get<SecurityInfo>('/api/security/security-info');
}

// Password Management API Types
export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ValidateResetTokenRequest {
  token: string;
}

export interface ValidatePasswordStrengthRequest {
  password: string;
}

export interface PasswordStrengthResult {
  strength: 'VeryWeak' | 'Weak' | 'Fair' | 'Strong' | 'VeryStrong';
  score: number;
  feedback: string[];
  meetsRequirements: boolean;
}

export interface ApiResponse {
  message: string;
}

export interface TokenValidationResponse {
  isValid: boolean;
}

// Password Management API Functions
export async function forgotPassword(email: string): Promise<ApiResponse> {
  return api.post<ApiResponse>('/api/auth/forgot-password', { email });
}

export async function resetPassword(request: ResetPasswordRequest): Promise<ApiResponse> {
  return api.post<ApiResponse>('/api/auth/reset-password', request);
}

export async function changePassword(request: ChangePasswordRequest): Promise<ApiResponse> {
  return api.post<ApiResponse>('/api/auth/change-password', request);
}

export async function validateResetToken(token: string): Promise<TokenValidationResponse> {
  return api.post<TokenValidationResponse>('/api/auth/validate-reset-token', { token });
}

export async function validatePasswordStrength(password: string): Promise<PasswordStrengthResult> {
  return api.post<PasswordStrengthResult>('/api/auth/validate-password-strength', { password });
}

// Streaming Services API Types
export interface StreamingServiceCatalogDto {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  logoUrl?: string;
  websiteUrl?: string;
  type: StreamingServiceType;
  category: string;
  isGlobal: boolean;
  isActive: boolean;
  sortOrder: number;
  availableRegions: string[];
  popularRegions: string[];
}

export interface UserStreamingServiceDto {
  id: string;
  streamingServiceId: string;
  serviceName: string;
  isActive: boolean;
  addedAt: string;
  removedAt?: string;
  prioritizeInResults: boolean;
  showInRecommendations: boolean;
  streamingService?: StreamingServiceCatalogDto;
}

export interface AddStreamingServiceRequest {
  streamingServiceId: string;
  prioritizeInResults?: boolean;
  showInRecommendations?: boolean;
}

export interface UpdateStreamingServicePreferencesRequest {
  streamingServiceId: string;
  prioritizeInResults: boolean;
  showInRecommendations: boolean;
}

export interface UserStreamingServicesResponse {
  userServices: UserStreamingServiceDto[];
  availableServices: StreamingServiceCatalogDto[];
  totalUserServices: number;
  totalAvailableServices: number;
}

export interface StreamingServiceRecommendationRequest {
  countryCode?: string;
  serviceTypes?: StreamingServiceType[];
  categories?: string[];
  maxRecommendations?: number;
}

export interface StreamingServiceRecommendationResponse {
  recommendedServices: StreamingServiceCatalogDto[];
  popularServices: StreamingServiceCatalogDto[];
  allServices: StreamingServiceCatalogDto[];
}

export enum StreamingServiceType {
  Subscription = 1,
  Rental = 2,
  Purchase = 3,
  Free = 4,
  AdSupported = 5,
  Live = 6,
}

// Streaming Services API Functions
export async function getAllStreamingServices(countryCode?: string): Promise<StreamingServiceCatalogDto[]> {
  const params = countryCode ? `?countryCode=${encodeURIComponent(countryCode)}` : '';
  return api.get<StreamingServiceCatalogDto[]>(`/api/streaming-services${params}`);
}

export async function getStreamingService(id: string): Promise<StreamingServiceCatalogDto> {
  return api.get<StreamingServiceCatalogDto>(`/api/streaming-services/${id}`);
}

export async function getPopularStreamingServices(
  countryCode?: string,
  limit?: number
): Promise<StreamingServiceCatalogDto[]> {
  const params = new URLSearchParams();
  if (countryCode) params.append('countryCode', countryCode);
  if (limit) params.append('limit', limit.toString());
  const queryString = params.toString() ? `?${params.toString()}` : '';
  return api.get<StreamingServiceCatalogDto[]>(`/api/streaming-services/popular${queryString}`);
}

export async function getStreamingServicesByCategory(
  category: string,
  countryCode?: string
): Promise<StreamingServiceCatalogDto[]> {
  const params = countryCode ? `?countryCode=${encodeURIComponent(countryCode)}` : '';
  return api.get<StreamingServiceCatalogDto[]>(
    `/api/streaming-services/category/${encodeURIComponent(category)}${params}`
  );
}

export async function getStreamingServicesByType(
  type: StreamingServiceType,
  countryCode?: string
): Promise<StreamingServiceCatalogDto[]> {
  const params = countryCode ? `?countryCode=${encodeURIComponent(countryCode)}` : '';
  return api.get<StreamingServiceCatalogDto[]>(`/api/streaming-services/type/${type}${params}`);
}

export async function getUserStreamingServices(countryCode?: string): Promise<UserStreamingServicesResponse> {
  const params = countryCode ? `?countryCode=${encodeURIComponent(countryCode)}` : '';
  return api.get<UserStreamingServicesResponse>(`/api/streaming-services/user${params}`);
}

export async function getActiveUserStreamingServices(): Promise<UserStreamingServiceDto[]> {
  return api.get<UserStreamingServiceDto[]>('/api/streaming-services/user/active');
}

export async function addUserStreamingService(request: AddStreamingServiceRequest): Promise<UserStreamingServiceDto> {
  return api.post<UserStreamingServiceDto>('/api/streaming-services/user', request);
}

export async function updateUserStreamingService(
  streamingServiceId: string,
  request: UpdateStreamingServicePreferencesRequest
): Promise<UserStreamingServiceDto> {
  return api.put<UserStreamingServiceDto>(`/api/streaming-services/user/${streamingServiceId}`, request);
}

export async function removeUserStreamingService(streamingServiceId: string): Promise<void> {
  return api.delete<void>(`/api/streaming-services/user/${streamingServiceId}`);
}

export async function bulkAddUserStreamingServices(
  requests: AddStreamingServiceRequest[]
): Promise<UserStreamingServiceDto[]> {
  return api.post<UserStreamingServiceDto[]>('/api/streaming-services/user/bulk', requests);
}

export async function bulkRemoveUserStreamingServices(streamingServiceIds: string[]): Promise<void> {
  // Use POST with action parameter since DELETE with body is not well-supported
  return api.post<void>('/api/streaming-services/user/bulk-remove', streamingServiceIds);
}

export async function getUserStreamingServiceStats(): Promise<Record<string, number>> {
  return api.get<Record<string, number>>('/api/streaming-services/user/stats');
}

export async function hasUserSelectedStreamingServices(): Promise<boolean> {
  return api.get<boolean>('/api/streaming-services/user/has-services');
}

export async function getStreamingServiceRecommendations(
  request: StreamingServiceRecommendationRequest
): Promise<StreamingServiceRecommendationResponse> {
  return api.post<StreamingServiceRecommendationResponse>('/api/streaming-services/recommendations', request);
}

// Search API Functions with Paywall Support

// Raw API response types (what the backend actually returns)
interface RawCountryAvailability {
  countryCode: string;
  countryName: string;
  available: boolean;
  services: string[];
  streamingUrl: string;
  audioLanguages: string[];
  subtitleLanguages: string[];
  lastUpdated: string;
  price?: number;
  currency?: string;
}

interface RawStreamingOption {
  serviceId: string;
  serviceName: string;
  countryCode: string;
  type: number | string;
  currency: string;
  url: string;
  quality: string;
  countries: RawCountryAvailability[];
  videoQuality: string[];
  hasSubtitles: boolean;
  hasAudioTracks: boolean;
  lastUpdated: string;
  serviceLogoUrl: string;
  service: string;
}

// RawSearchResult supports both camelCase and PascalCase from backend
interface RawSearchResult {
  // camelCase
  id?: string;
  title?: string;
  originalTitle?: string;
  type?: number;
  overview?: string;
  genres?: string[];
  imageUrl?: string;
  posterUrl?: string;
  rating?: number;
  language?: string;
  contentRating?: string;
  availableCountries?: number;
  availableServices?: number;
  dataSources?: string[];
  streamingOptions?: RawStreamingOption[];
  year?: number;
  releaseYear?: number;
  isPaywalled?: boolean;
  relevanceScore?: number;
  cast?: string[];
  director?: string;
  description?: string;
  previewData?: {
    shortDescription?: string;
    mainGenre?: string;
    popularityRank?: number;
  };
  // PascalCase
  Id?: string;
  Title?: string;
  OriginalTitle?: string;
  Type?: number;
  Overview?: string;
  Genres?: string[];
  ImageUrl?: string;
  PosterUrl?: string;
  Rating?: number;
  Language?: string;
  ContentRating?: string;
  AvailableCountries?: number;
  AvailableServices?: number;
  DataSources?: string[];
  StreamingOptions?: RawStreamingOption[];
  Year?: number;
  ReleaseYear?: number;
  IsPaywalled?: boolean;
  RelevanceScore?: number;
  Cast?: string[];
  Director?: string;
  Description?: string;
  PreviewData?: {
    ShortDescription?: string;
    MainGenre?: string;
    PopularityRank?: number;
  };
}

// Backend may return PascalCase or camelCase depending on auth state
// This interface supports both to ensure compatibility
interface RawSearchResponse {
  // camelCase (expected from curl/anonymous)
  results?: RawSearchResult[];
  totalResults?: number;
  page?: number;
  pageSize?: number;
  hasMore?: boolean;
  query?: string;
  suggestions?: string[];
  searchTime?: number;
  // PascalCase (returned for authenticated browser requests)
  Results?: RawSearchResult[];
  TotalResults?: number;
  Page?: number;
  PageSize?: number;
  HasMore?: boolean;
  Query?: string;
  Suggestions?: string[];
  SearchTime?: number;
  // Paywall info (both cases)
  paywallInfo?: {
    userTier: number;
    isPaywallActive: boolean;
    upgradeMessage?: string;
    remainingSearches?: number;
    remainingResults?: number;
    ctaText?: string;
    ctaUrl?: string;
  };
  PaywallInfo?: {
    UserTier?: number;
    IsPaywallActive?: boolean;
    UpgradeMessage?: string;
    RemainingSearches?: number;
    RemainingResults?: number;
    CtaText?: string;
    CtaUrl?: string;
  };
}

// Transform raw API response to frontend-expected format
// Handles both camelCase and PascalCase responses from backend
function transformSearchResponse(raw: RawSearchResponse): PaywalledSearchResponse {
  // Normalize: support both camelCase and PascalCase from backend
  const results = raw.results || raw.Results || [];
  const totalResults = raw.totalResults ?? raw.TotalResults ?? 0;
  const page = raw.page ?? raw.Page ?? 1;
  const pageSize = raw.pageSize ?? raw.PageSize ?? 20;
  const query = raw.query || raw.Query || '';
  const suggestions = raw.suggestions || raw.Suggestions;
  const searchTime = raw.searchTime ?? raw.SearchTime;

  // Normalize paywall info
  const paywallInfo = raw.paywallInfo || (raw.PaywallInfo ? {
    userTier: raw.PaywallInfo.UserTier ?? 0,
    isPaywallActive: raw.PaywallInfo.IsPaywallActive ?? false,
    upgradeMessage: raw.PaywallInfo.UpgradeMessage,
    remainingSearches: raw.PaywallInfo.RemainingSearches,
    remainingResults: raw.PaywallInfo.RemainingResults,
    ctaText: raw.PaywallInfo.CtaText,
    ctaUrl: raw.PaywallInfo.CtaUrl,
  } : {
    userTier: 0,
    isPaywallActive: false,
  });

  return {
    query,
    results: results.map(result => transformSearchResult(result)),
    totalResults,
    page,
    pageSize,
    paywallInfo,
    suggestions,
    searchTime,
  };
}

function transformSearchResult(raw: RawSearchResult): PaywalledSearchResult {
  // Map streaming option type number to string
  const mapStreamingType = (type: number | string): 'subscription' | 'rent' | 'buy' | 'free' => {
    if (typeof type === 'string') {
      const lower = type.toLowerCase();
      if (lower === 'subscription' || lower === 'sub') return 'subscription';
      if (lower === 'rent' || lower === 'rental') return 'rent';
      if (lower === 'buy' || lower === 'purchase') return 'buy';
      if (lower === 'free' || lower === 'ads' || lower === 'ad') return 'free';
    }
    // Numeric type mapping based on backend StreamingServiceType enum
    switch (type) {
      case 1: return 'subscription';
      case 2: return 'rent';
      case 3: return 'buy';
      case 4: return 'free';
      case 5: return 'free'; // AdSupported
      default: return 'subscription';
    }
  };

  // Normalize: support both camelCase and PascalCase from backend
  const id = raw.id || raw.Id || '';
  const title = raw.title || raw.Title || '';
  const type = raw.type ?? raw.Type ?? 0;
  const year = raw.year || raw.releaseYear || raw.Year || raw.ReleaseYear;
  const overview = raw.overview || raw.Overview || '';
  const description = raw.description || raw.Description || '';
  const posterUrl = raw.posterUrl || raw.imageUrl || raw.PosterUrl || raw.ImageUrl || '';
  const rating = raw.rating ?? raw.Rating;
  const genres = raw.genres || raw.Genres || [];
  const cast = raw.cast || raw.Cast || [];
  const director = raw.director || raw.Director;
  const availableCountries = raw.availableCountries ?? raw.AvailableCountries ?? 0;
  const streamingOptions = raw.streamingOptions || raw.StreamingOptions || [];
  const relevanceScore = raw.relevanceScore ?? raw.RelevanceScore ?? 0;
  const isPaywalled = raw.isPaywalled ?? raw.IsPaywalled ?? false;
  const previewData = raw.previewData || (raw.PreviewData ? {
    shortDescription: raw.PreviewData.ShortDescription,
    mainGenre: raw.PreviewData.MainGenre,
    popularityRank: raw.PreviewData.PopularityRank,
  } : undefined);

  return {
    id,
    title,
    type: type as ContentType,
    year,
    description: overview || description,
    posterUrl,
    imdbRating: rating || undefined,
    genres,
    cast,
    director,
    availableCountries,
    streamingOptions: streamingOptions.map(opt => ({
      serviceId: opt.serviceId || opt.service || '',
      serviceName: opt.serviceName || opt.service || 'Unknown',
      serviceLogoUrl: opt.serviceLogoUrl || undefined,
      type: mapStreamingType(opt.type),
      price: opt.countries?.[0]?.price,
      currency: opt.countries?.[0]?.currency || opt.currency,
      url: opt.url || opt.countries?.[0]?.streamingUrl,
      availableInCountries: opt.countries?.map(c => c.countryCode) || [],
    })),
    relevanceScore,
    isPaywalled,
    previewData,
  };
}

export async function searchGlobalContent(request: GlobalSearchRequest): Promise<PaywalledSearchResponse> {
  // Bug 13 fix: Use postPublic for anonymous-accessible search endpoint
  const rawResponse = await api.postPublic<RawSearchResponse>('/api/search/global', request);
  return transformSearchResponse(rawResponse);
}

// Enhanced search function with advanced filters
export async function searchWithAdvancedFilters(
  request: GlobalSearchRequest & {
    // Additional filter properties
    contentRatings?: string[];
    minRuntimeMinutes?: number;
    maxRuntimeMinutes?: number;
    audioLanguages?: string[];
    subtitleLanguages?: string[];
    minPrice?: number;
    maxPrice?: number;
    videoQualities?: string[];
    cast?: string[];
    directors?: string[];
    freeContentOnly?: boolean;
    subscriptionContentOnly?: boolean;
    platformExclusives?: boolean;
    popularityFilter?: 'Trending' | 'Popular' | 'HighlyRated' | 'HiddenGems' | 'AwardWinners' | 'CriticsPick';
  }
): Promise<PaywalledSearchResponse> {
  const rawResponse = await api.post<RawSearchResponse>('/api/search/global', request);
  return transformSearchResponse(rawResponse);
}

export async function getSearchResultDetails(
  contentId: string,
  contentType: ContentType
): Promise<PaywalledSearchResult> {
  return api.get<PaywalledSearchResult>(`/api/search/details/${contentId}?contentType=${contentType}`);
}

export async function getAutocompleteSuggestions(query: string, maxResults: number = 10): Promise<string[]> {
  // Bug 9 fix: Skip API call for empty/whitespace-only queries
  const trimmed = query?.trim();
  if (!trimmed) {
    return [];
  }
  return api.get<string[]>(`/api/search/autocomplete?query=${encodeURIComponent(trimmed)}&maxResults=${maxResults}`);
}

// Enhanced Autocomplete API Functions
export async function getEnhancedAutocompleteSuggestions(
  query: string,
  maxResults: number = 8
): Promise<AutocompleteSuggestion[]> {
  // Bug 9 fix: Skip API call for empty/whitespace-only queries
  const trimmed = query?.trim();
  if (!trimmed) {
    return [];
  }
  return api.get<AutocompleteSuggestion[]>(
    `/api/search/autocomplete/enhanced?query=${encodeURIComponent(trimmed)}&maxResults=${maxResults}`
  );
}

export async function getSearchHistory(maxResults: number = 20): Promise<SearchHistoryItem[]> {
  return api.get<SearchHistoryItem[]>(`/api/search/history?maxResults=${maxResults}`);
}

export async function clearSearchHistory(): Promise<{ message: string }> {
  return api.delete<{ message: string }>('/api/search/history');
}

export async function getTrendingSearches(
  maxResults: number = 10,
  timeWindowHours: number = 24
): Promise<TrendingSearch[]> {
  return api.get<TrendingSearch[]>(`/api/search/trending?maxResults=${maxResults}&timeWindowHours=${timeWindowHours}`);
}

export async function getPopularContent(
  contentType?: ContentType,
  country?: string,
  limit: number = 20
): Promise<PaywalledSearchResult[]> {
  const params = new URLSearchParams();
  if (contentType !== undefined) params.append('contentType', contentType.toString());
  if (country) params.append('country', country);
  params.append('limit', limit.toString());

  return api.get<PaywalledSearchResult[]>(`/api/search/popular?${params.toString()}`);
}

export interface SearchSuggestionRequest {
  query: string;
}

export interface SearchSuggestion {
  suggestedQuery: string;
  type: 'TypoCorrection' | 'Completion' | 'Related';
  reason: string;
}

export async function getSearchSuggestions(request: SearchSuggestionRequest): Promise<SearchSuggestion[]> {
  return api.post<SearchSuggestion[]>('/api/search/suggestions', request);
}

// Paywall Analytics API Functions
export async function trackPaywallEvent(event: PaywallAnalytics): Promise<void> {
  try {
    await api.post<void>('/api/analytics/paywall', event);
  } catch {
    // Silent fail - 401 for anonymous users is expected, don't break UX
  }
}

export async function logPaywallInteraction(
  event: 'paywall_shown' | 'upgrade_clicked' | 'dismissed' | 'search_limited',
  context?: {
    query?: string;
    resultCount?: number;
    paywallPosition?: string;
  }
): Promise<void> {
  const analyticsEvent: Omit<PaywallAnalytics, 'userId' | 'tier'> = {
    event,
    context: context || {},
    timestamp: new Date().toISOString(),
  };

  await trackPaywallEvent(analyticsEvent as PaywallAnalytics);
}

// Subscription Management API Functions
export interface SubscriptionStatus {
  isActive: boolean;
  tier: string;
  endDate?: string;
  autoRenew: boolean;
}

export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  return api.get<SubscriptionStatus>('/api/subscription/status');
}

export async function upgradeSubscription(tier: string, paymentMethodId?: string): Promise<{ redirectUrl?: string }> {
  return api.post<{ redirectUrl?: string }>('/api/subscription/upgrade', { tier, paymentMethodId });
}

export async function cancelSubscription(): Promise<void> {
  return api.post<void>('/api/subscription/cancel');
}

// User Subscription API Functions
export async function getUserSubscription(): Promise<UserSubscription> {
  return api.get<UserSubscription>('/api/subscription/status');
}

export async function getUserUsage(): Promise<{
  searchesUsed: number;
  resultsViewed: number;
  resetTime?: string;
}> {
  return api.get<{
    searchesUsed: number;
    resultsViewed: number;
    resetTime?: string;
  }>('/api/subscription/usage');
}

export async function updateSubscription(
  subscriptionId: string,
  data: Partial<UserSubscription>
): Promise<UserSubscription> {
  return api.put<UserSubscription>(`/api/subscription/${subscriptionId}`, data);
}

export async function createCheckoutSession(
  tier: string,
  successUrl: string,
  cancelUrl: string
): Promise<{ checkoutUrl: string }> {
  return api.post<{ checkoutUrl: string }>('/api/subscription/checkout', {
    tier,
    successUrl,
    cancelUrl,
  });
}

export async function createBillingPortalSession(returnUrl: string): Promise<{ portalUrl: string }> {
  return api.post<{ portalUrl: string }>('/api/subscription/billing-portal', {
    returnUrl,
  });
}

// New Subscription Management Functions
export interface SubscriptionDto {
  id: string;
  status: string;
  planType: string;
  amount: number;
  currency: string;
  interval: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  isCanceled: boolean;
  canceledAt?: string;
  trialEnd?: string;
}

export interface CreateSubscriptionRequest {
  priceId: string;
  paymentMethodId?: string;
  planType: string;
  metadata?: Record<string, string>;
  trialPeriodDays?: number;
}

export async function getCurrentSubscription(): Promise<SubscriptionDto | null> {
  return api.get<SubscriptionDto | null>('/api/subscription/current');
}

export async function getSubscriptionHistory(): Promise<SubscriptionDto[]> {
  return api.get<SubscriptionDto[]>('/api/subscription/history');
}

export async function createSubscription(request: CreateSubscriptionRequest): Promise<SubscriptionDto> {
  return api.post<SubscriptionDto>('/api/subscription/create', request);
}

export async function cancelUserSubscription(subscriptionId: string): Promise<SubscriptionDto> {
  return api.post<SubscriptionDto>(`/api/subscription/${subscriptionId}/cancel`);
}

export async function reactivateSubscription(subscriptionId: string): Promise<SubscriptionDto> {
  return api.post<SubscriptionDto>(`/api/subscription/${subscriptionId}/reactivate`);
}

export async function changePlan(subscriptionId: string, newPriceId: string): Promise<SubscriptionDto> {
  return api.post<SubscriptionDto>(`/api/subscription/${subscriptionId}/change-plan`, { newPriceId });
}

export async function syncSubscriptionWithStripe(): Promise<boolean> {
  return api.post<boolean>('/api/subscription/sync');
}

// Additional paywall analytics functions
export async function logFeatureDemoViewed(): Promise<void> {
  return logPaywallInteraction('upgrade_clicked');
}

export async function logUpgradeFlowStarted(): Promise<void> {
  return logPaywallInteraction('upgrade_clicked');
}

export async function logUpgradeFlowCompleted(): Promise<void> {
  return logPaywallInteraction('upgrade_clicked');
}

// Payment API Functions
export async function createPaymentIntent(request: CreatePaymentIntentRequest): Promise<PaymentTransaction> {
  return api.post<PaymentTransaction>('/api/payment/payment-intents', request);
}

export async function confirmPaymentIntent(paymentIntentId: string): Promise<PaymentTransaction> {
  return api.post<PaymentTransaction>(`/api/payment/payment-intents/${paymentIntentId}/confirm`);
}

export async function cancelPaymentIntent(paymentIntentId: string): Promise<PaymentTransaction> {
  return api.post<PaymentTransaction>(`/api/payment/payment-intents/${paymentIntentId}/cancel`);
}

export async function getPaymentTransaction(transactionId: string): Promise<PaymentTransaction> {
  return api.get<PaymentTransaction>(`/api/payment/transactions/${transactionId}`);
}

export async function getPaymentHistory(page: number = 1, pageSize: number = 20): Promise<PaymentTransaction[]> {
  return api.get<PaymentTransaction[]>(`/api/payment/history?page=${page}&pageSize=${pageSize}`);
}

export async function attachPaymentMethod(request: PaymentMethodRequest): Promise<PaymentMethod> {
  return api.post<PaymentMethod>('/api/payment/payment-methods', request);
}

export async function getPaymentMethods(): Promise<PaymentMethod[]> {
  return api.get<PaymentMethod[]>('/api/payment/payment-methods');
}

export async function detachPaymentMethod(paymentMethodId: string): Promise<PaymentMethod> {
  return api.delete<PaymentMethod>(`/api/payment/payment-methods/${paymentMethodId}`);
}

export async function setDefaultPaymentMethod(paymentMethodId: string): Promise<PaymentMethod> {
  return api.put<PaymentMethod>(`/api/payment/payment-methods/${paymentMethodId}/default`);
}

// Payment error handling utilities
export function mapStripeErrorToPaymentError(stripeError: {
  code?: string;
  message?: string;
  param?: string;
  decline_code?: string;
}): PaymentError {
  const errorMap: Record<string, PaymentErrorType> = {
    card_declined: PaymentErrorType.CARD_DECLINED,
    insufficient_funds: PaymentErrorType.INSUFFICIENT_FUNDS,
    incorrect_number: PaymentErrorType.INVALID_CARD,
    invalid_number: PaymentErrorType.INVALID_CARD,
    invalid_expiry_month: PaymentErrorType.INVALID_CARD,
    invalid_expiry_year: PaymentErrorType.INVALID_CARD,
    invalid_cvc: PaymentErrorType.INVALID_CARD,
    expired_card: PaymentErrorType.INVALID_CARD,
    processing_error: PaymentErrorType.PROCESSING_ERROR,
    authentication_required: PaymentErrorType.AUTHENTICATION_REQUIRED,
  };

  const errorType = errorMap[stripeError.code || ''] || PaymentErrorType.UNKNOWN;

  return {
    type: errorType,
    message: stripeError.message || 'An unexpected payment error occurred',
    code: stripeError.code,
    param: stripeError.param,
    declineCode: stripeError.decline_code,
  };
}

export function getPaymentErrorMessage(error: PaymentError): string {
  switch (error.type) {
    case PaymentErrorType.CARD_DECLINED:
      return 'Your card was declined. Please try a different payment method or contact your bank.';
    case PaymentErrorType.INSUFFICIENT_FUNDS:
      return 'Your card has insufficient funds. Please try a different payment method.';
    case PaymentErrorType.INVALID_CARD:
      return 'Please check your card information and try again.';
    case PaymentErrorType.PROCESSING_ERROR:
      return 'We encountered an issue processing your payment. Please try again in a few moments.';
    case PaymentErrorType.NETWORK_ERROR:
      return 'Network connection failed. Please check your internet connection and try again.';
    case PaymentErrorType.AUTHENTICATION_REQUIRED:
      return 'Additional authentication is required. Please complete the verification process.';
    default:
      return error.message || 'An unexpected error occurred. Please try again or contact support.';
  }
}

// Payment Recovery API Functions
export async function getUserFailedPayments(activeOnly: boolean = true): Promise<FailedPayment[]> {
  const params = activeOnly ? '?activeOnly=true' : '';
  const response = await api.get<{ data: FailedPayment[]; count: number }>(
    `/api/paymentrecovery/failed-payments${params}`
  );
  return response.data;
}

export async function getFailedPayment(failedPaymentId: string): Promise<FailedPayment> {
  const response = await api.get<{ data: FailedPayment }>(`/api/paymentrecovery/failed-payments/${failedPaymentId}`);
  return response.data;
}

export async function retryFailedPayment(
  failedPaymentId: string,
  request?: ManualPaymentRetryRequest
): Promise<PaymentRetryAttempt> {
  const response = await api.post<{ data: PaymentRetryAttempt }>(
    `/api/paymentrecovery/failed-payments/${failedPaymentId}/retry`,
    request || {}
  );
  return response.data;
}

export async function getRecoverySession(sessionToken: string): Promise<PaymentRecoverySession> {
  const response = await api.get<{ data: PaymentRecoverySession }>(
    `/api/paymentrecovery/recovery-session/${sessionToken}`
  );
  return response.data;
}

export async function completeRecoverySession(
  sessionToken: string,
  request: CompleteRecoverySessionRequest
): Promise<PaymentRecoverySession> {
  const response = await api.post<{ data: PaymentRecoverySession }>(
    `/api/paymentrecovery/recovery-session/${sessionToken}/complete`,
    request
  );
  return response.data;
}

export async function getUserGracePeriod(): Promise<{
  data: GracePeriod | null;
  inGracePeriod: boolean;
  restrictedFeatures: string[];
}> {
  return api.get<{ data: GracePeriod | null; inGracePeriod: boolean; restrictedFeatures: string[] }>(
    '/api/paymentrecovery/grace-period'
  );
}

export async function getRecoveryMetrics(startDate?: Date, endDate?: Date): Promise<RecoveryMetrics> {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate.toISOString());
  if (endDate) params.append('endDate', endDate.toISOString());
  const queryString = params.toString();
  return api.get<RecoveryMetrics>(
    `/api/paymentrecovery/analytics/recovery-metrics${queryString ? `?${queryString}` : ''}`
  );
}

// Dunning Management API Functions
export async function getDunningCampaigns(failedPaymentId?: string): Promise<unknown[]> {
  const params = failedPaymentId ? `?failedPaymentId=${failedPaymentId}` : '';
  const response = await api.get<{ data: unknown[]; count: number }>(`/api/dunning/campaigns${params}`);
  return response.data;
}

// User Preferences API Functions
export interface UserPreferences {
  id?: string;
  userId: string;
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  preferredGenre?: string;
  contentLanguage?: string;
  adultContent?: boolean;
  subtitlesEnabled?: boolean;
  videoQuality?: 'auto' | 'low' | 'medium' | 'high' | 'ultra';
  primaryRegion?: string;
  secondaryRegions?: string[];
  timezone?: string;
  currency?: string;
  measurementUnit?: 'metric' | 'imperial';
  twoFactorEnabled?: boolean;
  sessionTimeout?: number;
  passwordExpiry?: number;
  loginNotifications?: boolean;
  deviceTracking?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const preferences = {
  async getUserPreferences(userId: string): Promise<UserPreferences> {
    const response = await api.get<{ data: UserPreferences }>(`/api/preferences/${userId}`);
    return response.data;
  },

  async updateUserPreferences(userId: string, updates: Partial<UserPreferences>): Promise<{ success: boolean }> {
    const response = await api.put<{ success: boolean }>(`/api/preferences/${userId}`, updates);
    return response;
  },

  async exportUserData(userId: string): Promise<{ preferences: UserPreferences; exportedAt: string }> {
    const response = await api.get<{ preferences: UserPreferences; exportedAt: string }>(
      `/api/preferences/${userId}/export`
    );
    return response;
  },

  async deleteUserData(userId: string): Promise<{ success: boolean }> {
    const response = await api.delete<{ success: boolean }>(`/api/preferences/${userId}`);
    return response;
  },
};

export { api };
