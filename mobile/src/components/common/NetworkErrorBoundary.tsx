/**
 * Network Error Boundary Component for GeoLeap Mobile App
 * Handles network-related errors and provides recovery mechanisms
 * Shows appropriate UI for offline states and connection issues
 */

import React, { Component, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useTheme } from '../../hooks/useTheme';
import { logger } from '../../utils/logger';
import NetInfo from '@react-native-community/netinfo';

interface NetworkErrorBoundaryProps {
  children: ReactNode;
  fallback?: (isOnline: boolean, retry: () => void) => ReactNode;
  onNetworkChange?: (isOnline: boolean) => void;
  enableAutoRetry?: boolean;
  retryInterval?: number;
  maxRetries?: number;
}

interface NetworkErrorBoundaryState {
  hasNetworkError: boolean;
  isOnline: boolean;
  retryCount: number;
  lastRetryTime: number | null;
}

/**
 * Network Error Boundary Component (Class Component for backwards compatibility)
 */
export class NetworkErrorBoundaryClass extends Component<NetworkErrorBoundaryProps, NetworkErrorBoundaryState> {
  private retryTimer: ReturnType<typeof setInterval> | null = null;
  private netInfoUnsubscribe: (() => void) | null = null;

  constructor(props: NetworkErrorBoundaryProps) {
    super(props);
    this.state = {
      hasNetworkError: false,
      isOnline: true,
      retryCount: 0,
      lastRetryTime: null,
    };
  }

  componentDidMount() {
    this.setupNetworkListener();
  }

  componentWillUnmount() {
    this.cleanup();
  }

  private setupNetworkListener() {
    // Use NetInfo for network status monitoring
    this.netInfoUnsubscribe = NetInfo.addEventListener(this.handleNetworkChange);
  }

  private handleNetworkChange = (status: any) => {
    const isOnline = status.isConnected ?? true;

    this.setState((prevState: NetworkErrorBoundaryState) => {
      // If we're coming back online after an error, clear the error state
      if (isOnline && !prevState.isOnline && prevState.hasNetworkError) {
        logger.info('Network restored, clearing error state');
        return {
          hasNetworkError: false,
          isOnline,
          retryCount: 0,
          lastRetryTime: null,
        };
      }

      return {
        isOnline,
        retryCount: prevState.retryCount,
        hasNetworkError: prevState.hasNetworkError,
        lastRetryTime: prevState.lastRetryTime,
      };
    });

    if (this.props.onNetworkChange) {
      this.props.onNetworkChange(isOnline);
    }
  };

  private cleanup() {
    if (this.retryTimer) {
      clearInterval(this.retryTimer);
      this.retryTimer = null;
    }

    if (this.netInfoUnsubscribe) {
      this.netInfoUnsubscribe();
      this.netInfoUnsubscribe = null;
    }
  }

  private handleRetry = () => {
    const { maxRetries = 3 } = this.props;
    const { retryCount } = this.state;

    if (retryCount >= maxRetries) {
      Alert.alert(
        'Max Retries Reached',
        'Unable to establish connection. Please check your network settings and try again.',
        [{ text: 'OK' }],
      );
      return;
    }

    this.setState(prevState => ({
      retryCount: prevState.retryCount + 1,
      lastRetryTime: Date.now(),
      hasNetworkError: false,
    }));

    logger.info('Network retry attempt:', { retryCount: retryCount + 1 });
  };

  private scheduleAutoRetry() {
    const { enableAutoRetry = true, retryInterval = 5000 } = this.props;

    if (!enableAutoRetry || this.retryTimer) {
      return;
    }

    this.retryTimer = setInterval(() => {
      const { isOnline, hasNetworkError, lastRetryTime } = this.state;

      if (isOnline && !hasNetworkError) {
        this.cleanup();
        return;
      }

      if (lastRetryTime && Date.now() - lastRetryTime < retryInterval) {
        return;
      }

      this.handleRetry();
    }, retryInterval);
  }

  static getDerivedStateFromError(error: Error): Partial<NetworkErrorBoundaryState> {
    // Check if it's a network-related error
    const isNetworkError = error.message.includes('network') ||
                         error.message.includes('fetch') ||
                         error.message.includes('timeout') ||
                         error.message.includes('Network request failed');

    if (isNetworkError) {
      return {
        hasNetworkError: true,
      };
    }

    return null;
  }

  componentDidCatch(error: Error, _errorInfo: any) {
    const isNetworkError = error.message.includes('network') ||
                         error.message.includes('fetch') ||
                         error.message.includes('timeout') ||
                         error.message.includes('Network request failed');

    if (isNetworkError) {
      logger.error('Network error boundary caught an error:', error);
      this.setState({ hasNetworkError: true });
      this.scheduleAutoRetry();
    }
  }

  render() {
    const { children, fallback } = this.props;
    const { hasNetworkError, isOnline } = this.state;

    // Show error state if there's a network error
    if (hasNetworkError || !isOnline) {
      if (fallback) {
        return fallback(isOnline, this.handleRetry);
      }

      return (
        <NetworkErrorFallbackUI
          isOnline={isOnline}
          retryCount={this.state.retryCount}
          maxRetries={this.props.maxRetries || 3}
          onRetry={this.handleRetry}
        />
      );
    }

    return children;
  }
}

/**
 * Themed fallback UI component (functional component that can use hooks)
 */
const NetworkErrorFallbackUI: React.FC<{
  isOnline: boolean;
  retryCount: number;
  maxRetries: number;
  onRetry: () => void;
}> = ({ isOnline, retryCount, maxRetries, onRetry }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Icon
          name={isOnline ? 'wifi-off' : 'signal-wifi-off'}
          size={64}
          color={theme.colors.warning[500]}
        />
        <Text style={styles.title}>
          {isOnline ? 'Connection Issue' : 'No Internet Connection'}
        </Text>
        <Text style={styles.message}>
          {isOnline
            ? 'Having trouble connecting to our servers. Please check your connection and try again.'
            : 'Please check your internet connection and try again.'}
        </Text>

        <TouchableOpacity
          style={[styles.button, styles.retryButton]}
          onPress={onRetry}
        >
          <Icon name="refresh" size={20} color={theme.semantic.text.inverse} />
          <Text style={styles.buttonText}>Retry</Text>
        </TouchableOpacity>

        {retryCount > 0 && (
          <Text style={styles.retryInfo}>
            Retry attempt: {retryCount}/{maxRetries}
          </Text>
        )}
      </View>
    </View>
  );
};

/**
 * Hook-based Network Error Boundary
 */
export const NetworkErrorBoundary: React.FC<NetworkErrorBoundaryProps> = (props) => {
  const _networkStatus = useNetworkStatus({
    onStatusChange: (status: any) => {
      // Convert NetworkStatus to boolean for backward compatibility
      const isOnline = status.isConnected ?? true;
      props.onNetworkChange?.(isOnline);
    },
  });

  // For now, use the class component
  return <NetworkErrorBoundaryClass {...props} />;
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.semantic.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing[5],
  },
  content: {
    alignItems: 'center',
    maxWidth: 400,
  },
  title: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.semantic.text.primary,
    marginTop: theme.spacing[4],
    marginBottom: theme.spacing[2],
    textAlign: 'center',
  },
  message: {
    fontSize: theme.typography.fontSize.base,
    color: theme.semantic.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing[6],
    lineHeight: theme.typography.lineHeight.relaxed,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[5],
    paddingVertical: theme.spacing[3],
    borderRadius: theme.borderRadius.lg,
    minWidth: 120,
    justifyContent: 'center',
    marginBottom: theme.spacing[4],
  },
  retryButton: {
    backgroundColor: theme.colors.primary[500],
  },
  buttonText: {
    color: theme.semantic.text.inverse,
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    marginLeft: theme.spacing[2],
  },
  retryInfo: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.semantic.text.secondary,
    textAlign: 'center',
  },
});

export default NetworkErrorBoundary;
