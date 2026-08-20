#!/usr/bin/env node

/**
 * Analyze code coverage for services directory
 * Parses coverage-final.json and generates services-specific metrics
 */

const fs = require('fs');
const path = require('path');

const coverageFile = path.join(__dirname, '..', 'coverage', 'coverage-final.json');

if (!fs.existsSync(coverageFile)) {
  console.error('❌ Coverage file not found. Run: npm test -- --coverage --watchAll=false');
  process.exit(1);
}

const coverage = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));

// Extract services coverage
const servicesData = [];
let totalStatements = { covered: 0, total: 0 };
let totalBranches = { covered: 0, total: 0 };
let totalFunctions = { covered: 0, total: 0 };
let totalLines = { covered: 0, total: 0 };

for (const [file, data] of Object.entries(coverage)) {
  // Normalize path separators for cross-platform compatibility
  const normalizedFile = file.replace(/\\/g, '/');

  // Only include files from /services/ directory, exclude tests/mocks
  if (normalizedFile.includes('/services/') &&
      !normalizedFile.includes('.test.') &&
      !normalizedFile.includes('__tests__') &&
      !normalizedFile.includes('__mocks__')) {

    const fileName = path.basename(file);
    const relativePath = normalizedFile.split('/services/')[1] || normalizedFile;

    const statements = data.s || {};
    const branches = data.b || {};
    const functions = data.f || {};
    const lines = data.l || {};

    const stmtCovered = Object.values(statements).filter(v => v > 0).length;
    const stmtTotal = Object.keys(statements).length;
    const stmtPct = stmtTotal > 0 ? (stmtCovered / stmtTotal * 100) : 0;

    const branchCovered = Object.values(branches).flat().filter(v => v > 0).length;
    const branchTotal = Object.values(branches).flat().length;
    const branchPct = branchTotal > 0 ? (branchCovered / branchTotal * 100) : 0;

    const funcCovered = Object.values(functions).filter(v => v > 0).length;
    const funcTotal = Object.keys(functions).length;
    const funcPct = funcTotal > 0 ? (funcCovered / funcTotal * 100) : 0;

    const lineCovered = Object.values(lines).filter(v => v > 0).length;
    const lineTotal = Object.keys(lines).length;
    const linePct = lineTotal > 0 ? (lineCovered / lineTotal * 100) : 0;

    servicesData.push({
      file: fileName,
      path: relativePath,
      statements: { covered: stmtCovered, total: stmtTotal, pct: stmtPct },
      branches: { covered: branchCovered, total: branchTotal, pct: branchPct },
      functions: { covered: funcCovered, total: funcTotal, pct: funcPct },
      lines: { covered: lineCovered, total: lineTotal, pct: linePct },
    });

    totalStatements.covered += stmtCovered;
    totalStatements.total += stmtTotal;
    totalBranches.covered += branchCovered;
    totalBranches.total += branchTotal;
    totalFunctions.covered += funcCovered;
    totalFunctions.total += funcTotal;
    totalLines.covered += lineCovered;
    totalLines.total += lineTotal;
  }
}

// Sort by statement coverage percentage
servicesData.sort((a, b) => b.statements.pct - a.statements.pct);

// Print results
console.log('\n📊 SERVICES COVERAGE ANALYSIS\n');
console.log('═'.repeat(100));
console.log('File'.padEnd(40), 'Stmts'.padEnd(15), 'Branch'.padEnd(15), 'Funcs'.padEnd(15), 'Lines'.padEnd(15));
console.log('─'.repeat(100));

servicesData.forEach(item => {
  const stmtStr = `${item.statements.pct.toFixed(1)}% (${item.statements.covered}/${item.statements.total})`;
  const branchStr = `${item.branches.pct.toFixed(1)}% (${item.branches.covered}/${item.branches.total})`;
  const funcStr = `${item.functions.pct.toFixed(1)}% (${item.functions.covered}/${item.functions.total})`;
  const lineStr = `${item.lines.pct.toFixed(1)}% (${item.lines.covered}/${item.lines.total})`;

  console.log(
    item.file.padEnd(40),
    stmtStr.padEnd(15),
    branchStr.padEnd(15),
    funcStr.padEnd(15),
    lineStr.padEnd(15)
  );
});

console.log('═'.repeat(100));

// Overall services metrics
const overallStmtPct = totalStatements.total > 0 ? (totalStatements.covered / totalStatements.total * 100) : 0;
const overallBranchPct = totalBranches.total > 0 ? (totalBranches.covered / totalBranches.total * 100) : 0;
const overallFuncPct = totalFunctions.total > 0 ? (totalFunctions.covered / totalFunctions.total * 100) : 0;
const overallLinePct = totalLines.total > 0 ? (totalLines.covered / totalLines.total * 100) : 0;

console.log('\n📈 OVERALL SERVICES COVERAGE:\n');
console.log(`Statements: ${overallStmtPct.toFixed(2)}% (${totalStatements.covered}/${totalStatements.total})`);
console.log(`Branches:   ${overallBranchPct.toFixed(2)}% (${totalBranches.covered}/${totalBranches.total})`);
console.log(`Functions:  ${overallFuncPct.toFixed(2)}% (${totalFunctions.covered}/${totalFunctions.total})`);
console.log(`Lines:      ${overallLinePct.toFixed(2)}% (${totalLines.covered}/${totalLines.total})`);
console.log(`\nTotal Services Analyzed: ${servicesData.length}`);

// Identify high and low coverage services
const highCoverage = servicesData.filter(s => s.statements.pct >= 80);
const mediumCoverage = servicesData.filter(s => s.statements.pct >= 50 && s.statements.pct < 80);
const lowCoverage = servicesData.filter(s => s.statements.pct < 50);

console.log('\n🎯 COVERAGE DISTRIBUTION:\n');
console.log(`✅ High Coverage (≥80%):    ${highCoverage.length} services`);
console.log(`⚠️  Medium Coverage (50-79%): ${mediumCoverage.length} services`);
console.log(`❌ Low Coverage (<50%):     ${lowCoverage.length} services`);

if (lowCoverage.length > 0) {
  console.log('\n🔴 PRIORITY: Services Needing Attention (<50% coverage):\n');
  lowCoverage.slice(0, 10).forEach(s => {
    console.log(`   - ${s.file.padEnd(40)} ${s.statements.pct.toFixed(1)}%`);
  });
}

console.log('\n');
