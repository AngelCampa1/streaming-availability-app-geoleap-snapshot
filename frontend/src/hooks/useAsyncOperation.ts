import { useState, useCallback, useRef, useEffect } from 'react';
import { ErrorHandler } from '@/lib/error-handler';

/**
 * State for async operations
 */
export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  isSuccess: boolean;
  isError: boolean;
}

/**
 * Options for async operation hook
 */
export interface UseAsyncOperationOptions<T> {
  /**
   * Initial data
   */
  initialData?: T;

  /**
   * Auto-execute on mount
   */
  executeOnMount?: boolean;

  /**
   * Custom error handler
   */
  onError?: (error: Error | unknown) => void;

  /**
   * Custom success handler
   */
  onSuccess?: (data: T) => void;

  /**
   * Enable retry with exponential backoff
   */
  enableRetry?: boolean;

  /**
   * Maximum retry attempts
   */
  maxRetries?: number;

  /**
   * Show loading state for minimum duration (prevents flashing)
   */
  minLoadingDuration?: number;
}

/**
 * Comprehensive hook for managing async operations with loading states and error handling
 */
export function useAsyncOperation<T, Args extends unknown[] = []>(
  asyncFunction: (...args: Args) => Promise<T>,
  options: UseAsyncOperationOptions<T> = {}
) {
  const {
    initialData = null,
    executeOnMount = false,
    onError,
    onSuccess,
    enableRetry = false,
    maxRetries = 3,
    minLoadingDuration = 0,
  } = options;

  const [state, setState] = useState<AsyncState<T>>({
    data: initialData,
    loading: false,
    error: null,
    isSuccess: false,
    isError: false,
  });

  const isMounted = useRef(true);
  const abortController = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      isMounted.current = false;
      abortController.current?.abort();
    };
  }, []);

  const execute = useCallback(
    async (...args: Args): Promise<T | null> => {
      // Cancel any pending request
      abortController.current?.abort();
      abortController.current = new AbortController();

      // Set loading state
      setState(prev => ({
        ...prev,
        loading: true,
        error: null,
        isError: false,
      }));

      const startTime = Date.now();

      try {
        const executeWithRetry = enableRetry
          ? () => ErrorHandler.withRetry(() => asyncFunction(...args), { maxRetries })
          : () => asyncFunction(...args);

        const result = await executeWithRetry();

        // Ensure minimum loading duration (prevents flashing)
        if (minLoadingDuration > 0) {
          const elapsed = Date.now() - startTime;
          if (elapsed < minLoadingDuration) {
            await new Promise(resolve => setTimeout(resolve, minLoadingDuration - elapsed));
          }
        }

        if (!isMounted.current) return null;

        setState({
          data: result,
          loading: false,
          error: null,
          isSuccess: true,
          isError: false,
        });

        onSuccess?.(result);
        return result;
      } catch (error) {
        if (!isMounted.current) return null;

        const errorMessage = ErrorHandler.handleApiError(error, {
          showToUser: true,
          logError: true,
          onError,
        });

        setState({
          data: initialData,
          loading: false,
          error: errorMessage,
          isSuccess: false,
          isError: true,
        });

        return null;
      }
    },
    [asyncFunction, initialData, onError, onSuccess, enableRetry, maxRetries, minLoadingDuration]
  );

  // Execute on mount if requested
  // Note: We intentionally omit 'execute' from deps to run only on mount when executeOnMount changes
  useEffect(() => {
    if (executeOnMount) {
      execute(...([] as unknown as Args));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [executeOnMount]); // Execute is stable via useCallback, intentionally omitted

  const reset = useCallback(() => {
    setState({
      data: initialData,
      loading: false,
      error: null,
      isSuccess: false,
      isError: false,
    });
  }, [initialData]);

  const setData = useCallback((data: T) => {
    setState(prev => ({
      ...prev,
      data,
      isSuccess: true,
      error: null,
      isError: false,
    }));
  }, []);

  const setError = useCallback((error: string) => {
    setState(prev => ({
      ...prev,
      error,
      isError: true,
      loading: false,
    }));
  }, []);

  return {
    ...state,
    execute,
    reset,
    setData,
    setError,
  };
}

/**
 * Hook for handling multiple async operations without violating Rules of Hooks.
 * Unlike the previous implementation, this does NOT call hooks inside a loop.
 * Instead, it manages all operations through a single shared state object.
 */
export function useAsyncOperations<T extends Record<string, (...args: never[]) => Promise<unknown>>>(operations: T) {
  const operationKeys = Object.keys(operations);
  const [stateMap, setStateMap] = useState<Record<string, AsyncState<unknown>>>(() => {
    const initial: Record<string, AsyncState<unknown>> = {};
    for (const key of operationKeys) {
      initial[key] = { data: null, loading: false, error: null, isSuccess: false, isError: false };
    }
    return initial;
  });

  const operationsRef = useRef(operations);
  operationsRef.current = operations;
  const isMounted = useRef(true);

  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  const createExecutor = useCallback(
    (key: string) => async (...args: unknown[]): Promise<unknown | null> => {
      const fn = operationsRef.current[key];
      if (!fn) return null;

      setStateMap(prev => ({
        ...prev,
        [key]: { ...prev[key], loading: true, error: null, isError: false },
      }));

      try {
        const result = await fn(...(args as never[]));
        if (!isMounted.current) return null;

        setStateMap(prev => ({
          ...prev,
          [key]: { data: result, loading: false, error: null, isSuccess: true, isError: false },
        }));
        return result;
      } catch (error) {
        if (!isMounted.current) return null;
        const msg = error instanceof Error ? error.message : 'Unknown error';

        setStateMap(prev => ({
          ...prev,
          [key]: { data: null, loading: false, error: msg, isSuccess: false, isError: true },
        }));
        return null;
      }
    },
    []
  );

  // Build entries with the same API shape as the old useAsyncOperation return type:
  // states[key].data, states[key].loading, states[key].execute(), etc.
  const states: Record<string, AsyncState<unknown> & {
    execute: (...args: unknown[]) => Promise<unknown | null>;
    reset: () => void;
    setData: (data: unknown) => void;
    setError: (error: string) => void;
  }> = {};

  for (const key of operationKeys) {
    const s = stateMap[key] ?? { data: null, loading: false, error: null, isSuccess: false, isError: false };
    states[key] = {
      ...s,
      execute: createExecutor(key),
      reset: () => setStateMap(prev => ({
        ...prev,
        [key]: { data: null, loading: false, error: null, isSuccess: false, isError: false },
      })),
      setData: (data: unknown) => setStateMap(prev => ({
        ...prev,
        [key]: { ...prev[key], data, isSuccess: true, error: null, isError: false },
      })),
      setError: (error: string) => setStateMap(prev => ({
        ...prev,
        [key]: { ...prev[key], error, isError: true, loading: false },
      })),
    };
  }

  const stateValues = Object.values(stateMap);
  const isAnyLoading = stateValues.some(s => s.loading);
  const hasAnyError = stateValues.some(s => s.isError);
  const allSuccess = stateValues.length > 0 && stateValues.every(s => s.isSuccess);

  return {
    states,
    isAnyLoading,
    hasAnyError,
    allSuccess,
  };
}

/**
 * Hook for form submission with loading state
 */
export function useFormSubmit<T, FormData>(
  submitFunction: (data: FormData) => Promise<T>,
  options: UseAsyncOperationOptions<T> & {
    onSubmitSuccess?: (data: T) => void;
    resetFormOnSuccess?: boolean;
  } = {}
) {
  const { onSubmitSuccess, resetFormOnSuccess = false, ...asyncOptions } = options;

  const asyncOp = useAsyncOperation(submitFunction, {
    ...asyncOptions,
    onSuccess: data => {
      asyncOptions.onSuccess?.(data);
      onSubmitSuccess?.(data);
    },
  });

  const handleSubmit = useCallback(
    async (e: React.FormEvent, formData: FormData) => {
      e.preventDefault();
      const result = await asyncOp.execute(formData);

      if (result && resetFormOnSuccess) {
        (e.target as HTMLFormElement).reset();
      }

      return result;
    },
    [asyncOp, resetFormOnSuccess]
  );

  return {
    ...asyncOp,
    handleSubmit,
  };
}

/**
 * Hook for debounced async operations (e.g., search)
 */
export function useDebouncedAsyncOperation<T, Args extends unknown[]>(
  asyncFunction: (...args: Args) => Promise<T>,
  debounceMs: number = 300,
  options: UseAsyncOperationOptions<T> = {}
) {
  const asyncOp = useAsyncOperation(asyncFunction, options);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const debouncedExecute = useCallback(
    (...args: Args) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        void asyncOp.execute(...args);
      }, debounceMs);
    },
    [asyncOp, debounceMs]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    ...asyncOp,
    execute: debouncedExecute,
    executeImmediate: asyncOp.execute,
  };
}
