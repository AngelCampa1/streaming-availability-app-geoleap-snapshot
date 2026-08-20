/**
 * Session Expiration Warning Component
 * Shows countdown banner when session is about to expire
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Animated } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuth } from '../../context/AuthContext';

interface SessionExpirationWarningProps {
  /** Time in seconds before auto-logout */
  countdownDuration?: number;
  /** Callback when user extends session */
  onExtendSession?: () => Promise<void>;
  /** Callback when session expires */
  onSessionExpired?: () => void;
}

export const SessionExpirationWarning: React.FC<SessionExpirationWarningProps> = ({
  countdownDuration = 120, // 2 minutes default
  onExtendSession,
  onSessionExpired,
}) => {
  const { theme } = useTheme();
  const { logout } = useAuth();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [isVisible, setIsVisible] = useState(false);
  const [countdown, setCountdown] = useState(countdownDuration);
  const [isExtending, setIsExtending] = useState(false);
  const slideAnim = useState(new Animated.Value(-100))[0];

  // Show warning (call this from parent when session is expiring)
  const showWarning = useCallback(() => {
    setIsVisible(true);
    setCountdown(countdownDuration);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();
  }, [countdownDuration, slideAnim]);

  // Hide warning
  const hideWarning = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setIsVisible(false));
  }, [slideAnim]);

  const handleLogout = useCallback(() => {
    onSessionExpired?.();
    logout();
    hideWarning();
  }, [onSessionExpired, logout, hideWarning]);

  // Countdown timer
  useEffect(() => {
    if (!isVisible) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isVisible, handleLogout]);

  const handleExtendSession = async () => {
    if (isExtending) return;

    setIsExtending(true);
    try {
      await onExtendSession?.();
      hideWarning();
    } catch (_error) {
      // Keep warning visible on error
    } finally {
      setIsExtending(false);
    }
  };

  // Format countdown as MM:SS
  const formatCountdown = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Expose showWarning to parent via ref or context
  // For now, we'll use a simple approach with useEffect
  useEffect(() => {
    // This component will be controlled by AuthContext in real implementation
    // For demo, we'll show it immediately
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateY: slideAnim }] },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Icon name="warning" size={24} color={theme.colors.warning[700]} />
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.title}>Session Expiring Soon</Text>
          <Text style={styles.countdown}>
            Time remaining: {formatCountdown(countdown)}
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.extendButton}
            onPress={handleExtendSession}
            disabled={isExtending}
          >
            <Text style={styles.extendButtonText}>
              {isExtending ? 'Extending...' : 'Extend'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBarContainer}>
        <View
          style={[
            styles.progressBar,
            { width: `${(countdown / countdownDuration) * 100}%` },
          ]}
        />
      </View>
    </Animated.View>
  );
};

// Hook to control session warning from AuthContext
export const useSessionWarning = () => {
  const [showWarning, setShowWarning] = useState(false);

  const triggerWarning = useCallback(() => {
    setShowWarning(true);
  }, []);

  const dismissWarning = useCallback(() => {
    setShowWarning(false);
  }, []);

  return {
    showWarning,
    triggerWarning,
    dismissWarning,
  };
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.warning[100],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.warning[300],
    zIndex: 9999,
    elevation: 10,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
    paddingTop: theme.spacing[10], // Account for status bar
  },
  iconContainer: {
    marginRight: theme.spacing[3],
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.warning[900],
    marginBottom: theme.spacing[1],
  },
  countdown: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.warning[700],
    fontFamily: 'monospace',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: theme.spacing[2],
  },
  extendButton: {
    backgroundColor: theme.colors.warning[700],
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    borderRadius: theme.borderRadius.md,
  },
  extendButtonText: {
    color: theme.colors.white,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
  },
  logoutButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.warning[700],
  },
  logoutButtonText: {
    color: theme.colors.warning[700],
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
  },
  progressBarContainer: {
    height: 3,
    backgroundColor: theme.colors.warning[200],
  },
  progressBar: {
    height: '100%',
    backgroundColor: theme.colors.warning[500],
  },
});

export default SessionExpirationWarning;
