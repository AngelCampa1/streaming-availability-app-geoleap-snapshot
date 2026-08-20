import React, { useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { LinearGradient } from 'expo-linear-gradient';

// const { width: _width } = Dimensions.get('window');

interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
  gradient?: string[];
  onPress?: () => void;
  delay?: number;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
  icon,
  title,
  description,
  gradient,
  onPress,
  delay = 0,
}) => {
  const { theme } = useTheme();
  const defaultGradient = [theme.colors.primary[500], theme.colors.gold?.[500] || theme.colors.warning[500]];
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(30)).current;
  const styles = useMemo(() => createStyles(theme), [theme]);

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(translateYAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: opacityAnim,
          transform: [
            { scale: scaleAnim },
            { translateY: translateYAnim },
          ],
        },
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        style={styles.touchable}
      >
        <LinearGradient
          colors={(gradient || defaultGradient) as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientCard}
        >
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>{icon}</Text>
          </View>

          <View style={styles.content}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.description}>{description}</Text>
          </View>

          <View style={styles.arrowContainer}>
            <Text style={styles.arrow}>→</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Simplified version for horizontal lists
interface SimpleFeatureCardProps {
  title: string;
  subtitle: string;
  icon: string;
  color?: string;
  onPress?: () => void;
}

export const SimpleFeatureCard: React.FC<SimpleFeatureCardProps> = ({
  title,
  subtitle,
  icon,
  color,
  onPress,
}) => {
  const { theme } = useTheme();
  const defaultColor = color || theme.colors.primary[500];
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const styles = useMemo(() => createStyles(theme), [theme]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.8}
        style={styles.simpleContainer}
      >
        <View style={[styles.simpleIconContainer, { backgroundColor: defaultColor + '15' }]}>
          <Text style={[styles.simpleIcon, { color: defaultColor }]}>{icon}</Text>
        </View>
        <View style={styles.simpleContent}>
          <Text style={styles.simpleTitle}>{title}</Text>
          <Text style={styles.simpleSubtitle}>{subtitle}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    marginHorizontal: theme.spacing[3],
    marginVertical: theme.spacing[2],
  },
  touchable: {
    borderRadius: theme.borderRadius.xl,
  },
  gradientCard: {
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing[4],
    minHeight: 120,
    ...theme.shadows.lg,
    position: 'relative',
    overflow: 'hidden',
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.overlay.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing[3],
  },
  icon: {
    fontSize: theme.typography.fontSize.xl,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: '700',
    color: theme.semantic.background.primary,
    marginBottom: theme.spacing[1],
    textShadowColor: theme.colors.overlay.light,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  description: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.semantic.background.primary,
    opacity: 0.9,
    lineHeight: 20,
  },
  arrowContainer: {
    position: 'absolute',
    bottom: theme.spacing[3],
    right: theme.spacing[3],
  },
  arrow: {
    fontSize: theme.typography.fontSize.xl,
    color: theme.semantic.background.primary,
    fontWeight: 'bold',
  },
  // Simple card styles
  simpleContainer: {
    backgroundColor: theme.semantic.background.primary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[3],
    marginRight: theme.spacing[3],
    minWidth: 140,
    ...theme.shadows.md,
    borderWidth: 1,
    borderColor: theme.semantic.border.primary,
  },
  simpleIconContainer: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing[2],
  },
  simpleIcon: {
    fontSize: theme.typography.fontSize.xl,
  },
  simpleContent: {
    flex: 1,
  },
  simpleTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '600',
    color: theme.semantic.text.primary,
    marginBottom: theme.spacing[1],
  },
  simpleSubtitle: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.semantic.text.secondary,
  },
});
