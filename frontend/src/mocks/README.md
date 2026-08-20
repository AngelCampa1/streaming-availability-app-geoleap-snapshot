# MSW (Mock Service Worker) Infrastructure

This directory contains the MSW setup for network-level API mocking in tests.

## Overview

MSW intercepts HTTP requests at the network level, which means:
- Your actual `fetch` code runs
- Real HTTP requests are intercepted
- Mock responses are returned
- No need to mock `fetch` or API clients

This exercises more of your actual code paths and catches more bugs compared to module-level mocking.

## Structure

```
src/mocks/
  ├── handlers.ts      # API request handlers (organized by domain)
  ├── server.ts        # MSW server for Node.js/Jest tests
  ├── browser.ts       # MSW worker for browser/Storybook (optional)
  ├── testData.ts      # Centralized mock data
  ├── index.ts         # Re-exports for convenience
  └── README.md        # This file
```

## Usage in Tests

### Basic Usage

MSW is automatically started in `jest.setup.js`. Just write your tests normally:

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import SearchComponent from '../SearchComponent';

test('displays search results', async () => {
  render(<SearchComponent />);

  // Type in search box
  await userEvent.type(screen.getByRole('textbox'), 'shawshank');

  // Wait for results (MSW will intercept the API call)
  await waitFor(() => {
    expect(screen.getByText('The Shawshank Redemption')).toBeInTheDocument();
  });
});
```

### Override Handlers for Specific Tests

Use `server.use()` to override handlers for specific test scenarios:

```typescript
import { server, http, HttpResponse } from '@/mocks';

test('handles error state', async () => {
  // Override the search handler for this test
  server.use(
    http.get('/api/search', () => {
      return HttpResponse.json(
        { message: 'Server error' },
        { status: 500 }
      );
    })
  );

  render(<SearchComponent />);
  await userEvent.type(screen.getByRole('textbox'), 'test');

  await waitFor(() => {
    expect(screen.getByText('An error occurred')).toBeInTheDocument();
  });
});
```

### Testing Authentication

```typescript
import { server, http, HttpResponse, mockUser } from '@/mocks';

test('shows logged in state', async () => {
  // Handler returns authenticated user by default
  render(<UserProfile />);

  await waitFor(() => {
    expect(screen.getByText(mockUser.name)).toBeInTheDocument();
  });
});

test('shows logged out state', async () => {
  // Override to return 401
  server.use(
    http.get('/api/auth/me', () => {
      return HttpResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    })
  );

  render(<UserProfile />);

  await waitFor(() => {
    expect(screen.getByText('Please log in')).toBeInTheDocument();
  });
});
```

## Migration from jest.mock(fetch)

If your existing tests use `jest.mock()` or `global.fetch.mockResolvedValue()`, you need to:

### Before (Module Mocking)
```typescript
// This won't work with MSW
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ data: 'test' }),
});
```

### After (MSW)
```typescript
import { server, http, HttpResponse } from '@/mocks';

// Override in the test
server.use(
  http.get('/api/endpoint', () => {
    return HttpResponse.json({ data: 'test' });
  })
);
```

## Adding New Handlers

1. Add your handler to `handlers.ts`:

```typescript
// In handlers.ts
export const newFeatureHandlers = [
  http.get('/api/new-feature', () => {
    return HttpResponse.json(mockNewFeatureData);
  }),
];

// Add to combined handlers
export const handlers = [
  ...authHandlers,
  ...searchHandlers,
  ...newFeatureHandlers,  // Add here
];
```

2. Add mock data to `testData.ts`:

```typescript
// In testData.ts
export const mockNewFeatureData = {
  id: '123',
  name: 'Test Feature',
  // ...
};
```

## Browser Usage (Development)

To use MSW in the browser during development:

1. Initialize the service worker:
```bash
npx msw init public/ --save
```

2. Set environment variable:
```bash
# .env.local
NEXT_PUBLIC_ENABLE_MOCKS=true
```

3. Start MSW in your app:
```typescript
// In _app.tsx or layout.tsx
if (process.env.NEXT_PUBLIC_ENABLE_MOCKS === 'true') {
  const { startMSW } = await import('@/mocks');
  await startMSW();
}
```

## Debugging

If requests are not being intercepted:

1. Check the console for MSW messages
2. Verify the request URL matches the handler pattern
3. Use `onUnhandledRequest: 'warn'` in `server.listen()` to see missed requests

```typescript
beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'warn',
  });
});
```

## Best Practices

1. **Keep handlers realistic** - Use mock data that matches your API contracts
2. **Test error states** - Override handlers to return errors
3. **Reset between tests** - `server.resetHandlers()` is called automatically in `afterEach`
4. **Don't mix with jest.mock(fetch)** - Use one approach per test file
5. **Use delay() sparingly** - Only add delays when testing loading states
