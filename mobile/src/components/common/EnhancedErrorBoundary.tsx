import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { designTokens } from '../../tokens/designTokens';
import { logger } from '../../utils/logger';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
  errorId: string;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: any, errorId: string) => void;
  enableCrashReporting?: boolean;
  enableRetry?: boolean;
  maxRetries?: number;
}

interface ErrorLog {
  errorId: string;
  timestamp: number;
  error: string;
  stack: string;
  componentStack: string;
  userInfo: any;
}

class ErrorBoundaryClass extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryCount = 0;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error details
    const errorLog: ErrorLog = {
      errorId: this.state.errorId,
      timestamp: Date.now(),
      error: error.toString(),
      stack: error.stack || '',
      componentStack: errorInfo.componentStack || '',
      userInfo: {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
        platform: typeof Platform !== 'undefined' ? Platform.OS : 'Unknown',
        version: typeof Platform !== 'undefined' ? Platform.Version : 'Unknown',
      },
    };

    logger.error('[EnhancedErrorBoundary] Error caught', { errorLog });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo, this.state.errorId);
    }

    // Store error for crash reporting (in production)
    if (this.props.enableCrashReporting) {
      this.storeErrorForReporting(errorLog);

      // Report to Sentry
      Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo.componentStack } } });
    }
  }

  // BUG-ERROR-001 FIX: Use AsyncStorage instead of localStorage for React Native
  private storeErrorForReporting = async (errorLog: ErrorLog) => {
    try {
      // Store in AsyncStorage for later reporting
      // This would be connected to a crash reporting service like Sentry, Crashlytics, etc.
      const existingErrors = await this.getStoredErrors();
      existingErrors.push(errorLog);

      // Keep only last 50 errors to prevent storage bloat
      const recentErrors = existingErrors.slice(-50);

      await AsyncStorage.setItem('geoleap_error_logs', JSON.stringify(recentErrors));
    } catch (e) {
      logger.warn('[EnhancedErrorBoundary] Failed to store error for reporting', e);
    }
  };

  private getStoredErrors = async (): Promise<ErrorLog[]> => {
    try {
      const stored = await AsyncStorage.getItem('geoleap_error_logs');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      logger.warn('[EnhancedErrorBoundary] Failed to retrieve stored errors', e);
    }
    return [];
  };

  private handleRetry = () => {
    const { maxRetries = 3 } = this.props;

    if (this.retryCount < maxRetries) {
      this.retryCount++;
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: '',
      });
    }
  };

  private handleReset = () => {
    this.retryCount = 0;
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    });
  };

  private handleReportError = () => {
    const { error, errorInfo, errorId } = this.state;

    // In a real app, this would send the error to your crash reporting service
    const errorReport = {
      errorId,
      error: error?.toString(),
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: Date.now(),
    };

    logger.log('[EnhancedErrorBoundary] Error report generated', { errorReport });

    // Send user-triggered report to Sentry
    if (error) {
      Sentry.captureException(error);
    }
  };

  render() {
    const { hasError, error, errorInfo, errorId } = this.state;
    const { children, fallback, enableRetry = true, maxRetries = 3 } = this.props;

    if (hasError) {
      if (fallback) {
        return fallback;
      }

      return (
        <ErrorBoundaryFallback
          error={error}
          errorInfo={errorInfo}
          errorId={errorId}
          onRetry={enableRetry ? this.handleRetry : undefined}
          onReset={this.handleReset}
          onReport={this.handleReportError}
          retryCount={this.retryCount}
          maxRetries={maxRetries}
        />
      );
    }

    return children;
  }
}

// Error Boundary Fallback Component
const ErrorBoundaryFallback: React.FC<{
  error: Error | null;
  errorInfo: any;
  errorId: string;
  onRetry?: () => void;
  onReset: () => void;
  onReport: () => void;
  retryCount: number;
  maxRetries: number;
}> = ({ error, errorInfo, errorId, onRetry, onReset, onReport, retryCount, maxRetries }) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.semantic.background.primary }]}>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={[styles.title, { color: theme.semantic.text.primary }]}>
            Oops! Something went wrong
          </Text>

          <Text style={[styles.subtitle, { color: theme.semantic.text.secondary }]}>
            We're sorry, but an unexpected error occurred. Our team has been notified.
          </Text>

          {error && (
            <View style={[styles.errorContainer, { backgroundColor: theme.semantic.background.secondary }]}>
              <Text style={[styles.errorTitle, { color: theme.semantic.text.secondary }]}>
                Error Details:
              </Text>
              <Text style={[styles.errorText, { color: theme.semantic.text.secondary }]}>
                {error.toString()}
              </Text>

              <Text style={[styles.errorId, { color: theme.semantic.text.secondary }]}>
                Error ID: {errorId}
              </Text>
            </View>
          )}

          <View style={styles.actionsContainer}>
            {onRetry && retryCount < maxRetries && (
              <TouchableOpacity
                style={[styles.button, styles.retryButton, { backgroundColor: theme.colors.primary[500] }]}
                onPress={onRetry}
              >
                <Text style={[styles.buttonText, { color: theme.semantic.text.inverse }]}>
                  Try Again ({maxRetries - retryCount} attempts left)
                </Text>
              </TouchableOpacity>
            )}

            {retryCount >= maxRetries && (
              <TouchableOpacity
                style={[styles.button, styles.resetButton, { backgroundColor: theme.colors.secondary[500] }]}
                onPress={onReset}
              >
                <Text style={[styles.buttonText, { color: theme.semantic.text.inverse }]}>
                  Reset & Start Over
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.button, styles.reportButton, { borderColor: theme.semantic.border.primary }]}
              onPress={onReport}
            >
              <Text style={[styles.reportButtonText, { color: theme.colors.primary[500] }]}>
                Report This Issue
              </Text>
            </TouchableOpacity>
          </View>

          {__DEV__ && errorInfo && (
            <View style={[styles.devContainer, { backgroundColor: theme.colors.error[50] }]}>
              <Text style={[styles.devTitle, { color: theme.colors.error[700] }]}>
                Development Info:
              </Text>
              <Text style={[styles.devText, { color: theme.colors.error[700] }]}>
                Component Stack:
              </Text>
              <ScrollView style={styles.devScroll}>
                <Text style={[styles.devStack, { color: theme.colors.error[700] }]}>
                  {errorInfo.componentStack}
                </Text>
              </ScrollView>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

// Enhanced Error Boundary Hook for functional components
export const useErrorBoundary = () => {
  const [error, setError] = React.useState<Error | null>(null);
  const [errorId, setErrorId] = React.useState<string>('');

  const reset = React.useCallback(() => {
    setError(null);
    setErrorId('');
  }, []);

  const captureError = React.useCallback((error: Error) => {
    const id = `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setError(error);
    setErrorId(id);

    logger.error('[EnhancedErrorBoundary] Error Boundary Hook captured error', {
      errorId: id,
      error: error.toString(),
      stack: error.stack,
    });
  }, []);

  return {
    error,
    errorId,
    captureError,
    reset,
  };
};

// Error Boundary Provider for context-based error handling
export const ErrorBoundaryProvider: React.FC<{
  children: ReactNode;
  onError?: (error: Error, errorInfo: any, errorId: string) => void;
}> = ({ children, onError }) => {
  return (
    <ErrorBoundaryClass
      onError={onError}
      enableCrashReporting={true}
      enableRetry={true}
      maxRetries={3}
    >
      {children}
    </ErrorBoundaryClass>
  );
};

// Main Error Boundary export
const EnhancedErrorBoundary = ErrorBoundaryClass;

export default EnhancedErrorBoundary;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: designTokens.spacing[5],
    justifyContent: 'center',
  },
  title: {
    fontSize: designTokens.typography.fontSize['2xl'],
    fontWeight: designTokens.typography.fontWeight.bold,
    textAlign: 'center',
    marginBottom: designTokens.spacing[3],
  },
  subtitle: {
    fontSize: designTokens.typography.fontSize.base,
    textAlign: 'center',
    marginBottom: designTokens.spacing[6],
    lineHeight: designTokens.typography.lineHeight.normal,
  },
  errorContainer: {
    padding: designTokens.spacing[4],
    borderRadius: designTokens.borderRadius.lg,
    marginBottom: designTokens.spacing[6],
  },
  errorTitle: {
    fontSize: designTokens.typography.fontSize.base,
    fontWeight: designTokens.typography.fontWeight.semibold,
    marginBottom: designTokens.spacing[2],
  },
  errorText: {
    fontSize: designTokens.typography.fontSize.sm,
    fontFamily: 'monospace',
    marginBottom: designTokens.spacing[2],
  },
  errorId: {
    fontSize: designTokens.typography.fontSize.xs,
    opacity: 0.7,
  },
  actionsContainer: {
    marginBottom: designTokens.spacing[6],
  },
  button: {
    padding: designTokens.spacing[4],
    borderRadius: designTokens.borderRadius.lg,
    alignItems: 'center',
    marginBottom: designTokens.spacing[3],
  },
  retryButton: {
    // Primary button style
  },
  resetButton: {
    // Secondary button style
  },
  reportButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  buttonText: {
    fontSize: designTokens.typography.fontSize.base,
    fontWeight: designTokens.typography.fontWeight.semibold,
  },
  reportButtonText: {
    fontSize: designTokens.typography.fontSize.base,
    fontWeight: designTokens.typography.fontWeight.semibold,
  },
  devContainer: {
    padding: designTokens.spacing[4],
    borderRadius: designTokens.borderRadius.lg,
    marginTop: designTokens.spacing[4],
  },
  devTitle: {
    fontSize: designTokens.typography.fontSize.base,
    fontWeight: designTokens.typography.fontWeight.semibold,
    marginBottom: designTokens.spacing[2],
  },
  devText: {
    fontSize: designTokens.typography.fontSize.sm,
    fontWeight: designTokens.typography.fontWeight.medium,
    marginBottom: designTokens.spacing[1],
  },
  devScroll: {
    maxHeight: 200,
  },
  devStack: {
    fontSize: designTokens.typography.fontSize.xs,
    fontFamily: 'monospace',
  },
});
