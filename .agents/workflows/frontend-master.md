---
name: frontend-master
description: Full-cycle frontend engineering workflow. Governs anti-slop design reads, DESIGN.md design tokens, component architecture, sensory implementation, and automated UX, accessibility, and performance audits.
version: 1.0.0
requires_agents: frontend-specialist, orchestrator
requires_skills: frontend-design, design-spec, atomic-design, frontend-architecture, nextjs-react-expert, senior-web-app-architect, web-design-guidelines, verify-changes
artifact_outputs: design-commitment, design-spec, component-architecture, implementation-report, audit-report
---

# /frontend-master — Full-Cycle Frontend Engineering

$ARGUMENTS

---

## 🔴 CRITICAL RULES (THE MASTER GATES)

1. **Anti-Safe-Harbor Gate (No AI Slop)**: Reject cliché defaults (Standard split-screen hero, dark mesh gradient blobs, generic bento grids, glassmorphism cards everywhere, Inter + slate-900).
2. **Purple Ban Enforcement**: Strictly NO purple, violet, indigo, or magenta brand palettes unless explicitly requested by the user.
3. **Design Source of Truth (`DESIGN.md`)**: A machine-readable token contract + human rationale must exist in `DESIGN.md` at the project root BEFORE building UI components (following the `design-spec` skill).
4. **Interactive Design Commitment Checkpoint**: State the Design Read, Dial Settings (`DESIGN_VARIANCE`, `MOTION_INTENSITY`, `VISUAL_DENSITY`), and Topological Choice before writing code.
5. **Architectural Separation**: Strict separation of concerns (UI presentational components, logic hooks, data/API services, TypeScript domain types). No inline god-components or unhandled waterfalls.
6. **Automated Audit Trio**: Every implementation must be audited using `ux_audit.py`, `accessibility_checker.py`, and `react_performance_checker.py` before completion.

---

## Task

Execute full-cycle frontend engineering with `frontend-specialist` as the primary lead:

```
CONTEXT:
- User Request: $ARGUMENTS
- Mode: FRONTEND MASTER (End-to-End Excellence)
- Lead Agent: frontend-specialist
- Primary Skills: frontend-design, design-spec, frontend-architecture, nextjs-react-expert, senior-web-app-architect, web-design-guidelines, verify-changes

WORKFLOW:
1. PHASE 1: BRIEF INFERENCE & TOPOLOGICAL HYPOTHESIS
   - Infer page kind, audience, tone, and constraints.
   - Configure the Three Dials:
     * DESIGN_VARIANCE (1-10)
     * MOTION_INTENSITY (1-10)
     * VISUAL_DENSITY (1-10)
   - Select a radical layout topology (Massive Typographic Hero, Asymmetric Tension 90/10, Layered Depth, Experimental Staggered, Continuous Narrative Stream).
   - Present the mandatory 🎨 DESIGN COMMITMENT to user.

2. PHASE 2: DESIGN TOKEN CONTRACT (DESIGN.md)
   - Create or update DESIGN.md in project root.
   - Define YAML token front matter: semantic colors (light & dark mode), typography scale, spacing rhythm, elevation, radii, and component tokens.
   - Detail human rationale, do's & don'ts, and sensory direction.

3. PHASE 3: COMPONENT & DOMAIN ARCHITECTURE
   - Decompose into Atomic & Compound hierarchy (`atomic-design` & `senior-web-app-architect`):
     * Primitives: Buttons, Badges, Inputs, Icons (`src/components/core/`).
     * Compounds: Cards, Modals, Popovers, Accordions (`src/components/composites/`).
     * Layout Structures: Headers, Hero sections, Feature streams (`src/components/sections/` & `src/components/layouts/`).
     * Domain Features: Vertical slices under `src/features/<name>/` with public API barrel exports (`index.ts`).
     * Monetization & Entitlements: Decouple commercial subscription entitlements from operational toggles (`<EntitlementGate>`).
   - Separate state tiers: URL state (searchParams), Server state (RSC/caching), and Client UI state (local interactions).
   - Establish WCAG 2.2 AA accessibility contracts: keyboard navigation, focus-visible states, ARIA landmarks, screen reader labels.

4. PHASE 4: CRAFTSMANSHIP & IMPLEMENTATION
   - Build UI components strictly adhering to DESIGN.md tokens.
   - Implement tactile micro-interactions (spring physics, hover lift, active state feedback).
   - Use fluid typography (clamp()), modern CSS container queries, and prevent layout shifts (CLS = 0).
   - Eliminate async waterfalls using parallel fetching, Suspense, and streaming.

5. PHASE 5: THE MAESTRO AUDIT & VERIFICATION
   - Run automated frontend audit suite:
     * UX Audit: python .agents/skills/frontend-design/scripts/ux_audit.py .
     * Accessibility Audit: python .agents/skills/frontend-design/scripts/accessibility_checker.py .
     * React & Next.js Performance Audit: python .agents/skills/nextjs-react-expert/scripts/react_performance_checker.py .
   - Verify build and preview responsiveness across breakpoints (390px, 768px, 1440px).
   - Complete Reality Check: confirm the output is memorable, performant, and free of generic AI patterns.
```

---

## 🎨 Design Commitment Format (Phase 1 Checkpoint)

Before modifying or creating code files, present this checkpoint:

```markdown
🎨 DESIGN COMMITMENT: [RADICAL STYLE NAME]

- **Design Read**: [Page kind] for [Target audience] with a [Vibe] language
- **Three Dials**: DESIGN_VARIANCE: [N] | MOTION_INTENSITY: [N] | VISUAL_DENSITY: [N]
- **Topological Choice**: [Asymmetric 90/10 | Massive Typographic | Layered Depth | Staggered | Continuous Stream]
- **Color Identity**: [Curated palette - NO AI-purple/default cyan]
- **Cliché Liquidation**: [Confirmed: No standard split hero, No generic bento grid, No mesh blobs, No default glassmorphism]
- **Risk Factor & Soul**: [The boldest unconventional design decision made]
```

---

## 🛠️ Automated Quality Gates (Phase 5)

Run these validation scripts to guarantee production standards:

```bash
# 1. UX and design heuristics audit
python .agents/skills/frontend-design/scripts/ux_audit.py .

# 2. Static accessibility & WCAG audit
python .agents/skills/frontend-design/scripts/accessibility_checker.py .

# 3. React rendering and waterfall performance audit
python .agents/skills/nextjs-react-expert/scripts/react_performance_checker.py .
```

---

## Expected Outputs

| Deliverable | Location | Description |
|-------------|----------|-------------|
| Design Commitment | Conversational Checkpoint | Declared aesthetic direction, dial ratings, and topological choice |
| Design Tokens | `DESIGN.md` in project root | Single source of truth for tokens and visual rationale |
| Architecture Breakdown | Source files (`components/`, `hooks/`, `types/`) | Modular, decoupled component hierarchy |
| Production Implementation | Web application codebase | Pixel-perfect, token-bound UI with fluid responsiveness |
| Audit Report | Verification Summary | Clean pass from UX, WCAG accessibility, and React performance checkers |

---

## Usage Examples

```
/frontend-master landing page for high-end boutique coffee roastery
/frontend-master redesign marketing site for developer observability platform
/frontend-master interactive pricing calculator with spring physics
/frontend-master dashboard analytics view with keyboard navigation and dark mode
/frontend-master developer portfolio with kinetic typography
```

---

## Anti-Patterns Avoided

- ❌ Writing UI code before authoring `DESIGN.md`.
- ❌ Reverting to standard split-screen layout out of habit.
- ❌ Using purple, violet, or indigo gradients as AI default styling.
- ❌ Monolithic god-components containing inline styling, data fetching, and state together.
- ❌ Hardcoded magic numbers and hex codes instead of semantic design tokens.
- ❌ Skipping mobile touch targets (<44px) or missing focus rings.
- ❌ Claiming UI is verified without running the automated audit trio.
