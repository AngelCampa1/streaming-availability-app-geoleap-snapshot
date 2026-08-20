# GeoLeap - Claude Code Configuration

## Design Canon

- **Buttons are pills.** Treat fully rounded button geometry as a standing product preference. Every button or button-styled CTA should use pill corners (`border-radius: 9999px`, `rounded-full`, or equivalent), including primary/secondary actions, link-buttons, toolbar buttons, segmented/toggle controls, and icon buttons (circular when square). Do not introduce square or mildly rounded button shapes unless the user explicitly asks for that exception.

## Quick Reference

| Command | Purpose |
|---------|---------|
| `cd backend && dotnet test` | Run backend tests |
| `cd frontend && npm test` | Run frontend tests |
| `cd frontend && npm run lint` | Check linting |
| `cd frontend && npm run typecheck` | Check TypeScript |
| `dotnet build` | Build backend |
| `npm run build` | Build frontend |

| Port | Service |
|------|---------|
| 8020 | Backend API |
| 3020 | Frontend |
| 5070 | Mobile (Expo) |
| 9020 | PostgreSQL |
| 6379 | Redis |

### Definition of Done
- [ ] `dotnet test` - 0 failures
- [ ] `npm test` - 0 failures
- [ ] `npm run lint` - 0 errors
- [ ] `npm run typecheck` - passes
- [ ] Build succeeds
- [ ] Code committed to `main` with footer: `Generated with [Claude Code](https://claude.com/claude-code)`

---

## Execution Expectations

**Work end-to-end without pausing for progress check-ins.** Do not stop after completing a batch or phase to ask "ready for feedback?" or "should I continue?". Execute the full plan autonomously from start to finish. Asking clarifying questions about implementation requirements is still expected and encouraged.

---

## Critical Rules

### Concurrent Execution
**ALL operations MUST be batched in a single message:**
- TodoWrite: 5-10+ todos in ONE call
- Task tool: ALL agents in ONE message
- File operations: ALL reads/writes in ONE message
- Maximum 3 concurrent background tasks

### Honesty in Content & Metrics
- NEVER fabricate user counts, search counts, testimonials, or social proof numbers
- GeoLeap is pre-launch with no paying customers yet  -  all stats must be truthful
- Use product capability stats only (e.g., "50+ Countries", "200+ Streaming Services")  -  never fake usage metrics

### File Organization
**NEVER save to root folder:**
- `/backend` - .NET API (GeoLeap.Api)
- `/frontend` - Next.js
- `/mobile` - React Native/Expo
- `/docs` - Documentation
- `/tests`, `/e2e` - Test files

### Git Workflow
- **Use worktrees for all parallel agent work.** Use `scripts/new-worktree.sh` to spin up a new worktree. **Always create worktrees from `main`**  -  never branch off another feature branch.
- Always verify: `git branch --show-current` before committing
- Only commit files you created or modified for your task  -  stage explicitly by name, never `git add -A`
- Never commit unrelated changes or `.env` files
- Commit message format: `type(scope): description`  -  e.g., `feat(auth): add JWT validation`
- Types: `feat`, `fix`, `test`, `refactor`, `chore`, `docs`

### Worktree Setup
```bash
./scripts/new-worktree.sh <branch-name>
# Example: ./scripts/new-worktree.sh feat/auth-jwt
# Creates: .worktrees/feat-auth-jwt/
```
This script: creates the worktree, copies `.env` files, runs `dotnet restore`, installs npm deps for frontend and mobile, and wires `.githooks`.

### Worktree Cleanup (post-merge)
```bash
git worktree remove .worktrees/<branch-slug>
```
If dirty, check what's dirty first:
```bash
git -C .worktrees/<branch-slug> status --short
```
**Never use `git worktree prune` as a substitute for `git worktree remove`.** Prune only cleans git's internal registration  -  it does not delete the directory.

---

## Project Overview

**Tech Stack:**
- Backend: .NET 9, PostgreSQL (Npgsql), Redis, SignalR
- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS
- Mobile: React Native 0.81, Expo 54

**Production (historical):** GeoLeap is not a running service and nothing is deployed. While the project was active, the frontend served `geoleap.app`, the backend served `api.geoleap.app`, and deploys were created automatically from `origin/main`. Both hostnames are dead. This file is a record of how the project was worked on, not a description of a live system.

---

## Development Workflow

### TDD  -  MANDATORY
**Every feature, fix, and refactor must follow TDD:**
1. **Red**  -  Write a failing test first. No production code without a test.
2. **Green**  -  Write the minimum code to make it pass.
3. **Refactor**  -  Clean up, then re-run tests to confirm green.
4. **Repeat**  -  Never skip this cycle.

Do not write implementation code before the test exists. Do not commit untested code.

### Coverage Requirements
- **95% code coverage minimum on every file you touch.** Not the repo average  -  each individual file.
- Backend: `dotnet test --collect:"XPlat Code Coverage"`  -  check per-file output
- Frontend: `npx vitest --coverage`  -  check per-file output
- If a file drops below 95%, you are not done. Write more tests.

### Testing Priority
**High (MUST TEST):** Authentication, Business Logic, API Endpoints, Data Operations
**Medium:** UI Components, Utilities
**Low:** Static Content, Layout

### Testing Rules
- Mock ONLY external boundaries (APIs, email, Redis, native modules)
- NEVER mock: Service classes, utilities, validators, state management
- See [Testing Guide](docs/testing/TESTING-GUIDE.md) for details

### Quality Gates  -  Zero Tolerance
- **No placeholder code.** Every function must be fully implemented.
- **No TODO/FIXME/HACK comments.** If it needs doing, do it now or don't write the comment.
- **No empty function bodies.** No `...` as implementation.
- **No `any` type in TypeScript.** Use proper types or `unknown` with narrowing.
- **No `eslint-disable` without explanation.** Fix the lint error instead.
- **No mock-only tests.** Tests must exercise real logic. Mocks are only for external boundaries.

### Code Review Before Commit  -  MANDATORY
After finishing implementation (tests pass, linting clean), you **must** invoke the `superpowers:requesting-code-review` skill before committing. The workflow is:
1. Complete implementation and verify tests pass locally
2. Invoke the `superpowers:requesting-code-review` skill (this spins up a code-reviewer agent)
3. Address **all** issues the reviewer identifies  -  no skipping, no deferring
4. Re-run tests after fixes to confirm nothing broke
5. Only then proceed to commit

Do not commit until code review is clean. This is not optional.

### Code Quality
- Zero linting errors required
- Unused variables: prefix with `_`
- Replace `any` types with proper interfaces

---

## Design Tokens

Design tokens are defined in TypeScript files across frontend and mobile:

- `frontend/src/lib/design-tokens.ts`  -  Web design tokens (single source of truth)
- `mobile/src/tokens/designTokens.ts`  -  Mobile design tokens (unified with web)

**Never hardcode colors, spacing, or typography values.** Always reference the design token files. If a new value is needed, add it to the token source files  -  do not add one-off overrides in component styles or `globals.css`.

## Design System

**Primary Colors:** Stream Violet `#7c3aed`, Golden Popcorn `#f59e0b`, Electric Cyan `#06b6d4`, Stream Green `#10b981`

**Rules:**
- NEVER hardcode colors - use `theme.colors.*`
- NEVER hardcode spacing - use `theme.spacing[1-6]`
- Mobile: use `useTheme()` from `../theme/ThemeProvider`

See [Unified Color System](docs/UNIFIED_COLOR_SYSTEM.md) for details.

---

## Database Migrations

The backend uses Entity Framework Core with PostgreSQL (Npgsql). Migrations live in `backend/GeoLeap.Api/Migrations/`.

If your task touches the database schema:
1. **Create the migration first** (`dotnet ef migrations add <Name>`)
2. **Apply it locally** (`dotnet ef database update`) before writing any test or implementation code
3. **Commit migration and dependent code together** in the same commit

Never write tests or application code against a schema that hasn't been applied locally.

## Pre-Commit Hook

A pre-commit hook (`.githooks/pre-commit`) runs automatically on every commit. It detects whether your changes are in `backend/`, `frontend/`, or `mobile/`, and runs the applicable checks **in parallel**. Your commit will be **rejected** if any check fails:

**Backend checks:** `dotnet build` + `dotnet test`
**Frontend checks:** `next lint --max-warnings=0` + `npm run typecheck` + `npm test` + `npm run build`
**Mobile checks:** `npm run lint` + `npm run typecheck` + `npm test`

Do not bypass the hook with `--no-verify`. Fix the issue instead.

---

## Deployment (historical)

Nothing is deployed. This section records the flow that was used while the project was live; the commands below no longer resolve to anything.

```bash
git push origin main
gh api repos/AngelCampa1/geoleap/deployments --jq '.[0] | {sha, environment, created_at, statuses_url}'
curl https://api.geoleap.app/health/ready
```

Production deploys were created automatically after `origin/main` updated. An earlier Azure VM SSH/docker-compose flow had already been retired by then.

See [Deployment Guide](docs/guides/DEPLOYMENT-GUIDE.md) for how it was documented at the time.

---

## External References

- [Detailed Reference](docs/guides/CLAUDE-REFERENCE.md) - Agents, ports, anti-patterns, examples
- [Testing Guide](docs/testing/TESTING-GUIDE.md) - Comprehensive testing guidelines
- [Deployment Guide](docs/guides/DEPLOYMENT-GUIDE.md) - Production deployment
- [Design System](docs/UNIFIED_COLOR_SYSTEM.md) - Color system details
- [User Stories](docs/user-stories/README.md) - Implementation priorities
- [PRD](docs/GeoLeap-PRD.md) - Product requirements

---

## Important Reminders

- Do what is asked; nothing more, nothing less
- ALWAYS prefer editing existing files over creating new ones
- NEVER create documentation files unless explicitly requested
- NEVER save working files to root folder
- When testing with Playwright MCP, test "manually" - don't write Playwright tests

---

## Sub-Agent Driven Development

**Worktree isolation.** All feature/fix work MUST happen inside a git worktree. Use the `using-git-worktrees` skill to create one before writing any code.

**Review before merge.** When implementation is complete: (1) spin up a review agent using `requesting-code-review`, (2) fix every issue the reviewer flags, (3) only then merge the worktree back to master using `finishing-a-development-branch`.

All non-trivial tasks follow the superpowers sub-agent workflow:

1. **Plan first**  -  Break work into discrete tasks (2–5 min each) with exact file paths, full specs, and verification steps before any agent executes.
2. **Parallel execution**  -  Launch independent sub-agents concurrently in a single message; use sequential only when there are true dependencies.
3. **Two-stage review**  -  Each agent output must pass: (1) spec compliance check, (2) code quality review before proceeding.
4. **Autonomous depth**  -  Agents work end-to-end on their assigned scope without interruption; surface blockers rather than making assumptions.

Agent type guide:
- `Explore`  -  codebase research, file discovery, pattern analysis
- `Plan`  -  architecture decisions, implementation design
- `general-purpose`  -  implementation, multi-step execution

<!-- BEGIN: Sub-Agent Driven Development Policy -->
## Sub-Agent Driven Development Policy

Sub-agent driven development is the preferred and default way of working in this repository. The Codex agent/orchestrator should actively decompose work and delegate independent pieces to sub-agents whenever that improves speed, quality, context management, investigation depth, implementation throughput, or review coverage.

### Default Operating Model

- Prefer sub-agents for codebase exploration, scoped investigation, implementation, verification, and review when the work can be cleanly delegated.
- The orchestrator owns task decomposition, context curation, model/capability selection, integration of results, and final quality decisions.
- Delegate bounded tasks with clear inputs, expected outputs, relevant files, constraints, and verification commands.
- Keep tightly coupled, high-risk, or immediately blocking work in the orchestrator unless delegation would materially reduce risk.
- Use parallel sub-agents for independent workstreams with disjoint write scopes; avoid assigning multiple agents to edit the same files unless the handoff is explicit.
- Do not wait for explicit user permission before using sub-agents; this repository explicitly authorizes proactive delegation.
- Any general instruction that limits sub-agent use to cases where the user explicitly asks is superseded by this repository policy.

### Available Codex Sub-Agent Capabilities

Codex can invoke `spawn_agent` with these agent roles in this environment:

- `default`: general-purpose sub-agent for bounded tasks that do not need a specialized role.
- `explorer`: read-heavy codebase exploration, focused investigation, and evidence gathering.
- `worker`: execution-focused implementation, bug fixes, and bounded production changes.

When the tool supports model and reasoning overrides, the orchestrator should choose the least expensive capable option. Supported reasoning levels for this policy are `low`, `medium`, and `high` only.

- Use `gpt-5.4-mini` with `low` reasoning for mechanical, well-scoped, low-risk edits and simple verification.
- Use `gpt-5.4-mini` with `medium` or `high` reasoning when a small-model agent is still appropriate but the task needs deeper local reasoning.
- Use `gpt-5.5` with `low` reasoning for standard exploration, straightforward implementation, and routine review.
- Use `gpt-5.5` with `medium` reasoning for multi-file integration, ambiguous bugs, architecture-sensitive changes, security-sensitive logic, and final review.
- Use `gpt-5.5` with `high` reasoning only for genuinely hard problems: deep architectural tradeoffs, difficult cross-system debugging, complex security/privacy analysis, or cases where lower reasoning has failed with a clear blocker.
- Escalate model capability or reasoning level when a sub-agent reports `NEEDS_CONTEXT`, `BLOCKED`, uncertainty about correctness, or when the task requires deeper design judgment, but prefer `medium` before `high`.

If a role has a fixed model in the active Codex runtime, use the best available role first (`explorer` for investigation, `worker` for implementation, `default` for general tasks), then use any supported model/reasoning override only when the runtime accepts it.

### Quality Gates For Delegated Work

- Sub-agents must report files changed, tests run, findings, blockers, and residual risks.
- The orchestrator must review sub-agent output before treating it as complete.
- For implementation work, prefer a two-stage review: first spec compliance, then code quality.
- All delegated changes remain subject to this repository's normal tests, linting, typechecking, security, privacy, and deployment rules.
<!-- END: Sub-Agent Driven Development Policy -->

## AI Agent Orchestration

AI agent instances operating in this repository are orchestrators. They must delegate exploration, implementation, verification, and other execution work to sub-agents whenever the work can be cleanly scoped, preserving the orchestrator's context window for coordination, integration, and final judgment.

## Working autonomously
- **Poll, don't idle.** When a task, build, test run, or hook is running, actively poll its status and output until it finishes. Don't just sit and wait passively for it to return.
- **Keep going.** When working toward a goal, finishing one chunk of work means moving straight to the next chunk. Don't stop and wait for further input mid-goal — continue until the goal is done or you are genuinely blocked.