/**
 * Layout Constants
 * Centralized layout dimensions and constants for consistent UI
 */

import { Dimensions } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const LAYOUT_CONSTANTS = {
  // Screen dimensions
  SCREEN_WIDTH: screenWidth,
  SCREEN_HEIGHT: screenHeight,

  // Header heights
  HEADER_HEIGHT_LARGE: 280,
  HEADER_HEIGHT_COLLAPSED: 80,

  // Card dimensions
  CARD_WIDTH_RATIO: 1 / 3, // For 3 cards per row
  CARD_MARGIN: 16,
  CARD_GAP: 12,

  // Touch Target Sizes (BUG-M20: Standardized touch targets)
  // WCAG 2.1 Level AA requires minimum 44x44px touch targets
  TOUCH_TARGET_MIN: 44, // Minimum recommended touch target
  TOUCH_TARGET_COMFORTABLE: 48, // Comfortable touch target
  TOUCH_TARGET_LARGE: 56, // Large touch target for primary actions

  // Common dimensions
  BUTTON_MIN_SIZE: 44, // Minimum touch target
  ICON_BUTTON_SIZE: 44, // Updated from 40 to meet WCAG requirement
  ICON_BUTTON_RADIUS: 22,

  // Opacity values
  OVERLAY_OPACITY: 0.3,
  OVERLAY_OPACITY_DARK: 0.5,
  OVERLAY_OPACITY_MODAL: 0.4,
  OVERLAY_OPACITY_DARK_MODAL: 0.8,
} as const;

/**
 * Calculate card width for grid layouts
 * @param cardsPerRow Number of cards to display per row
 * @param containerPadding Total horizontal padding of container
 * @param cardGap Gap between cards
 */
export const calculateCardWidth = (
  cardsPerRow: number,
  containerPadding = 32, // 16px on each side
  cardGap = 12
): number => {
  const totalGap = (cardsPerRow - 1) * cardGap;
  return (screenWidth - containerPadding - totalGap) / cardsPerRow;
};

export default LAYOUT_CONSTANTS;
