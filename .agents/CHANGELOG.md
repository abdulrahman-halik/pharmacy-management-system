# Anti-Kit Toolkit Changelog

## 2026.10.17

### Added

- Enhanced `design-spec` skill (`.agents/skills/design-spec/`):
  - Section 8: Dedicated specification and practical recipes for mapping `DESIGN.md` tokens into Tailwind CSS base styles and themes.
  - Token-to-Tailwind mapping matrix across colors, typography, rounded, spacing, and components.
  - Modern Tailwind CSS v4 setup utilizing `@theme` directives for CSS custom properties and `@layer base` for foundational HTML resets (`body`, `h1`–`h6`, `a`, `:focus-visible`).
  - Tailwind CSS v3 compatibility patterns mapping tokens into `tailwind.config.js` and `@layer base`.
  - Guidelines for token synchronization and WCAG AA contrast enforcement.

### Changed

- Bumped `design-spec` skill SemVer version to `1.1.0`.
- Updated design workflow in `design-spec` with explicit step for bridging tokens into Tailwind base and theme before UI implementation.
- Advanced toolkit version to `2026.10.17`.
- Synchronized component manifest and integrity lock across all agents, skills, workflows, and rules.

## 2026.10.16

### Added

- Integrated `senior-web-app-architect` skill framework (`.agents/skills/senior-web-app-architect/`):
  - SaaS architecture decision framework covering B2B/B2C multi-tenant hierarchy and context isolation.
  - Vertical slices (Feature-Based Architecture / Feature-Sliced Design under `src/features/<name>/`) with public API barrel exports.
  - Commercial feature entitlement gating and licensing (CBAC) decoupled from operational feature flags.
  - Zero-bundle-leak code splitting preventing enterprise bundle payload leakage to unauthorized tiers.
  - Production pre-launch failure drills (cross-tenant cache contamination, double-click billing idempotency, DAL authorization boundaries).
- Updated `frontend-specialist` agent skills and capability guidance for SaaS architecture and vertical slices.
- Updated `/frontend-master` workflow Phase 3 (Component & Domain Architecture) to enforce feature slices and commercial entitlement gating alongside atomic design primitives.

### Changed

- Advanced toolkit version to `2026.10.16`.
- Synchronized component manifest and integrity lock across all agents, skills, workflows, and rules.
- Updated toolkit skill count to 49 across architecture documentation.

## 2026.10.15

### Added

- Modernized `atomic-design` component engineering architecture:
  - Theme & Tokens (`src/theme/`) replacing legacy Quarks and ad-hoc asset themes, mapped to Tailwind CSS v4 `@theme` directives and semantic CSS variables.
  - Core UI Primitives (`src/components/core/`) replacing legacy Atoms with indivisible primitives (`Button`, `Input`, `Label`, `Icon`, `Avatar`, `Badge`, `Checkbox`) styled via Tailwind CSS and `cva`.
  - Composites (`src/components/composites/`) replacing legacy Molecules (`FormField`, `SearchForm`, `MediaObject`, `NavItem`, `CardHeader`, `Stat`).
  - Sections (`src/components/sections/`) replacing legacy Organisms (`Header`, `Footer`, `Sidebar`, `ProductCard`, `DataTable`).
  - Layouts (`src/components/layouts/`) replacing legacy Templates (`MainLayout`, `DashboardLayout`, `AuthLayout`, `SlotLayout`).
  - Pages (`src/app/` or `src/pages/`) preserved as concrete route views.
- Updated path aliases (`@/theme/*`, `@/core/*`, `@/composites/*`, `@/sections/*`, `@/layouts/*`), Storybook hierarchy tiers, and automated ESLint boundary rules.

### Changed

- Advanced toolkit version to `2026.10.15`.
- Synchronized component manifest and integrity lock across all agents, skills, workflows, and rules.

## 2026.10.12

### Added

- Added `/frontend-master` workflow (`.agents/workflows/frontend-master.md`): Full-cycle frontend engineering workflow covering anti-slop design reads, `DESIGN.md` design tokens, component architecture, sensory implementation, and automated UX, accessibility, and performance audits.
- Added comprehensive `atomic-design` skill suite (`.agents/skills/atomic-design/`) modernized with theme & tokens (replacing asset themes), core primitives, composites, sections, layouts, fundamentals, and framework integration.
- Added automated ESLint hierarchical import boundaries and composition laws for atomic components.

### Changed

- Advanced toolkit version to `2026.10.12`.
- Synchronized component manifest and integrity lock across all agents, skills, workflows, and rules.

## 2026.8.31

### Added

- Embedded mandatory `DESIGN.md` (Design Source-of-Truth) gate into `app-builder` orchestration pipeline, scaffolding structure, and Next.js templates.
- Added 2026 AI Application Pattern (Vercel AI SDK streaming, PostgreSQL pgvector, vector search, LLM API rate limiting) and SQL-first Drizzle ORM options in `tech-stack.md`.
- Added project type detection for AI/Chatbot applications and Game applications (`game-development` skill routing).
- Integrated automatic preview verification (`auto_preview.py`) into iterative enhancement and DevOps handoff.

### Changed

- Advanced toolkit version to `2026.8.31`.
- Bumped `app-builder` skill version to `1.1.0`.
- Standardized `globals.css` path to `src/app/globals.css` across Next.js templates.
- Fixed Express API template dependencies to include `@prisma/client` in dependencies and `prisma` as devDependency.
- Updated the `mcp-builder` skill for the stable MCP `2026-07-28` specification: stateless per-request metadata, `server/discover`, explicit state handles, extension negotiation, JSON Schema 2020-12, compatibility behavior, and migration guidance for deprecated features.
- Reworked the orchestrator and `parallel-agents` guidance around Antigravity-native agents and tasks while retaining best-effort portability for other runtimes.

### Security

- Added required safeguards for external `$ref` resolution, schema-validation resource limits, untrusted tool annotations, explicit consent, least privilege, secret handling, and execution isolation.
- Added explicit trust boundaries for repository content, MCP responses, tool annotations, web content, logs, and subagent outputs.
- Added finite agent, delegation-depth, turn/retry, timeout, cancellation, and no-progress controls to prevent recursive delegation and indefinite ReAct loops.


## 2026.7.26

### Added

- Antigravity runtime contract with six production integration phases.
- Native `PreToolUse` hook and destructive-command policy.
- Antigravity Doctor, MCP synchronization helper, plugin builder, schemas, and regression tests.
- Complete migration, production checklist, security, and operator documentation.

### Changed

- Toolkit version advanced from `2026.7.18` to `2026.7.26`.
- Google Antigravity is the primary production runtime; other Markdown-compatible tools are best-effort consumers.
- Component manifest now records Antigravity runtime metadata.
- Integrity lock now covers `antigravity.json`, `hooks.json`, and the complete `hooks/` runtime-tooling tree.
- Self-validation and Antigravity Doctor enforce synchronized root, CLI, web, and toolkit versions.

### Security

- High-confidence root/disk destructive commands are blocked before tool execution.
- Invalid or unknown hook payloads fail open with a warning to avoid runtime-wide lockout.
- MCP writes remain explicit, placeholder-blocked, conflict-aware, and backup-protected.
- Plugin artifacts are reviewable and contain no home-directory configuration or environment secrets.

### Compatibility

- Existing agent, skill, workflow, rule, and memory names remain compatible.
- The native safety hook is enabled by default and can be temporarily disabled for compatibility diagnosis.
- Plugin installation is optional; repository `.agents/` remains the project source of truth.

## 2026.7.18

### Added

- Strict SemVer metadata for all 20 agents, 47 skills, 13 workflows, and 6 rules.
- Machine-readable `manifest.json` with agent-to-skill and workflow dependencies.
- Deterministic `manifest.lock.json` with SHA-256 integrity hashes.
- Generated `DEPENDENCY_GRAPH.md` for workflow → agent → skill orchestration.
- JSON schemas for component metadata, manifest, lock, and memory topics.
- Standard memory topic files for user preferences, technical decisions, and feedback history.
- Registry and graph generation scripts with non-mutating `--check` modes.

### Changed

- Toolkit version advanced from `2026.7.12` to `2026.7.18`.
- Self-validation now checks component versions, workflow references, dependency compatibility, registry drift, lock integrity, graph drift, and memory contracts.
- CI now treats generated registry files as release artifacts that must remain synchronized.

### Compatibility

- Official runtime support remained Gemini CLI and Google Antigravity for that release.
- The component metadata and dependency format remain portable and avoid unnecessary platform coupling.

## 2026.7.12

- Release-safety upgrade, non-destructive CLI updates, rollback support, CI, dependency review, and hardened publishing.
