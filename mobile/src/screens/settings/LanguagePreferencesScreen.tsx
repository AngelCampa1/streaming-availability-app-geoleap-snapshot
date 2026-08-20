/**
 * Language Preferences Screen
 * Allows users to select their preferred audio and subtitle languages
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  Text,
  Surface,
  Button,
  ActivityIndicator,
  Divider,
  Chip,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../theme/ThemeProvider';
import { useLanguagePreferences } from '../../hooks/useLanguagePreferences';
import { SUPPORTED_LANGUAGES, Language } from '../../types/language.types';

export default function LanguagePreferencesScreen() {
  const { theme } = useTheme();
  const { preferences, isLoading, error, updatePreferences } = useLanguagePreferences();

  const [selectedAudio, setSelectedAudio] = useState<string[]>([]);
  const [selectedSubtitles, setSelectedSubtitles] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize selections from preferences
  useEffect(() => {
    if (preferences) {
      setSelectedAudio(preferences.audioLanguages || []);
      setSelectedSubtitles(preferences.subtitleLanguages || []);
    }
  }, [preferences]);

  // Check for changes
  useEffect(() => {
    if (!preferences) {return;}

    const audioChanged =
      JSON.stringify(selectedAudio.sort()) !==
      JSON.stringify((preferences.audioLanguages || []).sort());
    const subtitlesChanged =
      JSON.stringify(selectedSubtitles.sort()) !==
      JSON.stringify((preferences.subtitleLanguages || []).sort());

    setHasChanges(audioChanged || subtitlesChanged);
  }, [selectedAudio, selectedSubtitles, preferences]);

  const toggleAudioLanguage = (code: string) => {
    setSelectedAudio(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code],
    );
  };

  const toggleSubtitleLanguage = (code: string) => {
    setSelectedSubtitles(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code],
    );
  };

  const handleSave = async () => {
    if (selectedAudio.length === 0 && selectedSubtitles.length === 0) {
      Alert.alert(
        'No Languages Selected',
        'Please select at least one audio or subtitle language.',
        [{ text: 'OK' }],
      );
      return;
    }

    try {
      setIsSaving(true);
      await updatePreferences({
        audioLanguages: selectedAudio,
        subtitleLanguages: selectedSubtitles,
      });

      Alert.alert(
        'Preferences Saved',
        'Your language preferences have been updated successfully.',
        [{ text: 'OK' }],
      );
      setHasChanges(false);
    } catch (error) {
      Alert.alert(
        'Error',
        'Failed to save language preferences. Please try again.',
        [{ text: 'OK' }],
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    Alert.alert(
      'Reset Preferences',
      'Are you sure you want to reset to your saved preferences?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            if (preferences) {
              setSelectedAudio(preferences.audioLanguages || []);
              setSelectedSubtitles(preferences.subtitleLanguages || []);
            }
          },
        },
      ],
    );
  };

  const renderLanguageCard = (
    language: Language,
    isSelected: boolean,
    onToggle: () => void,
  ) => {
    return (
      <TouchableOpacity
        key={language.code}
        style={[
          styles.languageCard,
          {
            borderColor: isSelected ? theme.colors.primary[500] : theme.semantic.border.primary,
            backgroundColor: isSelected
              ? theme.colors.primary[50]
              : theme.semantic.background.secondary,
          },
        ]}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={styles.languageContent}>
          <Text style={styles.languageFlag}>{language.flag}</Text>
          <View style={styles.languageInfo}>
            <Text
              style={[
                styles.languageName,
                { color: isSelected ? theme.colors.primary[500] : theme.semantic.text.primary },
              ]}
            >
              {language.name}
            </Text>
            <Text style={[styles.languageNative, { color: theme.semantic.text.secondary }]}>
              {language.nativeName}
            </Text>
          </View>
          {isSelected && (
            <Icon name="check-circle" size={24} color={theme.colors.primary[500]} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading && !preferences) {
    return (
      <SafeAreaView style={{flex: 1, backgroundColor: theme.semantic.background.primary}}>
        <View style={{flex: 1, justifyContent: "center" as const, alignItems: "center" as const}}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
          <Text style={{ marginTop: theme.spacing[4], color: theme.semantic.text.primary }}>
            Loading language preferences...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    scrollView: {
      flex: 1,
    },
    header: {
      margin: theme.spacing[4],
      padding: theme.spacing[5],
      borderRadius: theme.borderRadius.md,
      elevation: 2,
    },
    errorContainer: {
      margin: theme.spacing[4],
      marginTop: 0,
      padding: theme.spacing[4],
      borderRadius: theme.borderRadius.md,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.error[50],
    },
    section: {
      margin: theme.spacing[4],
      marginBottom: theme.spacing[2],
      padding: theme.spacing[5],
      borderRadius: theme.borderRadius.md,
      elevation: 2,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing[2],
    },
    sectionDescription: {
      fontSize: theme.typography.fontSize.sm,
      marginBottom: theme.spacing[4],
    },
    selectedChipsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: theme.spacing[4],
      gap: theme.spacing[2],
    },
    selectedChip: {
      marginRight: theme.spacing[2],
      marginBottom: theme.spacing[2],
    },
    languageGrid: {
      gap: theme.spacing[3],
    },
    languageCard: {
      borderRadius: theme.borderRadius.md,
      borderWidth: 2,
      padding: theme.spacing[4],
      marginBottom: theme.spacing[2],
    },
    languageContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    languageFlag: {
      fontSize: theme.typography.fontSize["3xl"],
      marginRight: theme.spacing[4],
    },
    languageInfo: {
      flex: 1,
    },
    languageName: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: '600',
    },
    languageNative: {
      fontSize: theme.typography.fontSize.sm,
      marginTop: theme.spacing[0.5],
    },
    divider: {
      marginVertical: theme.spacing[2],
    },
    infoBox: {
      margin: theme.spacing[4],
      marginTop: theme.spacing[2],
      padding: theme.spacing[4],
      borderRadius: theme.borderRadius.md,
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    infoText: {
      fontSize: theme.typography.fontSize.sm,
      marginLeft: theme.spacing[3],
      flex: 1,
      lineHeight: theme.typography.lineHeight.relaxed,
    },
    actionBar: {
      flexDirection: 'row',
      padding: theme.spacing[4],
      gap: theme.spacing[3],
      elevation: 8,
    },
    resetButton: {
      flex: 1,
    },
    saveButton: {
      flex: 2,
    },
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.semantic.background.primary }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Surface style={styles.header}>
          <Text variant="headlineSmall" style={{ fontWeight: 'bold' }}>
            Language Preferences
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.semantic.text.secondary, marginTop: theme.spacing[2] }}>
            Select your preferred languages for audio and subtitles. This helps us recommend the
            best VPN locations and streaming options for you.
          </Text>
        </Surface>

        {/* Error Display */}
        {error && (
          <Surface style={styles.errorContainer}>
            <Icon name="error" size={24} color={theme.colors.error[500]} />
            <Text style={{ color: theme.colors.error[500], marginLeft: theme.spacing[3], flex: 1 }}>
              {error.message || 'Failed to load preferences'}
            </Text>
          </Surface>
        )}

        {/* Audio Languages Section */}
        <Surface style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="volume-up" size={24} color={theme.colors.primary[500]} />
            <Text variant="titleLarge" style={{ fontWeight: '600', marginLeft: theme.spacing[3] }}>
              Audio Languages
            </Text>
          </View>
          <Text style={[styles.sectionDescription, { color: theme.semantic.text.secondary }]}>
            Select the languages you prefer for audio tracks
          </Text>

          {selectedAudio.length > 0 && (
            <View style={styles.selectedChipsContainer}>
              {selectedAudio.map(code => {
                const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
                return lang ? (
                  <Chip
                    key={code}
                    mode="flat"
                    style={styles.selectedChip}
                    onClose={() => toggleAudioLanguage(code)}
                    closeIcon="close"
                  >
                    {lang.flag} {lang.name}
                  </Chip>
                ) : null;
              })}
            </View>
          )}

          <View style={styles.languageGrid}>
            {SUPPORTED_LANGUAGES.map(language =>
              renderLanguageCard(
                language,
                selectedAudio.includes(language.code),
                () => toggleAudioLanguage(language.code),
              ),
            )}
          </View>
        </Surface>

        <Divider style={styles.divider} />

        {/* Subtitle Languages Section */}
        <Surface style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="subtitles" size={24} color={theme.colors.primary[500]} />
            <Text variant="titleLarge" style={{ fontWeight: '600', marginLeft: theme.spacing[3] }}>
              Subtitle Languages
            </Text>
          </View>
          <Text style={[styles.sectionDescription, { color: theme.semantic.text.secondary }]}>
            Select the languages you prefer for subtitles
          </Text>

          {selectedSubtitles.length > 0 && (
            <View style={styles.selectedChipsContainer}>
              {selectedSubtitles.map(code => {
                const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
                return lang ? (
                  <Chip
                    key={code}
                    mode="flat"
                    style={styles.selectedChip}
                    onClose={() => toggleSubtitleLanguage(code)}
                    closeIcon="close"
                  >
                    {lang.flag} {lang.name}
                  </Chip>
                ) : null;
              })}
            </View>
          )}

          <View style={styles.languageGrid}>
            {SUPPORTED_LANGUAGES.map(language =>
              renderLanguageCard(
                language,
                selectedSubtitles.includes(language.code),
                () => toggleSubtitleLanguage(language.code),
              ),
            )}
          </View>
        </Surface>

        {/* Info Box */}
        <Surface style={[styles.infoBox, { backgroundColor: theme.colors.primary[50] }]}>
          <Icon name="info" size={20} color={theme.colors.primary[500]} />
          <Text style={[styles.infoText, { color: theme.semantic.text.primary }]}>
            Your language preferences will be used to match you with the best VPN servers and
            streaming content that supports your selected languages.
          </Text>
        </Surface>
      </ScrollView>

      {/* Action Buttons */}
      {hasChanges && (
        <Surface style={styles.actionBar}>
          <Button
            mode="outlined"
            onPress={handleReset}
            style={styles.resetButton}
            disabled={isSaving}
          >
            Reset
          </Button>
          <Button
            mode="contained"
            onPress={handleSave}
            style={styles.saveButton}
            loading={isSaving}
            disabled={isSaving}
          >
            Save Preferences
          </Button>
        </Surface>
      )}
    </SafeAreaView>
  );
}
