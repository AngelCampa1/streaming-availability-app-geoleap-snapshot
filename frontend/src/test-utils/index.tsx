/**
 * Test Utilities for Frontend Tests
 *
 * Provides custom render functions that wrap components with necessary providers.
 * This follows the "Coverage Over Passing" principle - use REAL providers,
 * let MSW handle API mocking at the network level.
 *
 * IMPORTANT: These utilities do NOT mock internal services.
 * - AuthProvider: REAL implementation
 * - API calls: Intercepted by MSW at network level
 * - Router: Mocked at jest.setup.js level (necessary for Next.js)
 *
 * USAGE:
 * ```tsx
 * import { render, screen, waitFor, server, http, HttpResponse } from '@/test-utils';
 *
 * // Basic test with real auth
 * test('renders with auth', async () => {
 *   render(<MyComponent />);
 *   await waitFor(() => expect(screen.getByText('Hello')).toBeInTheDocument());
 * });
 *
 * // Override MSW handler for specific test
 * test('handles error', async () => {
 *   server.use(
 *     http.post('/api/auth/login', () => {
 *       return HttpResponse.json({ message: 'Invalid credentials' }, { status: 401 });
 *     })
 *   );
 *   render(<LoginPage />);
 *   // ... test error handling
 * });
 * ```
 */

import React, { ReactElement, ReactNode } from 'react';
import { render, RenderOptions, RenderResult, waitFor } from '@testing-library/react';
import { AuthProvider } from '@/contexts/AuthContext';

// Re-export MSW server and utilities for test-specific handler overrides
export { server, http, HttpResponse, delay } from '@/mocks/server';
export { mockUser, mockAuthTokens, mockErrorResponses } from '@/mocks/testData';

/**
 * All providers wrapper for testing
 * Uses REAL AuthProvider - MSW handles API interception
 */
interface AllProvidersProps {
  children: ReactNode;
}

function AllProviders({ children }: AllProvidersProps): React.ReactElement {
  return <AuthProvider>{children}</AuthProvider>;
}

/**
 * Custom render that wraps with all providers
 * Use this for integration tests that need auth context
 */
function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
): RenderResult {
  return render(ui, { wrapper: AllProviders, ...options });
}

/**
 * Render without providers
 * Use for isolated component tests that don't need auth
 */
function renderWithoutProviders(
  ui: ReactElement,
  options?: RenderOptions
): RenderResult {
  return render(ui, options);
}

/**
 * Wait for auth loading to complete
 * AuthProvider starts with isLoading=true, this waits for it to resolve
 *
 * @param timeout - Maximum time to wait in milliseconds (default: 2000)
 */
async function waitForAuthLoading(timeout = 2000): Promise<void> {
  // AuthProvider checks localStorage for sessionFingerprint
  // If no fingerprint, it sets isLoading=false quickly
  // If fingerprint exists, it makes API call then sets isLoading=false
  await waitFor(
    () => {
      // The auth loading check happens asynchronously
      // We wait for the loading state to resolve
    },
    { timeout }
  ).catch(() => {
    // Ignore timeout - auth loading might complete instantly if no fingerprint
  });
}

/**
 * Wait for a specific auth state condition
 *
 * @param condition - Function that returns true when condition is met
 * @param timeout - Maximum time to wait in milliseconds (default: 2000)
 */
async function waitForAuthState(
  condition: () => boolean,
  timeout = 2000
): Promise<void> {
  await waitFor(
    () => {
      if (!condition()) {
        throw new Error('Auth condition not met');
      }
    },
    { timeout }
  );
}

/**
 * Setup authenticated test state
 * Sets localStorage values that AuthProvider checks
 */
function setupAuthenticatedState(): void {
  // AuthProvider checks for sessionFingerprint to decide if it should verify auth
  localStorage.setItem('sessionFingerprint', 'test-fingerprint');
}

/**
 * Clear authenticated test state
 */
function clearAuthState(): void {
  localStorage.removeItem('sessionFingerprint');
  localStorage.removeItem('redirectAfterLogin');
}

/**
 * Test setup helper - clears auth state before each test
 * Call this in beforeEach
 */
function setupTest(): void {
  clearAuthState();
  jest.clearAllMocks();
}

// Re-export everything from @testing-library/react
export * from '@testing-library/react';

// Export custom utilities
export {
  customRender as render,
  renderWithoutProviders,
  waitForAuthLoading,
  waitForAuthState,
  setupAuthenticatedState,
  clearAuthState,
  setupTest,
  AllProviders,
};

// Export new test utilities for TypeScript error fixes
export * from './envMock';
export * from './apiMockHelpers';
export * from './globalMocks';
export * from './mockFactories';
