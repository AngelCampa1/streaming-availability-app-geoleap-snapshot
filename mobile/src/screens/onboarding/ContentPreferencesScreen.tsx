/**
 * Content Preferences Screen
 * Onboarding step for users to select their preferred content types
 */

import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Button, ProgressBar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { OnboardingStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeProvider';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'ContentPreferences'>;

interface ContentType {
  id: string;
  name: string;
  description: string;
  icon: string;
}

const CONTENT_TYPES: ContentType[] = [
  {
    id: 'movies',
    name: 'Movies',
    description: 'Feature films, blockbusters, and indie cinema',
    icon: 'movie',
  },
  {
    id: 'tv_shows',
    name: 'TV Shows',
    description: 'Series, episodic content, and limited series',
    icon: 'tv',
  },
  {
    id: 'documentaries',
    name: 'Documentaries',
    description: 'Non-fiction films and educational content',
    icon: 'video-library',
  },
  {
    id: 'anime',
    name: 'Anime',
    description: 'Japanese animation and animated series',
    icon: 'auto-awesome',
  },
  {
    id: 'sports',
    name: 'Sports',
    description: 'Live sports, highlights, and sports documentaries',
    icon: 'sports-soccer',
  },
  {
    id: 'kids',
    name: 'Kids & Family',
    description: 'Family-friendly content and children\'s programming',
    icon: 'child-care',
  },
];

export const ContentPreferencesScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  const styles = useMemo(() => createStyles(theme), [theme]);

  const handleToggleType = (typeId: string) => {
    setSelectedTypes(prev =>
      prev.includes(typeId)
        ? prev.filter(id => id !== typeId)
        : [...prev, typeId]
    );
  };

  const handleContinue = () => {
    // TODO: Save preferences via API
    navigation.navigate('RegionPreferences');
  };

  const handleSkip = () => {
    navigation.navigate('RegionPreferences');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Progress indicator */}
      <View style={styles.progressContainer}>
        <ProgressBar
          progress={0.4}
          color={theme.colors.primary[500]}
          style={styles.progressBar}
        />
        <Text style={styles.progressText}>Step 2 of 5</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>
            What do you like to watch?
          </Text>
          <Text style={styles.subtitle}>
            Select the types of content you enjoy. This helps us personalize your recommendations.
          </Text>
        </View>

        {/* Content Type Grid */}
        <View style={styles.grid}>
          {CONTENT_TYPES.map(type => {
            const isSelected = selectedTypes.includes(type.id);
            return (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.typeCard,
                  isSelected && styles.typeCardSelected,
                ]}
                onPress={() => handleToggleType(type.id)}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.iconContainer,
                  isSelected && styles.iconContainerSelected,
                ]}>
                  <Icon
                    name={type.icon}
                    size={32}
                    color={isSelected ? theme.semantic.text.inverse : theme.colors.primary[500]}
                  />
                </View>
                <Text style={[
                  styles.typeName,
                  isSelected && styles.typeNameSelected,
                ]}>
                  {type.name}
                </Text>
                <Text style={styles.typeDescription} numberOfLines={2}>
                  {type.description}
                </Text>
                {isSelected && (
                  <View style={styles.checkmark}>
                    <Icon name="check-circle" size={24} color={theme.colors.primary[500]} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Helper text */}
        {selectedTypes.length > 0 && (
          <View style={styles.helperBox}>
            <Text style={styles.helperText}>
              {selectedTypes.length} type{selectedTypes.length !== 1 ? 's' : ''} selected
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.actions}>
        <Button
          mode="text"
          onPress={handleSkip}
          style={styles.skipButton}
        >
          Skip
        </Button>
        <Button
          mode="contained"
          onPress={handleContinue}
          style={styles.continueButton}
          disabled={selectedTypes.length === 0}
        >
          Continue
        </Button>
      </View>
    </SafeAreaView>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.semantic.background.primary,
  },
  progressContainer: {
    paddingHorizontal: theme.spacing[5],
    paddingVertical: theme.spacing[3],
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.semantic.background.secondary,
  },
  progressText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.semantic.text.secondary,
    marginTop: theme.spacing[2],
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: theme.spacing[5],
    paddingBottom: theme.spacing[5],
  },
  header: {
    marginBottom: theme.spacing[6],
  },
  title: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.semantic.text.primary,
    marginBottom: theme.spacing[2],
  },
  subtitle: {
    fontSize: theme.typography.fontSize.base,
    color: theme.semantic.text.secondary,
    lineHeight: theme.typography.fontSize.base * 1.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[3],
  },
  typeCard: {
    width: '47%',
    backgroundColor: theme.semantic.background.secondary,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing[4],
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  typeCardSelected: {
    borderColor: theme.colors.primary[500],
    backgroundColor: theme.colors.primary[50],
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing[3],
  },
  iconContainerSelected: {
    backgroundColor: theme.colors.primary[500],
  },
  typeName: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.semantic.text.primary,
    marginBottom: theme.spacing[1],
  },
  typeNameSelected: {
    color: theme.colors.primary[700],
  },
  typeDescription: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.semantic.text.secondary,
    lineHeight: theme.typography.fontSize.xs * 1.4,
  },
  checkmark: {
    position: 'absolute',
    top: theme.spacing[2],
    right: theme.spacing[2],
  },
  helperBox: {
    marginTop: theme.spacing[5],
    padding: theme.spacing[3],
    backgroundColor: theme.colors.primary[50],
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },
  helperText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary[600],
    fontWeight: theme.typography.fontWeight.medium,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing[5],
    paddingVertical: theme.spacing[4],
    borderTopWidth: 1,
    borderTopColor: theme.semantic.border.primary,
    gap: theme.spacing[3],
  },
  skipButton: {
    flex: 1,
  },
  continueButton: {
    flex: 2,
  },
});

export default ContentPreferencesScreen;
