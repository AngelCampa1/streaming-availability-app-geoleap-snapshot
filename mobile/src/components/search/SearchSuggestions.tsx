/* eslint-disable @typescript-eslint/no-require-imports */
import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ViewStyle,
  TextStyle,
  Image,
  Animated,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { SearchSuggestion } from '../../types/streaming';
import { useTheme } from '../../theme/ThemeProvider';

interface SearchSuggestionsProps {
  suggestions: SearchSuggestion[];
  visible: boolean;
  onSuggestionPress: (suggestion: SearchSuggestion) => void;
  onClearHistory?: () => void;
  showClearHistory?: boolean;
  style?: ViewStyle;
  testID?: string;
  styles?: any;
}

const { width: screenWidth } = Dimensions.get('window');

const SearchSuggestions: React.FC<SearchSuggestionsProps> = ({
  suggestions,
  visible,
  onSuggestionPress,
  onClearHistory,
  showClearHistory = false,
  style,
  testID = 'search-suggestions',
  styles: propStyles,
}) => {
  const { theme } = useTheme();
  const defaultStyles = useStyles(theme);
  const styles = propStyles || defaultStyles;
  const [animatedValue] = useState(new Animated.Value(0));
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const groupedSuggestions = useMemo(() => {
    const groups: Record<string, SearchSuggestion[]> = {};

    suggestions.forEach(suggestion => {
      const category = suggestion.type === 'history' ? 'Recent Searches' :
                      suggestion.type === 'trending' ? 'Trending' :
                      suggestion.category || 'Suggestions';

      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(suggestion);
    });

    return groups;
  }, [suggestions]);

  React.useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: visible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [visible, animatedValue]);

  const handleSuggestionPress = useCallback((suggestion: SearchSuggestion) => {
    setExpandedItem(null);
    onSuggestionPress(suggestion);
  }, [onSuggestionPress]);

  const handleItemPress = useCallback((suggestion: SearchSuggestion) => {
    if (expandedItem === suggestion.id) {
      setExpandedItem(null);
    } else {
      setExpandedItem(suggestion.id);
    }
  }, [expandedItem]);

  const getSuggestionIcon = useCallback((type: string): string => {
    switch (type) {
      case 'content':
        return 'movie';
      case 'actor':
        return 'person';
      case 'director':
        return 'video-camera-front';
      case 'genre':
        return 'category';
      case 'service':
        return 'tv';
      case 'country':
        return 'public';
      case 'history':
        return 'history';
      case 'trending':
        return 'trending-up';
      default:
        return 'search';
    }
  }, []);

  const renderSuggestionItem = useCallback(({ item, index }: { item: SearchSuggestion; index: number }) => {
    const isExpanded = expandedItem === item.id;
    const hasImage = !!item.image;
    const hasMetadata = !!item.metadata && Object.keys(item.metadata).length > 0;

    return (
      <View style={styles.suggestionItemContainer}>
        <TouchableOpacity
          style={[
            styles.suggestionItem,
            isExpanded && styles.suggestionItemExpanded,
          ]}
          onPress={() => handleSuggestionPress(item)}
          onLongPress={() => handleItemPress(item)}
          testID={`${testID}-item-${index}`}
        >
          <View style={styles.suggestionContent}>
            {/* Icon */}
            <View style={styles.suggestionIconContainer}>
              <Icon
                name={getSuggestionIcon(item.type)}
                size={16}
                color={theme.semantic.text.secondary}
              />
            </View>

            {/* Main Content */}
            <View style={styles.suggestionMainContent}>
              <View style={styles.suggestionHeader}>
                <Text style={styles.suggestionText} numberOfLines={1}>
                  {item.text}
                </Text>
                {item.count && (
                  <Text style={styles.suggestionCount}>
                    ({item.count.toLocaleString()})
                  </Text>
                )}
              </View>

              {item.category && (
                <Text style={styles.suggestionCategory}>
                  {item.category}
                </Text>
              )}

              {/* Expanded Content */}
              {isExpanded && hasMetadata && (
                <Animated.View style={styles.expandedContent}>
                  {Object.entries(item.metadata).map(([key, value]) => (
                    <View key={key} style={styles.metadataItem}>
                      <Text style={styles.metadataKey}>
                        {key.charAt(0).toUpperCase() + key.slice(1)}:
                      </Text>
                      <Text style={styles.metadataValue}>
                        {String(value)}
                      </Text>
                    </View>
                  ))}
                </Animated.View>
              )}
            </View>

            {/* Image */}
            {hasImage && (
              <Image
                source={{ uri: item.image }}
                style={styles.suggestionImage as any}
                defaultSource={require('../../assets/images/placeholder-poster.png')}
              />
            )}

            {/* Expand/Collapse Icon */}
            {hasMetadata && (
              <Icon
                name={isExpanded ? 'expand-less' : 'expand-more'}
                size={16}
                color={theme.semantic.text.tertiary}
                style={styles.expandIcon as any}
              />
            )}
          </View>

          {/* Type Badge */}
          <View style={styles.suggestionBadge}>
            <Text style={styles.suggestionBadgeText}>
              {item.type}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  }, [expandedItem, getSuggestionIcon, handleItemPress, handleSuggestionPress, testID]);

  const renderSectionHeader = useCallback((title: string, itemCount: number) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {showClearHistory && title === 'Recent Searches' && (
        <TouchableOpacity
          onPress={onClearHistory}
          style={styles.clearHistoryButton}
          testID={`${testID}-clear-history`}
        >
          <Text style={styles.clearHistoryText}>Clear</Text>
        </TouchableOpacity>
      )}
      <Text style={styles.sectionCount}>{itemCount} items</Text>
    </View>
  ), [showClearHistory, onClearHistory, testID]);

  if (!visible || suggestions.length === 0) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: animatedValue,
          transform: [
            {
              translateY: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [-10, 0],
              }),
            },
          ],
        },
        style,
      ]}
      testID={testID}
    >
      <View style={styles.content}>
        {Object.entries(groupedSuggestions).map(([category, categorySuggestions], sectionIndex) => (
          <View key={category} style={styles.section}>
            {renderSectionHeader(category, categorySuggestions.length)}

            <FlatList
              data={categorySuggestions}
              renderItem={renderSuggestionItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.suggestionsList}
            />

            {sectionIndex < Object.keys(groupedSuggestions).length - 1 && (
              <View style={styles.sectionDivider} />
            )}
          </View>
        ))}
      </View>
    </Animated.View>
  );
};

// Create styles with useMemo hook
const useStyles = (theme: any) => useMemo(() => StyleSheet.create({
  container: {
    backgroundColor: theme.semantic.background.primary,
    borderRadius: 12,
    shadowColor: theme.colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    maxHeight: screenWidth * 0.8,
    overflow: 'hidden',
  } as ViewStyle,
  content: {
    paddingVertical: 8,
  } as ViewStyle,
  section: {
    marginBottom: 8,
  } as ViewStyle,
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: theme.semantic.background.secondary,
  } as ViewStyle,
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.semantic.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  } as TextStyle,
  sectionCount: {
    fontSize: 11,
    color: theme.semantic.text.tertiary,
  } as TextStyle,
  clearHistoryButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  } as ViewStyle,
  clearHistoryText: {
    fontSize: 12,
    color: theme.colors.primary[500],
    fontWeight: '500',
  } as TextStyle,
  sectionDivider: {
    height: 1,
    backgroundColor: theme.semantic.border.primary,
    marginVertical: 8,
  } as ViewStyle,
  suggestionsList: {
    paddingHorizontal: 8,
  } as ViewStyle,
  suggestionItemContainer: {
    paddingHorizontal: 8,
  } as ViewStyle,
  suggestionItem: {
    flexDirection: 'column',
    backgroundColor: theme.semantic.background.primary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.semantic.border.primary,
    padding: 12,
    marginBottom: 4,
  } as ViewStyle,
  suggestionItemExpanded: {
    borderColor: theme.colors.primary[500],
    backgroundColor: theme.semantic.background.tertiary,
  } as ViewStyle,
  suggestionContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  } as ViewStyle,
  suggestionIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.semantic.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  } as ViewStyle,
  suggestionMainContent: {
    flex: 1,
  } as ViewStyle,
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  } as ViewStyle,
  suggestionText: {
    fontSize: 15,
    color: theme.semantic.text.primary,
    fontWeight: '500',
    flex: 1,
  } as TextStyle,
  suggestionCount: {
    fontSize: 13,
    color: theme.semantic.text.secondary,
    marginLeft: 8,
  } as TextStyle,
  suggestionCategory: {
    fontSize: 12,
    color: theme.semantic.text.tertiary,
    marginBottom: 4,
  } as TextStyle,
  expandedContent: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.semantic.border.primary,
  } as ViewStyle,
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  } as ViewStyle,
  metadataKey: {
    fontSize: 12,
    color: theme.semantic.text.secondary,
    fontWeight: '500',
    marginRight: 8,
    minWidth: 60,
  } as TextStyle,
  metadataValue: {
    fontSize: 12,
    color: theme.semantic.text.primary,
    flex: 1,
  } as TextStyle,
  suggestionImage: {
    width: 40,
    height: 60,
    borderRadius: 6,
    marginLeft: 12,
    backgroundColor: theme.semantic.background.secondary,
  } as ViewStyle,
  expandIcon: {
    marginLeft: 8,
    marginTop: 2,
  } as ViewStyle,
  suggestionBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: theme.colors.primary[500],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  } as ViewStyle,
  suggestionBadgeText: {
    fontSize: 10,
    color: theme.semantic.background.primary,
    fontWeight: '600',
    textTransform: 'uppercase',
  } as TextStyle,
}), [theme]);

// Wrapper component to use the hook
const SearchSuggestionsWrapper: React.FC<SearchSuggestionsProps> = (props) => {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  return <SearchSuggestions {...props} styles={styles} />;
};

export default SearchSuggestionsWrapper;
