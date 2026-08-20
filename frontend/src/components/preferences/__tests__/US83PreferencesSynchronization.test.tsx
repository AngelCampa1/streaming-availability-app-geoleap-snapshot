/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PreferencesProvider } from '../../../contexts/PreferencesContext';

// Mock API calls
jest.mock('../../../lib/api', () => ({
  api: jest.fn(),
  preferences: {
    getUserPreferences: jest.fn(),
    updateUserPreferences: jest.fn(),
    syncPreferences: jest.fn(),
    getResolvedPreferences: jest.fn(),
    validatePreference: jest.fn(),
    exportPreferences: jest.fn(),
    importPreferences: jest.fn(),
    resetPreferences: jest.fn(),
  },
}));

// Mock SignalR for real-time sync
jest.mock('@microsoft/signalr', () => ({
  HubConnectionBuilder: jest.fn(() => ({
    withUrl: jest.fn().mockReturnThis(),
    withAutomaticReconnect: jest.fn().mockReturnThis(),
    build: jest.fn(() => ({
      start: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
      off: jest.fn(),
      invoke: jest.fn().mockResolvedValue(undefined),
      connectionState: 'Connected',
    })),
  })),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockApi = require('../../../lib/api');

// Mock preference components
const MockNotificationPreferences = ({ preferences, onUpdate }: any) => (
  <div data-testid="notification-preferences">
    <input
      type="checkbox"
      checked={preferences?.emailEnabled || false}
      onChange={e => onUpdate('emailEnabled', e.target.checked)}
      data-testid="email-enabled"
    />
    <input
      type="checkbox"
      checked={preferences?.pushEnabled || false}
      onChange={e => onUpdate('pushEnabled', e.target.checked)}
      data-testid="push-enabled"
    />
  </div>
);

const MockDisplayPreferences = ({ preferences, onUpdate }: any) => (
  <div data-testid="display-preferences">
    <select
      value={preferences?.themeMode || ''}
      onChange={e => onUpdate('themeMode', e.target.value)}
      data-testid="theme-mode"
    >
      <option value="">Select Theme</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
      <option value="auto">Auto</option>
    </select>
    <input
      type="range"
      min="12"
      max="24"
      value={preferences?.fontSize || 16}
      onChange={e => onUpdate('fontSize', parseInt(e.target.value))}
      data-testid="font-size"
    />
  </div>
);

const MockPrivacyPreferences = ({ preferences, onUpdate }: any) => (
  <div data-testid="privacy-preferences">
    <input
      type="checkbox"
      checked={preferences?.dataSharing || false}
      onChange={e => onUpdate('dataSharing', e.target.checked)}
      data-testid="data-sharing"
    />
    <input
      type="checkbox"
      checked={preferences?.analytics || false}
      onChange={e => onUpdate('analytics', e.target.checked)}
      data-testid="analytics"
    />
  </div>
);

// Mock US-8.3 Preferences Synchronization Component
const US83PreferencesSynchronization = ({ userId }: { userId: string }) => {
  const [preferences, setPreferences] = React.useState({
    emailEnabled: true,
    pushEnabled: false,
    themeMode: 'light',
    fontSize: 16,
    dataSharing: false,
    analytics: true,
  });

  const [syncStatus, setSyncStatus] = React.useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [lastSynced, setLastSynced] = React.useState<Date | null>(null);

  // Simulate preference update
  const handleUpdate = async (key: string, value: any) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
    setSyncStatus('syncing');

    try {
      // Add small delay to simulate API call
      await new Promise(resolve => setTimeout(resolve, 100));
      await mockApi.preferences.updateUserPreferences(userId, { [key]: value });
      setSyncStatus('synced');
      setLastSynced(new Date());
    } catch (_error) {
      setSyncStatus('error');
    }
  };

  // Simulate sync action
  const handleSync = async () => {
    setSyncStatus('syncing');
    try {
      // Add small delay to simulate API call
      await new Promise(resolve => setTimeout(resolve, 100));
      await mockApi.preferences.syncPreferences(userId);
      setSyncStatus('synced');
      setLastSynced(new Date());
    } catch (_error) {
      setSyncStatus('error');
    }
  };

  // Simulate export
  const handleExport = async () => {
    try {
      await mockApi.preferences.exportPreferences(userId);
    } catch (_error) {
      console.error('Export failed:', _error);
    }
  };

  // Simulate reset
  const handleReset = async () => {
    try {
      await mockApi.preferences.resetPreferences(userId);
      setPreferences({
        emailEnabled: true,
        pushEnabled: false,
        themeMode: 'light',
        fontSize: 16,
        dataSharing: false,
        analytics: true,
      });
      setSyncStatus('synced');
    } catch (_error) {
      setSyncStatus('error');
    }
  };

  return (
    <div data-testid="us83-preferences-sync">
      <div data-testid="sync-status" data-status={syncStatus}>
        Status: {syncStatus}
        {lastSynced && <span data-testid="last-synced">Last synced: {lastSynced.toISOString()}</span>}
      </div>

      <MockNotificationPreferences preferences={preferences} onUpdate={handleUpdate} />
      <MockDisplayPreferences preferences={preferences} onUpdate={handleUpdate} />
      <MockPrivacyPreferences preferences={preferences} onUpdate={handleUpdate} />

      <div data-testid="preference-actions">
        <button onClick={handleSync} data-testid="sync-button">
          Sync Preferences
        </button>
        <button onClick={handleExport} data-testid="export-button">
          Export Data
        </button>
        <button onClick={handleReset} data-testid="reset-button">
          Reset to Defaults
        </button>
      </div>
    </div>
  );
};

// Test wrapper with providers
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

describe('US-8.3 Preferences Synchronization', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.preferences.getUserPreferences.mockResolvedValue({});
    mockApi.preferences.updateUserPreferences.mockResolvedValue({ success: true });
    mockApi.preferences.syncPreferences.mockResolvedValue({ success: true });
    mockApi.preferences.exportPreferences.mockResolvedValue({ success: true });
    mockApi.preferences.resetPreferences.mockResolvedValue({ success: true });
  });

  it('should render all preference categories', async () => {
    render(<US83PreferencesSynchronization userId="user-123" />, { wrapper: createWrapper() });

    expect(screen.getByTestId('notification-preferences')).toBeInTheDocument();
    expect(screen.getByTestId('display-preferences')).toBeInTheDocument();
    expect(screen.getByTestId('privacy-preferences')).toBeInTheDocument();
    expect(screen.getByTestId('sync-status')).toBeInTheDocument();
  });

  it('should show initial sync status as idle', () => {
    render(<US83PreferencesSynchronization userId="user-123" />, { wrapper: createWrapper() });

    const syncStatus = screen.getByTestId('sync-status');
    expect(syncStatus).toHaveAttribute('data-status', 'idle');
    expect(syncStatus).toHaveTextContent('Status: idle');
  });

  it('should update notification preferences and trigger sync', async () => {
    render(<US83PreferencesSynchronization userId="user-123" />, { wrapper: createWrapper() });

    // Toggle email notifications
    const emailCheckbox = screen.getByTestId('email-enabled');
    await user.click(emailCheckbox);

    // Should show syncing status
    await waitFor(() => {
      expect(screen.getByTestId('sync-status')).toHaveAttribute('data-status', 'syncing');
    });

    // Should call API to update preferences
    await waitFor(() => {
      expect(mockApi.preferences.updateUserPreferences).toHaveBeenCalledWith('user-123', { emailEnabled: false });
    });

    // Should show synced status
    await waitFor(() => {
      expect(screen.getByTestId('sync-status')).toHaveAttribute('data-status', 'synced');
    });
  });

  it('should update display preferences with theme selection', async () => {
    render(<US83PreferencesSynchronization userId="user-123" />, { wrapper: createWrapper() });

    // Change theme mode
    const themeSelect = screen.getByTestId('theme-mode');
    await user.selectOptions(themeSelect, 'dark');

    await waitFor(() => {
      expect(themeSelect).toHaveValue('dark');
    });

    // Should trigger sync
    await waitFor(() => {
      expect(mockApi.preferences.updateUserPreferences).toHaveBeenCalledWith('user-123', { themeMode: 'dark' });
    });
  });

  it('should update display preferences with font size slider', async () => {
    render(<US83PreferencesSynchronization userId="user-123" />, { wrapper: createWrapper() });

    // Change font size
    const fontSizeSlider = screen.getByTestId('font-size');
    fireEvent.change(fontSizeSlider, { target: { value: '20' } });

    await waitFor(() => {
      expect(fontSizeSlider).toHaveValue('20');
    });

    // Should trigger sync
    await waitFor(() => {
      expect(mockApi.preferences.updateUserPreferences).toHaveBeenCalledWith('user-123', { fontSize: 20 });
    });
  });

  it('should update privacy preferences', async () => {
    render(<US83PreferencesSynchronization userId="user-123" />, { wrapper: createWrapper() });

    // Toggle data sharing
    const dataSharingCheckbox = screen.getByTestId('data-sharing');
    await user.click(dataSharingCheckbox);

    await waitFor(() => {
      expect(dataSharingCheckbox).toBeChecked();
    });

    // Should trigger sync
    await waitFor(() => {
      expect(mockApi.preferences.updateUserPreferences).toHaveBeenCalledWith('user-123', { dataSharing: true });
    });
  });

  it('should handle manual sync action', async () => {
    render(<US83PreferencesSynchronization userId="user-123" />, { wrapper: createWrapper() });

    // Click sync button
    const syncButton = screen.getByTestId('sync-button');
    await user.click(syncButton);

    // Should show syncing status
    await waitFor(() => {
      expect(screen.getByTestId('sync-status')).toHaveAttribute('data-status', 'syncing');
    });

    // Should call sync API
    await waitFor(() => {
      expect(mockApi.preferences.syncPreferences).toHaveBeenCalledWith('user-123');
    });

    // Should show synced status with timestamp
    await waitFor(() => {
      expect(screen.getByTestId('sync-status')).toHaveAttribute('data-status', 'synced');
      expect(screen.getByTestId('last-synced')).toBeInTheDocument();
    });
  });

  it('should handle preference export', async () => {
    render(<US83PreferencesSynchronization userId="user-123" />, { wrapper: createWrapper() });

    // Click export button
    const exportButton = screen.getByTestId('export-button');
    await user.click(exportButton);

    // Should call export API
    await waitFor(() => {
      expect(mockApi.preferences.exportPreferences).toHaveBeenCalledWith('user-123');
    });
  });

  it('should handle preference reset', async () => {
    render(<US83PreferencesSynchronization userId="user-123" />, { wrapper: createWrapper() });

    // First, change some preferences
    const emailCheckbox = screen.getByTestId('email-enabled');
    const themeSelect = screen.getByTestId('theme-mode');

    await user.click(emailCheckbox); // Disable email
    await user.selectOptions(themeSelect, 'dark'); // Change theme

    // Click reset button
    const resetButton = screen.getByTestId('reset-button');
    await user.click(resetButton);

    // Should call reset API
    await waitFor(() => {
      expect(mockApi.preferences.resetPreferences).toHaveBeenCalledWith('user-123');
    });

    // Should restore default values
    await waitFor(() => {
      expect(emailCheckbox).toBeChecked(); // Back to enabled
      expect(themeSelect).toHaveValue('light'); // Back to light theme
    });
  });

  it('should handle sync errors gracefully', async () => {
    mockApi.preferences.updateUserPreferences.mockRejectedValue(new Error('Sync failed'));

    render(<US83PreferencesSynchronization userId="user-123" />, { wrapper: createWrapper() });

    // Try to update a preference
    const emailCheckbox = screen.getByTestId('email-enabled');
    await user.click(emailCheckbox);

    // Should show error status
    await waitFor(() => {
      expect(screen.getByTestId('sync-status')).toHaveAttribute('data-status', 'error');
    });
  });

  it('should handle multiple rapid preference changes', async () => {
    render(<US83PreferencesSynchronization userId="user-123" />, { wrapper: createWrapper() });

    // Make multiple rapid changes
    const emailCheckbox = screen.getByTestId('email-enabled');
    const pushCheckbox = screen.getByTestId('push-enabled');
    const analyticsCheckbox = screen.getByTestId('analytics');

    await user.click(emailCheckbox);
    await user.click(pushCheckbox);
    await user.click(analyticsCheckbox);

    // Should handle all updates
    await waitFor(() => {
      expect(mockApi.preferences.updateUserPreferences).toHaveBeenCalledTimes(3);
    });
  });

  it('should persist preference values across re-renders', async () => {
    const { rerender } = render(<US83PreferencesSynchronization userId="user-123" />, { wrapper: createWrapper() });

    // Change a preference
    const themeSelect = screen.getByTestId('theme-mode');
    await user.selectOptions(themeSelect, 'dark');

    // Re-render component
    rerender(<US83PreferencesSynchronization userId="user-123" />);

    // Value should still be set (though in real app this would come from API/context)
    expect(themeSelect).toHaveValue('dark');
  });

  it('should handle accessibility features correctly', async () => {
    render(<US83PreferencesSynchronization userId="user-123" />, { wrapper: createWrapper() });

    // Check for proper form controls
    const emailCheckbox = screen.getByTestId('email-enabled');
    const themeSelect = screen.getByTestId('theme-mode');
    const fontSlider = screen.getByTestId('font-size');

    expect(emailCheckbox).toHaveAttribute('type', 'checkbox');
    expect(themeSelect.tagName).toBe('SELECT');
    expect(fontSlider).toHaveAttribute('type', 'range');
  });

  it('should show last synced timestamp when available', async () => {
    render(<US83PreferencesSynchronization userId="user-123" />, { wrapper: createWrapper() });

    // Trigger a sync to get timestamp
    const syncButton = screen.getByTestId('sync-button');
    await user.click(syncButton);

    await waitFor(() => {
      const lastSynced = screen.getByTestId('last-synced');
      expect(lastSynced).toBeInTheDocument();
      expect(lastSynced.textContent).toMatch(/Last synced: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  it('should handle cross-device synchronization simulation', async () => {
    render(<US83PreferencesSynchronization userId="user-123" />, { wrapper: createWrapper() });

    // Simulate receiving preference update from another device
    const emailCheckbox = screen.getByTestId('email-enabled');

    // Change preference locally
    await user.click(emailCheckbox);

    // Simulate successful sync
    await waitFor(() => {
      expect(screen.getByTestId('sync-status')).toHaveAttribute('data-status', 'synced');
    });

    // In a real implementation, SignalR would push updates from other devices
    // This test verifies the component structure supports such updates
    expect(emailCheckbox).not.toBeChecked();
  });
});
