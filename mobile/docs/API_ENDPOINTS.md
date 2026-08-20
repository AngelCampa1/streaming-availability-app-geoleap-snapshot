# Mobile App API Endpoints Inventory

**Last Updated:** 2025-12-16
**Backend URL:** `https://api.geoleap.app`
**Migration Status:** ✅ All endpoints migrated to unified ApiService

## Overview

This document provides a comprehensive inventory of all backend API endpoints used by the GeoLeap mobile application. All endpoints use the modern `ApiService` with standardized response format, built-in caching, offline queue support, and comprehensive error handling.

## Endpoint Configuration

**Source:** `mobile/src/config/api.ts`

### Base Configuration
- **Base URL:** `https://api.geoleap.app`
- **Timeout:** 10 seconds (production), 15 seconds (development)
- **Retry Attempts:** 3 with exponential backoff
- **Retry Delay:** 1 second (base)
- **Client Platform:** `mobile`
- **Auth Mode:** `header` (Bearer token)

---

## Authentication Endpoints

**Category:** `endpoints.auth.*`
**Auth Required:** ❌ No (except profile endpoints)

### POST /api/auth/login
**Description:** Login with email and password
**Source:** `authService.ts:118`, `api/AuthService.ts:81`
**Auth:** No (public endpoint)
**Request Body:**
```typescript
{
  email: string;
  password: string;
  rememberMe?: boolean;
}
```
**Response (200):**
```typescript
{
  success: true;
  data: {
    tokens: {
      accessToken: string;
      refreshToken: string;
      expiresAt: number;
      tokenType: 'Bearer';
    };
    user: User;
  }
}
```
**Error Codes:**
- `401` - Invalid email or password
- `429` - Too many login attempts
- `422` - Validation failed

---

### POST /api/auth/register
**Description:** Register new user account
**Source:** `authService.ts:336`, `api/AuthService.ts:121`
**Auth:** No (public endpoint)
**Request Body:**
```typescript
{
  email: string;
  password: string;
  firstName: string;
  lastName?: string;
}
```
**Response (200):**
```typescript
{
  success: true;
  data: {
    tokens: AuthTokens;
    user: User;
  }
}
```
**Error Codes:**
- `409` - Email already exists
- `422` - Validation failed

---

### POST /api/auth/logout
**Description:** Logout and invalidate tokens
**Source:** `authService.ts:168`, `api/AuthService.ts:203`
**Auth:** Yes (Bearer token)
**Request Body:** `{}` (empty)
**Response (200):**
```typescript
{
  success: true;
}
```
**Notes:**
- Continues with local token cleanup even if API call fails
- Clears AsyncStorage tokens
- Disables biometric auth if enabled

---

### POST /api/auth/refresh
**Description:** Refresh authentication tokens
**Source:** `authService.ts:298`
**Auth:** No (uses refresh token)
**Request Body:**
```typescript
{
  refreshToken: string;
}
```
**Response (200):**
```typescript
{
  success: true;
  data: {
    tokens: AuthTokens;
  }
}
```
**Error Codes:**
- `401` - Invalid or expired refresh token
- **Auto-logout:** Yes (on 401)

---

### POST /api/auth/reset-password
**Description:** Reset password with token from email
**Source:** `authService.ts:380`, `api/AuthService.ts:314`
**Auth:** No (public endpoint)
**Request Body:**
```typescript
{
  token: string;
  newPassword: string;
}
```
**Response (200):**
```typescript
{
  success: true;
}
```
**Error Codes:**
- `404` - Invalid or expired reset token
- `429` - Too many reset attempts

---

### POST /api/auth/forgot-password
**Description:** Request password reset email
**Source:** `api/AuthService.ts:288`
**Auth:** No (public endpoint)
**Request Body:**
```typescript
{
  email: string;
}
```
**Response (200):**
```typescript
{
  success: true;
  message: 'Password reset email sent';
}
```

---

### GET /api/auth/profile
**Description:** Get current authenticated user profile
**Source:** `authService.ts:226`, `api/AuthService.ts:242`
**Auth:** Yes (Bearer token)
**Response (200):**
```typescript
{
  success: true;
  data: User;
}
```
**Error Codes:**
- `401` - Not authenticated
- **Cache:** Used for `isAuthenticated()` validation

---

### PATCH /api/auth/profile
**Description:** Update user profile
**Source:** `api/AuthService.ts:263`
**Auth:** Yes (Bearer token)
**Request Body:**
```typescript
Partial<User>
```
**Response (200):**
```typescript
{
  success: true;
  data: User;
}
```

---

### ~~POST /api/auth/verify-email~~ ⚠️ DEPRECATED
**Description:** Email verification (no longer required)
**Status:** **REMOVED** from backend 2025-11-06
**Migration:** Users are auto-verified on registration (`EmailConfirmed = true`)
**Response:** `404 Not Found`
**Notes:** Kept in `endpoints` config for backward compatibility

---

## Social Authentication Endpoints

**Category:** `endpoints.social.*`
**Auth Required:** ❌ No (OAuth flow)

### POST /api/socialauth/authenticate
**Description:** Authenticate with OAuth provider (Google, Apple, Facebook)
**Source:** `api/AuthService.ts:166`
**Auth:** No (public endpoint)
**Request Body:**
```typescript
{
  provider: 'Google' | 'Apple' | 'Facebook';
  token: string; // OAuth ID token
  userInfo?: {
    id: string;
    email?: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
  };
}
```
**Response (200):**
```typescript
{
  success: true;
  data: {
    tokens: AuthTokens;
    user: User;
  }
}
```
**Notes:**
- Google: Uses `@react-native-google-signin/google-signin`
- Apple: Uses `@invertase/react-native-apple-authentication`
- Biometric auth enabled by default for social logins

---

### POST /api/socialauth/google
**Description:** Google-specific OAuth endpoint
**Source:** `endpoints.social.google`
**Auth:** No (public endpoint)
**Status:** Available but `authenticate` endpoint is preferred

---

### POST /api/socialauth/apple
**Description:** Apple-specific OAuth endpoint
**Source:** `endpoints.social.apple`
**Auth:** No (public endpoint)
**Status:** Available but `authenticate` endpoint is preferred

---

## User Management Endpoints

**Category:** `endpoints.users.*`
**Auth Required:** ✅ Yes (all endpoints)

### GET /api/user-profile
**Description:** Get authenticated user profile
**Source:** `userService.ts:127`
**Auth:** Yes (Bearer token)
**Response (200):**
```typescript
{
  success: true;
  data: {
    profile: UserProfile;
  }
}
```
**Notes:**
- Backend uses **hyphenated** `/api/user-profile`, NOT `/api/users/profile`
- Cache TTL: 5 minutes
- Offline fallback: Yes

---

### PUT /api/user-profile
**Description:** Update user profile information
**Source:** `userService.ts:177`
**Auth:** Yes (Bearer token)
**Request Body:**
```typescript
Partial<UserProfile>
```
**Response (200):**
```typescript
{
  success: true;
  data: {
    profile: UserProfile;
  }
}
```
**Cache Invalidation:** Yes (clears profile cache)

---

### GET /api/preferences
**Description:** Get user preferences (language, theme, notifications, etc.)
**Source:** `userService.ts:220`
**Auth:** Yes (Bearer token)
**Response (200):**
```typescript
{
  success: true;
  data: {
    preferences: UserPreferences;
  }
}
```
**Cache TTL:** 10 minutes

---

### PUT /api/preferences
**Description:** Update user preferences
**Source:** `userService.ts:273`
**Auth:** Yes (Bearer token)
**Request Body:**
```typescript
Partial<UserPreferences>
```
**Response (200):**
```typescript
{
  success: true;
  data: {
    preferences: UserPreferences;
  }
}
```

---

### GET /api/users/:userId/stats
**Description:** Get user statistics (watching history, favorites, etc.)
**Source:** `userService.ts:323`
**Auth:** Yes (Bearer token)
**Response (200):**
```typescript
{
  success: true;
  data: {
    stats: UserStats;
  }
}
```

---

### GET /api/users/:userId/activity
**Description:** Get user activity feed
**Source:** `userService.ts:369`
**Auth:** Yes (Bearer token)
**Response (200):**
```typescript
{
  success: true;
  data: {
    activities: UserActivity[];
  }
}
```

---

### DELETE /api/users/account
**Description:** Delete user account (GDPR compliance)
**Source:** `userService.ts:434`
**Auth:** Yes (Bearer token)
**Response (200):**
```typescript
{
  success: true;
  message: 'Account deleted successfully';
}
```
**Notes:** Irreversible operation

---

## Watchlist Endpoints

**Category:** `endpoints.users.watchlist`, `endpoints.streaming.watchlist`
**Auth Required:** ✅ Yes

### GET /api/watchlist
**Description:** Get all user watchlists
**Source:** `WatchlistService.ts:84`
**Auth:** Yes (Bearer token)
**Response (200):**
```typescript
{
  success: true;
  data: {
    watchlists: Watchlist[];
  }
}
```
**Cache TTL:** 5 minutes
**Offline Fallback:** Yes (cache)

---

### GET /api/watchlist/:id
**Description:** Get specific watchlist by ID
**Source:** `WatchlistService.ts:114`
**Auth:** Yes (Bearer token)
**Response (200):**
```typescript
{
  success: true;
  data: {
    watchlist: Watchlist;
  }
}
```

---

### POST /api/watchlist
**Description:** Create new watchlist
**Source:** `WatchlistService.ts:147`
**Auth:** Yes (Bearer token)
**Request Body:**
```typescript
{
  name: string;
  description?: string;
  isPublic: boolean;
}
```
**Response (201):**
```typescript
{
  success: true;
  data: {
    watchlist: Watchlist;
  }
}
```

---

### PUT /api/watchlist/:id
**Description:** Update watchlist metadata
**Source:** `WatchlistService.ts:176`
**Auth:** Yes (Bearer token)
**Request Body:**
```typescript
Partial<Watchlist>
```
**Response (200):**
```typescript
{
  success: true;
  data: {
    watchlist: Watchlist;
  }
}
```

---

### DELETE /api/watchlist/:id
**Description:** Delete watchlist
**Source:** `WatchlistService.ts:201`
**Auth:** Yes (Bearer token)
**Response (204):** No content

---

### POST /api/streaming/watchlist/:watchlistId/items
**Description:** Add content item to watchlist
**Source:** `WatchlistService.ts:223`
**Auth:** Yes (Bearer token)
**Request Body:**
```typescript
{
  contentId: string;
  contentType: 'movie' | 'show';
  title: string;
  posterUrl?: string;
}
```
**Response (201):**
```typescript
{
  success: true;
  data: {
    item: WatchlistItem;
  }
}
```

---

### PUT /api/streaming/watchlist/:watchlistId/items/:itemId
**Description:** Update watchlist item (e.g., mark as watched)
**Source:** `WatchlistService.ts:248`
**Auth:** Yes (Bearer token)
**Request Body:**
```typescript
Partial<WatchlistItem>
```
**Response (200):**
```typescript
{
  success: true;
  data: {
    item: WatchlistItem;
  }
}
```

---

### DELETE /api/streaming/watchlist/:watchlistId/items/:itemId
**Description:** Remove item from watchlist
**Source:** `WatchlistService.ts:273`
**Auth:** Yes (Bearer token)
**Response (204):** No content

---

### GET /api/users/:userId/watchlist-stats
**Description:** Get watchlist statistics
**Source:** `WatchlistService.ts:286`
**Auth:** Yes (Bearer token)
**Response (200):**
```typescript
{
  success: true;
  data: WatchlistStats;
}
```

---

### GET /api/watchlists/search
**Description:** Search across all watchlists
**Source:** `WatchlistService.ts:313`
**Auth:** Yes (Bearer token)
**Query Parameters:**
- `query` (required): Search query
- `genre` (optional): Filter by genre
- `type` (optional): 'movie' | 'show'
- `status` (optional): 'watched' | 'unwatched'
- `rating` (optional): Minimum rating (1-10)

**Response (200):**
```typescript
{
  success: true;
  data: WatchlistItem[];
}
```

---

### POST /api/watchlist/:watchlistId/share
**Description:** Generate shareable link for watchlist
**Source:** `WatchlistService.ts:331`
**Auth:** Yes (Bearer token)
**Response (200):**
```typescript
{
  success: true;
  data: {
    shareCode: string;
  }
}
```

---

### POST /api/watchlist/import
**Description:** Import shared watchlist
**Source:** `WatchlistService.ts:349`
**Auth:** Yes (Bearer token)
**Request Body:**
```typescript
{
  shareCode: string;
}
```
**Response (200):**
```typescript
{
  success: true;
  data: {
    watchlist: Watchlist;
  }
}
```

---

## Streaming Content Endpoints

**Category:** `endpoints.streaming.*`
**Auth Required:** ✅ Yes

### GET /api/streaming/search
**Description:** Search for streaming content (movies, TV shows)
**Source:** `searchService.ts:232`
**Auth:** Yes (Bearer token)
**Query Parameters:**
- `query` (required): Search query
- `type` (optional): 'movie' | 'show' | 'all'
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 20)

**Response (200):**
```typescript
{
  success: true;
  data: {
    results: SearchResult[];
    total: number;
  }
}
```
**Cache TTL:** 5 minutes

---

### GET /api/streaming/search/suggest
**Description:** Get search suggestions and trending queries
**Source:** `searchService.ts:131`
**Auth:** Yes (Bearer token)
**Query Parameters:**
- `query` (optional): Partial query for autocomplete

**Response (200):**
```typescript
{
  success: true;
  data: {
    suggestions: string[];
    trending: string[];
  }
}
```

---

### GET /api/streaming/details
**Description:** Get detailed content information
**Source:** `endpoints.streaming.details`
**Auth:** Yes (Bearer token)
**Query Parameters:**
- `id` (required): Content ID
- `type` (required): 'movie' | 'show'

**Response (200):**
```typescript
{
  success: true;
  data: ContentDetails;
}
```

---

### GET /api/streaming/recommendations
**Description:** Get personalized content recommendations
**Source:** `endpoints.streaming.recommendations`
**Auth:** Yes (Bearer token)
**Response (200):**
```typescript
{
  success: true;
  data: Recommendation[];
}
```
**Notes:** Uses ML-based personalization engine

---

## Recommendations Endpoints

**Auth Required:** ✅ Yes

### GET /recommendations
**Description:** Get personalized recommendations with filters
**Source:** `RecommendationService.ts:99`
**Auth:** Yes (Bearer token)
**Query Parameters:**
- `userId` (required): User ID
- `count` (optional): Number of recommendations (default: 10)
- `filters` (optional): JSON stringified filters
- `context` (optional): JSON stringified context

**Response (200):**
```typescript
{
  success: true;
  data: Recommendation[];
}
```
**Cache TTL:** 10 minutes
**Offline Fallback:** Yes (cache)

---

### GET /recommendations/trending
**Description:** Get trending recommendations
**Source:** `RecommendationService.ts:127`
**Auth:** Yes (Bearer token)
**Query Parameters:**
- `genre` (optional): Filter by genre

**Response (200):**
```typescript
{
  success: true;
  data: Recommendation[];
}
```

---

### GET /recommendations/friends
**Description:** Get recommendations from friends
**Source:** `RecommendationService.ts:142`
**Auth:** Yes (Bearer token)
**Response (200):**
```typescript
{
  success: true;
  data: Recommendation[];
}
```

---

### GET /recommendations/similar/:contentId
**Description:** Get similar content recommendations
**Source:** `RecommendationService.ts:159`
**Auth:** Yes (Bearer token)
**Response (200):**
```typescript
{
  success: true;
  data: Recommendation[];
}
```

---

### GET /recommendations/because-you-watched/:contentId
**Description:** "Because you watched" recommendations
**Source:** `RecommendationService.ts:176`
**Auth:** Yes (Bearer token)
**Response (200):**
```typescript
{
  success: true;
  data: Recommendation[];
}
```

---

### PUT /recommendations/preferences/:userId
**Description:** Update user recommendation preferences
**Source:** `RecommendationService.ts:193`
**Auth:** Yes (Bearer token)
**Request Body:**
```typescript
Partial<UserPreferences>
```
**Response (200):**
```typescript
{
  success: true;
  data: {
    preferences: UserPreferences;
  }
}
```

---

### GET /recommendations/preferences/:userId
**Description:** Get user recommendation preferences
**Source:** `RecommendationService.ts:209`
**Auth:** Yes (Bearer token)
**Response (200):**
```typescript
{
  success: true;
  data: UserPreferences;
}
```

---

### POST /recommendations/feedback
**Description:** Record user feedback on recommendations
**Source:** `RecommendationService.ts:239`
**Auth:** Yes (Bearer token)
**Request Body:**
```typescript
{
  recommendationId: string;
  feedback: 'like' | 'dislike' | 'not-interested';
}
```
**Response (200):**
```typescript
{
  success: true;
}
```

---

### POST /recommendations/refresh/:userId
**Description:** Force refresh recommendations
**Source:** `RecommendationService.ts:263`
**Auth:** Yes (Bearer token)
**Response (200):**
```typescript
{
  success: true;
  data: Recommendation[];
}
```

---

### GET /recommendations/insights/:userId
**Description:** Get personalized recommendation insights
**Source:** `RecommendationService.ts:285`
**Auth:** Yes (Bearer token)
**Response (200):**
```typescript
{
  success: true;
  data: {
    totalRecommendations: number;
    topGenres: string[];
    watchPatterns: object;
  }
}
```

---

## Analytics Endpoints

**Auth Required:** ✅ Yes
**Category:** User behavior and content insights

### POST /analytics/viewing-sessions
**Description:** Track viewing session start
**Source:** `UserAnalyticsService.ts:108`
**Auth:** Yes (Bearer token)
**Request Body:**
```typescript
{
  contentId: string;
  contentType: 'movie' | 'show';
  sessionId: string;
  startTime: string; // ISO 8601
}
```
**Response (201):**
```typescript
{
  success: true;
}
```
**Offline Queue:** Yes (queued if offline, synced when online)

---

### PUT /analytics/viewing-sessions/:sessionId
**Description:** Update viewing session (progress, completion)
**Source:** `UserAnalyticsService.ts:135`
**Auth:** Yes (Bearer token)
**Request Body:**
```typescript
{
  progress: number; // 0-100
  endTime?: string; // ISO 8601
  completed?: boolean;
}
```
**Response (200):**
```typescript
{
  success: true;
}
```

---

### GET /analytics/viewing-stats/:userId
**Description:** Get user viewing statistics
**Source:** `UserAnalyticsService.ts:163`
**Auth:** Yes (Bearer token)
**Query Parameters:**
- `period` (optional): 'week' | 'month' | 'year' | 'all'

**Response (200):**
```typescript
{
  success: true;
  data: ViewingStats;
}
```
**Cache TTL:** 5 minutes

---

### GET /analytics/viewer-profile/:userId
**Description:** Get comprehensive viewer profile
**Source:** `UserAnalyticsService.ts:178`
**Auth:** Yes (Bearer token)
**Response (200):**
```typescript
{
  success: true;
  data: ViewerProfile;
}
```

---

### GET /analytics/content-insights/:contentId
**Description:** Get analytics for specific content
**Source:** `UserAnalyticsService.ts:195`
**Auth:** Yes (Bearer token)
**Response (200):**
```typescript
{
  success: true;
  data: ContentInsight;
}
```

---

### GET /analytics/personalized-insights/:userId
**Description:** Get personalized viewing insights
**Source:** `UserAnalyticsService.ts:234`
**Auth:** Yes (Bearer token)
**Response (200):**
```typescript
{
  success: true;
  data: {
    watchTime: number;
    favoriteGenres: string[];
    recommendations: Recommendation[];
  }
}
```

---

### GET /analytics/export/:userId
**Description:** Export user analytics data (GDPR compliance)
**Source:** `UserAnalyticsService.ts:318`
**Auth:** Yes (Bearer token)
**Query Parameters:**
- `format` (optional): 'json' | 'csv' | 'pdf'

**Response (200):**
```typescript
{
  success: true;
  data: any; // Format-dependent
}
```

---

### DELETE /analytics/user-data/:userId
**Description:** Delete user analytics data (GDPR compliance)
**Source:** `UserAnalyticsService.ts:335`
**Auth:** Yes (Bearer token)
**Response (204):** No content

---

## VPN & Streaming Availability Endpoints

**Auth Required:** ✅ Yes
**Category:** VPN guidance and content availability

### GET /api/streaming-availability/availability
**Description:** Get streaming availability for content in specific region
**Source:** Legacy (via apiClient.ts.txt)
**Auth:** Yes (Bearer token)
**Query Parameters:**
- `region` (required): ISO country code
- `content` (optional): Content ID

**Response (200):**
```typescript
{
  success: true;
  data: StreamingAvailability[];
}
```

---

### GET /api/streaming-availability/search/by-title
**Description:** Search content by title with availability
**Source:** Legacy (via apiClient.ts.txt)
**Auth:** Yes (Bearer token)
**Query Parameters:**
- `title` (required): Search title
- `contentType` (optional): 'movie' | 'show'
- `countries` (optional): Array of ISO country codes
- `page` (optional): Page number
- `pageSize` (optional): Results per page

**Response (200):**
```typescript
{
  success: true;
  data: SearchResult[];
  pagination: PaginationInfo;
}
```

---

### GET /api/streaming-availability/by-id
**Description:** Get content availability by ID
**Source:** Legacy (via apiClient.ts.txt)
**Auth:** Yes (Bearer token)
**Query Parameters:**
- `id` (required): Content ID
- `contentType` (required): 'movie' | 'show'

**Response (200):**
```typescript
{
  success: true;
  data: ContentAvailability;
}
```

---

### GET /api/vpnguidance/countries-for-content/:contentId
**Description:** Get recommended VPN countries for specific content
**Source:** `useCountriesForContent.ts` (migrated)
**Auth:** Yes (Bearer token)
**Query Parameters:**
- `audioLanguages` (array): Preferred audio languages
- `subtitleLanguages` (array): Preferred subtitle languages

**Response (200):**
```typescript
{
  success: true;
  data: {
    countries: VpnCountryRecommendation[];
  }
}
```
**Notes:** Country-first approach for VPN selection

---

### GET /api/vpnguidance/providers
**Description:** Get all VPN providers
**Source:** Legacy (via apiClient.ts.txt)
**Auth:** Yes (Bearer token)
**Response (200):**
```typescript
{
  success: true;
  data: VpnProvider[];
}
```

---

### GET /api/vpnguidance/providers/:providerId
**Description:** Get detailed VPN provider information
**Source:** Legacy (via apiClient.ts.txt)
**Auth:** Yes (Bearer token)
**Response (200):**
```typescript
{
  success: true;
  data: VpnProviderDetails;
}
```

---

## Subscription Management Endpoints

**Auth Required:** ✅ Yes
**Category:** User streaming service subscriptions

### GET /api/usersubscriptions
**Description:** Get all user streaming subscriptions
**Source:** `useSubscriptions.ts` (migrated)
**Auth:** Yes (Bearer token)
**Response (200):**
```typescript
{
  success: true;
  data: UserSubscription[];
}
```
**Cache TTL:** 5 minutes

---

### GET /api/usersubscriptions/:serviceId
**Description:** Get specific subscription details
**Source:** Legacy (via apiClient.ts.txt)
**Auth:** Yes (Bearer token)
**Response (200):**
```typescript
{
  success: true;
  data: UserSubscription;
}
```

---

### POST /api/usersubscriptions
**Description:** Add new streaming subscription
**Source:** Legacy (via apiClient.ts.txt)
**Auth:** Yes (Bearer token)
**Request Body:**
```typescript
{
  serviceId: string;
  planType: string;
  subscriptionDate: string;
}
```
**Response (201):**
```typescript
{
  success: true;
  data: UserSubscription;
}
```

---

### PUT /api/usersubscriptions/:serviceId
**Description:** Update existing subscription
**Source:** Legacy (via apiClient.ts.txt)
**Auth:** Yes (Bearer token)
**Request Body:**
```typescript
Partial<UserSubscription>
```
**Response (200):**
```typescript
{
  success: true;
  data: UserSubscription;
}
```

---

### DELETE /api/usersubscriptions/:serviceId
**Description:** Remove subscription
**Source:** Legacy (via apiClient.ts.txt)
**Auth:** Yes (Bearer token)
**Response (204):** No content

---

### GET /api/usersubscriptions/:serviceId/check
**Description:** Check subscription status and validate
**Source:** Legacy (via apiClient.ts.txt)
**Auth:** Yes (Bearer token)
**Response (200):**
```typescript
{
  success: true;
  data: {
    isActive: boolean;
    expiresAt?: string;
  }
}
```

---

### GET /api/usersubscriptions/service-ids
**Description:** Get list of subscribed service IDs
**Source:** Legacy (via apiClient.ts.txt)
**Auth:** Yes (Bearer token)
**Response (200):**
```typescript
{
  success: true;
  data: string[];
}
```

---

## Health & System Endpoints

**Auth Required:** ❌ No (public)

### GET /api/health
**Description:** API health check endpoint
**Auth:** No (public endpoint)
**Response (200):**
```typescript
{
  status: 'healthy';
  timestamp: string;
  version: string;
}
```
**Notes:** Used by `ApiService` for connectivity verification

---

## SignalR Real-Time Endpoints

**Category:** Real-time features
**Auth Required:** ✅ Yes (WebSocket token)

### WebSocket /syncHub
**Description:** SignalR hub for real-time data synchronization
**Source:** `SyncService.ts`
**Protocol:** WebSocket (SignalR)
**Auth:** Bearer token in connection query string
**Hub Methods:**
- `NotifyUpdate` - Server → Client: Data update notification
- `RequestSync` - Client → Server: Request data sync
- `BroadcastChange` - Server → All: Broadcast state change

**Connection URL:**
```
wss://api.geoleap.app/syncHub?access_token={token}
```

**Notes:**
- Automatic reconnection enabled
- Token refresh handled automatically
- Used for watchlist sync, recommendation updates, etc.

---

## Error Response Format

All endpoints follow the standardized ApiService error response format:

```typescript
{
  success: false;
  error: {
    message: string;
    code: ApiErrorCode; // NETWORK_ERROR, AUTHENTICATION_ERROR, etc.
    statusCode?: number; // HTTP status code
  }
}
```

### Standard HTTP Error Codes

| Code | Meaning | Auto-Retry | Auto-Logout |
|------|---------|------------|-------------|
| `400` | Bad Request | No | No |
| `401` | Unauthorized | No | Yes |
| `403` | Forbidden | No | No |
| `404` | Not Found | No | No |
| `422` | Validation Failed | No | No |
| `429` | Too Many Requests | Yes | No |
| `500` | Server Error | Yes | No |
| `502` | Bad Gateway | Yes | No |
| `503` | Service Unavailable | Yes | No |

---

## Caching Strategy

**ApiService** implements intelligent caching:

| Endpoint Pattern | Cache TTL | Offline Fallback |
|------------------|-----------|------------------|
| `/api/auth/profile` | 5 minutes | Yes |
| `/api/user-profile` | 5 minutes | Yes |
| `/api/preferences` | 10 minutes | Yes |
| `/api/watchlist` | 5 minutes | Yes |
| `/api/streaming/search` | 5 minutes | Yes |
| `/recommendations` | 10 minutes | Yes |
| `/analytics/viewing-stats` | 5 minutes | Yes |
| POST/PUT/DELETE | No cache | Queued offline |

---

## Offline Queue

**Enabled for:**
- Analytics tracking (viewing sessions)
- Watchlist modifications (add/remove/update)
- User preferences updates
- Recommendation feedback

**Queue Behavior:**
- Requests queued in AsyncStorage when offline
- Auto-synced when connection restored
- Duplicate prevention by request ID
- Maximum queue size: 100 requests

---

## Migration Status Summary

✅ **COMPLETED:**
- All legacy `apiClient.ts` references migrated to `ApiService`
- All legacy `authApiClient.ts` references migrated to `ApiService`
- Legacy files moved to `/mobile/legacy/services/*.txt`
- Zero localhost fallbacks remaining
- Unified error handling and response format
- Comprehensive offline support

🎯 **ACTIVE SERVICES:**
- 13 files using ApiService
- 60+ unique API endpoints documented
- 8 major feature categories
- Real-time SignalR integration

📊 **NEXT STEPS:**
- Phase 5: Verify authentication flow
- Phase 6: Verify error handling standardization
- Phase 7: Create comprehensive tests
- Phase 8: Create integration documentation

---

**Last Audit:** 2025-12-16
**Audited By:** Claude Code API Migration Project
**Total Endpoints:** 60+
**Authentication:** JWT Bearer tokens + OAuth (Google, Apple)
**Real-Time:** SignalR WebSocket (/syncHub)
