/**
 * SortOptions Component - Advanced sorting interface for content
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Dimensions,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { SortOptionsProps, SortField, SortDirection } from '../../types/filters';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const SortOptions: React.FC<SortOptionsProps> = ({
  value,
  onChange,
  fields = Object.values(SortField),
  showSecondary = false,
  compact = false,
}) => {
  const theme = useTheme();
  const [isVisible, setIsVisible] = useState(false);

  const sortFieldLabels = {
    [SortField.RELEVANCE]: 'Relevance',
    [SortField.POPULARITY]: 'Popularity',
    [SortField.RELEASE_DATE]: 'Release Date',
    [SortField.RATING]: 'Rating',
    [SortField.USER_REVIEWS]: 'User Reviews',
    [SortField.PRICE]: 'Price',
    [SortField.AVAILABILITY]: 'Availability',
    [SortField.RECENTLY_ADDED]: 'Recently Added',
    [SortField.TITLE]: 'Title',
    [SortField.DURATION]: 'Duration',
  };

  const sortFieldIcons = {
    [SortField.RELEVANCE]: '🎯',
    [SortField.POPULARITY]: '🔥',
    [SortField.RELEASE_DATE]: '📅',
    [SortField.RATING]: '⭐',
    [SortField.USER_REVIEWS]: '💬',
    [SortField.PRICE]: '💰',
    [SortField.AVAILABILITY]: '🌍',
    [SortField.RECENTLY_ADDED]: '✨',
    [SortField.TITLE]: '📝',
    [SortField.DURATION]: '⏱️',
  };

  const sortFieldDescriptions = {
    [SortField.RELEVANCE]: 'Most relevant to your search',
    [SortField.POPULARITY]: 'Most popular content',
    [SortField.RELEASE_DATE]: 'Newest or oldest releases',
    [SortField.RATING]: 'Highest rated content',
    [SortField.USER_REVIEWS]: 'Most user reviews',
    [SortField.PRICE]: 'Lowest to highest price',
    [SortField.AVAILABILITY]: 'Most widely available',
    [SortField.RECENTLY_ADDED]: 'Recently added to catalog',
    [SortField.TITLE]: 'Alphabetical order',
    [SortField.DURATION]: 'Shortest to longest',
  };

  const handleFieldSelect = (field: SortField, isSecondary: boolean = false) => {
    if (isSecondary) {
      onChange({
        ...value,
        secondaryField: field,
        secondaryDirection: value.secondaryDirection || SortDirection.DESC,
      });
    } else {
      onChange({
        ...value,
        field,
        direction: value.direction,
      });
    }
  };

  const handleDirectionToggle = (isSecondary: boolean = false) => {
    if (isSecondary) {
      onChange({
        ...value,
        secondaryDirection: value.secondaryDirection === SortDirection.ASC
          ? SortDirection.DESC
          : SortDirection.ASC,
      });
    } else {
      onChange({
        ...value,
        direction: value.direction === SortDirection.ASC
          ? SortDirection.DESC
          : SortDirection.ASC,
      });
    }
  };

  const clearSecondarySort = () => {
    onChange({
      ...value,
      secondaryField: undefined,
      secondaryDirection: undefined,
    });
  };

  const getSortDisplayText = () => {
    const primaryText = `${sortFieldLabels[value.field]} (${value.direction === SortDirection.ASC ? 'A-Z' : 'Z-A'})`;

    if (value.secondaryField) {
      const secondaryText = `then ${sortFieldLabels[value.secondaryField]} (${value.secondaryDirection === SortDirection.ASC ? 'A-Z' : 'Z-A'})`;
      return `${primaryText}, ${secondaryText}`;
    }

    return primaryText;
  };

  // Extract primary color safely
  const primaryColor = typeof theme.colors.primary === 'string'
    ? theme.colors.primary
    : theme.colors.primary[500];

  const styles = StyleSheet.create({
    container: {
      marginBottom: 16,
    },
    trigger: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.semantic.background.secondary,
      borderWidth: 1,
      borderColor: theme.semantic.border.primary,
      borderRadius: 8,
      minHeight: 48,
    },
    triggerText: {
      fontSize: 16,
      color: theme.semantic.text.primary,
      flex: 1,
    },
    compactTriggerText: {
      fontSize: 14,
    },
    dropdownIcon: {
      fontSize: 16,
      color: theme.semantic.text.secondary,
      marginLeft: 8,
    },
    overlay: {
      flex: 1,
      backgroundColor: theme.colors.overlay.lightMedium,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: theme.semantic.background.primary,
      borderRadius: 16,
      width: '90%',
      maxWidth: compact ? SCREEN_WIDTH - 40 : 500,
      maxHeight: '80%',
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.semantic.border.primary,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.semantic.text.primary,
    },
    closeButton: {
      fontSize: 24,
      color: theme.semantic.text.secondary,
      paddingHorizontal: 8,
    },
    scrollView: {
      maxHeight: 400,
    },
    section: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.semantic.border.primary,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.semantic.text.primary,
      marginBottom: 12,
    },
    optionContainer: {
      marginBottom: 8,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: theme.semantic.background.secondary,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.semantic.border.primary,
      marginBottom: 8,
    },
    selectedOption: {
      borderColor: primaryColor,
      backgroundColor: primaryColor + '10',
    },
    optionLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    optionIcon: {
      fontSize: 20,
      marginRight: 12,
    },
    optionText: {
      flex: 1,
    },
    optionTitle: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.semantic.text.primary,
      marginBottom: 2,
    },
    optionDescription: {
      fontSize: 12,
      color: theme.semantic.text.secondary,
      lineHeight: 16,
    },
    directionToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      backgroundColor: theme.semantic.background.primary,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: theme.semantic.border.primary,
    },
    directionButton: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      marginHorizontal: 2,
    },
    activeDirection: {
      backgroundColor: primaryColor,
    },
    directionText: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.semantic.text.primary,
    },
    activeDirectionText: {
      color: theme.semantic.background.primary,
    },
    clearButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: theme.semantic.background.secondary,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.semantic.border.primary,
      marginTop: 8,
    },
    clearButtonText: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.semantic.text.primary,
      textAlign: 'center',
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: primaryColor,
      borderRadius: 8,
      marginTop: 8,
    },
    addButtonText: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.semantic.background.primary,
      marginLeft: 8,
    },
    addIcon: {
      fontSize: 16,
      color: theme.semantic.background.primary,
    },
  });

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setIsVisible(true)}
      >
        <Text style={[styles.triggerText, compact && styles.compactTriggerText]}>
          {getSortDisplayText()}
        </Text>
        <Text style={styles.dropdownIcon}>▼</Text>
      </TouchableOpacity>

      <Modal
        visible={isVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsVisible(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setIsVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sort Options</Text>
              <TouchableOpacity onPress={() => setIsVisible(false)}>
                <Text style={styles.closeButton}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
              {/* Primary Sort */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Primary Sort</Text>

                {fields.map((field) => (
                  <View key={field} style={styles.optionContainer}>
                    <TouchableOpacity
                      style={[
                        styles.option,
                        value.field === field && styles.selectedOption,
                      ]}
                      onPress={() => handleFieldSelect(field)}
                    >
                      <View style={styles.optionLeft}>
                        <Text style={styles.optionIcon}>
                          {sortFieldIcons[field]}
                        </Text>
                        <View style={styles.optionText}>
                          <Text style={styles.optionTitle}>
                            {sortFieldLabels[field]}
                          </Text>
                          <Text style={styles.optionDescription}>
                            {sortFieldDescriptions[field]}
                          </Text>
                        </View>
                      </View>

                      {value.field === field && (
                        <View style={styles.directionToggle}>
                          <TouchableOpacity
                            style={[
                              styles.directionButton,
                              value.direction === SortDirection.ASC && styles.activeDirection,
                            ]}
                            onPress={() => handleDirectionToggle()}
                          >
                            <Text style={[
                              styles.directionText,
                              value.direction === SortDirection.ASC && styles.activeDirectionText,
                            ]}>
                              A-Z
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.directionButton,
                              value.direction === SortDirection.DESC && styles.activeDirection,
                            ]}
                            onPress={() => handleDirectionToggle()}
                          >
                            <Text style={[
                              styles.directionText,
                              value.direction === SortDirection.DESC && styles.activeDirectionText,
                            ]}>
                              Z-A
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              {/* Secondary Sort */}
              {showSecondary && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Secondary Sort</Text>

                  {value.secondaryField ? (
                    <>
                      <View style={styles.optionContainer}>
                        <TouchableOpacity
                          style={[
                            styles.option,
                            styles.selectedOption,
                          ]}
                        >
                          <View style={styles.optionLeft}>
                            <Text style={styles.optionIcon}>
                              {sortFieldIcons[value.secondaryField]}
                            </Text>
                            <View style={styles.optionText}>
                              <Text style={styles.optionTitle}>
                                {sortFieldLabels[value.secondaryField]}
                              </Text>
                              <Text style={styles.optionDescription}>
                                {sortFieldDescriptions[value.secondaryField]}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.directionToggle}>
                            <TouchableOpacity
                              style={[
                                styles.directionButton,
                                value.secondaryDirection === SortDirection.ASC && styles.activeDirection,
                              ]}
                              onPress={() => handleDirectionToggle(true)}
                            >
                              <Text style={[
                                styles.directionText,
                                value.secondaryDirection === SortDirection.ASC && styles.activeDirectionText,
                              ]}>
                                A-Z
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[
                                styles.directionButton,
                                value.secondaryDirection === SortDirection.DESC && styles.activeDirection,
                              ]}
                              onPress={() => handleDirectionToggle(true)}
                            >
                              <Text style={[
                                styles.directionText,
                                value.secondaryDirection === SortDirection.DESC && styles.activeDirectionText,
                              ]}>
                                Z-A
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </TouchableOpacity>
                      </View>

                      <TouchableOpacity
                        style={styles.clearButton}
                        onPress={clearSecondarySort}
                      >
                        <Text style={styles.clearButtonText}>
                          Remove Secondary Sort
                        </Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity
                      style={styles.addButton}
                      onPress={() => setIsVisible(false)}
                    >
                      <Text style={styles.addIcon}>+</Text>
                      <Text style={styles.addButtonText}>Add Secondary Sort</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default SortOptions;
