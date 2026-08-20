import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Alert,
} from 'react-native';
import {
  Text,
  Button,
  Surface,
  IconButton,
  Switch,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuth } from '../../context/AuthContext';
import { biometricAuth } from '../../services/biometricAuth';
import { BiometricType } from '../../types/auth';
import { OnboardingStackParamList } from '../../navigation/types';
import { logger } from '../../utils/logger';

type BiometricSetupScreenNavigationProp = NavigationProp<OnboardingStackParamList, 'BiometricSetup'>;

export default function BiometricSetupScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<BiometricSetupScreenNavigationProp>();
  const { state, enableBiometric, clearError } = useAuth();

  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<BiometricType>('None');
  const [biometricTypeName, setBiometricTypeName] = useState('Biometric');
  const [enableBiometricAuth, setEnableBiometricAuth] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);

  useEffect(() => {
    checkBiometricAvailability();
    return () => clearError();
  }, [clearError]);

  const checkBiometricAvailability = async () => {
    try {
      const { available, biometryType } = await biometricAuth.isAvailable();
      setBiometricAvailable(available);
      setBiometricType(biometryType);
      setBiometricTypeName(biometricAuth.getBiometricTypeName(biometryType));
    } catch (error) {
      logger.error('[BiometricSetupScreen] Failed to check biometric availability', error);
    }
  };

  const handleEnableBiometric = async () => {
    if (!biometricAvailable) {
      Alert.alert(
        'Biometric Not Available',
        'Biometric authentication is not available on this device.',
        [{ text: 'OK' }],
      );
      return;
    }

    try {
      setIsEnabling(true);
      await enableBiometric();
      setEnableBiometricAuth(true);

      Alert.alert(
        'Success',
        `${biometricTypeName} authentication has been enabled for your account.`,
        [{ text: 'OK' }],
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to enable biometric authentication';
      Alert.alert('Error', errorMessage, [{ text: 'OK' }]);
    } finally {
      setIsEnabling(false);
    }
  };

  const handleSkip = () => {
    navigation.navigate('OnboardingComplete');
  };

  const handleContinue = () => {
    navigation.navigate('OnboardingComplete');
  };

  const getBiometricIcon = (type: BiometricType): string => {
    switch (type) {
      case 'TouchID':
        return 'fingerprint';
      case 'FaceID':
        return 'face-recognition';
      case 'Fingerprint':
        return 'fingerprint';
      default:
        return 'security';
    }
  };

  const getBiometricDescription = (type: BiometricType): string => {
    switch (type) {
      case 'TouchID':
        return 'Use your fingerprint to quickly and securely sign in to your GeoLeap account.';
      case 'FaceID':
        return 'Use Face ID for quick and secure access to your GeoLeap account.';
      case 'Fingerprint':
        return 'Use your fingerprint for quick and secure access to your GeoLeap account.';
      default:
        return 'Use biometric authentication for quick and secure access to your account.';
    }
  };

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.semantic.background.secondary,
    },
    content: {
      flex: 1,
      padding: theme.spacing[4],
      justifyContent: 'space-between',
    },
    surface: {
      flex: 1,
      padding: theme.spacing[6],
      borderRadius: theme.borderRadius.md,
      ...theme.shadows.md,
    },
    header: {
      alignItems: 'center',
      marginBottom: theme.spacing[8],
    },
    headerIcon: {
      backgroundColor: 'transparent',
      marginBottom: theme.spacing[4],
    },
    title: {
      textAlign: 'center',
      marginBottom: theme.spacing[4],
      fontWeight: 'bold',
    },
    subtitle: {
      textAlign: 'center',
      opacity: 0.7,
      lineHeight: Number((theme.typography as any).body) || (Number(theme.typography.fontSize.base) * 1.5),
    },
    optionContainer: {
      marginBottom: theme.spacing[8],
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: theme.spacing[4],
      paddingHorizontal: theme.spacing[4],
      backgroundColor: theme.semantic.background.secondary,
      borderRadius: theme.borderRadius.sm,
      marginBottom: theme.spacing[4],
    },
    switchTextContainer: {
      flex: 1,
    },
    switchDescription: {
      opacity: 0.7,
      marginTop: theme.spacing[1],
    },
    setupButton: {
      alignSelf: 'center',
    },
    benefitsContainer: {
      marginBottom: theme.spacing[8],
    },
    benefitsTitle: {
      marginBottom: theme.spacing[3],
      fontWeight: 'bold',
    },
    benefitsList: {
      gap: theme.spacing[2],
    },
    benefitItem: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    benefitIcon: {
      margin: 0,
      marginRight: theme.spacing[2],
    },
    benefitText: {
      flex: 1,
    },
    errorText: {
      color: theme.colors.error[500],
      textAlign: 'center',
      marginTop: theme.spacing[4],
    },
    footer: {
      flexDirection: 'row',
      gap: theme.spacing[3],
      marginTop: theme.spacing[4],
    },
    skipButton: {
      flex: 1,
    },
    continueButton: {
      flex: 1,
      paddingVertical: theme.spacing[1],
    },
  }), [theme]);

  return (
    <SafeAreaView  style={styles.container}>
      <View  style={styles.content}>
        <Surface  style={styles.surface}>
          <View  style={styles.header}>
            <IconButton
              icon={getBiometricIcon(biometricType)}
              size={64}
              iconColor={biometricAvailable ? theme.colors.primary[500] : theme.semantic.text.tertiary}
               style={styles.headerIcon}
            />

            <Text variant="headlineMedium"  style={styles.title}>
              {biometricAvailable ? `Setup ${biometricTypeName}` : 'Biometric Authentication'}
            </Text>

            <Text variant="bodyMedium"  style={styles.subtitle}>
              {biometricAvailable
                ? getBiometricDescription(biometricType)
                : 'Biometric authentication is not available on this device. You can still secure your account with a strong password.'
              }
            </Text>
          </View>

          {biometricAvailable && (
            <View  style={styles.optionContainer}>
              <View  style={styles.switchRow}>
                <View  style={styles.switchTextContainer}>
                  <Text variant="titleMedium">Enable {biometricTypeName}</Text>
                  <Text variant="bodySmall"  style={styles.switchDescription}>
                    Quick and secure sign-in
                  </Text>
                </View>
                <Switch
                  value={enableBiometricAuth}
                  onValueChange={setEnableBiometricAuth}
                  disabled={isEnabling || state.isLoading}
                />
              </View>

              {enableBiometricAuth && !state.user?.biometricEnabled && (
                <Button
                  mode="outlined"
                  onPress={handleEnableBiometric}
                  disabled={isEnabling || state.isLoading}
                  loading={isEnabling}
                   style={styles.setupButton}
                >
                  Setup {biometricTypeName}
                </Button>
              )}
            </View>
          )}

          <View  style={styles.benefitsContainer}>
            <Text variant="titleSmall"  style={styles.benefitsTitle}>
              Security Benefits:
            </Text>

            <View  style={styles.benefitsList}>
              <View  style={styles.benefitItem}>
                <IconButton icon="check-circle" size={20} iconColor={theme.colors.success[500]}  style={styles.benefitIcon} />
                <Text variant="bodySmall"  style={styles.benefitText}>
                  Faster login experience
                </Text>
              </View>

              <View  style={styles.benefitItem}>
                <IconButton icon="check-circle" size={20} iconColor={theme.colors.success[500]}  style={styles.benefitIcon} />
                <Text variant="bodySmall"  style={styles.benefitText}>
                  Enhanced account security
                </Text>
              </View>

              <View  style={styles.benefitItem}>
                <IconButton icon="check-circle" size={20} iconColor={theme.colors.success[500]}  style={styles.benefitIcon} />
                <Text variant="bodySmall"  style={styles.benefitText}>
                  No need to remember passwords
                </Text>
              </View>
            </View>
          </View>

          {state.error && (
            <Text variant="bodySmall"  style={styles.errorText}>
              {state.error}
            </Text>
          )}
        </Surface>

        <View  style={styles.footer}>
          <Button
            mode="text"
            onPress={handleSkip}
            disabled={state.isLoading || isEnabling}
             style={styles.skipButton}
          >
            Skip for Now
          </Button>

          <Button
            mode="contained"
            onPress={handleContinue}
            disabled={state.isLoading || isEnabling}
             style={styles.continueButton}
          >
            Continue
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}
