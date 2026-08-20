import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { AuthNavigator } from './AuthNavigator';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../context/AuthContext';
import { FeedbackButton } from '../components/feedback/FeedbackButton';
import ErrorBoundary from '../components/common/ErrorBoundary';
import { RootStackParamList, MainTabParamList } from './types';
import { logger } from '../utils/logger';

// Import screens
import { LandingScreen } from '../screens/LandingScreen';
import SearchScreen from '../screens/search/SearchScreen';
import DashboardScreen from '../screens/DashboardScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { StreamingServiceSelectionScreen } from '../screens/onboarding/StreamingServiceSelectionScreen';
import { ContentPreferencesScreen } from '../screens/onboarding/ContentPreferencesScreen';
import { RegionPreferencesScreen } from '../screens/onboarding/RegionPreferencesScreen';
import { GenrePreferencesScreen } from '../screens/onboarding/GenrePreferencesScreen';
import { OnboardingCompletionScreen } from '../screens/onboarding/OnboardingCompletionScreen';
import ContentDetailScreen from '../screens/ContentDetailScreen';
import { VpnGuidanceScreen } from '../screens/vpn/VpnGuidanceScreen';
import { VpnProviderComparisonScreen } from '../screens/vpn/VpnProviderComparisonScreen';
import { SubscriptionPlansScreen } from '../screens/subscription/SubscriptionPlansScreen';
import { SubscriptionManagementScreen } from '../screens/subscription/SubscriptionManagementScreen';
// Info screens
import { AboutScreen } from '../screens/info/AboutScreen';
import { HelpScreen } from '../screens/info/HelpScreen';
import { SupportScreen } from '../screens/info/SupportScreen';
import { PrivacyPolicyScreen } from '../screens/info/PrivacyPolicyScreen';
import { TermsOfServiceScreen } from '../screens/info/TermsOfServiceScreen';
// Payment screens
import { PaymentHistoryScreen } from '../screens/payment/PaymentHistoryScreen';
// Notification screens
import { NotificationCenterScreen } from '../screens/notifications/NotificationCenterScreen';
// VPN screens
import { VpnSetupGuideScreen } from '../screens/vpn/VpnSetupGuideScreen';
// Settings screens (Sprint 3 & 4)
import { TwoFactorSetupScreen } from '../screens/settings/TwoFactorSetupScreen';
import { PreferencesManagementScreen } from '../screens/settings/PreferencesManagementScreen';
import { AdvancedSecurityScreen } from '../screens/settings/AdvancedSecurityScreen';
// VPN screens (Sprint 4)
import { VpnEffectivenessTestScreen } from '../screens/vpn/VpnEffectivenessTestScreen';
// Payment screens (Sprint 5)
import { PaymentRecoveryScreen } from '../screens/payment/PaymentRecoveryScreen';
// Content screens (Sprint 5)
import { TrendingScreen } from '../screens/TrendingScreen';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const MainTabNavigator = () => {
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      id="main-tabs"
      screenOptions={({ route }) => ({
        lazy: true,
        tabBarIcon: ({ focused: _focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Home':
              iconName = 'home';
              break;
            case 'Search':
              iconName = 'search';
              break;
            case 'Dashboard':
              iconName = 'dashboard';
              break;
            case 'Profile':
              iconName = 'person';
              break;
            case 'Settings':
              iconName = 'settings';
              break;
            default:
              iconName = 'help';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary[500],
        tabBarInactiveTintColor: theme.semantic.text.secondary,
        tabBarStyle: {
          backgroundColor: theme.semantic.background.primary,
          borderTopColor: theme.semantic.border.primary,
          borderTopWidth: 1,
          paddingBottom: theme.spacing[2],
          paddingTop: theme.spacing[2],
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: theme.typography.fontSize.xs,
          fontWeight: theme.typography.fontWeight.medium,
          marginTop: theme.spacing[1],
        },
        headerStyle: {
          backgroundColor: theme.semantic.background.primary,
          borderBottomColor: theme.semantic.border.primary,
          borderBottomWidth: 1,
          shadowColor: 'transparent',
          elevation: 0,
        },
        headerTintColor: theme.semantic.text.primary,
        headerTitleStyle: {
          fontWeight: theme.typography.fontWeight.bold,
          fontSize: theme.typography.fontSize.lg,
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={LandingScreen}
        options={{
          title: 'Home',
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          title: 'Search',
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'Dashboard',
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings',
          headerShown: false,
        }}
      />
    </Tab.Navigator>
  );
};

export const AppNavigator = () => {
  // SECURITY FIX: Use actual authentication state from AuthContext
  const { state } = useAuth();
  const { theme } = useTheme();

  return (
    <ErrorBoundary
      enableRetry={true}
      enableReport={true}
      maxRetries={3}
      onError={(error, errorInfo) => {
        // Log critical navigation errors
        logger.error('[AppNavigator] Navigation Error', {
          message: error.message,
          componentStack: errorInfo?.componentStack
        });
      }}
    >
    <View style={styles.container}>
      <Stack.Navigator
        id="main-stack"
        screenOptions={{
          headerShown: false,
          gestureEnabled: true,
          cardStyle: { backgroundColor: theme.semantic.background.primary },
        }}
      >
        {state.isAuthenticated ? (
          <>
            <Stack.Screen name="Main" component={MainTabNavigator} />
            <Stack.Screen
              name="StreamingServiceSelection"
              component={StreamingServiceSelectionScreen}
            />
            <Stack.Screen name="ContentDetail" component={ContentDetailScreen} />
            <Stack.Screen name="VpnGuidance" component={VpnGuidanceScreen} />
            <Stack.Screen
              name="VpnProviderComparison"
              component={VpnProviderComparisonScreen}
            />
            <Stack.Screen name="SubscriptionPlans" component={SubscriptionPlansScreen} />
            <Stack.Screen name="SubscriptionManagement" component={SubscriptionManagementScreen} />
            {/* Onboarding Screens */}
            <Stack.Screen name="ContentPreferences" component={ContentPreferencesScreen} />
            <Stack.Screen name="RegionPreferences" component={RegionPreferencesScreen} />
            <Stack.Screen name="GenrePreferences" component={GenrePreferencesScreen} />
            <Stack.Screen name="OnboardingComplete" component={OnboardingCompletionScreen} />
            {/* Info Screens */}
            <Stack.Screen name="About" component={AboutScreen} />
            <Stack.Screen name="Help" component={HelpScreen} />
            <Stack.Screen name="Support" component={SupportScreen} />
            <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
            <Stack.Screen name="TermsOfService" component={TermsOfServiceScreen} />
            {/* Payment Screens */}
            <Stack.Screen name="PaymentHistory" component={PaymentHistoryScreen} />
            {/* Notification Screens */}
            <Stack.Screen name="NotificationCenter" component={NotificationCenterScreen} />
            {/* VPN Screens */}
            <Stack.Screen name="VpnSetupGuide" component={VpnSetupGuideScreen} />
            {/* Settings Screens (Sprint 3 & 4) */}
            <Stack.Screen name="TwoFactorSetup" component={TwoFactorSetupScreen} />
            <Stack.Screen name="PreferencesManagement" component={PreferencesManagementScreen} />
            <Stack.Screen name="AdvancedSecurity" component={AdvancedSecurityScreen} />
            {/* VPN Screens (Sprint 4) */}
            <Stack.Screen name="VpnEffectivenessTest" component={VpnEffectivenessTestScreen} />
            {/* Payment Screens (Sprint 5) */}
            <Stack.Screen name="PaymentRecovery" component={PaymentRecoveryScreen} />
            {/* Content Screens (Sprint 5) */}
            <Stack.Screen name="Trending" component={TrendingScreen} />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>

      {/* Feedback FAB - visible on all screens */}
      <FeedbackButton />
    </View>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
