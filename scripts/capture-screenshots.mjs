/**
 * Capture the portfolio screenshot archive.
 *
 * Usage:
 *   npx playwright install chromium     # once, downloads the browser binary
 *   node scripts/capture-screenshots.mjs [--set=public|auth|all]
 *
 * Requires the web app on http://localhost:3020. The `auth` set additionally
 * requires the API on http://localhost:8020 with the development seed data.
 */
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');

// Playwright is a devDependency of the web app rather than the repo root, so
// resolve it from there instead of relying on hoisting.
const require = createRequire(path.join(repoRoot, 'frontend', 'package.json'));
const { chromium } = require('@playwright/test');

const WEB = process.env.WEB_URL ?? 'http://localhost:3020';
const OUT = path.join(repoRoot, 'docs', 'screenshots');

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

/** Public routes that render from local data files, no API required. */
const publicShots = [
  ['home', '/'],
  ['pricing', '/pricing'],
  ['about', '/about'],
  ['faq', '/faq'],
  ['help', '/help'],
  ['vpn-guidance', '/vpn-guidance'],
  ['privacy', '/privacy'],
  ['terms', '/terms'],
  ['platforms-index', '/platforms'],
  ['platform-detail', '/platforms/netflix'],
  ['countries-index', '/countries'],
  ['country-detail', '/countries/japan'],
  ['compare-index', '/compare'],
  ['compare-detail', '/compare/netflix-vs-hulu'],
  ['genres-index', '/genres'],
  ['genre-detail', '/genres/k-drama'],
  ['sports-index', '/sports'],
  ['sport-detail', '/sports/premier-league'],
  ['unblock-index', '/unblock'],
  ['unblock-platform-country', '/unblock/netflix/ireland'],
  ['glossary-index', '/glossary'],
  ['glossary-term', '/glossary/svod'],
  ['guides-index', '/guides'],
  ['blog-index', '/blog'],
  ['features-index', '/features'],
  ['authors-index', '/about/authors'],
  ['auth-login', '/auth/login'],
  ['auth-register', '/auth/register'],
  ['auth-forgot-password', '/auth/forgot-password'],
  ['search-empty', '/search'],
];

/** Routes that need a signed-in session and a live API. */
const authShots = [
  ['dashboard', '/dashboard'],
  ['dashboard-watchlist', '/dashboard/watchlist'],
  ['dashboard-history', '/dashboard/history'],
  ['dashboard-trending', '/dashboard/trending'],
  ['dashboard-subscriptions', '/dashboard/subscriptions'],
  ['dashboard-notifications', '/dashboard/notifications'],
  ['settings', '/settings'],
  ['preferences', '/preferences'],
  ['watchlist', '/watchlist'],
  ['upgrade', '/upgrade'],
  ['admin-dashboard', '/admin/dashboard'],
  ['admin-users', '/admin/users'],
  ['admin-roles', '/admin/roles'],
  ['admin-analytics', '/admin/analytics'],
  ['admin-audit-logs', '/admin/audit-logs'],
];

/** Desktop shots taken at a mobile viewport as well. */
const responsiveShots = [
  ['home', '/'],
  ['platform-detail', '/platforms/netflix'],
  ['pricing', '/pricing'],
];

// No dark-mode shot list. Playwright's `colorScheme: 'dark'` has no effect here:
// nothing in frontend/src uses a Tailwind `dark:` variant, there is no
// prefers-color-scheme rule, and the custom variant in globals.css is inverted.
// Capturing "dark" screenshots produced byte-identical light-mode images.

/**
 * Dismiss the cookie consent banner, choosing the privacy-preserving option.
 * It renders on every page and would otherwise cover content in every capture.
 */
async function dismissConsent(page) {
  try {
    const reject = page.getByRole('button', { name: /reject all/i }).first();
    if (await reject.isVisible({ timeout: 2500 })) {
      await reject.click();
      await page.waitForTimeout(400);
    }
  } catch {
    // Banner already dismissed for this context.
  }
}

/**
 * Authenticated pages fetch their data on the client and render a spinner first.
 * Wait for every spinner to leave the DOM before capturing, so screenshots show
 * loaded content rather than a loading state.
 */
async function waitForLoaded(page) {
  try {
    await page.waitForFunction(
      () => document.querySelectorAll('.animate-spin').length === 0,
      undefined,
      { timeout: 20000 },
    );
  } catch {
    // Some panels spin indefinitely without seed data; capture what is there.
  }
}

async function settle(page) {
  // Networkidle is unreliable with streaming RSC payloads, so wait for the
  // document then give lazy images and fonts a beat to paint.
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1200);
  await dismissConsent(page);
  await waitForLoaded(page);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(800);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(600);
}

async function shoot(page, name, urlPath, { dir = '', fullPage = true } = {}) {
  const url = `${WEB}${urlPath}`;
  try {
    const res = await page.goto(url, { waitUntil: 'commit', timeout: 45000 });
    const status = res?.status() ?? 0;
    await settle(page);
    const target = path.join(OUT, dir, `${name}.png`);
    await page.screenshot({ path: target, fullPage });
    console.log(`  ok   ${String(status).padEnd(3)} ${urlPath} -> ${path.relative(OUT, target)}`);
    return { name, urlPath, status, ok: true };
  } catch (err) {
    console.log(`  FAIL     ${urlPath}: ${err.message.split('\n')[0]}`);
    return { name, urlPath, status: 0, ok: false, error: err.message.split('\n')[0] };
  }
}

async function login(context) {
  const page = await context.newPage();
  await page.goto(`${WEB}/auth/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await dismissConsent(page);

  // Credentials come from TestUserSeeder, which runs at startup in Development.
  await page.fill('input[type="email"]', process.env.SEED_EMAIL ?? 'test@example.com');
  await page.fill('input[type="password"]', process.env.SEED_PASSWORD ?? 'Test123!');
  await page.click('button[type="submit"]');

  // The app sets its session cookies before it finishes redirecting, so wait on
  // the cookie rather than on a URL change, which races against the navigation.
  let signedIn = false;
  for (let i = 0; i < 30; i += 1) {
    const cookies = await context.cookies();
    if (cookies.some((c) => c.name === 'access_token' && c.value)) {
      signedIn = true;
      break;
    }
    await page.waitForTimeout(1000);
  }
  await page.close();
  return signedIn;
}

async function main() {
  const setArg = process.argv.find((a) => a.startsWith('--set='));
  const set = setArg ? setArg.split('=')[1] : 'all';

  await mkdir(path.join(OUT, 'marketing'), { recursive: true });
  await mkdir(path.join(OUT, 'app'), { recursive: true });
  await mkdir(path.join(OUT, 'responsive'), { recursive: true });

  const browser = await chromium.launch();
  const results = [];

  // Anything that escapes the capture loops would otherwise leave the browser
  // process running, so always close it.
  try {
    if (set === 'public' || set === 'all') {
      const ctx = await browser.newContext({ viewport: DESKTOP, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      console.log('\nPublic pages (desktop, light):');
      for (const [name, url] of publicShots) {
        results.push(await shoot(page, name, url, { dir: 'marketing' }));
      }
      await ctx.close();

      const mobileCtx = await browser.newContext({ viewport: MOBILE, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
      const mobilePage = await mobileCtx.newPage();
      console.log('\nResponsive (390px):');
      for (const [name, url] of responsiveShots) {
        results.push(await shoot(mobilePage, `${name}-mobile`, url, { dir: 'responsive' }));
      }
      await mobileCtx.close();
    }

    if (set === 'auth' || set === 'all') {
      const ctx = await browser.newContext({ viewport: DESKTOP, deviceScaleFactor: 1 });
      console.log('\nAuthenticated pages:');
      const signedIn = await login(ctx);
      if (!signedIn) {
        console.log('  skipped: could not sign in (is the API running with seed data?)');
      } else {
        const page = await ctx.newPage();
        for (const [name, url] of authShots) {
          results.push(await shoot(page, name, url, { dir: 'app' }));
        }
      }
      await ctx.close();
    }
  } finally {
    await browser.close();
  }

  const ok = results.filter((r) => r.ok).length;
  console.log(`\n${ok}/${results.length} captured -> ${OUT}`);
  const failed = results.filter((r) => !r.ok);
  if (failed.length) {
    console.log('Failed:');
    for (const f of failed) console.log(`  ${f.urlPath}: ${f.error}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
