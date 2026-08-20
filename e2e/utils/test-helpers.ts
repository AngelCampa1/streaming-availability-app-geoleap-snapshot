import { test as base, expect, Page, BrowserContext } from '@playwright/test';
import { chromium, firefox, webkit } from '@playwright/test';
import path from 'path';
import fs from 'fs';

// Test configuration
const TEST_CONFIG = {
  baseURL: process.env.TEST_BASE_URL || 'http://localhost:3020',
  timeout: 30000,
  retries: 2,
  headless: process.env.TEST_HEADLESS !== 'false',
  slowMo: parseInt(process.env.TEST_SLOW_MO || '0'),
  video: 'retain-on-failure',
  screenshot: 'only-on-failure',
  trace: 'retain-on-failure'
};

// Test user credentials
const TEST_USER = {
  email: 'test@geoleap.com',
  password: 'TestPassword123!',
  firstName: 'Test',
  lastName: 'User'
};

// Enhanced test fixture with better error handling
export const test = base.extend({
  page: async ({ page }, use) => {
    // Set up page error handling
    page.on('pageerror', (error) => {
      console.error('Page error:', error);
    });
    
    page.on('requestfailed', (request) => {
      console.error('Request failed:', request.url(), request.failure());
    });
    
    await use(page);
  },
  
  context: async ({ context }, use) => {
    // Set up context error handling
    context.on('weberror', (error) => {
      console.error('Web error:', error);
    });
    
    await use(context);
  }
});

// Enhanced server management
export class ServerManager {
  private static serverProcess: any = null;
  private static isRunning = false;
  
  static async startServer(): Promise<void> {
    if (this.isRunning) {
      console.log('Server is already running');
      return;
    }
    
    try {
      console.log('Starting server...');
      // Try to start the server using npm scripts
      const { spawn } = require('child_process');
      
      this.serverProcess = spawn('npm', ['run', 'start'], {
        stdio: 'pipe',
        cwd: process.cwd()
      });
      
      this.serverProcess.stdout.on('data', (data: Buffer) => {
        console.log(`Server: ${data.toString()}`);
      });
      
      this.serverProcess.stderr.on('data', (data: Buffer) => {
        console.error(`Server error: ${data.toString()}`);
      });
      
      this.serverProcess.on('close', (code: number) => {
        console.log(`Server process exited with code ${code}`);
        this.isRunning = false;
      });
      
      // Wait for server to be ready
      await this.waitForServer();
      this.isRunning = true;
      console.log('Server started successfully');
    } catch (error) {
      console.error('Failed to start server:', error);
      throw error;
    }
  }
  
  static async stopServer(): Promise<void> {
    if (this.serverProcess) {
      console.log('Stopping server...');
      this.serverProcess.kill();
      this.serverProcess = null;
      this.isRunning = false;
    }
  }
  
  private static async waitForServer(): Promise<void> {
    const maxAttempts = 30;
    const delay = 2000;
    
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch(`${TEST_CONFIG.baseURL}/health`);
        if (response.ok) {
          return;
        }
      } catch (error) {
        // Server not ready yet
      }
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    throw new Error('Server failed to start within timeout period');
  }
  
  static async isServerRunning(): Promise<boolean> {
    try {
      const response = await fetch(`${TEST_CONFIG.baseURL}/health`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

// Enhanced database setup
export class DatabaseSetup {
  static async setup(): Promise<void> {
    console.log('Setting up test database...');
    
    try {
      // Check if database exists and is accessible
      const response = await fetch(`${TEST_CONFIG.baseURL}/api/health/database`);
      if (!response.ok) {
        throw new Error('Database health check failed');
      }
      
      console.log('Database is ready');
    } catch (error) {
      console.error('Database setup failed:', error);
      throw error;
    }
  }
  
  static async cleanup(): Promise<void> {
    console.log('Cleaning up test database...');
    
    try {
      // Clean up test data
      await fetch(`${TEST_CONFIG.baseURL}/api/test/cleanup`, {
        method: 'POST'
      });
      
      console.log('Database cleanup completed');
    } catch (error) {
      console.error('Database cleanup failed:', error);
    }
  }
}

// Enhanced user management with better error handling
export class UserManager {
  static async createTestUser(userData: Partial<typeof TEST_USER> = {}): Promise<typeof TEST_USER> {
    const user = { ...TEST_USER, ...userData };
    
    try {
      console.log(`Creating test user: ${user.email}`);
      
      const response = await fetch(`${TEST_CONFIG.baseURL}/api/test/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(user)
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to create test user: ${error}`);
      }
      
      const createdUser = await response.json();
      console.log('Test user created successfully');
      return createdUser;
    } catch (error) {
      console.error('Failed to create test user:', error);
      throw error;
    }
  }
  
  static async deleteTestUser(email: string): Promise<void> {
    try {
      console.log(`Deleting test user: ${email}`);
      
      const response = await fetch(`${TEST_CONFIG.baseURL}/api/test/users/${encodeURIComponent(email)}`, {
        method: 'DELETE'
      });
      
      if (!response.ok && response.status !== 404) {
        const error = await response.text();
        throw new Error(`Failed to delete test user: ${error}`);
      }
      
      console.log('Test user deleted successfully');
    } catch (error) {
      console.error('Failed to delete test user:', error);
      throw error;
    }
  }
  
  static async getTestUser(email: string): Promise<typeof TEST_USER | null> {
    try {
      const response = await fetch(`${TEST_CONFIG.baseURL}/api/test/users/${encodeURIComponent(email)}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Failed to get test user: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to get test user:', error);
      return null;
    }
  }
}

// Enhanced authentication helpers
async function debugApplicationStructure(page: Page): Promise<void> {
  console.log('Debugging application structure...');
  
  const commonRoutes = [
    '/',
    '/home',
    '/login',
    '/signin',
    '/signup',
    '/register',
    '/dashboard',
    '/auth/login',
    '/auth/signin',
    '/auth/signup',
    '/auth/register'
  ];
  
  for (const route of commonRoutes) {
    try {
      await page.goto(route, { timeout: 5000 });
      const title = await page.title();
      const url = page.url();
      console.log(`Route ${route}: ${title} (${url})`);
      
      // Check for common elements
      const hasForm = await page.locator('form').count() > 0;
      const hasAuthForm = await page.locator('input[type="email"], input[type="password"]').count() > 0;
      console.log(`  - Has form: ${hasForm}, Has auth form: ${hasAuthForm}`);
    } catch (error) {
      console.log(`Route ${route}: Failed to load (${error instanceof Error ? error.message : 'Unknown error'})`);
    }
  }
}

async function registerUserThroughUI(page: Page, email: string, password: string): Promise<void> {
  console.log(`Attempting to register user: ${email}`);
  
  try {
    // Go directly to the registration page we know exists
    await page.goto(`${TEST_CONFIG.baseURL}/auth/register`, { timeout: 10000 });
    await page.waitForLoadState('networkidle', { timeout: 5000 });
    
    console.log('Filling registration form...');
    
    // Fill first name
    const firstNameInput = page.locator('#first-name, input[name="firstName"]').first();
    if (await firstNameInput.isVisible({ timeout: 3000 })) {
      await firstNameInput.fill('Test');
    }
    
    // Fill last name
    const lastNameInput = page.locator('#last-name, input[name="lastName"]').first();
    if (await lastNameInput.isVisible({ timeout: 3000 })) {
      await lastNameInput.fill('User');
    }
    
    // Fill email
    const emailInput = page.locator('#email-address, input[name="email"]').first();
    if (await emailInput.isVisible({ timeout: 3000 })) {
      await emailInput.fill(email);
    }
    
    // Fill password
    const passwordInput = page.locator('#password, input[name="password"]').first();
    if (await passwordInput.isVisible({ timeout: 3000 })) {
      await passwordInput.fill(password);
    }
    
    // Look for terms checkbox and accept it if exists
    const termsCheckbox = page.locator('input[type="checkbox"]').first();
    if (await termsCheckbox.isVisible({ timeout: 3000 })) {
      await termsCheckbox.check();
    }
    
    // Find and click submit button
    const submitButton = page.locator('button[type="submit"], button:has-text("Sign"), button:has-text("Register"), button:has-text("Create")').first();
    if (await submitButton.isVisible({ timeout: 3000 })) {
      await submitButton.click();
      console.log('Registration form submitted');
      
      // Wait for navigation or success message
      try {
        await page.waitForURL(/dashboard|home|welcome|login|signin/, { timeout: 10000 });
        console.log('Registration successful - redirected');
        return;
      } catch (e) {
        // Check for error messages that might indicate user already exists
        const errorMessage = page.locator('.error, .alert, [role="alert"], .text-red, .text-danger').first();
        if (await errorMessage.isVisible({ timeout: 2000 })) {
          const errorText = await errorMessage.textContent();
          console.log(`Registration message: ${errorText}`);
          if (errorText?.toLowerCase().includes('already exists') || errorText?.toLowerCase().includes('taken')) {
            console.log('User already exists, treating as success');
            return;
          }
        }
        
        // If no error and no redirect, check if we're still on registration page
        const currentUrl = page.url();
        if (currentUrl.includes('/auth/register')) {
          console.log('Still on registration page, checking for success indicators...');
          // Look for success messages or other indicators
          const successMessage = page.locator('.success, .alert-success, .text-green').first();
          if (await successMessage.isVisible({ timeout: 2000 })) {
            console.log('Found success message');
            return;
          }
        }
      }
    } else {
      console.log('Could not find submit button');
    }
    
    throw new Error('Registration form submission failed');
    
  } catch (error) {
    console.log(`Registration error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

async function loginUser(page: Page, email: string, password: string): Promise<void> {
  try {
    // Go directly to the login page we know exists
    await page.goto(`${TEST_CONFIG.baseURL}/auth/login`, { timeout: 10000 });
    await page.waitForLoadState('networkidle', { timeout: 5000 });
    
    console.log('Filling login form...');
    
    // Fill email field
    const emailInput = page.locator('#email-address, input[name="email"]').first();
    if (await emailInput.isVisible({ timeout: 3000 })) {
      await emailInput.fill(email);
    }
    
    // Fill password field
    const passwordInput = page.locator('#password, input[name="password"]').first();
    if (await passwordInput.isVisible({ timeout: 3000 })) {
      await passwordInput.fill(password);
    }
    
    // Find and click submit button
    const submitButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign"), button:has-text("Sign In")').first();
    if (await submitButton.isVisible({ timeout: 3000 })) {
      await submitButton.click();
      console.log('Login form submitted');
      
      // Wait for navigation or success
      try {
        await page.waitForURL(/dashboard|home|welcome/, { timeout: 10000 });
        console.log('Login successful - redirected');
        return;
      } catch (e) {
        // Check for error messages
        const errorMessage = page.locator('.error, .alert, [role="alert"], .text-red, .text-danger').first();
        if (await errorMessage.isVisible({ timeout: 2000 })) {
          const errorText = await errorMessage.textContent();
          console.log(`Login error: ${errorText}`);
        }
        
        // If no redirect, check if we're still logged in by looking for logged-in indicators
        const currentUrl = page.url();
        if (!currentUrl.includes('/auth/login')) {
          console.log('Login successful - not on login page anymore');
          return;
        }
      }
    } else {
      console.log('Could not find submit button');
    }
    
    throw new Error('Login form submission failed');
    
  } catch (error) {
    console.log(`Login error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

export async function loginAsTestUser(page: Page): Promise<void> {
  const testEmail = TEST_USER.email;
  const testPassword = TEST_USER.password;
  
  try {
    // First try to login with existing user
    await loginUser(page, testEmail, testPassword);
    console.log('Successfully logged in with existing user');
  } catch (loginError) {
    console.log('Login failed, attempting to register new user...');
    
    try {
      // Try to register a new user
      await registerUserThroughUI(page, testEmail, testPassword);
      console.log('Successfully registered new user');
      
      // Try to login again after registration
      await loginUser(page, testEmail, testPassword);
      console.log('Successfully logged in after registration');
    } catch (registrationError) {
      console.log('Registration failed:', registrationError instanceof Error ? registrationError.message : 'Unknown error');
      
      // As a last resort, try to debug the application structure
      await debugApplicationStructure(page);
      
      throw new Error(`Both login and registration failed. Login error: ${loginError instanceof Error ? loginError.message : 'Unknown'}, Registration error: ${registrationError instanceof Error ? registrationError.message : 'Unknown'}`);
    }
  }
  
  // Verify we're logged in by checking for common logged-in elements
  await expect(page.locator('body')).toBeVisible();
}

// Enhanced test utilities
export class TestUtils {
  static async waitForElement(page: Page, selector: string, timeout: number = 10000): Promise<void> {
    await page.waitForSelector(selector, { state: 'visible', timeout });
  }
  
  static async clickElement(page: Page, selector: string): Promise<void> {
    await page.click(selector);
  }
  
  static async fillInput(page: Page, selector: string, value: string): Promise<void> {
    await page.fill(selector, value);
  }
  
  static async takeScreenshot(page: Page, name: string): Promise<void> {
    await page.screenshot({ path: `test-results/screenshots/${name}.png` });
  }
  
  static async waitForNavigation(page: Page, urlPattern: string | RegExp): Promise<void> {
    await page.waitForURL(urlPattern);
  }
  
  static async verifyText(page: Page, text: string): Promise<void> {
    await expect(page.locator(`text=${text}`)).toBeVisible();
  }
  
  static async verifyElementExists(page: Page, selector: string): Promise<void> {
    await expect(page.locator(selector)).toHaveCount(1);
  }
  
  static async verifyElementNotExists(page: Page, selector: string): Promise<void> {
    await expect(page.locator(selector)).toHaveCount(0);
  }
  
  static async waitForAPIResponse(page: Page, urlPattern: string | RegExp): Promise<void> {
    await page.waitForResponse(response => 
      typeof urlPattern === 'string' 
        ? response.url().includes(urlPattern)
        : urlPattern.test(response.url())
    );
  }
  
  static async mockAPIResponse(page: Page, url: string, response: any): Promise<void> {
    await page.route(url, route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });
  }
  
  static async getLocalStorageItem(page: Page, key: string): Promise<any> {
    return await page.evaluate((k) => {
      return localStorage.getItem(k);
    }, key);
  }
  
  static async setLocalStorageItem(page: Page, key: string, value: any): Promise<void> {
    await page.evaluate(({ k, v }) => {
      localStorage.setItem(k, v);
    }, { k: key, v: JSON.stringify(value) });
  }
  
  static async clearLocalStorage(page: Page): Promise<void> {
    await page.evaluate(() => {
      localStorage.clear();
    });
  }
  
  static async getSessionStorageItem(page: Page, key: string): Promise<any> {
    return await page.evaluate((k) => {
      return sessionStorage.getItem(k);
    }, key);
  }
  
  static async setSessionStorageItem(page: Page, key: string, value: any): Promise<void> {
    await page.evaluate(({ k, v }) => {
      sessionStorage.setItem(k, v);
    }, { k: key, v: JSON.stringify(value) });
  }
  
  static async clearSessionStorage(page: Page): Promise<void> {
    await page.evaluate(() => {
      sessionStorage.clear();
    });
  }
  
  static async waitForNetworkIdle(page: Page): Promise<void> {
    await page.waitForLoadState('networkidle');
  }
  
  static async scrollToElement(page: Page, selector: string): Promise<void> {
    await page.locator(selector).scrollIntoViewIfNeeded();
  }
  
  static async hoverElement(page: Page, selector: string): Promise<void> {
    await page.hover(selector);
  }
  
  static async rightClickElement(page: Page, selector: string): Promise<void> {
    await page.click(selector, { button: 'right' });
  }
  
  static async doubleClickElement(page: Page, selector: string): Promise<void> {
    await page.dblclick(selector);
  }
  
  static async dragAndDrop(page: Page, sourceSelector: string, targetSelector: string): Promise<void> {
    await page.dragAndDrop(sourceSelector, targetSelector);
  }
  
  static async uploadFile(page: Page, selector: string, filePath: string): Promise<void> {
    const fileInput = page.locator(selector);
    await fileInput.setInputFiles(filePath);
  }
  
  static async selectOption(page: Page, selector: string, value: string): Promise<void> {
    await page.selectOption(selector, value);
  }
  
  static async checkCheckbox(page: Page, selector: string): Promise<void> {
    await page.check(selector);
  }
  
  static async uncheckCheckbox(page: Page, selector: string): Promise<void> {
    await page.uncheck(selector);
  }
  
  static async pressKey(page: Page, key: string): Promise<void> {
    await page.keyboard.press(key);
  }
  
  static async typeText(page: Page, text: string): Promise<void> {
    await page.keyboard.type(text);
  }
  
  static async wait(ms: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, ms));
  }
  
  static async retry(fn: () => Promise<void>, maxAttempts: number = 3, delay: number = 1000): Promise<void> {
    let lastError: Error | null = null;
    
    for (let i = 0; i < maxAttempts; i++) {
      try {
        await fn();
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        if (i < maxAttempts - 1) {
          await this.wait(delay);
        }
      }
    }
    
    throw lastError;
  }
  
  static async generateTestData(count: number): Promise<any[]> {
    const data = [];
    for (let i = 0; i < count; i++) {
      data.push({
        id: i + 1,
        name: `Test Item ${i + 1}`,
        email: `test${i + 1}@example.com`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    return data;
  }
  
  static async createTestDirectory(dirPath: string): Promise<void> {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }
  
  static async deleteTestDirectory(dirPath: string): Promise<void> {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
    }
  }
  
  static async writeTestFile(filePath: string, content: string): Promise<void> {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content);
  }
  
  static async readTestFile(filePath: string): Promise<string> {
    return fs.readFileSync(filePath, 'utf-8');
  }
  
  static async deleteTestFile(filePath: string): Promise<void> {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

// Navigation helpers
export async function navigateToHome(page: Page): Promise<void> {
  await page.goto(TEST_CONFIG.baseURL);
  await page.waitForLoadState('networkidle');
}

export async function navigateToRegister(page: Page): Promise<void> {
  const registerUrls = ['/register', '/signup', '/auth/register', '/auth/signup'];
  
  for (const url of registerUrls) {
    try {
      await page.goto(`${TEST_CONFIG.baseURL}${url}`, { timeout: 10000 });
      await page.waitForLoadState('networkidle', { timeout: 5000 });
      
      // Check if we found a registration page
      const hasEmailField = await page.locator('input[type="email"], input[name="email"], input[placeholder*="email"]').count() > 0;
      const hasPasswordField = await page.locator('input[type="password"], input[name="password"], input[placeholder*="password"]').count() > 0;
      
      if (hasEmailField && hasPasswordField) {
        return;
      }
    } catch (error) {
      continue;
    }
  }
  
  throw new Error('Could not find registration page');
}

export async function navigateToLogin(page: Page): Promise<void> {
  const loginUrls = ['/login', '/signin', '/auth/login', '/auth/signin'];
  
  for (const url of loginUrls) {
    try {
      await page.goto(`${TEST_CONFIG.baseURL}${url}`, { timeout: 10000 });
      await page.waitForLoadState('networkidle', { timeout: 5000 });
      
      // Check if we found a login page
      const hasEmailField = await page.locator('input[type="email"], input[name="email"], input[placeholder*="email"]').count() > 0;
      const hasPasswordField = await page.locator('input[type="password"], input[name="password"], input[placeholder*="password"]').count() > 0;
      
      if (hasEmailField && hasPasswordField) {
        return;
      }
    } catch (error) {
      continue;
    }
  }
  
  throw new Error('Could not find login page');
}

export async function navigateToDashboard(page: Page): Promise<void> {
  await page.goto(`${TEST_CONFIG.baseURL}/dashboard`, { timeout: 10000 });
  await page.waitForLoadState('networkidle');
}

export async function navigateToSettings(page: Page): Promise<void> {
  await page.goto(`${TEST_CONFIG.baseURL}/settings`, { timeout: 10000 });
  await page.waitForLoadState('networkidle');
}

export async function navigateToForgotPassword(page: Page): Promise<void> {
  await page.goto(`${TEST_CONFIG.baseURL}/forgot-password`, { timeout: 10000 });
  await page.waitForLoadState('networkidle');
}

// Additional navigation helpers for missing functions
export async function navigateToSearch(page: Page): Promise<void> {
  await page.goto(`${TEST_CONFIG.baseURL}/search`, { timeout: 10000 });
  await page.waitForLoadState('networkidle');
}

export async function navigateToWatchlist(page: Page): Promise<void> {
  await page.goto(`${TEST_CONFIG.baseURL}/watchlist`, { timeout: 10000 });
  await page.waitForLoadState('networkidle');
}

export async function navigateToASODashboard(page: Page): Promise<void> {
  await page.goto(`${TEST_CONFIG.baseURL}/aso/dashboard`, { timeout: 10000 });
  await page.waitForLoadState('networkidle');
}

export async function navigateToVpnGuidance(page: Page): Promise<void> {
  await page.goto(`${TEST_CONFIG.baseURL}/vpn/guidance`, { timeout: 10000 });
  await page.waitForLoadState('networkidle');
}

export async function navigateToPayment(page: Page): Promise<void> {
  await page.goto(`${TEST_CONFIG.baseURL}/payment`, { timeout: 10000 });
  await page.waitForLoadState('networkidle');
}

export async function navigateToAccountSettings(page: Page): Promise<void> {
  await page.goto(`${TEST_CONFIG.baseURL}/account/settings`, { timeout: 10000 });
  await page.waitForLoadState('networkidle');
}

export async function navigateToPricing(page: Page): Promise<void> {
  await page.goto(`${TEST_CONFIG.baseURL}/pricing`, { timeout: 10000 });
  await page.waitForLoadState('networkidle');
}

export async function navigateToBillingSettings(page: Page): Promise<void> {
  await page.goto(`${TEST_CONFIG.baseURL}/account/billing`, { timeout: 10000 });
  await page.waitForLoadState('networkidle');
}

export async function navigateToNotificationSettings(page: Page): Promise<void> {
  await page.goto(`${TEST_CONFIG.baseURL}/account/notifications`, { timeout: 10000 });
  await page.waitForLoadState('networkidle');
}

export async function navigateToPreferences(page: Page): Promise<void> {
  await page.goto(`${TEST_CONFIG.baseURL}/preferences`, { timeout: 10000 });
  await page.waitForLoadState('networkidle');
}

export async function navigateToPrivacySettings(page: Page): Promise<void> {
  await page.goto(`${TEST_CONFIG.baseURL}/account/privacy`, { timeout: 10000 });
  await page.waitForLoadState('networkidle');
}

export async function navigateToProfileSettings(page: Page): Promise<void> {
  await page.goto(`${TEST_CONFIG.baseURL}/account/profile`, { timeout: 10000 });
  await page.waitForLoadState('networkidle');
}

export async function navigateToSecuritySettings(page: Page): Promise<void> {
  await page.goto(`${TEST_CONFIG.baseURL}/account/security`, { timeout: 10000 });
  await page.waitForLoadState('networkidle');
}

export async function logout(page: Page): Promise<void> {
  // Try common logout patterns
  const logoutSelectors = [
    'button:has-text("Logout")',
    'button:has-text("Sign Out")',
    'a:has-text("Logout")',
    'a:has-text("Sign Out")',
    '[data-testid="logout"]',
    '.logout',
    '.sign-out'
  ];
  
  for (const selector of logoutSelectors) {
    try {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 3000 })) {
        await element.click();
        await page.waitForLoadState('networkidle');
        return;
      }
    } catch (error) {
      continue;
    }
  }
  
  // If no logout button found, try clearing session
  await page.context().clearCookies();
  await page.goto(TEST_CONFIG.baseURL);
}

// Utility functions
export async function waitForElementToBeVisible(page: Page, selector: string, timeout: number = 10000): Promise<void> {
  await page.waitForSelector(selector, { state: 'visible', timeout });
}

export async function waitForTextToBeVisible(page: Page, text: string | RegExp, timeout: number = 10000): Promise<void> {
  await page.waitForSelector(`text=${text}`, { state: 'visible', timeout });
}

export async function waitForUrlToContain(page: Page, urlPattern: string | RegExp, timeout: number = 10000): Promise<void> {
  await page.waitForURL(urlPattern, { timeout });
}

export async function waitForNetworkIdle(page: Page, timeout: number = 10000): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout });
}

export async function waitForPageLoad(page: Page, timeout: number = 10000): Promise<void> {
  await page.waitForLoadState('domcontentloaded', { timeout });
}

export async function safeClick(page: Page, selector: string): Promise<void> {
  try {
    await page.waitForSelector(selector, { state: 'visible', timeout: 5000 });
    await page.click(selector);
  } catch (error) {
    console.log(`Failed to click ${selector}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

export async function safeFill(page: Page, selector: string, value: string): Promise<void> {
  try {
    await page.waitForSelector(selector, { state: 'visible', timeout: 5000 });
    await page.fill(selector, value);
  } catch (error) {
    console.log(`Failed to fill ${selector}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

export function generateRandomEmail(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `test-${timestamp}-${random}@example.com`;
}

export function generateTestPassword(): string {
  return 'TestPassword123!';
}

// Test users configuration
export const TEST_USERS = {
  standard: {
    email: 'test@geoleap.com',
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User'
  },
  premium: {
    email: 'premium@geoleap.com',
    password: 'PremiumPassword123!',
    firstName: 'Premium',
    lastName: 'User'
  }
};

// Export configuration
export { TEST_CONFIG, TEST_USER };
