/**
 * Subscription Plan Card Component
 * Displays a subscription tier option for purchase
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { SubscriptionPlan } from '../../types/subscription.types';

export interface SubscriptionPlanCardProps {
  plan: SubscriptionPlan;
  billingPeriod: 'monthly' | 'yearly';
  onSelect: (plan: SubscriptionPlan, period: 'monthly' | 'yearly') => void;
  isCurrentPlan: boolean;
  isLoading: boolean;
}

export const SubscriptionPlanCard: React.FC<SubscriptionPlanCardProps> = ({
  plan,
  billingPeriod,
  onSelect,
  isCurrentPlan,
  isLoading,
}) => {
  const { theme } = useTheme();

  const price = billingPeriod === 'monthly' ? plan.pricing.monthly : plan.pricing.yearly;
  const priceDisplay = price === 0 ? 'Free' : `$${(price / 100).toFixed(2)}`;
  const periodDisplay = billingPeriod === 'monthly' ? '/month' : '/year';

  const styles = StyleSheet.create({
    card: {
      backgroundColor: theme.semantic.background.secondary,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing[4],
      marginBottom: theme.spacing[3],
      borderWidth: isCurrentPlan ? 2 : 1,
      borderColor: isCurrentPlan ? theme.colors.primary[500] : theme.semantic.border.primary,
    },
    popular: {
      borderColor: theme.colors.primary[500],
      borderWidth: 2,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing[3],
    },
    planName: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.semantic.text.primary,
    },
    badge: {
      paddingHorizontal: theme.spacing[2],
      paddingVertical: theme.spacing[1],
      borderRadius: theme.borderRadius.sm,
      backgroundColor: theme.colors.primary[100],
    },
    badgeText: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.primary[600],
    },
    priceContainer: {
      flexDirection: 'row',
      alignItems: 'baseline',
      marginBottom: theme.spacing[3],
    },
    price: {
      fontSize: theme.typography.fontSize['3xl'],
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.semantic.text.primary,
    },
    period: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.semantic.text.secondary,
      marginLeft: theme.spacing[1],
    },
    description: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.semantic.text.secondary,
      marginBottom: theme.spacing[3],
      lineHeight: theme.typography.fontSize.sm * 1.5,
    },
    features: {
      marginBottom: theme.spacing[4],
    },
    feature: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing[2],
    },
    featureIcon: {
      fontSize: theme.typography.fontSize.base,
      marginRight: theme.spacing[2],
      color: theme.colors.success[500],
    },
    featureText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.semantic.text.primary,
      flex: 1,
    },
    button: {
      backgroundColor: isCurrentPlan ? theme.semantic.background.secondary : theme.colors.primary[500],
      borderRadius: theme.borderRadius.lg,
      paddingVertical: theme.spacing[3],
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: isCurrentPlan ? theme.semantic.text.secondary : theme.semantic.text.inverse,
    },
  });

  return (
    <View style={[styles.card, plan.popular && styles.popular]}>
      <View style={styles.header}>
        <Text style={styles.planName}>{plan.displayName}</Text>
        {plan.popular && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Popular</Text>
          </View>
        )}
        {isCurrentPlan && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Current Plan</Text>
          </View>
        )}
      </View>

      <View style={styles.priceContainer}>
        <Text style={styles.price}>{priceDisplay}</Text>
        {price > 0 && <Text style={styles.period}>{periodDisplay}</Text>}
      </View>

      <Text style={styles.description}>{plan.description}</Text>

      <View style={styles.features}>
        {plan.features.slice(0, 5).map((feature, index) => (
          <View key={index} style={styles.feature}>
            <Text style={styles.featureIcon}>✓</Text>
            <Text style={styles.featureText}>{feature.name}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.button, (isCurrentPlan || isLoading) && styles.buttonDisabled]}
        onPress={() => onSelect(plan, billingPeriod)}
        disabled={isCurrentPlan || isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color={theme.semantic.text.inverse} />
        ) : (
          <Text style={styles.buttonText}>
            {isCurrentPlan ? 'Current Plan' : plan.tier === 'free' ? 'Get Started' : 'Subscribe'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

export default SubscriptionPlanCard;
