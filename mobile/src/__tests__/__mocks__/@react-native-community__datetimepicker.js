import React from 'react';
import { TouchableOpacity, Text } from 'react-native';

const MockDateTimePicker = ({ value, onChange, ..._props }) => {
  return (
    <TouchableOpacity onPress={() => onChange(new Date())}>
      <Text>{value?.toString() || 'Select Date'}</Text>
    </TouchableOpacity>
  );
};

export default MockDateTimePicker;
