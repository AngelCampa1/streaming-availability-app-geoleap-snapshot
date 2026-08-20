/**
 * Platform-specific style utilities
 * Provides cross-platform compatible styles for shadows and other platform-specific features
 */

import { Platform, ViewStyle } from 'react-native';

export interface ShadowConfig {
  shadowColor?: string;
  shadowOffset?: { width: number; height: number };
  shadowOpacity?: number;
  shadowRadius?: number;
  elevation?: number;
}

/**
 * Create cross-platform shadow styles
 * Uses native shadow props on iOS/Android, boxShadow on web
 *
 * @example
 * const styles = StyleSheet.create({
 *   card: {
 *     ...createShadow({ elevation: 2, shadowColor: '#000' }),
 *   }
 * });
 */
export const createShadow = (config: ShadowConfig): ViewStyle => {
  const {
    shadowColor = '#000',
    shadowOffset = { width: 0, height: 2 },
    shadowOpacity = 0.1,
    shadowRadius = 4,
    elevation = 2,
  } = config;

  if (Platform.OS === 'web') {
    // Web: Use boxShadow CSS
    const offsetX = shadowOffset.width;
    const offsetY = shadowOffset.height;
    const blur = shadowRadius;
    const color = shadowColor;
    const alpha = shadowOpacity;

    // Convert to rgba if needed
    const rgba = color.startsWith('#')
      ? hexToRgba(color, alpha)
      : color.includes('rgba')
      ? color
      : `rgba(0, 0, 0, ${alpha})`;

    return {
      boxShadow: `${offsetX}px ${offsetY}px ${blur}px ${rgba}`,
    } as ViewStyle;
  }

  // iOS: Use shadow props
  if (Platform.OS === 'ios') {
    return {
      shadowColor,
      shadowOffset,
      shadowOpacity,
      shadowRadius,
    };
  }

  // Android: Use elevation
  return {
    elevation,
  };
};

/**
 * Preset shadow configurations matching theme
 */
export const shadows = {
  none: createShadow({ elevation: 0, shadowOpacity: 0 }),
  xs: createShadow({ elevation: 1, shadowRadius: 2, shadowOpacity: 0.05 }),
  sm: createShadow({ elevation: 2, shadowRadius: 4, shadowOpacity: 0.1 }),
  md: createShadow({ elevation: 4, shadowRadius: 8, shadowOpacity: 0.15 }),
  lg: createShadow({ elevation: 8, shadowRadius: 16, shadowOpacity: 0.2 }),
  xl: createShadow({ elevation: 12, shadowRadius: 24, shadowOpacity: 0.25 }),
};

/**
 * Convert hex color to rgba
 */
function hexToRgba(hex: string, alpha: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return `rgba(0, 0, 0, ${alpha})`;
  }

  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Platform-specific pointer events style
 * Fixes web warnings about pointerEvents prop
 *
 * @example
 * <View style={createPointerEvents('none')}>
 */
export const createPointerEvents = (value: 'auto' | 'none' | 'box-none' | 'box-only'): ViewStyle => {
  if (Platform.OS === 'web') {
    return {
      pointerEvents: value,
    } as ViewStyle;
  }

  // On native, pointerEvents can be a direct prop, but including in style also works
  return {
    pointerEvents: value,
  } as ViewStyle;
};

export default {
  createShadow,
  shadows,
  createPointerEvents,
};
