/**
 * Comprehensive tests for useUserCountry.ts
 *
 * Coverage Target: 85%+
 * Strategy: Test country detection, caching, API calls, error handling, fallback behavior
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { http, HttpResponse, delay } from 'msw';
import { server } from '@/mocks/server';
import { useUserCountry } from '../useUserCountry';

// Mock localStorage for Jest environment
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
});

const STORAGE_KEY = 'user_country_data';
const API_URL = 'https://ipapi.co/json/';

// Uses the shared global MSW server (src/mocks/server), which provides a default
// success handler for https://ipapi.co/json/ returning US. The global jest.setup.js
// owns listen()/resetHandlers()/close(); per-test server.use() overrides below take
// precedence and are reset after each test. We only clear localStorage here.
afterEach(() => {
  localStorage.clear();
});

describe('useUserCountry - Initialization', () => {
  it('should initialize with default US country and loading state', async () => {
    // Set up a handler that delays indefinitely
    server.use(
      http.get(API_URL, async () => {
        await delay('infinite');
        return HttpResponse.json({});
      })
    );

    const { result } = renderHook(() => useUserCountry());

    expect(result.current.country.countryCode).toBe('us');
    expect(result.current.country.countryName).toBe('United States');
    expect(result.current.country.isDetected).toBe(false);
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
  });
});

describe('useUserCountry - Cache Handling', () => {
  it('should load valid cached country data', async () => {
    const cachedData = {
      countryCode: 'gb',
      countryName: 'United Kingdom',
      isDetected: true,
      timestamp: Date.now(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedData));

    const { result } = renderHook(() => useUserCountry());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.country.countryCode).toBe('gb');
    expect(result.current.country.countryName).toBe('United Kingdom');
    expect(result.current.country.isDetected).toBe(true);
  });

  it('should ignore expired cached data and fetch fresh data', async () => {
    const expiredData = {
      countryCode: 'gb',
      countryName: 'United Kingdom',
      isDetected: true,
      timestamp: Date.now() - (25 * 60 * 60 * 1000), // 25 hours ago (expired)
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(expiredData));

    server.use(
      http.get(API_URL, () => {
        return HttpResponse.json({
          country_code: 'CA',
          country_name: 'Canada',
        });
      })
    );

    const { result } = renderHook(() => useUserCountry());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.country.countryCode).toBe('ca');
    expect(result.current.country.countryName).toBe('Canada');
  });

  it('should handle malformed cached JSON gracefully', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    localStorage.setItem(STORAGE_KEY, 'invalid-json');

    const { result } = renderHook(() => useUserCountry());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // BUG-180 FIX: When JSON parsing fails, hook should remove corrupted cache and fetch from API
    // The API fetch will succeed (mocked to return US data) and return fresh country data
    expect(result.current.country.countryCode).toBe('us');
    expect(result.current.country.countryName).toBe('United States');
    expect(result.current.country.isDetected).toBe(true); // From successful API fetch
    expect(result.current.error).toBeNull(); // No error - API succeeded
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Corrupted country cache'),
      expect.anything()
    );

    consoleWarnSpy.mockRestore();
  });
});

describe('useUserCountry - API Success', () => {
  it('should detect country successfully from API', async () => {
    server.use(
      http.get(API_URL, () => {
        return HttpResponse.json({
          country_code: 'DE',
          country_name: 'Germany',
        });
      })
    );

    const { result } = renderHook(() => useUserCountry());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.country.countryCode).toBe('de');
    expect(result.current.country.countryName).toBe('Germany');
    expect(result.current.country.isDetected).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('should cache API result in localStorage', async () => {
    server.use(
      http.get(API_URL, () => {
        return HttpResponse.json({
          country_code: 'JP',
          country_name: 'Japan',
        });
      })
    );

    renderHook(() => useUserCountry());

    await waitFor(() => {
      const cached = localStorage.getItem(STORAGE_KEY);
      expect(cached).toBeTruthy();
    });

    const cachedData = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(cachedData.countryCode).toBe('jp');
    expect(cachedData.countryName).toBe('Japan');
    expect(cachedData.isDetected).toBe(true);
    expect(cachedData.timestamp).toBeDefined();
  });

  it('should handle lowercase country codes', async () => {
    server.use(
      http.get(API_URL, () => {
        return HttpResponse.json({
          country_code: 'AU', // Uppercase
          country_name: 'Australia',
        });
      })
    );

    const { result } = renderHook(() => useUserCountry());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.country.countryCode).toBe('au'); // Lowercase
  });

  it('should use default values if API returns missing data', async () => {
    server.use(
      http.get(API_URL, () => {
        return HttpResponse.json({}); // Empty response
      })
    );

    const { result } = renderHook(() => useUserCountry());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.country.countryCode).toBe('us');
    expect(result.current.country.countryName).toBe('United States');
  });
});

describe('useUserCountry - API Errors', () => {
  it('should use fallback US country on network error', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    server.use(
      http.get(API_URL, () => {
        return HttpResponse.error();
      })
    );

    const { result } = renderHook(() => useUserCountry());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.country.countryCode).toBe('us');
    expect(result.current.country.countryName).toBe('United States');
    expect(result.current.country.isDetected).toBe(false);
    expect(result.current.error).toBeInstanceOf(Error);
    expect(consoleWarnSpy).toHaveBeenCalled();

    consoleWarnSpy.mockRestore();
  });

  it('should use fallback on API non-ok response', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    server.use(
      http.get(API_URL, () => {
        return new HttpResponse(null, { status: 500 });
      })
    );

    const { result } = renderHook(() => useUserCountry());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.country.countryCode).toBe('us');
    expect(result.current.country.isDetected).toBe(false);

    consoleWarnSpy.mockRestore();
  });

  it('should cache fallback result on error', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    server.use(
      http.get(API_URL, () => {
        return HttpResponse.error();
      })
    );

    renderHook(() => useUserCountry());

    await waitFor(() => {
      const cached = localStorage.getItem(STORAGE_KEY);
      expect(cached).toBeTruthy();
    });

    const cachedData = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(cachedData.countryCode).toBe('us');
    expect(cachedData.isDetected).toBe(false);

    consoleWarnSpy.mockRestore();
  });

  it('should handle timeout gracefully', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    // Simulate timeout by delaying beyond 5 seconds
    server.use(
      http.get(API_URL, async () => {
        await delay(10000); // 10 seconds
        return HttpResponse.json({ country_code: 'US' });
      })
    );

    const { result } = renderHook(() => useUserCountry());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    }, { timeout: 7000 });

    expect(result.current.country.countryCode).toBe('us');
    expect(result.current.error).toBeTruthy();

    consoleWarnSpy.mockRestore();
  });
});

describe('useUserCountry - Cache Management', () => {
  it('should clear cache when clearCache is called', async () => {
    const cachedData = {
      countryCode: 'gb',
      countryName: 'United Kingdom',
      isDetected: true,
      timestamp: Date.now(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedData));

    const { result } = renderHook(() => useUserCountry());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.clearCache();
    });

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('should not throw when clearing non-existent cache', () => {
    const { result } = renderHook(() => useUserCountry());

    expect(() => {
      act(() => {
        result.current.clearCache();
      });
    }).not.toThrow();
  });
});
