/**
 * Tab Bar Badge Component
 * Shows notification count badge on tab icons
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../theme/ThemeProvider';

interface TabBarBadgeProps {
  iconName: string;
  size: number;
  color: string;
  badgeCount?: number;
  maxCount?: number;
}

export const TabBarBadge: React.FC<TabBarBadgeProps> = ({
  iconName,
  size,
  color,
  badgeCount = 0,
  maxCount = 99,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const displayCount = badgeCount > maxCount ? `${maxCount}+` : badgeCount.toString();
  const showBadge = badgeCount > 0;

  return (
    <View style={styles.container}>
      <Icon name={iconName} size={size} color={color} />
      {showBadge && (
        <View style={[styles.badge, { backgroundColor: theme.colors.error[500] }]}>
          <Text style={styles.badgeText}>{displayCount}</Text>
        </View>
      )}
    </View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: theme.semantic.text.inverse,
    fontSize: 10,
    fontWeight: '700',
  },
});

export default TabBarBadge;
