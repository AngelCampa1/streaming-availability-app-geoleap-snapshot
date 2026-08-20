/**
 * Comprehensive tests for useSubscriptions.ts
 *
 * Coverage Target: 85%+
 * Strategy: Test CRUD operations, state management, error handling, helper functions
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { useSubscriptions } from '../useSubscriptions';
import { UserStreamingSubscription } from '@/types/streaming';

// Mock API_BASE_URL
jest.mock('@/config/api', () => ({
  API_BASE_URL: 'http://localhost:3000',
}));

// Mock data
const mockSubscriptions: UserStreamingSubscription[] = [
  {
    id: 'sub-1',
    userId: 'user-123',
    serviceId: 'netflix',
    serviceName: 'Netflix',
    isActive: true,
    addedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'sub-2',
    userId: 'user-123',
    serviceId: 'hulu',
    serviceName: 'Hulu',
    isActive: true,
    addedAt: '2024-01-02T00:00:00Z',
  },
  {
    id: 'sub-3',
    userId: 'user-123',
    serviceId: 'disney',
    serviceName: 'Disney+',
    isActive: false,
    addedAt: '2024-01-03T00:00:00Z',
  },
];

const newSubscription: UserStreamingSubscription = {
  id: 'sub-4',
  userId: 'user-123',
  serviceId: 'hbo',
  serviceName: 'HBO Max',
  isActive: true,
  addedAt: '2024-01-04T00:00:00Z',
};

const updatedSubscription: UserStreamingSubscription = {
  id: 'sub-1',
  userId: 'user-123',
  serviceId: 'netflix',
  serviceName: 'Netflix',
  isActive: false,
  addedAt: '2024-01-01T00:00:00Z',
  subscriptionTier: 'premium',
};

// Setup and teardown
beforeEach(() => {
  global.fetch = jest.fn();
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('useSubscriptions - Initial Fetch', () => {
  it('should fetch subscriptions on mount', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockSubscriptions,
    });

    const { result } = renderHook(() => useSubscriptions());

    // Initially loading
    expect(result.current.loading).toBe(true);
    expect(result.current.subscriptions).toEqual([]);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should have fetched subscriptions
    expect(result.current.subscriptions).toEqual(mockSubscriptions);
    expect(result.current.error).toBeNull();
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/usersubscriptions',
      {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Mode': 'cookie',
        },
      }
    );
  });

  it('should handle fetch error on mount', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    const { result } = renderHook(() => useSubscriptions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to fetch subscriptions');
    expect(result.current.subscriptions).toEqual([]);
    expect(console.error).toHaveBeenCalled();
  });

  it('should handle network error on mount', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useSubscriptions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.subscriptions).toEqual([]);
  });
});

describe('useSubscriptions - Add Subscription', () => {
  it('should add subscription successfully', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSubscriptions,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => newSubscription,
      });

    const { result } = renderHook(() => useSubscriptions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Add subscription
    let addedSub: UserStreamingSubscription | undefined;
    await act(async () => {
      addedSub = await result.current.addSubscription({
        serviceId: 'hbo',
        serviceName: 'HBO Max',
      });
    });

    expect(addedSub).toEqual(newSubscription);
    expect(result.current.subscriptions).toHaveLength(4);
    expect(result.current.subscriptions).toContainEqual(newSubscription);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/usersubscriptions',
      {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Mode': 'cookie',
        },
        body: JSON.stringify({
          serviceId: 'hbo',
          serviceName: 'HBO Max',
        }),
      }
    );
  });

  it('should handle add subscription error', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSubscriptions,
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ message: 'Subscription already exists' }),
      });

    const { result } = renderHook(() => useSubscriptions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Attempt to add subscription (should fail)
    let thrownError: Error | null = null;
    try {
      await result.current.addSubscription({
        serviceId: 'netflix',
        serviceName: 'Netflix',
      });
    } catch (err) {
      thrownError = err as Error;
    }

    expect(thrownError?.message).toBe('Subscription already exists');

    // Wait for error state to update
    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    expect(result.current.error).toBe('Subscription already exists');
    expect(result.current.subscriptions).toHaveLength(3); // Unchanged
  });

  it('should handle add subscription network error', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSubscriptions,
      })
      .mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useSubscriptions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let thrownError: Error | null = null;
    try {
      await result.current.addSubscription({
        serviceId: 'hbo',
        serviceName: 'HBO Max',
      });
    } catch (err) {
      thrownError = err as Error;
    }

    expect(thrownError?.message).toBe('Network error');

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    expect(result.current.error).toBe('Network error');
  });

  it('should handle add subscription error without JSON response', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSubscriptions,
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

    const { result } = renderHook(() => useSubscriptions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await expect(
      act(async () => {
        await result.current.addSubscription({
          serviceId: 'hbo',
          serviceName: 'HBO Max',
        });
      })
    ).rejects.toThrow('Failed to add subscription');
  });
});

describe('useSubscriptions - Update Subscription', () => {
  it('should update subscription successfully', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSubscriptions,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => updatedSubscription,
      });

    const { result } = renderHook(() => useSubscriptions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Update subscription
    let updated: UserStreamingSubscription | undefined;
    await act(async () => {
      updated = await result.current.updateSubscription('netflix', {
        subscriptionTier: 'premium',
      });
    });

    expect(updated).toEqual(updatedSubscription);
    expect(result.current.subscriptions).toHaveLength(3);
    const netflixSub = result.current.subscriptions.find(s => s.serviceId === 'netflix');
    expect(netflixSub?.subscriptionTier).toBe('premium');
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/usersubscriptions/netflix',
      {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Mode': 'cookie',
        },
        body: JSON.stringify({ subscriptionTier: 'premium' }),
      }
    );
  });

  it('should handle update subscription error', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSubscriptions,
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

    const { result } = renderHook(() => useSubscriptions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let thrownError: Error | null = null;
    try {
      await result.current.updateSubscription('nonexistent', {
        notes: 'test',
      });
    } catch (err) {
      thrownError = err as Error;
    }

    expect(thrownError?.message).toBe('Failed to update subscription');

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    expect(result.current.error).toBe('Failed to update subscription');
  });

  it('should handle update subscription network error', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSubscriptions,
      })
      .mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useSubscriptions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await expect(
      act(async () => {
        await result.current.updateSubscription('netflix', {
          notes: 'updated',
        });
      })
    ).rejects.toThrow('Network error');
  });
});

describe('useSubscriptions - Remove Subscription', () => {
  it('should remove subscription successfully', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSubscriptions,
      })
      .mockResolvedValueOnce({
        ok: true,
      });

    const { result } = renderHook(() => useSubscriptions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Remove subscription
    await act(async () => {
      await result.current.removeSubscription('netflix');
    });

    expect(result.current.subscriptions).toHaveLength(2);
    expect(result.current.subscriptions.find(s => s.serviceId === 'netflix')).toBeUndefined();
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/usersubscriptions/netflix',
      {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'X-Auth-Mode': 'cookie',
        },
      }
    );
  });

  it('should handle remove subscription error', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSubscriptions,
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

    const { result } = renderHook(() => useSubscriptions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let thrownError: Error | null = null;
    try {
      await result.current.removeSubscription('nonexistent');
    } catch (err) {
      thrownError = err as Error;
    }

    expect(thrownError?.message).toBe('Failed to remove subscription');

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    expect(result.current.error).toBe('Failed to remove subscription');
    expect(result.current.subscriptions).toHaveLength(3); // Unchanged
  });

  it('should handle remove subscription network error', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSubscriptions,
      })
      .mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useSubscriptions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await expect(
      act(async () => {
        await result.current.removeSubscription('netflix');
      })
    ).rejects.toThrow('Network error');
  });
});

describe('useSubscriptions - Helper Functions', () => {
  it('should check if user has active subscription', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockSubscriptions,
    });

    const { result } = renderHook(() => useSubscriptions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.hasSubscription('netflix')).toBe(true);
    expect(result.current.hasSubscription('hulu')).toBe(true);
    expect(result.current.hasSubscription('disney')).toBe(false); // Inactive
    expect(result.current.hasSubscription('nonexistent')).toBe(false);
  });

  it('should get all active service IDs', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockSubscriptions,
    });

    const { result } = renderHook(() => useSubscriptions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const serviceIds = result.current.getServiceIds();
    expect(serviceIds).toEqual(['netflix', 'hulu']);
    expect(serviceIds).not.toContain('disney'); // Inactive
  });

  it('should return empty array when no active subscriptions', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          id: 'sub-inactive',
          userId: 'user-123',
          serviceId: 'disney',
          serviceName: 'Disney+',
          isActive: false,
          addedAt: '2024-01-01'
        },
      ],
    });

    const { result } = renderHook(() => useSubscriptions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.getServiceIds()).toEqual([]);
  });
});

describe('useSubscriptions - Refetch', () => {
  it('should refetch subscriptions', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSubscriptions,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [mockSubscriptions[0]],
      });

    const { result } = renderHook(() => useSubscriptions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.subscriptions).toHaveLength(3);

    // Refetch
    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.subscriptions).toHaveLength(1);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('should handle refetch error', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSubscriptions,
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Server Error',
      });

    const { result } = renderHook(() => useSubscriptions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Refetch (should fail)
    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to fetch subscriptions');
  });
});

describe('useSubscriptions - State Management', () => {
  it('should clear error after successful operation', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Error',
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSubscriptions,
      });

    const { result } = renderHook(() => useSubscriptions());

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    // Refetch successfully
    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.error).toBeNull();
    });
  });

  it('should maintain loading state during fetch', async () => {
    let resolvePromise: (value: any) => void;
    const fetchPromise = new Promise(resolve => {
      resolvePromise = resolve;
    });

    (global.fetch as jest.Mock).mockReturnValueOnce(fetchPromise);

    const { result } = renderHook(() => useSubscriptions());

    // Initially loading
    expect(result.current.loading).toBe(true);

    // Resolve fetch
    act(() => {
      resolvePromise!({
        ok: true,
        json: async () => mockSubscriptions,
      });
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });
});
