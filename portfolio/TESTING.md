# Testing

What actually ran, what did not, and what the numbers do and do not mean. Everything below was
run against this snapshot on 7 August 2026 unless stated otherwise. Commands are in
[METRICS.md](METRICS.md).

---

## The suites

Where each suite lives:

| Suite | Framework | Location | Files |
|---|---|---|---:|
| Backend | xUnit | `backend/GeoLeap.Api.Tests/` | 415 |
| Frontend | Jest | `frontend/src/**/__tests__/`, `*.test.tsx` | 309 suites |
| Mobile | Jest (`react-native` preset) | `mobile/src/__tests__/` | 236 |
| End-to-end | Playwright | `e2e/*.spec.ts` | 31 specs |

What each suite produced:

| Suite | Total | Passed / failed / skipped |
|---|---:|---:|
| Backend | 6,588 | 6,527 / 6 / 55 |
| Frontend | 7,995 | 7,786 / 0 / 209 |
| Mobile | not run | n/a |
| End-to-end | not run | n/a |

The backend total is higher than the file count would suggest because each `[Theory]` expands to
one case per `[InlineData]`: 5,760 `[Fact]` attributes and 200 `[Theory]` attributes are declared
across the 415 files, and the executed total (6,588) reflects the expansion.

---

## Backend

```bash
cd backend
ENABLE_COVERAGE=true dotnet test --settings coverlet.runsettings \
  --collect:"XPlat Code Coverage"
```

```text
Failed!  - Failed: 6, Passed: 6527, Skipped: 55, Total: 6588, Duration: 3 m 20 s
```

All six failures are in `MinimalContentControllerTestsV3`:

| Test | Endpoint |
|---|---|
| `SearchContent_ExistingEndpoints_ReturnsValidResponse` | `/api/content/search?query=test` |
| `SearchContent_ExistingEndpoints_ReturnsValidResponse` | `/api/content/search?query=movie&type=movie` |
| `SearchContent_ExistingEndpoints_ReturnsValidResponse` | `/api/content/search?query=show&type=tv&page=1…` |
| `GetContentForSitemap_ExistingEndpoints_ReturnsValidResponse` | `/api/content/sitemap?page=1&pageSize=100` |
| `GetContentForSitemap_ExistingEndpoints_ReturnsValidResponse` | `/api/content/sitemap` |
| `PostContentBatch_ValidRequest_ReturnsValidResponse` | batch endpoint |

None were investigated further for this snapshot; they were left failing rather than deleted or
skipped to make the number look better.

The 55 skips are pre-existing `[Fact(Skip = "...")]` entries in the suite, not something toggled
for this repository.

### The MinimalTestBase pattern, and why it matters for coverage

`docs/testing/TESTING-GUIDE.md` documents a real, named problem the project ran into: a test
suite can grow large while covering almost nothing, if every dependency is mocked. The guide's
own framing is blunt: "This codebase has HIGH TEST COUNTS but LOW COVERAGE because tests mock
everything," and it sets a mock-boundary rule: mock external I/O (TMDB, Stripe, Redis, the file
system), never the service under test. A migration from a `MinimalTestBase` pattern (60+ mocked
services) to `RealServicesTestBase` (real services, faked I/O only) is described as in progress,
not finished. The coverage numbers below are the honest result of that migration being partial.

---

## Frontend

```bash
cd frontend
npm run test:coverage
```

```text
Test Suites: 4 skipped, 305 passed, 305 of 309 total
Tests:       209 skipped, 7786 passed, 7995 total
Time:        60.284 s
```

Three test files are permanently excluded in `jest.config.js`, each with a reason attached in
the config itself rather than silently dropped:

| File | Reason given in config |
|---|---|
| `growth-tracking-client.test.ts` | out-of-memory / hanging |
| `watchlistApi.test.ts` | MSW server conflict with the global server |
| `AdminNavigationBar.test.tsx` | hanging / timeout |

### The flaky test

An earlier run of the identical command on identical code reported one failure:

```text
Test Suites: 1 failed, 4 skipped, 304 passed, 305 of 309 total
Tests:       1 failed, 209 skipped, 7778 passed, 7988 total
Time:        212.293 s
```

`CustomerBillingOverview.test.tsx` timed out inside a `waitFor` waiting for an error alert that
did not render before the timeout. Run in isolation, it passes 26 of 26. Both runs are recorded
here: quoting only the clean one would misrepresent how the suite actually behaves. The README
and `portfolio/METRICS.md` both report the clean run's totals as the headline number.

---

## Coverage

### Backend

From `coverage.cobertura.xml`, produced by the run above:

| Metric | Covered | Total | Rate |
|---|---:|---:|---:|
| Lines | 49,892 | 190,927 | **26.13%** |
| Branches | 8,215 | 29,382 | **27.95%** |

`backend/coverlet.runsettings` excludes `obj/`, `Migrations/**`, `*.Designer.cs`,
`*.generated.cs` and anything marked `Obsolete`, `GeneratedCode` or `CompilerGenerated`. It emits
cobertura, opencover and lcov. **No threshold is configured**: nothing in CI or the pre-commit
hook fails on this number, because coverage is only collected when `ENABLE_COVERAGE=true` is set
explicitly, to keep ordinary local runs fast.

### Frontend

| Metric | Rate | Gate |
|---|---:|---:|
| Statements | 53.94% | 60% |
| Branches | 49.83% | 60% |
| Functions | 51.14% | 60% |
| Lines | 54.50% | 60% |

`jest.config.js` sets a global 60% threshold on all four metrics. **The gate does not currently
pass**: a plain `npm run test:coverage` exits 1 with four "coverage threshold not met" errors.
Unlike the backend, this one is wired up; it is just failing.

### Why the count and the coverage disagree

14,583 backend and frontend tests combined, against 26.13% and 54.50% line coverage. That
combination is not a contradiction: the test-first process in `CLAUDE.md` produced a large
number of tests concentrated on the paths that were being actively worked, and a very large
surface of infrastructure, admin tooling, and generated code that the process never touched. High
test count and low coverage at the same time is what that looks like measured, not a paradox.

---

## Not run for this snapshot

**Mobile (236 test files).** `mobile/jest.config.js` sets `preset: 'react-native'` with a custom
set of `setupFilesAfterEnv` (platform, library and fetch mocks; MSW is present but disabled,
noted in the config as "not used but kept for future"). The suite is documented elsewhere in the
repository (`mobile/TESTING_PROGRESS.md`, `mobile/NETWORKSERVICE_TEST_ISSUE.md`) as needing
`NODE_OPTIONS=--max-old-space-size=24576` and `--runInBand` (a 24GB heap, single-threaded),
which was not available on the machine used to prepare this snapshot. `useApi.test.ts` is also
excluded in `testPathIgnorePatterns` as memory-intensive on its own.

**End-to-end (31 Playwright specs).** `e2e/playwright.config.ts` targets `http://localhost:3020`
across Chrome, Firefox and Safari with a 30-second per-test timeout. These need the full stack
(API, database, seed data) running simultaneously, which the backend/frontend test runs above did
not require. The spec list covers auth, dashboard, search, streaming search, subscriptions,
watchlist, session management, error handling, security validation, performance benchmarking and
VPN guidance, several with both an original and a `-fixed` variant from earlier debugging passes.

---

## What a 20-day audit found, for comparison

`docs/audit/EXECUTIVE-SUMMARY.md` records a dated point-in-time audit (25 November to 16 December
2025) run partway through the build, not on this snapshot. At that point: 1,508 backend tests at
100% pass, 1,143 frontend tests at 99.1%, 380 mobile tests at 93.8%, and coverage at 13%
frontend and 5% mobile, both far below the targets stated in the same report. The suite grew
roughly 4x on the backend and 7x on the frontend between that audit and this snapshot; coverage
grew more slowly. That gap between test-count growth and coverage growth is the same pattern
described above, observed twice, eight months apart.

---

## Running the suites yourself

```bash
# Backend, without coverage (faster)
cd backend && dotnet test

# Backend, with coverage
cd backend && ENABLE_COVERAGE=true dotnet test --settings coverlet.runsettings --collect:"XPlat Code Coverage"

# Frontend
cd frontend && npm test              # no coverage
cd frontend && npm run test:coverage # with coverage, enforces the 60% gate

# End-to-end (needs the full stack up first)
cd e2e && npm install && npx playwright install && npm test
```
