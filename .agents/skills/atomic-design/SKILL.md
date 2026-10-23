---
name: atomic-design
description: Architecting and organizing UI components using modernized Atomic Design featuring Theme & Tokens (src/theme/) replacing legacy Quarks and asset-themes, Core UI primitives (src/components/core/) replacing legacy Atoms, Composites (src/components/composites/) replacing Molecules, Sections (src/components/sections/) replacing Organisms, Layouts (src/components/layouts/) replacing Templates, and Pages (src/app/ or src/pages/). Enforces strict hierarchical downward import boundaries and Tailwind CSS (v4) utility architecture.
when_to_use: "When organizing, creating, or refactoring UI components into a modernized atomic hierarchy (Theme/tokens, core primitives, composites, sections, layouts, pages); setting up design system folders under src/theme/ and src/components/; enforcing strict upward/downward import boundaries; or building scalable Tailwind CSS component architectures. Routes to specialized subskills for fundamentals, theme/tokens, core primitives, composites, sections, layouts, and framework integration."
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
version: 1.0.0
---

# Atomic Design — Component Hierarchy & Subskill Orchestrator

> Modernized Brad Frost Atomic Design methodology featuring **Theme & Design Tokens (`src/theme/` & Tailwind v4 `@theme`) replacing legacy Quarks and ad-hoc asset themes**, **Core UI Primitives (`src/components/core/`) replacing legacy Atoms**, **Composites (`src/components/composites/`) replacing legacy Molecules**, **Sections (`src/components/sections/`) replacing legacy Organisms**, **Layouts (`src/components/layouts/`) replacing legacy Templates**, and **Pages (`src/app/` or `src/pages/`)**.
> Master router providing foundational principles, architectural boundaries, and direct routing to deep-dive subskills.

---

## 📑 Subskill Routing (Specialized Knowledge)

Atomic Design in Anti-Kit is organized into modular subskills. Use this routing matrix to load the exact deep-dive guide needed:

| Subskill | Focus Area & When to Read | Quick Link |
|---|---|---|
| **Fundamentals** | Core philosophy, the 6 modern tiers, naming standards, barrel exports, and composition rules | [Read Fundamentals](./fundamentals/SKILL.md) |
| **Theme & Tokens** | Design tokens in `src/theme/` (colors, spacing, typography, radii, shadows) replacing ad-hoc asset themes, Tailwind CSS v4 `@theme` directives, and CSS variables | [Read Theme & Tokens](./theme/SKILL.md) |
| **Core UI Primitives (Atoms)** | Indivisible Core UI primitives in `src/components/core/` (Button, Input, Label, Icon, Avatar, Badge, Checkbox, Typography) styled with Tailwind CSS & `cva` | [Read Core UI Primitives](./atoms/SKILL.md) |
| **Composites (Molecules)** | Functional combinations of core primitives in `src/components/composites/` (FormField, SearchInput, MediaObject, NavItem, CardHeader, StatItem) | [Read Composites](./composites/SKILL.md) |
| **Sections (Organisms)** | Standalone complex UI sections in `src/components/sections/` (Header, Footer, ProductCard, CommentSection, Sidebar, DataTable) | [Read Sections](./sections/SKILL.md) |
| **Layouts (Templates)** | Page layout skeletons in `src/components/layouts/`, slot-based architectures, responsive layout grids, and placeholder systems | [Read Layouts](./layouts/SKILL.md) |
| **Integration** | Framework patterns (React/Next.js, Vue 3, Angular), Tailwind CSS setup, Storybook workshops, Vitest/RTL unit tests, and path aliases | [Read Integration](./integration/SKILL.md) |

---

## 1. The Six Stages Overview

Atomic Design models user interfaces hierarchically, inspired by chemistry, modernized for real-world utility-first component engineering:

```
[Level 0: Theme & Tokens]   Design tokens in src/theme/ (Tailwind @theme, CSS vars, replacing asset themes)
       ↓
[Level 1: Core Primitives]  Indivisible Core UI primitives in src/components/core/ (Button, Input, Label, Icon)
       ↓
[Level 2: Composites]       Functional groups of core primitives in src/components/composites/ (SearchBar, FormField)
       ↓
[Level 3: Sections]         Complex UI sections in src/components/sections/ (Header, Footer, DataTable, ProductCard)
       ↓
[Level 4: Layouts]          Layout skeletons with slots & placeholders in src/components/layouts/ (PageLayout, DashboardLayout)
       ↓
[Level 5: Pages]            Concrete route views populated with real data in src/app/ or src/pages/ (HomePage, DashboardPage)
```

### Core Hierarchy Definitions

1. **Theme & Tokens (Level 0 — formerly Quarks)**: Pure design values and constants without DOM elements, residing under `src/theme/`. Structured tokens (colors, typography clamp scales, spacing increments, elevation shadows) replace fragmented "asset themes" or ad-hoc theme files, declared via Tailwind CSS v4 `@theme` directives or CSS variables. See [Theme & Tokens Subskill](./theme/SKILL.md).
2. **Core Primitives (Level 1 — formerly Atoms)**: Smallest functional, indivisible UI elements that cannot be broken down further without losing utility (`<Button>`, `<Input>`, `<Icon>`, `<Badge>`, `<Label>`). In this architecture, they reside in `src/components/core/` and are built using Tailwind CSS utility classes and `cva` (Class Variance Authority). See [Core UI Primitives Subskill](./atoms/SKILL.md).
3. **Composites (Level 2 — formerly Molecules)**: Focused combinations of multiple core primitives acting together as a single functional unit (`<FormField>` = Label + Input + Error, `<SearchInput>` = Input + Button + Icon). Reside under `src/components/composites/`. See [Composites Subskill](./composites/SKILL.md).
4. **Sections (Level 3 — formerly Organisms)**: Distinct, self-contained sections of an interface that could stand alone (`<Header>`, `<Footer>`, `<DataTable>`, `<ProductCard>`, `<Sidebar>`). Composed of composites, core primitives, and layout utilities under `src/components/sections/`. See [Sections Subskill](./sections/SKILL.md).
5. **Layouts (Level 4 — formerly Templates)**: Page-level skeletal layouts that position sections into responsive grids using slots or children, without real business data. Built with Tailwind flex/grid layout utilities under `src/components/layouts/`. See [Layouts Subskill](./layouts/SKILL.md).
6. **Pages (Level 5)**: Concrete route instances of layouts hydrated with live data, route parameters, and API queries, located in `src/app/` or `src/pages/`.

---

## 2. Component Classification Decision Tree

When building or reviewing a component, use this mental flow to classify it into the correct architectural layer:

```
Is it a raw design value (color, spacing, font, shadow) without DOM elements?
  ├── YES → THEME / TOKENS (Level 0: src/theme/ & Tailwind @theme)
  └── NO  → Does it render HTML?
             ├── Can it be decomposed into smaller functional UI elements?
             │     ├── NO  → CORE PRIMITIVE (Level 1: src/components/core/)
             │     └── YES → Does it represent a standalone, full-featured UI section?
             │                ├── NO  → Is it a tight group of core primitives with a single purpose (e.g. search bar)?
             │                │          ├── YES → COMPOSITE (Level 2: src/components/composites/)
             │                │          └── NO  → SECTION (Level 3: src/components/sections/)
             │                └── YES → Does it define entire viewport layout with placeholders?
             │                           ├── YES → LAYOUT (Level 4: src/components/layouts/)
             │                           └── NO  → Does it bind real data / route parameters?
             │                                      ├── YES → PAGE (Level 5: src/app/ or src/pages/)
             │                                      └── NO  → SECTION (Level 3: src/components/sections/)
```

---

## 3. Hierarchical Import Rules (The Dependency Law)

The foundational rule of modern Atomic Design is **unidirectional downward imports**. A component may only import from its own level (if explicitly permitted) or lower levels:

| Level | Allowed Imports | Strictly Forbidden Imports |
|---|---|---|
| **Theme & Tokens** (`src/theme/`) | *(None - foundational axioms)* | Core, Composites, Sections, Layouts, Pages |
| **Core Primitives** (`src/components/core/`) | Theme tokens / Tailwind `@theme` | Composites, Sections, Layouts, Pages |
| **Composites** (`src/components/composites/`) | Theme tokens, Core Primitives | Sections, Layouts, Pages |
| **Sections** (`src/components/sections/`) | Theme tokens, Core Primitives, Composites, sibling Sections (`=sections`) | Layouts, Pages |
| **Layouts** (`src/components/layouts/`) | Theme tokens, Core Primitives, Composites, Sections | Pages |
| **Pages** (`src/app/` or `src/pages/`) | Theme tokens, Core Primitives, Composites, Sections, Layouts | *(Top-level view consumer)* |

### Forbidden vs. Allowed Import Examples

```tsx
// ❌ ILLEGAL: Core primitive importing a Composite (Upward import violation)
// src/components/core/Button/Button.tsx
import { FormField } from '@/components/composites/FormField'; // ERROR

// ❌ ILLEGAL: Composite importing a Section (Upward import violation)
// src/components/composites/SearchBar/SearchBar.tsx
import { Header } from '@/components/sections/Header'; // ERROR

// ❌ ILLEGAL: Composite importing another Composite (Composites compose Core Primitives only)
// src/components/composites/StatItem/StatItem.tsx
import { SearchInput } from '@/components/composites/SearchInput'; // ERROR

// ✅ LEGAL: Section composing Composites, Core Primitives, and sibling Sections
// src/components/sections/ProductCard/ProductCard.tsx
import { Button } from '@/components/core/Button';
import { Badge } from '@/components/core/Badge';
import { FormField } from '@/components/composites/FormField';
import { UserAvatarMini } from '@/components/sections/UserAvatarMini';
```

---

## 4. State & Logic Distribution Matrix

Distribute state across the hierarchy according to responsibility:

| Level | State Type Allowed | Handling Pattern |
|---|---|---|
| **Core Primitives** | None | Pure controlled component via props (`value`, `onChange`, `disabled`, `variant`) |
| **Composites** | Ephemeral UI State | Local `useState` for focus, hover, disclosure, or search debouncing |
| **Sections** | Section UI State | Custom hooks (`useHeaderNavigation`, `useTableSort`), local UI reducers |
| **Layouts** | Responsive Layout State | Media query hooks, sidebar collapse toggle, slot layout state |
| **Pages** | Application & Server State | Server Components, TanStack Query, URL `searchParams`, Zustand/Redux |

---

## 5. Recommended Directory Structure

Modernized for **Tailwind CSS (v4)**, `cva`, `src/theme/`, and modern component nomenclature:

```text
src/
├── theme/                        # Level 0: Theme & Design Tokens (replaces asset themes / theme files)
│   ├── index.ts                  # Theme barrel & contract
│   ├── tokens.ts                 # Primitive design tokens
│   ├── colors.ts                 # Color palette & semantic shades
│   ├── spacing.ts                # Spacing increments & layout scale
│   ├── typography.ts             # Font families, sizes, line heights
│   ├── shadows.ts                # Elevation tokens
│   ├── borders.ts                # Radii & border width tokens
│   └── theme.css                 # Tailwind CSS v4 @theme directive & CSS vars
├── app/
│   ├── globals.css               # Imports theme.css / Tailwind v4 @theme
│   ├── layout.tsx                # App root layout
│   └── page.tsx                  # Level 5: Concrete Page
├── lib/
│   └── utils.ts                  # cn() helper: clsx + tailwind-merge
├── components/
│   ├── core/                     # Level 1: Core UI Primitives (replacing legacy Atoms)
│   │   ├── Button/
│   │   │   ├── Button.tsx        # Styled with cva & Tailwind utility classes
│   │   │   ├── Button.types.ts
│   │   │   ├── Button.test.tsx
│   │   │   ├── Button.stories.tsx
│   │   │   └── index.ts
│   │   ├── Input/
│   │   │   ├── Input.tsx
│   │   │   └── index.ts
│   │   ├── Badge/
│   │   ├── Avatar/
│   │   ├── Label/
│   │   ├── Checkbox/
│   │   └── index.ts              # Barrel export for Core primitives
│   ├── composites/               # Level 2: Composites (replacing legacy Molecules)
│   │   ├── FormField/
│   │   │   ├── FormField.tsx     # Composes Label + Input from @/components/core
│   │   │   └── index.ts
│   │   ├── SearchInput/
│   │   ├── StatItem/
│   │   └── index.ts              # Barrel export for composites
│   ├── sections/                 # Level 3: Sections (replacing legacy Organisms)
│   │   ├── Header/
│   │   ├── ProductCard/
│   │   ├── DataTable/
│   │   └── index.ts              # Barrel export for sections
│   ├── layouts/                  # Level 4: Layouts (replacing legacy Templates)
│   │   ├── PageLayout/
│   │   ├── DashboardLayout/
│   │   └── index.ts              # Barrel export for layouts
│   └── index.ts                  # Unified component barrel
└── pages/                        # Alternative Pages directory (if Pages router)
```

---

## 6. Automated ESLint & Boundary Enforcement

Enforce hierarchical import boundaries automatically in your project's ESLint configuration:

### Option A: `eslint-plugin-boundaries` (Recommended for modern ESLint flat config)

```javascript
// eslint.config.js
import boundaries from 'eslint-plugin-boundaries';

export default [
  {
    plugins: { boundaries },
    settings: {
      'boundaries/elements': [
        { type: 'theme', pattern: 'src/{theme,styles,app/globals.css}**' },
        { type: 'core', pattern: 'src/components/core/**' },
        { type: 'composites', pattern: 'src/components/composites/**' },
        { type: 'sections', pattern: 'src/components/sections/**' },
        { type: 'layouts', pattern: 'src/components/layouts/**' },
        { type: 'pages', pattern: 'src/{pages,app}/**' },
      ],
    },
    rules: {
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          rules: [
            { from: 'theme', allow: [] },
            { from: 'core', allow: ['theme'] },
            { from: 'composites', allow: ['theme', 'core'] },
            { from: 'sections', allow: ['theme', 'core', 'composites', 'sections'] },
            { from: 'layouts', allow: ['theme', 'core', 'composites', 'sections'] },
            { from: 'pages', allow: ['theme', 'core', 'composites', 'sections', 'layouts'] },
          ],
        },
      ],
    },
  },
];
```

### Option B: `eslint-plugin-atomic-design`

```json
{
  "plugins": ["atomic-design"],
  "rules": {
    "atomic-design/hierarchical-import": ["error", {
      "levels": ["theme", "core", "composites", "=sections", "layouts", "pages"],
      "excludes": ["node_modules"],
      "module": "loose"
    }]
  }
}
```

---

## 7. Common Anti-Patterns to Avoid

| Anti-Pattern | Manifestation | Correct Remediation |
|---|---|---|
| **Fragmented Asset Themes** | Storing loose color palettes or unstandardized theme files in `src/assets/theme/` | Consolidate design tokens into `src/theme/` and map to Tailwind v4 `@theme` |
| **Custom CSS Island** | Creating separate `.module.css` or ad-hoc style files for primitives | Use Tailwind CSS utility classes and `cva` variant definitions |
| **The Composite Skip** | Jumping directly from core primitives to 800-line sections without composites | Group related input/label/action pairs into reusable composites |
| **The God Section** | Putting an entire page layout, data fetching, and 12 sections into one component | Extract layout into a Layout; divide sections into independent Section components |
| **Domain Leakage** | Passing complex backend DTOs into primitive core components (`<Button order={order} />`) | Pass only UI primitives (`variant`, `onClick`, `children`, `disabled`) |
| **Upward Leakage** | Importing a composite inside a core primitive, or a section inside a composite | Refactor the composite component upward into a section |
| **Hardcoded Layouts** | Writing text, API calls, and domain copy directly inside layout skeletons | Use slots (`children`, `header`, `sidebar`) and pass content from the Page |

---

## 8. Subskill Quick Links

For comprehensive implementations, code examples, TypeScript interfaces, and framework patterns:

- [0. Theme & Tokens Deep Dive](./theme/SKILL.md) — Design tokens under `src/theme/`, Tailwind CSS v4 `@theme` tokens, and CSS variables replacing asset themes
- [1. Core UI Primitives Deep Dive](./atoms/SKILL.md) — Indivisible Core UI primitives (Button, Input, Checkbox, Avatar, Badge, Icon, Typography) built with Tailwind & `cva`
- [2. Composites Deep Dive](./composites/SKILL.md) — FormField, SearchForm, MediaObject, NavItem, CardHeader, and StatItem
- [3. Sections Deep Dive](./sections/SKILL.md) — Header, Footer, ProductCard, CommentSection, Sidebar, and DataTable
- [4. Layouts Deep Dive](./layouts/SKILL.md) — MainLayout, DashboardLayout, AuthLayout, BlogPostLayout, and slot patterns
- [5. Fundamentals Deep Dive](./fundamentals/SKILL.md) — Modern methodology philosophy, barrel exports, and composition laws
- [6. Framework Integration](./integration/SKILL.md) — React/Next.js, Vue 3, Tailwind configuration, Storybook, Vitest, RTL, and path aliases
