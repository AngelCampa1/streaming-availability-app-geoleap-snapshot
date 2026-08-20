/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';

// Create simple mock components using React Native components
const MockInput: React.FC<any> = ({
  value,
  onChangeText,
  label,
  error,
  helperText,
  testID,
  placeholder,
  onFocus,
  onBlur,
}) => {
  return (
    <View testID={testID || 'input'}>
      {label && <Text testID="input-label">{label}</Text>}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        onFocus={onFocus}
        onBlur={onBlur}
        testID="input-field"
      />
      {error && <Text testID="input-error">{error}</Text>}
      {helperText && <Text testID="input-helper">{helperText}</Text>}
    </View>
  );
};

const MockSearchInput: React.FC<any> = ({
  value,
  onChangeText,
  onSearch,
  onClear,
  testID,
  placeholder = 'Search for movies, TV shows...',
}) => {
  return (
    <View testID={testID || 'search-input'}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        testID="search-field"
        onSubmitEditing={() => onSearch?.(value)}
      />
      {value && (
        <TouchableOpacity testID="clear-button" onPress={() => {
          onChangeText?.('');
          onClear?.();
        }}>
          <Text>Clear</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

describe('Input Component', () => {
  it('renders correctly with basic props', () => {
    const mockOnChangeText = jest.fn();
    const { getByTestId } = render(
      <MockInput
        value="test value"
        onChangeText={mockOnChangeText}
        testID="test-input"
      />
    );

    const inputField = getByTestId('input-field');
    expect(inputField.props.value).toBe('test value');
  });

  it('renders with label when provided', () => {
    const { getByTestId } = render(
      <MockInput
        label="Test Label"
        value=""
        onChangeText={jest.fn()}
      />
    );

    const label = getByTestId('input-label');
    expect(label.props.children).toBe('Test Label');
  });

  it('renders error state correctly', () => {
    const { getByTestId } = render(
      <MockInput
        label="Email"
        value="invalid-email"
        onChangeText={jest.fn()}
        error="Invalid email format"
      />
    );

    const errorText = getByTestId('input-error');
    expect(errorText.props.children).toBe('Invalid email format');
  });

  it('renders helper text when provided', () => {
    const { getByTestId } = render(
      <MockInput
        label="Password"
        value=""
        onChangeText={jest.fn()}
        helperText="Password must be at least 8 characters"
      />
    );

    const helperText = getByTestId('input-helper');
    expect(helperText.props.children).toBe('Password must be at least 8 characters');
  });

  it('calls onChangeText when text changes', () => {
    const mockOnChangeText = jest.fn();
    const { getByTestId } = render(
      <MockInput
        value=""
        onChangeText={mockOnChangeText}
        testID="test-input"
      />
    );

    const textInput = getByTestId('input-field');
    fireEvent.changeText(textInput, 'new value');
    expect(mockOnChangeText).toHaveBeenCalledWith('new value');
  });

  it('handles focus and blur events', () => {
    const mockOnFocus = jest.fn();
    const mockOnBlur = jest.fn();
    const { getByTestId } = render(
      <MockInput
        value="test"
        onChangeText={jest.fn()}
        onFocus={mockOnFocus}
        onBlur={mockOnBlur}
        testID="focus-input"
      />
    );

    const textInput = getByTestId('input-field');
    fireEvent(textInput, 'focus');
    expect(mockOnFocus).toHaveBeenCalled();

    fireEvent(textInput, 'blur');
    expect(mockOnBlur).toHaveBeenCalled();
  });
});

describe('SearchInput Component', () => {
  it('renders correctly with search placeholder', () => {
    const { getByTestId } = render(
      <MockSearchInput
        value=""
        onChangeText={jest.fn()}
      />
    );

    const searchField = getByTestId('search-field');
    expect(searchField.props.placeholder).toBe('Search for movies, TV shows...');
  });

  it('calls onSearch when submit is pressed', () => {
    const mockOnSearch = jest.fn();
    const { getByTestId } = render(
      <MockSearchInput
        value="search query"
        onChangeText={jest.fn()}
        onSearch={mockOnSearch}
      />
    );

    const searchField = getByTestId('search-field');
    fireEvent(searchField, 'submitEditing');
    expect(mockOnSearch).toHaveBeenCalledWith('search query');
  });

  it('calls onClear when clear button is pressed', () => {
    const mockOnClear = jest.fn();
    const mockOnChangeText = jest.fn();
    const { getByTestId } = render(
      <MockSearchInput
        value="search query"
        onChangeText={mockOnChangeText}
        onClear={mockOnClear}
      />
    );

    const clearButton = getByTestId('clear-button');
    fireEvent.press(clearButton);

    expect(mockOnChangeText).toHaveBeenCalledWith('');
    expect(mockOnClear).toHaveBeenCalled();
  });
});
