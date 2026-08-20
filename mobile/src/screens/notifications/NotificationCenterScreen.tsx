/**
 * Notification Center Screen
 * Displays all user notifications with filtering and actions
 */

import React, { useState, useMemo, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Appbar, Surface, Chip, Badge, IconButton, Menu, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeProvider';

type Props = NativeStackScreenProps<RootStackParamList, 'NotificationCenter'>;

interface Notification {
  id: string;
  type: 'content' | 'watchlist' | 'subscription' | 'system' | 'promo';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
  imageUrl?: string;
}

// Mock data - replace with actual API
const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif_001',
    type: 'content',
    title: 'New on Netflix',
    message: 'Breaking Bad is now available in your region!',
    timestamp: new Date().toISOString(),
    read: false,
    actionLabel: 'View Details',
  },
  {
    id: 'notif_002',
    type: 'watchlist',
    title: 'Watchlist Update',
    message: 'The Office is leaving Peacock in 7 days. Watch it before it\'s gone!',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    read: false,
    actionLabel: 'Watch Now',
  },
  {
    id: 'notif_003',
    type: 'subscription',
    title: 'Subscription Renewed',
    message: 'Your Pro subscription has been renewed for another month.',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    read: true,
  },
  {
    id: 'notif_004',
    type: 'promo',
    title: 'Limited Time Offer',
    message: 'Upgrade to Premium and get 50% off your first 3 months!',
    timestamp: new Date(Date.now() - 172800000).toISOString(),
    read: true,
    actionLabel: 'Learn More',
  },
  {
    id: 'notif_005',
    type: 'system',
    title: 'App Update Available',
    message: 'A new version of GeoLeap is available with exciting new features.',
    timestamp: new Date(Date.now() - 259200000).toISOString(),
    read: true,
    actionLabel: 'Update',
  },
  {
    id: 'notif_006',
    type: 'content',
    title: 'Recommended for You',
    message: 'Based on your preferences, you might enjoy "Stranger Things"',
    timestamp: new Date(Date.now() - 432000000).toISOString(),
    read: true,
    actionLabel: 'View',
  },
];

const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'content':
      return 'movie';
    case 'watchlist':
      return 'bookmark';
    case 'subscription':
      return 'card-membership';
    case 'system':
      return 'settings';
    case 'promo':
      return 'local-offer';
    default:
      return 'notifications';
  }
};

const getNotificationColor = (type: Notification['type'], theme: any) => {
  switch (type) {
    case 'content':
      return theme.colors.primary[500];
    case 'watchlist':
      return theme.colors.warning[500];
    case 'subscription':
      return theme.colors.success[500];
    case 'system':
      return theme.colors.info[500];
    case 'promo':
      return theme.colors.secondary[500];
    default:
      return theme.semantic.text.secondary;
  }
};

const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const NotificationCenterScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);

  const unreadCount = useMemo(() =>
    notifications.filter(n => !n.read).length,
  [notifications]);

  const filteredNotifications = useMemo(() => {
    if (!selectedFilter) return notifications;
    if (selectedFilter === 'unread') return notifications.filter(n => !n.read);
    return notifications.filter(n => n.type === selectedFilter);
  }, [notifications, selectedFilter]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await new Promise<void>(resolve => setTimeout(() => resolve(), 1000));
    setIsRefreshing(false);
  }, []);

  const handleMarkAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }, []);

  const handleMarkAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setMenuVisible(false);
  }, []);

  const handleClearAll = useCallback(() => {
    setNotifications([]);
    setMenuVisible(false);
  }, []);

  const handleNotificationPress = useCallback((notification: Notification) => {
    handleMarkAsRead(notification.id);
    // TODO: Navigate based on notification type/action
  }, [handleMarkAsRead]);

  const renderNotification = useCallback(({ item }: { item: Notification }) => (
    <TouchableOpacity
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.7}
    >
      <Surface
        style={[
          styles.notificationCard,
          !item.read && styles.unreadCard,
        ]}
        elevation={1}
      >
        <View style={styles.notificationRow}>
          <View style={[
            styles.iconContainer,
            { backgroundColor: getNotificationColor(item.type, theme) + '20' },
          ]}>
            <Icon
              name={getNotificationIcon(item.type)}
              size={24}
              color={getNotificationColor(item.type, theme)}
            />
          </View>

          <View style={styles.notificationContent}>
            <View style={styles.notificationHeader}>
              <Text style={styles.notificationTitle}>{item.title}</Text>
              {!item.read && <Badge size={8} style={styles.unreadBadge} />}
            </View>
            <Text style={styles.notificationMessage} numberOfLines={2}>
              {item.message}
            </Text>
            <View style={styles.notificationFooter}>
              <Text style={styles.timestamp}>{formatTimestamp(item.timestamp)}</Text>
              {item.actionLabel && (
                <Text style={styles.actionLabel}>{item.actionLabel}</Text>
              )}
            </View>
          </View>
        </View>
      </Surface>
    </TouchableOpacity>
  ), [theme, styles, handleNotificationPress]);

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="notifications-none" size={64} color={theme.semantic.text.tertiary} />
      <Text style={styles.emptyTitle}>No Notifications</Text>
      <Text style={styles.emptyDescription}>
        You're all caught up! New notifications will appear here.
      </Text>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.filterContainer}>
      <Chip
        selected={selectedFilter === null}
        onPress={() => setSelectedFilter(null)}
        style={styles.filterChip}
      >
        All
      </Chip>
      <Chip
        selected={selectedFilter === 'unread'}
        onPress={() => setSelectedFilter('unread')}
        style={styles.filterChip}
      >
        Unread ({unreadCount})
      </Chip>
      <Chip
        selected={selectedFilter === 'content'}
        onPress={() => setSelectedFilter('content')}
        style={styles.filterChip}
      >
        Content
      </Chip>
      <Chip
        selected={selectedFilter === 'watchlist'}
        onPress={() => setSelectedFilter('watchlist')}
        style={styles.filterChip}
      >
        Watchlist
      </Chip>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Notifications" />
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <IconButton
              icon="dots-vertical"
              onPress={() => setMenuVisible(true)}
            />
          }
        >
          <Menu.Item
            onPress={handleMarkAllAsRead}
            title="Mark all as read"
            leadingIcon="done-all"
            disabled={unreadCount === 0}
          />
          <Divider />
          <Menu.Item
            onPress={handleClearAll}
            title="Clear all"
            leadingIcon="delete-sweep"
            disabled={notifications.length === 0}
          />
        </Menu>
      </Appbar.Header>

      <FlatList
        data={filteredNotifications}
        renderItem={renderNotification}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary[500]]}
          />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.semantic.background.primary,
  },
  header: {
    backgroundColor: theme.semantic.background.primary,
  },
  listContent: {
    padding: theme.spacing[4],
    paddingBottom: theme.spacing[10],
  },
  filterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[2],
    marginBottom: theme.spacing[4],
  },
  filterChip: {
    marginRight: theme.spacing[1],
  },
  notificationCard: {
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.semantic.background.secondary,
    padding: theme.spacing[4],
  },
  unreadCard: {
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary[500],
  },
  notificationRow: {
    flexDirection: 'row',
    gap: theme.spacing[3],
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
    marginBottom: theme.spacing[1],
  },
  notificationTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.semantic.text.primary,
  },
  unreadBadge: {
    backgroundColor: theme.colors.primary[500],
  },
  notificationMessage: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.semantic.text.secondary,
    lineHeight: 20,
    marginBottom: theme.spacing[2],
  },
  notificationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timestamp: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.semantic.text.tertiary,
  },
  actionLabel: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.primary[500],
  },
  separator: {
    height: theme.spacing[3],
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing[10],
  },
  emptyTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.semantic.text.primary,
    marginTop: theme.spacing[4],
    marginBottom: theme.spacing[2],
  },
  emptyDescription: {
    fontSize: theme.typography.fontSize.base,
    color: theme.semantic.text.secondary,
    textAlign: 'center',
    paddingHorizontal: theme.spacing[6],
  },
});

export default NotificationCenterScreen;
