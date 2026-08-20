import React from 'react';
import { FlatList } from 'react-native';

const FlashList = ({ data, renderItem, ...props }) => {
  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      {...props}
    />
  );
};

export default FlashList;
