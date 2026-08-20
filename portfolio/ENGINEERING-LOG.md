# Engineering log

Dated engineering decisions and incidents, pulled from the audit trail this project left in
`docs/`. [DEVELOPMENT-HISTORY.md](DEVELOPMENT-HISTORY.md) covers the shape of the eleven months;
this page covers specific, checkable things that happened on specific days. Each entry names its
source document.

---

### 2025-08-22: First commit is documentation, not code

The private repository's first commit is user stories, not a scaffold. The roughly 60 files
under `docs/user-stories/` were written before the API existed and are still in this snapshot,
unedited, as a record of what was planned before anything was built.

---

### 2025-11-25 to 2025-12-16: A 20-day audit

`docs/audit/EXECUTIVE-SUMMARY.md` and `docs/audit/FINAL-AUDIT-REPORT.md` (744 lines) record a
structured audit run partway through the build: four weeks, one focus area per week (security
and auth, performance, UX and edge cases, testing), against the codebase as it stood in
December 2025.

Results at that point: 174 bugs found, 108 fixed (62%), 5 P0 criticals still open at the audit's
close. Backend tests passed at 100% (1,508 tests); frontend at 99.1% (1,143 tests); mobile at
93.8% (380 tests). Coverage was 13% frontend and 5% mobile, both named in the report itself as
"CRITICAL" and "EMERGENCY" against stated targets of 60% and 50%. Performance work in the same
window took API response time from 245ms to 140ms (43% faster) and mobile startup from 3.2s to
2.1s (35% faster).

The report's own recommendation was 6-8 weeks to production readiness.

---

### 2025-12-17: Three P0 bugs closed in one day

`docs/audit/bug-fixes/` holds detailed, dated write-ups for three of the audit's critical
findings, each closed the day after the audit report was published.

**BUG-145, SQL injection.** Investigated rather than assumed: the claimed "legacy search
endpoint" did not exist, and every search path already ran through parameterized EF Core LINQ
queries plus a `ValidateSqlSecurity()` allowlist in the repository layer blocking 25+ dangerous
patterns. 46 new security tests were added (`Security/SqlInjectionSecurityTests.cs`), 38 passing
and 8 failing against endpoints that were not implemented yet. Closed as "verified fixed," not
"fixed," because the vulnerability as described was never actually present.

**BUG-156, sensitive data in production logs.** This one was real. Request/response logging
middleware and the Stripe webhook controller were both logging raw bodies: passwords, JWT
tokens, card data, and (worse) the webhook secret itself, in plaintext. The fix routed both
through an existing but unused `SensitiveDataFilter` (80+ field names, 6 regex patterns), which
had been built and never wired into the two places that needed it. 48 new sanitization tests were
added; known limitation: the credit-card regex expects 16 digits and does not catch 15-digit Amex
numbers, though field-name detection still redacts the field.

**BUG-167, payment race condition.** No idempotency mechanism existed anywhere in the payment
path: a double-click, a network retry, or two browser tabs could all produce duplicate Stripe
charges. Fixed with a three-layer idempotency key (application check, database unique index,
Stripe's own idempotency support), verified with a concurrency test simulating 10 simultaneous
requests against the same key and confirming exactly one transaction was created.

---

### 2026-02-17: SQL Server to PostgreSQL

The schema was squashed into a single `InitialPostgresCreate` baseline migration when the
database moved off SQL Server. This is why a schema with 202 entities and 215 tables has only
three migration files instead of a long incremental history: the two migrations after the
baseline are the only genuine post-Postgres increments (an affiliate partner system, and unique
indexes for mobile subscription replay protection). It also means several documents under
`docs/audit/` and `docs/mobile/` that predate this date still describe SQL Server DDL
(`uniqueidentifier`, `nvarchar`, `GETUTCDATE()`) and were deliberately left as-is rather than
retrofitted, since they are dated reports of what existed at the time, not living reference
documents. `docs/rbac-system-documentation.md` is the clearest surviving example.

---

### 2026-03: SEO audits and the affiliate system

Two dated SEO audits (`docs/seo/SEO-AUDIT-2026-03-20.md`, `SEO-AUDIT-2026-03-26.md`) bracket the
month the affiliate partner system shipped as the project's second post-baseline migration, the
163-commit month described in `DEVELOPMENT-HISTORY.md`.

---

### 2026-05: Mobile subscription replay indexes

The third and final migration adds the three unique indexes that
`AssertRequiredProductionIndexesAsync` checks for at boot, see
[ARCHITECTURE.md](ARCHITECTURE.md#data). Without them, a mobile purchase receipt could be
redeemed more than once with no error raised anywhere; the boot-time check exists because that
class of bug does not announce itself.

---

### 2026-08-07: Screenshot capture and one real bug found in the process

Preparing this snapshot's screenshot archive (`docs/screenshots/`) surfaced a genuine,
previously-unnoticed bug rather than a cosmetic one: `frontend/src/middleware.ts` checked a
session cookie named `accessToken`, but `AuthController` had only ever written `access_token`.
Every signed-in route (`/dashboard`, `/settings`, `/support`, `/upgrade`) silently treated every
authenticated user as signed out and redirected them away. It was caught because those pages
would not screenshot: the capture script kept landing on the login page. The fix was a one-line
cookie-name correction plus a comment explaining why; nothing else was touched to make the
resulting screenshots look better than the app actually behaves.

The same capture session is the source of the "no dark mode" finding: an attempt to capture
`colorScheme: 'dark'` screenshots came back byte-identical to the light-mode captures, which is
what led to reading `frontend/src/app/globals.css:4` and finding the custom variant declared
backwards (`@custom-variant dark (&:is(.light *))`).

---

## Scope of this log

This page is specifically the dated, checkable incidents and decisions that left a written
trail: audits, bug-fix write-ups, and migrations. Day-to-day feature work is what the
2,322-commit history in [DEVELOPMENT-HISTORY.md](DEVELOPMENT-HISTORY.md) summarizes by month and
by commit prefix instead.
