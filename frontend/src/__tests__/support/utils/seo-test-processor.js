/**
 * SEO Test Results Processor
 * Processes test results to extract SEO-specific metrics and generate reports
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
/* eslint-enable @typescript-eslint/no-require-imports */

function processTestResults(testResults) {
  const seoMetrics = {
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    skippedTests: 0,
    testCategories: {
      unit: { passed: 0, failed: 0, total: 0, duration: 0 },
      integration: { passed: 0, failed: 0, total: 0, duration: 0 },
      performance: { passed: 0, failed: 0, total: 0, duration: 0 },
      accessibility: { passed: 0, failed: 0, total: 0, duration: 0 },
      seoValidation: { passed: 0, failed: 0, total: 0, duration: 0 },
      responsive: { passed: 0, failed: 0, total: 0, duration: 0 },
      e2e: { passed: 0, failed: 0, total: 0, duration: 0 },
      load: { passed: 0, failed: 0, total: 0, duration: 0 },
    },
    performanceMetrics: {
      averageTestDuration: 0,
      slowestTests: [],
      fastestTests: [],
      performanceBudgetViolations: [],
    },
    coverageMetrics: {
      seoLibraries: null,
      contentComponents: null,
      overallCoverage: null,
    },
    seoCompliance: {
      metaTagTests: { passed: 0, failed: 0 },
      structuredDataTests: { passed: 0, failed: 0 },
      accessibilityTests: { passed: 0, failed: 0 },
      performanceTests: { passed: 0, failed: 0 },
    },
  };

  // Process each test suite
  testResults.testResults.forEach(testResult => {
    const filePath = testResult.testFilePath;
    const duration = testResult.perfStats.end - testResult.perfStats.start;

    // Categorize tests based on file path
    let category = 'unit';
    if (filePath.includes('/integration/')) category = 'integration';
    else if (filePath.includes('/performance/')) category = 'performance';
    else if (filePath.includes('/accessibility/')) category = 'accessibility';
    else if (filePath.includes('/seo/')) category = 'seoValidation';
    else if (filePath.includes('/responsive/')) category = 'responsive';
    else if (filePath.includes('/e2e/')) category = 'e2e';
    else if (filePath.includes('/load/')) category = 'load';

    // Update category metrics
    seoMetrics.testCategories[category].total += testResult.numTotalTests;
    seoMetrics.testCategories[category].passed += testResult.numPassingTests;
    seoMetrics.testCategories[category].failed += testResult.numFailingTests;
    seoMetrics.testCategories[category].duration += duration;

    // Update overall metrics
    seoMetrics.totalTests += testResult.numTotalTests;
    seoMetrics.passedTests += testResult.numPassingTests;
    seoMetrics.failedTests += testResult.numFailingTests;
    seoMetrics.skippedTests += testResult.numPendingTests;

    // Track slow and fast tests
    testResult.testResults.forEach(test => {
      const testDuration = test.duration || 0;
      const testInfo = {
        name: test.fullName,
        file: path.basename(filePath),
        duration: testDuration,
        category,
      };

      if (testDuration > 5000) {
        // Tests over 5 seconds
        seoMetrics.performanceMetrics.slowestTests.push(testInfo);
      } else if (testDuration < 100) {
        // Tests under 100ms
        seoMetrics.performanceMetrics.fastestTests.push(testInfo);
      }

      // Check for performance budget violations
      if (category === 'performance' && testDuration > 1000) {
        seoMetrics.performanceMetrics.performanceBudgetViolations.push({
          ...testInfo,
          budget: 1000,
          actual: testDuration,
        });
      }

      // Categorize SEO compliance tests
      const testName = test.fullName.toLowerCase();
      if (testName.includes('meta') || testName.includes('title') || testName.includes('description')) {
        seoMetrics.seoCompliance.metaTagTests.total = (seoMetrics.seoCompliance.metaTagTests.total || 0) + 1;
        if (test.status === 'passed') {
          seoMetrics.seoCompliance.metaTagTests.passed++;
        } else if (test.status === 'failed') {
          seoMetrics.seoCompliance.metaTagTests.failed++;
        }
      }

      if (testName.includes('schema') || testName.includes('structured') || testName.includes('json-ld')) {
        seoMetrics.seoCompliance.structuredDataTests.total =
          (seoMetrics.seoCompliance.structuredDataTests.total || 0) + 1;
        if (test.status === 'passed') {
          seoMetrics.seoCompliance.structuredDataTests.passed++;
        } else if (test.status === 'failed') {
          seoMetrics.seoCompliance.structuredDataTests.failed++;
        }
      }

      if (testName.includes('accessibility') || testName.includes('wcag') || testName.includes('aria')) {
        seoMetrics.seoCompliance.accessibilityTests.total =
          (seoMetrics.seoCompliance.accessibilityTests.total || 0) + 1;
        if (test.status === 'passed') {
          seoMetrics.seoCompliance.accessibilityTests.passed++;
        } else if (test.status === 'failed') {
          seoMetrics.seoCompliance.accessibilityTests.failed++;
        }
      }

      if (testName.includes('performance') || testName.includes('core web vitals') || testName.includes('load')) {
        seoMetrics.seoCompliance.performanceTests.total = (seoMetrics.seoCompliance.performanceTests.total || 0) + 1;
        if (test.status === 'passed') {
          seoMetrics.seoCompliance.performanceTests.passed++;
        } else if (test.status === 'failed') {
          seoMetrics.seoCompliance.performanceTests.failed++;
        }
      }
    });
  });

  // Calculate performance metrics
  const allTestDurations = [];
  testResults.testResults.forEach(result => {
    result.testResults.forEach(test => {
      if (test.duration) {
        allTestDurations.push(test.duration);
      }
    });
  });

  if (allTestDurations.length > 0) {
    seoMetrics.performanceMetrics.averageTestDuration =
      allTestDurations.reduce((a, b) => a + b, 0) / allTestDurations.length;
  }

  // Sort performance arrays
  seoMetrics.performanceMetrics.slowestTests.sort((a, b) => b.duration - a.duration);
  seoMetrics.performanceMetrics.fastestTests.sort((a, b) => a.duration - b.duration);

  // Limit arrays to top 10
  seoMetrics.performanceMetrics.slowestTests = seoMetrics.performanceMetrics.slowestTests.slice(0, 10);
  seoMetrics.performanceMetrics.fastestTests = seoMetrics.performanceMetrics.fastestTests.slice(0, 10);

  // Extract coverage information if available
  if (testResults.coverageMap) {
    const coverageData = testResults.coverageMap.getCoverageSummary();
    seoMetrics.coverageMetrics.overallCoverage = {
      lines: coverageData.lines.pct,
      statements: coverageData.statements.pct,
      functions: coverageData.functions.pct,
      branches: coverageData.branches.pct,
    };
  }

  // Generate SEO test summary report
  const reportPath = path.join(process.cwd(), 'test-results', 'seo', 'seo-metrics-summary.json');
  const reportDir = path.dirname(reportPath);

  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  fs.writeFileSync(reportPath, JSON.stringify(seoMetrics, null, 2));

  // Generate human-readable report
  const humanReadableReport = generateHumanReadableReport(seoMetrics);
  const textReportPath = path.join(reportDir, 'seo-test-summary.txt');
  fs.writeFileSync(textReportPath, humanReadableReport);

  // Generate CSV report for tracking over time
  const csvReport = generateCSVReport(seoMetrics);
  const csvReportPath = path.join(reportDir, 'seo-metrics.csv');

  // Append to CSV if exists, create if doesn't
  const csvHeader =
    'timestamp,total_tests,passed_tests,failed_tests,success_rate,avg_duration,meta_tag_tests,structured_data_tests,accessibility_tests,performance_tests\n';
  const csvExists = fs.existsSync(csvReportPath);

  if (!csvExists) {
    fs.writeFileSync(csvReportPath, csvHeader);
  }

  fs.appendFileSync(csvReportPath, csvReport + '\n');

  /* eslint-disable no-console */
  console.log('\n🎯 SEO Test Results Summary:');
  console.log(`✅ Total Tests: ${seoMetrics.totalTests}`);
  console.log(
    `✅ Passed: ${seoMetrics.passedTests} (${((seoMetrics.passedTests / seoMetrics.totalTests) * 100).toFixed(1)}%)`
  );
  console.log(`❌ Failed: ${seoMetrics.failedTests}`);
  console.log(`⏱️  Average Duration: ${seoMetrics.performanceMetrics.averageTestDuration.toFixed(0)}ms`);
  /* eslint-enable no-console */

  /* eslint-disable no-console */
  if (seoMetrics.performanceMetrics.performanceBudgetViolations.length > 0) {
    console.log(
      `⚠️  Performance Budget Violations: ${seoMetrics.performanceMetrics.performanceBudgetViolations.length}`
    );
  }

  console.log('\n📊 SEO Compliance:');
  console.log(
    `   Meta Tags: ${seoMetrics.seoCompliance.metaTagTests.passed}/${seoMetrics.seoCompliance.metaTagTests.total || 0} passed`
  );
  console.log(
    `   Structured Data: ${seoMetrics.seoCompliance.structuredDataTests.passed}/${seoMetrics.seoCompliance.structuredDataTests.total || 0} passed`
  );
  console.log(
    `   Accessibility: ${seoMetrics.seoCompliance.accessibilityTests.passed}/${seoMetrics.seoCompliance.accessibilityTests.total || 0} passed`
  );
  console.log(
    `   Performance: ${seoMetrics.seoCompliance.performanceTests.passed}/${seoMetrics.seoCompliance.performanceTests.total || 0} passed`
  );

  console.log(`\n📝 Detailed reports saved to: ${reportDir}`);
  /* eslint-enable no-console */

  return testResults;
}

function generateHumanReadableReport(metrics) {
  const timestamp = new Date().toISOString();

  return `
SEO Test Suite Results
Generated: ${timestamp}

=== OVERALL SUMMARY ===
Total Tests: ${metrics.totalTests}
Passed: ${metrics.passedTests} (${((metrics.passedTests / metrics.totalTests) * 100).toFixed(1)}%)
Failed: ${metrics.failedTests} (${((metrics.failedTests / metrics.totalTests) * 100).toFixed(1)}%)
Skipped: ${metrics.skippedTests}

=== CATEGORY BREAKDOWN ===
${Object.entries(metrics.testCategories)
  .map(
    ([category, stats]) =>
      `${category.toUpperCase()}: ${stats.passed}/${stats.total} passed (${stats.total > 0 ? ((stats.passed / stats.total) * 100).toFixed(1) : 0}%) - ${(stats.duration / 1000).toFixed(2)}s`
  )
  .join('\n')}

=== PERFORMANCE METRICS ===
Average Test Duration: ${metrics.performanceMetrics.averageTestDuration.toFixed(0)}ms

Slowest Tests:
${metrics.performanceMetrics.slowestTests
  .slice(0, 5)
  .map((test, i) => `${i + 1}. ${test.name} (${test.file}) - ${test.duration}ms`)
  .join('\n')}

Performance Budget Violations:
${
  metrics.performanceMetrics.performanceBudgetViolations.length > 0
    ? metrics.performanceMetrics.performanceBudgetViolations
        .map(violation => `- ${violation.name}: ${violation.actual}ms (budget: ${violation.budget}ms)`)
        .join('\n')
    : 'None'
}

=== SEO COMPLIANCE ===
Meta Tags: ${metrics.seoCompliance.metaTagTests.passed}/${metrics.seoCompliance.metaTagTests.total || 0} passed
Structured Data: ${metrics.seoCompliance.structuredDataTests.passed}/${metrics.seoCompliance.structuredDataTests.total || 0} passed
Accessibility: ${metrics.seoCompliance.accessibilityTests.passed}/${metrics.seoCompliance.accessibilityTests.total || 0} passed
Performance: ${metrics.seoCompliance.performanceTests.passed}/${metrics.seoCompliance.performanceTests.total || 0} passed

${
  metrics.coverageMetrics.overallCoverage
    ? `
=== CODE COVERAGE ===
Lines: ${metrics.coverageMetrics.overallCoverage.lines}%
Statements: ${metrics.coverageMetrics.overallCoverage.statements}%
Functions: ${metrics.coverageMetrics.overallCoverage.functions}%
Branches: ${metrics.coverageMetrics.overallCoverage.branches}%
`
    : ''
}
`;
}

function generateCSVReport(metrics) {
  const timestamp = new Date().toISOString();
  const successRate = metrics.totalTests > 0 ? ((metrics.passedTests / metrics.totalTests) * 100).toFixed(2) : '0';

  return [
    timestamp,
    metrics.totalTests,
    metrics.passedTests,
    metrics.failedTests,
    successRate,
    metrics.performanceMetrics.averageTestDuration.toFixed(0),
    metrics.seoCompliance.metaTagTests.passed,
    metrics.seoCompliance.structuredDataTests.passed,
    metrics.seoCompliance.accessibilityTests.passed,
    metrics.seoCompliance.performanceTests.passed,
  ].join(',');
}

module.exports = processTestResults;

// Add tests for Jest
if (typeof describe !== 'undefined') {
  describe('SEO Test Processor', () => {
    it('should process test results correctly', () => {
      const mockTestResults = {
        testResults: [
          {
            testFilePath: '/test/seo/test.js',
            numTotalTests: 1,
            numPassingTests: 1,
            numFailingTests: 0,
            numPendingTests: 0,
            perfStats: { start: 0, end: 100 },
            testResults: [
              {
                fullName: 'meta tag test',
                status: 'passed',
                duration: 50,
              },
            ],
          },
        ],
      };

      const result = processTestResults(mockTestResults);
      expect(result).toBeDefined();
    });
  });
}
