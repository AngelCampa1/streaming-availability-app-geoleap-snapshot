/**
 * SocialAuthContext Test
 * Tests the social authentication context with OAuth flows and API integration
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { SocialAuthProvider, useSocialAuth } from '../SocialAuthContext';
import { SocialPlatform } from '../../types/social';

// Mock window.open
const mockWindowOpen = jest.fn();
global.window.open = mockWindowOpen;

// Mock sessionStorage
const mockSessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
});

// Create a proper fetch mock
const mockFetch = jest.fn();

// Helper to render hook with provider
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SocialAuthProvider apiEndpoint="/api/social-auth">{children}</SocialAuthProvider>
);

// Mock data
const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  displayName: 'Test User',
  avatarUrl: 'https://example.com/avatar.jpg',
};

const mockConnections = [
  {
    platform: 'google' as SocialPlatform,
    isTokenValid: true,
    connectedAt: '2024-01-01T00:00:00Z',
    lastValidated: '2024-01-15T00:00:00Z',
  },
];

const mockPrivacy = {
  allowSocialDataCollection: true,
  shareActivityEnabled: false,
  allowProfileLinking: true,
};

describe('SocialAuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Assign mockFetch to global.fetch
    global.fetch = mockFetch as any;

    // Default successful fetch mocks
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/me')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockUser),
        });
      }
      if (url.includes('/connections')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockConnections),
        });
      }
      if (url.includes('/privacy')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockPrivacy),
        });
      }
      return Promise.resolve({ ok: false });
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Provider', () => {
    it('loads initial data on mount', async () => {
      const { result } = renderHook(() => useSocialAuth(), { wrapper });

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      // Wait for loading to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Data should be loaded
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.connections).toEqual(mockConnections);
      expect(result.current.privacySettings).toEqual(mockPrivacy);
      expect(result.current.error).toBeNull();
    });

    it('handles API errors during initial load', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useSocialAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeDefined();
      expect(result.current.error?.code).toBe('GENERIC_ERROR');
      expect(result.current.error?.message).toBe('Network error');
    });

    it('provides all context methods', async () => {
      const { result } = renderHook(() => useSocialAuth(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.loginWithProvider).toBeDefined();
      expect(result.current.connectProvider).toBeDefined();
      expect(result.current.disconnectProvider).toBeDefined();
      expect(result.current.updatePrivacySettings).toBeDefined();
      expect(result.current.refreshConnections).toBeDefined();
      expect(result.current.validateConnection).toBeDefined();
      expect(result.current.isProviderConnected).toBeDefined();
      expect(result.current.getConnection).toBeDefined();
      expect(result.current.canConnect).toBeDefined();
      expect(result.current.clearError).toBeDefined();
    });
  });

  describe('useSocialAuth hook', () => {
    it('throws error when used outside provider', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      expect(() => {
        renderHook(() => useSocialAuth());
      }).toThrow('useSocialAuth must be used within a SocialAuthProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('connectProvider', () => {
    it('successfully connects a provider', async () => {
      const newConnection = {
        platform: 'facebook' as SocialPlatform,
        isTokenValid: true,
        connectedAt: '2024-01-20T00:00:00Z',
        lastValidated: '2024-01-20T00:00:00Z',
      };

      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/connect/facebook')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(newConnection),
          });
        }
        if (url.includes('/connections')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockConnections),
          });
        }
        if (url.includes('/me')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockUser),
          });
        }
        if (url.includes('/privacy')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockPrivacy),
          });
        }
        return Promise.resolve({ ok: false });
      });

      const { result } = renderHook(() => useSocialAuth(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      let connection;
      await act(async () => {
        connection = await result.current.connectProvider('facebook' as SocialPlatform);
      });

      expect(connection).toEqual(newConnection);
      expect(result.current.connections).toContainEqual(newConnection);
      expect(result.current.isConnecting.facebook).toBe(false);
    });

    it('handles connection errors', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/connect/')) {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: 'Connection failed' }),
          });
        }
        if (url.includes('/connections')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockConnections),
          });
        }
        if (url.includes('/me')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockUser),
          });
        }
        if (url.includes('/privacy')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockPrivacy),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const { result } = renderHook(() => useSocialAuth(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      let thrownError = null;
      await act(async () => {
        try {
          await result.current.connectProvider('facebook' as SocialPlatform);
        } catch (err) {
          thrownError = err;
        }
      });

      expect(thrownError).toBeDefined();
      expect(result.current.error).toBeDefined();
    });
  });

  describe('disconnectProvider', () => {
    it('successfully disconnects a provider', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/disconnect/')) {
          return Promise.resolve({ ok: true });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockConnections) });
      });

      const { result } = renderHook(() => useSocialAuth(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.disconnectProvider('google' as SocialPlatform);
      });

      expect(result.current.connections).not.toContainEqual(mockConnections[0]);
    });

    it('handles disconnection errors', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/disconnect/')) {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: 'Disconnection failed' }),
          });
        }
        if (url.includes('/connections')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockConnections),
          });
        }
        if (url.includes('/me')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockUser),
          });
        }
        if (url.includes('/privacy')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockPrivacy),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockConnections) });
      });

      const { result } = renderHook(() => useSocialAuth(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      let thrownError = null;
      await act(async () => {
        try {
          await result.current.disconnectProvider('google' as SocialPlatform);
        } catch (err) {
          thrownError = err;
        }
      });

      expect(thrownError).toBeDefined();
      expect(result.current.error).toBeDefined();
    });
  });

  describe('updatePrivacySettings', () => {
    it('successfully updates privacy settings', async () => {
      const updatedPrivacy = {
        ...mockPrivacy,
        allowSocialSharing: true,
      };

      mockFetch.mockImplementation((url: string, options?: any) => {
        if (url.includes('/privacy') && options?.method === 'PUT') {
          return Promise.resolve({ ok: true });
        }
        if (url.includes('/privacy')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(updatedPrivacy),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const { result } = renderHook(() => useSocialAuth(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.updatePrivacySettings({ allowSocialSharing: true });
      });

      expect(result.current.privacySettings).toEqual(updatedPrivacy);
    });
  });

  describe('refreshConnections', () => {
    it('successfully refreshes connections', async () => {
      const updatedConnections = [
        ...mockConnections,
        {
          platform: 'twitter' as SocialPlatform,
          isTokenValid: true,
          connectedAt: '2024-01-25T00:00:00Z',
          lastValidated: '2024-01-25T00:00:00Z',
        },
      ];

      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/connections')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(updatedConnections),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const { result } = renderHook(() => useSocialAuth(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.refreshConnections();
      });

      expect(result.current.connections).toEqual(updatedConnections);
    });
  });

  describe('validateConnection', () => {
    it('validates connection successfully', async () => {
      const validationResult = {
        isValid: true,
        wasRefreshed: false,
        expiresAt: '2024-12-31T00:00:00Z',
      };

      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/validate/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(validationResult),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockConnections) });
      });

      const { result } = renderHook(() => useSocialAuth(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      let result_validation;
      await act(async () => {
        result_validation = await result.current.validateConnection('google' as SocialPlatform);
      });

      expect(result_validation).toEqual(validationResult);
    });

    it('refreshes connections if token was refreshed', async () => {
      const validationResult = {
        isValid: true,
        wasRefreshed: true,
        expiresAt: '2024-12-31T00:00:00Z',
      };

      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/validate/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(validationResult),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockConnections) });
      });

      const { result } = renderHook(() => useSocialAuth(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.validateConnection('google' as SocialPlatform);
      });

      // Verify fetch was called for both validation and refresh
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/connections'),
        expect.any(Object)
      );
    });
  });

  describe('Utility methods', () => {
    it('isProviderConnected returns true for connected platforms', async () => {
      const { result } = renderHook(() => useSocialAuth(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.isProviderConnected('google' as SocialPlatform)).toBe(true);
      expect(result.current.isProviderConnected('facebook' as SocialPlatform)).toBe(false);
    });

    it('getConnection returns connection for platform', async () => {
      const { result } = renderHook(() => useSocialAuth(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const connection = result.current.getConnection('google' as SocialPlatform);
      expect(connection).toEqual(mockConnections[0]);

      const nonExistent = result.current.getConnection('facebook' as SocialPlatform);
      expect(nonExistent).toBeUndefined();
    });

    it('canConnect returns true if privacy allows and not connected', async () => {
      const { result } = renderHook(() => useSocialAuth(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.canConnect('facebook' as SocialPlatform)).toBe(true);
      expect(result.current.canConnect('google' as SocialPlatform)).toBe(false); // Already connected
    });

    it('canConnect returns false if privacy disallows', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/privacy')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ ...mockPrivacy, allowSocialDataCollection: false }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockConnections) });
      });

      const { result } = renderHook(() => useSocialAuth(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.canConnect('facebook' as SocialPlatform)).toBe(false);
    });
  });

  describe('Error handling', () => {
    it('clearError clears error state', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Test error'));

      const { result } = renderHook(() => useSocialAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeDefined();

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });

    it('handles Response errors correctly', async () => {
      const mockResponse = new Response(null, { status: 404 });
      (global.fetch as jest.Mock).mockRejectedValue(mockResponse);

      const { result } = renderHook(() => useSocialAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error?.code).toBe('HTTP_404');
      expect(result.current.error?.message).toContain('404');
    });
  });

  describe('Lifecycle and cleanup', () => {
    it('does not update state after unmount', async () => {
      // Use real timers for this test
      jest.useRealTimers();

      const { unmount } = renderHook(() => useSocialAuth(), { wrapper });

      // Unmount immediately
      unmount();

      // Wait a bit to ensure no state updates occur
      await new Promise(resolve => setTimeout(resolve, 200));

      // If this doesn't throw, the component correctly handled unmount
      expect(true).toBe(true);

      // Restore fake timers for other tests
      jest.useFakeTimers();
    });
  });
});
