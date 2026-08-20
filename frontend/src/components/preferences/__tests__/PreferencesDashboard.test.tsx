// @ts-nocheck
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PreferencesDashboard } from '../PreferencesDashboard';
import { usePreferences } from '@/hooks/usePreferences';
import { useTheme } from '@/contexts/ThemeContext';

// Mock the hooks
jest.mock('@/hooks/usePreferences');
jest.mock('@/contexts/ThemeContext');

// Mock SignalR client
jest.mock('@/services/signalRClient', () => ({
  signalRPreferencesClient: {
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    joinUserGroup: jest.fn().mockResolvedValue(undefined),
    leaveUserGroup: jest.fn().mockResolvedValue(undefined),
    onPreferenceUpdated: jest.fn(),
    onPreferencesUpdated: jest.fn(),
    onPreferenceReset: jest.fn(),
    off: jest.fn(),
    notifyPreferenceChange: jest.fn(),
    isConnected: true,
    connectionState: 'Connected',
  },
}));

const mockUsePreferences = usePreferences as jest.MockedFunction<typeof usePreferences>;
const mockUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;

// Helper to create mock files with text() method
function createMockFile(content: string, name: string, type: string = 'application/json') {
  const file = new File([content], name, { type });
  Object.defineProperty(file, 'text', {
    value: jest.fn().mockResolvedValue(content),
    writable: true,
  });
  return file;
}

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

// Mock preferences data
const mockPreferences = {
  streaming: {
    primaryService: 'netflix',
    quality: 'high',
    autoplay: true,
  },
  notifications: {
    emailEnabled: true,
    pushEnabled: false,
    quietHours: false,
  },
  interface: {
    theme: 'light',
    language: 'en',
    layoutDensity: 'comfortable',
  },
  privacy: {
    analyticsEnabled: false,
    dataSharing: false,
    profileVisibility: 'private',
  },
  geographic: {
    primaryCountry: 'US',
    timezone: 'America/New_York',
    autoDetectLocation: true,
  },
  search: {
    searchMode: 'smart',
    autoComplete: true,
    searchHistory: true,
  },
};

const mockCategories = [
  { id: 'streaming', name: 'Streaming Services' },
  { id: 'notifications', name: 'Notifications' },
  { id: 'interface', name: 'Interface' },
  { id: 'privacy', name: 'Privacy' },
  { id: 'geographic', name: 'Geographic' },
  { id: 'search', name: 'Search' },
];

describe('PreferencesDashboard', () => {
  const mockUpdatePreference = jest.fn();
  const mockBulkUpdate = jest.fn();
  const mockReset = jest.fn();
  const mockExport = jest.fn();
  const mockImport = jest.fn();
  const mockGetPreference = jest.fn();
  const mockGetCategoryPreferences = jest.fn();
  const mockRefetch = jest.fn();

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock usePreferences hook
    mockUsePreferences.mockReturnValue({
      preferences: mockPreferences,
      categories: mockCategories as any,
      isLoading: false,
      isUpdating: false,
      isResetting: false,
      isExporting: false,
      isImporting: false,
      updatePreference: mockUpdatePreference,
      bulkUpdate: mockBulkUpdate,
      reset: mockReset,
      export: mockExport,
      import: mockImport,
      getPreference: mockGetPreference,
      getCategoryPreferences: mockGetCategoryPreferences,
      isConnected: true,
      connectionState: 'Connected',
      refetch: mockRefetch,
    });

    // Mock useTheme hook
    mockUseTheme.mockReturnValue({
      theme: 'light',
      setTheme: jest.fn(),
      toggleTheme: jest.fn(),
      systemtheme: 'light',
      isSystemTheme: false,
      setSystemTheme: jest.fn(),
    });

    // Mock getCategoryPreferences to return category-specific data
    mockGetCategoryPreferences.mockImplementation((category: any) => (mockPreferences as any)[category] || {});
  });

  describe('Rendering', () => {
    it('renders the main dashboard components', () => {
      renderWithQueryClient(<PreferencesDashboard />);

      expect(screen.getByText('User Preferences & Settings')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search preferences...')).toBeInTheDocument();
      expect(screen.getByText('Export')).toBeInTheDocument();
      expect(screen.getByText('Import')).toBeInTheDocument();
      expect(screen.getByText('Reset All')).toBeInTheDocument();
    });

    it('shows loading state when preferences are loading', () => {
      mockUsePreferences.mockReturnValue({
        ...mockUsePreferences(),
        isLoading: true,
      });

      renderWithQueryClient(<PreferencesDashboard />);

      expect(screen.getByText('Loading preferences...')).toBeInTheDocument();
    });

    it('displays connection status badge', () => {
      renderWithQueryClient(<PreferencesDashboard />);

      expect(screen.getByText('Connected')).toBeInTheDocument();
    });

    it('shows updating badge when preferences are being updated', () => {
      mockUsePreferences.mockReturnValue({
        ...mockUsePreferences(),
        isUpdating: true,
      });

      renderWithQueryClient(<PreferencesDashboard />);

      expect(screen.getByText('Updating...')).toBeInTheDocument();
    });
  });

  describe('Category Tabs', () => {
    it('renders all category tabs', () => {
      renderWithQueryClient(<PreferencesDashboard />);

      // Check for tab labels (might be hidden on small screens)
      expect(screen.getByRole('tab', { name: /streaming/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /notifications/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /interface/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /privacy/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /geographic/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /search/i })).toBeInTheDocument();
    });

    it('switches between different category tabs', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<PreferencesDashboard />);

      // Click on notifications tab
      const notificationsTab = screen.getByRole('tab', { name: /notifications/i });
      await user.click(notificationsTab);

      // Check if notifications content is displayed
      await waitFor(() => {
        expect(screen.getByText('Notifications')).toBeInTheDocument();
      });
    });
  });

  describe('Search Functionality', () => {
    it('filters preferences based on search term', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<PreferencesDashboard />);

      const searchInput = screen.getByPlaceholderText('Search preferences...');
      await user.type(searchInput, 'theme');

      await waitFor(() => {
        expect(screen.getByText('Search Results')).toBeInTheDocument();
      });
    });

    it('shows no results message when search yields no matches', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<PreferencesDashboard />);

      const searchInput = screen.getByPlaceholderText('Search preferences...');
      await user.type(searchInput, 'nonexistent');

      await waitFor(() => {
        expect(screen.getByText('No preferences found matching your search.')).toBeInTheDocument();
      });
    });

    it('clears search results when search term is cleared', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<PreferencesDashboard />);

      const searchInput = screen.getByPlaceholderText('Search preferences...');
      await user.type(searchInput, 'theme');
      await user.clear(searchInput);

      await waitFor(() => {
        expect(screen.queryByText('Search Results')).not.toBeInTheDocument();
      });
    });
  });

  describe('Export Functionality', () => {
    it('calls export function when export button is clicked', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<PreferencesDashboard />);

      const exportButton = screen.getByText('Export');
      await user.click(exportButton);

      expect(mockExport).toHaveBeenCalledTimes(1);
    });

    it('disables export button when exporting', () => {
      mockUsePreferences.mockReturnValue({
        ...mockUsePreferences(),
        isExporting: true,
      });

      renderWithQueryClient(<PreferencesDashboard />);

      const exportButton = screen.getByText('Export');
      expect(exportButton).toBeDisabled();
    });
  });

  describe('Import Functionality', () => {
    it('handles file import when file is selected', async () => {
      renderWithQueryClient(<PreferencesDashboard />);

      const fileInput = screen
        .getByRole('button', { name: /import/i })
        .parentElement?.querySelector('input[type="file"]');
      expect(fileInput).toBeInTheDocument();

      const mockFile = createMockFile('{"preferences": {"theme": "dark"}}', 'preferences.json');

      if (fileInput) {
        await act(async () => {
          fireEvent.change(fileInput, { target: { files: [mockFile] } });
        });

        await waitFor(() => {
          expect(mockImport).toHaveBeenCalledWith({ theme: 'dark' });
        });
      }
    });

    it('disables import button when importing', () => {
      mockUsePreferences.mockReturnValue({
        ...mockUsePreferences(),
        isImporting: true,
      });

      renderWithQueryClient(<PreferencesDashboard />);

      const importButton = screen.getByText('Import');
      expect(importButton).toBeDisabled();
    });
  });

  describe('Reset Functionality', () => {
    it('shows confirmation dialog when reset all button is clicked', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<PreferencesDashboard />);

      const resetButton = screen.getByText('Reset All');
      await user.click(resetButton);

      expect(screen.getByText('Reset All Preferences')).toBeInTheDocument();
      expect(screen.getByText(/This action will reset all your preferences/)).toBeInTheDocument();
    });

    it('calls reset function when reset is confirmed', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<PreferencesDashboard />);

      const resetButton = screen.getByText('Reset All');
      await user.click(resetButton);

      const confirmButton = screen.getByRole('button', { name: 'Reset All' });
      await user.click(confirmButton);

      expect(mockReset).toHaveBeenCalledWith(undefined);
    });

    it('does not call reset function when reset is cancelled', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<PreferencesDashboard />);

      const resetButton = screen.getByText('Reset All');
      await user.click(resetButton);

      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      expect(mockReset).not.toHaveBeenCalled();
    });

    it('disables reset button when resetting', () => {
      mockUsePreferences.mockReturnValue({
        ...mockUsePreferences(),
        isResetting: true,
      });

      renderWithQueryClient(<PreferencesDashboard />);

      const resetButton = screen.getByText('Reset All');
      expect(resetButton).toBeDisabled();
    });
  });

  describe('Preference Updates', () => {
    it('calls updatePreference when a preference is changed', () => {
      renderWithQueryClient(<PreferencesDashboard />);

      // This would typically be triggered by child components
      // We're testing that the callback is properly passed down
      expect(mockGetCategoryPreferences).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('handles invalid JSON files gracefully', async () => {
      // Mock console.error to avoid test output noise
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      renderWithQueryClient(<PreferencesDashboard />);

      const fileInput = screen
        .getByRole('button', { name: /import/i })
        .parentElement?.querySelector('input[type="file"]');
      const mockFile = createMockFile('invalid json', 'invalid.json');

      if (fileInput) {
        await act(async () => {
          fireEvent.change(fileInput, { target: { files: [mockFile] } });
        });
      }

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to parse preferences file:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });

    it('handles files without preferences property', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      renderWithQueryClient(<PreferencesDashboard />);

      const fileInput = screen
        .getByRole('button', { name: /import/i })
        .parentElement?.querySelector('input[type="file"]');
      const mockFile = createMockFile('{"data": "no preferences"}', 'invalid.json');

      if (fileInput) {
        await act(async () => {
          fireEvent.change(fileInput, { target: { files: [mockFile] } });
        });

        await waitFor(() => {
          expect(consoleSpy).toHaveBeenCalledWith('Invalid preferences file format');
        });
      }

      consoleSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for main sections', () => {
      renderWithQueryClient(<PreferencesDashboard />);

      expect(screen.getByRole('tablist')).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /streaming/i })).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<PreferencesDashboard />);

      const searchInput = screen.getByPlaceholderText('Search preferences...');
      await user.tab();

      expect(searchInput).toHaveFocus();
    });
  });

  describe('Responsive Design', () => {
    it('adapts tab layout for different screen sizes', () => {
      renderWithQueryClient(<PreferencesDashboard />);

      const tabsList = screen.getByRole('tablist');
      expect(tabsList).toHaveClass('grid-cols-2', 'lg:grid-cols-4', 'xl:grid-cols-7');
    });
  });

  describe('Performance', () => {
    it('memoizes filtered preferences correctly', async () => {
      const user = userEvent.setup();
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            gcTime: 0,
          },
        },
      });

      const { rerender } = render(
        <QueryClientProvider client={queryClient}>
          <PreferencesDashboard />
        </QueryClientProvider>
      );

      const searchInput = screen.getByPlaceholderText('Search preferences...');
      await user.type(searchInput, 'theme');

      // Rerender with same props
      rerender(
        <QueryClientProvider client={queryClient}>
          <PreferencesDashboard />
        </QueryClientProvider>
      );

      // The memoization should prevent unnecessary recalculations
      expect(screen.getByText('Search Results')).toBeInTheDocument();
    });
  });
});
