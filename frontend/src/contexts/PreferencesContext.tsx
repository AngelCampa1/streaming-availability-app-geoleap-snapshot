'use client';

import React, { createContext, useContext, useReducer, ReactNode } from 'react';

// Define the preferences interface
interface UserPreferences {
  id?: string;
  userId: string;
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  preferredGenre?: string;
  contentLanguage?: string;
  adultContent?: boolean;
  subtitlesEnabled?: boolean;
  videoQuality?: 'auto' | 'low' | 'medium' | 'high' | 'ultra';
  primaryRegion?: string;
  secondaryRegions?: string[];
  timezone?: string;
  currency?: string;
  measurementUnit?: 'metric' | 'imperial';
  twoFactorEnabled?: boolean;
  sessionTimeout?: number;
  passwordExpiry?: number;
  loginNotifications?: boolean;
  deviceTracking?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Define the state interface
interface PreferencesState {
  preferences: UserPreferences | null;
  loading: boolean;
  error: string | null;
  hasUnsavedChanges: boolean;
}

// Define action types
type PreferencesAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_PREFERENCES'; payload: UserPreferences }
  | { type: 'UPDATE_PREFERENCES'; payload: Partial<UserPreferences> }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_UNSAVED_CHANGES'; payload: boolean }
  | { type: 'RESET_PREFERENCES' };

// Define context interface
interface PreferencesContextType {
  state: PreferencesState;
  dispatch: React.Dispatch<PreferencesAction>;
  updatePreferences: (updates: Partial<UserPreferences>) => void;
  resetPreferences: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setUnsavedChanges: (hasChanges: boolean) => void;
}

// Initial state
const initialState: PreferencesState = {
  preferences: null,
  loading: false,
  error: null,
  hasUnsavedChanges: false,
};

// Reducer function
const preferencesReducer = (state: PreferencesState, action: PreferencesAction): PreferencesState => {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload,
      };
    case 'SET_PREFERENCES':
      return {
        ...state,
        preferences: action.payload,
        loading: false,
        error: null,
        hasUnsavedChanges: false,
      };
    case 'UPDATE_PREFERENCES':
      return {
        ...state,
        preferences: state.preferences ? { ...state.preferences, ...action.payload } : null,
        hasUnsavedChanges: true,
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        loading: false,
      };
    case 'SET_UNSAVED_CHANGES':
      return {
        ...state,
        hasUnsavedChanges: action.payload,
      };
    case 'RESET_PREFERENCES':
      return initialState;
    default:
      return state;
  }
};

// Create context
const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

// Provider component
interface PreferencesProviderProps {
  children: ReactNode;
}

export const PreferencesProvider: React.FC<PreferencesProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(preferencesReducer, initialState);

  // Helper functions
  const updatePreferences = (updates: Partial<UserPreferences>) => {
    dispatch({ type: 'UPDATE_PREFERENCES', payload: updates });
  };

  const resetPreferences = () => {
    dispatch({ type: 'RESET_PREFERENCES' });
  };

  const setLoading = (loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  };

  const setError = (error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  };

  const setUnsavedChanges = (hasChanges: boolean) => {
    dispatch({ type: 'SET_UNSAVED_CHANGES', payload: hasChanges });
  };

  const contextValue: PreferencesContextType = {
    state,
    dispatch,
    updatePreferences,
    resetPreferences,
    setLoading,
    setError,
    setUnsavedChanges,
  };

  return <PreferencesContext.Provider value={contextValue}>{children}</PreferencesContext.Provider>;
};

// Custom hook to use preferences context
export const usePreferences = (): PreferencesContextType => {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
};

// Export types
export type { UserPreferences, PreferencesState, PreferencesAction, PreferencesContextType };
