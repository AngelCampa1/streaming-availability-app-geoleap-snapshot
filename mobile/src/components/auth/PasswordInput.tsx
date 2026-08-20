import React, { useState } from 'react';
import {
  TextInput,
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface PasswordInputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  showStrengthIndicator?: boolean;
  onStrengthChange?: (_strength: number) => void;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({
  label,
  error,
  helperText,
  containerStyle,
  inputStyle,
  showStrengthIndicator = false,
  onStrengthChange,
  value = '',
  onChangeText,
  ...props
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    props.onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    props.onBlur?.(e);
  };

  const handleTextChange = (text: string) => {
    onChangeText?.(text);

    if (showStrengthIndicator) {
      const strength = calculatePasswordStrength(text);
      setPasswordStrength(strength);
      onStrengthChange?.(strength);
    }
  };

  const calculatePasswordStrength = (password: string): number => {
    if (!password) {return 0;}

    let strength = 0;
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      numbers: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    strength = Object.values(checks).filter(Boolean).length;
    return Math.min(strength, 4);
  };

  const getStrengthColor = () => {
    switch (passwordStrength) {
      case 0:
      case 1:
        return theme.colors.error[500];
      case 2:
        return theme.colors.warning[500];
      case 3:
        return theme.colors.secondary[500];
      case 4:
        return theme.colors.success[500];
      default:
        return theme.semantic.border.primary;
    }
  };

  const getStrengthText = () => {
    switch (passwordStrength) {
      case 0:
        return '';
      case 1:
        return 'Very weak';
      case 2:
        return 'Weak';
      case 3:
        return 'Good';
      case 4:
        return 'Strong';
      default:
        return '';
    }
  };

  const getInputContainerStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing[4],
      paddingVertical: theme.spacing[2],
      minHeight: 48,
      backgroundColor: theme.semantic.background.secondary,
      borderWidth: 1,
      borderColor: error
        ? theme.colors.error[500]
        : isFocused
        ? theme.colors.primary[500]
        : theme.semantic.border.primary,
    };

    return baseStyle;
  };

  const getInputStyle = (): TextStyle => {
    return {
      flex: 1,
      fontSize: theme.typography.fontSize.base,
      color: theme.semantic.text.primary,
      fontFamily: 'System',
      paddingVertical: 0,
      ...inputStyle,
    };
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, error && styles.labelError]}>
          {label}
        </Text>
      )}

      <View style={getInputContainerStyle()}>
        <TextInput
          style={getInputStyle()}
          value={value}
          onChangeText={handleTextChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          secureTextEntry={!showPassword}
          placeholderTextColor={theme.semantic.text.tertiary}
          autoCapitalize="none"
          autoCorrect={false}
          {...props}
        />

        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
          style={styles.toggleButton}
          activeOpacity={0.6}
        >
          <Text style={styles.toggleText}>
            {showPassword ? '👁️' : '👁️‍🗨️'}
          </Text>
        </TouchableOpacity>
      </View>

      {showStrengthIndicator && value && (
        <View style={styles.strengthContainer}>
          <View style={styles.strengthBar}>
            {[1, 2, 3, 4].map((level) => (
              <View
                key={level}
                style={[
                  styles.strengthSegment,
                  {
                    backgroundColor: level <= passwordStrength ? getStrengthColor() : theme.semantic.border.primary,
                  },
                ]}
              />
            ))}
          </View>
          <Text style={[styles.strengthText, { color: getStrengthColor() }]}>
            {getStrengthText()}
          </Text>
        </View>
      )}

      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      {helperText && !error && (
        <Text style={styles.helperText}>{helperText}</Text>
      )}
    </View>
  );
};

// Dynamic styles function - receives theme from useTheme() hook
const createStyles = (theme: any) => StyleSheet.create({
  container: {
    marginBottom: theme.spacing[4],
  },
  label: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.semantic.text.primary,
    marginBottom: theme.spacing[1],
  },
  labelError: {
    color: theme.colors.error[500],
  },
  toggleButton: {
    padding: theme.spacing[1],
    marginLeft: theme.spacing[2],
  },
  toggleText: {
    fontSize: theme.typography.fontSize.base,
  },
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing[1],
  },
  strengthBar: {
    flex: 1,
    flexDirection: 'row',
    height: 4,
    backgroundColor: theme.semantic.border.primary,
    borderRadius: theme.borderRadius.xs,
    marginRight: theme.spacing[2],
  },
  strengthSegment: {
    flex: 1,
    marginHorizontal: theme.spacing[0],
    borderRadius: theme.borderRadius.xs,
  },
  strengthText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
  },
  errorText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.error[500],
    marginTop: theme.spacing[1],
  },
  helperText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.semantic.text.secondary,
    marginTop: theme.spacing[1],
  },
});
