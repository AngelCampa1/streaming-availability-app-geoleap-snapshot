/**
 * Genre Preferences Screen
 * Onboarding step for users to select their favorite genres
 */

import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Button, ProgressBar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { OnboardingStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeProvider';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'GenrePreferences'>;

interface Genre {
  id: string;
  name: string;
  icon: string;
  colorKey: GenreColorKey;
}

// Genre color keys that map to theme colors
type GenreColorKey =
  | 'action' | 'comedy' | 'drama' | 'horror' | 'romance' | 'scifi'
  | 'fantasy' | 'thriller' | 'mystery' | 'animation' | 'documentary'
  | 'crime' | 'adventure' | 'family' | 'history' | 'music' | 'war' | 'western';

// Get genre color from theme - centralized color mapping
const getGenreColor = (colorKey: GenreColorKey, theme: ReturnType<typeof useTheme>['theme']): string => {
  const colorMap: Record<GenreColorKey, string> = {
    action: theme.colors.error[500],      // Red - intense action
    comedy: theme.colors.warning[500],    // Amber - fun and bright
    drama: theme.colors.primary[400],     // Purple - emotional depth
    horror: theme.colors.gray[800],       // Dark gray - scary atmosphere
    romance: theme.colors.system.pink,    // Pink - love and passion
    scifi: theme.colors.info[500],        // Blue - futuristic
    fantasy: theme.colors.primary[500],   // Violet - magical
    thriller: theme.colors.error[600],    // Dark red - suspense
    mystery: theme.colors.system.indigo,  // Indigo - enigmatic
    animation: theme.colors.success[500], // Green - lively
    documentary: theme.colors.info[600],  // Blue - informative
    crime: theme.colors.secondary[500],   // Slate - serious
    adventure: theme.colors.system.orange,// Orange - exciting
    family: theme.colors.success[400],    // Light green - friendly
    history: theme.colors.warning[800],   // Brown/amber - vintage
    music: theme.colors.error[500],       // Red - passionate
    war: theme.colors.gray[600],          // Gray - somber
    western: theme.colors.warning[600],   // Amber/gold - dusty
  };
  return colorMap[colorKey];
};

const GENRES: Genre[] = [
  { id: 'action', name: 'Action', icon: 'local-fire-department', colorKey: 'action' },
  { id: 'comedy', name: 'Comedy', icon: 'sentiment-very-satisfied', colorKey: 'comedy' },
  { id: 'drama', name: 'Drama', icon: 'theater-comedy', colorKey: 'drama' },
  { id: 'horror', name: 'Horror', icon: 'light-only', colorKey: 'horror' },
  { id: 'romance', name: 'Romance', icon: 'favorite', colorKey: 'romance' },
  { id: 'scifi', name: 'Sci-Fi', icon: 'rocket-launch', colorKey: 'scifi' },
  { id: 'fantasy', name: 'Fantasy', icon: 'auto-awesome', colorKey: 'fantasy' },
  { id: 'thriller', name: 'Thriller', icon: 'psychology', colorKey: 'thriller' },
  { id: 'mystery', name: 'Mystery', icon: 'search', colorKey: 'mystery' },
  { id: 'animation', name: 'Animation', icon: 'animation', colorKey: 'animation' },
  { id: 'documentary', name: 'Documentary', icon: 'video-camera-front', colorKey: 'documentary' },
  { id: 'crime', name: 'Crime', icon: 'gavel', colorKey: 'crime' },
  { id: 'adventure', name: 'Adventure', icon: 'explore', colorKey: 'adventure' },
  { id: 'family', name: 'Family', icon: 'family-restroom', colorKey: 'family' },
  { id: 'history', name: 'History', icon: 'history-edu', colorKey: 'history' },
  { id: 'music', name: 'Music', icon: 'music-note', colorKey: 'music' },
  { id: 'war', name: 'War', icon: 'military-tech', colorKey: 'war' },
  { id: 'western', name: 'Western', icon: 'landscape', colorKey: 'western' },
];

export const GenrePreferencesScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

  const styles = useMemo(() => createStyles(theme), [theme]);

  const handleToggleGenre = (genreId: string) => {
    setSelectedGenres(prev =>
      prev.includes(genreId)
        ? prev.filter(id => id !== genreId)
        : prev.length < 10 ? [...prev, genreId] : prev
    );
  };

  const handleContinue = () => {
    // TODO: Save preferences via API
    navigation.navigate('OnboardingComplete');
  };

  const handleSkip = () => {
    navigation.navigate('OnboardingComplete');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Progress indicator */}
      <View style={styles.progressContainer}>
        <ProgressBar
          progress={0.8}
          color={theme.colors.primary[500]}
          style={styles.progressBar}
        />
        <Text style={styles.progressText}>Step 4 of 5</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>
            Pick your favorite genres
          </Text>
          <Text style={styles.subtitle}>
            Select up to 10 genres you enjoy. We'll use this to recommend content you'll love.
          </Text>
        </View>

        {/* Genre Grid */}
        <View style={styles.grid}>
          {GENRES.map(genre => {
            const isSelected = selectedGenres.includes(genre.id);
            const genreColor = getGenreColor(genre.colorKey, theme);
            return (
              <TouchableOpacity
                key={genre.id}
                style={[
                  styles.genreCard,
                  isSelected && styles.genreCardSelected,
                  isSelected && { borderColor: genreColor },
                ]}
                onPress={() => handleToggleGenre(genre.id)}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.iconContainer,
                  { backgroundColor: isSelected ? genreColor : `${genreColor}20` },
                ]}>
                  <Icon
                    name={genre.icon}
                    size={24}
                    color={isSelected ? theme.semantic.text.inverse : genreColor}
                  />
                </View>
                <Text style={[
                  styles.genreName,
                  isSelected && { color: genreColor },
                ]}>
                  {genre.name}
                </Text>
                {isSelected && (
                  <View style={[styles.checkmark, { backgroundColor: genreColor }]}>
                    <Icon name="check" size={12} color={theme.semantic.text.inverse} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selection counter */}
        <View style={styles.counterContainer}>
          <Text style={styles.counterText}>
            {selectedGenres.length}/10 genres selected
          </Text>
          {selectedGenres.length >= 3 && (
            <Text style={styles.counterSuccess}>
              Great selection!
            </Text>
          )}
        </View>
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
          disabled={selectedGenres.length === 0}
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
  genreCard: {
    width: '30%',
    backgroundColor: theme.semantic.background.secondary,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing[3],
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  genreCardSelected: {
    backgroundColor: theme.semantic.background.primary,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing[2],
  },
  genreName: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.semantic.text.primary,
    textAlign: 'center',
  },
  checkmark: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterContainer: {
    marginTop: theme.spacing[5],
    alignItems: 'center',
  },
  counterText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.semantic.text.secondary,
  },
  counterSuccess: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.success[500],
    fontWeight: theme.typography.fontWeight.medium,
    marginTop: theme.spacing[1],
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

export default GenrePreferencesScreen;
