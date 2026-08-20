import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeProvider';
import { useSubscriptions } from '../../hooks/useSubscriptions';
import { UserStreamingSubscription, UpdateSubscriptionRequest } from '../../types/streaming';
import SubscriptionCard from '../../components/subscription/SubscriptionCard';
import SubscriptionSelector from '../../components/subscription/SubscriptionSelector';

/**
 * Screen for managing user's streaming service subscriptions
 * Allows adding, editing, and removing subscriptions
 */
export const SubscriptionManagementScreen: React.FC = () => {
  const { theme } = useTheme();
  const _navigation = useNavigation();
  const {
    subscriptions,
    loading,
    error,
    addSubscription,
    updateSubscription,
    removeSubscription,
    getServiceIds,
    refetch,
    clearError,
  } = useSubscriptions();

  const [selectorVisible, setSelectorVisible] = useState(false);
  const [_editingSubscription, _setEditingSubscription] = useState<UserStreamingSubscription | null>(null);

  const handleAddSubscription = async (request: any) => {
    const result = await addSubscription(request);
    if (result) {
      setSelectorVisible(false);
    }
  };

  const handleEditSubscription = (subscription: UserStreamingSubscription) => {
    Alert.alert(
      'Edit Subscription',
      'What would you like to update?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Change Tier',
          onPress: () => showTierSelection(subscription),
        },
        {
          text: 'Add/Edit Notes',
          onPress: () => showNotesInput(subscription),
        },
      ],
    );
  };

  const showTierSelection = (subscription: UserStreamingSubscription) => {
    // In a real app, this would show a tier selection modal
    // For now, we'll use a simple alert
    Alert.prompt(
      'Update Tier',
      'Enter new subscription tier (basic, standard, premium):',
      async (tier) => {
        if (tier) {
          const request: UpdateSubscriptionRequest = {
            subscriptionTier: tier.toLowerCase(),
          };
          const result = await updateSubscription(subscription.serviceId, request);
          if (result) {
            Alert.alert('Success', 'Subscription tier updated successfully');
          }
        }
      },
    );
  };

  const showNotesInput = (subscription: UserStreamingSubscription) => {
    Alert.prompt(
      'Update Notes',
      'Enter notes for this subscription:',
      async (notes) => {
        if (notes !== undefined) {
          const request: UpdateSubscriptionRequest = {
            notes: notes.trim() || undefined,
          };
          const result = await updateSubscription(subscription.serviceId, request);
          if (result) {
            Alert.alert('Success', 'Subscription notes updated successfully');
          }
        }
      },
      'plain-text',
      subscription.notes || '',
    );
  };

  const handleRemoveSubscription = async (serviceId: string) => {
    const success = await removeSubscription(serviceId);
    if (success) {
      Alert.alert('Success', 'Subscription removed successfully');
    }
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📺</Text>
      <Text style={styles.emptyTitle}>No Subscriptions Yet</Text>
      <Text style={styles.emptyDescription}>
        Add your streaming service subscriptions to see which content is available on your services
        across different VPN regions.
      </Text>
      <TouchableOpacity
        style={styles.addFirstButton}
        onPress={() => setSelectorVisible(true)}
      >
        <Text style={styles.addFirstButtonText}>Add Your First Service</Text>
      </TouchableOpacity>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <Text style={styles.headerTitle}>My Subscriptions</Text>
      <Text style={styles.headerSubtitle}>
        Manage your streaming service subscriptions to see personalized VPN recommendations
      </Text>
      {subscriptions.length > 0 && (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setSelectorVisible(true)}
        >
          <Text style={styles.addButtonText}>+ Add Service</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.semantic.background.primary,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.semantic.background.primary,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 14,
      color: theme.semantic.text.secondary,
    },
    listContent: {
      padding: 16,
      paddingBottom: 32,
    },
    headerContainer: {
      marginBottom: 24,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: theme.semantic.text.primary,
      marginBottom: 8,
    },
    headerSubtitle: {
      fontSize: 14,
      color: theme.semantic.text.secondary,
      lineHeight: 20,
      marginBottom: 16,
    },
    addButton: {
      backgroundColor: theme.colors.primary[500],
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
    },
    addButtonText: {
      color: theme.semantic.text.inverse,
      fontSize: 16,
      fontWeight: '600',
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
      paddingHorizontal: 32,
    },
    emptyIcon: {
      fontSize: 64,
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.semantic.text.primary,
      marginBottom: 8,
      textAlign: 'center',
    },
    emptyDescription: {
      fontSize: 14,
      color: theme.semantic.text.secondary,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 24,
    },
    addFirstButton: {
      backgroundColor: theme.colors.primary[500],
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
    },
    addFirstButtonText: {
      color: theme.semantic.text.inverse,
      fontSize: 16,
      fontWeight: '600',
    },
    errorContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: theme.colors.error[500],
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    errorText: {
      flex: 1,
      color: theme.semantic.text.inverse,
      fontSize: 14,
      marginRight: 12,
    },
    errorDismiss: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: theme.colors.overlay.light,
      borderRadius: 4,
    },
    errorDismissText: {
      color: theme.semantic.text.inverse,
      fontSize: 14,
      fontWeight: '600',
    },
  }), [theme]);

  if (loading && subscriptions.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary[500]} />
        <Text style={styles.loadingText}>Loading subscriptions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={subscriptions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <SubscriptionCard
            subscription={item}
            onEdit={handleEditSubscription}
            onRemove={handleRemoveSubscription}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refetch}
            tintColor={theme.colors.primary[500]}
          />
        }
      />

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={clearError} style={styles.errorDismiss}>
            <Text style={styles.errorDismissText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}

      <SubscriptionSelector
        visible={selectorVisible}
        onClose={() => setSelectorVisible(false)}
        onAdd={handleAddSubscription}
        existingServiceIds={getServiceIds()}
      />
    </View>
  );
};

export default SubscriptionManagementScreen;
