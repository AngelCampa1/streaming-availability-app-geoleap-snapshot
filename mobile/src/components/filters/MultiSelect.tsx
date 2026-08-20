/**
 * MultiSelect Component - Multi-select dropdown for filter options
 */

import React, { useState, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  StyleSheet,
  Modal,
  Dimensions,
  Animated,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { MultiSelectProps } from '../../types/filters';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const MultiSelect: React.FC<MultiSelectProps> = ({
  options,
  selectedValues,
  onSelectionChange,
  placeholder = 'Select options...',
  searchable = true,
  
  showSelectAll = true,
  showClear = true,
  disabled = false,
  multiColumn = false,
  columns = 2,
}) => {
  const theme = useTheme();
  const [isVisible, setIsVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [animatedHeight] = useState(new Animated.Value(0));
  const flatListRef = useRef<FlatList>(null);

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery) {return options;}

    return options.filter(option =>
      option.label.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [options, searchQuery]);

  // Check if all options are selected
  const isAllSelected = useMemo(() => {
    return filteredOptions.length > 0 &&
           filteredOptions.every(option => selectedValues.includes(option.value as string));
  }, [filteredOptions, selectedValues]);

  // Check if some options are selected (for indeterminate state)
  const _isSomeSelected = useMemo(() => {
    const selectedCount = filteredOptions.filter(option =>
      selectedValues.includes(option.value as string),
    ).length;
    return selectedCount > 0 && selectedCount < filteredOptions.length;
  }, [filteredOptions, selectedValues]);

  // Toggle modal visibility
  const toggleModal = useCallback(() => {
    if (disabled) {return;}

    if (isVisible) {
      // Close modal
      Animated.timing(animatedHeight, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start(() => {
        setIsVisible(false);
        setSearchQuery('');
      });
    } else {
      // Open modal
      setIsVisible(true);
      Animated.timing(animatedHeight, {
        toValue: Math.min(SCREEN_HEIGHT * 0.6, filteredOptions.length * 60 + 120),
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
  }, [isVisible, disabled, animatedHeight, filteredOptions.length]);

  // Toggle option selection
  const toggleOption = useCallback((value: string) => {
    const newSelection = selectedValues.includes(value)
      ? selectedValues.filter(v => v !== value)
      : [...selectedValues, value];

    onSelectionChange(newSelection);
  }, [selectedValues, onSelectionChange]);

  // Select all options
  const selectAll = useCallback(() => {
    const allValues = filteredOptions.map(option => option.value as string);
    onSelectionChange(allValues);
  }, [filteredOptions, onSelectionChange]);

  // Clear all selections
  const clearAll = useCallback(() => {
    onSelectionChange([]);
  }, [onSelectionChange]);

  // Format selected values for display
  const selectedDisplay = useMemo(() => {
    if (selectedValues.length === 0) {return placeholder;}

    const selectedOptions = options.filter(option =>
      selectedValues.includes(option.value as string),
    );

    if (selectedOptions.length <= 2) {
      return selectedOptions.map(opt => opt.label).join(', ');
    }

    return `${selectedOptions.length} items selected`;
  }, [selectedValues, options, placeholder]);

  const styles = StyleSheet.create({
    container: {
      marginBottom: theme.spacing[4],
    },
    trigger: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing[4],
      paddingVertical: theme.spacing[3],
      backgroundColor: theme.semantic.background.secondary,
      borderWidth: 1,
      borderColor: theme.semantic.border.primary,
      borderRadius: theme.borderRadius.md,
      minHeight: 48,
      opacity: disabled ? 0.5 : 1,
    },
    triggerText: {
      fontSize: theme.typography.fontSize.base,
      color: selectedValues.length === 0 ? theme.semantic.text.secondary : theme.semantic.text.primary,
      flex: 1,
    },
    dropdownIcon: {
      fontSize: theme.typography.fontSize.base,
      color: theme.semantic.text.secondary,
      marginLeft: theme.spacing[2],
    },
    overlay: {
      flex: 1,
      backgroundColor: theme.semantic.background.overlay,
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: theme.semantic.background.primary,
      borderTopLeftRadius: theme.borderRadius['2xl'],
      borderTopRightRadius: theme.borderRadius['2xl'],
      maxHeight: SCREEN_HEIGHT * 0.8,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing[5],
      paddingVertical: theme.spacing[4],
      borderBottomWidth: 1,
      borderBottomColor: theme.semantic.border.primary,
    },
    modalTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.semantic.text.primary,
    },
    closeButton: {
      fontSize: theme.typography.fontSize['2xl'],
      color: theme.semantic.text.secondary,
      paddingHorizontal: theme.spacing[2],
    },
    searchContainer: {
      paddingHorizontal: theme.spacing[5],
      paddingVertical: theme.spacing[3],
      borderBottomWidth: 1,
      borderBottomColor: theme.semantic.border.primary,
    },
    searchInput: {
      fontSize: theme.typography.fontSize.base,
      paddingVertical: theme.spacing[2],
      paddingHorizontal: theme.spacing[3],
      backgroundColor: theme.semantic.background.secondary,
      borderWidth: 1,
      borderColor: theme.semantic.border.primary,
      borderRadius: theme.borderRadius.md,
      color: theme.semantic.text.primary,
    },
    actionsContainer: {
      flexDirection: 'row',
      paddingHorizontal: theme.spacing[5],
      paddingVertical: theme.spacing[3],
      borderBottomWidth: 1,
      borderBottomColor: theme.semantic.border.primary,
    },
    actionButton: {
      paddingHorizontal: theme.spacing[4],
      paddingVertical: theme.spacing[2],
      borderRadius: theme.borderRadius.lg,
      marginRight: theme.spacing[3],
    },
    selectAllButton: {
      backgroundColor: theme.colors.primary[500],
    },
    clearButton: {
      backgroundColor: theme.semantic.background.secondary,
      borderWidth: 1,
      borderColor: theme.semantic.border.primary,
    },
    actionButtonText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.semantic.background.primary,
    },
    clearButtonText: {
      color: theme.semantic.text.primary,
    },
    optionsList: {
      paddingHorizontal: theme.spacing[5],
      paddingVertical: theme.spacing[2],
    },
    optionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing[3],
      paddingHorizontal: theme.spacing[2],
      borderBottomWidth: 1,
      borderBottomColor: theme.semantic.border.primary,
    },
    optionCheckbox: {
      width: theme.spacing[5],
      height: theme.spacing[5],
      borderRadius: theme.borderRadius.sm,
      borderWidth: 2,
      borderColor: theme.semantic.border.primary,
      marginRight: theme.spacing[3],
      justifyContent: 'center',
      alignItems: 'center',
    },
    optionCheckboxSelected: {
      backgroundColor: theme.colors.primary[500],
      borderColor: theme.colors.primary[500],
    },
    checkboxIcon: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.semantic.background.primary,
    },
    optionText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.semantic.text.primary,
      flex: 1,
    },
    optionCount: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.semantic.text.secondary,
      paddingHorizontal: theme.spacing[2],
      paddingVertical: theme.spacing[1],
      backgroundColor: theme.semantic.background.secondary,
      borderRadius: theme.borderRadius.xl,
    },
    optionColor: {
      width: theme.spacing[4],
      height: theme.spacing[4],
      borderRadius: theme.borderRadius.full,
      marginRight: theme.spacing[3],
    },
    gridContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: theme.spacing[2],
    },
    gridItem: {
      width: '48%',
      marginHorizontal: '1%',
      marginBottom: theme.spacing[2],
    },
  });

  const renderOption = ({ item }: { item: any }) => {
    const isSelected = selectedValues.includes(item.value as string);

    return (
      <TouchableOpacity
        style={[
          styles.optionItem,
          multiColumn && styles.gridItem,
        ]}
        onPress={() => toggleOption(item.value as string)}
      >
        <View
          style={[
            styles.optionCheckbox,
            isSelected && styles.optionCheckboxSelected,
          ]}
        >
          {isSelected && (
            <Text style={styles.checkboxIcon}>✓</Text>
          )}
        </View>

        {item.color && (
          <View
            style={[
              styles.optionColor,
              { backgroundColor: item.color },
            ]}
          />
        )}

        <Text style={styles.optionText}>{item.label}</Text>

        {item.count !== undefined && (
          <Text style={styles.optionCount}>{item.count}</Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.trigger}
        onPress={toggleModal}
        disabled={disabled}
      >
        <Text style={styles.triggerText}>{selectedDisplay}</Text>
        <Text style={styles.dropdownIcon}>
          {isVisible ? '▲' : '▼'}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={isVisible}
        transparent
        animationType="none"
        onRequestClose={toggleModal}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={toggleModal}
        >
          <Animated.View
            style={[
              styles.modalContent,
              { height: animatedHeight },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Options</Text>
              <TouchableOpacity onPress={toggleModal}>
                <Text style={styles.closeButton}>×</Text>
              </TouchableOpacity>
            </View>

            {searchable && (
              <View style={styles.searchContainer}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search options..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor={theme.semantic.text.secondary}
                />
              </View>
            )}

            {(showSelectAll || showClear) && (
              <View style={styles.actionsContainer}>
                {showSelectAll && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.selectAllButton]}
                    onPress={selectAll}
                    disabled={isAllSelected}
                  >
                    <Text style={styles.actionButtonText}>
                      {isAllSelected ? 'All Selected' : 'Select All'}
                    </Text>
                  </TouchableOpacity>
                )}

                {showClear && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.clearButton]}
                    onPress={clearAll}
                    disabled={selectedValues.length === 0}
                  >
                    <Text style={[styles.actionButtonText, styles.clearButtonText]}>
                      Clear All
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            <FlatList
              ref={flatListRef}
              data={filteredOptions}
              renderItem={renderOption}
              keyExtractor={(item) => item.value as string}
              style={styles.optionsList}
              contentContainerStyle={multiColumn ? styles.gridContainer : undefined}
              numColumns={multiColumn ? columns : 1}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <Text style={{
                  textAlign: 'center',
                  color: theme.semantic.text.secondary,
                  paddingVertical: 20,
                }}>
                  No options found
                </Text>
              }
            />
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default MultiSelect;
