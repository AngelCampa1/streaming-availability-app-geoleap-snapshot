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
  Platform,
  Image } from 'react-native';
import { LOGOS } from '@/assets';
import { StackScreenProps } from '@react-navigation/stack';
import { AuthStackParamList } from '../../navigation/types';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { PasswordInput } from '../../components/auth/PasswordInput';
import { SocialLoginButton } from '../../components/auth/SocialLoginButton';
import { ValidationMessage, useValidation } from '../../components/auth/ValidationMessage';
import { useTheme } from '../../hooks/useTheme';
import { logger } from '../../utils/logger';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type Props = StackScreenProps<AuthStackParamList, 'Register'>;

type RegistrationStep = 'account' | 'profile' | 'password' | 'terms' | 'success';

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  agreeToTerms: boolean;
  marketingEmails: boolean;
}

const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const { state, register, clearError } = useAuth();
  const { validateField } = useValidation();

  const [currentStep, setCurrentStep] = useState<RegistrationStep>('account');
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    agreeToTerms: false,
    marketingEmails: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isStepValid, setIsStepValid] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const steps: { key: RegistrationStep; title: string; description: string }[] = [
    {
      key: 'account',
      title: 'Account Information',
      description: 'Enter your email address',
    },
    {
      key: 'profile',
      title: 'Personal Information',
      description: 'Tell us about yourself',
    },
    {
      key: 'password',
      title: 'Security',
      description: 'Create a strong password',
    },
    {
      key: 'terms',
      title: 'Terms & Privacy',
      description: 'Review and agree to terms',
    },
    {
      key: 'success',
      title: 'Welcome!',
      description: 'Your account has been created',
    },
  ];

  const currentStepIndex = steps.findIndex(step => step.key === currentStep);

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
    // Update progress animation
    Animated.timing(progressAnim, {
      toValue: currentStepIndex / (steps.length - 1),
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [currentStepIndex]);

  useEffect(() => {
    // Validate current step
    validateCurrentStep();
  }, [formData, currentStep]);

  useEffect(() => {
    // Handle auth errors
    if (state.error) {
      Alert.alert('Registration Error', state.error, [
        { text: 'OK', onPress: clearError },
      ]);
    }
  }, [state.error, clearError]);

  const validateCurrentStep = () => {
    const newErrors: Record<string, string> = {};

    switch (currentStep) {
      case 'account': {
        const emailError = validateField({
          value: formData.email,
          required: true,
          type: 'email',
        });
        if (emailError) {newErrors.email = emailError;}
        break;
      }

      case 'profile':
        if (!formData.firstName.trim()) {
          newErrors.firstName = 'First name is required';
        }
        if (!formData.lastName.trim()) {
          newErrors.lastName = 'Last name is required';
        }
        break;

      case 'password': {
        const passwordError = validateField({
          value: formData.password,
          required: true,
          minLength: 8,
          type: 'password',
        });
        if (passwordError) {newErrors.password = passwordError;}
      }

        if (formData.password !== formData.confirmPassword) {
          newErrors.confirmPassword = 'Passwords do not match';
        }
        break;

      case 'terms':
        if (!formData.agreeToTerms) {
          newErrors.terms = 'You must agree to the terms and conditions';
        }
        break;

      default:
        break;
    }

    setErrors(newErrors);
    setIsStepValid(Object.keys(newErrors).length === 0);
  };

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleNext = () => {
    if (!isStepValid) {
      validateCurrentStep();
      return;
    }

    const stepOrder: RegistrationStep[] = ['account', 'profile', 'password', 'terms', 'success'];
    const currentIndex = stepOrder.indexOf(currentStep);

    if (currentIndex < stepOrder.length - 1) {
      setCurrentStep(stepOrder[currentIndex + 1]);
    }
  };

  const handlePrevious = () => {
    const stepOrder: RegistrationStep[] = ['account', 'profile', 'password', 'terms', 'success'];
    const currentIndex = stepOrder.indexOf(currentStep);

    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1]);
    }
  };

  const handleRegister = async () => {
    try {
      await register({
        email: formData.email.toLowerCase().trim(),
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        agreeToTerms: formData.agreeToTerms,
      });

      setCurrentStep('success');
    } catch (error) {
      // Error is handled by AuthContext
      logger.error('[RegisterScreen] Registration failed', error);
    }
  };

  const handleSocialRegister = async (provider: 'google' | 'apple' | 'facebook') => {
    try {
      // For social registration, we would typically collect minimal info
      // and let the OAuth provider handle authentication
      logger.log(`[RegisterScreen] Social registration with ${provider}`);
      // await loginWithSocial(provider);
    } catch (error) {
      logger.error(`[RegisterScreen] ${provider} registration failed`, error);
    }
  };

  const renderAccountStep = () => (
    <View style={styles.stepContent}>
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
      />

      <View style={styles.dividerContainer}>
        <View style={styles.divider} />
        <Text style={styles.dividerText}>Or sign up with</Text>
        <View style={styles.divider} />
      </View>

      <SocialLoginButton
        provider="google"
        onPress={() => handleSocialRegister('google')}
        loading={state.isLoading}
      />

      {Platform.OS === 'ios' && (
        <SocialLoginButton
          provider="apple"
          onPress={() => handleSocialRegister('apple')}
          loading={state.isLoading}
        />
      )}
    </View>
  );

  const renderProfileStep = () => (
    <View style={styles.stepContent}>
      <Input
        label="First Name"
        value={formData.firstName}
        onChangeText={(value) => handleInputChange('firstName', value)}
        placeholder="Enter your first name"
        autoCapitalize="words"
        error={errors.firstName}
        leftIcon={<Text style={styles.inputIcon}>👤</Text>}
      />

      <Input
        label="Last Name"
        value={formData.lastName}
        onChangeText={(value) => handleInputChange('lastName', value)}
        placeholder="Enter your last name"
        autoCapitalize="words"
        error={errors.lastName}
        leftIcon={<Text style={styles.inputIcon}>👤</Text>}
      />
    </View>
  );

  const renderPasswordStep = () => (
    <View style={styles.stepContent}>
      <PasswordInput
        label="Password"
        value={formData.password}
        onChangeText={(value) => handleInputChange('password', value)}
        placeholder="Create a strong password"
        error={errors.password}
        showStrengthIndicator
        onStrengthChange={(_strength) => {
          // Handle password strength changes if needed
        }}
      />

      <PasswordInput
        label="Confirm Password"
        value={formData.confirmPassword}
        onChangeText={(value) => handleInputChange('confirmPassword', value)}
        placeholder="Confirm your password"
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
    </View>
  );

  const renderTermsStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.termsContainer}>
        <TouchableOpacity
          style={[styles.checkboxContainer, { minHeight: 44, minWidth: 44 }]}
          onPress={() => handleInputChange('agreeToTerms', !formData.agreeToTerms)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: formData.agreeToTerms }}
          accessibilityLabel="I agree to the Terms of Service and Privacy Policy"
          accessibilityHint="Required. Double tap to toggle agreement"
        >
          <View style={[styles.checkbox, formData.agreeToTerms && styles.checkboxChecked]}>
            {formData.agreeToTerms && <Text style={styles.checkmark}>✓</Text>}
          </View>
        </TouchableOpacity>

        <View style={styles.termsTextContainer}>
          <Text style={styles.termsText}>
            I agree to the{' '}
            <Text style={styles.linkText}>Terms of Service</Text>
            {' '}and{' '}
            <Text style={styles.linkText}>Privacy Policy</Text>
          </Text>
          {errors.terms && (
            <Text style={styles.errorText}>{errors.terms}</Text>
          )}
        </View>
      </View>

      <View style={styles.termsContainer}>
        <TouchableOpacity
          style={[styles.checkboxContainer, { minHeight: 44, minWidth: 44 }]}
          onPress={() => handleInputChange('marketingEmails', !formData.marketingEmails)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: formData.marketingEmails }}
          accessibilityLabel="Receive marketing emails about new features and updates"
          accessibilityHint="Optional. Double tap to toggle"
        >
          <View style={[styles.checkbox, formData.marketingEmails && styles.checkboxChecked]}>
            {formData.marketingEmails && <Text style={styles.checkmark}>✓</Text>}
          </View>
        </TouchableOpacity>

        <View style={styles.termsTextContainer}>
          <Text style={styles.termsText}>
            I would like to receive marketing emails about new features and updates
          </Text>
        </View>
      </View>
    </View>
  );

  const renderSuccessStep = () => (
    <View style={styles.successContent}>
      <Image
        source={LOGOS.transparent}
        style={styles.successLogo}
        resizeMode="contain"
        accessibilityLabel="GeoLeap logo"
      />
      <Text style={styles.successTitle}>Welcome to GeoLeap!</Text>
      <Text style={styles.successMessage}>
        Your account has been created successfully. You can now start exploring and finding your next favorite shows and movies.
      </Text>

      <Button
        title="Get Started"
        onPress={() => {
          // Navigate to main app
          navigation.replace('Login');
        }}
        variant="gradient"
        size="large"
        fullWidth
        style={styles.successButton}
      />
    </View>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 'account':
        return renderAccountStep();
      case 'profile':
        return renderProfileStep();
      case 'password':
        return renderPasswordStep();
      case 'terms':
        return renderTermsStep();
      case 'success':
        return renderSuccessStep();
      default:
        return null;
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
    progressContainer: {
      alignItems: 'center',
      paddingTop: theme.spacing[12],
      paddingHorizontal: theme.spacing[6],
      marginBottom: theme.spacing[6],
    },
    progressBar: {
      width: '80%',
      height: 4,
      backgroundColor: theme.semantic.border.primary,
      borderRadius: theme.borderRadius.sm,
      marginBottom: theme.spacing[6],
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: theme.colors.primary[500],
      borderRadius: theme.borderRadius.sm,
    },
    stepIndicator: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginBottom: theme.spacing[4],
    },
    stepDot: {
      width: 32,
      height: 32,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.semantic.border.primary,
      marginHorizontal: theme.spacing[1],
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepDotActive: {
      backgroundColor: theme.colors.primary[500],
    },
    stepDotCompleted: {
      backgroundColor: theme.colors.success[500],
    },
    stepDotText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.semantic.text.secondary,
    },
    stepDotTextActive: {
      color: theme.semantic.background.secondary,
    },
    stepTitle: {
      fontSize: theme.typography.fontSize.lg, fontWeight: theme.typography.fontWeight.semibold,
      color: theme.semantic.text.primary,
      textAlign: 'center',
      marginBottom: theme.spacing[1],
    },
    stepDescription: {
      fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.normal,
      color: theme.semantic.text.secondary,
      textAlign: 'center',
    },
    formContainer: {
      paddingHorizontal: theme.spacing[6],
      flex: 1,
    },
    stepContent: {
      marginBottom: theme.spacing[8],
    },
    inputIcon: {
      fontSize: theme.typography.fontSize.lg,
      color: theme.semantic.text.secondary,
    },
    dividerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: theme.spacing[6],
    },
    divider: {
      flex: 1,
      height: 1,
      backgroundColor: theme.semantic.border.primary,
    },
    dividerText: {
      fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.normal,
      color: theme.semantic.text.secondary,
      marginHorizontal: theme.spacing[4],
    },
    termsContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: theme.spacing[4],
    },
    checkboxContainer: {
      marginRight: theme.spacing[2],
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: theme.borderRadius.sm,
      borderWidth: 2,
      borderColor: theme.semantic.border.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxChecked: {
      backgroundColor: theme.colors.primary[500],
      borderColor: theme.colors.primary[500],
    },
    checkmark: {
      color: theme.semantic.background.secondary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
    },
    termsTextContainer: {
      flex: 1,
    },
    termsText: {
      fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.normal,
      color: theme.semantic.text.primary,
      lineHeight: theme.typography.fontSize.sm * theme.typography.lineHeight.relaxed,
    },
    linkText: {
      color: theme.colors.primary[500],
      fontWeight: theme.typography.fontWeight.medium,
    },
    errorText: {
      fontSize: theme.typography.fontSize.xs, fontWeight: theme.typography.fontWeight.normal,
      color: theme.colors.error[500],
      marginTop: theme.spacing[1],
    },
    navigationButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: theme.spacing[4],
      marginTop: theme.spacing[6],
    },
    backButton: {
      flex: 1,
    },
    nextButton: {
      flex: 2,
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
      fontSize: theme.typography.fontSize.base, fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.primary[500],
    },
    // Success step styles
    successContent: {
      alignItems: 'center',
      paddingVertical: theme.spacing[12],
    },
    successLogo: {
      width: 100,
      height: 100,
      marginBottom: theme.spacing[6],
    },
    successTitle: {
      fontSize: theme.typography.fontSize.xl, fontWeight: theme.typography.fontWeight.semibold,
      color: theme.semantic.text.primary,
      textAlign: 'center',
      marginBottom: theme.spacing[4],
    },
    successMessage: {
      fontSize: theme.typography.fontSize.base, fontWeight: theme.typography.fontWeight.normal,
      color: theme.semantic.text.secondary,
      textAlign: 'center',
      lineHeight: theme.typography.fontSize.base * theme.typography.lineHeight.relaxed,
      marginBottom: theme.spacing[8],
      paddingHorizontal: theme.spacing[6],
    },
    successButton: {
      width: '100%',
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
      >
        {/* Background decoration */}
        <View style={styles.backgroundDecoration} />

        {/* Progress indicator */}
        <Animated.View
          style={[
            styles.progressContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.progressBar}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>

          <View style={styles.stepIndicator}>
            {steps.map((step, index) => (
              <View
                key={step.key}
                style={[
                  styles.stepDot,
                  index <= currentStepIndex && styles.stepDotActive,
                  index < currentStepIndex && styles.stepDotCompleted,
                ]}
              >
                <Text style={[
                  styles.stepDotText,
                  index <= currentStepIndex && styles.stepDotTextActive,
                ]}>
                  {index < currentStepIndex ? '✓' : (index + 1)}
                </Text>
              </View>
            ))}
          </View>

          <Text style={styles.stepTitle}>{steps[currentStepIndex].title}</Text>
          <Text style={styles.stepDescription}>{steps[currentStepIndex].description}</Text>
        </Animated.View>

        {/* Form content */}
        <Animated.View
          style={[
            styles.formContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {renderStepContent()}

          {/* Navigation buttons */}
          {currentStep !== 'success' && (
            <View style={styles.navigationButtons}>
              {currentStepIndex > 0 && (
                <Button
                  title="Back"
                  onPress={handlePrevious}
                  variant="outline"
                  size="medium"
                  style={styles.backButton}
                />
              )}

              {currentStep === 'terms' ? (
                <Button
                  title="Create Account"
                  onPress={handleRegister}
                  loading={state.isLoading}
                  disabled={!isStepValid || state.isLoading}
                  variant="gradient"
                  size="large"
                  fullWidth
                  style={styles.nextButton}
                />
              ) : (
                <Button
                  title="Next"
                  onPress={handleNext}
                  disabled={!isStepValid}
                  variant="gradient"
                  size="large"
                  fullWidth
                  style={styles.nextButton}
                />
              )}
            </View>
          )}

          {/* Sign in link */}
          {currentStep !== 'success' && (
            <View style={styles.signInContainer}>
              <Text style={styles.signInText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.signInLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default RegisterScreen;
