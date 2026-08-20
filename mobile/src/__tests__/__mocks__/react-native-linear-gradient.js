import React from 'react';
import { View } from 'react-native';

const LinearGradient = ({ children, ...props }) => {
  return <View {...props}>{children}</View>;
};

LinearGradient.defaultProps = {
  colors: ['#000', '#fff'],
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
};

export default LinearGradient;
