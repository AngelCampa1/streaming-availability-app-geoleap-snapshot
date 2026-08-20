/**
 * Five Star Rating Component
 * Interactive star rating with submission to API
 */

import React, { useState, useMemo, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../theme/ThemeProvider';

interface FiveStarRatingProps {
  contentId: string;
  currentRating?: number;
  userRating?: number;
  totalRatings?: number;
  onRate?: (rating: number) => void;
  onRatingSubmit?: (contentId: string, rating: number) => Promise<void>;
  size?: 'small' | 'medium' | 'large';
  readonly?: boolean;
  showSubmitButton?: boolean;
  showAverage?: boolean;
}

export const FiveStarRating: React.FC<FiveStarRatingProps> = ({
  contentId,
  currentRating = 0,
  userRating,
  totalRatings,
  onRate,
  onRatingSubmit,
  size = 'medium',
  readonly = false,
  showSubmitButton = true,
  showAverage = true,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme, size), [theme, size]);

  const [selectedRating, setSelectedRating] = useState(userRating || 0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const iconSize = size === 'small' ? 20 : size === 'large' ? 32 : 24;

  const handleStarPress = useCallback((rating: number) => {
    if (readonly) return;

    setSelectedRating(rating);
    setSubmitStatus('idle');
    onRate?.(rating);
  }, [readonly, onRate]);

  const handleSubmit = useCallback(async () => {
    if (selectedRating === 0 || !onRatingSubmit) return;

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      await onRatingSubmit(contentId, selectedRating);
      setSubmitStatus('success');
    } catch (_error) {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedRating, onRatingSubmit, contentId]);

  const displayRating = selectedRating || currentRating;

  const renderStar = (position: number) => {
    const isFilled = position <= displayRating;
    const isHalfFilled = position === Math.ceil(currentRating) &&
                         currentRating % 1 >= 0.25 &&
                         currentRating % 1 < 0.75 &&
                         selectedRating === 0;

    return (
      <TouchableOpacity
        key={position}
        onPress={() => handleStarPress(position)}
        disabled={readonly}
        style={styles.starButton}
        activeOpacity={readonly ? 1 : 0.7}
        accessibilityLabel={`Rate ${position} star${position === 1 ? '' : 's'}`}
        accessibilityRole="button"
      >
        <Icon
          name={isFilled ? 'star' : isHalfFilled ? 'star-half' : 'star-border'}
          size={iconSize}
          color={isFilled || isHalfFilled ? theme.colors.warning[500] : theme.colors.gray[300]}
        />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Stars Row */}
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map(renderStar)}
      </View>

      {/* Rating Info */}
      <View style={styles.infoContainer}>
        {selectedRating > 0 && (
          <Text style={styles.selectedText}>
            {selectedRating} star{selectedRating === 1 ? '' : 's'}
          </Text>
        )}

        {showAverage && currentRating > 0 && (
          <Text style={styles.averageText}>
            Avg: {currentRating.toFixed(1)}
            {totalRatings !== undefined && ` (${totalRatings})`}
          </Text>
        )}

        {userRating && userRating !== selectedRating && (
          <Text style={styles.userRatingText}>
            Your rating: {userRating}
          </Text>
        )}
      </View>

      {/* Submit Button */}
      {showSubmitButton && !readonly && onRatingSubmit && (
        <TouchableOpacity
          style={[
            styles.submitButton,
            (selectedRating === 0 || isSubmitting) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={selectedRating === 0 || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={theme.colors.white} />
          ) : (
            <Text style={styles.submitButtonText}>
              {submitStatus === 'success' ? 'Submitted!' : 'Submit Rating'}
            </Text>
          )}
        </TouchableOpacity>
      )}

      {/* Status Messages */}
      {submitStatus === 'success' && (
        <View style={styles.statusContainer}>
          <Icon name="check-circle" size={16} color={theme.colors.success[500]} />
          <Text style={styles.successText}>Rating submitted successfully!</Text>
        </View>
      )}

      {submitStatus === 'error' && (
        <View style={styles.statusContainer}>
          <Icon name="error" size={16} color={theme.colors.error[500]} />
          <Text style={styles.errorText}>Failed to submit. Tap to retry.</Text>
        </View>
      )}
    </View>
  );
};

const createStyles = (theme: any, size: string) => {
  const padding = size === 'small' ? 2 : size === 'large' ? 6 : 4;

  return StyleSheet.create({
    container: {
      alignItems: 'center',
    },
    starsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    starButton: {
      padding,
    },
    infoContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: theme.spacing[2],
      gap: theme.spacing[2],
    },
    selectedText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.semantic.text.primary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    averageText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.semantic.text.secondary,
    },
    userRatingText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.primary[500],
    },
    submitButton: {
      backgroundColor: theme.colors.primary[500],
      paddingHorizontal: theme.spacing[4],
      paddingVertical: theme.spacing[2],
      borderRadius: theme.borderRadius.md,
      marginTop: theme.spacing[3],
      minWidth: 120,
      alignItems: 'center',
    },
    submitButtonDisabled: {
      backgroundColor: theme.colors.gray[300],
    },
    submitButtonText: {
      color: theme.colors.white,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
    },
    statusContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing[1],
      marginTop: theme.spacing[2],
    },
    successText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.success[500],
    },
    errorText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.error[500],
    },
  });
};

export default FiveStarRating;
