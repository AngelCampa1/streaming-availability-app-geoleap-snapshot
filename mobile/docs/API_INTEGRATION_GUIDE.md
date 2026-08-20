# API Integration Guide

**Project**: GeoLeap Mobile App
**Last Updated**: 2025-12-16
**Backend**: https://api.geoleap.app

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Making API Calls](#making-api-calls)
4. [Authentication](#authentication)
5. [Error Handling](#error-handling)
6. [Caching Strategy](#caching-strategy)
7. [Offline Support](#offline-support)
8. [Best Practices](#best-practices)
9. [Common Patterns](#common-patterns)
10. [Troubleshooting](#troubleshooting)

---

## Overview

The GeoLeap mobile app uses a unified **ApiService** for all backend API communication. This service provides:

- ✅ **Automatic authentication** (JWT Bearer tokens)
- ✅ **Comprehensive error handling** with retry logic
- ✅ **Response caching** with configurable TTL
- ✅ **Offline queue** for POST/PUT/DELETE requests
- ✅ **Network monitoring** with quality metrics
- ✅ **Request/response interceptors** for logging and debugging
- ✅ **Type-safe** responses with TypeScript generics

**Architecture:**
```
React Component
      ↓
  Service Layer (WatchlistService, RecommendationService, etc.)
      ↓
   ApiService (unified HTTP client)
      ↓
  HttpClient (axios-based, token management)
      ↓
Backend API (https://api.geoleap.app)
```

---

## Quick Start

### 1. Import ApiService

```typescript
import ApiService from '../services/api/ApiService';
```

### 2. Make a GET Request

```typescript
const response = await ApiService.get<User>('/api/user/profile');

if (!response.success || !response.data) {
  throw new Error(response.error?.message || 'Failed to fetch profile');
}

const user = response.data;
```

### 3. Make a POST Request

```typescript
const response = await ApiService.post<LoginResponse>(
  '/api/auth/login',
  {
    email: 'user@example.com',
    password: 'password123',
  }
);

if (!response.success || !response.data) {
  throw new Error(response.error?.message || 'Login failed');
}

const { user, tokens } = response.data;
```

---

## Making API Calls

### HTTP Methods

ApiService supports all standard HTTP methods:

```typescript
// GET - Fetch data
const getResponse = await ApiService.get<T>(endpoint, options);

// POST - Create new resource
const postResponse = await ApiService.post<T>(endpoint, data, options);

// PUT - Update entire resource
const putResponse = await ApiService.put<T>(endpoint, data, options);

// PATCH - Partial update
const patchResponse = await ApiService.patch<T>(endpoint, data, options);

// DELETE - Remove resource
const deleteResponse = await ApiService.delete<T>(endpoint, options);
```

### Request Options

All methods accept optional `ApiRequestOptions`:

```typescript
interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;       // Additional headers
  body?: any;                             // Request body (for POST/PUT/PATCH)
  params?: Record<string, any>;           // Query parameters
  timeout?: number;                       // Request timeout (default: 10s)
  retryAttempts?: number;                 // Max retries (default: 3)
  skipAuth?: boolean;                     // Skip auth header (default: false)
  skipCache?: boolean;                    // Skip cache lookup (default: false)
  cacheTTL?: number;                      // Cache time-to-live in ms (default: 5min)
  priority?: 'high' | 'normal' | 'low';   // Request priority
}
```

**Example with Options:**

```typescript
const response = await ApiService.get<Movie[]>(
  '/api/streaming/search',
  {
    params: {
      query: 'Inception',
      page: 1,
      limit: 20,
    },
    cacheTTL: 600000, // Cache for 10 minutes
    timeout: 15000,   // 15 second timeout
  }
);
```

### Query Parameters

**Automatic URLSearchParams:**

```typescript
// ApiService handles query parameter serialization
const response = await ApiService.get('/api/search', {
  params: {
    query: 'action movies',
    genre: 'thriller',
    year: 2024,
  },
});

// Results in: /api/search?query=action+movies&genre=thriller&year=2024
```

**Manual URLSearchParams (for complex queries):**

```typescript
const params = new URLSearchParams();
params.append('genres', 'action');
params.append('genres', 'thriller'); // Multiple values
params.append('minRating', '7.5');

const response = await ApiService.get<Movie[]>(
  `/api/movies?${params.toString()}`
);
```

---

## Authentication

### Automatic Token Injection

ApiService **automatically adds** the `Authorization` header to all requests:

```typescript
// You don't need to manually add auth headers!
const response = await ApiService.get<User>('/api/user/profile');

// ApiService internally adds:
// headers: { Authorization: 'Bearer <access_token>' }
```

### Skip Authentication

For public endpoints (login, register, health check):

```typescript
const response = await ApiService.post(
  '/api/auth/login',
  credentials,
  {
    skipAuth: true, // Don't add Authorization header
  }
);
```

### Token Refresh

**Automatic token refresh** happens transparently:

1. Request returns **401 Unauthorized**
2. ApiService **refreshes token** using refresh token
3. ApiService **retries original request** with new token
4. User never sees the error

**Token Refresh Configuration:**

```typescript
// In HttpClient.ts
private readonly REFRESH_TIMEOUT = 30000; // 30 seconds max

// Token is refreshed proactively 5 seconds before expiration
const expirationBuffer = 5000; // 5 seconds
```

**Race Condition Prevention:**

```typescript
// Multiple simultaneous requests won't trigger duplicate refreshes
// Uses mutex pattern with promise tracking
if (this.isRefreshing && this.tokenRefreshPromise) {
  return this.tokenRefreshPromise; // Return existing refresh promise
}
```

---

## Error Handling

### Response Format

**Success Response:**

```typescript
{
  success: true,
  data: T,           // Your typed data
  status: 200,
  statusText: 'OK',
  headers: {...},
  fromCache?: false  // Indicates if served from cache
}
```

**Error Response:**

```typescript
{
  success: false,
  error: {
    code: ApiErrorCode,      // Standardized error code
    message: string,         // User-friendly message
    details?: any            // Optional error details
  },
  status: 400-599,
  statusText: 'Error',
  headers: {...}
}
```

### Error Categories

**8 Standardized Error Codes:**

| Error Code | HTTP Status | Description | Retry? |
|------------|-------------|-------------|--------|
| `NETWORK_ERROR` | 0 | No internet connection | ✅ Yes |
| `TIMEOUT_ERROR` | 408 | Request timed out | ✅ Yes |
| `SERVER_ERROR` | 500-504 | Server error | ✅ Yes |
| `AUTHENTICATION_ERROR` | 401, 403 | Auth failed | ❌ No |
| `VALIDATION_ERROR` | 400, 422 | Invalid input | ❌ No |
| `NOT_FOUND` | 404 | Resource not found | ❌ No |
| `RATE_LIMIT` | 429 | Too many requests | ❌ No |
| `UNKNOWN_ERROR` | Other | Unexpected error | ❌ No |

### Handling Errors

**Recommended Pattern:**

```typescript
async function fetchWatchlist(id: string): Promise<Watchlist> {
  try {
    const response = await ApiService.get<{ watchlist: Watchlist }>(
      `/api/watchlist/${id}`
    );

    // ALWAYS check response.success before accessing data
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to fetch watchlist');
    }

    return response.data.watchlist;
  } catch (error: any) {
    // Log for debugging
    console.error('Error fetching watchlist:', error);

    // Rethrow for UI to handle
    throw error;
  }
}
```

**In React Hooks:**

```typescript
const [data, setData] = useState<Watchlist | null>(null);
const [error, setError] = useState<string | null>(null);
const [loading, setLoading] = useState(false);

const loadWatchlist = async (id: string) => {
  try {
    setLoading(true);
    setError(null);

    const watchlist = await fetchWatchlist(id);
    setData(watchlist);
  } catch (error: any) {
    setError(error.message || 'Failed to load watchlist');
  } finally {
    setLoading(false);
  }
};
```

### Retry Logic

**Automatic Retry with Exponential Backoff:**

```typescript
// ApiService automatically retries on recoverable errors
// Retry attempts: 3 (default, configurable)
// Backoff: 1s → 2s → 4s (max 10s)

// Non-retryable errors (fail immediately):
// - 401 (Authentication failed)
// - 403 (Access forbidden)
// - 404 (Not found)
// - 422 (Validation failed)
// - AbortError (Timeout)

// Retryable errors (3 attempts):
// - NETWORK_ERROR
// - TIMEOUT_ERROR
// - SERVER_ERROR (5xx)
```

**Custom Retry Configuration:**

```typescript
const response = await ApiService.get('/api/data', {
  retryAttempts: 5,     // Override default (3)
  timeout: 20000,       // 20 second timeout
});
```

---

## Caching Strategy

### Automatic Caching

**GET requests** are automatically cached:

```typescript
// First request - hits API
const response1 = await ApiService.get<User>('/api/user/profile');
// response1.fromCache === false

// Second request within 5 minutes - served from cache
const response2 = await ApiService.get<User>('/api/user/profile');
// response2.fromCache === true
```

### Cache Configuration

**Default TTL**: 5 minutes (300,000ms)

**Custom TTL:**

```typescript
const response = await ApiService.get<Movie[]>('/api/trending', {
  cacheTTL: 600000, // Cache for 10 minutes
});
```

**Skip Cache:**

```typescript
const response = await ApiService.get<User>('/api/user/profile', {
  skipCache: true, // Force fresh data from API
});
```

### Cache Invalidation

**Clear All Cache:**

```typescript
await ApiService.clearCache();
```

**Cache Stats:**

```typescript
const stats = await ApiService.getCacheStats();
console.log('Cache size:', stats.size);
```

### When to Use Caching

**✅ Good Use Cases:**
- Movie metadata (rarely changes)
- User preferences (infrequent updates)
- Trending lists (acceptable to be slightly stale)
- Search results (can cache for short period)

**❌ Bad Use Cases:**
- Real-time data (live scores, stock prices)
- User-generated content (comments, posts)
- Authentication tokens (handled separately)
- Payment transactions (must be fresh)

---

## Offline Support

### Offline Detection

ApiService automatically detects network status:

```typescript
// Check network connectivity before making request
const isConnected = await this.networkService.isConnected();

if (!isConnected) {
  // Handle offline scenario
}
```

### Offline Behavior

**GET Requests (when offline):**

```typescript
// 1. Try to return cached data (even if expired)
const response = await ApiService.get<Movie[]>('/api/movies');

if (response.fromCache) {
  // Data served from cache while offline
  console.log('Offline mode: using cached data');
}

// 2. If no cache available, throw NETWORK_ERROR
```

**POST/PUT/DELETE Requests (when offline):**

```typescript
// Requests are queued for when network returns
await ApiService.post('/api/watchlist', newItem);

// OfflineService queues the request
// When back online, queue is automatically processed
```

### Offline Queue

**Queue Behavior:**

1. **Detect offline**: Network unavailable
2. **Queue request**: Store request with metadata
3. **Monitor network**: Watch for connectivity
4. **Auto-process**: Send queued requests when online
5. **Error handling**: Failed requests can be retried

**Queue Configuration:**

```typescript
// In ApiService.ts
await this.offlineService.queueRequest({
  endpoint,
  method,
  headers,
  body,
  params,
  priority: 'normal',   // 'high', 'normal', 'low'
  maxRetries: 3,        // Retry up to 3 times
});
```

### Offline UI Patterns

**Show Offline Indicator:**

```typescript
import { NetworkService } from '../services/api/NetworkService';

const networkService = new NetworkService();
const [isOnline, setIsOnline] = useState(true);

useEffect(() => {
  const checkConnection = async () => {
    const connected = await networkService.isConnected();
    setIsOnline(connected);
  };

  const interval = setInterval(checkConnection, 5000);
  return () => clearInterval(interval);
}, []);

// In UI:
{!isOnline && (
  <Banner type="warning">
    You are offline. Changes will sync when reconnected.
  </Banner>
)}
```

---

## Best Practices

### 1. Always Check `response.success`

```typescript
// ❌ BAD - Assumes success
const user = response.data.user;

// ✅ GOOD - Check success first
if (!response.success || !response.data) {
  throw new Error(response.error?.message || 'Request failed');
}
const user = response.data.user;
```

### 2. Use TypeScript Generics

```typescript
// ❌ BAD - No type safety
const response = await ApiService.get('/api/user');
const user = response.data; // Type: any

// ✅ GOOD - Type-safe
const response = await ApiService.get<User>('/api/user');
const user = response.data; // Type: User
```

### 3. Handle Errors Gracefully

```typescript
// ❌ BAD - Silent failure
try {
  await ApiService.post('/api/data', payload);
} catch (error) {
  // Swallowed error
}

// ✅ GOOD - User feedback
try {
  await ApiService.post('/api/data', payload);
  showSuccessToast('Data saved successfully');
} catch (error: any) {
  showErrorToast(error.message || 'Failed to save data');
  logError(error); // Log for debugging
}
```

### 4. Use Service Layer

```typescript
// ❌ BAD - API calls in components
const MyComponent = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    ApiService.get('/api/data').then(response => {
      setData(response.data);
    });
  }, []);
};

// ✅ GOOD - API calls in service layer
// services/dataService.ts
export const dataService = {
  async getData(): Promise<Data[]> {
    const response = await ApiService.get<Data[]>('/api/data');
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to fetch data');
    }
    return response.data;
  },
};

// components/MyComponent.tsx
const MyComponent = () => {
  const [data, setData] = useState<Data[]>([]);

  useEffect(() => {
    dataService.getData()
      .then(setData)
      .catch(error => console.error(error));
  }, []);
};
```

### 5. Leverage Caching

```typescript
// ❌ BAD - No caching for static data
const response = await ApiService.get('/api/genres', {
  skipCache: true, // Forces fresh fetch every time
});

// ✅ GOOD - Cache static data
const response = await ApiService.get('/api/genres', {
  cacheTTL: 3600000, // Cache for 1 hour
});
```

### 6. Set Appropriate Timeouts

```typescript
// ❌ BAD - Very long timeout
const response = await ApiService.get('/api/data', {
  timeout: 60000, // 60 seconds (too long for mobile)
});

// ✅ GOOD - Reasonable timeout
const response = await ApiService.get('/api/data', {
  timeout: 10000, // 10 seconds (default)
});
```

### 7. Use Query Parameters Correctly

```typescript
// ❌ BAD - Manual string concatenation
const url = `/api/search?q=${query}&page=${page}`;
const response = await ApiService.get(url);

// ✅ GOOD - Use params option
const response = await ApiService.get('/api/search', {
  params: {
    q: query,
    page: page,
  },
});
```

---

## Common Patterns

### Pattern 1: Paginated Requests

```typescript
interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

async function fetchMovies(page: number, pageSize: number = 20): Promise<PaginatedResponse<Movie>> {
  const response = await ApiService.get<PaginatedResponse<Movie>>(
    '/api/movies',
    {
      params: { page, pageSize },
      cacheTTL: 300000, // Cache for 5 minutes
    }
  );

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to fetch movies');
  }

  return response.data;
}
```

### Pattern 2: Search with Debounce

```typescript
import { useState, useEffect } from 'react';
import { debounce } from 'lodash';

const useSearch = (query: string) => {
  const [results, setResults] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }

    const searchDebounced = debounce(async (searchQuery: string) => {
      setLoading(true);
      try {
        const response = await ApiService.get<{ movies: Movie[] }>(
          '/api/search',
          {
            params: { q: searchQuery },
            timeout: 5000, // Short timeout for search
          }
        );

        if (response.success && response.data) {
          setResults(response.data.movies);
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    }, 300);

    searchDebounced(query);

    return () => searchDebounced.cancel();
  }, [query]);

  return { results, loading };
};
```

### Pattern 3: Optimistic Updates

```typescript
async function addToWatchlist(movie: Movie) {
  // 1. Update UI optimistically
  const optimisticWatchlist = [...watchlist, movie];
  setWatchlist(optimisticWatchlist);

  try {
    // 2. Make API call
    const response = await ApiService.post('/api/watchlist', {
      movieId: movie.id,
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to add to watchlist');
    }

    // 3. Success - UI already updated
  } catch (error) {
    // 4. Rollback on error
    setWatchlist(watchlist); // Revert to previous state
    showErrorToast('Failed to add to watchlist');
  }
}
```

### Pattern 4: Infinite Scroll

```typescript
const useInfiniteMovies = () => {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const loadMore = async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const response = await ApiService.get<PaginatedResponse<Movie>>(
        '/api/movies',
        {
          params: { page, pageSize: 20 },
        }
      );

      if (response.success && response.data) {
        setMovies(prev => [...prev, ...response.data.items]);
        setHasMore(response.data.hasMore);
        setPage(prev => prev + 1);
      }
    } catch (error) {
      console.error('Load more error:', error);
    } finally {
      setLoading(false);
    }
  };

  return { movies, loading, hasMore, loadMore };
};
```

### Pattern 5: File Upload with Progress

```typescript
async function uploadAvatar(file: File) {
  const [progress, setProgress] = useState(0);

  try {
    const response = await ApiService.upload<{ avatarUrl: string }>(
      '/api/user/avatar',
      file,
      {
        onProgress: (progress) => {
          setProgress(progress);
        },
        fieldName: 'avatar',
        metadata: {
          userId: currentUser.id,
        },
      }
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Upload failed');
    }

    return response.data.avatarUrl;
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}
```

---

## Troubleshooting

### Problem: Requests Fail with NETWORK_ERROR

**Symptoms:**
- All API calls return `NETWORK_ERROR`
- `response.error.code === 'NETWORK_ERROR'`

**Solutions:**

1. **Check network connection:**
   ```typescript
   const networkService = new NetworkService();
   const isConnected = await networkService.isConnected();
   console.log('Connected:', isConnected);
   ```

2. **Check API URL configuration:**
   ```typescript
   // In .env file
   EXPO_PUBLIC_API_URL=https://api.geoleap.app/api
   ```

3. **Verify backend is running:**
   ```bash
   npm run smoke-test
   ```

### Problem: 401 Unauthorized Errors

**Symptoms:**
- Requests return `401 Unauthorized`
- `response.error.code === 'AUTHENTICATION_ERROR'`

**Solutions:**

1. **Check token expiration:**
   ```typescript
   const tokens = await tokenStorage.getTokens();
   console.log('Token expires at:', tokens?.expiresAt);
   console.log('Current time:', Date.now());
   ```

2. **Manually refresh token:**
   ```typescript
   const httpClient = HttpClient.getInstance();
   await httpClient.clearAuthTokens();
   // User will be redirected to login
   ```

3. **Verify refresh token is valid:**
   ```typescript
   // Refresh tokens expire after 30 days
   // If expired, user must re-authenticate
   ```

### Problem: Cached Data Never Updates

**Symptoms:**
- Same old data returned repeatedly
- `response.fromCache === true` always

**Solutions:**

1. **Clear cache manually:**
   ```typescript
   await ApiService.clearCache();
   ```

2. **Skip cache for request:**
   ```typescript
   const response = await ApiService.get('/api/data', {
     skipCache: true,
   });
   ```

3. **Reduce cache TTL:**
   ```typescript
   const response = await ApiService.get('/api/data', {
     cacheTTL: 60000, // 1 minute instead of 5
   });
   ```

### Problem: Requests Timeout

**Symptoms:**
- Requests fail with `TIMEOUT_ERROR`
- `response.error.code === 'TIMEOUT_ERROR'`

**Solutions:**

1. **Increase timeout:**
   ```typescript
   const response = await ApiService.get('/api/slow-endpoint', {
     timeout: 30000, // 30 seconds
   });
   ```

2. **Check network quality:**
   ```typescript
   const networkService = new NetworkService();
   const quality = await networkService.getConnectionQuality();
   console.log('Network quality:', quality); // 'poor', 'moderate', 'good'
   ```

3. **Use retry logic:**
   ```typescript
   const response = await ApiService.get('/api/data', {
     retryAttempts: 5,
     timeout: 15000,
   });
   ```

### Problem: TypeScript Errors

**Symptoms:**
- `Property 'data' does not exist on type 'ApiResponse<unknown>'`
- Type mismatches

**Solutions:**

1. **Specify generic type:**
   ```typescript
   // ❌ BAD
   const response = await ApiService.get('/api/user');
   const user = response.data.user; // Error

   // ✅ GOOD
   const response = await ApiService.get<{ user: User }>('/api/user');
   const user = response.data.user; // OK
   ```

2. **Check response.success:**
   ```typescript
   if (!response.success || !response.data) {
     throw new Error('Failed');
   }
   // TypeScript now knows response.data exists
   ```

---

## Additional Resources

- **API Endpoints**: See [`API_ENDPOINTS.md`](./API_ENDPOINTS.md)
- **Authentication Flow**: See [`AUTH_FLOW_VERIFICATION.md`](./AUTH_FLOW_VERIFICATION.md)
- **Error Handling**: See [`ERROR_HANDLING_VERIFICATION.md`](./ERROR_HANDLING_VERIFICATION.md)
- **Backend API**: https://api.geoleap.app
- **Smoke Tests**: `npm run smoke-test`

---

## Support

For issues or questions:
- Check documentation first
- Review error logs
- Run smoke tests
- Contact development team

**Last Updated**: 2025-12-16
