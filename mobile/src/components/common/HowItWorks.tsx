import React, { useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

const { width: _width } = Dimensions.get('window');

interface Step {
  id: number;
  title: string;
  description: string;
  icon: string;
  color: string;
}

interface HowItWorksProps {
  steps?: Step[];
  title?: string;
  subtitle?: string;
}

const getDefaultSteps = (theme: any): Step[] => [
  {
    id: 1,
    title: 'Search',
    description: 'Enter the name of any movie, TV show, or actor you want to find',
    icon: '🔍',
    color: theme.colors.primary[500],
  },
  {
    id: 2,
    title: 'Discover',
    description: 'Instantly see where your content is available across 150+ countries',
    icon: '🌍',
    color: theme.colors.purple?.[500] || theme.colors.primary[400],
  },
  {
    id: 3,
    title: 'Compare',
    description: 'Compare prices, quality, and availability across different streaming services',
    icon: '⚖️',
    color: theme.colors.info[500],
  },
  {
    id: 4,
    title: 'Watch',
    description: 'Get direct links to stream your favorite content on your preferred service',
    icon: '🎬',
    color: theme.colors.success[500],
  },
];

export const HowItWorks: React.FC<HowItWorksProps> = ({
  steps,
  title = 'How It Works',
  subtitle = 'Find your favorite content in 4 simple steps',
}) => {
  const { theme } = useTheme();
  const defaultSteps = useMemo(() => getDefaultSteps(theme), [theme]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const finalSteps = steps || defaultSteps;

  useEffect(() => {
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
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.header,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </Animated.View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={finalSteps.length <= 3 ? styles.stepsContainer : styles.stepsContainerScroll}
      >
        {finalSteps.map((step, index) => (
          <StepCard
            key={step.id}
            step={step}
            index={index}
            isLast={index === finalSteps.length - 1}
          />
        ))}
      </ScrollView>
    </View>
  );
};

interface StepCardProps {
  step: Step;
  index: number;
  isLast: boolean;
}

const StepCard: React.FC<StepCardProps> = ({ step, index, isLast }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start();
    }, index * 200);

    return () => clearTimeout(timer);
  }, [index]);

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        styles.stepCardContainer,
        {
          opacity: opacityAnim,
          transform: [
            { scale: scaleAnim },
          ],
        },
      ]}
    >
      <View style={styles.stepCard}>
        {/* Step number and connector */}
        <View style={styles.stepHeader}>
          <View style={styles.stepNumberContainer}>
            <Animated.View
              style={[
                styles.stepCircle,
                {
                  backgroundColor: step.color,
                  transform: [{ rotate: rotateInterpolate }],
                },
              ]}
            >
              <Text style={styles.stepNumber}>{step.id}</Text>
            </Animated.View>
            {!isLast && (
              <View style={[styles.connector, { backgroundColor: step.color + '40' }]} />
            )}
          </View>
        </View>

        {/* Icon */}
        <View style={[styles.iconContainer, { backgroundColor: step.color + '15' }]}>
          <Text style={[styles.icon, { color: step.color }]}>{step.icon}</Text>
        </View>

        {/* Content */}
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>{step.title}</Text>
          <Text style={styles.stepDescription}>{step.description}</Text>
        </View>
      </View>
    </Animated.View>
  );
};

// Vertical version for smaller screens
export const HowItWorksVertical: React.FC<HowItWorksProps> = ({
  steps,
  title = 'How It Works',
  subtitle = 'Find your favorite content in 4 simple steps',
}) => {
  const { theme } = useTheme();
  const defaultSteps = useMemo(() => getDefaultSteps(theme), [theme]);
  const finalSteps = steps || defaultSteps;

  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.verticalContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      <View style={styles.verticalSteps}>
        {finalSteps.map((step, index) => (
          <VerticalStepCard
            key={step.id}
            step={step}
            index={index}
            isLast={index === finalSteps.length - 1}
          />
        ))}
      </View>
    </View>
  );
};

const VerticalStepCard: React.FC<StepCardProps> = ({ step, index, isLast }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    }, index * 150);

    return () => clearTimeout(timer);
  }, [index]);

  return (
    <Animated.View
      style={[
        styles.verticalStepCard,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.verticalStepContent}>
        <View style={styles.verticalStepLeft}>
          <View style={[styles.verticalStepCircle, { backgroundColor: step.color }]}>
            <Text style={styles.verticalStepNumber}>{step.id}</Text>
          </View>
          {!isLast && (
            <View style={[styles.verticalConnector, { backgroundColor: step.color + '30' }]} />
          )}
        </View>

        <View style={styles.verticalStepRight}>
          <View style={[styles.verticalIconContainer, { backgroundColor: step.color + '15' }]}>
            <Text style={[styles.verticalIcon, { color: step.color }]}>{step.icon}</Text>
          </View>
          <Text style={styles.verticalStepTitle}>{step.title}</Text>
          <Text style={styles.verticalStepDescription}>{step.description}</Text>
        </View>
      </View>
    </Animated.View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    padding: theme.spacing[4],
    backgroundColor: theme.semantic.background.primary,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing[6],
  },
  title: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: '700',
    color: theme.semantic.text.primary,
    textAlign: 'center',
    marginBottom: theme.spacing[2],
  },
  subtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.semantic.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  stepsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: theme.spacing[3],
  },
  stepsContainerScroll: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing[3],
    paddingRight: theme.spacing[6],
  },
  stepCardContainer: {
    alignItems: 'center',
    marginHorizontal: theme.spacing[2],
  },
  stepCard: {
    alignItems: 'center',
    width: _width * 0.25,
    minHeight: 200,
  },
  stepHeader: {
    height: 40,
    marginBottom: theme.spacing[3],
    alignItems: 'center',
  },
  stepNumberContainer: {
    alignItems: 'center',
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.md,
  },
  stepNumber: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: '700',
    color: theme.semantic.background.primary,
  },
  connector: {
    width: 2,
    height: 20,
    marginTop: theme.spacing[1],
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: theme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing[3],
  },
  icon: {
    fontSize: theme.typography.fontSize.xl,
  },
  stepContent: {
    alignItems: 'center',
  },
  stepTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '600',
    color: theme.semantic.text.primary,
    marginBottom: theme.spacing[1],
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.semantic.text.secondary,
    textAlign: 'center',
    lineHeight: 14,
  },
  // Vertical styles
  verticalContainer: {
    padding: theme.spacing[4],
    backgroundColor: theme.semantic.background.primary,
  },
  verticalSteps: {
    paddingHorizontal: theme.spacing[3],
  },
  verticalStepCard: {
    marginBottom: theme.spacing[4],
  },
  verticalStepContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  verticalStepLeft: {
    alignItems: 'center',
    marginRight: theme.spacing[3],
  },
  verticalStepCircle: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  verticalStepNumber: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '700',
    color: theme.semantic.background.primary,
  },
  verticalConnector: {
    width: 2,
    flex: 1,
    marginTop: theme.spacing[2],
    minHeight: 40,
  },
  verticalStepRight: {
    flex: 1,
    paddingTop: theme.spacing[1],
  },
  verticalIconContainer: {
    width: 50,
    height: 50,
    borderRadius: theme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing[2],
    alignSelf: 'flex-start',
  },
  verticalIcon: {
    fontSize: theme.typography.fontSize.xl,
  },
  verticalStepTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: '600',
    color: theme.semantic.text.primary,
    marginBottom: theme.spacing[1],
  },
  verticalStepDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.semantic.text.secondary,
    lineHeight: 20,
  },
});
