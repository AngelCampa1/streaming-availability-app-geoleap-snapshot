'use client';

import React, { createContext, useContext } from 'react';
import { ThemeMode } from '@/lib/design-tokens';

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  systemTheme: ThemeMode;
  isSystemTheme: boolean;
  setSystemTheme: (useSystem: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeContext.Provider
      value={{
        theme: 'light' as ThemeMode,
        setTheme: () => {},
        toggleTheme: () => {},
        systemTheme: 'light' as ThemeMode,
        isSystemTheme: false,
        setSystemTheme: () => {},
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    return {
      theme: 'light' as ThemeMode,
      setTheme: () => {},
      toggleTheme: () => {},
      systemTheme: 'light' as ThemeMode,
      isSystemTheme: false,
      setSystemTheme: () => {},
    };
  }
  return context;
}
