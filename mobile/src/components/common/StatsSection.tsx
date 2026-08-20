import React, { useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../hooks/useTheme';

const { width: _width } = Dimensions.get('window');

interface StatItem {
  number: string;
  label: string;
  description: string;
  color: string;
  icon?: string;
}

interface StatsSectionProps {
  stats: StatItem[];
  title?: string;
  subtitle?: string;
}

export const StatsSection: React.FC<StatsSectionProps> = ({
  stats,
  title = 'Impressive Numbers',
  subtitle = 'Join thousands of users discovering content worldwide',
}) => {
  const { theme } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

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

  const styles = useMemo(() => createStyles(theme), [theme]);

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

      <View style={styles.statsGrid}>
        {stats.map((stat, index) => (
          <StatCard
            key={index}
            stat={stat}
            delay={index * 150}
          />
        ))}
      </View>
    </View>
  );
};

interface StatCardProps {
  stat: StatItem;
  delay: number;
}

const StatCard: React.FC<StatCardProps> = ({ stat, delay }) => {
  const { theme } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const numberAnim = useRef(new Animated.Value(0)).current;

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
      ]).start();

      // Number counting animation
      const targetValue = parseInt(stat.number.replace(/\D/g, '')) || 0;
      Animated.timing(numberAnim, {
        toValue: targetValue,
        duration: 1500,
        useNativeDriver: true,
      }).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  const animatedNumber = numberAnim.interpolate({
    inputRange: [0, parseInt(stat.number.replace(/\D/g, '')) || 1],
    outputRange: ['0', stat.number.replace(/\D/g, '')],
  });

  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Animated.View
      style={[
        styles.statCardContainer,
        {
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <LinearGradient
        colors={[stat.color + '20', stat.color + '10']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.statCard}
      >
        <View style={[styles.iconContainer, { backgroundColor: stat.color + '15' }]}>
          {stat.icon ? (
            <Text style={[styles.icon, { color: stat.color }]}>{stat.icon}</Text>
          ) : (
            <Animated.Text style={[styles.animatedNumber, { color: stat.color }]}>
              {animatedNumber}
            </Animated.Text>
          )}
        </View>

        <Text style={styles.statNumber}>{stat.number}</Text>
        <Text style={styles.statLabel}>{stat.label}</Text>
        <Text style={styles.statDescription}>{stat.description}</Text>
      </LinearGradient>
    </Animated.View>
  );
};

// Horizontal stats bar component
interface StatsBarProps {
  stats: Array<{
    number: string;
    label: string;
    color: string;
  }>;
}

export const StatsBar: React.FC<StatsBarProps> = ({ stats }) => {
  const { theme } = useTheme();
  const progressAnims = useRef(stats.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    stats.forEach((_stat, index) => {
      const timer = setTimeout(() => {
        Animated.timing(progressAnims[index], {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }).start();
      }, index * 200);
      timers.push(timer);
    });

    return () => timers.forEach(timer => clearTimeout(timer));
  }, [progressAnims]);

  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.barContainer}>
      {stats.map((stat, index) => (
        <View key={index} style={styles.barItem}>
          <View style={styles.barContent}>
            <Text style={[styles.barNumber, { color: stat.color }]}>
              {stat.number}
            </Text>
            <Text style={styles.barLabel}>{stat.label}</Text>
          </View>
          <View style={styles.barBackground}>
            <Animated.View
              style={[
                styles.barProgress,
                {
                  backgroundColor: stat.color,
                  width: progressAnims[index].interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCardContainer: {
    width: '48%',
    marginBottom: theme.spacing[3],
  },
  statCard: {
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[4],
    alignItems: 'center',
    ...theme.shadows.md,
    borderWidth: 1,
    borderColor: theme.semantic.border.primary,
    minHeight: 140,
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
    fontWeight: 'bold',
  },
  animatedNumber: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: '800',
  },
  statNumber: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: '700',
    color: theme.semantic.text.primary,
    marginBottom: theme.spacing[1],
  },
  statLabel: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '600',
    color: theme.semantic.text.primary,
    marginBottom: theme.spacing[1],
    textAlign: 'center',
  },
  statDescription: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.semantic.text.secondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  // Stats bar styles
  barContainer: {
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[4],
  },
  barItem: {
    marginBottom: theme.spacing[4],
  },
  barContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing[2],
  },
  barNumber: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: '700',
  },
  barLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.semantic.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  barBackground: {
    height: 8,
    backgroundColor: theme.semantic.border.primary,
    borderRadius: theme.borderRadius.sm,
    overflow: 'hidden',
  },
  barProgress: {
    height: '100%',
    borderRadius: theme.borderRadius.sm,
  },
});
