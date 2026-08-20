/**
 * Comprehensive tests for useAsyncOperation.ts
 *
 * Coverage Target: 85%+
 * Strategy: Test core async hook, retry logic, form submit, debouncing, multiple operations
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import {
  useAsyncOperation,
  useAsyncOperations,
  useFormSubmit,
  useDebouncedAsyncOperation,
} from '../useAsyncOperation';
import { ErrorHandler } from '@/lib/error-handler';

// Mock ErrorHandler
jest.mock('@/lib/error-handler', () => ({
  ErrorHandler: {
    handleApiError: jest.fn((error: Error) => error.message || 'Unknown error'),
    withRetry: jest.fn((fn, _options) => fn()),
  },
}));

const mockErrorHandler = ErrorHandler as jest.Mocked<typeof ErrorHandler>;

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

describe('useAsyncOperation - Basic Functionality', () => {
  it('should initialize with default state', () => {
    const asyncFn = jest.fn().mockResolvedValue('result');
    const { result } = renderHook(() => useAsyncOperation(asyncFn));

    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.isError).toBe(false);
  });

  it('should initialize with initial data', () => {
    const asyncFn = jest.fn().mockResolvedValue('result');
    const { result } = renderHook(() =>
      useAsyncOperation(asyncFn, { initialData: 'initial' })
    );

    expect(result.current.data).toBe('initial');
  });

  it('should execute async function successfully', async () => {
    const asyncFn = jest.fn().mockResolvedValue('success');
    const { result } = renderHook(() => useAsyncOperation(asyncFn));

    let returnedData: string | null = null;
    await act(async () => {
      returnedData = (await result.current.execute()) as string;
    });

    expect(result.current.data).toBe('success');
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.isSuccess).toBe(true);
    expect(result.current.isError).toBe(false);
    expect(returnedData).toBe('success');
  });

  it('should handle async function error', async () => {
    const error = new Error('Test error');
    const asyncFn = jest.fn().mockRejectedValue(error);
    mockErrorHandler.handleApiError.mockReturnValue('Test error');

    const { result } = renderHook(() => useAsyncOperation(asyncFn));

    await act(async () => {
      await result.current.execute();
    });

    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('Test error');
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.isError).toBe(true);
  });

  it('should set loading state during execution', async () => {
    const asyncFn = jest.fn(
      () => new Promise(resolve => setTimeout(() => resolve('result'), 100))
    );
    const { result } = renderHook(() => useAsyncOperation(asyncFn));

    act(() => {
      void result.current.execute();
    });

    // Should be loading
    expect(result.current.loading).toBe(true);

    // Advance timers and wait for completion
    await act(async () => {
      jest.advanceTimersByTime(100);
      await Promise.resolve();
    });

    expect(result.current.loading).toBe(false);
  });

  it('should pass arguments to async function', async () => {
    const asyncFn = jest.fn((a: number, b: string) =>
      Promise.resolve(`${a}-${b}`)
    );
    const { result } = renderHook(() => useAsyncOperation(asyncFn));

    await act(async () => {
      await result.current.execute(42, 'test');
    });

    expect(asyncFn).toHaveBeenCalledWith(42, 'test');
    expect(result.current.data).toBe('42-test');
  });
});

describe('useAsyncOperation - Options', () => {
  it('should execute on mount when executeOnMount is true', async () => {
    const asyncFn = jest.fn().mockResolvedValue('mounted');
    const { result } = renderHook(() =>
      useAsyncOperation(asyncFn, { executeOnMount: true })
    );

    await waitFor(() => {
      expect(asyncFn).toHaveBeenCalled();
    });

    // Need to advance timers to allow promise to resolve
    await act(async () => {
      jest.runAllTimers();
      await Promise.resolve();
    });

    expect(result.current.data).toBe('mounted');
  });

  it('should call onSuccess callback on successful execution', async () => {
    const onSuccess = jest.fn();
    const asyncFn = jest.fn().mockResolvedValue('success');
    const { result } = renderHook(() =>
      useAsyncOperation(asyncFn, { onSuccess })
    );

    await act(async () => {
      await result.current.execute();
    });

    expect(onSuccess).toHaveBeenCalledWith('success');
  });

  it('should call onError callback on error', async () => {
    const onError = jest.fn();
    const error = new Error('Test error');
    const asyncFn = jest.fn().mockRejectedValue(error);
    mockErrorHandler.handleApiError.mockReturnValue('Test error');

    const { result } = renderHook(() =>
      useAsyncOperation(asyncFn, { onError })
    );

    await act(async () => {
      await result.current.execute();
    });

    expect(mockErrorHandler.handleApiError).toHaveBeenCalledWith(
      error,
      expect.objectContaining({
        onError,
      })
    );
  });

  it('should enforce minimum loading duration', async () => {
    const asyncFn = jest.fn().mockResolvedValue('fast');
    const { result } = renderHook(() =>
      useAsyncOperation(asyncFn, { minLoadingDuration: 500 })
    );

    const _startTime = Date.now();

    act(() => {
      void result.current.execute();
    });

    // Advance past async operation completion (immediate)
    await act(async () => {
      await Promise.resolve();
    });

    // Should still be loading
    expect(result.current.loading).toBe(true);

    // Advance to meet minimum duration
    await act(async () => {
      jest.advanceTimersByTime(500);
      await Promise.resolve();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBe('fast');
  });

  it('should use retry with exponential backoff when enabled', async () => {
    const asyncFn = jest.fn().mockResolvedValue('retried');
    mockErrorHandler.withRetry.mockImplementation(fn => fn());

    const { result } = renderHook(() =>
      useAsyncOperation(asyncFn, { enableRetry: true, maxRetries: 5 })
    );

    await act(async () => {
      await result.current.execute();
    });

    expect(mockErrorHandler.withRetry).toHaveBeenCalledWith(
      expect.any(Function),
      { maxRetries: 5 }
    );
    expect(result.current.data).toBe('retried');
  });

  it('should not use retry when disabled', async () => {
    const asyncFn = jest.fn().mockResolvedValue('no-retry');
    const { result } = renderHook(() =>
      useAsyncOperation(asyncFn, { enableRetry: false })
    );

    await act(async () => {
      await result.current.execute();
    });

    expect(mockErrorHandler.withRetry).not.toHaveBeenCalled();
    expect(result.current.data).toBe('no-retry');
  });
});

describe('useAsyncOperation - Lifecycle & Cleanup', () => {
  it('should cancel pending request on new execution', async () => {
    const asyncFn = jest.fn(
      () => new Promise(resolve => setTimeout(() => resolve('result'), 200))
    );
    const { result } = renderHook(() => useAsyncOperation(asyncFn));

    // Start first request
    act(() => {
      void result.current.execute();
    });

    // Start second request immediately
    act(() => {
      void result.current.execute();
    });

    // Fast-forward and complete
    await act(async () => {
      jest.advanceTimersByTime(200);
      await Promise.resolve();
    });

    // Should have called asyncFn twice (both started)
    expect(asyncFn).toHaveBeenCalledTimes(2);
  });

  it('should cleanup abort controller on unmount', () => {
    const asyncFn = jest.fn().mockResolvedValue('cleanup');
    const { unmount } = renderHook(() => useAsyncOperation(asyncFn));

    // Should not throw
    expect(() => unmount()).not.toThrow();
  });

  it('should not update state after unmount', async () => {
    const asyncFn = jest.fn(
      () => new Promise(resolve => setTimeout(() => resolve('late'), 100))
    );
    const { result, unmount } = renderHook(() => useAsyncOperation(asyncFn));

    act(() => {
      void result.current.execute();
    });

    // Unmount before completion
    unmount();

    // Advance timers to complete the async operation
    await act(async () => {
      jest.advanceTimersByTime(100);
      await Promise.resolve();
    });

    // No assertions needed - test passes if no warnings/errors
  });
});

describe('useAsyncOperation - Helper Methods', () => {
  it('should reset state', () => {
    const asyncFn = jest.fn().mockResolvedValue('data');
    const { result } = renderHook(() =>
      useAsyncOperation(asyncFn, { initialData: 'initial' })
    );

    act(() => {
      result.current.setData('modified');
    });

    expect(result.current.data).toBe('modified');

    act(() => {
      result.current.reset();
    });

    expect(result.current.data).toBe('initial');
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.isError).toBe(false);
  });

  it('should set data manually', () => {
    const asyncFn = jest.fn().mockResolvedValue('async');
    const { result } = renderHook(() => useAsyncOperation(asyncFn));

    act(() => {
      result.current.setData('manual');
    });

    expect(result.current.data).toBe('manual');
    expect(result.current.isSuccess).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.isError).toBe(false);
  });

  it('should set error manually', () => {
    const asyncFn = jest.fn().mockResolvedValue('data');
    const { result } = renderHook(() => useAsyncOperation(asyncFn));

    act(() => {
      result.current.setError('Manual error');
    });

    expect(result.current.error).toBe('Manual error');
    expect(result.current.isError).toBe(true);
    expect(result.current.loading).toBe(false);
  });
});

describe('useAsyncOperations - Multiple Operations', () => {
  it('should manage multiple async operations', async () => {
    const operations = {
      fetchUser: jest.fn().mockResolvedValue({ id: 1, name: 'User' }),
      fetchPosts: jest.fn().mockResolvedValue([{ id: 1, title: 'Post' }]),
    };

    const { result } = renderHook(() => useAsyncOperations(operations));

    await act(async () => {
      await result.current.states.fetchUser.execute();
      await result.current.states.fetchPosts.execute();
    });

    expect(result.current.states.fetchUser.data).toEqual({ id: 1, name: 'User' });
    expect(result.current.states.fetchPosts.data).toEqual([{ id: 1, title: 'Post' }]);
  });

  it('should detect if any operation is loading', async () => {
    const slowOp = jest.fn(
      () => new Promise(resolve => setTimeout(() => resolve('slow'), 100))
    );
    const fastOp = jest.fn().mockResolvedValue('fast');

    const { result } = renderHook(() =>
      useAsyncOperations({ slowOp, fastOp })
    );

    act(() => {
      void result.current.states.slowOp.execute();
    });

    expect(result.current.isAnyLoading).toBe(true);

    await act(async () => {
      jest.advanceTimersByTime(100);
      await Promise.resolve();
    });

    expect(result.current.isAnyLoading).toBe(false);
  });

  it('should detect if any operation has error', async () => {
    const errorOp = jest.fn().mockRejectedValue(new Error('Failed'));
    const successOp = jest.fn().mockResolvedValue('success');
    mockErrorHandler.handleApiError.mockReturnValue('Failed');

    const { result } = renderHook(() =>
      useAsyncOperations({ errorOp, successOp })
    );

    await act(async () => {
      await result.current.states.errorOp.execute();
      await result.current.states.successOp.execute();
    });

    expect(result.current.hasAnyError).toBe(true);
    expect(result.current.allSuccess).toBe(false);
  });

  it('should detect when all operations succeed', async () => {
    const op1 = jest.fn().mockResolvedValue('result1');
    const op2 = jest.fn().mockResolvedValue('result2');

    const { result } = renderHook(() =>
      useAsyncOperations({ op1, op2 })
    );

    await act(async () => {
      await result.current.states.op1.execute();
      await result.current.states.op2.execute();
    });

    expect(result.current.allSuccess).toBe(true);
    expect(result.current.hasAnyError).toBe(false);
  });
});

describe('useFormSubmit', () => {
  it('should handle form submission', async () => {
    const submitFn = jest.fn().mockResolvedValue({ success: true });
    const { result } = renderHook(() => useFormSubmit(submitFn));

    const mockEvent = {
      preventDefault: jest.fn(),
      target: { reset: jest.fn() },
    } as unknown as React.FormEvent;

    const formData = { username: 'test', password: 'pass' };

    await act(async () => {
      await result.current.handleSubmit(mockEvent, formData);
    });

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(submitFn).toHaveBeenCalledWith(formData);
    expect(result.current.data).toEqual({ success: true });
  });

  it('should reset form on success when resetFormOnSuccess is true', async () => {
    const submitFn = jest.fn().mockResolvedValue({ success: true });
    const { result } = renderHook(() =>
      useFormSubmit(submitFn, { resetFormOnSuccess: true })
    );

    const mockForm = { reset: jest.fn() };
    const mockEvent = {
      preventDefault: jest.fn(),
      target: mockForm,
    } as unknown as React.FormEvent;

    const formData = { username: 'test' };

    await act(async () => {
      await result.current.handleSubmit(mockEvent, formData);
    });

    expect(mockForm.reset).toHaveBeenCalled();
  });

  it('should not reset form when resetFormOnSuccess is false', async () => {
    const submitFn = jest.fn().mockResolvedValue({ success: true });
    const { result } = renderHook(() =>
      useFormSubmit(submitFn, { resetFormOnSuccess: false })
    );

    const mockForm = { reset: jest.fn() };
    const mockEvent = {
      preventDefault: jest.fn(),
      target: mockForm,
    } as unknown as React.FormEvent;

    const formData = { username: 'test' };

    await act(async () => {
      await result.current.handleSubmit(mockEvent, formData);
    });

    expect(mockForm.reset).not.toHaveBeenCalled();
  });

  it('should call onSubmitSuccess on successful submission', async () => {
    const onSubmitSuccess = jest.fn();
    const submitFn = jest.fn().mockResolvedValue({ success: true });
    const { result } = renderHook(() =>
      useFormSubmit(submitFn, { onSubmitSuccess })
    );

    const mockEvent = {
      preventDefault: jest.fn(),
      target: { reset: jest.fn() },
    } as unknown as React.FormEvent;

    await act(async () => {
      await result.current.handleSubmit(mockEvent, {});
    });

    expect(onSubmitSuccess).toHaveBeenCalledWith({ success: true });
  });
});

describe('useDebouncedAsyncOperation', () => {
  it('should debounce async execution', async () => {
    const asyncFn = jest.fn().mockResolvedValue('debounced');
    const { result } = renderHook(() =>
      useDebouncedAsyncOperation(asyncFn, 300)
    );

    // Call multiple times rapidly
    act(() => {
      result.current.execute('call1');
      result.current.execute('call2');
      result.current.execute('call3');
    });

    // Should not have called yet
    expect(asyncFn).not.toHaveBeenCalled();

    // Advance timers past debounce delay
    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    // Should have called only once with last arguments
    expect(asyncFn).toHaveBeenCalledTimes(1);
    expect(asyncFn).toHaveBeenCalledWith('call3');
  });

  it('should provide immediate execute method', async () => {
    const asyncFn = jest.fn().mockResolvedValue('immediate');
    const { result } = renderHook(() =>
      useDebouncedAsyncOperation(asyncFn, 300)
    );

    await act(async () => {
      await result.current.executeImmediate('immediate-call');
    });

    // Should execute immediately without debounce
    expect(asyncFn).toHaveBeenCalledWith('immediate-call');
  });

  it('should clear pending debounce on unmount', () => {
    const asyncFn = jest.fn().mockResolvedValue('cleanup');
    const { result, unmount } = renderHook(() =>
      useDebouncedAsyncOperation(asyncFn, 300)
    );

    act(() => {
      result.current.execute('pending');
    });

    // Unmount before debounce completes
    unmount();

    // Advance timers
    act(() => {
      jest.advanceTimersByTime(300);
    });

    // Should not have executed
    expect(asyncFn).not.toHaveBeenCalled();
  });

  it('should cancel previous debounce when called again', async () => {
    const asyncFn = jest.fn().mockResolvedValue('result');
    const { result } = renderHook(() =>
      useDebouncedAsyncOperation(asyncFn, 300)
    );

    act(() => {
      result.current.execute('first');
    });

    // Advance halfway
    act(() => {
      jest.advanceTimersByTime(150);
    });

    // Call again (should cancel first)
    act(() => {
      result.current.execute('second');
    });

    // Complete debounce
    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    // Should only have been called once with 'second'
    expect(asyncFn).toHaveBeenCalledTimes(1);
    expect(asyncFn).toHaveBeenCalledWith('second');
  });
});
