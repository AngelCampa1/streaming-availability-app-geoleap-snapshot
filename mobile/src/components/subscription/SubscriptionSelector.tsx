import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import {
  POPULAR_SERVICES,
  SUBSCRIPTION_TIERS,
  AddSubscriptionRequest,
} from '../../types/streaming';
import { useTheme } from '../../theme/ThemeProvider';
import { logger } from '../../utils/logger';
import { Button } from '../common/Button';
import StreamingServiceIcon from './StreamingServiceIcon';

interface SubscriptionSelectorProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (request: AddSubscriptionRequest) => Promise<void>;
  existingServiceIds: string[];
}

/**
 * Modal for selecting and adding a new streaming service subscription
 */
export const SubscriptionSelector: React.FC<SubscriptionSelectorProps> = ({
  visible,
  onClose,
  onAdd,
  existingServiceIds,
}) => {
  const { theme } = useTheme();
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedTier, setSelectedTier] = useState<string | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [adding, setAdding] = useState(false);

  const handleReset = () => {
    setSelectedService(null);
    setSelectedTier(undefined);
    setNotes('');
    setAdding(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleAdd = async () => {
    if (!selectedService) {
      Alert.alert('Error', 'Please select a streaming service');
      return;
    }

    const service = POPULAR_SERVICES.find(s => s.id === selectedService);
    if (!service) {
      Alert.alert('Error', 'Invalid service selected');
      return;
    }

    const request: AddSubscriptionRequest = {
      serviceId: service.id,
      serviceName: service.name,
      subscriptionTier: selectedTier,
      notes: notes.trim() || undefined,
    };

    try {
      setAdding(true);
      await onAdd(request);
      Alert.alert('Success', `${service.name} has been added to your subscriptions`);
      handleClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to add subscription. Please try again.');
      logger.error('[SubscriptionSelector] Error adding subscription', error);
    } finally {
      setAdding(false);
    }
  };

  const availableServices = POPULAR_SERVICES.filter(
    service => !existingServiceIds.includes(service.id),
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.semantic.background.primary,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: theme.spacing[4],
      borderBottomWidth: 1,
      borderBottomColor: theme.semantic.border.primary,
    },
    title: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.semantic.text.primary,
    },
    closeButton: {
      padding: theme.spacing[2],
    },
    closeButtonText: {
      fontSize: theme.typography.fontSize['2xl'],
      color: theme.semantic.text.secondary,
    },
    content: {
      flex: 1,
      padding: theme.spacing[4],
    },
    section: {
      marginBottom: theme.spacing[6],
    },
    sectionTitle: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.semantic.text.primary,
      marginBottom: theme.spacing[3],
    },
    servicesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing[3],
    },
    serviceItem: {
      width: '30%',
      padding: theme.spacing[3],
      borderRadius: theme.borderRadius.xl,
      borderWidth: 2,
      borderColor: theme.semantic.border.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    serviceItemSelected: {
      borderColor: theme.colors.primary[500],
      backgroundColor: theme.colors.primary[50],
    },
    emptyText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.semantic.text.secondary,
      textAlign: 'center',
      padding: theme.spacing[5],
    },
    tiersContainer: {
      gap: theme.spacing[2],
    },
    tierItem: {
      padding: theme.spacing[3],
      borderRadius: theme.borderRadius.lg,
      borderWidth: 2,
      borderColor: theme.semantic.border.primary,
    },
    tierItemSelected: {
      borderColor: theme.colors.primary[500],
      backgroundColor: theme.colors.primary[50],
    },
    tierName: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.semantic.text.primary,
      marginBottom: theme.spacing[1],
    },
    tierNameSelected: {
      color: theme.colors.primary[600],
    },
    tierDescription: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.semantic.text.secondary,
    },
    tierDescriptionSelected: {
      color: theme.colors.primary[600],
    },
    notesInput: {
      borderWidth: 1,
      borderColor: theme.semantic.border.primary,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing[3],
      fontSize: theme.typography.fontSize.sm,
      color: theme.semantic.text.primary,
      backgroundColor: theme.semantic.background.secondary,
      minHeight: 80,
      textAlignVertical: 'top',
    },
    footer: {
      padding: theme.spacing[4],
      borderTopWidth: 1,
      borderTopColor: theme.semantic.border.primary,
    },
    addButton: {
      backgroundColor: theme.colors.primary[500],
    },
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Add Streaming Service</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Service Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Service</Text>
            <View style={styles.servicesGrid}>
              {availableServices.map(service => (
                <TouchableOpacity
                  key={service.id}
                  style={[
                    styles.serviceItem,
                    selectedService === service.id && styles.serviceItemSelected,
                  ]}
                  onPress={() => setSelectedService(service.id)}
                >
                  <StreamingServiceIcon serviceId={service.id} size="medium" showName />
                </TouchableOpacity>
              ))}
            </View>
            {availableServices.length === 0 && (
              <Text style={styles.emptyText}>
                You've already added all available streaming services!
              </Text>
            )}
          </View>

          {/* Tier Selection */}
          {selectedService && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Subscription Tier (Optional)</Text>
              <View style={styles.tiersContainer}>
                {SUBSCRIPTION_TIERS.map(tier => (
                  <TouchableOpacity
                    key={tier.id}
                    style={[
                      styles.tierItem,
                      selectedTier === tier.id && styles.tierItemSelected,
                    ]}
                    onPress={() => setSelectedTier(tier.id)}
                  >
                    <Text
                      style={[
                        styles.tierName,
                        selectedTier === tier.id && styles.tierNameSelected,
                      ]}
                    >
                      {tier.name}
                    </Text>
                    <Text
                      style={[
                        styles.tierDescription,
                        selectedTier === tier.id && styles.tierDescriptionSelected,
                      ]}
                    >
                      {tier.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Notes */}
          {selectedService && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notes (Optional)</Text>
              <TextInput
                style={styles.notesInput}
                placeholder="Add any notes about your subscription..."
                placeholderTextColor={theme.semantic.text.tertiary}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                maxLength={500}
              />
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title={adding ? 'Adding...' : 'Add Subscription'}
            onPress={handleAdd}
            disabled={!selectedService || adding}
            style={styles.addButton}
          />
        </View>
      </View>
    </Modal>
  );
};

export default SubscriptionSelector;
