/**
 * Preferences Management Screen
 * Export and import user preferences
 */

import React, { useState, useMemo, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Appbar, Surface, Button, List, Divider, RadioButton, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeProvider';

type Props = NativeStackScreenProps<RootStackParamList, 'PreferencesManagement'>;

type ExportFormat = 'json' | 'backup';

interface PreferencesData {
  version: string;
  exportedAt: string;
  streamingServices: string[];
  genres: string[];
  regions: string[];
  contentTypes: string[];
  notificationSettings: Record<string, boolean>;
  watchlist: any[];
}

// Type workaround for expo-file-system
const FS = FileSystem as unknown as {
  cacheDirectory: string;
  writeAsStringAsync: (path: string, content: string, options?: { encoding: string }) => Promise<void>;
  readAsStringAsync: (path: string) => Promise<string>;
  EncodingType: { UTF8: string };
};

export const PreferencesManagementScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('json');
  const [lastExport, setLastExport] = useState<string | null>(null);
  const [lastImport, setLastImport] = useState<string | null>(null);

  // Mock preferences data
  const getPreferencesData = (): PreferencesData => ({
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    streamingServices: ['netflix', 'disney', 'hbo', 'prime'],
    genres: ['Action', 'Comedy', 'Drama', 'Sci-Fi'],
    regions: ['US', 'UK', 'CA'],
    contentTypes: ['movies', 'series', 'documentaries'],
    notificationSettings: {
      newContent: true,
      watchlistUpdates: true,
      promotions: false,
    },
    watchlist: [],
  });

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const preferences = getPreferencesData();
      const content = JSON.stringify(preferences, null, 2);

      const filename = `geoleap_preferences_${Date.now()}.${exportFormat}`;
      const filePath = `${FS.cacheDirectory}${filename}`;

      await FS.writeAsStringAsync(filePath, content, {
        encoding: FS.EncodingType.UTF8,
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'application/json',
          dialogTitle: 'Export Preferences',
        });
        setLastExport(new Date().toLocaleString());
      } else {
        Alert.alert('Export Complete', 'Preferences have been exported.');
      }
    } catch (_error) {
      Alert.alert('Export Failed', 'Failed to export preferences. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [exportFormat]);

  const handleImport = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      setIsImporting(true);

      const file = result.assets[0];
      const content = await FS.readAsStringAsync(file.uri);
      const preferences: PreferencesData = JSON.parse(content);

      // Validate preferences structure
      if (!preferences.version || !preferences.exportedAt) {
        throw new Error('Invalid preferences file');
      }

      Alert.alert(
        'Import Preferences',
        `Import preferences from ${new Date(preferences.exportedAt).toLocaleDateString()}?\n\nThis will replace your current settings.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Import',
            onPress: async () => {
              // TODO: Apply preferences via API
              await new Promise<void>(resolve => setTimeout(() => resolve(), 1000));
              setLastImport(new Date().toLocaleString());
              Alert.alert('Import Complete', 'Your preferences have been imported successfully.');
            },
          },
        ]
      );
    } catch (_error) {
      Alert.alert('Import Failed', 'Failed to import preferences. Make sure the file is valid.');
    } finally {
      setIsImporting(false);
    }
  }, []);

  const handleResetPreferences = useCallback(() => {
    Alert.alert(
      'Reset Preferences',
      'Are you sure you want to reset all preferences to defaults? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            // TODO: Reset preferences via API
            await new Promise<void>(resolve => setTimeout(() => resolve(), 500));
            Alert.alert('Preferences Reset', 'All preferences have been reset to defaults.');
          },
        },
      ]
    );
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Manage Preferences" />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Export Section */}
        <Surface style={styles.section} elevation={1}>
          <View style={styles.sectionHeader}>
            <Icon name="upload" size={24} color={theme.colors.primary[500]} />
            <View style={styles.sectionTitleContainer}>
              <Text style={styles.sectionTitle}>Export Preferences</Text>
              <Text style={styles.sectionDescription}>
                Save your settings to a file for backup or transfer
              </Text>
            </View>
          </View>

          <Divider style={styles.divider} />

          <Text style={styles.fieldLabel}>Export Format</Text>
          <RadioButton.Group
            onValueChange={(value) => setExportFormat(value as ExportFormat)}
            value={exportFormat}
          >
            <View style={styles.radioOption}>
              <RadioButton value="json" />
              <View style={styles.radioContent}>
                <Text style={styles.radioLabel}>JSON</Text>
                <Text style={styles.radioDescription}>Human-readable format</Text>
              </View>
            </View>
            <View style={styles.radioOption}>
              <RadioButton value="backup" />
              <View style={styles.radioContent}>
                <Text style={styles.radioLabel}>Backup File</Text>
                <Text style={styles.radioDescription}>Includes all data</Text>
              </View>
            </View>
          </RadioButton.Group>

          <Button
            mode="contained"
            onPress={handleExport}
            loading={isExporting}
            disabled={isExporting}
            icon="download"
            style={styles.actionButton}
          >
            Export Preferences
          </Button>

          {lastExport && (
            <Text style={styles.lastAction}>
              Last exported: {lastExport}
            </Text>
          )}
        </Surface>

        {/* Import Section */}
        <Surface style={styles.section} elevation={1}>
          <View style={styles.sectionHeader}>
            <Icon name="download" size={24} color={theme.colors.info[500]} />
            <View style={styles.sectionTitleContainer}>
              <Text style={styles.sectionTitle}>Import Preferences</Text>
              <Text style={styles.sectionDescription}>
                Restore settings from a previously exported file
              </Text>
            </View>
          </View>

          <Divider style={styles.divider} />

          <View style={styles.importInfo}>
            <Icon name="info-outline" size={16} color={theme.semantic.text.tertiary} />
            <Text style={styles.importInfoText}>
              Import will replace your current streaming services, genres, regions, and notification settings.
            </Text>
          </View>

          <Button
            mode="outlined"
            onPress={handleImport}
            loading={isImporting}
            disabled={isImporting}
            icon="folder-open"
            style={styles.actionButton}
          >
            Select File to Import
          </Button>

          {lastImport && (
            <Text style={styles.lastAction}>
              Last imported: {lastImport}
            </Text>
          )}
        </Surface>

        {/* What's Included */}
        <Surface style={styles.section} elevation={1}>
          <Text style={styles.includedTitle}>What's Included</Text>

          <List.Item
            title="Streaming Services"
            description="Your selected streaming platforms"
            left={() => <List.Icon icon="play-circle" />}
          />
          <Divider />
          <List.Item
            title="Genre Preferences"
            description="Favorite genres and content types"
            left={() => <List.Icon icon="category" />}
          />
          <Divider />
          <List.Item
            title="Region Settings"
            description="Primary and secondary regions"
            left={() => <List.Icon icon="public" />}
          />
          <Divider />
          <List.Item
            title="App Settings"
            description="Theme, notifications, and display options"
            left={() => <List.Icon icon="settings" />}
          />
        </Surface>

        {/* Reset Section */}
        <Surface style={styles.dangerSection} elevation={1}>
          <View style={styles.sectionHeader}>
            <Icon name="refresh" size={24} color={theme.colors.error[500]} />
            <View style={styles.sectionTitleContainer}>
              <Text style={[styles.sectionTitle, { color: theme.colors.error[500] }]}>
                Reset Preferences
              </Text>
              <Text style={styles.sectionDescription}>
                Reset all preferences to factory defaults
              </Text>
            </View>
          </View>

          <Button
            mode="outlined"
            onPress={handleResetPreferences}
            textColor={theme.colors.error[500]}
            style={[styles.actionButton, styles.dangerButton]}
          >
            Reset to Defaults
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
  section: {
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.semantic.background.secondary,
    padding: theme.spacing[4],
  },
  sectionHeader: {
    flexDirection: 'row',
    gap: theme.spacing[3],
  },
  sectionTitleContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.semantic.text.primary,
    marginBottom: theme.spacing[1],
  },
  sectionDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.semantic.text.secondary,
  },
  divider: {
    marginVertical: theme.spacing[4],
  },
  fieldLabel: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.semantic.text.secondary,
    marginBottom: theme.spacing[2],
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing[2],
  },
  radioContent: {
    marginLeft: theme.spacing[2],
  },
  radioLabel: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.semantic.text.primary,
  },
  radioDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.semantic.text.secondary,
  },
  actionButton: {
    marginTop: theme.spacing[4],
    borderRadius: theme.borderRadius.lg,
  },
  lastAction: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.semantic.text.tertiary,
    textAlign: 'center',
    marginTop: theme.spacing[2],
  },
  importInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing[2],
    backgroundColor: theme.colors.info[50],
    padding: theme.spacing[3],
    borderRadius: theme.borderRadius.md,
  },
  importInfoText: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.info[700],
    lineHeight: 20,
  },
  includedTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.semantic.text.primary,
    marginBottom: theme.spacing[2],
  },
  dangerSection: {
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.semantic.background.secondary,
    padding: theme.spacing[4],
    borderWidth: 1,
    borderColor: theme.colors.error[200],
  },
  dangerButton: {
    borderColor: theme.colors.error[500],
  },
});

export default PreferencesManagementScreen;
