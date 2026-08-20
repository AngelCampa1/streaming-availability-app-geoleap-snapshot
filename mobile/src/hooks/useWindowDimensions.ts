/**
 * Window dimensions hook for GeoLeap Mobile App
 * Reactive hook for window dimensions that updates on changes
 */

import { useState, useEffect } from 'react';
import { Dimensions, ScaledSize } from 'react-native';

export interface WindowDimensions extends ScaledSize {
  isLandscape: boolean;
  isPortrait: boolean;
  aspectRatio: number;
}

/**
 * Hook to get current window dimensions with reactive updates
 * Includes orientation helpers
 */
export function useWindowDimensions(): WindowDimensions {
  const [dimensions, setDimensions] = useState<WindowDimensions>(() => {
    const window = Dimensions.get('window');
    return {
      ...window,
      isLandscape: window.width > window.height,
      isPortrait: window.height > window.width,
      aspectRatio: window.width / window.height,
    };
  });

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions({
        ...window,
        isLandscape: window.width > window.height,
        isPortrait: window.height > window.width,
        aspectRatio: window.width / window.height,
      });
    });

    return () => subscription?.remove();
  }, []);

  return dimensions;
}

export default useWindowDimensions;
