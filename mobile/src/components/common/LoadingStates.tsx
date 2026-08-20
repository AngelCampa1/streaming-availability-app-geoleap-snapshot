import React, { useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../hooks/useTheme';

// const { width: _width } = Dimensions.get('window');

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  text?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'large',
  color,
  text,
}) => {
  const { theme } = useTheme();
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const spinnerColor = color ?? theme.semantic.status.success;

  useEffect(() => {
    const rotationAnimation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      }),
    );
    rotationAnimation.start();
    return () => rotationAnimation.stop();
  }, []);

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.spinnerContainer}>
      <Animated.View
        style={[
          styles.spinnerCircle,
          {
            transform: [{ rotate: rotateInterpolate }],
            borderColor: spinnerColor,
          },
        ]}
      />
      <ActivityIndicator
        size={size === 'large' ? 'large' : 'small'}
        color={spinnerColor}
        style={styles.activityIndicator}
      />
      {text && <Text style={styles.loadingText}>{text}</Text>}
    </View>
  );
};

interface SkeletonLoaderProps {
  width?: number;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width,
  height = 20,
  borderRadius,
  style,
}) => {
  const { theme } = useTheme();
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const skeletonBorderRadius = borderRadius ?? theme.borderRadius.sm;

  useEffect(() => {
    const shimmerAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ]),
    );
    shimmerAnimation.start();
    return () => shimmerAnimation.stop();
  }, []);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-100, 100],
  });

  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View
      style={[
        styles.skeletonContainer,
        {
          width,
          height,
          borderRadius: skeletonBorderRadius,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.skeletonShimmer,
          {
            transform: [{ translateX }],
          },
        ]}
      />
    </View>
  );
};

interface CardSkeletonProps {
  count?: number;
}

export const CardSkeleton: React.FC<CardSkeletonProps> = ({ count = 3 }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.skeletonRow}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={styles.cardSkeletonItem}>
          <SkeletonLoader width={120} height={120} borderRadius={theme.borderRadius.lg} />
          <View style={styles.cardSkeletonText}>
            <SkeletonLoader width={120} height={16} style={styles.skeletonTextSpacing} />
            <SkeletonLoader width={90} height={12} />
          </View>
        </View>
      ))}
    </View>
  );
};

interface ListSkeletonProps {
  rows?: number;
  showAvatar?: boolean;
}

export const ListSkeleton: React.FC<ListSkeletonProps> = ({
  rows = 5,
  showAvatar = true,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.listSkeleton}>
      {Array.from({ length: rows }).map((_, index) => (
        <View key={index} style={styles.listSkeletonRow}>
          {showAvatar && (
            <SkeletonLoader width={40} height={40} borderRadius={20} style={styles.skeletonAvatar} />
          )}
          <View style={styles.listSkeletonContent}>
            <SkeletonLoader width={100} height={16} style={styles.skeletonTextSpacing} />
            <SkeletonLoader width={130} height={12} style={styles.skeletonTextSpacing} />
            <SkeletonLoader width={60} height={12} />
          </View>
        </View>
      ))}
    </View>
  );
};

interface FullScreenLoaderProps {
  text?: string;
  subtext?: string;
}

export const FullScreenLoader: React.FC<FullScreenLoaderProps> = ({
  text = 'Loading...',
  subtext,
}) => {
  const { theme } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const styles = useMemo(() => createStyles(theme), [theme]);
  const gradientColors: readonly [string, string] = [theme.colors.neutral[50] + 'F2', theme.colors.neutral[100] + 'F2'] as const;

  return (
    <View style={styles.fullScreenLoader}>
      <LinearGradient
        colors={gradientColors}
        style={styles.fullScreenGradient}
      >
        <Animated.View
          style={[
            styles.fullScreenContent,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <LoadingSpinner size="large" />
          <Text style={styles.fullScreenText}>{text}</Text>
          {subtext && <Text style={styles.fullScreenSubtext}>{subtext}</Text>}
        </Animated.View>
      </LinearGradient>
    </View>
  );
};

// Pull-to-refresh loader component
interface PullToRefreshLoaderProps {
  refreshing: boolean;
}

export const PullToRefreshLoader: React.FC<PullToRefreshLoaderProps> = ({ refreshing }) => {
  const { theme } = useTheme();
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (refreshing) {
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }).start();
    } else {
      rotateAnim.setValue(0);
    }
  }, [refreshing]);

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const styles = useMemo(() => createStyles(theme), [theme]);

  if (!refreshing) {return null;}

  return (
    <View style={styles.pullToRefreshContainer}>
      <Animated.View style={[{ transform: [{ rotate: rotateInterpolate }] }]}>
        <ActivityIndicator size="small" color={theme.semantic.status.success} />
      </Animated.View>
      <Text style={styles.pullToRefreshText}>Refreshing...</Text>
    </View>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    // Loading Spinner
    spinnerContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing[4],
    },
    spinnerCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 3,
      borderTopColor: 'transparent',
      borderRightColor: 'transparent',
      position: 'absolute',
    },
    activityIndicator: {
      zIndex: 1,
    },
    loadingText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.semantic.text.secondary,
      marginTop: theme.spacing[2],
      textAlign: 'center',
    },
    // Skeleton Loader
    skeletonContainer: {
      backgroundColor: theme.semantic.border.primary,
      overflow: 'hidden',
      position: 'relative',
    },
    skeletonShimmer: {
      width: '100%',
      height: '100%',
      backgroundColor: theme.colors.overlay.lightStrong,
      position: 'absolute',
      top: 0,
      left: 0,
    },
    skeletonTextSpacing: {
      marginBottom: theme.spacing[1],
    },
    // Card Skeleton
    skeletonRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingHorizontal: theme.spacing[3],
    },
    cardSkeletonItem: {
      alignItems: 'center',
      marginHorizontal: theme.spacing[2],
    },
    cardSkeletonText: {
      marginTop: theme.spacing[2],
      width: '100%',
      alignItems: 'center',
    },
    // List Skeleton
    listSkeleton: {
      padding: theme.spacing[3],
    },
    listSkeletonRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing[3],
    },
    skeletonAvatar: {
      marginRight: theme.spacing[3],
    },
    listSkeletonContent: {
      flex: 1,
    },
    // Full Screen Loader
    fullScreenLoader: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999,
    },
    fullScreenGradient: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fullScreenContent: {
      alignItems: 'center',
      padding: theme.spacing[5],
    },
    fullScreenText: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: '600',
      color: theme.semantic.text.primary,
      marginTop: theme.spacing[4],
      textAlign: 'center',
    },
    fullScreenSubtext: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.semantic.text.secondary,
      marginTop: theme.spacing[2],
      textAlign: 'center',
    },
    // Pull to Refresh
    pullToRefreshContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing[3],
    },
    pullToRefreshText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.semantic.text.secondary,
      marginLeft: theme.spacing[2],
    },
  });
