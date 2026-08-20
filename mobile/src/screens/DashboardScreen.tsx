import React from 'react';
import { View, StyleSheet } from 'react-native';
import { EnhancedDashboardScreen } from './dashboard/EnhancedDashboardScreen';
import { useTheme } from '../hooks/useTheme';

const DashboardScreen: React.FC = () => {
  const { theme } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.semantic.background.primary,
    },
  });

  return (
    <View style={styles.container}>
      <EnhancedDashboardScreen />
    </View>
  );
};

export default DashboardScreen;
