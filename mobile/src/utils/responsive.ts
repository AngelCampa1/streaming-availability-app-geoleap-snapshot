import { Platform, Dimensions, PixelRatio } from 'react-native';
/**
 * Responsive utility functions for GeoLeap Mobile App
 * Provides helpers for responsive sizing, breakpoints, and device detection
 */


// Base dimensions (iPhone 11 Pro as reference)
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

// Get current window dimensions
export const getWindowDimensions = () => {
  return Dimensions.get('window');
};

export const getScreenDimensions = () => {
  return Dimensions.get('screen');
};

/**
 * Width Percentage
 * Converts percentage of screen width to DP
 * @param percentage - Percentage of screen width (0-100)
 */
export const wp = (percentage: number): number => {
  const { width } = getWindowDimensions();
  return (percentage * width) / 100;
};

/**
 * Height Percentage
 * Converts percentage of screen height to DP
 * @param percentage - Percentage of screen height (0-100)
 */
export const hp = (percentage: number): number => {
  const { height } = getWindowDimensions();
  return (percentage * height) / 100;
};

/**
 * Normalize font size
 * Scales font size based on screen size and pixel density
 * @param size - Base font size
 */
export const normalize = (size: number): number => {
  const { width } = getWindowDimensions();
  const scale = width / BASE_WIDTH;
  const newSize = size * scale;

  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  } else {
    return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 2;
  }
};

/**
 * Vertical scale
 * Scales size based on screen height
 * @param size - Base size
 */
export const verticalScale = (size: number): number => {
  const { height } = getWindowDimensions();
  return (size * height) / BASE_HEIGHT;
};

/**
 * Horizontal scale
 * Scales size based on screen width
 * @param size - Base size
 */
export const horizontalScale = (size: number): number => {
  const { width } = getWindowDimensions();
  return (size * width) / BASE_WIDTH;
};

/**
 * Moderate scale
 * Scales size with a factor to prevent excessive scaling
 * @param size - Base size
 * @param factor - Scaling factor (default: 0.5)
 */
export const moderateScale = (size: number, factor: number = 0.5): number => {
  return size + (horizontalScale(size) - size) * factor;
};

/**
 * Check if device is a tablet
 */
export const isTablet = (): boolean => {
  const { width, height } = getWindowDimensions();
  const aspectRatio = height / width;

  // iPad and Android tablets typically have width >= 768
  // And aspect ratio closer to 4:3 (1.33) than phones (typically 16:9 or 2:1)
  return (
    (width >= 768 || height >= 768) &&
    aspectRatio < 1.6
  );
};

/**
 * Check if device is a small phone (iPhone SE, etc)
 */
export const isSmallDevice = (): boolean => {
  const { width } = getWindowDimensions();
  return width < 375;
};

/**
 * Check if device is a large phone (iPhone Pro Max, etc)
 */
export const isLargeDevice = (): boolean => {
  const { width } = getWindowDimensions();
  return width >= 428;
};

/**
 * Get current breakpoint
 * Returns: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
 */
export const getBreakpoint = (): 'sm' | 'md' | 'lg' | 'xl' | '2xl' => {
  const { width } = getWindowDimensions();

  if (width >= 1280) return '2xl';
  if (width >= 1024) return 'xl';
  if (width >= 768) return 'lg';
  if (width >= 414) return 'md';
  return 'sm';
};

/**
 * Get responsive value based on breakpoints
 * @param values - Object with breakpoint keys and values
 * @returns Value for current breakpoint
 */
export const getResponsiveValue = <T>(values: {
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
  '2xl'?: T;
  default: T;
}): T => {
  const breakpoint = getBreakpoint();

  // Find the appropriate value, falling back to default
  return values[breakpoint] ?? values.default;
};

/**
 * Check if device is in landscape orientation
 */
export const isLandscape = (): boolean => {
  const { width, height } = getWindowDimensions();
  return width > height;
};

/**
 * Check if device is in portrait orientation
 */
export const isPortrait = (): boolean => {
  const { width, height } = getWindowDimensions();
  return height > width;
};

/**
 * Get safe padding for devices with notches
 */
export const getSafePadding = () => {
  const { height, width } = getWindowDimensions();

  // iPhone X and newer have notches
  const hasNotch = (
    Platform.OS === 'ios' &&
    (height >= 812 || width >= 812)
  );

  return {
    top: hasNotch ? 44 : 20,
    bottom: hasNotch ? 34 : 0,
    left: 0,
    right: 0,
  };
};

/**
 * Responsive font sizes based on device
 */
export const responsiveFontSizes = {
  xs: normalize(12),
  sm: normalize(14),
  base: normalize(16),
  lg: normalize(18),
  xl: normalize(20),
  '2xl': normalize(24),
  '3xl': normalize(30),
  '4xl': normalize(36),
  '5xl': normalize(48),
  '6xl': normalize(60),
};

/**
 * Responsive spacing based on device
 */
export const responsiveSpacing = {
  0: 0,
  1: moderateScale(4),
  2: moderateScale(8),
  3: moderateScale(12),
  4: moderateScale(16),
  5: moderateScale(20),
  6: moderateScale(24),
  8: moderateScale(32),
  10: moderateScale(40),
  12: moderateScale(48),
  16: moderateScale(64),
  20: moderateScale(80),
  24: moderateScale(96),
  32: moderateScale(128),
};

/**
 * Device info helper
 */
export const deviceInfo = {
  isTablet: isTablet(),
  isSmallDevice: isSmallDevice(),
  isLargeDevice: isLargeDevice(),
  isLandscape: isLandscape(),
  isPortrait: isPortrait(),
  breakpoint: getBreakpoint(),
  width: getWindowDimensions().width,
  height: getWindowDimensions().height,
  safePadding: getSafePadding(),
};
