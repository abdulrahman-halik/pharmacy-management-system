---
name: atomic-design-atoms
description: Indivisible Core UI primitives in components/core/ (Button, Input, Label, Icon, Avatar, Badge, Checkbox, Typography) styled with Tailwind CSS (v4) and cva.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Atomic Design: Atoms (Core UI Primitives)

Master the creation of atomic components — the foundational, indivisible building blocks of your design system. In modern architecture, **Atoms represent the Core UI Primitives layer residing under `src/components/core/`**, replacing legacy `components/atoms/` and custom `.module.css` files with **Tailwind CSS (v4)**, `cva` (Class Variance Authority), and the `cn()` utility (`clsx` + `tailwind-merge`).

---

## What Are Core UI Primitives (Atoms)?

Core UI Primitives are the indivisible, lowest-level visual components that serve as the foundation for all composites, sections, and layouts:

- **Indivisible**: Cannot be broken down into smaller functional UI units without losing utility
- **Lives in `components/core/`**: Structured cleanly as the design system's core component library
- **Utility-First**: Styled exclusively with Tailwind CSS and `cva` — zero `.module.css` files
- **Controlled & Stateless**: Driven purely by props, callbacks, and native HTML attributes
- **Accessible by Default**: Implements WAI-ARIA attributes, keyboard navigation, and focus rings
- **Composable**: Exposes standard DOM refs (`React.forwardRef`) and merges classNames via `cn()`

---

## Common Core UI Primitives

| Category | Primitives | Primary Directory Path |
|---|---|---|
| **Action & Control** | Button, Link, Toggle, Slider | `src/components/core/Button/`, `Toggle/` |
| **Form Inputs** | Input, Textarea, Checkbox, Radio, Select, Label | `src/components/core/Input/`, `Checkbox/`, `Label/` |
| **Display & Status** | Typography (Heading, Text), Badge, Avatar, Spinner, Kbd | `src/components/core/Typography/`, `Badge/`, `Avatar/` |
| **Layout & Structure** | Separator/Divider, Box, AspectRatio, Skeleton | `src/components/core/Separator/`, `Skeleton/` |
| **Visual Primitives** | Icon, TooltipTrigger, ColorSwatch | `src/components/core/Icon/` |

---

## The Core Helper: `cn()`

All core primitives rely on `cn()` (`src/lib/utils.ts`) to merge Tailwind utility classes deterministically without style collisions:

```typescript
// src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

## 1. Button Primitive

### Complete Implementation

```typescript
// src/components/core/Button/Button.tsx
import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
        outline: 'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
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
      fullWidth: false,
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      type = 'button',
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        {...props}
      >
        {isLoading ? (
          <>
            <svg
              className="size-4 animate-spin text-current"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
            <span>Loading...</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
            <span>{children}</span>
            {rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
```

---

## 2. Input Primitive

```typescript
// src/components/core/Input/Input.tsx
import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const inputVariants = cva(
  'flex w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      sizeVariant: {
        sm: 'h-8 text-xs px-2.5',
        default: 'h-9 text-sm px-3',
        lg: 'h-11 text-base px-4',
      },
      hasError: {
        true: 'border-destructive focus-visible:ring-destructive',
      },
    },
    defaultVariants: {
      sizeVariant: 'default',
      hasError: false,
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  leftAddon?: React.ReactNode;
  rightAddon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', sizeVariant, hasError, leftAddon, rightAddon, disabled, ...props }, ref) => {
    if (leftAddon || rightAddon) {
      return (
        <div
          className={cn(
            'flex items-center rounded-md border border-input bg-background shadow-sm transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
            hasError && 'border-destructive focus-within:ring-destructive',
            disabled && 'cursor-not-allowed opacity-50',
            className
          )}
        >
          {leftAddon && (
            <span className="flex items-center pl-3 text-muted-foreground text-sm">
              {leftAddon}
            </span>
          )}
          <input
            ref={ref}
            type={type}
            disabled={disabled}
            aria-invalid={!!hasError}
            className="flex-1 bg-transparent px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed"
            {...props}
          />
          {rightAddon && (
            <span className="flex items-center pr-3 text-muted-foreground text-sm">
              {rightAddon}
            </span>
          )}
        </div>
      );
    }

    return (
      <input
        ref={ref}
        type={type}
        disabled={disabled}
        aria-invalid={!!hasError}
        className={cn(inputVariants({ sizeVariant, hasError, className }))}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';
```

---

## 3. Label Primitive

```typescript
// src/components/core/Label/Label.tsx
import React from 'react';
import { cn } from '@/lib/utils';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
  disabled?: boolean;
}

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required = false, disabled = false, children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          'text-sm font-medium leading-none select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground',
          disabled && 'cursor-not-allowed opacity-50',
          className
        )}
        {...props}
      >
        {children}
        {required && (
          <span className="ml-1 text-destructive font-bold" aria-hidden="true">
            *
          </span>
        )}
      </label>
    );
  }
);

Label.displayName = 'Label';
```

---

## 4. Icon Primitive

```typescript
// src/components/core/Icon/Icon.tsx
import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const iconVariants = cva('inline-block shrink-0 fill-current', {
  variants: {
    size: {
      xs: 'size-3.5',
      sm: 'size-4',
      md: 'size-5',
      lg: 'size-6',
      xl: 'size-8',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

export interface IconProps
  extends React.SVGAttributes<SVGElement>,
    VariantProps<typeof iconVariants> {
  name: string;
  label?: string;
}

export const Icon: React.FC<IconProps> = ({
  name,
  size,
  label,
  className,
  ...props
}) => {
  return (
    <svg
      className={cn(iconVariants({ size, className }))}
      aria-label={label}
      aria-hidden={!label}
      role={label ? 'img' : 'presentation'}
      {...props}
    >
      <use href={`/icons.svg#${name}`} />
    </svg>
  );
};

Icon.displayName = 'Icon';
```

---

## 5. Avatar Primitive

```typescript
// src/components/core/Avatar/Avatar.tsx
import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const avatarVariants = cva(
  'relative flex shrink-0 overflow-hidden rounded-full bg-muted font-medium text-muted-foreground select-none items-center justify-center',
  {
    variants: {
      size: {
        xs: 'size-6 text-xs',
        sm: 'size-8 text-xs',
        md: 'size-10 text-sm',
        lg: 'size-12 text-base',
        xl: 'size-16 text-lg',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

export interface AvatarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof avatarVariants> {
  src?: string;
  alt: string;
  initials?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  initials,
  size,
  className,
  ...props
}) => {
  const [imageError, setImageError] = React.useState(false);

  const showImage = src && !imageError;
  const showInitials = !showImage && initials;

  return (
    <div
      role="img"
      aria-label={alt}
      className={cn(avatarVariants({ size, className }))}
      {...props}
    >
      {showImage && (
        <img
          src={src}
          alt={alt}
          className="aspect-square size-full object-cover"
          onError={() => setImageError(true)}
        />
      )}
      {showInitials && <span>{initials}</span>}
      {!showImage && !showInitials && <span>?</span>}
    </div>
  );
};

Avatar.displayName = 'Avatar';
```

---

## 6. Badge Primitive

```typescript
// src/components/core/Badge/Badge.tsx
import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80',
        secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive: 'border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80',
        outline: 'text-foreground border-border',
        success: 'border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
        warning: 'border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-400',
      },
      size: {
        sm: 'px-2 py-0.2 text-[10px]',
        md: 'px-2.5 py-0.5 text-xs',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge: React.FC<BadgeProps> = ({ className, variant, size, ...props }) => {
  return <span className={cn(badgeVariants({ variant, size, className }))} {...props} />;
};

Badge.displayName = 'Badge';
```

---

## 7. Checkbox Primitive

```typescript
// src/components/core/Checkbox/Checkbox.tsx
import React from 'react';
import { cn } from '@/lib/utils';

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  indeterminate?: boolean;
  label?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, indeterminate = false, label, disabled, id, ...props }, ref) => {
    const inputRef = React.useRef<HTMLInputElement>(null);
    React.useImperativeHandle(ref, () => inputRef.current!);

    React.useEffect(() => {
      if (inputRef.current) {
        inputRef.current.indeterminate = indeterminate;
      }
    }, [indeterminate]);

    const checkboxElement = (
      <div className="relative inline-flex items-center">
        <input
          ref={inputRef}
          type="checkbox"
          id={id}
          disabled={disabled}
          className={cn(
            'peer size-4 shrink-0 rounded border border-primary shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 text-primary accent-primary cursor-pointer',
            className
          )}
          {...props}
        />
      </div>
    );

    if (label) {
      return (
        <label
          htmlFor={id}
          className={cn(
            'inline-flex items-center gap-2 text-sm font-medium leading-none cursor-pointer select-none text-foreground',
            disabled && 'cursor-not-allowed opacity-50'
          )}
        >
          {checkboxElement}
          <span>{label}</span>
        </label>
      );
    }

    return checkboxElement;
  }
);

Checkbox.displayName = 'Checkbox';
```

---

## 8. Typography Primitives

```typescript
// src/components/core/Typography/Text.tsx
import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const textVariants = cva('text-foreground leading-relaxed', {
  variants: {
    size: {
      xs: 'text-xs',
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl',
    },
    weight: {
      normal: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
      bold: 'font-bold',
    },
    color: {
      default: 'text-foreground',
      muted: 'text-muted-foreground',
      primary: 'text-primary',
      destructive: 'text-destructive',
      success: 'text-emerald-600 dark:text-emerald-400',
    },
    truncate: {
      true: 'truncate',
    },
  },
  defaultVariants: {
    size: 'md',
    weight: 'normal',
    color: 'default',
    truncate: false,
  },
});

export interface TextProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof textVariants> {
  as?: 'p' | 'span' | 'div' | 'label';
}

export const Text: React.FC<TextProps> = ({
  as: Component = 'p',
  size,
  weight,
  color,
  truncate,
  className,
  children,
  ...props
}) => {
  return (
    <Component
      className={cn(textVariants({ size, weight, color, truncate, className }))}
      {...props}
    >
      {children}
    </Component>
  );
};

// src/components/core/Typography/Heading.tsx
export const headingVariants = cva('font-bold tracking-tight text-foreground', {
  variants: {
    level: {
      1: 'text-4xl lg:text-5xl font-extrabold',
      2: 'text-3xl lg:text-4xl border-b pb-2',
      3: 'text-2xl',
      4: 'text-xl',
      5: 'text-lg',
      6: 'text-base',
    },
  },
  defaultVariants: {
    level: 1,
  },
});

export interface HeadingProps
  extends React.HTMLAttributes<HTMLHeadingElement>,
    VariantProps<typeof headingVariants> {
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  as?: `h1` | `h2` | `h3` | `h4` | `h5` | `h6`;
}

export const Heading: React.FC<HeadingProps> = ({
  level = 1,
  as,
  className,
  children,
  ...props
}) => {
  const Component = as || (`h${level}` as const);
  return (
    <Component className={cn(headingVariants({ level, className }))} {...props}>
      {children}
    </Component>
  );
};
```

---

## Unified Barrel Export for Core Primitives

Export all core primitives from `src/components/core/index.ts`:

```typescript
// src/components/core/index.ts
export * from './Button/Button';
export * from './Input/Input';
export * from './Label/Label';
export * from './Icon/Icon';
export * from './Avatar/Avatar';
export * from './Badge/Badge';
export * from './Checkbox/Checkbox';
export * from './Typography/Text';
export * from './Typography/Heading';
```

---

## Best Practices for Core Primitives

### 1. Always use `cva` and `cn()`
Define static variants cleanly and allow caller overrides through `className` without specificity battles.

```typescript
// GOOD: Uses cva + cn
export const Button = ({ variant, size, className, ...props }) => (
  <button className={cn(buttonVariants({ variant, size, className }))} {...props} />
);

// BAD: String concatenation or inline styles
export const Button = ({ variant, className }) => (
  <button className={`btn-${variant} ${className}`} />
);
```

### 2. Forward Refs on All DOM Elements
Consumers need ref access for form libraries (react-hook-form), focus management, and animations.

```typescript
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (props, ref) => <input ref={ref} {...props} />
);
```

### 3. Strictly Presentation-Only
Never make API calls, access routing contexts, or trigger side effects inside a Core primitive. All interactive state belongs in parent Composites or Sections.

---

## Anti-Patterns to Avoid

| Anti-Pattern | Bad Example | Correct Pattern |
|---|---|---|
| **Custom CSS Island** | Creating `Button.module.css` | Use Tailwind CSS utility classes and `cva` |
| **Direct Hex Colors** | `bg-[#2196f3]` | Use semantic theme tokens (`bg-primary`, `text-primary-foreground`) |
| **Upward Import** | `import { SearchBar } from '@/components/composites'` | Never import upward; Core primitives only import Theme tokens |
| **Hardcoded Sizing** | Fixed `w-[320px]` in Core button | Allow parent layout / fullWidth prop to govern width |

---

## Related Subskills

- [Atomic Design Hub](../SKILL.md) — Master methodology and subskill routing
- [Fundamentals](../fundamentals/SKILL.md) — Core hierarchy, directory layouts, and composition rules
- [Theme & Tokens](../theme/SKILL.md) — Design tokens under `src/theme/`, Tailwind v4 `@theme` tokens, and CSS variables
- [Composites](../composites/SKILL.md) — Functional combinations of core primitives (form fields, search inputs)
- [Sections](../sections/SKILL.md) — Standalone UI sections (headers, footers, data tables)
- [Layouts](../layouts/SKILL.md) — Page layout skeletons with slot-based content
- [Integration](../integration/SKILL.md) — Framework integration (React/Next.js, Vue 3, Storybook, Vitest)
