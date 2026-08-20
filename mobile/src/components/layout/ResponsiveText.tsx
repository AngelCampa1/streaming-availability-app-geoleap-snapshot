/**
 * Responsive Text Component
 * Automatically scales text based on device size
 */

import React, { ReactNode } from 'react';
import { Text, TextStyle, StyleSheet } from 'react-native';
import { normalize } from '../../utils/responsive';
import { useTheme } from '../../hooks/useTheme';

export interface ResponsiveTextProps {
  children: ReactNode;
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'body' | 'caption' | 'label';
  color?: string;
  align?: 'left' | 'center' | 'right' | 'justify';
  weight?: 'light' | 'normal' | 'medium' | 'semibold' | 'bold' | 'extrabold';
  style?: TextStyle;
}

const variantSizes = {
  h1: 32,
  h2: 28,
  h3: 24,
  h4: 20,
  h5: 18,
  h6: 16,
  body: 16,
  caption: 12,
  label: 14,
};

const variantWeights = {
  h1: 'bold',
  h2: 'bold',
  h3: '600',
  h4: '600',
  h5: '600',
  h6: '600',
  body: '400',
  caption: '400',
  label: '500',
} as const;

const fontWeightMap: Record<string, '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900' | 'bold' | 'normal'> = {
  light: '300',
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: 'bold',
  extrabold: '800',
};

export function ResponsiveText({
  children,
  variant = 'body',
  color,
  align = 'left',
  weight,
  style,
}: ResponsiveTextProps) {
  const { theme } = useTheme();

  const fontSize = normalize(variantSizes[variant]);
  const fontWeight = (weight ? fontWeightMap[weight] : variantWeights[variant]) as '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900' | 'bold' | 'normal';
  const textColor = color || theme.semantic.text.primary;

  return (
    <Text
      style={[
        styles.text,
        {
          fontSize,
          fontWeight,
          color: textColor,
          textAlign: align,
        },
        style,
      ]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    includeFontPadding: false,
  },
});

export default ResponsiveText;
