---
name: atomic-design-composites
description: Functional combinations of core primitives like form fields, search inputs, media objects, nav items, and stat widgets in src/components/composites/ styled with Tailwind CSS.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Atomic Design: Composites

Master the creation of composite components (Level 2 — formerly known as Molecules) — functional groups of Core UI primitives (`src/components/core/`) that work together as a single unit. In this modernized architecture, composites combine multiple core primitives using **Tailwind CSS utility layouts and `cn()`** under **`src/components/composites/`** — completely free of custom `.module.css` files.

---

## What Are Composites?

Composites are the first level of component composition in Atomic Design. They are:

- **Composed of Core Primitives only**: Import exclusively from `src/components/core/` and Theme tokens (never other composites or sections)
- **Located in `src/components/composites/`**: Replaces legacy `components/molecules/`
- **Single purpose**: Do one specific functional job well
- **Utility-first layout**: Arranged with Tailwind flex, grid, and spacing utilities
- **Reusable**: Used across various sections, layouts, and views
- **Minimally stateful**: May contain ephemeral UI state (e.g. open/closed, search debounce, clear button visibility)
- **Zero business logic**: Delegate API calls, mutations, and domain logic to parents or custom hooks

---

## Common Composite Types

| Category | Composite Examples | Composed Core Primitives |
|---|---|---|
| **Form Composites** | FormField, SearchForm, ToggleField | Label + Input + Typography/Text, Button + Input + Icon |
| **Navigation Composites** | NavItem, BreadcrumbItem, TabTrigger | Icon + Text + Badge, Link + Separator |
| **Display Composites** | MediaObject, CardHeader, Stat, ListItem | Avatar + Heading + Text, Icon + Heading + Button |
| **Action Composites** | ButtonGroup, DropdownTrigger, IconButton | Multiple Buttons, Button + Icon + Tooltip |

---

## 1. FormField Composite Example

Combines `Label`, `Input`, and `Text` primitives from `components/core/` with accessible `aria-describedby` wiring:

```typescript
// src/components/composites/FormField/FormField.tsx
import React from 'react';
import { Label } from '@/components/core/Label';
import { Input, type InputProps } from '@/components/core/Input';
import { Text } from '@/components/core/Typography';
import { cn } from '@/lib/utils';

export interface FormFieldProps extends InputProps {
  /** Field label */
  label: string;
  /** Unique field identifier */
  name: string;
  /** Help text below input */
  helpText?: string;
  /** Error message */
  error?: string;
  /** Required field indicator */
  required?: boolean;
}

export const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(
  (
    {
      label,
      name,
      helpText,
      error,
      required = false,
      id,
      className,
      ...inputProps
    },
    ref
  ) => {
    const fieldId = id || `field-${name}`;
    const helpTextId = helpText ? `${fieldId}-help` : undefined;
    const errorId = error ? `${fieldId}-error` : undefined;

    const describedBy = [helpTextId, errorId].filter(Boolean).join(' ') || undefined;

    return (
      <div className={cn('flex flex-col gap-1.5', className)}>
        <Label htmlFor={fieldId} required={required} disabled={inputProps.disabled}>
          {label}
        </Label>

        <Input
          ref={ref}
          id={fieldId}
          name={name}
          hasError={!!error}
          aria-describedby={describedBy}
          aria-required={required}
          {...inputProps}
        />

        {helpText && !error && (
          <Text id={helpTextId} size="xs" color="muted" className="mt-0.5">
            {helpText}
          </Text>
        )}

        {error && (
          <Text id={errorId} size="xs" color="destructive" className="mt-0.5 font-medium" role="alert">
            {error}
          </Text>
        )}
      </div>
    );
  }
);

FormField.displayName = 'FormField';
```

---

## 2. SearchForm Composite Example

Combines `Input`, `Button`, and `Icon` primitives with live query state and clear action:

```typescript
// src/components/composites/SearchForm/SearchForm.tsx
import React, { useState, useCallback } from 'react';
import { Input } from '@/components/core/Input';
import { Button } from '@/components/core/Button';
import { Icon } from '@/components/core/Icon';
import { cn } from '@/lib/utils';

export interface SearchFormProps {
  /** Placeholder text */
  placeholder?: string;
  /** Initial search value */
  defaultValue?: string;
  /** Submit handler */
  onSubmit: (query: string) => void;
  /** Change handler for live search */
  onChange?: (query: string) => void;
  /** Loading state */
  isLoading?: boolean;
  /** Size variant */
  size?: 'sm' | 'default' | 'lg';
  /** Show clear button */
  clearable?: boolean;
  /** Custom wrapper class */
  className?: string;
}

export const SearchForm: React.FC<SearchFormProps> = ({
  placeholder = 'Search...',
  defaultValue = '',
  onSubmit,
  onChange,
  isLoading = false,
  size = 'default',
  clearable = true,
  className,
}) => {
  const [query, setQuery] = useState(defaultValue);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setQuery(value);
      onChange?.(value);
    },
    [onChange]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      onSubmit(query.trim());
    },
    [onSubmit, query]
  );

  const handleClear = useCallback(() => {
    setQuery('');
    onChange?.('');
  }, [onChange]);

  return (
    <form
      className={cn('flex items-center gap-2', className)}
      onSubmit={handleSubmit}
      role="search"
    >
      <div className="relative flex-1">
        <Input
          type="search"
          value={query}
          onChange={handleChange}
          placeholder={placeholder}
          sizeVariant={size}
          leftAddon={<Icon name="search" size="sm" />}
          rightAddon={
            clearable && query ? (
              <button
                type="button"
                onClick={handleClear}
                className="flex items-center justify-center p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                aria-label="Clear search"
              >
                <Icon name="x" size="xs" />
              </button>
            ) : undefined
          }
          aria-label="Search query"
        />
      </div>
      <Button type="submit" size={size === 'default' ? 'default' : size} isLoading={isLoading}>
        Search
      </Button>
    </form>
  );
};

SearchForm.displayName = 'SearchForm';
```

---

## 3. MediaObject Composite Example

Combines `Avatar`, `Heading`, and `Text` primitives into an accessible content block:

```typescript
// src/components/composites/MediaObject/MediaObject.tsx
import React from 'react';
import { Avatar, type AvatarProps } from '@/components/core/Avatar';
import { Text, Heading } from '@/components/core/Typography';
import { cn } from '@/lib/utils';

export interface MediaObjectProps {
  avatarSrc?: string;
  avatarAlt: string;
  avatarInitials?: string;
  avatarSize?: AvatarProps['size'];
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  meta?: React.ReactNode;
  action?: React.ReactNode;
  align?: 'top' | 'center' | 'bottom';
  className?: string;
}

export const MediaObject: React.FC<MediaObjectProps> = ({
  avatarSrc,
  avatarAlt,
  avatarInitials,
  avatarSize = 'md',
  title,
  subtitle,
  meta,
  action,
  align = 'center',
  className,
}) => {
  const alignClass = {
    top: 'items-start',
    center: 'items-center',
    bottom: 'items-end',
  }[align];

  return (
    <div className={cn('flex gap-3', alignClass, className)}>
      <Avatar
        src={avatarSrc}
        alt={avatarAlt}
        initials={avatarInitials}
        size={avatarSize}
      />

      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm text-foreground truncate">{title}</div>
        {subtitle && (
          <Text size="sm" color="muted" truncate>
            {subtitle}
          </Text>
        )}
        {meta && (
          <Text size="xs" color="muted" className="mt-0.5">
            {meta}
          </Text>
        )}
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};

MediaObject.displayName = 'MediaObject';
```

---

## 4. NavItem Composite Example

Combines `Icon`, `Text`, and `Badge` primitives into an accessible interactive navigation link:

```typescript
// src/components/composites/NavItem/NavItem.tsx
import React from 'react';
import { Icon } from '@/components/core/Icon';
import { Badge } from '@/components/core/Badge';
import { cn } from '@/lib/utils';

export interface NavItemProps {
  icon?: string;
  label: string;
  href: string;
  isActive?: boolean;
  badge?: number;
  disabled?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
}

export const NavItem: React.FC<NavItemProps> = ({
  icon,
  label,
  href,
  isActive = false,
  badge,
  disabled = false,
  onClick,
  className,
}) => {
  const handleClick = (e: React.MouseEvent) => {
    if (disabled) {
      e.preventDefault();
      return;
    }
    onClick?.(e);
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      aria-current={isActive ? 'page' : undefined}
      aria-disabled={disabled}
      className={cn(
        'group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors select-none',
        isActive
          ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        disabled && 'pointer-events-none opacity-50',
        className
      )}
    >
      {icon && (
        <Icon
          name={icon}
          size="sm"
          className={cn(
            'transition-colors',
            isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-accent-foreground'
          )}
        />
      )}
      <span className="flex-1 truncate">{label}</span>
      {badge !== undefined && badge > 0 && (
        <Badge
          variant={isActive ? 'secondary' : 'default'}
          size="sm"
          className="ml-auto"
        >
          {badge > 99 ? '99+' : badge}
        </Badge>
      )}
    </a>
  );
};

NavItem.displayName = 'NavItem';
```

---

## 5. CardHeader Composite Example

```typescript
// src/components/composites/CardHeader/CardHeader.tsx
import React from 'react';
import { Heading, Text } from '@/components/core/Typography';
import { Icon } from '@/components/core/Icon';
import { Button } from '@/components/core/Button';
import { cn } from '@/lib/utils';

export interface CardHeaderProps {
  title: string;
  subtitle?: string;
  icon?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  subtitle,
  icon,
  actionLabel,
  onAction,
  className,
}) => {
  return (
    <div className={cn('flex items-center justify-between gap-4 p-4 border-b border-border', className)}>
      <div className="flex items-center gap-3 min-w-0">
        {icon && <Icon name={icon} size="md" className="text-primary shrink-0" />}
        <div className="min-w-0">
          <Heading level={4} className="truncate">
            {title}
          </Heading>
          {subtitle && (
            <Text size="sm" color="muted" truncate>
              {subtitle}
            </Text>
          )}
        </div>
      </div>

      {actionLabel && onAction && (
        <Button variant="outline" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

CardHeader.displayName = 'CardHeader';
```

---

## 6. Stat Composite Example

```typescript
// src/components/composites/Stat/Stat.tsx
import React from 'react';
import { Text, Heading } from '@/components/core/Typography';
import { Icon } from '@/components/core/Icon';
import { cn } from '@/lib/utils';

export type TrendDirection = 'up' | 'down' | 'neutral';

export interface StatProps {
  label: string;
  value: string | number;
  icon?: string;
  trend?: TrendDirection;
  trendValue?: string;
  helpText?: string;
  className?: string;
}

export const Stat: React.FC<StatProps> = ({
  label,
  value,
  icon,
  trend,
  trendValue,
  helpText,
  className,
}) => {
  return (
    <div className={cn('rounded-lg border border-border bg-card p-5 shadow-xs', className)}>
      <div className="flex items-center justify-between">
        <Text size="sm" color="muted" className="font-medium">
          {label}
        </Text>
        {icon && (
          <div className="p-2 rounded-md bg-muted text-muted-foreground">
            <Icon name={icon} size="sm" />
          </div>
        )}
      </div>

      <div className="mt-2">
        <Heading level={2} className="text-2xl font-bold tracking-tight">
          {value}
        </Heading>
      </div>

      {(trend || trendValue) && (
        <div className="mt-2 flex items-center gap-1.5">
          {trend === 'up' && <Icon name="trending-up" size="xs" className="text-emerald-500" />}
          {trend === 'down' && <Icon name="trending-down" size="xs" className="text-destructive" />}
          {trendValue && (
            <span
              className={cn(
                'text-xs font-medium',
                trend === 'up' && 'text-emerald-600 dark:text-emerald-400',
                trend === 'down' && 'text-destructive',
                trend === 'neutral' && 'text-muted-foreground'
              )}
            >
              {trendValue}
            </span>
          )}
        </div>
      )}

      {helpText && (
        <Text size="xs" color="muted" className="mt-1">
          {helpText}
        </Text>
      )}
    </div>
  );
};

Stat.displayName = 'Stat';
```

---

## Best Practices for Composites

### 1. Only Import Downward from `src/components/core` and `src/theme`
Composites compose indivisible core primitives. Never import another composite or upper layer into a composite:

```typescript
// ✅ LEGAL: Composite composing Core primitives
import { Input } from '@/components/core/Input';
import { Button } from '@/components/core/Button';

// ❌ ILLEGAL: Composite composing another Composite
import { SearchInput } from '@/components/composites/SearchInput'; // Lateral error
```

### 2. Leverage Tailwind Layout Utilities
Assemble components using standard Tailwind flexbox (`flex items-center gap-2`), grid, and spacing tokens. Do not create separate `.module.css` files.

### 3. Keep Internal State Ephemeral
Only manage local UI state (like active clear buttons, toggle focus). Never embed business logic, API queries, or route transitions directly in a composite.

---

## Related Subskills

- [Atomic Design Hub](../SKILL.md) — Master methodology and subskill routing
- [Fundamentals](../fundamentals/SKILL.md) — Core hierarchy, directory layouts, and composition rules
- [Theme & Tokens](../theme/SKILL.md) — Design tokens under `src/theme/`, Tailwind v4 `@theme` tokens, and CSS variables
- [Core UI Primitives](../atoms/SKILL.md) — Indivisible Core UI primitives in `src/components/core/`
- [Sections](../sections/SKILL.md) — Standalone UI sections (headers, footers, data tables)
- [Layouts](../layouts/SKILL.md) — Page layout skeletons with slot-based content
- [Integration](../integration/SKILL.md) — Framework integration (React/Next.js, Vue 3, Storybook, Vitest)
