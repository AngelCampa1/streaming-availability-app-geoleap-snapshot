import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserPreferencesManager } from '../UserPreferencesManager';
import { PreferencesProvider } from '../../../contexts/PreferencesContext';

// Mock API calls
jest.mock('../../../lib/api', () => ({
  api: jest.fn() as any,
  preferences: {
    getUserPreferences: jest.fn() as any,
    updateUserPreferences: jest.fn() as any,
    exportUserData: jest.fn() as any,
    deleteUserData: jest.fn() as any,
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockApi = require('../../../lib/api');

// Mock components that might not exist yet
jest.mock('../NotificationPreferences', () => ({
  NotificationPreferences: ({ preferences, onUpdate }: any) => (
    <div data-testid="notification-preferences">
      <input
        type="checkbox"
        checked={preferences?.emailNotifications || false}
        onChange={e => onUpdate('emailNotifications', e.target.checked)}
        data-testid="email-notifications"
      />
      <label htmlFor="email-notifications">Email Notifications</label>
    </div>
  ),
}));

jest.mock('../ContentPreferences', () => ({
  ContentPreferences: ({ preferences, onUpdate }: any) => (
    <div data-testid="content-preferences">
      <select
        value={preferences?.preferredGenre || ''}
        onChange={e => onUpdate('preferredGenre', e.target.value)}
        data-testid="preferred-genre"
        role="combobox"
        aria-label="Preferred Genre"
      >
        <option value="">Select Genre</option>
        <option value="action">Action</option>
        <option value="comedy">Comedy</option>
        <option value="drama">Drama</option>
      </select>
    </div>
  ),
}));

jest.mock('../SecurityPreferences', () => ({
  SecurityPreferences: ({ preferences, onUpdate }: any) => (
    <div data-testid="security-preferences">
      <input
        type="checkbox"
        checked={preferences?.twoFactorEnabled || false}
        onChange={e => onUpdate('twoFactorEnabled', e.target.checked)}
        data-testid="two-factor"
      />
      <label htmlFor="two-factor">Two Factor Authentication</label>
    </div>
  ),
}));

jest.mock('../RegionPreferences', () => ({
  RegionPreferences: ({ preferences, onUpdate }: any) => (
    <div data-testid="region-preferences">
      <select
        value={preferences?.primaryRegion || ''}
        onChange={e => onUpdate('primaryRegion', e.target.value)}
        data-testid="primary-region"
      >
        <option value="">Select Region</option>
        <option value="US">United States</option>
        <option value="GB">United Kingdom</option>
        <option value="CA">Canada</option>
      </select>
    </div>
  ),
}));

// Create a wrapper with providers
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const TestWrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <PreferencesProvider>{children}</PreferencesProvider>
    </QueryClientProvider>
  );
  TestWrapper.displayName = 'TestWrapper';
  return TestWrapper;
};

describe('UserPreferencesManager', () => {
  const mockPreferences = {
    id: '123',
    userId: 'user-123',
    emailNotifications: true,
    pushNotifications: false,
    preferredGenre: 'action',
    primaryRegion: 'US',
    twoFactorEnabled: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Properly mock the API functions to return promises
    mockApi.preferences.getUserPreferences.mockResolvedValue(mockPreferences);
    mockApi.preferences.updateUserPreferences.mockResolvedValue({ success: true });
    mockApi.preferences.exportUserData.mockResolvedValue({
      preferences: mockPreferences,
      exportedAt: new Date().toISOString(),
    });
    mockApi.preferences.deleteUserData.mockResolvedValue({ success: true });
  });

  it('should render all preference sections', async () => {
    await act(async () => {
      render(<UserPreferencesManager userId="user-123" />, { wrapper: createWrapper() });
    });

    await waitFor(() => {
      expect(screen.getByTestId('notification-preferences')).toBeInTheDocument();
      expect(screen.getByTestId('content-preferences')).toBeInTheDocument();
      expect(screen.getByTestId('security-preferences')).toBeInTheDocument();
      expect(screen.getByTestId('region-preferences')).toBeInTheDocument();
    });
  });

  it('should load user preferences on mount', async () => {
    await act(async () => {
      render(<UserPreferencesManager userId="user-123" />, { wrapper: createWrapper() });
    });

    await waitFor(() => {
      expect(mockApi.preferences.getUserPreferences).toHaveBeenCalledWith('user-123');
    });

    // Check that preferences are populated
    await waitFor(() => {
      expect(screen.getByTestId('email-notifications')).toBeChecked();
      expect(screen.getByTestId('preferred-genre')).toHaveValue('action');
      expect(screen.getByTestId('primary-region')).toHaveValue('US');
    });
  });

  it('should update notification preferences', async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(<UserPreferencesManager userId="user-123" autoSave={true} />, { wrapper: createWrapper() });
    });

    await waitFor(() => {
      expect(screen.getByTestId('email-notifications')).toBeInTheDocument();
    });

    // Toggle email notifications
    const emailCheckbox = screen.getByTestId('email-notifications');
    await act(async () => {
      await user.click(emailCheckbox);
    });

    // Wait for the preference to be updated
    await waitFor(() => {
      expect(emailCheckbox).not.toBeChecked();
    });

    // Check that API was called with updated preferences (auto-save should trigger this)
    await waitFor(
      () => {
        expect(mockApi.preferences.updateUserPreferences).toHaveBeenCalledWith(
          'user-123',
          expect.objectContaining({
            emailNotifications: false,
          })
        );
      },
      { timeout: 2000 }
    );
  });

  it('should update content preferences', async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(<UserPreferencesManager userId="user-123" autoSave={true} />, { wrapper: createWrapper() });
    });

    await waitFor(() => {
      expect(screen.getByTestId('preferred-genre')).toBeInTheDocument();
    });

    // Change preferred genre
    const genreSelect = screen.getByTestId('preferred-genre');
    await act(async () => {
      await user.selectOptions(genreSelect, 'comedy');
    });

    await waitFor(() => {
      expect(genreSelect).toHaveValue('comedy');
    });

    // Check that API was called with updated preferences
    await waitFor(
      () => {
        expect(mockApi.preferences.updateUserPreferences).toHaveBeenCalledWith(
          'user-123',
          expect.objectContaining({
            preferredGenre: 'comedy',
          })
        );
      },
      { timeout: 2000 }
    );
  });

  it('should update security preferences', async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(<UserPreferencesManager userId="user-123" autoSave={true} />, { wrapper: createWrapper() });
    });

    await waitFor(() => {
      expect(screen.getByTestId('two-factor')).toBeInTheDocument();
    });

    // Enable two factor authentication
    const twoFactorCheckbox = screen.getByTestId('two-factor');
    await act(async () => {
      await user.click(twoFactorCheckbox);
    });

    await waitFor(() => {
      expect(twoFactorCheckbox).toBeChecked();
    });

    // Check that API was called with updated preferences
    await waitFor(
      () => {
        expect(mockApi.preferences.updateUserPreferences).toHaveBeenCalledWith(
          'user-123',
          expect.objectContaining({
            twoFactorEnabled: true,
          })
        );
      },
      { timeout: 2000 }
    );
  });

  it('should update region preferences', async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(<UserPreferencesManager userId="user-123" autoSave={true} />, { wrapper: createWrapper() });
    });

    await waitFor(() => {
      expect(screen.getByTestId('primary-region')).toBeInTheDocument();
    });

    // Change primary region
    const regionSelect = screen.getByTestId('primary-region');
    await act(async () => {
      await user.selectOptions(regionSelect, 'GB');
    });

    await waitFor(() => {
      expect(regionSelect).toHaveValue('GB');
    });

    // Check that API was called with updated preferences
    await waitFor(
      () => {
        expect(mockApi.preferences.updateUserPreferences).toHaveBeenCalledWith(
          'user-123',
          expect.objectContaining({
            primaryRegion: 'GB',
          })
        );
      },
      { timeout: 2000 }
    );
  });

  it('should handle save button click', async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(<UserPreferencesManager userId="user-123" />, { wrapper: createWrapper() });
    });

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByTestId('notification-preferences')).toBeInTheDocument();
    });

    // Make a change first to enable the save button
    const emailCheckbox = screen.getByTestId('email-notifications');
    await act(async () => {
      await user.click(emailCheckbox);
    });

    // Wait for the change to be processed
    await waitFor(() => {
      expect(emailCheckbox).not.toBeChecked();
    });

    // Find and click save button
    const saveButton = screen.getByRole('button', { name: /save/i });
    expect(saveButton).not.toBeDisabled();
    await act(async () => {
      await user.click(saveButton);
    });

    // Should call API to save preferences
    await waitFor(() => {
      expect(mockApi.preferences.updateUserPreferences).toHaveBeenCalled();
    });
  });

  it('should handle reset button click', async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(<UserPreferencesManager userId="user-123" />, { wrapper: createWrapper() });
    });

    await waitFor(() => {
      expect(screen.getByTestId('email-notifications')).toBeInTheDocument();
    });

    // Make a change
    const emailCheckbox = screen.getByTestId('email-notifications');
    await act(async () => {
      await user.click(emailCheckbox);
    });

    // Reset preferences
    const resetButton = screen.getByRole('button', { name: /reset/i });
    await act(async () => {
      await user.click(resetButton);
    });

    // Should restore original values
    await waitFor(() => {
      expect(emailCheckbox).toBeChecked(); // Back to original state
    });
  });

  it('should show loading state initially', () => {
    mockApi.preferences.getUserPreferences.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));

    act(() => {
      render(<UserPreferencesManager userId="user-123" />, { wrapper: createWrapper() });
    });

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should show error state when API call fails', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockApi.preferences.getUserPreferences.mockRejectedValue(new Error('Failed to load preferences'));

    await act(async () => {
      render(<UserPreferencesManager userId="user-123" />, { wrapper: createWrapper() });
    });

    await waitFor(() => {
      expect(screen.getByText(/error loading preferences/i)).toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });

  it('should handle export user data', async () => {
    const user = userEvent.setup();
    mockApi.preferences.exportUserData.mockResolvedValue({
      preferences: mockPreferences,
      exportedAt: new Date().toISOString(),
    });

    await act(async () => {
      render(<UserPreferencesManager userId="user-123" />, { wrapper: createWrapper() });
    });

    await waitFor(() => {
      expect(screen.getByTestId('notification-preferences')).toBeInTheDocument();
    });

    const exportButton = screen.getByRole('button', { name: /export data/i });
    await act(async () => {
      await user.click(exportButton);
    });

    await waitFor(() => {
      expect(mockApi.preferences.exportUserData).toHaveBeenCalledWith('user-123');
    });
  });

  it('should handle delete user data with confirmation', async () => {
    const user = userEvent.setup();
    mockApi.preferences.deleteUserData.mockResolvedValue({ success: true });

    // Mock window.confirm
    const originalConfirm = window.confirm;
    window.confirm = jest.fn(() => true);

    render(<UserPreferencesManager userId="user-123" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('notification-preferences')).toBeInTheDocument();
    });

    const deleteButton = screen.getByRole('button', { name: /delete data/i });
    await user.click(deleteButton);

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('permanently delete'));
      expect(mockApi.preferences.deleteUserData).toHaveBeenCalledWith('user-123');
    });

    window.confirm = originalConfirm;
  });

  it('should not delete user data if confirmation is denied', async () => {
    const user = userEvent.setup();

    // Mock window.confirm to return false
    const originalConfirm = window.confirm;
    window.confirm = jest.fn(() => false);

    render(<UserPreferencesManager userId="user-123" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('notification-preferences')).toBeInTheDocument();
    });

    const deleteButton = screen.getByRole('button', { name: /delete data/i });
    await user.click(deleteButton);

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalled();
    });

    expect(mockApi.preferences.deleteUserData).not.toHaveBeenCalled();

    window.confirm = originalConfirm;
  });

  it('should handle keyboard navigation', async () => {
    const user = userEvent.setup();

    render(<UserPreferencesManager userId="user-123" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('email-notifications')).toBeInTheDocument();
    });

    // Tab through form elements
    await user.tab();
    expect(screen.getByTestId('email-notifications')).toHaveFocus();

    await user.tab();
    expect(screen.getByTestId('preferred-genre')).toHaveFocus();

    await user.tab();
    expect(screen.getByTestId('two-factor')).toHaveFocus();

    await user.tab();
    expect(screen.getByTestId('primary-region')).toHaveFocus();
  });

  it('should be accessible with proper ARIA labels', async () => {
    render(<UserPreferencesManager userId="user-123" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('notification-preferences')).toBeInTheDocument();
    });

    // Check for proper accessibility attributes
    const emailCheckbox = screen.getByTestId('email-notifications');
    expect(emailCheckbox).toHaveAttribute('type', 'checkbox');

    const genreSelect = screen.getByTestId('preferred-genre');
    expect(genreSelect).toHaveAttribute('role', 'combobox');
  });

  it('should auto-save preferences on change when enabled', async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(<UserPreferencesManager userId="user-123" autoSave={true} />, { wrapper: createWrapper() });
    });

    await waitFor(() => {
      expect(screen.getByTestId('email-notifications')).toBeInTheDocument();
    });

    // Make a change
    const emailCheckbox = screen.getByTestId('email-notifications');
    await act(async () => {
      await user.click(emailCheckbox);
    });

    // Wait for the checkbox state to change
    await waitFor(() => {
      expect(emailCheckbox).not.toBeChecked();
    });

    // Should automatically save after debounce (500ms) - wait longer for debounce
    // Use flushPromises and advance timers to handle debounce
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 600)); // Wait for debounce
    });

    await waitFor(
      () => {
        expect(mockApi.preferences.updateUserPreferences).toHaveBeenCalledWith(
          'user-123',
          expect.objectContaining({
            emailNotifications: false,
          })
        );
      },
      { timeout: 3000 }
    );
  });

  it('should debounce auto-save to prevent excessive API calls', async () => {
    const user = userEvent.setup();

    render(<UserPreferencesManager userId="user-123" autoSave={true} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('email-notifications')).toBeInTheDocument();
    });

    // Make multiple rapid changes
    const emailCheckbox = screen.getByTestId('email-notifications');
    await user.click(emailCheckbox);
    await user.click(emailCheckbox);
    await user.click(emailCheckbox);

    // Should only call API once after debounce period (last click results in checked state)
    await waitFor(
      () => {
        const callCount = mockApi.preferences.updateUserPreferences.mock.calls.length;
        expect(callCount).toBeGreaterThanOrEqual(1);
        expect(callCount).toBeLessThanOrEqual(2); // Allow for 1-2 calls due to debouncing
      },
      { timeout: 2000 }
    );
  });
});
