---
name: design-spec
description: How to author a DESIGN.md file — the machine-readable design-token + human-rationale format that must exist before any UI is built. YAML front-matter token schema (colors, typography, spacing, rounded, components), type system, token references, canonical section order, and mapping to Tailwind CSS base and theme.
when_to_use: "BEFORE writing any UI code (web or mobile). Read when creating or updating a project's DESIGN.md, defining design tokens, mapping tokens into Tailwind CSS base/theme, or when a UI task needs a design source-of-truth. Pair with frontend-design (web aesthetics) or mobile-design (mobile)."
allowed-tools: Read, Write, Edit, Glob, Grep
version: 1.1.0
---

# DESIGN.md Specification

> A DESIGN.md is the **single source of truth** for a project's visual language. Create it BEFORE building UI.
> Two layers: machine-readable **design tokens** (YAML front matter) + human-readable **rationale** (markdown body).
> Tokens are normative; prose gives context. Prose may use descriptive names ("Midnight Forest Green") that map to systematic token names (`primary`).
>
> _Format adapted from the [DESIGN.md spec](https://github.com/google-labs-code/design.md) (Google Labs, Apache-2.0). A linter/exporter exists: `npx @google/design.md`._
>
> 📚 **Reference library:** [collection.md](collection.md) — 70+ real-world DESIGN.md files (Airbnb, Stripe, Linear, Vercel, Apple…) to study or adapt as a starting point.

---

## When to produce a DESIGN.md

This is a **hard gate** for UI work (see `.agents/rules/design-rules.md`): before writing components, pages, or styles, a `DESIGN.md` must exist at the project root. If absent, create it first from the brief; if present, read it and conform.

The token block converts cleanly to/from `tokens.json`, Figma variables, and Tailwind theme config — so it is the bridge between design intent and code.

---

## 1. File structure

```
---
<YAML token front matter>
---

# Project Name (optional title)

## Overview
## Colors
## Typography
## Layout
## Elevation & Depth
## Shapes
## Components
## Do's and Don'ts
```

Front matter MUST begin and end with a line containing exactly `---`. Sections use `##` headings, appear in the order above, and may be omitted if irrelevant. Domain-specific sections may be added.

---

## 2. Token schema (YAML front matter)

```yaml
version: alpha            # optional
name: Daylight Prestige
description: ...          # optional
colors:
  <token-name>: "#RRGGBB"
typography:
  <token-name>:
    fontFamily: Public Sans
    fontSize: 48px
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: -0.02em
rounded:
  <scale>: 8px
spacing:
  <scale>: 16px           # Dimension or unitless number
components:
  <component-name>:
    backgroundColor: "{colors.primary}"
    rounded: "{rounded.md}"
    padding: 12px
```

`<scale>` is a named level: `xs sm md lg xl full` (any descriptive key is valid).

---

## 3. Type system

| Type | Format | Example |
|------|--------|---------|
| Color | `#` + hex (sRGB) | `"#1A1C1E"` |
| Dimension | number + unit (`px`/`em`/`rem`) | `48px`, `-0.02em` |
| Token Reference | `{path.to.token}` | `{colors.primary}` |
| Typography | composite object | see §4 |

**Typography properties:** `fontFamily` (string), `fontSize` (Dimension), `fontWeight` (number — bare or quoted are equivalent in YAML), `lineHeight` (Dimension or unitless multiplier — unitless recommended), `letterSpacing` (Dimension), `fontFeature` (string), `fontVariation` (string).

**Token references:** wrapped in `{}` pointing to another value in the tree. Most groups must reference a **primitive** (`{colors.primary-60}`), not a group. Inside `components`, references to **composite** values are allowed (`{typography.label-md}`).

**Component property tokens:** `backgroundColor`, `textColor` (Color); `typography` (Typography); `rounded`, `padding`, `size`, `height`, `width` (Dimension).

**Variants:** define UI states as separate entries with a related key — `button-primary`, `button-primary-hover`.

---

## 4. Sections (canonical order)

| # | Section | Aliases | Purpose |
|---|---------|---------|---------|
| 1 | Overview | Brand & Style | Brand personality, audience, emotional tone. Fallback context when a token isn't defined. |
| 2 | Colors | | Palettes; at least `primary`. Common: primary/secondary/tertiary/neutral. |
| 3 | Typography | | 9–15 levels, each a semantic role (headline/body/label) × size. |
| 4 | Layout | Layout & Spacing | Grid model, spacing scale, containment. |
| 5 | Elevation & Depth | Elevation | Shadows, OR for flat designs the alternative (borders, tonal layers, contrast). |
| 6 | Shapes | | Corner radii, edge treatment, shape language. |
| 7 | Components | | Per-atom guidance: Buttons, Inputs, Cards, Chips, Lists, etc. |
| 8 | Do's and Don'ts | | Guardrails during generation. |

---

## 5. Recommended token names (guidance, not required)

- **Colors:** `primary secondary tertiary neutral surface on-surface error`
- **Typography:** `headline-display headline-lg headline-md body-lg body-md body-sm label-lg label-md label-sm`
- **Rounded:** `none sm md lg xl full`

---

## 6. Consumer behavior for unknown content

The spec is extensible. When encountering content it doesn't define:

| Scenario | Behavior |
|----------|----------|
| Unknown section heading (`## Iconography`) | Preserve; do not error |
| Unknown color token name | Accept if value is valid |
| Unknown typography token name | Accept as valid typography |
| Unknown spacing value | Accept; store as string if not a valid dimension |
| Unknown component property | Accept with warning |
| **Duplicate section heading** (two `## Colors`) | **Error; reject the file** |

---

## 7. Minimal example

```markdown
---
name: Calm Scheduler
colors:
  primary: "#1A1C1E"
  tertiary: "#B8422E"
  neutral: "#F7F5F2"
typography:
  h1: { fontFamily: Public Sans, fontSize: 48px, fontWeight: 600, lineHeight: 1.1 }
  body-md: { fontFamily: Public Sans, fontSize: 16px, fontWeight: 400, lineHeight: 1.6 }
rounded: { sm: 4px, md: 8px }
spacing: { sm: 8px, md: 16px, lg: 32px }
components:
  button-primary:
    backgroundColor: "{colors.tertiary}"
    rounded: "{rounded.md}"
    padding: 12px
---

# Calm Scheduler

## Overview
A calm, professional interface for a healthcare scheduling platform.
Accessibility-first: high contrast, generous touch targets.

## Colors
- **Primary (#1A1C1E):** Deep ink for headlines and core text.
- **Tertiary (#B8422E):** The sole driver for interaction.
- **Neutral (#F7F5F2):** Warm limestone foundation.

## Do's and Don'ts
- Do use the tertiary color only for the single most important action per screen.
- Don't mix rounded and sharp corners in the same view.
- Do maintain WCAG AA contrast (4.5:1 for normal text).
```

---

## 8. Mapping DESIGN.md to Tailwind CSS Base & Theme

Once `DESIGN.md` is authored, the tokens must be bound to your application stylesheet before building UI components. This bridges design tokens into CSS variables, Tailwind utility classes, and base element styles.

### Token-to-Tailwind Mapping Matrix

| DESIGN.md Token | Tailwind v4 (`@theme`) | Tailwind v3 (`tailwind.config.js`) | `@layer base` Role |
|---|---|---|---|
| `colors.<name>` | `--color-<name>: <value>;` | `theme.extend.colors.<name>` | Background, surface, text, and border defaults |
| `typography.<role>` | `--font-<role>: ...;` | `theme.extend.fontFamily` / `fontSize` | Heading (`h1`–`h6`), body, and code resets |
| `rounded.<scale>` | `--radius-<scale>: <value>;` | `theme.extend.borderRadius.<scale>` | Default radius on buttons, inputs, cards |
| `spacing.<scale>` | `--spacing-<scale>: <value>;` | `theme.extend.spacing.<scale>` | Consistent rhythm & layout containers |
| `components.<name>` | Component utility or CVA variant | Custom component class | Base component appearance |

---

### Modern Tailwind CSS (v4) Setup: `@theme` + `@layer base`

In Tailwind CSS v4, define tokens inside the `@theme` directive, then establish base element styling in `@layer base` within your primary CSS file (e.g., `src/app/globals.css` or `src/theme/theme.css`):

```css
@import "tailwindcss";

/* 1. Map DESIGN.md tokens to Tailwind CSS theme variables */
@theme {
  --color-primary: #1A1C1E;
  --color-tertiary: #B8422E;
  --color-neutral: #F7F5F2;
  --color-surface: #FFFFFF;
  --color-border: #E5E7EB;

  --font-sans: "Public Sans", system-ui, -apple-system, sans-serif;
  --font-display: "Public Sans", system-ui, -apple-system, sans-serif;

  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 16px;

  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 32px;
}

/* 2. Establish foundational base styles for HTML elements */
@layer base {
  *,
  ::after,
  ::before,
  ::backdrop,
  ::file-selector-button {
    border-color: var(--color-border, currentColor);
  }

  html {
    font-family: var(--font-sans);
    scroll-behavior: smooth;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  body {
    background-color: var(--color-neutral);
    color: var(--color-primary);
    font-family: var(--font-sans);
    line-height: 1.6;
    min-height: 100vh;
  }

  /* Headings bound to typography tokens */
  h1 {
    font-family: var(--font-display);
    font-size: 3rem;       /* 48px from typography.h1 */
    font-weight: 600;
    line-height: 1.1;
    letter-spacing: -0.02em;
    color: var(--color-primary);
  }

  h2 {
    font-family: var(--font-display);
    font-size: 2.25rem;    /* 36px */
    font-weight: 600;
    line-height: 1.2;
    letter-spacing: -0.01em;
    color: var(--color-primary);
  }

  h3 {
    font-family: var(--font-display);
    font-size: 1.5rem;     /* 24px */
    font-weight: 600;
    line-height: 1.3;
    color: var(--color-primary);
  }

  /* Base interactive & focus styling */
  a {
    color: var(--color-tertiary);
    text-decoration: inherit;
    transition: color 0.15s ease-in-out;
  }

  a:hover {
    text-decoration: underline;
  }

  :focus-visible {
    outline: 2px solid var(--color-tertiary);
    outline-offset: 2px;
  }
}
```

---

### Tailwind CSS (v3) Setup: `tailwind.config.js` + `@layer base`

For projects utilizing Tailwind CSS v3, configure the theme object in `tailwind.config.js` and apply element defaults via `@layer base` in `globals.css`:

```javascript
// tailwind.config.js
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#1A1C1E",
        tertiary: "#B8422E",
        neutral: "#F7F5F2",
      },
      fontFamily: {
        sans: ["Public Sans", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "16px",
      },
      spacing: {
        sm: "8px",
        md: "16px",
        lg: "32px",
      },
    },
  },
  plugins: [],
};
```

```css
/* src/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-neutral text-primary font-sans;
  }

  h1 {
    @apply text-5xl font-semibold leading-tight tracking-tight text-primary;
  }

  a {
    @apply text-tertiary hover:underline;
  }
}
```

---

### Synchronizing Rules

1. **Tokens Before Styles**: Never write ad-hoc CSS hex values in components. Add them to `DESIGN.md` first, expose them through `@theme` or Tailwind config, then consume via utility classes (`bg-primary`, `text-tertiary`, `rounded-md`).
2. **Base Layer Scoping**: `@layer base` should ONLY contain element-level resets and global typography defaults matching `DESIGN.md`. Component variations belong in atomic primitives (`src/components/core/`) or `@layer components`.
3. **Contrast Verification**: Ensure colors assigned to `body` background and text satisfy WCAG AA contrast (4.5:1 minimum for regular text).

---

## Workflow

1. Read the brief and infer the design direction (see `frontend-design` / `mobile-design`).
2. **ALWAYS read [collection.md](collection.md) first** — 70+ real-world DESIGN.md files. Find the 1–2 closest in vibe/industry to the brief, open their `DESIGN.md` on GitHub, and study how they structure tokens. Adapt, never blindly copy.
3. **Write `DESIGN.md` at the project root** — tokens first, then rationale prose.
4. **Bridge tokens into Tailwind CSS base & theme** — map tokens to `@theme` (or `tailwind.config.js`) and bind typography/palette defaults in `@layer base`.
5. **Build UI strictly against the tokens** — descriptive names in prose must map to token names. Use utility classes and atomic primitives.
6. **Keep DESIGN.md in sync** when the visual language changes — it stays the source of truth.
