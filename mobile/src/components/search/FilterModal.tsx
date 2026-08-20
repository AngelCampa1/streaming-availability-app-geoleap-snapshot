import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  ViewStyle,
  TextStyle,
  Alert,
} from 'react-native';
import Slider from '@react-native-community/slider';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { SearchFilters } from '../../types/streaming';
import { useTheme } from '../../theme/ThemeProvider';

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: SearchFilters) => void;
  onReset: () => void;
  initialFilters?: SearchFilters;
  availableGenres?: string[];
  availableCountries?: string[];
  availableServices?: string[];
  style?: ViewStyle;
  testID?: string;
}

const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  onClose,
  onApply,
  onReset,
  initialFilters = {},
  availableGenres = [
    'Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Romance',
    'Thriller', 'Documentary', 'Animation', 'Crime', 'Fantasy',
    'Mystery', 'Adventure', 'Family', 'Biography', 'History',
  ],
  availableCountries = [
    'US', 'UK', 'CA', 'AU', 'DE', 'FR', 'IT', 'ES', 'JP', 'KR',
    'BR', 'MX', 'IN', 'NL', 'SE', 'NO', 'DK', 'FI', 'BE', 'AT',
  ],
  availableServices = [
    'Netflix', 'HBO Max', 'Disney+', 'Amazon Prime', 'Hulu',
    'Apple TV+', 'Paramount+', 'Peacock', 'Starz', 'Showtime',
  ],
  style,
  testID = 'filter-modal',
}) => {
  const { theme } = useTheme();
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);

  React.useEffect(() => {
    if (visible) {
      setFilters(initialFilters);
    }
  }, [visible, initialFilters]);

  const hasActiveFilters = useMemo(() => {
    return Object.keys(filters).some(key => {
      const value = filters[key as keyof SearchFilters];
      if (Array.isArray(value)) {return value.length > 0;}
      if (typeof value === 'object' && value !== null) {
        return Object.values(value).some(v => v !== undefined && v !== null);
      }
      return value !== undefined && value !== null;
    });
  }, [filters]);

  const handleTypeToggle = useCallback((type: string) => {
    setFilters(prev => ({
      ...prev,
      type: prev.type?.includes(type as any)
        ? prev.type.filter(t => t !== type)
        : [...(prev.type || []), type as any],
    }));
  }, []);

  const handleGenreToggle = useCallback((genre: string) => {
    setFilters(prev => ({
      ...prev,
      genres: prev.genres?.includes(genre)
        ? prev.genres.filter(g => g !== genre)
        : [...(prev.genres || []), genre],
    }));
  }, []);

  const handleCountryToggle = useCallback((country: string) => {
    setFilters(prev => ({
      ...prev,
      countries: prev.countries?.includes(country)
        ? prev.countries.filter(c => c !== country)
        : [...(prev.countries || []), country],
    }));
  }, []);

  const handleServiceToggle = useCallback((service: string) => {
    setFilters(prev => ({
      ...prev,
      services: prev.services?.includes(service)
        ? prev.services.filter(s => s !== service)
        : [...(prev.services || []), service],
    }));
  }, []);

  const handleQualityToggle = useCallback((quality: string) => {
    setFilters(prev => ({
      ...prev,
      quality: prev.quality?.includes(quality as any)
        ? prev.quality.filter(q => q !== quality)
        : [...(prev.quality || []), quality as any],
    }));
  }, []);

  const handlePriceTypeToggle = useCallback((priceType: string) => {
    setFilters(prev => ({
      ...prev,
      priceType: prev.priceType?.includes(priceType as any)
        ? prev.priceType.filter(p => p !== priceType)
        : [...(prev.priceType || []), priceType as any],
    }));
  }, []);

  const handleYearRangeChange = useCallback((range: 'min' | 'max', value: number) => {
    setFilters(prev => ({
      ...prev,
      yearRange: {
        ...prev.yearRange,
        [range]: value === 1900 ? undefined : value,
      },
    }));
  }, []);

  const handleRatingRangeChange = useCallback((range: 'min' | 'max', value: number) => {
    setFilters(prev => ({
      ...prev,
      ratingRange: {
        ...prev.ratingRange,
        [range]: value === 0 ? undefined : value,
      },
    }));
  }, []);

  const handleSortByChange = useCallback((sortBy: string) => {
    setFilters(prev => ({
      ...prev,
      sortBy: sortBy as any,
    }));
  }, []);

  const handleSortOrderChange = useCallback((sortOrder: string) => {
    setFilters(prev => ({
      ...prev,
      sortOrder: sortOrder as any,
    }));
  }, []);

  const _handleLanguageChange = useCallback((language: string) => {
    setFilters(prev => ({
      ...prev,
      language: language || undefined,
    }));
  }, []);

  const handleApply = useCallback(() => {
    onApply(filters);
    onClose();
  }, [onApply, filters, onClose]);

  const handleReset = useCallback(() => {
    Alert.alert(
      'Reset Filters',
      'Are you sure you want to reset all filters?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            setFilters({});
            onReset();
            onClose();
          },
        },
      ],
    );
  }, [onReset, onClose]);

  const renderFilterSection = useCallback((title: string, children: React.ReactNode) => (
    <View style={styles.filterSection}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  ), []);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.semantic.background.primary,
    } as ViewStyle,
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.semantic.border.primary,
    } as ViewStyle,
    closeButton: {
      padding: 4,
    } as ViewStyle,
    title: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.semantic.text.primary,
    } as TextStyle,
    resetButton: {
      padding: 8,
    } as ViewStyle,
    resetButtonText: {
      fontSize: 16,
      color: theme.colors.primary[500],
      fontWeight: '500',
    } as TextStyle,
    resetButtonTextDisabled: {
      color: theme.semantic.text.tertiary,
    } as TextStyle,
    content: {
      flex: 1,
      padding: 16,
    } as ViewStyle,
    filterSection: {
      marginBottom: 24,
    } as ViewStyle,
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.semantic.text.primary,
      marginBottom: 12,
    } as TextStyle,
    toggleContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    } as ViewStyle,
    toggleButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: theme.semantic.background.secondary,
      borderWidth: 1,
      borderColor: theme.semantic.border.primary,
    } as ViewStyle,
    toggleButtonActive: {
      backgroundColor: theme.colors.primary[500],
      borderColor: theme.colors.primary[500],
    } as ViewStyle,
    toggleButtonText: {
      fontSize: 14,
      color: theme.semantic.text.secondary,
      fontWeight: '500',
    } as TextStyle,
    toggleButtonTextActive: {
      color: theme.semantic.background.primary,
    } as TextStyle,
    chipContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    } as ViewStyle,
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: theme.semantic.background.secondary,
      borderWidth: 1,
      borderColor: theme.semantic.border.primary,
    } as ViewStyle,
    chipActive: {
      backgroundColor: theme.colors.primary[50],
      borderColor: theme.colors.primary[500],
    } as ViewStyle,
    chipText: {
      fontSize: 13,
      color: theme.semantic.text.secondary,
      fontWeight: '500',
    } as TextStyle,
    chipTextActive: {
      color: theme.colors.primary[500],
    } as TextStyle,
    rangeContainer: {
      gap: 16,
    } as ViewStyle,
    sliderContainer: {
      gap: 8,
    } as ViewStyle,
    sliderLabel: {
      fontSize: 14,
      color: theme.semantic.text.secondary,
      fontWeight: '500',
    } as TextStyle,
    slider: {
      width: '100%',
      height: 40,
    } as ViewStyle,
    sliderThumb: {
      width: 20,
      height: 20,
      backgroundColor: theme.colors.primary[500],
      borderColor: theme.semantic.background.primary,
      borderWidth: 2,
      borderRadius: 10,
    } as ViewStyle,
    horizontalScroll: {
      marginBottom: 8,
    } as ViewStyle,
    sortContainer: {
      gap: 16,
    } as ViewStyle,
    sortRow: {
      gap: 12,
    } as ViewStyle,
    sortLabel: {
      fontSize: 14,
      color: theme.semantic.text.secondary,
      fontWeight: '500',
      marginBottom: 8,
    } as TextStyle,
    sortOptions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    } as ViewStyle,
    sortOption: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
      backgroundColor: theme.semantic.background.secondary,
      borderWidth: 1,
      borderColor: theme.semantic.border.primary,
    } as ViewStyle,
    sortOptionActive: {
      backgroundColor: theme.colors.primary[500],
      borderColor: theme.colors.primary[500],
    } as ViewStyle,
    sortOptionText: {
      fontSize: 13,
      color: theme.semantic.text.secondary,
      fontWeight: '500',
    } as TextStyle,
    sortOptionTextActive: {
      color: theme.semantic.background.primary,
    } as TextStyle,
    footer: {
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderTopWidth: 1,
      borderTopColor: theme.semantic.border.primary,
    } as ViewStyle,
    applyButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary[500],
      paddingVertical: 14,
      borderRadius: 12,
      position: 'relative',
    } as ViewStyle,
    applyButtonText: {
      fontSize: 16,
      color: theme.semantic.background.primary,
      fontWeight: '600',
    } as TextStyle,
    activeFilterBadge: {
      position: 'absolute',
      top: -8,
      right: -8,
      backgroundColor: theme.colors.error[500],
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 6,
    } as ViewStyle,
    activeFilterBadgeText: {
      fontSize: 11,
      color: theme.semantic.background.primary,
      fontWeight: '600',
    } as TextStyle,
  }), [theme]);

  const renderTypeFilters = useCallback(() => (
    <View style={styles.toggleContainer}>
      {['movie', 'tv', 'documentary', 'anime', 'series'].map(type => (
        <TouchableOpacity
          key={type}
          style={[
            styles.toggleButton,
            filters.type?.includes(type as any) && styles.toggleButtonActive,
          ]}
          onPress={() => handleTypeToggle(type)}
          testID={`${testID}-type-${type}`}
        >
          <Text style={[
            styles.toggleButtonText,
            filters.type?.includes(type as any) && styles.toggleButtonTextActive,
          ]}>
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  ), [filters.type, handleTypeToggle, testID, styles]);

  const renderGenreFilters = useCallback(() => (
    <View style={styles.chipContainer}>
      {availableGenres.map(genre => (
        <TouchableOpacity
          key={genre}
          style={[
            styles.chip,
            filters.genres?.includes(genre) && styles.chipActive,
          ]}
          onPress={() => handleGenreToggle(genre)}
          testID={`${testID}-genre-${genre}`}
        >
          <Text style={[
            styles.chipText,
            filters.genres?.includes(genre) && styles.chipTextActive,
          ]}>
            {genre}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  ), [filters.genres, handleGenreToggle, availableGenres, testID, styles]);

  const renderYearRange = useCallback(() => {
    const minYear = filters.yearRange?.min || 1900;
    const maxYear = filters.yearRange?.max || new Date().getFullYear();

    return (
      <View style={styles.rangeContainer}>
        <View style={styles.sliderContainer}>
          <Text style={styles.sliderLabel}>From: {minYear}</Text>
          <Slider
            style={styles.slider}
            minimumValue={1900}
            maximumValue={new Date().getFullYear()}
            value={minYear}
            onValueChange={value => handleYearRangeChange('min', value)}
            minimumTrackTintColor={theme.colors.primary[500]}
            maximumTrackTintColor={theme.semantic.border.primary}
            // thumbStyle={styles.sliderThumb}
          />
        </View>
        <View style={styles.sliderContainer}>
          <Text style={styles.sliderLabel}>To: {maxYear}</Text>
          <Slider
            style={styles.slider}
            minimumValue={1900}
            maximumValue={new Date().getFullYear()}
            value={maxYear}
            onValueChange={value => handleYearRangeChange('max', value)}
            minimumTrackTintColor={theme.colors.primary[500]}
            maximumTrackTintColor={theme.semantic.border.primary}
            // thumbStyle={styles.sliderThumb}
          />
        </View>
      </View>
    );
  }, [filters.yearRange, handleYearRangeChange, theme, styles]);

  const renderRatingRange = useCallback(() => {
    const minRating = filters.ratingRange?.min || 0;
    const maxRating = filters.ratingRange?.max || 10;

    return (
      <View style={styles.rangeContainer}>
        <View style={styles.sliderContainer}>
          <Text style={styles.sliderLabel}>Min Rating: {minRating.toFixed(1)}</Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={10}
            value={minRating}
            onValueChange={value => handleRatingRangeChange('min', value)}
            minimumTrackTintColor={theme.colors.primary[500]}
            maximumTrackTintColor={theme.semantic.border.primary}
            // thumbStyle={styles.sliderThumb}
            // step={0.1}
          />
        </View>
        <View style={styles.sliderContainer}>
          <Text style={styles.sliderLabel}>Max Rating: {maxRating.toFixed(1)}</Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={10}
            value={maxRating}
            onValueChange={value => handleRatingRangeChange('max', value)}
            minimumTrackTintColor={theme.colors.primary[500]}
            maximumTrackTintColor={theme.semantic.border.primary}
            // thumbStyle={styles.sliderThumb}
            // step={0.1}
          />
        </View>
      </View>
    );
  }, [filters.ratingRange, handleRatingRangeChange, theme, styles]);

  const renderCountryFilters = useCallback(() => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
      <View style={styles.chipContainer}>
        {availableCountries.map(country => (
          <TouchableOpacity
            key={country}
            style={[
              styles.chip,
              filters.countries?.includes(country) && styles.chipActive,
            ]}
            onPress={() => handleCountryToggle(country)}
            testID={`${testID}-country-${country}`}
          >
            <Text style={[
              styles.chipText,
              filters.countries?.includes(country) && styles.chipTextActive,
            ]}>
              {country}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  ), [filters.countries, handleCountryToggle, availableCountries, testID, styles]);

  const renderServiceFilters = useCallback(() => (
    <View style={styles.chipContainer}>
      {availableServices.map(service => (
        <TouchableOpacity
          key={service}
          style={[
            styles.chip,
            filters.services?.includes(service) && styles.chipActive,
          ]}
          onPress={() => handleServiceToggle(service)}
          testID={`${testID}-service-${service}`}
        >
          <Text style={[
            styles.chipText,
            filters.services?.includes(service) && styles.chipTextActive,
          ]}>
            {service}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  ), [filters.services, handleServiceToggle, availableServices, testID, styles]);

  const renderQualityFilters = useCallback(() => (
    <View style={styles.toggleContainer}>
      {['SD', 'HD', '4K'].map(quality => (
        <TouchableOpacity
          key={quality}
          style={[
            styles.toggleButton,
            filters.quality?.includes(quality as any) && styles.toggleButtonActive,
          ]}
          onPress={() => handleQualityToggle(quality)}
          testID={`${testID}-quality-${quality}`}
        >
          <Text style={[
            styles.toggleButtonText,
            filters.quality?.includes(quality as any) && styles.toggleButtonTextActive,
          ]}>
            {quality}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  ), [filters.quality, handleQualityToggle, testID, styles]);

  const renderPriceTypeFilters = useCallback(() => (
    <View style={styles.toggleContainer}>
      {['subscription', 'rental', 'purchase', 'free'].map(priceType => (
        <TouchableOpacity
          key={priceType}
          style={[
            styles.toggleButton,
            filters.priceType?.includes(priceType as any) && styles.toggleButtonActive,
          ]}
          onPress={() => handlePriceTypeToggle(priceType)}
          testID={`${testID}-price-type-${priceType}`}
        >
          <Text style={[
            styles.toggleButtonText,
            filters.priceType?.includes(priceType as any) && styles.toggleButtonTextActive,
          ]}>
            {priceType.charAt(0).toUpperCase() + priceType.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  ), [filters.priceType, handlePriceTypeToggle, testID, styles]);

  const renderSortOptions = useCallback(() => (
    <View style={styles.sortContainer}>
      <View style={styles.sortRow}>
        <Text style={styles.sortLabel}>Sort by:</Text>
        <View style={styles.sortOptions}>
          {['relevance', 'popularity', 'rating', 'release_date', 'title'].map(sortBy => (
            <TouchableOpacity
              key={sortBy}
              style={[
                styles.sortOption,
                filters.sortBy === sortBy && styles.sortOptionActive,
              ]}
              onPress={() => handleSortByChange(sortBy)}
              testID={`${testID}-sort-${sortBy}`}
            >
              <Text style={[
                styles.sortOptionText,
                filters.sortBy === sortBy && styles.sortOptionTextActive,
              ]}>
                {sortBy.replace('_', ' ').charAt(0).toUpperCase() + sortBy.replace('_', ' ').slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <View style={styles.sortRow}>
        <Text style={styles.sortLabel}>Order:</Text>
        <View style={styles.sortOptions}>
          {['asc', 'desc'].map(sortOrder => (
            <TouchableOpacity
              key={sortOrder}
              style={[
                styles.sortOption,
                filters.sortOrder === sortOrder && styles.sortOptionActive,
              ]}
              onPress={() => handleSortOrderChange(sortOrder)}
              testID={`${testID}-order-${sortOrder}`}
            >
              <Text style={[
                styles.sortOptionText,
                filters.sortOrder === sortOrder && styles.sortOptionTextActive,
              ]}>
                {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  ), [filters.sortBy, filters.sortOrder, handleSortByChange, handleSortOrderChange, testID, styles]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      testID={testID}
    >
      <View style={[styles.container, style]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color={theme.semantic.text.secondary} />
          </TouchableOpacity>
          <Text style={styles.title}>Search Filters</Text>
          <TouchableOpacity
            onPress={handleReset}
            style={styles.resetButton}
            disabled={!hasActiveFilters}
          >
            <Text style={[
              styles.resetButtonText,
              !hasActiveFilters && styles.resetButtonTextDisabled,
            ]}>
              Reset
            </Text>
          </TouchableOpacity>
        </View>

        {/* Filters */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {renderFilterSection('Content Type', renderTypeFilters())}
          {renderFilterSection('Genres', renderGenreFilters())}
          {renderFilterSection('Release Year', renderYearRange())}
          {renderFilterSection('Rating', renderRatingRange())}
          {renderFilterSection('Countries', renderCountryFilters())}
          {renderFilterSection('Streaming Services', renderServiceFilters())}
          {renderFilterSection('Quality', renderQualityFilters())}
          {renderFilterSection('Price Type', renderPriceTypeFilters())}
          {renderFilterSection('Sort Options', renderSortOptions())}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.applyButton}
            onPress={handleApply}
            testID={`${testID}-apply-button`}
          >
            <Text style={styles.applyButtonText}>Apply Filters</Text>
            {hasActiveFilters && (
              <View style={styles.activeFilterBadge}>
                <Text style={styles.activeFilterBadgeText}>
                  {Object.values(filters).filter(value => {
                    if (Array.isArray(value)) {return value.length > 0;}
                    if (typeof value === 'object' && value !== null) {
                      return Object.values(value).some(v => v !== undefined && v !== null);
                    }
                    return value !== undefined && value !== null;
                  }).length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default FilterModal;
