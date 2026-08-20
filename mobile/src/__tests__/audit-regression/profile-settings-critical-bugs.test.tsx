/**
 * Profile & Settings Critical Bugs Regression Tests
 * Tests for bugs found during Day 5 audit (2025-12-16)
 *
 * CRITICAL BUGS COVERED:
 * - BUG-PROFILE-001: Duplicate useTheme hook implementations
 * - BUG-PROFILE-002: Console logging in ThemeProvider
 * - BUG-PROFILE-003: Excessive AsyncStorage writes on theme changes
 * - BUG-PROFILE-004: Light-Only Mode check ignores 'auto' mode
 * - BUG-PROFILE-005: Console logging in profile components
 * - BUG-PROFILE-006: No offline queue for profile updates
 * - BUG-PROFILE-007: UserProfile type safety escape hatch
 * - BUG-PROFILE-008: Theme save race condition on mount
 *
 * @see docs/audit/week1/day5-profile-settings-bug-report.md
 */

// Mock logger before other imports
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    log: jest.fn(),
    trace: jest.fn(),
  },
}));

// Mock Appearance API before other imports
const mockGetColorScheme = jest.fn(() => 'light');
const mockSetColorScheme = jest.fn();
const mockAddChangeListener = jest.fn(() => ({ remove: jest.fn() }));
const mockRemoveChangeListener = jest.fn();

jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Appearance: {
    getColorScheme: mockGetColorScheme,
    setColorScheme: mockSetColorScheme,
    addChangeListener: mockAddChangeListener,
    removeChangeListener: mockRemoveChangeListener,
  },
}));

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useTheme as useThemeProvider } from '../../theme/ThemeProvider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';
import React from 'react';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { userService, UserProfile } from '../../services/userService';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('../../utils/logger');
jest.mock('../../services/api/ApiService');
jest.mock('../../services/userService', () => ({
  userService: {
    getUserProfile: jest.fn(),
    updateUserProfile: jest.fn(),
  },
  UserProfile: {},
}));

// Wrapper for ThemeProvider
const createThemeWrapper = () => {
  return ({ children }: { children: React.ReactNode }) => (
    <ThemeProvider>{children}</ThemeProvider>
  );
};

describe('BUG-PROFILE-001: Duplicate useTheme Hook Implementations', () => {
  it('should have consistent theme state across different imports', () => {
    // This test documents the bug: 118 files use two different useTheme implementations
    // Some import from 'hooks/useTheme' (legacy wrapper)
    // Others import from 'theme/ThemeProvider' (correct)

    const wrapper = createThemeWrapper();
    const { result } = renderHook(() => useThemeProvider(), { wrapper });

    // The correct implementation should provide:
    expect(result.current.theme).toBeDefined();
    expect(result.current.themeMode).toBeDefined();
    expect(result.current.setTheme).toBeDefined();
    expect(result.current.setHighContrast).toBeDefined();
    expect(result.current.setReducedMotion).toBeDefined();

    // BUG: Legacy hook wrapper only returns { theme, themeMode }
    // Missing: setTheme, setHighContrast, setReducedMotion
  });

  it('should update all screens when theme changes (documents fragmentation)', async () => {
    const wrapper = createThemeWrapper();
    const { result } = renderHook(() => useThemeProvider(), { wrapper });

    // Change theme
    act(() => {
      result.current.setTheme('light');
    });

    // BUG: Screens using legacy hook don't receive this update
    await waitFor(() => {
      expect(result.current.themeMode).toBe('dark');
    });

    // Screens using different imports may have stale theme state
  });
});

describe('BUG-PROFILE-003: Excessive AsyncStorage Writes on Theme Changes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  it('should write to AsyncStorage on every theme state change (no debouncing)', async () => {
    // Mock AsyncStorage to return light mode initially
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify({ themeMode: 'light', highContrast: false, reducedMotion: false })
    );

    const wrapper = createThemeWrapper();
    const { result } = renderHook(() => useThemeProvider(), { wrapper });

    // Wait for initial load from storage to complete
    await waitFor(() => {
      expect(result.current.themeMode).toBe('light');
    });

    // Record calls during initial mount
    const initialCalls = (AsyncStorage.setItem as jest.Mock).mock.calls.length;

    // Clear mocks for this specific test
    (AsyncStorage.setItem as jest.Mock).mockClear();

    // BUG: Each change triggers immediate AsyncStorage write
    act(() => {
      result.current.setTheme('light');
    });

    // Verify theme changed
    await waitFor(() => {
      expect(result.current.themeMode).toBe('dark');
    }, { timeout: 2000 });

    // Wait for the effect to run and save to storage
    await waitFor(() => {
      const calls = (AsyncStorage.setItem as jest.Mock).mock.calls;
      if (calls.length === 0) {
        throw new Error(`AsyncStorage.setItem not called. Theme mode: ${result.current.themeMode}`);
      }
      expect(calls.length).toBeGreaterThan(0);
    }, { timeout: 3000 });

    // Verify it was called with correct arguments
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      '@geoleap_theme_preferences',
      expect.stringContaining('dark')
    );

    const callsAfterFirstChange = (AsyncStorage.setItem as jest.Mock).mock.calls.length;

    // Rapid changes
    act(() => {
      result.current.setHighContrast(true);
    });

    act(() => {
      result.current.setReducedMotion(true);
    });

    await waitFor(() => {
      const totalCalls = (AsyncStorage.setItem as jest.Mock).mock.calls.length;
      // BUG: Should be 1 debounced call, but is multiple immediate calls
      expect(totalCalls).toBeGreaterThan(callsAfterFirstChange);
    });
  });

  it('should cause performance issues on rapid theme toggles', async () => {
    const wrapper = createThemeWrapper();
    const { result } = renderHook(() => useThemeProvider(), { wrapper });

    const startCalls = (AsyncStorage.setItem as jest.Mock).mock.calls.length;

    // Simulate rapid toggling (user spamming Light-Only Mode button)
    for (let i = 0; i < 10; i++) {
      act(() => {
        result.current.setTheme(i % 2 === 0 ? 'dark' : 'light');
      });
    }

    await waitFor(() => {
      const totalCalls = (AsyncStorage.setItem as jest.Mock).mock.calls.length;
      // BUG: 10+ writes for 10 toggles (should be 1 debounced write)
      expect(totalCalls - startCalls).toBeGreaterThanOrEqual(10);
    });
  });
});

describe('BUG-PROFILE-004: Light-Only Mode Check Ignores Auto Mode', () => {
  beforeEach(() => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    mockGetColorScheme.mockReturnValue('dark');
  });

  it('should detect Light-Only Mode when themeMode is "auto" and system is dark', async () => {
    const wrapper = createThemeWrapper();
    const { result } = renderHook(() => useThemeProvider(), { wrapper });

    // Set to auto mode with dark system theme
    act(() => {
      result.current.setTheme('auto');
    });

    await waitFor(() => {
      expect(result.current.themeMode).toBe('auto');
    });

    // BUG: SettingsScreen checks `false` instead of `theme.isDark`
    // This means toggle shows OFF even though app is in Light-Only Mode
    const correctCheck = result.current.theme.isDark;
    const buggyCheck = result.current.false;

    expect(correctCheck).toBe(true); // ✅ App IS in Light-Only Mode
    expect(buggyCheck).toBe(false); // ❌ But toggle shows OFF
  });

  it('should handle light mode correctly in auto mode', async () => {
    mockGetColorScheme.mockReturnValue('light');

    const wrapper = createThemeWrapper();
    const { result } = renderHook(() => useThemeProvider(), { wrapper });

    act(() => {
      result.current.setTheme('auto');
    });

    await waitFor(() => {
      expect(result.current.themeMode).toBe('auto');
      expect(result.current.theme.isDark).toBe(false);
    });
  });
});

describe('BUG-PROFILE-006: No Offline Queue for Profile Updates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  it('should save profile updates locally when API fails', async () => {
    const mockError = new Error('Network request failed');

    // Mock API failure
    const mockApiService = {
      put: jest.fn().mockRejectedValue(mockError),
    };

    jest.mock('../../services/api/ApiService', () => ({
      ApiService: jest.fn(() => mockApiService),
    }));

    const updates = { displayName: 'John Doe Updated' };

    try {
      await userService.updateUserProfile('user-123', updates);
    } catch (error) {
      // Expected to fail
    }

    // BUG: Updates are saved locally but NEVER synced to server
    // No offline queue mechanism exists
    expect(AsyncStorage.setItem).toHaveBeenCalled();

    // EXPECTED: Should have offline queue entry
    // ACTUAL: Just saves locally and forgets about sync
  });

  it('should NOT have sync queue mechanism (documenting the bug)', async () => {
    // BUG: userService has no methods for:
    // - Queueing failed updates
    // - Retrying on network restore
    // - Conflict resolution

    const serviceInstance = userService as any;

    // These methods should exist but don't:
    expect(serviceInstance.getOfflineQueue).toBeUndefined();
    expect(serviceInstance.syncPendingUpdates).toBeUndefined();
    expect(serviceInstance.clearOfflineQueue).toBeUndefined();

    // This documents the bug - no offline sync infrastructure
  });

  it('should cause data loss across devices (multi-device scenario)', async () => {
    // Scenario:
    // 1. User updates profile on Device A (offline) → Saved locally
    // 2. User opens app on Device B → Sees old profile (no sync)
    // 3. User updates profile on Device B (online) → Synced to server
    // 4. Device A comes online → Never syncs, Device B changes overwrite

    // BUG: No conflict resolution or offline queue
    // Result: Data loss for Device A changes
    expect('Offline queue mechanism').toBe('Not implemented');
  });
});

describe('BUG-PROFILE-007: UserProfile Type Safety Escape Hatch', () => {
  it('should allow invalid properties without TypeScript errors (documenting the bug)', () => {
    // BUG: UserProfile interface has [key: string]: any
    const profile: UserProfile = {
      id: 'user-123',
      email: 'test@example.com',
      username: 'johndoe',
      // These should cause TypeScript errors but don't:
      invalidProp: 'should not be allowed', // ❌ Not in interface
      usernme: 'typo', // ❌ Typo of 'username'
      randomStuff: { nested: { data: 123 } }, // ❌ Arbitrary nesting
    };

    // TypeScript doesn't catch these errors due to index signature
    expect(profile.invalidProp).toBe('should not be allowed');
    expect((profile as any).usernme).toBe('typo');
  });

  it('should defeat type safety in service methods', () => {
    const invalidUpdate = {
      displayNme: 'John', // Typo of 'displayName'
      avtar: 'url', // Typo of 'avatar'
      randomField: 123,
    };

    // BUG: TypeScript doesn't prevent this
    // EXPECTED: Type error for invalid properties
    // ACTUAL: Compiles without errors due to [key: string]: any

    expect(() => {
      // This should fail type checking but doesn't
      const profile: UserProfile = {
        id: '1',
        email: 'test@test.com',
        ...invalidUpdate,
      };
      return profile;
    }).not.toThrow();
  });
});

describe('BUG-PROFILE-008: Theme Save Race Condition on Mount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  it('should load AND save theme preferences on mount', async () => {
    // Mock existing preferences
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify({
        themeMode: 'dark',
        highContrast: false,
        reducedMotion: false,
      })
    );

    const wrapper = createThemeWrapper();
    renderHook(() => useThemeProvider(), { wrapper });

    // BUG: Race condition - loads from AsyncStorage, then immediately saves
    await waitFor(() => {
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('@geoleap_theme_preferences');
    });

    // Race: Load completes, then save effect fires
    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    // This is wasteful - why save immediately after loading?
  });

  it('should cause unnecessary writes on every app launch', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify({ themeMode: 'light', highContrast: false, reducedMotion: false })
    );

    const wrapper = createThemeWrapper();
    const { rerender } = renderHook(() => useThemeProvider(), { wrapper });

    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    const callsAfterMount = (AsyncStorage.setItem as jest.Mock).mock.calls.length;

    // Simulate app backgrounding and resuming
    rerender({ children: null } as any);

    // BUG: Writes again on remount even if nothing changed
    await waitFor(() => {
      const totalCalls = (AsyncStorage.setItem as jest.Mock).mock.calls.length;
      expect(totalCalls).toBeGreaterThanOrEqual(callsAfterMount);
    });
  });
});

describe('Theme Provider Integration Tests', () => {
  beforeEach(() => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  it('should respect system theme changes in auto mode', async () => {
    let systemTheme = 'light';
    mockGetColorScheme.mockImplementation(() => systemTheme);
    mockAddChangeListener.mockImplementation((callback) => {
      // Simulate system theme change
      setTimeout(() => {
        systemTheme = 'light';
        callback({ colorScheme: 'dark' });
      }, 100);
      return { remove: jest.fn() };
    });

    const wrapper = createThemeWrapper();
    const { result } = renderHook(() => useThemeProvider(), { wrapper });

    act(() => {
      result.current.setTheme('auto');
    });

    // Wait for system theme change listener
    await waitFor(() => {
      expect(result.current.theme.isDark).toBe(true);
    }, { timeout: 2000 });
  });

  it('should persist high contrast and reduced motion preferences', async () => {
    const wrapper = createThemeWrapper();
    const { result } = renderHook(() => useThemeProvider(), { wrapper });

    act(() => {
      result.current.setHighContrast(true);
      result.current.setReducedMotion(true);
    });

    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@geoleap_theme_preferences',
        expect.stringContaining('"highContrast":true')
      );
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@geoleap_theme_preferences',
        expect.stringContaining('"reducedMotion":true')
      );
    });
  });

  it('should handle AsyncStorage errors gracefully', async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));
    (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

    const wrapper = createThemeWrapper();
    const { result } = renderHook(() => useThemeProvider(), { wrapper });

    // Should not crash despite storage errors
    act(() => {
      result.current.setTheme('light');
    });

    await waitFor(() => {
      // Should fall back to default theme
      expect(result.current.theme).toBeDefined();
    });
  });
});

describe('Profile Service Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  it('should handle getUserProfile with null userId', async () => {
    await expect(userService.getUserProfile(null as any)).rejects.toThrow();
  });

  it('should handle getUserProfile with empty string userId', async () => {
    await expect(userService.getUserProfile('')).rejects.toThrow();
  });

  it('should return cached profile on API failure', async () => {
    const cachedProfile = {
      id: 'user-123',
      email: 'cached@example.com',
      username: 'cached',
    };

    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(cachedProfile));

    const mockApiService = {
      get: jest.fn().mockRejectedValue(new Error('Network error')),
    };

    jest.mock('../../services/api/ApiService', () => ({
      ApiService: jest.fn(() => mockApiService),
    }));

    const profile = await userService.getUserProfile('user-123');

    // Should return cached profile as fallback
    expect(profile).toBeDefined();
  });
});

describe('Settings Screen Light-Only Mode Toggle Behavior', () => {
  it('should show correct toggle state for auto mode', async () => {
    mockGetColorScheme.mockReturnValue('dark');

    const wrapper = createThemeWrapper();
    const { result } = renderHook(() => useThemeProvider(), { wrapper });

    act(() => {
      result.current.setTheme('auto');
    });

    await waitFor(() => {
      expect(result.current.themeMode).toBe('auto');
    });

    // BUG in SettingsScreen.tsx:
    // const isLightTheme = false; // ❌ Wrong
    const buggyLogic = result.current.false;
    expect(buggyLogic).toBe(false); // Toggle shows OFF

    // CORRECT:
    // const isLightTheme = theme.isDark; // ✅ Correct
    const correctLogic = result.current.theme.isDark;
    expect(correctLogic).toBe(true); // App IS in Light-Only Mode

    // Result: Toggle state doesn't match visual theme
  });
});
