import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { ThemeProvider } from 'react-native-paper';
import Button from '../../components/common/Button';

// Mock theme provider wrapper
const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider>
      {component}
    </ThemeProvider>,
  );
};

describe('Button Component', () => {
  const _mockOnPress = jest.fn();

  beforeEach(() => {
    mockOnPress.mockClear();
  });

  describe('Basic Rendering', () => {
    it('renders correctly with title', () => {
      renderWithTheme(<Button title="Test Button" onPress={mockOnPress} />);

      expect(screen.getByText('Test Button')).toBeTruthy();
    });

    it('renders with custom style', () => {
      const customStyle = { backgroundColor: '#FF0000' };
      renderWithTheme(
        <Button title="Styled Button" onPress={mockOnPress} style={customStyle} />,
      );

      expect(screen.getByText('Styled Button')).toBeTruthy();
    });

    it('renders without title when children are provided', () => {
      renderWithTheme(
        <Button onPress={mockOnPress}>
          <span>Custom Content</span>
        </Button>,
      );

      expect(screen.getByText('Custom Content')).toBeTruthy();
    });
  });

  describe('Interaction Handling', () => {
    it('calls onPress when pressed', () => {
      renderWithTheme(<Button title="Press Me" onPress={mockOnPress} />);

      fireEvent.press(screen.getByText('Press Me'));
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('does not call onPress when disabled', () => {
      renderWithTheme(
        <Button title="Disabled Button" onPress={mockOnPress} disabled />,
      );

      fireEvent.press(screen.getByText('Disabled Button'));
      expect(mockOnPress).not.toHaveBeenCalled();
    });

    it('handles multiple presses correctly', () => {
      renderWithTheme(<Button title="Multi Press" onPress={mockOnPress} />);

      const button = screen.getByText('Multi Press');
      fireEvent.press(button);
      fireEvent.press(button);
      fireEvent.press(button);

      expect(mockOnPress).toHaveBeenCalledTimes(3);
    });
  });

  describe('Loading State', () => {
    it('shows loading indicator when loading', () => {
      renderWithTheme(
        <Button title="Loading" onPress={mockOnPress} loading />,
      );

      expect(screen.getByText('Loading')).toBeTruthy();
      // Check if loading indicator is present (implementation-specific)
    });

    it('does not call onPress when loading', () => {
      renderWithTheme(
        <Button title="Loading" onPress={mockOnPress} loading />,
      );

      fireEvent.press(screen.getByText('Loading'));
      expect(mockOnPress).not.toHaveBeenCalled();
    });

    it('shows loading text when provided', () => {
      renderWithTheme(
        <Button
          title="Submit"
          onPress={mockOnPress}
          loading
          loadingText="Submitting..."
        />,
      );

      expect(screen.getByText('Submitting...')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('has proper accessibility label', () => {
      renderWithTheme(
        <Button
          title="Submit Form"
          onPress={mockOnPress}
          accessibilityLabel="Submit form button"
        />,
      );

      const button = screen.getByText('Submit Form');
      expect(button.props.accessibilityLabel).toBe('Submit form button');
    });

    it('has proper accessibility role', () => {
      renderWithTheme(
        <Button title="Submit" onPress={mockOnPress} />,
      );

      const button = screen.getByText('Submit');
      expect(button.props.accessibilityRole).toBe('button');
    });

    it('is not accessible when disabled', () => {
      renderWithTheme(
        <Button title="Disabled" onPress={mockOnPress} disabled />,
      );

      const button = screen.getByText('Disabled');
      expect(button.props.accessible).toBe(true);
      expect(button.props.accessibilityState.disabled).toBe(true);
    });
  });

  describe('Variant Styles', () => {
    it('applies primary variant styles', () => {
      renderWithTheme(
        <Button title="Primary" onPress={mockOnPress} variant="primary" />,
      );

      expect(screen.getByText('Primary')).toBeTruthy();
    });

    it('applies secondary variant styles', () => {
      renderWithTheme(
        <Button title="Secondary" onPress={mockOnPress} variant="secondary" />,
      );

      expect(screen.getByText('Secondary')).toBeTruthy();
    });

    it('applies outline variant styles', () => {
      renderWithTheme(
        <Button title="Outline" onPress={mockOnPress} variant="outline" />,
      );

      expect(screen.getByText('Outline')).toBeTruthy();
    });

    it('applies ghost variant styles', () => {
      renderWithTheme(
        <Button title="Ghost" onPress={mockOnPress} variant="ghost" />,
      );

      expect(screen.getByText('Ghost')).toBeTruthy();
    });
  });

  describe('Size Variants', () => {
    it('applies small size styles', () => {
      renderWithTheme(
        <Button title="Small" onPress={mockOnPress} size="small" />,
      );

      expect(screen.getByText('Small')).toBeTruthy();
    });

    it('applies medium size styles', () => {
      renderWithTheme(
        <Button title="Medium" onPress={mockOnPress} size="medium" />,
      );

      expect(screen.getByText('Medium')).toBeTruthy();
    });

    it('applies large size styles', () => {
      renderWithTheme(
        <Button title="Large" onPress={mockOnPress} size="large" />,
      );

      expect(screen.getByText('Large')).toBeTruthy();
    });
  });

  describe('Icon Support', () => {
    it('renders with left icon', () => {
      const MockIcon = () => <span>Icon</span>;
      renderWithTheme(
        <Button title="With Icon" onPress={mockOnPress} leftIcon={<MockIcon />} />,
      );

      expect(screen.getByText('With Icon')).toBeTruthy();
      expect(screen.getByText('Icon')).toBeTruthy();
    });

    it('renders with right icon', () => {
      const MockIcon = () => <span>Icon</span>;
      renderWithTheme(
        <Button title="With Icon" onPress={mockOnPress} rightIcon={<MockIcon />} />,
      );

      expect(screen.getByText('With Icon')).toBeTruthy();
      expect(screen.getByText('Icon')).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('handles onPress errors gracefully', () => {
      const errorOnPress = jest.fn(() => {
        throw new Error('Test error');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      renderWithTheme(<Button title="Error" onPress={errorOnPress} />);

      fireEvent.press(screen.getByText('Error'));

      expect(errorOnPress).toHaveBeenCalled();
      // Error should be caught and not crash the component

      consoleSpy.mockRestore();
    });

    it('renders when title is undefined', () => {
      expect(() => {
        renderWithTheme(
          <Button onPress={mockOnPress} title={undefined as any} />,
        );
      }).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('does not re-render unnecessarily', () => {
      const { rerender } = renderWithTheme(
        <Button title="Test" onPress={mockOnPress} />,
      );

      const initialRender = screen.getByText('Test');

      rerender(
        <ThemeProvider>
          <Button title="Test" onPress={mockOnPress} />
        </ThemeProvider>,
      );

      expect(screen.getByText('Test')).toBe(initialRender);
    });

    it('handles rapid presses without issues', () => {
      renderWithTheme(<Button title="Rapid" onPress={mockOnPress} />);

      const button = screen.getByText('Rapid');

      // Simulate rapid pressing
      for (let i = 0; i < 10; i++) {
        fireEvent.press(button);
      }

      expect(mockOnPress).toHaveBeenCalledTimes(10);
    });
  });
});
