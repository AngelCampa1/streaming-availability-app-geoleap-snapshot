import React, { useEffect, ReactNode, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeProvider';

interface AuthGuardProps {
  children: ReactNode;
  requireAuth?: boolean;
  redirectTo?: keyof RootStackParamList;
  fallback?: ReactNode;
}

type AuthGuardNavigationProp = NavigationProp<RootStackParamList>;

export default function AuthGuard({
  children,
  requireAuth = true,
  redirectTo = 'Auth',
  fallback,
}: AuthGuardProps) {
  const { state } = useAuth();
  const navigation = useNavigation<AuthGuardNavigationProp>();
  const { theme } = useTheme();

  const styles = useMemo(() => StyleSheet.create({
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.semantic.background.secondary,
    },
    loadingText: {
      marginTop: theme.spacing[4],
      opacity: 0.7,
    },
  }), [theme]);

  useEffect(() => {
    if (!state.isLoading) {
      if (requireAuth && !state.isAuthenticated) {
        // User is not authenticated but auth is required
        navigation.navigate(redirectTo as any);
      } else if (!requireAuth && state.isAuthenticated) {
        // User is authenticated but shouldn't be (e.g., on login screen)
        navigation.navigate('Main' as any);
      }
    }
  }, [state.isAuthenticated, state.isLoading, requireAuth, navigation, redirectTo]);

  // Show loading while checking authentication
  if (state.isLoading) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text variant="bodyLarge" style={styles.loadingText}>
          Loading...
        </Text>
      </View>
    );
  }

  // Check authentication requirements
  if (requireAuth && !state.isAuthenticated) {
    return null; // Will redirect to auth
  }

  if (!requireAuth && state.isAuthenticated) {
    return null; // Will redirect to main
  }

  return <>{children}</>;
}
