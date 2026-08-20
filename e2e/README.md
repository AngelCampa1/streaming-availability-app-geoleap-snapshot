# GeoLeap E2E Tests

This directory contains the end-to-end tests for the GeoLeap application using Playwright.

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Install Playwright browsers** (if not already installed):
   ```bash
   npm run install:browsers
   ```

3. **Make sure the frontend is running** at `http://localhost:3020`

4. **Run the tests**:
   ```bash
   npm test
   ```

## Available Scripts

- `npm test` - Run all tests headless
- `npm run test:headed` - Run tests with visible browser
- `npm run test:debug` - Run tests in debug mode
- `npm run test:ui` - Run tests with Playwright UI
- `npm run report` - View HTML test report

## Test Files

- `auth.spec.ts` - Authentication flow tests (registration, login, forgot password)
- `dashboard.spec.ts` - Dashboard functionality tests
- `search.spec.ts` - Search functionality tests

## Test Structure

All tests are designed to be true end-to-end tests that:
- Use the UI exclusively (no direct API calls)
- Test real user journeys
- Handle authentication redirects gracefully
- Work with the current application state

## Configuration

- Base URL: `http://localhost:3020`
- Browsers: Chrome, Firefox, Safari
- Timeout: 30 seconds per test
- Retries: 2 on CI

## Running Individual Tests

```bash
# Run specific test file
npx playwright test auth.spec.ts

# Run specific test by name
npx playwright test --grep "should access registration page"

# Run in specific browser
npx playwright test --project=chromium
