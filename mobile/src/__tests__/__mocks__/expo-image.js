import React from 'react';
import { Image as RNImage } from 'react-native';

// Mock expo-image's Image component
const Image = React.forwardRef(({ source, contentFit, _cachePolicy, _priority, ...props }, ref) => {
  // Convert expo-image source format to react-native Image source format
  const imageSource = typeof source === 'string'
    ? { uri: source }
    : source && source.uri
      ? { uri: source.uri }
      : source;

  // Map contentFit to resizeMode for RN Image
  const resizeMode = contentFit === 'cover' ? 'cover'
    : contentFit === 'contain' ? 'contain'
    : contentFit === 'fill' ? 'stretch'
    : contentFit === 'none' ? 'center'
    : 'cover';

  return <RNImage source={imageSource} resizeMode={resizeMode} ref={ref} {...props} />;
});

Image.displayName = 'ExpoImage';

// Mock static methods
Image.prefetch = jest.fn(() => Promise.resolve(true));
Image.clearMemoryCache = jest.fn(() => Promise.resolve());
Image.clearDiskCache = jest.fn(() => Promise.resolve());
Image.getCachePathAsync = jest.fn(() => Promise.resolve(null));

export { Image };
export default { Image };
