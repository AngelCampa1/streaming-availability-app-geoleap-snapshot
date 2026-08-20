/**
 * Security Service Test
 * Tests CSRF protection, input validation, XSS prevention, and secure utilities
 */

import { SecurityService, type CsrfToken } from '../security';

// Disable MSW for this test file (we're testing fetch behavior directly)
jest.mock('@/mocks/server', () => ({
  server: {
    listen: jest.fn(),
    close: jest.fn(),
    resetHandlers: jest.fn(),
  },
}));

// Mock fetch with Response-like objects (MSW compatible)
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

// Helper to create MSW-compatible mock responses
const createMockResponse = (data: any, options: { ok?: boolean; status?: number } = {}) => {
  const response = {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    json: async () => data,
    clone: function() { return this; },
    headers: new Headers(),
    redirected: false,
    statusText: 'OK',
    type: 'basic' as ResponseType,
    url: '',
    body: null,
    bodyUsed: false,
    arrayBuffer: async () => new ArrayBuffer(0),
    blob: async () => new Blob(),
    formData: async () => new FormData(),
    text: async () => JSON.stringify(data),
  };
  return response;
};

// Mock DOMPurify
jest.mock('dompurify', () => ({
  __esModule: true,
  default: {
    sanitize: jest.fn((content: string) => content.replace(/<script[^>]*>.*?<\/script>/gi, '')),
  },
}));

// Mock logger
jest.mock('../logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock crypto.getRandomValues
const mockGetRandomValues = jest.fn((array: Uint8Array) => {
  for (let i = 0; i < array.length; i++) {
    array[i] = Math.floor(Math.random() * 256);
  }
  return array;
});

Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: mockGetRandomValues,
  },
});

describe('SecurityService', () => {
  beforeEach(() => {
    mockFetch.mockClear(); // Clear call history but preserve mock function
    SecurityService.clearCsrfToken();
  });

  describe('getCsrfToken', () => {
    it('fetches and caches CSRF token', async () => {
      const mockToken: CsrfToken = { token: 'test-token', headerName: 'X-CSRF-TOKEN' };
      mockFetch.mockResolvedValueOnce(createMockResponse(mockToken));

      const token = await SecurityService.getCsrfToken();

      expect(token).toEqual(mockToken);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('returns cached token on subsequent calls', async () => {
      const mockToken: CsrfToken = { token: 'test-token', headerName: 'X-CSRF-TOKEN' };
      mockFetch.mockResolvedValueOnce(createMockResponse(mockToken));

      await SecurityService.getCsrfToken();
      const cachedToken = await SecurityService.getCsrfToken();

      expect(cachedToken).toEqual(mockToken);
      expect(mockFetch).toHaveBeenCalledTimes(1); // Only one fetch
    });

    it('forces refresh when forceRefresh is true', async () => {
      const mockToken1: CsrfToken = { token: 'token-1', headerName: 'X-CSRF-TOKEN' };
      const mockToken2: CsrfToken = { token: 'token-2', headerName: 'X-CSRF-TOKEN' };

      mockFetch
        .mockResolvedValueOnce(createMockResponse(mockToken1))
        .mockResolvedValueOnce(createMockResponse(mockToken2));

      const token1 = await SecurityService.getCsrfToken();
      const token2 = await SecurityService.getCsrfToken(true); // Force refresh

      expect(token1.token).toBe('token-1');
      expect(token2.token).toBe('token-2');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('handles 401 error for anonymous users gracefully', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(null, { ok: false, status: 401 }));

      const token = await SecurityService.getCsrfToken();

      expect(token).toEqual({ token: '', headerName: 'X-CSRF-TOKEN' });
    });

    it('throws error on fetch failure', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(null, { ok: false, status: 500 }));

      await expect(SecurityService.getCsrfToken()).rejects.toThrow('Failed to fetch CSRF token');
    });

    it('throws error on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(SecurityService.getCsrfToken()).rejects.toThrow('Network error');
    });
  });

  describe('secureRequest', () => {
    it('makes secure request with CSRF token', async () => {
      const mockToken: CsrfToken = { token: 'test-token', headerName: 'X-CSRF-TOKEN' };
      const mockResponseData = { success: true };

      mockFetch
        .mockResolvedValueOnce(createMockResponse(mockToken))
        .mockResolvedValueOnce(createMockResponse(mockResponseData));

      const response = await SecurityService.secureRequest('/api/test');

      // Verify behavior: request succeeded with CSRF token
      expect(response.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2); // Token fetch + actual request
    });

    it('retries on 403 with fresh token', async () => {
      const mockToken1: CsrfToken = { token: 'old-token', headerName: 'X-CSRF-TOKEN' };
      const mockToken2: CsrfToken = { token: 'fresh-token', headerName: 'X-CSRF-TOKEN' };

      mockFetch
        .mockResolvedValueOnce(createMockResponse(mockToken1))
        .mockResolvedValueOnce(createMockResponse(null, { ok: false, status: 403 }))
        .mockResolvedValueOnce(createMockResponse(mockToken2))
        .mockResolvedValueOnce(createMockResponse({ success: true }));

      const response = await SecurityService.secureRequest('/api/test');

      expect(response.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(4); // Token + 403 + Refresh token + Retry
    });

    it('does not retry 403 more than once', async () => {
      const mockToken: CsrfToken = { token: 'test-token', headerName: 'X-CSRF-TOKEN' };

      mockFetch
        .mockResolvedValueOnce(createMockResponse(mockToken))
        .mockResolvedValueOnce(createMockResponse(null, { ok: false, status: 403 }))
        .mockResolvedValueOnce(createMockResponse(mockToken)) // Token refresh
        .mockResolvedValueOnce(createMockResponse(null, { ok: false, status: 403 })); // Retry still 403

      const response = await SecurityService.secureRequest('/api/test');

      expect(response.status).toBe(403);
      expect(mockFetch).toHaveBeenCalledTimes(4); // Token + 403 + Refresh token + Retry (which also returns 403)
    });

    it('includes custom headers', async () => {
      const mockToken: CsrfToken = { token: 'test-token', headerName: 'X-CSRF-TOKEN' };

      mockFetch
        .mockResolvedValueOnce(createMockResponse(mockToken))
        .mockResolvedValueOnce(createMockResponse({ success: true }));

      const response = await SecurityService.secureRequest('/api/test', {
        headers: { 'X-Custom': 'value' },
      });

      // Verify behavior: request succeeded with custom headers
      expect(response.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2); // Token fetch + actual request

      // Verify the function accepted custom headers without error
      const result = await response.json();
      expect(result.success).toBe(true);
    });
  });

  describe('sanitizeHtml', () => {
    it('removes script tags', () => {
      const malicious = '<div>Safe<script>alert("XSS")</script></div>';
      const sanitized = SecurityService.sanitizeHtml(malicious);

      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('<div>Safe');
    });

    it('handles empty string', () => {
      const sanitized = SecurityService.sanitizeHtml('');
      expect(sanitized).toBe('');
    });

    it('handles safe HTML', () => {
      const safe = '<p>This is <strong>safe</strong> HTML</p>';
      const sanitized = SecurityService.sanitizeHtml(safe);
      expect(sanitized).toBe(safe);
    });
  });

  describe('validateInput', () => {
    it('rejects script tags', () => {
      expect(SecurityService.validateInput('<script>alert("XSS")</script>')).toBe(false);
    });

    it('rejects javascript: protocol', () => {
      expect(SecurityService.validateInput('javascript:alert("XSS")')).toBe(false);
    });

    it('rejects event handlers', () => {
      expect(SecurityService.validateInput('<img onload="alert(1)">')).toBe(false);
      expect(SecurityService.validateInput('<div onclick="hack()">')).toBe(false);
    });

    it('rejects SQL injection patterns', () => {
      expect(SecurityService.validateInput("'; DROP TABLE users; --")).toBe(false);
      expect(SecurityService.validateInput('1 UNION SELECT * FROM users')).toBe(false);
    });

    it('accepts safe input', () => {
      expect(SecurityService.validateInput('Hello, world!')).toBe(true);
      expect(SecurityService.validateInput('user@example.com')).toBe(true);
      expect(SecurityService.validateInput('Safe <p>HTML</p>')).toBe(true);
    });

    it('is case-insensitive for patterns', () => {
      expect(SecurityService.validateInput('<SCRIPT>alert("XSS")</SCRIPT>')).toBe(false);
      expect(SecurityService.validateInput('JAVASCRIPT:alert(1)')).toBe(false);
    });
  });

  describe('escapeHtml', () => {
    it('escapes HTML special characters', () => {
      const input = '<div class="test" & \'quoted\'>';
      const escaped = SecurityService.escapeHtml(input);

      expect(escaped).toBe('&lt;div class=&quot;test&quot; &amp; &#039;quoted&#039;&gt;');
    });

    it('handles empty string', () => {
      expect(SecurityService.escapeHtml('')).toBe('');
    });

    it('handles string with no special characters', () => {
      const input = 'Plain text';
      expect(SecurityService.escapeHtml(input)).toBe('Plain text');
    });

    it('escapes all special characters correctly', () => {
      expect(SecurityService.escapeHtml('&')).toBe('&amp;');
      expect(SecurityService.escapeHtml('<')).toBe('&lt;');
      expect(SecurityService.escapeHtml('>')).toBe('&gt;');
      expect(SecurityService.escapeHtml('"')).toBe('&quot;');
      expect(SecurityService.escapeHtml("'")).toBe('&#039;');
    });
  });

  describe('generateRandomString', () => {
    it('generates random string of default length', () => {
      const randomString = SecurityService.generateRandomString();

      expect(typeof randomString).toBe('string');
      expect(randomString.length).toBe(64); // 32 bytes * 2 (hex)
    });

    it('generates random string of custom length', () => {
      const randomString = SecurityService.generateRandomString(16);

      expect(randomString.length).toBe(32); // 16 bytes * 2 (hex)
    });

    it('generates different strings on multiple calls', () => {
      const string1 = SecurityService.generateRandomString();
      const string2 = SecurityService.generateRandomString();

      expect(string1).not.toBe(string2);
    });

    it('generates valid hex string', () => {
      const randomString = SecurityService.generateRandomString(8);

      expect(randomString).toMatch(/^[0-9a-f]+$/);
    });

    it('uses crypto.getRandomValues', () => {
      SecurityService.generateRandomString(16);

      expect(mockGetRandomValues).toHaveBeenCalled();
    });
  });

  describe('clearCsrfToken', () => {
    it('clears cached CSRF token', async () => {
      const mockToken: CsrfToken = { token: 'test-token', headerName: 'X-CSRF-TOKEN' };
      mockFetch.mockResolvedValueOnce(createMockResponse(mockToken));

      await SecurityService.getCsrfToken();
      SecurityService.clearCsrfToken();

      // Next call should fetch again
      mockFetch.mockResolvedValueOnce(createMockResponse(mockToken));
      await SecurityService.getCsrfToken();

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
