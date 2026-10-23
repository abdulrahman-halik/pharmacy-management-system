---
name: atomic-design-layouts
description: Page-level skeletal layouts with slot-based and placeholder content in src/components/layouts/, establishing grid and responsive viewport structures with Tailwind CSS.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Atomic Design: Layouts

Master the creation of layouts (Level 4 — formerly known as Templates) — page-level layouts that define content structure without hardcoding domain content. Layouts establish the skeletal structure that pages will use, built exclusively with **Tailwind CSS layout utilities** (`grid`, `flex`, `min-h-screen`, `container`), slot architectures, and the `cn()` helper under **`src/components/layouts/`** without custom `.module.css` files.

---

## What Are Layouts?

Layouts are the page-level components that place sections, composites, and core primitives into a structured viewport layout:

- **Composed of sections and composites**: Arrange sections, composites, and core primitives into responsive page skeletons
- **Located in `src/components/layouts/`**: Replaces legacy `components/templates/`
- **Content-agnostic**: Use placeholder slots (`children`, `sidebarSlot`, `headerSlot`), not real business data or API queries
- **Utility-first layout**: Built with responsive Tailwind CSS utilities (`min-h-screen`, `flex flex-col`, `grid grid-cols-12`)
- **Reusable across routes**: The same layout skeleton powers multiple concrete routes
- **Responsive by default**: Handles mobile drawers, responsive sidebars, and desktop container queries

---

## Common Layout Types

| Layout Category | Examples | Typical Slots |
|---|---|---|
| **Application** | DashboardLayout, SettingsLayout | Sidebar, Header, Breadcrumbs, Content Area |
| **Marketing** | LandingLayout, MarketingPageLayout | Navbar, Hero Banner, Section Slots, Footer |
| **Content** | DocsLayout, BlogPostLayout | Sticky TOC, Content Slot, Next/Prev, Author Info |
| **Authentication** | AuthLayout, SplitScreenLayout | Visual Brand Slot, Form Slot |

---

## 1. MainLayout Example

```typescript
// src/components/layouts/MainLayout/MainLayout.tsx
import React from 'react';
import { Header, type HeaderProps } from '@/components/sections/Header';
import { Footer, type FooterProps } from '@/components/sections/Footer';
import { cn } from '@/lib/utils';

export interface MainLayoutProps {
  /** Header configuration */
  headerProps: HeaderProps;
  /** Footer configuration */
  footerProps: FooterProps;
  /** Main content */
  children: React.ReactNode;
  /** Show breadcrumbs */
  showBreadcrumbs?: boolean;
  /** Breadcrumb component */
  breadcrumbs?: React.ReactNode;
  /** Maximum content width */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Page background color */
  background?: 'default' | 'muted' | 'card';
  /** Custom wrapper class */
  className?: string;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  headerProps,
  footerProps,
  children,
  showBreadcrumbs = false,
  breadcrumbs,
  maxWidth = 'lg',
  background = 'default',
  className,
}) => {
  const maxWidthClass = {
    sm: 'max-w-screen-sm',
    md: 'max-w-screen-md',
    lg: 'max-w-screen-lg',
    xl: 'max-w-screen-xl',
    full: 'max-w-full',
  }[maxWidth];

  const bgClass = {
    default: 'bg-background text-foreground',
    muted: 'bg-muted/40 text-foreground',
    card: 'bg-card text-card-foreground',
  }[background];

  return (
    <div className={cn('flex min-h-screen flex-col', bgClass, className)}>
      <Header {...headerProps} />

      <main className="flex-1 flex flex-col">
        {showBreadcrumbs && breadcrumbs && (
          <div className="border-b border-border bg-muted/20 px-4 py-3 sm:px-8">
            <div className={cn('mx-auto w-full', maxWidthClass)}>{breadcrumbs}</div>
          </div>
        )}

        <div className={cn('mx-auto w-full flex-1 px-4 py-8 sm:px-8', maxWidthClass)}>
          {children}
        </div>
      </main>

      <Footer {...footerProps} />
    </div>
  );
};

MainLayout.displayName = 'MainLayout';
```

---

## 2. DashboardLayout Example

Features a responsive collapsible sidebar, sticky top header, and fluid content grid:

```typescript
// src/components/layouts/DashboardLayout/DashboardLayout.tsx
import React, { useState } from 'react';
import { Sidebar, type SidebarProps } from '@/components/sections/Sidebar';
import { Header, type HeaderProps } from '@/components/sections/Header';
import { cn } from '@/lib/utils';

export interface DashboardLayoutProps {
  /** Sidebar props */
  sidebarProps: Omit<SidebarProps, 'isCollapsed'>;
  /** Header props */
  headerProps: HeaderProps;
  /** Page content */
  children: React.ReactNode;
  /** Optional secondary actions or banner */
  banner?: React.ReactNode;
  /** Custom wrapper class */
  className?: string;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  sidebarProps,
  headerProps,
  children,
  banner,
  className,
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className={cn('flex min-h-screen bg-muted/20', className)}>
      {/* Sidebar Navigation */}
      <Sidebar
        {...sidebarProps}
        isCollapsed={sidebarCollapsed}
        className="hidden md:flex shrink-0 sticky top-0 h-screen"
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        <Header {...headerProps} />

        {banner && <div className="border-b border-border bg-background px-6 py-3">{banner}</div>}

        <main className="flex-1 p-6 sm:p-8">
          <div className="container mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
};

DashboardLayout.displayName = 'DashboardLayout';
```

---

## 3. AuthLayout Example

Two-column split view with responsive mobile stacking:

```typescript
// src/components/layouts/AuthLayout/AuthLayout.tsx
import React from 'react';
import { cn } from '@/lib/utils';

export interface AuthLayoutProps {
  children: React.ReactNode;
  brandSlot?: React.ReactNode;
  testimonialSlot?: React.ReactNode;
  className?: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  brandSlot,
  testimonialSlot,
  className,
}) => {
  return (
    <div className={cn('grid min-h-screen w-full lg:grid-cols-2', className)}>
      {/* Left Visual Brand Panel (hidden on mobile) */}
      <div className="relative hidden h-full flex-col justify-between bg-zinc-900 p-10 text-white lg:flex">
        <div className="flex items-center gap-2 font-medium">{brandSlot}</div>
        {testimonialSlot && <div className="space-y-2">{testimonialSlot}</div>}
      </div>

      {/* Right Interactive Form Area */}
      <div className="flex items-center justify-center p-8 sm:p-12">
        <div className="mx-auto w-full max-w-sm space-y-6">{children}</div>
      </div>
    </div>
  );
};

AuthLayout.displayName = 'AuthLayout';
```

---

## 4. Generic SlotLayout Example

```typescript
// src/components/layouts/SlotLayout/SlotLayout.tsx
import React from 'react';
import { cn } from '@/lib/utils';

export interface SlotLayoutProps {
  slots: {
    header?: React.ReactNode;
    sidebar?: React.ReactNode;
    main: React.ReactNode;
    footer?: React.ReactNode;
  };
  className?: string;
}

export const SlotLayout: React.FC<SlotLayoutProps> = ({ slots, className }) => (
  <div className={cn('flex min-h-screen flex-col bg-background text-foreground', className)}>
    {slots.header && <header className="sticky top-0 z-40 border-b border-border">{slots.header}</header>}
    <div className="flex flex-1">
      {slots.sidebar && <aside className="w-64 border-r border-border shrink-0">{slots.sidebar}</aside>}
      <main className="flex-1 p-6">{slots.main}</main>
    </div>
    {slots.footer && <footer className="border-t border-border">{slots.footer}</footer>}
  </div>
);
```

---

## Best Practices for Layouts

### 1. Purely Structural (No Domain Data)
Layouts must not fetch data, bind route params, or hardcode marketing copy. Pass content in through slots (`children`, `slots.*`).

### 2. Full Responsive Viewports with Tailwind
Build layouts using flexible Tailwind layout utilities (`min-h-screen`, `grid-cols-1 lg:grid-cols-12`, `container mx-auto`). Avoid arbitrary fixed pixel widths.

### 3. Clear Slot Contracts
Define TypeScript interfaces for every slot so concrete Pages know exactly what to provide without guessing.

---

## Related Subskills

- [Atomic Design Hub](../SKILL.md) — Master methodology and subskill routing
- [Fundamentals](../fundamentals/SKILL.md) — Core hierarchy, directory layouts, and composition rules
- [Theme & Tokens](../theme/SKILL.md) — Design tokens under `src/theme/`, Tailwind v4 `@theme` tokens, and CSS variables
- [Core UI Primitives](../atoms/SKILL.md) — Indivisible Core UI primitives in `src/components/core/`
- [Composites](../composites/SKILL.md) — Functional core primitive combinations (form fields, search inputs)
- [Sections](../sections/SKILL.md) — Standalone UI sections (headers, footers, data tables)
- [Integration](../integration/SKILL.md) — Framework integration (React/Next.js, Vue 3, Storybook, Vitest)
