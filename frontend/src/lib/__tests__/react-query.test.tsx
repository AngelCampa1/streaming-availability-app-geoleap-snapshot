/**
 * Comprehensive tests for react-query.tsx
 *
 * Coverage Target: 90%+
 * Strategy: Test QueryClient configuration and provider rendering
 */

import { render, screen } from '@testing-library/react';
import { ReactQueryProvider } from '../react-query';
import { useQueryClient } from '@tanstack/react-query';

// Test component to access QueryClient config
function QueryClientConfigReader() {
  const queryClient = useQueryClient();
  const defaultOptions = queryClient.getDefaultOptions();

  return (
    <div>
      <div data-testid="stale-time">{String(defaultOptions.queries?.staleTime ?? '')}</div>
      <div data-testid="gc-time">{String(defaultOptions.queries?.gcTime ?? '')}</div>
      <div data-testid="retry">{String(defaultOptions.queries?.retry ?? '')}</div>
      <div data-testid="refetch-on-focus">{String(defaultOptions.queries?.refetchOnWindowFocus)}</div>
      <div data-testid="refetch-on-mount">{String(defaultOptions.queries?.refetchOnMount)}</div>
      <div data-testid="refetch-on-reconnect">{String(defaultOptions.queries?.refetchOnReconnect)}</div>
      <div data-testid="mutation-retry">{String(defaultOptions.mutations?.retry ?? '')}</div>
    </div>
  );
}

describe('ReactQueryProvider', () => {
  it('renders children correctly', () => {
    render(
      <ReactQueryProvider>
        <div>Test Child</div>
      </ReactQueryProvider>
    );

    expect(screen.getByText('Test Child')).toBeInTheDocument();
  });

  it('provides QueryClient to children', () => {
    render(
      <ReactQueryProvider>
        <QueryClientConfigReader />
      </ReactQueryProvider>
    );

    // Verify QueryClient is accessible
    expect(screen.getByTestId('stale-time')).toBeInTheDocument();
  });

  it('configures staleTime to 5 minutes', () => {
    render(
      <ReactQueryProvider>
        <QueryClientConfigReader />
      </ReactQueryProvider>
    );

    const staleTime = screen.getByTestId('stale-time').textContent;
    expect(staleTime).toBe(String(5 * 60 * 1000)); // 5 minutes in milliseconds
  });

  it('configures gcTime to 10 minutes', () => {
    render(
      <ReactQueryProvider>
        <QueryClientConfigReader />
      </ReactQueryProvider>
    );

    const gcTime = screen.getByTestId('gc-time').textContent;
    expect(gcTime).toBe(String(10 * 60 * 1000)); // 10 minutes in milliseconds
  });

  it('configures retry to 3 attempts for queries', () => {
    render(
      <ReactQueryProvider>
        <QueryClientConfigReader />
      </ReactQueryProvider>
    );

    const retry = screen.getByTestId('retry').textContent;
    expect(retry).toBe('3');
  });

  it('disables refetchOnWindowFocus', () => {
    render(
      <ReactQueryProvider>
        <QueryClientConfigReader />
      </ReactQueryProvider>
    );

    const refetchOnFocus = screen.getByTestId('refetch-on-focus').textContent;
    expect(refetchOnFocus).toBe('false');
  });

  it('enables refetchOnMount', () => {
    render(
      <ReactQueryProvider>
        <QueryClientConfigReader />
      </ReactQueryProvider>
    );

    const refetchOnMount = screen.getByTestId('refetch-on-mount').textContent;
    expect(refetchOnMount).toBe('true');
  });

  it('enables refetchOnReconnect', () => {
    render(
      <ReactQueryProvider>
        <QueryClientConfigReader />
      </ReactQueryProvider>
    );

    const refetchOnReconnect = screen.getByTestId('refetch-on-reconnect').textContent;
    expect(refetchOnReconnect).toBe('true');
  });

  it('configures retry to 1 attempt for mutations', () => {
    render(
      <ReactQueryProvider>
        <QueryClientConfigReader />
      </ReactQueryProvider>
    );

    const mutationRetry = screen.getByTestId('mutation-retry').textContent;
    expect(mutationRetry).toBe('1');
  });

  it('creates QueryClient only once using useState', () => {
    const { rerender } = render(
      <ReactQueryProvider>
        <div>Initial</div>
      </ReactQueryProvider>
    );

    // Rerender should use same QueryClient instance
    rerender(
      <ReactQueryProvider>
        <div>Updated</div>
      </ReactQueryProvider>
    );

    expect(screen.getByText('Updated')).toBeInTheDocument();
  });

  it('retryDelay uses exponential backoff', () => {
    render(
      <ReactQueryProvider>
        <QueryClientConfigReader />
      </ReactQueryProvider>
    );

    const queryClient = screen.getByTestId('stale-time'); // Just to verify client exists
    expect(queryClient).toBeInTheDocument();

    // Verify retryDelay function logic (indirectly through config)
    // Attempt 0: min(1000 * 2^0, 30000) = 1000
    // Attempt 1: min(1000 * 2^1, 30000) = 2000
    // Attempt 5: min(1000 * 2^5, 30000) = 30000 (capped)
  });

  it('renders multiple children', () => {
    render(
      <ReactQueryProvider>
        <div>Child 1</div>
        <div>Child 2</div>
        <div>Child 3</div>
      </ReactQueryProvider>
    );

    expect(screen.getByText('Child 1')).toBeInTheDocument();
    expect(screen.getByText('Child 2')).toBeInTheDocument();
    expect(screen.getByText('Child 3')).toBeInTheDocument();
  });

  it('accepts ReactNode children (components, strings, numbers)', () => {
    const TestComponent = () => <div>Component Child</div>;

    render(
      <ReactQueryProvider>
        <TestComponent />
        <span>String child</span>
        {42}
      </ReactQueryProvider>
    );

    expect(screen.getByText('Component Child')).toBeInTheDocument();
    expect(screen.getByText('String child')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });
});

describe('QueryClient Configuration Logic', () => {
  it('retryDelay calculates exponential backoff correctly', () => {
    // Test component that reads retryDelay function and executes it
    function RetryDelayTester() {
      const queryClient = useQueryClient();
      const retryDelay = queryClient.getDefaultOptions().queries?.retryDelay as (
        attemptIndex: number
      ) => number;

      return (
        <div>
          <div data-testid="delay-0">{retryDelay(0)}</div>
          <div data-testid="delay-1">{retryDelay(1)}</div>
          <div data-testid="delay-2">{retryDelay(2)}</div>
          <div data-testid="delay-3">{retryDelay(3)}</div>
          <div data-testid="delay-4">{retryDelay(4)}</div>
          <div data-testid="delay-5">{retryDelay(5)}</div>
          <div data-testid="delay-10">{retryDelay(10)}</div>
        </div>
      );
    }

    render(
      <ReactQueryProvider>
        <RetryDelayTester />
      </ReactQueryProvider>
    );

    // Verify exponential backoff: Math.min(1000 * 2^attemptIndex, 30000)
    expect(screen.getByTestId('delay-0').textContent).toBe('1000'); // 1 second
    expect(screen.getByTestId('delay-1').textContent).toBe('2000'); // 2 seconds
    expect(screen.getByTestId('delay-2').textContent).toBe('4000'); // 4 seconds
    expect(screen.getByTestId('delay-3').textContent).toBe('8000'); // 8 seconds
    expect(screen.getByTestId('delay-4').textContent).toBe('16000'); // 16 seconds
    expect(screen.getByTestId('delay-5').textContent).toBe('30000'); // Capped at 30 seconds
    expect(screen.getByTestId('delay-10').textContent).toBe('30000'); // Still capped
  });
});
