/**
 * React.memo Optimization Examples
 * Demonstrates best practices for preventing unnecessary re-renders
 *
 * PATTERNS DEMONSTRATED:
 * - Basic React.memo usage
 * - Custom comparison functions
 * - useCallback for event handlers
 * - useMemo for expensive computations
 * - Shallow vs deep equality checks
 */

import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { logger } from '../../utils/logger';

// ============================================
// EXAMPLE 1: Basic React.memo
// ============================================

interface UserCardProps {
  name: string;
  email: string;
  avatar: string;
}

/**
 * Basic memoization - only re-renders if props change
 */
export const UserCard = React.memo<UserCardProps>(({ name, email, avatar }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  logger.debug('[UserCard] Component rendered'); // Track renders in dev

  return (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <Text>{avatar}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.email}>{email}</Text>
      </View>
    </View>
  );
});

// ============================================
// EXAMPLE 2: Custom Comparison Function
// ============================================

interface ContentItemProps {
  id: string;
  title: string;
  description: string;
  updatedAt: number;
  isBookmarked: boolean;
  onPress: (id: string) => void;
}

/**
 * Custom comparison for selective re-rendering
 * Only re-renders if specific props change
 */
export const ContentItem = React.memo<ContentItemProps>(
  ({ id, title, description, isBookmarked, onPress }) => {
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    logger.debug('[ContentItem] Component rendered', { id });

    const handlePress = useCallback(() => {
      onPress(id);
    }, [onPress, id]);

    return (
      <TouchableOpacity style={styles.contentItem} onPress={handlePress}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
        {isBookmarked && <Text style={styles.bookmark}>★</Text>}
      </TouchableOpacity>
    );
  },
  // Custom comparison function
  (prevProps, nextProps) => {
    // Return true if props are equal (prevents re-render)
    // Return false if props changed (triggers re-render)
    return (
      prevProps.id === nextProps.id &&
      prevProps.title === nextProps.title &&
      prevProps.description === nextProps.description &&
      prevProps.isBookmarked === nextProps.isBookmarked &&
      prevProps.updatedAt === nextProps.updatedAt &&
      prevProps.onPress === nextProps.onPress
    );
  }
);

// ============================================
// EXAMPLE 3: Expensive Component with useMemo
// ============================================

interface StatsCardProps {
  viewCount: number;
  likeCount: number;
  shareCount: number;
}

/**
 * Component with expensive calculations
 * Uses useMemo to cache results
 */
export const StatsCard = React.memo<StatsCardProps>(
  ({ viewCount, likeCount, shareCount }) => {
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    logger.debug('[StatsCard] Component rendered');

    // Expensive calculation - only recalculates if counts change
    const engagementScore = useMemo(() => {
      logger.debug('[StatsCard] Calculating engagement score');
      // Simulate expensive calculation
      const score = (likeCount * 2 + shareCount * 3) / Math.max(viewCount, 1);
      return (score * 100).toFixed(2);
    }, [viewCount, likeCount, shareCount]);

    const formattedViews = useMemo(() => {
      return new Intl.NumberFormat('en-US', {
        notation: 'compact',
        compactDisplay: 'short',
      }).format(viewCount);
    }, [viewCount]);

    return (
      <View style={styles.statsCard}>
        <Text style={styles.stat}>Views: {formattedViews}</Text>
        <Text style={styles.stat}>Likes: {likeCount}</Text>
        <Text style={styles.stat}>Shares: {shareCount}</Text>
        <Text style={styles.engagement}>Engagement: {engagementScore}%</Text>
      </View>
    );
  }
);

// ============================================
// EXAMPLE 4: Parent Component with Callbacks
// ============================================

interface ContentListProps {
  items: Array<{
    id: string;
    title: string;
    description: string;
    updatedAt: number;
    isBookmarked: boolean;
  }>;
}

/**
 * Parent component demonstrating proper callback memoization
 */
export const ContentList: React.FC<ContentListProps> = ({ items }) => {
  const [_selectedId, setSelectedId] = useState<string | null>(null);

  // Memoize callback to prevent recreating on every render
  // This is CRITICAL - without useCallback, ContentItem would re-render every time
  const handleItemPress = useCallback((id: string) => {
    setSelectedId(id);
    logger.debug('[ContentList] Item selected', { id });
  }, []); // Empty deps - function never changes

  const _handleBookmarkToggle = useCallback((id: string) => {
    logger.debug('[ContentList] Bookmark toggled', { id });
    // Implement bookmark toggle logic
  }, []);

  return (
    <View style={{ flex: 1 }}>
      {items.map(item => (
        <ContentItem
          key={item.id}
          {...item}
          onPress={handleItemPress}
        />
      ))}
    </View>
  );
};

// ============================================
// EXAMPLE 5: Nested Memoization
// ============================================

interface CommentProps {
  text: string;
  author: string;
  timestamp: number;
}

/**
 * Deeply memoized comment component
 */
const Comment = React.memo<CommentProps>(
  ({ text, author, timestamp }) => {
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    const formattedTime = useMemo(() => {
      return new Date(timestamp).toLocaleString();
    }, [timestamp]);

    return (
      <View style={styles.comment}>
        <Text style={styles.commentAuthor}>{author}</Text>
        <Text style={styles.commentText}>{text}</Text>
        <Text style={styles.commentTime}>{formattedTime}</Text>
      </View>
    );
  },
  (prev, next) => {
    return (
      prev.text === next.text &&
      prev.author === next.author &&
      prev.timestamp === next.timestamp
    );
  }
);

interface CommentListProps {
  comments: CommentProps[];
}

/**
 * Parent component for comment list
 */
export const CommentList = React.memo<CommentListProps>(
  ({ comments }) => {
    // Memoize the entire list if comments array reference doesn't change
    const renderedComments = useMemo(() => {
      return comments.map((comment, index) => (
        <Comment key={index} {...comment} />
      ));
    }, [comments]);

    return <View>{renderedComments}</View>;
  },
  // Only re-render if comments array length or reference changes
  (prev, next) => {
    return (
      prev.comments.length === next.comments.length &&
      prev.comments === next.comments
    );
  }
);

// ============================================
// EXAMPLE 6: Complex State Management
// ============================================

interface FilterOption {
  id: string;
  label: string;
  value: string;
}

interface FilterButtonProps {
  option: FilterOption;
  isSelected: boolean;
  onSelect: (value: string) => void;
}

/**
 * Memoized filter button
 */
const FilterButton = React.memo<FilterButtonProps>(
  ({ option, isSelected, onSelect }) => {
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    const handlePress = useCallback(() => {
      onSelect(option.value);
    }, [onSelect, option.value]);

    return (
      <TouchableOpacity
        style={[styles.filterButton, isSelected && styles.filterButtonSelected]}
        onPress={handlePress}
      >
        <Text style={[styles.filterText, isSelected && styles.filterTextSelected]}>
          {option.label}
        </Text>
      </TouchableOpacity>
    );
  },
  (prev, next) => {
    return (
      prev.option.id === next.option.id &&
      prev.isSelected === next.isSelected &&
      prev.onSelect === next.onSelect
    );
  }
);

interface FilterBarProps {
  options: FilterOption[];
  selectedValue: string;
  onValueChange: (value: string) => void;
}

/**
 * Filter bar with memoized buttons
 */
export const FilterBar: React.FC<FilterBarProps> = ({
  options,
  selectedValue,
  onValueChange,
}) => {
  // Memoize callback
  const handleSelect = useCallback(
    (value: string) => {
      onValueChange(value);
    },
    [onValueChange]
  );

  return (
    <View style={{ flexDirection: 'row', padding: 16 }}>
      {options.map(option => (
        <FilterButton
          key={option.id}
          option={option}
          isSelected={option.value === selectedValue}
          onSelect={handleSelect}
        />
      ))}
    </View>
  );
};

// ============================================
// Styles
// ============================================

const createStyles = (theme: any) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: theme.semantic.background.primary,
    borderRadius: 8,
    marginBottom: 8,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.semantic.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: theme.semantic.text.primary,
  },
  email: {
    fontSize: 14,
    color: theme.semantic.text.secondary,
  },
  contentItem: {
    padding: 16,
    backgroundColor: theme.semantic.background.primary,
    borderRadius: 8,
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: theme.semantic.text.primary,
  },
  description: {
    fontSize: 14,
    color: theme.semantic.text.secondary,
  },
  bookmark: {
    position: 'absolute',
    top: 16,
    right: 16,
    fontSize: 24,
    color: theme.colors.warning[500],
  },
  statsCard: {
    padding: 16,
    backgroundColor: theme.semantic.background.primary,
    borderRadius: 8,
  },
  stat: {
    fontSize: 14,
    marginBottom: 4,
    color: theme.semantic.text.primary,
  },
  engagement: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.primary[500],
    marginTop: 8,
  },
  comment: {
    padding: 12,
    backgroundColor: theme.semantic.background.secondary,
    borderRadius: 8,
    marginBottom: 8,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
    color: theme.semantic.text.primary,
  },
  commentText: {
    fontSize: 14,
    marginBottom: 4,
    color: theme.semantic.text.primary,
  },
  commentTime: {
    fontSize: 12,
    color: theme.semantic.text.tertiary,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: theme.semantic.background.secondary,
    marginRight: 8,
  },
  filterButtonSelected: {
    backgroundColor: theme.colors.primary[500],
  },
  filterText: {
    fontSize: 14,
    color: theme.semantic.text.primary,
  },
  filterTextSelected: {
    color: theme.semantic.background.primary,
  },
});

/**
 * PERFORMANCE TIPS:
 *
 * 1. Use React.memo for components that receive the same props frequently
 * 2. Always use useCallback for event handlers passed to child components
 * 3. Use useMemo for expensive calculations
 * 4. Provide custom comparison functions for deep equality checks
 * 5. Be careful with object/array props - consider using primitive values
 * 6. Extract constant values outside components
 * 7. Use keys properly in lists (never use index as key if list can change)
 */

export default {
  UserCard,
  ContentItem,
  StatsCard,
  ContentList,
  CommentList,
  FilterBar,
};
