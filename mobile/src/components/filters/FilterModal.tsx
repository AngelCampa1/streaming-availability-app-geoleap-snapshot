/**
 * FilterModal Component - Advanced filter modal interface
 */

import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  Dimensions,
  Alert,
  TextInput,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import {
  FilterModalProps,
  FilterOptions,
  SortOptions as SortOptionsType,
  FilterPreset as FilterPresetType,
  ContentType,
  PriceType,
  FilterCategory,
  DEFAULT_FILTERS,
  DEFAULT_SORT_OPTIONS,
  GENRE_OPTIONS,
  STREAMING_SERVICE_OPTIONS,
  CONTENT_RATING_OPTIONS,
  LANGUAGE_OPTIONS,
  COUNTRY_OPTIONS,
} from '../../types/filters';

import RangeSlider from './RangeSlider';
import MultiSelect from './MultiSelect';
import SortOptions from './SortOptions';
import FilterPreset from './FilterPreset';
import FilterChip from './FilterChip';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  onClose,
  onApply,
  filters,
  sortOptions,
  presets,
  onSavePreset,
  onDeletePreset: _onDeletePreset,
  analytics: _analytics,
}) => {
  const theme = useTheme();
  const [tempFilters, setTempFilters] = useState<FilterOptions>(filters);
  const [tempSortOptions, setTempSortOptions] = useState<SortOptionsType>(sortOptions);
  const [activeSection, setActiveSection] = useState<FilterCategory | null>(null);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetDescription, setNewPresetDescription] = useState('');
  const slideAnimation = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  // Animate modal in/out
  React.useEffect(() => {
    if (visible) {
      setTempFilters(filters);
      setTempSortOptions(sortOptions);
      Animated.timing(slideAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
    } else {
      Animated.timing(slideAnimation, {
        toValue: SCREEN_HEIGHT,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [visible, filters, sortOptions, slideAnimation]);

  // Filter sections configuration
  const filterSections = useMemo(() => [
    {
      category: FilterCategory.CONTENT,
      title: 'Content Type',
      icon: '🎬',
      fields: [
        {
          key: 'contentType',
          label: 'Content Type',
          type: 'multiselect',
          options: Object.values(ContentType).map(type => ({
            label: type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
            value: type,
          })),
        },
        {
          key: 'genres',
          label: 'Genres',
          type: 'multiselect',
          options: GENRE_OPTIONS,
        },
        {
          key: 'contentRatings',
          label: 'Content Ratings',
          type: 'multiselect',
          options: CONTENT_RATING_OPTIONS,
        },
      ],
    },
    {
      category: FilterCategory.AVAILABILITY,
      title: 'Availability',
      icon: '🌍',
      fields: [
        {
          key: 'countries',
          label: 'Available in Countries',
          type: 'multiselect',
          options: COUNTRY_OPTIONS,
        },
        {
          key: 'streamingServices',
          label: 'Streaming Services',
          type: 'multiselect',
          options: STREAMING_SERVICE_OPTIONS,
        },
        {
          key: 'priceType',
          label: 'Price Type',
          type: 'multiselect',
          options: Object.values(PriceType).map(type => ({
            label: type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
            value: type,
          })),
        },
      ],
    },
    {
      category: FilterCategory.TECHNICAL,
      title: 'Technical',
      icon: '⚙️',
      fields: [
        {
          key: 'yearRange',
          label: 'Release Year',
          type: 'range',
          min: 1900,
          max: new Date().getFullYear() + 5,
        },
        {
          key: 'minRating',
          label: 'Minimum Rating',
          type: 'range',
          min: 0,
          max: 10,
          step: 0.5,
        },
        {
          key: 'languages',
          label: 'Languages',
          type: 'multiselect',
          options: LANGUAGE_OPTIONS,
        },
      ],
    },
  ], []);

  const handleFilterChange = (key: keyof FilterOptions, value: any) => {
    setTempFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleApply = () => {
    onApply(tempFilters, tempSortOptions);
    onClose();
  };

  const handleReset = () => {
    setTempFilters(DEFAULT_FILTERS);
    setTempSortOptions(DEFAULT_SORT_OPTIONS);
  };

  const handleSavePreset = () => {
    if (!newPresetName.trim()) {
      Alert.alert('Error', 'Please enter a preset name');
      return;
    }

    onSavePreset({
      name: newPresetName.trim(),
      description: newPresetDescription.trim() || undefined,
      filters: tempFilters,
      sortOptions: tempSortOptions,
      isDefault: false,
      isSystem: false,
    });

    setNewPresetName('');
    setNewPresetDescription('');
    setShowPresetModal(false);
  };

  const handlePresetApply = (preset: FilterPresetType) => {
    setTempFilters(preset.filters);
    setTempSortOptions(preset.sortOptions as SortOptionsType);
  };

  const getFilterCount = () => {
    let count = 0;
    if (tempFilters.contentType.length > 0) {count++;}
    if (tempFilters.genres.length > 0) {count++;}
    if (tempFilters.contentRatings.length > 0) {count++;}
    if (tempFilters.countries.length > 0) {count++;}
    if (tempFilters.streamingServices.length > 0) {count++;}
    if (tempFilters.priceType.length > 0) {count++;}
    if (tempFilters.languages.length > 0) {count++;}
    if (tempFilters.yearRange[0] !== DEFAULT_FILTERS.yearRange[0] ||
        tempFilters.yearRange[1] !== DEFAULT_FILTERS.yearRange[1]) {count++;}
    if (tempFilters.minRating > DEFAULT_FILTERS.minRating) {count++;}
    return count;
  };

  const renderFilterField = (field: any) => {
    const value = tempFilters[field.key as keyof FilterOptions];

    switch (field.type) {
      case 'multiselect':
        return (
          <MultiSelect
            key={field.key}
            options={field.options}
            selectedValues={(value as string[]) || []}
            onSelectionChange={(selected) => handleFilterChange(field.key, selected)}
            placeholder={`Select ${field.label.toLowerCase()}...`}
            showSelectAll
            showClear
          />
        );

      case 'range':
        if (field.key === 'yearRange') {
          return (
            <RangeSlider
              key={field.key}
              min={field.min}
              max={field.max}
              value={value as [number, number]}
              onValueChange={(newValue) => handleFilterChange(field.key, newValue)}
              step={1}
              showValue
              showLabels
              minLabel="From"
              maxLabel="To"
            />
          );
        } else if (field.key === 'minRating') {
          return (
            <RangeSlider
              key={field.key}
              min={field.min}
              max={field.max}
              value={[0, value as number]}
              onValueChange={([, max]) => handleFilterChange(field.key, max)}
              step={field.step || 0.5}
              showValue
              showLabels
              minLabel="Any"
              maxLabel={`${value}+ stars`}
            />
          );
        }
        return null;

      default:
        return null;
    }
  };

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: theme.colors.overlay.lightMedium,
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: theme.semantic?.background?.primary ?? theme.colors.background,
      borderTopLeftRadius: theme.borderRadius['2xl'],
      borderTopRightRadius: theme.borderRadius['2xl'],
      maxHeight: SCREEN_HEIGHT * 0.9,
      transform: [{ translateY: slideAnimation }],
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing[5],
      paddingVertical: theme.spacing[4],
      borderBottomWidth: 1,
      borderBottomColor: theme.semantic?.border?.primary ?? theme.colors.border,
    },
    title: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: '600',
      color: theme.semantic?.text?.primary ?? theme.colors.text,
    },
    filterCount: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.semantic?.text?.primary ?? theme.colors.primary[500],
      fontWeight: '500',
    },
    closeButton: {
      fontSize: theme.typography.fontSize['2xl'],
      color: theme.semantic?.text?.secondary ?? theme.semantic.text.secondary,
      paddingHorizontal: theme.spacing[2],
    },
    content: {
      flex: 1,
    },
    tabsContainer: {
      flexDirection: 'row',
      paddingHorizontal: theme.spacing[5],
      paddingVertical: theme.spacing[3],
      borderBottomWidth: 1,
      borderBottomColor: theme.semantic?.border?.primary ?? theme.colors.border,
    },
    tab: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing[4],
      paddingVertical: theme.spacing[2],
      borderRadius: theme.borderRadius['2xl'],
      marginRight: theme.spacing[2],
    },
    activeTab: {
      backgroundColor: theme.semantic?.background?.primary ?? theme.colors.primary[500],
    },
    tabIcon: {
      fontSize: theme.typography.fontSize.base,
      marginRight: theme.spacing[1.5],
    },
    activeTabIcon: {
      color: theme.semantic?.text?.inverse ?? theme.colors.background,
    },
    tabText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: '500',
      color: theme.semantic?.text?.primary ?? theme.colors.text,
    },
    activeTabText: {
      color: theme.semantic?.text?.inverse ?? theme.colors.background,
    },
    scrollView: {
      flex: 1,
    },
    section: {
      padding: theme.spacing[5],
    },
    sectionTitle: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: '600',
      color: theme.semantic?.text?.primary ?? theme.colors.text,
      marginBottom: theme.spacing[4],
    },
    fieldContainer: {
      marginBottom: theme.spacing[5],
    },
    fieldLabel: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: '500',
      color: theme.semantic?.text?.primary ?? theme.colors.text,
      marginBottom: theme.spacing[2],
    },
    presetsSection: {
      padding: theme.spacing[5],
      borderBottomWidth: 1,
      borderBottomColor: theme.semantic?.border?.primary ?? theme.colors.border,
    },
    presetsTitle: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: '600',
      color: theme.semantic?.text?.primary ?? theme.colors.text,
      marginBottom: theme.spacing[3],
    },
    presetButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing[3],
      paddingHorizontal: theme.spacing[4],
      backgroundColor: theme.semantic?.background?.secondary ?? theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.semantic?.border?.primary ?? theme.colors.border,
      marginBottom: theme.spacing[3],
    },
    presetButtonText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: '500',
      color: theme.semantic?.text?.primary ?? theme.colors.text,
      marginLeft: theme.spacing[2],
    },
    sortSection: {
      padding: theme.spacing[5],
      borderBottomWidth: 1,
      borderBottomColor: theme.semantic?.border?.primary ?? theme.colors.border,
    },
    quickFiltersSection: {
      padding: theme.spacing[5],
      borderBottomWidth: 1,
      borderBottomColor: theme.semantic?.border?.primary ?? theme.colors.border,
    },
    quickFiltersTitle: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: '600',
      color: theme.semantic?.text?.primary ?? theme.colors.text,
      marginBottom: theme.spacing[3],
    },
    quickFiltersContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    footer: {
      flexDirection: 'row',
      padding: theme.spacing[5],
      borderTopWidth: 1,
      borderTopColor: theme.semantic?.border?.primary ?? theme.colors.border,
      backgroundColor: theme.semantic?.background?.secondary ?? theme.colors.surface,
    },
    footerButton: {
      flex: 1,
      paddingVertical: theme.spacing[3.5],
      borderRadius: theme.borderRadius.lg,
      alignItems: 'center',
      marginHorizontal: theme.spacing[1.5],
    },
    resetButton: {
      backgroundColor: theme.semantic?.background?.secondary ?? theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.semantic?.border?.primary ?? theme.colors.border,
    },
    applyButton: {
      backgroundColor: theme.semantic?.background?.primary ?? theme.colors.primary[500],
    },
    footerButtonText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: '600',
    },
    resetButtonText: {
      color: theme.semantic?.text?.primary ?? theme.colors.text,
    },
    applyButtonText: {
      color: theme.semantic?.text?.inverse ?? theme.colors.background,
    },
    presetModalOverlay: {
      flex: 1,
      backgroundColor: theme.colors.overlay.lightMedium,
      justifyContent: 'center',
      alignItems: 'center',
    },
    presetModalContent: {
      backgroundColor: theme.semantic?.background?.primary ?? theme.colors.background,
      borderRadius: theme.borderRadius['2xl'],
      padding: theme.spacing[5],
      width: '90%',
      maxWidth: 400,
    },
    presetModalTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: '600',
      color: theme.semantic?.text?.primary ?? theme.colors.text,
      marginBottom: theme.spacing[4],
    },
    input: {
      fontSize: theme.typography.fontSize.base,
      paddingVertical: theme.spacing[3],
      paddingHorizontal: theme.spacing[4],
      backgroundColor: theme.semantic?.background?.secondary ?? theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.semantic?.border?.primary ?? theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      color: theme.semantic?.text?.primary ?? theme.colors.text,
      marginBottom: theme.spacing[3],
    },
    textArea: {
      height: theme.spacing[20],
      textAlignVertical: 'top',
    },
    presetModalActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: theme.spacing[4],
    },
    presetModalButton: {
      paddingHorizontal: theme.spacing[4],
      paddingVertical: theme.spacing[2],
      borderRadius: theme.borderRadius.md,
      marginLeft: theme.spacing[2],
    },
    cancelButton: {
      backgroundColor: theme.semantic?.background?.secondary ?? theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.semantic?.border?.primary ?? theme.colors.border,
    },
    saveButton: {
      backgroundColor: theme.semantic?.background?.primary ?? theme.colors.primary[500],
    },
    presetModalButtonText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: '500',
      color: theme.semantic?.text?.primary ?? theme.colors.text,
    },
    saveButtonText: {
      color: theme.semantic?.text?.inverse ?? theme.colors.background,
    },
  });

  return (
    <Modal visible={visible} transparent animationType="none">
      <View style={styles.overlay}>
        <Animated.View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Filters</Text>
            <Text style={styles.filterCount}>
              {getFilterCount()} active
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>×</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {/* Tabs */}
            <View style={styles.tabsContainer}>
              {filterSections.map((section) => (
                <TouchableOpacity
                  key={section.category}
                  style={[
                    styles.tab,
                    activeSection === section.category && styles.activeTab,
                  ]}
                  onPress={() => setActiveSection(
                    activeSection === section.category ? null : section.category,
                  )}
                >
                  <Text style={[
                    styles.tabIcon,
                    activeSection === section.category && styles.activeTabIcon,
                  ]}>
                    {section.icon}
                  </Text>
                  <Text style={[
                    styles.tabText,
                    activeSection === section.category && styles.activeTabText,
                  ]}>
                    {section.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
              {/* Presets Section */}
              <View style={styles.presetsSection}>
                <Text style={styles.presetsTitle}>Quick Presets</Text>

                {presets.filter(p => p.isSystem).map((preset) => (
                  <FilterPreset
                    key={preset.id}
                    preset={preset}
                    onApply={handlePresetApply}
                    compact
                  />
                ))}

                <TouchableOpacity
                  style={styles.presetButton}
                  onPress={() => setShowPresetModal(true)}
                >
                  <Text style={styles.presetButtonText}>+ Save Current Filters</Text>
                </TouchableOpacity>
              </View>

              {/* Sort Options */}
              <View style={styles.sortSection}>
                <SortOptions
                  value={tempSortOptions}
                  onChange={setTempSortOptions}
                  showSecondary
                />
              </View>

              {/* Quick Filters */}
              <View style={styles.quickFiltersSection}>
                <Text style={styles.quickFiltersTitle}>Quick Filters</Text>
                <View style={styles.quickFiltersContainer}>
                  <FilterChip
                    label="Movies Only"
                    value="movies"
                    isSelected={tempFilters.contentType.includes(ContentType.MOVIE)}
                    onPress={(_value) => {
                      const newTypes = tempFilters.contentType.includes(ContentType.MOVIE)
                        ? tempFilters.contentType.filter(t => t !== ContentType.MOVIE)
                        : [...tempFilters.contentType.filter(t => t !== ContentType.TV_SERIES), ContentType.MOVIE];
                      handleFilterChange('contentType', newTypes);
                    }}
                  />
                  <FilterChip
                    label="TV Series Only"
                    value="tv_series"
                    isSelected={tempFilters.contentType.includes(ContentType.TV_SERIES)}
                    onPress={(_value) => {
                      const newTypes = tempFilters.contentType.includes(ContentType.TV_SERIES)
                        ? tempFilters.contentType.filter(t => t !== ContentType.TV_SERIES)
                        : [...tempFilters.contentType.filter(t => t !== ContentType.MOVIE), ContentType.TV_SERIES];
                      handleFilterChange('contentType', newTypes);
                    }}
                  />
                  <FilterChip
                    label="Free Only"
                    value="free"
                    isSelected={tempFilters.priceType.includes(PriceType.FREE)}
                    onPress={(_value) => {
                      const newTypes = tempFilters.priceType.includes(PriceType.FREE)
                        ? tempFilters.priceType.filter(t => t !== PriceType.FREE)
                        : [...tempFilters.priceType, PriceType.FREE];
                      handleFilterChange('priceType', newTypes);
                    }}
                  />
                  <FilterChip
                    label="Highly Rated"
                    value="highly_rated"
                    isSelected={tempFilters.minRating >= 8}
                    onPress={() => {
                      handleFilterChange('minRating', tempFilters.minRating >= 8 ? 0 : 8);
                    }}
                  />
                </View>
              </View>

              {/* Filter Sections */}
              {filterSections.map((section) => (
                activeSection === null || activeSection === section.category ? (
                  <View key={section.category} style={styles.section}>
                    <Text style={styles.sectionTitle}>{section.title}</Text>
                    {section.fields.map((field) => (
                      <View key={field.key} style={styles.fieldContainer}>
                        <Text style={styles.fieldLabel}>{field.label}</Text>
                        {renderFilterField(field)}
                      </View>
                    ))}
                  </View>
                ) : null
              ))}
            </ScrollView>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={[styles.footerButton, styles.resetButton]} onPress={handleReset}>
              <Text style={[styles.footerButtonText, styles.resetButtonText]}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.footerButton, styles.applyButton]} onPress={handleApply}>
              <Text style={[styles.footerButtonText, styles.applyButtonText]}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Save Preset Modal */}
        {showPresetModal && (
          <View style={styles.presetModalOverlay}>
            <View style={styles.presetModalContent}>
              <Text style={styles.presetModalTitle}>Save Filter Preset</Text>
              <TextInput
                style={styles.input}
                placeholder="Preset name..."
                value={newPresetName}
                onChangeText={setNewPresetName}
              />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Description (optional)..."
                value={newPresetDescription}
                onChangeText={setNewPresetDescription}
                multiline
              />
              <View style={styles.presetModalActions}>
                <TouchableOpacity
                  style={[styles.presetModalButton, styles.cancelButton]}
                  onPress={() => {
                    setShowPresetModal(false);
                    setNewPresetName('');
                    setNewPresetDescription('');
                  }}
                >
                  <Text style={styles.presetModalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.presetModalButton, styles.saveButton]}
                  onPress={handleSavePreset}
                >
                  <Text style={[styles.presetModalButtonText, styles.saveButtonText]}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
};

export default FilterModal;
