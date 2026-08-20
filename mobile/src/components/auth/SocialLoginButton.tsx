import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  View,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../hooks/useTheme';
import { SOCIAL_BRAND_COLORS, SocialProvider } from '../../tokens/designTokens';

interface SocialLoginButtonProps {
  provider: SocialProvider;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const SocialLoginButton: React.FC<SocialLoginButtonProps> = ({
  provider,
  onPress,
  loading = false,
  disabled = false,
  style,
  textStyle,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const getProviderConfig = () => {
    const brandColors = SOCIAL_BRAND_COLORS[provider];

    switch (provider) {
      case 'google':
        return {
          colors: brandColors.gradient,
          textColor: theme.semantic.text.inverse,
          icon: 'G',
          label: 'Continue with Google',
          shadowColor: brandColors.shadow,
        };
      case 'apple':
        return {
          colors: brandColors.gradient,
          textColor: theme.semantic.text.inverse,
          icon: '🍎',
          label: 'Continue with Apple',
          shadowColor: brandColors.shadow,
        };
      case 'facebook':
        return {
          colors: brandColors.gradient,
          textColor: theme.semantic.text.inverse,
          icon: 'f',
          label: 'Continue with Facebook',
          shadowColor: brandColors.shadow,
        };
      default:
        return {
          colors: [theme.colors.primary[500], theme.colors.primary[700]],
          textColor: theme.semantic.text.inverse,
          icon: '●',
          label: 'Continue',
          shadowColor: theme.colors.primary[500],
        };
    }
  };

  const config = getProviderConfig();

  const buttonStyle: ViewStyle = {
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    shadowColor: config.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: Platform.OS === 'android' ? 4 : 2,
    opacity: disabled ? 0.6 : 1,
  };

  const contentStyle: TextStyle = {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: config.textColor,
    textAlign: 'center',
    ...textStyle,
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.container, buttonStyle, style]}
      activeOpacity={0.8}
      accessibilityLabel={`Sign in with ${provider}`}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      accessibilityHint={loading ? 'Loading' : `Double tap to sign in with ${provider}`}
    >
      <LinearGradient
        colors={config.colors as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientContainer}
      >
        <View style={styles.content}>
          {loading ? (
            <ActivityIndicator
              size="small"
              color={config.textColor}
              style={styles.spinner}
            />
          ) : (
            <>
              <View style={styles.iconContainer}>
                <Text style={styles.icon}>{config.icon}</Text>
              </View>
              <Text style={contentStyle}>{config.label}</Text>
            </>
          )}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    width: '100%',
    height: 50,
    marginBottom: theme.spacing[2],
  },
  gradientContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing[4],
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  iconContainer: {
    width: theme.spacing[6],
    height: theme.spacing[6],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing[2],
  },
  icon: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.semantic.background.primary,
  },
  spinner: {
    marginRight: theme.spacing[2],
  },
});
