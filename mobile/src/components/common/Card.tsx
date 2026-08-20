import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'outlined' | 'elevated' | 'gradient';
  padding?: number;
  margin?: number;
  onPress?: () => void;
  disabled?: boolean;
  testID?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  variant = 'default',
  padding,
  margin = 0,
  onPress: _onPress,
  disabled = false,
  testID,
}) => {
  const { theme } = useTheme();
  const defaultPadding = padding ?? theme.spacing[4];

  const getCardStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      backgroundColor: theme.semantic.background.secondary,
      borderRadius: theme.borderRadius.lg,
      padding: defaultPadding,
      margin,
      ...theme.shadows.sm,
    };

    switch (variant) {
      case 'outlined':
        return {
          ...baseStyle,
          borderWidth: 1,
          borderColor: theme.semantic.border.primary,
          backgroundColor: 'transparent',
          elevation: 0,
          shadowColor: 'transparent',
        };
      case 'elevated':
        return {
          ...baseStyle,
          ...theme.shadows.md,
        };
      case 'gradient':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          padding: 0,
        };
      default:
        return baseStyle;
    }
  };

  const cardStyle = getCardStyle();

  if (variant === 'gradient') {
    return (
      <View style={[style, cardStyle, { backgroundColor: theme.colors.primary[500], padding: defaultPadding }, disabled && styles.disabledOpacity]} testID={testID}>
        {children}
      </View>
    );
  }

  return (
    <View style={[style, cardStyle, disabled && styles.disabledOpacity]} testID={testID}>
      {children}
    </View>
  );
};

interface CardHeaderProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
}

const CardHeader: React.FC<CardHeaderProps> = ({
  children,
  style,
  padding,
}) => {
  const { theme } = useTheme();
  const defaultPadding = padding ?? theme.spacing[4];

  return (
    <View style={[styles.cardHeader, { padding: defaultPadding, borderBottomColor: theme.semantic.border.primary }, style]}>
      {children}
    </View>
  );
};

interface CardContentProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
}

const CardContent: React.FC<CardContentProps> = ({
  children,
  style,
  padding,
}) => {
  const { theme } = useTheme();
  const defaultPadding = padding ?? theme.spacing[4];

  return (
    <View style={[styles.cardContent, { padding: defaultPadding }, style]}>
      {children}
    </View>
  );
};

interface CardFooterProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
}

const CardFooter: React.FC<CardFooterProps> = ({
  children,
  style,
  padding,
}) => {
  const { theme } = useTheme();
  const defaultPadding = padding ?? theme.spacing[4];

  return (
    <View style={[styles.cardFooter, { padding: defaultPadding, borderTopColor: theme.semantic.border.primary }, style]}>
      {children}
    </View>
  );
};

// Create augmented Card component with subcomponents
interface CardComponentType extends React.FC<CardProps> {
  Header: React.FC<CardHeaderProps>;
  Content: React.FC<CardContentProps>;
  Footer: React.FC<CardFooterProps>;
}

const CardComponent = Card as CardComponentType;
CardComponent.Header = CardHeader;
CardComponent.Content = CardContent;
CardComponent.Footer = CardFooter;

export { CardHeader, CardContent, CardFooter };
export { CardComponent };
export default CardComponent;

const styles = StyleSheet.create({
  disabledOpacity: {
    opacity: 0.6,
  },
  cardHeader: {
    borderBottomWidth: 1,
  },
  cardContent: {
    flex: 1,
  },
  cardFooter: {
    borderTopWidth: 1,
  },
});
