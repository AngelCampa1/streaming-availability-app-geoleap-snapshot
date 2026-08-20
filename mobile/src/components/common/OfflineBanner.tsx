/**
 * OfflineBanner Component - BUG-M22
 * Displays a banner when the device loses network connectivity
 * Uses NetInfo for real-time network status monitoring
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
  AccessibilityInfo,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LAYOUT_CONSTANTS } from '../../constants/layout';

export interface OfflineBannerProps {
  /** Custom message to show when offline */
  message?: string;
  /** Show retry button */
  showRetry?: boolean;
  /** Callback when retry is pressed */
  onRetry?: () => void;
  /** Position of the banner */
  position?: 'top' | 'bottom';
  /** Auto-hide delay in ms (0 = never auto-hide) */
  autoHideDelay?: number;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  message = 'No internet connection',
  showRetry = true,
  onRetry,
  position = 'top',
  autoHideDelay = 0,
}) => {
  const { theme } = useTheme();
  const { isConnected, isInternetReachable, testConnection, isTesting } = useNetworkStatus();
  const [isVisible, setIsVisible] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  const slideAnim = useRef(new Animated.Value(position === 'top' ? -100 : 100)).current;
  const autoHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Determine if we should show the banner
  const isOffline = !isConnected || isInternetReachable === false;

  useEffect(() => {
    if (isOffline) {
      setIsVisible(true);
      setWasOffline(true);
      // Slide in
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();

      // Announce to screen readers
      AccessibilityInfo.announceForAccessibility(message);

      // Clear any existing auto-hide timer
      if (autoHideTimer.current) {
        clearTimeout(autoHideTimer.current);
      }
    } else if (wasOffline && !isOffline) {
      // Connection restored - show briefly then hide
      AccessibilityInfo.announceForAccessibility('Internet connection restored');

      // Set auto-hide timer if specified
      if (autoHideDelay > 0) {
        autoHideTimer.current = setTimeout(() => {
          hideAnimation();
        }, autoHideDelay);
      } else {
        // Hide after short delay showing "Connected" message
        autoHideTimer.current = setTimeout(() => {
          hideAnimation();
        }, 2000);
      }
    }

    return () => {
      if (autoHideTimer.current) {
        clearTimeout(autoHideTimer.current);
      }
    };
  }, [isOffline, wasOffline, message, autoHideDelay]);

  const hideAnimation = () => {
    Animated.timing(slideAnim, {
      toValue: position === 'top' ? -100 : 100,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setIsVisible(false);
      setWasOffline(false);
    });
  };

  const handleRetry = async () => {
    if (onRetry) {
      onRetry();
    } else {
      await testConnection();
    }
  };

  if (!isVisible) {
    return null;
  }

  const styles = StyleSheet.create({
    container: {
      position: 'absolute',
      left: 0,
      right: 0,
      zIndex: 1000,
      elevation: 10,
      ...(position === 'top' ? { top: 0 } : { bottom: 0 }),
    },
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing[4],
      paddingVertical: theme.spacing[3],
      backgroundColor: isOffline
        ? theme.colors.error[500]
        : theme.colors.success[500],
      ...theme.shadows.md,
    },
    contentContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    icon: {
      marginRight: theme.spacing[3],
    },
    textContainer: {
      flex: 1,
    },
    message: {
      color: theme.semantic.text.inverse,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
    },
    subMessage: {
      color: theme.semantic.text.inverse + 'CC',
      fontSize: theme.typography.fontSize.xs,
      marginTop: 2,
    },
    retryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.semantic.text.inverse + '20',
      paddingHorizontal: theme.spacing[3],
      paddingVertical: theme.spacing[2],
      borderRadius: theme.borderRadius.md,
      minHeight: LAYOUT_CONSTANTS.TOUCH_TARGET_MIN,
      minWidth: LAYOUT_CONSTANTS.TOUCH_TARGET_MIN,
      marginLeft: theme.spacing[2],
    },
    retryButtonText: {
      color: theme.semantic.text.inverse,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      marginLeft: theme.spacing[1],
    },
    loadingIndicator: {
      marginLeft: theme.spacing[1],
    },
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      accessibilityLabel={isOffline ? message : 'Internet connection restored'}
    >
      <View style={styles.banner}>
        <View style={styles.contentContainer}>
          <Icon
            name={isOffline ? 'cloud-off' : 'cloud-done'}
            size={24}
            color={theme.semantic.text.inverse}
            style={styles.icon}
          />
          <View style={styles.textContainer}>
            <Text style={styles.message}>
              {isOffline ? message : 'Connection restored'}
            </Text>
            {isOffline && (
              <Text style={styles.subMessage}>
                Some features may be unavailable
              </Text>
            )}
          </View>
        </View>

        {showRetry && isOffline && (
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRetry}
            disabled={isTesting}
            accessibilityLabel="Retry connection"
            accessibilityRole="button"
            accessibilityHint="Double tap to check network connection"
            accessibilityState={{ disabled: isTesting }}
          >
            <Icon
              name={isTesting ? 'sync' : 'refresh'}
              size={18}
              color={theme.semantic.text.inverse}
            />
            <Text style={styles.retryButtonText}>
              {isTesting ? 'Checking...' : 'Retry'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
};

export default OfflineBanner;
