# Development history

This repository is a snapshot. It has one commit. The project it snapshots ran for
about eleven months in a private repository with 2,322 commits, and this page
records what that looked like, because the snapshot itself cannot show it.

Everything below was measured with `git log` on the source repository. The commands
are in [METRICS.md](METRICS.md).

---

## Timeline

First commit 22 August 2025. Last commit 8 July 2026. 140 days had at least one
commit, so roughly one working day in two across the span.

```text
2025-08   17  ██
2025-09  452  ████████████████████████████████████████████
2025-10  259  █████████████████████████
2025-11  432  ██████████████████████████████████████████
2025-12  659  ████████████████████████████████████████████████████████████████
2026-01  257  █████████████████████████
2026-02   22  ██
2026-03  163  ████████████████
2026-04    3  ▏
2026-05   43  ████
2026-06   14  █
2026-07    1  ▏
```

The shape is not smooth, and the gaps are the interesting part.

**August 2025** is documentation only. The first commit is user stories, not code.
The 60-odd files in `docs/user-stories/` were written before the API existed, and
they are still in this repository.

**September to December 2025** is the build. Four months, 1,802 commits, most of the
API surface and most of the web app. December alone is 659 commits.

**February 2026** drops to 22 commits. That is the SQL Server to PostgreSQL
migration. The schema was squashed into a single `InitialPostgresCreate` baseline
dated 17 February 2026, which is why a project with 202 entities has only three
migration files.

**March 2026** is 163 commits and the affiliate partner system, the second
migration.

**April 2026 onward** is maintenance and wind-down: three commits in April, then
the mobile subscription replay indexes in May, and a final consolidation commit in
July.

---

## What was actually being written

Conventional-commit prefixes, for the commits that used one:

| Prefix | Count | Share |
|---|---:|---:|
| `test:` | 237 | 33% |
| `fix:` | 224 | 31% |
| `docs:` | 87 | 12% |
| `feat:` | 70 | 10% |
| `refactor:` | 35 | 5% |
| `chore:` | 32 | 4% |
| other | 8 | 1% |

More commits went to tests than to features, by more than three to one. That is a
direct product of the working process rather than an accident: the rule in
[CLAUDE.md](../CLAUDE.md) was that no production code got written before a
failing test existed, and the pre-commit hook ran the full suite on every commit.

The result is visible in the snapshot: 6,588 backend tests and 7,995 frontend tests.
It is also visible in what the process did *not* achieve. The coverage numbers are
26% on the backend and 54% on the frontend, well under the 95%-per-file target that
CLAUDE.md states. A high test count and low coverage at the same time means the
tests concentrated on the paths that were being actively worked and never reached
the large surface of infrastructure code around them.

---

## A 20-day audit, mid-build

`docs/audit/EXECUTIVE-SUMMARY.md` records a structured 20-day audit (25 November to 16 December
2025), roughly two-thirds of the way through the September to December build phase above. It is a
dated point-in-time report, not a description of the current snapshot, and the numbers moved a
lot in both directions afterward.

At that point: 174 bugs found, 108 fixed (62%), with 5 P0 criticals still open. Test counts were
much smaller than they are now (1,508 backend, 1,143 frontend, 380 mobile), and coverage was
13% frontend and 5% mobile, both flagged in the report itself as critical against 60%/50%
targets. Three of the P0s (SQL injection, sensitive data in logs, a payment race condition) were
closed the following day; the full, dated account of those three fixes is in
[ENGINEERING-LOG.md](ENGINEERING-LOG.md).

By the time of this snapshot, the backend suite had grown to 6,588 tests (4.4x) and the frontend
to 7,995 (7.0x), while coverage moved to 26.13% backend and 54.50% frontend: real growth, but
proportionally much smaller than the growth in test count. The same test-heavy, coverage-light
pattern the audit flagged in December 2025 is still visible in the numbers eight months later;
see [TESTING.md](TESTING.md) for the full current breakdown.

---

## Working with agents

Most of this was built by AI agents that I directed. The orchestration process is
still in the repository, in [CLAUDE.md](../CLAUDE.md) and
[AGENTS.md](../AGENTS.md), and it went through several revisions as it failed in
new ways.

What ended up in it:

- **Test-first, enforced mechanically.** Not a request in a prompt, a gate in
  `.githooks/pre-commit` that rejects the commit. Agents route around instructions;
  they do not route around a failing exit code.
- **Worktree isolation.** Parallel agents get their own git worktree, branched from
  `main`, never from another feature branch. `scripts/new-worktree.sh` sets one up
  with env files copied and dependencies installed.
- **Explicit write scopes.** Agents working in parallel are given disjoint file
  sets. Two agents editing the same file is the failure mode that costs the most to
  untangle.
- **Two-stage review.** Spec compliance first, then code quality, before anything
  merges.
- **Named anti-patterns.** No placeholder code, no TODO comments, no empty function
  bodies, no `any`, no `eslint-disable` without a reason. Each of those is in the
  file because an agent did it.

What it did not fix:

- **Secrets.** Credentials were committed to the source repository more than once
  across the eleven months. The pre-commit hook runs builds, tests, lint, typecheck
  and a production build, and does not scan for secrets. That gap is why this
  snapshot exists as a fresh repository instead of a history rewrite.
- **Abandoned work in place.** The repository layer (`IContentRepository`,
  `IPaymentRepository`, `ISubscriptionRepository`) was started, superseded, and left
  as disabled files rather than removed. So were several `legacy/` directories,
  around 90 committed test-output dumps, and a duplicate mobile rewrite. All of that
  was cleared out of this snapshot.
- **Coverage discipline.** The stated rule was 95% per touched file. The measured
  reality is 26% and 54%. Stating a target in a config file is not the same as
  gating on it, and only the frontend had a threshold configured at all.

---

## Naming

The project was called StreamHopper in the first commit, then StreamVPN, then
GeoLeap. The source repository kept the name `StreamVPN` to the end, so a few
historical documents under `docs/audit/` and `docs/mobile/` still say StreamVPN.
Those are dated point-in-time reports and rewriting them would misrepresent what
they were. Everything user-facing says GeoLeap.
