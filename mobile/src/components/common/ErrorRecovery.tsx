/**
 * Error Recovery Component for GeoLeap Mobile App
 * Provides automatic error recovery mechanisms and retry strategies
 * Handles different types of errors with appropriate recovery actions
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  BackHandler,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { logger } from '../../utils/logger';
import { useTheme } from '../../hooks/useTheme';

export interface ErrorRecoveryConfig {
  enableAutoRetry: boolean;
  maxRetries: number;
  retryDelay: number;
  exponentialBackoff: boolean;
  enableUserNotification: boolean;
  enableErrorReporting: boolean;
}

export interface ErrorInfo {
  type: 'network' | 'authentication' | 'validation' | 'server' | 'unknown';
  message: string;
  code?: string | number;
  timestamp: number;
  context?: string;
  retryable: boolean;
}

interface ErrorRecoveryProps {
  children: React.ReactNode;
  config?: Partial<ErrorRecoveryConfig>;
  onError?: (error: ErrorInfo) => void;
  onRecovered?: (error: ErrorInfo, attempt: number) => void;
  onFailed?: (error: ErrorInfo, totalAttempts: number) => void;
}

const defaultConfig: ErrorRecoveryConfig = {
  enableAutoRetry: true,
  maxRetries: 3,
  retryDelay: 1000,
  exponentialBackoff: true,
  enableUserNotification: true,
  enableErrorReporting: true,
};

/**
 * Error Recovery Component
 */
export const ErrorRecovery: React.FC<ErrorRecoveryProps> = ({
  children,
  config = {},
  onError,
  onRecovered,
  onFailed,
}) => {
  const [currentError, setCurrentError] = useState<ErrorInfo | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRecovering, setIsRecovering] = useState(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryAction, setRecoveryAction] = useState<(() => Promise<void>) | null>(null);

  const finalConfig = { ...defaultConfig, ...config };
  const { isConnected, isInternetReachable } = useNetworkStatus();
  const { theme } = useTheme();
  const styles = createStyles(theme);

  // Analyze and categorize error
  const analyzeError = (error: any): ErrorInfo => {
    const timestamp = Date.now();

    if (error?.code === 'NETWORK_ERROR' || !isConnected || !isInternetReachable) {
      return {
        type: 'network',
        message: 'Network connection unavailable',
        code: error?.code,
        timestamp,
        context: error?.context,
        retryable: true,
      };
    }

    if (error?.status === 401 || error?.code === 'AUTHENTICATION_ERROR') {
      return {
        type: 'authentication',
        message: 'Authentication required',
        code: error?.status || error?.code,
        timestamp,
        context: error?.context,
        retryable: false,
      };
    }

    if (error?.status === 422 || error?.code === 'VALIDATION_ERROR') {
      return {
        type: 'validation',
        message: error?.message || 'Invalid data provided',
        code: error?.status || error?.code,
        timestamp,
        context: error?.context,
        retryable: false,
      };
    }

    if (error?.status && error.status >= 500) {
      return {
        type: 'server',
        message: 'Server error occurred',
        code: error?.status,
        timestamp,
        context: error?.context,
        retryable: true,
      };
    }

    return {
      type: 'unknown',
      message: error?.message || 'An unexpected error occurred',
      code: error?.code,
      timestamp,
      context: error?.context,
      retryable: true,
    };
  };

  // Calculate retry delay with exponential backoff
  const getRetryDelay = (attempt: number): number => {
    if (!finalConfig.exponentialBackoff) {
      return finalConfig.retryDelay;
    }

    return Math.min(
      finalConfig.retryDelay * Math.pow(2, attempt),
      30000, // Max 30 seconds
    );
  };

  // Attempt error recovery
  const attemptRecovery = async (error: ErrorInfo, recoveryFunction?: () => Promise<void>) => {
    if (!error.retryable || retryCount >= finalConfig.maxRetries) {
      logger.error('Error recovery failed - not retryable or max retries reached', {
        error,
        retryCount,
        maxRetries: finalConfig.maxRetries,
      });

      onFailed?.(error, retryCount);
      return false;
    }

    setIsRecovering(true);
    setRetryCount(prev => prev + 1);

    try {
      logger.info('Attempting error recovery', {
        errorType: error.type,
        attempt: retryCount + 1,
        maxRetries: finalConfig.maxRetries,
      });

      // Wait before retrying
      const delay = getRetryDelay(retryCount);
      await new Promise<void>(resolve => setTimeout(resolve, delay));

      // Execute recovery function if provided
      if (recoveryFunction) {
        await recoveryFunction();
      }

      // Execute default recovery based on error type
      await executeDefaultRecovery(error);

      logger.info('Error recovery successful', {
        errorType: error.type,
        attempt: retryCount + 1,
      });

      setCurrentError(null);
      setRetryCount(0);
      onRecovered?.(error, retryCount + 1);
      return true;

    } catch (recoveryError: any) {
      logger.error('Error recovery attempt failed', {
        originalError: error,
        recoveryError: recoveryError.message,
        attempt: retryCount + 1,
      });

      // Schedule next retry if enabled
      if (finalConfig.enableAutoRetry && retryCount < finalConfig.maxRetries - 1) {
        const nextDelay = getRetryDelay(retryCount + 1);
        setTimeout(() => {
          attemptRecovery(error, recoveryFunction);
        }, nextDelay);
      } else {
        onFailed?.(error, retryCount + 1);
      }

      return false;
    } finally {
      setIsRecovering(false);
    }
  };

  // Execute default recovery actions based on error type
  const executeDefaultRecovery = async (error: ErrorInfo): Promise<void> => {
    switch (error.type) {
      case 'network':
        // Network errors - just retry the operation
        logger.debug('Executing network recovery - will retry operation');
        break;

      case 'authentication':
        // Authentication errors - redirect to login
        logger.debug('Executing authentication recovery');
        // In a real app, this would navigate to login screen
        Alert.alert(
          'Authentication Required',
          'Please log in again to continue.',
          [{ text: 'OK' }],
        );
        break;

      case 'validation':
        // Validation errors - user needs to fix input
        logger.debug('Validation error - user intervention required');
        throw new Error('Validation errors require user intervention');

      case 'server':
        // Server errors - retry after delay
        logger.debug('Executing server recovery - waiting for server to recover');
        break;

      default:
        // Unknown errors - retry as last resort
        logger.debug('Executing unknown error recovery - generic retry');
        break;
    }
  };

  // Handle manual retry
  const handleManualRetry = () => {
    if (currentError && recoveryAction) {
      attemptRecovery(currentError, recoveryAction);
    } else if (currentError) {
      attemptRecovery(currentError);
    }
  };

  // Handle dismiss error
  const handleDismissError = () => {
    setCurrentError(null);
    setRetryCount(0);
    setShowRecoveryModal(false);
    setRecoveryAction(null);
  };

  // Global error handler
  const handleGlobalError = (error: any, recoveryFunction?: () => Promise<void>) => {
    const errorInfo = analyzeError(error);
    setCurrentError(errorInfo);
    setRecoveryAction(() => recoveryFunction || null);

    logger.error('Global error caught', errorInfo);
    onError?.(errorInfo);

    // Show modal for user notification if enabled
    if (finalConfig.enableUserNotification) {
      setShowRecoveryModal(true);
    } else if (finalConfig.enableAutoRetry) {
      // Auto-retry without user notification
      attemptRecovery(errorInfo, recoveryFunction);
    }
  };

  // Setup global error handling
  useEffect(() => {
    // Override global error handlers
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      originalConsoleError(...args);

      // Check if this is a recoverable error
      const errorArg = args.find(arg => arg instanceof Error || (arg && typeof arg === 'object'));
      if (errorArg) {
        handleGlobalError(errorArg);
      }
    };

    // Handle unhandled promise rejections (React Native specific)
    let originalHandler: ((error: any, isFatal?: boolean) => void) | undefined;
    if (typeof globalThis !== 'undefined' && 'ErrorUtils' in globalThis) {
      const ErrorUtils = (globalThis as any).ErrorUtils;
      originalHandler = ErrorUtils?.getGlobalHandler?.();
      if (ErrorUtils && originalHandler) {
        ErrorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
          logger.error('Unhandled error', { error, isFatal });
          handleGlobalError(error);
          if (originalHandler) {
            originalHandler(error, isFatal);
          }
        });
      }
    }

    // Handle back button during recovery
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isRecovering) {
        return true; // Prevent back button during recovery
      }
      return false;
    });

    return () => {
      console.error = originalConsoleError;
      // Restore original ErrorUtils handler if it exists
      if (typeof globalThis !== 'undefined' && 'ErrorUtils' in globalThis && originalHandler) {
        const ErrorUtils = (globalThis as any).ErrorUtils;
        ErrorUtils.setGlobalHandler(originalHandler);
      }
      backHandler.remove();
    };
  }, [isRecovering]);

  // Reset state when network is restored
  useEffect(() => {
    if (isConnected && isInternetReachable && currentError?.type === 'network') {
      logger.info('Network restored, resetting error state');
      setCurrentError(null);
      setRetryCount(0);
      setShowRecoveryModal(false);
    }
  }, [isConnected, isInternetReachable, currentError]);

  return (
    <>
      {children}

      {/* Recovery Modal */}
      <Modal
        visible={showRecoveryModal}
        transparent
        animationType="fade"
        onRequestClose={handleDismissError}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Icon
              name={currentError?.type === 'network' ? 'wifi-off' : 'error-outline'}
              size={48}
              color={currentError?.type === 'network' ? theme.colors.warning[500] : theme.colors.error[500]}
            />

            <Text style={styles.modalTitle}>
              {currentError?.type === 'network' ? 'Connection Issue' : 'Something went wrong'}
            </Text>

            <Text style={styles.modalMessage}>
              {currentError?.message}
            </Text>

            {isRecovering && (
              <View style={styles.recoveringContainer}>
                <Icon name="hourglass-empty" size={20} color={theme.colors.primary[500]} />
                <Text style={styles.recoveringText}>
                  Attempting recovery... ({retryCount}/{finalConfig.maxRetries})
                </Text>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.retryButton]}
                onPress={handleManualRetry}
                disabled={isRecovering}
              >
                <Icon name="refresh" size={20} color={theme.semantic.background.primary} />
                <Text style={styles.modalButtonText}>Retry</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.dismissButton]}
                onPress={handleDismissError}
              >
                <Icon name="close" size={20} color={theme.semantic.text.secondary} />
                <Text style={[styles.modalButtonText, { color: theme.semantic.text.secondary }]}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

// Hook for using error recovery
export const useErrorRecovery = () => {
  const [errorRecoveryConfig, setErrorRecoveryConfig] = useState<ErrorRecoveryConfig>(defaultConfig);

  const handleError = (error: any, recoveryFunction?: () => Promise<void>) => {
    logger.error('Error recovery triggered', error);

    // In a real implementation, this would communicate with the ErrorRecovery component
    // For now, we'll just log and attempt basic recovery

    if (recoveryFunction) {
      setTimeout(() => {
        recoveryFunction().catch(err => {
          logger.error('Recovery function failed', err);
        });
      }, 1000);
    }
  };

  const updateConfig = (newConfig: Partial<ErrorRecoveryConfig>) => {
    setErrorRecoveryConfig(prev => ({ ...prev, ...newConfig }));
  };

  return {
    handleError,
    config: errorRecoveryConfig,
    updateConfig,
  };
};

// Dynamic styles function - receives theme from useTheme() hook
const createStyles = (theme: any) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay.lightMedium,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing[5],
  },
  modalContent: {
    backgroundColor: theme.semantic.background.primary,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing[6],
    alignItems: 'center',
    maxWidth: 320,
    width: '100%',
  },
  modalTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.semantic.text.primary,
    marginTop: theme.spacing[4],
    marginBottom: theme.spacing[2],
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: theme.typography.fontSize.base,
    color: theme.semantic.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing[5],
    lineHeight: theme.typography.lineHeight.relaxed,
  },
  recoveringContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing[5],
  },
  recoveringText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary[500],
    marginLeft: theme.spacing[2],
  },
  modalActions: {
    flexDirection: 'row',
    gap: theme.spacing[3],
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[2],
    borderRadius: theme.borderRadius.lg,
    minWidth: 80,
    justifyContent: 'center',
  },
  retryButton: {
    backgroundColor: theme.colors.primary[500],
  },
  dismissButton: {
    backgroundColor: theme.semantic.background.secondary,
  },
  modalButtonText: {
    color: theme.semantic.background.primary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    marginLeft: theme.spacing[1],
  },
});

export default ErrorRecovery;
