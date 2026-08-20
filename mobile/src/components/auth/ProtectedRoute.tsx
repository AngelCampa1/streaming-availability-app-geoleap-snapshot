import React, { ReactNode, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Text, Surface, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeProvider';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredPermissions?: string[];
  fallbackTitle?: string;
  fallbackMessage?: string;
  showLoginButton?: boolean;
}

type ProtectedRouteNavigationProp = NavigationProp<RootStackParamList>;

export default function ProtectedRoute({
  children,
  requiredPermissions = [],
  fallbackTitle = 'Access Required',
  fallbackMessage = 'You need to be signed in to access this feature.',
  showLoginButton = true,
}: ProtectedRouteProps) {
  const { state } = useAuth();
  const navigation = useNavigation<ProtectedRouteNavigationProp>();
  const { theme } = useTheme();

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.semantic.background.secondary,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      padding: theme.spacing[4],
    },
    surface: {
      padding: theme.spacing[8],
      borderRadius: theme.borderRadius.lg,
      elevation: 4,
    },
    messageContainer: {
      alignItems: 'center',
    },
    icon: {
      backgroundColor: 'transparent',
      marginBottom: theme.spacing[4],
    },
    title: {
      textAlign: 'center',
      marginBottom: theme.spacing[4],
      fontWeight: theme.typography.fontWeight.bold,
    },
    message: {
      textAlign: 'center',
      marginBottom: theme.spacing[6],
      opacity: 0.7,
      lineHeight: theme.typography.fontSize.base * theme.typography.lineHeight.relaxed,
    },
    loginButton: {
      paddingHorizontal: theme.spacing[6],
      paddingVertical: theme.spacing[1],
    },
    backButton: {
      paddingHorizontal: theme.spacing[6],
      paddingVertical: theme.spacing[1],
    },
  }), [theme]);

  // Check if user is authenticated
  if (!state.isAuthenticated) {
    return (

      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Surface style={styles.surface}>
            <View style={styles.messageContainer}>
              <IconButton
                icon="lock"
                size={64}
                iconColor={theme.semantic.text.tertiary}
                style={styles.icon}
              />

              <Text variant="headlineSmall" style={styles.title}>
                {fallbackTitle}
              </Text>

              <Text variant="bodyMedium" style={styles.message}>
                {fallbackMessage}
              </Text>

              {showLoginButton && (
                <Button
                  mode="contained"
                  onPress={() => navigation.navigate('Auth')}
                  style={styles.loginButton}
                >
                  Sign In
                </Button>
              )}
            </View>
          </Surface>
        </View>
      </SafeAreaView>

    );
  }

  // Check if user has required permissions (if any)
  if (requiredPermissions.length > 0) {
    // TODO: Implement permission checking logic based on user roles/permissions
    // For now, we'll assume all authenticated users have access
    const hasPermissions = true; // This would be: checkUserPermissions(state.user, requiredPermissions);

    if (!hasPermissions) {
      return (

        <SafeAreaView style={styles.container}>
          <View style={styles.content}>
            <Surface style={styles.surface}>
              <View style={styles.messageContainer}>
                <IconButton
                  icon="shield-off"
                  size={64}
                  iconColor={theme.colors.error[500]}
                  style={styles.icon}
                />

                <Text variant="headlineSmall" style={styles.title}>
                  Access Denied
                </Text>

                <Text variant="bodyMedium" style={styles.message}>
                  You don't have permission to access this feature. Contact support if you believe this is an error.
                </Text>

                <Button
                  mode="outlined"
                  onPress={() => navigation.goBack()}
                  style={styles.backButton}
                >
                  Go Back
                </Button>
              </View>
            </Surface>
          </View>
        </SafeAreaView>

      );
    }
  }

  // User is authenticated and has required permissions
  return <>{children}</>;
}
