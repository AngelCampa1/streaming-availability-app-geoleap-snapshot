/**
 * Subscription Plans Screen
 * Displays all available subscription tiers with pricing
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Linking } from 'react-native';
import { Text, Appbar, SegmentedButtons, Button, Banner, Surface, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { RootStackParamList } from '../../navigation/types';
import { SubscriptionPlanCard } from '../../components/subscription/SubscriptionPlanCard';
import { SUBSCRIPTION_PLANS, SubscriptionPlan } from '../../types/subscription.types';
import { useSubscription } from '../../hooks/useSubscription';
import { Platform } from 'react-native';
import { spacing, borderRadius, typography } from '../../tokens/designTokens';
import { useTheme } from '../../theme/ThemeProvider';

// Web subscription URL - redirects to web app for subscription management
const WEB_SUBSCRIPTION_URL = 'https://geoleap.app/subscription';

type Props = NativeStackScreenProps<RootStackParamList, 'SubscriptionPlans'>;

export const SubscriptionPlansScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const { subscription, purchaseSubscription, restorePurchases, isLoading } = useSubscription();

  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('yearly');
  const [purchasingPlanId, setPurchasingPlanId] = useState<string | null>(null);

  const handleSelectPlan = async (plan: SubscriptionPlan, period: 'monthly' | 'yearly') => {
    if (plan.tier === 'free') {
      // Free plan - just navigate
      navigation.goBack();
      return;
    }

    try {
      setPurchasingPlanId(plan.id);

      // Get product ID for platform and period
      const productId = Platform.OS === 'ios'
        ? period === 'monthly'
          ? plan.iapProductIds.ios.monthly
          : plan.iapProductIds.ios.yearly
        : period === 'monthly'
        ? plan.iapProductIds.android.monthly
        : plan.iapProductIds.android.yearly;

      await purchaseSubscription(productId, plan.tier);

      // Success - navigate to subscription management
      Alert.alert(
        'Subscription Activated!',
        `You are now subscribed to ${plan.displayName}. Enjoy your premium features!`,
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('SubscriptionManagement'),
          },
        ],
      );
    } catch (error) {
      Alert.alert('Purchase Failed', 'Unable to complete your purchase. Please try again.');
    } finally {
      setPurchasingPlanId(null);
    }
  };

  const handleRestorePurchases = async () => {
    try {
      await restorePurchases();
      Alert.alert('Restore Complete', 'Your purchases have been restored.');
    } catch (_error) {
      Alert.alert('Restore Failed', 'Unable to restore purchases. Please try again.');
    }
  };

  const handleSubscribeOnWeb = async () => {
    try {
      const supported = await Linking.canOpenURL(WEB_SUBSCRIPTION_URL);
      if (supported) {
        await Linking.openURL(WEB_SUBSCRIPTION_URL);
      } else {
        Alert.alert(
          'Cannot Open Browser',
          'Unable to open the subscription page. Please visit geoleap.app/subscription in your browser.',
          [{ text: 'OK' }]
        );
      }
    } catch (_error) {
      Alert.alert(
        'Error',
        'Failed to open the subscription page. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.semantic.background.primary }]} edges={['top']}>
      {/* Header */}
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Choose Your Plan" />
      </Appbar.Header>

      {/* Current Subscription Banner */}
      {subscription && subscription.status === 'active' && (
        <Banner
          visible={true}
          actions={[
            {
              label: 'Manage',
              onPress: () => navigation.navigate('SubscriptionManagement'),
            },
          ]}
          icon="check-circle"
        >
          You are currently on the {subscription.plan.displayName}
        </Banner>
      )}

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Text */}
        <View style={styles.header}>
          <Text variant="headlineMedium" style={[styles.title, { color: theme.semantic.text.primary }]}>
            Unlock Premium Features
          </Text>
          <Text variant="bodyLarge" style={[styles.subtitle, { color: theme.semantic.text.secondary }]}>
            Choose the plan that's right for you. All plans include a 7-day free trial.
          </Text>
        </View>

        {/* Billing Period Toggle */}
        <SegmentedButtons
          value={billingPeriod}
          onValueChange={(value) => setBillingPeriod(value as 'monthly' | 'yearly')}
          buttons={[
            {
              value: 'monthly',
              label: 'Monthly',
              icon: 'calendar-month',
            },
            {
              value: 'yearly',
              label: 'Yearly',
              icon: 'calendar-today',
            },
          ]}
          style={styles.billingToggle}
        />

        {/* Savings Banner */}
        {billingPeriod === 'yearly' && (
          <View style={[styles.savingsBanner, { backgroundColor: theme.colors.primary[50] }]}>
            <Text style={[styles.savingsText, { color: theme.colors.primary[700] }]}>
              💰 Save up to 50% with yearly plans!
            </Text>
          </View>
        )}

        {/* Subscription Plans */}
        {SUBSCRIPTION_PLANS.map(plan => (
          <SubscriptionPlanCard
            key={plan.id}
            plan={plan}
            billingPeriod={billingPeriod}
            onSelect={handleSelectPlan}
            isCurrentPlan={subscription?.tier === plan.tier}
            isLoading={isLoading && purchasingPlanId === plan.id}
          />
        ))}

        {/* Web Subscription Option */}
        <Surface style={styles.webSubscriptionCard} elevation={1}>
          <View style={styles.webSubscriptionHeader}>
            <Icon name="language" size={24} color={theme.colors.primary[500]} />
            <Text variant="titleMedium" style={[styles.webSubscriptionTitle, { color: theme.semantic.text.primary }]}>
              Prefer to subscribe on the web?
            </Text>
          </View>
          <Text variant="bodyMedium" style={[styles.webSubscriptionDescription, { color: theme.semantic.text.secondary }]}>
            Subscribe through our website for more payment options including credit cards, PayPal, and regional payment methods.
          </Text>
          <Button
            mode="outlined"
            onPress={handleSubscribeOnWeb}
            icon="open-in-new"
            style={styles.webSubscriptionButton}
          >
            Subscribe on Web
          </Button>
        </Surface>

        <Divider style={styles.divider} />

        {/* Fine Print */}
        <View style={styles.finePrint}>
          <Text variant="bodySmall" style={[styles.finePrintText, { color: theme.semantic.text.secondary }]}>
            All subscriptions automatically renew unless canceled at least 24 hours before the end of the current period.
            You can manage your subscription in your App Store or Play Store settings.
          </Text>

          {/* Restore Purchases */}
          <Button
            mode="text"
            onPress={handleRestorePurchases}
            style={styles.restoreButton}
          >
            Restore Purchases
          </Button>

          {/* Links */}
          <View style={styles.links}>
            <Button mode="text" compact onPress={() => navigation.navigate('TermsOfService')}>
              Terms of Service
            </Button>
            <Text style={[styles.linkSeparator, { color: theme.semantic.text.secondary }]}>•</Text>
            <Button mode="text" compact onPress={() => navigation.navigate('PrivacyPolicy')}>
              Privacy Policy
            </Button>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: spacing.sm,
  },
  subtitle: {
    lineHeight: typography.body1.lineHeight,
  },
  billingToggle: {
    marginBottom: spacing.md,
  },
  savingsBanner: {
    padding: spacing.sm + spacing.xs,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  savingsText: {
    fontSize: typography.body1.fontSize,
    fontWeight: typography.h6.fontWeight,
  },
  webSubscriptionCard: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  webSubscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  webSubscriptionTitle: {
    fontWeight: '600',
  },
  webSubscriptionDescription: {
    marginBottom: spacing.md,
    lineHeight: typography.body2.lineHeight,
  },
  webSubscriptionButton: {
    alignSelf: 'flex-start',
  },
  divider: {
    marginVertical: spacing.lg,
  },
  finePrint: {
    alignItems: 'center',
    gap: spacing.md,
  },
  finePrintText: {
    textAlign: 'center',
    lineHeight: typography.body2.lineHeight,
  },
  restoreButton: {
    marginTop: spacing.sm,
  },
  links: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  linkSeparator: {},
});
