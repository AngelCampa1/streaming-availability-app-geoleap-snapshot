/**
 * FilterChip Component - Quick filter chips for rapid filtering
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  View,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { FilterChipProps } from '../../types/filters';

export const FilterChip: React.FC<FilterChipProps> = React.memo(({
  label,
  value,
  isSelected,
  onPress,
  onLongPress,
  disabled = false,
  variant = 'default',
  color,
  icon,
  count,
}) => {
  const theme = useTheme();
  const [scale] = useState(new Animated.Value(1));

  const handlePress = useCallback(() => {
    if (!disabled) {
      // Animate press
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

      onPress(value);
    }
  }, [disabled, scale, onPress, value]);

  const handleLongPress = useCallback(() => {
    if (!disabled && onLongPress) {
      onLongPress(value);
    }
  }, [disabled, onLongPress, value]);

  const chipColor = useMemo(() => color || theme.colors.primary[500], [color, theme]);

  const getChipStyles = useCallback((): { container: ViewStyle; text: TextStyle } => {
    switch (variant) {
      case 'compact':
        return {
          container: {
            paddingHorizontal: 12,
            paddingVertical: 6,
            minHeight: 44,
          },
          text: {
            fontSize: 12,
            fontWeight: '500',
          },
        };

      case 'pills':
        return {
          container: {
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: 20,
            minHeight: 44,
          },
          text: {
            fontSize: 14,
            fontWeight: '600',
          },
        };

      default:
        return {
          container: {
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 16,
            minHeight: 44,
          },
          text: {
            fontSize: 14,
            fontWeight: '500',
          },
        };
    }
  }, [variant]);

  const variantStyles = useMemo(() => getChipStyles(), [getChipStyles]);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      ...variantStyles.container,
      backgroundColor: isSelected ? chipColor : theme.semantic.background.secondary,
      borderWidth: 1,
      borderColor: isSelected ? chipColor : theme.semantic.border.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
      marginBottom: 8,
      opacity: disabled ? 0.5 : 1,
      shadowColor: theme.colors.gray?.[900] || theme.semantic.text.primary,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isSelected ? 0.2 : 0.1,
      shadowRadius: 2,
      elevation: isSelected ? 3 : 1,
    },
    text: {
      ...variantStyles.text,
      color: isSelected ? theme.semantic.background.primary : theme.semantic.text.primary,
      textAlign: 'center',
    },
    icon: {
      fontSize: 16,
      marginRight: 6,
      color: isSelected ? theme.semantic.background.primary : theme.semantic.text.secondary,
    },
    count: {
      fontSize: 11,
      fontWeight: '400',
      marginLeft: 6,
      paddingHorizontal: 4,
      paddingVertical: 2,
      backgroundColor: isSelected
        ? theme.semantic.background.primary + '20'
        : theme.semantic.border.primary,
      color: isSelected
        ? theme.semantic.background.primary
        : theme.semantic.text.secondary,
      borderRadius: 8,
      minWidth: 16,
      textAlign: 'center',
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
    },
  }), [variantStyles, isSelected, chipColor, theme, disabled]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={[styles.container]}
        onPress={handlePress}
        onLongPress={handleLongPress}
        disabled={disabled}
        activeOpacity={0.7}
        accessibilityLabel={`${label} filter${isSelected ? ', selected' : ''}`}
        accessibilityRole="button"
        accessibilityHint="Double tap to toggle filter"
        accessibilityState={{ selected: isSelected, disabled }}
      >
        <View style={styles.content}>
          {icon && (
            <Text style={styles.icon}>{icon}</Text>
          )}
          <Text style={styles.text}>{label}</Text>
          {count !== undefined && (
            <Text style={styles.count}>{count}</Text>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

export default FilterChip;
