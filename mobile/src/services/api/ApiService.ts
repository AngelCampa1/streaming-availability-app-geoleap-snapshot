/**
 * Main API Service for GeoLeap Mobile App
 * Provides comprehensive error handling, retry logic, and request/response interceptors
 * Integrates with .NET 9 backend at https://api.geoleap.app
 */

import { apiConfig, buildUrl, API_ERROR_CODES, type ApiErrorCode } from '../../config/api';
import networkServiceSingleton, { NetworkService } from './NetworkService';
import cacheService from './CacheService'; // Use singleton instance
import offlineServiceSingleton, { OfflineService } from './OfflineService';
import { logger as loggerImport } from '../../utils/logger';
import { delayService, TimerHandle } from '../../utils/DelayService';

// Safe logger wrapper that handles undefined cases in test environments
const logger = {
  debug: (...args: Parameters<typeof console.log>) => loggerImport?.debug?.(...args),
  info: (...args: Parameters<typeof console.log>) => loggerImport?.info?.(...args),
  warn: (...args: Parameters<typeof console.warn>) => loggerImport?.warn?.(...args),
  error: (...args: Parameters<typeof console.error>) => {
    if (loggerImport?.error) {
      loggerImport.error(...args);
    } else {
      console.error(...args);
    }
  },
};

const isSensitiveOfflineBodyKey = (key: string): boolean => {
  const normalizedKey = key.toLowerCase().replace(/[_-]/g, '');
  return normalizedKey.includes('authorization')
    || normalizedKey.includes('bearer')
    || normalizedKey === 'token'
    || normalizedKey.includes('idtoken')
    || normalizedKey.includes('accesstoken')
    || normalizedKey.includes('refreshtoken')
    || normalizedKey.includes('password')
    || normalizedKey.includes('apikey')
    || normalizedKey.includes('secret')
    || normalizedKey.includes('credential')
    || normalizedKey.includes('passcode');
};

const sanitizeOfflineBody = (value: any): any => {
  if (Array.isArray(value)) {
    return value.map(sanitizeOfflineBody);
  }

  if (value && typeof value === 'object') {
    return Object.entries(value).reduce<Record<string, any>>((sanitized, [key, nestedValue]) => {
      if (!isSensitiveOfflineBodyKey(key)) {
        sanitized[key] = sanitizeOfflineBody(nestedValue);
      }
      return sanitized;
    }, {});
  }

  return value;
};

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, any>;
  timeout?: number;
  retryAttempts?: number;
  skipAuth?: boolean;
  skipCache?: boolean;
  cacheTTL?: number;
  priority?: 'high' | 'normal' | 'low';
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  success: boolean;
  error?: {
    code: ApiErrorCode;
    message: string;
    details?: any;
  };
  fromCache?: boolean;
}

export interface RequestInterceptor {
  onRequest?: (config: ApiRequestOptions) => Promise<ApiRequestOptions>;
  onRequestError?: (error: any) => Promise<any>;
}

export interface ResponseInterceptor {
  onResponse?: (response: ApiResponse) => Promise<ApiResponse>;
  onResponseError?: (error: any) => Promise<any>;
}

class ApiService {
  private networkService: NetworkService;
  private cacheService: typeof cacheService;
  private offlineService: OfflineService;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private abortControllers: Map<string, AbortController> = new Map();

  constructor(networkService?: NetworkService, offlineService?: OfflineService) {
    this.networkService = networkService ?? networkServiceSingleton;
    this.cacheService = cacheService; // Use singleton instance
    this.offlineService = offlineService ?? offlineServiceSingleton;

    // Initialize default interceptors
    this.setupDefaultInterceptors();
  }

  /**
   * Setup default request and response interceptors
   */
  private setupDefaultInterceptors(): void {
    // Request interceptor for authentication
    this.addRequestInterceptor({
      onRequest: async (config) => {
        // Add auth headers if not skipped
        if (!config.skipAuth) {
          const authHeaders = await this.getAuthHeaders();
          config.headers = { ...config.headers, ...authHeaders };
        }

        // Add common headers
        config.headers = {
          ...config.headers,
          'Content-Type': config.headers?.['Content-Type'] || 'application/json',
          'Accept': 'application/json',
          'X-Request-ID': this.generateRequestId(),
          'X-Client-Platform': 'mobile',
          'X-Client-Version': '1.0.0',
        };

        return config;
      },
      onRequestError: async (error) => {
        logger.error('Request interceptor error:', error);
        return Promise.reject(error);
      },
    });

    // Response interceptor for error handling
    this.addResponseInterceptor({
      onResponse: async (response) => {
        logger.debug('API Response:', {
          status: response.status,
          url: response.headers['X-Request-ID'],
          fromCache: response.fromCache,
        });
        return response;
      },
      onResponseError: async (error) => {
        logger.error('Response interceptor error:', error);
        return this.handleResponseError(error);
      },
    });
  }

  /**
   * Add request interceptor
   */
  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * Add response interceptor
   */
  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get authentication headers
   */
  private async getAuthHeaders(): Promise<Record<string, string>> {
    try {
      // Use require instead of dynamic import for better Jest mock support
      // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
      const authService = require('../authService').default;
      const tokens = await authService.getTokens();

      if (tokens?.accessToken) {
        return {
          Authorization: `Bearer ${tokens.accessToken}`,
        };
      }

      return {};
    } catch (error) {
      logger.warn('Failed to get auth headers:', error);
      return {};
    }
  }

  /**
   * Build URL with query parameters
   */
  private buildUrlWithParams(endpoint: string, params?: Record<string, any>): string {
    let url = endpoint.startsWith('http') ? endpoint : buildUrl(endpoint);

    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });

      const paramString = searchParams.toString();
      if (paramString) {
        url += (url.includes('?') ? '&' : '?') + paramString;
      }
    }

    return url;
  }

  /**
   * Apply request interceptors
   */
  private async applyRequestInterceptors(config: ApiRequestOptions): Promise<ApiRequestOptions> {
    let processedConfig = { ...config };

    for (const interceptor of this.requestInterceptors) {
      if (interceptor.onRequest) {
        try {
          processedConfig = await interceptor.onRequest(processedConfig);
        } catch (error: any) {
          if (interceptor.onRequestError) {
            return await interceptor.onRequestError(error);
          }
          throw error;
        }
      }
    }

    return processedConfig;
  }

  /**
   * Apply response interceptors
   */
  private async applyResponseInterceptors(response: ApiResponse): Promise<ApiResponse> {
    let processedResponse = response;

    for (const interceptor of this.responseInterceptors) {
      if (interceptor.onResponse) {
        processedResponse = await interceptor.onResponse(processedResponse);
      }
    }

    return processedResponse;
  }

  /**
   * Apply response error interceptors
   */
  private async applyResponseErrorInterceptors(error: any): Promise<any> {
    let processedError = error;

    for (const interceptor of this.responseInterceptors) {
      if (interceptor.onResponseError) {
        try {
          processedError = await interceptor.onResponseError(processedError);
        } catch (interceptorError) {
          processedError = interceptorError;
        }
      }
    }

    return processedError;
  }

  /**
   * Handle response errors with proper error codes
   */
  private async handleResponseError(error: any): Promise<never> {
    logger.error('API Error:', error);

    let errorCode: ApiErrorCode;
    let message: string;
    let statusCode: number;

    if (error.name === 'AbortError') {
      errorCode = API_ERROR_CODES.TIMEOUT_ERROR;
      message = 'Request was aborted or timed out';
      statusCode = 408;
    } else if ((typeof navigator !== 'undefined' && (navigator as any).onLine === false) || error?.message?.includes('network')) {
      errorCode = API_ERROR_CODES.NETWORK_ERROR;
      message = 'Network connection unavailable';
      statusCode = 0;
    } else if (error.status) {
      statusCode = error.status;

      switch (statusCode) {
        case 401:
          errorCode = API_ERROR_CODES.AUTHENTICATION_ERROR;
          message = 'Authentication failed';
          break;
        case 403:
          errorCode = API_ERROR_CODES.AUTHENTICATION_ERROR;
          message = 'Access forbidden';
          break;
        case 404:
          errorCode = API_ERROR_CODES.NOT_FOUND;
          message = 'Resource not found';
          break;
        case 422:
          errorCode = API_ERROR_CODES.VALIDATION_ERROR;
          message = 'Validation failed';
          break;
        case 429:
          errorCode = API_ERROR_CODES.RATE_LIMIT;
          message = 'Too many requests';
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          errorCode = API_ERROR_CODES.SERVER_ERROR;
          message = 'Server error occurred';
          break;
        default:
          errorCode = API_ERROR_CODES.UNKNOWN_ERROR;
          message = error?.message || 'Unknown error occurred';
      }
    } else {
      errorCode = API_ERROR_CODES.UNKNOWN_ERROR;
      message = error?.message || 'Unknown error occurred';
      statusCode = 0;
    }

    const apiError = new Error(message) as any;
    apiError.code = errorCode;
    apiError.status = statusCode;
    apiError.originalError = error;

    throw apiError;
  }

  /**
   * Make HTTP request with comprehensive error handling and retry logic
   */
  public async makeRequest<T = any>(
    endpoint: string,
    options: ApiRequestOptions = {},
  ): Promise<ApiResponse<T>> {
    const requestId = this.generateRequestId();
    const controller = new AbortController();
    this.abortControllers.set(requestId, controller);

    try {
      // Apply request interceptors
      const processedOptions = await this.applyRequestInterceptors(options);

      const {
        method = 'GET',
        headers = {},
        body,
        params,
        timeout = apiConfig.timeout,
        retryAttempts = apiConfig.retryAttempts,
        skipCache = false,
        cacheTTL = 300000, // 5 minutes default
        priority = 'normal',
      } = processedOptions;

      // Check cache for GET requests
      if (method === 'GET' && !skipCache) {
        const cacheKey = this.getCacheKey(endpoint, params);
        const cachedData = await this.cacheService.get<T>(cacheKey);

        if (cachedData) {
          logger.debug('Cache hit for:', endpoint);
          return {
            data: cachedData,
            status: 200,
            statusText: 'OK (Cached)',
            headers: {},
            success: true,
            fromCache: true,
          };
        }
      }

      // Check network connectivity
      const isConnected = await this.networkService.isConnected();
      if (!isConnected) {
        // For GET requests, try to return cached data
        if (method === 'GET') {
          const cacheKey = this.getCacheKey(endpoint, params);
          const cachedData = await this.cacheService.get<T>(cacheKey, { forceExpired: true });

          if (cachedData) {
            return {
              data: cachedData,
              status: 200,
              statusText: 'OK (Offline)',
              headers: {},
              success: true,
              fromCache: true,
            };
          }
        }

        // Queue non-GET requests for when back online
        if (method !== 'GET') {
          await this.offlineService.queueRequest({
            endpoint,
            method,
            body: sanitizeOfflineBody(body),
            params,
            priority,
            maxRetries: 3,
          });
        }

        throw new Error('No network connection available');
      }

      // Build URL and prepare request
      const url = this.buildUrlWithParams(endpoint, params);
      const fetchOptions: RequestInit = {
        method,
        headers,
        signal: controller.signal,
      };

      if (body && method !== 'GET') {
        fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
      }

      // Set timeout using DelayService
      const timeoutTimer = delayService.timeout(() => {
        controller.abort();
      }, timeout);

      let attempt = 0;
      let lastError: any;

      while (attempt <= retryAttempts) {
        try {
          logger.debug(`API Request (${attempt + 1}/${retryAttempts + 1}):`, {
            method,
            url,
            requestId,
          });

          const response = await fetch(url, fetchOptions);
          timeoutTimer.clear();

          const responseHeaders: Record<string, string> = {};
          response.headers.forEach((value, key) => {
            responseHeaders[key] = value;
          });

          if (!response.ok) {
            const error = new Error(`HTTP ${response.status}: ${response.statusText}`) as any;
            error.status = response.status;
            error.statusText = response.statusText;
            error.headers = responseHeaders;
            throw error;
          }

          // Parse response
          let data: T;
          const contentType = response.headers.get('content-type');

          if (contentType?.includes('application/json')) {
            data = await response.json();
          } else if (contentType?.includes('text/')) {
            data = (await response.text()) as unknown as T;
          } else {
            data = (await response.blob()) as unknown as T;
          }

          const apiResponse: ApiResponse<T> = {
            data,
            status: response.status,
            statusText: response.statusText,
            headers: responseHeaders,
            success: true,
          };

          // Cache GET responses
          if (method === 'GET' && !skipCache) {
            const cacheKey = this.getCacheKey(endpoint, params);
            await this.cacheService.set(cacheKey, data, { ttl: cacheTTL });
          }

          // Apply response interceptors
          const processedResponse = await this.applyResponseInterceptors(apiResponse);

          logger.debug('API Response successful:', {
            status: processedResponse.status,
            requestId,
            fromCache: processedResponse.fromCache,
          });

          return processedResponse;

        } catch (error: any) {
          lastError = error;
          attempt++;

          // Don't retry on certain error types
          if (
            error.status === 401 ||
            error.status === 403 ||
            error.status === 404 ||
            error.status === 422 ||
            error.name === 'AbortError'
          ) {
            break;
          }

          // Exponential backoff for retries using DelayService
          if (attempt <= retryAttempts) {
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
            logger.debug(`Retrying request in ${delay}ms:`, { method, url, attempt });
            await delayService.wait(delay);
          }
        }
      }

      timeoutTimer.clear();
      throw lastError;

    } finally {
      this.abortControllers.delete(requestId);
    }
  }

  /**
   * Generate cache key for requests
   */
  private getCacheKey(endpoint: string, params?: Record<string, any>): string {
    const paramsString = params ? JSON.stringify(params) : '';
    return `api_cache_${endpoint}_${paramsString}`;
  }

  /**
   * Cancel all pending requests
   */
  cancelAllRequests(): void {
    this.abortControllers.forEach((controller) => {
      controller.abort();
    });
    this.abortControllers.clear();
  }

  /**
   * Cancel specific request
   */
  cancelRequest(requestId: string): void {
    const controller = this.abortControllers.get(requestId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(requestId);
    }
  }

  // HTTP Method helpers

  /**
   * GET request
   */
  async get<T = any>(endpoint: string, options: Omit<ApiRequestOptions, 'method'> = {}): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { ...options, method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T = any>(endpoint: string, data?: any, options: Omit<ApiRequestOptions, 'method' | 'body'> = {}): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { ...options, method: 'POST', body: data });
  }

  /**
   * PUT request
   */
  async put<T = any>(endpoint: string, data?: any, options: Omit<ApiRequestOptions, 'method' | 'body'> = {}): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { ...options, method: 'PUT', body: data });
  }

  /**
   * PATCH request
   */
  async patch<T = any>(endpoint: string, data?: any, options: Omit<ApiRequestOptions, 'method' | 'body'> = {}): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { ...options, method: 'PATCH', body: data });
  }

  /**
   * DELETE request
   */
  async delete<T = any>(endpoint: string, options: Omit<ApiRequestOptions, 'method'> = {}): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { ...options, method: 'DELETE' });
  }

  /**
   * Upload file with progress tracking
   */
  async upload<T = any>(
    endpoint: string,
    file: File | Blob,
    options: {
      onProgress?: (progress: number) => void;
      fieldName?: string;
      metadata?: Record<string, string>;
    } & Omit<ApiRequestOptions, 'method' | 'body'> = {},
  ): Promise<ApiResponse<T>> {
    const { onProgress: _onProgress, fieldName = 'file', metadata = {}, ...requestOptions } = options;

    const formData = new FormData();
    formData.append(fieldName, file);

    Object.entries(metadata).forEach(([key, value]) => {
      formData.append(key, value);
    });

    // Override the fetch method to handle progress
    const _originalMakeRequest = this.makeRequest.bind(this);

    return this.makeRequest<T>(endpoint, {
      ...requestOptions,
      method: 'POST',
      body: formData,
      headers: {
        // Don't set Content-Type for FormData - browser will set it with boundary
        ...(requestOptions.headers || {}),
        'Content-Type': undefined,
      },
    });
  }

  /**
   * Health check for the API
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.get('/health', {
        skipAuth: true,
        timeout: 5000,
        retryAttempts: 1,
      });
      return response.success;
    } catch (error) {
      logger.warn('API health check failed:', error);
      return false;
    }
  }

  /**
   * Clear all cached data
   */
  async clearCache(): Promise<void> {
    await this.cacheService.clear();
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{ size: number; keys: string[] }> {
    const stats = this.cacheService.getStats();
    return {
      size: stats.totalSize,
      keys: [], // Would need to implement keys tracking in CacheService
    };
  }
}

// Export singleton instance
const apiService = new ApiService();
export default apiService;
export { ApiService };
