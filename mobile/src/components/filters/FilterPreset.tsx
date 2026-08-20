/**
 * FilterPreset Component - Display and manage saved filter presets
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { FilterPresetProps } from '../../types/filters';

const FilterPreset: React.FC<FilterPresetProps> = ({
  preset,
  onApply,
  onEdit,
  onDelete,
  onDuplicate,
  isActive = false,
  isDefault = false,
  showUsageCount = true,
  compact = false,
}) => {
  const theme = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(preset.name);
  const [editDescription, setEditDescription] = useState(preset.description || '');

  const handleApply = () => {
    onApply(preset);
  };

  const handleEdit = () => {
    if (!onEdit) {return;}

    if (isEditing) {
      // Save changes
      onEdit({
        ...preset,
        name: editName.trim() || preset.name,
        description: editDescription.trim() || undefined,
        updatedAt: new Date(),
      });
      setIsEditing(false);
    } else {
      // Start editing
      setEditName(preset.name);
      setEditDescription(preset.description || '');
      setIsEditing(true);
    }
  };

  const handleDelete = () => {
    if (!onDelete || preset.isSystem) {return;}

    Alert.alert(
      'Delete Preset',
      `Are you sure you want to delete "${preset.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete(preset.id),
        },
      ],
    );
  };

  const handleDuplicate = () => {
    if (!onDuplicate) {return;}

    const duplicated = {
      ...preset,
      name: `${preset.name} (Copy)`,
      isDefault: false,
      isSystem: false,
      usageCount: 0,
    };

    onDuplicate(duplicated);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(date));
  };

  const styles = StyleSheet.create({
    container: {
      backgroundColor: theme.semantic.background.secondary,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: isActive ? theme.colors.primary[500] : theme.semantic.border.primary,
      marginBottom: 12,
      overflow: 'hidden',
      shadowColor: theme.colors.neutral?.[900] || theme.semantic.text.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isActive ? 0.15 : 0.1,
      shadowRadius: 4,
      elevation: isActive ? 4 : 2,
    },
    compactContainer: {
      borderRadius: 8,
      marginBottom: 8,
      padding: 12,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
    },
    compactHeader: {
      padding: 0,
      marginBottom: 8,
    },
    titleSection: {
      flex: 1,
      marginRight: 12,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    title: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.semantic.text.primary,
      marginRight: 8,
    },
    compactTitle: {
      fontSize: 14,
      fontWeight: '500',
    },
    badge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      fontSize: 10,
      fontWeight: '500',
      color: theme.semantic.background.primary,
    },
    systemBadge: {
      backgroundColor: theme.colors.primary[500],
    },
    defaultBadge: {
      backgroundColor: theme.colors.success[500],
    },
    description: {
      fontSize: 14,
      color: theme.semantic.text.secondary,
      lineHeight: 20,
    },
    compactDescription: {
      fontSize: 12,
      marginBottom: 4,
    },
    actions: {
      flexDirection: 'row',
    },
    actionButton: {
      padding: 8,
      borderRadius: 6,
      marginLeft: 4,
    },
    applyButton: {
      backgroundColor: theme.colors.primary[500],
    },
    menuButton: {
      backgroundColor: theme.semantic.background.secondary,
      borderWidth: 1,
      borderColor: theme.semantic.border.primary,
    },
    actionText: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.semantic.background.primary,
    },
    menuText: {
      color: theme.semantic.text.primary,
    },
    details: {
      paddingHorizontal: 16,
      paddingBottom: 16,
      borderTopWidth: 1,
      borderTopColor: theme.semantic.border.primary,
    },
    detailsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    detailItem: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    detailLabel: {
      fontSize: 12,
      color: theme.semantic.text.secondary,
      marginRight: 4,
    },
    detailValue: {
      fontSize: 12,
      color: theme.semantic.text.primary,
      fontWeight: '500',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: theme.colors.overlay.lightMedium,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: theme.semantic.background.primary,
      borderRadius: 16,
      padding: 20,
      width: '90%',
      maxWidth: 400,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.semantic.text.primary,
      marginBottom: 16,
    },
    input: {
      fontSize: 16,
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: theme.semantic.background.secondary,
      borderWidth: 1,
      borderColor: theme.semantic.border.primary,
      borderRadius: 8,
      color: theme.semantic.text.primary,
      marginBottom: 12,
    },
    textArea: {
      height: 80,
      textAlignVertical: 'top',
    },
    modalActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: 16,
    },
    modalButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 6,
      marginLeft: 8,
    },
    cancelButton: {
      backgroundColor: theme.semantic.background.secondary,
      borderWidth: 1,
      borderColor: theme.semantic.border.primary,
    },
    saveButton: {
      backgroundColor: theme.colors.primary[500],
    },
    modalButtonText: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.semantic.text.primary,
    },
    saveButtonText: {
      color: theme.semantic.background.primary,
    },
    filterSummary: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: 8,
    },
    filterChip: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      backgroundColor: theme.semantic.background.secondary,
      borderRadius: 4,
      marginRight: 6,
      marginBottom: 4,
    },
    filterChipText: {
      fontSize: 11,
      color: theme.semantic.text.secondary,
    },
  });

  const getFilterSummary = () => {
    const filters = [];

    if (preset.filters.contentType.length > 0) {
      filters.push(`${preset.filters.contentType.length} content types`);
    }
    if (preset.filters.genres.length > 0) {
      filters.push(`${preset.filters.genres.length} genres`);
    }
    if (preset.filters.streamingServices.length > 0) {
      filters.push(`${preset.filters.streamingServices.length} services`);
    }
    if (preset.filters.countries.length > 0) {
      filters.push(`${preset.filters.countries.length} countries`);
    }
    if (preset.filters.minRating > 0) {
      filters.push(`Rating ${preset.filters.minRating}+`);
    }
    if (preset.filters.yearRange[0] !== 1900 || preset.filters.yearRange[1] !== new Date().getFullYear()) {
      filters.push(`${preset.filters.yearRange[0]}-${preset.filters.yearRange[1]}`);
    }

    return filters;
  };

  return (
    <>
      <View style={[styles.container, compact && styles.compactContainer]}>
        <View style={[styles.header, compact && styles.compactHeader]}>
          <View style={styles.titleSection}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, compact && styles.compactTitle]}>
                {isEditing ? (
                  <TextInput
                    style={[styles.title, { flex: 1 }]}
                    value={editName}
                    onChangeText={setEditName}
                    autoFocus
                  />
                ) : (
                  preset.name
                )}
              </Text>

              {preset.isSystem && (
                <View style={[styles.badge, styles.systemBadge]}>
                  <Text style={styles.badge}>System</Text>
                </View>
              )}

              {isDefault && (
                <View style={[styles.badge, styles.defaultBadge]}>
                  <Text style={styles.badge}>Default</Text>
                </View>
              )}
            </View>

            {!compact && !isEditing && preset.description && (
              <Text style={styles.description}>{preset.description}</Text>
            )}

            {compact && !isEditing && preset.description && (
              <Text style={[styles.description, styles.compactDescription]}>
                {preset.description}
              </Text>
            )}

            {isEditing && (
              <TextInput
                style={[styles.input, styles.textArea]}
                value={editDescription}
                onChangeText={setEditDescription}
                placeholder="Description (optional)"
                multiline
              />
            )}
          </View>

          <View style={styles.actions}>
            {isEditing ? (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, styles.saveButton]}
                  onPress={handleEdit}
                >
                  <Text style={styles.actionText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.menuButton]}
                  onPress={() => setIsEditing(false)}
                >
                  <Text style={styles.menuText}>Cancel</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, styles.applyButton]}
                  onPress={handleApply}
                >
                  <Text style={styles.actionText}>Apply</Text>
                </TouchableOpacity>

                {(onEdit || onDuplicate || onDelete) && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.menuButton]}
                    onPress={() => {
                      // Show menu options
                      Alert.alert(
                        preset.name,
                        'Choose an action',
                        [
                          onEdit ? {
                            text: 'Edit',
                            onPress: handleEdit,
                          } : null,
                          onDuplicate ? {
                            text: 'Duplicate',
                            onPress: handleDuplicate,
                          } : null,
                          onDelete && !preset.isSystem ? {
                            text: 'Delete',
                            style: 'destructive' as const,
                            onPress: handleDelete,
                          } : null,
                          { text: 'Cancel', style: 'cancel' as const },
                        ].filter((item): item is NonNullable<typeof item> => item !== null),
                      );
                    }}
                  >
                    <Text style={styles.menuText}>⋯</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>

        {!compact && !isEditing && (
          <View style={styles.details}>
            {showUsageCount && (
              <View style={styles.detailsRow}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Used:</Text>
                  <Text style={styles.detailValue}>
                    {preset.usageCount} times
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Updated:</Text>
                  <Text style={styles.detailValue}>
                    {formatDate(preset.updatedAt)}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.filterSummary}>
              {getFilterSummary().map((summary, index) => (
                <View key={index} style={styles.filterChip}>
                  <Text style={styles.filterChipText}>{summary}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    </>
  );
};

export default FilterPreset;
