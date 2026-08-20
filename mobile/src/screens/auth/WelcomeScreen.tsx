import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LOGOS } from '@/assets';
import { StackScreenProps } from '@react-navigation/stack';
import { AuthStackParamList } from '../../navigation/types';
import { Button } from '../../components/common/Button';
import { useTheme } from '../../hooks/useTheme';
import { logger } from '../../utils/logger';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

type Props = StackScreenProps<AuthStackParamList, 'Welcome'>;

export const WelcomeScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const confettiAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate screen entrance
    const animateEntrance = () => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start();

      // Start confetti animation after a delay
      setTimeout(() => {
        Animated.timing(confettiAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }).start();
      }, 500);
    };

    animateEntrance();
  }, []);

  const handleGetStarted = () => {
    // Haptic feedback
    const buttonScale = Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]);
    buttonScale.start();

    // Navigate to main app
    navigation.replace("Login" as any);
  };

  const handleExploreFeatures = () => {
    // Navigate to features overview or onboarding
    logger.log('[WelcomeScreen] Navigate to features overview');
  };

  const renderConfetti = () => {
    const confetti = [];
    const colors = [
      theme.colors.primary[500],
      theme.colors.secondary[500],
      theme.colors.success[500],
      theme.colors.warning[500]
    ];

    for (let i = 0; i < 20; i++) {
      const randomX = Math.random() * SCREEN_WIDTH;
      const _randomDelay = Math.random() * 1000;
      const randomColor = colors[Math.floor(Math.random() * colors.length)];

      confetti.push(
        <Animated.View
          key={i}
          style={[
            styles.confettiPiece,
            {
              backgroundColor: randomColor,
              left: randomX,
              transform: [
                {
                  translateY: confettiAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-50, SCREEN_HEIGHT + 100],
                  }),
                },
                {
                  rotate: confettiAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '360deg'],
                  }),
                },
                {
                  translateX: confettiAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, (Math.random() - 0.5) * 200],
                  }),
                },
              ],
              opacity: confettiAnim.interpolate({
                inputRange: [0.7, 1],
                outputRange: [1, 0],
              }),
            },
          ]}
        />,
      );
    }

    return confetti;
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.semantic.background.primary,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      minHeight: SCREEN_HEIGHT,
      paddingBottom: theme.spacing[8],
    },
    backgroundContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    backgroundCircle: {
      position: 'absolute',
      width: 300,
      height: 300,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.primary[500] + '05',
    },
    confettiContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      overflow: 'hidden',
    },
    confettiPiece: {
      position: 'absolute',
      width: 8,
      height: 8,
      borderRadius: theme.borderRadius.sm,
    },
    contentContainer: {
      flex: 1,
      paddingTop: theme.spacing[12],
      paddingHorizontal: theme.spacing[6],
      alignItems: 'center',
    },
    iconContainer: {
      marginBottom: theme.spacing[8],
    },
    welcomeLogo: {
      width: 120,
      height: 120,
    },
    title: {
      fontSize: theme.typography.fontSize["3xl"], fontWeight: theme.typography.fontWeight.bold,
      color: theme.semantic.text.primary,
      textAlign: 'center',
      marginBottom: theme.spacing[4],
    },
    subtitle: {
      fontSize: theme.typography.fontSize.base,
      color: theme.semantic.text.secondary,
      textAlign: 'center',
      lineHeight: theme.typography.fontSize.base * theme.typography.lineHeight.relaxed,
      marginBottom: theme.spacing[12],
      paddingHorizontal: theme.spacing[6],
    },
    featuresContainer: {
      width: '100%',
      marginBottom: theme.spacing[8],
    },
    featureItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.semantic.background.secondary,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing[4],
      marginBottom: theme.spacing[4],
      ...theme.shadows.sm,
    },
    featureIcon: {
      width: 50,
      height: 50,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.primary[500] + '20',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: theme.spacing[4],
    },
    featureIconText: {
      fontSize: theme.typography.fontSize['2xl'],
    },
    featureContent: {
      flex: 1,
    },
    featureTitle: {
      fontSize: theme.typography.fontSize.lg, fontWeight: theme.typography.fontWeight.semibold,
      color: theme.semantic.text.primary,
      marginBottom: theme.spacing[1],
    },
    featureDescription: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.semantic.text.secondary,
      lineHeight: theme.typography.fontSize.sm * theme.typography.lineHeight.normal,
    },
    statsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      width: '100%',
      marginBottom: theme.spacing[12],
      backgroundColor: theme.semantic.background.secondary,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing[6],
      ...theme.shadows.sm,
    },
    statItem: {
      alignItems: 'center',
    },
    statNumber: {
      fontSize: theme.typography.fontSize["2xl"],
      color: theme.colors.primary[500],
      fontWeight: theme.typography.fontWeight.bold,
      marginBottom: theme.spacing[1],
    },
    statLabel: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.semantic.text.secondary,
      textAlign: 'center',
    },
    primaryButton: {
      marginBottom: theme.spacing[4],
    },
    secondaryButton: {
      marginBottom: theme.spacing[8],
    },
    testimonialContainer: {
      backgroundColor: theme.colors.info[500] + '10',
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing[6],
      borderLeftWidth: 4,
      borderLeftColor: theme.colors.info[500],
      maxWidth: '100%',
    },
    testimonialText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.semantic.text.secondary,
      fontStyle: 'italic',
      marginBottom: theme.spacing[2],
      textAlign: 'center',
    },
    testimonialAuthor: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.semantic.text.secondary,
      textAlign: 'center',
      fontWeight: theme.typography.fontWeight.medium,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle={'dark-content'}
        backgroundColor={theme.semantic.background.primary}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Animated background gradient */}
        <View style={styles.backgroundContainer}>
          <View style={[styles.backgroundCircle, { top: -150, left: -150 }]} />
          <View style={[styles.backgroundCircle, { top: SCREEN_HEIGHT / 2, right: -100 }]} />
          <View style={[styles.backgroundCircle, { bottom: 100, left: 50 }]} />
        </View>

        {/* Confetti animation */}
        <View style={styles.confettiContainer}>
          {renderConfetti()}
        </View>

        {/* Main content */}
        <Animated.View
          style={[
            styles.contentContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Success icon with animation */}
          <Animated.View
            style={[
              styles.iconContainer,
              {
                transform: [
                  { scale: scaleAnim },
                  {
                    rotate: confettiAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '10deg'],
                    }),
                  },
                ],
              },
            ]}
          >
            <Image
              source={LOGOS.transparent}
              style={styles.welcomeLogo}
              resizeMode="contain"
              accessibilityLabel="GeoLeap logo"
            />
          </Animated.View>

          <Text style={styles.title}>Welcome to GeoLeap!</Text>
          <Text style={styles.subtitle}>
            Your journey to discovering amazing content starts now
          </Text>

          {/* Feature highlights */}
          <View style={styles.featuresContainer}>
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Text style={styles.featureIconText}>🎬</Text>
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Smart Search</Text>
                <Text style={styles.featureDescription}>
                  Find content across all streaming platforms instantly
                </Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Text style={styles.featureIconText}>📊</Text>
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Personalized</Text>
                <Text style={styles.featureDescription}>
                  Get recommendations tailored to your taste
                </Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Text style={styles.featureIconText}>🔍</Text>
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Advanced Filters</Text>
                <Text style={styles.featureDescription}>
                  Narrow down your search with powerful filters
                </Text>
              </View>
            </View>
          </View>

          {/* Quick stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>500+</Text>
              <Text style={styles.statLabel}>Streaming Services</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>10M+</Text>
              <Text style={styles.statLabel}>Movies & Shows</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>24/7</Text>
              <Text style={styles.statLabel}>Updated Content</Text>
            </View>
          </View>

          {/* Action buttons */}
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <Button
              title="Get Started"
              onPress={handleGetStarted}
              variant="gradient"
              size="large"
              fullWidth
              style={styles.primaryButton}
            />
          </Animated.View>

          <Button
            title="Explore Features"
            onPress={handleExploreFeatures}
            variant="outline"
            size="medium"
            fullWidth
            style={styles.secondaryButton}
          />

          {/* Testimonial */}
          <View style={styles.testimonialContainer}>
            <Text style={styles.testimonialText}>
              "Finally, a way to search all my streaming services in one place!"
            </Text>
            <Text style={styles.testimonialAuthor}>- Sarah J., Premium User</Text>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default WelcomeScreen;
