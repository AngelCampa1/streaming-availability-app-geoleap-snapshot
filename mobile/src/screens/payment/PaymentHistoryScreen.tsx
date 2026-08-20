/**
 * Payment History Screen
 * Displays transaction history and invoices
 */

import React, { useState, useMemo, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, Appbar, Surface, Chip, Divider, Button, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeProvider';

type Props = NativeStackScreenProps<RootStackParamList, 'PaymentHistory'>;

interface PaymentTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  currency: string;
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  type: 'subscription' | 'upgrade' | 'renewal' | 'refund';
  invoiceUrl?: string;
}

// Mock data - replace with actual API call
const MOCK_TRANSACTIONS: PaymentTransaction[] = [
  {
    id: 'txn_001',
    date: '2024-12-01',
    description: 'Pro Plan - Monthly Subscription',
    amount: 9.99,
    currency: 'USD',
    status: 'completed',
    type: 'subscription',
    invoiceUrl: 'https://geoleap.app/invoices/001',
  },
  {
    id: 'txn_002',
    date: '2024-11-01',
    description: 'Pro Plan - Monthly Subscription',
    amount: 9.99,
    currency: 'USD',
    status: 'completed',
    type: 'renewal',
    invoiceUrl: 'https://geoleap.app/invoices/002',
  },
  {
    id: 'txn_003',
    date: '2024-10-15',
    description: 'Upgrade to Pro Plan',
    amount: 4.99,
    currency: 'USD',
    status: 'completed',
    type: 'upgrade',
  },
  {
    id: 'txn_004',
    date: '2024-10-01',
    description: 'Basic Plan - Monthly Subscription',
    amount: 4.99,
    currency: 'USD',
    status: 'completed',
    type: 'subscription',
  },
  {
    id: 'txn_005',
    date: '2024-09-01',
    description: 'Basic Plan - Monthly Subscription',
    amount: 4.99,
    currency: 'USD',
    status: 'refunded',
    type: 'refund',
  },
];

const getStatusColor = (status: PaymentTransaction['status'], theme: any) => {
  switch (status) {
    case 'completed':
      return theme.colors.success[500];
    case 'pending':
      return theme.colors.warning[500];
    case 'failed':
      return theme.colors.error[500];
    case 'refunded':
      return theme.colors.info[500];
    default:
      return theme.semantic.text.secondary;
  }
};

const getStatusIcon = (status: PaymentTransaction['status']) => {
  switch (status) {
    case 'completed':
      return 'check-circle';
    case 'pending':
      return 'schedule';
    case 'failed':
      return 'error';
    case 'refunded':
      return 'replay';
    default:
      return 'help';
  }
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const formatAmount = (amount: number, currency: string) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

export const PaymentHistoryScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [transactions, setTransactions] = useState<PaymentTransaction[]>(MOCK_TRANSACTIONS);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);

  const filteredTransactions = useMemo(() => {
    if (!selectedFilter) return transactions;
    return transactions.filter(t => t.status === selectedFilter);
  }, [transactions, selectedFilter]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    // TODO: Implement actual API refresh
    await new Promise<void>(resolve => setTimeout(() => resolve(), 1000));
    setTransactions(MOCK_TRANSACTIONS);
    setIsRefreshing(false);
  }, []);

  const handleViewInvoice = useCallback((transaction: PaymentTransaction) => {
    if (transaction.invoiceUrl) {
      navigation.navigate('WebView', {
        url: transaction.invoiceUrl,
        title: `Invoice ${transaction.id}`,
      });
    }
  }, [navigation]);

  const renderTransaction = useCallback(({ item }: { item: PaymentTransaction }) => (
    <Surface style={styles.transactionCard} elevation={1}>
      <View style={styles.transactionHeader}>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionDescription}>{item.description}</Text>
          <Text style={styles.transactionDate}>{formatDate(item.date)}</Text>
        </View>
        <View style={styles.transactionAmount}>
          <Text style={[
            styles.amountText,
            item.type === 'refund' && styles.refundAmount,
          ]}>
            {item.type === 'refund' ? '-' : ''}{formatAmount(item.amount, item.currency)}
          </Text>
        </View>
      </View>

      <Divider style={styles.divider} />

      <View style={styles.transactionFooter}>
        <View style={styles.statusContainer}>
          <Icon
            name={getStatusIcon(item.status)}
            size={16}
            color={getStatusColor(item.status, theme)}
          />
          <Text style={[styles.statusText, { color: getStatusColor(item.status, theme) }]}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>

        {item.invoiceUrl && (
          <Button
            mode="text"
            compact
            onPress={() => handleViewInvoice(item)}
            icon="receipt"
          >
            View Invoice
          </Button>
        )}
      </View>
    </Surface>
  ), [theme, styles, handleViewInvoice]);

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="receipt-long" size={64} color={theme.semantic.text.tertiary} />
      <Text style={styles.emptyTitle}>No Transactions</Text>
      <Text style={styles.emptyDescription}>
        Your payment history will appear here once you make a purchase.
      </Text>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.filterContainer}>
      <Chip
        selected={selectedFilter === null}
        onPress={() => setSelectedFilter(null)}
        style={styles.filterChip}
      >
        All
      </Chip>
      <Chip
        selected={selectedFilter === 'completed'}
        onPress={() => setSelectedFilter('completed')}
        style={styles.filterChip}
      >
        Completed
      </Chip>
      <Chip
        selected={selectedFilter === 'pending'}
        onPress={() => setSelectedFilter('pending')}
        style={styles.filterChip}
      >
        Pending
      </Chip>
      <Chip
        selected={selectedFilter === 'refunded'}
        onPress={() => setSelectedFilter('refunded')}
        style={styles.filterChip}
      >
        Refunded
      </Chip>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Appbar.Header style={styles.header}>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content title="Payment History" />
        </Appbar.Header>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Payment History" />
      </Appbar.Header>

      <FlatList
        data={filteredTransactions}
        renderItem={renderTransaction}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary[500]]}
          />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: theme.spacing[4],
    paddingBottom: theme.spacing[10],
  },
  filterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[2],
    marginBottom: theme.spacing[4],
  },
  filterChip: {
    marginRight: theme.spacing[1],
  },
  transactionCard: {
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.semantic.background.secondary,
    padding: theme.spacing[4],
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  transactionInfo: {
    flex: 1,
    marginRight: theme.spacing[3],
  },
  transactionDescription: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.semantic.text.primary,
    marginBottom: theme.spacing[1],
  },
  transactionDate: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.semantic.text.secondary,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.semantic.text.primary,
  },
  refundAmount: {
    color: theme.colors.error[500],
  },
  divider: {
    marginVertical: theme.spacing[3],
  },
  transactionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[1],
  },
  statusText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
  },
  separator: {
    height: theme.spacing[3],
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing[10],
  },
  emptyTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.semantic.text.primary,
    marginTop: theme.spacing[4],
    marginBottom: theme.spacing[2],
  },
  emptyDescription: {
    fontSize: theme.typography.fontSize.base,
    color: theme.semantic.text.secondary,
    textAlign: 'center',
    paddingHorizontal: theme.spacing[6],
  },
});

export default PaymentHistoryScreen;
