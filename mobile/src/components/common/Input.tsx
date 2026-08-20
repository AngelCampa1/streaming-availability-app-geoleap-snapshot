import React, { useState } from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  variant?: 'default' | 'outlined' | 'filled';
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  containerStyle,
  inputStyle,
  variant = 'default',
  value,
  onChangeText,
  onFocus,
  onBlur,
  accessibilityLabel,
  accessibilityHint,
  ...props
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const getInputContainerStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing[4],
      paddingVertical: theme.spacing[2],
      minHeight: 48,
    };

    const variantStyles = {
      default: {
        backgroundColor: theme.semantic.background.secondary,
        borderWidth: 1,
        borderColor: error
          ? theme.colors.error[500]
          : isFocused
          ? theme.colors.primary[500]
          : theme.semantic.border.primary,
      },
      outlined: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: error
          ? theme.colors.error[500]
          : isFocused
          ? theme.colors.primary[500]
          : theme.semantic.border.primary,
      },
      filled: {
        backgroundColor: theme.semantic.background.primary,
        borderWidth: 0,
        borderBottomWidth: 2,
        borderBottomColor: error
          ? theme.colors.error[500]
          : isFocused
          ? theme.colors.primary[500]
          : theme.semantic.border.primary,
        borderRadius: 0,
      },
    };

    return {
      ...baseStyle,
      ...variantStyles[variant],
    };
  };

  const getInputStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      flex: 1,
      fontSize: theme.typography.fontSize.base,
      color: theme.semantic.text.primary,
      fontFamily: 'System',
      paddingVertical: 0,
    };

    if (variant === 'filled') {
      baseStyle.paddingTop = theme.spacing[4];
      baseStyle.paddingBottom = theme.spacing[2];
    }

    return {
      ...baseStyle,
      ...inputStyle,
    };
  };

  const inputAccessibilityLabel = accessibilityLabel || label || props.placeholder;
  const inputAccessibilityHint = accessibilityHint || helperText || error;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text
          style={[styles.label, { color: error ? theme.colors.error[500] : theme.semantic.text.primary }]}
          accessibilityRole="text"
        >
          {label}
        </Text>
      )}

      <View style={getInputContainerStyle()}>
        {leftIcon && (
          <View style={styles.leftIcon} accessibilityElementsHidden={true} importantForAccessibility="no-hide-descendants">
            {leftIcon}
          </View>
        )}

        <TextInput
          style={getInputStyle()}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholderTextColor={theme.semantic.text.muted}
          accessible={true}
          accessibilityLabel={inputAccessibilityLabel}
          accessibilityHint={inputAccessibilityHint}
          accessibilityRole="text"
          accessibilityState={{ disabled: props.editable === false }}
          {...props}
        />

        {rightIcon && (
          <View style={styles.rightIcon} accessibilityElementsHidden={true} importantForAccessibility="no-hide-descendants">
            {rightIcon}
          </View>
        )}
      </View>

      {error && (
        <Text
          style={[styles.errorText, { color: theme.colors.error[500] }]}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          {error}
        </Text>
      )}

      {helperText && !error && (
        <Text
          style={[styles.helperText, { color: theme.semantic.text.secondary }]}
          accessibilityRole="text"
        >
          {helperText}
        </Text>
      )}
    </View>
  );
};

interface SearchInputProps extends Omit<InputProps, 'variant'> {
  onSearch?: (query: string) => void;
  onClear?: () => void;
  showClearButton?: boolean;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  onSearch,
  onClear,
  showClearButton = false,
  value = '',
  onChangeText,
  ...props
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const _handleClear = () => {
    onChangeText?.('');
    onClear?.();
  };

  return (
    <Input
      variant="outlined"
      value={value}
      onChangeText={onChangeText}
      onSubmitEditing={() => onSearch?.(value)}
      placeholder="Search for movies, TV shows..."
      leftIcon={
        <View style={styles.searchIcon}>
          <Text style={styles.searchIconText}>🔍</Text>
        </View>
      }
      rightIcon={
        showClearButton && value ? (
          <View style={styles.clearIcon}>
            <Text style={styles.clearIconText}>✕</Text>
          </View>
        ) : undefined
      }
      {...props}
    />
  );
};

// Dynamic styles function - receives theme from useTheme() hook
const createStyles = (theme: any) => StyleSheet.create({
  container: {
    marginBottom: theme.spacing[4],
  },
  label: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium as TextStyle['fontWeight'],
    marginBottom: theme.spacing[1],
  },
  labelError: {
    // Color set dynamically via theme
  },
  leftIcon: {
    marginRight: theme.spacing[2],
  },
  rightIcon: {
    marginLeft: theme.spacing[2],
  },
  errorText: {
    fontSize: theme.typography.fontSize.xs,
    marginTop: theme.spacing[1],
  },
  helperText: {
    fontSize: theme.typography.fontSize.xs,
    marginTop: theme.spacing[1],
  },
  searchIcon: {
    width: theme.spacing[5],
    height: theme.spacing[5],
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchIconText: {
    fontSize: theme.typography.fontSize.base,
  },
  clearIcon: {
    width: theme.spacing[5],
    height: theme.spacing[5],
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearIconText: {
    fontSize: theme.typography.fontSize.base,
  },
});
