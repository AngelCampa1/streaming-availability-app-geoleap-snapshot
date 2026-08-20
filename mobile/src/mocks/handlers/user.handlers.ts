/**
 * MSW User Handlers
 *
 * Handles user profile and settings API mocking:
 * - Get profile
 * - Update profile
 * - Update settings
 * - User preferences
 */

import { http, HttpResponse, delay } from 'msw';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.geoleap.app';

/**
 * Helper to safely get URL search params
 * Works around TypeScript not recognizing polyfilled URLSearchParams.get()
 */
const getSearchParam = (url: URL, param: string): string | null => {
  return (url.searchParams as any).get(param);
};

// Mock user profile
let mockUserProfile = {
  id: 'user-123',
  email: 'test@geoleap.app',
  username: 'testuser',
  firstName: 'Test',
  lastName: 'User',
  avatar: 'https://example.com/avatar.jpg',
  bio: 'Test user bio',
  location: 'Test City',
  emailVerified: true,
  biometricEnabled: false,
  twoFactorEnabled: false,
  createdAt: '2024-01-01T00:00:00Z',
  lastLoginAt: '2025-01-01T00:00:00Z',
};

// Mock user preferences
let mockUserPreferences = {
  language: 'en',
  theme: 'light' as const,
  notifications: {
    email: true,
    push: true,
    newReleases: true,
    recommendations: true,
    watchlistUpdates: true,
  },
  privacy: {
    profileVisibility: 'public' as const,
    watchlistVisibility: 'friends' as const,
    showActivity: true,
  },
  contentFilters: {
    preferredGenres: ['Action', 'Drama', 'Sci-Fi'],
    excludedGenres: ['Horror'],
    maturityRating: 'PG-13' as const,
  },
  autoPlay: true,
  dataUsage: {
    streamingQuality: 'auto' as const,
    downloadQuality: 'high' as const,
    cellularStreaming: true,
  },
};

export const userHandlers = [
  // GET /api/user-profile - Get user profile
  http.get(`${BASE_URL}/api/user-profile`, async ({ request }) => {
    await delay(75);

    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    return HttpResponse.json({ profile: mockUserProfile });
  }),

  // PUT /api/user-profile - Update user profile
  http.put(`${BASE_URL}/api/user-profile`, async ({ request }) => {
    await delay(100);

    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const body = await request.json() as Partial<typeof mockUserProfile>;

    // Simulate validation error
    if (body.username === 'taken') {
      return HttpResponse.json(
        { error: 'Username already taken', code: 'USERNAME_EXISTS' },
        { status: 409 }
      );
    }

    // Update profile
    Object.assign(mockUserProfile, body);

    return HttpResponse.json({ profile: mockUserProfile });
  }),

  // GET /api/preferences - Get user preferences
  http.get(`${BASE_URL}/api/preferences`, async ({ request }) => {
    await delay(50);

    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    return HttpResponse.json({ preferences: mockUserPreferences });
  }),

  // PUT /api/preferences - Update user preferences
  http.put(`${BASE_URL}/api/preferences`, async ({ request }) => {
    await delay(75);

    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const body = await request.json() as Partial<typeof mockUserPreferences>;

    // Deep merge preferences
    Object.assign(mockUserPreferences, body);

    return HttpResponse.json({ preferences: mockUserPreferences });
  }),

  // POST /users/avatar - Upload avatar
  http.post(`${BASE_URL}/users/avatar`, async ({ request }) => {
    await delay(200);

    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const avatarUrl = `https://example.com/avatar-${Date.now()}.jpg`;
    mockUserProfile.avatar = avatarUrl;

    return HttpResponse.json({ avatarUrl });
  }),

  // DELETE /api/users/account - Delete user account
  http.delete(`${BASE_URL}/api/users/account`, async ({ request }) => {
    await delay(150);

    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    return HttpResponse.json({ success: true, message: 'Account deleted successfully' });
  }),

  // GET /users/stats - Get user statistics
  http.get(`${BASE_URL}/users/stats`, async ({ request }) => {
    await delay(100);

    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    return HttpResponse.json({
      stats: {
        totalWatchTime: 18720, // minutes
        moviesWatched: 150,
        episodesWatched: 320,
        averageRating: 4.2,
        favoriteGenres: ['Action', 'Drama', 'Sci-Fi'],
        watchStreak: 7,
        joinDate: '2024-01-01T00:00:00Z',
      },
    });
  }),

  // GET /users/activity - Get user activity
  http.get(`${BASE_URL}/users/activity`, async ({ request }) => {
    await delay(100);

    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const limit = parseInt(getSearchParam(url, 'limit') || '20', 10);

    const mockActivities = Array.from({ length: Math.min(limit, 5) }, (_, i) => ({
      id: `activity-${i + 1}`,
      type: 'watched',
      itemType: 'movie',
      itemId: `item-${i + 1}`,
      itemTitle: `Movie ${i + 1}`,
      itemPoster: `https://example.com/poster-${i + 1}.jpg`,
      rating: 4 + (i % 2),
      timestamp: new Date(Date.now() - i * 86400000).toISOString(),
    }));

    return HttpResponse.json({ activities: mockActivities });
  }),
];

// Helper to reset user data between tests
export function resetMockUserData() {
  mockUserProfile = {
    id: 'user-123',
    email: 'test@geoleap.app',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    avatar: 'https://example.com/avatar.jpg',
    bio: 'Test user bio',
    location: 'Test City',
    emailVerified: true,
    biometricEnabled: false,
    twoFactorEnabled: false,
    createdAt: '2024-01-01T00:00:00Z',
    lastLoginAt: '2025-01-01T00:00:00Z',
  };

  mockUserPreferences = {
    language: 'en',
    theme: 'light',
    notifications: {
      email: true,
      push: true,
      newReleases: true,
      recommendations: true,
      watchlistUpdates: true,
    },
    privacy: {
      profileVisibility: 'public',
      watchlistVisibility: 'friends',
      showActivity: true,
    },
    contentFilters: {
      preferredGenres: ['Action', 'Drama', 'Sci-Fi'],
      excludedGenres: ['Horror'],
      maturityRating: 'PG-13',
    },
    autoPlay: true,
    dataUsage: {
      streamingQuality: 'auto',
      downloadQuality: 'high',
      cellularStreaming: true,
    },
  };
}
