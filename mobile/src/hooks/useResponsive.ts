/**
 * Responsive hooks for GeoLeap Mobile App
 * Provides reactive hooks for responsive design
 */

import { useState, useEffect } from 'react';
import { Dimensions } from 'react-native';
import {
  getBreakpoint,
  isTablet,
  isSmallDevice,
  isLargeDevice,
  isLandscape,
  isPortrait,
  getResponsiveValue,
  getSafePadding,
} from '../utils/responsive';

/**
 * Hook to get current window dimensions with reactive updates
 */
export function useWindowDimensions() {
  const [dimensions, setDimensions] = useState(() => Dimensions.get('window'));

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });

    return () => subscription?.remove();
  }, []);

  return dimensions;
}

/**
 * Hook to get current screen dimensions with reactive updates
 */
export function useScreenDimensions() {
  const [dimensions, setDimensions] = useState(() => Dimensions.get('screen'));

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ screen }) => {
      setDimensions(screen);
    });

    return () => subscription?.remove();
  }, []);

  return dimensions;
}

/**
 * Hook to get current breakpoint with reactive updates
 * Returns: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
 */
export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState(getBreakpoint);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', () => {
      setBreakpoint(getBreakpoint());
    });

    return () => subscription?.remove();
  }, []);

  return breakpoint;
}

/**
 * Hook to get orientation with reactive updates
 */
export function useOrientation() {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(
    isPortrait() ? 'portrait' : 'landscape'
  );

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', () => {
      setOrientation(isPortrait() ? 'portrait' : 'landscape');
    });

    return () => subscription?.remove();
  }, []);

  return orientation;
}

/**
 * Hook to check if device is a tablet with reactive updates
 */
export function useIsTablet() {
  const [tablet, setTablet] = useState(isTablet);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', () => {
      setTablet(isTablet());
    });

    return () => subscription?.remove();
  }, []);

  return tablet;
}

/**
 * Hook to get responsive value based on breakpoints
 * Automatically updates when breakpoint changes
 */
export function useResponsiveValue<T>(values: {
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
  '2xl'?: T;
  default: T;
}): T {
  const breakpoint = useBreakpoint();
  return values[breakpoint] ?? values.default;
}

/**
 * Comprehensive responsive hook
 * Combines all responsive information
 */
export function useResponsive() {
  const dimensions = useWindowDimensions();
  const breakpoint = useBreakpoint();
  const orientation = useOrientation();
  const tablet = useIsTablet();
  const [deviceInfo, setDeviceInfo] = useState({
    isSmallDevice: isSmallDevice(),
    isLargeDevice: isLargeDevice(),
    isLandscape: isLandscape(),
    isPortrait: isPortrait(),
    safePadding: getSafePadding(),
  });

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', () => {
      setDeviceInfo({
        isSmallDevice: isSmallDevice(),
        isLargeDevice: isLargeDevice(),
        isLandscape: isLandscape(),
        isPortrait: isPortrait(),
        safePadding: getSafePadding(),
      });
    });

    return () => subscription?.remove();
  }, []);

  return {
    width: dimensions.width,
    height: dimensions.height,
    breakpoint,
    orientation,
    isTablet: tablet,
    isSmallDevice: deviceInfo.isSmallDevice,
    isLargeDevice: deviceInfo.isLargeDevice,
    isLandscape: deviceInfo.isLandscape,
    isPortrait: deviceInfo.isPortrait,
    safePadding: deviceInfo.safePadding,
    // Helper function to get responsive values
    getValue: <T>(values: {
      sm?: T;
      md?: T;
      lg?: T;
      xl?: T;
      '2xl'?: T;
      default: T;
    }) => getResponsiveValue(values),
  };
}

/**
 * Hook to get safe area insets with reactive updates
 */
export function useSafeArea() {
  const [safePadding, setSafePadding] = useState(getSafePadding);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', () => {
      setSafePadding(getSafePadding());
    });

    return () => subscription?.remove();
  }, []);

  return safePadding;
}

/**
 * Hook for scaled size that updates on dimension changes
 */
export function useScaledSize(baseSize: number, factor: number = 0.5) {
  const { width } = useWindowDimensions();
  const BASE_WIDTH = 375;

  return baseSize + ((baseSize * width) / BASE_WIDTH - baseSize) * factor;
}
