import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  variant?: 'rectangular' | 'circular' | 'text';
  style?: any;
  animation?: 'pulse' | 'wave' | 'none';
}

const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  variant = 'rectangular',
  style,
  animation = 'pulse',
}) => {
  const { theme } = useTheme();

  const getSkeletonStyle = () => {
    const baseStyle = {
      backgroundColor: theme.semantic.background.secondary,
      width,
      height,
    };

    switch (variant) {
      case 'circular':
        return {
          ...baseStyle,
          borderRadius: typeof height === 'number' ? height / 2 : 10,
        };
      case 'text':
        return {
          ...baseStyle,
          borderRadius: 4,
          height: 12,
        };
      default:
        return {
          ...baseStyle,
          borderRadius: 8,
        };
    }
  };

  const styles = useMemo(() => createStyles(theme), [theme]);
  const animationStyle = animation === 'pulse' ? styles.pulse : {};

  return (
    <View
      style={[
        getSkeletonStyle(),
        animationStyle,
        style,
      ]}
    />
  );
};

// Pre-built skeleton components for common use cases
export const SearchSkeleton: React.FC = () => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={[styles.container, { backgroundColor: theme.semantic.background.primary }]}>
      <View style={styles.header}>
        <Skeleton width={40} height={40} variant="circular" />
        <View style={styles.headerText}>
          <Skeleton width={120} height={20} />
          <Skeleton width={80} height={16} variant="text" />
        </View>
      </View>

      <View style={styles.searchSection}>
        <Skeleton height={50} style={styles.searchBar} />
        <View style={styles.filterRow}>
          <Skeleton width={80} height={32} />
          <Skeleton width={80} height={32} />
          <Skeleton width={80} height={32} />
        </View>
      </View>

      <View style={styles.resultsSection}>
        {[1, 2, 3, 4, 5].map((index) => (
          <View key={index} style={styles.resultCard}>
            <Skeleton width={60} height={90} style={styles.poster} />
            <View style={styles.resultInfo}>
              <Skeleton width={150} height={18} />
              <Skeleton width={100} height={14} variant="text" />
              <Skeleton width={120} height={14} variant="text" />
              <View style={styles.ratingRow}>
                <Skeleton width={60} height={16} />
                <Skeleton width={40} height={24} />
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

export const DashboardSkeleton: React.FC = () => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={[styles.container, { backgroundColor: theme.semantic.background.primary }]}>
      <View style={styles.header}>
        <Skeleton width={150} height={28} />
        <Skeleton width={30} height={30} variant="circular" />
      </View>

      <View style={styles.section}>
        <Skeleton width={120} height={20} style={styles.sectionTitle} />
        <View style={styles.cardRow}>
          {[1, 2, 3].map((index) => (
            <Skeleton key={index} width={100} height={150} style={styles.card} />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Skeleton width={100} height={20} style={styles.sectionTitle} />
        <View style={styles.listSection}>
          {[1, 2, 3, 4].map((index) => (
            <View key={index} style={styles.listItem}>
              <Skeleton width={50} height={50} variant="circular" />
              <View style={styles.listItemContent}>
                <Skeleton width={140} height={16} />
                <Skeleton width={100} height={14} variant="text" />
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

export const ProfileSkeleton: React.FC = () => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={[styles.container, { backgroundColor: theme.semantic.background.primary }]}>
      <View style={styles.profileHeader}>
        <Skeleton width={80} height={80} variant="circular" />
        <View style={styles.profileInfo}>
          <Skeleton width={120} height={20} />
          <Skeleton width={160} height={14} variant="text" />
          <Skeleton width={100} height={14} variant="text" />
        </View>
      </View>

      <View style={styles.statsSection}>
        {[1, 2, 3, 4].map((index) => (
          <View key={index} style={styles.statItem}>
            <Skeleton width={40} height={24} />
            <Skeleton width={60} height={14} variant="text" />
          </View>
        ))}
      </View>

      <View style={styles.settingsSection}>
        <Skeleton width={140} height={20} style={styles.sectionTitle} />
        {[1, 2, 3, 4, 5].map((index) => (
          <View key={index} style={styles.settingItem}>
            <Skeleton width={24} height={24} />
            <Skeleton width={120} height={16} />
            <Skeleton width={20} height={20} variant="circular" />
          </View>
        ))}
      </View>
    </View>
  );
};

export const CardSkeleton: React.FC = () => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.cardSkeleton}>
      <Skeleton height={150} style={styles.cardImage} />
      <View style={styles.cardContent}>
        <Skeleton width={120} height={18} />
        <Skeleton width={100} height={14} variant="text" />
        <Skeleton width={80} height={14} variant="text" />
      </View>
    </View>
  );
};

export const ListSkeleton: React.FC<{ itemCount?: number }> = ({ itemCount = 5 }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={[styles.container, { backgroundColor: theme.semantic.background.primary }]}>
      {[...Array(itemCount)].map((_, index) => (
        <View key={index} style={styles.listSkeletonItem}>
          <Skeleton width={40} height={40} variant="circular" />
          <View style={styles.listSkeletonContent}>
            <Skeleton width={140} height={16} />
            <Skeleton width={100} height={14} variant="text" />
          </View>
          <Skeleton width={20} height={20} />
        </View>
      ))}
    </View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },

  // Header styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerText: {
    marginLeft: 12,
    flex: 1,
  },

  // Search skeleton styles
  searchSection: {
    marginBottom: 24,
  },
  searchBar: {
    marginBottom: 16,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  // Results skeleton styles
  resultsSection: {
    flex: 1,
  },
  resultCard: {
    flexDirection: 'row',
    marginBottom: 16,
    padding: 12,
    backgroundColor: theme.semantic.background.secondary,
    borderRadius: 8,
  },
  poster: {
    marginRight: 12,
  },
  resultInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // Dashboard skeleton styles
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  card: {
    borderRadius: 8,
  },

  // List styles
  listSection: {
    flex: 1,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: theme.semantic.background.secondary,
    borderRadius: 8,
  },
  listItemContent: {
    marginLeft: 12,
    flex: 1,
  },

  // Profile skeleton styles
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
    padding: 16,
    backgroundColor: theme.semantic.background.secondary,
    borderRadius: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  settingsSection: {
    flex: 1,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    padding: 12,
    backgroundColor: theme.semantic.background.secondary,
    borderRadius: 8,
  },

  // Generic card skeleton
  cardSkeleton: {
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  cardImage: {
    marginBottom: 8,
  },
  cardContent: {
    padding: 8,
  },

  // List skeleton
  listSkeletonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    padding: 12,
    backgroundColor: theme.semantic.background.secondary,
    borderRadius: 8,
  },
  listSkeletonContent: {
    flex: 1,
    marginLeft: 12,
  },

  // Animation
  pulse: {
    opacity: 0.7,
  },
});

export default Skeleton;
