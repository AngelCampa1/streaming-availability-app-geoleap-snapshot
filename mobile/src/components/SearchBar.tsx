import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../theme/ThemeProvider';

export interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  onSubmit?: (text: string) => void;
  onVoiceSearch?: () => void;
  onBarcodeSearch?: () => void;
  style?: ViewStyle;
  showVoiceButton?: boolean;
  showBarcodeButton?: boolean;
  disabled?: boolean;
  testID?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = 'Search...',
  value = '',
  onChangeText,
  onSubmit,
  onVoiceSearch,
  onBarcodeSearch,
  style,
  showVoiceButton = true,
  showBarcodeButton = true,
  disabled = false,
  testID = 'search-bar',
}) => {
  const { theme } = useTheme();
  const [searchText, setSearchText] = useState(value);
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Sync internal state with value prop changes (enables fully controlled mode)
  useEffect(() => {
    setSearchText(value);
  }, [value]);

  const handleTextChange = useCallback((text: string) => {
    setSearchText(text);
    onChangeText?.(text);
  }, [onChangeText]);

  const handleSubmit = useCallback(() => {
    onSubmit?.(searchText);
  }, [onSubmit, searchText]);

  const handleVoicePress = useCallback(() => {
    // Early return if disabled
    if (disabled) {
      return;
    }
    onVoiceSearch?.();
  }, [onVoiceSearch, disabled]);

  const handleBarcodePress = useCallback(() => {
    // Early return if disabled
    if (disabled) {
      return;
    }
    onBarcodeSearch?.();
  }, [onBarcodeSearch, disabled]);

  return (
    <View  style={[styles.container, style]} testID={testID}>
      <View  style={styles.inputContainer}>
        <Icon name="search" size={20} color={theme.semantic.text.secondary}  style={styles.searchIcon} />
        <TextInput
           style={[styles.input, disabled && styles.inputDisabled]}
          placeholder={placeholder}
          value={searchText}
          onChangeText={handleTextChange}
          onSubmitEditing={handleSubmit}
          returnKeyType="search"
          editable={!disabled}
          testID={`${testID}-input`}
          accessibilityLabel="Search input field"
          accessibilityHint="Enter your search query here"
        />
        {showVoiceButton && (
          <TouchableOpacity
             style={[styles.actionButton, disabled && styles.buttonDisabled]}
            onPress={handleVoicePress}
            disabled={disabled}
            testID={`${testID}-voice-button`}
            accessibilityLabel="Voice search"
            accessibilityHint="Tap to start voice search"
            accessibilityRole="button"
            accessibilityState={{ disabled: disabled }}
          >
            <Icon name="mic" size={20} color={disabled ? theme.semantic.text.tertiary : theme.colors.primary[500]} />
          </TouchableOpacity>
        )}
        {showBarcodeButton && (
          <TouchableOpacity
             style={[styles.actionButton, disabled && styles.buttonDisabled]}
            onPress={handleBarcodePress}
            disabled={disabled}
            testID={`${testID}-barcode-button`}
            accessibilityLabel="Barcode search"
            accessibilityHint="Tap to scan barcode or QR code"
            accessibilityRole="button"
            accessibilityState={{ disabled: disabled }}
          >
            <Icon name="qr-code-scanner" size={20} color={disabled ? theme.semantic.text.tertiary : theme.colors.primary[500]} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[2],
  } as ViewStyle,
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.semantic.background.secondary,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    borderWidth: 1,
    borderColor: theme.semantic.border.primary,
  } as ViewStyle,
  searchIcon: {
    marginRight: theme.spacing[2],
  },
  input: {
    flex: 1,
    fontSize: theme.typography.fontSize.md,
    color: theme.semantic.text.primary,
    padding: 0,
  } as TextStyle,
  inputDisabled: {
    color: theme.semantic.text.tertiary,
  } as TextStyle,
  actionButton: {
    padding: theme.spacing[1],
    marginLeft: theme.spacing[2],
  } as ViewStyle,
  buttonDisabled: {
    opacity: 0.5,
  } as ViewStyle,
});

export default SearchBar;
