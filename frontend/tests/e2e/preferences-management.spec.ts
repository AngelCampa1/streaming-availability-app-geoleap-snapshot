import { test, expect, Page } from '@playwright/test';
import { APIResponse } from '@playwright/test';

// Mock user data for testing
const mockUser = {
  id: 'test-user-123',
  email: 'preferences.e2e@example.com',
  firstName: 'E2E',
  lastName: 'Test'
};

const mockPreferences = {
  userId: mockUser.id,
  emailNotifications: true,
  pushNotifications: false,
  smsNotifications: false,
  systemAlerts: true,
  marketingEmails: false,
  preferredGenre: 'action',
  primaryRegion: 'US',
  twoFactorEnabled: false,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
};

test.describe('User Preferences Management E2E', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();

    // Mock API responses
    await page.route('**/api/auth/user', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockUser)
      });
    });

    await page.route('**/api/preferences/user/**', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockPreferences)
        });
      } else if (route.request().method() === 'PUT') {
        const requestData = route.request().postDataJSON();
        const updatedPreferences = { ...mockPreferences, ...requestData };
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(updatedPreferences)
        });
      }
    });

    await page.route('**/api/preferences/export/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          preferences: mockPreferences,
          exportedAt: new Date().toISOString()
        })
      });
    });

    await page.route('**/api/preferences/delete/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });

    // Navigate to preferences page
    await page.goto('/preferences');
  });

  test('should load and display user preferences', async () => {
    // Wait for preferences to load
    await expect(page.locator('[data-testid=\"preferences-container\"]')).toBeVisible();

    // Check notification preferences
    await expect(page.locator('[data-testid=\"email-notifications\"]')).toBeChecked();
    await expect(page.locator('[data-testid=\"push-notifications\"]')).not.toBeChecked();
    await expect(page.locator('[data-testid=\"sms-notifications\"]')).not.toBeChecked();

    // Check content preferences
    await expect(page.locator('[data-testid=\"preferred-genre\"]')).toHaveValue('action');
    await expect(page.locator('[data-testid=\"primary-region\"]')).toHaveValue('US');

    // Check security preferences
    await expect(page.locator('[data-testid=\"two-factor\"]')).not.toBeChecked();
  });

  test('should update notification preferences', async () => {
    // Wait for page to load
    await expect(page.locator('[data-testid=\"preferences-container\"]')).toBeVisible();

    // Toggle email notifications
    await page.locator('[data-testid=\"email-notifications\"]').click();
    await expect(page.locator('[data-testid=\"email-notifications\"]')).not.toBeChecked();

    // Enable push notifications
    await page.locator('[data-testid=\"push-notifications\"]').click();
    await expect(page.locator('[data-testid=\"push-notifications\"]')).toBeChecked();

    // Save preferences
    await page.locator('[data-testid=\"save-preferences\"]').click();

    // Check for success message
    await expect(page.locator('[data-testid=\"success-message\"]')).toBeVisible();
    await expect(page.locator('[data-testid=\"success-message\"]')).toContainText('Preferences saved successfully');
  });

  test('should update content preferences', async () => {
    await expect(page.locator('[data-testid=\"preferences-container\"]')).toBeVisible();

    // Change preferred genre
    await page.locator('[data-testid=\"preferred-genre\"]').selectOption('comedy');
    await expect(page.locator('[data-testid=\"preferred-genre\"]')).toHaveValue('comedy');

    // Change primary region
    await page.locator('[data-testid=\"primary-region\"]').selectOption('GB');
    await expect(page.locator('[data-testid=\"primary-region\"]')).toHaveValue('GB');

    // Save preferences
    await page.locator('[data-testid=\"save-preferences\"]').click();

    // Verify success
    await expect(page.locator('[data-testid=\"success-message\"]')).toBeVisible();
  });

  test('should update security preferences', async () => {
    await expect(page.locator('[data-testid=\"preferences-container\"]')).toBeVisible();

    // Enable two-factor authentication
    await page.locator('[data-testid=\"two-factor\"]').click();
    await expect(page.locator('[data-testid=\"two-factor\"]')).toBeChecked();

    // Save preferences
    await page.locator('[data-testid=\"save-preferences\"]').click();

    // Verify success
    await expect(page.locator('[data-testid=\"success-message\"]')).toBeVisible();
  });

  test('should auto-save preferences when enabled', async () => {
    await expect(page.locator('[data-testid=\"preferences-container\"]')).toBeVisible();

    // Enable auto-save
    await page.locator('[data-testid=\"auto-save-toggle\"]').click();

    // Make a change
    await page.locator('[data-testid=\"email-notifications\"]').click();

    // Should auto-save without clicking save button
    await expect(page.locator('[data-testid=\"auto-save-indicator\"]')).toBeVisible();
    await expect(page.locator('[data-testid=\"auto-save-indicator\"]')).toContainText('Auto-saved');
  });

  test('should reset preferences to defaults', async () => {
    await expect(page.locator('[data-testid=\"preferences-container\"]')).toBeVisible();

    // Make some changes
    await page.locator('[data-testid=\"email-notifications\"]').click();
    await page.locator('[data-testid=\"preferred-genre\"]').selectOption('drama');

    // Reset to defaults
    await page.locator('[data-testid=\"reset-preferences\"]').click();

    // Confirm reset in dialog
    await expect(page.locator('[data-testid=\"reset-confirmation-dialog\"]')).toBeVisible();
    await page.locator('[data-testid=\"confirm-reset\"]').click();

    // Verify preferences are restored
    await expect(page.locator('[data-testid=\"email-notifications\"]')).toBeChecked();
    await expect(page.locator('[data-testid=\"preferred-genre\"]')).toHaveValue('action');
  });

  test('should handle preference validation errors', async () => {
    // Mock validation error response
    await page.route('**/api/preferences/user/**', async (route) => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Invalid preferences data',
            details: ['Email notifications cannot be disabled when security alerts are enabled']
          })
        });
      }
    }, { times: 1 });

    await expect(page.locator('[data-testid=\"preferences-container\"]')).toBeVisible();

    // Try to make an invalid change
    await page.locator('[data-testid=\"email-notifications\"]').click();
    await page.locator('[data-testid=\"save-preferences\"]').click();

    // Check for error message
    await expect(page.locator('[data-testid=\"error-message\"]')).toBeVisible();
    await expect(page.locator('[data-testid=\"error-message\"]')).toContainText('Invalid preferences data');
  });

  test('should export user preference data', async () => {
    await expect(page.locator('[data-testid=\"preferences-container\"]')).toBeVisible();

    // Set up download handling
    const downloadPromise = page.waitForEvent('download');

    // Click export button
    await page.locator('[data-testid=\"export-data\"]').click();

    // Wait for download
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe(`preferences-${mockUser.id}.json`);

    // Verify success message
    await expect(page.locator('[data-testid=\"export-success\"]')).toBeVisible();
  });

  test('should handle data deletion with confirmation', async () => {
    await expect(page.locator('[data-testid=\"preferences-container\"]')).toBeVisible();

    // Click delete data button
    await page.locator('[data-testid=\"delete-data\"]').click();

    // Confirmation dialog should appear
    await expect(page.locator('[data-testid=\"delete-confirmation-dialog\"]')).toBeVisible();
    await expect(page.locator('[data-testid=\"delete-warning\"]')).toContainText('permanently delete');

    // Confirm deletion
    await page.locator('[data-testid=\"confirm-delete\"]').click();

    // Verify success
    await expect(page.locator('[data-testid=\"delete-success\"]')).toBeVisible();
    await expect(page.locator('[data-testid=\"delete-success\"]')).toContainText('Data deleted successfully');
  });

  test('should cancel data deletion', async () => {
    await expect(page.locator('[data-testid=\"preferences-container\"]')).toBeVisible();

    // Click delete data button
    await page.locator('[data-testid=\"delete-data\"]').click();

    // Cancel deletion
    await page.locator('[data-testid=\"cancel-delete\"]').click();

    // Dialog should close, preferences should remain
    await expect(page.locator('[data-testid=\"delete-confirmation-dialog\"]')).not.toBeVisible();
    await expect(page.locator('[data-testid=\"preferences-container\"]')).toBeVisible();
  });

  test('should maintain accessibility standards', async () => {
    await expect(page.locator('[data-testid=\"preferences-container\"]')).toBeVisible();

    // Check for proper heading structure
    await expect(page.locator('h1')).toContainText('Preferences');
    await expect(page.locator('h2').first()).toBeVisible();

    // Check for proper form labels
    const emailLabel = page.locator('label[for=\"email-notifications\"]');
    await expect(emailLabel).toBeVisible();

    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid=\"email-notifications\"]')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid=\"push-notifications\"]')).toBeFocused();

    // Test keyboard interaction
    await page.keyboard.press('Space');
    await expect(page.locator('[data-testid=\"push-notifications\"]')).toBeChecked();

    // Check ARIA attributes
    const preferenceSection = page.locator('[data-testid=\"notification-section\"]');
    await expect(preferenceSection).toHaveAttribute('role', 'region');
    await expect(preferenceSection).toHaveAttribute('aria-labelledby');
  });

  test('should work on mobile devices', async () => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await expect(page.locator('[data-testid=\"preferences-container\"]')).toBeVisible();

    // Check mobile-specific UI elements
    await expect(page.locator('[data-testid=\"mobile-menu-button\"]')).toBeVisible();

    // Test mobile navigation
    await page.locator('[data-testid=\"mobile-menu-button\"]').click();
    await expect(page.locator('[data-testid=\"mobile-menu\"]')).toBeVisible();

    // Test mobile form interaction
    await page.locator('[data-testid=\"email-notifications\"]').tap();
    await expect(page.locator('[data-testid=\"email-notifications\"]')).not.toBeChecked();

    // Test mobile save action
    await page.locator('[data-testid=\"save-preferences\"]').tap();
    await expect(page.locator('[data-testid=\"success-message\"]')).toBeVisible();
  });

  test('should handle network connectivity issues', async () => {
    await expect(page.locator('[data-testid=\"preferences-container\"]')).toBeVisible();

    // Simulate network failure
    await page.route('**/api/preferences/user/**', async (route) => {
      await route.abort();
    }, { times: 1 });

    // Try to save preferences
    await page.locator('[data-testid=\"email-notifications\"]').click();
    await page.locator('[data-testid=\"save-preferences\"]').click();

    // Check for network error message
    await expect(page.locator('[data-testid=\"network-error\"]')).toBeVisible();
    await expect(page.locator('[data-testid=\"network-error\"]')).toContainText('Network error');

    // Check for retry button
    await expect(page.locator('[data-testid=\"retry-save\"]')).toBeVisible();
  });

  test('should validate input constraints', async () => {
    await expect(page.locator('[data-testid=\"preferences-container\"]')).toBeVisible();

    // Test maximum notification limits
    const maxNotificationsInput = page.locator('[data-testid=\"max-notifications-per-hour\"]');
    await maxNotificationsInput.fill('999');

    // Should show validation error for excessive value
    await page.locator('[data-testid=\"save-preferences\"]').click();
    await expect(page.locator('[data-testid=\"validation-error\"]')).toContainText('Maximum notifications per hour cannot exceed 100');

    // Test negative values
    await maxNotificationsInput.fill('-5');
    await page.locator('[data-testid=\"save-preferences\"]').click();
    await expect(page.locator('[data-testid=\"validation-error\"]')).toContainText('Value must be positive');

    // Test valid value
    await maxNotificationsInput.fill('10');
    await page.locator('[data-testid=\"save-preferences\"]').click();
    await expect(page.locator('[data-testid=\"success-message\"]')).toBeVisible();
  });

  test('should persist preferences across page reloads', async () => {
    await expect(page.locator('[data-testid=\"preferences-container\"]')).toBeVisible();

    // Make changes
    await page.locator('[data-testid=\"email-notifications\"]').click();
    await page.locator('[data-testid=\"preferred-genre\"]').selectOption('horror');

    // Save preferences
    await page.locator('[data-testid=\"save-preferences\"]').click();
    await expect(page.locator('[data-testid=\"success-message\"]')).toBeVisible();

    // Reload page
    await page.reload();

    // Verify preferences persisted
    await expect(page.locator('[data-testid=\"preferences-container\"]')).toBeVisible();
    await expect(page.locator('[data-testid=\"email-notifications\"]')).not.toBeChecked();
    await expect(page.locator('[data-testid=\"preferred-genre\"]')).toHaveValue('horror');
  });

  test('should show loading states appropriately', async () => {
    // Delay API response to test loading state
    await page.route('**/api/preferences/user/**', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockPreferences)
      });
    }, { times: 1 });

    await page.goto('/preferences');

    // Check for loading indicator
    await expect(page.locator('[data-testid=\"preferences-loading\"]')).toBeVisible();
    await expect(page.locator('[data-testid=\"preferences-loading\"]')).toContainText('Loading preferences');

    // Wait for preferences to load
    await expect(page.locator('[data-testid=\"preferences-container\"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid=\"preferences-loading\"]')).not.toBeVisible();
  });
});