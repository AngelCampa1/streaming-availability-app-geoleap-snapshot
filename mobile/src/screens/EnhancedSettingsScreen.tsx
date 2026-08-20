import React from 'react';
import { View, StyleSheet, ScrollView, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Text, List, Surface, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';

const EnhancedSettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();

  const settingsOptions = [
    {
      id: 'account',
      title: 'Account Settings',
      description: 'Manage your account and profile',
      icon: 'account-circle',
      onPress: () => {
        // Navigate to account settings
      },
    },
    {
      id: 'language',
      title: 'Language Preferences',
      description: 'Set preferred audio and subtitle languages',
      icon: 'language',
      onPress: () => {
        navigation.navigate('LanguagePreferences' as never);
      },
    },
    {
      id: 'authentication',
      title: 'Authentication',
      description: 'Security and biometric settings',
      icon: 'security',
      onPress: () => {
        navigation.navigate('AuthenticationSettings' as never);
      },
    },
    {
      id: 'notifications',
      title: 'Notifications',
      description: 'Manage notification preferences',
      icon: 'notifications',
      onPress: () => {
        // Navigate to notifications settings
      },
    },
    {
      id: 'theme',
      title: 'Appearance',
      description: 'Light theme active',
      icon: 'brightness-6',
      onPress: () => {
        // Navigate to theme settings
      },
    },
    {
      id: 'privacy',
      title: 'Privacy & Security',
      description: 'Control your privacy settings',
      icon: 'shield',
      onPress: () => {
        // Navigate to privacy settings
      },
    },
    {
      id: 'about',
      title: 'About',
      description: 'App version and information',
      icon: 'info',
      onPress: () => {
        // Navigate to about screen
      },
    },
  ];

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.semantic.background.primary,
    },
    scrollView: {
      flex: 1,
    },
    header: {
      padding: theme.spacing[5],
      paddingBottom: theme.spacing[4],
    },
    title: {
      fontSize: theme.typography.fontSize["3xl"],
      fontWeight: 'bold',
      color: theme.semantic.text.primary,
    },
    description: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.semantic.text.secondary,
      marginTop: theme.spacing[1],
    },
    section: {
      margin: theme.spacing[4],
      borderRadius: theme.borderRadius.md,
      overflow: 'hidden',
    },
    settingItem: {
      paddingVertical: theme.spacing[1],
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle={'dark-content'}
        backgroundColor={theme.semantic.background.primary}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.description}>
            Customize your app experience and preferences
          </Text>
        </View>

        {/* Settings Options */}
        <Surface style={styles.section} elevation={2}>
          {settingsOptions.map((option, index) => (
            <View key={option.id}>
              <List.Item
                title={option.title}
                description={option.description}
                left={() => (
                  <List.Icon
                    icon={option.icon}
                    color={theme.colors.primary[500]}
                  />
                )}
                right={() => <List.Icon icon="chevron-right" />}
                onPress={option.onPress}
                style={styles.settingItem}
              />
              {index < settingsOptions.length - 1 && <Divider />}
            </View>
          ))}
        </Surface>
      </ScrollView>
    </SafeAreaView>
  );
};

export default EnhancedSettingsScreen;
