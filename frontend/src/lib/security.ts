import DOMPurify from 'dompurify';
import { API_BASE_URL } from '@/config/api';
import { logger } from './logger';

export interface CsrfToken {
  token: string;
  headerName: string;
}

export class SecurityService {
  private static csrfToken: CsrfToken | null = null;

  /**
   * Fetch CSRF token from the backend
   * Uses API_BASE_URL from config which respects proxy settings in production
   * In production with proxy enabled: empty URL = same-origin request through Next.js proxy
   * In development: direct request to backend
   * @param forceRefresh - Force a new token fetch even if cached (for 403 recovery)
   */
  static async getCsrfToken(forceRefresh = false): Promise<CsrfToken> {
    // BUG FIX: Allow forced refresh to recover from stale/invalid tokens
    if (this.csrfToken && !forceRefresh) {
      return this.csrfToken;
    }

    try {
      // Use centralized API_BASE_URL which handles proxy routing in production
      // In production: empty string = same-origin request through Next.js rewrites
      // In development: http://localhost:8020
      const backendUrl = `${API_BASE_URL}/api/security/csrf-token`;
      const response = await fetch(backendUrl, {
        credentials: 'include',
      });

      // E2E Bug Fix: Graceful CSRF handling for anonymous users
      if (!response.ok) {
        if (response.status === 401) {
          logger.info('[Security] CSRF token not available for unauthenticated user, using anonymous token');
          this.csrfToken = { token: '', headerName: 'X-CSRF-TOKEN' };
          return this.csrfToken;
        }
        throw new Error('Failed to fetch CSRF token');
      }

      this.csrfToken = (await response.json()) as CsrfToken;
      return this.csrfToken;
    } catch (error) {
      console.error('Error fetching CSRF token:', error);
      throw error;
    }
  }

  /**
   * Make a secure API request with CSRF protection
   * BUG FIX: Automatically retry on 403 with fresh CSRF token
   */
  static async secureRequest(url: string, options: RequestInit = {}, retried = false): Promise<Response> {
    const csrfToken = await this.getCsrfToken();

    const headers = new Headers(options.headers);
    headers.set(csrfToken.headerName, csrfToken.token);
    headers.set('Content-Type', 'application/json');

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });

    // BUG FIX: On 403 Forbidden, clear cached token and retry once with fresh token
    if (response.status === 403 && !retried) {
      console.warn('CSRF token rejected (403), refreshing and retrying...');
      this.clearCsrfToken();
      return this.secureRequest(url, options, true);
    }

    return response;
  }

  /**
   * Sanitize HTML content to prevent XSS
   */
  static sanitizeHtml(content: string): string {
    return DOMPurify.sanitize(content);
  }

  /**
   * Validate input to prevent common attacks
   */
  static validateInput(input: string): boolean {
    // Basic validation patterns
    const maliciousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /(union|select|insert|delete|drop|create|alter|exec|execute)\s/gi,
    ];

    return !maliciousPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Escape HTML characters to prevent XSS
   */
  static escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };

    return text.replace(/[&<>"']/g, char => map[char]);
  }

  /**
   * Generate a secure random string
   */
  static generateRandomString(length: number = 32): string {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Clear stored CSRF token (for logout)
   */
  static clearCsrfToken(): void {
    this.csrfToken = null;
  }
}
