/**
 * AppLogo Component
 *
 * Example component demonstrating how to use assets from the root /assets directory.
 * This component shows the proper way to import and use logo assets in the mobile app.
 */

import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import type { ImageStyle, ViewStyle } from 'react-native';
import { LOGOS } from '@/assets';

interface AppLogoProps {
  variant?: 'main' | 'transparent' | 'full';
  size?: 'small' | 'medium' | 'large';
  style?: ImageStyle;
}

const SIZES = {
  small: 80,
  medium: 120,
  large: 200,
} as const;

/**
 * AppLogo component that displays the GeoLeap logo
 * using assets from the root /assets directory
 */
export const AppLogo: React.FC<AppLogoProps> = ({
  variant = 'transparent',
  size = 'medium',
  style,
}) => {
  // Select the appropriate logo based on variant
  const getLogoSource = () => {
    switch (variant) {
      case 'main':
        return LOGOS.main;
      case 'transparent':
        return LOGOS.transparent;
        return LOGOS.main;
        return LOGOS.transparent;
      default:
        return LOGOS.transparent;
    }
  };

  const logoSize = SIZES[size];

  return (
    <View style={styles.container}>
      <Image
        source={getLogoSource()}
        style={[
          styles.logo,
          { width: logoSize, height: logoSize },
          style,
        ]}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  logo: {
    // Base logo styles
  } as ImageStyle,
});

export default AppLogo;
