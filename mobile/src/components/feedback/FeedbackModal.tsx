import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import {
  FeedbackCategory,
  FeedbackCategoryLabels,
  submitFeedback,
} from '../../services/feedbackService';

interface FeedbackModalProps {
  visible: boolean;
  onClose: () => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ visible, onClose }) => {
  const { theme } = useTheme();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<FeedbackCategory>(FeedbackCategory.General);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const characterCount = message.length;
  const maxCharacters = 2000;
  const minCharacters = 10;
  const isMessageValid = characterCount >= minCharacters && characterCount <= maxCharacters;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  const resetForm = () => {
    setSubject('');
    setMessage('');
    setCategory(FeedbackCategory.General);
    setEmail('');
    setSubmitStatus('idle');
    setErrorMessage('');
    setShowCategoryPicker(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!isMessageValid) {
      setErrorMessage(`Message must be between ${minCharacters} and ${maxCharacters} characters.`);
      setSubmitStatus('error');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      const response = await submitFeedback({
        message,
        subject: subject || undefined,
        category,
        email: email || undefined,
        platform: 'Mobile',
      });

      if (response.success) {
        setSubmitStatus('success');
        setTimeout(() => {
          handleClose();
        }, 2000);
      } else {
        setSubmitStatus('error');
        setErrorMessage(response.message);
      }
    } catch (error) {
      setSubmitStatus('error');
      setErrorMessage('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const styles = createStyles(theme);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoid}
        >
          <Animated.View
            style={[
              styles.container,
              { transform: [{ translateY: slideAnim }] },
            ]}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Send Feedback</Text>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>

            {submitStatus === 'success' ? (
              <View style={styles.successContainer}>
                <Text style={styles.successIcon}>✓</Text>
                <Text style={styles.successTitle}>Thank you!</Text>
                <Text style={styles.successMessage}>
                  Your feedback has been submitted successfully.
                </Text>
              </View>
            ) : (
              <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <Text style={styles.description}>
                  We value your feedback! Let us know how we can improve.
                </Text>

                {/* Category Picker */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Category</Text>
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => setShowCategoryPicker(!showCategoryPicker)}
                  >
                    <Text style={styles.pickerText}>
                      {FeedbackCategoryLabels[category]}
                    </Text>
                    <Text style={styles.pickerArrow}>▼</Text>
                  </TouchableOpacity>

                  {showCategoryPicker && (
                    <View style={styles.pickerDropdown}>
                      {Object.entries(FeedbackCategoryLabels).map(([value, label]) => (
                        <TouchableOpacity
                          key={value}
                          style={[
                            styles.pickerOption,
                            parseInt(value) === category && styles.pickerOptionSelected,
                          ]}
                          onPress={() => {
                            setCategory(parseInt(value) as FeedbackCategory);
                            setShowCategoryPicker(false);
                          }}
                        >
                          <Text
                            style={[
                              styles.pickerOptionText,
                              parseInt(value) === category && styles.pickerOptionTextSelected,
                            ]}
                          >
                            {label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* Subject */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>
                    Subject <Text style={styles.optional}>(optional)</Text>
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={subject}
                    onChangeText={setSubject}
                    placeholder="Brief description of your feedback"
                    placeholderTextColor={theme.semantic.text.secondary}
                    maxLength={100}
                  />
                </View>

                {/* Message */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>
                    Message <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={message}
                    onChangeText={setMessage}
                    placeholder="Tell us what's on your mind..."
                    placeholderTextColor={theme.semantic.text.secondary}
                    multiline
                    numberOfLines={5}
                    textAlignVertical="top"
                    maxLength={maxCharacters}
                  />
                  <View style={styles.characterCountContainer}>
                    {characterCount < minCharacters && (
                      <Text style={styles.characterWarning}>
                        {minCharacters - characterCount} more characters needed
                      </Text>
                    )}
                    <Text
                      style={[
                        styles.characterCount,
                        characterCount > maxCharacters && styles.characterCountError,
                      ]}
                    >
                      {characterCount}/{maxCharacters}
                    </Text>
                  </View>
                </View>

                {/* Email */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>
                    Email <Text style={styles.optional}>(optional, for follow-up)</Text>
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="your@email.com"
                    placeholderTextColor={theme.semantic.text.secondary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                {/* Error Message */}
                {submitStatus === 'error' && errorMessage && (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                )}

                {/* Buttons */}
                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={handleClose}
                    disabled={isSubmitting}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.submitButton,
                      (!isMessageValid || isSubmitting) && styles.submitButtonDisabled,
                    ]}
                    onPress={handleSubmit}
                    disabled={!isMessageValid || isSubmitting}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color={theme.semantic?.text?.inverse || theme.colors.neutral?.[50] || '#fff'} size="small" />
                    ) : (
                      <Text style={styles.submitButtonText}>Send Feedback</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: theme.colors.overlay.lightMedium,
      justifyContent: 'flex-end',
    },
    keyboardAvoid: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    container: {
      backgroundColor: theme.semantic.background.primary,
      borderTopLeftRadius: theme.borderRadius['2xl'],
      borderTopRightRadius: theme.borderRadius['2xl'],
      maxHeight: SCREEN_HEIGHT * 0.85,
      paddingBottom: Platform.OS === 'ios' ? theme.spacing[8.5] : theme.spacing[5],
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: theme.spacing[4],
      borderBottomWidth: 1,
      borderBottomColor: theme.semantic.border.primary,
    },
    title: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.semantic.text.primary,
    },
    closeButton: {
      width: theme.spacing[8],
      height: theme.spacing[8],
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.semantic.background.secondary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    closeButtonText: {
      fontSize: theme.typography.fontSize['2xl'],
      color: theme.semantic.text.secondary,
      lineHeight: theme.typography.fontSize['2xl'] * 1.08,
    },
    content: {
      padding: theme.spacing[4],
    },
    description: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.semantic.text.secondary,
      marginBottom: theme.spacing[5],
    },
    fieldContainer: {
      marginBottom: theme.spacing[4],
    },
    label: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.semantic.text.primary,
      marginBottom: theme.spacing[2],
    },
    optional: {
      color: theme.semantic.text.secondary,
      fontWeight: '400',
    },
    required: {
      color: theme.colors.error,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.semantic.border.primary,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing[3],
      fontSize: theme.typography.fontSize.base,
      color: theme.semantic.text.primary,
      backgroundColor: theme.semantic.background.primary,
    },
    textArea: {
      height: theme.spacing[30],
      textAlignVertical: 'top',
    },
    characterCountContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: theme.spacing[1],
    },
    characterWarning: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.warning,
    },
    characterCount: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.semantic.text.secondary,
      marginLeft: 'auto',
    },
    characterCountError: {
      color: theme.colors.error,
    },
    pickerButton: {
      borderWidth: 1,
      borderColor: theme.semantic.border.primary,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing[3],
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: theme.semantic.background.primary,
    },
    pickerText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.semantic.text.primary,
    },
    pickerArrow: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.semantic.text.secondary,
    },
    pickerDropdown: {
      marginTop: theme.spacing[1],
      borderWidth: 1,
      borderColor: theme.semantic.border.primary,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.semantic.background.primary,
      overflow: 'hidden',
    },
    pickerOption: {
      padding: theme.spacing[3],
      borderBottomWidth: 1,
      borderBottomColor: theme.semantic.border.primary,
    },
    pickerOptionSelected: {
      backgroundColor: theme.colors.primary[100],
    },
    pickerOptionText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.semantic.text.primary,
    },
    pickerOptionTextSelected: {
      color: theme.colors.primary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    errorContainer: {
      backgroundColor: `${theme.colors.error}15`,
      padding: theme.spacing[3],
      borderRadius: theme.borderRadius.lg,
      marginBottom: theme.spacing[4],
    },
    errorText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.error,
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: theme.spacing[3],
      marginTop: theme.spacing[2],
    },
    cancelButton: {
      flex: 1,
      padding: theme.spacing[3.5],
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.semantic.border.primary,
      alignItems: 'center',
    },
    cancelButtonText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.semantic.text.primary,
    },
    submitButton: {
      flex: 1,
      padding: theme.spacing[3.5],
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
    },
    submitButtonDisabled: {
      backgroundColor: theme.semantic.text.primaryDisabled,
    },
    submitButtonText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.semantic?.text?.onAccent ?? '#fff',
      fontWeight: theme.typography.fontWeight.semibold,
    },
    successContainer: {
      alignItems: 'center',
      padding: theme.spacing[10],
    },
    successIcon: {
      fontSize: theme.typography.fontSize['5xl'],
      color: theme.colors.success,
      marginBottom: theme.spacing[4],
    },
    successTitle: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.semantic.text.primary,
      marginBottom: theme.spacing[2],
    },
    successMessage: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.semantic.text.secondary,
      textAlign: 'center',
    },
  });
