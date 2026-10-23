---
name: atomic-design-fundamentals
description: Core Atomic Design methodology modernized with Tailwind CSS (v4), 6-tier hierarchy (Theme/Tokens, Core Primitives, Composites, Sections, Layouts, Pages), organization strategies, and composition rules.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Atomic Design Fundamentals

Master Brad Frost's Atomic Design methodology modernized for **Tailwind CSS (v4)**, modern design tokens, and scalable component architecture. In this modernized framework:
- Design tokens and contracts live under **`src/theme/` (Theme & Tokens)**, replacing legacy Quarks and ad-hoc asset themes via Tailwind `@theme` and CSS variables.
- Traditional Atoms are structured as **Core UI Primitives under `src/components/core/`**.
- Traditional Molecules are structured as **Composites under `src/components/composites/`**.
- Traditional Organisms are structured as **Sections under `src/components/sections/`**.
- Traditional Templates are structured as **Layouts under `src/components/layouts/`**.
- Pages remain as **Pages under `src/app/` or `src/pages/`**.

---

## Overview

Atomic Design models user interfaces hierarchically, inspired by modular composition. Just as foundational values inform indivisible elements, which assemble into functional units, larger sections, and full-screen layouts:

0. **Theme & Tokens (Level 0 — formerly Quarks)** — Design tokens residing under `src/theme/` and declared via Tailwind CSS v4 `@theme` & CSS variables (colors, spacing, typography scales, shadows, radii), replacing scattered asset themes
1. **Core Primitives (Level 1 — formerly Atoms)** — Indivisible UI primitives in `src/components/core/` (Button, Input, Label, Badge, Avatar, Checkbox, Icon) built with Tailwind & `cva`
2. **Composites (Level 2 — formerly Molecules)** — Functional groups of core primitives working together in `src/components/composites/` (SearchForm, FormField, NavItem, MediaObject)
3. **Sections (Level 3 — formerly Organisms)** — Complex, standalone UI sections in `src/components/sections/` (Header, Footer, Sidebar, DataTable, ProductCard)
4. **Layouts (Level 4 — formerly Templates)** — Layout skeletons with responsive grids/slots without hardcoded domain data in `src/components/layouts/`
5. **Pages (Level 5)** — Concrete route views populated with live data, route parameters, and API queries in `src/app/` or `src/pages/`

---

## The Six Stages

### 0. Theme & Tokens (Level 0 — formerly Quarks)

The foundational design values and constants that define your visual identity. Instead of unstandardized "asset themes" or loose files scattered across the codebase, all design tokens are consolidated under **`src/theme/`** and mapped directly to Tailwind CSS v4 `@theme` and CSS variables:

**Examples:**
- Semantic color tokens (`--color-primary`, `--color-destructive`, `--color-background`)
- Spacing scales (`--spacing-xs`, `--spacing-md`, `--spacing-xl`)
- Typography clamps & font families (`--font-sans`, `--font-mono`)
- Border radii (`--radius-sm`, `--radius-md`, `--radius-lg`)
- Elevation shadows (`--shadow-sm`, `--shadow-md`)

**Characteristics:**
- Pure tokens and values, no DOM elements
- Centralized under `src/theme/` and exported cleanly
- Cannot import from any component layer
- Single source of truth for the application's design system

---

### 1. Core Primitives (Level 1 — formerly Atoms)

The smallest functional, indivisible UI units of your interface. In modern architecture, **Core Primitives live in `src/components/core/`**, replacing legacy `components/atoms/` and custom `.module.css` files:

**Examples:**
- `<Button>`
- `<Input>`
- `<Label>`
- `<Icon>`
- `<Badge>`
- `<Avatar>`
- `<Checkbox>`
- `<Typography>` (Heading, Text)

**Characteristics:**
- Reside under `src/components/core/`
- Styled exclusively with Tailwind CSS utility classes and `cva`
- Strictly controlled and stateless (no business logic)
- Extends native HTML element attributes and forwards refs
- Merges classNames via `cn()` helper

---

### 2. Composites (Level 2 — formerly Molecules)

Focused combinations of core primitives working together as a single functional unit:

**Examples:**
- `FormField` (`Label` + `Input` + error `Text`)
- `SearchForm` (`Input` + `Button` + `Icon`)
- `MediaObject` (`Avatar` + `Heading` + `Text`)
- `CardHeader` (`Icon` + title `Heading` + action `Button`)
- `NavItem` (`Icon` + label `Text` + active state)

**Characteristics:**
- Reside under `src/components/composites/`
- Composed of Core primitives and Tailwind utility layouts
- Single focused purpose
- May contain ephemeral UI state (e.g. open/closed, focus, hover, search debouncing)

---

### 3. Sections (Level 3 — formerly Organisms)

Complex, self-contained sections of an interface that form distinct functional interface blocks:

**Examples:**
- `Header` (Logo + `NavItem` list + `SearchForm` + user `Avatar`)
- `Footer` (Links grid + copyright + newsletter form)
- `ProductCard` (Image + title + price badge + add-to-cart `Button`)
- `DataTable` (Header row + pagination + row action buttons)
- `Sidebar` (Brand header + grouped navigation links + user menu)

**Characteristics:**
- Reside under `src/components/sections/`
- Composed of Composites, Core primitives, and sibling Sections
- Distinct, reusable full sections
- May consume custom hooks for section-level state management

---

### 4. Layouts (Level 4 — formerly Templates)

Page-level skeletal layouts that position sections into responsive grids and viewports using slots or children:

**Examples:**
- `MainLayout` (Header + main slot + Footer)
- `DashboardLayout` (Collapsible Sidebar + top bar + main content grid)
- `AuthLayout` (Split screen with brand visual panel + form slot)

**Characteristics:**
- Reside under `src/components/layouts/`
- Layout-only skeletons with slots / children
- Responsive layout containers (`min-h-screen`, `grid`, `flex-1`)
- No hardcoded copy, domain state, or API calls

---

### 5. Pages (Level 5)

Concrete route instances that hydrate layouts with live data, route params, and user state:

**Examples:**
- `HomePage` with real hero copy and featured products
- `DashboardPage` with live analytics charts and user metrics
- `UserProfilePage` with form validation and profile mutations

---

## Directory Structure

### Modern Recommended Structure

```text
src/
├── theme/                        # Level 0: Theme & Tokens (replaces asset themes / theme files)
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
│   │   │   ├── Button.tsx        # Styled with cva & Tailwind classes
│   │   │   ├── Button.types.ts
│   │   │   ├── Button.test.tsx
│   │   │   └── index.ts
│   │   ├── Input/
│   │   ├── Label/
│   │   ├── Badge/
│   │   ├── Avatar/
│   │   ├── Checkbox/
│   │   ├── Icon/
│   │   ├── Typography/
│   │   └── index.ts              # Core primitives barrel
│   ├── composites/               # Level 2: Composites (replacing legacy Molecules)
│   │   ├── FormField/
│   │   │   ├── FormField.tsx     # Composes Label + Input from @/components/core
│   │   │   └── index.ts
│   │   ├── SearchForm/
│   │   ├── NavItem/
│   │   └── index.ts              # Composites barrel
│   ├── sections/                 # Level 3: Sections (replacing legacy Organisms)
│   │   ├── Header/
│   │   ├── Footer/
│   │   ├── ProductCard/
│   │   └── index.ts              # Sections barrel
│   ├── layouts/                  # Level 4: Layouts (replacing legacy Templates)
│   │   ├── MainLayout/
│   │   ├── DashboardLayout/
│   │   └── index.ts              # Layouts barrel
│   └── index.ts                  # Unified components barrel
└── pages/                        # Alternative Pages directory (if Pages router)
```

---

## Import Patterns & Barrel Exports

### 1. Core Primitives Barrel

```typescript
// src/components/core/index.ts
export { Button, buttonVariants } from './Button/Button';
export type { ButtonProps } from './Button/Button';

export { Input, inputVariants } from './Input/Input';
export type { InputProps } from './Input/Input';

export { Label } from './Label/Label';
export { Icon } from './Icon/Icon';
export { Avatar, avatarVariants } from './Avatar/Avatar';
export { Badge, badgeVariants } from './Badge/Badge';
export { Checkbox } from './Checkbox/Checkbox';
export { Text, Heading } from './Typography';
```

### 2. Upward Composition Import

```typescript
// src/components/composites/FormField/FormField.tsx
import { Label } from '@/components/core/Label';
import { Input } from '@/components/core/Input';
import { Text } from '@/components/core/Typography';
```

```typescript
// Clean consumption from upper layers
import { Button, Input, Badge } from '@/components/core';
import { FormField, SearchForm } from '@/components/composites';
import { Header, Footer } from '@/components/sections';
import { MainLayout } from '@/components/layouts';
```

---

## Composition Rules

### Strict Hierarchy

```text
Theme & Tokens (src/theme/) -> Used by: Core, Composites, Sections, Layouts, Pages
Core Primitives             -> Used by: Composites, Sections, Layouts, Pages
Composites                  -> Used by: Sections, Layouts, Pages
Sections                    -> Used by: Layouts, Pages
Layouts                     -> Used by: Pages
Pages                       -> Root view (not imported by other UI layers)
```

### Valid Compositions

```tsx
// 1. Core primitive using Tailwind theme tokens via cva
// src/components/core/Button/Button.tsx
export const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90'
);

// 2. Composite composing Core primitives
// src/components/composites/SearchForm/SearchForm.tsx
export const SearchForm = ({ onSearch }: { onSearch: (q: string) => void }) => (
  <form className="flex items-center gap-2">
    <Input placeholder="Search..." className="w-64" />
    <Button type="submit">Search</Button>
  </form>
);

// 3. Section composing Composites and Core primitives
// src/components/sections/Header/Header.tsx
export const Header = () => (
  <header className="flex items-center justify-between border-b px-6 py-4">
    <div className="font-bold text-xl">Brand</div>
    <SearchForm onSearch={(q) => console.log(q)} />
    <Avatar src="/avatar.png" alt="User" />
  </header>
);
```

### Invalid Compositions (Strictly Forbidden)

```typescript
// ❌ ILLEGAL: Core primitive importing a Composite
// src/components/core/Button/Button.tsx
import { FormField } from '@/components/composites/FormField'; // ERROR: Upward import

// ❌ ILLEGAL: Composite importing a Section
// src/components/composites/SearchForm/SearchForm.tsx
import { Header } from '@/components/sections/Header'; // ERROR: Upward import

// ❌ ILLEGAL: Core primitive using custom CSS module instead of Tailwind
// src/components/core/Button/Button.tsx
import styles from './Button.module.css'; // ERROR: Anti-pattern, use Tailwind + cva
```

---

## Common Pitfalls & Best Practices

| Pitfall | Problem | Solution |
|---|---|---|
| **Scattered Asset Themes** | Storing loose color palettes in arbitrary folders (`assets/theme`) | Place all tokens into `src/theme/` and link to Tailwind v4 `@theme` |
| **Custom CSS Islands** | Breaking design consistency with `.module.css` | Use Tailwind CSS utility classes and `cva` |
| **Over-Atomization** | Wrapping single HTML tags in redundant micro-primitives | Keep primitives practical (`Button`, `Input`, `Badge`) |
| **Business Logic in Core** | Placing API calls or routing in `components/core` | Keep Core primitives pure and presentational; lift logic to hooks or pages |
| **Direct Hex Colors** | Hardcoding `#3b82f6` in utility classes | Use semantic tokens: `bg-primary`, `border-border`, `text-muted-foreground` |

---

## Related Subskills

- [Atomic Design Hub](../SKILL.md) — Master methodology and subskill routing
- [Theme & Tokens](../theme/SKILL.md) — Design tokens under `src/theme/`, Tailwind v4 `@theme` tokens, and CSS variables
- [Core UI Primitives](../atoms/SKILL.md) — Indivisible Core UI primitives in `src/components/core/`
- [Composites](../composites/SKILL.md) — Functional core primitive combinations (form fields, search inputs)
- [Sections](../sections/SKILL.md) — Standalone UI sections (headers, footers, data tables)
- [Layouts](../layouts/SKILL.md) — Page layout skeletons with slot-based content
- [Integration](../integration/SKILL.md) — Framework integration (React/Next.js, Vue 3, Storybook, Vitest)
