import React, { useRef, useEffect, useMemo } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeProvider';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'gradient';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: 'button' | 'link' | 'none';
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  style,
  textStyle,
  fullWidth = false,
  testID,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'button',
}) => {
  const { theme } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const styles = useMemo(() => createStyles(theme), [theme]);

  useEffect(() => {
    // Subtle shimmer animation for primary/gradient buttons
    if (variant === 'primary' || variant === 'gradient') {
      const shimmerAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: false,
          }),
          Animated.timing(shimmerAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: false,
          }),
        ]),
      );
      shimmerAnimation.start();
      return () => shimmerAnimation.stop();
    }
  }, [variant, shimmerAnim]);

  const handlePressIn = () => {
    if (!disabled && !loading) {
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    }
  };

  const handlePressOut = () => {
    if (!disabled && !loading) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    }
  };

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: theme.borderRadius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      minWidth: fullWidth ? '100%' : 120,
    };

    // Size styles
    const sizeStyles = {
      small: {
        paddingHorizontal: theme.spacing[2],
        paddingVertical: theme.spacing[1],
        minHeight: 44,
      },
      medium: {
        paddingHorizontal: theme.spacing[4],
        paddingVertical: theme.spacing[2],
        minHeight: 44,
      },
      large: {
        paddingHorizontal: theme.spacing[6],
        paddingVertical: theme.spacing[4],
        minHeight: 52,
      },
    };

    // Variant styles with theme awareness
    const variantStyles = {
      primary: {
        backgroundColor: theme.colors.primary[500],
      },
      secondary: {
        backgroundColor: theme.colors.secondary[500],
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: theme.colors.primary[500],
      },
      ghost: {
        backgroundColor: theme.semantic.background.secondary,
      },
      gradient: {
        backgroundColor: 'transparent',
        padding: 0,
        minHeight: size === 'small' ? 32 : size === 'medium' ? 44 : 52,
      },
    };

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles[variant],
      opacity: disabled ? 0.5 : 1,
    };
  };

  const getTextStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      fontFamily: 'System',
      fontWeight: '600',
      textAlign: 'center' as const,
    };

    const sizeStyles = {
      small: {
        fontSize: 12,
        lineHeight: 16,
      },
      medium: {
        fontSize: 14,
        lineHeight: 20,
      },
      large: {
        fontSize: 16,
        lineHeight: 24,
      },
    };

    const variantStyles = {
      primary: {
        color: theme.semantic.background.primary,
      },
      secondary: {
        color: theme.semantic.background.primary,
      },
      outline: {
        color: theme.colors.primary[500],
      },
      ghost: {
        color: theme.semantic.text.primary,
      },
      gradient: {
        color: theme.semantic.background.primary,
        fontWeight: '700' as const,
      },
    };

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles[variant],
    };
  };

  const buttonStyle = getButtonStyle();
  const buttonTextStyle = getTextStyle();

  const handlePress = () => {
    if (!disabled && !loading && onPress) {
      onPress();
    }
  };

  const renderIcon = () => {
    if (!icon) {return null;}
    return (
      <View style={[styles.icon, iconPosition === 'right' && styles.iconRight]}>
        {icon}
      </View>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'ghost' ? theme.colors.primary[500] : theme.semantic.background.primary}
        />
      );
    }

    return (
      <>
        {iconPosition === 'left' && renderIcon()}
        <Text style={[buttonTextStyle, textStyle, icon && styles.textWithIcon]}>
          {title}
        </Text>
        {iconPosition === 'right' && renderIcon()}
      </>
    );
  };

  if (variant === 'gradient') {
    return (
      <Animated.View style={[style, fullWidth && styles.fullWidth, { transform: [{ scale: scaleAnim }] }]}>
        <LinearGradient
          colors={[theme.colors.primary[600], theme.colors.primary[400]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[buttonStyle, fullWidth && styles.fullWidth]}>
          <Animated.View
            style={[
              styles.shimmerOverlay,
              {
                opacity: shimmerAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0, 0.3, 0],
                }),
              },
            ]}
          />
          <TouchableOpacity
            onPress={handlePress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={disabled || loading}
            style={styles.touchable}
            activeOpacity={1}
            testID={testID}
            accessible={true}
            accessibilityRole={accessibilityRole}
            accessibilityLabel={accessibilityLabel || title}
            accessibilityHint={accessibilityHint}
            accessibilityState={{ disabled: disabled || loading, busy: loading }}
          >
            {renderContent()}
          </TouchableOpacity>
        </LinearGradient>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        buttonStyle,
        style,
        fullWidth && styles.fullWidth,
        { transform: [{ scale: scaleAnim }] },
      ]}
    >
      {(variant === 'primary') && (
        <Animated.View
          style={[
            styles.shimmerOverlay,
            {
              opacity: shimmerAnim.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0, 0.2, 0],
              }),
            },
          ]}
        />
      )}
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={styles.touchable}
        activeOpacity={1}
        testID={testID}
        accessible={true}
        accessibilityRole={accessibilityRole}
        accessibilityLabel={accessibilityLabel || title}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: disabled || loading, busy: loading }}
      >
        {renderContent()}
      </TouchableOpacity>
    </Animated.View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  fullWidth: {
    width: '100%',
  },
  touchable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    width: '100%',
    zIndex: 1,
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: -100,
    width: 100,
    height: '100%',
    backgroundColor: theme.colors.overlay.lightMedium,
    transform: [{ skewX: '-15deg' }],
    zIndex: 0,
  },
  icon: {
    marginRight: 4,
  },
  iconRight: {
    marginRight: 0,
    marginLeft: 4,
  },
  textWithIcon: {
    marginHorizontal: 0,
  },
});
