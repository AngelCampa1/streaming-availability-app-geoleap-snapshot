import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeProvider';
import { Button } from './Button';
import { SearchInput } from './Input';
import { LOGOS } from '@/assets';

const { height } = Dimensions.get('window');

interface HeroSectionProps {
  onSearch: (query: string) => void;
  onGetStarted: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onSearch,
  onGetStarted,
}) => {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Initial entrance animation
    const startAnimations = () => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    };

    // Pulse animation for CTA
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
    );

    startAnimations();
    pulseAnimation.start();

    return () => pulseAnimation.stop();
  }, []);

  const handleSearch = (query: string) => {
    if (query.trim()) {
      onSearch(query);
    }
  };

  const stats = [
    { number: '150+', label: 'Countries', color: theme.colors.error[500] },
    { number: '500+', label: 'Services', color: theme.colors.success[500] },
    { number: '50K+', label: 'Titles', color: theme.colors.primary[500] },
  ];

  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.colors.primary[500], theme.colors.accent, theme.colors.system.pink]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBackground}
      >
        {/* Animated background elements */}
        <Animated.View
          style={[
            styles.circle1,
            {
              transform: [
                {
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 50],
                    outputRange: [0, -20],
                  }),
                },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.circle2,
            {
              transform: [
                {
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 50],
                    outputRange: [0, 20],
                  }),
                },
              ],
            },
          ]}
        />

        {/* Main content */}
        <View style={styles.content}>
          <Animated.View
            style={[
              styles.headerContent,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
              },
            ]}
          >
            <Image
              source={LOGOS.transparent}
              style={styles.heroLogo}
              resizeMode="contain"
              accessibilityLabel="GeoLeap logo"
            />
            <Text style={styles.title}>GeoLeap</Text>
            <Text style={styles.subtitle}>
              Find Your Shows Anywhere in the World
            </Text>
            <Text style={styles.description}>
              Discover where your favorite movies and TV shows are streaming across 150+ countries and 500+ services
            </Text>
          </Animated.View>

          {/* Search Section */}
          <Animated.View
            style={[
              styles.searchSection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.searchContainer}>
              <SearchInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSearch={handleSearch}
                placeholder="Search for movies, TV shows, actors..."
                style={styles.searchInput}
              />
            </View>

            <Animated.View
              style={[
                styles.ctaContainer,
                {
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            >
              <Button
                title="Start Searching"
                onPress={onGetStarted}
                variant="gradient"
                size="large"
                fullWidth
                style={styles.ctaButton}
              />
            </Animated.View>
          </Animated.View>

          {/* Stats Section */}
          <Animated.View
            style={[
              styles.statsContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {stats.map((stat, index) => (
              <View key={index} style={styles.statItem}>
                <View style={[styles.statCircle, { backgroundColor: stat.color + '20' }]}>
                  <Text style={[styles.statNumber, { color: stat.color }]}>
                    {stat.number}
                  </Text>
                </View>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </Animated.View>
        </View>
      </LinearGradient>
    </View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    width: '100%',
    minHeight: height * 0.75,
  },
  gradientBackground: {
    flex: 1,
    position: 'relative',
    paddingTop: theme.spacing[10],
    paddingBottom: theme.spacing[8],
    paddingHorizontal: theme.spacing[4],
  },
  // Animated background circles
  circle1: {
    position: 'absolute',
    width: theme.spacing[24] * 2.08, // ~200px (96 * 2.08)
    height: theme.spacing[24] * 2.08,
    borderRadius: theme.spacing[24] * 1.04, // ~100px
    backgroundColor: `${theme.semantic.background.primary}1A`, // 10% opacity in hex
    top: -theme.spacing[6] * 2, // -48px ~= -50px
    right: -theme.spacing[6] * 2,
  },
  circle2: {
    position: 'absolute',
    width: theme.spacing[20] * 1.875, // ~150px (80 * 1.875)
    height: theme.spacing[20] * 1.875,
    borderRadius: theme.spacing[20] * 0.9375, // ~75px
    backgroundColor: `${theme.semantic.background.primary}14`, // 8% opacity in hex
    bottom: theme.spacing[6] * 2, // 48px ~= 50px
    left: -theme.spacing[8], // -32px ~= -30px
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: height * 0.6,
  },
  headerContent: {
    alignItems: 'center',
    marginTop: theme.spacing[6],
  },
  heroLogo: {
    width: theme.spacing[20], // 80px
    height: theme.spacing[20], // 80px
    marginBottom: theme.spacing[4],
  },
  title: {
    fontSize: theme.typography.fontSize['5xl'] * 0.875, // 42px (48 * 0.875)
    fontWeight: theme.typography.fontWeight.extrabold,
    color: theme.semantic.background.primary,
    textAlign: 'center',
    marginBottom: theme.spacing[3],
    textShadowColor: `${theme.colors.gray[900]}4D`, // 30% opacity in hex
    textShadowOffset: { width: 0, height: theme.spacing[1] / 2 }, // 2px
    textShadowRadius: theme.spacing[1], // 4px
  },
  subtitle: {
    fontSize: theme.typography.fontSize['2xl'], // 24px
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.semantic.background.primary,
    textAlign: 'center',
    marginBottom: theme.spacing[3],
    textShadowColor: `${theme.colors.gray[900]}33`, // 20% opacity in hex
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: theme.spacing[1] / 2, // 2px
  },
  description: {
    fontSize: theme.typography.fontSize.base, // 16px
    color: theme.semantic.background.primary,
    textAlign: 'center',
    opacity: 0.9,
    paddingHorizontal: theme.spacing[4],
    lineHeight: theme.typography.fontSize['2xl'], // 24px
  },
  searchSection: {
    width: '100%',
    alignItems: 'center',
    marginVertical: theme.spacing[6],
  },
  searchContainer: {
    width: '100%',
    marginBottom: theme.spacing[4],
  },
  searchInput: {
    backgroundColor: theme.semantic.background.primary,
    borderRadius: theme.borderRadius['2xl'],
    ...theme.shadows.lg, // elevation: 8, shadowOffset, shadowOpacity, shadowRadius
  },
  ctaContainer: {
    width: '100%',
  },
  ctaButton: {
    elevation: theme.shadows.md.elevation, // 4
    shadowColor: theme.shadows.md.shadowColor,
    shadowOffset: theme.shadows.md.shadowOffset, // { width: 0, height: 4 }
    shadowOpacity: theme.shadows.md.shadowOpacity * 2.5, // 0.25 (0.1 * 2.5)
    shadowRadius: theme.shadows.md.shadowRadius, // 6
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: theme.spacing[4],
  },
  statItem: {
    alignItems: 'center',
  },
  statCircle: {
    width: theme.spacing[8] * 2.1875, // 70px (32 * 2.1875)
    height: theme.spacing[8] * 2.1875,
    borderRadius: theme.spacing[8] * 1.09375, // 35px
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing[2],
    ...theme.shadows.sm, // elevation: 1, shadowOffset, shadowOpacity, shadowRadius
    elevation: theme.shadows.sm.elevation * 4, // Override elevation to 4
    shadowOpacity: theme.shadows.sm.shadowOpacity * 4, // Override to 0.2 (0.05 * 4)
    shadowRadius: theme.shadows.sm.shadowRadius * 4, // Override to 4 (1 * 4)
  },
  statNumber: {
    fontSize: theme.typography.fontSize.lg, // 18px
    fontWeight: theme.typography.fontWeight.extrabold,
  },
  statLabel: {
    fontSize: theme.typography.fontSize.xs, // 12px
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.semantic.background.primary,
    opacity: 0.9,
    textTransform: 'uppercase',
    letterSpacing: theme.typography.letterSpacing.wide, // 0.5
  },
});
