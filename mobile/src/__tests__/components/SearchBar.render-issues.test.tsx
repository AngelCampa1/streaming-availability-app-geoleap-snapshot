import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import SearchBar from '../../components/SearchBar';
import type { SearchBarProps } from '../../components/SearchBar';

// Mock useTheme from ThemeProvider
jest.mock('../../theme/ThemeProvider', () => {
  const theme = {
    spacing: Array.from({ length: 50 }, (_, i) => i * 4),
    colors: {
      primary: { 100: '#ede9fe', 500: '#7c3aed', 600: '#6d28d9' },
      secondary: { 500: '#f59e0b' },
      error: { 100: '#fee2e2', 500: '#ef4444', 600: '#dc2626' },
      success: { 500: '#10b981', 600: '#059669' },
      warning: { 500: '#f59e0b', 600: '#d97706' },
      neutral: { 100: '#f5f5f5', 200: '#e5e5e5', 300: '#d4d4d4', 500: '#737373', 700: '#404040', 900: '#171717' },
    },
    semantic: {
      text: { primary: '#000000', secondary: '#666666', tertiary: '#999999', inverse: '#ffffff' },
      background: { primary: '#ffffff', secondary: '#f5f5f5' },
      border: { primary: '#e5e5e5' },
    },
    typography: {
      fontSize: { xs: 11, sm: 12, base: 14, md: 14, lg: 16, xl: 18 },
      fontWeight: { normal: '400', medium: '500', semibold: '600', bold: '700' },
      lineHeight: { tight: 1.2, normal: 1.5 },
    },
    borderRadius: { sm: 4, md: 8, lg: 12, xl: 16, full: 9999 },
    shadows: {
      sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
    },
  };
  return {
    useTheme: () => ({ theme }),
    ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

console.log('SearchBar in test file:', SearchBar);

describe('SearchBar Component', () => {
  const defaultProps: SearchBarProps = {
    placeholder: 'Search...',
    onChangeText: jest.fn(),
    onSubmit: jest.fn(),
    onVoiceSearch: jest.fn(),
    onBarcodeSearch: jest.fn(),
    testID: 'search-bar-test',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should import SearchBar correctly', () => {
      expect(SearchBar).toBeDefined();
      expect(typeof SearchBar).toBe('function');
    });

    it('should create SearchBar component with React.createElement', () => {
      expect(() => {
        React.createElement(SearchBar, { testID: 'test' });
      }).not.toThrow();
    });

    // Re-enabled render tests - React Native Testing Library issues have been resolved
    it('should render successfully with default props', () => {
      const { getByTestId } = render(React.createElement(SearchBar));
      expect(getByTestId('search-bar')).toBeTruthy();
    });

    it('should render with custom testID', () => {
      const { getByTestId } = render(<SearchBar testID="custom-search" />);
      expect(getByTestId('custom-search')).toBeTruthy();
    });

    it('should render input field with correct placeholder', () => {
      const { getByPlaceholderText } = render(
        <SearchBar placeholder="Search servers..." />,
      );
      expect(getByPlaceholderText('Search servers...')).toBeTruthy();
    });

    it('should render voice and barcode buttons by default', () => {
      const { getByTestId } = render(<SearchBar {...defaultProps} />);
      expect(getByTestId('search-bar-test-voice-button')).toBeTruthy();
      expect(getByTestId('search-bar-test-barcode-button')).toBeTruthy();
    });

    it('should hide voice button when showVoiceButton is false', () => {
      const { queryByTestId } = render(
        <SearchBar {...defaultProps} showVoiceButton={false} />,
      );
      expect(queryByTestId('search-bar-test-voice-button')).toBeNull();
    });

    it('should hide barcode button when showBarcodeButton is false', () => {
      const { queryByTestId } = render(
        <SearchBar {...defaultProps} showBarcodeButton={false} />,
      );
      expect(queryByTestId('search-bar-test-barcode-button')).toBeNull();
    });
  });

  describe('Text Input Functionality', () => {
    it('should call onChangeText when text is entered', () => {
      const onChangeText = jest.fn();
      const { getByTestId } = render(
        <SearchBar {...defaultProps} onChangeText={onChangeText} />,
      );

      const input = getByTestId('search-bar-test-input');
      fireEvent.changeText(input, 'test query');

      expect(onChangeText).toHaveBeenCalledWith('test query');
    });

    it('should call onSubmit when return key is pressed', () => {
      const onSubmit = jest.fn();
      const { getByTestId } = render(
        <SearchBar {...defaultProps} onSubmit={onSubmit} />,
      );

      const input = getByTestId('search-bar-test-input');
      fireEvent.changeText(input, 'test query');
      fireEvent(input, 'submitEditing');

      expect(onSubmit).toHaveBeenCalledWith('test query');
    });

    it('should display controlled value', () => {
      const { getByDisplayValue } = render(
        <SearchBar value="controlled value" />,
      );
      expect(getByDisplayValue('controlled value')).toBeTruthy();
    });

    it('should update internal state when value is not controlled', () => {
      const { getByTestId } = render(<SearchBar {...defaultProps} />);

      const input = getByTestId('search-bar-test-input');
      fireEvent.changeText(input, 'internal state');

      expect(input.props.value).toBe('internal state');
    });
  });

  describe('Button Interactions', () => {
    it('should call onVoiceSearch when voice button is pressed', () => {
      const onVoiceSearch = jest.fn();
      const { getByTestId } = render(
        <SearchBar {...defaultProps} onVoiceSearch={onVoiceSearch} />,
      );

      const voiceButton = getByTestId('search-bar-test-voice-button');
      fireEvent.press(voiceButton);

      expect(onVoiceSearch).toHaveBeenCalledTimes(1);
    });

    it('should call onBarcodeSearch when barcode button is pressed', () => {
      const onBarcodeSearch = jest.fn();
      const { getByTestId } = render(
        <SearchBar {...defaultProps} onBarcodeSearch={onBarcodeSearch} />,
      );

      const barcodeButton = getByTestId('search-bar-test-barcode-button');
      fireEvent.press(barcodeButton);

      expect(onBarcodeSearch).toHaveBeenCalledTimes(1);
    });

    it('should not call handlers when buttons are disabled', () => {
      const onVoiceSearch = jest.fn();
      const onBarcodeSearch = jest.fn();
      const { getByTestId } = render(
        <SearchBar
          {...defaultProps}
          disabled={true}
          onVoiceSearch={onVoiceSearch}
          onBarcodeSearch={onBarcodeSearch}
        />,
      );

      const voiceButton = getByTestId('search-bar-test-voice-button');
      const barcodeButton = getByTestId('search-bar-test-barcode-button');

      fireEvent.press(voiceButton);
      fireEvent.press(barcodeButton);

      expect(onVoiceSearch).not.toHaveBeenCalled();
      expect(onBarcodeSearch).not.toHaveBeenCalled();
    });
  });

  describe('Disabled State', () => {
    it('should disable input when disabled prop is true', () => {
      const { getByTestId } = render(
        <SearchBar {...defaultProps} disabled={true} />,
      );

      const input = getByTestId('search-bar-test-input');
      expect(input.props.editable).toBe(false);
    });

    it('should apply disabled styles when disabled', () => {
      const { getByTestId } = render(
        <SearchBar {...defaultProps} disabled={true} />,
      );

      const voiceButton = getByTestId('search-bar-test-voice-button');
      const barcodeButton = getByTestId('search-bar-test-barcode-button');

      expect(voiceButton.props.accessibilityState?.disabled).toBe(true);
      expect(barcodeButton.props.accessibilityState?.disabled).toBe(true);
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility labels', () => {
      const { getByTestId } = render(<SearchBar {...defaultProps} />);

      const input = getByTestId('search-bar-test-input');
      const voiceButton = getByTestId('search-bar-test-voice-button');
      const barcodeButton = getByTestId('search-bar-test-barcode-button');

      expect(input.props.accessibilityLabel).toBe('Search input field');
      expect(voiceButton.props.accessibilityLabel).toBe('Voice search');
      expect(barcodeButton.props.accessibilityLabel).toBe('Barcode search');
    });

    it('should have proper accessibility hints', () => {
      const { getByTestId } = render(<SearchBar {...defaultProps} />);

      const input = getByTestId('search-bar-test-input');
      const voiceButton = getByTestId('search-bar-test-voice-button');
      const barcodeButton = getByTestId('search-bar-test-barcode-button');

      expect(input.props.accessibilityHint).toBe('Enter your search query here');
      expect(voiceButton.props.accessibilityHint).toBe('Tap to start voice search');
      expect(barcodeButton.props.accessibilityHint).toBe('Tap to scan barcode or QR code');
    });

    it('should have proper accessibility roles', () => {
      const { getByTestId } = render(<SearchBar {...defaultProps} />);

      const voiceButton = getByTestId('search-bar-test-voice-button');
      const barcodeButton = getByTestId('search-bar-test-barcode-button');

      expect(voiceButton.props.accessibilityRole).toBe('button');
      expect(barcodeButton.props.accessibilityRole).toBe('button');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing callback props gracefully', () => {
      const { getByTestId } = render(
        <SearchBar testID="search-bar-test" />,
      );

      const input = getByTestId('search-bar-test-input');
      const voiceButton = getByTestId('search-bar-test-voice-button');
      const barcodeButton = getByTestId('search-bar-test-barcode-button');

      // Should not throw errors
      expect(() => {
        fireEvent.changeText(input, 'test');
        fireEvent(input, 'submitEditing');
        fireEvent.press(voiceButton);
        fireEvent.press(barcodeButton);
      }).not.toThrow();
    });

    it('should handle empty string submissions', () => {
      const onSubmit = jest.fn();
      const { getByTestId } = render(
        <SearchBar {...defaultProps} onSubmit={onSubmit} />,
      );

      const input = getByTestId('search-bar-test-input');
      fireEvent.changeText(input, '');
      fireEvent(input, 'submitEditing');

      expect(onSubmit).toHaveBeenCalledWith('');
    });

    it('should handle very long search queries', () => {
      const onChangeText = jest.fn();
      const longQuery = 'a'.repeat(1000);
      const { getByTestId } = render(
        <SearchBar {...defaultProps} onChangeText={onChangeText} />,
      );

      const input = getByTestId('search-bar-test-input');
      fireEvent.changeText(input, longQuery);

      expect(onChangeText).toHaveBeenCalledWith(longQuery);
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily with same props', () => {
      const renderSpy = jest.fn(() => <SearchBar {...defaultProps} />);
      const Component = renderSpy;

      const { rerender } = render(<Component />);
      const initialCallCount = renderSpy.mock.calls.length;

      // Re-render with same props
      rerender(<Component />);

      // Should not increase call count significantly
      expect(renderSpy.mock.calls.length).toBeLessThanOrEqual(initialCallCount + 1);
    });

    it('should handle rapid text changes efficiently', async () => {
      const onChangeText = jest.fn();
      const { getByTestId } = render(
        <SearchBar {...defaultProps} onChangeText={onChangeText} />,
      );

      const input = getByTestId('search-bar-test-input');

      // Simulate rapid typing
      for (let i = 0; i < 10; i++) {
        fireEvent.changeText(input, `query${i}`);
      }

      await waitFor(() => {
        expect(onChangeText).toHaveBeenCalledTimes(10);
      });
    });
  });
});

describe('SearchBar Integration', () => {
  it('should work correctly in a complete search flow', async () => {
    const mockCallbacks = {
      onChangeText: jest.fn(),
      onSubmit: jest.fn(),
      onVoiceSearch: jest.fn(),
      onBarcodeSearch: jest.fn(),
    };

    const { getByTestId } = render(<SearchBar {...mockCallbacks} />);

    const input = getByTestId('search-bar-input');
    const voiceButton = getByTestId('search-bar-voice-button');
    const barcodeButton = getByTestId('search-bar-barcode-button');

    // Simulate complete user interaction
    fireEvent.changeText(input, 'server search');
    expect(mockCallbacks.onChangeText).toHaveBeenCalledWith('server search');

    fireEvent(input, 'submitEditing');
    expect(mockCallbacks.onSubmit).toHaveBeenCalledWith('server search');

    fireEvent.press(voiceButton);
    expect(mockCallbacks.onVoiceSearch).toHaveBeenCalledTimes(1);

    fireEvent.press(barcodeButton);
    expect(mockCallbacks.onBarcodeSearch).toHaveBeenCalledTimes(1);
  });
});

describe('SearchBar Advanced Edge Cases', () => {
  it('should initialize with value prop', () => {
    const { getByTestId } = render(
      <SearchBar testID="controlled-search" value="initial" />,
    );

    const input = getByTestId('controlled-search-input');
    // Component initializes internal state with value prop on mount
    expect(input.props.value).toBe('initial');
  });

  it('should sync with value prop changes (fully controlled mode)', () => {
    const { getByTestId, rerender } = render(
      <SearchBar testID="controlled-search" value="initial" />,
    );

    const input = getByTestId('controlled-search-input');
    expect(input.props.value).toBe('initial');

    // Component now syncs with value prop changes via useEffect
    rerender(<SearchBar testID="controlled-search" value="updated from parent" />);
    expect(input.props.value).toBe('updated from parent');

    // Can be updated again
    rerender(<SearchBar testID="controlled-search" value="another update" />);
    expect(input.props.value).toBe('another update');
  });

  it('should support controlled component pattern', () => {
    const onChangeText = jest.fn();
    const { getByTestId, rerender } = render(
      <SearchBar
        testID="controlled"
        value="parent controlled"
        onChangeText={onChangeText}
      />,
    );

    const input = getByTestId('controlled-input');
    expect(input.props.value).toBe('parent controlled');

    // User types - internal state updates and callback is called
    fireEvent.changeText(input, 'user typed');
    expect(onChangeText).toHaveBeenCalledWith('user typed');
    expect(input.props.value).toBe('user typed');

    // Parent can reset the value (controlled pattern)
    rerender(
      <SearchBar
        testID="controlled"
        value="parent reset value"
        onChangeText={onChangeText}
      />,
    );
    // Value syncs with prop via useEffect
    expect(input.props.value).toBe('parent reset value');

    // Parent can programmatically update the search
    rerender(
      <SearchBar
        testID="controlled"
        value="programmatic update"
        onChangeText={onChangeText}
      />,
    );
    expect(input.props.value).toBe('programmatic update');
  });

  it('should handle special characters in search query', () => {
    const onChangeText = jest.fn();
    const onSubmit = jest.fn();
    const { getByTestId } = render(
      <SearchBar
        testID="special-chars"
        onChangeText={onChangeText}
        onSubmit={onSubmit}
      />,
    );

    const input = getByTestId('special-chars-input');
    const specialQuery = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';

    fireEvent.changeText(input, specialQuery);
    expect(onChangeText).toHaveBeenCalledWith(specialQuery);

    fireEvent(input, 'submitEditing');
    expect(onSubmit).toHaveBeenCalledWith(specialQuery);
  });

  it('should handle Unicode and emoji in search query', () => {
    const onChangeText = jest.fn();
    const { getByTestId } = render(
      <SearchBar testID="unicode" onChangeText={onChangeText} />,
    );

    const input = getByTestId('unicode-input');
    const unicodeQuery = '🎬 Movie Search 日本語 中文 العربية';

    fireEvent.changeText(input, unicodeQuery);
    expect(onChangeText).toHaveBeenCalledWith(unicodeQuery);
  });

  it('should handle multiple rapid submissions', () => {
    const onSubmit = jest.fn();
    const { getByTestId } = render(
      <SearchBar testID="rapid-submit" onSubmit={onSubmit} />,
    );

    const input = getByTestId('rapid-submit-input');
    fireEvent.changeText(input, 'query');

    // Simulate rapid Enter key presses
    for (let i = 0; i < 5; i++) {
      fireEvent(input, 'submitEditing');
    }

    expect(onSubmit).toHaveBeenCalledTimes(5);
    expect(onSubmit).toHaveBeenCalledWith('query');
  });

  it('should maintain search text across multiple edits', () => {
    const { getByTestId } = render(<SearchBar testID="multi-edit" />);
    const input = getByTestId('multi-edit-input');

    fireEvent.changeText(input, 'first');
    expect(input.props.value).toBe('first');

    fireEvent.changeText(input, 'first second');
    expect(input.props.value).toBe('first second');

    fireEvent.changeText(input, 'first second third');
    expect(input.props.value).toBe('first second third');
  });

  it('should handle toggling showVoiceButton dynamically', () => {
    const { getByTestId, queryByTestId, rerender } = render(
      <SearchBar testID="toggle-voice" showVoiceButton={true} />,
    );

    expect(getByTestId('toggle-voice-voice-button')).toBeTruthy();

    rerender(<SearchBar testID="toggle-voice" showVoiceButton={false} />);
    expect(queryByTestId('toggle-voice-voice-button')).toBeNull();

    rerender(<SearchBar testID="toggle-voice" showVoiceButton={true} />);
    expect(getByTestId('toggle-voice-voice-button')).toBeTruthy();
  });

  it('should handle toggling showBarcodeButton dynamically', () => {
    const { getByTestId, queryByTestId, rerender } = render(
      <SearchBar testID="toggle-barcode" showBarcodeButton={true} />,
    );

    expect(getByTestId('toggle-barcode-barcode-button')).toBeTruthy();

    rerender(<SearchBar testID="toggle-barcode" showBarcodeButton={false} />);
    expect(queryByTestId('toggle-barcode-barcode-button')).toBeNull();

    rerender(<SearchBar testID="toggle-barcode" showBarcodeButton={true} />);
    expect(getByTestId('toggle-barcode-barcode-button')).toBeTruthy();
  });

  it('should handle enabling/disabling dynamically', () => {
    const onVoiceSearch = jest.fn();
    const { getByTestId, rerender } = render(
      <SearchBar
        testID="toggle-disabled"
        disabled={false}
        onVoiceSearch={onVoiceSearch}
      />,
    );

    const input = getByTestId('toggle-disabled-input');
    const voiceButton = getByTestId('toggle-disabled-voice-button');

    // Should be enabled
    expect(input.props.editable).toBe(true);
    fireEvent.press(voiceButton);
    expect(onVoiceSearch).toHaveBeenCalledTimes(1);

    // Disable
    rerender(<SearchBar testID="toggle-disabled" disabled={true} onVoiceSearch={onVoiceSearch} />);
    expect(input.props.editable).toBe(false);
    fireEvent.press(voiceButton);
    expect(onVoiceSearch).toHaveBeenCalledTimes(1); // Should not increase

    // Re-enable
    rerender(<SearchBar testID="toggle-disabled" disabled={false} onVoiceSearch={onVoiceSearch} />);
    expect(input.props.editable).toBe(true);
    fireEvent.press(voiceButton);
    expect(onVoiceSearch).toHaveBeenCalledTimes(2);
  });

  it('should handle whitespace-only queries', () => {
    const onChangeText = jest.fn();
    const onSubmit = jest.fn();
    const { getByTestId } = render(
      <SearchBar
        testID="whitespace"
        onChangeText={onChangeText}
        onSubmit={onSubmit}
      />,
    );

    const input = getByTestId('whitespace-input');

    fireEvent.changeText(input, '   ');
    expect(onChangeText).toHaveBeenCalledWith('   ');

    fireEvent(input, 'submitEditing');
    expect(onSubmit).toHaveBeenCalledWith('   ');
  });

  it('should handle newlines in search query', () => {
    const onChangeText = jest.fn();
    const { getByTestId } = render(
      <SearchBar testID="newlines" onChangeText={onChangeText} />,
    );

    const input = getByTestId('newlines-input');
    const queryWithNewlines = 'line1\nline2\nline3';

    fireEvent.changeText(input, queryWithNewlines);
    expect(onChangeText).toHaveBeenCalledWith(queryWithNewlines);
  });

  it('should preserve search text when toggling buttons', () => {
    const { getByTestId, rerender } = render(
      <SearchBar testID="preserve" showVoiceButton={true} />,
    );

    const input = getByTestId('preserve-input');
    fireEvent.changeText(input, 'preserved text');

    rerender(<SearchBar testID="preserve" showVoiceButton={false} />);
    expect(input.props.value).toBe('preserved text');

    rerender(<SearchBar testID="preserve" showBarcodeButton={false} />);
    expect(input.props.value).toBe('preserved text');
  });
});
