# MSW (Mock Service Worker) Integration Guide

## Overview

MSW provides network-level API mocking for React Native Jest tests. Unlike `jest.mock()` which mocks modules at the import level, MSW intercepts actual HTTP requests, allowing tests to exercise real code paths including the HTTP client, interceptors, and error handling.

## Installation

MSW needs to be installed if not already present:

```bash
cd mobile
npm install msw --save-dev
```

## File Structure

```
mobile/src/mocks/
  handlers.ts       - Default API request handlers and mock data
  server.ts         - MSW server setup for Node.js (Jest)
  errorHandlers.ts  - Error scenario handlers for testing failures
  index.ts          - Main export file
  MSW_INTEGRATION.md - This documentation
```

## Integration with setupTests.ts

Add the following to `mobile/src/setupTests.ts`:

```typescript
// Import MSW server
import { server } from './mocks/server';

// ============================================================================
// MSW Server Lifecycle
// ============================================================================

// Start MSW server before all tests
beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'warn', // Warn about requests without handlers
  });
});

// Reset handlers after each test for test isolation
afterEach(() => {
  server.resetHandlers();
});

// Close MSW server after all tests
afterAll(() => {
  server.close();
});
```

## Usage Examples

### Basic Test with Default Handlers

```typescript
import { render, screen, waitFor } from '@testing-library/react-native';
import { mockUser, mockTokens } from '../mocks';
import LoginScreen from '../screens/LoginScreen';

test('successful login displays user name', async () => {
  // Default handlers return mockUser on POST /api/auth/login
  const { getByTestId, getByText } = render(<LoginScreen />);

  fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
  fireEvent.changeText(getByTestId('password-input'), 'password123');
  fireEvent.press(getByTestId('login-button'));

  await waitFor(() => {
    expect(getByText(mockUser.firstName)).toBeTruthy();
  });
});
```

### Testing Error Scenarios

```typescript
import { server } from '../mocks/server';
import { createUnauthorizedHandler, authErrorHandlers } from '../mocks/errorHandlers';

test('shows error message on invalid credentials', async () => {
  // Override default handler with error handler for this test only
  server.use(authErrorHandlers.invalidCredentials);

  const { getByTestId, getByText } = render(<LoginScreen />);

  fireEvent.changeText(getByTestId('email-input'), 'wrong@example.com');
  fireEvent.changeText(getByTestId('password-input'), 'wrongpassword');
  fireEvent.press(getByTestId('login-button'));

  await waitFor(() => {
    expect(getByText(/invalid email or password/i)).toBeTruthy();
  });
});

test('handles network errors gracefully', async () => {
  // Use network error handler
  server.use(createNetworkErrorHandler('/api/auth/login', 'post'));

  const { getByTestId, getByText } = render(<LoginScreen />);

  fireEvent.press(getByTestId('login-button'));

  await waitFor(() => {
    expect(getByText(/network error/i)).toBeTruthy();
  });
});
```

### Testing with Specific Endpoint Handlers

```typescript
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';

test('handles empty search results', async () => {
  // Override search handler to return empty results
  server.use(
    http.get('https://api.geoleap.app/api/streaming/search', () => {
      return HttpResponse.json({
        results: [],
        pagination: {
          page: 1,
          totalPages: 0,
          totalResults: 0,
          hasNextPage: false,
          hasPreviousPage: false,
          pageSize: 20,
        },
        queryTime: 50,
      });
    })
  );

  // Test empty state UI
});
```

### Testing Rate Limiting

```typescript
import { server } from '../mocks/server';
import { createRateLimitHandler } from '../mocks/errorHandlers';

test('shows rate limit message when throttled', async () => {
  server.use(createRateLimitHandler('/api/streaming/search', 'get', 60));

  // Test rate limit UI/handling
});
```

### Testing Slow Responses / Timeouts

```typescript
import { server } from '../mocks/server';
import { createSlowResponseHandler } from '../mocks/errorHandlers';

test('shows loading state for slow API', async () => {
  server.use(createSlowResponseHandler('/api/recommendations', 'get', 5000));

  // Test loading state UI
});
```

## Available Mock Data

```typescript
import {
  mockUser,           // User object
  mockTokens,         // Auth tokens
  mockSearchResults,  // Search results array
  mockWatchlist,      // Watchlist object
  mockRecommendations, // Recommendations array
  mockUserPreferences, // User preferences object
} from '../mocks';
```

## Available Error Handler Collections

| Collection | Description |
|------------|-------------|
| `networkErrorHandlers` | Simulates network failures (offline, DNS) |
| `serverErrorHandlers` | Returns 500 Internal Server Error |
| `unauthorizedHandlers` | Returns 401 Unauthorized |
| `forbiddenHandlers` | Returns 403 Forbidden |
| `validationErrorHandlers` | Returns 400 Bad Request |
| `notFoundHandlers` | Returns 404 Not Found |
| `rateLimitHandlers` | Returns 429 Too Many Requests |
| `slowResponseHandlers` | 30-second delay for timeout testing |
| `emptyResponseHandlers` | Returns empty arrays/data |
| `malformedJsonHandlers` | Returns invalid JSON |
| `wrongContentTypeHandlers` | Returns HTML instead of JSON |

## Handler Factory Functions

Create handlers for specific endpoints:

```typescript
import {
  createNetworkErrorHandler,
  createServerErrorHandler,
  createUnauthorizedHandler,
  createForbiddenHandler,
  createValidationErrorHandler,
  createNotFoundHandler,
  createRateLimitHandler,
  createSlowResponseHandler,
} from '../mocks/errorHandlers';

// Usage
server.use(createNotFoundHandler('/api/watchlist/not-found', 'get'));
server.use(createValidationErrorHandler('/api/auth/register', 'post', {
  email: 'Email already exists',
}));
```

## Auth-Specific Error Handlers

```typescript
import { authErrorHandlers } from '../mocks/errorHandlers';

// Available handlers:
authErrorHandlers.invalidCredentials  // Wrong email/password
authErrorHandlers.accountLocked       // Account locked
authErrorHandlers.emailNotVerified    // Email not verified
authErrorHandlers.expiredToken        // Refresh token expired
```

## Best Practices

1. **Keep native module mocks**: Continue using `jest.mock()` for React Native modules (AsyncStorage, navigation, etc.). MSW only replaces API mocks.

2. **Use `server.use()` for test-specific overrides**: The handlers added via `server.use()` take precedence over default handlers and are automatically reset after each test.

3. **Test real code paths**: MSW lets you test the actual HTTP client code, including interceptors, retry logic, and error handling.

4. **Don't mix MSW with fetch mocks**: Remove any `global.fetch = jest.fn()` or `jest.mock('axios')` in favor of MSW handlers.

5. **Handle async properly**: Use `waitFor()` from testing-library to wait for async operations.

## Gradual Migration

You don't need to migrate all tests at once. MSW can coexist with existing mocks:

1. Add MSW setup to `setupTests.ts`
2. New tests can use MSW handlers
3. Gradually migrate existing tests by removing service mocks
4. Keep native module mocks (`jest.mock('@react-native-async-storage/async-storage')`, etc.)

## Troubleshooting

### "Unhandled request" warnings

Add handlers for the missing endpoints or change `onUnhandledRequest` to `'bypass'`:

```typescript
server.listen({ onUnhandledRequest: 'bypass' });
```

### Handlers not being matched

- Check the URL matches exactly (including base URL and path)
- Check the HTTP method matches
- Check handler order (first match wins)

### Tests timing out

- Ensure MSW server is started in `beforeAll`
- Check if slow response handlers are accidentally applied
- Increase Jest timeout if testing real network delays
