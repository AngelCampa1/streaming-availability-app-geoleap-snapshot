#!/usr/bin/env node

/**
 * Complete mobile app coverage analysis
 * Breaks down coverage by directory/category
 */

const fs = require('fs');
const path = require('path');

const coverageFile = path.join(__dirname, '..', 'coverage', 'coverage-final.json');

if (!fs.existsSync(coverageFile)) {
  console.error('❌ Coverage file not found. Run: npm test -- --coverage --watchAll=false');
  process.exit(1);
}

const coverage = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));

// Category mapping
const categories = {
  services: { files: [], stats: { covered: 0, total: 0, branches: { covered: 0, total: 0 }, functions: { covered: 0, total: 0 } } },
  components: { files: [], stats: { covered: 0, total: 0, branches: { covered: 0, total: 0 }, functions: { covered: 0, total: 0 } } },
  screens: { files: [], stats: { covered: 0, total: 0, branches: { covered: 0, total: 0 }, functions: { covered: 0, total: 0 } } },
  contexts: { files: [], stats: { covered: 0, total: 0, branches: { covered: 0, total: 0 }, functions: { covered: 0, total: 0 } } },
  hooks: { files: [], stats: { covered: 0, total: 0, branches: { covered: 0, total: 0 }, functions: { covered: 0, total: 0 } } },
  navigation: { files: [], stats: { covered: 0, total: 0, branches: { covered: 0, total: 0 }, functions: { covered: 0, total: 0 } } },
  utils: { files: [], stats: { covered: 0, total: 0, branches: { covered: 0, total: 0 }, functions: { covered: 0, total: 0 } } },
  config: { files: [], stats: { covered: 0, total: 0, branches: { covered: 0, total: 0 }, functions: { covered: 0, total: 0 } } },
  other: { files: [], stats: { covered: 0, total: 0, branches: { covered: 0, total: 0 }, functions: { covered: 0, total: 0 } } },
};

let grandTotal = { covered: 0, total: 0, branches: { covered: 0, total: 0 }, functions: { covered: 0, total: 0 } };

for (const [file, data] of Object.entries(coverage)) {
  const normalizedFile = file.replace(/\\/g, '/');

  // Skip test files and mocks
  if (normalizedFile.includes('.test.') ||
      normalizedFile.includes('__tests__') ||
      normalizedFile.includes('__mocks__')) {
    continue;
  }

  // Only process src files
  if (!normalizedFile.includes('/src/')) {
    continue;
  }

  const statements = data.s || {};
  const branches = data.b || {};
  const functions = data.f || {};

  const stmtCovered = Object.values(statements).filter(v => v > 0).length;
  const stmtTotal = Object.keys(statements).length;
  const stmtPct = stmtTotal > 0 ? (stmtCovered / stmtTotal * 100) : 0;

  const branchCovered = Object.values(branches).flat().filter(v => v > 0).length;
  const branchTotal = Object.values(branches).flat().length;

  const funcCovered = Object.values(functions).filter(v => v > 0).length;
  const funcTotal = Object.keys(functions).length;

  // Categorize file
  let category = 'other';
  if (normalizedFile.includes('/services/')) category = 'services';
  else if (normalizedFile.includes('/components/')) category = 'components';
  else if (normalizedFile.includes('/screens/')) category = 'screens';
  else if (normalizedFile.includes('/contexts/')) category = 'contexts';
  else if (normalizedFile.includes('/hooks/')) category = 'hooks';
  else if (normalizedFile.includes('/navigation/')) category = 'navigation';
  else if (normalizedFile.includes('/utils/')) category = 'utils';
  else if (normalizedFile.includes('/config/')) category = 'config';

  const fileInfo = {
    file: path.basename(file),
    path: normalizedFile.split('/src/')[1] || normalizedFile,
    statements: { covered: stmtCovered, total: stmtTotal, pct: stmtPct },
    branches: { covered: branchCovered, total: branchTotal },
    functions: { covered: funcCovered, total: funcTotal },
  };

  categories[category].files.push(fileInfo);
  categories[category].stats.covered += stmtCovered;
  categories[category].stats.total += stmtTotal;
  categories[category].stats.branches.covered += branchCovered;
  categories[category].stats.branches.total += branchTotal;
  categories[category].stats.functions.covered += funcCovered;
  categories[category].stats.functions.total += funcTotal;

  grandTotal.covered += stmtCovered;
  grandTotal.total += stmtTotal;
  grandTotal.branches.covered += branchCovered;
  grandTotal.branches.total += branchTotal;
  grandTotal.functions.covered += funcCovered;
  grandTotal.functions.total += funcTotal;
}

// Print summary by category
console.log('\n📊 COMPLETE MOBILE APP COVERAGE ANALYSIS\n');
console.log('═'.repeat(110));
console.log('Category'.padEnd(20), 'Files'.padEnd(10), 'Statements'.padEnd(25), 'Branches'.padEnd(25), 'Functions'.padEnd(25));
console.log('─'.repeat(110));

const categoryOrder = ['services', 'components', 'screens', 'contexts', 'hooks', 'navigation', 'utils', 'config', 'other'];

categoryOrder.forEach(cat => {
  const stats = categories[cat].stats;
  const fileCount = categories[cat].files.length;

  if (fileCount === 0) return;

  const stmtPct = stats.total > 0 ? (stats.covered / stats.total * 100) : 0;
  const branchPct = stats.branches.total > 0 ? (stats.branches.covered / stats.branches.total * 100) : 0;
  const funcPct = stats.functions.total > 0 ? (stats.functions.covered / stats.functions.total * 100) : 0;

  const stmtStr = `${stmtPct.toFixed(1)}% (${stats.covered}/${stats.total})`;
  const branchStr = `${branchPct.toFixed(1)}% (${stats.branches.covered}/${stats.branches.total})`;
  const funcStr = `${funcPct.toFixed(1)}% (${stats.functions.covered}/${stats.functions.total})`;

  console.log(
    cat.padEnd(20),
    fileCount.toString().padEnd(10),
    stmtStr.padEnd(25),
    branchStr.padEnd(25),
    funcStr.padEnd(25)
  );
});

console.log('═'.repeat(110));

// Grand total
const grandStmtPct = grandTotal.total > 0 ? (grandTotal.covered / grandTotal.total * 100) : 0;
const grandBranchPct = grandTotal.branches.total > 0 ? (grandTotal.branches.covered / grandTotal.branches.total * 100) : 0;
const grandFuncPct = grandTotal.functions.total > 0 ? (grandTotal.functions.covered / grandTotal.functions.total * 100) : 0;

console.log('\n📈 OVERALL MOBILE APP COVERAGE:\n');
console.log(`Statements: ${grandStmtPct.toFixed(2)}% (${grandTotal.covered}/${grandTotal.total})`);
console.log(`Branches:   ${grandBranchPct.toFixed(2)}% (${grandTotal.branches.covered}/${grandTotal.branches.total})`);
console.log(`Functions:  ${grandFuncPct.toFixed(2)}% (${grandTotal.functions.covered}/${grandTotal.functions.total})`);

// Show files with 0% coverage in each category
console.log('\n🔴 FILES WITH 0% COVERAGE BY CATEGORY:\n');

categoryOrder.forEach(cat => {
  const zeroCoverageFiles = categories[cat].files.filter(f => f.statements.pct === 0);
  if (zeroCoverageFiles.length > 0) {
    console.log(`\n${cat.toUpperCase()} (${zeroCoverageFiles.length} files):`);
    zeroCoverageFiles.slice(0, 10).forEach(f => {
      console.log(`  - ${f.file.padEnd(50)} (${f.statements.total} statements)`);
    });
    if (zeroCoverageFiles.length > 10) {
      console.log(`  ... and ${zeroCoverageFiles.length - 10} more`);
    }
  }
});

// Coverage distribution
console.log('\n🎯 COVERAGE DISTRIBUTION BY FILE:\n');
const allFiles = Object.values(categories).flatMap(c => c.files);
const highCoverage = allFiles.filter(f => f.statements.pct >= 80);
const mediumCoverage = allFiles.filter(f => f.statements.pct >= 50 && f.statements.pct < 80);
const lowCoverage = allFiles.filter(f => f.statements.pct > 0 && f.statements.pct < 50);
const zeroCoverage = allFiles.filter(f => f.statements.pct === 0);

console.log(`✅ High Coverage (≥80%):     ${highCoverage.length} files`);
console.log(`⚠️  Medium Coverage (50-79%):  ${mediumCoverage.length} files`);
console.log(`❌ Low Coverage (1-49%):      ${lowCoverage.length} files`);
console.log(`🚫 Zero Coverage (0%):        ${zeroCoverage.length} files`);
console.log(`\nTotal Files Analyzed: ${allFiles.length}`);

console.log('\n');
