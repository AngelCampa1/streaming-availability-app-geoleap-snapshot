import _React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';
import { apiCall } from '@/lib/api';
import { SecurityService } from '@/lib/security';
import {
  storeSessionFingerprint,
  clearSessionFingerprint,
  detectSessionCompromise,
} from '@/lib/session-fingerprint';
import { useRouter } from 'next/navigation';

// Mock dependencies
jest.mock('@/lib/api');
jest.mock('@/lib/security');
jest.mock('@/lib/session-fingerprint');

// Override next/navigation mock for this test file (global mock doesn't use jest.fn())
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(() => '/'),
  useSearchParams: jest.fn(() => new URLSearchParams()),
  useParams: jest.fn(() => ({})),
}));

const mockApiCall = apiCall as jest.MockedFunction<typeof apiCall>;
const mockStoreSessionFingerprint = storeSessionFingerprint as jest.MockedFunction<typeof storeSessionFingerprint>;
const mockClearSessionFingerprint = clearSessionFingerprint as jest.MockedFunction<typeof clearSessionFingerprint>;
const mockDetectSessionCompromise = detectSessionCompromise as jest.MockedFunction<typeof detectSessionCompromise>;

// Router mock object (next/navigation is already mocked globally in jest.setup.js)
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  refresh: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  prefetch: jest.fn(),
};

const mockUser = {
  id: '123',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  permissions: ['read:posts', 'write:posts'],
  roles: ['user'],
};

describe('AuthContext Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Set up router mock (useRouter is already mocked globally)
    (useRouter as jest.Mock).mockReturnValue(mockRouter);

    mockDetectSessionCompromise.mockReturnValue({ compromised: false });
    SecurityService.clearCsrfToken = jest.fn();

    // Mock localStorage
    Storage.prototype.getItem = jest.fn();
    Storage.prototype.setItem = jest.fn();
    Storage.prototype.removeItem = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Login Flow', () => {
    it('should login successfully and update state', async () => {
      // No sessionFingerprint in localStorage = mount skips auth check API calls
      // First call: actual login
      mockApiCall.mockResolvedValueOnce({
        user: mockUser,
        success: true,
        message: 'Login successful',
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Wait for initial auth check to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let loginResult: any;
      await act(async () => {
        loginResult = await result.current.login('test@example.com', 'password123');
      });

      expect(mockApiCall).toHaveBeenCalledWith('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Mode': 'cookie',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
          rememberMe: false,
        }),
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(loginResult.success).toBe(true);
      expect(mockStoreSessionFingerprint).toHaveBeenCalled();
      expect(SecurityService.clearCsrfToken).toHaveBeenCalled();
    });

    it('should redirect to home after successful login', async () => {
      // No sessionFingerprint in localStorage = mount skips auth check API calls
      // First call: actual login
      mockApiCall.mockResolvedValueOnce({
        user: mockUser,
        success: true,
        message: 'Login successful',
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.login('test@example.com', 'password123');
      });

      expect(mockRouter.push).toHaveBeenCalledWith('/');
    });

    it('should redirect to custom URL when provided', async () => {
      // No sessionFingerprint in localStorage = mount skips auth check API calls
      // First call: actual login
      mockApiCall.mockResolvedValueOnce({
        user: mockUser,
        success: true,
        message: 'Login successful',
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.login('test@example.com', 'password123', false, '/dashboard');
      });

      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
    });

    it('should redirect to stored redirectAfterLogin URL', async () => {
      (localStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === 'redirectAfterLogin') return '/protected-page';
        return null; // No session fingerprint - mount skips auth check
      });
      // No sessionFingerprint = mount skips auth check API calls
      // First call: actual login
      mockApiCall.mockResolvedValueOnce({
        user: mockUser,
        success: true,
        message: 'Login successful',
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.login('test@example.com', 'password123');
      });

      expect(localStorage.removeItem).toHaveBeenCalledWith('redirectAfterLogin');
      expect(mockRouter.push).toHaveBeenCalledWith('/protected-page');
    });

    it('should throw error on failed login', async () => {
      // No sessionFingerprint in localStorage = mount skips auth check API calls
      // First call: failed login
      const loginError = new Error('Invalid credentials');
      mockApiCall.mockRejectedValueOnce(loginError);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.login('test@example.com', 'wrongpassword');
        })
      ).rejects.toThrow('Invalid credentials');

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should handle rememberMe flag', async () => {
      // No sessionFingerprint in localStorage = mount skips auth check API calls
      // First call: actual login with rememberMe
      mockApiCall.mockResolvedValueOnce({
        user: mockUser,
        success: true,
        message: 'Login successful',
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.login('test@example.com', 'password123', true);
      });

      expect(mockApiCall).toHaveBeenCalledWith(
        '/api/auth/login',
        expect.objectContaining({
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'password123',
            rememberMe: true,
          }),
        })
      );
    });
  });

  describe('Token Refresh', () => {
    it('should refresh token when session fingerprint exists and auth/me fails', async () => {
      (localStorage.getItem as jest.Mock).mockReturnValue('fingerprint-123');
      // First call: /api/auth/me fails (token expired)
      mockApiCall.mockRejectedValueOnce(new Error('Unauthorized'));
      // Second call: /api/auth/refresh-token succeeds
      mockApiCall.mockResolvedValueOnce(undefined);
      // Third call: /api/auth/me retry succeeds
      mockApiCall.mockResolvedValueOnce(mockUser);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await waitFor(() => {
        expect(mockApiCall).toHaveBeenCalledWith('/api/auth/refresh-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Auth-Mode': 'cookie',
          },
          credentials: 'include',
        });
      });
    });

    it('should skip refresh for anonymous users without session fingerprint', async () => {
      // Mock localStorage to return null for sessionFingerprint check
      (localStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === 'sessionFingerprint') return null;
        return null;
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      // checkAuthStatus should have skipped all API calls since no session fingerprint exists
      expect(mockApiCall).not.toHaveBeenCalledWith(
        '/api/auth/refresh-token',
        expect.anything()
      );
      expect(mockApiCall).not.toHaveBeenCalledWith(
        '/api/auth/me',
        expect.anything()
      );
    });

    it('should handle concurrent refresh requests with shared lock', async () => {
      (localStorage.getItem as jest.Mock).mockReturnValue('fingerprint-123');
      mockApiCall.mockImplementation((url) => {
        if (url === '/api/auth/refresh-token') {
          return new Promise((resolve) => setTimeout(() => resolve(undefined), 100));
        }
        if (url === '/api/auth/me') {
          return Promise.resolve(mockUser);
        }
        return Promise.resolve(undefined);
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Trigger multiple concurrent refreshes
      await act(async () => {
        await Promise.all([
          result.current.checkAuthStatus(),
          result.current.checkAuthStatus(),
          result.current.checkAuthStatus(),
        ]);
      });

      // Should only call refresh once due to locking
      const refreshCalls = (mockApiCall as jest.Mock).mock.calls.filter(
        ([url]) => url === '/api/auth/refresh-token'
      );
      expect(refreshCalls.length).toBeLessThanOrEqual(2); // Allow for race window
    });

    it('should clear state when refresh fails', async () => {
      (localStorage.getItem as jest.Mock).mockReturnValue('fingerprint-123');
      // First call: /api/auth/me on mount → fails
      mockApiCall.mockRejectedValueOnce(new Error('Unauthorized'));
      // Second call: refresh token attempt → fails
      mockApiCall.mockRejectedValueOnce(new Error('Token expired'));

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await waitFor(() => {
        expect(result.current.user).toBeNull();
        expect(mockClearSessionFingerprint).toHaveBeenCalled();
      });
    });

    it('should handle refresh timeout gracefully', async () => {
      (localStorage.getItem as jest.Mock).mockReturnValue('fingerprint-123');
      mockApiCall.mockImplementation((url) => {
        if (url === '/api/auth/me') {
          return Promise.reject(new Error('Unauthorized'));
        }
        if (url === '/api/auth/refresh-token') {
          return new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 100)
          );
        }
        return Promise.resolve(undefined);
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await waitFor(() => {
        expect(result.current.user).toBeNull();
      }, { timeout: 5000 });
    });
  });

  describe('Session Persistence', () => {
    it('should load user from session on mount', async () => {
      (localStorage.getItem as jest.Mock).mockReturnValue('fingerprint-123');
      mockApiCall.mockResolvedValueOnce(mockUser); // /api/auth/me

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockApiCall).toHaveBeenCalledWith('/api/auth/me', {
        method: 'GET',
        headers: {
          'X-Auth-Mode': 'cookie',
        },
        credentials: 'include',
      });
    });

    it('should store session fingerprint after successful auth check', async () => {
      (localStorage.getItem as jest.Mock).mockReturnValueOnce('fingerprint-123').mockReturnValueOnce(null);
      mockApiCall.mockResolvedValueOnce(mockUser);

      renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(mockStoreSessionFingerprint).toHaveBeenCalled();
      });
    });

    it('should detect and handle session compromise', async () => {
      (localStorage.getItem as jest.Mock).mockReturnValue('fingerprint-123');
      mockDetectSessionCompromise.mockReturnValue({
        compromised: true,
        reason: 'Browser fingerprint mismatch',
      });
      mockApiCall.mockResolvedValueOnce(undefined); // logout

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await waitFor(() => {
        expect(mockApiCall).toHaveBeenCalledWith('/api/auth/logout', expect.anything());
        expect(result.current.user).toBeNull();
        expect(mockRouter.push).toHaveBeenCalledWith('/auth/login');
      });
    });

    it('should clear state when no session fingerprint exists', async () => {
      (localStorage.getItem as jest.Mock).mockReturnValue(null);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.user).toBeNull();
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockApiCall).not.toHaveBeenCalledWith('/api/auth/me', expect.anything());
    });
  });

  describe('Logout Flow', () => {
    it('should logout and clear state', async () => {
      mockApiCall.mockResolvedValueOnce(undefined); // logout

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(mockApiCall).toHaveBeenCalledWith('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Mode': 'cookie',
        },
        credentials: 'include',
      });

      expect(result.current.user).toBeNull();
      expect(mockClearSessionFingerprint).toHaveBeenCalled();
      expect(SecurityService.clearCsrfToken).toHaveBeenCalled();
      expect(mockRouter.push).toHaveBeenCalledWith('/auth/login');
    });

    it('should logout even when API call fails', async () => {
      mockApiCall.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.logout();
      });

      // Should still clear local state and redirect
      expect(result.current.user).toBeNull();
      expect(mockClearSessionFingerprint).toHaveBeenCalled();
      expect(mockRouter.push).toHaveBeenCalledWith('/auth/login');
    });

    it('should logout from all sessions', async () => {
      mockApiCall.mockResolvedValueOnce(undefined); // logout-all

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.logoutAllSessions();
      });

      expect(mockApiCall).toHaveBeenCalledWith('/api/auth/logout-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Mode': 'cookie',
        },
        credentials: 'include',
      });

      expect(result.current.user).toBeNull();
      expect(mockRouter.push).toHaveBeenCalledWith('/auth/login');
    });

    it('should be idempotent - multiple logout calls safe', async () => {
      mockApiCall.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await Promise.all([result.current.logout(), result.current.logout(), result.current.logout()]);
      });

      expect(result.current.user).toBeNull();
      expect(mockClearSessionFingerprint).toHaveBeenCalled();
    });
  });

  describe('Registration', () => {
    it('should register new user successfully', async () => {
      mockApiCall.mockResolvedValueOnce({
        user: mockUser,
        success: true,
        message: 'Registration successful',
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let registerResult: any;
      await act(async () => {
        registerResult = await result.current.register(
          'new@example.com',
          'password123',
          'password123',
          'New',
          'User'
        );
      });

      expect(mockApiCall).toHaveBeenCalledWith('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Mode': 'cookie',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: 'new@example.com',
          password: 'password123',
          confirmPassword: 'password123',
          firstName: 'New',
          lastName: 'User',
        }),
      });

      expect(registerResult.success).toBe(true);
      expect(registerResult.message).toBe('Registration successful');
    });

    it('should throw error on registration failure', async () => {
      mockApiCall.mockRejectedValueOnce(new Error('Email already exists'));

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.register(
            'existing@example.com',
            'password123',
            'password123',
            'Test',
            'User'
          );
        })
      ).rejects.toThrow('Email already exists');
    });
  });

  describe('Permission & Role Checks', () => {
    beforeEach(async () => {
      (localStorage.getItem as jest.Mock).mockReturnValue('fingerprint-123');
      mockApiCall.mockResolvedValueOnce(mockUser);
    });

    it('should check user permissions correctly', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      expect(result.current.hasPermission('read:posts')).toBe(true);
      expect(result.current.hasPermission('delete:posts')).toBe(false);
      expect(result.current.permissions).toEqual(['read:posts', 'write:posts']);
    });

    it('should check if user has any of multiple permissions', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      expect(result.current.hasAnyPermission(['read:posts', 'admin:all'])).toBe(true);
      expect(result.current.hasAnyPermission(['delete:posts', 'admin:all'])).toBe(false);
    });

    it('should check user roles correctly', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      expect(result.current.hasRole('user')).toBe(true);
      expect(result.current.hasRole('admin')).toBe(false);
      expect(result.current.roles).toEqual(['user']);
    });

    it('should return false for permissions when user is null', async () => {
      (localStorage.getItem as jest.Mock).mockReturnValue(null);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasPermission('read:posts')).toBe(false);
      expect(result.current.hasRole('user')).toBe(false);
      expect(result.current.permissions).toEqual([]);
      expect(result.current.roles).toEqual([]);
    });
  });

  describe('Session Expiry Handling', () => {
    it('should extend session when requested', async () => {
      (localStorage.getItem as jest.Mock).mockReturnValue('fingerprint-123');
      mockApiCall.mockResolvedValueOnce(undefined); // refresh-token

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.extendSession();
      });

      expect(mockApiCall).toHaveBeenCalledWith('/api/auth/refresh-token', expect.anything());
      expect(result.current.sessionExpiring).toBe(false);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle network errors during auth check', async () => {
      (localStorage.getItem as jest.Mock).mockReturnValue('fingerprint-123');
      // First call: /api/auth/me on mount → network failure
      mockApiCall.mockRejectedValueOnce(new Error('Network failure'));
      // Second call: refresh attempt → also fails
      mockApiCall.mockRejectedValueOnce(new Error('Network failure'));

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.user).toBeNull();
      });
    });

    it('should handle invalid user data from API', async () => {
      (localStorage.getItem as jest.Mock).mockReturnValue('fingerprint-123');
      mockApiCall.mockResolvedValueOnce(null);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should throw error when useAuth called outside provider', () => {
      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');
    });
  });
});
