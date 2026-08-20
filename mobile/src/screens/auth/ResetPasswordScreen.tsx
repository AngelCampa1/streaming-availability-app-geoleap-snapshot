import React, { useState, useEffect, useRef } from 'react';
import { View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  TouchableOpacity,
  Alert,
  Animated,
  Dimensions,
  StatusBar,
  Platform } from 'react-native';
// SafeAreaView import removed - not used
import { StackScreenProps } from '@react-navigation/stack';
import { AuthStackParamList } from '../../navigation/types';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import { PasswordInput } from '../../components/auth/PasswordInput';
import { ValidationMessage, useValidation } from '../../components/auth/ValidationMessage';
import { useTheme } from '../../hooks/useTheme';
import { logger } from '../../utils/logger';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type Props = StackScreenProps<AuthStackParamList, 'ResetPassword'>;

export const ResetPasswordScreen: React.FC<Props> = ({ route, navigation }) => {
  const { theme } = useTheme();
  const { state, resetPassword, clearError } = useAuth();
  const { validateField } = useValidation();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isFormValid, setIsFormValid] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  // Get token from route params (this would typically come from email link)
  const { token } = route.params || {};

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Animate screen entrance
    const animateEntrance = () => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start();
    };

    animateEntrance();
  }, []);

  useEffect(() => {
    // Validate form whenever password changes
    validateForm();
  }, [password, confirmPassword]);

  useEffect(() => {
    // Handle auth errors
    if (state.error) {
      Alert.alert('Reset Password Error', state.error, [
        { text: 'OK', onPress: clearError },
      ]);
    }
  }, [state.error, clearError]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Password validation
    const passwordError = validateField({
      value: password,
      required: true,
      minLength: 8,
      type: 'password',
    });
    if (passwordError) {newErrors.password = passwordError;}

    // Confirm password validation
    if (confirmPassword && password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    }

    setErrors(newErrors);
    setIsFormValid(Object.keys(newErrors).length === 0 && password.length > 0 && confirmPassword.length > 0);
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);

    // Clear error when user starts typing
    if (errors.password) {
      setErrors(prev => ({ ...prev, password: '' }));
    }
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);

    // Clear error when user starts typing
    if (errors.confirmPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: '' }));
    }
  };

  const handlePasswordStrengthChange = (strength: number) => {
    setPasswordStrength(strength);
  };

  const handleResetPassword = async () => {
    if (!isFormValid) {
      validateForm();
      return;
    }

    try {
      // Haptic feedback
      const buttonScale = Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]);
      buttonScale.start();

      await resetPassword({
        token,
        newPassword: password,
        confirmPassword,
      });

      // Success - navigate to login
      Alert.alert(
        'Password Reset Successful',
        'Your password has been reset successfully. You can now sign in with your new password.',
        [
          {
            text: 'Sign In',
            onPress: () => navigation.navigate('Login'),
          },
        ],
      );
    } catch (error) {
      // Error is handled by AuthContext
      logger.error('[ResetPasswordScreen] Password reset failed', error);
    }
  };

  const getPasswordStrengthColor = () => {
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

  const getPasswordStrengthText = () => {
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

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.semantic.background.primary,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      minHeight: SCREEN_HEIGHT,
      paddingBottom: theme.spacing[8],
    },
    backgroundDecoration: {
      position: 'absolute',
      top: -100,
      right: -100,
      width: 300,
      height: 300,
      borderRadius: 150,
      backgroundColor: theme.colors.primary[500] + '10',
    },
    header: {
      alignItems: 'center',
      paddingTop: theme.spacing[12],
      paddingHorizontal: theme.spacing[6],
      marginBottom: theme.spacing[8],
    },
    iconContainer: {
      width: 80,
      height: 80,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.primary[500] + '20',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing[6],
    },
    headerIcon: {
      fontSize: theme.typography.fontSize['4xl'],
    },
    title: {
      fontSize: theme.typography.fontSize["2xl"], fontWeight: theme.typography.fontWeight.bold,
      color: theme.semantic.text.primary,
      textAlign: 'center',
      marginBottom: theme.spacing[4],
    },
    subtitle: {
      fontSize: theme.typography.fontSize.base, fontWeight: theme.typography.fontWeight.normal,
      color: theme.semantic.text.secondary,
      textAlign: 'center',
      lineHeight: theme.typography.fontSize.base * theme.typography.lineHeight.relaxed,
    },
    formContainer: {
      paddingHorizontal: theme.spacing[6],
      flex: 1,
    },
    strengthContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: theme.spacing[2],
      marginBottom: theme.spacing[4],
    },
    strengthBar: {
      flex: 1,
      flexDirection: 'row',
      height: 4,
      backgroundColor: theme.semantic.border.primary,
      borderRadius: theme.borderRadius.sm,
      marginRight: theme.spacing[2],
    },
    strengthSegment: {
      flex: 1,
      marginHorizontal: 1,
      borderRadius: theme.borderRadius.sm,
    },
    strengthText: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
      minWidth: 60,
    },
    submitButton: {
      marginBottom: theme.spacing[8],
    },
    requirementsContainer: {
      backgroundColor: theme.semantic.background.secondary,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing[4],
      marginBottom: theme.spacing[6],
      ...theme.shadows.sm,
    },
    requirementsTitle: {
      fontSize: theme.typography.fontSize.base, fontWeight: theme.typography.fontWeight.semibold,
      color: theme.semantic.text.primary,
      marginBottom: theme.spacing[2],
    },
    requirementText: {
      fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.normal,
      color: theme.semantic.text.secondary,
      marginBottom: theme.spacing[1],
      paddingLeft: theme.spacing[2],
    },
    tipsContainer: {
      backgroundColor: theme.colors.info[500] + '10',
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing[4],
      marginBottom: theme.spacing[8],
      borderLeftWidth: 4,
      borderLeftColor: theme.colors.info[500],
    },
    tipsTitle: {
      fontSize: theme.typography.fontSize.base, fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.info[500],
      marginBottom: theme.spacing[2],
    },
    tipText: {
      fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.normal,
      color: theme.semantic.text.secondary,
      marginBottom: theme.spacing[1],
      paddingLeft: theme.spacing[2],
    },
    backContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: theme.spacing[8],
    },
    backText: {
      fontSize: theme.typography.fontSize.base, fontWeight: theme.typography.fontWeight.normal,
      color: theme.semantic.text.secondary,
    },
    backLink: {
      fontSize: theme.typography.fontSize.base, fontWeight: theme.typography.fontWeight.normal,
      color: theme.colors.primary[500],
    },
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
    >
      <StatusBar
        barStyle={'dark-content'}
        backgroundColor={theme.semantic.background.primary}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Background decoration */}
        <View style={styles.backgroundDecoration} />

        {/* Header */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.iconContainer}>
            <Text style={styles.headerIcon}>🔑</Text>
          </View>
          <Text style={styles.title}>Create New Password</Text>
          <Text style={styles.subtitle}>
            Your new password must be different from previous used passwords.
          </Text>
        </Animated.View>

        {/* Form */}
        <Animated.View
          style={[
            styles.formContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <PasswordInput
            label="New Password"
            value={password}
            onChangeText={handlePasswordChange}
            placeholder="Enter your new password"
            error={errors.password}
            showStrengthIndicator
            onStrengthChange={handlePasswordStrengthChange}
          />

          {/* Password strength indicator */}
          {password && passwordStrength > 0 && (
            <View style={styles.strengthContainer}>
              <View style={styles.strengthBar}>
                {[1, 2, 3, 4].map((level) => (
                  <View
                    key={level}
                    style={[
                      styles.strengthSegment,
                      {
                        backgroundColor: level <= passwordStrength ? getPasswordStrengthColor() : theme.semantic.border.primary,
                      },
                    ]}
                  />
                ))}
              </View>
              <Text style={[styles.strengthText, { color: getPasswordStrengthColor() }]}>
                {getPasswordStrengthText()}
              </Text>
            </View>
          )}

          <PasswordInput
            label="Confirm New Password"
            value={confirmPassword}
            onChangeText={handleConfirmPasswordChange}
            placeholder="Confirm your new password"
            error={errors.confirmPassword}
            showStrengthIndicator={false}
          />

          {errors.confirmPassword && (
            <ValidationMessage
              type="error"
              message={errors.confirmPassword}
              visible={!!errors.confirmPassword}
            />
          )}

          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <Button
              title="Reset Password"
              onPress={handleResetPassword}
              loading={state.isLoading}
              disabled={!isFormValid || state.isLoading}
              variant="gradient"
              size="large"
              fullWidth
              style={styles.submitButton}
            />
          </Animated.View>

          <View style={styles.requirementsContainer}>
            <Text style={styles.requirementsTitle}>Password Requirements:</Text>
            <Text style={styles.requirementText}>• At least 8 characters long</Text>
            <Text style={styles.requirementText}>• Contains uppercase and lowercase letters</Text>
            <Text style={styles.requirementText}>• Contains at least one number</Text>
            <Text style={styles.requirementText}>• Contains at least one special character</Text>
          </View>

          {/* Security tips */}
          <View style={styles.tipsContainer}>
            <Text style={styles.tipsTitle}>Security Tips:</Text>
            <Text style={styles.tipText}>• Use a combination of letters, numbers, and symbols</Text>
            <Text style={styles.tipText}>• Avoid using personal information</Text>
            <Text style={styles.tipText}>• Don't reuse passwords from other accounts</Text>
            <Text style={styles.tipText}>• Consider using a password manager</Text>
          </View>

          {/* Back to login link */}
          <View style={styles.backContainer}>
            <Text style={styles.backText}>Remember your password? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.backLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default ResetPasswordScreen;
