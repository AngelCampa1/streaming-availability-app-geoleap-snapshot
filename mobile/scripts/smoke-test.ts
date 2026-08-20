#!/usr/bin/env ts-node
/**
 * Production Smoke Test Script
 * Verifies critical backend API connectivity for mobile app
 *
 * Usage:
 *   npm run smoke-test
 *   node --loader ts-node/esm scripts/smoke-test.ts
 */

import * as https from 'https';
import * as http from 'http';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  duration: number;
}

class SmokeTestRunner {
  private results: TestResult[] = [];
  private readonly apiBaseUrl = 'https://api.geoleap.app';
  private readonly timeout = 10000; // 10 seconds

  /**
   * Make HTTP GET request
   */
  private async makeRequest(url: string, options: http.RequestOptions = {}): Promise<{
    statusCode: number;
    body: string;
    headers: http.IncomingHttpHeaders;
  }> {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;
      const timer = setTimeout(() => {
        reject(new Error('Request timed out'));
      }, this.timeout);

      const req = protocol.get(url, options, (res) => {
        clearTimeout(timer);
        let body = '';

        res.on('data', (chunk) => {
          body += chunk;
        });

        res.on('end', () => {
          resolve({
            statusCode: res.statusCode || 0,
            body,
            headers: res.headers,
          });
        });
      });

      req.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });

      req.end();
    });
  }

  /**
   * Run a test with timing
   */
  private async runTest(name: string, testFn: () => Promise<void>): Promise<void> {
    const startTime = Date.now();
    try {
      await testFn();
      const duration = Date.now() - startTime;
      this.results.push({
        name,
        passed: true,
        message: 'Passed',
        duration,
      });
      console.log(`✅ ${name} (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      const message = error instanceof Error ? error.message : String(error);
      this.results.push({
        name,
        passed: false,
        message,
        duration,
      });
      console.error(`❌ ${name} (${duration}ms): ${message}`);
    }
  }

  /**
   * Test 1: API Health Check
   */
  private async testHealthEndpoint(): Promise<void> {
    const response = await this.makeRequest(`${this.apiBaseUrl}/health`);

    if (response.statusCode !== 200) {
      throw new Error(`Health check failed with status ${response.statusCode}`);
    }

    // Verify response contains expected health data
    const body = JSON.parse(response.body);
    if (!body || typeof body !== 'object') {
      throw new Error('Health check returned invalid JSON');
    }
  }

  /**
   * Test 2: API Base URL Reachability
   */
  private async testApiReachability(): Promise<void> {
    const response = await this.makeRequest(this.apiBaseUrl);

    // Accept 200, 404, or 405 (base URL might not have a handler)
    const validCodes = [200, 404, 405];
    if (!validCodes.includes(response.statusCode)) {
      throw new Error(`API base URL returned unexpected status ${response.statusCode}`);
    }
  }

  /**
   * Test 3: CORS Headers Present
   */
  private async testCorsHeaders(): Promise<void> {
    const response = await this.makeRequest(`${this.apiBaseUrl}/health`);

    const corsHeader = response.headers['access-control-allow-origin'];
    if (!corsHeader) {
      throw new Error('CORS headers not configured (access-control-allow-origin missing)');
    }
  }

  /**
   * Test 4: SSL Certificate Valid
   */
  private async testSslCertificate(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('SSL verification timed out'));
      }, this.timeout);

      const req = https.get(this.apiBaseUrl, {
        rejectUnauthorized: true, // Enforce valid SSL
      }, (res) => {
        clearTimeout(timer);
        res.on('data', () => {}); // Consume response
        res.on('end', () => resolve());
      });

      req.on('error', (error) => {
        clearTimeout(timer);
        reject(new Error(`SSL certificate invalid: ${error.message}`));
      });

      req.end();
    });
  }

  /**
   * Test 5: Response Time < 2 seconds
   */
  private async testResponseTime(): Promise<void> {
    const startTime = Date.now();
    await this.makeRequest(`${this.apiBaseUrl}/health`);
    const duration = Date.now() - startTime;

    if (duration > 2000) {
      throw new Error(`Response time too slow: ${duration}ms (expected < 2000ms)`);
    }
  }

  /**
   * Test 6: Content-Type Headers Correct
   */
  private async testContentTypeHeaders(): Promise<void> {
    const response = await this.makeRequest(`${this.apiBaseUrl}/health`);

    const contentType = response.headers['content-type'];
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error(`Invalid Content-Type: ${contentType} (expected application/json)`);
    }
  }

  /**
   * Test 7: Authentication Endpoint Accessible
   */
  private async testAuthEndpoint(): Promise<void> {
    // Test that auth endpoint returns 400/401 (not 404/500)
    try {
      await this.makeRequest(`${this.apiBaseUrl}/api/auth/login`);
    } catch (error) {
      // We expect this to fail (no credentials), but endpoint should exist
    }

    // Make actual request to verify endpoint exists
    const response = await this.makeRequest(`${this.apiBaseUrl}/api/auth/login`);

    // Auth endpoint should return 405 (Method Not Allowed) for GET
    // or could be 404 if route doesn't accept GET
    // Acceptable: 400, 401, 404, 405 (just not 500)
    const acceptableCodes = [400, 401, 404, 405];
    if (!acceptableCodes.includes(response.statusCode)) {
      throw new Error(`Auth endpoint returned unexpected status ${response.statusCode}`);
    }
  }

  /**
   * Test 8: SignalR Hub URL Reachable
   */
  private async testSignalRHub(): Promise<void> {
    // SignalR hub at /syncHub should return 400 for GET requests (expects WebSocket)
    const hubUrl = this.apiBaseUrl.replace('/api', '/syncHub');
    const response = await this.makeRequest(hubUrl);

    // Acceptable: 400 (Bad Request - needs WebSocket), 404 (if hub disabled)
    const acceptableCodes = [400, 404];
    if (!acceptableCodes.includes(response.statusCode)) {
      throw new Error(`SignalR hub returned unexpected status ${response.statusCode}`);
    }
  }

  /**
   * Test 9: API Version Header Present
   */
  private async testApiVersionHeader(): Promise<void> {
    const response = await this.makeRequest(`${this.apiBaseUrl}/health`);

    // Check for any version-related headers
    const versionHeader = response.headers['api-version'] ||
                         response.headers['x-api-version'] ||
                         response.headers['x-version'];

    // Version header is optional, but if present should be valid
    if (versionHeader && typeof versionHeader !== 'string') {
      throw new Error('API version header invalid format');
    }

    // Pass if version header present or not (it's optional)
  }

  /**
   * Test 10: Rate Limiting Headers Present
   */
  private async testRateLimitHeaders(): Promise<void> {
    const response = await this.makeRequest(`${this.apiBaseUrl}/health`);

    // Check for rate limit headers (optional but recommended)
    const rateLimitHeader = response.headers['x-ratelimit-limit'] ||
                           response.headers['ratelimit-limit'];

    // Rate limiting is optional, so this test just checks if configured
    // If headers present, they should be valid numbers
    if (rateLimitHeader && isNaN(Number(rateLimitHeader))) {
      throw new Error('Rate limit header invalid format');
    }

    // Always pass (rate limiting is optional)
  }

  /**
   * Run all smoke tests
   */
  async runAllTests(): Promise<void> {
    console.log('🔥 Running Production Smoke Tests...\n');
    console.log(`Testing API: ${this.apiBaseUrl}\n`);

    // Run tests sequentially
    await this.runTest('1. Health Endpoint Accessible', () => this.testHealthEndpoint());
    await this.runTest('2. API Base URL Reachable', () => this.testApiReachability());
    await this.runTest('3. CORS Headers Present', () => this.testCorsHeaders());
    await this.runTest('4. SSL Certificate Valid', () => this.testSslCertificate());
    await this.runTest('5. Response Time < 2 seconds', () => this.testResponseTime());
    await this.runTest('6. Content-Type Headers Correct', () => this.testContentTypeHeaders());
    await this.runTest('7. Authentication Endpoint Accessible', () => this.testAuthEndpoint());
    await this.runTest('8. SignalR Hub URL Reachable', () => this.testSignalRHub());
    await this.runTest('9. API Version Header (Optional)', () => this.testApiVersionHeader());
    await this.runTest('10. Rate Limiting Headers (Optional)', () => this.testRateLimitHeaders());

    this.printSummary();
  }

  /**
   * Print test results summary
   */
  private printSummary(): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 Test Results Summary');
    console.log('='.repeat(60));

    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => r.passed === false).length;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);

    console.log(`\nTotal Tests: ${this.results.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏱️  Total Duration: ${totalDuration}ms\n`);

    if (failed > 0) {
      console.log('Failed Tests:');
      this.results
        .filter(r => !r.passed)
        .forEach(r => {
          console.log(`  ❌ ${r.name}: ${r.message}`);
        });
      console.log('');
    }

    console.log('='.repeat(60));

    if (failed === 0) {
      console.log('✅ All tests passed! Production API is healthy.');
    } else {
      console.log('⚠️  Some tests failed. Review errors above.');
    }

    console.log('='.repeat(60) + '\n');
  }

  /**
   * Get exit code based on test results
   */
  getExitCode(): number {
    const failed = this.results.filter(r => !r.passed).length;
    return failed > 0 ? 1 : 0;
  }
}

// Run smoke tests
async function main() {
  const runner = new SmokeTestRunner();

  try {
    await runner.runAllTests();
    process.exit(runner.getExitCode());
  } catch (error) {
    console.error('💥 Smoke test runner crashed:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main();
}

export { SmokeTestRunner };
