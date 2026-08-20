# `portfolio/`

This is the retrospective, reader-facing half of this repository. It exists for whoever is
evaluating this project (a hiring manager, an interviewer, a curious engineer), not for future
me. Every claim in these seven documents traces back to a file, a line number, or a command you
can run yourself against this snapshot; none of it is aspirational. `docs/` is the other half,
and is described at the bottom of this page.

If you read one thing, read [COST-CONTROL.md](COST-CONTROL.md). It is the sharpest honesty case
in the repository: two independent budget systems with different spending limits, and only one
of them is actually wired into the code path that spends money.

## What is here

| File | Length | Covers |
|---|---:|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | 374 lines | System shape, request path, caching, the data model, programmatic SEO, deployment, and the quality gate, with seven mermaid diagrams |
| [COST-CONTROL.md](COST-CONTROL.md) | 222 lines | The paid call path line by line, the two budget systems, and where the spending gate fails open |
| [DEVELOPMENT-HISTORY.md](DEVELOPMENT-HISTORY.md) | 152 lines | The 2,322-commit private history by month and by commit type, a mid-build audit, and what the AI-agent process did and did not fix |
| [ENGINEERING-LOG.md](ENGINEERING-LOG.md) | 119 lines | Dated engineering incidents and decisions: three P0 bug fixes, a database migration, a bug found while preparing this snapshot |
| [METRICS.md](METRICS.md) | 318 lines | Every number in the README, with the exact command that produced it |
| [SECURITY.md](SECURITY.md) | 301 lines | Authentication and cookies, rate limiting, what the GDPR services actually implement versus what they only model, Stripe and mobile IAP receipt verification, log sanitization, and secrets handling |
| [TESTING.md](TESTING.md) | 201 lines | Both test suites in full: what ran, what is skipped and why, the coverage gate, and what was not run for this snapshot |

Screenshots referenced from the README and from these documents live in
[`screenshots/`](screenshots/), a curated subset of the full capture archive: see
[The other half of this repository](#the-other-half-of-this-repository) below.

## Who this is for

Written for someone deciding whether the engineering behind this project is real, not for me six
months from now. That means every number has a source, every claim about what a piece of code
does links to that code, and where something is weaker than it looks, a gate that fails open, an
abstraction only half-adopted, a test suite that is large but not well covered, that is stated
here rather than left for a reader to discover independently.

## The other half of this repository

`docs/` holds the working documents from the eleven months this project was built: audits,
research, and the roughly 130-file user-story archive, kept as written rather than rewritten for
this snapshot, so several of them describe a schema or a product state that no longer exists.
`portfolio/` is what got written afterward to make that work legible to a reader. Within it,
`docs/screenshots/README.md` is the full 47-image capture archive; the eight under
[`screenshots/`](screenshots/) here are the subset curated for the top-level README.
