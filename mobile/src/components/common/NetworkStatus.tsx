/**
 * Network Status Indicator Component for GeoLeap Mobile App
 * Displays real-time network connection status and quality
 * Provides visual feedback for online/offline states and connection issues
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
} from 'react-native';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../hooks/useTheme';

export interface NetworkStatusProps {
  showDetails?: boolean;
  allowTapToRefresh?: boolean;
  position?: 'top' | 'bottom';
  style?: any;
  onStatusChange?: (isConnected: boolean, quality: string) => void;
}

interface StatusConfig {
  color: string;
  backgroundColor: string;
  icon: string;
  message: string;
  detailMessage: string;
}

/**
 * Network Status Indicator Component
 */
export const NetworkStatus: React.FC<NetworkStatusProps> = ({
  showDetails = false,
  allowTapToRefresh = true,
  position = 'top',
  style,
  onStatusChange,
}) => {
  const theme = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const [animValue] = useState(new Animated.Value(0));
  const [showIndicator, setShowIndicator] = useState(false);

  const {
    isConnected,
    connectionType,
    quality,
    latency,
    downloadSpeed,
    uploadSpeed: _uploadSpeed,
    isInternetReachable,
    testConnection,
  } = useNetworkStatus({
    onStatusChange: (status: any) => {
    // Convert NetworkStatus to the expected callback format
    if (onStatusChange) {
      onStatusChange(status.isConnected ?? false, status.quality || 'unknown');
    }
  },
  });

  // Get status configuration based on connection state
  const getStatusConfig = (): StatusConfig => {
    if (!isConnected) {
      return {
        color: theme.semantic.status.error,
        backgroundColor: theme.semantic.status.error + '20',
        icon: 'wifi-off',
        message: 'No Connection',
        detailMessage: 'You are currently offline. Some features may not be available.',
      };
    }

    if (!isInternetReachable) {
      return {
        color: theme.semantic.status.warning,
        backgroundColor: theme.semantic.status.warning + '20',
        icon: 'wifi-locked',
        message: 'Limited Connection',
        detailMessage: 'Connected but no internet access. Please check your connection.',
      };
    }

    switch (quality) {
      case 'excellent':
        return {
          color: theme.semantic.status.success,
          backgroundColor: theme.semantic.status.success + '20',
          icon: 'wifi',
          message: 'Excellent Connection',
          detailMessage: `Fast and stable connection (${connectionType})`,
        };
      case 'good':
        return {
          color: theme.semantic.status.success,
          backgroundColor: theme.semantic.status.success + '20',
          icon: 'wifi',
          message: 'Good Connection',
          detailMessage: `Stable connection (${connectionType})`,
        };
      case 'fair':
        return {
          color: theme.semantic.status.warning,
          backgroundColor: theme.semantic.status.warning + '20',
          icon: 'wifi-1-bar',
          message: 'Fair Connection',
          detailMessage: `Connection is unstable (${connectionType})`,
        };
      case 'poor':
        return {
          color: theme.semantic.status.warning,
          backgroundColor: theme.semantic.status.warning + '20',
          icon: 'wifi-1-bar',
          message: 'Poor Connection',
          detailMessage: `Very slow connection (${connectionType})`,
        };
      default:
        return {
          color: theme.semantic.text.primary,
          backgroundColor: theme.semantic.background.secondary,
          icon: 'wifi-find',
          message: 'Checking...',
          detailMessage: 'Determining connection quality...',
        };
    }
  };

  const statusConfig = getStatusConfig();

  // Animate expansion
  useEffect(() => {
    Animated.timing(animValue, {
      toValue: isExpanded ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isExpanded, animValue]);

  // Show indicator when connection changes
  useEffect(() => {
    setShowIndicator(true);
    const timer = setTimeout(() => {
      if (isConnected && isInternetReachable && quality !== 'poor') {
        setShowIndicator(false);
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [isConnected, isInternetReachable, quality]);

  // Handle tap to refresh
  const handleRefresh = async () => {
    if (!allowTapToRefresh) {return;}

    try {
      const isHealthy = await testConnection();

      if (!isHealthy) {
        Alert.alert(
          'Connection Issue',
          'Unable to connect to our servers. Please check your internet connection and try again.',
          [{ text: 'OK' }],
        );
      }
    } catch (error) {
      Alert.alert(
        'Connection Test Failed',
        'Failed to test connection. Please try again later.',
        [{ text: 'OK' }],
      );
    }
  };

  // Handle press to expand/collapse
  const handlePress = () => {
    if (allowTapToRefresh && !isConnected) {
      handleRefresh();
    } else if (showDetails) {
      setIsExpanded(!isExpanded);
    }
  };

  // Don't render if indicator is hidden and connection is good
  if (!showIndicator && !isExpanded) {
    return null;
  }

  const containerStyle = [
    styles.container,
    {
      backgroundColor: statusConfig.backgroundColor,
      borderColor: statusConfig.color,
      [position === 'top' ? 'top' : 'bottom']: 0,
    },
    position === 'bottom' && styles.bottomPosition,
    style,
  ];

  const expandedHeight = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [50, showDetails ? 140 : 50],
  });

  return (
    <Animated.View style={[containerStyle, { height: expandedHeight }]}>
      <TouchableOpacity
        style={styles.touchable}
        onPress={handlePress}
        disabled={!allowTapToRefresh && !showDetails}
        activeOpacity={0.7}
      >
        <View style={styles.mainContent}>
          <View style={styles.statusRow}>
            <Icon
              name={statusConfig.icon}
              size={20}
              color={statusConfig.color}
              style={styles.icon}
            />
            <Text
              style={[
                styles.message,
                { color: statusConfig.color },
              ]}
            >
              {statusConfig.message}
            </Text>
            {showDetails && (
              <Icon
                name={isExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                size={20}
                color={statusConfig.color}
              />
            )}
          </View>

          <Text style={[styles.detailMessage, { color: theme.semantic.text.secondary }]}>
            {statusConfig.detailMessage}
          </Text>
        </View>

        {/* Expanded details */}
        {showDetails && isExpanded && (
          <View style={styles.expandedContent}>
            <View style={styles.detailsRow}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Type</Text>
                <Text style={styles.detailValue}>{connectionType}</Text>
              </View>

              {latency && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Latency</Text>
                  <Text style={styles.detailValue}>{latency}ms</Text>
                </View>
              )}

              {downloadSpeed && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Download</Text>
                  <Text style={styles.detailValue}>
                    {downloadSpeed > 1 ? `${downloadSpeed.toFixed(1)}Mbps` : 'Slow'}
                  </Text>
                </View>
              )}
            </View>

            {!isConnected && allowTapToRefresh && (
              <TouchableOpacity
                style={[
                  styles.refreshButton,
                  { backgroundColor: statusConfig.color },
                ]}
                onPress={handleRefresh}
              >
                <Icon name="refresh" size={16} color="white" />
                <Text style={styles.refreshButtonText}>Test Connection</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

/**
 * Simple Network Status Badge
 */
export const NetworkStatusBadge: React.FC<{
  showQuality?: boolean;
  compact?: boolean;
  style?: any;
}> = ({ showQuality = true, compact = false, style }) => {
  const theme = useTheme();
  const { isConnected, quality } = useNetworkStatus();

  if (!isConnected) {
    return (
      <View style={[styles.badge, { backgroundColor: theme.semantic.status.error }, style]}>
        <Icon name="wifi-off" size={compact ? 12 : 16} color="white" />
        {!compact && (
          <Text style={styles.badgeText}>Offline</Text>
        )}
      </View>
    );
  }

  if (showQuality && quality === 'poor') {
    return (
      <View style={[styles.badge, { backgroundColor: theme.semantic.status.warning }, style]}>
        <Icon name="wifi-1-bar" size={compact ? 12 : 16} color="white" />
        {!compact && (
          <Text style={styles.badgeText}>Slow</Text>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.badge, { backgroundColor: theme.semantic.status.success }, style]}>
      <Icon name="wifi" size={compact ? 12 : 16} color="white" />
      {!compact && (
        <Text style={styles.badgeText}>Online</Text>
      )}
    </View>
  );
};

/**
 * Network Quality Indicator
 */
export const NetworkQualityIndicator: React.FC<{
  style?: any;
  showLabel?: boolean;
}> = ({ style, showLabel = true }) => {
  const theme = useTheme();
  const { quality, isConnected } = useNetworkStatus();

  if (!isConnected) {
    return null;
  }

  const getQualityConfig = () => {
    switch (quality) {
      case 'excellent':
        return {
          color: theme.semantic.status.success,
          bars: 4,
          label: 'Excellent',
        };
      case 'good':
        return {
          color: theme.semantic.status.success,
          bars: 3,
          label: 'Good',
        };
      case 'fair':
        return {
          color: theme.semantic.status.warning,
          bars: 2,
          label: 'Fair',
        };
      case 'poor':
        return {
          color: theme.semantic.status.warning,
          bars: 1,
          label: 'Poor',
        };
      default:
        return {
          color: theme.semantic.text.primary,
          bars: 0,
          label: 'Unknown',
        };
    }
  };

  const qualityConfig = getQualityConfig();

  return (
    <View style={[styles.qualityIndicator, style]}>
      <View style={styles.signalBars}>
        {[1, 2, 3, 4].map((bar) => (
          <View
            key={bar}
            style={[
              styles.signalBar,
              {
                height: bar * 4,
                backgroundColor: bar <= qualityConfig.bars ? qualityConfig.color : theme.semantic.border.primary,
              },
            ]}
          />
        ))}
      </View>
      {showLabel && (
        <Text style={[styles.qualityLabel, { color: qualityConfig.color }]}>
          {qualityConfig.label}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderWidth: 1,
    borderStyle: 'solid',
    zIndex: 1000,
  },
  bottomPosition: {
    borderTopWidth: 0,
    borderBottomWidth: 1,
  },
  touchable: {
    flex: 1,
  },
  mainContent: {
    padding: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 8,
  },
  message: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  detailMessage: {
    fontSize: 12,
    marginTop: 2,
    marginLeft: 28,
  },
  expandedContent: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    marginTop: 8,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  detailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 11,
    opacity: 0.7,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'center',
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  qualityIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  signalBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    width: 20,
    height: 16,
    justifyContent: 'space-between',
    marginRight: 8,
  },
  signalBar: {
    width: 3,
    borderRadius: 1,
  },
  qualityLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default NetworkStatus;
