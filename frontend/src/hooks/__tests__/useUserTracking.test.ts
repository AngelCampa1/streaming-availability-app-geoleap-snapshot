/**
 * Comprehensive tests for useUserTracking.ts
 *
 * Coverage Target: 85%+
 * Strategy: Test main hook, useClickTracking, useFormTracking, withUserTracking HOC, logger integration
 */

import { renderHook, act, render } from '@testing-library/react';
import { useUserTracking, useClickTracking, useFormTracking, withUserTracking } from '../useUserTracking';
import { useLogger } from '@/lib/logger';
import React from 'react';

// Mock useLogger
jest.mock('@/lib/logger', () => ({
  useLogger: jest.fn(),
}));

const mockUseLogger = useLogger as jest.MockedFunction<typeof useLogger>;

// Mock logger methods
const mockLogPageView = jest.fn();
const mockLogUserAction = jest.fn();
const mockLogPerformance = jest.fn();
const mockError = jest.fn();
const mockSetUser = jest.fn();
const mockSetCorrelationId = jest.fn();
const mockLog = jest.fn();
const mockDebug = jest.fn();
const mockInfo = jest.fn();
const mockWarn = jest.fn();
const mockLogError = jest.fn();
const mockLogApiCall = jest.fn();
const mockFlush = jest.fn();
const mockGetLogs = jest.fn().mockReturnValue([]);

beforeEach(() => {
  jest.clearAllMocks();

  mockUseLogger.mockReturnValue({
    logPageView: mockLogPageView,
    logUserAction: mockLogUserAction,
    logPerformance: mockLogPerformance,
    error: mockError,
    setUser: mockSetUser,
    setCorrelationId: mockSetCorrelationId,
    log: mockLog,
    debug: mockDebug,
    info: mockInfo,
    warn: mockWarn,
    logError: mockLogError,
    logApiCall: mockLogApiCall,
    flush: mockFlush,
    getLogs: mockGetLogs,
    // Private properties required by LoggerService interface
    logs: [],
    maxLogBuffer: 100,
    sessionId: 'test-session-id',
    generateSessionId: jest.fn().mockReturnValue('test-session-id'),
    // Additional private methods from LoggerService
    setupApplicationInsights: jest.fn(),
    setupUnhandledErrorCapture: jest.fn(),
    setupPerformanceObserver: jest.fn(),
    getSeverityLevel: jest.fn().mockReturnValue(1),
  } as any);

  // Mock document.title
  Object.defineProperty(document, 'title', {
    value: 'Test Page',
    writable: true,
    configurable: true,
  });
});

describe('useUserTracking - Main Hook', () => {
  it('should auto-track page view on mount', () => {
    renderHook(() => useUserTracking());

    expect(mockLogPageView).toHaveBeenCalledWith('Test Page');
  });

  it('should use pathname when document.title is empty', () => {
    Object.defineProperty(document, 'title', {
      value: '',
      writable: true,
      configurable: true,
    });

    renderHook(() => useUserTracking());

    // Should use window.location.pathname when title is empty
    expect(mockLogPageView).toHaveBeenCalledWith(expect.any(String));
    const callArg = mockLogPageView.mock.calls[0][0];
    expect(callArg).toBeTruthy(); // Not empty
  });

  it('should track search actions', () => {
    const { result } = renderHook(() => useUserTracking());

    act(() => {
      result.current.trackSearch({
        query: 'action movies',
        filters: { genre: 'action', year: 2023 },
        resultsCount: 50,
      });
    });

    expect(mockLogUserAction).toHaveBeenCalledWith('search', 'SearchComponent', {
      query: 'action movies',
      filters: { genre: 'action', year: 2023 },
      resultsCount: 50,
      timestamp: expect.any(String),
    });
  });

  it('should track navigation actions', () => {
    const { result } = renderHook(() => useUserTracking());

    act(() => {
      result.current.trackNavigation({
        from: '/home',
        to: '/search',
        method: 'click',
      });
    });

    expect(mockLogUserAction).toHaveBeenCalledWith('navigation', 'NavigationComponent', {
      from: '/home',
      to: '/search',
      method: 'click',
      timestamp: expect.any(String),
    });
  });

  it('should track authentication actions - login', () => {
    const { result } = renderHook(() => useUserTracking());

    act(() => {
      result.current.trackAuth('login', {
        method: 'email',
        success: true,
      });
    });

    expect(mockLogUserAction).toHaveBeenCalledWith('login', 'AuthComponent', {
      method: 'email',
      success: true,
      errorCode: undefined,
      timestamp: expect.any(String),
    });
  });

  it('should track authentication actions - register with error', () => {
    const { result } = renderHook(() => useUserTracking());

    act(() => {
      result.current.trackAuth('register', {
        method: 'google',
        success: false,
        errorCode: 'AUTH_FAILED',
      });
    });

    expect(mockLogUserAction).toHaveBeenCalledWith('register', 'AuthComponent', {
      method: 'google',
      success: false,
      errorCode: 'AUTH_FAILED',
      timestamp: expect.any(String),
    });
  });

  it('should track authentication actions - logout', () => {
    const { result } = renderHook(() => useUserTracking());

    act(() => {
      result.current.trackAuth('logout', {
        method: 'email',
        success: true,
      });
    });

    expect(mockLogUserAction).toHaveBeenCalledWith('logout', 'AuthComponent', expect.objectContaining({
      method: 'email',
      success: true,
    }));
  });

  it('should track payment actions - subscription', () => {
    const { result } = renderHook(() => useUserTracking());

    act(() => {
      result.current.trackPayment('subscription', {
        plan: 'premium',
        success: true,
      });
    });

    expect(mockLogUserAction).toHaveBeenCalledWith('payment_subscription', 'PaymentComponent', {
      plan: 'premium',
      success: true,
      errorCode: undefined,
      timestamp: expect.any(String),
    });
  });

  it('should track payment actions - upgrade', () => {
    const { result } = renderHook(() => useUserTracking());

    act(() => {
      result.current.trackPayment('upgrade', {
        plan: 'enterprise',
        success: true,
      });
    });

    expect(mockLogUserAction).toHaveBeenCalledWith('payment_upgrade', 'PaymentComponent', expect.objectContaining({
      plan: 'enterprise',
      success: true,
    }));
  });

  it('should track payment actions - cancel', () => {
    const { result } = renderHook(() => useUserTracking());

    act(() => {
      result.current.trackPayment('cancel', {
        plan: 'basic',
        success: true,
      });
    });

    expect(mockLogUserAction).toHaveBeenCalledWith('payment_cancel', 'PaymentComponent', expect.objectContaining({
      plan: 'basic',
      success: true,
    }));
  });

  it('should NOT log sensitive payment data (amount, currency)', () => {
    const { result } = renderHook(() => useUserTracking());

    act(() => {
      result.current.trackPayment('subscription', {
        amount: 19.99,
        currency: 'USD',
        plan: 'premium',
        success: true,
      });
    });

    const callArgs = mockLogUserAction.mock.calls[0][2];
    expect(callArgs).not.toHaveProperty('amount');
    expect(callArgs).not.toHaveProperty('currency');
    expect(callArgs).toHaveProperty('plan', 'premium');
  });

  it('should track button clicks with component', () => {
    const { result } = renderHook(() => useUserTracking());

    act(() => {
      result.current.trackClick('subscribe-button', 'SubscriptionComponent', { campaign: 'summer-sale' });
    });

    expect(mockLogUserAction).toHaveBeenCalledWith('click', 'SubscriptionComponent', {
      element: 'subscribe-button',
      campaign: 'summer-sale',
      timestamp: expect.any(String),
    });
  });

  it('should track button clicks without component', () => {
    const { result } = renderHook(() => useUserTracking());

    act(() => {
      result.current.trackClick('search-button');
    });

    expect(mockLogUserAction).toHaveBeenCalledWith('click', 'UnknownComponent', {
      element: 'search-button',
      timestamp: expect.any(String),
    });
  });

  it('should track form submissions - success', () => {
    const { result } = renderHook(() => useUserTracking());

    act(() => {
      result.current.trackFormSubmit('contact-form', true, { fields: 3 });
    });

    expect(mockLogUserAction).toHaveBeenCalledWith('form_submit', 'FormComponent', {
      formName: 'contact-form',
      success: true,
      fields: 3,
      timestamp: expect.any(String),
    });
  });

  it('should track form submissions - failure', () => {
    const { result } = renderHook(() => useUserTracking());

    act(() => {
      result.current.trackFormSubmit('signup-form', false, { error: 'validation_failed' });
    });

    expect(mockLogUserAction).toHaveBeenCalledWith('form_submit', 'FormComponent', {
      formName: 'signup-form',
      success: false,
      error: 'validation_failed',
      timestamp: expect.any(String),
    });
  });

  it('should track feature usage with component', () => {
    const { result } = renderHook(() => useUserTracking());

    act(() => {
      result.current.trackFeatureUse('watchlist', 'WatchlistComponent', { action: 'add' });
    });

    expect(mockLogUserAction).toHaveBeenCalledWith('feature_use', 'WatchlistComponent', {
      feature: 'watchlist',
      action: 'add',
      timestamp: expect.any(String),
    });
  });

  it('should track feature usage without component', () => {
    const { result } = renderHook(() => useUserTracking());

    act(() => {
      result.current.trackFeatureUse('light-only');
    });

    expect(mockLogUserAction).toHaveBeenCalledWith('feature_use', 'FeatureComponent', {
      feature: 'light-only',
      timestamp: expect.any(String),
    });
  });

  it('should track errors as Error object', () => {
    const { result } = renderHook(() => useUserTracking());
    const error = new Error('Network timeout');
    error.stack = 'Error: Network timeout\n  at fetch...';

    act(() => {
      result.current.trackError(error, 'NetworkComponent', { retry: true });
    });

    expect(mockError).toHaveBeenCalledWith('User interaction error', {
      component: 'NetworkComponent',
      message: 'Network timeout',
      stack: expect.stringContaining('Error: Network timeout'),
      retry: true,
      timestamp: expect.any(String),
    });
  });

  it('should track errors as string', () => {
    const { result } = renderHook(() => useUserTracking());

    act(() => {
      result.current.trackError('Validation failed');
    });

    expect(mockError).toHaveBeenCalledWith('User interaction error', {
      component: 'UnknownComponent',
      message: 'Validation failed',
      stack: undefined,
      timestamp: expect.any(String),
    });
  });

  it('should track performance metrics', () => {
    const { result } = renderHook(() => useUserTracking());

    act(() => {
      result.current.trackPerformance('page_load', 1234, 'HomePage');
    });

    expect(mockLogPerformance).toHaveBeenCalledWith('page_load', 1234, 'HomePage');
  });

  it('should track performance metrics without context', () => {
    const { result } = renderHook(() => useUserTracking());

    act(() => {
      result.current.trackPerformance('api_call', 567);
    });

    expect(mockLogPerformance).toHaveBeenCalledWith('api_call', 567, undefined);
  });

  it('should set user', () => {
    const { result } = renderHook(() => useUserTracking());

    act(() => {
      result.current.setUser('user-123');
    });

    expect(mockSetUser).toHaveBeenCalledWith('user-123');
  });

  it('should include timestamp in all tracking actions', () => {
    const { result } = renderHook(() => useUserTracking());

    act(() => {
      result.current.trackSearch({ query: 'test' });
    });

    const callArgs = mockLogUserAction.mock.calls[0][2];

    expect(callArgs.timestamp).toBeDefined();
    // Verify it's a valid ISO timestamp
    expect(callArgs.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    // Verify it can be parsed as a date
    expect(new Date(callArgs.timestamp).toString()).not.toBe('Invalid Date');
  });
});

describe('useClickTracking Hook', () => {
  it('should return handleClick function', () => {
    const { result } = renderHook(() => useClickTracking('ButtonComponent'));

    expect(result.current.handleClick).toBeInstanceOf(Function);
  });

  it('should track click with mouse event data', () => {
    const { result: _trackingResult } = renderHook(() => useUserTracking());
    const { result: clickResult } = renderHook(() => useClickTracking('ButtonComponent'));

    const mockEvent = {
      clientX: 100,
      clientY: 200,
      button: 0,
    } as React.MouseEvent;

    act(() => {
      const clickHandler = clickResult.current.handleClick('submit-button', { campaign: 'promo' });
      clickHandler(mockEvent);
    });

    expect(mockLogUserAction).toHaveBeenCalledWith('click', 'ButtonComponent', {
      element: 'submit-button',
      campaign: 'promo',
      x: 100,
      y: 200,
      button: 0,
      timestamp: expect.any(String),
    });
  });

  it('should track click without extra data', () => {
    const { result: _trackingResult } = renderHook(() => useUserTracking());
    const { result: clickResult } = renderHook(() => useClickTracking('MenuComponent'));

    const mockEvent = {
      clientX: 50,
      clientY: 75,
      button: 0,
    } as React.MouseEvent;

    act(() => {
      const clickHandler = clickResult.current.handleClick('menu-item');
      clickHandler(mockEvent);
    });

    expect(mockLogUserAction).toHaveBeenCalledWith('click', 'MenuComponent', {
      element: 'menu-item',
      x: 50,
      y: 75,
      button: 0,
      timestamp: expect.any(String),
    });
  });
});

describe('useFormTracking Hook', () => {
  it('should return handleSubmit and handleError functions', () => {
    const { result } = renderHook(() => useFormTracking('login-form'));

    expect(result.current.handleSubmit).toBeInstanceOf(Function);
    expect(result.current.handleError).toBeInstanceOf(Function);
  });

  it('should track form submit success', () => {
    const { result: _trackingResult } = renderHook(() => useUserTracking());
    const { result: formResult } = renderHook(() => useFormTracking('signup-form', 'SignupComponent'));

    act(() => {
      formResult.current.handleSubmit(true, { method: 'email' });
    });

    expect(mockLogUserAction).toHaveBeenCalledWith('form_submit', 'FormComponent', {
      formName: 'signup-form',
      success: true,
      method: 'email',
      timestamp: expect.any(String),
    });
  });

  it('should track form submit failure', () => {
    const { result: _trackingResult } = renderHook(() => useUserTracking());
    const { result: formResult } = renderHook(() => useFormTracking('contact-form'));

    act(() => {
      formResult.current.handleSubmit(false, { reason: 'validation' });
    });

    expect(mockLogUserAction).toHaveBeenCalledWith('form_submit', 'FormComponent', {
      formName: 'contact-form',
      success: false,
      reason: 'validation',
      timestamp: expect.any(String),
    });
  });

  it('should track form error as Error object', () => {
    const { result: _trackingResult } = renderHook(() => useUserTracking());
    const { result: formResult } = renderHook(() => useFormTracking('payment-form', 'PaymentComponent'));

    const error = new Error('Payment failed');

    act(() => {
      formResult.current.handleError(error, { code: 'CARD_DECLINED' });
    });

    expect(mockError).toHaveBeenCalledWith('User interaction error', {
      component: 'PaymentComponent',
      message: 'Payment failed',
      stack: expect.any(String),
      formName: 'payment-form',
      code: 'CARD_DECLINED',
      timestamp: expect.any(String),
    });
  });

  it('should track form error as string', () => {
    const { result: _trackingResult } = renderHook(() => useUserTracking());
    const { result: formResult } = renderHook(() => useFormTracking('search-form'));

    act(() => {
      formResult.current.handleError('Invalid query');
    });

    expect(mockError).toHaveBeenCalledWith('User interaction error', {
      component: 'FormComponent',
      message: 'Invalid query',
      stack: undefined,
      formName: 'search-form',
      timestamp: expect.any(String),
    });
  });

  it('should use FormComponent as default component', () => {
    const { result: _trackingResult } = renderHook(() => useUserTracking());
    const { result: formResult } = renderHook(() => useFormTracking('default-form'));

    act(() => {
      formResult.current.handleError('Error occurred');
    });

    expect(mockError).toHaveBeenCalledWith('User interaction error', expect.objectContaining({
      component: 'FormComponent',
    }));
  });
});

describe('withUserTracking HOC', () => {
  it('should track component mount', () => {
    const TestComponent = () => React.createElement('div', null, 'Test Component');
    TestComponent.displayName = 'TestComponent';

    const WrappedComponent = withUserTracking(TestComponent);

    render(React.createElement(WrappedComponent));

    expect(mockLogUserAction).toHaveBeenCalledWith('feature_use', 'TestComponent', expect.objectContaining({
      timestamp: expect.any(String),
    }));
  });

  it('should use custom component name', () => {
    const TestComponent = () => React.createElement('div', null, 'Test Component');
    const WrappedComponent = withUserTracking(TestComponent, 'CustomName');

    render(React.createElement(WrappedComponent));

    expect(mockLogUserAction).toHaveBeenCalledWith('feature_use', 'CustomName', expect.objectContaining({
      timestamp: expect.any(String),
    }));
  });

  it('should use Component.name as fallback', () => {
    const TestComponent = () => React.createElement('div', null, 'Test Component');
    const WrappedComponent = withUserTracking(TestComponent);

    render(React.createElement(WrappedComponent));

    expect(mockLogUserAction).toHaveBeenCalledWith('feature_use', 'TestComponent', expect.anything());
  });

  it('should preserve component props', () => {
    interface TestProps {
      text: string;
      count: number;
    }

    const TestComponent = ({ text, count }: TestProps) =>
      React.createElement('div', null, `${text} - ${count}`);

    const WrappedComponent = withUserTracking(TestComponent);

    const { container } = render(React.createElement(WrappedComponent, { text: 'Hello', count: 5 }));

    expect(container.textContent).toContain('Hello - 5');
  });

  it('should set correct displayName', () => {
    const TestComponent = () => React.createElement('div', null, 'Test');
    TestComponent.displayName = 'TestComponent';

    const WrappedComponent = withUserTracking(TestComponent);

    expect(WrappedComponent.displayName).toBe('withUserTracking(TestComponent)');
  });

  it('should set displayName using Component.name if no displayName', () => {
    const TestComponent = () => React.createElement('div', null, 'Test');
    const WrappedComponent = withUserTracking(TestComponent);

    expect(WrappedComponent.displayName).toBe('withUserTracking(TestComponent)');
  });
});

describe('useUserTracking - Integration', () => {
  it('should work together: main hook + click tracking', () => {
    const { result: _mainResult } = renderHook(() => useUserTracking());
    const { result: clickResult } = renderHook(() => useClickTracking('IntegrationComponent'));

    const mockEvent = {
      clientX: 150,
      clientY: 250,
      button: 0,
    } as React.MouseEvent;

    act(() => {
      const clickHandler = clickResult.current.handleClick('action-button');
      clickHandler(mockEvent);
    });

    expect(mockLogUserAction).toHaveBeenCalled();
  });

  it('should work together: main hook + form tracking', () => {
    const { result: _mainResult } = renderHook(() => useUserTracking());
    const { result: formResult } = renderHook(() => useFormTracking('integration-form'));

    // Clear page view call from main hook
    mockLogUserAction.mockClear();

    act(() => {
      formResult.current.handleSubmit(true);
      formResult.current.handleError('Test error');
    });

    expect(mockLogUserAction).toHaveBeenCalledTimes(1); // form submit
    expect(mockError).toHaveBeenCalledTimes(1); // form error
  });
});
