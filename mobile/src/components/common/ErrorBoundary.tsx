/**
 * Error Boundary Component for GeoLeap Mobile App
 * Catches JavaScript errors in component trees and displays fallback UI
 * Provides error reporting and recovery mechanisms
 */

import React, { Component, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { logger } from '../../utils/logger';
import { designTokens, semantic } from '../../tokens/designTokens';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: any, reset: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
  enableRetry?: boolean;
  enableReport?: boolean;
  maxRetries?: number;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
  retryCount: number;
}

/**
 * Error Boundary Component
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeouts: ReturnType<typeof setTimeout>[] = [];

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error
    logger.error('Error Boundary caught an error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      retryCount: this.state.retryCount,
    });

    // Report error if callback provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  componentWillUnmount() {
    // Clear any pending retry timeouts
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
  }

  handleRetry = () => {
    const { maxRetries = 3 } = this.props;
    const { retryCount } = this.state;

    if (retryCount >= maxRetries) {
      Alert.alert(
        'Max Retries Reached',
        'The component has failed multiple times. Please restart the app or contact support.',
        [{ text: 'OK' }],
      );
      return;
    }

    // Clear any existing timeouts
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
    this.retryTimeouts = [];

    // Schedule retry with exponential backoff
    const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);

    const timeout = setTimeout(() => {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1,
      }));
    }, delay);

    this.retryTimeouts.push(timeout);
  };

  handleReport = () => {
    const { error, errorInfo } = this.state;

    if (!error) {return;}

    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      retryCount: this.state.retryCount,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
    };

    // In a real app, this would send to an error reporting service
    logger.info('Error report generated:', errorReport);

    Alert.alert(
      'Error Reported',
      'Thank you for helping us improve the app. The error details have been logged.',
      [{ text: 'OK' }],
    );
  };

  render() {
    const { children, fallback, enableRetry = true, enableReport = true } = this.props;
    const { hasError, error, errorInfo, retryCount } = this.state;

    if (hasError && error) {
      // Custom fallback component
      if (fallback) {
        return fallback(error, errorInfo, this.handleRetry);
      }

      // Default fallback UI
      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <Icon name="error-outline" size={64} color={semantic.status.error} />
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.message}>
              An unexpected error occurred. Please try again or contact support if the problem persists.
            </Text>

            {__DEV__ && (
              <ScrollView style={styles.errorDetails}>
                <Text style={styles.errorTitle}>Error Details:</Text>
                <Text style={styles.errorText}>{error.message}</Text>
                {error.stack && (
                  <Text style={styles.errorText}>{error.stack}</Text>
                )}
              </ScrollView>
            )}

            <View style={styles.actions}>
              {enableRetry && retryCount < (this.props.maxRetries || 3) && (
                <TouchableOpacity
                  style={[styles.button, styles.retryButton]}
                  onPress={this.handleRetry}
                  accessibilityLabel="Retry loading the app"
                  accessibilityRole="button"
                  accessibilityHint="Double tap to try loading again"
                >
                  <Icon name="refresh" size={20} color="white" />
                  <Text style={styles.buttonText}>Retry</Text>
                </TouchableOpacity>
              )}

              {enableReport && (
                <TouchableOpacity
                  style={[styles.button, styles.reportButton]}
                  onPress={this.handleReport}
                  accessibilityLabel="Report this error"
                  accessibilityRole="button"
                  accessibilityHint="Double tap to send an error report"
                >
                  <Icon name="bug-report" size={20} color="white" />
                  <Text style={styles.buttonText}>Report</Text>
                </TouchableOpacity>
              )}
            </View>

            {retryCount > 0 && (
              <Text style={styles.retryInfo}>
                Retry attempt: {retryCount}/{this.props.maxRetries || 3}
              </Text>
            )}
          </View>
        </View>
      );
    }

    return children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: semantic.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: designTokens.spacing[5],
  },
  content: {
    alignItems: 'center',
    maxWidth: 400,
  },
  title: {
    fontSize: designTokens.typography.fontSize['2xl'],
    fontWeight: designTokens.typography.fontWeight.bold,
    color: semantic.text.primary,
    marginTop: designTokens.spacing[4],
    marginBottom: designTokens.spacing[2],
    textAlign: 'center',
  },
  message: {
    fontSize: designTokens.typography.fontSize.base,
    color: semantic.text.secondary,
    textAlign: 'center',
    marginBottom: designTokens.spacing[6],
    lineHeight: designTokens.typography.lineHeight.relaxed,
  },
  errorDetails: {
    backgroundColor: semantic.background.primary,
    padding: designTokens.spacing[4],
    borderRadius: designTokens.borderRadius.lg,
    maxHeight: 200,
    marginBottom: designTokens.spacing[6],
    width: '100%',
  },
  errorTitle: {
    fontSize: designTokens.typography.fontSize.sm,
    fontWeight: designTokens.typography.fontWeight.bold,
    color: semantic.text.primary,
    marginBottom: designTokens.spacing[2],
  },
  errorText: {
    fontSize: designTokens.typography.fontSize.xs,
    color: semantic.text.secondary,
    fontFamily: 'monospace',
  },
  actions: {
    flexDirection: 'row',
    gap: designTokens.spacing[3],
    marginBottom: designTokens.spacing[4],
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: designTokens.spacing[5],
    paddingVertical: designTokens.spacing[3],
    borderRadius: designTokens.borderRadius.lg,
    minWidth: 100,
    minHeight: 44,
    justifyContent: 'center',
  },
  retryButton: {
    backgroundColor: designTokens.colors.primary[500],
  },
  reportButton: {
    backgroundColor: designTokens.colors.warning[500],
  },
  buttonText: {
    color: semantic.background.primary,
    fontSize: designTokens.typography.fontSize.base,
    fontWeight: designTokens.typography.fontWeight.semibold,
    marginLeft: designTokens.spacing[2],
  },
  retryInfo: {
    fontSize: designTokens.typography.fontSize.xs,
    color: semantic.text.secondary,
    textAlign: 'center',
  },
});

export default ErrorBoundary;

/**
 * Dashboard Error Fallback Component
 *
 * Specialized lightweight fallback UI for dashboard sections
 * Shows a minimal error message without taking up too much space
 */
export const DashboardErrorFallback: React.FC = () => (
  <View style={dashboardFallbackStyles.container}>
    <Icon name="error-outline" size={32} color={semantic.status.warning} />
    <Text style={dashboardFallbackStyles.text}>
      Unable to load this section
    </Text>
  </View>
);

const dashboardFallbackStyles = StyleSheet.create({
  container: {
    padding: designTokens.spacing[5],
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
    backgroundColor: semantic.background.secondary,
    borderRadius: designTokens.borderRadius.lg,
  },
  text: {
    fontSize: designTokens.typography.fontSize.sm,
    color: semantic.text.secondary,
    textAlign: 'center',
    marginTop: designTokens.spacing[2],
  },
});

export { ErrorBoundary };
