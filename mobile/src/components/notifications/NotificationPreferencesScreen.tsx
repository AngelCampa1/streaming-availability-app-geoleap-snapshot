import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';

import {
  Card,
  Title,
  List,
  Text,
  Portal,
  Modal,
  TextInput,
  Button,
  Switch,
  Divider,
} from 'react-native-paper';
import { useTheme as useCustomTheme } from '../../theme/ThemeProvider';
import DateTimePicker from '@react-native-community/datetimepicker';
import NotificationService, { NotificationPreferences } from '../../services/notificationService';
import { logger } from '../../utils/logger';

// Extracted components to avoid nested component definitions

interface QuietHoursModalProps {
  visible: boolean;
  onDismiss: () => void;
  quietHours: { start: string; end: string };
  onSave: (quietHours: { start: string; end: string }) => void;
}

const QuietHoursModal: React.FC<QuietHoursModalProps> = ({
  visible,
  onDismiss,
  quietHours,
  onSave,
}) => {
  const { theme } = useCustomTheme();
  const [tempQuietHours, setTempQuietHours] = useState(quietHours);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  const modalStyles = StyleSheet.create({
    modalContainer: {
      margin: theme.spacing[5],
    },
    timePickerContainer: {
      marginVertical: theme.spacing[4],
    },
    timePickerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginVertical: theme.spacing[2],
    },
    timeLabel: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: '500',
      color: theme.semantic.text.primary,
    },
    timeButton: {
      minWidth: 100,
    },
  });

  const formatTimeString = (timeString: string): string => timeString;

  const parseTimeString = (timeString: string): Date => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const formatTimeFromDate = (date: Date): string => {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const onStartTimeChange = (_event: unknown, selectedDate?: Date) => {
    setShowStartTimePicker(false);
    if (selectedDate) {
      setTempQuietHours({
        ...tempQuietHours,
        start: formatTimeFromDate(selectedDate),
      });
    }
  };

  const onEndTimeChange = (_event: unknown, selectedDate?: Date) => {
    setShowEndTimePicker(false);
    if (selectedDate) {
      setTempQuietHours({
        ...tempQuietHours,
        end: formatTimeFromDate(selectedDate),
      });
    }
  };

  const handleSave = () => {
    onSave(tempQuietHours);
    onDismiss();
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={modalStyles.modalContainer}
      >
        <Card>
          <Card.Content>
            <Title>Set Quiet Hours</Title>

            <View  style={modalStyles.timePickerContainer}>
              <View  style={modalStyles.timePickerRow}>
                <Text  style={modalStyles.timeLabel}>Start Time:</Text>
                <Button
                  mode="outlined"
                  onPress={() => setShowStartTimePicker(true)}
                   style={modalStyles.timeButton}
                >
                  {formatTimeString(tempQuietHours.start)}
                </Button>
              </View>

              <View  style={modalStyles.timePickerRow}>
                <Text  style={modalStyles.timeLabel}>End Time:</Text>
                <Button
                  mode="outlined"
                  onPress={() => setShowEndTimePicker(true)}
                   style={modalStyles.timeButton}
                >
                  {formatTimeString(tempQuietHours.end)}
                </Button>
              </View>
            </View>

            {showStartTimePicker && (
              <DateTimePicker
                value={parseTimeString(tempQuietHours.start)}
                mode="time"
                is24Hour={true}
                onChange={onStartTimeChange}
              />
            )}

            {showEndTimePicker && (
              <DateTimePicker
                value={parseTimeString(tempQuietHours.end)}
                mode="time"
                is24Hour={true}
                onChange={onEndTimeChange}
              />
            )}
          </Card.Content>

          <Card.Actions>
            <Button onPress={onDismiss}>Cancel</Button>
            <Button mode="contained" onPress={handleSave}>Save</Button>
          </Card.Actions>
        </Card>
      </Modal>
    </Portal>
  );
};

interface FrequencyModalProps {
  visible: boolean;
  onDismiss: () => void;
  maxPerHour: number;
  onSave: (maxPerHour: number) => void;
}

const FrequencyModal: React.FC<FrequencyModalProps> = ({
  visible,
  onDismiss,
  maxPerHour,
  onSave,
}) => {
  const { theme } = useCustomTheme();
  const [tempMaxPerHour, setTempMaxPerHour] = useState(maxPerHour);

  const modalStyles = StyleSheet.create({
    modalContainer: {
      margin: theme.spacing[5],
    },
    numberInput: {
      marginVertical: theme.spacing[2],
    },
    helperText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.semantic.text.secondary,
      marginTop: theme.spacing[2],
    },
  });

  const handleSave = () => {
    onSave(tempMaxPerHour);
    onDismiss();
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={modalStyles.modalContainer}
      >
        <Card>
          <Card.Content>
            <Title>Maximum Notifications per Hour</Title>

            <TextInput
              label="Max notifications"
              value={tempMaxPerHour.toString()}
              onChangeText={(text) => setTempMaxPerHour(Math.max(1, Math.min(50, parseInt(text, 10) || 1)))}
              keyboardType="numeric"
               style={modalStyles.numberInput}
            />

            <Text  style={modalStyles.helperText}>
              Set the maximum number of notifications you want to receive per hour (1-50)
            </Text>
          </Card.Content>

          <Card.Actions>
            <Button onPress={onDismiss}>Cancel</Button>
            <Button mode="contained" onPress={handleSave}>Save</Button>
          </Card.Actions>
        </Card>
      </Modal>
    </Portal>
  );
};

export const NotificationPreferencesScreen: React.FC = () => {
  const { theme } = useCustomTheme();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQuietHoursModal, setShowQuietHoursModal] = useState(false);
  const [showFrequencyModal, setShowFrequencyModal] = useState(false);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.semantic.background.secondary,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    card: {
      margin: theme.spacing[4],
      marginBottom: theme.spacing[2],
    },
    modalContainer: {
      margin: theme.spacing[5],
    },
    timePickerContainer: {
      marginVertical: theme.spacing[4],
    },
    timePickerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginVertical: theme.spacing[2],
    },
    timeLabel: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: '500',
    },
    timeButton: {
      minWidth: 100,
    },
    numberInput: {
      marginVertical: theme.spacing[2],
    },
    helperText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.semantic.text.secondary,
      marginTop: theme.spacing[2],
    },
  });

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const prefs = await NotificationService.getPreferences();
      setPreferences(prefs);
    } catch (error) {
      logger.error('[NotificationPreferencesScreen] Failed to load preferences', error);
      Alert.alert('Error', 'Failed to load notification preferences');
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = useCallback(async (newPreferences: NotificationPreferences) => {
    try {
      await NotificationService.savePreferences(newPreferences);
      setPreferences(newPreferences);
    } catch (error) {
      logger.error('[NotificationPreferencesScreen] Failed to save preferences', error);
      Alert.alert('Error', 'Failed to save notification preferences');
    }
  }, []);

  const updatePreference = useCallback((key: keyof NotificationPreferences,
 value: unknown) => {
    if (!preferences) {return;}

    const updated = { ...preferences, [key]: value };
    setPreferences(updated);
    savePreferences(updated);
  }, [preferences, savePreferences]);

  const updateCategoryPreference = useCallback((category: string, enabled: boolean) => {
    if (!preferences) {return;}

    const updated = {
      ...preferences,
      categories: {
        ...preferences.categories,
        [category]: enabled,
      },
    };
    setPreferences(updated);
    savePreferences(updated);
  }, [preferences, savePreferences]);

  const formatTimeString = (timeString: string): string => {
    return timeString;
  };

  const categoryItems = [
    { key: 'default', title: 'General Notifications', description: 'Basic app notifications' },
    { key: 'security', title: 'Security Alerts', description: 'Important security updates' },
    { key: 'promotional', title: 'Promotions', description: 'Special offers and promotions' },
    { key: 'updates', title: 'App Updates', description: 'New features and improvements' },
  ];

  if (loading || !preferences) {
    return (
      <View  style={styles.loadingContainer}>
        <Text>Loading preferences...</Text>
      </View>
    );
  }

  return (
    <ScrollView  style={styles.container}>
      {/* Main Settings */}
      <Card  style={styles.card}>
        <Card.Content>
          <Title>Notification Settings</Title>

          <List.Item
            title="Enable Notifications"
            description="Receive all notifications"
            left={(props) => <List.Icon {...props} icon="notifications" />}
            right={() => (
              <Switch
                value={preferences.enabled}
                onValueChange={(value) => updatePreference('enabled', value)}
              />
            )}
          />

          <Divider />

          <List.Item
            title="Show Previews"
            description="Show notification content on lock screen"
            left={(props) => <List.Icon {...props} icon="preview" />}
            right={() => (
              <Switch
                value={preferences.showPreviews}
                onValueChange={(value) => updatePreference('showPreviews', value)}
              />
            )}
            disabled={!preferences.enabled}
          />
        </Card.Content>
      </Card>

      {/* Sound & Vibration */}
      <Card  style={styles.card}>
        <Card.Content>
          <Title>Sound & Vibration</Title>

          <List.Item
            title="Sound"
            description="Play notification sounds"
            left={(props) => <List.Icon {...props} icon="volume-up" />}
            right={() => (
              <Switch
                value={preferences.sounds.enabled}
                onValueChange={(value) =>
                  updatePreference('sounds', { ...preferences.sounds, enabled: value })
                }
              />
            )}
            disabled={!preferences.enabled}
          />

          <List.Item
            title="Vibration"
            description="Vibrate for notifications"
            left={(props) => <List.Icon {...props} icon="vibration" />}
            right={() => (
              <Switch
                value={preferences.vibration}
                onValueChange={(value) => updatePreference('vibration', value)}
              />
            )}
            disabled={!preferences.enabled}
          />
        </Card.Content>
      </Card>

      {/* Categories */}
      <Card  style={styles.card}>
        <Card.Content>
          <Title>Notification Categories</Title>

          {categoryItems.map((item) => (
            <React.Fragment key={item.key}>
              <List.Item
                title={item.title}
                description={item.description}
                right={() => (
                  <Switch
                    value={preferences.categories[item.key] !== false}
                    onValueChange={(value) => updateCategoryPreference(item.key, value)}
                  />
                )}
                disabled={!preferences.enabled}
              />
              {item.key !== categoryItems[categoryItems.length - 1].key && <Divider />}
            </React.Fragment>
          ))}
        </Card.Content>
      </Card>

      {/* Quiet Hours */}
      <Card  style={styles.card}>
        <Card.Content>
          <Title>Quiet Hours</Title>

          <List.Item
            title="Enable Quiet Hours"
            description="Disable notifications during specified hours"
            left={(props) => <List.Icon {...props} icon="do-not-disturb" />}
            right={() => (
              <Switch
                value={preferences.quietHours.enabled}
                onValueChange={(value) =>
                  updatePreference('quietHours', { ...preferences.quietHours, enabled: value })
                }
              />
            )}
            disabled={!preferences.enabled}
          />

          {preferences.quietHours.enabled && (
            <List.Item
              title="Set Hours"
              description={`${formatTimeString(preferences.quietHours.start)} - ${formatTimeString(preferences.quietHours.end)}`}
              left={(props) => <List.Icon {...props} icon="schedule" />}
              onPress={() => setShowQuietHoursModal(true)}
              disabled={!preferences.enabled}
            />
          )}
        </Card.Content>
      </Card>

      {/* Frequency Control */}
      <Card  style={styles.card}>
        <Card.Content>
          <Title>Frequency Control</Title>

          <List.Item
            title="Batch Similar Notifications"
            description="Group similar notifications together"
            left={(props) => <List.Icon {...props} icon="group-work" />}
            right={() => (
              <Switch
                value={preferences.frequency.batchingSimilar}
                onValueChange={(value) =>
                  updatePreference('frequency', { ...preferences.frequency, batchingSimilar: value })
                }
              />
            )}
            disabled={!preferences.enabled}
          />

          <List.Item
            title="Maximum per Hour"
            description={`Up to ${preferences.frequency.maxPerHour} notifications per hour`}
            left={(props) => <List.Icon {...props} icon="speed" />}
            onPress={() => setShowFrequencyModal(true)}
            disabled={!preferences.enabled}
          />
        </Card.Content>
      </Card>

      {/* Quiet Hours Modal */}
      <QuietHoursModal
        visible={showQuietHoursModal}
        onDismiss={() => setShowQuietHoursModal(false)}
        quietHours={preferences.quietHours}
        onSave={(quietHours) => {
          const updated = {
            ...preferences,
            quietHours: {
              ...preferences.quietHours,
              ...quietHours,
            },
          };
          setPreferences(updated);
          savePreferences(updated);
        }}
      />

      {/* Frequency Modal */}
      <FrequencyModal
        visible={showFrequencyModal}
        onDismiss={() => setShowFrequencyModal(false)}
        maxPerHour={preferences.frequency.maxPerHour}
        onSave={(maxPerHour) => {
          const updated = {
            ...preferences,
            frequency: {
              ...preferences.frequency,
              maxPerHour,
            },
          };
          setPreferences(updated);
          savePreferences(updated);
        }}
      />
    </ScrollView>
  );
};

// Note: styles moved inside component to access theme properly

export default NotificationPreferencesScreen;
