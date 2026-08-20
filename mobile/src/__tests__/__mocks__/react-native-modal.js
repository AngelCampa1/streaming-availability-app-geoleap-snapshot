import React from 'react';
import { View } from 'react-native';

const MockComponent = ({ children, ...props }) => {
  return <View {...props}>{children}</View>;
};

export default MockComponent;
