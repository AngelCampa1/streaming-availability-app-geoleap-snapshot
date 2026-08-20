import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { Appearance } from 'react-native';

// State interface
interface AppState {
  user: {
    id: string | null;
    name: string | null;
    email: string | null;
  };
  isConnected: boolean;
  theme: 'light' ;
  isLoading: boolean;
}

// Action types
type AppAction =
  | { type: 'SET_USER'; payload: { id: string; name: string; email: string } }
  | { type: 'CLEAR_USER' }
  | { type: 'SET_CONNECTION_STATUS'; payload: boolean }
  | { type: 'SET_THEME'; payload: 'light'  }
  | { type: 'SET_LOADING'; payload: boolean };

// Initial state
const initialState: AppState = {
  user: {
    id: null,
    name: null,
    email: null,
  },
  isConnected: false,
  theme: (Appearance.getColorScheme() ?? 'light') as 'light' ,
  isLoading: false,
};

// Reducer
const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
      };
    case 'CLEAR_USER':
      return {
        ...state,
        user: {
          id: null,
          name: null,
          email: null,
        },
      };
    case 'SET_CONNECTION_STATUS':
      return {
        ...state,
        isConnected: action.payload,
      };
    case 'SET_THEME':
      return {
        ...state,
        theme: action.payload,
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    default:
      return state;
  }
};

// Context
const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | undefined>(undefined);

// Provider component
interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      dispatch({ type: 'SET_THEME', payload: (colorScheme ?? 'light') as 'light'  });
    });
    return () => subscription.remove();
  }, []);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};

// Hook to use the context
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

// Action creators
export const setUser = (user: { id: string; name: string; email: string }) => ({
  type: 'SET_USER' as const,
  payload: user,
});

export const clearUser = () => ({
  type: 'CLEAR_USER' as const,
});

export const setConnectionStatus = (isConnected: boolean) => ({
  type: 'SET_CONNECTION_STATUS' as const,
  payload: isConnected,
});

export const setTheme = (theme: 'light' ) => ({
  type: 'SET_THEME' as const,
  payload: theme,
});

export const setLoading = (isLoading: boolean) => ({
  type: 'SET_LOADING' as const,
  payload: isLoading,
});
