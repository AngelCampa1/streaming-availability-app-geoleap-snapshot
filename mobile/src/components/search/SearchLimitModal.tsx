/**
 * SearchLimitModal - Modal displayed when user reaches search limit
 *
 * Prompts users to upgrade to premium subscription when they've
 * exhausted their daily search quota. Directs to premium (not free account).
 */

import React, { useMemo } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Text, Button, Surface, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../context/AuthContext';
import { SearchLimitState } from '../../hooks/useSearchLimit';

export interface SearchLimitModalProps {
  visible: boolean;
  onDismiss: () => void;
  searchLimitState: SearchLimitState;
}

// Premium benefits to display
const PREMIUM_BENEFITS = [
  {
    icon: 'search',
    title: 'Unlimited Searches',
    description: 'Search as much as you want with no daily limits',
  },
  {
    icon: 'list',
    title: 'Full Results',
    description: 'See all matching content without result caps',
  },
  {
    icon: 'movie',
    title: 'Complete Streaming Info',
    description: 'Access availability across all 200+ streaming services',
  },
  {
    icon: 'notifications',
    title: 'Smart Alerts',
    description: 'Get notified when content becomes available in your region',
  },
  {
    icon: 'bookmark',
    title: 'Unlimited Watchlist',
    description: 'Save as many titles as you want to your watchlist',
  },
];

export const SearchLimitModal: React.FC<SearchLimitModalProps> = ({
  visible,
  onDismiss,
  searchLimitState,
}) => {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { state } = useAuth();
  const isAuthenticated = state.isAuthenticated;

  const styles = useMemo(() => createStyles(theme), [theme]);

  // Format reset time for display
  const formatResetTime = (resetTime: Date | null): string => {
    if (!resetTime) return '';
    const now = new Date();
    const diff = resetTime.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes} minutes`;
  };

  const handleUpgradeToPremium = () => {
    onDismiss();
    // Navigate to subscription plans screen
    navigation.dispatch(
      CommonActions.navigate({
        name: 'SubscriptionPlans',
      })
    );
  };

  const handleLogin = () => {
    onDismiss();
    // Reset navigation to Auth stack with Login screen
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Auth' }],
      })
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeArea}>
          <Surface style={styles.modalContainer}>
            {/* Close button */}
            <View style={styles.header}>
              <IconButton
                icon="close"
                size={24}
                onPress={onDismiss}
                style={styles.closeButton}
                accessibilityLabel="Close modal"
              />
            </View>

            <ScrollView
              style={styles.scrollContent}
              contentContainerStyle={styles.scrollContentContainer}
              showsVerticalScrollIndicator={false}
            >
              {/* Limit reached icon and message */}
              <View style={styles.limitSection}>
                <View style={styles.iconContainer}>
                  <Icon
                    name="search-off"
                    size={48}
                    color={theme.colors.warning[500]}
                  />
                </View>
                <Text style={styles.title}>Search Limit Reached</Text>
                <Text style={styles.subtitle}>
                  You've used all {searchLimitState.searchLimit} of your daily searches
                  {searchLimitState.tier !== 'anonymous' && ` on the ${searchLimitState.tier} plan`}.
                </Text>
                {searchLimitState.resetTime && (
                  <Text style={styles.resetText}>
                    Your searches will reset in {formatResetTime(searchLimitState.resetTime)}
                  </Text>
                )}
              </View>

              {/* Premium benefits */}
              <View style={styles.benefitsSection}>
                <Text style={styles.benefitsTitle}>
                  Upgrade to Premium for unlimited access
                </Text>
                {PREMIUM_BENEFITS.map((benefit, index) => (
                  <View key={index} style={styles.benefitRow}>
                    <View style={styles.benefitIconContainer}>
                      <Icon
                        name={benefit.icon}
                        size={20}
                        color={theme.colors.primary[500]}
                      />
                    </View>
                    <View style={styles.benefitTextContainer}>
                      <Text style={styles.benefitTitle}>{benefit.title}</Text>
                      <Text style={styles.benefitDescription}>
                        {benefit.description}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* CTA Section */}
              <View style={styles.ctaSection}>
                <Button
                  mode="contained"
                  onPress={handleUpgradeToPremium}
                  style={styles.upgradeButton}
                  labelStyle={styles.upgradeButtonLabel}
                  icon="crown"
                  testID="upgrade-to-premium-button"
                >
                  Upgrade to Premium
                </Button>

                {/* Show login option only for anonymous users */}
                {!isAuthenticated && (
                  <TouchableOpacity
                    onPress={handleLogin}
                    style={styles.loginLink}
                    accessibilityLabel="Log in to your account"
                    accessibilityRole="button"
                    testID="login-link"
                  >
                    <Text style={styles.loginText}>
                      Already have an account?{' '}
                      <Text style={styles.loginLinkText}>Log in</Text>
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Dismiss option */}
                <TouchableOpacity
                  onPress={onDismiss}
                  style={styles.dismissLink}
                  accessibilityLabel="Continue with limited access"
                  accessibilityRole="button"
                  testID="dismiss-modal-button"
                >
                  <Text style={styles.dismissText}>
                    Continue with limited access
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Surface>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: theme.colors.overlay.lightStrong,
      justifyContent: 'flex-end',
    } as ViewStyle,
    safeArea: {
      flex: 1,
      justifyContent: 'flex-end',
    } as ViewStyle,
    modalContainer: {
      backgroundColor: theme.semantic.background.primary,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '90%',
      paddingBottom: 24,
    } as ViewStyle,
    header: {
      alignItems: 'flex-end',
      paddingTop: 8,
      paddingRight: 8,
    } as ViewStyle,
    closeButton: {
      margin: 0,
    } as ViewStyle,
    scrollContent: {
      flex: 1,
    } as ViewStyle,
    scrollContentContainer: {
      paddingHorizontal: 24,
      paddingBottom: 24,
    } as ViewStyle,
    limitSection: {
      alignItems: 'center',
      marginBottom: 24,
    } as ViewStyle,
    iconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.colors.warning[50],
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    } as ViewStyle,
    title: {
      fontSize: theme.typography.fontSize['2xl'],
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.semantic.text.primary,
      textAlign: 'center',
      marginBottom: 8,
    } as TextStyle,
    subtitle: {
      fontSize: theme.typography.fontSize.md,
      color: theme.semantic.text.secondary,
      textAlign: 'center',
      lineHeight: 22,
    } as TextStyle,
    resetText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.warning[600],
      textAlign: 'center',
      marginTop: 8,
      fontWeight: theme.typography.fontWeight.medium,
    } as TextStyle,
    benefitsSection: {
      marginBottom: 24,
    } as ViewStyle,
    benefitsTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.semantic.text.primary,
      textAlign: 'center',
      marginBottom: 16,
    } as TextStyle,
    benefitRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 12,
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: theme.semantic.background.secondary,
      borderRadius: 12,
    } as ViewStyle,
    benefitIconContainer: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.primary[50],
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    } as ViewStyle,
    benefitTextContainer: {
      flex: 1,
    } as ViewStyle,
    benefitTitle: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.semantic.text.primary,
      marginBottom: 2,
    } as TextStyle,
    benefitDescription: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.semantic.text.secondary,
      lineHeight: 18,
    } as TextStyle,
    ctaSection: {
      alignItems: 'center',
    } as ViewStyle,
    upgradeButton: {
      width: '100%',
      paddingVertical: 4,
      borderRadius: 12,
      backgroundColor: theme.colors.primary[500],
      marginBottom: 16,
    } as ViewStyle,
    upgradeButtonLabel: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.semantic.text.inverse,
    } as TextStyle,
    loginLink: {
      paddingVertical: 8,
      marginBottom: 8,
    } as ViewStyle,
    loginText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.semantic.text.secondary,
    } as TextStyle,
    loginLinkText: {
      color: theme.colors.primary[500],
      fontWeight: theme.typography.fontWeight.semibold,
    } as TextStyle,
    dismissLink: {
      paddingVertical: 8,
    } as ViewStyle,
    dismissText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.semantic.text.tertiary,
    } as TextStyle,
  });

export default SearchLimitModal;
