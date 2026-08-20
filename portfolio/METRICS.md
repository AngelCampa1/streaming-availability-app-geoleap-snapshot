# Metrics

Every number in the README comes from one of the commands below, run against this
repository on 7 August 2026. Nothing here is estimated. Where a figure has a caveat,
the caveat is stated next to it rather than in a footnote.

Counting excludes `node_modules/`, `bin/`, `obj/`, `.next/` and `coverage/` throughout.

---

## Lines and files

```bash
count_lines () {
  find . -type f -name "$1" \
    -not -path "*/node_modules/*" -not -path "*/bin/*" -not -path "*/obj/*" \
    -not -path "*/.next/*" -not -path "*/coverage/*" -print0 \
  | xargs -0 cat | wc -l
}
```

| Language | Pattern | Files | Lines |
|---|---|---:|---:|
| C# | `*.cs` | 1,101 | 480,141 |
| React | `*.tsx` | 877 | 313,799 |
| TypeScript | `*.ts` | 617 | 239,147 |
| JavaScript | `*.js` | 76 | 17,569 |
| SQL | `*.sql` | 3 | 13,129 |
| Markdown | `*.md` | 233 | 73,403 |

The markdown row was re-measured with
`git -c core.quotePath=false ls-files -z -- '*.md' | xargs -0 cat | wc -l`, not the
`count_lines` function above: `find` can double-count files inside a worktree checkout, and
`git ls-files` counts exactly what this repository tracks. Checking every extension the same
way turned up one more disagreement: the TypeScript row's `find` count included
`frontend/next-env.d.ts`, a Next.js-generated file that both `.gitignore` files in this
repository exclude and that git does not track. The TypeScript row above is `git ls-files`
too, for the same reason. The C#, React, JavaScript and SQL rows came back identical under
both methods and are unchanged.

Source total (C#, TSX, TS, JS, SQL): **1,063,785 lines across 2,674 files**.

**Caveat.** These are raw `wc -l` counts. They include blank lines and comments.
`cloc`, `scc` and `tokei` were not installed on the machine used, so there is no
comment-stripped figure to publish. Treat the total as an upper bound on
application code.

### By area

| Area | Lines |
|---|---:|
| `backend/GeoLeap.Api` (all C#) | 280,105 |
| ├─ `Migrations/` (EF-generated) | 59,442 |
| ├─ `Services/` | 127,893 |
| ├─ `Controllers/` | 31,426 |
| └─ `Models/` | 25,603 |
| `backend/GeoLeap.Api.Tests` | 167,690 |
| `frontend/src` (TS + TSX) | 308,422 |
| `mobile/src` (TS + TSX) | 212,013 |
| `e2e` | 15,987 |

Backend code excluding generated migrations: **220,663 lines**.

---

## API surface

```bash
# Controllers
find backend/GeoLeap.Api -name '*Controller.cs' -not -path '*/obj/*' -not -path '*/bin/*' | wc -l

# HTTP endpoints
grep -rho '\[Http\(Get\|Post\|Put\|Delete\|Patch\)' backend/GeoLeap.Api --include='*.cs' | wc -l

# Entities
grep -c 'public DbSet<' backend/GeoLeap.Api/Data/ApplicationDbContext.cs
```

| Metric | Value |
|---|---:|
| Controllers | 68 |
| `[Http*]` attributes | 905 |
| ├─ `[HttpGet]` | 507 |
| ├─ `[HttpPost]` | 312 |
| ├─ `[HttpPut]` | 41 |
| ├─ `[HttpDelete]` | 43 |
| └─ `[HttpPatch]` | 2 |
| Minimal-API `Map*` calls | 34 |
| `DbSet<>` properties | 202 |
| EF migrations | 3 |
| SignalR hub classes | 6 |
| └─ actually routed | 4 |
| Custom middleware | 13 |
| `BackgroundService` / `IHostedService` | 11 + 1 |
| Files under `Services/` | 327 |
| ├─ files named `I*.cs` | 131 |
| └─ `public interface` declarations | 191 |
| `builder.Services.Add{Scoped,Singleton,Transient}` calls | 225 |

**On the hubs.** Six classes derive from `Hub`. Four are routed in `Program.cs`
(`AdminHub`, `WatchlistHub`, `UserBehaviorHub`, `MonitoringHub`). The other two are
not reachable: `PreferencesHub` ships a `MapPreferencesHub()` extension method that
nothing ever calls, and `SocialActivityHub` is injected as an `IHubContext` but was
never given a route at all. Counting hubs by class would overstate what a client can
connect to, so both numbers are given.

**On the interfaces.** The 131 figure counts files whose name starts with `I`. The
191 figure counts `public interface` declarations, which is higher because several
files declare more than one. Neither number means "131 services sit behind an
abstraction": `IContentRepository`, `IPaymentRepository` and `ISubscriptionRepository`
were part of a repository layer that was started and then set aside in favour of
services calling the DbContext directly, so the interfaces are among the 131 with no
implementation wired up behind them.

**Verified against a live database.** Applying all three migrations to an empty
PostgreSQL 16 instance produced **215 tables** in the `public` schema and three
rows in `__EFMigrationsHistory`. The gap between 202 `DbSet<>` properties and 215
tables is join tables and owned types, which do not get their own `DbSet`.

---

## Frontend and mobile structure

```bash
# Route files, layouts, route handlers
find frontend/src/app -name 'page.tsx' -not -path '*__tests__*' | wc -l
find frontend/src/app -name 'layout.tsx' | wc -l
find frontend/src/app -name 'route.ts' | wc -l
find frontend/src/app/api -name 'route.ts' | wc -l

# Components, hooks, contexts (excluding __tests__ directories; hooks also
# excludes co-located *.test.ts files, since two hooks ship their test next
# to the implementation instead of under __tests__/)
find frontend/src/components -name '*.tsx' -not -path '*__tests__*' | wc -l
find frontend/src/hooks frontend/src/lib/hooks -name '*.ts' \
  -not -path '*__tests__*' -not -name '*.test.ts' -not -name 'index.ts' | wc -l
find frontend/src/contexts -name '*.tsx' -not -path '*__tests__*' | wc -l

# Mobile (services also excludes co-located *.test.ts files, for the same
# reason as hooks above: most mobile services under services/api,
# services/analytics etc. ship their spec beside the implementation)
find mobile/src/screens -name '*.tsx' -not -path '*__tests__*' | wc -l
find mobile/src/components -name '*.tsx' -not -path '*__tests__*' | wc -l
find mobile/src/services -name '*.ts*' -not -path '*__tests__*' -not -name '*.test.ts' | wc -l
```

| Metric | Value |
|---|---:|
| `page.tsx` route files | 79 |
| `layout.tsx` files | 31 |
| `route.ts` handlers under `app/` | 25 |
| └─ of those, under `app/api/` | 19 |
| Components (excluding `__tests__`) | 280 |
| Hooks | 31 |
| React contexts | 8 |
| Mobile screens | 46 |
| Mobile components | 100 |
| Mobile services | 55 |

**On the hook and service counts.** Both were previously reported as 33 and 66. Those
higher numbers only appear if co-located `*.test.ts` files (`useSubscription.test.ts`,
`AnalyticsService.test.ts`, `ApiService.test.ts` and others that sit next to their
implementation rather than under a `__tests__/` directory) are counted as if they were
hooks or services. Filtered out, the real counts are 31 hooks and 55 mobile services.

---

## Test results

Both suites were run on this snapshot, not on the source repository.

### Backend

```bash
cd backend
ENABLE_COVERAGE=true dotnet test --settings coverlet.runsettings \
  --collect:"XPlat Code Coverage"
```

```text
Failed!  - Failed: 6, Passed: 6527, Skipped: 55, Total: 6588, Duration: 3 m 20 s
```

Declared attributes across 415 test files: **5,760 `[Fact]`** and **200 `[Theory]`**.
The executed total is higher than `5,760 + 200` because each `[Theory]` expands to
one case per `[InlineData]`.

The six failures are all in `MinimalContentControllerTestsV3`:

| Test | Endpoint |
|---|---|
| `SearchContent_ExistingEndpoints_ReturnsValidResponse` | `/api/content/search?query=test` |
| `SearchContent_ExistingEndpoints_ReturnsValidResponse` | `/api/content/search?query=movie&type=movie` |
| `SearchContent_ExistingEndpoints_ReturnsValidResponse` | `/api/content/search?query=show&type=tv&page=1…` |
| `GetContentForSitemap_ExistingEndpoints_ReturnsValidResponse` | `/api/content/sitemap?page=1&pageSize=100` |
| `GetContentForSitemap_ExistingEndpoints_ReturnsValidResponse` | `/api/content/sitemap` |
| `PostContentBatch_ValidRequest_ReturnsValidResponse` | batch endpoint |

### Frontend

```bash
cd frontend
npm run test:coverage
```

```text
Test Suites: 4 skipped, 305 passed, 305 of 309 total
Tests:       209 skipped, 7786 passed, 7995 total
Time:        60.284 s
```

**This suite has a flaky test.** An earlier run of the same command on the same code
reported one failure, in `CustomerBillingOverview.test.tsx`, on a `waitFor` for an
error alert that did not appear before the timeout:

```text
Test Suites: 1 failed, 4 skipped, 304 passed, 305 of 309 total
Tests:       1 failed, 209 skipped, 7778 passed, 7988 total
Time:        212.293 s
```

The file passes 26 of 26 in isolation, and passed in the run reported above, so it is
a timing-sensitive test rather than a broken component. Both runs are shown because
quoting only the green one would misrepresent how the suite actually behaves.

### Not run

- **Mobile** (236 test files). The suite is configured with
  `NODE_OPTIONS=--max-old-space-size=24576` and `--runInBand`.
- **End-to-end** (31 Playwright specs). These need the full stack plus fixtures.

---

## Coverage

### Backend

From `coverage.cobertura.xml`, produced by the run above:

| Metric | Covered | Total | Rate |
|---|---:|---:|---:|
| Lines | 49,892 | 190,927 | **26.13%** |
| Branches | 8,215 | 29,382 | **27.95%** |

`backend/coverlet.runsettings` excludes `obj/`, `Migrations/**`, `*.Designer.cs`,
`*.generated.cs` and anything marked `Obsolete`, `GeneratedCode` or
`CompilerGenerated`. It emits cobertura, opencover and lcov. **No threshold is
configured**, so nothing fails on coverage.

Coverage is only collected when `ENABLE_COVERAGE=true`, so ordinary local runs stay
fast.

### Frontend

| Metric | Rate | Gate |
|---|---:|---:|
| Statements | 53.94% | 60% |
| Branches | 49.83% | 60% |
| Functions | 51.14% | 60% |
| Lines | 54.50% | 60% |

`jest.config.js` sets a global 60% threshold on all four. **The gate does not
currently pass**; Jest exits 1 with four "coverage threshold not met" errors.

Three test files are excluded in `jest.config.js` for out-of-memory, MSW and hang
reasons: `growth-tracking-client`, `watchlistApi`, `AdminNavigationBar`.

---

## Commit history

Measured on the private source repository, not on this snapshot, which is a single
commit.

```bash
git rev-list --count HEAD
git log --format='%ad' --date=format:'%Y-%m' | sort | uniq -c
git log --format='%ad' --date=short | sort -u | wc -l
```

| Metric | Value |
|---|---|
| Commits | 2,322 |
| First commit | 22 August 2025 |
| Last commit | 8 July 2026 |
| Days with at least one commit | 140 |
| Branches | `main` only |

Commits per month:

| Month | Commits |
|---|---:|
| 2025-08 | 17 |
| 2025-09 | 452 |
| 2025-10 | 259 |
| 2025-11 | 432 |
| 2025-12 | 659 |
| 2026-01 | 257 |
| 2026-02 | 22 |
| 2026-03 | 163 |
| 2026-04 | 3 |
| 2026-05 | 43 |
| 2026-06 | 14 |
| 2026-07 | 1 |

Conventional-commit prefixes:

| Prefix | Count |
|---|---:|
| `test:` | 237 |
| `fix:` | 224 |
| `docs:` | 87 |
| `feat:` | 70 |
| `refactor:` | 35 |
| `chore:` | 32 |
| `perf:` / `ci:` / `security:` / `wip:` | 2 each |

Not every commit used a prefix, so these counts cover a subset of the 2,322.
