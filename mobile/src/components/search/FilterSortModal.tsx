import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import Modal from 'react-native-modal';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import { SearchFilter } from '../../types/search';
import { useTheme } from '../../theme/ThemeProvider';

interface FilterSortModalProps {
  isVisible: boolean;
  onClose: () => void;
  currentFilters: SearchFilter;
  onApplyFilters: (filters: SearchFilter) => void;
  onResetFilters: () => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const CONTENT_TYPES = [
  { id: 'content', label: 'Content', icon: 'play-circle-outline' },
  { id: 'user', label: 'Users', icon: 'person-outline' },
  { id: 'channel', label: 'Channels', icon: 'tv' },
  { id: 'location', label: 'Locations', icon: 'location-on' },
];

const CATEGORIES = [
  'Entertainment', 'News', 'Sports', 'Technology', 'Education',
  'Music', 'Gaming', 'Travel', 'Food', 'Fashion', 'Lifestyle',
];

const SORT_OPTIONS = [
  { id: 'relevance', label: 'Relevance', icon: 'sort' },
  { id: 'date', label: 'Date', icon: 'schedule' },
  { id: 'popularity', label: 'Popularity', icon: 'trending-up' },
];

const REGIONS = [
  'Global', 'North America', 'Europe', 'Asia', 'South America',
  'Africa', 'Oceania', 'Middle East',
];

const FilterSortModal: React.FC<FilterSortModalProps> = ({
  isVisible,
  onClose,
  currentFilters,
  onApplyFilters,
  onResetFilters,
}) => {
  const { theme } = useTheme();
  const [localFilters, setLocalFilters] = useState<SearchFilter>(currentFilters);
  const [activeTab, setActiveTab] = useState<'filters' | 'sort'>('filters');
  const tabIndicatorPosition = useSharedValue(0);

  const hasActiveFilters = useMemo(() => {
    return (
      (localFilters.type && localFilters.type.length > 0) ||
      localFilters.category ||
      localFilters.region ||
      localFilters.dateRange ||
      (localFilters.minScore && localFilters.minScore > 0)
    );
  }, [localFilters]);

  const handleTabChange = useCallback((tab: 'filters' | 'sort') => {
    setActiveTab(tab);
    tabIndicatorPosition.value = withSpring(tab === 'filters' ? 0 : 1);
  }, [tabIndicatorPosition]);

  const handleTypeToggle = useCallback((type: string) => {
    setLocalFilters(prev => {
      const currentTypes = prev.type || [];
      const newTypes = currentTypes.includes(type)
        ? currentTypes.filter(t => t !== type)
        : [...currentTypes, type];

      return {
        ...prev,
        type: newTypes.length > 0 ? newTypes : undefined,
      };
    });
  }, []);

  const handleCategorySelect = useCallback((category: string) => {
    setLocalFilters(prev => ({
      ...prev,
      category: prev.category === category ? undefined : category,
    }));
  }, []);

  const handleSortSelect = useCallback((sortBy: SearchFilter['sortBy']) => {
    setLocalFilters(prev => ({
      ...prev,
      sortBy,
    }));
  }, []);

  const handleRegionSelect = useCallback((region: string) => {
    setLocalFilters(prev => ({
      ...prev,
      region: prev.region === region ? undefined : region,
    }));
  }, []);

  const handleApply = useCallback(() => {
    onApplyFilters(localFilters);
    onClose();
  }, [localFilters, onApplyFilters, onClose]);

  const handleReset = useCallback(() => {
    const resetFilters: SearchFilter = {};
    setLocalFilters(resetFilters);
    onResetFilters();
  }, [onResetFilters]);

  const tabIndicatorStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          tabIndicatorPosition.value,
          [0, 1],
          [0, screenWidth / 2],
        ),
      },
    ],
  }));

  const styles = useMemo(() => StyleSheet.create({
    modal: {
      justifyContent: 'flex-end',
      margin: 0,
    },
    container: {
      backgroundColor: theme.semantic.background.primary,
      borderTopLeftRadius: theme.borderRadius['2xl'],
      borderTopRightRadius: theme.borderRadius['2xl'],
      maxHeight: screenHeight * 0.85,
    },
    header: {
      alignItems: 'center',
      paddingTop: theme.spacing[3],
      paddingHorizontal: theme.spacing[5],
      paddingBottom: theme.spacing[4],
      borderBottomWidth: 1,
      borderBottomColor: theme.semantic.border.primary,
    },
    handle: {
      width: theme.spacing[10],
      height: theme.spacing[1],
      backgroundColor: theme.semantic.border.secondary,
      borderRadius: theme.borderRadius.sm,
      marginBottom: theme.spacing[4],
    },
    headerContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
    },
    title: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.semantic.text.primary,
    },
    tabsContainer: {
      position: 'relative',
      borderBottomWidth: 1,
      borderBottomColor: theme.semantic.border.primary,
    },
    tabs: {
      flexDirection: 'row',
    },
    tab: {
      flex: 1,
      paddingVertical: theme.spacing[4],
      alignItems: 'center',
    },
    tabActive: {
      // Active tab styles handled by indicator
    },
    tabText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.semantic.text.secondary,
    },
    tabTextActive: {
      color: theme.colors.primary[500],
      fontWeight: theme.typography.fontWeight.semibold,
    },
    tabIndicator: {
      position: 'absolute',
      bottom: 0,
      height: theme.spacing[0.5],
      backgroundColor: theme.colors.primary[500],
      width: screenWidth / 2,
    },
    content: {
      flex: 1,
    },
    tabContent: {
      flex: 1,
      paddingHorizontal: theme.spacing[5],
    },
    section: {
      marginVertical: theme.spacing[4],
    },
    sectionTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.semantic.text.primary,
      marginBottom: theme.spacing[3],
    },
    optionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing[3],
    },
    optionCard: {
      width: (screenWidth - 64) / 2,
      padding: theme.spacing[4],
      backgroundColor: theme.semantic.background.secondary,
      borderRadius: theme.borderRadius.xl,
      alignItems: 'center',
      gap: theme.spacing[2],
    },
    optionCardSelected: {
      backgroundColor: theme.colors.primary[500],
    },
    optionText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.semantic.text.secondary,
    },
    optionTextSelected: {
      color: theme.semantic.background.primary,
    },
    chipContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing[2],
    },
    chip: {
      paddingHorizontal: theme.spacing[4],
      paddingVertical: theme.spacing[2],
      backgroundColor: theme.semantic.background.secondary,
      borderRadius: theme.borderRadius['2xl'],
      borderWidth: 1,
      borderColor: theme.semantic.border.primary,
    },
    chipSelected: {
      backgroundColor: theme.colors.primary[500],
      borderColor: theme.colors.primary[500],
    },
    chipText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.semantic.text.secondary,
    },
    chipTextSelected: {
      color: theme.semantic.background.primary,
    },
    sliderContainer: {
      gap: theme.spacing[3],
    },
    sliderLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    sliderLabel: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.semantic.text.tertiary,
    },
    qualityOptions: {
      flexDirection: 'row',
      gap: theme.spacing[2],
    },
    qualityOption: {
      flex: 1,
      paddingVertical: theme.spacing[3],
      backgroundColor: theme.semantic.background.secondary,
      borderRadius: theme.borderRadius.lg,
      alignItems: 'center',
    },
    qualityOptionSelected: {
      backgroundColor: theme.colors.primary[500],
    },
    qualityText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.semantic.text.secondary,
    },
    qualityTextSelected: {
      color: theme.semantic.background.primary,
    },
    sortOptions: {
      gap: theme.spacing[3],
    },
    sortOption: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: theme.spacing[4],
      backgroundColor: theme.semantic.background.secondary,
      borderRadius: theme.borderRadius.xl,
    },
    sortOptionSelected: {
      backgroundColor: theme.colors.primary[50],
      borderWidth: 1,
      borderColor: theme.colors.primary[500],
    },
    sortOptionLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing[3],
    },
    sortOptionText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.semantic.text.secondary,
    },
    sortOptionTextSelected: {
      color: theme.colors.primary[500],
    },
    limitOptions: {
      flexDirection: 'row',
      gap: theme.spacing[3],
    },
    limitOption: {
      flex: 1,
      paddingVertical: theme.spacing[3],
      backgroundColor: theme.semantic.background.secondary,
      borderRadius: theme.borderRadius.lg,
      alignItems: 'center',
    },
    limitOptionSelected: {
      backgroundColor: theme.colors.primary[500],
    },
    limitText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.semantic.text.secondary,
    },
    limitTextSelected: {
      color: theme.semantic.background.primary,
    },
    footer: {
      flexDirection: 'row',
      paddingHorizontal: theme.spacing[5],
      paddingVertical: theme.spacing[4],
      gap: theme.spacing[3],
      borderTopWidth: 1,
      borderTopColor: theme.semantic.border.primary,
    },
    resetButton: {
      flex: 1,
      paddingVertical: theme.spacing[3.5],
      backgroundColor: theme.semantic.background.secondary,
      borderRadius: theme.borderRadius.xl,
      alignItems: 'center',
    },
    resetButtonDisabled: {
      opacity: 0.5,
    },
    resetButtonText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.semantic.text.secondary,
    },
    resetButtonTextDisabled: {
      color: theme.semantic.text.tertiary,
    },
    applyButton: {
      flex: 2,
      paddingVertical: theme.spacing[3.5],
      backgroundColor: theme.colors.primary[500],
      borderRadius: theme.borderRadius.xl,
      alignItems: 'center',
    },
    applyButtonText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.semantic.background.primary,
    },
  }), [theme, screenWidth, screenHeight]);

  const renderFilterTab = () => (
    <ScrollView  style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Content Types */}
      <View  style={styles.section}>
        <Text  style={styles.sectionTitle}>Content Types</Text>
        <View  style={styles.optionsGrid}>
          {CONTENT_TYPES.map((type) => {
            const isSelected = localFilters.type?.includes(type.id) || false;
            return (
              <TouchableOpacity
                key={type.id}
                 style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                onPress={() => handleTypeToggle(type.id)}
              >
                <Icon
                  name={type.icon}
                  size={24}
                  color={isSelected ? theme.semantic.background.primary : theme.semantic.text.secondary}
                />
                <Text  style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Categories */}
      <View  style={styles.section}>
        <Text  style={styles.sectionTitle}>Categories</Text>
        <View  style={styles.chipContainer}>
          {CATEGORIES.map((category) => {
            const isSelected = localFilters.category === category;
            return (
              <TouchableOpacity
                key={category}
                 style={[styles.chip, isSelected && styles.chipSelected]}
                onPress={() => handleCategorySelect(category)}
              >
                <Text  style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                  {category}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Regions */}
      <View  style={styles.section}>
        <Text  style={styles.sectionTitle}>Region</Text>
        <View  style={styles.chipContainer}>
          {REGIONS.map((region) => {
            const isSelected = localFilters.region === region;
            return (
              <TouchableOpacity
                key={region}
                 style={[styles.chip, isSelected && styles.chipSelected]}
                onPress={() => handleRegionSelect(region)}
              >
                <Text  style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                  {region}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Quality Score */}
      <View  style={styles.section}>
        <Text  style={styles.sectionTitle}>Minimum Quality Score</Text>
        <View  style={styles.sliderContainer}>
          <View  style={styles.sliderLabels}>
            <Text  style={styles.sliderLabel}>0</Text>
            <Text  style={styles.sliderLabel}>5</Text>
            <Text  style={styles.sliderLabel}>10</Text>
          </View>
          <View  style={styles.qualityOptions}>
            {[0, 5, 7, 8, 9].map((score) => {
              const isSelected = localFilters.minScore === score;
              return (
                <TouchableOpacity
                  key={score}
                   style={[styles.qualityOption, isSelected && styles.qualityOptionSelected]}
                  onPress={() => setLocalFilters(prev => ({
                    ...prev,
                    minScore: isSelected ? undefined : score,
                  }))}
                >
                  <Text  style={[styles.qualityText, isSelected && styles.qualityTextSelected]}>
                    {score === 0 ? 'Any' : `${score}+`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </ScrollView>
  );

  const renderSortTab = () => (
    <ScrollView  style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View  style={styles.section}>
        <Text  style={styles.sectionTitle}>Sort By</Text>
        <View  style={styles.sortOptions}>
          {SORT_OPTIONS.map((option) => {
            const isSelected = localFilters.sortBy === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                 style={[styles.sortOption, isSelected && styles.sortOptionSelected]}
                onPress={() => handleSortSelect(option.id as SearchFilter['sortBy'])}
              >
                <View  style={styles.sortOptionLeft}>
                  <Icon
                    name={option.icon}
                    size={24}
                    color={isSelected ? theme.colors.primary[500] : theme.semantic.text.secondary}
                  />
                  <Text  style={[styles.sortOptionText, isSelected && styles.sortOptionTextSelected]}>
                    {option.label}
                  </Text>
                </View>
                {isSelected && (
                  <Icon name="check" size={20} color={theme.colors.primary[500]} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Results Limit */}
      <View  style={styles.section}>
        <Text  style={styles.sectionTitle}>Results Per Page</Text>
        <View  style={styles.limitOptions}>
          {[20, 50, 100].map((limit) => {
            const isSelected = localFilters.limit === limit;
            return (
              <TouchableOpacity
                key={limit}
                 style={[styles.limitOption, isSelected && styles.limitOptionSelected]}
                onPress={() => setLocalFilters(prev => ({
                  ...prev,
                  limit: isSelected ? undefined : limit,
                }))}
              >
                <Text  style={[styles.limitText, isSelected && styles.limitTextSelected]}>
                  {limit}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      onSwipeComplete={onClose}
      swipeDirection="down"
       style={styles.modal}
      backdropOpacity={0.5}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      hideModalContentWhileAnimating
      useNativeDriverForBackdrop
    >
      <View  style={styles.container}>
        {/* Header */}
        <View  style={styles.header}>
          <View  style={styles.handle} />
          <View  style={styles.headerContent}>
            <Text  style={styles.title}>Filter & Sort</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color={theme.semantic.text.secondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabs */}
        <View  style={styles.tabsContainer}>
          <View  style={styles.tabs}>
            <TouchableOpacity
               style={[styles.tab, activeTab === 'filters' && styles.tabActive]}
              onPress={() => handleTabChange('filters')}
            >
              <Text  style={[styles.tabText, activeTab === 'filters' && styles.tabTextActive]}>
                Filters
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
               style={[styles.tab, activeTab === 'sort' && styles.tabActive]}
              onPress={() => handleTabChange('sort')}
            >
              <Text  style={[styles.tabText, activeTab === 'sort' && styles.tabTextActive]}>
                Sort
              </Text>
            </TouchableOpacity>
          </View>
          <Animated.View  style={[styles.tabIndicator, tabIndicatorStyle]} />
        </View>

        {/* Content */}
        <View  style={styles.content}>
          {activeTab === 'filters' ? renderFilterTab() : renderSortTab()}
        </View>

        {/* Footer */}
        <View  style={styles.footer}>
          <TouchableOpacity
             style={[styles.resetButton, !hasActiveFilters && styles.resetButtonDisabled]}
            onPress={handleReset}
            disabled={!hasActiveFilters}
          >
            <Text  style={[styles.resetButtonText, !hasActiveFilters && styles.resetButtonTextDisabled]}>
              Reset
            </Text>
          </TouchableOpacity>
          <TouchableOpacity  style={styles.applyButton} onPress={handleApply}>
            <Text  style={styles.applyButtonText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default FilterSortModal;
