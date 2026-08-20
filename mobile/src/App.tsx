import React, { useRef } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import type { NavigationContainerRef, ParamListBase } from '@react-navigation/native';
import * as Sentry from '@sentry/react-native';
import { ThemeProvider } from './theme/ThemeProvider';
import { AuthProvider } from './context/AuthContext';
import { AppNavigator } from './navigation/AppNavigator';

const navigationIntegration = Sentry.reactNavigationIntegration();

const App: React.FC = () => {
  const navigationRef = useRef<NavigationContainerRef<ParamListBase>>(null);

  return (
    <ThemeProvider>
      <AuthProvider>
        <SafeAreaProvider>
          <PaperProvider>
            <NavigationContainer
              ref={navigationRef}
              onReady={() => {
                navigationIntegration.registerNavigationContainer(navigationRef);
              }}
            >
              <AppNavigator />
            </NavigationContainer>
          </PaperProvider>
        </SafeAreaProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
