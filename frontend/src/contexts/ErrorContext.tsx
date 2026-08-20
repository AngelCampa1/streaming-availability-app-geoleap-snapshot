/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { ApiError } from '@/lib/api';

// Error types and interfaces
export interface ErrorState {
  id: string;
  type: 'network' | 'api' | 'validation' | 'system' | 'authentication' | 'authorization';
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  correlationId?: string;
  timestamp: Date;
  context?: Record<string, any>;
  isRetryable: boolean;
  retryCount: number;
  maxRetries: number;
  isVisible: boolean;
  autoDissmiss: boolean;
  dismissAfter?: number;
}

export interface ErrorContextState {
  errors: ErrorState[];
  globalError: ErrorState | null;
  isErrorDialogOpen: boolean;
  errorHistory: ErrorState[];
}

// Error actions
type ErrorAction =
  | { type: 'ADD_ERROR'; payload: Omit<ErrorState, 'timestamp' | 'retryCount'> }
  | { type: 'REMOVE_ERROR'; payload: { id: string } }
  | { type: 'UPDATE_ERROR'; payload: { id: string; updates: Partial<ErrorState> } }
  | { type: 'RETRY_ERROR'; payload: { id: string } }
  | { type: 'SET_GLOBAL_ERROR'; payload: ErrorState | null }
  | { type: 'CLEAR_ALL_ERRORS' }
  | { type: 'CLEAR_ERRORS_BY_TYPE'; payload: { type: ErrorState['type'] } }
  | { type: 'DISMISS_ERROR'; payload: { id: string } }
  | { type: 'TOGGLE_ERROR_DIALOG'; payload: { isOpen: boolean } }
  | { type: 'ADD_TO_HISTORY'; payload: ErrorState };

const initialState: ErrorContextState = {
  errors: [],
  globalError: null,
  isErrorDialogOpen: false,
  errorHistory: [],
};

function generateErrorId(): string {
  return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function errorReducer(state: ErrorContextState, action: ErrorAction): ErrorContextState {
  switch (action.type) {
    case 'ADD_ERROR': {
      const newError: ErrorState = {
        ...action.payload,
        timestamp: new Date(),
        retryCount: 0,
      };

      // Add to history
      const updatedHistory = [newError, ...state.errorHistory].slice(0, 100); // Keep last 100 errors

      // Check if this is a critical error that should be global
      const isGlobalError = newError.severity === 'critical' || newError.type === 'system';

      return {
        ...state,
        errors: [...state.errors, newError],
        globalError: isGlobalError && !state.globalError ? newError : state.globalError,
        errorHistory: updatedHistory,
      };
    }

    case 'REMOVE_ERROR': {
      const updatedErrors = state.errors.filter(error => error.id !== action.payload.id);
      const updatedGlobalError = state.globalError?.id === action.payload.id ? null : state.globalError;

      return {
        ...state,
        errors: updatedErrors,
        globalError: updatedGlobalError,
      };
    }

    case 'UPDATE_ERROR': {
      const updatedErrors = state.errors.map(error =>
        error.id === action.payload.id ? { ...error, ...action.payload.updates } : error
      );

      const updatedGlobalError =
        state.globalError?.id === action.payload.id
          ? { ...state.globalError, ...action.payload.updates }
          : state.globalError;

      return {
        ...state,
        errors: updatedErrors,
        globalError: updatedGlobalError,
      };
    }

    case 'RETRY_ERROR': {
      const updatedErrors = state.errors.map(error =>
        error.id === action.payload.id ? { ...error, retryCount: error.retryCount + 1 } : error
      );

      return {
        ...state,
        errors: updatedErrors,
      };
    }

    case 'SET_GLOBAL_ERROR':
      return {
        ...state,
        globalError: action.payload,
      };

    case 'CLEAR_ALL_ERRORS':
      return {
        ...state,
        errors: [],
        globalError: null,
      };

    case 'CLEAR_ERRORS_BY_TYPE':
      return {
        ...state,
        errors: state.errors.filter(error => error.type !== action.payload.type),
        globalError: state.globalError?.type === action.payload.type ? null : state.globalError,
      };

    case 'DISMISS_ERROR': {
      const updatedErrors = state.errors.map(error =>
        error.id === action.payload.id ? { ...error, isVisible: false } : error
      );

      return {
        ...state,
        errors: updatedErrors,
      };
    }

    case 'TOGGLE_ERROR_DIALOG':
      return {
        ...state,
        isErrorDialogOpen: action.payload.isOpen,
      };

    case 'ADD_TO_HISTORY':
      return {
        ...state,
        errorHistory: [action.payload, ...state.errorHistory].slice(0, 100),
      };

    default:
      return state;
  }
}

// Context creation
const ErrorContext = createContext<{
  state: ErrorContextState;
  actions: {
    addError: (error: Omit<ErrorState, 'id' | 'timestamp' | 'retryCount'>) => string;
    removeError: (id: string) => void;
    updateError: (id: string, updates: Partial<ErrorState>) => void;
    retryError: (id: string) => void;
    setGlobalError: (error: ErrorState | null) => void;
    clearAllErrors: () => void;
    clearErrorsByType: (type: ErrorState['type']) => void;
    dismissError: (id: string) => void;
    showErrorDialog: () => void;
    hideErrorDialog: () => void;
    addApiError: (apiError: ApiError, context?: Record<string, any>) => string;
    addNetworkError: (message?: string, context?: Record<string, any>) => string;
    addValidationError: (message: string, context?: Record<string, any>) => string;
    addSystemError: (message: string, correlationId?: string, context?: Record<string, any>) => string;
  };
} | null>(null);

// Provider component
export function ErrorProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(errorReducer, initialState);

  // Auto-dismiss errors
  React.useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    state.errors.forEach(error => {
      if (error.autoDissmiss && error.dismissAfter && error.isVisible) {
        const timer = setTimeout(() => {
          dispatch({ type: 'DISMISS_ERROR', payload: { id: error.id } });
          // Remove after animation
          setTimeout(() => {
            dispatch({ type: 'REMOVE_ERROR', payload: { id: error.id } });
          }, 300);
        }, error.dismissAfter);
        timers.push(timer);
      }
    });

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [state.errors]);

  const addError = useCallback((error: Omit<ErrorState, 'id' | 'timestamp' | 'retryCount'>) => {
    const id = generateErrorId();
    dispatch({
      type: 'ADD_ERROR',
      payload: {
        ...error,
        id,
        isVisible: true,
        autoDissmiss: error.autoDissmiss ?? true,
        dismissAfter: error.dismissAfter ?? (error.severity === 'error' ? 10000 : 5000),
      },
    });
    return id;
  }, []);

  const removeError = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_ERROR', payload: { id } });
  }, []);

  const updateError = useCallback((id: string, updates: Partial<ErrorState>) => {
    dispatch({ type: 'UPDATE_ERROR', payload: { id, updates } });
  }, []);

  const retryError = useCallback((id: string) => {
    dispatch({ type: 'RETRY_ERROR', payload: { id } });
  }, []);

  const setGlobalError = useCallback((error: ErrorState | null) => {
    dispatch({ type: 'SET_GLOBAL_ERROR', payload: error });
  }, []);

  const clearAllErrors = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL_ERRORS' });
  }, []);

  const clearErrorsByType = useCallback((type: ErrorState['type']) => {
    dispatch({ type: 'CLEAR_ERRORS_BY_TYPE', payload: { type } });
  }, []);

  const dismissError = useCallback((id: string) => {
    dispatch({ type: 'DISMISS_ERROR', payload: { id } });
    // Remove after animation
    setTimeout(() => {
      dispatch({ type: 'REMOVE_ERROR', payload: { id } });
    }, 300);
  }, []);

  const showErrorDialog = useCallback(() => {
    dispatch({ type: 'TOGGLE_ERROR_DIALOG', payload: { isOpen: true } });
  }, []);

  const hideErrorDialog = useCallback(() => {
    dispatch({ type: 'TOGGLE_ERROR_DIALOG', payload: { isOpen: false } });
  }, []);

  // Specialized error creators
  const addApiError = useCallback(
    (apiError: ApiError, context?: Record<string, any>) => {
      const errorType =
        apiError.statusCode === 401 ? 'authentication' : apiError.statusCode === 403 ? 'authorization' : 'api';

      const severity = apiError.statusCode >= 500 ? 'error' : 'warning';

      return addError({
        type: errorType,
        severity,
        title: getApiErrorTitle(apiError),
        message: getApiErrorMessage(apiError),
        correlationId: apiError.correlationId,
        context: { ...context, apiError },
        isRetryable: apiError.isRetryable,
        maxRetries: apiError.isRetryable ? 3 : 0,
        autoDissmiss: severity !== 'error',
        dismissAfter: severity === 'error' ? 15000 : 8000,
        isVisible: true,
      });
    },
    [addError]
  );

  const addNetworkError = useCallback(
    (message = 'Network connection failed', context?: Record<string, any>) => {
      return addError({
        type: 'network',
        severity: 'warning',
        title: 'Connection Problem',
        message,
        context,
        isRetryable: true,
        maxRetries: 5,
        autoDissmiss: false, // Don't auto-dismiss network errors
        isVisible: true,
      });
    },
    [addError]
  );

  const addValidationError = useCallback(
    (message: string, context?: Record<string, any>) => {
      return addError({
        type: 'validation',
        severity: 'warning',
        title: 'Invalid Input',
        message,
        context,
        isRetryable: false,
        maxRetries: 0,
        autoDissmiss: true,
        dismissAfter: 8000,
        isVisible: true,
      });
    },
    [addError]
  );

  const addSystemError = useCallback(
    (message: string, correlationId?: string, context?: Record<string, any>) => {
      return addError({
        type: 'system',
        severity: 'error',
        title: 'System Error',
        message,
        correlationId,
        context,
        isRetryable: true,
        maxRetries: 2,
        autoDissmiss: false, // Don't auto-dismiss system errors
        isVisible: true,
      });
    },
    [addError]
  );

  const value = {
    state,
    actions: {
      addError,
      removeError,
      updateError,
      retryError,
      setGlobalError,
      clearAllErrors,
      clearErrorsByType,
      dismissError,
      showErrorDialog,
      hideErrorDialog,
      addApiError,
      addNetworkError,
      addValidationError,
      addSystemError,
    },
  };

  return <ErrorContext.Provider value={value}>{children}</ErrorContext.Provider>;
}

// Helper functions
function getApiErrorTitle(apiError: ApiError): string {
  switch (apiError.errorCode) {
    case 'UNAUTHORIZED':
      return 'Authentication Required';
    case 'FORBIDDEN':
      return 'Access Denied';
    case 'RESOURCE_NOT_FOUND':
      return 'Resource Not Found';
    case 'VALIDATION_ERROR':
      return 'Validation Error';
    case 'RATE_LIMIT_EXCEEDED':
      return 'Rate Limit Exceeded';
    case 'EXTERNAL_SERVICE_ERROR':
      return 'Service Unavailable';
    case 'MAINTENANCE_MODE':
      return 'Maintenance Mode';
    default:
      return 'API Error';
  }
}

function getApiErrorMessage(apiError: ApiError): string {
  switch (apiError.errorCode) {
    case 'UNAUTHORIZED':
      return 'Please log in to continue.';
    case 'FORBIDDEN':
      return "You don't have permission to perform this action.";
    case 'RESOURCE_NOT_FOUND':
      return 'The requested resource could not be found.';
    case 'VALIDATION_ERROR':
      return apiError.message || 'Please check your input and try again.';
    case 'RATE_LIMIT_EXCEEDED':
      return 'Too many requests. Please wait a moment and try again.';
    case 'EXTERNAL_SERVICE_ERROR':
      return 'A service is temporarily unavailable. Please try again later.';
    case 'MAINTENANCE_MODE':
      return 'The service is under maintenance. Please try again later.';
    default:
      return apiError.message || 'An unexpected error occurred.';
  }
}

// Hook to use the error context
export function useError() {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
}

// Hook for specific error types
export function useErrorHandling() {
  const { actions } = useError();

  const handleApiError = useCallback(
    (error: any, context?: Record<string, any>) => {
      if (error instanceof Error) {
        if ('errorCode' in error && 'statusCode' in error) {
          // It's an ApiError
          actions.addApiError(error as ApiError, context);
        } else {
          // Regular error, treat as system error
          actions.addSystemError(error.message, undefined, { ...context, stack: error.stack });
        }
      } else {
        actions.addSystemError('An unknown error occurred', undefined, context);
      }
    },
    [actions]
  );

  const handleNetworkError = useCallback(
    (context?: Record<string, any>) => {
      actions.addNetworkError(undefined, context);
    },
    [actions]
  );

  const handleValidationErrors = useCallback(
    (errors: Record<string, string[]>, context?: Record<string, any>) => {
      Object.entries(errors).forEach(([field, fieldErrors]) => {
        fieldErrors.forEach(error => {
          actions.addValidationError(`${field}: ${error}`, context);
        });
      });
    },
    [actions]
  );

  return {
    handleApiError,
    handleNetworkError,
    handleValidationErrors,
    ...actions,
  };
}

// Hook for error recovery
export function useErrorRecovery() {
  const { state, actions } = useError();

  const retryWithBackoff = useCallback(
    async (errorId: string, retryFunction: () => Promise<void>, maxRetries = 3, baseDelay = 1000) => {
      const error = state.errors.find(e => e.id === errorId);
      if (!error || error.retryCount >= maxRetries) {
        return false;
      }

      actions.retryError(errorId);

      // Calculate exponential backoff delay
      const delay = baseDelay * Math.pow(2, error.retryCount);

      try {
        await new Promise(resolve => setTimeout(resolve, delay));
        await retryFunction();
        actions.removeError(errorId);
        return true;
      } catch (_retryError) {
        if (error.retryCount + 1 >= maxRetries) {
          actions.updateError(errorId, {
            message: 'Maximum retry attempts reached. Please try again later.',
            isRetryable: false,
          });
        }
        return false;
      }
    },
    [state.errors, actions]
  );

  return {
    retryWithBackoff,
    canRetry: (errorId: string) => {
      const error = state.errors.find(e => e.id === errorId);
      return error ? error.isRetryable && error.retryCount < error.maxRetries : false;
    },
  };
}
