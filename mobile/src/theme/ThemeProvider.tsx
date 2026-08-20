/**
 * Unified Theme Provider for GeoLeap Mobile App
 * Merges all theme systems: designTokens, ThemeContext, and themeService
 * Provides light-only theming with persisted accessibility preferences
 */

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { designTokens, semantic } from '../tokens/designTokens';
import { logger } from '../utils/logger';

export interface UnifiedTheme {
  // Design tokens
  spacing: typeof designTokens.spacing;
  typography: typeof designTokens.typography;
  colors: typeof designTokens.colors;
  borderRadius: typeof designTokens.borderRadius;
  shadows: typeof designTokens.shadows;
  breakpoints: typeof designTokens.breakpoints;
  animations: typeof designTokens.animations;
  zIndex: typeof designTokens.zIndex;
  components: typeof designTokens.components;

  // Semantic colors
  semantic: {
    text: typeof semantic.text;
    background: typeof semantic.background;
    border: typeof semantic.border;
    status: typeof semantic.status;
  };

  mode: 'light';
}

export interface ThemeContextType extends UnifiedTheme {
  theme: UnifiedTheme;
  highContrast: boolean;
  setHighContrast: (enabled: boolean) => void;
  reducedMotion: boolean;
  setReducedMotion: (enabled: boolean) => void;
}

const STORAGE_KEY = '@geoleap_theme_preferences';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [highContrast, setHighContrast] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Load preferences from storage
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const prefs = JSON.parse(stored);
          setHighContrast(prefs.highContrast || false);
          setReducedMotion(prefs.reducedMotion || false);
        }
      } catch (error) {
        logger.warn('[ThemeProvider] Failed to load theme preferences', error);
      }
    };

    loadPreferences();
  }, []);

  // Save preferences to storage
  useEffect(() => {
    const savePreferences = async () => {
      try {
        const prefs = {
          highContrast,
          reducedMotion,
        };
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
      } catch (error) {
        logger.warn('[ThemeProvider] Failed to save theme preferences', error);
      }
    };

    savePreferences();
  }, [highContrast, reducedMotion]);

  // Create unified theme object
  const createTheme = (): UnifiedTheme => {
    // Apply high contrast adjustments if enabled
    let semanticColors = {
      text: semantic.text,
      background: semantic.background,
      border: semantic.border,
      status: semantic.status,
    };

    if (highContrast) {
      semanticColors = {
        ...semanticColors,
        text: {
          ...semanticColors.text,
          primary: '#000000' as string,
          secondary: '#333333' as string,
        },
        border: {
          ...semanticColors.border,
          primary: '#000000' as string,
        },
      } as typeof semanticColors;
    }

    return {
      spacing: designTokens.spacing,
      typography: designTokens.typography,
      colors: designTokens.colors,
      borderRadius: designTokens.borderRadius,
      shadows: designTokens.shadows,
      breakpoints: designTokens.breakpoints,
      animations: reducedMotion
        ? {
            ...designTokens.animations,
            duration: {
              fast: 0 as number,
              normal: 0 as number,
              slow: 0 as number,
              slower: 0 as number
            }
          } as typeof designTokens.animations
        : designTokens.animations,
      zIndex: designTokens.zIndex,
      components: designTokens.components,
      semantic: semanticColors as UnifiedTheme['semantic'],
      mode: 'light',
    };
  };

  const theme = createTheme();

  const value: ThemeContextType = {
    ...theme,
    theme,
    highContrast,
    setHighContrast,
    reducedMotion,
    setReducedMotion,
  };

  // Update StatusBar based on theme
  useEffect(() => {
    StatusBar.setBarStyle('dark-content', true);
  }, []);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export default ThemeProvider;
