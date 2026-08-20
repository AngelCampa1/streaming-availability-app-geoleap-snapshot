import React, { useEffect, useRef } from 'react';
import {
  Text,
  StyleSheet,
  TextStyle,
  ViewStyle,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface ValidationMessageProps {
  type?: 'error' | 'success' | 'warning' | 'info';
  message: string;
  visible?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
}

export const ValidationMessage: React.FC<ValidationMessageProps> = ({
  type = 'error',
  message,
  visible = true,
  style,
  textStyle,
  icon,
  dismissible = false,
  onDismiss,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -20,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, slideAnim]);

  const getTypeConfig = () => {
    switch (type) {
      case 'error':
        return {
          backgroundColor: theme.colors.error[500] + '10',
          borderColor: theme.colors.error[500],
          textColor: theme.colors.error[500],
          icon: icon || '❌',
        };
      case 'success':
        return {
          backgroundColor: theme.colors.success[500] + '10',
          borderColor: theme.colors.success[500],
          textColor: theme.colors.success[500],
          icon: icon || '✅',
        };
      case 'warning':
        return {
          backgroundColor: theme.colors.warning[500] + '10',
          borderColor: theme.colors.warning[500],
          textColor: theme.colors.warning[500],
          icon: icon || '⚠️',
        };
      case 'info':
        return {
          backgroundColor: theme.colors.primary[500] + '10',
          borderColor: theme.colors.primary[500],
          textColor: theme.colors.primary[500],
          icon: icon || 'ℹ️',
        };
      default:
        return {
          backgroundColor: theme.semantic.background.secondary,
          borderColor: theme.semantic.border.primary,
          textColor: theme.semantic.text.primary,
          icon: '📝',
        };
    }
  };

  const config = getTypeConfig();

  const containerStyle: ViewStyle = {
    backgroundColor: config.backgroundColor,
    borderColor: config.borderColor,
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing[2],
    marginBottom: theme.spacing[2],
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: theme.colors.neutral?.[900] || '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  };

  const messageTextStyle: TextStyle = {
    color: config.textColor,
    fontSize: theme.typography.fontSize.sm,
    lineHeight: Number(theme.typography.fontSize.sm) * 1.5,
    flex: 1,
    ...textStyle,
  };

  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        containerStyle,
        style,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Text style={styles.icon}>{config.icon}</Text>
      <Text style={messageTextStyle}>{message}</Text>
      {dismissible && onDismiss && (
        <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
          <Text style={styles.dismissButtonText}>✕</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    width: '100%',
  },
  icon: {
    fontSize: theme.typography.fontSize.base,
    marginRight: theme.spacing[2],
    marginTop: theme.spacing[0.5] || 2,
  },
  dismissButton: {
    marginLeft: theme.spacing[2],
    padding: theme.spacing[1],
  },
  dismissButtonText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.semantic.text.secondary,
  },
});

// Validation helper functions
export const validators = {
  email: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  password: (password: string): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain lowercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain number');
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain special character');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  required: (value: string): boolean => {
    return value.trim().length > 0;
  },

  minLength: (value: string, min: number): boolean => {
    return value.length >= min;
  },

  maxLength: (value: string, max: number): boolean => {
    return value.length <= max;
  },

  phone: (phone: string): boolean => {
    const phoneRegex = /^\+?[\d\s\-()]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
  },

  name: (name: string): boolean => {
    return name.trim().length >= 2 && /^[a-zA-Z\s\-']+$/.test(name);
  },
};

interface FormFieldProps {
  value: string;
  error?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  type?: 'email' | 'password' | 'name' | 'phone' | 'text';
}

export const useValidation = () => {
  const validateField = (field: FormFieldProps): string | null => {
    const { value, error, required = false, minLength, maxLength, type = 'text' } = field;

    // Return existing error if present
    if (error) {return error;}

    // Check if required and empty
    if (required && !validators.required(value)) {
      return 'This field is required';
    }

    // Skip other validations if empty and not required
    if (!required && !value.trim()) {
      return null;
    }

    // Type-specific validations
    switch (type) {
      case 'email':
        if (!validators.email(value)) {
          return 'Please enter a valid email address';
        }
        break;

      case 'password': {
        const passwordValidation = validators.password(value);
        if (!passwordValidation.isValid) {
          return passwordValidation.errors[0]; // Return first error
        }
        break;
      }

      case 'name':
        if (!validators.name(value)) {
          return 'Please enter a valid name';
        }
        break;

      case 'phone':
        if (!validators.phone(value)) {
          return 'Please enter a valid phone number';
        }
        break;
    }

    // Length validations
    if (minLength && !validators.minLength(value, minLength)) {
      return `Must be at least ${minLength} characters`;
    }

    if (maxLength && !validators.maxLength(value, maxLength)) {
      return `Must be no more than ${maxLength} characters`;
    }

    return null;
  };

  const validateForm = (fields: Record<string, FormFieldProps>): Record<string, string> => {
    const errors: Record<string, string> = {};

    Object.entries(fields).forEach(([fieldName, field]) => {
      const error = validateField(field);
      if (error) {
        errors[fieldName] = error;
      }
    });

    return errors;
  };

  return { validateField, validateForm, validators };
};
