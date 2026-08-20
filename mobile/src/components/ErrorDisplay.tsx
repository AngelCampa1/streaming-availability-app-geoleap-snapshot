import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../hooks/useTheme';
import { designTokens } from '../tokens/designTokens';
import { accessibilityService } from '../services/accessibility/AccessibilityService';
import { logger } from '../utils/logger';

export interface ErrorDisplayProps {
  error: string | Error;
  type?: 'network' | 'server' | 'validation' | 'permission' | 'general';
  onRetry?: () => void;
  onDismiss?: () => void;
  style?: ViewStyle;
  showIcon?: boolean;
  variant?: 'inline' | 'card' | 'banner';
  retryLabel?: string;
  dismissLabel?: string;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  type = 'general',
  onRetry,
  onDismiss,
  style,
  showIcon = true,
  variant = 'inline',
  retryLabel = 'Try Again',
  dismissLabel = 'Dismiss',
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const settings = accessibilityService.getSettings();

  const errorMessage = error instanceof Error ? error.message : error;

  const getErrorIcon = () => {
    switch (type) {
      case 'network':
        return 'wifi-off';
      case 'server':
        return 'error';
      case 'validation':
        return 'warning';
      case 'permission':
        return 'block';
      default:
        return 'error';
    }
  };

  const getErrorTitle = () => {
    switch (type) {
      case 'network':
        return 'Connection Error';
      case 'server':
        return 'Server Error';
      case 'validation':
        return 'Validation Error';
      case 'permission':
        return 'Permission Denied';
      default:
        return 'Error';
    }
  };

  const getErrorDescription = () => {
    switch (type) {
      case 'network':
        return 'Please check your internet connection and try again.';
      case 'server':
        return 'Our servers are experiencing issues. Please try again later.';
      case 'validation':
        return 'Please check your input and try again.';
      case 'permission':
        return 'You don\'t have permission to perform this action.';
      default:
        return 'An unexpected error occurred.';
    }
  };

  const getVariantStyles = (): ViewStyle => {
    const baseStyles: ViewStyle = {
      padding: theme.spacing[4],
      borderRadius: theme.borderRadius.lg,
    };

    switch (variant) {
      case 'card':
        return {
          ...baseStyles,
          backgroundColor: theme.semantic.background.primary,
          borderWidth: 1,
          borderColor: theme.colors.error[300],
          ...theme.shadows.md,
        };
      case 'banner':
        return {
          ...baseStyles,
          backgroundColor: theme.colors.error[50],
          borderWidth: 1,
          borderColor: theme.colors.error[200],
        };
      default:
        return {
          ...baseStyles,
          backgroundColor: theme.colors.error[50],
          borderWidth: 1,
          borderColor: theme.colors.error[200],
        };
    }
  };

  const getIconColor = () => {
    return theme.colors.error[500];
  };


  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    }
  };

  const handleDismiss = () => {
    if (onDismiss) {
      onDismiss();
    }
  };

  const showErrorDetails = () => {
    if (process.env.NODE_ENV === 'development') {
      Alert.alert(
        'Error Details',
        errorMessage,
        [{ text: 'OK' }],
        { cancelable: true },
      );
    }
  };

  return (
    <View style={[getVariantStyles(), style]} >
      <View style={styles.contentContainer}>
        {showIcon && (
          <View style={styles.iconContainer}>
            <Icon
              name={getErrorIcon()}
              size={24}
              color={getIconColor()}
              accessible={false}
            />
          </View>
        )}

        <View style={styles.textContainer}>
          {variant !== 'inline' && (
            <Text style={styles.title}>{getErrorTitle()}</Text>
          )}

          <Text style={styles.description}>{getErrorDescription()}</Text>

          {process.env.NODE_ENV === 'development' && errorMessage && (
            <TouchableOpacity
              style={styles.debugButton}
              onPress={showErrorDetails}
              accessibilityLabel="Show error details"
              accessibilityRole="button"
            >
              <Text style={styles.debugText}>View Details</Text>
              <Icon name="info" size={16} color={theme.colors.gray[500]} />
            </TouchableOpacity>
          )}
        </View>

        {onDismiss && variant === 'banner' && (
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={handleDismiss}
            accessibilityLabel="Dismiss error"
            accessibilityRole="button"
          >
            <Icon name="close" size={20} color={theme.colors.gray[500]} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.actionsContainer}>
        {onRetry && (
          <TouchableOpacity
            style={[
              styles.retryButton,
              settings.reduceMotion && styles.retryButtonNoAnimation,
            ]}
            onPress={handleRetry}
            accessibilityLabel={retryLabel}
            accessibilityRole="button"
          >
            <Icon name="refresh" size={18} color={theme.semantic.background.primary} />
            <Text style={styles.retryText}>{retryLabel}</Text>
          </TouchableOpacity>
        )}

        {onDismiss && variant !== 'banner' && (
          <TouchableOpacity
            style={styles.dismissActionButton}
            onPress={handleDismiss}
            accessibilityLabel={dismissLabel}
            accessibilityRole="button"
          >
            <Text style={styles.dismissActionText}>{dismissLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// Error boundary component for React Native
export interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<
  React.PropsWithChildren<{
    fallback?: React.ComponentType<{ error?: Error; reset: () => void }>;
    onError?: (error: Error) => void;
  }>,
  ErrorBoundaryState
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    this.setState({ error });

    // Log error in development
    if (process.env.NODE_ENV === 'development') {
      logger.error('[ErrorBoundary] Error caught by boundary', error);
    }

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error);
    }
  }

  reset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      const { fallback: Fallback } = this.props;

      if (Fallback) {
        return <Fallback error={this.state.error} reset={this.reset} />;
      }

      return (
        <View style={boundaryStyles.fullScreenContainer}>
          <View style={boundaryStyles.fullScreenContent}>
            <Icon
              name="error"
              size={64}
              color={designTokens.colors.error[500]}
              accessible={false}
            />
            <Text style={boundaryStyles.fullScreenTitle}>Something went wrong</Text>
            <Text style={boundaryStyles.fullScreenDescription}>
              We're sorry, but something unexpected happened. Please try again.
            </Text>

            <ErrorDisplay
              error={this.state.error || 'Unknown error'}
              type="general"
              onRetry={this.reset}
              variant="card"
              style={boundaryStyles.fullScreenError}
            />
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

// Hook for handling errors in functional components
export const useErrorHandler = () => {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const handleError = React.useCallback((error: Error | string) => {
    const errorObj = error instanceof Error ? error : new Error(error);
    setError(errorObj);
  }, []);

  const showErrorAlert = React.useCallback((error: Error | string, title?: string) => {
    const errorMessage = error instanceof Error ? error.message : error;
    Alert.alert(
      title || 'Error',
      errorMessage,
      [{ text: 'OK', onPress: resetError }],
      { cancelable: true },
    );
  }, [resetError]);

  // Log errors when they occur
  React.useEffect(() => {
    if (error) {
      logger.error('[useErrorHandler] Error handled by useErrorHandler', error);
    }
  }, [error]);

  return {
    error,
    handleError,
    resetError,
    showErrorAlert,
    hasError: !!error,
  };
};

// Dynamic styles for ErrorDisplay functional component (supports theme switching)
const createStyles = (theme: any) => StyleSheet.create({
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing[3],
  },
  iconContainer: {
    marginRight: theme.spacing[3],
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.semantic.text.primary,
    marginBottom: theme.spacing[2],
  },
  description: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.semantic.text.secondary,
    lineHeight: theme.typography.lineHeight.normal,
    marginBottom: theme.spacing[2],
  },
  debugButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: theme.spacing[1],
    paddingHorizontal: theme.spacing[2],
    backgroundColor: theme.colors.gray[100],
    borderRadius: theme.borderRadius.sm,
    marginTop: theme.spacing[2],
  },
  debugText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.gray[600],
    marginRight: theme.spacing[1],
    fontFamily: 'monospace',
  },
  dismissButton: {
    marginLeft: theme.spacing[2],
    padding: theme.spacing[1],
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing[3],
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.error[500],
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
    borderRadius: theme.borderRadius.lg,
    minWidth: 120,
    justifyContent: 'center',
    ...theme.shadows.sm,
  },
  retryButtonNoAnimation: {
    // Styles for reduced motion
    transform: undefined,
  },
  retryText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.semantic.background.primary,
    marginLeft: theme.spacing[2],
  },
  dismissActionButton: {
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.gray[300],
    backgroundColor: theme.semantic.background.primary,
    marginLeft: theme.spacing[3],
  },
  dismissActionText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.semantic.text.secondary,
  },
  fullScreenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.gray[50],
    padding: theme.spacing[6],
  },
  fullScreenContent: {
    alignItems: 'center',
    maxWidth: 300,
  },
  fullScreenTitle: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.semantic.text.primary,
    textAlign: 'center',
    marginTop: theme.spacing[4],
    marginBottom: theme.spacing[3],
  },
  fullScreenDescription: {
    fontSize: theme.typography.fontSize.base,
    color: theme.semantic.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing[6],
    lineHeight: theme.typography.lineHeight.relaxed,
  },
  fullScreenError: {
    width: '100%',
    marginTop: theme.spacing[4],
  },
});

// Static styles for ErrorBoundary class component (class components can't use hooks)
const boundaryStyles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: designTokens.colors.gray[50],
    padding: designTokens.spacing[6],
  },
  fullScreenContent: {
    alignItems: 'center',
    maxWidth: 300,
  },
  fullScreenTitle: {
    fontSize: designTokens.typography.fontSize['2xl'],
    fontWeight: designTokens.typography.fontWeight.bold,
    color: designTokens.semantic.text.primary,
    textAlign: 'center',
    marginTop: designTokens.spacing[4],
    marginBottom: designTokens.spacing[3],
  },
  fullScreenDescription: {
    fontSize: designTokens.typography.fontSize.base,
    color: designTokens.semantic.text.secondary,
    textAlign: 'center',
    marginBottom: designTokens.spacing[6],
    lineHeight: designTokens.typography.lineHeight.relaxed,
  },
  fullScreenError: {
    width: '100%',
    marginTop: designTokens.spacing[4],
  },
});

export default ErrorDisplay;
