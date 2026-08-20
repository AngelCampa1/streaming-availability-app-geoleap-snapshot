import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { SearchAutoComplete } from '../../types/search';
import { useTheme } from '../../theme/ThemeProvider';

interface SearchAutocompleteComponentProps {
  suggestions: SearchAutoComplete[];
  isLoading: boolean;
  onSuggestionPress: (suggestion: SearchAutoComplete) => void;
  onClearSuggestion?: (suggestion: SearchAutoComplete) => void;
  maxSuggestions?: number;
  style?: any;
}

const { width: _width } = Dimensions.get('window');

const SearchAutocompleteComponent: React.FC<SearchAutocompleteComponentProps> = ({
  suggestions,
  isLoading,
  onSuggestionPress,
  onClearSuggestion,
  maxSuggestions = 8,
  style,
}) => {
  const { theme } = useTheme();
  const [displaySuggestions, setDisplaySuggestions] = useState<SearchAutoComplete[]>([]);

  useEffect(() => {
    // Group suggestions by type and limit
    const grouped = suggestions.reduce((acc, suggestion) => {
      if (!acc[suggestion.type]) {
        acc[suggestion.type] = [];
      }
      acc[suggestion.type].push(suggestion);
      return acc;
    }, {} as Record<string, SearchAutoComplete[]>);

    // Prioritize order: history, trending, suggestion
    const ordered: SearchAutoComplete[] = [];

    // Add history items (max 3)
    if (grouped.history) {
      ordered.push(...grouped.history.slice(0, 3));
    }

    // Add trending items (max 3)
    if (grouped.trending) {
      ordered.push(...grouped.trending.slice(0, 3));
    }

    // Add regular suggestions (fill remaining slots)
    if (grouped.suggestion) {
      const remaining = maxSuggestions - ordered.length;
      ordered.push(...grouped.suggestion.slice(0, remaining));
    }

    setDisplaySuggestions(ordered.slice(0, maxSuggestions));
  }, [suggestions, maxSuggestions]);

  const getIconForType = (type: string): string => {
    switch (type) {
      case 'history':
        return 'history';
      case 'trending':
        return 'trending-up';
      case 'suggestion':
        return 'search';
      default:
        return 'search';
    }
  };

  const getIconColorForType = (type: string): string => {
    switch (type) {
      case 'history':
        return theme.semantic.text.secondary;
      case 'trending':
        return theme.colors.error[500];
      case 'suggestion':
        return theme.colors.primary[500];
      default:
        return theme.colors.primary[500];
    }
  };

  const renderSuggestion = ({ item, index }: { item: SearchAutoComplete; index: number }) => (
    <View  style={styles.suggestionContainer}>
      <TouchableOpacity
         style={styles.suggestionButton}
        onPress={() => onSuggestionPress(item)}
        activeOpacity={0.7}
      >
        <View  style={styles.suggestionContent}>
          {/* Type Icon */}
          <Icon
            name={getIconForType(item.type)}
            size={20}
            color={getIconColorForType(item.type)}
             style={styles.suggestionIcon}
          />

          {/* Suggestion Text */}
          <View  style={styles.textContainer}>
            <Text  style={styles.suggestionText} numberOfLines={1}>
              {item.text}
            </Text>

            {/* Category and Count */}
            <View  style={styles.metaContainer}>
              {item.category && (
                <Text  style={styles.categoryText}>{item.category}</Text>
              )}

              {item.count && (
                <Text  style={styles.countText}>
                  {item.count > 1000
                    ? `${(item.count / 1000).toFixed(1)}k`
                    : item.count.toString()
                  } results
                </Text>
              )}
            </View>
          </View>

          {/* Action Icon */}
          <View  style={styles.actionContainer}>
            {item.type === 'history' && onClearSuggestion && (
              <TouchableOpacity
                 style={styles.clearButton}
                onPress={() => onClearSuggestion(item)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon name="close" size={16} color={theme.semantic.text.tertiary} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
               style={styles.insertButton}
              onPress={() => onSuggestionPress(item)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="north-west" size={16} color={theme.semantic.text.tertiary} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>

      {/* Separator */}
      {index < displaySuggestions.length - 1 && (
        <View  style={styles.separator} />
      )}
    </View>
  );

  const renderEmptyState = () => (
    <View  style={styles.emptyContainer}>
      <Icon name="search" size={32} color={theme.semantic.border.secondary} />
      <Text  style={styles.emptyText}>Start typing to see suggestions</Text>
    </View>
  );

  const renderLoadingState = () => (
    <View  style={styles.loadingContainer}>
      {Array.from({ length: 3 }).map((_, index) => (
        <View key={index}  style={styles.loadingItem}>
          <View  style={styles.loadingIcon} />
          <View  style={styles.loadingTextContainer}>
            <View  style={[styles.loadingText, { width: '70%' }]} />
            <View  style={[styles.loadingText, { width: '40%', height: 12 }]} />
          </View>
        </View>
      ))}
    </View>
  );

  const styles = useMemo(() => StyleSheet.create({
    container: {
      backgroundColor: theme.semantic.background.primary,
      borderRadius: 12,
      marginTop: 4,
      shadowColor: theme.colors.neutral[900],
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 5,
      maxHeight: 400,
    },
    list: {
      flexGrow: 0,
    },
    suggestionContainer: {
      backgroundColor: theme.semantic.background.primary,
    },
    suggestionButton: {
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    suggestionContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    suggestionIcon: {
      marginRight: 12,
    },
    textContainer: {
      flex: 1,
    },
    suggestionText: {
      fontSize: 16,
      color: theme.semantic.text.primary,
      marginBottom: 2,
    },
    metaContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    categoryText: {
      fontSize: 12,
      color: theme.semantic.text.secondary,
      fontWeight: '500',
    },
    countText: {
      fontSize: 12,
      color: theme.semantic.text.tertiary,
    },
    actionContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    clearButton: {
      padding: 4,
    },
    insertButton: {
      padding: 4,
    },
    separator: {
      height: 1,
      backgroundColor: theme.semantic.background.secondary,
      marginLeft: 48,
    },
    emptyContainer: {
      alignItems: 'center',
      padding: 32,
    },
    emptyText: {
      fontSize: 16,
      color: theme.semantic.text.tertiary,
      marginTop: 8,
      textAlign: 'center',
    },
    loadingContainer: {
      padding: 16,
    },
    loadingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    loadingIcon: {
      width: 20,
      height: 20,
      backgroundColor: theme.semantic.background.secondary,
      borderRadius: 10,
      marginRight: 12,
    },
    loadingTextContainer: {
      flex: 1,
    },
    loadingText: {
      height: 16,
      backgroundColor: theme.semantic.background.secondary,
      borderRadius: 8,
      marginBottom: 4,
    },
  }), [theme]);

  if (isLoading) {
    return (
      <View  style={[styles.container, style]}>
        {renderLoadingState()}
      </View>
    );
  }

  if (displaySuggestions.length === 0) {
    return (
      <View  style={[styles.container, style]}>
        {renderEmptyState()}
      </View>
    );
  }

  return (
    <View  style={[styles.container, style]}>
      <FlatList
        data={displaySuggestions}
        renderItem={renderSuggestion}
        keyExtractor={(item) => item.id}
         style={styles.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
      />
    </View>
  );
};

export default SearchAutocompleteComponent;
