import React from 'react';
import { View, Text } from 'react-native';

const Icon = ({ name, size = 24, color = '#000', ...props }) => {
  return (
    <View
      testID={`icon-${name}`}
      accessible={true}
      accessibilityRole="image"
      accessibilityLabel={name}
      style={{
        width: size,
        height: size,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: color === '#ccc' ? '#ccc' : '#000',
        ...props.style,
      }}
      {...props}
    >
      <Text
        style={{
          fontSize: size * 0.6,
          color: 'white',
          fontFamily: 'Arial',
        }}
      >
        {name ? name.charAt(0).toUpperCase() : 'I'}
      </Text>
    </View>
  );
};

// Support both default and named exports
export default Icon;
export { Icon };

// Also support as a module export for compatibility
module.exports = Icon;
