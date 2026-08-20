// Simple mock for EnhancedSearchScreen to fix import issues
import React from 'react';
import { View, Text } from 'react-native';

interface EnhancedSearchScreenProps {
  navigation: any;
  route?: any;
}

const EnhancedSearchScreen: React.FC<EnhancedSearchScreenProps> = ({
  navigation: _navigation,
  route: _route,
}) => {
  return (
    <View testID="enhanced-search-screen">
      <Text testID="search-title">Enhanced Search</Text>
    </View>
  );
};

export default EnhancedSearchScreen;
