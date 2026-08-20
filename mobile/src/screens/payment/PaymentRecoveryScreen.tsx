/**
 * Payment Recovery Screen
 * Handles failed payment recovery flow (dunning)
 */

import React, { useState, useMemo, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Appbar, Surface, Button, List, Divider, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeProvider';

type Props = NativeStackScreenProps<RootStackParamList, 'PaymentRecovery'>;

interface FailedPayment {
  id: string;
  amount: number;
  currency: string;
  date: string;
  reason: string;
  retryCount: number;
  maxRetries: number;
}

export const PaymentRecoveryScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [isRetrying, setIsRetrying] = useState(false);
  const [gracePeriodDays, setGracePeriodDays] = useState(7);

  // Mock failed payment data
  const [failedPayment] = useState<FailedPayment>({
    id: 'pay_failed_123',
    amount: 2.99,
    currency: 'USD',
    date: new Date().toISOString(),
    reason: 'Card declined - insufficient funds',
    retryCount: 1,
    maxRetries: 3,
  });

  const handleRetryPayment = useCallback(async () => {
    setIsRetrying(true);
    try {
      // Simulate API call
      await new Promise<void>(resolve => setTimeout(() => resolve(), 2000));

      // Simulate success/failure
      const success = Math.random() > 0.3;
      if (success) {
        Alert.alert(
          'Payment Successful',
          'Your subscription has been renewed. Thank you!',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert(
          'Payment Failed',
          'The payment could not be processed. Please update your payment method or try again later.',
          [{ text: 'OK' }]
        );
      }
    } catch (_error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsRetrying(false);
    }
  }, [navigation]);

  const handleUpdatePaymentMethod = useCallback(() => {
    // Navigate to payment method update screen
    // For now, show alert
    Alert.alert(
      'Update Payment Method',
      'This would open the payment method management screen.',
      [{ text: 'OK' }]
    );
  }, []);

  const handleContactSupport = useCallback(() => {
    navigation.navigate('Support');
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Payment Recovery" />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Alert Banner */}
        <Surface style={styles.alertBanner} elevation={0}>
          <Icon name="warning" size={32} color={theme.colors.warning[500]} />
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>Payment Failed</Text>
            <Text style={styles.alertDescription}>
              Your recent payment could not be processed. Please take action to avoid service interruption.
            </Text>
          </View>
        </Surface>

        {/* Grace Period Warning */}
        <Surface style={styles.gracePeriodCard} elevation={1}>
          <View style={styles.gracePeriodHeader}>
            <Icon name="schedule" size={24} color={theme.colors.error[500]} />
            <Text style={styles.gracePeriodTitle}>Grace Period Active</Text>
          </View>
          <Text style={styles.gracePeriodText}>
            You have <Text style={styles.daysText}>{gracePeriodDays} days</Text> remaining before your account features are restricted.
          </Text>
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${((14 - gracePeriodDays) / 14) * 100}%` }]} />
          </View>
        </Surface>

        {/* Failed Payment Details */}
        <Surface style={styles.section} elevation={1}>
          <Text style={styles.sectionTitle}>Payment Details</Text>
          <Divider style={styles.divider} />

          <List.Item
            title="Amount"
            description={`$${failedPayment.amount.toFixed(2)} ${failedPayment.currency}`}
            left={() => <List.Icon icon="currency-usd" />}
          />
          <Divider />
          <List.Item
            title="Date"
            description={new Date(failedPayment.date).toLocaleDateString()}
            left={() => <List.Icon icon="calendar" />}
          />
          <Divider />
          <List.Item
            title="Reason"
            description={failedPayment.reason}
            left={() => <List.Icon icon="alert-circle" />}
            descriptionStyle={styles.errorText}
          />
          <Divider />
          <List.Item
            title="Retry Attempts"
            description={`${failedPayment.retryCount} of ${failedPayment.maxRetries}`}
            left={() => <List.Icon icon="refresh" />}
          />
        </Surface>

        {/* Recovery Options */}
        <Surface style={styles.section} elevation={1}>
          <Text style={styles.sectionTitle}>Recovery Options</Text>
          <Divider style={styles.divider} />

          <View style={styles.optionCard}>
            <View style={styles.optionHeader}>
              <Icon name="replay" size={24} color={theme.colors.primary[500]} />
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>Retry Payment</Text>
                <Text style={styles.optionDescription}>
                  Try processing the payment again with your current payment method
                </Text>
              </View>
            </View>
            <Button
              mode="contained"
              onPress={handleRetryPayment}
              loading={isRetrying}
              disabled={isRetrying}
              style={styles.optionButton}
            >
              {isRetrying ? 'Processing...' : 'Retry Now'}
            </Button>
          </View>

          <Divider style={styles.optionDivider} />

          <View style={styles.optionCard}>
            <View style={styles.optionHeader}>
              <Icon name="credit-card" size={24} color={theme.colors.info[500]} />
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>Update Payment Method</Text>
                <Text style={styles.optionDescription}>
                  Add a new card or update your existing payment details
                </Text>
              </View>
            </View>
            <Button
              mode="outlined"
              onPress={handleUpdatePaymentMethod}
              style={styles.optionButton}
            >
              Update Card
            </Button>
          </View>
        </Surface>

        {/* What Happens Next */}
        <Surface style={styles.section} elevation={1}>
          <Text style={styles.sectionTitle}>What Happens Next?</Text>
          <Divider style={styles.divider} />

          <View style={styles.timelineItem}>
            <View style={[styles.timelineDot, { backgroundColor: theme.colors.warning[500] }]} />
            <View style={styles.timelineContent}>
              <Text style={styles.timelineTitle}>Day 1-3</Text>
              <Text style={styles.timelineText}>
                We'll automatically retry your payment. Your service continues uninterrupted.
              </Text>
            </View>
          </View>

          <View style={styles.timelineItem}>
            <View style={[styles.timelineDot, { backgroundColor: theme.colors.warning[600] }]} />
            <View style={styles.timelineContent}>
              <Text style={styles.timelineTitle}>Day 4-7</Text>
              <Text style={styles.timelineText}>
                If payment still fails, you'll receive additional reminders. Premium features remain active.
              </Text>
            </View>
          </View>

          <View style={styles.timelineItem}>
            <View style={[styles.timelineDot, { backgroundColor: theme.colors.error[500] }]} />
            <View style={styles.timelineContent}>
              <Text style={styles.timelineTitle}>After Day 14</Text>
              <Text style={styles.timelineText}>
                Account reverts to free tier. Your data is preserved for 30 days.
              </Text>
            </View>
          </View>
        </Surface>

        {/* Help Section */}
        <Surface style={styles.helpSection} elevation={1}>
          <Icon name="help-outline" size={24} color={theme.colors.info[500]} />
          <View style={styles.helpContent}>
            <Text style={styles.helpTitle}>Need Help?</Text>
            <Text style={styles.helpText}>
              Contact our support team if you're experiencing issues with your payment.
            </Text>
          </View>
          <Button
            mode="text"
            onPress={handleContactSupport}
            compact
          >
            Contact Support
          </Button>
        </Surface>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.semantic.background.primary,
  },
  header: {
    backgroundColor: theme.semantic.background.primary,
  },
  content: {
    padding: theme.spacing[4],
    paddingBottom: theme.spacing[10],
    gap: theme.spacing[4],
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.warning[50],
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing[4],
    borderWidth: 1,
    borderColor: theme.colors.warning[200],
    gap: theme.spacing[3],
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.warning[900],
    marginBottom: theme.spacing[1],
  },
  alertDescription: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.warning[700],
    lineHeight: 22,
  },
  gracePeriodCard: {
    backgroundColor: theme.semantic.background.secondary,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing[4],
    borderWidth: 1,
    borderColor: theme.colors.error[200],
  },
  gracePeriodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
    marginBottom: theme.spacing[2],
  },
  gracePeriodTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.error[700],
  },
  gracePeriodText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.semantic.text.secondary,
    marginBottom: theme.spacing[3],
  },
  daysText: {
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.error[500],
  },
  progressContainer: {
    height: 6,
    backgroundColor: theme.colors.gray[200],
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: theme.colors.error[500],
    borderRadius: 3,
  },
  section: {
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.semantic.background.secondary,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.semantic.text.primary,
    padding: theme.spacing[4],
    paddingBottom: 0,
  },
  divider: {
    marginTop: theme.spacing[3],
  },
  errorText: {
    color: theme.colors.error[500],
  },
  optionCard: {
    padding: theme.spacing[4],
  },
  optionHeader: {
    flexDirection: 'row',
    gap: theme.spacing[3],
    marginBottom: theme.spacing[3],
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.semantic.text.primary,
    marginBottom: theme.spacing[1],
  },
  optionDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.semantic.text.secondary,
    lineHeight: 20,
  },
  optionButton: {
    borderRadius: theme.borderRadius.lg,
  },
  optionDivider: {
    marginHorizontal: theme.spacing[4],
  },
  timelineItem: {
    flexDirection: 'row',
    padding: theme.spacing[4],
    gap: theme.spacing[3],
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.semantic.text.primary,
    marginBottom: theme.spacing[1],
  },
  timelineText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.semantic.text.secondary,
    lineHeight: 20,
  },
  helpSection: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.info[50],
    padding: theme.spacing[4],
    gap: theme.spacing[3],
  },
  helpContent: {
    flex: 1,
  },
  helpTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.info[900],
    marginBottom: theme.spacing[1],
  },
  helpText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.info[700],
  },
});

export default PaymentRecoveryScreen;
