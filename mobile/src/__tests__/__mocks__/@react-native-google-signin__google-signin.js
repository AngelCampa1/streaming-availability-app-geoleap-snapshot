import React from 'react';
import { TouchableOpacity, Text } from 'react-native';

const GoogleSigninButton = ({ _size, color, onPress, disabled }) => {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled}>
      <Text style={{ color }}>Google Sign In</Text>
    </TouchableOpacity>
  );
};

export default {
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(() => Promise.resolve(true)),
    signIn: jest.fn(() => Promise.resolve({
      user: {
        email: 'test@gmail.com',
        name: 'Test User',
        photo: null,
      },
      idToken: 'mock-id-token',
      serverAuthCode: 'mock-auth-code',
    })),
    signOut: jest.fn(() => Promise.resolve()),
    getCurrentUser: jest.fn(() => Promise.resolve({
      email: 'test@gmail.com',
      name: 'Test User',
      photo: null,
    })),
  },
  GoogleSigninButton,
  statusCodes: {
    SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
    IN_PROGRESS: 'IN_PROGRESS',
    PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
  },
};
