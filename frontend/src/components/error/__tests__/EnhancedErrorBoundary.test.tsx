/**
 * EnhancedErrorBoundary Integration Tests
 *
 * Tests error boundary with real error catching logic.
 * Mocks ErrorMessage, InternalServerErrorPage, and window services only.
 *
 * Coverage Target: 60%+
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  EnhancedErrorBoundary,
  PageErrorBoundary,
  SectionErrorBoundary,
  ComponentErrorBoundary,
  withEnhancedErrorBoundary,
  useErrorBoundaryContext,
  useErrorReporting,
} from '../EnhancedErrorBoundary';

// Mock ErrorMessage
jest.mock('../ErrorMessage', () => ({
  ErrorMessage: ({ title, message, correlationId, actions, details, expandable }: any) => (
    <div data-testid="error-message">
      <div data-testid="error-title">{title}</div>
      <div data-testid="error-message-text">{message}</div>
      {correlationId && <div data-testid="correlation-id">{correlationId}</div>}
      {actions?.map((action: any, idx: number) => (
        <button key={idx} onClick={action.onClick}>
          {action.label}
        </button>
      ))}
      {expandable && details && <div data-testid="error-details">{details}</div>}
    </div>
  ),
}));

// Mock InternalServerErrorPage
jest.mock('../ErrorPages', () => ({
  InternalServerErrorPage: ({ title, message, correlationId, onRetry }: any) => (
    <div data-testid="error-page">
      <div data-testid="page-title">{title}</div>
      <div data-testid="page-message">{message}</div>
      {correlationId && <div data-testid="page-correlation-id">{correlationId}</div>}
      {onRetry && <button onClick={onRetry}>Retry Page</button>}
    </div>
  ),
}));

// Suppress console.error in tests to reduce noise
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Component that throws error on demand
function ThrowError({ shouldThrow, errorMessage }: { shouldThrow: boolean; errorMessage?: string }) {
  if (shouldThrow) {
    throw new Error(errorMessage || 'Test error');
  }
  return <div>Normal content</div>;
}

describe('EnhancedErrorBoundary Component', () => {
  describe('Error Catching', () => {
    it('catches errors and displays fallback', () => {
      render(
        <EnhancedErrorBoundary>
          <ThrowError shouldThrow={true} />
        </EnhancedErrorBoundary>
      );

      expect(screen.getByText('Component Error')).toBeInTheDocument();
      expect(screen.getByText('Test error')).toBeInTheDocument();
    });

    it('renders children when no error', () => {
      render(
        <EnhancedErrorBoundary>
          <ThrowError shouldThrow={false} />
        </EnhancedErrorBoundary>
      );

      expect(screen.getByText('Normal content')).toBeInTheDocument();
    });

    it('generates unique error ID internally', () => {
      const onError = jest.fn();

      render(
        <EnhancedErrorBoundary onError={onError}>
          <ThrowError shouldThrow={true} />
        </EnhancedErrorBoundary>
      );

      // Verify error ID was generated (passed to onError callback)
      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.any(Object),
        expect.stringMatching(/^error_/)
      );
    });

    it('displays custom error message', () => {
      render(
        <EnhancedErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Custom error message" />
        </EnhancedErrorBoundary>
      );

      expect(screen.getByText('Custom error message')).toBeInTheDocument();
    });
  });

  describe('Fallback Levels', () => {
    it('shows page-level error fallback', () => {
      render(
        <EnhancedErrorBoundary level="page">
          <ThrowError shouldThrow={true} />
        </EnhancedErrorBoundary>
      );

      expect(screen.getByTestId('error-page')).toBeInTheDocument();
      expect(screen.getByTestId('page-title')).toHaveTextContent('Page Error');
    });

    it('shows section-level error fallback', () => {
      render(
        <EnhancedErrorBoundary level="section">
          <ThrowError shouldThrow={true} />
        </EnhancedErrorBoundary>
      );

      expect(screen.getByTestId('error-message')).toBeInTheDocument();
      expect(screen.getByTestId('error-title')).toHaveTextContent('Error');
    });

    it('shows component-level error fallback (default)', () => {
      render(
        <EnhancedErrorBoundary level="component">
          <ThrowError shouldThrow={true} />
        </EnhancedErrorBoundary>
      );

      expect(screen.getByText('Component Error')).toBeInTheDocument();
    });
  });

  describe('Context Name', () => {
    it('includes context name in page error', () => {
      render(
        <EnhancedErrorBoundary level="page" contextName="User Profile">
          <ThrowError shouldThrow={true} />
        </EnhancedErrorBoundary>
      );

      expect(screen.getByTestId('page-message')).toHaveTextContent('User Profile');
    });

    it('includes context name in section error', () => {
      render(
        <EnhancedErrorBoundary level="section" contextName="Dashboard">
          <ThrowError shouldThrow={true} />
        </EnhancedErrorBoundary>
      );

      expect(screen.getByTestId('error-title')).toHaveTextContent('Dashboard Error');
    });

    it('includes context name in component error', () => {
      render(
        <EnhancedErrorBoundary level="component" contextName="Video Player">
          <ThrowError shouldThrow={true} />
        </EnhancedErrorBoundary>
      );

      expect(screen.getByText('Video Player Error')).toBeInTheDocument();
    });
  });

  describe('Custom Fallback', () => {
    it('uses custom fallback when provided', () => {
      const customFallback = <div data-testid="custom-fallback">Custom Error UI</div>;

      render(
        <EnhancedErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </EnhancedErrorBoundary>
      );

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
      expect(screen.getByText('Custom Error UI')).toBeInTheDocument();
    });
  });

  describe('Retry Functionality', () => {
    it('shows retry button for component-level error', () => {
      render(
        <EnhancedErrorBoundary>
          <ThrowError shouldThrow={true} />
        </EnhancedErrorBoundary>
      );

      expect(screen.getByText(/Try again \(0\/3\)/)).toBeInTheDocument();
    });

    it('retries and increments retry count', () => {
      const { rerender } = render(
        <EnhancedErrorBoundary>
          <ThrowError shouldThrow={true} />
        </EnhancedErrorBoundary>
      );

      const retryButton = screen.getByText(/Try again \(0\/3\)/);
      fireEvent.click(retryButton);

      // After retry, component should attempt to render children again
      // We need to force another error to see updated retry count
      rerender(
        <EnhancedErrorBoundary>
          <ThrowError shouldThrow={true} />
        </EnhancedErrorBoundary>
      );

      expect(screen.getByText(/Try again \(1\/3\)/)).toBeInTheDocument();
    });

    it('hides retry button after max retries', () => {
      const { rerender } = render(
        <EnhancedErrorBoundary>
          <ThrowError shouldThrow={true} />
        </EnhancedErrorBoundary>
      );

      // Retry 3 times
      for (let i = 0; i < 3; i++) {
        const retryButton = screen.getByText(new RegExp(`Try again \\(${i}/3\\)`));
        fireEvent.click(retryButton);

        rerender(
          <EnhancedErrorBoundary>
            <ThrowError shouldThrow={true} />
          </EnhancedErrorBoundary>
        );
      }

      expect(screen.queryByText(/Try again/)).not.toBeInTheDocument();
    });

    it('calls onRetry callback when provided', () => {
      const onRetry = jest.fn();

      render(
        <EnhancedErrorBoundary onRetry={onRetry}>
          <ThrowError shouldThrow={true} />
        </EnhancedErrorBoundary>
      );

      const retryButton = screen.getByText(/Try again \(0\/3\)/);
      fireEvent.click(retryButton);

      expect(onRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Callbacks', () => {
    it('calls onError callback when error occurs', () => {
      const onError = jest.fn();

      render(
        <EnhancedErrorBoundary onError={onError}>
          <ThrowError shouldThrow={true} errorMessage="Test callback error" />
        </EnhancedErrorBoundary>
      );

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Test callback error' }),
        expect.any(Object),
        expect.stringMatching(/^error_/)
      );
    });
  });

  describe('Window Services Integration', () => {
    it('logs to window.loggerService when available', () => {
      const mockLogError = jest.fn();
      (window as any).loggerService = { logError: mockLogError };

      render(
        <EnhancedErrorBoundary>
          <ThrowError shouldThrow={true} />
        </EnhancedErrorBoundary>
      );

      expect(mockLogError).toHaveBeenCalledWith('EnhancedErrorBoundary', expect.any(Object));

      delete (window as any).loggerService;
    });

    it('logs error to console when Sentry is disabled', () => {
      render(
        <EnhancedErrorBoundary>
          <ThrowError shouldThrow={true} />
        </EnhancedErrorBoundary>
      );

      // Sentry is disabled for CF Workers  -  errors are logged via console.error
      expect(console.error).toHaveBeenCalled();
    });

    it('adds error to window.__errorActions when available', () => {
      const mockAddSystemError = jest.fn().mockReturnValue('error-id-123');
      (window as any).__errorActions = { addSystemError: mockAddSystemError };

      render(
        <EnhancedErrorBoundary contextName="Test Context">
          <ThrowError shouldThrow={true} errorMessage="Context error" />
        </EnhancedErrorBoundary>
      );

      expect(mockAddSystemError).toHaveBeenCalledWith(
        'Context error',
        expect.stringMatching(/^error_/),
        expect.objectContaining({ contextName: 'Test Context' })
      );

      delete (window as any).__errorActions;
    });
  });
});

describe('Specialized Error Boundaries', () => {
  describe('PageErrorBoundary', () => {
    it('renders page-level error', () => {
      render(
        <PageErrorBoundary>
          <ThrowError shouldThrow={true} />
        </PageErrorBoundary>
      );

      expect(screen.getByTestId('error-page')).toBeInTheDocument();
    });

    it('passes contextName to page error', () => {
      render(
        <PageErrorBoundary contextName="Home Page">
          <ThrowError shouldThrow={true} />
        </PageErrorBoundary>
      );

      expect(screen.getByTestId('page-message')).toHaveTextContent('Home Page');
    });
  });

  describe('SectionErrorBoundary', () => {
    it('renders section-level error', () => {
      render(
        <SectionErrorBoundary>
          <ThrowError shouldThrow={true} />
        </SectionErrorBoundary>
      );

      expect(screen.getByTestId('error-message')).toBeInTheDocument();
    });

    it('passes contextName to section error', () => {
      render(
        <SectionErrorBoundary contextName="User Menu">
          <ThrowError shouldThrow={true} />
        </SectionErrorBoundary>
      );

      expect(screen.getByTestId('error-title')).toHaveTextContent('User Menu Error');
    });
  });

  describe('ComponentErrorBoundary', () => {
    it('renders component-level error', () => {
      render(
        <ComponentErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ComponentErrorBoundary>
      );

      expect(screen.getByText('Component Error')).toBeInTheDocument();
    });

    it('uses custom fallback when provided', () => {
      const customFallback = <div data-testid="custom-component-fallback">Custom Component Error</div>;

      render(
        <ComponentErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </ComponentErrorBoundary>
      );

      expect(screen.getByTestId('custom-component-fallback')).toBeInTheDocument();
    });
  });
});

describe('withEnhancedErrorBoundary HOC', () => {
  it('wraps component with error boundary', () => {
    function TestComponent() {
      return <div>Test Component</div>;
    }

    const WrappedComponent = withEnhancedErrorBoundary(TestComponent);

    render(<WrappedComponent />);

    expect(screen.getByText('Test Component')).toBeInTheDocument();
  });

  it('catches errors in wrapped component', () => {
    const WrappedComponent = withEnhancedErrorBoundary(ThrowError);

    render(<WrappedComponent shouldThrow={true} />);

    // HOC uses component name as context, so it shows "ThrowError Error"
    expect(screen.getByText('ThrowError Error')).toBeInTheDocument();
  });

  it('uses component name as context', () => {
    function MyCustomComponent(): React.ReactElement {
      throw new Error('Custom component error');
    }

    const WrappedComponent = withEnhancedErrorBoundary(MyCustomComponent);

    render(<WrappedComponent />);

    expect(screen.getByText('MyCustomComponent Error')).toBeInTheDocument();
  });

  it('applies custom options', () => {
    const WrappedComponent = withEnhancedErrorBoundary(ThrowError, {
      level: 'page',
      contextName: 'Custom Context',
    });

    render(<WrappedComponent shouldThrow={true} />);

    expect(screen.getByTestId('error-page')).toBeInTheDocument();
    expect(screen.getByTestId('page-message')).toHaveTextContent('Custom Context');
  });

  it('sets displayName correctly', () => {
    function TestComponent() {
      return <div>Test</div>;
    }

    const WrappedComponent = withEnhancedErrorBoundary(TestComponent);

    expect(WrappedComponent.displayName).toBe('withEnhancedErrorBoundary(TestComponent)');
  });
});

describe('useErrorBoundaryContext Hook', () => {
  it('runs without error when window.__errorActions not available', () => {
    function TestComponent() {
      useErrorBoundaryContext();
      return <div>Test</div>;
    }

    render(<TestComponent />);

    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('runs without error when window.__errorActions is available', () => {
    (window as any).__errorActions = { addSystemError: jest.fn() };

    function TestComponent() {
      useErrorBoundaryContext();
      return <div>Test with actions</div>;
    }

    render(<TestComponent />);

    expect(screen.getByText('Test with actions')).toBeInTheDocument();

    delete (window as any).__errorActions;
  });
});

describe('useErrorReporting Hook', () => {
  it('provides reportError function', () => {
    let reportErrorFn: any;

    function TestComponent() {
      const { reportError } = useErrorReporting();
      reportErrorFn = reportError;
      return <div>Test</div>;
    }

    render(<TestComponent />);

    expect(typeof reportErrorFn).toBe('function');
  });

  it('reports error with generated error ID', () => {
    let reportErrorFn: any;

    function TestComponent() {
      const { reportError } = useErrorReporting();
      reportErrorFn = reportError;
      return <div>Test</div>;
    }

    render(<TestComponent />);

    const errorId = reportErrorFn(new Error('Manual error'), 'Test Context');

    expect(errorId).toMatch(/^manual_/);
  });

  it('logs to window.loggerService when available', () => {
    const mockLogError = jest.fn();
    (window as any).loggerService = { logError: mockLogError };

    let reportErrorFn: any;

    function TestComponent() {
      const { reportError } = useErrorReporting();
      reportErrorFn = reportError;
      return <div>Test</div>;
    }

    render(<TestComponent />);

    reportErrorFn(new Error('Manual error'), 'Test Context');

    expect(mockLogError).toHaveBeenCalledWith('ManualErrorReport', expect.any(Object));

    delete (window as any).loggerService;
  });

  it('logs error to console when Sentry is disabled', () => {
    let reportErrorFn: any;

    function TestComponent() {
      const { reportError } = useErrorReporting();
      reportErrorFn = reportError;
      return <div>Test</div>;
    }

    render(<TestComponent />);

    reportErrorFn(new Error('Manual error'), 'Test Context');

    // Sentry is disabled for CF Workers  -  errors are logged via console.error
    expect(console.error).toHaveBeenCalled();
  });

  it('adds to window.__errorActions when available', () => {
    const mockAddSystemError = jest.fn().mockReturnValue('error-id-123');
    (window as any).__errorActions = { addSystemError: mockAddSystemError };

    let reportErrorFn: any;

    function TestComponent() {
      const { reportError } = useErrorReporting();
      reportErrorFn = reportError;
      return <div>Test</div>;
    }

    render(<TestComponent />);

    reportErrorFn(new Error('Manual error'), 'Test Context', { userId: '123' });

    expect(mockAddSystemError).toHaveBeenCalledWith(
      'Manual error',
      expect.stringMatching(/^manual_/),
      expect.objectContaining({ contextName: 'Test Context', userId: '123' })
    );

    delete (window as any).__errorActions;
  });

  it('includes additional info in error data', () => {
    const mockLogError = jest.fn();
    (window as any).loggerService = { logError: mockLogError };

    let reportErrorFn: any;

    function TestComponent() {
      const { reportError } = useErrorReporting();
      reportErrorFn = reportError;
      return <div>Test</div>;
    }

    render(<TestComponent />);

    reportErrorFn(new Error('Error with info'), 'Context', { customField: 'customValue' });

    expect(mockLogError).toHaveBeenCalledWith(
      'ManualErrorReport',
      expect.objectContaining({
        additionalInfo: { customField: 'customValue' },
      })
    );

    delete (window as any).loggerService;
  });
});

/**
 * COVERAGE TARGET: 60%+
 * Total Tests: 35
 * Tests error boundary lifecycle, retry logic, specialized wrappers, HOC, and hooks
 */
