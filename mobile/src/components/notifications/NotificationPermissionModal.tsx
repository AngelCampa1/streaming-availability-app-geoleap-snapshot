import React, { useState, useEffect } from 'react';
import { View,
  Text,
  StyleSheet,
  Alert,
  Linking,
  Platform } from 'react-native';

import { Modal, Portal, Button, Card, Title, Paragraph } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import NotificationService from '../../services/notificationService';
import { useTheme } from '../../theme/ThemeProvider';
import { logger } from '../../utils/logger';

interface NotificationPermissionModalProps {
  visible: boolean;
  onDismiss: () => void;
  onPermissionGranted: () => void;
  onPermissionDenied: () => void;
}

export const NotificationPermissionModal: React.FC<NotificationPermissionModalProps> = ({
  visible,
  onDismiss,
  onPermissionGranted,
  onPermissionDenied,
}) => {
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'unknown' | 'granted' | 'denied'>('unknown');

  const styles = StyleSheet.create({
    container: {
      margin: theme.spacing[5],
    },
    card: {
      backgroundColor: theme.semantic.background.primary,
      borderRadius: theme.borderRadius.xl,
    },
    header: {
      alignItems: 'center' as const,
      marginBottom: theme.spacing[6],
    },
    title: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: 'bold' as const,
      marginTop: theme.spacing[4],
      marginBottom: theme.spacing[2],
      textAlign: 'center' as const,
    },
    subtitle: {
      fontSize: theme.typography.fontSize.base,
      color: theme.semantic.text.secondary,
      textAlign: 'center' as const,
      lineHeight: 22,
    },
    benefitsContainer: {
      marginBottom: theme.spacing[6],
    },
    benefitItem: {
      flexDirection: 'row' as const,
      alignItems: 'flex-start' as const,
      marginBottom: theme.spacing[4],
    },
    benefitIcon: {
      marginRight: theme.spacing[3],
      marginTop: theme.spacing[0.5],
    },
    benefitContent: {
      flex: 1,
    },
    benefitTitle: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: '600' as const,
      marginBottom: theme.spacing[1],
      color: theme.semantic.text.primary,
    },
    benefitDescription: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.semantic.text.secondary,
      lineHeight: 20,
    },
    deniedContainer: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      backgroundColor: theme.colors.warning[50],
      padding: theme.spacing[3],
      borderRadius: theme.borderRadius.md,
      marginBottom: theme.spacing[4],
    },
    deniedText: {
      flex: 1,
      marginLeft: theme.spacing[2],
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.error[700],
    },
    privacyNote: {
      flexDirection: 'row' as const,
      alignItems: 'flex-start' as const,
      backgroundColor: theme.semantic.background.secondary,
      padding: theme.spacing[3],
      borderRadius: theme.borderRadius.md,
      marginBottom: theme.spacing[2],
    },
    privacyText: {
      flex: 1,
      marginLeft: theme.spacing[2],
      fontSize: theme.typography.fontSize.xs,
      color: theme.semantic.text.secondary,
      lineHeight: 16,
    },
    actions: {
      justifyContent: 'flex-end' as const,
      paddingHorizontal: theme.spacing[4],
      paddingVertical: theme.spacing[3],
    },
    primaryButton: {
      marginLeft: theme.spacing[2],
    },
    secondaryButton: {
      // Add any specific styling for secondary button
    },
  });

  useEffect(() => {
    if (visible) {
      checkCurrentPermission();
    }
  }, [visible]);

  const checkCurrentPermission = async () => {
    try {
      const hasPermission = await NotificationService.checkPermission();
      setPermissionStatus(hasPermission ? 'granted' : 'denied');
    } catch (error) {
      logger.error('[NotificationPermissionModal] Failed to check notification permission', error);
    }
  };

  const handleRequestPermission = async () => {
    setIsLoading(true);
    try {
      const granted = await NotificationService.requestPermission();

      if (granted) {
        setPermissionStatus('granted');
        onPermissionGranted();
        Alert.alert(
          'Notifications Enabled',
          'You will now receive important updates and notifications.',
          [{ text: 'OK', onPress: onDismiss }],
        );
      } else {
        setPermissionStatus('denied');
        onPermissionDenied();
        showPermissionDeniedAlert();
      }
    } catch (error) {
      logger.error('[NotificationPermissionModal] Failed to request notification permission', error);
      Alert.alert(
        'Error',
        'Failed to request notification permission. Please try again.',
        [{ text: 'OK' }],
      );
    } finally {
      setIsLoading(false);
    }
  };

  const showPermissionDeniedAlert = () => {
    Alert.alert(
      'Notifications Disabled',
      'You won\'t receive important updates. You can enable notifications later in your device settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: openAppSettings },
      ],
    );
  };

  const openAppSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  };

  const handleNotNow = () => {
    onPermissionDenied();
    onDismiss();
  };

  const benefits = [
    {
      icon: 'security',
      title: 'Security Alerts',
      description: 'Get notified about important security updates and potential threats',
    },
    {
      icon: 'update',
      title: 'App Updates',
      description: 'Stay informed about new features and improvements',
    },
    {
      icon: 'trending-up',
      title: 'Performance Insights',
      description: 'Receive reports about your VPN performance and usage',
    },
    {
      icon: 'location-on',
      title: 'Server Status',
      description: 'Get alerts when your preferred servers come back online',
    },
  ];

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.container}
      >
        <Card  style={styles.card}>
          <Card.Content>
            <View  style={styles.header}>
              <Icon name="notifications" size={48} color={theme.colors.primary[500]} />
              <Title  style={styles.title}>Enable Notifications</Title>
              <Paragraph  style={styles.subtitle}>
                Stay connected and secure with timely updates
              </Paragraph>
            </View>

            <View  style={styles.benefitsContainer}>
              {benefits.map((benefit, index) => (
                <View key={index}  style={styles.benefitItem}>
                  <Icon name={benefit.icon} size={24} color={theme.colors.primary[500]}  style={styles.benefitIcon} />
                  <View  style={styles.benefitContent}>
                    <Text  style={styles.benefitTitle}>{benefit.title}</Text>
                    <Text  style={styles.benefitDescription}>{benefit.description}</Text>
                  </View>
                </View>
              ))}
            </View>

            {permissionStatus === 'denied' && (
              <View  style={styles.deniedContainer}>
                <Icon name="info" size={20} color={theme.colors.warning[500]} />
                <Text  style={styles.deniedText}>
                  Notifications are currently disabled. You can enable them in your device settings.
                </Text>
              </View>
            )}

            <View  style={styles.privacyNote}>
              <Icon name="privacy-tip" size={16} color={theme.semantic.text.secondary} />
              <Text  style={styles.privacyText}>
                We respect your privacy. Notifications contain only essential information and can be customized in settings.
              </Text>
            </View>
          </Card.Content>

          <Card.Actions  style={styles.actions}>
            <Button
              mode="text"
              onPress={handleNotNow}
              disabled={isLoading}
               style={styles.secondaryButton}
            >
              Not Now
            </Button>

            {permissionStatus === 'denied' ? (
              <Button
                mode="contained"
                onPress={openAppSettings}
                disabled={isLoading}
                 style={styles.primaryButton}
              >
                Open Settings
              </Button>
            ) : (
              <Button
                mode="contained"
                onPress={handleRequestPermission}
                loading={isLoading}
                disabled={isLoading || permissionStatus === 'granted'}
                 style={styles.primaryButton}
              >
                {permissionStatus === 'granted' ? 'Enabled' : 'Enable Notifications'}
              </Button>
            )}
          </Card.Actions>
        </Card>
      </Modal>
    </Portal>
  );
};

export default NotificationPermissionModal;
