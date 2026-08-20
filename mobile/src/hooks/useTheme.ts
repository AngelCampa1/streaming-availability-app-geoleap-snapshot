/**
 * Theme Hook for GeoLeap Mobile App
 * Provides access to unified app theme with full design tokens
 * Provides the fixed light app theme and accessibility preferences
 */

import { useTheme as useUnifiedTheme } from '../theme/ThemeProvider';

/**
 * Hook for accessing unified theme with design tokens
 * Re-exports the unified theme hook for backward compatibility
 */
export function useTheme() {
  return useUnifiedTheme();
}

export default useTheme;

// Export types for convenience
export type { UnifiedTheme, ThemeContextType } from '../theme/ThemeProvider';
