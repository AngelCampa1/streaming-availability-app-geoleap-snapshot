/**
 * Analytics Consent Settings Screen
 *
 * GDPR-compliant consent management for mobile analytics.
 *
 * Features:
 * - Main analytics toggle (enable/disable all tracking)
 * - Granular category selection (performance, usage, personalization, marketing)
 * - Persistent consent storage via AnalyticsManager
 * - Link to privacy policy
 * - Clear explanations for each category
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Linking,
  Alert,
} from 'react-native';
import { AnalyticsManager } from '../../services/analytics/AnalyticsManager';
import { useTheme } from '../../theme/ThemeProvider';
import { logger } from '../../utils/logger';

interface ConsentCategory {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  required?: boolean;
}

export const AnalyticsConsentScreen: React.FC = () => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const [categories, setCategories] = useState<ConsentCategory[]>([
    {
      id: 'performance',
      label: 'Performance & Diagnostics',
      description: 'Help us improve app performance and fix crashes',
      enabled: true,
      required: true, // Always enabled for essential functionality
    },
    {
      id: 'analytics',
      label: 'Usage Analytics',
      description: 'Understand how you use the app to improve features',
      enabled: true,
    },
    {
      id: 'personalization',
      label: 'Personalization',
      description: 'Personalize your experience based on your preferences',
      enabled: true,
    },
    {
      id: 'marketing',
      label: 'Marketing',
      description: 'Receive personalized recommendations and offers',
      enabled: false,
    },
  ]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadCurrentConsent();
  }, []);

  const loadCurrentConsent = async () => {
    try {
      const manager = AnalyticsManager.getInstance();
      const hasConsent = manager.hasUserConsent();
      setAnalyticsEnabled(hasConsent);

      logger.log('[AnalyticsConsentScreen] Current consent', { hasConsent });
    } catch (error) {
      logger.error('[AnalyticsConsentScreen] Failed to load consent', error);
    }
  };

  const handleMainToggle = (value: boolean) => {
    setAnalyticsEnabled(value);

    // If disabling all analytics, turn off all non-required categories
    if (!value) {
      setCategories(prev =>
        prev.map(cat => ({
          ...cat,
          enabled: cat.required ? true : false,
        })),
      );
    } else {
      // If enabling, turn on default categories (all except marketing)
      setCategories(prev =>
        prev.map(cat => ({
          ...cat,
          enabled: cat.id !== 'marketing',
        })),
      );
    }
  };

  const handleCategoryToggle = (categoryId: string) => {
    setCategories(prev =>
      prev.map(cat =>
        cat.id === categoryId && !cat.required
          ? { ...cat, enabled: !cat.enabled }
          : cat,
      ),
    );
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const manager = AnalyticsManager.getInstance();

      // Build category string from enabled categories
      const enabledCategories = categories
        .filter(cat => cat.enabled)
        .map(cat => cat.id)
        .join(',');

      await manager.setConsent(analyticsEnabled, [enabledCategories]);

      logger.log('[AnalyticsConsentScreen] Consent saved', {
        enabled: analyticsEnabled,
        categories: enabledCategories,
      });

      // Show success feedback (you could add a Toast notification here)
      Alert.alert('Success', 'Preferences saved successfully');
    } catch (error) {
      logger.error('[AnalyticsConsentScreen] Failed to save consent', error);
      Alert.alert('Error', 'Failed to save preferences. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenPrivacyPolicy = async () => {
    try {
      // Replace with your actual privacy policy URL
      const url = 'https://geoleap.com/privacy-policy';
      const canOpen = await Linking.canOpenURL(url);

      if (canOpen) {
        await Linking.openURL(url);
      } else {
        logger.error('[AnalyticsConsentScreen] Cannot open URL', { url });
      }
    } catch (error) {
      logger.error('[AnalyticsConsentScreen] Failed to open privacy policy', error);
    }
  };

  const backgroundColor = theme.semantic.background.primary;
  const textPrimary = theme.semantic.text.primary;
  const textSecondary = theme.semantic.text.secondary;
  const borderColor = theme.colors.neutral[300];
  const cardBackground = theme.semantic.background.secondary;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: textPrimary }]}>
            Analytics & Privacy
          </Text>
          <Text style={[styles.subtitle, { color: textSecondary }]}>
            Control what data you share with us
          </Text>
        </View>

        {/* Main Toggle */}
        <View style={[styles.card, { backgroundColor: cardBackground, borderColor }]}>
          <View style={styles.mainToggleRow}>
            <View style={styles.toggleLabel}>
              <Text style={[styles.toggleTitle, { color: textPrimary }]}>
                Share Analytics Data
              </Text>
              <Text style={[styles.toggleDescription, { color: textSecondary }]}>
                Help us improve GeoLeap by sharing anonymous usage data
              </Text>
            </View>
            <Switch
              value={analyticsEnabled}
              onValueChange={handleMainToggle}
              trackColor={{
                false: theme.colors.neutral[400],
                true: theme.colors.primary[500],
              }}
              thumbColor={theme.colors.neutral[50]}
            />
          </View>
        </View>

        {/* Category Toggles */}
        {analyticsEnabled && (
          <View style={styles.categoriesContainer}>
            <Text style={[styles.sectionTitle, { color: textPrimary }]}>
              What We Collect
            </Text>

            {categories.map(category => (
              <View
                key={category.id}
                style={[styles.card, { backgroundColor: cardBackground, borderColor }]}>
                <View style={styles.categoryRow}>
                  <View style={styles.categoryLabel}>
                    <Text style={[styles.categoryTitle, { color: textPrimary }]}>
                      {category.label}
                      {category.required && (
                        <Text style={styles.requiredBadge}> (Required)</Text>
                      )}
                    </Text>
                    <Text style={[styles.categoryDescription, { color: textSecondary }]}>
                      {category.description}
                    </Text>
                  </View>
                  <Switch
                    value={category.enabled}
                    onValueChange={() => handleCategoryToggle(category.id)}
                    disabled={category.required}
                    trackColor={{
                      false: theme.colors.neutral[400],
                      true: theme.colors.primary[500],
                    }}
                    thumbColor={theme.colors.neutral[50]}
                  />
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Privacy Policy Link */}
        <TouchableOpacity
          style={styles.privacyLinkContainer}
          onPress={handleOpenPrivacyPolicy}>
          <Text style={[styles.privacyLink, { color: theme.colors.primary[500] }]}>
            View Privacy Policy
          </Text>
        </TouchableOpacity>

        {/* Save Button */}
        <TouchableOpacity
          style={[
            styles.saveButton,
            { backgroundColor: theme.colors.primary[500] },
            isSaving && styles.saveButtonDisabled,
          ]}
          onPress={handleSave}
          disabled={isSaving}>
          <Text style={styles.saveButtonText}>
            {isSaving ? 'Saving...' : 'Save Preferences'}
          </Text>
        </TouchableOpacity>

        {/* Footer Info */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: textSecondary }]}>
            We respect your privacy. Your data is never sold to third parties.
            You can change these settings at any time.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// Dynamic styles function - receives theme from useTheme() hook
const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  mainToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabel: {
    flex: 1,
    marginRight: 16,
  },
  toggleTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  categoriesContainer: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryLabel: {
    flex: 1,
    marginRight: 16,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  requiredBadge: {
    fontSize: 12,
    fontWeight: '400',
    opacity: 0.7,
  },
  categoryDescription: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  privacyLinkContainer: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  privacyLink: {
    fontSize: 16,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  saveButton: {
    marginHorizontal: 16,
    marginVertical: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: theme.semantic.text.inverse,
    fontSize: 18,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 8,
  },
  footerText: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 20,
    textAlign: 'center',
  },
});

export default AnalyticsConsentScreen;
