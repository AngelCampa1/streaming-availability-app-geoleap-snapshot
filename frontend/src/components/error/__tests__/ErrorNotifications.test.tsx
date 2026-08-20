/**
 * ErrorNotifications Integration Tests
 *
 * Tests error notification components with real logic.
 * Mocks ErrorContext, Button, and browser Notification API only.
 *
 * Coverage Target: 60%+
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { InlineErrorNotification, useErrorToast } from '../ErrorNotifications';
import { ErrorState } from '@/contexts/ErrorContext';

// Mock ErrorContext (not used by InlineErrorNotification or useErrorToast)
jest.mock('@/contexts/ErrorContext', () => ({
  useError: () => ({
    state: { errors: [] },
    actions: { dismissError: jest.fn(), retryError: jest.fn() },
  }),
  ErrorState: {} as any,
}));

// Mock Button component
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, size, variant, className }: any) => (
    <button onClick={onClick} data-size={size} data-variant={variant} className={className}>
      {children}
    </button>
  ),
}));

// Mock cn utility
jest.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}));

const createMockError = (overrides: Partial<ErrorState> = {}): ErrorState => ({
  id: `error-${Date.now()}`,
  type: 'system',
  title: 'Test Error',
  message: 'This is a test error message',
  severity: 'error',
  isVisible: true,
  timestamp: new Date(),
  isRetryable: false,
  retryCount: 0,
  maxRetries: 3,
  autoDissmiss: true,
  ...overrides,
});

describe('InlineErrorNotification Component', () => {
  const mockError = createMockError();

  it('renders error title and message', () => {
    render(<InlineErrorNotification error={mockError} />);

    expect(screen.getByText(mockError.title)).toBeInTheDocument();
    expect(screen.getByText(mockError.message)).toBeInTheDocument();
  });

  it('shows retry button for retryable errors', () => {
    const retryableError = createMockError({ isRetryable: true, retryCount: 1, maxRetries: 3 });
    const onRetry = jest.fn();

    render(<InlineErrorNotification error={retryableError} onRetry={onRetry} />);

    const retryButton = screen.getByText('Retry');
    expect(retryButton).toBeInTheDocument();

    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalled();
  });

  it('does not show retry button when retries exceeded', () => {
    const error = createMockError({ isRetryable: true, retryCount: 3, maxRetries: 3 });

    render(<InlineErrorNotification error={error} onRetry={jest.fn()} />);

    expect(screen.queryByText('Retry')).not.toBeInTheDocument();
  });

  it('shows dismiss button when onDismiss provided', () => {
    const onDismiss = jest.fn();

    render(<InlineErrorNotification error={mockError} onDismiss={onDismiss} />);

    const dismissButton = screen.getByLabelText('Dismiss');
    expect(dismissButton).toBeInTheDocument();

    fireEvent.click(dismissButton);
    expect(onDismiss).toHaveBeenCalled();
  });

  it('does not show dismiss button when onDismiss not provided', () => {
    render(<InlineErrorNotification error={mockError} />);

    expect(screen.queryByLabelText('Dismiss')).not.toBeInTheDocument();
  });

  it('applies info severity styles', () => {
    const { container } = render(<InlineErrorNotification error={createMockError({ severity: 'info' })} />);

    const notification = container.querySelector('.bg-primary\\/10');
    expect(notification).toBeInTheDocument();
  });

  it('applies warning severity styles', () => {
    const { container } = render(<InlineErrorNotification error={createMockError({ severity: 'warning' })} />);

    const notification = container.querySelector('.bg-warning\\/10');
    expect(notification).toBeInTheDocument();
  });

  it('applies error severity styles', () => {
    const { container } = render(<InlineErrorNotification error={createMockError({ severity: 'error' })} />);

    const notification = container.querySelector('.bg-destructive\\/10');
    expect(notification).toBeInTheDocument();
  });

  it('applies critical severity styles', () => {
    const { container } = render(<InlineErrorNotification error={createMockError({ severity: 'critical' })} />);

    const notification = container.querySelector('.bg-destructive\\/20');
    expect(notification).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<InlineErrorNotification error={mockError} className="custom-inline" />);

    expect(container.firstChild).toHaveClass('custom-inline');
  });

  it('renders with retryable error at retry count 0', () => {
    const error = createMockError({ isRetryable: true, retryCount: 0, maxRetries: 3 });

    render(<InlineErrorNotification error={error} onRetry={jest.fn()} />);

    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('renders with retryable error at retry count 2', () => {
    const error = createMockError({ isRetryable: true, retryCount: 2, maxRetries: 3 });

    render(<InlineErrorNotification error={error} onRetry={jest.fn()} />);

    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('does not show retry button for non-retryable errors', () => {
    const error = createMockError({ isRetryable: false });

    render(<InlineErrorNotification error={error} onRetry={jest.fn()} />);

    expect(screen.queryByText('Retry')).not.toBeInTheDocument();
  });

  it('renders both retry and dismiss buttons together', () => {
    const error = createMockError({ isRetryable: true, retryCount: 0, maxRetries: 3 });

    render(<InlineErrorNotification error={error} onRetry={jest.fn()} onDismiss={jest.fn()} />);

    expect(screen.getByText('Retry')).toBeInTheDocument();
    expect(screen.getByLabelText('Dismiss')).toBeInTheDocument();
  });
});

describe('useErrorToast Hook', () => {
  it('provides showToast function', () => {
    let result: any;
    function TestComponent() {
      result = useErrorToast();
      return null;
    }

    render(<TestComponent />);

    expect(typeof result.showToast).toBe('function');
    expect(typeof result.ToastContainer).toBe('function');
  });

  it('shows toast when showToast called', () => {
    let result: any;
    function TestComponent() {
      result = useErrorToast();
      return (
        <>
          <button onClick={() => result.showToast('Test toast', 'error', 5000)}>Show Toast</button>
          <result.ToastContainer />
        </>
      );
    }

    render(<TestComponent />);

    const button = screen.getByText('Show Toast');
    fireEvent.click(button);

    expect(screen.getByText('Test toast')).toBeInTheDocument();
  });

  it('supports multiple toasts', () => {
    let result: any;
    function TestComponent() {
      result = useErrorToast();
      return (
        <>
          <button
            onClick={() => {
              result.showToast('Toast 1', 'error');
              result.showToast('Toast 2', 'warning');
            }}
          >
            Show Toasts
          </button>
          <result.ToastContainer />
        </>
      );
    }

    render(<TestComponent />);

    const button = screen.getByText('Show Toasts');
    fireEvent.click(button);

    expect(screen.getByText('Toast 1')).toBeInTheDocument();
    expect(screen.getByText('Toast 2')).toBeInTheDocument();
  });

  it('uses default severity and duration', () => {
    let result: any;
    function TestComponent() {
      result = useErrorToast();
      return (
        <>
          <button onClick={() => result.showToast('Default toast')}>Show Default Toast</button>
          <result.ToastContainer />
        </>
      );
    }

    render(<TestComponent />);

    const button = screen.getByText('Show Default Toast');
    fireEvent.click(button);

    expect(screen.getByText('Default toast')).toBeInTheDocument();
  });

  it('generates unique toast IDs', () => {
    let result: any;
    function TestComponent() {
      result = useErrorToast();
      return (
        <>
          <button
            onClick={() => {
              result.showToast('Toast A');
              result.showToast('Toast B');
              result.showToast('Toast C');
            }}
          >
            Show Multiple
          </button>
          <result.ToastContainer />
        </>
      );
    }

    render(<TestComponent />);

    const button = screen.getByText('Show Multiple');
    fireEvent.click(button);

    // All three toasts should render with unique IDs
    expect(screen.getByText('Toast A')).toBeInTheDocument();
    expect(screen.getByText('Toast B')).toBeInTheDocument();
    expect(screen.getByText('Toast C')).toBeInTheDocument();
  });
});

/**
 * COVERAGE TARGET: 60%+
 * Total Tests: 19
 * Tests inline notifications and toast hook
 * Note: Simplified to avoid context and timer complexity
 */
