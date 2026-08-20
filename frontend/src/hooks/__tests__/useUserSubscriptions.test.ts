/**
 * Comprehensive tests for useUserSubscriptions.ts
 *
 * Coverage Target: 85%+
 * Strategy: Test localStorage + API dual storage, auth flows, error handling, fallbacks
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { useUserSubscriptions, SubscriptionItem, resetSubscriptionCache } from '../useUserSubscriptions';
import { useAuth } from '@/contexts/AuthContext';
import { API_BASE_URL } from '@/config/api';
import { User, AuthContext } from '@/lib/auth';

// Mock AuthContext
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Helper to create complete AuthContext mock
const createMockAuthContext = (overrides: Partial<AuthContext> = {}): AuthContext => ({
  user: null,
  permissions: [],
  roles: [],
  login: jest.fn(),
  logout: jest.fn(),
  register: jest.fn(),
  logoutAllSessions: jest.fn(),
  hasPermission: jest.fn(() => false),
  hasAnyPermission: jest.fn(() => false),
  hasRole: jest.fn(() => false),
  isAuthenticated: false,
  isLoading: false,
  sessionExpiring: false,
  extendSession: jest.fn(),
  checkAuthStatus: jest.fn(),
  ...overrides,
});

// Helper to create complete User mock
const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user123',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  isActive: true,
  emailConfirmed: true,
  roles: [],
  permissions: [],
  createdAt: new Date().toISOString(),
  ...overrides,
});

// Mock data
const mockSubscriptions: SubscriptionItem[] = [
  { serviceId: 'netflix', serviceName: 'Netflix', isActive: true },
  { serviceId: 'disney-plus', serviceName: 'Disney+', isActive: true },
];

const mockApiResponse = [
  { serviceId: 'netflix', serviceName: 'Netflix', isActive: true },
  { serviceId: 'hulu', serviceName: 'Hulu', isActive: true },
];

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock fetch
const mockFetch = jest.fn();
const originalFetch = global.fetch;

beforeAll(() => {
  global.fetch = mockFetch as any;
});

afterAll(() => {
  global.fetch = originalFetch;
});

beforeEach(() => {
  jest.clearAllMocks();
  localStorageMock.clear();
  mockFetch.mockReset();
  // Reset module-level cache to ensure test isolation
  resetSubscriptionCache();
});

describe('useUserSubscriptions - Anonymous User (localStorage)', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue(createMockAuthContext({
      isAuthenticated: false,
      user: null,
    }));
  });

  it('should load subscriptions from localStorage for anonymous users', async () => {
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(mockSubscriptions));

    const { result } = renderHook(() => useUserSubscriptions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.subscriptions).toEqual(mockSubscriptions);
    expect(result.current.error).toBeNull();
    expect(localStorageMock.getItem).toHaveBeenCalledWith('geoleap_subscriptions');
  });

  it('should return empty array when localStorage has no data', async () => {
    localStorageMock.getItem.mockReturnValueOnce(null);

    const { result } = renderHook(() => useUserSubscriptions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.subscriptions).toEqual([]);
  });

  it('should handle malformed localStorage data gracefully', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    localStorageMock.getItem.mockReturnValueOnce('invalid json');

    const { result } = renderHook(() => useUserSubscriptions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.subscriptions).toEqual([]);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Failed to load local subscriptions:',
      expect.any(Error)
    );

    consoleWarnSpy.mockRestore();
  });

  it('should handle non-array localStorage data', async () => {
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify({ not: 'an array' }));

    const { result } = renderHook(() => useUserSubscriptions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.subscriptions).toEqual([]);
  });

  it('should save subscriptions to localStorage when toggling', async () => {
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify([]));

    const { result } = renderHook(() => useUserSubscriptions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.toggleSubscription('netflix', 'Netflix');
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'geoleap_subscriptions',
      JSON.stringify([{ serviceId: 'netflix', serviceName: 'Netflix', isActive: true }])
    );

    expect(result.current.subscriptions).toEqual([
      { serviceId: 'netflix', serviceName: 'Netflix', isActive: true },
    ]);
  });

  it('should remove subscription from localStorage when toggling off', async () => {
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(mockSubscriptions));

    const { result } = renderHook(() => useUserSubscriptions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.toggleSubscription('netflix', 'Netflix');
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'geoleap_subscriptions',
      JSON.stringify([{ serviceId: 'disney-plus', serviceName: 'Disney+', isActive: true }])
    );

    expect(result.current.subscriptions).toEqual([
      { serviceId: 'disney-plus', serviceName: 'Disney+', isActive: true },
    ]);
  });

  it('should set multiple subscriptions and save to localStorage', async () => {
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify([]));

    const { result } = renderHook(() => useUserSubscriptions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.setMultipleSubscriptions(['netflix', 'hulu']);
    });

    expect(localStorageMock.setItem).toHaveBeenCalled();
    expect(result.current.subscriptions.length).toBe(2);
  });

  it('should handle localStorage.setItem errors gracefully', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify([]));
    localStorageMock.setItem.mockImplementationOnce(() => {
      throw new Error('Storage quota exceeded');
    });

    const { result } = renderHook(() => useUserSubscriptions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.toggleSubscription('netflix', 'Netflix');
    });

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Failed to save local subscriptions:',
      expect.any(Error)
    );

    consoleWarnSpy.mockRestore();
  });
});

describe('useUserSubscriptions - Authenticated User (API)', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue(createMockAuthContext({
      isAuthenticated: true,
      user: createMockUser(),
    }));
  });

  it('should load subscriptions from API for authenticated users', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse,
    } as Response);

    const { result } = renderHook(() => useUserSubscriptions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockFetch).toHaveBeenCalledWith(`${API_BASE_URL}/api/usersubscriptions`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Mode': 'cookie',
      },
    });

    expect(result.current.subscriptions).toEqual([
      { serviceId: 'netflix', serviceName: 'Netflix', isActive: true },
      { serviceId: 'hulu', serviceName: 'Hulu', isActive: true },
    ]);
  });

  it('should add subscription via API when toggling', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

    const { result } = renderHook(() => useUserSubscriptions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.toggleSubscription('netflix', 'Netflix');
    });

    expect(mockFetch).toHaveBeenCalledWith(`${API_BASE_URL}/api/usersubscriptions`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Mode': 'cookie',
      },
      body: JSON.stringify({ serviceId: 'netflix', serviceName: 'Netflix' }),
    });

    expect(result.current.subscriptions).toEqual([
      { serviceId: 'netflix', serviceName: 'Netflix', isActive: true },
    ]);
  });

  it('should remove subscription via API when toggling off', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

    const { result } = renderHook(() => useUserSubscriptions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.toggleSubscription('netflix', 'Netflix');
    });

    expect(mockFetch).toHaveBeenCalledWith(`${API_BASE_URL}/api/usersubscriptions/netflix`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'X-Auth-Mode': 'cookie' },
    });

    expect(result.current.subscriptions).toEqual([
      { serviceId: 'hulu', serviceName: 'Hulu', isActive: true },
    ]);
  });

  it('should revert subscription on API error', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      } as Response)
      .mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useUserSubscriptions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const originalSubscriptions = [...result.current.subscriptions];

    await act(async () => {
      await result.current.toggleSubscription('netflix', 'Netflix');
    });

    // Should revert to original state
    expect(result.current.subscriptions).toEqual(originalSubscriptions);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to sync subscription with API:',
      expect.any(Error)
    );

    consoleErrorSpy.mockRestore();
  });

  it('should handle API error and fall back to localStorage', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    // Use mockReturnValue (not Once) for persistent mock across multiple calls
    localStorageMock.getItem.mockReturnValue(JSON.stringify(mockSubscriptions));
    mockFetch.mockRejectedValueOnce(new Error('API unavailable'));

    const { result } = renderHook(() => useUserSubscriptions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should fall back to localStorage
    expect(result.current.subscriptions).toEqual(mockSubscriptions);
    expect(result.current.error).toBe('API unavailable');
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it('should handle API not ok response', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: 'Unauthorized',
    } as Response);

    const { result } = renderHook(() => useUserSubscriptions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to fetch subscriptions');
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});

describe('useUserSubscriptions - Utility Functions', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue(createMockAuthContext({
      isAuthenticated: false,
      user: null,
    }));
  });

  it('should check if user has specific subscription', async () => {
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(mockSubscriptions));

    const { result } = renderHook(() => useUserSubscriptions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.hasSubscription('netflix')).toBe(true);
    expect(result.current.hasSubscription('hulu')).toBe(false);
  });

  it('should get list of active service IDs', async () => {
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(mockSubscriptions));

    const { result } = renderHook(() => useUserSubscriptions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.getServiceIds()).toEqual(['netflix', 'disney-plus']);
  });

  it('should return subscription count', async () => {
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(mockSubscriptions));

    const { result } = renderHook(() => useUserSubscriptions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.subscriptionCount).toBe(2);
  });

  it('should indicate if user has set up subscriptions', async () => {
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(mockSubscriptions));

    const { result } = renderHook(() => useUserSubscriptions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.hasSetupSubscriptions).toBe(true);
  });

  it('should indicate no subscriptions when empty', async () => {
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify([]));

    const { result } = renderHook(() => useUserSubscriptions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.hasSetupSubscriptions).toBe(false);
    expect(result.current.subscriptionCount).toBe(0);
  });

  it('should filter inactive subscriptions from count and IDs', async () => {
    const mixedSubscriptions = [
      { serviceId: 'netflix', serviceName: 'Netflix', isActive: true },
      { serviceId: 'hulu', serviceName: 'Hulu', isActive: false },
      { serviceId: 'disney-plus', serviceName: 'Disney+', isActive: true },
    ];

    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(mixedSubscriptions));

    const { result } = renderHook(() => useUserSubscriptions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.subscriptionCount).toBe(2);
    expect(result.current.getServiceIds()).toEqual(['netflix', 'disney-plus']);
    expect(result.current.hasSubscription('hulu')).toBe(false);
  });

  it('should provide refetch function', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    } as Response);

    mockUseAuth.mockReturnValue(createMockAuthContext({
      isAuthenticated: true,
      user: createMockUser(),
    }));

    const { result } = renderHook(() => useUserSubscriptions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockFetch.mockClear();

    await act(async () => {
      await result.current.refetch();
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

describe('useUserSubscriptions - SSR Safety', () => {
  it('should handle SSR environment (no window)', async () => {
    const originalWindow = global.window;
    // @ts-expect-error -- deleting window to simulate SSR environment
    delete global.window;

    // Clear localStorage mock for SSR test
    localStorageMock.clear();
    localStorageMock.getItem.mockReset();

    mockUseAuth.mockReturnValue(createMockAuthContext({
      isAuthenticated: false,
      user: null,
    }));

    const { result } = renderHook(() => useUserSubscriptions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.subscriptions).toEqual([]);

    // Restore window
    global.window = originalWindow;
  });
});

describe('useUserSubscriptions - Auth State Changes', () => {
  it('should reload subscriptions when auth state changes', async () => {
    // Start as anonymous
    mockUseAuth.mockReturnValue(createMockAuthContext({
      isAuthenticated: false,
      user: null,
    }));

    localStorageMock.getItem.mockReturnValue(JSON.stringify(mockSubscriptions));

    const { result, rerender } = renderHook(() => useUserSubscriptions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.subscriptions).toEqual(mockSubscriptions);

    // Change to authenticated
    mockUseAuth.mockReturnValue(createMockAuthContext({
      isAuthenticated: true,
      user: createMockUser(),
    }));

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse,
    } as Response);

    rerender();

    await waitFor(() => {
      expect(result.current.subscriptions).toEqual(mockApiResponse.map(sub => ({
        serviceId: sub.serviceId,
        serviceName: sub.serviceName,
        isActive: sub.isActive,
      })));
    });
  });
});
