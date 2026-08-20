import React from 'react';
import { TouchableOpacity, Text } from 'react-native';

const Share = ({ url: _url, message: _message, title: _title }) => {
  return (
    <TouchableOpacity>
      <Text>Share</Text>
    </TouchableOpacity>
  );
};

export default {
  open: jest.fn(() => Promise.resolve()),
  shareSingle: jest.fn(() => Promise.resolve()),
  Share,
};
