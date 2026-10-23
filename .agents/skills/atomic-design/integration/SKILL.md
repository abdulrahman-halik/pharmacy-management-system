---
name: atomic-design-integration
description: Framework-specific patterns for React/Next.js, Tailwind CSS (v4), Storybook workshops, testing strategies, and path aliases.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Atomic Design: Framework Integration

Master the integration of modern Atomic Design with **Tailwind CSS (v4)**, `cva`, Next.js/React, and testing setups. In this architecture:
- Theme tokens are centralized under **`src/theme/`** and mapped to Tailwind v4 `@theme`.
- Atoms are structured as **Core UI primitives under `src/components/core/`**.
- Molecules are structured as **Composites under `src/components/composites/`**.
- Organisms are structured as **Sections under `src/components/sections/`**.
- Templates are structured as **Layouts under `src/components/layouts/`**.
- Concrete routes reside in **`src/app/` or `src/pages/`**.

---

## React & Next.js Integration

### Project Structure

```text
src/
├── theme/                        # Level 0: Theme & Tokens (replaces asset themes)
│   ├── index.ts                  # Master theme contract
│   ├── tokens.ts                 # Primitive design tokens
│   ├── colors.ts                 # Semantic color palette
│   ├── spacing.ts                # Spacing increments
│   ├── typography.ts             # Font families & clamps
│   ├── borders.ts                # Radii and border widths
│   ├── shadows.ts                # Elevation tokens
│   └── theme.css                 # Tailwind CSS v4 @theme directive & CSS vars
├── app/
│   ├── globals.css               # Imports @/theme/theme.css & tailwindcss
│   ├── layout.tsx                # App root layout
│   └── page.tsx                  # Level 5: Concrete Page
├── lib/
│   └── utils.ts                  # cn() helper: clsx + tailwind-merge
├── components/
│   ├── core/                     # Level 1: Core UI Primitives (replacing legacy Atoms)
│   │   ├── Button/
│   │   │   ├── Button.tsx        # Styled with cva & Tailwind classes
│   │   │   ├── Button.test.tsx
│   │   │   ├── Button.stories.tsx
│   │   │   └── index.ts
│   │   ├── Input/
│   │   ├── Badge/
│   │   ├── Avatar/
│   │   ├── Label/
│   │   ├── Checkbox/
│   │   ├── Icon/
│   │   └── index.ts              # Core primitives barrel
│   ├── composites/               # Level 2: Composites (replacing legacy Molecules)
│   │   ├── FormField/
│   │   │   ├── FormField.tsx
│   │   │   ├── FormField.test.tsx
│   │   │   └── index.ts
│   │   ├── SearchForm/
│   │   └── index.ts              # Composites barrel
│   ├── sections/                 # Level 3: Sections (replacing legacy Organisms)
│   │   ├── Header/
│   │   │   ├── Header.tsx
│   │   │   ├── useHeader.ts      # Custom state hook
│   │   │   └── index.ts
│   │   └── index.ts              # Sections barrel
│   ├── layouts/                  # Level 4: Layouts (replacing legacy Templates)
│   │   ├── MainLayout/
│   │   │   ├── MainLayout.tsx
│   │   │   └── index.ts
│   │   └── index.ts              # Layouts barrel
│   └── index.ts                  # Unified components barrel
```

---

## Barrel Exports Pattern

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
```

### 2. Unified Components Barrel

```typescript
// src/components/index.ts
export * from './core';
export * from './composites';
export * from './sections';
export * from './layouts';
```

---

## Component Template (React / TypeScript / Tailwind / `cva`)

```typescript
// src/components/core/Button/Button.tsx
import React, { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90',
        secondary: 'bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80',
        destructive: 'bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90',
        outline: 'border border-border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-8 text-base',
        icon: 'size-9 p-0',
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, fullWidth, isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, fullWidth }), className)}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        {...props}
      >
        {isLoading && (
          <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
```

---

## Storybook Integration

```typescript
// src/components/core/Button/Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Core/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'destructive', 'outline', 'ghost', 'link'],
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon'],
    },
    isLoading: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
  args: {
    children: 'Button',
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: { variant: 'default' },
};

export const Secondary: Story = {
  args: { variant: 'secondary' },
};

export const Loading: Story = {
  args: { isLoading: true, children: 'Submitting...' },
};
```

### Storybook Hierarchy Tiers

```typescript
// Title format: "Tier/ComponentName"
title: 'Core/Button'           // Level 1: Core primitives
title: 'Core/Input'
title: 'Composites/FormField'  // Level 2: Composites
title: 'Composites/SearchForm'
title: 'Sections/Header'       // Level 3: Sections
title: 'Sections/ProductCard'
title: 'Layouts/Dashboard'     // Level 4: Layouts
title: 'Pages/DashboardPage'   // Level 5: Pages
```

---

## Testing Integration (Vitest & React Testing Library)

Test for accessibility and Tailwind class output:

```typescript
// src/components/core/Button/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('renders children correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  it('applies destructive styling variant', () => {
    render(<Button variant="destructive">Delete</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-destructive');
  });

  it('disables button when loading or disabled', () => {
    render(<Button isLoading>Loading</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('triggers onClick callback when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Submit</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

---

## Path Aliases Configuration

### 1. TypeScript (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/theme/*": ["src/theme/*"],
      "@/theme": ["src/theme/index.ts"],
      "@/components/*": ["src/components/*"],
      "@/core/*": ["src/components/core/*"],
      "@/core": ["src/components/core/index.ts"],
      "@/composites/*": ["src/components/composites/*"],
      "@/sections/*": ["src/components/sections/*"],
      "@/layouts/*": ["src/components/layouts/*"],
      "@/lib/*": ["src/lib/*"]
    }
  }
}
```

### 2. Vite (`vite.config.ts`)

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/theme': path.resolve(__dirname, './src/theme'),
      '@/core': path.resolve(__dirname, './src/components/core'),
      '@/composites': path.resolve(__dirname, './src/components/composites'),
      '@/sections': path.resolve(__dirname, './src/components/sections'),
      '@/layouts': path.resolve(__dirname, './src/components/layouts'),
    },
  },
});
```

---

## Related Subskills

- [Atomic Design Hub](../SKILL.md) — Master methodology and subskill routing
- [Fundamentals](../fundamentals/SKILL.md) — Core hierarchy, directory layouts, and composition rules
- [Theme & Tokens](../theme/SKILL.md) — Design tokens under `src/theme/`, Tailwind v4 `@theme` tokens, and CSS variables
- [Core UI Primitives](../atoms/SKILL.md) — Indivisible Core UI primitives in `src/components/core/`
- [Composites](../composites/SKILL.md) — Functional core primitive combinations (form fields, search inputs)
- [Sections](../sections/SKILL.md) — Standalone UI sections (headers, footers, data tables)
- [Layouts](../layouts/SKILL.md) — Page layout skeletons with slot-based content
