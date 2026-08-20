/**
 * Breakpoint hook for GeoLeap Mobile App
 * Standalone breakpoint detection with reactive updates
 */

import { useState, useEffect } from 'react';
import { Dimensions } from 'react-native';

export type Breakpoint = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const BREAKPOINTS = {
  sm: 375,  // iPhone SE
  md: 414,  // iPhone Pro
  lg: 768,  // iPad Mini
  xl: 1024, // iPad
  '2xl': 1280, // iPad Pro
} as const;

/**
 * Get current breakpoint based on screen width
 */
export function getCurrentBreakpoint(width: number): Breakpoint {
  if (width >= BREAKPOINTS['2xl']) return '2xl';
  if (width >= BREAKPOINTS.xl) return 'xl';
  if (width >= BREAKPOINTS.lg) return 'lg';
  if (width >= BREAKPOINTS.md) return 'md';
  return 'sm';
}

/**
 * Hook to get current breakpoint with reactive updates
 */
export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(() => {
    const { width } = Dimensions.get('window');
    return getCurrentBreakpoint(width);
  });

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      const newBreakpoint = getCurrentBreakpoint(window.width);
      setBreakpoint(newBreakpoint);
    });

    return () => subscription?.remove();
  }, []);

  return breakpoint;
}

/**
 * Hook to check if current breakpoint matches a specific breakpoint or larger
 */
export function useBreakpointUp(targetBreakpoint: Breakpoint): boolean {
  const currentBreakpoint = useBreakpoint();

  const breakpointOrder: Breakpoint[] = ['sm', 'md', 'lg', 'xl', '2xl'];
  const currentIndex = breakpointOrder.indexOf(currentBreakpoint);
  const targetIndex = breakpointOrder.indexOf(targetBreakpoint);

  return currentIndex >= targetIndex;
}

/**
 * Hook to check if current breakpoint matches a specific breakpoint or smaller
 */
export function useBreakpointDown(targetBreakpoint: Breakpoint): boolean {
  const currentBreakpoint = useBreakpoint();

  const breakpointOrder: Breakpoint[] = ['sm', 'md', 'lg', 'xl', '2xl'];
  const currentIndex = breakpointOrder.indexOf(currentBreakpoint);
  const targetIndex = breakpointOrder.indexOf(targetBreakpoint);

  return currentIndex <= targetIndex;
}

/**
 * Hook to check if current breakpoint is between two breakpoints
 */
export function useBreakpointBetween(min: Breakpoint, max: Breakpoint): boolean {
  const currentBreakpoint = useBreakpoint();

  const breakpointOrder: Breakpoint[] = ['sm', 'md', 'lg', 'xl', '2xl'];
  const currentIndex = breakpointOrder.indexOf(currentBreakpoint);
  const minIndex = breakpointOrder.indexOf(min);
  const maxIndex = breakpointOrder.indexOf(max);

  return currentIndex >= minIndex && currentIndex <= maxIndex;
}

export default useBreakpoint;
