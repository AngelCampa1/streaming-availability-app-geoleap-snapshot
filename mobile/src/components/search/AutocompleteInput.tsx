/* eslint-disable @typescript-eslint/no-require-imports */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ViewStyle,
  TextStyle,
  Platform,
  Keyboard,
  Text,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { SearchSuggestion } from '../../types/streaming';
import { useTheme } from '../../theme/ThemeProvider';

interface AutocompleteInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: (text: string) => void;
  suggestions?: SearchSuggestion[];
  isLoading?: boolean;
  showSuggestions?: boolean;
  onSuggestionPress: (suggestion: SearchSuggestion) => void;
  onVoiceSearch?: () => void;
  onBarcodeSearch?: () => void;
  onClear?: () => void;
  placeholder?: string;
  maxLength?: number;
  autoFocus?: boolean;
  editable?: boolean;
  style?: ViewStyle;
  inputStyle?: TextStyle;
  testID?: string;
}

const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
  value,
  onChangeText,
  onSubmit,
  suggestions = [],
  isLoading = false,
  showSuggestions = false,
  onSuggestionPress,
  onVoiceSearch,
  onBarcodeSearch,
  onClear,
  placeholder = 'Search movies, TV shows, actors...',
  maxLength = 100,
  autoFocus = false,
  editable = true,
  style,
  inputStyle,
  testID = 'autocomplete-input',
}) => {
  const { theme } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const animatedWidth = useRef(new Animated.Value(0)).current;
  const textInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (autoFocus && textInputRef.current) {
      setTimeout(() => {
        textInputRef.current?.focus();
      }, 100);
    }
  }, [autoFocus]);

  useEffect(() => {
    if (isFocused) {
      Animated.timing(animatedWidth, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }).start();
    } else {
      Animated.timing(animatedWidth, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
  }, [isFocused, animatedWidth]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  const handleChangeText = useCallback((text: string) => {
    onChangeText(text);
  }, [onChangeText]);

  const handleSubmitEditing = useCallback(() => {
    Keyboard.dismiss();
    onSubmit(value);
  }, [onSubmit, value]);

  const handleClearPress = useCallback(() => {
    onChangeText('');
    textInputRef.current?.focus();
    onClear?.();
  }, [onChangeText, onClear]);

  const handleSuggestionPress = useCallback((suggestion: SearchSuggestion) => {
    onChangeText(suggestion.text);
    setIsFocused(false);
    Keyboard.dismiss();
    onSuggestionPress(suggestion);
  }, [onChangeText, onSuggestionPress]);

  const clearButtonWidth = value.length > 0 ? 30 : 0;

  const styles = useMemo(() => StyleSheet.create({
    container: {
      position: 'relative',
      zIndex: 100,
    } as ViewStyle,
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.semantic.background.secondary,
      borderRadius: theme.borderRadius.xl,
      borderWidth: 1,
      borderColor: theme.semantic.border.primary,
      paddingHorizontal: theme.spacing[3],
      paddingVertical: Platform.select({
        ios: theme.spacing[3],
        android: theme.spacing[2],
      }),
      minHeight: 48,
    } as ViewStyle,
    inputContainerFocused: {
      borderColor: theme.colors.primary[500],
      backgroundColor: theme.semantic.background.primary,
      shadowColor: theme.colors.primary[500],
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.1,
      shadowRadius: theme.spacing[1],
      elevation: 2,
    } as ViewStyle,
    inputContainerDisabled: {
      backgroundColor: theme.semantic.background.secondary,
      opacity: 0.5,
    } as ViewStyle,
    searchIcon: {
      marginRight: theme.spacing[2],
    } as any,
    textInput: {
      flex: 1,
      fontSize: theme.typography.fontSize.base,
      color: theme.semantic.text.primary,
      ...Platform.select({
        ios: {
          paddingVertical: 0,
        },
        android: {
          paddingVertical: theme.spacing[1],
        },
      }),
    } as TextStyle,
    loadingContainer: {
      overflow: 'hidden',
      marginRight: theme.spacing[2],
    } as ViewStyle,
    loadingIcon: {
      transform: [{ rotate: '0deg' }],
    } as any,
    clearButton: {
      padding: theme.spacing[1],
      borderRadius: theme.borderRadius['2xl'],
      backgroundColor: theme.semantic.background.secondary,
    } as ViewStyle,
    actionButtons: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: theme.spacing[2],
      gap: theme.spacing[3],
    } as ViewStyle,
    actionButton: {
      width: theme.spacing[10],
      height: theme.spacing[10],
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.semantic.background.secondary,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.semantic.border.primary,
    } as ViewStyle,
    suggestionsContainer: {
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      backgroundColor: theme.semantic.background.primary,
      borderRadius: theme.borderRadius.xl,
      marginTop: theme.spacing[1],
      shadowColor: theme.colors.neutral[900],
      shadowOffset: { width: 0, height: theme.spacing[0] },
      shadowOpacity: 0.1,
      shadowRadius: theme.spacing[2],
      elevation: 4,
      zIndex: 1000,
      maxHeight: 300,
    } as ViewStyle,
    suggestionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing[4],
      paddingVertical: theme.spacing[3],
      borderBottomWidth: 1,
      borderBottomColor: theme.semantic.background.secondary,
    } as ViewStyle,
    suggestionItemFirst: {
      borderTopLeftRadius: theme.borderRadius.xl,
      borderTopRightRadius: theme.borderRadius.xl,
    } as ViewStyle,
    suggestionItemLast: {
      borderBottomWidth: 0,
      borderBottomLeftRadius: theme.borderRadius.xl,
      borderBottomRightRadius: theme.borderRadius.xl,
    } as ViewStyle,
    suggestionContent: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    } as ViewStyle,
    suggestionIcon: {
      marginRight: theme.spacing[3],
    } as any,
    suggestionTextContainer: {
      flex: 1,
    } as ViewStyle,
    suggestionMainRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    } as ViewStyle,
    suggestionText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.semantic.text.primary,
      fontWeight: theme.typography.fontWeight.medium,
    } as TextStyle,
    suggestionCount: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.semantic.text.secondary,
      marginLeft: theme.spacing[2],
    } as TextStyle,
    suggestionCategory: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.semantic.text.tertiary,
      marginTop: theme.spacing[0],
    } as TextStyle,
    suggestionImage: {
      width: theme.spacing[8],
      height: 48,
      borderRadius: theme.borderRadius.sm,
      marginLeft: theme.spacing[3],
    } as any,
  }), [theme]);

  return (
    <View style={[styles.container, style]} testID={testID}>
      <View style={[
        styles.inputContainer,
        isFocused && styles.inputContainerFocused,
        !editable && styles.inputContainerDisabled,
      ]}>
        {/* Search Icon */}
        <Icon
          name="search"
          size={20}
          color={isFocused ? theme.colors.primary[500] : theme.semantic.text.tertiary}
          style={styles.searchIcon}
        />

        {/* Text Input */}
        <TextInput
          ref={textInputRef}
          style={[
            styles.textInput,
            inputStyle,
            { marginRight: clearButtonWidth },
          ]}
          value={value}
          onChangeText={handleChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onSubmitEditing={handleSubmitEditing}
          placeholder={placeholder}
          placeholderTextColor={theme.semantic.text.tertiary}
          maxLength={maxLength}
          editable={editable}
          returnKeyType="search"
          clearButtonMode="never"
          autoCorrect={false}
          autoCapitalize="sentences"
          testID={`${testID}-text-input`}
        />

        {/* Loading Indicator */}
        {isLoading && (
          <Animated.View
            style={[
              styles.loadingContainer,
              {
                width: animatedWidth.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 20],
                }),
              },
            ]}
          >
            <Icon
              name="hourglass-empty"
              size={16}
              color={theme.colors.primary[500]}
              style={styles.loadingIcon}
            />
          </Animated.View>
        )}

        {/* Clear Button */}
        {value.length > 0 && (
          <TouchableOpacity
            onPress={handleClearPress}
            style={styles.clearButton}
            testID={`${testID}-clear-button`}
          >
            <Icon name="close" size={18} color={theme.semantic.text.tertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        {onVoiceSearch && (
          <TouchableOpacity
            onPress={onVoiceSearch}
            style={styles.actionButton}
            testID={`${testID}-voice-button`}
          >
            <Icon name="mic" size={20} color={theme.semantic.text.secondary} />
          </TouchableOpacity>
        )}

        {onBarcodeSearch && (
          <TouchableOpacity
            onPress={onBarcodeSearch}
            style={styles.actionButton}
            testID={`${testID}-barcode-button`}
          >
            <Icon name="qr-code-scanner" size={20} color={theme.semantic.text.secondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsContainer} testID={`${testID}-suggestions`}>
          {suggestions.map((suggestion, index) => (
            <TouchableOpacity
              key={suggestion.id}
              style={[
                styles.suggestionItem,
                index === 0 && styles.suggestionItemFirst,
                index === suggestions.length - 1 && styles.suggestionItemLast,
              ]}
              onPress={() => handleSuggestionPress(suggestion)}
              testID={`${testID}-suggestion-${index}`}
            >
              <View style={styles.suggestionContent}>
                {/* Suggestion Icon */}
                <Icon
                  name={getSuggestionIcon(suggestion.type)}
                  size={16}
                  color={theme.semantic.text.secondary}
                  style={styles.suggestionIcon}
                />

                {/* Suggestion Text */}
                <View style={styles.suggestionTextContainer}>
                  <View style={styles.suggestionMainRow}>
                    <Text style={styles.suggestionText}>{suggestion.text}</Text>
                    {suggestion.count && (
                      <Text style={styles.suggestionCount}>({suggestion.count.toLocaleString()})</Text>
                    )}
                  </View>
                  {suggestion.category && (
                    <Text style={styles.suggestionCategory}>{suggestion.category}</Text>
                  )}
                </View>

                {/* Suggestion Image */}
                {suggestion.image && (
                  <Image
                    source={{ uri: suggestion.image }}
                    style={styles.suggestionImage}
                    defaultSource={require('../../assets/images/placeholder-poster.png')}
                  />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const getSuggestionIcon = (type: string): string => {
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
};

export default AutocompleteInput;
