/**
 * MSW Auth Handlers
 *
 * Handles authentication-related API mocking:
 * - Login (email/password, social OAuth)
 * - Registration
 * - Token refresh
 * - Logout
 * - Password reset
 */

import { http, HttpResponse, delay } from 'msw';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.geoleap.app';

// API endpoints must include /api prefix to match real endpoints (see src/config/api.ts)
const API = {
  login: `${BASE_URL}/api/auth/login`,
  register: `${BASE_URL}/api/auth/register`,
  logout: `${BASE_URL}/api/auth/logout`,
  refresh: `${BASE_URL}/api/auth/refresh`,
  forgotPassword: `${BASE_URL}/api/auth/forgot-password`,
  resetPassword: `${BASE_URL}/api/auth/reset-password`,
  profile: `${BASE_URL}/api/auth/profile`,
  me: `${BASE_URL}/api/auth/me`,
};

// Mock user data
export const mockUser = {
  id: 'user-123',
  email: 'test@geoleap.app',
  username: 'testuser',
  firstName: 'Test',
  lastName: 'User',
  avatar: 'https://example.com/avatar.jpg',
  emailVerified: true,
  biometricEnabled: false,
  twoFactorEnabled: false,
  socialConnections: [],
  createdAt: '2024-01-01T00:00:00Z',
  lastLoginAt: '2025-01-01T00:00:00Z',
};

export const mockTokens = {
  accessToken: 'mock-access-token-jwt',
  refreshToken: 'mock-refresh-token',
  expiresAt: Date.now() + 3600000, // 1 hour from now
  tokenType: 'Bearer' as const,
};

export const authHandlers = [
  // POST /auth/login - Email/password login
  http.post(API.login, async ({ request }) => {
    await delay(100); // Simulate network delay

    const body = await request.json() as { email: string; password: string };

    // Simulate validation failure
    if (body.email === 'invalid@test.com') {
      return HttpResponse.json(
        { error: 'Invalid email format', code: 'INVALID_EMAIL' },
        { status: 400 }
      );
    }

    // Simulate authentication failure
    if (body.password === 'wrongpassword') {
      return HttpResponse.json(
        { error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' },
        { status: 401 }
      );
    }

    // Successful login
    return HttpResponse.json({
      user: mockUser,
      tokens: mockTokens,
    });
  }),

  // POST /auth/register - User registration
  http.post(API.register, async ({ request }) => {
    await delay(150);

    const body = await request.json() as { email: string; password: string; username: string };

    // Simulate email already exists
    if (body.email === 'existing@test.com') {
      return HttpResponse.json(
        { error: 'Email already registered', code: 'EMAIL_EXISTS' },
        { status: 409 }
      );
    }

    // Successful registration
    return HttpResponse.json({
      user: { ...mockUser, email: body.email, username: body.username },
      tokens: mockTokens,
    });
  }),

  // POST /auth/refresh - Refresh access token
  http.post(API.refresh, async ({ request }) => {
    await delay(50);

    const body = await request.json() as { refreshToken: string };

    // Simulate expired refresh token
    if (body.refreshToken === 'expired-token') {
      return HttpResponse.json(
        { error: 'Refresh token expired', code: 'TOKEN_EXPIRED' },
        { status: 401 }
      );
    }

    // Successful refresh
    return HttpResponse.json({
      accessToken: 'new-mock-access-token',
      expiresAt: Date.now() + 3600000,
    });
  }),

  // POST /auth/logout - Logout user
  http.post(API.logout, async () => {
    await delay(50);

    return HttpResponse.json({ success: true });
  }),

  // POST /auth/forgot-password - Request password reset
  http.post(API.forgotPassword, async ({ request }) => {
    await delay(100);

    const body = await request.json() as { email: string };

    // Simulate user not found
    if (body.email === 'notfound@test.com') {
      return HttpResponse.json(
        { error: 'User not found', code: 'USER_NOT_FOUND' },
        { status: 404 }
      );
    }

    return HttpResponse.json({ success: true, message: 'Password reset email sent' });
  }),

  // POST /auth/reset-password - Reset password with token
  http.post(API.resetPassword, async ({ request }) => {
    await delay(100);

    const body = await request.json() as { token: string; password: string };

    // Simulate invalid token
    if (body.token === 'invalid-token') {
      return HttpResponse.json(
        { error: 'Invalid or expired reset token', code: 'INVALID_TOKEN' },
        { status: 400 }
      );
    }

    return HttpResponse.json({ success: true, message: 'Password reset successful' });
  }),

  // POST /auth/google - Google OAuth login
  http.post(`${BASE_URL}/auth/google`, async ({ request }) => {
    await delay(150);

    const body = await request.json() as { idToken: string };

    // Simulate invalid token
    if (body.idToken === 'invalid-google-token') {
      return HttpResponse.json(
        { error: 'Invalid Google ID token', code: 'INVALID_GOOGLE_TOKEN' },
        { status: 401 }
      );
    }

    return HttpResponse.json({
      user: { ...mockUser, socialConnections: ['google'] },
      tokens: mockTokens,
    });
  }),

  // POST /auth/apple - Apple Sign In
  http.post(`${BASE_URL}/auth/apple`, async ({ request }) => {
    await delay(150);

    const body = await request.json() as { identityToken: string };

    // Simulate invalid token
    if (body.identityToken === 'invalid-apple-token') {
      return HttpResponse.json(
        { error: 'Invalid Apple identity token', code: 'INVALID_APPLE_TOKEN' },
        { status: 401 }
      );
    }

    return HttpResponse.json({
      user: { ...mockUser, socialConnections: ['apple'] },
      tokens: mockTokens,
    });
  }),

  // GET /auth/me - Get current user
  http.get(API.me, async ({ request }) => {
    await delay(50);

    const authHeader = request.headers.get('Authorization');

    // Simulate unauthorized
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    return HttpResponse.json({ user: mockUser });
  }),
];
