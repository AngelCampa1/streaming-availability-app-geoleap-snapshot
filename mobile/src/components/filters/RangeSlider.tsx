/**
 * RangeSlider Component - Custom range slider for numeric filters
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  PanResponder,
  Dimensions,
  StyleSheet,
  Text,
  Animated,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface RangeSliderProps {
  min: number;
  max: number;
  value: [number, number];
  onValueChange: (value: [number, number]) => void;
  step?: number;
  disabled?: boolean;
  showLabels?: boolean;
  showValue?: boolean;
  minLabel?: string;
  maxLabel?: string;
  color?: string;
  height?: number;
}

export const RangeSlider: React.FC<RangeSliderProps> = ({
  min,
  max,
  value,
  onValueChange,
  step = 1,
  disabled = false,
  showLabels = true,
  showValue = true,
  minLabel,
  maxLabel,
  color,
  height = 40,
}) => {
  const theme = useTheme();
  const sliderWidth = useRef(Dimensions.get('window').width - 40);
  const [isMoving, setIsMoving] = useState<'min' | 'max' | null>(null);
  const [displayValue, setDisplayValue] = useState<[number, number]>(value);
  const leftThumbAnimation = useRef(new Animated.Value(0)).current;
  const rightThumbAnimation = useRef(new Animated.Value(0)).current;

  const primaryColor = typeof theme.colors.primary === 'string'
    ? theme.colors.primary
    : theme.colors.primary[500];

  const sliderColor = color || primaryColor;
  const sliderHeight = height;

  // Calculate thumb position
  const calculateThumbPosition = useCallback((val: number): number => {
    const range = max - min;
    const percentage = (val - min) / range;
    return percentage * sliderWidth.current;
  }, [max, min]);

  // Calculate value from position
  const calculateValueFromPosition = useCallback((position: number): number => {
    const percentage = position / sliderWidth.current;
    const rawValue = min + (percentage * (max - min));

    // Apply step
    const steppedValue = Math.round(rawValue / step) * step;

    // Clamp to range
    return Math.max(min, Math.min(max, steppedValue));
  }, [min, max, step]);

  // Update display value when props change
  useEffect(() => {
    setDisplayValue(value);
  }, [value]);

  // Animate thumbs
  useEffect(() => {
    const leftPos = calculateThumbPosition(displayValue[0]);
    const rightPos = calculateThumbPosition(displayValue[1]);

    Animated.parallel([
      Animated.timing(leftThumbAnimation, {
        toValue: leftPos,
        duration: 150,
        useNativeDriver: false,
      }),
      Animated.timing(rightThumbAnimation, {
        toValue: rightPos,
        duration: 150,
        useNativeDriver: false,
      }),
    ]).start();
  }, [displayValue, calculateThumbPosition, leftThumbAnimation, rightThumbAnimation]);

  // Pan responder for min thumb
  const minPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => !disabled,
    onMoveShouldSetPanResponder: () => !disabled,

    onPanResponderGrant: () => {
      setIsMoving('min');
    },

    onPanResponderMove: (_, gestureState) => {
      const newPosition = Math.max(0, Math.min(gestureState.x0 + gestureState.dx, sliderWidth.current));
      const newValue = calculateValueFromPosition(newPosition);

      setDisplayValue(prev => {
        const newMin = Math.min(newValue, prev[1] - step);
        return [newMin, prev[1]];
      });
    },

    onPanResponderRelease: () => {
      setIsMoving(null);
      onValueChange(displayValue);
    },
  });

  // Pan responder for max thumb
  const maxPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => !disabled,
    onMoveShouldSetPanResponder: () => !disabled,

    onPanResponderGrant: () => {
      setIsMoving('max');
    },

    onPanResponderMove: (_, gestureState) => {
      const newPosition = Math.max(0, Math.min(gestureState.x0 + gestureState.dx, sliderWidth.current));
      const newValue = calculateValueFromPosition(newPosition);

      setDisplayValue(prev => {
        const newMax = Math.max(newValue, prev[0] + step);
        return [prev[0], newMax];
      });
    },

    onPanResponderRelease: () => {
      setIsMoving(null);
      onValueChange(displayValue);
    },
  });

  const leftThumbPosition = calculateThumbPosition(displayValue[0]);
  const rightThumbPosition = calculateThumbPosition(displayValue[1]);
  const trackWidth = rightThumbPosition - leftThumbPosition;

  const styles = StyleSheet.create({
    container: {
      paddingVertical: theme.spacing[5],
      paddingHorizontal: theme.spacing[5],
    },
    labelsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: theme.spacing[3],
    },
    label: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.secondary[500],
      fontWeight: '500',
    },
    sliderContainer: {
      height: sliderHeight,
      justifyContent: 'center',
      position: 'relative',
    },
    track: {
      position: 'absolute',
      height: 4,
      backgroundColor: theme.colors.neutral[200],
      borderRadius: theme.borderRadius.sm,
      left: 0,
      right: 0,
    },
    activeTrack: {
      position: 'absolute',
      height: 4,
      backgroundColor: sliderColor,
      borderRadius: theme.borderRadius.sm,
      left: leftThumbPosition,
      width: trackWidth,
    },
    thumb: {
      position: 'absolute',
      width: 24,
      height: 24,
      borderRadius: theme.borderRadius.xl,
      backgroundColor: theme.colors.neutral[50],
      borderWidth: 3,
      borderColor: sliderColor,
      ...theme.shadows.sm,
      top: '50%',
      marginTop: -12,
    },
    activeThumb: {
      transform: [{ scale: 1.2 }],
      ...theme.shadows.md,
    },
    disabledThumb: {
      backgroundColor: theme.colors.neutral[200],
      borderColor: theme.colors.secondary[400],
    },
    valuesContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: theme.spacing[3],
    },
    valueText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: '600',
      color: theme.colors.neutral[900],
    },
    rangeText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: '600',
      color: sliderColor,
      textAlign: 'center',
      flex: 1,
    },
  });

  return (
    <View style={styles.container}>
      {showLabels && (
        <View style={styles.labelsContainer}>
          <Text style={styles.label}>
            {minLabel || `Min: ${min}`}
          </Text>
          <Text style={styles.label}>
            {maxLabel || `Max: ${max}`}
          </Text>
        </View>
      )}

      <View style={styles.sliderContainer}>
        {/* Background track */}
        <View style={styles.track} />

        {/* Active track */}
        <View
          style={[
            styles.activeTrack,
            disabled && { backgroundColor: theme.semantic.border.primary },
          ]}
        />

        {/* Min thumb */}
        <Animated.View
          {...minPanResponder.panHandlers}
          style={[
            styles.thumb,
            {
              transform: [
                { translateX: leftThumbAnimation },
              ],
            },
            isMoving === 'min' && styles.activeThumb,
            disabled && styles.disabledThumb,
          ]}
        />

        {/* Max thumb */}
        <Animated.View
          {...maxPanResponder.panHandlers}
          style={[
            styles.thumb,
            {
              transform: [
                { translateX: rightThumbAnimation },
              ],
            },
            isMoving === 'max' && styles.activeThumb,
            disabled && styles.disabledThumb,
          ]}
        />
      </View>

      {showValue && (
        <View style={styles.valuesContainer}>
          <Text style={styles.valueText}>{displayValue[0]}</Text>
          <Text style={styles.rangeText}>
            {displayValue[0]} - {displayValue[1]}
          </Text>
          <Text style={styles.valueText}>{displayValue[1]}</Text>
        </View>
      )}
    </View>
  );
};

export default RangeSlider;
