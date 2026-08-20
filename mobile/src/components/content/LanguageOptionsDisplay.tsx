/**
 * Language Options Display Component
 * Shows available audio and subtitle languages for content
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Chip, Surface } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../theme/ThemeProvider';

interface LanguageOptionsDisplayProps {
  audioLanguages: string[];
  subtitleLanguages: string[];
  compact?: boolean;
}

// Language code to display name mapping
const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  ja: 'Japanese',
  ko: 'Korean',
  zh: 'Chinese',
  hi: 'Hindi',
  ar: 'Arabic',
  ru: 'Russian',
  nl: 'Dutch',
  pl: 'Polish',
  tr: 'Turkish',
  sv: 'Swedish',
  da: 'Danish',
  no: 'Norwegian',
  fi: 'Finnish',
  th: 'Thai',
  vi: 'Vietnamese',
  id: 'Indonesian',
  ms: 'Malay',
  tl: 'Tagalog',
  uk: 'Ukrainian',
  cs: 'Czech',
  hu: 'Hungarian',
  ro: 'Romanian',
  el: 'Greek',
  he: 'Hebrew',
};

const getLanguageName = (code: string): string => {
  return LANGUAGE_NAMES[code.toLowerCase()] || code.toUpperCase();
};

export const LanguageOptionsDisplay: React.FC<LanguageOptionsDisplayProps> = ({
  audioLanguages,
  subtitleLanguages,
  compact = false,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme, compact), [theme, compact]);

  const uniqueAudio = [...new Set(audioLanguages.map(l => l.toLowerCase()))];
  const uniqueSubtitles = [...new Set(subtitleLanguages.map(l => l.toLowerCase()))];

  if (uniqueAudio.length === 0 && uniqueSubtitles.length === 0) {
    return null;
  }

  return (
    <Surface style={styles.container} elevation={1}>
      {/* Audio Languages Section */}
      {uniqueAudio.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon
              name="volume-up"
              size={compact ? 16 : 20}
              color={theme.colors.primary[500]}
            />
            <Text style={styles.sectionTitle}>
              Audio ({uniqueAudio.length})
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipContainer}
          >
            {uniqueAudio.map((lang) => (
              <Chip
                key={`audio-${lang}`}
                mode="flat"
                compact={compact}
                style={[styles.chip, styles.audioChip]}
                textStyle={styles.chipText}
                icon={() => (
                  <Icon
                    name="mic"
                    size={14}
                    color={theme.colors.primary[600]}
                  />
                )}
              >
                {getLanguageName(lang)}
              </Chip>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Subtitle Languages Section */}
      {uniqueSubtitles.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon
              name="subtitles"
              size={compact ? 16 : 20}
              color={theme.colors.secondary[500]}
            />
            <Text style={styles.sectionTitle}>
              Subtitles ({uniqueSubtitles.length})
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipContainer}
          >
            {uniqueSubtitles.map((lang) => (
              <Chip
                key={`sub-${lang}`}
                mode="flat"
                compact={compact}
                style={[styles.chip, styles.subtitleChip]}
                textStyle={styles.chipText}
                icon={() => (
                  <Icon
                    name="closed-caption"
                    size={14}
                    color={theme.colors.secondary[600]}
                  />
                )}
              >
                {getLanguageName(lang)}
              </Chip>
            ))}
          </ScrollView>
        </View>
      )}
    </Surface>
  );
};

const createStyles = (theme: any, compact: boolean) =>
  StyleSheet.create({
    container: {
      borderRadius: theme.borderRadius.lg,
      padding: compact ? theme.spacing[3] : theme.spacing[4],
      backgroundColor: theme.semantic.background.secondary,
    },
    section: {
      marginBottom: compact ? theme.spacing[2] : theme.spacing[3],
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: compact ? theme.spacing[1] : theme.spacing[2],
      gap: theme.spacing[2],
    },
    sectionTitle: {
      fontSize: compact ? theme.typography.fontSize.sm : theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.semantic.text.primary,
    },
    chipContainer: {
      flexDirection: 'row',
      gap: theme.spacing[2],
      paddingRight: theme.spacing[2],
    },
    chip: {
      height: compact ? 28 : 32,
    },
    chipText: {
      fontSize: compact ? theme.typography.fontSize.xs : theme.typography.fontSize.sm,
    },
    audioChip: {
      backgroundColor: theme.colors.primary[50],
    },
    subtitleChip: {
      backgroundColor: theme.colors.secondary[50],
    },
  });

export default LanguageOptionsDisplay;
