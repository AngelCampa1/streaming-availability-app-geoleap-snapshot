/**
 * Notification Badge Component
 * Displays unread notification count on tab icons
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useTheme } from '../../theme/ThemeProvider';

interface NotificationBadgeProps {
  count: number;
  maxCount?: number;
  size?: 'small' | 'medium' | 'large';
  showZero?: boolean;
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  count,
  maxCount = 99,
  size = 'medium',
  showZero = false,
}) => {
  const { theme } = useTheme();

  if (count <= 0 && !showZero) {
    return null;
  }

  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();

  const sizeStyles = {
    small: {
      badge: { minWidth: 16, height: 16, borderRadius: 8 },
      text: { fontSize: 10 },
    },
    medium: {
      badge: { minWidth: 20, height: 20, borderRadius: 10 },
      text: { fontSize: 12 },
    },
    large: {
      badge: { minWidth: 24, height: 24, borderRadius: 12 },
      text: { fontSize: 14 },
    },
  };

  const currentSize = sizeStyles[size];

  return (
    <View
      style={[
        styles.badge,
        currentSize.badge,
        { backgroundColor: theme.colors.error[500] },
      ]}
    >
      <Text
        style={[
          styles.text,
          currentSize.text,
          { color: theme.semantic.text.inverse },
        ]}
      >
        {displayCount}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  text: {
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default NotificationBadge;
