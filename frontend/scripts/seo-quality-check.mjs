import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const scanRoots = ['src', 'public'].map((dir) => join(root, dir));
const textExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.md', '.txt', '.json']);
const ignoredParts = ['node_modules', '.next', '.open-next', 'coverage'];
const violations = [];
const pricing = JSON.parse(readFileSync(join(root, 'src', 'config', 'pricing.json'), 'utf8'));
const premiumPlan = pricing.plans.premium;
const expectedAnnualPrice = `$${Math.ceil(premiumPlan.priceUsd)}/year`;
const expectedMonthlyEquivalent = `$${Math.ceil(premiumPlan.monthlyEquivalentUsd)}/month`;

function extensionOf(file) {
  const index = file.lastIndexOf('.');
  return index === -1 ? '' : file.slice(index);
}

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (ignoredParts.some((part) => fullPath.includes(part))) continue;
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      walk(fullPath);
      continue;
    }
    if (!textExtensions.has(extensionOf(fullPath))) continue;
    checkFile(fullPath);
  }
}

function addViolation(file, line, message) {
  violations.push(`${file}:${line}: ${message}`);
}

function checkFile(file) {
  const text = readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/);

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    if (line.includes('\u2014')) addViolation(file, lineNumber, 'em dash found');
    if (line.includes('\u2013')) addViolation(file, lineNumber, 'en dash found');

    const lower = line.toLowerCase();
    const isGeoLeapPricingLine =
      lower.includes('geoleap') ||
      lower.includes('launch price') ||
      lower.includes('premium costs') ||
      lower.includes('premium is');
    const isAiSummaryPricingLine =
      (file.includes('llms.txt') || file.includes('llms-full.txt')) &&
      /GeoLeap|Premium removes|Premium costs|Premium is|free tier includes/i.test(line);
    const isGeoLeapPricingSurface =
      lower.includes('geoleap') ||
      lower.includes('launch price') ||
      file.includes('pricing.md') ||
      file.includes('homepage.md') ||
      isAiSummaryPricingLine;

    if (isGeoLeapPricingLine && /14\.99|\$1\.25|1\.25\/mo|1\.25\/month/.test(line)) {
      addViolation(file, lineNumber, 'unrounded GeoLeap pricing literal found');
    }

    if (
      isGeoLeapPricingSurface &&
      /Premium|premium|launch price|free trial|GeoLeap/.test(line) &&
      /\$\d+(?:\.\d+)?\/year/.test(line) &&
      !line.includes(expectedAnnualPrice)
    ) {
      addViolation(file, lineNumber, `GeoLeap annual price must match ${expectedAnnualPrice}`);
    }

    if (
      isGeoLeapPricingSurface &&
      /Premium|premium|monthly equivalent|about/i.test(line) &&
      /\$\d+(?:\.\d+)?\/(?:mo|month)/.test(line) &&
      !line.includes(expectedMonthlyEquivalent)
    ) {
      addViolation(file, lineNumber, `GeoLeap monthly equivalent must match ${expectedMonthlyEquivalent}`);
    }

    if (/^(Q:|#{1,6}\s).+-$/.test(line)) {
      addViolation(file, lineNumber, 'question or heading ends with hyphen');
    }

    if (/\bquestion:\s*['"`][^'"`\r\n]*-['"`]/.test(line)) {
      addViolation(file, lineNumber, 'FAQ question ends with hyphen');
    }

    if (/\bheading:\s*['"`][^'"`\r\n]*-['"`]/.test(line)) {
      addViolation(file, lineNumber, 'heading string ends with hyphen');
    }

    if (/\b[A-Z][A-Za-z0-9 ]+-\s*<strong>/.test(line)) {
      addViolation(file, lineNumber, 'sentence fragment appears to end with hyphen before markup');
    }

    if (/[\u00e2\u00c2\u00c3\ufffd]/.test(line)) {
      addViolation(file, lineNumber, 'mojibake marker found');
    }
  });
}

for (const dir of scanRoots) {
  walk(dir);
}

if (violations.length > 0) {
  console.error(violations.join('\n'));
  process.exit(1);
}

console.warn('SEO quality checks passed.');
