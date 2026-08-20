/**
 * Support Screen
 * Contact form and support options
 */

import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Linking, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, Appbar, Surface, TextInput, Button, List, Divider, HelperText } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeProvider';

type Props = NativeStackScreenProps<RootStackParamList, 'Support'>;

interface FormData {
  subject: string;
  email: string;
  message: string;
}

interface FormErrors {
  subject?: string;
  email?: string;
  message?: string;
}

const SUPPORT_TOPICS = [
  { id: 'general', label: 'General Question' },
  { id: 'account', label: 'Account Issues' },
  { id: 'billing', label: 'Billing & Subscription' },
  { id: 'content', label: 'Content Request' },
  { id: 'vpn', label: 'VPN Recommendations' },
  { id: 'bug', label: 'Report a Bug' },
  { id: 'feedback', label: 'Feature Request' },
];

export const SupportScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [formData, setFormData] = useState<FormData>({
    subject: '',
    email: '',
    message: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.subject.trim()) {
      newErrors.subject = 'Subject is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    } else if (formData.message.trim().length < 20) {
      newErrors.message = 'Message must be at least 20 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // TODO: Implement actual API call to submit support ticket
      await new Promise<void>(resolve => setTimeout(() => resolve(), 1500)); // Simulate API call

      Alert.alert(
        'Message Sent',
        'Thank you for contacting us. We\'ll get back to you within 24-48 hours.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        'Error',
        'Failed to send message. Please try again or email us directly.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailSupport = () => {
    const email = 'hello@example.com';
    const subject = selectedTopic
      ? `[${SUPPORT_TOPICS.find(t => t.id === selectedTopic)?.label}] Support Request`
      : 'Support Request';

    Linking.openURL(`mailto:${email}?subject=${encodeURIComponent(subject)}`);
  };

  const handleTopicSelect = (topicId: string) => {
    setSelectedTopic(topicId);
    const topic = SUPPORT_TOPICS.find(t => t.id === topicId);
    if (topic) {
      setFormData(prev => ({
        ...prev,
        subject: topic.label,
      }));
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Contact Support" />
      </Appbar.Header>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.content}>
          {/* Header Info */}
          <View style={styles.headerInfo}>
            <Icon name="support-agent" size={48} color={theme.colors.primary[500]} />
            <Text style={styles.headerTitle}>How can we help?</Text>
            <Text style={styles.headerSubtitle}>
              Fill out the form below or use one of our other contact methods.
            </Text>
          </View>

          {/* Quick Contact Options */}
          <Surface style={styles.quickContactCard} elevation={1}>
            <List.Item
              title="Email Us Directly"
              description="hello@example.com"
              left={() => <List.Icon icon="email" />}
              right={() => <Icon name="open-in-new" size={20} color={theme.semantic.text.tertiary} />}
              onPress={handleEmailSupport}
            />
            <Divider />
            <List.Item
              title="Visit Help Center"
              description="Browse FAQs and guides"
              left={() => <List.Icon icon="help-circle" />}
              right={() => <Icon name="chevron-right" size={24} color={theme.semantic.text.tertiary} />}
              onPress={() => navigation.navigate('Help')}
            />
          </Surface>

          {/* Support Form */}
          <Surface style={styles.formCard} elevation={1}>
            <Text style={styles.sectionTitle}>Send us a message</Text>

            {/* Topic Selection */}
            <Text style={styles.fieldLabel}>Select a topic</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.topicsContainer}
            >
              {SUPPORT_TOPICS.map(topic => (
                <Button
                  key={topic.id}
                  mode={selectedTopic === topic.id ? 'contained' : 'outlined'}
                  compact
                  onPress={() => handleTopicSelect(topic.id)}
                  style={styles.topicButton}
                >
                  {topic.label}
                </Button>
              ))}
            </ScrollView>

            {/* Subject */}
            <TextInput
              label="Subject"
              value={formData.subject}
              onChangeText={(text) => {
                setFormData(prev => ({ ...prev, subject: text }));
                if (errors.subject) setErrors(prev => ({ ...prev, subject: undefined }));
              }}
              mode="outlined"
              style={styles.input}
              error={!!errors.subject}
            />
            {errors.subject && (
              <HelperText type="error">{errors.subject}</HelperText>
            )}

            {/* Email */}
            <TextInput
              label="Your Email"
              value={formData.email}
              onChangeText={(text) => {
                setFormData(prev => ({ ...prev, email: text }));
                if (errors.email) setErrors(prev => ({ ...prev, email: undefined }));
              }}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
              error={!!errors.email}
            />
            {errors.email && (
              <HelperText type="error">{errors.email}</HelperText>
            )}

            {/* Message */}
            <TextInput
              label="Message"
              value={formData.message}
              onChangeText={(text) => {
                setFormData(prev => ({ ...prev, message: text }));
                if (errors.message) setErrors(prev => ({ ...prev, message: undefined }));
              }}
              mode="outlined"
              multiline
              numberOfLines={5}
              style={[styles.input, styles.messageInput]}
              error={!!errors.message}
            />
            {errors.message && (
              <HelperText type="error">{errors.message}</HelperText>
            )}

            {/* Submit Button */}
            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={isSubmitting}
              disabled={isSubmitting}
              style={styles.submitButton}
              contentStyle={styles.submitButtonContent}
            >
              Send Message
            </Button>
          </Surface>

          {/* Response Time Notice */}
          <View style={styles.noticeContainer}>
            <Icon name="schedule" size={16} color={theme.semantic.text.tertiary} />
            <Text style={styles.noticeText}>
              We typically respond within 24-48 hours
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.semantic.background.primary,
  },
  header: {
    backgroundColor: theme.semantic.background.primary,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    padding: theme.spacing[5],
    paddingBottom: theme.spacing[10],
  },
  headerInfo: {
    alignItems: 'center',
    marginBottom: theme.spacing[6],
  },
  headerTitle: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.semantic.text.primary,
    marginTop: theme.spacing[3],
    marginBottom: theme.spacing[1],
  },
  headerSubtitle: {
    fontSize: theme.typography.fontSize.base,
    color: theme.semantic.text.secondary,
    textAlign: 'center',
  },
  quickContactCard: {
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.semantic.background.secondary,
    marginBottom: theme.spacing[4],
    overflow: 'hidden',
  },
  formCard: {
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing[4],
    backgroundColor: theme.semantic.background.secondary,
    marginBottom: theme.spacing[4],
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.semantic.text.primary,
    marginBottom: theme.spacing[4],
  },
  fieldLabel: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.semantic.text.secondary,
    marginBottom: theme.spacing[2],
  },
  topicsContainer: {
    gap: theme.spacing[2],
    marginBottom: theme.spacing[4],
  },
  topicButton: {
    marginRight: theme.spacing[2],
  },
  input: {
    backgroundColor: theme.semantic.background.primary,
    marginBottom: theme.spacing[2],
  },
  messageInput: {
    minHeight: 120,
  },
  submitButton: {
    marginTop: theme.spacing[4],
    borderRadius: theme.borderRadius.lg,
  },
  submitButtonContent: {
    paddingVertical: theme.spacing[1],
  },
  noticeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing[2],
  },
  noticeText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.semantic.text.tertiary,
  },
});

export default SupportScreen;
