import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Image, StatusBar, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../hooks/useTheme';
import { LOGOS } from '@/assets';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { theme } = useTheme();
  const [isConnected, setIsConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleConnectToggle = () => {
    setIsConnected(!isConnected);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate refresh delay
    await new Promise<void>(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const styles = createStyles(theme);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle={'dark-content'}
        backgroundColor={theme.semantic.background.primary}
      />
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary[500]]}
            tintColor={theme.colors.primary[500]}
          />
        }
      >
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Image
            source={LOGOS.transparent}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="GeoLeap logo"
          />
        </View>
        <Text style={styles.title}>GeoLeap</Text>

        {/* VPN Connection Section */}
        <View style={styles.vpnSection}>
          <Text style={styles.statusText}>
            Status: {isConnected ? 'Connected' : 'Disconnected'}
          </Text>

          <TouchableOpacity
            testID="connect-button"
            style={[styles.connectButton, isConnected ? styles.disconnectButton : styles.connectButtonStyle]}
            onPress={handleConnectToggle}
            accessibilityLabel={isConnected ? 'Disconnect from VPN' : 'Connect to VPN'}
            accessibilityRole="button"
            accessibilityHint={isConnected ? 'Double tap to disconnect' : 'Double tap to connect'}
            accessibilityState={{ checked: isConnected }}
          >
            <Text style={styles.connectButtonText}>
              {isConnected ? 'Disconnect' : 'Connect'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Features Section */}
        <View style={styles.featuresSection}>
          <Text style={styles.featuresTitle}>Features:</Text>
          <Text style={styles.featureItem}>• Global Content Search</Text>
          <Text style={styles.featureItem}>• Streaming Discovery</Text>
          <Text style={styles.featureItem}>• Content Availability</Text>
          <Text style={styles.featureItem}>• Worldwide Search</Text>
        </View>

        {/* Navigation Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('Profile')}
            accessibilityLabel="Go to Profile"
            accessibilityRole="button"
            accessibilityHint="Double tap to view your profile"
          >
            <Text style={styles.buttonText}>Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('Settings')}
            accessibilityLabel="Go to Settings"
            accessibilityRole="button"
            accessibilityHint="Double tap to view app settings"
          >
            <Text style={styles.buttonText}>Settings</Text>
          </TouchableOpacity>
        </View>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.semantic.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: theme.spacing[5],
    paddingTop: theme.spacing[10],
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing[5],
  },
  logo: {
    width: 100,
    height: 100,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.primary[500],
    textAlign: 'center',
    marginBottom: theme.spacing[8],
  },
  vpnSection: {
    backgroundColor: theme.semantic.background.secondary,
    borderRadius: theme.spacing[3],
    padding: theme.spacing[5],
    marginBottom: theme.spacing[8],
    alignItems: 'center',
    shadowColor: theme.semantic.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: theme.semantic.border.primary,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.semantic.text.primary,
    marginBottom: theme.spacing[5],
  },
  connectButton: {
    paddingHorizontal: theme.spacing[10],
    paddingVertical: theme.spacing[4],
    borderRadius: theme.spacing[2],
    minWidth: 150,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectButtonStyle: {
    backgroundColor: theme.colors.primary[500],
  },
  disconnectButton: {
    backgroundColor: theme.colors.error[500],
  },
  connectButtonText: {
    color: theme.semantic.text.inverse,
    fontSize: 18,
    fontWeight: '600',
  },
  featuresSection: {
    backgroundColor: theme.semantic.background.secondary,
    borderRadius: theme.spacing[3],
    padding: theme.spacing[5],
    marginBottom: theme.spacing[8],
    shadowColor: theme.semantic.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: theme.semantic.border.primary,
  },
  featuresTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.semantic.text.primary,
    marginBottom: theme.spacing[4],
  },
  featureItem: {
    fontSize: 16,
    color: theme.semantic.text.secondary,
    marginBottom: theme.spacing[2],
    lineHeight: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: theme.spacing[4],
  },
  button: {
    backgroundColor: theme.colors.primary[500],
    paddingHorizontal: theme.spacing[8],
    paddingVertical: theme.spacing[3],
    borderRadius: theme.spacing[2],
    minWidth: 120,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  buttonText: {
    color: theme.semantic.text.inverse,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default HomeScreen;
