import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthStackParamList } from './types';
import { useTheme } from '../hooks/useTheme';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';
// import EmailVerificationScreen from '../screens/auth/EmailVerificationScreen'; // DEPRECATED 2025-11-06
import WelcomeScreen from '../screens/auth/WelcomeScreen';

const Stack = createStackNavigator<AuthStackParamList>();

export const AuthNavigator = () => {
  const { theme } = useTheme();

  return (
    <Stack.Navigator id="auth-stack"
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        cardStyle: { backgroundColor: theme.semantic.background.primary },
        presentation: 'modal',
      }}
    >
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{
          title: 'Sign In',
          gestureDirection: 'horizontal',
        }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{
          title: 'Create Account',
          gestureDirection: 'horizontal',
        }}
      />
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{
          title: 'Reset Password',
          gestureDirection: 'horizontal',
        }}
      />
      <Stack.Screen
        name="ResetPassword"
        component={ResetPasswordScreen}
        options={{
          title: 'New Password',
          gestureDirection: 'horizontal',
        }}
      />
      {/* DEPRECATED 2025-11-06: Email verification removed - auto-verify on registration
      <Stack.Screen
        name="EmailVerification"
        component={EmailVerificationScreen}
        options={{
          title: 'Verify Email',
          gestureDirection: 'horizontal',
        }}
      />
      */}
      <Stack.Screen
        name="Welcome"
        component={WelcomeScreen}
        options={{
          title: 'Welcome',
          gestureEnabled: false, // Disable swipe back on welcome screen
        }}
      />
    </Stack.Navigator>
  );
};
