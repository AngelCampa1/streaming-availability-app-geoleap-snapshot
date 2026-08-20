/**
 * Two-Factor Authentication Setup Screen
 * Allows users to configure 2FA for their account
 */

import React, { useState, useMemo, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Appbar, Surface, Button, TextInput, Switch, List, Divider, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as Clipboard from 'expo-clipboard';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuth } from '../../context/AuthContext';

type Props = NativeStackScreenProps<RootStackParamList, 'TwoFactorSetup'>;

type SetupStep = 'intro' | 'qrcode' | 'verify' | 'backup' | 'complete';

interface BackupCode {
  code: string;
  used: boolean;
}

// Mock data - replace with actual API
const MOCK_BACKUP_CODES: BackupCode[] = [
  { code: 'ABCD-1234-EFGH', used: false },
  { code: 'IJKL-5678-MNOP', used: false },
  { code: 'QRST-9012-UVWX', used: false },
  { code: 'YZAB-3456-CDEF', used: false },
  { code: 'GHIJ-7890-KLMN', used: false },
  { code: 'OPQR-1234-STUV', used: false },
  { code: 'WXYZ-5678-ABCD', used: false },
  { code: 'EFGH-9012-IJKL', used: false },
];

export const TwoFactorSetupScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const { state } = useAuth();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [currentStep, setCurrentStep] = useState<SetupStep>('intro');
  const [isLoading, setIsLoading] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [secretKey] = useState('JBSWY3DPEHPK3PXP'); // Mock secret
  const [backupCodes] = useState<BackupCode[]>(MOCK_BACKUP_CODES);
  const [copiedBackupCodes, setCopiedBackupCodes] = useState(false);

  const handleEnable2FA = useCallback(() => {
    setCurrentStep('qrcode');
  }, []);

  const handleContinueToVerify = useCallback(() => {
    setCurrentStep('verify');
  }, []);

  const handleVerifyCode = useCallback(async () => {
    if (verificationCode.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter a 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Call API to verify the code
      await new Promise<void>(resolve => setTimeout(() => resolve(), 1500));

      // Mock verification success
      setCurrentStep('backup');
    } catch (_error) {
      Alert.alert('Verification Failed', 'The code you entered is incorrect. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [verificationCode]);

  const handleCopyBackupCodes = useCallback(async () => {
    const codesText = backupCodes.map(c => c.code).join('\n');
    await Clipboard.setStringAsync(codesText);
    setCopiedBackupCodes(true);
    setTimeout(() => setCopiedBackupCodes(false), 3000);
  }, [backupCodes]);

  const handleCompleteSetup = useCallback(() => {
    setIs2FAEnabled(true);
    setCurrentStep('complete');
  }, []);

  const handleDisable2FA = useCallback(() => {
    Alert.alert(
      'Disable Two-Factor Authentication',
      'Are you sure you want to disable 2FA? This will make your account less secure.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disable',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              // TODO: Call API to disable 2FA
              await new Promise<void>(resolve => setTimeout(() => resolve(), 1000));
              setIs2FAEnabled(false);
              setCurrentStep('intro');
              Alert.alert('2FA Disabled', 'Two-factor authentication has been disabled.');
            } catch (_error) {
              Alert.alert('Error', 'Failed to disable 2FA. Please try again.');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  }, []);

  const handleCopySecretKey = useCallback(async () => {
    await Clipboard.setStringAsync(secretKey);
    Alert.alert('Copied', 'Secret key copied to clipboard.');
  }, [secretKey]);

  const renderIntroStep = () => (
    <View style={styles.stepContainer}>
      <Surface style={styles.infoCard} elevation={1}>
        <View style={styles.iconContainer}>
          <Icon name="security" size={48} color={theme.colors.primary[500]} />
        </View>
        <Text style={styles.infoTitle}>Secure Your Account</Text>
        <Text style={styles.infoDescription}>
          Two-factor authentication adds an extra layer of security to your account.
          You'll need to enter a code from your authenticator app each time you sign in.
        </Text>
      </Surface>

      <Surface style={styles.benefitsCard} elevation={1}>
        <Text style={styles.benefitsTitle}>Benefits of 2FA</Text>
        <View style={styles.benefitRow}>
          <Icon name="check-circle" size={20} color={theme.colors.success[500]} />
          <Text style={styles.benefitText}>Protects against unauthorized access</Text>
        </View>
        <View style={styles.benefitRow}>
          <Icon name="check-circle" size={20} color={theme.colors.success[500]} />
          <Text style={styles.benefitText}>Secures your payment information</Text>
        </View>
        <View style={styles.benefitRow}>
          <Icon name="check-circle" size={20} color={theme.colors.success[500]} />
          <Text style={styles.benefitText}>Prevents account takeover</Text>
        </View>
      </Surface>

      <Surface style={styles.requirementCard} elevation={1}>
        <Text style={styles.requirementTitle}>You'll need</Text>
        <View style={styles.requirementRow}>
          <Icon name="smartphone" size={24} color={theme.semantic.text.secondary} />
          <View style={styles.requirementInfo}>
            <Text style={styles.requirementName}>Authenticator App</Text>
            <Text style={styles.requirementDesc}>
              Google Authenticator, Authy, or similar
            </Text>
          </View>
        </View>
      </Surface>

      <Button
        mode="contained"
        onPress={handleEnable2FA}
        style={styles.primaryButton}
        contentStyle={styles.buttonContent}
        icon="shield-check"
      >
        Enable Two-Factor Authentication
      </Button>
    </View>
  );

  const renderQRCodeStep = () => (
    <View style={styles.stepContainer}>
      <Surface style={styles.qrCard} elevation={1}>
        <Text style={styles.stepTitle}>Step 1: Scan QR Code</Text>
        <Text style={styles.stepDescription}>
          Open your authenticator app and scan the QR code below.
        </Text>

        {/* QR Code Placeholder */}
        <View style={styles.qrCodeContainer}>
          <Surface style={styles.qrCodePlaceholder} elevation={2}>
            <Icon name="qr-code-2" size={120} color={theme.semantic.text.primary} />
          </Surface>
        </View>

        <Text style={styles.manualEntryLabel}>Can't scan? Enter this key manually:</Text>
        <View style={styles.secretKeyContainer}>
          <Text style={styles.secretKey}>{secretKey}</Text>
          <Button
            mode="text"
            compact
            onPress={handleCopySecretKey}
            icon="content-copy"
          >
            Copy
          </Button>
        </View>
      </Surface>

      <Button
        mode="contained"
        onPress={handleContinueToVerify}
        style={styles.primaryButton}
        contentStyle={styles.buttonContent}
      >
        Continue
      </Button>

      <Button
        mode="text"
        onPress={() => setCurrentStep('intro')}
        style={styles.secondaryButton}
      >
        Cancel
      </Button>
    </View>
  );

  const renderVerifyStep = () => (
    <View style={styles.stepContainer}>
      <Surface style={styles.verifyCard} elevation={1}>
        <Text style={styles.stepTitle}>Step 2: Verify Setup</Text>
        <Text style={styles.stepDescription}>
          Enter the 6-digit code from your authenticator app to verify the setup.
        </Text>

        <TextInput
          label="Verification Code"
          value={verificationCode}
          onChangeText={setVerificationCode}
          mode="outlined"
          keyboardType="number-pad"
          maxLength={6}
          style={styles.codeInput}
          contentStyle={styles.codeInputContent}
        />

        <Text style={styles.codeHint}>
          The code refreshes every 30 seconds
        </Text>
      </Surface>

      <Button
        mode="contained"
        onPress={handleVerifyCode}
        style={styles.primaryButton}
        contentStyle={styles.buttonContent}
        loading={isLoading}
        disabled={verificationCode.length !== 6 || isLoading}
      >
        Verify & Continue
      </Button>

      <Button
        mode="text"
        onPress={() => setCurrentStep('qrcode')}
        style={styles.secondaryButton}
        disabled={isLoading}
      >
        Back
      </Button>
    </View>
  );

  const renderBackupStep = () => (
    <View style={styles.stepContainer}>
      <Surface style={styles.backupCard} elevation={1}>
        <Text style={styles.stepTitle}>Step 3: Save Backup Codes</Text>
        <Text style={styles.stepDescription}>
          Save these backup codes in a safe place. You can use them to sign in if you lose access to your authenticator app.
        </Text>

        <View style={styles.backupCodesGrid}>
          {backupCodes.map((code, index) => (
            <View key={index} style={styles.backupCodeItem}>
              <Text style={styles.backupCode}>{code.code}</Text>
            </View>
          ))}
        </View>

        <Button
          mode="outlined"
          onPress={handleCopyBackupCodes}
          icon={copiedBackupCodes ? 'check' : 'content-copy'}
          style={styles.copyButton}
        >
          {copiedBackupCodes ? 'Copied!' : 'Copy All Codes'}
        </Button>

        <View style={styles.warningBox}>
          <Icon name="warning" size={20} color={theme.colors.warning[600]} />
          <Text style={styles.warningText}>
            Each code can only be used once. Keep them secure and don't share them.
          </Text>
        </View>
      </Surface>

      <Button
        mode="contained"
        onPress={handleCompleteSetup}
        style={styles.primaryButton}
        contentStyle={styles.buttonContent}
      >
        I've Saved My Codes
      </Button>
    </View>
  );

  const renderCompleteStep = () => (
    <View style={styles.stepContainer}>
      <Surface style={styles.successCard} elevation={1}>
        <View style={[styles.successIcon, { backgroundColor: theme.colors.success[100] }]}>
          <Icon name="check-circle" size={64} color={theme.colors.success[500]} />
        </View>
        <Text style={styles.successTitle}>2FA Enabled!</Text>
        <Text style={styles.successDescription}>
          Your account is now protected with two-factor authentication.
          You'll need to enter a code from your authenticator app each time you sign in.
        </Text>
      </Surface>

      <Surface style={styles.manageCard} elevation={1}>
        <List.Item
          title="Two-Factor Authentication"
          description="Currently enabled"
          left={() => <List.Icon icon="shield-check" color={theme.colors.success[500]} />}
          right={() => (
            <Switch
              value={is2FAEnabled}
              onValueChange={handleDisable2FA}
              color={theme.colors.success[500]}
            />
          )}
        />
        <Divider />
        <List.Item
          title="View Backup Codes"
          description="8 codes remaining"
          left={() => <List.Icon icon="key" />}
          right={() => <Icon name="chevron-right" size={24} color={theme.semantic.text.tertiary} />}
          onPress={() => setCurrentStep('backup')}
        />
      </Surface>

      <Button
        mode="contained"
        onPress={() => navigation.goBack()}
        style={styles.primaryButton}
        contentStyle={styles.buttonContent}
      >
        Done
      </Button>
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'intro':
        return renderIntroStep();
      case 'qrcode':
        return renderQRCodeStep();
      case 'verify':
        return renderVerifyStep();
      case 'backup':
        return renderBackupStep();
      case 'complete':
        return renderCompleteStep();
      default:
        return renderIntroStep();
    }
  };

  const getStepNumber = () => {
    switch (currentStep) {
      case 'qrcode': return 1;
      case 'verify': return 2;
      case 'backup': return 3;
      default: return 0;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Two-Factor Authentication" />
      </Appbar.Header>

      {/* Progress Indicator */}
      {currentStep !== 'intro' && currentStep !== 'complete' && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${(getStepNumber() / 3) * 100}%`, backgroundColor: theme.colors.primary[500] },
              ]}
            />
          </View>
          <Text style={styles.progressText}>Step {getStepNumber()} of 3</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.content}>
        {renderCurrentStep()}
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.semantic.background.primary,
  },
  header: {
    backgroundColor: theme.semantic.background.primary,
  },
  progressContainer: {
    paddingHorizontal: theme.spacing[5],
    paddingVertical: theme.spacing[3],
  },
  progressBar: {
    height: 4,
    backgroundColor: theme.colors.gray[200],
    borderRadius: 2,
    marginBottom: theme.spacing[2],
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.semantic.text.secondary,
    textAlign: 'center',
  },
  content: {
    padding: theme.spacing[5],
    paddingBottom: theme.spacing[10],
  },
  stepContainer: {
    gap: theme.spacing[4],
  },
  infoCard: {
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.semantic.background.secondary,
    padding: theme.spacing[5],
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: theme.spacing[4],
  },
  infoTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.semantic.text.primary,
    marginBottom: theme.spacing[2],
    textAlign: 'center',
  },
  infoDescription: {
    fontSize: theme.typography.fontSize.base,
    color: theme.semantic.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  benefitsCard: {
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.semantic.background.secondary,
    padding: theme.spacing[4],
  },
  benefitsTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.semantic.text.primary,
    marginBottom: theme.spacing[3],
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
    marginBottom: theme.spacing[2],
  },
  benefitText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.semantic.text.secondary,
  },
  requirementCard: {
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.semantic.background.secondary,
    padding: theme.spacing[4],
  },
  requirementTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.semantic.text.secondary,
    marginBottom: theme.spacing[3],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
  },
  requirementInfo: {
    flex: 1,
  },
  requirementName: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.semantic.text.primary,
  },
  requirementDesc: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.semantic.text.secondary,
  },
  primaryButton: {
    borderRadius: theme.borderRadius.lg,
    marginTop: theme.spacing[2],
  },
  buttonContent: {
    paddingVertical: theme.spacing[1],
  },
  secondaryButton: {
    marginTop: theme.spacing[1],
  },
  qrCard: {
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.semantic.background.secondary,
    padding: theme.spacing[5],
  },
  stepTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.semantic.text.primary,
    marginBottom: theme.spacing[2],
  },
  stepDescription: {
    fontSize: theme.typography.fontSize.base,
    color: theme.semantic.text.secondary,
    marginBottom: theme.spacing[4],
    lineHeight: 22,
  },
  qrCodeContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing[4],
  },
  qrCodePlaceholder: {
    width: 180,
    height: 180,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.semantic.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  manualEntryLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.semantic.text.secondary,
    marginBottom: theme.spacing[2],
  },
  secretKeyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.semantic.background.primary,
    padding: theme.spacing[3],
    borderRadius: theme.borderRadius.md,
  },
  secretKey: {
    fontSize: theme.typography.fontSize.base,
    fontFamily: 'monospace',
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.semantic.text.primary,
    letterSpacing: 1,
  },
  verifyCard: {
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.semantic.background.secondary,
    padding: theme.spacing[5],
  },
  codeInput: {
    marginBottom: theme.spacing[2],
  },
  codeInputContent: {
    fontSize: theme.typography.fontSize['2xl'],
    textAlign: 'center',
    letterSpacing: 8,
  },
  codeHint: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.semantic.text.tertiary,
    textAlign: 'center',
  },
  backupCard: {
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.semantic.background.secondary,
    padding: theme.spacing[5],
  },
  backupCodesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[2],
    marginBottom: theme.spacing[4],
  },
  backupCodeItem: {
    width: '48%',
    backgroundColor: theme.semantic.background.primary,
    padding: theme.spacing[3],
    borderRadius: theme.borderRadius.md,
  },
  backupCode: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: 'monospace',
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.semantic.text.primary,
    textAlign: 'center',
  },
  copyButton: {
    marginBottom: theme.spacing[4],
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing[2],
    backgroundColor: theme.colors.warning[50],
    padding: theme.spacing[3],
    borderRadius: theme.borderRadius.md,
  },
  warningText: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.warning[700],
    lineHeight: 20,
  },
  successCard: {
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.semantic.background.secondary,
    padding: theme.spacing[5],
    alignItems: 'center',
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing[4],
  },
  successTitle: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.success[600],
    marginBottom: theme.spacing[2],
  },
  successDescription: {
    fontSize: theme.typography.fontSize.base,
    color: theme.semantic.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  manageCard: {
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.semantic.background.secondary,
    overflow: 'hidden',
  },
});

export default TwoFactorSetupScreen;
