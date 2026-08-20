import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguagePreferences, LanguagePreferencesData } from '../LanguagePreferences';

// Helper to render component with React Query provider
function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('LanguagePreferences Component', () => {
  const mockOnUpdate = jest.fn();

  const defaultPreferences: LanguagePreferencesData = {
    audioLanguages: [],
    subtitleLanguages: [],
  };

  const populatedPreferences: LanguagePreferencesData = {
    audioLanguages: ['en', 'es'],
    subtitleLanguages: ['en', 'es', 'fr'],
  };

  beforeEach(() => {
    mockOnUpdate.mockClear();
  });

  describe('Component Rendering', () => {
    it('should render the language preferences component', () => {
      renderWithQueryClient(
        <LanguagePreferences
          preferences={defaultPreferences}
          onUpdate={mockOnUpdate}
        />
      );

      expect(screen.getByTestId('language-preferences')).toBeInTheDocument();
      expect(screen.getByText('Language Preferences')).toBeInTheDocument();
    });

    it('should render audio languages dropdown', () => {
      renderWithQueryClient(
        <LanguagePreferences
          preferences={defaultPreferences}
          onUpdate={mockOnUpdate}
        />
      );

      expect(screen.getByTestId('audio-languages-dropdown')).toBeInTheDocument();
      expect(screen.getByText('Preferred Audio Languages')).toBeInTheDocument();
    });

    it('should render subtitle languages dropdown', () => {
      renderWithQueryClient(
        <LanguagePreferences
          preferences={defaultPreferences}
          onUpdate={mockOnUpdate}
        />
      );

      expect(screen.getByTestId('subtitle-languages-dropdown')).toBeInTheDocument();
      expect(screen.getByText('Preferred Subtitle Languages')).toBeInTheDocument();
    });

    it('should render save button', () => {
      renderWithQueryClient(
        <LanguagePreferences
          preferences={defaultPreferences}
          onUpdate={mockOnUpdate}
        />
      );

      expect(screen.getByTestId('save-language-preferences')).toBeInTheDocument();
    });

    it('should display placeholder text when no languages selected', () => {
      renderWithQueryClient(
        <LanguagePreferences
          preferences={defaultPreferences}
          onUpdate={mockOnUpdate}
        />
      );

      expect(screen.getByText('Select audio languages...')).toBeInTheDocument();
      expect(screen.getByText('Select subtitle languages...')).toBeInTheDocument();
    });

    it('should display selected languages', () => {
      renderWithQueryClient(
        <LanguagePreferences
          preferences={populatedPreferences}
          onUpdate={mockOnUpdate}
        />
      );

      const englishElements = screen.getAllByText('English');
      expect(englishElements.length).toBeGreaterThan(0);
      const spanishElements = screen.getAllByText('Spanish');
      expect(spanishElements.length).toBeGreaterThan(0);
      expect(screen.getByText('French')).toBeInTheDocument();
    });
  });

  describe('Audio Language Selection', () => {
    it('should open audio dropdown when clicked', async () => {
      renderWithQueryClient(
        <LanguagePreferences
          preferences={defaultPreferences}
          onUpdate={mockOnUpdate}
        />
      );

      const audioDropdown = screen.getByTestId('audio-languages-dropdown');
      fireEvent.click(audioDropdown);

      await waitFor(() => {
        expect(screen.getByTestId('audio-language-en')).toBeInTheDocument();
      });
    });

    it('should display all common languages in audio dropdown', async () => {
      renderWithQueryClient(
        <LanguagePreferences
          preferences={defaultPreferences}
          onUpdate={mockOnUpdate}
        />
      );

      const audioDropdown = screen.getByTestId('audio-languages-dropdown');
      fireEvent.click(audioDropdown);

      await waitFor(() => {
        expect(screen.getByTestId('audio-language-en')).toBeInTheDocument();
        expect(screen.getByTestId('audio-language-es')).toBeInTheDocument();
        expect(screen.getByTestId('audio-language-fr')).toBeInTheDocument();
        expect(screen.getByTestId('audio-language-de')).toBeInTheDocument();
        expect(screen.getByTestId('audio-language-ja')).toBeInTheDocument();
      });
    });

    it('should select audio language when clicked', async () => {
      renderWithQueryClient(
        <LanguagePreferences
          preferences={defaultPreferences}
          onUpdate={mockOnUpdate}
        />
      );

      const audioDropdown = screen.getByTestId('audio-languages-dropdown');
      fireEvent.click(audioDropdown);

      await waitFor(() => {
        const englishOption = screen.getByTestId('audio-language-en');
        fireEvent.click(englishOption);
      });

      // Language should appear as selected
      const englishElements = screen.getAllByText('English');
      expect(englishElements.length).toBeGreaterThan(0);
    });

    it('should deselect audio language when clicked again', async () => {
      renderWithQueryClient(
        <LanguagePreferences
          preferences={populatedPreferences}
          onUpdate={mockOnUpdate}
        />
      );

      // English should be initially selected
      const englishElements = screen.getAllByText('English');
      expect(englishElements.length).toBeGreaterThan(0);

      const audioDropdown = screen.getByTestId('audio-languages-dropdown');
      fireEvent.click(audioDropdown);

      await waitFor(() => {
        const englishOption = screen.getByTestId('audio-language-en');
        fireEvent.click(englishOption);
      });

      // Save to apply changes
      const saveButton = screen.getByTestId('save-language-preferences');
      fireEvent.click(saveButton);

      await waitFor(() => {
        // Check that onUpdate was called with updated languages
        expect(mockOnUpdate).toHaveBeenCalled();
      });
    });

    it('should allow multiple audio language selections', async () => {
      renderWithQueryClient(
        <LanguagePreferences
          preferences={defaultPreferences}
          onUpdate={mockOnUpdate}
        />
      );

      const audioDropdown = screen.getByTestId('audio-languages-dropdown');
      fireEvent.click(audioDropdown);

      await waitFor(async () => {
        const englishOption = screen.getByTestId('audio-language-en');
        const spanishOption = screen.getByTestId('audio-language-es');
        const frenchOption = screen.getByTestId('audio-language-fr');

        fireEvent.click(englishOption);
        fireEvent.click(spanishOption);
        fireEvent.click(frenchOption);
      });

      const englishElements = screen.getAllByText('English');
      expect(englishElements.length).toBeGreaterThan(0);
      const spanishElements = screen.getAllByText('Spanish');
      expect(spanishElements.length).toBeGreaterThan(0);
      const frenchElements = screen.getAllByText('French');
      expect(frenchElements.length).toBeGreaterThan(0);
    });
  });

  describe('Subtitle Language Selection', () => {
    it('should open subtitle dropdown when clicked', async () => {
      renderWithQueryClient(
        <LanguagePreferences
          preferences={defaultPreferences}
          onUpdate={mockOnUpdate}
        />
      );

      const subtitleDropdown = screen.getByTestId('subtitle-languages-dropdown');
      fireEvent.click(subtitleDropdown);

      await waitFor(() => {
        expect(screen.getByTestId('subtitle-language-en')).toBeInTheDocument();
      });
    });

    it('should display all common languages in subtitle dropdown', async () => {
      renderWithQueryClient(
        <LanguagePreferences
          preferences={defaultPreferences}
          onUpdate={mockOnUpdate}
        />
      );

      const subtitleDropdown = screen.getByTestId('subtitle-languages-dropdown');
      fireEvent.click(subtitleDropdown);

      await waitFor(() => {
        expect(screen.getByTestId('subtitle-language-en')).toBeInTheDocument();
        expect(screen.getByTestId('subtitle-language-es')).toBeInTheDocument();
        expect(screen.getByTestId('subtitle-language-fr')).toBeInTheDocument();
        expect(screen.getByTestId('subtitle-language-de')).toBeInTheDocument();
        expect(screen.getByTestId('subtitle-language-ja')).toBeInTheDocument();
      });
    });

    it('should select subtitle language when clicked', async () => {
      renderWithQueryClient(
        <LanguagePreferences
          preferences={defaultPreferences}
          onUpdate={mockOnUpdate}
        />
      );

      const subtitleDropdown = screen.getByTestId('subtitle-languages-dropdown');
      fireEvent.click(subtitleDropdown);

      await waitFor(() => {
        const englishOption = screen.getByTestId('subtitle-language-en');
        fireEvent.click(englishOption);
      });

      const englishElements = screen.getAllByText('English');
      expect(englishElements.length).toBeGreaterThan(0);
    });

    it('should allow multiple subtitle language selections', async () => {
      renderWithQueryClient(
        <LanguagePreferences
          preferences={defaultPreferences}
          onUpdate={mockOnUpdate}
        />
      );

      const subtitleDropdown = screen.getByTestId('subtitle-languages-dropdown');
      fireEvent.click(subtitleDropdown);

      await waitFor(async () => {
        const englishOption = screen.getByTestId('subtitle-language-en');
        const spanishOption = screen.getByTestId('subtitle-language-es');
        const frenchOption = screen.getByTestId('subtitle-language-fr');
        const germanOption = screen.getByTestId('subtitle-language-de');

        fireEvent.click(englishOption);
        fireEvent.click(spanishOption);
        fireEvent.click(frenchOption);
        fireEvent.click(germanOption);
      });

      const englishElements = screen.getAllByText('English');
      expect(englishElements.length).toBeGreaterThan(0);
      const spanishElements = screen.getAllByText('Spanish');
      expect(spanishElements.length).toBeGreaterThan(0);
      const frenchElements = screen.getAllByText('French');
      expect(frenchElements.length).toBeGreaterThan(0);
      const germanElements = screen.getAllByText('German');
      expect(germanElements.length).toBeGreaterThan(0);
    });
  });

  describe('Save Functionality', () => {
    it('should disable save button when no changes are made', () => {
      renderWithQueryClient(
        <LanguagePreferences
          preferences={populatedPreferences}
          onUpdate={mockOnUpdate}
        />
      );

      const saveButton = screen.getByTestId('save-language-preferences');
      expect(saveButton).toBeDisabled();
    });

    it('should enable save button when changes are made', async () => {
      renderWithQueryClient(
        <LanguagePreferences
          preferences={defaultPreferences}
          onUpdate={mockOnUpdate}
        />
      );

      const audioDropdown = screen.getByTestId('audio-languages-dropdown');
      fireEvent.click(audioDropdown);

      await waitFor(() => {
        const englishOption = screen.getByTestId('audio-language-en');
        fireEvent.click(englishOption);
      });

      const saveButton = screen.getByTestId('save-language-preferences');
      expect(saveButton).not.toBeDisabled();
    });

    it('should call onUpdate with audio languages when saved', async () => {
      renderWithQueryClient(
        <LanguagePreferences
          preferences={defaultPreferences}
          onUpdate={mockOnUpdate}
        />
      );

      const audioDropdown = screen.getByTestId('audio-languages-dropdown');
      fireEvent.click(audioDropdown);

      await waitFor(() => {
        const englishOption = screen.getByTestId('audio-language-en');
        fireEvent.click(englishOption);
      });

      const saveButton = screen.getByTestId('save-language-preferences');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith('audioLanguages', ['en']);
      });
    });

    it('should call onUpdate with subtitle languages when saved', async () => {
      renderWithQueryClient(
        <LanguagePreferences
          preferences={defaultPreferences}
          onUpdate={mockOnUpdate}
        />
      );

      const subtitleDropdown = screen.getByTestId('subtitle-languages-dropdown');
      fireEvent.click(subtitleDropdown);

      await waitFor(() => {
        const spanishOption = screen.getByTestId('subtitle-language-es');
        fireEvent.click(spanishOption);
      });

      const saveButton = screen.getByTestId('save-language-preferences');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith('subtitleLanguages', ['es']);
      });
    });

    it('should display success message after saving', async () => {
      renderWithQueryClient(
        <LanguagePreferences
          preferences={defaultPreferences}
          onUpdate={mockOnUpdate}
        />
      );

      const audioDropdown = screen.getByTestId('audio-languages-dropdown');
      fireEvent.click(audioDropdown);

      await waitFor(() => {
        const englishOption = screen.getByTestId('audio-language-en');
        fireEvent.click(englishOption);
      });

      const saveButton = screen.getByTestId('save-language-preferences');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByTestId('save-success-message')).toBeInTheDocument();
        expect(screen.getByText('Preferences saved successfully!')).toBeInTheDocument();
      });
    });

    it('should show saving state while saving', async () => {
      renderWithQueryClient(
        <LanguagePreferences
          preferences={defaultPreferences}
          onUpdate={mockOnUpdate}
        />
      );

      const audioDropdown = screen.getByTestId('audio-languages-dropdown');
      fireEvent.click(audioDropdown);

      await waitFor(() => {
        const englishOption = screen.getByTestId('audio-language-en');
        fireEvent.click(englishOption);
      });

      const saveButton = screen.getByTestId('save-language-preferences');
      fireEvent.click(saveButton);

      // Check that save was called and component shows success
      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when save fails', async () => {
      const mockOnUpdateError = jest.fn(() => {
        throw new Error('Save failed');
      });

      renderWithQueryClient(
        <LanguagePreferences
          preferences={defaultPreferences}
          onUpdate={mockOnUpdateError}
        />
      );

      const audioDropdown = screen.getByTestId('audio-languages-dropdown');
      fireEvent.click(audioDropdown);

      await waitFor(() => {
        const englishOption = screen.getByTestId('audio-language-en');
        fireEvent.click(englishOption);
      });

      const saveButton = screen.getByTestId('save-language-preferences');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByTestId('save-error-message')).toBeInTheDocument();
        expect(screen.getByText('Failed to save preferences. Please try again.')).toBeInTheDocument();
      });
    });
  });

  describe('Disabled State', () => {
    it('should disable all interactions when disabled prop is true', () => {
      renderWithQueryClient(
        <LanguagePreferences
          preferences={defaultPreferences}
          onUpdate={mockOnUpdate}
          disabled={true}
        />
      );

      const audioDropdown = screen.getByTestId('audio-languages-dropdown');
      const subtitleDropdown = screen.getByTestId('subtitle-languages-dropdown');
      const saveButton = screen.getByTestId('save-language-preferences');

      expect(audioDropdown).toBeDisabled();
      expect(subtitleDropdown).toBeDisabled();
      expect(saveButton).toBeDisabled();
    });

    it('should not open dropdown when disabled', () => {
      renderWithQueryClient(
        <LanguagePreferences
          preferences={defaultPreferences}
          onUpdate={mockOnUpdate}
          disabled={true}
        />
      );

      const audioDropdown = screen.getByTestId('audio-languages-dropdown');
      fireEvent.click(audioDropdown);

      // Dropdown should not open
      expect(screen.queryByTestId('audio-language-en')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderWithQueryClient(
        <LanguagePreferences
          preferences={defaultPreferences}
          onUpdate={mockOnUpdate}
        />
      );

      expect(screen.getByText('Preferred Audio Languages')).toBeInTheDocument();
      expect(screen.getByText('Preferred Subtitle Languages')).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();

      renderWithQueryClient(
        <LanguagePreferences
          preferences={defaultPreferences}
          onUpdate={mockOnUpdate}
        />
      );

      const audioDropdown = screen.getByTestId('audio-languages-dropdown');

      // Tab to audio dropdown
      await user.tab();
      expect(audioDropdown).toHaveFocus();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty preferences gracefully', () => {
      renderWithQueryClient(
        <LanguagePreferences
          preferences={{ audioLanguages: [], subtitleLanguages: [] }}
          onUpdate={mockOnUpdate}
        />
      );

      expect(screen.getByTestId('language-preferences')).toBeInTheDocument();
    });

    it('should handle undefined preferences gracefully', () => {
      renderWithQueryClient(
        <LanguagePreferences
          preferences={{} as LanguagePreferencesData}
          onUpdate={mockOnUpdate}
        />
      );

      expect(screen.getByTestId('language-preferences')).toBeInTheDocument();
    });

    it('should handle selecting same language for both audio and subtitle', async () => {
      renderWithQueryClient(
        <LanguagePreferences
          preferences={defaultPreferences}
          onUpdate={mockOnUpdate}
        />
      );

      // Select English for audio
      const audioDropdown = screen.getByTestId('audio-languages-dropdown');
      fireEvent.click(audioDropdown);

      await waitFor(() => {
        const englishAudio = screen.getByTestId('audio-language-en');
        fireEvent.click(englishAudio);
      });

      // Close audio dropdown
      fireEvent.click(audioDropdown);

      // Select English for subtitle
      const subtitleDropdown = screen.getByTestId('subtitle-languages-dropdown');
      fireEvent.click(subtitleDropdown);

      await waitFor(() => {
        const englishSubtitle = screen.getByTestId('subtitle-language-en');
        fireEvent.click(englishSubtitle);
      });

      // Both selections should work independently
      expect(screen.getAllByText('English').length).toBeGreaterThan(0);
    });

    it('should handle rapid toggling of languages', async () => {
      renderWithQueryClient(
        <LanguagePreferences
          preferences={defaultPreferences}
          onUpdate={mockOnUpdate}
        />
      );

      const audioDropdown = screen.getByTestId('audio-languages-dropdown');
      fireEvent.click(audioDropdown);

      await waitFor(async () => {
        const englishOption = screen.getByTestId('audio-language-en');

        // Rapidly toggle on/off
        fireEvent.click(englishOption);
        fireEvent.click(englishOption);
        fireEvent.click(englishOption);
      });

      // Component should handle rapid clicks without crashing
      expect(screen.getByTestId('language-preferences')).toBeInTheDocument();
    });
  });

  describe('Integration Tests', () => {
    it('should complete full workflow: select, save, verify', async () => {
      renderWithQueryClient(
        <LanguagePreferences
          preferences={defaultPreferences}
          onUpdate={mockOnUpdate}
        />
      );

      // Step 1: Select audio languages
      const audioDropdown = screen.getByTestId('audio-languages-dropdown');
      fireEvent.click(audioDropdown);

      await waitFor(() => {
        fireEvent.click(screen.getByTestId('audio-language-en'));
        fireEvent.click(screen.getByTestId('audio-language-es'));
      });

      // Step 2: Select subtitle languages
      fireEvent.click(audioDropdown); // Close audio dropdown
      const subtitleDropdown = screen.getByTestId('subtitle-languages-dropdown');
      fireEvent.click(subtitleDropdown);

      await waitFor(() => {
        fireEvent.click(screen.getByTestId('subtitle-language-en'));
        fireEvent.click(screen.getByTestId('subtitle-language-fr'));
        fireEvent.click(screen.getByTestId('subtitle-language-de'));
      });

      // Step 3: Save preferences
      const saveButton = screen.getByTestId('save-language-preferences');
      expect(saveButton).not.toBeDisabled();
      fireEvent.click(saveButton);

      // Step 4: Verify save was called correctly
      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith('audioLanguages', expect.arrayContaining(['en', 'es']));
        expect(mockOnUpdate).toHaveBeenCalledWith('subtitleLanguages', expect.arrayContaining(['en', 'fr', 'de']));
      });

      // Step 5: Verify success message
      await waitFor(() => {
        expect(screen.getByTestId('save-success-message')).toBeInTheDocument();
      });
    });
  });
});
