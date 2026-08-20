/* eslint-disable @typescript-eslint/no-explicit-any */
import { logger } from './logger';

interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
  correlationId?: string;
}

interface RequestConfig {
  method?: string;
  headers?: Record<string, string>;
  body?: string | FormData | URLSearchParams;
  correlationId?: string;
}

class ApiLogger {
  private generateCorrelationId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getCorrelationIdFromResponse(response: Response): string | undefined {
    return response.headers.get('X-Correlation-ID') || undefined;
  }

  public async fetchWithLogging<T = unknown>(url: string, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    const startTime = performance.now();
    const correlationId = config.correlationId || this.generateCorrelationId();
    const method = config.method || 'GET';

    // Set correlation ID header for backend tracking
    const headers = {
      'Content-Type': 'application/json',
      'X-Correlation-ID': correlationId,
      ...config.headers,
    };

    // Log request start
    logger.debug(`API Request: ${method} ${url}`, {
      correlationId,
      headers: this.sanitizeHeaders(headers),
      body: config.body ? this.sanitizeRequestBody(config.body) : undefined,
    });

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: config.body,
        ...config,
      });

      const endTime = performance.now();
      const responseTime = endTime - startTime;
      const responseCorrelationId = this.getCorrelationIdFromResponse(response);

      // Parse response data
      let data: T;
      const contentType = response.headers.get('content-type');

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = (await response.text()) as unknown as T;
      }

      const apiResponse: ApiResponse<T> = {
        data,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        correlationId: responseCorrelationId,
      };

      // Log successful response
      if (response.ok) {
        logger.info(`API Success: ${method} ${url}`, {
          correlationId: responseCorrelationId || correlationId,
          status: response.status,
          responseTime: Math.round(responseTime),
          responseSize: this.getResponseSize(response),
        });
      } else {
        logger.warn(`API Error: ${method} ${url}`, {
          correlationId: responseCorrelationId || correlationId,
          status: response.status,
          statusText: response.statusText,
          responseTime: Math.round(responseTime),
          errorData: this.sanitizeResponseData(data),
        });
      }

      // Log to Application Insights
      logger.logApiCall(url, method, response.status, Math.round(responseTime), response.ok);

      // Set correlation ID for subsequent requests
      if (responseCorrelationId) {
        logger.setCorrelationId(responseCorrelationId);
      }

      return apiResponse;
    } catch (error) {
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      logger.error(`API Network Error: ${method} ${url}`, {
        correlationId,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Math.round(responseTime),
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Log failed API call
      logger.logApiCall(url, method, 0, Math.round(responseTime), false);

      throw error;
    }
  }

  private sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
    const sanitized = { ...headers };

    for (const key of Object.keys(sanitized)) {
      if (sensitiveHeaders.includes(key.toLowerCase())) {
        sanitized[key] = '***REDACTED***';
      }
    }

    return sanitized;
  }

  private sanitizeRequestBody(body: any): any {
    // If body is a JSON string, parse it first
    let parsedBody = body;
    if (typeof body === 'string') {
      try {
        parsedBody = JSON.parse(body);
      } catch {
        // Not JSON, return as-is
        return body;
      }
    }

    // If not an object after parsing, return as-is
    if (typeof parsedBody !== 'object' || parsedBody === null) {
      return parsedBody;
    }

    const sensitiveFields = ['password', 'token', 'secret', 'key', 'cardnumber', 'cvv', 'pin'];
    const sanitized = { ...parsedBody } as Record<string, any>;

    for (const key of Object.keys(sanitized)) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        sanitized[key] = '***REDACTED***';
      }
    }

    return sanitized;
  }

  private sanitizeResponseData(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    // Only include error-related fields from response data
    const typedData = data as Record<string, any>;
    if (typedData.message || typedData.error || typedData.correlationId) {
      return {
        message: typedData.message,
        error: typedData.error,
        correlationId: typedData.correlationId,
        timestamp: typedData.timestamp,
        path: typedData.path,
      };
    }

    return 'Response data not logged for privacy';
  }

  private getResponseSize(response: Response): number | undefined {
    const contentLength = response.headers.get('content-length');
    return contentLength ? parseInt(contentLength, 10) : undefined;
  }

  // Convenience methods for common HTTP methods
  public async get<T = unknown>(url: string, config: Omit<RequestConfig, 'method'> = {}): Promise<ApiResponse<T>> {
    return this.fetchWithLogging<T>(url, { ...config, method: 'GET' });
  }

  public async post<T = unknown>(
    url: string,
    body?: string | FormData | URLSearchParams,
    config: Omit<RequestConfig, 'method' | 'body'> = {}
  ): Promise<ApiResponse<T>> {
    return this.fetchWithLogging<T>(url, { ...config, method: 'POST', body });
  }

  public async put<T = unknown>(
    url: string,
    body?: string | FormData | URLSearchParams,
    config: Omit<RequestConfig, 'method' | 'body'> = {}
  ): Promise<ApiResponse<T>> {
    return this.fetchWithLogging<T>(url, { ...config, method: 'PUT', body });
  }

  public async patch<T = unknown>(
    url: string,
    body?: string | FormData | URLSearchParams,
    config: Omit<RequestConfig, 'method' | 'body'> = {}
  ): Promise<ApiResponse<T>> {
    return this.fetchWithLogging<T>(url, { ...config, method: 'PATCH', body });
  }

  public async delete<T = unknown>(url: string, config: Omit<RequestConfig, 'method'> = {}): Promise<ApiResponse<T>> {
    return this.fetchWithLogging<T>(url, { ...config, method: 'DELETE' });
  }
}

// Create singleton instance
export const apiLogger = new ApiLogger();

// Enhanced API client with automatic logging
export const api = {
  get: apiLogger.get.bind(apiLogger),
  post: apiLogger.post.bind(apiLogger),
  put: apiLogger.put.bind(apiLogger),
  patch: apiLogger.patch.bind(apiLogger),
  delete: apiLogger.delete.bind(apiLogger),
  fetch: apiLogger.fetchWithLogging.bind(apiLogger),
};

// Hook for React components
export const useApi = () => {
  return api;
};

// Utility to create API client with base URL
export const createApiClient = (baseUrl: string) => {
  const client = {
    get: <T = unknown>(endpoint: string, config?: Omit<RequestConfig, 'method'>) =>
      apiLogger.get<T>(`${baseUrl}${endpoint}`, config),
    post: <T = unknown>(
      endpoint: string,
      body?: string | FormData | URLSearchParams,
      config?: Omit<RequestConfig, 'method' | 'body'>
    ) => apiLogger.post<T>(`${baseUrl}${endpoint}`, body, config),
    put: <T = unknown>(
      endpoint: string,
      body?: string | FormData | URLSearchParams,
      config?: Omit<RequestConfig, 'method' | 'body'>
    ) => apiLogger.put<T>(`${baseUrl}${endpoint}`, body, config),
    patch: <T = unknown>(
      endpoint: string,
      body?: string | FormData | URLSearchParams,
      config?: Omit<RequestConfig, 'method' | 'body'>
    ) => apiLogger.patch<T>(`${baseUrl}${endpoint}`, body, config),
    delete: <T = unknown>(endpoint: string, config?: Omit<RequestConfig, 'method'>) =>
      apiLogger.delete<T>(`${baseUrl}${endpoint}`, config),
  };

  return client;
};
