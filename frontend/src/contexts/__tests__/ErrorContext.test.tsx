/**
 * ErrorContext Test
 * Tests the error context provider, reducer, and hooks
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import {
  ErrorProvider,
  useError,
  useErrorHandling,
} from '../ErrorContext';
import type { ApiError } from '@/lib/api';

// Mock timers
jest.useFakeTimers();

// Helper to render hook with provider
const wrapper = ({ children }: { children: React.ReactNode }) => <ErrorProvider>{children}</ErrorProvider>;

// Mock API Error
const createMockApiError = (overrides: Partial<ApiError> = {}): ApiError => {
  const error = new Error('API Error') as ApiError;
  Object.assign(error, {
    name: 'ApiError',
    statusCode: 500,
    correlationId: 'test-correlation-123',
    errorCode: 'INTERNAL_ERROR',
    isRetryable: true,
    supportContact: 'support@geoleap.com',
    message: 'Internal server error',
    ...overrides,
  });
  return error;
};

describe('ErrorContext', () => {
  beforeEach(() => {
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Provider', () => {
    it('provides initial state', () => {
      const { result } = renderHook(() => useError(), { wrapper });

      expect(result.current.state).toEqual({
        errors: [],
        globalError: null,
        isErrorDialogOpen: false,
        errorHistory: [],
      });
    });

    it('provides all action methods', () => {
      const { result } = renderHook(() => useError(), { wrapper });

      expect(result.current.actions.addError).toBeDefined();
      expect(result.current.actions.removeError).toBeDefined();
      expect(result.current.actions.updateError).toBeDefined();
      expect(result.current.actions.retryError).toBeDefined();
      expect(result.current.actions.setGlobalError).toBeDefined();
      expect(result.current.actions.clearAllErrors).toBeDefined();
      expect(result.current.actions.clearErrorsByType).toBeDefined();
      expect(result.current.actions.dismissError).toBeDefined();
      expect(result.current.actions.showErrorDialog).toBeDefined();
      expect(result.current.actions.hideErrorDialog).toBeDefined();
      expect(result.current.actions.addApiError).toBeDefined();
      expect(result.current.actions.addNetworkError).toBeDefined();
      expect(result.current.actions.addValidationError).toBeDefined();
      expect(result.current.actions.addSystemError).toBeDefined();
    });
  });

  describe('useError hook', () => {
    it('throws error when used outside provider', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      expect(() => {
        renderHook(() => useError());
      }).toThrow('useError must be used within an ErrorProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('Error Actions', () => {
    describe('addError', () => {
      it('adds error to state with generated ID and timestamp', () => {
        const { result } = renderHook(() => useError(), { wrapper });

        let errorId: string;
        act(() => {
          errorId = result.current.actions.addError({
            type: 'network',
            severity: 'error',
            title: 'Network Error',
            message: 'Connection failed',
            isRetryable: true,
            maxRetries: 3,
            autoDissmiss: false,
            isVisible: true,
          });
        });

        expect(result.current.state.errors).toHaveLength(1);
        expect(result.current.state.errors[0].id).toBe(errorId!);
        expect(result.current.state.errors[0].type).toBe('network');
        expect(result.current.state.errors[0].timestamp).toBeInstanceOf(Date);
        expect(result.current.state.errors[0].retryCount).toBe(0);
      });

      it('adds error to history', () => {
        const { result } = renderHook(() => useError(), { wrapper });

        act(() => {
          result.current.actions.addError({
            type: 'api',
            severity: 'warning',
            title: 'API Warning',
            message: 'Slow response',
            isRetryable: false,
            maxRetries: 0,
            autoDissmiss: true,
            isVisible: true,
          });
        });

        expect(result.current.state.errorHistory).toHaveLength(1);
      });

      it('sets critical error as global error', () => {
        const { result } = renderHook(() => useError(), { wrapper });

        act(() => {
          result.current.actions.addError({
            type: 'api',
            severity: 'critical',
            title: 'Critical Error',
            message: 'System failure',
            isRetryable: false,
            maxRetries: 0,
            autoDissmiss: false,
            isVisible: true,
          });
        });

        expect(result.current.state.globalError).not.toBeNull();
        expect(result.current.state.globalError?.severity).toBe('critical');
      });

      it('sets system error as global error', () => {
        const { result } = renderHook(() => useError(), { wrapper });

        act(() => {
          result.current.actions.addError({
            type: 'system',
            severity: 'error',
            title: 'System Error',
            message: 'Internal error',
            isRetryable: true,
            maxRetries: 2,
            autoDissmiss: false,
            isVisible: true,
          });
        });

        expect(result.current.state.globalError).not.toBeNull();
        expect(result.current.state.globalError?.type).toBe('system');
      });

      it('does not override existing global error', () => {
        const { result } = renderHook(() => useError(), { wrapper });

        act(() => {
          result.current.actions.addError({
            type: 'system',
            severity: 'critical',
            title: 'First Critical',
            message: 'First error',
            isRetryable: false,
            maxRetries: 0,
            autoDissmiss: false,
            isVisible: true,
          });
        });

        const firstGlobalError = result.current.state.globalError;

        act(() => {
          result.current.actions.addError({
            type: 'system',
            severity: 'critical',
            title: 'Second Critical',
            message: 'Second error',
            isRetryable: false,
            maxRetries: 0,
            autoDissmiss: false,
            isVisible: true,
          });
        });

        expect(result.current.state.globalError).toBe(firstGlobalError);
      });

      it('limits error history to 100 items', () => {
        const { result } = renderHook(() => useError(), { wrapper });

        act(() => {
          for (let i = 0; i < 150; i++) {
            result.current.actions.addError({
              type: 'validation',
              severity: 'warning',
              title: `Error ${i}`,
              message: `Message ${i}`,
              isRetryable: false,
              maxRetries: 0,
              autoDissmiss: true,
              isVisible: true,
            });
          }
        });

        expect(result.current.state.errorHistory).toHaveLength(100);
      });
    });

    describe('removeError', () => {
      it('removes error from state', () => {
        const { result } = renderHook(() => useError(), { wrapper });

        let errorId: string;
        act(() => {
          errorId = result.current.actions.addError({
            type: 'network',
            severity: 'error',
            title: 'Network Error',
            message: 'Connection failed',
            isRetryable: true,
            maxRetries: 3,
            autoDissmiss: false,
            isVisible: true,
          });
        });

        act(() => {
          result.current.actions.removeError(errorId!);
        });

        expect(result.current.state.errors).toHaveLength(0);
      });

      it('removes global error if it matches', () => {
        const { result } = renderHook(() => useError(), { wrapper });

        let errorId: string;
        act(() => {
          errorId = result.current.actions.addError({
            type: 'system',
            severity: 'critical',
            title: 'Critical Error',
            message: 'System failure',
            isRetryable: false,
            maxRetries: 0,
            autoDissmiss: false,
            isVisible: true,
          });
        });

        expect(result.current.state.globalError).not.toBeNull();

        act(() => {
          result.current.actions.removeError(errorId!);
        });

        expect(result.current.state.globalError).toBeNull();
      });
    });

    describe('updateError', () => {
      it('updates error properties', () => {
        const { result } = renderHook(() => useError(), { wrapper });

        let errorId: string;
        act(() => {
          errorId = result.current.actions.addError({
            type: 'api',
            severity: 'warning',
            title: 'API Warning',
            message: 'Original message',
            isRetryable: true,
            maxRetries: 3,
            autoDissmiss: true,
            isVisible: true,
          });
        });

        act(() => {
          result.current.actions.updateError(errorId!, {
            message: 'Updated message',
            severity: 'error',
          });
        });

        expect(result.current.state.errors[0].message).toBe('Updated message');
        expect(result.current.state.errors[0].severity).toBe('error');
      });

      it('updates global error if it matches', () => {
        const { result } = renderHook(() => useError(), { wrapper });

        let errorId: string;
        act(() => {
          errorId = result.current.actions.addError({
            type: 'system',
            severity: 'critical',
            title: 'Critical Error',
            message: 'Original',
            isRetryable: false,
            maxRetries: 0,
            autoDissmiss: false,
            isVisible: true,
          });
        });

        act(() => {
          result.current.actions.updateError(errorId!, { message: 'Updated' });
        });

        expect(result.current.state.globalError?.message).toBe('Updated');
      });
    });

    describe('retryError', () => {
      it('increments retry count', () => {
        const { result } = renderHook(() => useError(), { wrapper });

        let errorId: string;
        act(() => {
          errorId = result.current.actions.addError({
            type: 'network',
            severity: 'error',
            title: 'Network Error',
            message: 'Connection failed',
            isRetryable: true,
            maxRetries: 3,
            autoDissmiss: false,
            isVisible: true,
          });
        });

        expect(result.current.state.errors[0].retryCount).toBe(0);

        act(() => {
          result.current.actions.retryError(errorId!);
        });

        expect(result.current.state.errors[0].retryCount).toBe(1);

        act(() => {
          result.current.actions.retryError(errorId!);
        });

        expect(result.current.state.errors[0].retryCount).toBe(2);
      });
    });

    describe('clearAllErrors', () => {
      it('clears all errors and global error', () => {
        const { result } = renderHook(() => useError(), { wrapper });

        act(() => {
          result.current.actions.addError({
            type: 'system',
            severity: 'critical',
            title: 'Error 1',
            message: 'Message 1',
            isRetryable: false,
            maxRetries: 0,
            autoDissmiss: false,
            isVisible: true,
          });
          result.current.actions.addError({
            type: 'network',
            severity: 'error',
            title: 'Error 2',
            message: 'Message 2',
            isRetryable: true,
            maxRetries: 3,
            autoDissmiss: false,
            isVisible: true,
          });
        });

        expect(result.current.state.errors).toHaveLength(2);

        act(() => {
          result.current.actions.clearAllErrors();
        });

        expect(result.current.state.errors).toHaveLength(0);
        expect(result.current.state.globalError).toBeNull();
      });
    });

    describe('clearErrorsByType', () => {
      it('clears only errors of specified type', () => {
        const { result } = renderHook(() => useError(), { wrapper });

        act(() => {
          result.current.actions.addError({
            type: 'network',
            severity: 'error',
            title: 'Network 1',
            message: 'Message 1',
            isRetryable: true,
            maxRetries: 3,
            autoDissmiss: false,
            isVisible: true,
          });
          result.current.actions.addError({
            type: 'api',
            severity: 'warning',
            title: 'API 1',
            message: 'Message 2',
            isRetryable: false,
            maxRetries: 0,
            autoDissmiss: true,
            isVisible: true,
          });
          result.current.actions.addError({
            type: 'network',
            severity: 'error',
            title: 'Network 2',
            message: 'Message 3',
            isRetryable: true,
            maxRetries: 3,
            autoDissmiss: false,
            isVisible: true,
          });
        });

        expect(result.current.state.errors).toHaveLength(3);

        act(() => {
          result.current.actions.clearErrorsByType('network');
        });

        expect(result.current.state.errors).toHaveLength(1);
        expect(result.current.state.errors[0].type).toBe('api');
      });

      it('clears global error if type matches', () => {
        const { result } = renderHook(() => useError(), { wrapper });

        act(() => {
          result.current.actions.addError({
            type: 'system',
            severity: 'critical',
            title: 'System Error',
            message: 'Critical failure',
            isRetryable: false,
            maxRetries: 0,
            autoDissmiss: false,
            isVisible: true,
          });
        });

        expect(result.current.state.globalError).not.toBeNull();

        act(() => {
          result.current.actions.clearErrorsByType('system');
        });

        expect(result.current.state.globalError).toBeNull();
      });
    });

    describe('dismissError', () => {
      it('sets isVisible to false and removes after delay', async () => {
        const { result } = renderHook(() => useError(), { wrapper });

        let errorId: string;
        act(() => {
          errorId = result.current.actions.addError({
            type: 'network',
            severity: 'error',
            title: 'Network Error',
            message: 'Connection failed',
            isRetryable: true,
            maxRetries: 3,
            autoDissmiss: false,
            isVisible: true,
          });
        });

        expect(result.current.state.errors[0].isVisible).toBe(true);

        act(() => {
          result.current.actions.dismissError(errorId!);
        });

        expect(result.current.state.errors[0].isVisible).toBe(false);

        // Fast-forward 300ms for removal
        act(() => {
          jest.advanceTimersByTime(300);
        });

        expect(result.current.state.errors).toHaveLength(0);
      });
    });

    describe('Error Dialog', () => {
      it('shows error dialog', () => {
        const { result } = renderHook(() => useError(), { wrapper });

        act(() => {
          result.current.actions.showErrorDialog();
        });

        expect(result.current.state.isErrorDialogOpen).toBe(true);
      });

      it('hides error dialog', () => {
        const { result } = renderHook(() => useError(), { wrapper });

        act(() => {
          result.current.actions.showErrorDialog();
        });

        act(() => {
          result.current.actions.hideErrorDialog();
        });

        expect(result.current.state.isErrorDialogOpen).toBe(false);
      });
    });
  });

  describe('Specialized Error Creators', () => {
    describe('addApiError', () => {
      it('creates error from API error with 401 status', () => {
        const { result } = renderHook(() => useError(), { wrapper });

        const apiError = createMockApiError({
          statusCode: 401,
          errorCode: 'UNAUTHORIZED',
          message: 'Auth required',
        });

        act(() => {
          result.current.actions.addApiError(apiError);
        });

        expect(result.current.state.errors[0].type).toBe('authentication');
        expect(result.current.state.errors[0].severity).toBe('warning');
        expect(result.current.state.errors[0].title).toBe('Authentication Required');
      });

      it('creates error from API error with 403 status', () => {
        const { result } = renderHook(() => useError(), { wrapper });

        const apiError = createMockApiError({
          statusCode: 403,
          errorCode: 'FORBIDDEN',
        });

        act(() => {
          result.current.actions.addApiError(apiError);
        });

        expect(result.current.state.errors[0].type).toBe('authorization');
      });

      it('creates error from API error with 500 status', () => {
        const { result } = renderHook(() => useError(), { wrapper });

        const apiError = createMockApiError({
          statusCode: 500,
          errorCode: 'INTERNAL_ERROR',
        });

        act(() => {
          result.current.actions.addApiError(apiError);
        });

        expect(result.current.state.errors[0].type).toBe('api');
        expect(result.current.state.errors[0].severity).toBe('error');
      });

      it('sets retryable based on API error', () => {
        const { result } = renderHook(() => useError(), { wrapper });

        const apiError = createMockApiError({
          isRetryable: true,
        });

        act(() => {
          result.current.actions.addApiError(apiError);
        });

        expect(result.current.state.errors[0].isRetryable).toBe(true);
        expect(result.current.state.errors[0].maxRetries).toBe(3);
      });
    });

    describe('addNetworkError', () => {
      it('creates network error with default message', () => {
        const { result } = renderHook(() => useError(), { wrapper });

        act(() => {
          result.current.actions.addNetworkError();
        });

        expect(result.current.state.errors[0].type).toBe('network');
        expect(result.current.state.errors[0].message).toBe('Network connection failed');
        expect(result.current.state.errors[0].isRetryable).toBe(true);
        expect(result.current.state.errors[0].autoDissmiss).toBe(false);
      });

      it('creates network error with custom message', () => {
        const { result } = renderHook(() => useError(), { wrapper });

        act(() => {
          result.current.actions.addNetworkError('Custom network error');
        });

        expect(result.current.state.errors[0].message).toBe('Custom network error');
      });
    });

    describe('addValidationError', () => {
      it('creates validation error', () => {
        const { result } = renderHook(() => useError(), { wrapper });

        act(() => {
          result.current.actions.addValidationError('Email is invalid');
        });

        expect(result.current.state.errors[0].type).toBe('validation');
        expect(result.current.state.errors[0].severity).toBe('warning');
        expect(result.current.state.errors[0].message).toBe('Email is invalid');
        expect(result.current.state.errors[0].isRetryable).toBe(false);
      });
    });

    describe('addSystemError', () => {
      it('creates system error', () => {
        const { result } = renderHook(() => useError(), { wrapper });

        act(() => {
          result.current.actions.addSystemError('System failure', 'corr-123');
        });

        expect(result.current.state.errors[0].type).toBe('system');
        expect(result.current.state.errors[0].severity).toBe('error');
        expect(result.current.state.errors[0].correlationId).toBe('corr-123');
        expect(result.current.state.errors[0].autoDissmiss).toBe(false);
      });
    });
  });

  describe('useErrorHandling hook', () => {
    it('handles ApiError correctly', () => {
      const { result } = renderHook(
        () => ({
          handling: useErrorHandling(),
          error: useError(),
        }),
        { wrapper }
      );

      const apiError = createMockApiError({
        statusCode: 500,
        errorCode: 'INTERNAL_ERROR',
      });

      act(() => {
        result.current.handling.handleApiError(apiError);
      });

      expect(result.current.error.state.errors.length).toBeGreaterThan(0);
    });

    it('handles regular Error as system error', () => {
      const { result } = renderHook(
        () => ({
          handling: useErrorHandling(),
          error: useError(),
        }),
        { wrapper }
      );

      const error = new Error('Regular error');

      act(() => {
        result.current.handling.handleApiError(error);
      });

      expect(result.current.error.state.errors.length).toBeGreaterThan(0);
      expect(result.current.error.state.errors[0].type).toBe('system');
    });

    it('handles network errors', () => {
      const { result } = renderHook(
        () => ({
          handling: useErrorHandling(),
          error: useError(),
        }),
        { wrapper }
      );

      act(() => {
        result.current.handling.handleNetworkError();
      });

      expect(result.current.error.state.errors.length).toBeGreaterThan(0);
      expect(result.current.error.state.errors[0].type).toBe('network');
    });

    it('handles validation errors map', () => {
      const { result } = renderHook(
        () => ({
          handling: useErrorHandling(),
          error: useError(),
        }),
        { wrapper }
      );

      act(() => {
        result.current.handling.handleValidationErrors({
          email: ['Invalid format', 'Required field'],
          password: ['Too short'],
        });
      });

      expect(result.current.error.state.errors).toHaveLength(3);
      expect(result.current.error.state.errors[0].type).toBe('validation');
    });
  });

  describe('Auto-dismiss functionality', () => {
    it('auto-dismisses error after specified time', async () => {
      const { result } = renderHook(() => useError(), { wrapper });

      act(() => {
        result.current.actions.addError({
          type: 'validation',
          severity: 'warning',
          title: 'Validation',
          message: 'Invalid',
          isRetryable: false,
          maxRetries: 0,
          autoDissmiss: true,
          dismissAfter: 5000,
          isVisible: true,
        });
      });

      expect(result.current.state.errors[0].isVisible).toBe(true);

      // Fast-forward 5000ms for auto-dismiss
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(result.current.state.errors[0]?.isVisible).toBe(false);
      });

      // Fast-forward another 300ms for removal
      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(result.current.state.errors).toHaveLength(0);
    });

    it('does not auto-dismiss when autoDissmiss is false', () => {
      const { result } = renderHook(() => useError(), { wrapper });

      act(() => {
        result.current.actions.addError({
          type: 'network',
          severity: 'error',
          title: 'Network',
          message: 'Failed',
          isRetryable: true,
          maxRetries: 3,
          autoDissmiss: false,
          isVisible: true,
        });
      });

      // Fast-forward 10 seconds
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      expect(result.current.state.errors[0].isVisible).toBe(true);
    });
  });
});
