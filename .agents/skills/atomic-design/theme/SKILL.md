---
name: atomic-design-theme
description: Design tokens, theme contracts, and primitive values under src/theme/ (colors, spacing, typography, radii, shadows) replacing ad-hoc asset themes or fragmented theme files via Tailwind CSS v4 @theme directives and CSS variables.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Atomic Design: Theme & Design Tokens

Master the creation, organization, and consumption of **Theme & Design Tokens** (Level 0 — formerly known as Quarks). In this modernized architecture, design tokens reside systematically under **`src/theme/`**, replacing scattered "asset themes" or ad-hoc theme files with unified tokens, **Tailwind CSS (v4) `@theme` directives**, and semantic CSS custom properties.

---

## What Are Theme & Design Tokens?

Theme and design tokens represent the foundational layer (Level 0) of your design system. While UI components render visual elements in the DOM, theme tokens are the raw design values from which all components are styled.

Theme & Design Tokens:
- **Centralized under `src/theme/`**: Replace fragmented `src/assets/theme/` or arbitrary configuration files with a dedicated, authoritative theme home.
- **Primitive & Semantic Values**: Colors, spacing increments, typography scales, elevation shadows, border radii, and animation timings.
- **Non-Visual**: They do not render HTML elements or contain JSX.
- **Utility-First**: Mapped directly to Tailwind CSS v4 `@theme` tokens and CSS variables.
- **Consumed Hierarchically**: Core primitives (`src/components/core/`), composites, sections, and layouts consume tokens exclusively via Tailwind utility classes.

---

## Theme & Tokens vs. Core UI Primitives

| Aspect | Theme & Tokens (`src/theme/`) | Core UI Primitives (`src/components/core/`) |
|---|---|---|
| **Nature** | Raw design values & CSS variables | Indivisible interactive UI components |
| **Render** | Nothing (tokens, CSS variables) | Visual DOM elements (`<Button>`, `<Input>`) |
| **Location** | `src/theme/` (and `@theme` in CSS) | `src/components/core/` |
| **Examples** | `--color-primary`, `--spacing-4`, `--radius-md` | `<Button>`, `<Input>`, `<Badge>`, `<Avatar>` |
| **Imports** | None (foundational Level 0) | Consumes Theme tokens via Tailwind utilities |
| **Purpose** | Define design language & token contracts | Implement interactive UI building blocks |

---

## 1. Directory Structure under `src/theme/`

Centralize all tokens cleanly under `src/theme/`:

```text
src/
├── theme/                        # Level 0: Theme & Design Tokens (replaces asset themes)
│   ├── index.ts                  # Barrel export for TypeScript token contracts
│   ├── tokens.ts                 # Master token object aggregation
│   ├── colors.ts                 # Brand, semantic, and neutral color scales
│   ├── spacing.ts                # Spacing increments & layout scale
│   ├── typography.ts             # Font families, sizes, weights, line heights
│   ├── borders.ts                # Border radii & border widths
│   ├── shadows.ts                # Elevation shadows & focus rings
│   ├── animations.ts             # Transition durations & easing curves
│   ├── breakpoints.ts            # Responsive viewport thresholds
│   ├── z-index.ts                # Layering stack indices
│   └── theme.css                 # Tailwind CSS v4 @theme declarations & CSS vars
├── app/
│   ├── globals.css               # Imports @/theme/theme.css
│   └── layout.tsx
├── components/
│   ├── core/                     # Consumes theme tokens via Tailwind classes
│   ├── composites/
│   ├── sections/
│   └── layouts/
```

---

## 2. Core Token Definitions

### Color Tokens

```typescript
// src/theme/colors.ts
export const colors = {
  // Brand colors
  primary: {
    50: '#e3f2fd',
    100: '#bbdefb',
    200: '#90caf9',
    300: '#64b5f6',
    400: '#42a5f5',
    500: '#2196f3', // Default primary
    600: '#1e88e5',
    700: '#1976d2',
    800: '#1565c0',
    900: '#0d47a1',
  },

  // Semantic feedback colors
  success: {
    light: '#4caf50',
    main: '#2e7d32',
    dark: '#1b5e20',
  },
  warning: {
    light: '#ff9800',
    main: '#ed6c02',
    dark: '#e65100',
  },
  destructive: {
    light: '#ef5350',
    main: '#d32f2f',
    dark: '#c62828',
  },

  // Neutral scale
  neutral: {
    0: '#ffffff',
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#eeeeee',
    300: '#e0e0e0',
    400: '#bdbdbd',
    500: '#9e9e9e',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  },
} as const;

export type ColorTokens = typeof colors;
```

### Spacing Tokens

```typescript
// src/theme/spacing.ts
export const spacing = {
  0: '0',
  px: '1px',
  0.5: '0.125rem', // 2px
  1: '0.25rem',    // 4px
  1.5: '0.375rem', // 6px
  2: '0.5rem',     // 8px
  2.5: '0.625rem', // 10px
  3: '0.75rem',    // 12px
  4: '1rem',       // 16px
  5: '1.25rem',    // 20px
  6: '1.5rem',     // 24px
  8: '2rem',       // 32px
  10: '2.5rem',    // 40px
  12: '3rem',      // 48px
  16: '4rem',      // 64px
  20: '5rem',      // 80px
  24: '6rem',      // 96px
} as const;
```

### Typography Tokens

```typescript
// src/theme/typography.ts
export const fontFamily = {
  sans: 'Inter, ui-sans-serif, system-ui, -apple-system, sans-serif',
  serif: 'Georgia, Cambria, "Times New Roman", Times, serif',
  mono: 'Fira Code, ui-monospace, SFMono-Regular, Menlo, monospace',
} as const;

export const fontSize = {
  xs: '0.75rem',    // 12px
  sm: '0.875rem',   // 14px
  base: '1rem',     // 16px
  lg: '1.125rem',   // 18px
  xl: '1.25rem',    // 20px
  '2xl': '1.5rem',  // 24px
  '3xl': '1.875rem', // 30px
  '4xl': '2.25rem', // 36px
  '5xl': '3rem',    // 48px
} as const;

export const fontWeight = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;
```

### Border & Shadow Tokens

```typescript
// src/theme/borders.ts
export const borderRadius = {
  none: '0',
  sm: '0.125rem',   // 2px
  DEFAULT: '0.25rem', // 4px
  md: '0.375rem',   // 6px
  lg: '0.5rem',     // 8px
  xl: '0.75rem',    // 12px
  '2xl': '1rem',    // 16px
  full: '9999px',
} as const;

// src/theme/shadows.ts
export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
} as const;
```

---

## 3. Tailwind CSS (v4) `@theme` Integration

In modern Anti-Kit development, tokens in `src/theme/` are mapped directly to Tailwind CSS v4 `@theme` directives inside `src/theme/theme.css`:

```css
/* src/theme/theme.css */
@theme {
  --color-primary: oklch(0.6 0.22 260);
  --color-primary-foreground: oklch(0.98 0 0);
  --color-secondary: oklch(0.95 0.02 260);
  --color-secondary-foreground: oklch(0.2 0.05 260);
  --color-destructive: oklch(0.6 0.24 25);
  --color-destructive-foreground: oklch(0.98 0 0);
  --color-muted: oklch(0.96 0.01 260);
  --color-muted-foreground: oklch(0.5 0.02 260);
  --color-background: oklch(1 0 0);
  --color-foreground: oklch(0.15 0.02 260);

  --font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;
  --font-mono: 'Fira Code', ui-monospace, monospace;

  --spacing-1: 0.25rem;
  --spacing-2: 0.5rem;
  --spacing-3: 0.75rem;
  --spacing-4: 1rem;
  --spacing-6: 1.5rem;
  --spacing-8: 2rem;

  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-full: 9999px;
}
```

```css
/* src/app/globals.css */
@import '../theme/theme.css';
@import 'tailwindcss';
```

---

## 4. Consuming Theme Tokens in Core UI Primitives

Core primitives in `src/components/core/` consume these tokens via Tailwind utility classes and `cva`, without any hardcoded values or ad-hoc custom styles:

```tsx
// src/components/core/Button/Button.tsx
import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center font-medium rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-border bg-background hover:bg-muted text-foreground',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        default: 'h-9 px-4 text-sm',
        lg: 'h-10 px-6 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);
```

---

## 5. Barrel Export & TypeScript Contracts

Export all theme contracts cleanly from `src/theme/index.ts`:

```typescript
// src/theme/index.ts
export * from './colors';
export * from './spacing';
export * from './typography';
export * from './borders';
export * from './shadows';
export * from './animations';
export * from './breakpoints';
export * from './z-index';

import { colors } from './colors';
import { spacing } from './spacing';
import { fontFamily, fontSize, fontWeight } from './typography';
import { borderRadius } from './borders';
import { shadows } from './shadows';

export const theme = {
  colors,
  spacing,
  fontFamily,
  fontSize,
  fontWeight,
  borderRadius,
  shadows,
} as const;

export type Theme = typeof theme;
```

---

## 6. Theming & Dark Mode

Support runtime dark mode through semantic CSS custom properties:

```css
/* Light mode defaults */
:root {
  --background: #ffffff;
  --foreground: #171717;
  --primary: #2196f3;
  --border: #e5e7eb;
}

/* Dark mode overrides */
[data-theme='dark'] {
  --background: #0a0a0a;
  --foreground: #ededed;
  --primary: #60a5fa;
  --border: #262626;
}
```

---

## Best Practices

1. **Replace Scattered Asset Themes**: Eliminate loose color palettes or unstandardized files in `src/assets/theme/`. Centralize all design tokens inside `src/theme/`.
2. **Use Semantic Tokens**: Use functional names (`primary`, `destructive`, `background`, `border`) rather than literal colors (`blue-500`, `red-600`).
3. **Pure Values**: Keep `src/theme/` free of DOM nodes, JSX, and business logic.
4. **Type-Safe Scales**: Export `as const` tokens for strong TypeScript autocomplete and validation.
5. **Tailwind `@theme` Mapping**: Ensure all CSS custom properties map smoothly to Tailwind v4 `@theme` utility tokens.

---

## Related Subskills

- [Atomic Design Hub](../SKILL.md) — Master methodology and subskill routing
- [Fundamentals](../fundamentals/SKILL.md) — Core hierarchy, directory layouts, and composition rules
- [Core UI Primitives](../atoms/SKILL.md) — Indivisible Core UI primitives in `src/components/core/` (Button, Input, Badge, Icon)
- [Composites](../composites/SKILL.md) — Functional core primitive combinations (form fields, search inputs)
- [Sections](../sections/SKILL.md) — Standalone UI sections (headers, footers, data tables)
- [Layouts](../layouts/SKILL.md) — Page layout skeletons with slot-based content
- [Integration](../integration/SKILL.md) — Framework integration (React, Vue 3, Tailwind configuration, Storybook)
