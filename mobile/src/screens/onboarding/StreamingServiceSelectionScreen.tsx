/**
 * Streaming Service Selection Screen
 * Onboarding step for users to select their streaming services
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Appbar, Banner } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ServiceSelector } from '../../components/streaming/ServiceSelector';
import { useStreamingServices } from '../../hooks/useStreamingServices';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing as designThemeSpacing, typography as designThemeTypography, borderRadius as designThemeBorderRadius } from '../../tokens/designTokens';

const designTheme = { spacing: designThemeSpacing, typography: designThemeTypography, borderRadius: designThemeBorderRadius };
import { logger } from '../../utils/logger';

type Props = NativeStackScreenProps<RootStackParamList, 'StreamingServiceSelection'>;

export const StreamingServiceSelectionScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const isOnboarding = route.params?.isOnboarding ?? true;
  const userId = route.params?.userId;

  const {
    selectedServices,
    selectService,
    deselectService,
    savePreferences,
    isSaving,
    hasUnsavedChanges: _hasUnsavedChanges,
  } = useStreamingServices(userId);

  const [showSuccessBanner, setShowSuccessBanner] = useState(false);

  const handleToggleService = (serviceId: string) => {
    if (selectedServices.includes(serviceId)) {
      deselectService(serviceId);
    } else {
      selectService(serviceId);
    }
  };

  const handleContinue = async () => {
    try {
      await savePreferences();
      setShowSuccessBanner(true);

      // Navigate after short delay
      setTimeout(() => {
        if (isOnboarding) {
          // Continue to next onboarding step (Content Preferences)
          navigation.navigate('ContentPreferences');
        } else {
          // Just go back if editing preferences
          navigation.goBack();
        }
      }, 1500);
    } catch (_error) {
      logger.error('[StreamingServiceSelectionScreen] Failed to save preferences', _error);
      // TODO: Show error toast/snackbar
    }
  };

  const handleSkip = () => {
    if (isOnboarding) {
      // Skip to next onboarding step even if no services selected
      navigation.navigate('ContentPreferences');
    } else {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.semantic.background.primary }]} edges={['top']}>
      {/* Header */}
      {!isOnboarding && (
        <Appbar.Header>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content title="Streaming Services" />
        </Appbar.Header>
      )}

      {/* Success Banner */}
      <Banner
        visible={showSuccessBanner}
        actions={[]}
        icon="check-circle"
        style={{ backgroundColor: theme.colors.success[50] }}
      >
        <Text style={{ color: theme.colors.success[700], fontWeight: '600' }}>
          Preferences saved successfully! 🎉
        </Text>
      </Banner>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Text */}
        <View style={styles.header}>
          <Text variant="headlineMedium" style={[styles.title, { color: theme.semantic.text.primary }]}>
            {isOnboarding ? 'Select Your Streaming Services' : 'Edit Streaming Services'}
          </Text>
          <Text variant="bodyLarge" style={[styles.subtitle, { color: theme.semantic.text.secondary }]}>
            Choose the streaming platforms you have access to. We'll show you where content is available on your services.
          </Text>
        </View>

        {/* Service Selector */}
        <ServiceSelector
          selectedServices={selectedServices}
          onToggleService={handleToggleService}
          showDescription={true}
        />

        {/* Helper Text */}
        {selectedServices.length === 0 && (
          <View style={[styles.helperBox, { backgroundColor: theme.semantic.background.secondary }]}>
            <Text style={[styles.helperText, { color: theme.semantic.text.secondary }]}>
              💡 Select at least one service to get personalized results
            </Text>
          </View>
        )}

        {selectedServices.length > 0 && (
          <View style={[styles.helperBox, { backgroundColor: theme.colors.primary[500] + '15' }]}>
            <Text style={[styles.helperText, { color: theme.colors.primary[500] }]}>
              ✨ Great! You've selected {selectedServices.length} service{selectedServices.length > 1 ? 's' : ''}.
              We'll prioritize content available on these platforms.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom Actions */}
      <View style={[styles.actions, { backgroundColor: theme.semantic.background.secondary, borderTopColor: theme.semantic.border.primary }]}>
        {isOnboarding && (
          <Button
            mode="text"
            onPress={handleSkip}
            style={styles.skipButton}
            disabled={isSaving}
          >
            Skip for now
          </Button>
        )}
        <Button
          mode="contained"
          onPress={handleContinue}
          style={styles.continueButton}
          loading={isSaving}
          disabled={selectedServices.length === 0 || isSaving}
        >
          {isOnboarding ? 'Continue' : 'Save Changes'}
        </Button>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingVertical: designTheme.spacing.lg,
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: designTheme.spacing.lg,
    marginBottom: designTheme.spacing.lg,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: designTheme.spacing.sm,
  },
  subtitle: {
    lineHeight: designTheme.typography.body1.lineHeight,
  },
  helperBox: {
    marginHorizontal: designTheme.spacing.lg,
    marginTop: designTheme.spacing.md,
    padding: designTheme.spacing.md,
    borderRadius: designTheme.borderRadius.md,
  },
  helperText: {
    fontSize: designTheme.typography.body2.fontSize,
    lineHeight: designTheme.typography.body2.lineHeight,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: designTheme.spacing.lg,
    paddingVertical: designTheme.spacing.md,
    gap: designTheme.spacing.md,
    borderTopWidth: 1,
  },
  skipButton: {
    flex: 1,
  },
  continueButton: {
    flex: 2,
  },
});
