/**
 * Sync Status Display Component for GeoLeap Mobile App
 * Shows real-time synchronization status, conflicts, and progress
 * Provides visual feedback for data synchronization operations
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
  ScrollView,
} from 'react-native';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../hooks/useTheme';

// Simple date formatting function as fallback for date-fns
const formatDistanceToNow = (date: Date, options?: { addSuffix?: boolean }) => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return options?.addSuffix ? 'less than a minute ago' : 'less than a minute';
  }
  if (diffMinutes < 60) {
    return options?.addSuffix ? `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago` : `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
  }
  if (diffHours < 24) {
    return options?.addSuffix ? `${diffHours} hour${diffHours > 1 ? 's' : ''} ago` : `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
  }
  return options?.addSuffix ? `${diffDays} day${diffDays > 1 ? 's' : ''} ago` : `${diffDays} day${diffDays > 1 ? 's' : ''}`;
};

export interface SyncIndicatorProps {
  showDetails?: boolean;
  allowForceSync?: boolean;
  position?: 'top' | 'bottom';
  compact?: boolean;
  style?: any;
  onConflict?: (conflict: any) => void;
}

interface ConflictItemProps {
  conflict: any;
  onResolve: (conflictId: string, resolution: 'client' | 'server' | 'merge') => void;
  theme: any;
}

const ConflictItem: React.FC<ConflictItemProps> = ({ conflict, onResolve, theme }) => {
  const [isExpanded, __setIsExpanded] = useState(false);

  const handleResolve = (_resolution: 'client' | 'server' | 'merge') => {
    Alert.alert(
      'Resolve Conflict',
      `How would you like to resolve this conflict for ${conflict.entityType} "${conflict.entityId}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Use My Data',
          onPress: () => onResolve(conflict.id, 'client'),
          style: 'destructive',
        },
        {
          text: 'Use Server Data',
          onPress: () => onResolve(conflict.id, 'server'),
        },
        {
          text: 'Merge Both',
          onPress: () => onResolve(conflict.id, 'merge'),
        },
      ],
    );
  };

  return (
    <View style={[styles.conflictItem, { borderColor: theme.semantic.status.warning }]}>
      <TouchableOpacity
        style={styles.conflictHeader}
        onPress={() => __setIsExpanded(!isExpanded)}
      >
        <Icon name="warning" size={20} color={theme.semantic.status.warning} />
        <Text style={[styles.conflictTitle, { color: theme.semantic.text.primary }]}>
          {conflict.entityType} Conflict
        </Text>
        <Icon
          name={isExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
          size={20}
          color={theme.semantic.text.secondary}
        />
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.conflictDetails}>
          <Text style={[styles.conflictDescription, { color: theme.semantic.text.secondary }]}>
            {conflict.conflictType === 'version'
              ? 'Version conflict: Both you and someone else modified this item'
              : conflict.conflictType === 'delete'
              ? 'Delete conflict: Item was deleted on one device but modified on another'
              : 'Data conflict: Conflicting changes detected'}
          </Text>

          <Text style={[styles.conflictTime, { color: theme.semantic.text.secondary }]}>
            {formatDistanceToNow(new Date(conflict.timestamp), { addSuffix: true })}
          </Text>

          <View style={styles.conflictActions}>
            <TouchableOpacity
              style={[
                styles.conflictButton,
                { backgroundColor: theme.colors.primary[500] },
              ]}
              onPress={() => handleResolve('merge')}
            >
              <Icon name="merge-type" size={16} color="white" />
              <Text style={styles.conflictButtonText}>Merge</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.conflictButton,
                { backgroundColor: theme.semantic.background.secondary, borderWidth: 1, borderColor: theme.semantic.border.primary },
              ]}
              onPress={() => handleResolve('client')}
            >
              <Icon name="person" size={16} color={theme.semantic.text.primary} />
              <Text style={[styles.conflictButtonText, { color: theme.semantic.text.primary }]}>
                Keep Mine
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.conflictButton,
                { backgroundColor: theme.semantic.background.secondary, borderWidth: 1, borderColor: theme.semantic.border.primary },
              ]}
              onPress={() => handleResolve('server')}
            >
              <Icon name="cloud" size={16} color={theme.semantic.text.primary} />
              <Text style={[styles.conflictButtonText, { color: theme.semantic.text.primary }]}>
                Use Server
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

/**
 * Sync Status Indicator Component
 */
export const SyncIndicator: React.FC<SyncIndicatorProps> = ({
  showDetails = false,
  allowForceSync = true,
  position = 'top',
  compact = false,
  style,
  onConflict,
}) => {
  const theme = useTheme();
  const [isExpanded, __setIsExpanded] = useState(false);
  const [showFullDetails, setShowFullDetails] = useState(false);
  const [animValue] = useState(new Animated.Value(0));

  const {
    isOnline,
    isSyncing,
    hasPendingChanges,
    hasConflicts,
    queuedRequests,
    conflicts,
    lastSyncTime,
    offlineDuration,
    networkQuality,
    syncProgress,
    forceSync,
    resolveConflict,
    clearQueue,
    clearConflicts,
    retryFailedRequests,
  } = useOfflineSync({
    onConflict,
  });

  // Animate expansion
  useEffect(() => {
    Animated.timing(animValue, {
      toValue: isExpanded ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isExpanded, animValue]);

  // Get status configuration
  const getStatusConfig = () => {
    if (!isOnline) {
      return {
        color: theme.semantic.status.error,
        backgroundColor: theme.semantic.status.error + '20',
        icon: 'sync-disabled',
        message: 'Offline',
        detailMessage: 'Changes will sync when you\'re back online',
      };
    }

    if (hasConflicts) {
      return {
        color: theme.semantic.status.warning,
        backgroundColor: theme.semantic.status.warning + '20',
        icon: 'sync-problem',
        message: 'Sync Conflicts',
        detailMessage: `${conflicts.length} conflict${conflicts.length > 1 ? 's' : ''} need resolution`,
      };
    }

    if (isSyncing) {
      return {
        color: theme.colors.primary[500],
        backgroundColor: theme.colors.primary[500] + '20',
        icon: 'sync',
        message: 'Syncing',
        detailMessage: `Syncing ${syncProgress.total} items...`,
      };
    }

    if (hasPendingChanges) {
      return {
        color: theme.semantic.status.warning,
        backgroundColor: theme.semantic.status.warning + '20',
        icon: 'sync',
        message: 'Pending Sync',
        detailMessage: `${queuedRequests.length} item${queuedRequests.length > 1 ? 's' : ''} to sync`,
      };
    }

    return {
      color: theme.semantic.status.success,
      backgroundColor: theme.semantic.status.success + '20',
      icon: 'check-circle',
      message: 'Synced',
      detailMessage: lastSyncTime
        ? `Last synced ${formatDistanceToNow(new Date(lastSyncTime), { addSuffix: true })}`
        : 'All changes synced',
    };
  };

  const statusConfig = getStatusConfig();

  // Handle force sync
  const handleForceSync = async () => {
    if (!allowForceSync) {return;}

    try {
      await forceSync();
    } catch (error) {
      Alert.alert('Sync Failed', 'Unable to sync at this time. Please try again later.');
    }
  };

  // Handle conflict resolution
  const handleResolveConflict = async (conflictId: string, resolution: 'client' | 'server' | 'merge') => {
    try {
      await resolveConflict(conflictId, resolution);
    } catch (error) {
      Alert.alert('Resolution Failed', 'Unable to resolve conflict. Please try again.');
    }
  };

  // Handle clear all
  const handleClearAll = () => {
    Alert.alert(
      'Clear Sync Data',
      'This will clear all pending sync operations and conflicts. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearQueue();
              await clearConflicts();
            } catch (error) {
              Alert.alert('Error', 'Failed to clear sync data');
            }
          },
        },
      ],
    );
  };

  // Don't render if everything is synced and not expanded
  if (!isExpanded && !hasPendingChanges && !hasConflicts && !isSyncing && isOnline) {
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
    outputRange: [compact ? 40 : 60, showDetails ? 400 : compact ? 40 : 60],
  });

  return (
    <Animated.View style={[containerStyle, { height: expandedHeight }]}>
      <TouchableOpacity
        style={styles.touchable}
        onPress={() => setShowFullDetails(!showFullDetails)}
        disabled={!showDetails}
      >
        <View style={styles.mainContent}>
          <View style={styles.statusRow}>
            <Icon
              name={statusConfig.icon}
              size={compact ? 16 : 20}
              color={statusConfig.color}
              style={styles.icon}
            />

            <Text
              style={[
                styles.message,
                { color: statusConfig.color, fontSize: compact ? 12 : 14 },
              ]}
            >
              {statusConfig.message}
            </Text>

            {isSyncing && (
              <View style={styles.syncProgress}>
                <Text style={[styles.progressText, { color: statusConfig.color }]}>
                  {syncProgress.completed}/{syncProgress.total}
                </Text>
              </View>
            )}

            {showDetails && !compact && (
              <Icon
                name={showFullDetails ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                size={20}
                color={statusConfig.color}
              />
            )}
          </View>

          {!compact && (
            <Text style={[styles.detailMessage, { color: theme.semantic.text.secondary }]}>
              {statusConfig.detailMessage}
            </Text>
          )}
        </View>

        {/* Expanded details */}
        {showDetails && showFullDetails && !compact && (
          <ScrollView style={styles.expandedContent} showsVerticalScrollIndicator={false}>
            {/* Sync Actions */}
            <View style={styles.actionsSection}>
              <Text style={[styles.sectionTitle, { color: theme.semantic.text.primary }]}>
                Sync Actions
              </Text>

              <View style={styles.actionButtons}>
                {allowForceSync && (
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      { backgroundColor: theme.colors.primary[500] },
                    ]}
                    onPress={handleForceSync}
                    disabled={isSyncing}
                  >
                    <Icon name="refresh" size={16} color="white" />
                    <Text style={styles.actionButtonText}>Force Sync</Text>
                  </TouchableOpacity>
                )}

                {hasPendingChanges && (
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      { backgroundColor: theme.semantic.background.secondary, borderWidth: 1, borderColor: theme.semantic.border.primary },
                    ]}
                    onPress={retryFailedRequests}
                  >
                    <Icon name="replay" size={16} color={theme.semantic.text.primary} />
                    <Text style={[styles.actionButtonText, { color: theme.semantic.text.primary }]}>
                      Retry
                    </Text>
                  </TouchableOpacity>
                )}

                {(hasPendingChanges || hasConflicts) && (
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      { backgroundColor: theme.semantic.background.secondary, borderWidth: 1, borderColor: theme.semantic.border.primary },
                    ]}
                    onPress={handleClearAll}
                  >
                    <Icon name="clear-all" size={16} color={theme.semantic.status.error} />
                    <Text style={[styles.actionButtonText, { color: theme.semantic.status.error }]}>
                      Clear All
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Pending Requests */}
            {hasPendingChanges && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.semantic.text.primary }]}>
                  Pending Changes ({queuedRequests.length})
                </Text>

                {queuedRequests.slice(0, 3).map((request, index) => (
                  <View key={index} style={styles.pendingItem}>
                    <Icon name="schedule" size={16} color={theme.semantic.text.secondary} />
                    <Text style={[styles.pendingText, { color: theme.semantic.text.secondary }]}>
                      {request.method} {request.endpoint}
                    </Text>
                  </View>
                ))}

                {queuedRequests.length > 3 && (
                  <Text style={[styles.moreText, { color: theme.semantic.text.secondary }]}>
                    ... and {queuedRequests.length - 3} more items
                  </Text>
                )}
              </View>
            )}

            {/* Conflicts */}
            {hasConflicts && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.semantic.text.primary }]}>
                  Conflicts ({conflicts.length})
                </Text>

                {conflicts.slice(0, 2).map((conflict) => (
                  <ConflictItem
                    key={conflict.id}
                    conflict={conflict}
                    onResolve={handleResolveConflict}
                    theme={theme}
                  />
                ))}

                {conflicts.length > 2 && (
                  <Text style={[styles.moreText, { color: theme.semantic.text.secondary }]}>
                    ... and {conflicts.length - 2} more conflicts
                  </Text>
                )}
              </View>
            )}

            {/* Status Info */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.semantic.text.primary }]}>
                Status Information
              </Text>

              <View style={styles.statusInfo}>
                <Text style={[styles.statusInfoText, { color: theme.semantic.text.secondary }]}>
                  Network: {isOnline ? 'Online' : 'Offline'} ({networkQuality})
                </Text>
                <Text style={[styles.statusInfoText, { color: theme.semantic.text.secondary }]}>
                  Last Sync: {lastSyncTime
                    ? formatDistanceToNow(new Date(lastSyncTime), { addSuffix: true })
                    : 'Never'}
                </Text>
                {offlineDuration > 0 && (
                  <Text style={[styles.statusInfoText, { color: theme.semantic.text.secondary }]}>
                    Offline Duration: {Math.floor(offlineDuration / 60000)} minutes
                  </Text>
                )}
              </View>
            </View>
          </ScrollView>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

/**
 * Compact Sync Badge
 */
export const SyncBadge: React.FC<{
  style?: any;
}> = ({ style }) => {
  const theme = useTheme();
  const { isSyncing, hasPendingChanges, hasConflicts, isOnline } = useOfflineSync();

  if (!isOnline) {
    return (
      <View style={[styles.badge, { backgroundColor: theme.semantic.status.error }, style]}>
        <Icon name="sync-disabled" size={12} color="white" />
      </View>
    );
  }

  if (hasConflicts) {
    return (
      <View style={[styles.badge, { backgroundColor: theme.semantic.status.warning }, style]}>
        <Icon name="sync-problem" size={12} color="white" />
      </View>
    );
  }

  if (isSyncing) {
    return (
      <View style={[styles.badge, { backgroundColor: theme.colors.primary[500] }, style]}>
        <Icon name="sync" size={12} color="white" />
      </View>
    );
  }

  if (hasPendingChanges) {
    return (
      <View style={[styles.badge, { backgroundColor: theme.semantic.status.warning }, style]}>
        <Icon name="sync" size={12} color="white" />
      </View>
    );
  }

  return (
    <View style={[styles.badge, { backgroundColor: theme.semantic.status.success }, style]}>
      <Icon name="check-circle" size={12} color="white" />
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
    zIndex: 999,
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
    fontWeight: '600',
    flex: 1,
  },
  syncProgress: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    // backgroundColor applied dynamically in component
  },
  progressText: {
    fontSize: 11,
    fontWeight: '600',
  },
  detailMessage: {
    fontSize: 12,
    marginTop: 2,
    marginLeft: 28,
  },
  expandedContent: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    maxHeight: 340,
  },
  actionsSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  section: {
    marginBottom: 16,
  },
  pendingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  pendingText: {
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
  },
  moreText: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  conflictItem: {
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 8,
  },
  conflictHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  conflictTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  conflictDetails: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  conflictDescription: {
    fontSize: 12,
    marginBottom: 8,
  },
  conflictTime: {
    fontSize: 11,
    marginBottom: 12,
  },
  conflictActions: {
    flexDirection: 'row',
    gap: 8,
  },
  conflictButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 16,
    flex: 1,
    justifyContent: 'center',
  },
  conflictButtonText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  statusInfo: {
    gap: 4,
  },
  statusInfoText: {
    fontSize: 12,
  },
  badge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default SyncIndicator;
