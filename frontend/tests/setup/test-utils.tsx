/**
 * Test Utilities for GeoLeap Frontend
 * Provides optimized test setup patterns for 100% test success rate
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Test Query Client with optimized defaults
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 0,
      gcTime: 0, // Previously cacheTime
    },
    mutations: {
      retry: false,
    },
  },
});

// All Providers Wrapper
interface AllProvidersProps {
  children: React.ReactNode;
}

export function AllProviders({ children }: AllProvidersProps) {
  const [queryClient] = React.useState(() => createTestQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

// Custom render function
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  wrapper?: React.ComponentType<any>;
}

export function customRender(
  ui: ReactElement,
  options: CustomRenderOptions = {}
) {
  const { wrapper = AllProviders, ...renderOptions } = options;

  return render(ui, { wrapper, ...renderOptions });
}

// Async render with act wrapper
export async function renderAsync(
  ui: ReactElement,
  options: CustomRenderOptions = {}
) {
  let result: any;
  
  await act(async () => {
    result = customRender(ui, options);
  });
  
  return result;
}

// Wait for async operations with timeout
export const waitForAsync = async (fn: () => void | Promise<void>, timeout = 5000) => {
  return new Promise<void>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Async operation timed out after ${timeout}ms`));
    }, timeout);

    const execute = async () => {
      try {
        await fn();
        clearTimeout(timeoutId);
        resolve();
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    };

    execute();
  });
};

// Mock factory for consistent API responses
export const createMockResponse = <T,>(data: T, delay = 0): Promise<T> => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(data), delay);
  });
};

// Error boundary for testing error states
export class TestErrorBoundary extends React.Component<
  { children: React.ReactNode; onError?: (error: Error) => void },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return <div data-testid="error-boundary">Test Error: {this.state.error?.message}</div>;
    }

    return this.props.children;
  }
}

// Mock user for testing
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  preferences: {
    theme: 'light' as const,
    notifications: true,
  },
};

// Mock streaming services for testing
export const mockStreamingServices = [
  {
    id: 'netflix',
    name: 'Netflix',
    displayName: 'Netflix',
    type: 'Subscription' as const,
    description: 'Popular streaming service',
    category: 'Subscription',
    isActive: true,
  },
  {
    id: 'hulu',
    name: 'Hulu',
    displayName: 'Hulu',
    type: 'Subscription' as const,
    description: 'TV shows and movies',
    category: 'Subscription',
    isActive: true,
  },
];

// Test cleanup utilities
export const cleanupTest = () => {
  // Clear all timers
  jest.clearAllTimers();
  
  // Clear all mocks
  jest.clearAllMocks();
  
  // Reset modules if needed
  jest.resetModules();
};

// Performance testing utilities
export const measureTestPerformance = async <T,>(
  testFn: () => Promise<T> | T,
  label = 'Test Performance'
): Promise<{ result: T; duration: number }> => {
  const start = performance.now();
  const result = await testFn();
  const duration = performance.now() - start;
  
  console.log(`${label}: ${duration.toFixed(2)}ms`);
  
  return { result, duration };
};

// Re-export everything from testing-library
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';

// Set custom render as default export
export { customRender as render };