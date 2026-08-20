import React from 'react';
import {
  AccessibilityRole,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  Animated,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { accessibilityService } from '../services/accessibility/AccessibilityService';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  rounded?: boolean;
  animated?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  testID,
  accessibilityLabel,
  accessibilityHint,
  leftIcon,
  rightIcon,
  fullWidth = false,
  rounded = false,
  animated = true,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [animatedValue] = React.useState(new Animated.Value(1));
  const settings = accessibilityService.getSettings();

  const getButtonStyles = (): ViewStyle[] => {
    const variantStyle = variant === 'primary' ? { backgroundColor: theme.colors.primary[500] } :
                          variant === 'secondary' ? styles.secondary :
                          variant === 'success' ? styles.success :
                          variant === 'danger' ? styles.danger :
                          variant === 'warning' ? styles.warning :
                          variant === 'outline' ? styles.outline :
                          styles.ghost;

    const baseStyles = [
      styles.button,
      variantStyle,
      styles[size],
      disabled && styles.disabled,
      fullWidth && styles.fullWidth,
      rounded && styles.rounded,
    ];

    // Apply accessibility-friendly font size if needed
    if (settings.largeTextEnabled) {
      baseStyles.push(styles.accessibleText as any);
    }

    return baseStyles;
  };

  const getTextStyles = (): any[] => {
    const baseStyles: any[] = [
      styles.text,
      styles[`text_${variant}`],
    ];

    // Apply accessibility-friendly font size if needed
    if (settings.largeTextEnabled) {
      baseStyles.push({ fontSize: Number(theme.typography.fontSize.lg) });
    }

    return baseStyles;
  };

  const getAccessibilityProps = () => {
    const label = accessibilityLabel ||
      accessibilityService.generateAccessibilityLabel('button', title);

    const hint = accessibilityHint ||
      accessibilityService.generateAccessibilityHint(
        disabled ? 'button disabled' : 'activate button',
        loading ? 'Please wait' : undefined,
      );

    return accessibilityService.getAccessibleProps('button', label, hint);
  };

  const handlePressIn = () => {
    if (animated && !disabled && !loading && !settings.reduceMotion) {
      Animated.spring(animatedValue, {
        toValue: 0.95,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    }
  };

  const handlePressOut = () => {
    if (animated && !disabled && !loading && !settings.reduceMotion) {
      Animated.spring(animatedValue, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    }
  };

  const buttonStyles = getButtonStyles();
  const textStyles = getTextStyles();
  const accessibilityProps = getAccessibilityProps();

  const renderContent = () => {
    if (loading) {
      return (
        <ActivityIndicator
          size={size === 'small' ? 'small' : 'large'}
          color={getLoadingColor()}
        />
      );
    }

    return (
      <>
        {leftIcon && <>{leftIcon}</>}
        <Text style={textStyles}>{title}</Text>
        {rightIcon && <>{rightIcon}</>}
      </>
    );
  };

  const getLoadingColor = () => {
    switch (variant) {
      case 'primary':
      case 'success':
      case 'danger':
      case 'warning':
        return theme.semantic.text.inverse;
      case 'secondary':
      case 'outline':
      case 'ghost':
        return theme.colors.primary[500];
      default:
        return theme.semantic.text.inverse;
    }
  };

  const handlePress = () => {
    // Early return if button is disabled or loading
    if (disabled || loading) {
      return;
    }
    onPress();
  };

  return (
    <Animated.View style={{ transform: [{ scale: animatedValue }] }}>
      <TouchableOpacity
        style={buttonStyles}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        testID={testID}
        accessible={accessibilityProps.accessible}
        accessibilityLabel={accessibilityProps.accessibilityLabel}
        accessibilityHint={accessibilityProps.accessibilityHint}
        accessibilityRole={accessibilityProps.accessibilityRole as AccessibilityRole}
        accessibilityState={accessibilityProps.accessibilityState}
        accessibilityLiveRegion={accessibilityProps.accessibilityLiveRegion}
        activeOpacity={animated ? 0.8 : 1}
      >
        {renderContent()}
      </TouchableOpacity>
    </Animated.View>
  );
};

// Dynamic styles function - receives theme from useTheme() hook
const createStyles = (theme: any) => StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.lg,
    minHeight: 48,
    flexDirection: 'row',
    shadowColor: theme.colors.neutral?.[900] || '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  secondary: {
    backgroundColor: theme.colors.secondary[500],
  },
  success: {
    backgroundColor: theme.colors.success[500],
  },
  danger: {
    backgroundColor: theme.colors.error[500],
  },
  warning: {
    backgroundColor: theme.colors.warning[500],
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: theme.colors.primary[500],
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  small: {
    paddingVertical: theme.spacing[2],
    paddingHorizontal: theme.spacing[3],
    minHeight: 36,
  },
  medium: {
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[4],
    minHeight: 48,
  },
  large: {
    paddingVertical: theme.spacing[4],
    paddingHorizontal: theme.spacing[6],
    minHeight: 56,
  },
  disabled: {
    backgroundColor: theme.colors.neutral[300],
    opacity: 0.6,
  },
  fullWidth: {
    width: '100%',
  },
  rounded: {
    borderRadius: theme.borderRadius.full,
  },
  accessibleText: {
    minHeight: 56, // Larger touch target for accessibility
  },
  text: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    textAlign: 'center',
  },
  text_primary: {
    color: theme.semantic.text.inverse,
  },
  text_secondary: {
    color: theme.semantic.text.inverse,
  },
  text_success: {
    color: theme.semantic.text.inverse,
  },
  text_danger: {
    color: theme.semantic.text.inverse,
  },
  text_warning: {
    color: theme.semantic.text.inverse,
  },
  text_outline: {
    color: theme.colors.primary[500],
  },
  text_ghost: {
    color: theme.colors.primary[500],
  },
});

export default Button;
