import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LanguageMatchIndicator } from '../LanguageMatchIndicator';

describe('LanguageMatchIndicator', () => {
  // Test Category 1: Rendering for each match quality (4 tests)

  describe('Match Quality Rendering', () => {
    it('should render "Perfect Match" with success styling for Perfect quality', () => {
      render(
        <LanguageMatchIndicator
          matchQuality="Perfect"
          audioLanguages={['en']}
          subtitleLanguages={['en']}
        />
      );

      const button = screen.getByTestId('language-match-indicator');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Perfect Match');

      // Should have success/green styling classes
      expect(button.className).toContain('text-success');
      expect(button.className).toContain('bg-success/10');
      expect(button.className).toContain('border-success/30');

      // Should have proper aria label
      expect(button).toHaveAttribute(
        'aria-label',
        'Perfect Match: All your preferred languages are available'
      );
    });

    it('should render "Good Match" with success styling for Good quality', () => {
      render(
        <LanguageMatchIndicator
          matchQuality="Good"
          audioLanguages={['en', 'es']}
          subtitleLanguages={['en']}
        />
      );

      const button = screen.getByTestId('language-match-indicator');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Good Match');

      // Should have success styling (lighter than Perfect)
      expect(button.className).toContain('text-success');
      expect(button.className).toContain('bg-success/5');

      // Should have proper aria label
      expect(button).toHaveAttribute(
        'aria-label',
        'Good Match: Most of your preferred languages are available'
      );
    });

    it('should render "Partial Match" with warning styling for Partial quality', () => {
      render(
        <LanguageMatchIndicator
          matchQuality="Partial"
          audioLanguages={['es']}
          subtitleLanguages={['en']}
        />
      );

      const button = screen.getByTestId('language-match-indicator');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Partial Match');

      // Should have warning/yellow styling classes
      expect(button.className).toContain('text-warning');
      expect(button.className).toContain('bg-warning/10');
      expect(button.className).toContain('border-warning/30');

      // Should have proper aria label
      expect(button).toHaveAttribute(
        'aria-label',
        'Partial Match: Some of your preferred languages are available'
      );
    });

    it('should render "No Match" with destructive styling for None quality', () => {
      render(
        <LanguageMatchIndicator
          matchQuality="None"
          audioLanguages={['ja']}
          subtitleLanguages={['ko']}
        />
      );

      const button = screen.getByTestId('language-match-indicator');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('No Match');

      // Should have destructive/red styling classes
      expect(button.className).toContain('text-destructive');
      expect(button.className).toContain('bg-destructive/10');
      expect(button.className).toContain('border-destructive/30');

      // Should have proper aria label
      expect(button).toHaveAttribute(
        'aria-label',
        'No Match: Your preferred languages are not available'
      );
    });
  });

  // Test Category 2: Tooltip interactions (3 tests)

  describe('Tooltip Interactions', () => {
    it('should show tooltip with language details on hover', async () => {
      render(
        <LanguageMatchIndicator
          matchQuality="Perfect"
          audioLanguages={['en', 'es']}
          subtitleLanguages={['en', 'fr']}
        />
      );

      const button = screen.getByTestId('language-match-indicator');

      // Tooltip should not be visible initially
      expect(screen.queryByTestId('language-match-tooltip')).not.toBeInTheDocument();

      // Hover over the button
      fireEvent.mouseEnter(button);

      // Wait for tooltip to appear
      await waitFor(() => {
        expect(screen.getByTestId('language-match-tooltip')).toBeInTheDocument();
      });

      // Check tooltip has proper role
      const tooltip = screen.getByTestId('language-match-tooltip');
      expect(tooltip).toHaveAttribute('role', 'tooltip');

      // Check that language labels and names are displayed
      expect(screen.getByText('Audio Languages:')).toBeInTheDocument();
      expect(screen.getByText('Subtitle Languages:')).toBeInTheDocument();

      // Check individual language names (English appears twice - in audio and subtitle)
      const englishElements = screen.getAllByText('English');
      expect(englishElements.length).toBeGreaterThanOrEqual(2); // Audio and Subtitle

      expect(screen.getByText('Spanish')).toBeInTheDocument();
      expect(screen.getByText('French')).toBeInTheDocument();
    });

    it('should hide tooltip on mouse leave', async () => {
      render(
        <LanguageMatchIndicator
          matchQuality="Good"
          audioLanguages={['en']}
          subtitleLanguages={['en']}
        />
      );

      const button = screen.getByTestId('language-match-indicator');

      // Show tooltip
      fireEvent.mouseEnter(button);
      await waitFor(() => {
        expect(screen.getByTestId('language-match-tooltip')).toBeInTheDocument();
      });

      // Hide tooltip
      fireEvent.mouseLeave(button);
      await waitFor(() => {
        expect(screen.queryByTestId('language-match-tooltip')).not.toBeInTheDocument();
      });
    });

    it('should have proper accessibility attributes', () => {
      render(
        <LanguageMatchIndicator
          matchQuality="Perfect"
          audioLanguages={['en']}
          subtitleLanguages={['en']}
        />
      );

      const button = screen.getByTestId('language-match-indicator');

      // Button should be a button element (keyboard accessible by default)
      expect(button.tagName).toBe('BUTTON');
      expect(button).toHaveAttribute('type', 'button');

      // Should have descriptive aria-label
      expect(button).toHaveAttribute('aria-label');
      expect(button.getAttribute('aria-label')).toContain('Perfect Match');
    });
  });

  // Test Category 3: Edge cases (3 tests)

  describe('Edge Cases', () => {
    it('should not show tooltip when language arrays are empty', () => {
      render(
        <LanguageMatchIndicator
          matchQuality="None"
          audioLanguages={[]}
          subtitleLanguages={[]}
        />
      );

      const button = screen.getByTestId('language-match-indicator');
      expect(button).toHaveTextContent('No Match');

      // Hover over button
      fireEvent.mouseEnter(button);

      // Tooltip should NOT appear when both arrays are empty
      expect(screen.queryByTestId('language-match-tooltip')).not.toBeInTheDocument();
    });

    it('should handle unknown language codes by displaying the code itself', async () => {
      render(
        <LanguageMatchIndicator
          matchQuality="Partial"
          audioLanguages={['xyz', 'abc']}
          subtitleLanguages={['def']}
        />
      );

      const button = screen.getByTestId('language-match-indicator');
      fireEvent.mouseEnter(button);

      await waitFor(() => {
        expect(screen.getByTestId('language-match-tooltip')).toBeInTheDocument();
      });

      // Unknown codes should be displayed as-is (fallback behavior)
      expect(screen.getByText('xyz')).toBeInTheDocument();
      expect(screen.getByText('abc')).toBeInTheDocument();
      expect(screen.getByText('def')).toBeInTheDocument();
    });

    it('should apply custom className when provided', () => {
      const customClass = 'custom-test-class';
      const { container } = render(
        <LanguageMatchIndicator
          matchQuality="Perfect"
          audioLanguages={['en']}
          subtitleLanguages={['en']}
          className={customClass}
        />
      );

      // Custom class should be applied to the root element (the div wrapper)
      const rootElement = container.firstChild as HTMLElement;
      expect(rootElement.className).toContain(customClass);
    });
  });

  // Additional test: Multiple languages formatting
  describe('Language Formatting', () => {
    it('should correctly format multiple languages in tooltip', async () => {
      render(
        <LanguageMatchIndicator
          matchQuality="Good"
          audioLanguages={['en', 'es', 'fr', 'de']}
          subtitleLanguages={['ja', 'ko', 'zh']}
        />
      );

      const button = screen.getByTestId('language-match-indicator');
      fireEvent.mouseEnter(button);

      await waitFor(() => {
        expect(screen.getByTestId('language-match-tooltip')).toBeInTheDocument();
      });

      // All audio language names should be present
      expect(screen.getByText('English')).toBeInTheDocument();
      expect(screen.getByText('Spanish')).toBeInTheDocument();
      expect(screen.getByText('French')).toBeInTheDocument();
      expect(screen.getByText('German')).toBeInTheDocument();

      // All subtitle language names should be present
      expect(screen.getByText('Japanese')).toBeInTheDocument();
      expect(screen.getByText('Korean')).toBeInTheDocument();
      expect(screen.getByText('Chinese')).toBeInTheDocument();
    });
  });
});
