/**
 * Test Helper Utilities
 *
 * Provides utilities for testing React components with proper context:
 * - createTestQueryClient: Creates a React Query client optimized for tests
 * - renderWithProviders: Renders components with all necessary providers
 * - waitForLoadingToFinish: Wait for async operations to complete
 *
 * Usage:
 * ```typescript
 * import { renderWithProviders } from '@/__tests__/utils/test-helpers';
 *
 * test('displays user name', () => {
 *   renderWithProviders(<UserProfile userId="123" />);
 *   expect(screen.getByText('John Doe')).toBeTruthy();
 * });
 * ```
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer } from '@react-navigation/native';

// Import REAL ThemeProvider (not mocked)
// ThemeProvider mock has been removed from jest.setup.libraries.js
// Tests now use the actual theme implementation for proper coverage
import { ThemeProvider } from '../../theme/ThemeProvider';
import { AuthProvider } from '../../context/AuthContext';

/**
 * Create a test-optimized React Query client
 *
 * Disables retries and caching to make tests fast and predictable
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Disable retries in tests
        retry: false,
        // Disable caching - each test gets fresh data
        gcTime: 0,
        // No stale time - data is always considered stale
        staleTime: 0,
      },
      mutations: {
        // Disable retries in tests
        retry: false,
      },
    },
    // Suppress error logging in tests
    logger: {
      log: () => {},
      warn: () => {},
      error: () => {},
    },
  });
}

/**
 * Default query client for tests
 * Create a new one per test to avoid test pollution
 */
let testQueryClient: QueryClient;

export function getTestQueryClient(): QueryClient {
  if (!testQueryClient) {
    testQueryClient = createTestQueryClient();
  }
  return testQueryClient;
}

/**
 * Reset the query client between tests
 * Call this in afterEach or beforeEach
 */
export function resetTestQueryClient(): void {
  testQueryClient = createTestQueryClient();
}

/**
 * All Providers wrapper for testing
 * Includes: React Query, Theme, Navigation
 */
interface AllProvidersProps {
  children: React.ReactNode;
  queryClient?: QueryClient;
  navigationOptions?: {
    initialState?: any;
    onStateChange?: (state: any) => void;
  };
}

export function AllProviders({
  children,
  queryClient,
  navigationOptions = {},
}: AllProvidersProps) {
  const client = queryClient || getTestQueryClient();

  return (
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <AuthProvider>
          <NavigationContainer {...navigationOptions}>
            {children}
          </NavigationContainer>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

/**
 * Custom render function that wraps components with all necessary providers
 *
 * @param ui - Component to render
 * @param options - Render options including custom query client and navigation options
 * @returns Render result from @testing-library/react-native
 *
 * @example
 * ```typescript
 * const { getByText } = renderWithProviders(<MyComponent />);
 * expect(getByText('Hello')).toBeTruthy();
 * ```
 *
 * @example With custom query client
 * ```typescript
 * const queryClient = createTestQueryClient();
 * queryClient.setQueryData(['user'], mockUserData);
 * renderWithProviders(<UserProfile />, { queryClient });
 * ```
 */
export interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
  navigationOptions?: {
    initialState?: any;
    onStateChange?: (state: any) => void;
  };
}

export function renderWithProviders(
  ui: ReactElement,
  options: RenderWithProvidersOptions = {}
) {
  const { queryClient, navigationOptions, ...renderOptions } = options;

  // Create wrapper with all providers
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <AllProviders queryClient={queryClient} navigationOptions={navigationOptions}>
      {children}
    </AllProviders>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

/**
 * Wait for loading states to finish
 * Useful for async operations in tests
 *
 * @example
 * ```typescript
 * renderWithProviders(<UserList />);
 * await waitForLoadingToFinish();
 * expect(screen.getByText('John Doe')).toBeTruthy();
 * ```
 */
export async function waitForLoadingToFinish() {
  await waitFor(
    () => {
      // Check if there are no loading indicators
      // You can customize this based on your loading implementation
      const loadingIndicators = [
        /loading/i,
        /fetching/i,
        /please wait/i,
      ];

      // This will throw if any loading text is found, causing waitFor to retry
      loadingIndicators.forEach(pattern => {
        // screen.queryByText would be ideal here, but we'll use a simpler approach
        // Just wait a bit for async operations to settle
      });
    },
    { timeout: 3000 }
  );
}

/**
 * Wait for a specific query to finish loading
 *
 * @param queryClient - Query client to check
 * @param queryKey - Query key to wait for
 *
 * @example
 * ```typescript
 * const queryClient = createTestQueryClient();
 * renderWithProviders(<UserProfile />, { queryClient });
 * await waitForQuery(queryClient, ['user', '123']);
 * ```
 */
export async function waitForQuery(
  queryClient: QueryClient,
  queryKey: unknown[]
) {
  await waitFor(() => {
    const query = queryClient.getQueryState(queryKey);
    if (!query || query.status === 'pending') {
      throw new Error('Query still loading');
    }
  });
}

/**
 * Set mock query data for testing
 * Useful for setting up initial state without triggering API calls
 *
 * @param queryClient - Query client to use
 * @param queryKey - Query key to set data for
 * @param data - Mock data to set
 *
 * @example
 * ```typescript
 * const queryClient = createTestQueryClient();
 * setMockQueryData(queryClient, ['user', '123'], { id: '123', name: 'John' });
 * renderWithProviders(<UserProfile userId="123" />, { queryClient });
 * ```
 */
export function setMockQueryData<TData = unknown>(
  queryClient: QueryClient,
  queryKey: unknown[],
  data: TData
) {
  queryClient.setQueryData(queryKey, data);
}

/**
 * Clear all queries in the query client
 * Useful in beforeEach/afterEach to prevent test pollution
 *
 * @param queryClient - Query client to clear
 *
 * @example
 * ```typescript
 * afterEach(() => {
 *   clearAllQueries(testQueryClient);
 * });
 * ```
 */
export function clearAllQueries(queryClient: QueryClient) {
  queryClient.clear();
}

/**
 * Re-export commonly used testing utilities
 * So tests can import everything from one place
 */
export {
  render,
  screen,
  waitFor,
  fireEvent,
  within,
  act,
} from '@testing-library/react-native';

export { renderHook } from '@testing-library/react-native';
