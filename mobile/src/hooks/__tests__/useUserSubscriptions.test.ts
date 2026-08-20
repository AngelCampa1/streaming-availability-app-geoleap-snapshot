/**
 * useUserSubscriptions Hook Tests
 * Mobile version - uses AsyncStorage instead of localStorage
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useUserSubscriptions } from '../useUserSubscriptions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn() as jest.Mock;

// Mock AuthContext
jest.mock('../../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('useUserSubscriptions (Mobile)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [],
    });
  });

  // Test Category 1: Anonymous User - AsyncStorage Operations (4 tests)

  describe('Anonymous User - AsyncStorage', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        state: {
          isAuthenticated: false,
          user: null,
          loading: false,
          error: null,
        },
        login: jest.fn(),
        logout: jest.fn(),
        register: jest.fn(),
      });
    });

    it('should load subscriptions from AsyncStorage for anonymous users', async () => {
      const storedData = JSON.stringify([
        { serviceId: 'netflix', serviceName: 'Netflix', isActive: true },
        { serviceId: 'hulu', serviceName: 'Hulu', isActive: true },
      ]);

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(storedData);

      const { result } = renderHook(() => useUserSubscriptions());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(AsyncStorage.getItem).toHaveBeenCalledWith('geoleap_subscriptions');
      expect(result.current.subscriptions).toHaveLength(2);
      expect(result.current.subscriptions[0].serviceId).toBe('netflix');
      expect(result.current.hasSetupSubscriptions).toBe(true);
    });

    it('should save subscriptions to AsyncStorage when toggling', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const { result } = renderHook(() => useUserSubscriptions());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.toggleSubscription('netflix', 'Netflix');
      });

      await waitFor(() => {
        expect(AsyncStorage.setItem).toHaveBeenCalledWith(
          'geoleap_subscriptions',
          expect.stringContaining('netflix')
        );
      });

      expect(result.current.subscriptions).toHaveLength(1);
      expect(result.current.subscriptions[0].serviceId).toBe('netflix');
    });

    it('should return empty array when AsyncStorage has no data', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const { result } = renderHook(() => useUserSubscriptions());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.subscriptions).toEqual([]);
      expect(result.current.hasSetupSubscriptions).toBe(false);
      expect(result.current.subscriptionCount).toBe(0);
    });

    it('should handle AsyncStorage read errors gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const { result } = renderHook(() => useUserSubscriptions());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should fallback to empty array
      expect(result.current.subscriptions).toEqual([]);
      expect(result.current.error).toBeNull(); // Errors are logged but not exposed
    });
  });

  // Test Category 2: Authenticated User - API Operations (4 tests)

  describe('Authenticated User - API', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        state: {
          isAuthenticated: true,
          user: { id: 'user123', email: 'test@example.com' },
          loading: false,
          error: null,
        },
        login: jest.fn(),
        logout: jest.fn(),
        register: jest.fn(),
      });
    });

    it('should load subscriptions from API for authenticated users', async () => {
      const apiData = [
        { serviceId: 'netflix', serviceName: 'Netflix', isActive: true },
        { serviceId: 'prime', serviceName: 'Prime Video', isActive: true },
      ];

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => apiData,
      });

      const { result } = renderHook(() => useUserSubscriptions());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/usersubscriptions'),
        expect.objectContaining({
          credentials: 'include',
        })
      );

      expect(result.current.subscriptions).toHaveLength(2);
      expect(result.current.subscriptions[0].serviceId).toBe('netflix');
    });

    it('should sync with API when toggling subscription for authenticated users', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

      const { result } = renderHook(() => useUserSubscriptions());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Add subscription
      await act(async () => {
        await result.current.toggleSubscription('netflix', 'Netflix');
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/usersubscriptions'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('netflix'),
          })
        );
      });

      expect(result.current.subscriptions).toHaveLength(1);
    });

    it('should delete subscription via API when removing', async () => {
      const apiData = [
        { serviceId: 'netflix', serviceName: 'Netflix', isActive: true },
      ];

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => apiData,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

      const { result } = renderHook(() => useUserSubscriptions());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Remove subscription
      await act(async () => {
        await result.current.toggleSubscription('netflix', 'Netflix');
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/usersubscriptions/netflix'),
          expect.objectContaining({
            method: 'DELETE',
          })
        );
      });

      expect(result.current.subscriptions).toHaveLength(0);
    });

    it('should fallback to AsyncStorage when API fails', async () => {
      const storedData = JSON.stringify([
        { serviceId: 'netflix', serviceName: 'Netflix', isActive: true },
      ]);

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(storedData);
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useUserSubscriptions());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should fallback to AsyncStorage
      expect(result.current.subscriptions).toHaveLength(1);
      expect(result.current.error).toBe('Network error');
    });
  });

  // Test Category 3: Utility Methods (4 tests)

  describe('Utility Methods', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        state: {
          isAuthenticated: false,
          user: null,
          loading: false,
          error: null,
        },
        login: jest.fn(),
        logout: jest.fn(),
        register: jest.fn(),
      });
    });

    it('should correctly check if user has a subscription', async () => {
      const storedData = JSON.stringify([
        { serviceId: 'netflix', serviceName: 'Netflix', isActive: true },
        { serviceId: 'hulu', serviceName: 'Hulu', isActive: false },
      ]);

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(storedData);

      const { result } = renderHook(() => useUserSubscriptions());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.hasSubscription('netflix')).toBe(true);
      expect(result.current.hasSubscription('hulu')).toBe(false); // inactive
      expect(result.current.hasSubscription('prime')).toBe(false);
    });

    it('should return array of active service IDs', async () => {
      const storedData = JSON.stringify([
        { serviceId: 'netflix', serviceName: 'Netflix', isActive: true },
        { serviceId: 'hulu', serviceName: 'Hulu', isActive: false },
        { serviceId: 'prime', serviceName: 'Prime Video', isActive: true },
      ]);

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(storedData);

      const { result } = renderHook(() => useUserSubscriptions());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const serviceIds = result.current.getServiceIds();
      expect(serviceIds).toEqual(['netflix', 'prime']);
      expect(serviceIds).not.toContain('hulu');
    });

    it('should return correct subscription count', async () => {
      const storedData = JSON.stringify([
        { serviceId: 'netflix', serviceName: 'Netflix', isActive: true },
        { serviceId: 'hulu', serviceName: 'Hulu', isActive: false },
        { serviceId: 'prime', serviceName: 'Prime Video', isActive: true },
      ]);

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(storedData);

      const { result } = renderHook(() => useUserSubscriptions());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.subscriptionCount).toBe(2); // Only active ones
      expect(result.current.hasSetupSubscriptions).toBe(true);
    });

    it('should set multiple subscriptions at once', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const { result } = renderHook(() => useUserSubscriptions());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.setMultipleSubscriptions(['netflix', 'hulu', 'prime']);
      });

      await waitFor(() => {
        expect(result.current.subscriptions).toHaveLength(3);
      });

      expect(result.current.hasSubscription('netflix')).toBe(true);
      expect(result.current.hasSubscription('hulu')).toBe(true);
      expect(result.current.hasSubscription('prime')).toBe(true);
    });
  });

  // Test Category 4: Migration on Login (2 tests)

  describe('Migration on Login', () => {
    it('should keep AsyncStorage data when user logs in', async () => {
      const storedData = JSON.stringify([
        { serviceId: 'netflix', serviceName: 'Netflix', isActive: true },
      ]);

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(storedData);

      // Start as anonymous
      mockUseAuth.mockReturnValue({
        state: {
          isAuthenticated: false,
          user: null,
          loading: false,
          error: null,
        },
        login: jest.fn(),
        logout: jest.fn(),
        register: jest.fn(),
      });

      const { result, rerender } = renderHook(() => useUserSubscriptions());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.subscriptions).toHaveLength(1);

      // Simulate login
      mockUseAuth.mockReturnValue({
        state: {
          isAuthenticated: true,
          user: { id: 'user123', email: 'test@example.com' },
          loading: false,
          error: null,
        },
        login: jest.fn(),
        logout: jest.fn(),
        register: jest.fn(),
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => [],
      });

      rerender({});

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should have loaded from API (empty in this case)
      // In production, we might want to migrate local data to API
      expect(AsyncStorage.getItem).toHaveBeenCalled();
    });

    it('should refetch subscriptions when refetch is called', async () => {
      mockUseAuth.mockReturnValue({
        state: {
          isAuthenticated: true,
          user: { id: 'user123', email: 'test@example.com' },
          loading: false,
          error: null,
        },
        login: jest.fn(),
        logout: jest.fn(),
        register: jest.fn(),
      });

      const apiData = [
        { serviceId: 'netflix', serviceName: 'Netflix', isActive: true },
      ];

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => apiData,
      });

      const { result } = renderHook(() => useUserSubscriptions());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.subscriptions).toHaveLength(1);

      // Update API response
      const updatedApiData = [
        { serviceId: 'netflix', serviceName: 'Netflix', isActive: true },
        { serviceId: 'prime', serviceName: 'Prime Video', isActive: true },
      ];

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => updatedApiData,
      });

      // Call refetch
      await act(async () => {
        await result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.subscriptions).toHaveLength(2);
      });
    });
  });

  // Test Category 5: Edge Cases (3 tests)

  describe('Edge Cases', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        state: {
          isAuthenticated: false,
          user: null,
          loading: false,
          error: null,
        },
        login: jest.fn(),
        logout: jest.fn(),
        register: jest.fn(),
      });
    });

    it('should handle malformed JSON in AsyncStorage', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('invalid json{');

      const { result } = renderHook(() => useUserSubscriptions());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should fallback to empty array
      expect(result.current.subscriptions).toEqual([]);
    });

    it('should handle non-array data in AsyncStorage', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ invalid: 'data' })
      );

      const { result } = renderHook(() => useUserSubscriptions());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should fallback to empty array
      expect(result.current.subscriptions).toEqual([]);
    });

    it('should revert subscription change if API fails', async () => {
      mockUseAuth.mockReturnValue({
        state: {
          isAuthenticated: true,
          user: { id: 'user123', email: 'test@example.com' },
          loading: false,
          error: null,
        },
        login: jest.fn(),
        logout: jest.fn(),
        register: jest.fn(),
      });

      const apiData = [
        { serviceId: 'netflix', serviceName: 'Netflix', isActive: true },
      ];

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => apiData,
        })
        .mockRejectedValueOnce(new Error('API Error'));

      const { result } = renderHook(() => useUserSubscriptions());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.subscriptions).toHaveLength(1);

      // Try to remove subscription (will fail)
      await act(async () => {
        await result.current.toggleSubscription('netflix', 'Netflix');
      });

      // Should revert back to original state
      await waitFor(() => {
        expect(result.current.subscriptions).toHaveLength(1);
      });
    });
  });
});
