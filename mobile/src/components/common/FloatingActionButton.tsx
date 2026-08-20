import React, { useRef } from 'react';
import {
  TouchableOpacity,
  Animated,
  StyleSheet,
  ViewStyle,
  Platform,
} from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

interface FloatingActionButtonProps {
  onPress: () => void;
  icon: React.ReactNode;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}

const sizeMap = {
  small: 48,
  medium: 56,
  large: 64,
};

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onPress,
  icon,
  position = 'bottom-right',
  size = 'medium',
  style,
  accessibilityLabel = 'Floating action button',
  accessibilityHint,
  testID,
}) => {
  const { theme } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  const buttonSize = sizeMap[size];

  const getPositionStyle = (): ViewStyle => {
    const offset = theme.spacing[4];
    const bottomOffset = Platform.OS === 'ios' ? theme.spacing[8] : theme.spacing[6]; // Account for safe area
    const topOffset = 44; // Status bar height (platform constant)

    switch (position) {
      case 'bottom-right':
        return { bottom: bottomOffset, right: offset };
      case 'bottom-left':
        return { bottom: bottomOffset, left: offset };
      case 'top-right':
        return { top: offset + topOffset, right: offset }; // Account for status bar
      case 'top-left':
        return { top: offset + topOffset, left: offset };
      default:
        return { bottom: bottomOffset, right: offset };
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        getPositionStyle(),
        { transform: [{ scale: scaleAnim }] },
        style,
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.8}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityRole="button"
        testID={testID}
        style={[
          styles.button,
          {
            width: buttonSize,
            height: buttonSize,
            borderRadius: buttonSize / 2,
            backgroundColor: theme.colors.primary[500],
            ...theme.shadows.lg,
          },
        ]}
      >
        {icon}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 999,
  },
  button: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
