/**
 * Responsive Grid Component
 * Provides a flexible grid system that adapts to screen size
 */

import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useResponsive } from '../../hooks/useResponsive';

export interface ResponsiveGridProps {
  children: ReactNode;
  columns?: {
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    '2xl'?: number;
    default: number;
  };
  gap?: number;
  style?: ViewStyle;
}

export function ResponsiveGrid({
  children,
  columns = { default: 1, md: 2, lg: 3, xl: 4 },
  gap = 16,
  style,
}: ResponsiveGridProps) {
  const { getValue } = useResponsive();

  const columnCount = getValue(columns);

  return (
    <View style={[styles.container, { gap }, style]}>
      <View style={[styles.row, { gap }]}>
        {React.Children.map(children, (child, index) => (
          <View
            key={index}
            style={[
              styles.column,
              {
                width: `${(100 / columnCount)}%`,
                marginBottom: gap,
              },
            ]}>
            {child}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  column: {
    paddingHorizontal: 8,
  },
});

export default ResponsiveGrid;
