import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Modal from 'react-native-modal';
import { SearchFilter } from '../../types/search';
import { useTheme } from '../../theme/ThemeProvider';

interface SearchFiltersComponentProps {
  filters: SearchFilter;
  onFiltersChange: (filters: SearchFilter) => void;
  onApplyFilters: () => void;
  onClearFilters: () => void;
  style?: any;
}

const contentTypes = [
  { id: 'all', label: 'All', icon: 'apps' },
  { id: 'content', label: 'Content', icon: 'play-circle-outline' },
  { id: 'user', label: 'Users', icon: 'person-outline' },
  { id: 'channel', label: 'Channels', icon: 'tv' },
  { id: 'location', label: 'Locations', icon: 'location-on' },
];

const categories = [
  { id: '', label: 'All Categories' },
  { id: 'streaming', label: 'Streaming' },
  { id: 'entertainment', label: 'Entertainment' },
  { id: 'sports', label: 'Sports' },
  { id: 'news', label: 'News' },
  { id: 'documentary', label: 'Documentary' },
  { id: 'music', label: 'Music' },
  { id: 'gaming', label: 'Gaming' },
  { id: 'education', label: 'Education' },
];

const sortOptions = [
  { id: 'relevance', label: 'Relevance', icon: 'sort' },
  { id: 'date', label: 'Date', icon: 'schedule' },
  { id: 'popularity', label: 'Popularity', icon: 'trending-up' },
];

const regions = [
  { id: '', label: 'All Regions' },
  { id: 'us', label: 'United States' },
  { id: 'uk', label: 'United Kingdom' },
  { id: 'ca', label: 'Canada' },
  { id: 'au', label: 'Australia' },
  { id: 'de', label: 'Germany' },
  { id: 'fr', label: 'France' },
  { id: 'jp', label: 'Japan' },
  { id: 'kr', label: 'South Korea' },
];

const SearchFiltersComponent: React.FC<SearchFiltersComponentProps> = ({
  filters,
  onFiltersChange,
  onApplyFilters,
  onClearFilters,
  style,
}) => {
  const { theme } = useTheme();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [tempFilters, setTempFilters] = useState<SearchFilter>(filters);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['type', 'sort']),
  );

  const styles = useMemo(() => StyleSheet.create({
    filterButton: {
      padding: theme.spacing[3],
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.semantic.background.secondary,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    filterButtonActive: {
      backgroundColor: theme.colors.primary[500],
    },
    filterBadge: {
      position: 'absolute',
      top: -theme.spacing[1],
      right: -theme.spacing[1],
      backgroundColor: theme.colors.error[500],
      borderRadius: theme.borderRadius.full,
      minWidth: 20,
      height: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterBadgeText: {
      color: theme.semantic.background.primary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: '600',
    },
    modal: {
      justifyContent: 'flex-end',
      margin: 0,
    },
    modalContent: {
      backgroundColor: theme.semantic.background.primary,
      borderTopLeftRadius: theme.borderRadius['2xl'],
      borderTopRightRadius: theme.borderRadius['2xl'],
      maxHeight: '80%',
      minHeight: '60%',
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: theme.spacing[5],
      borderBottomWidth: 1,
      borderBottomColor: theme.semantic.border.primary,
    },
    modalTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: '600',
      color: theme.semantic.text.primary,
    },
    clearText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.primary[500],
      fontWeight: '500',
    },
    modalBody: {
      flex: 1,
      padding: theme.spacing[5],
    },
    filterSection: {
      marginBottom: theme.spacing[6],
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: theme.spacing[2],
    },
    sectionTitle: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: '600',
      color: theme.semantic.text.primary,
    },
    sectionContent: {
      marginTop: theme.spacing[3],
    },
    optionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing[2],
    },
    optionChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing[3],
      paddingVertical: theme.spacing[2],
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.semantic.background.secondary,
      borderWidth: 1,
      borderColor: theme.semantic.border.primary,
    },
    optionChipActive: {
      backgroundColor: theme.colors.primary[500],
      borderColor: theme.colors.primary[500],
    },
    optionIcon: {
      marginRight: theme.spacing[1.5],
    },
    optionLabel: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.semantic.text.secondary,
      fontWeight: '500',
    },
    optionLabelActive: {
      color: theme.semantic.background.primary,
    },
    optionsList: {
      gap: theme.spacing[1],
    },
    listOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: theme.spacing[3],
      paddingHorizontal: theme.spacing[4],
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.semantic.background.secondary,
    },
    listOptionActive: {
      backgroundColor: theme.colors.primary[50],
    },
    listOptionText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.semantic.text.primary,
    },
    listOptionTextActive: {
      color: theme.colors.primary[500],
      fontWeight: '500',
    },
    modalFooter: {
      flexDirection: 'row',
      padding: theme.spacing[5],
      gap: theme.spacing[3],
      borderTopWidth: 1,
      borderTopColor: theme.semantic.border.primary,
    },
    cancelButton: {
      flex: 1,
      paddingVertical: theme.spacing[3.5],
      alignItems: 'center',
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.semantic.background.secondary,
    },
    cancelButtonText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.semantic.text.secondary,
      fontWeight: '500',
    },
    applyButton: {
      flex: 2,
      paddingVertical: theme.spacing[3.5],
      alignItems: 'center',
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.primary[500],
    },
    applyButtonText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.semantic.background.primary,
      fontWeight: '600',
    },
  }), [theme]);

  const hasActiveFilters = () => {
    return (
      (filters.type && filters.type.length > 0 && !filters.type.includes('all')) ||
      filters.category ||
      (filters.sortBy && filters.sortBy !== 'relevance') ||
      filters.region ||
      filters.dateRange
    );
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.type && filters.type.length > 0 && !filters.type.includes('all')) {count++;}
    if (filters.category) {count++;}
    if (filters.sortBy && filters.sortBy !== 'relevance') {count++;}
    if (filters.region) {count++;}
    if (filters.dateRange) {count++;}
    return count;
  };

  const openModal = () => {
    setTempFilters({ ...filters });
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setIsModalVisible(false);
  };

  const handleApply = () => {
    onFiltersChange(tempFilters);
    onApplyFilters();
    closeModal();
  };

  const handleClear = () => {
    const clearedFilters: SearchFilter = {
      type: ['all'],
      sortBy: 'relevance',
    };
    setTempFilters(clearedFilters);
    onFiltersChange(clearedFilters);
    onClearFilters();
    closeModal();
  };

  const updateTempFilter = (key: keyof SearchFilter, value: unknown) => {
    setTempFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const renderFilterSection = (
    title: string,
    sectionKey: string,
    content: React.ReactNode,
  ) => {
    const isExpanded = expandedSections.has(sectionKey);

    return (
      <View style={styles.filterSection}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection(sectionKey)}
        >
          <Text style={styles.sectionTitle}>{title}</Text>
          <Icon
            name={isExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
            size={24}
            color={theme.semantic.text.secondary}
          />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.sectionContent}>
            {content}
          </View>
        )}
      </View>
    );
  };

  const renderContentTypes = () => (
    <View style={styles.optionsGrid}>
      {contentTypes.map((type) => (
        <TouchableOpacity
          key={type.id}
          style={[
            styles.optionChip,
            tempFilters.type?.includes(type.id) && styles.optionChipActive,
          ]}
          onPress={() => updateTempFilter('type', type.id)}
        >
          <Icon
            name={type.icon}
            size={18}
            color={tempFilters.type?.includes(type.id) ? theme.semantic.background.primary : theme.semantic.text.secondary}
            style={styles.optionIcon}
          />
          <Text
            style={[
              styles.optionLabel,
              tempFilters.type?.includes(type.id) && styles.optionLabelActive,
            ]}
          >
            {type.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderCategories = () => (
    <View style={styles.optionsList}>
      {categories.map((category) => (
        <TouchableOpacity
          key={category.id}
          style={[
            styles.listOption,
            tempFilters.category === category.id && styles.listOptionActive,
          ]}
          onPress={() => updateTempFilter('category', category.id)}
        >
          <Text
            style={[
              styles.listOptionText,
              tempFilters.category === category.id && styles.listOptionTextActive,
            ]}
          >
            {category.label}
          </Text>
          {tempFilters.category === category.id && (
            <Icon name="check" size={20} color={theme.colors.primary[500]} />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderSortOptions = () => (
    <View style={styles.optionsGrid}>
      {sortOptions.map((option) => (
        <TouchableOpacity
          key={option.id}
          style={[
            styles.optionChip,
            tempFilters.sortBy === option.id && styles.optionChipActive,
          ]}
          onPress={() => updateTempFilter('sortBy', option.id)}
        >
          <Icon
            name={option.icon}
            size={18}
            color={tempFilters.sortBy === option.id ? theme.semantic.background.primary : theme.semantic.text.secondary}
            style={styles.optionIcon}
          />
          <Text
            style={[
              styles.optionLabel,
              tempFilters.sortBy === option.id && styles.optionLabelActive,
            ]}
          >
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderRegions = () => (
    <View style={styles.optionsList}>
      {regions.map((region) => (
        <TouchableOpacity
          key={region.id}
          style={[
            styles.listOption,
            tempFilters.region === region.id && styles.listOptionActive,
          ]}
          onPress={() => updateTempFilter('region', region.id)}
        >
          <Text
            style={[
              styles.listOptionText,
              tempFilters.region === region.id && styles.listOptionTextActive,
            ]}
          >
            {region.label}
          </Text>
          {tempFilters.region === region.id && (
            <Icon name="check" size={20} color={theme.colors.primary[500]} />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <>
      {/* Filter Button */}
      <TouchableOpacity
        style={[
          styles.filterButton,
          hasActiveFilters() && styles.filterButtonActive,
          style,
        ]}
        onPress={openModal}
      >
        <Icon
          name="tune"
          size={24}
          color={hasActiveFilters() ? theme.semantic.background.primary : theme.colors.primary[500]}
        />
        {hasActiveFilters() && (
          <View style={styles.filterBadge}>
            <Text style={styles.filterBadgeText}>{getActiveFilterCount()}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Filters Modal */}
      <Modal
        isVisible={isModalVisible}
        onBackdropPress={closeModal}
        onBackButtonPress={closeModal}
        animationIn="slideInUp"
        animationOut="slideOutDown"
        backdropOpacity={0.5}
        style={styles.modal}
      >
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeModal}>
              <Icon name="close" size={24} color={theme.semantic.text.secondary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Search Filters</Text>
            <TouchableOpacity onPress={handleClear}>
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          </View>

          {/* Filters Content */}
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {renderFilterSection('Content Type', 'type', renderContentTypes())}
            {renderFilterSection('Category', 'category', renderCategories())}
            {renderFilterSection('Sort By', 'sort', renderSortOptions())}
            {renderFilterSection('Region', 'region', renderRegions())}
          </ScrollView>

          {/* Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={closeModal}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.applyButton}
              onPress={handleApply}
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default SearchFiltersComponent;
