import { test, expect } from '@playwright/test';

test.describe('Setup Verification', () => {
  test('playwright is configured correctly', async () => {
    // This test just verifies Playwright can run
    expect(true).toBe(true);
  });

  test('can import test utilities', async () => {
    // Verify our utilities can be imported
    const { TEST_USERS } = await import('./utils/test-helpers');
    expect(TEST_USERS.standard.email).toBe('test@geoleap.com');
  });

  test('configuration is accessible', async () => {
    // Verify environment can be read
    const backend = process.env.BACKEND_URL || 'http://localhost:8020';
    const frontend = process.env.FRONTEND_URL || 'http://localhost:3020';
    
    expect(backend).toContain('8020');
    expect(frontend).toContain('3020');
  });
});

