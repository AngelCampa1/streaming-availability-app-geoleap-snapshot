/**
 * VPN Setup Guide Screen
 * Step-by-step VPN setup instructions for different platforms
 */

import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Image } from 'react-native';
import { Text, Appbar, Surface, Button, SegmentedButtons, List, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeProvider';

type Props = NativeStackScreenProps<RootStackParamList, 'VpnSetupGuide'>;

type Platform = 'ios' | 'android' | 'windows' | 'mac';

interface SetupStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  tips?: string[];
}

const SETUP_GUIDES: Record<Platform, { title: string; steps: SetupStep[] }> = {
  ios: {
    title: 'iOS Setup Guide',
    steps: [
      {
        id: '1',
        title: 'Download VPN App',
        description: 'Open the App Store and download your chosen VPN provider\'s app (e.g., NordVPN, ExpressVPN, Surfshark).',
        icon: 'download',
        tips: ['Look for the official app from the VPN provider', 'Check reviews and ratings before downloading'],
      },
      {
        id: '2',
        title: 'Create Account or Sign In',
        description: 'Open the VPN app and either create a new account or sign in with your existing credentials.',
        icon: 'person-add',
        tips: ['Use a strong, unique password', 'Enable two-factor authentication if available'],
      },
      {
        id: '3',
        title: 'Allow VPN Configuration',
        description: 'When prompted, tap "Allow" to let the app add VPN configurations to your device.',
        icon: 'vpn-key',
        tips: ['This is required for the VPN to function', 'You may need to enter your device passcode'],
      },
      {
        id: '4',
        title: 'Select Server Location',
        description: 'Choose a server in the country where you want to access content. GeoLeap will recommend the best servers for each streaming service.',
        icon: 'public',
        tips: ['Choose servers close to you for better speed', 'Some services work better with specific servers'],
      },
      {
        id: '5',
        title: 'Connect to VPN',
        description: 'Tap the connect button to establish your VPN connection. Wait for confirmation that you\'re connected.',
        icon: 'power',
        tips: ['Connection usually takes a few seconds', 'Check for the VPN icon in your status bar'],
      },
      {
        id: '6',
        title: 'Open Streaming App',
        description: 'Once connected, open your streaming service app. The content library should now reflect your VPN location.',
        icon: 'play-circle',
        tips: ['You may need to close and reopen the streaming app', 'Clear app cache if content doesn\'t update'],
      },
    ],
  },
  android: {
    title: 'Android Setup Guide',
    steps: [
      {
        id: '1',
        title: 'Download VPN App',
        description: 'Open Google Play Store and download your chosen VPN provider\'s app.',
        icon: 'download',
        tips: ['Verify the developer is the official VPN company', 'Avoid APK downloads from unknown sources'],
      },
      {
        id: '2',
        title: 'Create Account or Sign In',
        description: 'Launch the VPN app and sign in or create a new account.',
        icon: 'person-add',
      },
      {
        id: '3',
        title: 'Grant Permissions',
        description: 'Allow the app to create VPN connections when prompted. This is necessary for the VPN to work.',
        icon: 'vpn-key',
        tips: ['Tap "OK" on the connection request dialog', 'This is a standard Android VPN permission'],
      },
      {
        id: '4',
        title: 'Select Server Location',
        description: 'Choose your desired server location from the server list.',
        icon: 'public',
      },
      {
        id: '5',
        title: 'Connect to VPN',
        description: 'Tap connect and wait for the connection to establish. You\'ll see a key icon in your notification bar.',
        icon: 'power',
      },
      {
        id: '6',
        title: 'Start Streaming',
        description: 'Open your streaming app and enjoy content from your chosen region!',
        icon: 'play-circle',
      },
    ],
  },
  windows: {
    title: 'Windows Setup Guide',
    steps: [
      {
        id: '1',
        title: 'Download VPN Software',
        description: 'Visit your VPN provider\'s website and download the Windows application.',
        icon: 'download',
        tips: ['Always download from the official website', 'Choose the correct version for your Windows (32-bit or 64-bit)'],
      },
      {
        id: '2',
        title: 'Install Application',
        description: 'Run the installer and follow the on-screen instructions. You may need administrator privileges.',
        icon: 'install-desktop',
      },
      {
        id: '3',
        title: 'Sign In',
        description: 'Open the installed VPN app and sign in with your account credentials.',
        icon: 'person-add',
      },
      {
        id: '4',
        title: 'Configure Settings',
        description: 'Review app settings. Enable features like kill switch and auto-connect for better protection.',
        icon: 'settings',
        tips: ['Kill switch prevents data leaks if VPN disconnects', 'Auto-connect can protect you on startup'],
      },
      {
        id: '5',
        title: 'Select Server & Connect',
        description: 'Choose a server location and click connect. The app will establish a secure connection.',
        icon: 'public',
      },
      {
        id: '6',
        title: 'Access Streaming Services',
        description: 'Open your web browser or streaming app to access content from your connected region.',
        icon: 'play-circle',
      },
    ],
  },
  mac: {
    title: 'macOS Setup Guide',
    steps: [
      {
        id: '1',
        title: 'Download VPN App',
        description: 'Download the VPN app from the Mac App Store or the provider\'s website.',
        icon: 'download',
        tips: ['App Store versions may have some feature limitations', 'Website downloads usually have all features'],
      },
      {
        id: '2',
        title: 'Install & Authorize',
        description: 'Install the app and authorize it in System Preferences > Security & Privacy if prompted.',
        icon: 'security',
      },
      {
        id: '3',
        title: 'Sign In to Account',
        description: 'Open the VPN application and sign in with your account.',
        icon: 'person-add',
      },
      {
        id: '4',
        title: 'Allow VPN Configuration',
        description: 'macOS will ask to add VPN configurations. Enter your password to allow this.',
        icon: 'vpn-key',
      },
      {
        id: '5',
        title: 'Select & Connect',
        description: 'Choose your preferred server location and click connect.',
        icon: 'public',
      },
      {
        id: '6',
        title: 'Enjoy Streaming',
        description: 'Once connected, open Safari or your streaming app to access geo-restricted content.',
        icon: 'play-circle',
      },
    ],
  },
};

export const VpnSetupGuideScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const initialPlatform = route.params?.platform || 'ios';
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>(initialPlatform as Platform);
  const [expandedStep, setExpandedStep] = useState<string | null>('1');

  const currentGuide = SETUP_GUIDES[selectedPlatform];

  const handleStepPress = (stepId: string) => {
    setExpandedStep(expandedStep === stepId ? null : stepId);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="VPN Setup Guide" />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Platform Selector */}
        <View style={styles.platformSelector}>
          <Text style={styles.sectionTitle}>Select Your Device</Text>
          <SegmentedButtons
            value={selectedPlatform}
            onValueChange={(value) => setSelectedPlatform(value as Platform)}
            buttons={[
              { value: 'ios', label: 'iOS', icon: 'phone-iphone' },
              { value: 'android', label: 'Android', icon: 'phone-android' },
              { value: 'windows', label: 'Windows', icon: 'desktop-windows' },
              { value: 'mac', label: 'Mac', icon: 'laptop-mac' },
            ]}
            style={styles.segmentedButtons}
          />
        </View>

        {/* Guide Header */}
        <Surface style={styles.guideHeader} elevation={1}>
          <Icon name="menu-book" size={32} color={theme.colors.primary[500]} />
          <Text style={styles.guideTitle}>{currentGuide.title}</Text>
          <Text style={styles.guideSubtitle}>
            {currentGuide.steps.length} simple steps to get started
          </Text>
        </Surface>

        {/* Setup Steps */}
        <View style={styles.stepsContainer}>
          {currentGuide.steps.map((step, index) => (
            <Surface key={step.id} style={styles.stepCard} elevation={1}>
              <List.Accordion
                title={`Step ${index + 1}: ${step.title}`}
                description={step.description}
                left={() => (
                  <View style={[styles.stepNumber, { backgroundColor: theme.colors.primary[500] }]}>
                    <Text style={styles.stepNumberText}>{index + 1}</Text>
                  </View>
                )}
                expanded={expandedStep === step.id}
                onPress={() => handleStepPress(step.id)}
                style={styles.stepAccordion}
                titleStyle={styles.stepTitle}
                descriptionStyle={styles.stepDescription}
                descriptionNumberOfLines={3}
              >
                {step.tips && step.tips.length > 0 && (
                  <View style={styles.tipsContainer}>
                    <Text style={styles.tipsTitle}>Tips:</Text>
                    {step.tips.map((tip, tipIndex) => (
                      <View key={tipIndex} style={styles.tipRow}>
                        <Icon name="lightbulb" size={16} color={theme.colors.warning[500]} />
                        <Text style={styles.tipText}>{tip}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </List.Accordion>
            </Surface>
          ))}
        </View>

        <Divider style={styles.divider} />

        {/* Need Help Section */}
        <Surface style={styles.helpSection} elevation={1}>
          <Icon name="help-outline" size={24} color={theme.colors.primary[500]} />
          <View style={styles.helpContent}>
            <Text style={styles.helpTitle}>Need More Help?</Text>
            <Text style={styles.helpDescription}>
              Contact our support team or browse our FAQ for additional assistance.
            </Text>
          </View>
        </Surface>

        <View style={styles.actionButtons}>
          <Button
            mode="outlined"
            onPress={() => navigation.navigate('Help')}
            icon="help-circle"
            style={styles.actionButton}
          >
            View FAQ
          </Button>
          <Button
            mode="contained"
            onPress={() => navigation.navigate('Support')}
            icon="headset-mic"
            style={styles.actionButton}
          >
            Contact Support
          </Button>
        </View>

        {/* Compare VPNs CTA */}
        <Button
          mode="text"
          onPress={() => navigation.navigate('VpnProviderComparison', {})}
          icon="compare-arrows"
          style={styles.compareButton}
        >
          Compare VPN Providers
        </Button>
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
  content: {
    padding: theme.spacing[4],
    paddingBottom: theme.spacing[10],
  },
  platformSelector: {
    marginBottom: theme.spacing[5],
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.semantic.text.secondary,
    marginBottom: theme.spacing[3],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  segmentedButtons: {
    // Styles handled by react-native-paper
  },
  guideHeader: {
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.semantic.background.secondary,
    padding: theme.spacing[5],
    alignItems: 'center',
    marginBottom: theme.spacing[5],
  },
  guideTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.semantic.text.primary,
    marginTop: theme.spacing[3],
    marginBottom: theme.spacing[1],
  },
  guideSubtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.semantic.text.secondary,
  },
  stepsContainer: {
    gap: theme.spacing[3],
  },
  stepCard: {
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.semantic.background.secondary,
    overflow: 'hidden',
  },
  stepAccordion: {
    backgroundColor: 'transparent',
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: theme.spacing[2],
  },
  stepNumberText: {
    color: theme.semantic.text.inverse,
    fontWeight: theme.typography.fontWeight.bold,
    fontSize: theme.typography.fontSize.sm,
  },
  stepTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  stepDescription: {
    fontSize: theme.typography.fontSize.sm,
  },
  tipsContainer: {
    paddingHorizontal: theme.spacing[4],
    paddingBottom: theme.spacing[4],
    backgroundColor: theme.colors.warning[50],
    marginHorizontal: theme.spacing[2],
    marginBottom: theme.spacing[2],
    borderRadius: theme.borderRadius.md,
  },
  tipsTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.warning[700],
    marginBottom: theme.spacing[2],
    marginTop: theme.spacing[3],
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing[2],
    marginBottom: theme.spacing[1],
  },
  tipText: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.warning[800],
    lineHeight: 20,
  },
  divider: {
    marginVertical: theme.spacing[5],
  },
  helpSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
    padding: theme.spacing[4],
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.semantic.background.secondary,
    marginBottom: theme.spacing[4],
  },
  helpContent: {
    flex: 1,
  },
  helpTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.semantic.text.primary,
    marginBottom: theme.spacing[1],
  },
  helpDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.semantic.text.secondary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: theme.spacing[3],
    marginBottom: theme.spacing[4],
  },
  actionButton: {
    flex: 1,
    borderRadius: theme.borderRadius.lg,
  },
  compareButton: {
    alignSelf: 'center',
  },
});

export default VpnSetupGuideScreen;
