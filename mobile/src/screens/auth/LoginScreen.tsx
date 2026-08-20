import React, { useState, useEffect, useRef } from 'react';
import { View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Animated,
  Dimensions,
  StatusBar,
  AccessibilityInfo,
  Platform,
  Image } from 'react-native';
import { LOGOS } from '@/assets';
import { StackScreenProps } from '@react-navigation/stack';
import { AuthStackParamList } from '../../navigation/types';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { SocialLoginButton } from '../../components/auth/SocialLoginButton';
import { useValidation } from '../../components/auth/ValidationMessage';
import { logger } from '../../utils/logger';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type Props = StackScreenProps<AuthStackParamList, 'Login'>;

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const { state, login, loginWithBiometric, loginWithSocial, clearError } = useAuth();
  const { validateField } = useValidation();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
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
    // Validate form whenever form data changes
    validateForm();
  }, [formData]);

  useEffect(() => {
    // Handle auth errors
    if (state.error) {
      Alert.alert('Login Error', state.error, [
        { text: 'OK', onPress: clearError },
      ]);
    }
  }, [state.error, clearError]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Email validation
    const emailError = validateField({
      value: formData.email,
      required: true,
      type: 'email',
    });
    if (emailError) {newErrors.email = emailError;}

    // Password validation
    const passwordError = validateField({
      value: formData.password,
      required: true,
      minLength: 8,
    });
    if (passwordError) {newErrors.password = passwordError;}

    setErrors(newErrors);
    setIsFormValid(Object.keys(newErrors).length === 0 && !!formData.email && !!formData.password);
  };

  const handleInputChange = <K extends keyof typeof formData>(
    field: K,
    value: typeof formData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }) as typeof formData);

    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleLogin = async () => {
    if (!isFormValid) {
      validateForm();
      return;
    }

    try {
      await login({
        email: formData.email,
        password: formData.password,
        rememberMe: formData.rememberMe,
      });

      // Success announcement for accessibility
      AccessibilityInfo.announceForAccessibility(
        'Login successful. Welcome back!',
      );
    } catch (error) {
      // Error is handled by AuthContext
      logger.error('[LoginScreen] Login failed', error);
    }
  };

  const handleBiometricLogin = async () => {
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

      await loginWithBiometric();

      AccessibilityInfo.announceForAccessibility(
        'Biometric authentication successful. Welcome back!',
      );
    } catch (error) {
      logger.error('[LoginScreen] Biometric login failed', error);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'apple' | 'facebook') => {
    try {
      await loginWithSocial(provider);

      AccessibilityInfo.announceForAccessibility(
        `${provider} sign-in successful. Welcome!`,
      );
    } catch (error) {
      logger.error(`[LoginScreen] ${provider} login failed`, error);
    }
  };

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

  const handleSignUp = () => {
    navigation.navigate('Register');
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
      paddingBottom: theme.spacing[20], // xl = 20
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
      paddingTop: theme.spacing[32], // xxl = 32
      paddingHorizontal: theme.spacing[6], // lg = 6
      marginBottom: theme.spacing[20], // xl = 20
    },
    logoContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing[2], // sm = 2
    },
    logo: {
      width: 64,
      height: 64,
      marginRight: theme.spacing[2], // sm = 2
    },
    brandName: {
      fontSize: theme.typography.fontSize['3xl'],
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.primary[600],
    },
    subtitle: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.normal,
      lineHeight: theme.typography.fontSize.base * theme.typography.lineHeight.normal,
      color: theme.semantic.text.secondary,
      textAlign: 'center' as const,
    },
    formContainer: {
      paddingHorizontal: theme.spacing[6], // lg = 6
      flex: 1,
    },
    title: {
      fontSize: theme.typography.fontSize['2xl'],
      fontWeight: theme.typography.fontWeight.bold,
      lineHeight: theme.typography.fontSize['2xl'] * theme.typography.lineHeight.tight,
      color: theme.semantic.text.primary,
      marginBottom: theme.spacing[1], // xs = 1
      textAlign: 'center' as const,
    },
    description: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.normal,
      lineHeight: theme.typography.fontSize.base * theme.typography.lineHeight.normal,
      color: theme.semantic.text.secondary,
      textAlign: 'center' as const,
      marginBottom: theme.spacing[20], // xl = 20
    },
    inputIcon: {
      fontSize: theme.typography.fontSize.lg,
      color: theme.semantic.text.secondary,
    },
    formRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing[6], // lg = 6
    },
    checkboxContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 4,
      borderWidth: 2,
      borderColor: theme.semantic.border.primary,
      marginRight: theme.spacing[2], // sm = 2
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxChecked: {
      backgroundColor: theme.colors.primary[600],
      borderColor: theme.colors.primary[600],
    },
    checkmark: {
      color: theme.semantic.text.inverse,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
    },
    checkboxLabel: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.normal,
      color: theme.semantic.text.primary,
    },
    forgotPasswordText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.primary[600],
      fontWeight: theme.typography.fontWeight.medium,
    },
    loginButton: {
      marginBottom: theme.spacing[4], // md = 4
    },
    biometricButton: {
      marginBottom: theme.spacing[6], // lg = 6
    },
    biometricIcon: {
      fontSize: theme.typography.fontSize.lg,
    },
    dividerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: theme.spacing[6], // lg = 6
    },
    divider: {
      flex: 1,
      height: 1,
      backgroundColor: theme.semantic.border.primary,
    },
    dividerText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.semantic.text.secondary,
      marginHorizontal: theme.spacing[4], // md = 4
    },
    signUpContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: theme.spacing[20], // xl = 20
    },
    signUpText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.normal,
      color: theme.semantic.text.secondary,
    },
    signUpLink: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.primary[600],
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle={'dark-content'}
        backgroundColor={theme.semantic.background.primary}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
      >

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        accessible={true}
        accessibilityLabel="Login screen content"
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
          <View style={styles.logoContainer}>
            <Image
              source={LOGOS.transparent}
              style={styles.logo}
              resizeMode="contain"
              accessibilityLabel="GeoLeap logo"
            />
            <Text style={styles.brandName}>GeoLeap</Text>
          </View>
          <Text style={styles.subtitle}>Find your next favorite</Text>
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
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.description}>Sign in to continue to your account</Text>

          {/* Email Input */}
          <Input
            label="Email Address"
            value={formData.email}
            onChangeText={(value) => handleInputChange('email', value)}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            error={errors.email}
            leftIcon={<Text style={styles.inputIcon}>📧</Text>}
            testID="email-input"
            accessibilityLabel="Email address input field"
            accessibilityHint="Enter your email address to sign in"
          />

          {/* Password Input */}
          <Input
            label="Password"
            value={formData.password}
            onChangeText={(value) => handleInputChange('password', value)}
            placeholder="Enter your password"
            secureTextEntry={!showPassword}
            error={errors.password}
            leftIcon={<Text style={styles.inputIcon}>🔒</Text>}
            rightIcon={
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Text style={styles.inputIcon}>
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </Text>
              </TouchableOpacity>
            }
            testID="password-input"
            accessibilityLabel="Password input field"
            accessibilityHint="Enter your password to sign in"
          />

          {/* Remember me and Forgot password */}
          <View style={styles.formRow}>
            <TouchableOpacity
              style={[styles.checkboxContainer, { minHeight: 44 }]}
              onPress={() => handleInputChange('rememberMe', !formData.rememberMe)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: formData.rememberMe }}
              accessibilityLabel="Remember me"
              accessibilityHint="Double tap to toggle remember me option"
            >
              <View style={[styles.checkbox, formData.rememberMe && styles.checkboxChecked]}>
                {formData.rememberMe && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>Remember me</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleForgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot password?</Text>
            </TouchableOpacity>
          </View>

          {/* Login Button */}
          <Button
            title="Sign In"
            onPress={handleLogin}
            loading={state.isLoading}
            disabled={!isFormValid || state.isLoading}
            variant="gradient"
            size="large"
            fullWidth
            style={styles.loginButton}
            testID="login-button"
            accessibilityLabel="Sign in button"
            accessibilityHint="Tap to sign in with your email and password"
          />

          {/* Biometric Login */}
          {state.biometricAvailable && (
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              <Button
                title={`Sign in with ${state.biometricType === 'TouchID' ? 'Touch ID' : 'Face ID'}`}
                onPress={handleBiometricLogin}
                variant="outline"
                size="medium"
                fullWidth
                icon={<Text style={styles.biometricIcon}>
                  {state.biometricType === 'TouchID' ? '👆' : '👤'}
                </Text>}
                style={styles.biometricButton}
                testID="biometric-login-button"
                accessibilityLabel="Biometric authentication button"
                accessibilityHint="Tap to use fingerprint or face recognition to sign in"
              />
            </Animated.View>
          )}

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>Or continue with</Text>
            <View style={styles.divider} />
          </View>

          {/* Social Login Buttons */}
          <SocialLoginButton
            provider="google"
            onPress={() => handleSocialLogin('google')}
            loading={state.isLoading}
          />

          {Platform.OS === 'ios' && (
            <SocialLoginButton
              provider="apple"
              onPress={() => handleSocialLogin('apple')}
              loading={state.isLoading}
            />
          )}

          {/* Sign Up Link */}
          <View style={styles.signUpContainer}>
            <Text style={styles.signUpText}>Don't have an account? </Text>
            <TouchableOpacity onPress={handleSignUp}>
              <Text style={styles.signUpLink}>Sign up</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LoginScreen;
