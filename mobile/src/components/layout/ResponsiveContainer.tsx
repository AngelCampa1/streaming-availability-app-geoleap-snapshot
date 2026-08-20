/**
 * Responsive Container Component
 * Provides max-width constraints based on breakpoints
 */

import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useResponsive } from '../../hooks/useResponsive';

export interface ResponsiveContainerProps {
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: number;
  center?: boolean;
  style?: ViewStyle;
}

const maxWidthValues = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
  full: '100%',
} as const;

export function ResponsiveContainer({
  children,
  maxWidth = 'full',
  padding,
  center = true,
  style,
}: ResponsiveContainerProps) {
  const { width, isTablet } = useResponsive();

  const containerWidth = maxWidth === 'full' ? width : Math.min(width, maxWidthValues[maxWidth]);

  const containerStyle: ViewStyle = {
    width: containerWidth,
    paddingHorizontal: padding !== undefined ? padding : (isTablet ? 32 : 16),
    alignSelf: center ? 'center' : undefined,
  };

  return (
    <View style={[styles.container, containerStyle, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});

export default ResponsiveContainer;
