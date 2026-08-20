import React from 'react';
import { TouchableOpacity, Text } from 'react-native';

const LoginButton = ({ onLoginFinished }) => {
  return (
    <TouchableOpacity onPress={() => onLoginFinished({ isCancelled: false })}>
      <Text>Facebook Login</Text>
    </TouchableOpacity>
  );
};

module.exports = {
  LoginButton,
  LoginManager: {
    logInWithPermissions: jest.fn(() => Promise.resolve({ isCancelled: false })),
    logOut: jest.fn(),
  },
  ShareDialog: {
    show: jest.fn(() => Promise.resolve({ isCompleted: true })),
  },
  AccessToken: {
    getCurrentAccessToken: jest.fn(() => Promise.resolve({
      accessToken: 'mock-facebook-token',
      userID: 'mock-user-id',
    })),
  },
  GraphRequest: jest.fn(),
  GraphRequestManager: {
    addRequest: jest.fn(() => ({
      start: jest.fn((callback) => callback(null, { name: 'Test User', email: 'test@example.com' })),
    })),
  },
};
module.exports.default = module.exports;
