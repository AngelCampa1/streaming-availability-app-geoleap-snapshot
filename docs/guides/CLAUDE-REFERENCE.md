# GeoLeap - Claude Code Detailed Reference

This document contains detailed configuration and reference information for Claude Code development on the GeoLeap project. For the concise version, see [CLAUDE.md](../../CLAUDE.md).

## Table of Contents
- [Available Agents](#available-agents)
- [Port Configuration](#port-configuration)
- [Testing Anti-Patterns](#testing-anti-patterns)
- [Bug Tracking Protocol](#bug-tracking-protocol)
- [Concurrent Execution Examples](#concurrent-execution-examples)
- [MCP vs Claude Code Tools](#mcp-vs-claude-code-tools)
- [SPARC Workflow](#sparc-workflow)

---

## Available Agents (54 Total)

### Core Development
- `coder` - Implementation specialist
- `reviewer` - Code review specialist
- `tester` - Testing specialist
- `planner` - Strategic planning
- `researcher` - Research and information gathering

### Swarm Coordination
- `hierarchical-coordinator` - Queen-led hierarchical coordination
- `mesh-coordinator` - Peer-to-peer mesh network
- `adaptive-coordinator` - Dynamic topology switching
- `collective-intelligence-coordinator` - Collective decision making
- `swarm-memory-manager` - Memory management across swarms

### Consensus & Distributed Systems
- `byzantine-coordinator` - Byzantine fault-tolerant consensus
- `raft-manager` - Raft consensus algorithm
- `gossip-coordinator` - Gossip-based protocols
- `consensus-builder` - General consensus building
- `crdt-synchronizer` - CRDT synchronization
- `quorum-manager` - Quorum management
- `security-manager` - Security mechanisms

### Performance
- `perf-analyzer` - Performance bottleneck analysis
- `performance-benchmarker` - Benchmarking
- `task-orchestrator` - Task coordination
- `memory-coordinator` - Memory management
- `smart-agent` - Intelligent coordination

### GitHub Integration
- `github-modes` - GitHub workflow orchestration
- `pr-manager` - Pull request management
- `code-review-swarm` - Multi-agent code review
- `issue-tracker` - Issue management
- `release-manager` - Release coordination
- `workflow-automation` - CI/CD automation
- `project-board-sync` - Project board sync
- `repo-architect` - Repository structure
- `multi-repo-swarm` - Cross-repo orchestration

### SPARC Methodology
- `sparc-coord` - SPARC orchestrator
- `sparc-coder` - TDD implementation
- `specification` - Requirements analysis
- `pseudocode` - Algorithm design
- `architecture` - System design
- `refinement` - Iterative improvement

### Specialized
- `backend-dev` - Backend API development
- `mobile-dev` - React Native/Expo development
- `ml-developer` - Machine learning
- `cicd-engineer` - CI/CD pipelines
- `api-docs` - OpenAPI documentation
- `system-architect` - System architecture
- `code-analyzer` - Code quality analysis
- `base-template-generator` - Template generation

### Testing
- `tdd-london-swarm` - TDD London School
- `production-validator` - Production validation

### Other
- `migration-planner` - Migration planning
- `swarm-init` - Swarm initialization

---

## Port Configuration

### Development Ports
| Service | Port | Protocol | Notes |
|---------|------|----------|-------|
| Backend API | 8020 | HTTP | Primary API endpoint |
| Frontend | 3020 | HTTP | Next.js dev server |
| Mobile (Expo) | 5070 | HTTP | Metro bundler |
| SQL Server | 9020 | TCP | Docker container |
| Redis | 6379 | TCP | Docker container |

### Production
| Service | URL |
|---------|-----|
| Frontend | https://geoleap.app |
| Backend API | https://api.geoleap.app |
| Deployments | Automatic from `origin/main` |

---

## Testing Anti-Patterns

### Priority Order
```
1. CODE COVERAGE (Does test execute REAL code?) - HIGHEST
2. TEST QUALITY (Does test verify actual behavior?)
3. PASS RATE (Does test pass?) - LOWEST
```

### What MUST Be Mocked
- External APIs (third-party services)
- Email/SMS services
- Redis/Cache (for unit tests)
- Native modules (React Native)
- Third-party SDKs
- File system operations

### What MUST NOT Be Mocked
- Service classes
- Utility functions
- Validators
- State management
- Data transformations
- UI component logic

### Forbidden Patterns
- Accepting any status code: `Assert.Contains(statusCode, [200, 400, 500])`
- Factory with 60+ mocked services
- Mocking the thing being tested
- Mocking UI components

### Mock-to-Test Ratio
Target: < 0.3 (less than 30% mock code vs test code)

---

## Bug Tracking Protocol

### Bug ID Format
`BUG-CATEGORY-NNN` (e.g., `BUG-FE-001`, `BUG-BE-042`)

### Severity Levels
| Level | Code | Response Time | Example |
|-------|------|---------------|---------|
| CRITICAL | P0 | Hours | Production blocker, data loss, security |
| HIGH | P1 | 1 day | Major feature broken |
| MEDIUM | P2 | 1 week | Partial feature, workaround exists |
| LOW | P3 | When convenient | Minor UX, edge case |

### Bug Discovery Workflow
1. **DISCOVER** - Test reveals bug
2. **LOG** - Document in `docs/bugs/BUG-XXX-description.md`
3. **FIX** - Implement immediately
4. **VERIFY** - Test passes with REAL code
5. **COMMIT** - `fix(scope): BUG-XXX description`
6. **CONTINUE** - Proceed to next test

### Bug Documentation Template
```markdown
# BUG-XXX-description

## Severity: P0/P1/P2/P3
## Status: OPEN/IN-PROGRESS/FIXED

## Location
- File: path/to/file.ts
- Line: 123

## Root Cause
[Analysis of why the bug occurred]

## Impact
[What features/users are affected]

## Fix
[Description of the fix applied]
```

---

## Concurrent Execution Examples

### Correct: Single Message with All Operations
```javascript
// All in ONE message:
Task("Research", "Analyze requirements...", "researcher")
Task("Coder", "Implement features...", "coder")
Task("Tester", "Create tests...", "tester")

TodoWrite({ todos: [/* 5-10 todos */] })

Write("backend/feature.cs")
Write("frontend/Feature.tsx")
Write("tests/feature.test.ts")
```

### Incorrect: Multiple Messages
```javascript
// DON'T DO THIS:
Message 1: Task("agent 1")
Message 2: TodoWrite({ todos: [single] })
Message 3: Write("file.js")
```

### Rules
- **TodoWrite**: Batch 5-10+ todos in ONE call
- **Task tool**: Spawn ALL agents in ONE message
- **File operations**: Batch ALL reads/writes in ONE message
- **Bash commands**: Batch ALL terminal ops in ONE message
- **Maximum 3 concurrent background tasks**

---

## MCP vs Claude Code Tools

### Claude Code Handles ALL Execution
- Task tool (spawn agents)
- File operations (Read, Write, Edit, Glob, Grep)
- Code generation
- Bash commands
- TodoWrite
- Git operations

### MCP Tools ONLY Coordinate
- `mcp__claude-flow__swarm_init` - Topology setup
- `mcp__claude-flow__agent_spawn` - Agent type definitions
- `mcp__claude-flow__task_orchestrate` - High-level orchestration

**Key**: MCP coordinates strategy, Claude Code's Task tool executes.

---

## SPARC Workflow

### Phases
1. **Specification** - Requirements analysis
2. **Pseudocode** - Algorithm design
3. **Architecture** - System design
4. **Refinement** - Iterative improvement
5. **Completion** - Final implementation

### Commands
```bash
# List modes
npx claude-flow sparc modes

# Run specific mode
npx claude-flow sparc run <mode> "<task>"

# TDD workflow
npx claude-flow sparc tdd "<feature>"

# Parallel batch
npx claude-flow sparc batch <modes> "<task>"

# Full pipeline
npx claude-flow sparc pipeline "<task>"
```

---

## Design System

### Color Tokens
| Name | Hex | Usage |
|------|-----|-------|
| Stream Violet | `#7c3aed` | Primary brand |
| Golden Popcorn | `#f59e0b` | Accent/warning |
| Electric Cyan | `#06b6d4` | Info/links |
| Stream Green | `#10b981` | Success |

### Rules
1. **NEVER** hardcode colors - Use `theme.colors.*`
2. **NEVER** hardcode spacing - Use `theme.spacing[1-6]`
3. **NEVER** use `rgba()` directly - Use `theme.colors.overlay.*`
4. **Mobile**: Use `useTheme()` from `../theme/ThemeProvider`
5. Sync all changes between web and mobile

### References
- [Unified Color System](../UNIFIED_COLOR_SYSTEM.md)
- [Compliance Report](../design-system-compliance-report.md)
