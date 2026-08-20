import React from 'react';
import { View, StyleSheet } from 'react-native';
import { EnhancedProfileScreen } from './profile/EnhancedProfileScreen';
import { useTheme } from '../hooks/useTheme';

const ProfileScreen: React.FC = () => {
  const { theme } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.semantic.background.primary,
    },
  });

  return (
    <View style={styles.container}>
      <EnhancedProfileScreen />
    </View>
  );
};

export default ProfileScreen;
