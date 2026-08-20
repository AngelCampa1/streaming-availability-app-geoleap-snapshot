/**
 * Enhanced HTTP Client for GeoLeap Mobile App
 * Provides automatic authentication, error handling, and network monitoring
 */

import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios';
import { Alert } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { apiConfig, API_ERROR_CODES, ApiErrorCode } from '../../config/api';
import { tokenStorage } from '../storage/SecureStorage';
import { AuthTokens } from '../../types/auth';
import { logger } from '../../utils/logger';

// Extended InternalAxiosRequestConfig to include custom properties
interface ExtendedInternalAxiosRequestConfig extends InternalAxiosRequestConfig {
  skipAuth?: boolean;
}

// Request options interface
export interface RequestOptions extends AxiosRequestConfig {
  skipAuth?: boolean;
  skipRetry?: boolean;
  showNetworkAlert?: boolean;
}

// API response interface
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  message?: string;
}

// Network error interface
export interface NetworkError extends Error {
  code: ApiErrorCode;
  status?: number;
  details?: any;
}

// Retry configuration
interface RetryConfig {
  attempts: number;
  delay: number;
  retryCondition?: (error: AxiosError) => boolean;
}

export class HttpClient {
  private static instance: HttpClient;
  private axiosInstance: AxiosInstance;
  private isRefreshing: boolean = false;
  private refreshSubscribers: Array<(result: { token: string | null; error?: Error }) => void> = [];
  private currentTokens: AuthTokens | null = null;
  // SECURITY FIX: Added promise to track ongoing refresh operation
  private tokenRefreshPromise: Promise<string | null> | null = null;
  // SECURITY FIX: Added timeout for refresh operations
  private readonly REFRESH_TIMEOUT = 30000; // 30 seconds

  private constructor() {
    this.axiosInstance = axios.create({
      baseURL: apiConfig.baseURL,
      timeout: apiConfig.timeout,
      headers: apiConfig.headers,
    });

    this.setupInterceptors();
    this.setupNetworkMonitoring();
  }

  static getInstance(): HttpClient {
    if (!HttpClient.instance) {
      HttpClient.instance = new HttpClient();
    }
    return HttpClient.instance;
  }

  /**
   * Setup request and response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      async (config: ExtendedInternalAxiosRequestConfig) => {
        // Skip authentication if explicitly requested
        if (config.skipAuth) {
          return config;
        }

        // Add authentication headers
        const tokens = await this.getValidTokens();
        if (tokens && config.headers) {
          config.headers.Authorization = `${tokens.tokenType || 'Bearer'} ${tokens.accessToken}`;

          // Add additional headers for security
          config.headers['X-Request-ID'] = this.generateRequestId();
          config.headers['X-Timestamp'] = Date.now().toString();
        }

        return config;
      },
      (error) => {
        return Promise.reject(error);
      },
    );

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        // Handle token refresh
        if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.skipAuth) {
          originalRequest._retry = true;

          try {
            const newToken = await this.refreshAccessToken();
            if (newToken && originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return this.axiosInstance(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed, clear tokens and reject
            await this.clearTokens();
            return Promise.reject(this.handleApiError(refreshError));
          }
        }

        return Promise.reject(this.handleApiError(error));
      },
    );
  }

  /**
   * Setup network monitoring
   */
  private setupNetworkMonitoring(): void {
    NetInfo.addEventListener(state => {
      if (!state.isConnected) {
        // Handle network disconnection
        logger.warn('[HttpClient] Network disconnected');
      }
    });
  }

  /**
   * Get valid tokens (refresh if needed)
   * SECURITY FIX: Improved race condition handling with proper mutex pattern
   */
  private async getValidTokens(): Promise<AuthTokens | null> {
    try {
      // If refresh is in progress, wait for it to complete
      if (this.isRefreshing && this.tokenRefreshPromise) {
        const refreshedToken = await this.tokenRefreshPromise;
        if (refreshedToken && this.currentTokens) {
          return { ...this.currentTokens, accessToken: refreshedToken };
        }
        return null;
      }

      if (!this.currentTokens) {
        this.currentTokens = await tokenStorage.getTokens();
      }

      if (!this.currentTokens) {
        return null;
      }

      // Check if token is expired or about to expire (5 second buffer)
      const expirationBuffer = 5000; // 5 seconds
      if (this.currentTokens.expiresAt && Date.now() >= (this.currentTokens.expiresAt - expirationBuffer)) {
        // Token expired or about to expire, refresh it
        const refreshedToken = await this.refreshAccessToken();
        if (refreshedToken && this.currentTokens) {
          return { ...this.currentTokens, accessToken: refreshedToken };
        }
        return null;
      }

      return this.currentTokens;
    } catch (error) {
      logger.error('[HttpClient] Failed to get valid tokens', error);
      return null;
    }
  }

  /**
   * Refresh access token
   * SECURITY FIX: Proper mutex implementation with timeout and error propagation
   */
  private async refreshAccessToken(): Promise<string | null> {
    // If already refreshing, return the existing promise (proper mutex pattern)
    if (this.isRefreshing && this.tokenRefreshPromise) {
      return this.tokenRefreshPromise;
    }

    this.isRefreshing = true;

    // Create the refresh promise with timeout
    this.tokenRefreshPromise = this.executeTokenRefresh();

    try {
      const result = await this.tokenRefreshPromise;
      return result;
    } finally {
      this.isRefreshing = false;
      this.tokenRefreshPromise = null;
    }
  }

  /**
   * Execute the actual token refresh with timeout protection
   * SECURITY FIX: Separated refresh execution from mutex handling
   */
  private async executeTokenRefresh(): Promise<string | null> {
    // Create timeout promise
    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      setTimeout(() => {
        reject(new Error('Token refresh timed out'));
      }, this.REFRESH_TIMEOUT);
    });

    // Create refresh promise
    const refreshPromise = (async () => {
      try {
        const currentTokens = await tokenStorage.getTokens();
        if (!currentTokens?.refreshToken) {
          throw new Error('No refresh token available');
        }

        const response = await this.axiosInstance.post('/api/auth/refresh', {
          refreshToken: currentTokens.refreshToken,
        }, {
          skipAuth: true, // Don't try to add auth to refresh request
        } as any);

        const newTokens: AuthTokens = response.data.data;
        await tokenStorage.storeTokens(newTokens);
        this.currentTokens = newTokens;

        // Notify all subscribers with success
        this.refreshSubscribers.forEach(callback => callback({ token: newTokens.accessToken }));
        this.refreshSubscribers = [];

        return newTokens.accessToken;
      } catch (error) {
        // Clear tokens on refresh failure
        await this.clearTokens();

        // Notify all subscribers with error
        const refreshError = error instanceof Error ? error : new Error('Token refresh failed');
        this.refreshSubscribers.forEach(callback => callback({ token: null, error: refreshError }));
        this.refreshSubscribers = [];

        logger.error('[HttpClient] Token refresh failed', error);
        return null;
      }
    })();

    // Race between refresh and timeout
    try {
      return await Promise.race([refreshPromise, timeoutPromise]);
    } catch (error) {
      // Timeout occurred or refresh failed
      await this.clearTokens();
      this.refreshSubscribers.forEach(callback => callback({ token: null, error: error as Error }));
      this.refreshSubscribers = [];
      logger.error('[HttpClient] Token refresh error', error);
      return null;
    }
  }

  /**
   * Clear stored tokens
   */
  private async clearTokens(): Promise<void> {
    await tokenStorage.clearAll();
    this.currentTokens = null;
  }

  /**
   * Handle API errors and convert to user-friendly format
   */
  private handleApiError(error: AxiosError): NetworkError {
    const networkError: NetworkError = new Error() as NetworkError;

    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const data = error.response.data as any;

      networkError.status = status;

      switch (status) {
        case 400:
          networkError.code = API_ERROR_CODES.VALIDATION_ERROR;
          networkError.message = data?.message || 'Invalid request. Please check your input.';
          break;
        case 401:
          networkError.code = API_ERROR_CODES.AUTHENTICATION_ERROR;
          networkError.message = 'Authentication failed. Please log in again.';
          break;
        case 403:
          networkError.code = API_ERROR_CODES.AUTHENTICATION_ERROR;
          networkError.message = 'Access denied. You don\'t have permission to perform this action.';
          break;
        case 404:
          networkError.code = API_ERROR_CODES.NOT_FOUND;
          networkError.message = 'The requested resource was not found.';
          break;
        case 422:
          networkError.code = API_ERROR_CODES.VALIDATION_ERROR;
          networkError.message = data?.message || 'Validation failed. Please check your input.';
          networkError.details = data?.errors;
          break;
        case 429:
          networkError.code = API_ERROR_CODES.RATE_LIMIT;
          networkError.message = 'Too many requests. Please try again later.';
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          networkError.code = API_ERROR_CODES.SERVER_ERROR;
          networkError.message = 'Server error. Please try again later.';
          break;
        default:
          networkError.code = API_ERROR_CODES.UNKNOWN_ERROR;
          networkError.message = data?.message || `Server error: ${status}`;
      }

      networkError.details = data;
    } else if (error.request) {
      // Network error
      if (error.code === 'ECONNABORTED') {
        networkError.code = API_ERROR_CODES.TIMEOUT_ERROR;
        networkError.message = 'Request timed out. Please check your connection and try again.';
      } else {
        networkError.code = API_ERROR_CODES.NETWORK_ERROR;
        networkError.message = 'Network error. Please check your internet connection.';
      }
    } else {
      // Other error
      networkError.code = API_ERROR_CODES.UNKNOWN_ERROR;
      networkError.message = error.message || 'An unexpected error occurred.';
    }

    return networkError;
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Make HTTP request with retry logic
   */
  private async request<T = any>(
    config: RequestOptions,
    retryConfig: RetryConfig = { attempts: apiConfig.retryAttempts, delay: apiConfig.retryDelay },
  ): Promise<ApiResponse<T>> {
    const { skipRetry = false, showNetworkAlert = true, ...axiosConfig } = config;

    try {
      const response = await this.axiosInstance.request<ApiResponse<T>>(axiosConfig);
      return response.data;
    } catch (error) {
      const networkError = error as NetworkError;

      // Show network alert if enabled and it's a network error
      if (showNetworkAlert && networkError.code === API_ERROR_CODES.NETWORK_ERROR) {
        Alert.alert(
          'Network Error',
          'Please check your internet connection and try again.',
          [{ text: 'OK' }],
        );
      }

      // Retry logic
      if (!skipRetry && retryConfig.attempts > 0 && this.shouldRetry(networkError, retryConfig)) {
        logger.debug('[HttpClient] Retrying request', { attemptsLeft: retryConfig.attempts - 1 });

        // Wait before retry
        await new Promise<void>(resolve => setTimeout(resolve, retryConfig.delay));

        // Retry with reduced attempts
        return this.request<T>(config, {
          ...retryConfig,
          attempts: retryConfig.attempts - 1,
          delay: retryConfig.delay * 2, // Exponential backoff
        });
      }

      throw networkError;
    }
  }

  /**
   * Determine if request should be retried
   */
  private shouldRetry(error: NetworkError, retryConfig: RetryConfig): boolean {
    if (retryConfig.retryCondition) {
      return retryConfig.retryCondition(error as any);
    }

    // Retry on network errors and server errors
    const retryableCodes = [
      API_ERROR_CODES.NETWORK_ERROR,
      API_ERROR_CODES.TIMEOUT_ERROR,
      API_ERROR_CODES.SERVER_ERROR,
    ] as const;
    return retryableCodes.includes(error.code as typeof retryableCodes[number]);
  }

  /**
   * HTTP GET request
   */
  async get<T = any>(url: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    return this.request<T>({ ...options, method: 'GET', url });
  }

  /**
   * HTTP POST request
   */
  async post<T = any>(url: string, data?: any, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    return this.request<T>({ ...options, method: 'POST', url, data });
  }

  /**
   * HTTP PUT request
   */
  async put<T = any>(url: string, data?: any, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    return this.request<T>({ ...options, method: 'PUT', url, data });
  }

  /**
   * HTTP PATCH request
   */
  async patch<T = any>(url: string, data?: any, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    return this.request<T>({ ...options, method: 'PATCH', url, data });
  }

  /**
   * HTTP DELETE request
   */
  async delete<T = any>(url: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    return this.request<T>({ ...options, method: 'DELETE', url });
  }

  /**
   * Upload file with progress tracking
   */
  async upload<T = any>(
    url: string,
    formData: FormData,
    onProgress?: (progress: number) => void,
    options: RequestOptions = {},
  ): Promise<ApiResponse<T>> {
    return this.request<T>({
      ...options,
      method: 'POST',
      url,
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...options.headers,
      },
      onUploadProgress: onProgress ? (progressEvent) => {
        const progress = progressEvent.total
          ? (progressEvent.loaded / progressEvent.total) * 100
          : 0;
        onProgress(Math.round(progress));
      } : undefined,
    });
  }

  /**
   * Download file with progress tracking
   */
  async download(
    url: string,
    onProgress?: (progress: number) => void,
    options: RequestOptions = {},
  ): Promise<any> {
    return this.request({
      ...options,
      method: 'GET',
      url,
      responseType: 'blob',
      onDownloadProgress: onProgress ? (progressEvent) => {
        const progress = progressEvent.total
          ? (progressEvent.loaded / progressEvent.total) * 100
          : 0;
        onProgress(Math.round(progress));
      } : undefined,
    });
  }

  /**
   * Set authentication tokens
   */
  async setTokens(tokens: AuthTokens): Promise<void> {
    this.currentTokens = tokens;
    await tokenStorage.storeTokens(tokens);
  }

  /**
   * Clear authentication tokens
   */
  async clearAuthTokens(): Promise<void> {
    await this.clearTokens();
  }

  /**
   * Get current authentication tokens
   */
  getCurrentTokens(): AuthTokens | null {
    return this.currentTokens;
  }
}

// Export singleton instance
export const httpClient = HttpClient.getInstance();
