import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackScreenProps } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { AuthStackParamList } from '../../navigation/types';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { useValidation } from '../../components/auth/ValidationMessage';
import { useTheme } from '../../hooks/useTheme';
import { logger } from '../../utils/logger';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type Props = StackScreenProps<AuthStackParamList, 'ForgotPassword'>;

export const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const { state, forgotPassword, clearError } = useAuth();
  const { validateField } = useValidation();

  // BUG-M16: Add header navigation with back button for consistency
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTitle: 'Reset Password',
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{
            minWidth: 44,
            minHeight: 44,
            justifyContent: 'center',
            alignItems: 'center',
            marginLeft: 8,
          }}
          accessibilityLabel="Go back"
          accessibilityRole="button"
          accessibilityHint="Double tap to go back to previous screen"
        >
          <Icon name="arrow-back" size={24} color={theme.semantic.text.primary} />
        </TouchableOpacity>
      ),
      headerStyle: {
        backgroundColor: theme.semantic.background.primary,
        borderBottomColor: theme.semantic.border.primary,
        borderBottomWidth: 1,
        shadowColor: 'transparent',
        elevation: 0,
      },
      headerTintColor: theme.semantic.text.primary,
      headerTitleStyle: {
        fontSize: 18,
        fontWeight: '600',
      },
    });
  }, [navigation, theme]);

  const [email, setEmail] = useState('');
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isFormValid, setIsFormValid] = useState(false);

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
    // Validate form whenever email changes
    validateForm();
  }, [email]);

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

    // Email validation
    const emailError = validateField({
      value: email,
      required: true,
      type: 'email',
    });
    if (emailError) {newErrors.email = emailError;}

    setErrors(newErrors);
    setIsFormValid(Object.keys(newErrors).length === 0 && email.length > 0);
  };

  const handleInputChange = (value: string) => {
    setEmail(value);

    // Clear error when user starts typing
    if (errors.email) {
      setErrors(prev => ({ ...prev, email: '' }));
    }
  };

  const handleSendResetEmail = async () => {
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

      await forgotPassword({ email: email.toLowerCase().trim() });
      setIsEmailSent(true);
    } catch (error) {
      // Error is handled by AuthContext
      logger.error('[ForgotPasswordScreen] Forgot password request failed', error);
    }
  };

  const handleResendEmail = async () => {
    setIsEmailSent(false);
    await handleSendResetEmail();
  };

  const handleBackToLogin = () => {
    navigation.navigate('Login');
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
    inputIcon: {
      fontSize: theme.typography.fontSize.lg,
      color: theme.semantic.text.secondary,
    },
    submitButton: {
      marginBottom: theme.spacing[8],
    },
    tipsContainer: {
      backgroundColor: theme.semantic.background.secondary,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing[4],
      marginBottom: theme.spacing[8],
      ...theme.shadows.sm,
    },
    tipsTitle: {
      fontSize: theme.typography.fontSize.base, fontWeight: theme.typography.fontWeight.semibold,
      color: theme.semantic.text.primary,
      marginBottom: theme.spacing[2],
    },
    tipText: {
      fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.normal,
      color: theme.semantic.text.secondary,
      marginBottom: theme.spacing[1],
      paddingLeft: theme.spacing[2],
    },
    signInContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: theme.spacing[8],
    },
    signInText: {
      fontSize: theme.typography.fontSize.base, fontWeight: theme.typography.fontWeight.normal,
      color: theme.semantic.text.secondary,
    },
    signInLink: {
      fontSize: theme.typography.fontSize.base, fontWeight: theme.typography.fontWeight.normal,
      color: theme.colors.primary[500],
    },
    // Success screen styles
    successContainer: {
      alignItems: 'center',
      paddingTop: theme.spacing[12],
      paddingHorizontal: theme.spacing[6],
      flex: 1,
    },
    successIconContainer: {
      width: 100,
      height: 100,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.success[500] + '20',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing[8],
    },
    successIcon: {
      fontSize: theme.typography.fontSize['5xl'],
    },
    successTitle: {
      fontSize: theme.typography.fontSize["2xl"], fontWeight: theme.typography.fontWeight.bold,
      color: theme.semantic.text.primary,
      textAlign: 'center',
      marginBottom: theme.spacing[4],
    },
    successMessage: {
      fontSize: theme.typography.fontSize.base, fontWeight: theme.typography.fontWeight.normal,
      color: theme.semantic.text.secondary,
      textAlign: 'center',
      marginBottom: theme.spacing[4],
    },
    emailContainer: {
      backgroundColor: theme.semantic.background.secondary,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing[4],
      marginBottom: theme.spacing[6],
      ...theme.shadows.sm,
    },
    emailText: {
      fontSize: theme.typography.fontSize.base, fontWeight: theme.typography.fontWeight.normal,
      color: theme.colors.primary[500],
      textAlign: 'center',
    },
    instructionText: {
      fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.normal,
      color: theme.semantic.text.secondary,
      textAlign: 'center',
      lineHeight: theme.typography.fontSize.sm * theme.typography.lineHeight.relaxed,
      marginBottom: theme.spacing[8],
    },
    actionButtons: {
      width: '100%',
      gap: theme.spacing[4],
      marginBottom: theme.spacing[8],
    },
    primaryButton: {
      marginBottom: 0,
    },
    secondaryButton: {
      marginBottom: 0,
    },
  });

  if (isEmailSent) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar
          barStyle={'dark-content'}
          backgroundColor={theme.semantic.background.primary}
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Background decoration */}
          <View style={styles.backgroundDecoration} />

          {/* Success content */}
          <Animated.View
            style={[
              styles.successContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.successIconContainer}>
              <Text style={styles.successIcon}>✉️</Text>
            </View>

            <Text style={styles.successTitle}>Check Your Email</Text>

            <Text style={styles.successMessage}>
              We've sent a password reset link to:
            </Text>

            <View style={styles.emailContainer}>
              <Text style={styles.emailText}>{email}</Text>
            </View>

            <Text style={styles.instructionText}>
              Click the link in the email to reset your password. If you don't see the email, check your spam folder.
            </Text>

            <View style={styles.actionButtons}>
              <Button
                title="Back to Sign In"
                onPress={handleBackToLogin}
                variant="gradient"
                size="large"
                fullWidth
                style={styles.primaryButton}
              />

              <Button
                title="Resend Email"
                onPress={handleResendEmail}
                variant="outline"
                size="medium"
                fullWidth
                loading={state.isLoading}
                style={styles.secondaryButton}
              />
            </View>

            <View style={styles.tipsContainer}>
              <Text style={styles.tipsTitle}>Tips:</Text>
              <Text style={styles.tipText}>• The reset link expires in 24 hours</Text>
              <Text style={styles.tipText}>• Make sure to check your spam folder</Text>
              <Text style={styles.tipText}>• If you still can't find it, contact support</Text>
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    );
  }

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
            <Text style={styles.headerIcon}>🔐</Text>
          </View>
          <Text style={styles.title}>Forgot Password?</Text>
          <Text style={styles.subtitle}>
            No worries! Enter your email address and we'll send you a link to reset your password.
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
          <Input
            label="Email Address"
            value={email}
            onChangeText={handleInputChange}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            error={errors.email}
            leftIcon={<Text style={styles.inputIcon}>📧</Text>}
          />


          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <Button
              title="Send Reset Link"
              onPress={handleSendResetEmail}
              loading={state.isLoading}
              disabled={!isFormValid || state.isLoading}
              variant="gradient"
              size="large"
              fullWidth
              style={styles.submitButton}
            />
          </Animated.View>

          <View style={styles.tipsContainer}>
            <Text style={styles.tipsTitle}>Password Reset Tips:</Text>
            <Text style={styles.tipText}>• Make sure to enter the email you registered with</Text>
            <Text style={styles.tipText}>• The reset link will be valid for 24 hours</Text>
            <Text style={styles.tipText}>• Check your spam/junk folder if you don't see the email</Text>
          </View>

          {/* Sign in link */}
          <View style={styles.signInContainer}>
            <Text style={styles.signInText}>Remember your password? </Text>
            <TouchableOpacity onPress={handleBackToLogin}>
              <Text style={styles.signInLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default ForgotPasswordScreen;
