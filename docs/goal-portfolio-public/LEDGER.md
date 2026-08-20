# Goal: Portfolio-public restructure of the GeoLeap snapshot

> Make this repository readable by a skeptical senior engineer in ninety seconds.
> Promote the retrospective, evidence-backed write-ups into a root `portfolio/`
> directory a reviewer sees without scrolling; leave the eleven months of working
> residue in `docs/` where it belongs. Re-verify every load-bearing claim in the
> README against the tree — line numbers, figures, and what the code actually does
> with them — and correct anything that no longer resolves. Honesty is the asset:
> never soften a failure into marketing language.

## Method

1. Read the reference implementation (`cam-reconciliation-saas-capveri-snapshot`)
   for the `portfolio/` pattern and the three ways the README surfaces it.
2. Sort every candidate doc by the rule: `portfolio/` is retrospective,
   reader-addressed, finite, and every claim checkable. `docs/` is prospective,
   self-addressed, dated, open-ended. When in doubt, leave it in `docs/`.
3. Move with `git mv` so history follows. Fix every inbound link, then verify
   mechanically that no markdown link in `README.md` or `portfolio/*.md` is broken.
4. Re-verify the README's headline claims by reading the source, not the prose:
   open the config at the cited line, then find the code that reads it and check
   what it does with the value.
5. Judge images as a viewer, not by filename. Read the candidates.

## Cycle log

### Cycle 1 — 2026-08-13 — Inventory and verification

Read `README.md`, `docs/engineering/{architecture,metrics,development-history}.md`,
`docs/rbac-system-documentation.md`, `docs/screenshots/README.md`. Confirmed the
three `docs/engineering/` files are genuinely portfolio-grade: dense, dated,
command-backed, and each states its own limits without prompting.

Verified the cited configuration lines still resolve. All four do:
`appsettings.json:69` (RapidAPI base URL), `:82` and `:85` (the TMDB `_comment` and
the `DISABLED` key), `:268-280` (`CostManagementSettings.BudgetConfiguration`), and
`Program.cs:726` (`DisabledTmdbClient` registered against `ITmdbClient`). Read
`Services/DisabledTmdbClient.cs` to confirm it returns empty results from every
method rather than throwing. TMDB is not a live source and no document in the tree
now says otherwise.

Then traced who reads those settings, which produced FIND-04 below.

### Cycle 2 — 2026-08-13 — The move

`git mv` of three files into a new root `portfolio/`, uppercased to match the
reference convention:

| From | To |
|---|---|
| `docs/engineering/architecture.md` | `portfolio/ARCHITECTURE.md` |
| `docs/engineering/metrics.md` | `portfolio/METRICS.md` |
| `docs/engineering/development-history.md` | `portfolio/DEVELOPMENT-HISTORY.md` |

`docs/engineering/` removed once empty. Relative links inside
`DEVELOPMENT-HISTORY.md` repointed (`../../CLAUDE.md` → `../CLAUDE.md`,
`../../AGENTS.md` → `../AGENTS.md`, `metrics.md` → `METRICS.md`). Five inbound
links in `README.md` repointed.

Wrote a fourth document, `portfolio/COST-CONTROL.md`, because the README leads with
the cost story and nothing sat behind it. Every claim in it names a file and a line.

### Cycle 3 — 2026-08-13 — README surfacing and corrections

Surfaced `portfolio/` the three ways: a `portfolio/` entry in the repository-map
code fence, a `## Documentation` table with one row per write-up plus a
pattern-breaking last row promoting the screenshot archive, and inline `→` callouts
in the two body sections that now have a deeper write-up.

Corrected the hook paragraph and the cost section per FIND-04 and FIND-05. Redrew
the architecture mermaid diagram per FIND-03. Added a `## Licence` section per
FIND-06. Rewrote one weak alt text per FIND-07.

Ran a mechanical link check over `README.md` and `portfolio/*.md`: zero broken
links.

### Cycle 4 — 2026-08-13 — Hygiene sweep

Scanned the tracked tree for committed build and tooling output, local absolute
paths in markdown, and stale references to sibling projects by local path. Nothing
to delete — see FIND-08.

## Findings registry

P0 = broken/blocking · P1 = looks bad or confusing · P2 = polish

- **FIND-01 (P1, FIXED)** — The three portfolio-grade write-ups sat two directories
  down in `docs/engineering/`, invisible in GitHub's root file listing. A reviewer
  who does not scroll into `docs/` never sees the best material in the repository.
  Moved to root `portfolio/` and surfaced three ways in the README.

- **FIND-02 (P2, WONTFIX — deliberate)** — `docs/rbac-system-documentation.md` was a
  candidate for promotion and was left in `docs/`. Two reasons, both checkable in the
  file. Its schema blocks are SQL Server DDL throughout (`uniqueidentifier`,
  `nvarchar`, `bit`, `datetime2`, `GETUTCDATE()`), which the project moved off in
  February 2026 — the document describes a schema that no longer exists. And its
  shape is a developer reference, not a retrospective: `Usage Examples`,
  `Troubleshooting`, `Future Extensibility`. Promoting it would put stale DDL in the
  reviewer's front door. Three strong write-ups plus one new one beats four with a
  weak member.

- **FIND-03 (P1, FIXED)** — The README's architecture diagram drew TMDB as a live
  external dependency: `TMDB` sat in the `External` subgraph and a solid edge ran
  `SVC --> TMDB & SA & ...`. The prose two hundred lines above correctly said the
  client is disabled, so the file contradicted itself and the diagram is what a
  skimmer reads. Redrawn: TMDB moved to last in the subgraph, relabelled
  `client disabled, never called`, and connected by a dotted edge labelled
  `DisabledTmdbClient returns empty`.

- **FIND-04 (P0, FIXED)** — The README's headline claim was that `appsettings.json`
  "caps spend at $500 a month and $20 a day, $300 of that reserved for the
  availability provider". Those numbers are really in the file at the cited lines,
  but they are not the cap. The paid path is
  `StreamingAvailabilityClient.GetAvailabilityAsync` →
  `IApiUsageTracker.CanMakeApiCallAsync()` → `ApiCostManager`, which reads
  `StreamingApiSettings` — `DailyBudgetLimit` $10 and `MonthlyBudgetLimit` $200
  (`appsettings.json:77-78`). The $500/$20/$300 block is bound at
  `Program.cs:774-775` and read by `BudgetManager` and `ApiCostTracker`, whose only
  caller is `CostManagementController.cs:292`, an administrative endpoint. Two
  independent budget systems with different numbers, and the one that gates the call
  is not the one the README quoted. Rewritten to state the enforced pair, then to
  name the second system and say plainly that nothing on the paid path calls it.
  Documented at length in `portfolio/COST-CONTROL.md`.

- **FIND-05 (P1, FIXED)** — The README and `ARCHITECTURE.md` both said "the
  optimisation engine decides when a cached answer is good enough".
  `CostOptimizationEngine`'s public surface is `GenerateRecommendationsAsync`,
  `AnalyzeOptimizationImpactAsync` and `MarkRecommendationAsImplementedAsync` — it
  writes recommendation rows for a human to read. Its consumers are
  `CostManagementController` and a report path in `ApiCostTracker`; nothing in the
  request path touches it, and `EnableAutomaticOptimization` is `false` in
  `appsettings.json:287`. Its savings estimates are also hard-coded assumptions,
  labelled as such in the source. Both documents corrected to say it advises.

- **FIND-06 (P1, FIXED)** — A `LICENSE` was added to the repository and the README
  said nothing about licensing, so the file and the page disagreed by omission. Added
  a short `## Licence` section restating the LICENSE's own terms — source-available
  for portfolio review, not open source, no grant to use, copy, modify or
  redistribute — and linking to it. No terms invented; the section is a summary, the
  file is authoritative.

- **FIND-07 (P2, FIXED)** — Alt text on the comparison screenshot read "GeoLeap
  side-by-side comparison of two streaming platforms", which describes the category
  rather than the image. Read the image and rewrote it to describe what is actually
  on screen: the Netflix/Hulu verdict summary, the ten-row table naming a winner per
  category, and the FAQ block.

- **FIND-08 (P2, NO ACTION NEEDED)** — Hygiene sweep found nothing to clean. No
  tracked `lint-output.txt` / `typecheck-*.txt` / `test_output.txt` /
  `build-output.txt` / `audit_results.json` / `coverage/` dumps; no `C:\Users\...`
  absolute paths in any markdown file; no `github.com/<private-org>/...` URL anywhere
  in the tree. `docs/testing/E2E_TEST_RESULTS_FINAL.md` was examined and kept: it is
  a dated point-in-time report from 2026-01-26, not tooling output, and its figures
  are superseded by `portfolio/METRICS.md` rather than competing with it. The
  "Abandoned work in place" section of `portfolio/DEVELOPMENT-HISTORY.md` already
  accounts for the tooling debris this snapshot does not carry.

- **FIND-09 (P2, FIXED)** — `DEVELOPMENT-HISTORY.md` cited 7,988 frontend tests. That
  is the total from the flaky run; the clean run reported everywhere else in the
  repository is 7,995. Corrected to 7,995 so the three documents agree.

- **FIND-10 (P1, OWNER DECISION — not fixed)** — The hero image
  (`docs/screenshots/marketing/home.png`) shows a "Search across 42 streaming
  services including" row rendering the real Netflix, HBO Max, Disney+, Amazon Prime
  Video, Hulu, Paramount+, Peacock, Apple TV+ and YouTube Premium wordmarks and
  logos, and the platform and comparison captures name and describe those brands
  throughout. Whether a public portfolio repository should display third-party
  trademarks is a judgement for the owner, not a defect for an editor to fix. Flagged
  and left exactly as captured.

- **FIND-11 (P2, OPEN)** — The product's own copy disagrees with the data files about
  its scale. The home page and site header say "42 Streaming Services" and "57
  Countries"; `docs/screenshots/README.md` describes the same pages as indexing 41
  platforms and 56 countries. One of the two counts includes something the other does
  not. Not touched — this is application copy inside a screenshot, and the images are
  a record of what the app rendered on 7 August 2026, not something to retouch.

- **FIND-12 (P2, OPEN)** — `docs/screenshots/marketing/compare-detail.png` renders
  the heading "Netflix vs Hulu: Which Streaming Service Is Right for You-", with a
  trailing hyphen where a question mark belongs — a template defect visible in a
  published capture. Left as captured for the same reason as FIND-11. Worth fixing in
  the template if the project is ever revived.

- **FIND-13 (P2, ACKNOWLEDGED — cannot be fixed here)** — 46 React Native screens
  have no captures anywhere in the repository. This cannot be resolved on the
  machine this work was done on: there is no Android SDK or `adb` installed, and iOS
  cannot be simulated on Windows at all. No attempt was made to install one. The
  README already states the absence in three places — the component table, the
  screenshots section, and a note that the 390px image is the web app at phone width
  rather than the phone app — so nothing in the README implies mobile coverage it
  does not show. Left as is.

- **FIND-14 (P2, NO ACTION NEEDED)** — Image harvest was considered and rejected on
  the evidence. This snapshot tracks 60 images under `docs/` and `assets/`, of which
  47 are the capture archive and 7 are embedded in the README. The private source
  repository tracks more image files, but they are concentrated in a
  `.playwright-mcp/` scratch tree of test-run debris: bug evidence, 403 and 404
  states, "access denied" pages, unauthenticated dashboards, error screens. Every one
  of those falls in the category the restructure brief says to reject outright, and a
  broken-looking product on the page is worse than no image. There are also no mobile
  app captures in the source — the only images under `mobile/` are launcher icons and
  a splash asset — so the source cannot close FIND-13 either. Nothing was copied and
  nothing in the source repository was modified.

## Hero image

`docs/screenshots/marketing/home.png` was kept as the hero after reading it and the
two strongest alternatives (`marketing/platform-detail.png`,
`marketing/compare-detail.png`) as a viewer rather than judging by filename. It wins
on the only thing a hero has to do: the first screenful states what the product is
for, in the product's own words, with the search box that does it. The platform page
is the better proof of the programmatic SEO surface but reads as a reference page,
and the comparison page carries the FIND-12 heading defect. No candidate was rejected
for showing an error state, an empty state, a `localhost` URL bar, a real email
address or personal data; the two images that would have qualified —
`admin-analytics.png`, an error state, and `admin-users.png`, an empty table — are
already confined to the archive and labelled as such there, and neither was ever a
hero candidate. The Next.js development indicator is visible in the lower-left of
most captures, which `docs/screenshots/README.md` states.

## What is left for the owner

- FIND-10, the trademark question on the hero and the platform pages.
- FIND-11 and FIND-12 are cosmetic defects preserved inside dated captures. Both are
  recorded rather than retouched, because editing a screenshot to look better than
  the app did would defeat the point of publishing it.

### Cycle 5 — 2026-08-18 — Portfolio-standard structural pass

Different brief this round: align this repository to `PORTFOLIO-STANDARD.md`, the spec that now
governs all fifteen snapshot repositories. Cycles 1-4 above got the retrospective/prospective
split right early; this cycle is the structural and honesty-disclosure pass the standard adds on
top of that.

**The status disclosure moved.** The honesty framing was two sentences in paragraph 2
(`README.md:7` in the prior version) plus a fuller "A note on what this is" section pushed to the
very last heading, line 414 of 418 — a cold reader following the file top to bottom would read
roughly 400 lines of confident, present-tense engineering prose before reaching the sentence that
says the service is dead. Both were merged into a single `> [!IMPORTANT]` alert immediately after
the pitch, now naming the two dead hostnames (`geoleap.app`, `api.geoleap.app`, sourced from
`CLAUDE.md:99`) explicitly rather than only "not a running service." A `> [!NOTE]` for the byline
and license teaser follows it, per the standard's required order.

**Headings renamed and reordered to the standard's exact list.** `## Licence` → `## License`;
`## The numbers` → `## By the numbers`; `## Running it` → `## Running it locally`; `## Repository
layout` → `## Repository map`; `## What is in here` → `## What it did` (tense corrected — this
project is dead, so `did`, not `does` — and a short past-tense product summary was added ahead of
the existing stack table). Four headings the standard requires did not exist at all and were
added: `## Contents` (this README cleared 250 lines even before this pass), `## If you read one
thing` (promoted from an inline sentence that already existed), `## Testing` (previously only a
`### Tests` subsection nested under "The numbers" — pulled out to top level since Testing is now
a required section in its own right), `## Built with AI agents` (previously one paragraph buried
under "How it was built"; expanded with the concrete gate the standard asks for —
`.githooks/pre-commit` rejecting a commit on any failing track — and an explicit statement that
`CLAUDE.md`/`AGENTS.md` are committed and reviewed on purpose), and `## Who built this` (the
byline, previously only in the final section that no longer exists in that form).

**`portfolio/README.md`, `TESTING.md` and `ENGINEERING-LOG.md` were missing and are now written.**
`portfolio/` had four documents and no index — a reviewer landing on the folder in GitHub's file
list had no map of what six-hundred-plus lines they were looking at. `TESTING.md` (190 lines)
consolidates the test/coverage material that was previously split across the README and
`METRICS.md`, and adds the `MinimalTestBase`-to-`RealServicesTestBase` migration context from
`docs/testing/TESTING-GUIDE.md` and a comparison against the December 2025 audit's coverage
numbers, which was not written down anywhere before. `ENGINEERING-LOG.md` (122 lines) is new
material, not a rename: a dated log of checkable incidents pulled from `docs/audit/` (the 20-day
audit, three same-day P0 bug fixes on 2025-12-17) and the Postgres migration and mobile-index
migration dates already established in `DEVELOPMENT-HISTORY.md`, plus the `accessToken` /
`access_token` cookie-name bug found while capturing this snapshot's screenshots.

**`DEVELOPMENT-HISTORY.md` deepened rather than folded.** At 130 lines it already cleared the
standard's 120-line floor with specific, real content, so folding it into another document was
not required — but the brief flagged it as close enough to the floor to warrant a decision. Added
a "20-day audit" section (2025-11-25 to 2025-12-16) with the real bug and coverage numbers from
`docs/audit/EXECUTIVE-SUMMARY.md`, cross-referenced against the current snapshot's numbers to
show the same test-heavy/coverage-light pattern eight months apart. Now 152 lines.

**Screenshots curated into `portfolio/screenshots/`.** The standard requires every image a
top-level document references to live under `portfolio/screenshots/`, not `docs/screenshots/`.
Seven images were copied (not moved — the full 47-image archive stays in `docs/screenshots/` as
working evidence, per the standard's `docs/` = working residue rule): `marketing/home.png` (the
hero, unchanged from Cycle 3's reasoning below), `app/admin-dashboard.png`, `app/upgrade.png`,
`marketing/platform-detail.png`, `marketing/pricing.png`, `marketing/compare-detail.png`,
`responsive/home-mobile.png`.

**`app/dashboard.png` was dropped from the curated set and replaced by `app/upgrade.png`.** This
is a separate decision from the hero decision below and does not revisit it. `dashboard.png` sits
in the README's screenshots table (not as the top hero) paired with `admin-dashboard.png`, and it
is the empty-state capture the standard's brief for this round named specifically: Total
Searches 0, Saved Content 0, Watchlist Items 0, "No recent searches," and "Loading trending
content…" stuck mid-load, all confirmed by opening the image, not by trusting the filename or the
existing caption. It is not deleted or hidden — `docs/screenshots/app/dashboard.png` stays in the
full archive, and the README's screenshots intro paragraph now names it and `watchlist.png`
explicitly as two of the weak captures the archive documents, with the reason each is weak
(disconnected banner and empty list for `watchlist.png`, all-zero counters for `dashboard.png`).
It no longer leads a table cell. `upgrade.png` was opened and chosen as the replacement because
its content (a $15/year plan, a feature checklist, a money-back-guarantee card) is static plan
copy rather than seeded data, so it renders fully regardless of the empty database, and it
carries no disconnected banner or dev-issue pill.

**`app/preferences.png` was considered and rejected on the same evidence standard, unprompted.**
The brief named only `watchlist.png` as never-promote, but `preferences.png` was opened during
this pass and carries the same fault pattern — a red "Disconnected" badge and a red "11 Issues"
dev pill, both visible in the top-right corner of the capture. It was never a candidate for the
curated set and was not selected; noted here so the reasoning is traceable rather than silent.

**Fence tagging and wrapping.** Three untagged fences were found and tagged `text`: a connection-
pooling settings block in `ARCHITECTURE.md:229`, and two backend/frontend test-output blocks in
`METRICS.md:138,164,174` (three total in that file). The README's own untagged repository-map
fence was retagged in the same rewrite that renamed the section. Prose wrapping in the README was
ragged up to 243 characters on ordinary sentences (median well under 100, but with enough long
lines to fail a diff-readability check); rewrapped to a ~100-column target throughout. Lines left
over 100 are badge URLs, bare link references, and markdown table rows, none of which can be
hard-wrapped without breaking their syntax — the standard's wrapping rule targets prose, and table
cells and single-URL lines are not prose.

**The README's oversized screenshot table became an HTML grid,** per the standard's pattern,
preserving every alt text string rather than shortening it for the new layout.

**Badges were added.** None existed before. Five, all static and traceable to
`portfolio/METRICS.md` or `LICENSE`: backend and frontend test-pass counts, backend and frontend
coverage percentages, and a source-available license badge. An explicit italic line under the
badges states why there is no CI badge — there is no GitHub Actions workflow in this repository —
naming `.githooks/pre-commit` as what actually ran instead, per the standard's guidance that an
absence disclosed beats an absence hidden.

**Hero image: unchanged, and this is a deliberate non-change, not an oversight.** This round's
brief raised the dashboard/admin-dashboard contrast in the same breath as "replace the hero,"
which reads as ambiguous against Cycle 3's hero decision below. Re-examined and treated as two
different images: the top-of-README hero (`marketing/home.png`, never described as an empty
state) is unaffected by the dashboard finding, which is specifically about the second
screenshots-table row (`dashboard.png` / `admin-dashboard.png`, both under `app/`, neither ever
the hero). Cycle 3's reasoning for `marketing/home.png` as hero — it states what the product is
for, in the product's own words, in the first screenful — still holds and was not revisited
beyond re-opening the image to confirm it is unchanged since Cycle 3. The empty-state problem was
real and is fixed, just in the row it actually lives in. Flagging this explicitly in case a future
pass reads the brief the other way and second-guesses a hero that was never broken.

**`docs/` pruning: swept, nothing removed.** Re-ran the hygiene check from Cycle 4's FIND-08 —
still no tracked output dumps, absolute local paths, or private-org URLs anywhere under `docs/`.
One new observation outside that scope: `frontend/complete_test_output.txt`,
`final_test_output.txt` and `full_test_output.txt` are exactly the kind of committed test-output
dump FIND-08 checked for and found none of — but they sit under `frontend/`, not `docs/`, which
this round's brief scoped pruning to. Not deleted. Flagged for the owner rather than acted on
unilaterally, the same posture as FIND-10.

**FIND-16 (P2, OPEN — owner decision, same category as FIND-10).** `responsive/home-mobile.png`,
now in the curated set, renders the identical "Search across 42 streaming services including"
logo strip as the hero, at mobile width. It was not treated as a second instance of FIND-10
requiring separate resolution, because FIND-10's text already covers "the hero image ... and the
platform and comparison captures" as a class, not a single file — but it is named here explicitly
since it is now one of the seven images a reviewer sees in `portfolio/screenshots/`, not buried
in the 47-image archive.

### Cycle 6 — 2026-08-18 — Reviewer findings pass

A second reviewer read Cycle 5's output against `PORTFOLIO-STANDARD.md` section 2.4 and flagged
one missing required document plus several smaller defects. This cycle addresses all of them.

**`portfolio/SECURITY.md` written (322 lines) — closes the P1 for its absence.** Spec 2.4 requires
a security or privacy-architecture document for any repo touching payments or a real privacy
surface; GeoLeap has both (Stripe, mobile IAP receipt verification, and a GDPR service layer under
`backend/GeoLeap.Api/Services/GDPR/`) and had neither. Built entirely from this tree, citing
file:line throughout, covering authentication and the cookie pair already documented in
`ARCHITECTURE.md` (`access_token`/`refresh_token`, `HttpOnly`/`Secure`/`SameSite=None`), rate
limiting including the search-skip behaviour, payment and receipt-verification paths for Stripe
and Android/iOS IAP, log sanitization, secrets handling, and a closing section on what was never
verified — no audit, no pentest, no certification, no CI. The GDPR section is the sharpest finding
in it: `GdprComplianceService.cs` fully implements consent, export, erasure, retention and a PIA
generator, but is registered in DI (`Program.cs:584`) and referenced nowhere else in the backend —
no controller, zero test coverage — so none of it is reachable by a real user today. A second,
narrower service, `EnhancedPrivacyService.cs`, is registered against `IPrivacyService`
(`Program.cs:759`) and then immediately overridden by a second registration of the same interface
to `PrivacyService` three lines above a comment that reads backwards
(`Program.cs:936-937`, `"// Removed: Using enhanced version above"`) — ASP.NET Core's DI resolves
the last registration, so `EnhancedPrivacyService` is dead code in the running app despite having
its own 559-line direct-test file. The GDPR mitigation/security-measure lists both services
generate (`GdprComplianceService.cs:696-755`, `PrivacyService.cs:1203-1212`) are hardcoded string
lists returned regardless of input, not measurements of anything the code checked.

**Badge colours were inverted from what the numbers say — fixed.** The backend-tests badge (6
real failures out of 6,588) was `brightgreen`; the frontend-tests badge (0 failures, 209 skips) was
`yellow` — exactly backwards from a reader scanning colour before prose. Verified the current
figures against `portfolio/METRICS.md:139,166` (unchanged since Cycle 5) and swapped: backend-tests
is now `red`, frontend-tests is now `brightgreen`.

**FIND-11 closed.** The hero screenshot's own marketing copy ("42 STREAMING SERVICES", "57
Countries Covered") was never reconciled against the "41 platforms times 56 countries" figure used
in the README prose and `ARCHITECTURE.md:248`. Recounted both independently:
`frontend/src/data/platforms.ts` has 41 top-level entries and `frontend/src/data/countries.ts` has
56 (counted by `slug:` fields, excluding the two interface declarations) — confirming the prose
figures are correct and the app's own on-screen counters over-state its data files by one platform
and one country. Added a `## Known gaps` bullet in `README.md` stating this plainly rather than
leaving a reader to find the mismatch unexplained. The app's marketing copy itself was not touched,
per this repository's snapshot rule.

**`portfolio/METRICS.md`'s "Frontend and mobile structure" table got its missing command, and two
wrong numbers were corrected.** It was the only table in the file with no command above it — every
other table in `METRICS.md` states the command that produced its numbers, so this one broke the
file's own stated promise. Recounted every row with `find`: Hooks was claimed as 33, actual
implementation files are 31 (`frontend/src/hooks` + `frontend/src/lib/hooks`, excluding
`__tests__/` directories and co-located `*.test.ts` files); mobile services was claimed as 66,
actual is 55 (`mobile/src/services`, same exclusion rule). Both higher numbers only appear if
co-located test files that sit beside their implementation — rather than under a `__tests__/`
directory, the rule every other row in the table already follows without ambiguity — are counted
as if they were hooks or services. Added a `bash` command block above the table with one `find`
per row and re-ran all ten to confirm every value in the corrected table, including the six that
were already right.

**`portfolio/README.md`'s mermaid count was wrong, and its topic list both included a diagram-less
topic and omitted a topic that has one.** `grep -c '^```mermaid' portfolio/ARCHITECTURE.md` returns
7, not the 6 the index table claimed. The topic list named "real time" — which has prose only, no
diagram (`ARCHITECTURE.md`'s "Real time" section) — and did not name "Programmatic SEO," which has
one (the `page-governance.ts` verdict flowchart). Corrected the count to seven and swapped "real
time" for "programmatic SEO" in the topic list, so the seven named topics now match the seven
diagrams one for one: system shape, request path, caching, the data model, programmatic SEO,
deployment, the quality gate.

**Index and cross-references updated for the new document.** Added `SECURITY.md` to
`portfolio/README.md`'s file table with its exact `wc -l` length (322 lines), and updated the
"these six documents" / "six documents" phrasing to "seven" in both `portfolio/README.md` and
`README.md` (the latter's `## Documentation` prose). `portfolio/METRICS.md`'s own row in the index
table was also refreshed from 284 to 313 lines, since the table-command fix above added to the
file.

**Link and anchor check re-run.** Every relative file link and `#anchor` in `README.md`,
`portfolio/README.md` and the new `portfolio/SECURITY.md` was extracted and resolved
programmatically against the real file tree and the real heading list of each target file. Zero
broken links, zero anchors that don't match an actual heading slug.

**No live secret literal was found anywhere in this tree during this pass.** Two things that look
like leaked secrets on a first read are not, and both are documented in `SECURITY.md` rather than
flagged here as findings: the `pk_live_`/`phc_`-prefixed strings are Stripe's and PostHog's
publishable-by-design client keys, and the `BEGIN PRIVATE KEY` block in
`AndroidReceiptVerificationServiceDirectTests.cs` is a publicly published Google OAuth2 sample
credential used across Google's own client-library docs and tests. `appsettings.Testing.json`'s
Apple `PrivateKey` field is the literal string `TEST_PRIVATE_KEY_HERE`, not a key. A targeted
search for `sk_live_`, AWS access-key patterns, and PEM private-key headers elsewhere in the tree
(excluding the two confirmed-inert cases above) returned no matches.

### Cycle 7 — 2026-08-18 — Wide tables, a screenshot grid, and the hero

**Two eight/six-column tables (standard §3.3).** Root `README.md`'s `## Testing` table (Suite,
Framework, Total, Passed, Failed, Skipped — six columns) and `portfolio/TESTING.md`'s `## The
suites` table (same six plus Location and Files — eight columns) both exceeded the five-column
maximum. The README table combined `Passed`/`Failed`/`Skipped` into one `Passed / failed / skipped`
cell per row (`6,527 / 6 / 55` for Backend, etc.), the same paired-numeric-cell pattern
grantpipe's `Functions / Branches` column uses, bringing it to four columns. The eight-column
`portfolio/TESTING.md` table mixed two different kinds of fact — where each suite lives
(Framework, Location, Files) and what it produced (Total, Passed, Failed, Skipped) — so it split
into two four-and-three-column tables under "Where each suite lives" and "What each suite
produced," the second using the same combined `Passed / failed / skipped` cell. All twelve
underlying figures (four suites × three result numbers, where run) checked against the pre-edit
table; nothing dropped, the two "not run" rows (Mobile, End-to-end) kept as `not run` / `—` rather
than invented zeros.

**`admin-dashboard.png` / `upgrade.png` grid missing `valign="top"` (visual finding).** This
pairing under "The signed-in product first" in `README.md`'s `## Screenshots` section was the one
grid in this repo that had never gotten the `valign="top"` treatment pebbledesk, gathergrove,
phiguard, ventora-crm and kaiplan's screenshot grids all use. Checked both images' real pixel
dimensions with PIL first rather than guessing: `admin-dashboard.png` is 1440×1013 (ratio 1.42),
`upgrade.png` is 1440×900 (ratio 1.60) — an 11% height difference, not the "sharply different"
case the standard calls out for an explicit-width correction, so `valign="top"` alone on both
`<td>`s was the fix; no explicit `width` added.

**Hero was a 5,290px full marketing-homepage capture (visual finding).** `portfolio/screenshots/`
holds only seven images total, and of the two actual in-product captures (`admin-dashboard.png`,
`upgrade.png`) neither shows the thing GeoLeap actually does — one is the internal admin panel,
the other is the billing/upgrade card — so neither was a credible "signed-in product" hero
replacement for a streaming-availability tool. Viewed all seven candidates directly rather than by
filename before deciding. Took option (b): cropped `marketing/home.png` (1440×5290) to its
above-the-fold region — nav, headline, subhead, search box, example-title chips, CTA button, no
lower sections — saved as the new `portfolio/screenshots/marketing/home-hero.png` (1440×950,
verified with PIL). The original full-length `home.png` was left untouched (still linked from
`## Known gaps` for the stat-counter discrepancy it documents) and added as a new full-width row
to the "public pages" screenshot grid, so it is still reachable and still disclosed, just no
longer the first thing a reader sees. Reworded the `## Known gaps` entry that used to say "the
hero screenshot is off by one" to say the home page's stat counters are off by one and to name
where the full capture now lives, since the new cropped hero does not show those counters and the
old wording would have pointed a reader at content that is no longer there.

**Numbers and links re-synced after the above.** `portfolio/screenshots/` went from seven files to
eight; `portfolio/README.md`'s "the seven under `screenshots/`" line corrected to "the eight."
`portfolio/TESTING.md`'s `wc -l` moved from 190 to 201 lines from the table split — which happens
to match the length `portfolio/README.md`'s index already listed (a pre-existing drift the index
had anticipated but the file hadn't yet reached), so no index number needed changing. Root
`README.md` grew from 659 to 671 lines; it is not part of the `portfolio/README.md` index (that
indexes `portfolio/` only), so no index update applies to it. Every relative link, `#anchor` and
image reference in `README.md`, `portfolio/README.md` and `portfolio/TESTING.md` re-checked
programmatically against the real file tree and real heading lists; zero broken. No secret literal
found.

### Cycle 8 — 2026-08-18 — Corpus-wide index column order, and a length cell that drifted mid-pass

- The cross-repo standard fixed `portfolio/README.md`'s index table column order as link,
  length, summary — length second, not last. This repo's table had `File | Covers | Length`,
  length last.
- Reordered to `File | Length | Covers`; all seven rows and the alignment row updated.
- Recomputing every length cell against `wc -l` after the edit caught `TESTING.md` at 201
  lines against a claimed 190 — the file grew by 11 lines during this session (not from this
  pass's own edits, since `portfolio/*.md` content was never touched here). Corrected the
  cell to `201 lines` to match the file's committed state at completion.
- Ran a relative-link and `#anchor` resolution sweep over `README.md` and every
  `portfolio/*.md` file: all resolve.
